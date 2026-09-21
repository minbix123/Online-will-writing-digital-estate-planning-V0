"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    // In a real application, this would call an API route to generate a Prisma PasswordResetToken
    // and send an email via Resend/SendGrid. For this MVP, we will simulate the success state.
    setTimeout(() => {
      setStatus("success");
    }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-[#f5f5f5]">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-[#a3a3a3]">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {status === "success" ? (
          <div className="rounded-lg bg-[#0a0a0a] border border-emerald-900/50 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.9)] text-center">
            <h3 className="text-emerald-400 font-medium mb-2">Check your email</h3>
            <p className="text-[#a3a3a3] text-sm mb-6">
              We have sent a password reset link to <span className="text-white font-medium">{email}</span>.
            </p>
            <Link
              href="/login"
              className="inline-flex justify-center rounded-lg bg-[#161616] hover:bg-[#262626] border border-[#262626] px-4 py-2.5 text-sm font-semibold text-[#d4d4d4] transition-all"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-lg bg-[#0a0a0a] border border-[#222222] p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.9)]">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#d4d4d4] mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="relative block w-full rounded-lg border border-[#262626] bg-[#161616] py-2.5 px-3.5 text-[#e5e5e5] placeholder:text-[#555555] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] sm:text-sm transition-colors"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="group relative flex w-full justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] px-4 py-2.5 text-sm font-semibold text-neutral-950 shadow-[0_2px_12px_rgba(212,163,115,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {status === "loading" ? "Sending link..." : "Send reset link"}
                </button>
                <Link
                  href="/login"
                  className="group relative flex w-full justify-center rounded-lg bg-transparent hover:bg-[#161616] px-4 py-2.5 text-sm font-semibold text-[#a3a3a3] hover:text-[#d4d4d4] transition-all"
                >
                  Back to login
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
