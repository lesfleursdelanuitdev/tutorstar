"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    router.push("/dashboard");
    router.refresh();
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
              <h1 className="card-title">Sign in</h1>
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
                <label className="form-control w-full">
                  <span className="label-text mb-1">Password</span>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    className="input input-bordered w-full"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>

                {error && (
                  <div role="alert" className="alert alert-error text-sm py-2">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-full mt-2"
                  disabled={loading}
                >
                  {loading && <span className="loading loading-spinner loading-sm" />}
                  Sign in
                </button>
              </form>
              <Link
                href="/forgot-password"
                className="link link-hover text-sm text-base-content/60 text-center mt-1"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <p className="text-center text-sm text-base-content/60">
            Accounts are created by your tutor — ask them for an invite.
          </p>
        </div>
      </div>
    </div>
  );
}
