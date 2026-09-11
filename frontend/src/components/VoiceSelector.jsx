import { Mic, Star } from "lucide-react";

export default function VoiceSelector({
  voices,
  value,
  onChange,
  favorites,
  onToggleFavorite,
}) {
  // Surface favorited voices first within the current language.
  const sorted = [...voices].sort((a, b) => {
    const fa = favorites.includes(a.id) ? 0 : 1;
    const fb = favorites.includes(b.id) ? 0 : 1;
    return fa - fb;
  });

  const isFav = favorites.includes(value);

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
    </div>
  );
}
