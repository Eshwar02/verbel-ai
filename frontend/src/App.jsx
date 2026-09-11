import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import TextInput from "./components/TextInput.jsx";
import LanguageSelector from "./components/LanguageSelector.jsx";
import VoiceSelector from "./components/VoiceSelector.jsx";
import GenerateButton from "./components/GenerateButton.jsx";
import AudioPlayer from "./components/AudioPlayer.jsx";
import DocumentUpload from "./components/DocumentUpload.jsx";
import EnhanceMenu from "./components/EnhanceMenu.jsx";
import History from "./components/History.jsx";
import Toast from "./components/Toast.jsx";
import AuthModal from "./components/AuthModal.jsx";
import { fetchVoices, generateSpeech, absoluteUrl } from "./api/client.js";
import {
  loadTheme,
  saveTheme,
  loadHistory,
  addHistory,
  clearHistory,
  loadFavorites,
  toggleFavorite,
} from "./lib/storage.js";
import { getUser, logOut } from "./lib/auth.js";
import {
  listHistory as cloudList,
  saveHistory as cloudSave,
  deleteHistory as cloudDelete,
} from "./lib/cloudHistory.js";

/** Normalize a cloud (snake_case) record into the local history shape. */
function fromCloud(r) {
  return {
    id: r.id,
    textPreview: r.text_preview,
    languageName: r.language,
    voiceLabel: r.voice,
    url: absoluteUrl(r.audio_url),
    name: "speech.mp3",
  };
}

const MAX_LENGTH = 5000;

export default function App() {
  const [theme, setTheme] = useState(loadTheme);
  const [languages, setLanguages] = useState([]);
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("");
  const [voice, setVoice] = useState("");
  const [loading, setLoading] = useState(false);
  const [audio, setAudio] = useState(null); // { url, name }
  const [history, setHistory] = useState(loadHistory);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(getUser);
  const [authOpen, setAuthOpen] = useState(false);

  // --- history source: cloud when logged in, else local ---
  const refreshHistory = useCallback(async (u) => {
    if (u) {
      try {
        const records = await cloudList();
        setHistory(records.map(fromCloud));
        return;
      } catch {
        /* fall back to local view on cloud failure */
      }
    }
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    refreshHistory(user);
  }, [user, refreshHistory]);

  // --- theme ---
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    saveTheme(theme);
  }, [theme]);

  // --- load voice catalog ---
  useEffect(() => {
    fetchVoices()
      .then((data) => {
        setLanguages(data.languages);
        const first = data.languages[0];
        if (first) {
          setLanguage(first.code);
          setVoice(first.voices[0]?.id ?? "");
        }
      })
      .catch((e) => setToast({ type: "error", message: e.message }));
  }, []);

  const currentLang = useMemo(
    () => languages.find((l) => l.code === language),
    [languages, language]
  );
  const voices = currentLang?.voices ?? [];
  const currentVoice = voices.find((v) => v.id === voice);

  // keep voice valid when language changes
  const onLanguageChange = (code) => {
    setLanguage(code);
    const lang = languages.find((l) => l.code === code);
    setVoice(lang?.voices[0]?.id ?? "");
  };

  const trimmed = text.trim();
  const canGenerate =
    trimmed.length > 0 && trimmed.length <= MAX_LENGTH && !!voice && !loading;

  const handleGenerate = useCallback(async () => {
    const t = text.trim();
    if (!t) return setToast({ type: "error", message: "Please enter some text." });
    if (t.length > MAX_LENGTH)
      return setToast({
        type: "error",
        message: `Text exceeds the ${MAX_LENGTH.toLocaleString()} character limit.`,
      });

    setLoading(true);
    try {
      const res = await generateSpeech({ text: t, language, voice });
      const url = absoluteUrl(res.audio_url);
      const name = `${t.slice(0, 24).replace(/\s+/g, "_") || "speech"}.mp3`;
      setAudio({ url, name });

      const entry = {
        id: crypto.randomUUID(),
        textPreview: t.slice(0, 80),
        languageName: currentLang?.name ?? language,
        voiceLabel: currentVoice?.label ?? voice,
        language,
        voice,
        url,
        name,
      };
      if (user) {
        try {
          await cloudSave({
            textPreview: entry.textPreview,
            language: entry.languageName,
            voice: entry.voiceLabel,
            audioUrl: res.audio_url,
          });
          await refreshHistory(user);
        } catch {
          setHistory(addHistory(entry)); // fall back to local on cloud failure
        }
      } else {
        setHistory(addHistory(entry));
      }
      setToast({ type: "success", message: "Speech generated!" });
    } catch (e) {
      setToast({ type: "error", message: e.message });
    } finally {
      setLoading(false);
    }
  }, [text, language, voice, currentLang, currentVoice, user, refreshHistory]);

  // keyboard shortcut: Cmd/Ctrl + Enter
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canGenerate) {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canGenerate, handleGenerate]);

  const handleReplay = (item) => {
    setAudio({ url: item.url, name: item.name });
    if (item.language) onLanguageChange(item.language);
    if (item.voice) setVoice(item.voice);
  };

  const handleToggleFavorite = (voiceId) => {
    if (!voiceId) return;
    setFavorites(toggleFavorite(voiceId));
  };

  const handleClearHistory = async () => {
    if (user) {
      try {
        await Promise.all(history.map((h) => cloudDelete(h.id)));
        await refreshHistory(user);
        return;
      } catch (e) {
        setToast({ type: "error", message: e.message });
        return;
      }
    }
    setHistory(clearHistory());
  };

  const handleLogout = () => {
    logOut();
    setUser(null);
    setToast({ type: "success", message: "Logged out." });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-slate-50 to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Header
          theme={theme}
          onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
          user={user}
          onLogin={() => setAuthOpen(true)}
          onLogout={handleLogout}
        />

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <TextInput value={text} onChange={setText} maxLength={MAX_LENGTH} />

            <div className="flex flex-wrap items-center gap-2">
              <DocumentUpload
                onExtracted={(t) => setText(t.slice(0, MAX_LENGTH))}
                onError={(m) => setToast({ type: "error", message: m })}
              />
              <EnhanceMenu
                text={text}
                onEnhanced={setText}
                onError={(m) => setToast({ type: "error", message: m })}
              />
            </div>

            <div className="card p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <LanguageSelector
                  languages={languages}
                  value={language}
                  onChange={onLanguageChange}
                />
                <VoiceSelector
                  voices={voices}
                  value={voice}
                  onChange={setVoice}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                />
              </div>
              <div className="mt-4">
                <GenerateButton
                  onClick={handleGenerate}
                  loading={loading}
                  disabled={!canGenerate}
                />
              </div>
            </div>

            {audio && <AudioPlayer src={audio.url} downloadName={audio.name} />}
          </div>

          <div className="space-y-6">
            <History
              items={history}
              onReplay={handleReplay}
              onClear={handleClearHistory}
            />
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-400">
          verbel-ai · text-to-speech · built with FastAPI + React
        </footer>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthed={(u) => {
          setUser(u);
          setAuthOpen(false);
          setToast({ type: "success", message: "Signed in." });
        }}
        onError={(m) => setToast({ type: "error", message: m })}
      />
    </div>
  );
}
