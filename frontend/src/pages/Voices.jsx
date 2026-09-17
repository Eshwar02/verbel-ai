import { useRef, useState } from "react";
import { Play, Loader2, Star, Mic } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import LottiePlayer from "../components/LottiePlayer.jsx";
import { equalizer } from "../assets/lottie/equalizer.js";
import { useApp } from "../context/AppContext.jsx";

const HERO_ANIM = equalizer({ color: "#7c3aed", bars: 9, w: 180, h: 60 });

function VoiceCard({ voice, isFav, onPreview, onToggleFavorite, onError }) {
  const audioRef = useRef(null);
  const [previewing, setPreviewing] = useState(false);

  const preview = async () => {
    setPreviewing(true);
    try {
      const url = await onPreview(voice.id);
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch (e) {
      onError?.(e.message || "Could not preview this voice.");
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="card flex items-center gap-3 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-brand-600/10 text-brand-600 dark:text-brand-300">
        <Mic className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{voice.label}</p>
        {voice.slow && <p className="text-[11px] text-neutral-400">slow</p>}
      </div>
      <button
        type="button"
        onClick={onToggleFavorite}
        className="btn-ghost !px-2.5"
        title={isFav ? "Remove from favorites" : "Add to favorites"}
        aria-label="Toggle favorite voice"
      >
        <Star className={`h-4 w-4 ${isFav ? "fill-accent-400 text-accent-400" : ""}`} />
      </button>
      <button
        type="button"
        onClick={preview}
        disabled={previewing}
        className="btn-primary !px-2.5"
        title="Preview this voice"
        aria-label="Preview voice"
      >
        {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
      </button>
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

/** Voices — browse and preview every voice in the active engine's catalog. */
export default function Voices() {
  const {
    activeLanguages,
    language,
    onLanguageChange,
    favorites,
    handlePreviewVoice,
    handleToggleFavorite,
    setToast,
  } = useApp();

  const current = activeLanguages.find((l) => l.code === language);
  const voices = current?.voices ?? [];

  return (
    <>
      <PageHeader title="Voices" subtitle="Browse and preview available voices.">
        <LottiePlayer animationData={HERO_ANIM} className="h-12 w-36" ariaLabel="Soundwave" />
      </PageHeader>

      <div className="mb-5 max-w-xs">
        <label className="mb-1.5 block text-sm font-semibold">Language</label>
        <select
          className="select"
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
        >
          {activeLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {voices.length === 0 ? (
        <div className="card p-8 text-center text-sm text-neutral-400">
          Loading voices…
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {voices.map((v) => (
            <VoiceCard
              key={v.id}
              voice={v}
              isFav={favorites.includes(v.id)}
              onPreview={handlePreviewVoice}
              onToggleFavorite={() => handleToggleFavorite(v.id)}
              onError={(m) => setToast({ type: "error", message: m })}
            />
          ))}
        </div>
      )}
    </>
  );
}
