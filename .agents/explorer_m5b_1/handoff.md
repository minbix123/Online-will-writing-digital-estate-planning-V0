# Milestone 5B: OLED Dark Mode Design System & UI/UX Refactor Plan

## 1. Observation

### Codebase & Configuration Audit
1. **`src/app/globals.css` (lines 356-523)**:
   - Contains an incomplete dark skin overlay labelled `/* HEAVY DARK PRODUCT SKIN */`.
   - Uses deep navy/slate values (`#080a0f`, `#121722`, `#1b202d`) rather than pure OLED pitch black (`#000000`).
   - Uses harsh high-contrast white text (`#ffffff`, `#f1f5f9`) that causes halation and eye fatigue on dark displays.
   - Contains legacy Aqua skeuomorphic CSS classes (`.bg-aqua-pinstripes`, `.aqua-card`, `.aqua-window`, `.aqua-titlebar`, `.aqua-traffic-lights`, `.aqua-btn-primary`, `.aqua-btn-secondary`, `.aqua-badge`, `.aqua-inset-well`, `.aqua-glow-focus`) from lines 132-355.
2. **`tests/m1_challenger_stress_test.js` (lines 197-219)**:
   - Directly asserts the physical presence of 14 specific class names in `src/app/globals.css`:
     ```javascript
     const requiredClasses = [
       '.bg-aqua-pinstripes',
       '.aqua-card',
       '.aqua-window',
       '.aqua-titlebar',
       '.aqua-traffic-lights',
       '.aqua-dot-red',
       '.aqua-dot-yellow',
       '.aqua-dot-green',
       '.aqua-btn-primary',
       '.aqua-btn-secondary',
       '.aqua-badge',
       '.aqua-badge-blue',
       '.aqua-inset-well',
       '.aqua-glow-focus'
     ];
     for (const cls of requiredClasses) {
       Assert.ok(css.includes(cls), `Missing Aqua CSS class: ${cls}`);
     }
     ```
   - Line 221-225 forbids any external image URLs (`Assert.equal(imageRefs, null)`).
   - Lines 227-262 check `src/app/page.tsx` for responsive typography (`text-4xl sm:text-5xl lg:text-6xl`, `text-lg sm:text-xl`), padding (`px-4 sm:px-8 lg:px-12`), step grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4`), touch targets (`w-full sm:w-auto`, `flex flex-col sm:flex-row`), and prohibits fixed overlays (`Assert.equal(pageSrc.includes('fixed left-0 top-0'), false)`).
3. **Absence of Shared Navigation & Footer Components**:
   - `src/components/Navbar.tsx` and `src/components/Footer.tsx` did not exist.
   - Navigation and footer chrome were manually duplicated with inline HTML/CSS in `src/app/page.tsx`, `src/app/customer/dashboard/page.tsx`, `src/app/lawyer/dashboard/page.tsx`, and `src/app/admin/layout.tsx`.
   - `src/app/layout.tsx` lacked `<html className="dark">` and had no global navigation or footer wrapper.
4. **Current Test & Build Verification**:
   - Execution command: `node tests/m1_challenger_stress_test.js`
   - Result: 30/30 passed (including clean `npx tsc --noEmit` and production build validation).
5. **Requirement R8 in `ORIGINAL_REQUEST.md` & `PROJECT.md`**:
   - Requires a sophisticated dark mode interface optimized for OLED displays and extended use.
   - True black foundation (`#000000`) for zero-power pixel shutoff.
   - Controlled 4-tier surface depth hierarchy (`#000000` base, `#0a0a0a` level 1, `#141414` level 2, `#1f1f1f` level 3).
   - Softer typography scale (`#e5e5e5`, `#d4d4d4`, `#a3a3a3`, `#737373`) to prevent eye fatigue.
   - Non-jarring, dignified legal accents (muted indigo `#6366f1`, warm legal gold `#c59b27`, subdued status indicators).

---

## 2. Logic Chain

1. **OLED Power Efficiency Requirement**:
   - Because OLED displays turn off individual subpixels at `#000000`, using `#080a0f` or dark blue navy prevents subpixel shutoff and emits ambient glow.
   - Therefore, the app canvas background must be `#000000`.
2. **Preventing Visual Flattening & Halation**:
   - Pure black everywhere without elevation creates an unreadable, flat UI. Conversely, using pure `#ffffff` text on `#000000` causes glyph irradiation and severe eye strain during long legal document review sessions.
   - Therefore, a strict 4-level surface elevation hierarchy (`#000000` canvas -> `#0a0a0a` card/surface -> `#141414` inset/input -> `#1f1f1f` hover/active) combined with a soft zinc/neutral typography scale (`#e5e5e5` primary, `#d4d4d4` body, `#a3a3a3` muted, `#737373` subtle) is required.
3. **Automated Test Constraint Preservation**:
   - Because `tests/m1_challenger_stress_test.js` validates that specific `.aqua-...` class names exist in `src/app/globals.css`, any refactoring that removes these class names will break the test suite.
   - Therefore, the new CSS system must define modern semantic OLED tokens (`.oled-surface`, `.oled-card`, `.oled-btn-...`, `.oled-badge-...`) AND provide backward-compatible aliasing for all `.aqua-...` classes so that they immediately render the OLED dark mode palette.
4. **Navigation Component Centralization**:
   - Because each portal had a disparate, hardcoded header, user sessions and role status were inconsistently displayed.
   - By creating `src/components/Navbar.tsx` (with NextAuth role chips, session indicator, and responsive navigation) and `src/components/Footer.tsx` (with statutory legal disclosures and OLED badge), and mounting them in `src/app/layout.tsx` (or embedding in portals), the user experience becomes unified, professional, and accessible.

---

## 3. Caveats

1. **Static Test Strings**: `tests/m1_challenger_stress_test.js` contains literal string assertions for `src/app/page.tsx` (e.g. `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4`, `w-full sm:w-auto`, `px-4 sm:px-8 lg:px-12`). When editing `src/app/page.tsx`, these exact responsive classes must remain intact.
2. **Suspense Boundaries**: `src/app/customer/checkout/page.tsx` and `src/app/customer/document/page.tsx` have mandatory `<Suspense fallback={...}>` wrappers tested by static string match and prerender output. Any styling change on those pages must preserve the `<Suspense>` boundary and its exact fallback text (`Loading checkout options...` and `Loading document details...`).
3. **No Unrelated Code Rewrites**: Core backend handlers, Prisma queries, NextAuth auth logic, and workflow evaluation must not be modified during this UI/UX pivot.

---

## 4. Conclusion & Concrete Implementation Specifications

### A. Design Token Reference Table

| Category | Token / Class | Hex / Value | Semantic Role |
|---|---|---|---|
| **Canvas** | `--background`, `.oled-canvas` | `#000000` | True black base canvas for OLED efficiency |
| **Surface L1** | `--card`, `.oled-card`, `.oled-surface` | `#0a0a0a` | Primary cards, panels, sidebars, modals |
| **Surface L2** | `--popover`, `.oled-well`, `.oled-input` | `#141414` | Inputs, dropdowns, table headers, repeater items |
| **Surface L3** | `--accent`, `.oled-surface-hover` | `#1f1f1f` - `#242424` | Hover states, active tabs, tooltips |
| **Border Subtle** | `--border-subtle` | `#1f1f1f` | Table dividers, horizontal rules |
| **Border Standard** | `--border`, `.oled-border` | `#262626` | Card outlines, input borders |
| **Border Hover** | `.oled-border-hover` | `#383838` | Interactive hover outlines |
| **Primary Text** | `--foreground`, `.oled-text-primary` | `#e5e5e5` | Headings, titles, high-contrast labels |
| **Secondary Text** | `.oled-text-secondary` | `#d4d4d4` | Body paragraphs, form labels |
| **Muted Text** | `--muted-foreground`, `.oled-text-muted` | `#a3a3a3` | Metadata, timestamps, table column headers |
| **Subtle Text** | `.oled-text-subtle` | `#737373` | Placeholders, disabled states, disclaimers |
| **Accent Indigo** | `--primary`, `.oled-btn-primary` | `#6366f1` / `#4f46e5` | Primary actions, brand highlight |
| **Accent Gold** | `.oled-btn-gold`, `.oled-badge-gold` | `#c59b27` / `#d4a373` | Dignified legal actions, premium tier badges |
| **Status Success** | `.oled-badge-success` | `#10b981` / `#34d399` | Approved, Paid, Final, Saved |
| **Status Warning** | `.oled-badge-warning` | `#f59e0b` / `#fbbf24` | Draft, Clarification Requested, Pending |
| **Status Danger** | `.oled-badge-danger` | `#f43f5e` / `#fb7185` | Rejected, Save Error, Delete |
| **Shadow Ambient** | `.oled-shadow` | `0 4px 24px rgba(0,0,0,0.85)` | Dark-mode depth elevation |
| **Rim Highlight** | `.oled-rim` | `inset 0 1px 0 rgba(255,255,255,0.05)` | Specular top edge highlight |

---

### B. Concrete Code: `src/app/globals.css`
The Worker should replace `src/app/globals.css` with this complete, valid implementation:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
}

/* ==========================================================================
   OLED DARK MODE DESIGN SYSTEM (TRUE BLACK #000000 FOUNDATION)
   High-contrast, zero-eye-strain legal engineering palette
   ========================================================================== */

:root,
.dark {
  --background: #000000;
  --foreground: #e5e5e5;
  --card: #0a0a0a;
  --card-foreground: #e5e5e5;
  --popover: #141414;
  --popover-foreground: #e5e5e5;
  --primary: #6366f1;
  --primary-foreground: #ffffff;
  --secondary: #141414;
  --secondary-foreground: #d4d4d4;
  --muted: #141414;
  --muted-foreground: #a3a3a3;
  --accent: #1f1f1f;
  --accent-foreground: #e5e5e5;
  --destructive: #f43f5e;
  --destructive-foreground: #ffffff;
  --border: #262626;
  --input: #141414;
  --ring: #6366f1;
  --radius: 0.5rem;
  --sidebar: #0a0a0a;
  --sidebar-foreground: #e5e5e5;
  --sidebar-primary: #6366f1;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #1f1f1f;
  --sidebar-accent-foreground: #e5e5e5;
  --sidebar-border: #262626;
  --sidebar-ring: #6366f1;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html {
    color-scheme: dark;
    background-color: #000000;
  }
  body {
    background-color: #000000;
    color: #e5e5e5;
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  }
}

/* ==========================================================================
   SEMANTIC OLED UTILITIES
   ========================================================================== */

.oled-canvas {
  background-color: #000000;
  color: #e5e5e5;
}

.oled-surface {
  background-color: #0a0a0a;
  border: 1px solid #262626;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.oled-surface-hover:hover {
  border-color: #383838;
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.92), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.oled-well {
  background-color: #141414;
  border: 1px solid #262626;
  border-radius: 8px;
  color: #e5e5e5;
}

.oled-well:focus-within {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
}

/* ==========================================================================
   BACKWARD-COMPATIBLE AQUA DESIGN TOKENS (OLED DARK IMPLEMENTATION)
   Preserves 100% compatibility with tests/m1_challenger_stress_test.js
   ========================================================================== */

/* 1. Subtle OLED Geometric Grid Background */
.bg-aqua-pinstripes {
  background-color: #000000 !important;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.12), transparent 48%) !important;
  background-size: 32px 32px, 32px 32px, auto !important;
}

/* 2. OLED Card & Window Frame */
.aqua-card,
.aqua-window {
  background: #0a0a0a !important;
  border: 1px solid #262626 !important;
  border-radius: 14px !important;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
  color: #e5e5e5 !important;
  overflow: hidden;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.aqua-card:hover {
  border-color: #383838 !important;
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.92), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
}

/* 3. OLED Titlebar */
.aqua-titlebar {
  background: #0a0a0a !important;
  border-bottom: 1px solid #1f1f1f !important;
  box-shadow: none !important;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #a3a3a3 !important;
}

/* 4. OLED Subdued Traffic Lights */
.aqua-traffic-lights {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.aqua-dot {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  display: inline-block;
  opacity: 0.8;
}

.aqua-dot-red {
  background: #f43f5e;
  border: 1px solid rgba(244, 63, 94, 0.5);
}

.aqua-dot-yellow {
  background: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.5);
}

.aqua-dot-green {
  background: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.5);
}

/* 5. OLED Primary Button */
.aqua-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px !important;
  font-weight: 600 !important;
  cursor: pointer;
  user-select: none;
  text-decoration: none;
  letter-spacing: 0.01em;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.aqua-btn-primary {
  background: #6366f1 !important;
  color: #ffffff !important;
  border: 1px solid #4f46e5 !important;
  text-shadow: none !important;
  box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3) !important;
}

.aqua-btn-primary:hover {
  background: #4f46e5 !important;
  border-color: #4338ca !important;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.45) !important;
}

.aqua-btn-primary:active {
  transform: translateY(1px);
  background: #3730a3 !important;
}

/* 6. OLED Secondary Button */
.aqua-btn-secondary,
.aqua-btn-silver {
  background: #141414 !important;
  color: #d4d4d4 !important;
  border: 1px solid #262626 !important;
  text-shadow: none !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03) !important;
}

.aqua-btn-secondary:hover,
.aqua-btn-silver:hover {
  background: #1f1f1f !important;
  border-color: #383838 !important;
  color: #e5e5e5 !important;
}

.aqua-btn-secondary:active,
.aqua-btn-silver:active {
  transform: translateY(1px);
  background: #181818 !important;
}

/* 7. OLED Pill Badges */
.aqua-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: #141414 !important;
  border: 1px solid #262626 !important;
  color: #a3a3a3 !important;
  box-shadow: none !important;
}

.aqua-badge-blue {
  background: rgba(99, 102, 241, 0.12) !important;
  border-color: rgba(99, 102, 241, 0.3) !important;
  color: #a5b4fc !important;
}

/* 8. OLED Inset Well & Fields */
.aqua-inset-well {
  background: #141414 !important;
  border: 1px solid #262626 !important;
  border-radius: 8px;
  color: #e5e5e5 !important;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6) !important;
}

/* 9. Focus Ring */
.aqua-glow-focus:focus-visible {
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.35) !important;
}

/* ==========================================================================
   LEGACY OVERRIDES (AUTOMATIC PROTECTION FOR UNREFACTORED HTML UTILITIES)
   ========================================================================== */

.bg-aqua-pinstripes .bg-white,
.bg-aqua-pinstripes .bg-gray-50,
.bg-aqua-pinstripes .bg-slate-50,
.aqua-window .bg-white,
.aqua-window .bg-gray-50 {
  background-color: #0a0a0a !important;
  color: #e5e5e5 !important;
  border-color: #262626 !important;
}

.bg-aqua-pinstripes .text-slate-900,
.bg-aqua-pinstripes .text-gray-900,
.aqua-window .text-slate-900,
.aqua-window .text-gray-900 {
  color: #e5e5e5 !important;
}

.bg-aqua-pinstripes .text-slate-600,
.bg-aqua-pinstripes .text-gray-600,
.bg-aqua-pinstripes .text-slate-500,
.bg-aqua-pinstripes .text-gray-500,
.aqua-window .text-slate-600,
.aqua-window .text-gray-600 {
  color: #a3a3a3 !important;
}

.min-h-screen.bg-gray-50 {
  background: #000000 !important;
  color: #e5e5e5 !important;
}

.min-h-screen.bg-gray-50 > .bg-white,
.min-h-screen.bg-gray-50 .bg-white {
  background: #0a0a0a !important;
  border-color: #262626 !important;
  color: #e5e5e5 !important;
}

.min-h-screen.bg-gray-50 .text-gray-900,
.min-h-screen.bg-gray-50 .text-gray-800,
.min-h-screen.bg-gray-50 .text-gray-700,
.min-h-screen.bg-gray-50 .text-gray-600 {
  color: #d4d4d4 !important;
}

.min-h-screen.bg-gray-50 input,
.min-h-screen.bg-gray-50 select,
.min-h-screen.bg-gray-50 textarea {
  background: #141414 !important;
  border-color: #262626 !important;
  color: #e5e5e5 !important;
}

table {
  color: #d4d4d4;
}

::selection {
  background: rgba(99, 102, 241, 0.4);
  color: #ffffff;
}
```

---

### C. Concrete Code: `src/components/Navbar.tsx`
Create `src/components/Navbar.tsx` with this implementation:

```tsx
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
```

---

### D. Concrete Code: `src/components/Footer.tsx`
Create `src/components/Footer.tsx` with this implementation:

```tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-black border-t border-[#1f1f1f] py-8 px-4 sm:px-6 lg:px-8 mt-auto text-xs text-[#737373]">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Col 1: Platform Info */}
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#e5e5e5] tracking-tight">NyayaWill</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#141414] text-[#a3a3a3] border border-[#262626]">
                OLED Dark Edition
              </span>
            </div>
            <p className="text-xs text-[#a3a3a3] leading-relaxed max-w-md">
              Secure online will-writing and digital estate planning platform for users in India.
              Strictly deterministic document generation using advocate-approved templates under the Indian Succession Act, 1925.
            </p>
          </div>

          {/* Col 2: Legal Framework */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
              Legal Framework
            </div>
            <ul className="space-y-1 text-xs">
              <li className="text-[#a3a3a3]">Indian Succession Act, 1925</li>
              <li className="text-[#a3a3a3]">Statutory Attestation (§63)</li>
              <li className="text-[#a3a3a3]">Advocate Review Protocol</li>
              <li className="text-[#a3a3a3]">Zero AI Hallucination</li>
            </ul>
          </div>

          {/* Col 3: System Status & Security */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
              Platform Integrity
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Deterministic Rules Engine Active</span>
              </div>
              <div className="text-[#a3a3a3]">
                Tamper-Resistant UTC Audit Trail
              </div>
              <div className="text-[#a3a3a3]">
                Server-Side RBAC & Encryption
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-4 border-t border-[#1f1f1f] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#737373]">
          <div>
            © {new Date().getFullYear()} NyayaWill Platform. Strictly confidential & privileged document processing.
          </div>
          <div className="flex items-center gap-4">
            <span>Power-Efficient OLED Theme</span>
            <span>•</span>
            <span>Indian Jurisdiction</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

---

### E. Root Layout Integration: `src/app/layout.tsx`
Update `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NyayaWill — Indian Online Will-Writing & Estate Planning",
  description: "Make your wishes clear before your family has to guess.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-[#e5e5e5] min-h-screen flex flex-col`}
      >
        <Providers>
          <Navbar />
          <div className="flex-1">
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
```

---

### F. Page-by-Page Refactoring Guidelines for Worker

1. **`src/app/page.tsx` (Landing Page)**:
   - Ensure the outer `<main>` retains `min-h-screen bg-aqua-pinstripes text-[#e5e5e5] flex flex-col items-center justify-between px-4 sm:px-8 lg:px-12 py-6 sm:py-10`.
   - Keep the hero classes required by `m1_challenger_stress_test.js`:
     - CTA buttons: `w-full sm:w-auto` and container `flex flex-col sm:flex-row`
     - Responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
     - Typography: `text-4xl sm:text-5xl lg:text-6xl` and `text-lg sm:text-xl`
     - Traffic lights: `hidden sm:flex`
     - Never use `fixed left-0 top-0` or `fixed bottom-0 left-0`.
2. **`src/app/login/page.tsx` & `src/app/register/page.tsx`**:
   - Replace light-mode containers (`bg-gray-50`, `bg-white`, `border-gray-100`, `text-gray-900`) with OLED classes:
     - Outer container: `bg-black`
     - Card container: `bg-[#0a0a0a] border border-[#262626] rounded-xl shadow-2xl`
     - Form inputs: `bg-[#141414] border border-[#262626] text-[#e5e5e5] placeholder:text-[#737373] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]`
     - Demo account buttons in Login: `bg-[#141414] border-[#262626] text-[#d4d4d4] hover:bg-[#1f1f1f] hover:border-[#383838]`
     - Primary button: `bg-[#6366f1] hover:bg-[#4f46e5] text-white border border-[#4f46e5]`
3. **`src/app/customer/dashboard/page.tsx`**:
   - Background: `bg-black` (or `bg-aqua-pinstripes`)
   - Header container: `bg-[#0a0a0a] border border-[#262626]`
   - Case cards: `bg-[#0a0a0a] border border-[#262626] hover:border-[#383838]`
   - Status badges:
     - `DRAFT`: `bg-amber-500/15 text-amber-400 border border-amber-500/30`
     - `SUBMITTED` / `IN_REVIEW`: `bg-indigo-500/15 text-indigo-400 border border-indigo-500/30`
     - `APPROVED` / `DOCUMENTS READY`: `bg-emerald-500/15 text-emerald-400 border border-emerald-500/30`
4. **`src/app/customer/checkout/page.tsx` & `src/app/customer/payment/page.tsx`**:
   - Keep `<Suspense fallback={<div ...>Loading checkout options...</div>}><CheckoutContent /></Suspense>` intact!
   - Outer container: `bg-black`
   - Tier cards:
     - Basic: `bg-[#0a0a0a] border border-[#262626]`
     - Lawyer Review (Recommended): `bg-[#0a0a0a] border-2 border-[#6366f1] shadow-[0_0_20px_rgba(99,102,241,0.2)]`
     - Complex / NRI: `bg-[#0a0a0a] border border-[#262626]`
5. **`src/app/customer/document/page.tsx`**:
   - Keep `<Suspense fallback={<div ...>Loading document details...</div>}><DocumentContent /></Suspense>` intact!
   - Metadata card: `bg-[#0a0a0a] border border-[#262626]`
   - Execution instructions card: `bg-[#141414] border border-[#262626] text-[#d4d4d4]`
6. **`src/app/lawyer/dashboard/page.tsx` & `src/app/lawyer/case/[id]/page.tsx`**:
   - Metrics tiles: `bg-[#0a0a0a] border border-[#262626]`
   - Tables:
     - `table`: `bg-[#0a0a0a] border border-[#262626] divide-[#1f1f1f]`
     - `thead`: `bg-[#141414] text-[#a3a3a3]`
     - `tbody tr`: `border-b border-[#1f1f1f] hover:bg-[#141414]/60 transition-colors`
     - Text: `text-[#e5e5e5]`, secondary `text-[#a3a3a3]`
   - `LawyerDecisionForm.tsx`:
     - Form container: `bg-[#0a0a0a] border border-[#262626]`
     - Action tabs:
       - Approve: Active `bg-emerald-600 text-white`, Inactive `bg-[#141414] text-[#d4d4d4] border-[#262626]`
       - Request Clarification: Active `bg-amber-600 text-white`, Inactive `bg-[#141414] text-[#d4d4d4] border-[#262626]`
       - Reject: Active `bg-rose-600 text-white`, Inactive `bg-[#141414] text-[#d4d4d4] border-[#262626]`
     - Textarea: `bg-[#141414] border-[#262626] text-[#e5e5e5] placeholder:text-[#737373]`
7. **`src/app/admin/layout.tsx` & Admin Pages**:
   - Admin Layout:
     - Main terminal container: `bg-[#0a0a0a] border border-[#262626]`
     - Silver navigation toolbar: replace gradient with `bg-[#141414] border-b border-[#262626] p-2 flex gap-2`
     - Toolbar buttons: `bg-[#0a0a0a] border border-[#262626] text-[#d4d4d4] hover:bg-[#1f1f1f] hover:text-white`
   - Data tables & assigner dropdowns in `users`, `cases`, `templates`, and `audit-logs`:
     - Table rows: `bg-[#0a0a0a] hover:bg-[#141414] border-[#1f1f1f]`
     - Status badges: subtle translucent pills (`bg-.../15`)

---

## 5. Verification Method

1. **Automated M1-M5 Regression & CSS Assertion Suite**:
   ```bash
   node tests/m1_challenger_stress_test.js
   ```
   *Expected Result*: 30 passed, 0 failed. All CSS class tokens (`.bg-aqua-pinstripes`, `.aqua-card`, `.aqua-window`, etc.) and responsive layout rules are satisfied.
2. **TypeScript Compilation Check**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected Result*: Exit code 0, zero type errors.
3. **Next.js Production Build**:
   ```bash
   npm run build
   ```
   *Expected Result*: Build completes successfully, generating static routes (`/customer/checkout`, `/customer/document`, etc.) and dynamic server endpoints.
4. **Visual Inspection & Power Efficiency Verification**:
   - Background inspect in browser developer tools: `body` and root containers must show `background-color: rgb(0, 0, 0)` (`#000000`).
   - Cards and panels must show `background-color: rgb(10, 10, 10)` (`#0a0a0a`) with 1px border `#262626`.
   - Text elements must show `#e5e5e5` (primary) and `#d4d4d4` (secondary) with zero harsh `#ffffff` glare.
   - Interactive elements must show smooth transitions (`0.2s cubic-bezier(0.4, 0, 0.2, 1)`).
