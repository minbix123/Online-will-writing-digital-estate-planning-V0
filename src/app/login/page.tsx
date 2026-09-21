"use client";

import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.toLowerCase().trim(),
        password,
      });

      if (!res || res.error) {
        setError("Invalid email or password. Please check your credentials.");
        setLoading(false);
        return;
      }

      // Fetch freshly minted session to determine destination dashboard
      const session = await getSession();
      const role = (session?.user as any)?.role;

      if (role === "LAWYER") {
        router.push("/lawyer/dashboard");
      } else if (role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/customer/dashboard");
      }
      router.refresh();
    } catch (err) {
      setError("An unexpected network or authentication error occurred.");
      setLoading(false);
    }
  };



  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12 selection:bg-[#d4a373]/30 selection:text-white">
      <div className="w-full max-w-md space-y-8 bg-[#0a0a0a] p-8 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.9)] border border-[#222222]">
        <div>
          <div className="flex justify-center mb-2">
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#161616] text-[#d4a373] border border-[#2a2a2a]">
              Secure Access
            </span>
          </div>
          <h2 className="mt-1 text-center text-3xl font-bold tracking-tight text-[#e5e5e5]">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-[#a3a3a3]">
            Digital estate planning & legal will preparation platform
          </p>
        </div>



        <form className="mt-6 space-y-5" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-lg bg-rose-950/40 p-3.5 border border-rose-800/60 text-sm font-medium text-rose-300 text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-[#d4d4d4] mb-1.5">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="relative block w-full rounded-lg border border-[#262626] bg-[#161616] py-2.5 px-3.5 text-[#e5e5e5] placeholder:text-[#555555] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] sm:text-sm transition-colors"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#d4d4d4] mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full rounded-lg border border-[#262626] bg-[#161616] py-2.5 px-3.5 text-[#e5e5e5] placeholder:text-[#555555] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] sm:text-sm transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] px-4 py-2.5 text-sm font-semibold text-neutral-950 shadow-[0_2px_12px_rgba(212,163,115,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <div className="pt-4 border-t border-[#1f1f1f] text-center">
            <p className="text-sm text-[#a3a3a3]">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-[#d4a373] hover:text-[#e0b589] hover:underline"
              >
                Register
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
