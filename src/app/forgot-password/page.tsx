"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { requestPasswordReset } from "@/lib/auth-client";

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
    <div className="min-h-screen flex flex-col bg-base-200">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <Link href="/" className="flex items-center justify-center gap-2">
            <GraduationCap className="size-7 text-primary" />
            <span className="text-2xl font-bold">TutorStar</span>
          </Link>

          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h1 className="card-title">Reset your password</h1>
              {sent ? (
                <p className="text-sm text-base-content/70">
                  If an account exists for <strong>{email}</strong>, we&apos;ve
                  sent a link to reset your password. Check your inbox.
                </p>
              ) : (
                <>
                  <p className="text-sm text-base-content/70">
                    Enter your email and we&apos;ll send you a link to set a new
                    password.
                  </p>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <label className="form-control w-full">
                      <span className="label-text mb-1">Email</span>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        className="input input-bordered w-full"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </label>
                    <button
                      type="submit"
                      className="btn btn-primary w-full mt-2"
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
            </div>
          </div>

          <Link
            href="/login"
            className="link link-hover text-sm text-base-content/60 text-center"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
