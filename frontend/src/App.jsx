import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import TextInput from "./components/TextInput.jsx";
import LanguageSelector from "./components/LanguageSelector.jsx";
import VoiceSelector from "./components/VoiceSelector.jsx";
import EngineSelector from "./components/EngineSelector.jsx";
import GenerateButton from "./components/GenerateButton.jsx";
import AudioPlayer from "./components/AudioPlayer.jsx";
import DocumentUpload from "./components/DocumentUpload.jsx";
import EnhanceMenu from "./components/EnhanceMenu.jsx";
import History from "./components/History.jsx";
import Toast from "./components/Toast.jsx";
import AuthModal from "./components/AuthModal.jsx";
import {
  fetchVoices,
  generateSpeech,
  generateBatch,
  detectLanguage,
  absoluteUrl,
} from "./api/client.js";
import {
  loadTheme,
  saveTheme,
  loadHistory,
  addHistory,
  clearHistory,
  setHistoryTags,
  removeHistory,
  loadFavorites,
  toggleFavorite,
} from "./lib/storage.js";
import { getUser, logOut } from "./lib/auth.js";
import {
  listHistory as cloudList,
  saveHistory as cloudSave,
  deleteHistory as cloudDelete,
  setTags as cloudSetTags,
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
    tags: r.tags ?? [],
  };
}

const MAX_LENGTH = 5000;

export default function App() {
  const [theme, setTheme] = useState(loadTheme);
  const [languages, setLanguages] = useState([]);
  const [neuralLanguages, setNeuralLanguages] = useState([]);
  const [neuralAvailable, setNeuralAvailable] = useState(false);
  const [engine, setEngine] = useState("standard"); // "standard" | "neural"
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("");
  const [voice, setVoice] = useState("");
  const [loading, setLoading] = useState(false);
  const [audio, setAudio] = useState(null); // { url, name }
  const [batch, setBatch] = useState(null); // [{ text, url } | { text, error }]
  const [batchLoading, setBatchLoading] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(getUser);
  const [authOpen, setAuthOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);

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
        setNeuralLanguages(data.neural?.languages ?? []);
        setNeuralAvailable(!!data.neural?.available);
        const first = data.languages[0];
        if (first) {
          setLanguage(first.code);
          setVoice(first.voices[0]?.id ?? "");
        }
      })
      .catch((e) => setToast({ type: "error", message: e.message }));
  }, []);

  // The active catalog depends on the selected engine.
  const activeLanguages = engine === "neural" ? neuralLanguages : languages;

  const currentLang = useMemo(
    () => activeLanguages.find((l) => l.code === language),
    [activeLanguages, language]
  );
  const voices = currentLang?.voices ?? [];
  const currentVoice = voices.find((v) => v.id === voice);

  // keep voice valid when language changes
  const onLanguageChange = (code) => {
    setLanguage(code);
    const lang = activeLanguages.find((l) => l.code === code);
    setVoice(lang?.voices[0]?.id ?? "");
  };

  // Switch engines and reset to a valid language/voice in the new catalog.
  const handleEngineChange = (next) => {
    if (next === engine) return;
    const catalog = next === "neural" ? neuralLanguages : languages;
    setEngine(next);
    const keep = catalog.find((l) => l.code === language) ?? catalog[0];
    if (keep) {
      setLanguage(keep.code);
      setVoice(keep.voices[0]?.id ?? "");
    }
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
      const res = await generateSpeech({ text: t, language, voice, engine });
      const url = absoluteUrl(res.audio_url);
      if (engine === "neural" && res.engine_used === "standard") {
        setToast({
          type: "error",
          message: "Neural engine was busy — used the standard voice instead.",
        });
      }
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
        tags: [],
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
  }, [text, language, voice, engine, currentLang, currentVoice, user, refreshHistory]);

  const handleGenerateBatch = async () => {
    const texts = text
      .split(/\n+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (texts.length < 2) {
      return setToast({
        type: "error",
        message: "Add at least two lines to batch-generate (one clip per line).",
      });
    }
    setBatchLoading(true);
    try {
      const res = await generateBatch({ texts, language, voice });
      setBatch(
        res.results.map((r) => ({
          text: r.text,
          url: r.audio_url ? absoluteUrl(r.audio_url) : null,
          error: r.error,
        }))
      );
      setToast({ type: "success", message: `Generated ${res.results.length} clips.` });
    } catch (e) {
      setToast({ type: "error", message: e.message });
    } finally {
      setBatchLoading(false);
    }
  };

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

  // Auto-detect the language of the current text and select it + a voice.
  const handleAutoDetect = async () => {
    const t = text.trim();
    if (t.length < 8) {
      return setToast({
        type: "error",
        message: "Add a bit more text so the language can be detected.",
      });
    }
    setDetecting(true);
    try {
      const res = await detectLanguage(t);
      if (!res.supported) {
        return setToast({
          type: "error",
          message: `Detected "${res.detected_code}", which isn't available yet.`,
        });
      }
      // Detected language must exist in the *active* engine's catalog.
      if (!activeLanguages.some((l) => l.code === res.language_code)) {
        return setToast({
          type: "error",
          message: `Detected ${res.language_name}, not offered by the neural engine. Switch to Standard.`,
        });
      }
      onLanguageChange(res.language_code);
      // res.voice_id is a standard (gTTS) voice; only apply it in standard mode.
      if (engine === "standard" && res.voice_id) setVoice(res.voice_id);
      setToast({
        type: "success",
        message: `Detected ${res.language_name} (${Math.round(
          res.confidence * 100
        )}% sure).`,
      });
    } catch (e) {
      setToast({ type: "error", message: e.message });
    } finally {
      setDetecting(false);
    }
  };

  // Generate a short spoken sample of a voice so users can preview before use.
  const handlePreviewVoice = useCallback(
    async (voiceId) => {
      const sample =
        currentLang?.code === "en"
          ? "Hi! This is how I sound."
          : text.trim().slice(0, 60) || "Hello!";
      const res = await generateSpeech({
        text: sample,
        language,
        voice: voiceId,
        engine,
      });
      return absoluteUrl(res.audio_url);
    },
    [currentLang, language, text, engine]
  );

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

  const handleSetTags = async (id, tags) => {
    // optimistic update either way
    setHistory((h) => h.map((it) => (it.id === id ? { ...it, tags } : it)));
    if (user) {
      try {
        await cloudSetTags(id, tags);
      } catch (e) {
        setToast({ type: "error", message: e.message });
      }
    } else {
      setHistoryTags(id, tags);
    }
  };

  const handleDeleteHistory = async (id) => {
    if (user) {
      try {
        await cloudDelete(id);
        setHistory((h) => h.filter((it) => it.id !== id));
      } catch (e) {
        setToast({ type: "error", message: e.message });
      }
    } else {
      setHistory(removeHistory(id));
    }
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

        <main className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
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
              {neuralAvailable && (
                <EngineSelector value={engine} onChange={handleEngineChange} />
              )}
              {languages.length === 0 ? (
                <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
                  <div className="h-16 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800" />
                  <div className="h-16 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800" />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <LanguageSelector
                    languages={activeLanguages}
                    value={language}
                    onChange={onLanguageChange}
                    onAutoDetect={handleAutoDetect}
                    detecting={detecting}
                    canDetect={trimmed.length >= 8}
                  />
                  <VoiceSelector
                    voices={voices}
                    value={voice}
                    onChange={setVoice}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                    onPreview={handlePreviewVoice}
                    onError={(m) => setToast({ type: "error", message: m })}
                  />
                </div>
              )}
              <div className="mt-4 space-y-2">
                <GenerateButton
                  onClick={handleGenerate}
                  loading={loading}
                  disabled={!canGenerate}
                />
                {engine === "standard" && (
                  <button
                    onClick={handleGenerateBatch}
                    disabled={batchLoading || !trimmed}
                    className="btn-ghost w-full text-xs"
                    title="Split the text by line and generate one clip per line"
                  >
                    {batchLoading ? "Generating batch…" : "Batch generate (one clip per line)"}
                  </button>
                )}
              </div>
            </div>

            {audio && <AudioPlayer src={audio.url} downloadName={audio.name} />}

            {batch && (
              <div className="card animate-fade-in p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Batch results ({batch.length})</h3>
                  <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => setBatch(null)}>
                    Dismiss
                  </button>
                </div>
                <div className="space-y-4">
                  {batch.map((b, i) => (
                    <div key={i}>
                      <p className="mb-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        {i + 1}. {b.text}
                      </p>
                      {b.url ? (
                        <AudioPlayer src={b.url} downloadName={`clip_${i + 1}.mp3`} />
                      ) : (
                        <p className="text-xs text-red-500">Failed: {b.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <History
              items={history}
              onReplay={handleReplay}
              onClear={handleClearHistory}
              onSetTags={handleSetTags}
              onDelete={handleDeleteHistory}
            />
          </div>
        </main>

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
