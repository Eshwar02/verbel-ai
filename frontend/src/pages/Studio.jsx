import { useEffect } from "react";
import TextInput from "../components/TextInput.jsx";
import LanguageSelector from "../components/LanguageSelector.jsx";
import VoiceSelector from "../components/VoiceSelector.jsx";
import EngineSelector from "../components/EngineSelector.jsx";
import GenerateButton from "../components/GenerateButton.jsx";
import AudioPlayer from "../components/AudioPlayer.jsx";
import DocumentUpload from "../components/DocumentUpload.jsx";
import EnhanceMenu from "../components/EnhanceMenu.jsx";
import PageHeader from "../components/PageHeader.jsx";
import LottiePlayer from "../components/LottiePlayer.jsx";
import { equalizer } from "../assets/lottie/equalizer.js";
import { useApp, MAX_LENGTH } from "../context/AppContext.jsx";

const GENERATING_ANIM = equalizer({ color: "#16a34a", bars: 7, w: 240, h: 90 });

/** Studio — the primary text-to-speech generation workspace. */
export default function Studio() {
  const {
    text,
    setText,
    trimmed,
    languages,
    activeLanguages,
    engine,
    neuralAvailable,
    handleEngineChange,
    language,
    onLanguageChange,
    voice,
    setVoice,
    voices,
    favorites,
    detecting,
    loading,
    canGenerate,
    audio,
    batch,
    setBatch,
    batchLoading,
    handleGenerate,
    handleGenerateBatch,
    handleAutoDetect,
    handlePreviewVoice,
    handleToggleFavorite,
    setToast,
  } = useApp();

  // keyboard shortcut: Cmd/Ctrl + Enter
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canGenerate) {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canGenerate, handleGenerate]);

  return (
    <>
      <PageHeader title="Studio" subtitle="Turn text into natural-sounding speech." />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <TextInput value={text} onChange={setText} maxLength={MAX_LENGTH} />

          <div className="flex flex-wrap items-center gap-2">
            <DocumentUpload
              onExtracted={(t) => setText(t.slice(0, MAX_LENGTH))}
              onError={(m) => setToast({ type: "error", message: m })}
            />
            <EnhanceMenu
              text={text}
              onEnhanced={setText}
              onError={(m) => setToast({ type: "error", message: m })}
            />
          </div>

          <div className="card p-5">
            {neuralAvailable && (
              <EngineSelector value={engine} onChange={handleEngineChange} />
            )}
            {languages.length === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
                <div className="h-16 animate-pulse bg-neutral-200/70 dark:bg-neutral-800" />
                <div className="h-16 animate-pulse bg-neutral-200/70 dark:bg-neutral-800" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <LanguageSelector
                  languages={activeLanguages}
                  value={language}
                  onChange={onLanguageChange}
                  onAutoDetect={handleAutoDetect}
                  detecting={detecting}
                  canDetect={trimmed.length >= 8}
                />
                <VoiceSelector
                  voices={voices}
                  value={voice}
                  onChange={setVoice}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onPreview={handlePreviewVoice}
                  onError={(m) => setToast({ type: "error", message: m })}
                />
              </div>
            )}
            <div className="mt-4 space-y-2">
              <GenerateButton
                onClick={handleGenerate}
                loading={loading}
                disabled={!canGenerate}
              />
              {engine === "standard" && (
                <button
                  onClick={handleGenerateBatch}
                  disabled={batchLoading || !trimmed}
                  className="btn-ghost w-full text-xs"
                  title="Split the text by line and generate one clip per line"
                >
                  {batchLoading ? "Generating batch…" : "Batch generate (one clip per line)"}
                </button>
              )}
            </div>

            {loading && (
              <div className="mt-4 flex flex-col items-center gap-1 border border-action-200 bg-action-50 p-3 dark:border-action-700/50 dark:bg-action-900/20">
                <LottiePlayer
                  animationData={GENERATING_ANIM}
                  className="h-14 w-48"
                  ariaLabel="Generating speech"
                />
                <p className="text-xs font-semibold text-action-700 dark:text-action-300">
                  Generating speech…
                </p>
              </div>
            )}
          </div>

          {audio && <AudioPlayer src={audio.url} downloadName={audio.name} />}

          {batch && (
            <div className="card animate-fade-in p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Batch results ({batch.length})</h3>
                <button
                  className="btn-ghost !px-2.5 !py-1.5 text-xs"
                  onClick={() => setBatch(null)}
                >
                  Dismiss
                </button>
              </div>
              <div className="space-y-4">
                {batch.map((b, i) => (
                  <div key={i}>
                    <p className="mb-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {i + 1}. {b.text}
                    </p>
                    {b.url ? (
                      <AudioPlayer src={b.url} downloadName={`clip_${i + 1}.mp3`} />
                    ) : (
                      <p className="text-xs text-red-500">Failed: {b.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5 text-sm text-neutral-500 dark:text-neutral-400">
            <p className="mb-2 font-semibold text-neutral-700 dark:text-neutral-200">
              Tips
            </p>
            <ul className="list-inside list-disc space-y-1 text-xs">
              <li>Press ⌘/Ctrl + Enter to generate.</li>
              <li>Use Auto-detect to pick the language from your text.</li>
              <li>Preview a voice before generating from the Voice picker.</li>
              <li>Import a PDF, DOCX or TXT with Document.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
