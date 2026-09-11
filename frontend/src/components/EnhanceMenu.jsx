import { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const ACTIONS = [
  { id: "summarize", label: "Summarize" },
  { id: "grammar", label: "Fix grammar" },
  { id: "rewrite", label: "Rewrite clearer" },
  { id: "conversational", label: "Make conversational" },
];

/**
 * AI text-enhancement menu.
 *
 * Props:
 *   - text:        current text to enhance (disables when empty)
 *   - onEnhanced:  (newText: string) => void  — called with the transformed text
 *   - onError:     (message: string) => void  — called on failure
 */
export default function EnhanceMenu({ text, onEnhanced, onError }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const disabled = !text || !text.trim() || loading;

  async function runAction(action) {
    setOpen(false);
    setLoading(true);
    try {
      let res;
      try {
        res = await fetch(`${API_BASE}/api/enhance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, action }),
        });
      } catch {
        throw new Error("Network error — is the backend running?");
      }
      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
          const data = await res.json();
          message = data.detail || data.error || message;
        } catch {
          /* keep default */
        }
        throw new Error(message);
      }
      const data = await res.json();
      onEnhanced?.(data.text);
    } catch (err) {
      onError?.(err.message || "Enhancement failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="btn-ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Enhance text with AI"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Enhancing…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 text-brand-500" /> Enhance
          </>
        )}
      </button>

      {open && !loading && (
        <div
          role="menu"
          className="card absolute z-10 mt-1 flex min-w-[12rem] flex-col gap-0.5 p-1"
        >
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="menuitem"
              onClick={() => runAction(a.id)}
              className="btn-ghost w-full justify-start !py-1.5 text-sm"
            >
              <Wand2 className="h-4 w-4 text-brand-500" /> {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
