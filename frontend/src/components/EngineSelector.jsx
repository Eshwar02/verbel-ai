import { Zap, Sparkles } from "lucide-react";

const OPTIONS = [
  {
    id: "standard",
    label: "Standard",
    hint: "Free · 7 languages",
    icon: Zap,
  },
  {
    id: "neural",
    label: "Neural",
    hint: "Voxtral · expressive voices",
    icon: Sparkles,
  },
];

/** Segmented control to pick the TTS engine (gTTS vs Voxtral). */
export default function EngineSelector({ value, onChange }) {
  return (
    <div className="mb-4">
      <span className="mb-1.5 block text-sm font-semibold">Engine</span>
      <div
        role="radiogroup"
        aria-label="TTS engine"
        className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60"
      >
        {OPTIONS.map(({ id, label, hint, icon: Icon }) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(id)}
              className={`flex flex-col items-start rounded-lg px-3 py-2 text-left transition ${
                active
                  ? "bg-white shadow-sm ring-1 ring-brand-500/30 dark:bg-slate-900"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <Icon
                  className={`h-3.5 w-3.5 ${active ? "text-brand-500" : ""}`}
                />
                {label}
              </span>
              <span className="text-[11px] text-slate-400">{hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
