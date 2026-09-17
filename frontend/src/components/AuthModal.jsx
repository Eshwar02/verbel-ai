import { useState } from "react";
import { LogIn, UserPlus, Mail, Lock, X, Loader2 } from "lucide-react";
import { logIn, signUp } from "../lib/auth";

/** Login / Sign-up modal.
 *
 * Props:
 *   open        — whether the modal is shown
 *   onClose()   — dismiss the modal
 *   onAuthed(user) — called with the user object on success
 *   onError(msg)   — called with an error string on failure
 */
export default function AuthModal({ open, onClose, onAuthed, onError }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const isSignup = mode === "signup";

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const user = isSignup
        ? await signUp(email.trim(), password)
        : await logIn(email.trim(), password);
      onAuthed?.(user);
      setPassword("");
    } catch (err) {
      onError?.(err.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isSignup ? "Create account" : "Welcome back"}
          </h2>
          <button
            onClick={onClose}
            className="opacity-60 transition hover:opacity-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium opacity-80">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -tranneutral-y-1/2 opacity-50" />
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
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -tranneutral-y-1/2 opacity-50" />
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
            className="font-medium underline underline-offset-2 hover:opacity-100"
          >
            {isSignup ? "Log in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  );
}
