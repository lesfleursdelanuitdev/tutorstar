"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/auth-client";
import { AxolotlMark } from "@/components/axolotl-mark";

const MIN_PASSWORD_LENGTH = 8;

const CARD =
  "w-full rounded-[24px] bg-base-100 px-8 py-8 shadow-[0_20px_60px_-30px_rgba(22,52,58,0.4)] sm:px-10";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const error = params.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className={CARD}>
        <div className="flex flex-col items-center gap-4 text-center">
          <AxolotlMark size={72} title="Axel the axolotl" />
          <h1 className="font-display text-2xl font-extrabold">
            Password updated
          </h1>
          <p className="text-sm text-[color:var(--axo-muted)]">
            Your password has been reset. You can now sign in with it.
          </p>
          <Link
            href="/login"
            className="btn btn-primary btn-chunky chunky-aqua mt-1 font-extrabold"
          >
            Go to sign in →
          </Link>
        </div>
      </div>
    );
  }

  if (!token || error) {
    return (
      <div className={CARD}>
        <div className="flex flex-col items-center gap-4 text-center">
          <AxolotlMark size={72} title="Axel the axolotl" />
          <h1 className="font-display text-2xl font-extrabold">Link expired</h1>
          <p className="text-sm text-[color:var(--axo-muted)]">
            This password reset link is invalid or has expired. Request a new
            one to try again.
          </p>
          <Link
            href="/forgot-password"
            className="btn btn-primary btn-chunky chunky-aqua mt-1 font-extrabold"
          >
            Request a new link →
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error: resetError } = await resetPassword({
      newPassword: password,
      token: token!,
    });
    if (resetError) {
      setFormError(
        resetError.message ?? "Couldn't reset your password. Try again.",
      );
      setLoading(false);
      return;
    }
    setDone(true);
  }

  return (
    <div className={CARD}>
      <div className="flex flex-col items-center gap-4 text-center">
        <AxolotlMark size={72} title="Axel the axolotl" />
        <h1 className="font-display text-2xl font-extrabold">
          Choose a new password
        </h1>
        <form
          onSubmit={handleSubmit}
          className="mt-1 flex w-full flex-col gap-3 text-left"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-[color:var(--axo-muted)]">
              New password
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="input input-bordered w-full focus:border-primary focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-[color:var(--axo-muted)]">
              Confirm password
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="input input-bordered w-full focus:border-primary focus:outline-none"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>

          {formError && (
            <div role="alert" className="alert alert-error py-2 text-sm">
              {formError}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-chunky chunky-aqua mt-1 w-full font-extrabold"
            disabled={loading}
          >
            {loading && <span className="loading loading-spinner loading-sm" />}
            Set new password →
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base-200 px-4">
      <div className="w-full max-w-[420px]">
        <Suspense
          fallback={
            <div className={CARD}>
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
