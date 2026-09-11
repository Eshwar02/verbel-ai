import { useMemo, useState } from "react";
import { History as HistoryIcon, Play, Trash2, Search, X, Plus, Tag } from "lucide-react";

export default function History({ items, onReplay, onClear, onSetTags, onDelete }) {
  const [query, setQuery] = useState("");
  const [tagDraft, setTagDraft] = useState({}); // id -> in-progress tag text

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = [
        it.textPreview,
        it.languageName,
        it.voiceLabel,
        ...(it.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  if (!items.length) {
    return (
      <div className="card p-5 text-center text-sm text-slate-400">
        <HistoryIcon className="mx-auto mb-2 h-5 w-5" />
        No generations yet.
      </div>
    );
  }

  const addTag = (id) => {
    const raw = (tagDraft[id] || "").trim().toLowerCase();
    if (!raw) return;
    const item = items.find((i) => i.id === id);
    const existing = item?.tags ?? [];
    if (!existing.includes(raw)) onSetTags?.(id, [...existing, raw]);
    setTagDraft((d) => ({ ...d, [id]: "" }));
  };

  const removeTag = (id, tag) => {
    const item = items.find((i) => i.id === id);
    onSetTags?.(id, (item?.tags ?? []).filter((t) => t !== tag));
  };

  return (
    <div className="card animate-fade-in p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <HistoryIcon className="h-4 w-4 text-brand-500" /> Recent
          <span className="chip ml-1">{items.length}</span>
        </h3>
        <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={onClear}>
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </button>
      </div>

      {/* search */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search text, voice, or tag…"
          className="select w-full pl-9"
          aria-label="Search history"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">No matches.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/40"
            >
              <div className="flex items-center gap-3">
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
                {onDelete && (
                  <button
                    onClick={() => onDelete(item.id)}
                    className="shrink-0 opacity-50 transition hover:opacity-100"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* tags */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {(item.tags ?? []).map((tag) => (
                  <span key={tag} className="chip !py-0.5">
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button
                      onClick={() => removeTag(item.id, tag)}
                      className="opacity-60 hover:opacity-100"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <span className="inline-flex items-center">
                  <input
                    value={tagDraft[item.id] || ""}
                    onChange={(e) =>
                      setTagDraft((d) => ({ ...d, [item.id]: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && addTag(item.id)}
                    placeholder="tag"
                    className="w-16 rounded-full border border-dashed border-slate-300 bg-transparent px-2 py-0.5 text-xs focus:border-brand-500 focus:outline-none dark:border-slate-600"
                    aria-label="Add tag"
                  />
                  <button
                    onClick={() => addTag(item.id)}
                    className="ml-1 opacity-60 hover:opacity-100"
                    aria-label="Add tag"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
