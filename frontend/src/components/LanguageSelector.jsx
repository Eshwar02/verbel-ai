import { Languages } from "lucide-react";

export default function LanguageSelector({ languages, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
        <Languages className="h-4 w-4 text-brand-500" /> Language
      </label>
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
