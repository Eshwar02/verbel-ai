import { Languages, Wand2, Loader2 } from "lucide-react";

export default function LanguageSelector({
  languages,
  value,
  onChange,
  onAutoDetect,
  detecting = false,
  canDetect = false,
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-sm font-semibold">
          <Languages className="h-4 w-4 text-brand-500" /> Language
        </label>
        {onAutoDetect && (
          <button
            type="button"
            onClick={onAutoDetect}
            disabled={detecting || !canDetect}
            className="btn-ghost !px-2 !py-1 text-[11px]"
            title="Detect the language from your text"
          >
            {detecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            {detecting ? "Detecting…" : "Auto-detect"}
          </button>
        )}
      </div>
      <select
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
