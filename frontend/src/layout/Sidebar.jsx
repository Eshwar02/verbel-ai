import { NavLink } from "react-router-dom";
import {
  AudioLines,
  Mic2,
  History as HistoryIcon,
  Sparkles,
  UserCircle2,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Github,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

const NAV = [
  { to: "/", label: "Studio", icon: Sparkles, end: true },
  { to: "/history", label: "History", icon: HistoryIcon },
  { to: "/voices", label: "Voices", icon: Mic2 },
  { to: "/account", label: "Account", icon: UserCircle2 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

function itemClass({ isActive }) {
  return [
    "flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm font-semibold transition",
    isActive
      ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300"
      : "border-transparent text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/70 dark:hover:text-neutral-100",
  ].join(" ");
}

/** Persistent left navigation for the SaaS shell. */
export default function Sidebar() {
  const { theme, toggleTheme, user } = useApp();

  return (
    <aside className="flex w-16 shrink-0 flex-col border-r border-neutral-200 bg-white sm:w-60 dark:border-neutral-800 dark:bg-neutral-950">
      {/* brand */}
      <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-brand-600 text-white">
          <AudioLines className="h-5 w-5" />
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-extrabold leading-tight tracking-tight">verbel-ai</p>
          <p className="text-[11px] font-medium text-neutral-400">text · to · speech</p>
        </div>
      </div>

      {/* nav */}
      <nav className="flex-1 py-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={itemClass}>
            <Icon className="h-5 w-5 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* footer */}
      <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        {user && (
          <p className="mb-2 hidden truncate px-1 text-[11px] font-medium text-neutral-400 sm:block" title={user.email}>
            {user.email}
          </p>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="btn-ghost !px-2.5"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <a
            href="https://github.com/Eshwar02/verbel-ai"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost !px-2.5"
            aria-label="View source on GitHub"
            title="GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </aside>
  );
}
