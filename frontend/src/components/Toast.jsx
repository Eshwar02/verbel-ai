import { useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

/** Toast notification for errors and success. Doubles as the ErrorMessage
 *  surface required by the spec (API / validation / network errors). */
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, toast.type === "error" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const error = toast.type === "error";

  return (
    <div
      className="fixed bottom-6 right-6 z-50 animate-slide-in"
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`flex max-w-sm items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur ${
          error
            ? "border-red-200 bg-red-50/95 text-red-800 dark:border-red-500/30 dark:bg-red-950/80 dark:text-red-200"
            : "border-emerald-200 bg-emerald-50/95 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/80 dark:text-emerald-200"
        }`}
      >
        {error ? (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        )}
        <p className="text-sm font-medium">{toast.message}</p>
        <button onClick={onClose} className="ml-auto shrink-0 opacity-60 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
