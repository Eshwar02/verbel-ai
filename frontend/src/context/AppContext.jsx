import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  fetchVoices,
  generateSpeech,
  generateBatch,
  detectLanguage,
  absoluteUrl,
} from "../api/client.js";
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
} from "../lib/storage.js";
import { getUser, logOut } from "../lib/auth.js";
import {
  listHistory as cloudList,
  saveHistory as cloudSave,
  deleteHistory as cloudDelete,
  setTags as cloudSetTags,
} from "../lib/cloudHistory.js";

export const MAX_LENGTH = 5000;

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

const AppContext = createContext(null);

/** Access the shared application state. Must be used inside <AppProvider>. */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}

/**
 * Holds all cross-page application state (voice catalog, editor text, engine,
 * theme, history, auth, toast) and the handlers that mutate it. Pages read
 * from this via useApp() so the left-nav routes stay in sync.
 */
export function AppProvider({ children }) {
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
  const [batch, setBatch] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(getUser);
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

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

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

  const onLanguageChange = (code) => {
    setLanguage(code);
    const lang = activeLanguages.find((l) => l.code === code);
    setVoice(lang?.voices[0]?.id ?? "");
  };

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
          setHistory(addHistory(entry));
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
      if (!activeLanguages.some((l) => l.code === res.language_code)) {
        return setToast({
          type: "error",
          message: `Detected ${res.language_name}, not offered by the neural engine. Switch to Standard.`,
        });
      }
      onLanguageChange(res.language_code);
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

  const value = {
    // theme
    theme,
    setTheme,
    toggleTheme,
    // catalog / selection
    languages,
    neuralLanguages,
    neuralAvailable,
    activeLanguages,
    engine,
    handleEngineChange,
    language,
    onLanguageChange,
    voice,
    setVoice,
    currentLang,
    currentVoice,
    voices,
    // editor
    text,
    setText,
    trimmed,
    // generation
    loading,
    audio,
    setAudio,
    batch,
    setBatch,
    batchLoading,
    canGenerate,
    detecting,
    handleGenerate,
    handleGenerateBatch,
    handleAutoDetect,
    handlePreviewVoice,
    // history + favorites
    history,
    favorites,
    handleReplay,
    handleToggleFavorite,
    handleClearHistory,
    handleSetTags,
    handleDeleteHistory,
    // auth
    user,
    setUser,
    handleLogout,
    // toast
    toast,
    setToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
