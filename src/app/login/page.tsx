"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { AxolotlMark } from "@/components/axolotl-mark";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn.email({ email, password });
    if (error) {
      setError(error.message ?? "Sign-in failed. Please try again.");
      setLoading(false);
      return;
    }
    // Full navigation ensures the session cookie is sent on the first
    // dashboard request — client-side router.push can race the cookie.
    window.location.assign("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-base-200 px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full opacity-70"
        style={{ background: "var(--axo-aqua-tint-2)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -right-20 size-80 rounded-full opacity-70"
        style={{ background: "var(--axo-pink-tint-2)" }}
      />

      <div className="relative w-full max-w-[420px] rounded-[24px] bg-base-100 px-8 py-12 shadow-[0_20px_60px_-30px_rgba(22,52,58,0.4)] sm:px-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <AxolotlMark size={84} title="Axel the axolotl" />
          <div>
            <h1 className="font-display text-3xl font-extrabold">Welcome back!</h1>
            <p className="mt-1 text-sm text-[color:var(--axo-muted)]">
              Your students missed you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-2 flex w-full flex-col gap-3.5 text-left">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-[color:var(--axo-muted)]">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@tutorstar.app"
                className="input input-bordered w-full focus:border-primary focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-[color:var(--axo-muted)]">
                Password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="input input-bordered w-full pr-16 focus:border-primary focus:outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-primary"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <Link
              href="/forgot-password"
              className="self-end text-[13px] font-bold text-primary hover:underline"
            >
              Forgot password?
            </Link>

            {error && (
              <div role="alert" className="alert alert-error py-2 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-chunky chunky-aqua mt-1 w-full font-extrabold"
              disabled={loading}
            >
              {loading && <span className="loading loading-spinner loading-sm" />}
              Log in →
            </button>
          </form>

          <p className="text-sm text-[color:var(--axo-muted)]">
            New here?{" "}
            <span className="font-extrabold text-secondary">
              ask your tutor for an invite
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
