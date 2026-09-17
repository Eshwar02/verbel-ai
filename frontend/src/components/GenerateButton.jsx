import { Loader2, Waves } from "lucide-react";

export default function GenerateButton({ onClick, loading, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="btn-action w-full py-3 text-base"
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" /> Generating…
        </>
      ) : (
        <>
          <Waves className="h-5 w-5" /> Generate Speech
        </>
      )}
      <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold sm:inline">
        ⌘↵
      </kbd>
    </button>
  );
}
