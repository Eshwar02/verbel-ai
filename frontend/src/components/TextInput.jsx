import { useRef, useState } from "react";
import { Copy, Eraser, FileUp, Sparkles, Check, Pause } from "lucide-react";

const SAMPLE =
  "Hello! Welcome to verbel-ai. Paste any text here, pick a language and voice, then generate natural-sounding speech in seconds.";

const WORDS_PER_MINUTE = 150;

export default function TextInput({ value, onChange, maxLength }) {
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const textareaRef = useRef(null);

  const insertPause = () => {
    const el = textareaRef.current;
    const marker = "[pause]";
    if (!el) return onChange((value + " " + marker).slice(0, maxLength));
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = (value.slice(0, start) + marker + value.slice(end)).slice(0, maxLength);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + marker.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const chars = value.length;
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const minutes = words / WORDS_PER_MINUTE;
  const readTime =
    words === 0
      ? "0s"
      : minutes < 1
        ? `${Math.max(1, Math.round(minutes * 60))}s`
        : `${minutes.toFixed(1)} min`;

  const pct = Math.min(100, (chars / maxLength) * 100);
  const over = chars > maxLength;

  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const readFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith(".txt")) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(String(e.target.result).slice(0, maxLength));
    reader.readAsText(file);
  };

  return (
    <div className="card animate-fade-in p-5">
      <div className="mb-3 flex items-center justify-between">
        <label className="text-sm font-semibold">Your text</label>
        <div className="flex items-center gap-1.5">
          <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => onChange(SAMPLE)}>
            <Sparkles className="h-3.5 w-3.5" /> Example
          </button>
          <button
            className="btn-ghost !px-2.5 !py-1.5 text-xs"
            onClick={insertPause}
            title="Insert a pause marker — [pause] or [pause=3]"
          >
            <Pause className="h-3.5 w-3.5" /> Pause
          </button>
          <button
            className="btn-ghost !px-2.5 !py-1.5 text-xs"
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="h-3.5 w-3.5" /> .txt
          </button>
          <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={copy} disabled={!value}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            className="btn-ghost !px-2.5 !py-1.5 text-xs"
            onClick={() => onChange("")}
            disabled={!value}
          >
            <Eraser className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          readFile(e.dataTransfer.files?.[0]);
        }}
        className={`relative rounded-xl border-2 border-dashed transition ${
          dragging
            ? "border-brand-500 bg-brand-50/50 dark:bg-brand-500/10"
            : "border-transparent"
        }`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          placeholder="Enter or paste text here… (or drop a .txt file)"
          className="w-full resize-y rounded-xl border border-slate-200 bg-white/60 p-4 text-sm leading-relaxed
                     shadow-inner focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40
                     dark:border-slate-700 dark:bg-slate-800/60"
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".txt"
        className="hidden"
        onChange={(e) => readFile(e.target.files?.[0])}
      />

      {/* meta row */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="chip">{words} words</span>
        <span className={`chip ${over ? "!bg-red-100 !text-red-700 dark:!bg-red-500/20 dark:!text-red-300" : ""}`}>
          {chars} / {maxLength} chars
        </span>
        <span className="chip">~{readTime} read</span>
        <div className="ml-auto flex-1 basis-full sm:basis-40">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className={`h-full rounded-full transition-all ${
                over ? "bg-red-500" : "bg-gradient-to-r from-brand-500 to-indigo-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
