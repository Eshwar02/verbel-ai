import { useRef, useState } from "react";
import { Mic, Star, Play, Loader2 } from "lucide-react";

export default function VoiceSelector({
  voices,
  value,
  onChange,
  favorites,
  onToggleFavorite,
  onPreview,
  onError,
}) {
  const audioRef = useRef(null);
  const [previewing, setPreviewing] = useState(false);

  // Surface favorited voices first within the current language.
  const sorted = [...voices].sort((a, b) => {
    const fa = favorites.includes(a.id) ? 0 : 1;
    const fb = favorites.includes(b.id) ? 0 : 1;
    return fa - fb;
  });

  const isFav = favorites.includes(value);

  const preview = async () => {
    if (!onPreview || !value) return;
    setPreviewing(true);
    try {
      const url = await onPreview(value);
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
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
        <Mic className="h-4 w-4 text-brand-500" /> Voice
      </label>
      <div className="flex items-center gap-2">
        <select
          className="select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {sorted.map((v) => (
            <option key={v.id} value={v.id}>
              {favorites.includes(v.id) ? "★ " : ""}
              {v.label}
              {v.slow ? " · slow" : ""}
            </option>
          ))}
        </select>
        {onPreview && (
          <button
            type="button"
            onClick={preview}
            disabled={previewing || !value}
            className="btn-ghost !px-2.5"
            title="Preview this voice"
            aria-label="Preview voice"
          >
            {previewing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => onToggleFavorite(value)}
          className="btn-ghost !px-2.5"
          title={isFav ? "Remove from favorites" : "Add to favorites"}
          aria-label="Toggle favorite voice"
        >
          <Star
            className={`h-4 w-4 ${
              isFav ? "fill-amber-400 text-amber-400" : ""
            }`}
          />
        </button>
      </div>
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
