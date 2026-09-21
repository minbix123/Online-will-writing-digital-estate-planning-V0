"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your full legal name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // Automatically sign in the user
      const loginRes = await signIn("credentials", {
        redirect: false,
        email: email.toLowerCase().trim(),
        password,
      });

      if (loginRes && !loginRes.error) {
        router.push("/customer/dashboard");
        router.refresh();
      } else {
        router.push("/login?registered=true");
      }
    } catch (err) {
      console.error("Registration submit error:", err);
      setError("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4 py-12 text-[#d4d4d4] selection:bg-[#d4a373]/30 selection:text-white">
      <div className="w-full max-w-md">
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.9)] overflow-hidden">
          {/* Titlebar */}
          <div className="bg-[#111111] border-b border-[#222222] px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
            </div>
            <span className="text-xs font-semibold text-[#d4a373] tracking-wide uppercase">
              Customer Registration
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8 space-y-6 bg-[#0a0a0a]">
            <div className="text-center">
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#161616] text-[#d4a373] border border-[#2a2a2a] mb-2">
                New Account
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#e5e5e5] mt-1">
                Create Your Account
              </h1>
              <p className="text-xs sm:text-sm text-[#a3a3a3] mt-1">
                Begin your legally compliant estate planning journey
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-950/40 p-3.5 border border-rose-800/60 text-xs text-rose-300 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="register-name"
                  className="block text-xs font-semibold text-[#d4d4d4] mb-1.5"
                >
                  Full Legal Name
                </label>
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#161616] border border-[#262626] text-[#e5e5e5] placeholder:text-[#555555] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="register-email"
                  className="block text-xs font-semibold text-[#d4d4d4] mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#161616] border border-[#262626] text-[#e5e5e5] placeholder:text-[#555555] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="register-password"
                  className="block text-xs font-semibold text-[#d4d4d4] mb-1.5"
                >
                  Password (min 6 characters)
                </label>
                <input
                  id="register-password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#161616] border border-[#262626] text-[#e5e5e5] placeholder:text-[#555555] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="register-confirm-password"
                  className="block text-xs font-semibold text-[#d4d4d4] mb-1.5"
                >
                  Confirm Password
                </label>
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#161616] border border-[#262626] text-[#e5e5e5] placeholder:text-[#555555] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] text-neutral-950 shadow-[0_2px_12px_rgba(212,163,115,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-[#1f1f1f] text-center">
              <p className="text-xs text-[#a3a3a3]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[#d4a373] hover:text-[#e0b589] hover:underline"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
