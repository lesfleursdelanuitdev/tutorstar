"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth-client";
import { AxolotlMark } from "@/components/axolotl-mark";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Better Auth returns a generic response whether or not the email exists,
    // so we always show the same confirmation — no account enumeration.
    await requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base-200 px-4">
      <div className="w-full max-w-[420px] rounded-[24px] bg-base-100 px-8 py-10 shadow-[0_20px_60px_-30px_rgba(22,52,58,0.4)] sm:px-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <AxolotlMark size={72} title="Axel the axolotl" />
          <h1 className="font-display text-2xl font-extrabold">
            Reset your password
          </h1>
          {sent ? (
            <p className="text-sm text-[color:var(--axo-muted)]">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent
              a link to reset your password. Check your inbox.
            </p>
          ) : (
            <>
              <p className="text-sm text-[color:var(--axo-muted)]">
                Enter your email and we&apos;ll send you a link to set a new
                password.
              </p>
              <form
                onSubmit={handleSubmit}
                className="mt-1 flex w-full flex-col gap-3 text-left"
              >
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-bold text-[color:var(--axo-muted)]">
                    Email
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    className="input input-bordered w-full focus:border-primary focus:outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn-primary btn-chunky chunky-aqua mt-1 w-full font-extrabold"
                  disabled={loading}
                >
                  {loading && (
                    <span className="loading loading-spinner loading-sm" />
                  )}
                  Send reset link
                </button>
              </form>
            </>
          )}
          <Link
            href="/login"
            className="text-sm font-bold text-[color:var(--axo-muted)] hover:text-primary"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
