"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { resetPassword } from "@/lib/auth-client";

// Better Auth's default minimum; mirrored here for a friendly client-side check.
const MIN_PASSWORD_LENGTH = 8;

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
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h1 className="card-title">Password updated</h1>
          <p className="text-sm text-base-content/70">
            Your password has been reset. You can now sign in with it.
          </p>
          <Link href="/login" className="btn btn-primary btn-sm mt-2">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  // Better Auth redirects here with ?error=INVALID_TOKEN when a link is bad or
  // expired, and with ?token=... when it's valid.
  if (!token || error) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h1 className="card-title">Link expired</h1>
          <p className="text-sm text-base-content/70">
            This password reset link is invalid or has expired. Request a new
            one to try again.
          </p>
          <Link href="/forgot-password" className="btn btn-primary btn-sm mt-2">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
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
      setFormError(resetError.message ?? "Couldn't reset your password. Try again.");
      setLoading(false);
      return;
    }
    setDone(true);
  }

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h1 className="card-title">Choose a new password</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="form-control w-full">
            <span className="label-text mb-1">New password</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="input input-bordered w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1">Confirm password</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="input input-bordered w-full"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>

          {formError && (
            <div role="alert" className="alert alert-error text-sm py-2">
              {formError}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full mt-2"
            disabled={loading}
          >
            {loading && <span className="loading loading-spinner loading-sm" />}
            Set new password
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <Link href="/" className="flex items-center justify-center gap-2">
            <GraduationCap className="size-7 text-primary" />
            <span className="text-2xl font-bold">TutorStar</span>
          </Link>
          <Suspense
            fallback={
              <div className="card bg-base-100 shadow-md">
                <div className="card-body items-center">
                  <span className="loading loading-spinner" />
                </div>
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
