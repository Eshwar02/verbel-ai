import { useState } from "react";
import { LogIn, UserPlus, Mail, Lock, Loader2, LogOut, UserCircle2, Cloud } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import LottiePlayer from "../components/LottiePlayer.jsx";
import { equalizer } from "../assets/lottie/equalizer.js";
import { logIn, signUp } from "../lib/auth.js";
import { useApp } from "../context/AppContext.jsx";

const LOGIN_ANIM = equalizer({ color: "#7c3aed", bars: 11, w: 300, h: 200 });

function LoginForm() {
  const { setUser, setToast } = useApp();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const user = isSignup
        ? await signUp(email.trim(), password)
        : await logIn(email.trim(), password);
      setUser(user);
      setPassword("");
      setToast({ type: "success", message: "Signed in." });
    } catch (err) {
      setToast({ type: "error", message: err.message || "Authentication failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="mb-5 text-lg font-semibold">
        {isSignup ? "Create account" : "Welcome back"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium opacity-80">Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="select w-full pl-9"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium opacity-80">Password</span>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="select w-full pl-9"
            />
          </div>
        </label>

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSignup ? (
            <UserPlus className="h-4 w-4" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          {isSignup ? "Sign up" : "Log in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm opacity-70">
        {isSignup ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isSignup ? "login" : "signup")}
          className="font-medium text-brand-600 underline underline-offset-2 hover:opacity-100 dark:text-brand-300"
        >
          {isSignup ? "Log in" : "Create one"}
        </button>
      </p>
    </div>
  );
}

function Profile() {
  const { user, handleLogout } = useApp();
  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center bg-brand-600 text-white">
          <UserCircle2 className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" title={user.email}>
            {user.email}
          </p>
          <p className="text-xs text-neutral-400">Signed in</p>
        </div>
      </div>
      <div className="mb-5 flex items-center gap-2 border border-action-200 bg-action-50 p-3 text-xs font-medium text-action-700 dark:border-action-700/50 dark:bg-action-900/20 dark:text-action-300">
        <Cloud className="h-4 w-4" />
        Your history syncs to the cloud across devices.
      </div>
      <button onClick={handleLogout} className="btn-ghost w-full">
        <LogOut className="h-4 w-4" /> Log out
      </button>
    </div>
  );
}

/** Account — dedicated login / profile page with a Lottie hero. */
export default function Account() {
  const { user } = useApp();
  return (
    <>
      <PageHeader
        title="Account"
        subtitle={user ? "Manage your session." : "Sign in to sync your history."}
      />
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          {user ? <Profile /> : <LoginForm />}
        </div>
        <div className="order-1 flex flex-col items-center justify-center gap-3 lg:order-2">
          <LottiePlayer
            animationData={LOGIN_ANIM}
            className="w-full max-w-sm"
            ariaLabel="Voice waves"
          />
          <p className="text-center text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Give your words a voice.
          </p>
        </div>
      </div>
    </>
  );
}
