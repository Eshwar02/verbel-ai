import { AudioLines, Moon, Sun, Github, LogIn, LogOut, User } from "lucide-react";

export default function Header({ theme, onToggleTheme, user, onLogin, onLogout }) {
  return (
    <header className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-600/30">
          <AudioLines className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">verbel-ai</h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Turn text into natural speech
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {user ? (
          <div className="flex items-center gap-2">
            <span className="chip max-w-[10rem] truncate" title={user.email}>
              <User className="h-3.5 w-3.5" />
              {user.email}
            </span>
            <button onClick={onLogout} className="btn-ghost" aria-label="Log out">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        ) : (
          <button onClick={onLogin} className="btn-ghost" aria-label="Log in">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Log in</span>
          </button>
        )}
        <a
          href="https://github.com/Eshwar02/verbel-ai"
          target="_blank"
          rel="noreferrer"
          className="btn-ghost"
          aria-label="View source on GitHub"
        >
          <Github className="h-4 w-4" />
          <span className="hidden sm:inline">GitHub</span>
        </a>
        <button
          onClick={onToggleTheme}
          className="btn-ghost !px-2.5"
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  );
}
