import { Moon, Sun } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import EngineSelector from "../components/EngineSelector.jsx";
import { useApp } from "../context/AppContext.jsx";

function Row({ title, description, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 py-4 last:border-0 dark:border-neutral-800">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/** Settings — theme and generation defaults. */
export default function Settings() {
  const { theme, setTheme, engine, handleEngineChange, neuralAvailable } = useApp();

  return (
    <>
      <PageHeader title="Settings" subtitle="Appearance and generation defaults." />

      <div className="card p-5">
        <Row title="Theme" description="Switch between light and dark.">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme("light")}
              className={theme === "light" ? "btn-primary !px-3" : "btn-ghost !px-3"}
            >
              <Sun className="h-4 w-4" /> Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={theme === "dark" ? "btn-primary !px-3" : "btn-ghost !px-3"}
            >
              <Moon className="h-4 w-4" /> Dark
            </button>
          </div>
        </Row>

        {neuralAvailable && (
          <Row title="Default engine" description="Standard (gTTS) or Neural (Voxtral).">
            <div className="w-56">
              <EngineSelector value={engine} onChange={handleEngineChange} />
            </div>
          </Row>
        )}
      </div>
    </>
  );
}
