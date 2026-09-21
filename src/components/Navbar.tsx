"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const user = session?.user as any;
  const role = user?.role;

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Admin
          </span>
        );
      case "LAWYER":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Counsel
          </span>
        );
      case "CUSTOMER":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            Client
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-black/95 backdrop-blur-md border-b border-[#1f1f1f] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-center text-xs font-black text-[#e5e5e5] group-hover:border-[#6366f1] transition-colors">
                ⚖
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-[#e5e5e5] group-hover:text-white transition-colors">
                  NyayaWill
                </span>
                <span className="text-[9px] uppercase tracking-widest text-[#737373] font-semibold -mt-0.5">
                  Estate Planning OS
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium">
            {status === "authenticated" && user ? (
              <>
                {role === "CUSTOMER" && (
                  <>
                    <Link
                      href="/customer/dashboard"
                      className={`transition-colors ${
                        pathname?.startsWith("/customer/dashboard")
                          ? "text-[#e5e5e5] font-semibold"
                          : "text-[#a3a3a3] hover:text-[#e5e5e5]"
                      }`}
                    >
                      My Cases
                    </Link>
                    <Link
                      href="/customer/questionnaire"
                      className={`transition-colors ${
                        pathname?.startsWith("/customer/questionnaire")
                          ? "text-[#e5e5e5] font-semibold"
                          : "text-[#a3a3a3] hover:text-[#e5e5e5]"
                      }`}
                    >
                      + New Will
                    </Link>
                  </>
                )}

                {role === "LAWYER" && (
                  <Link
                    href="/lawyer/dashboard"
                    className={`transition-colors ${
                      pathname?.startsWith("/lawyer")
                        ? "text-[#e5e5e5] font-semibold"
                        : "text-[#a3a3a3] hover:text-[#e5e5e5]"
                    }`}
                  >
                    Advocate Docket
                  </Link>
                )}

                {role === "ADMIN" && (
                  <>
                    <Link
                      href="/admin/dashboard"
                      className={`transition-colors ${
                        pathname === "/admin/dashboard" || pathname === "/admin"
                          ? "text-[#e5e5e5] font-semibold"
                          : "text-[#a3a3a3] hover:text-[#e5e5e5]"
                      }`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/admin/users"
                      className={`transition-colors ${
                        pathname?.startsWith("/admin/users")
                          ? "text-[#e5e5e5] font-semibold"
                          : "text-[#a3a3a3] hover:text-[#e5e5e5]"
                      }`}
                    >
                      Users
                    </Link>
                    <Link
                      href="/admin/cases"
                      className={`transition-colors ${
                        pathname?.startsWith("/admin/cases")
                          ? "text-[#e5e5e5] font-semibold"
                          : "text-[#a3a3a3] hover:text-[#e5e5e5]"
                      }`}
                    >
                      Cases
                    </Link>
                    <Link
                      href="/admin/templates"
                      className={`transition-colors ${
                        pathname?.startsWith("/admin/templates")
                          ? "text-[#e5e5e5] font-semibold"
                          : "text-[#a3a3a3] hover:text-[#e5e5e5]"
                      }`}
                    >
                      Templates
                    </Link>
                    <Link
                      href="/admin/audit-logs"
                      className={`transition-colors ${
                        pathname?.startsWith("/admin/audit-logs")
                          ? "text-[#e5e5e5] font-semibold"
                          : "text-[#a3a3a3] hover:text-[#e5e5e5]"
                      }`}
                    >
                      Audit Trail
                    </Link>
                  </>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/#how-it-works"
                  className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
                >
                  How It Works
                </Link>
              </>
            )}
          </nav>

          {/* User Session & Action Controls */}
          <div className="flex items-center gap-3">
            {status === "authenticated" && user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2">
                  {getRoleBadge(role)}
                  <span className="text-xs text-[#a3a3a3] font-medium max-w-[160px] truncate" title={user.email}>
                    {user.name || user.email}
                  </span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#141414] hover:bg-[#1f1f1f] text-[#d4d4d4] hover:text-[#e5e5e5] border border-[#262626] transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#141414] hover:bg-[#1f1f1f] text-[#d4d4d4] hover:text-[#e5e5e5] border border-[#262626] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white border border-[#4f46e5] shadow-[0_2px_8px_rgba(99,102,241,0.25)] transition-colors"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#141414] border border-transparent hover:border-[#262626]"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#1f1f1f] bg-[#0a0a0a] px-4 py-3 space-y-2">
          {status === "authenticated" && user ? (
            <>
              <div className="flex items-center justify-between pb-2 border-b border-[#1f1f1f]">
                <span className="text-xs text-[#a3a3a3] truncate">{user.email}</span>
                {getRoleBadge(role)}
              </div>
              {role === "CUSTOMER" && (
                <>
                  <Link
                    href="/customer/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-1.5 text-xs font-medium text-[#d4d4d4] hover:text-[#e5e5e5]"
                  >
                    My Cases
                  </Link>
                  <Link
                    href="/customer/questionnaire"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-1.5 text-xs font-medium text-[#d4d4d4] hover:text-[#e5e5e5]"
                  >
                    + New Will
                  </Link>
                </>
              )}
              {role === "LAWYER" && (
                <Link
                  href="/lawyer/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-1.5 text-xs font-medium text-[#d4d4d4] hover:text-[#e5e5e5]"
                >
                  Advocate Docket
                </Link>
              )}
              {role === "ADMIN" && (
                <>
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-1.5 text-xs font-medium text-[#d4d4d4] hover:text-[#e5e5e5]"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/users"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-1.5 text-xs font-medium text-[#d4d4d4] hover:text-[#e5e5e5]"
                  >
                    Users
                  </Link>
                  <Link
                    href="/admin/cases"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-1.5 text-xs font-medium text-[#d4d4d4] hover:text-[#e5e5e5]"
                  >
                    Cases
                  </Link>
                  <Link
                    href="/admin/templates"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-1.5 text-xs font-medium text-[#d4d4d4] hover:text-[#e5e5e5]"
                  >
                    Templates
                  </Link>
                  <Link
                    href="/admin/audit-logs"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-1.5 text-xs font-medium text-[#d4d4d4] hover:text-[#e5e5e5]"
                  >
                    Audit Trail
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <Link
                href="/#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1.5 text-xs font-medium text-[#d4d4d4] hover:text-[#e5e5e5]"
              >
                How It Works
              </Link>
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-xs font-semibold rounded-lg bg-[#141414] text-[#d4d4d4] border border-[#262626]"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-xs font-semibold rounded-lg bg-[#6366f1] text-white"
                >
                  Register
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
