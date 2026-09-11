import { History as HistoryIcon, Play, Trash2 } from "lucide-react";

export default function History({ items, onReplay, onClear }) {
  if (!items.length) return null;

  return (
    <div className="card animate-fade-in p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <HistoryIcon className="h-4 w-4 text-brand-500" /> Recent
        </h3>
        <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={onClear}>
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </button>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5
                       dark:border-slate-800 dark:bg-slate-800/40"
          >
            <button
              onClick={() => onReplay(item)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-brand-600 hover:bg-brand-600/20 dark:text-brand-300"
              aria-label="Replay"
            >
              <Play className="h-4 w-4 pl-0.5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.textPreview}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {item.languageName} · {item.voiceLabel}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
