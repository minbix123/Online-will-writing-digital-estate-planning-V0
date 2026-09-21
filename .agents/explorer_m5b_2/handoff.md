# Handoff Report: Explorer 2 (Milestone 5B: Landing, Auth & Customer Portal OLED Refactor)

**Working Directory**: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m5b_2`  
**Parent Conversation ID**: `898420ba-c6a5-4a01-8505-4fa4c5a8aa30`  
**Milestone**: 5B (OLED Dark Mode UI/UX Refactor)  

---

## 1. Observation

Direct code and style observations made across all target files in Explorer 2 scope:

### A. Landing Page (`src/app/page.tsx`)
- **Line 5**: Uses legacy Aqua pinstripes and slate text: `<main className="min-h-screen bg-aqua-pinstripes text-slate-800 flex flex-col items-center justify-between px-4 sm:px-8 lg:px-12 py-6 sm:py-10">`
- **Lines 8–15**: Uses Aqua window wrapper and skeuomorphic traffic lights:
  ```tsx
  <div className="aqua-window flex items-center justify-between px-4 sm:px-6 py-3">
    <div className="aqua-traffic-lights hidden sm:flex">
      <span className="aqua-dot aqua-dot-red" title="Close" />
      <span className="aqua-dot aqua-dot-yellow" title="Minimize" />
      <span className="aqua-dot aqua-dot-green" title="Zoom" />
    </div>
  ```
- **Lines 22–33**: Register and Login buttons use `.aqua-btn-primary` and `.aqua-btn-secondary` gel buttons.
- **Lines 40–68**: Hero card uses `aqua-card`, `aqua-badge`, `text-slate-900`, and `text-slate-600`.
- **Lines 82–153**: "How It Works" 4-step grid repeats `aqua-window`, `aqua-titlebar`, `aqua-traffic-lights`, and `text-slate-900`/`text-slate-600`.
- **Lines 157–159**: Footer has `border-slate-200/60 text-slate-500`.

### B. Authentication Pages (`src/app/login/page.tsx` & `src/app/register/page.tsx`)
- **`src/app/login/page.tsx`**:
  - **Line 58**: Background is hardcoded light gray: `<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">`.
  - **Line 59**: Card is pure white: `<div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-md border border-gray-100">`.
  - **Lines 69–103**: Demo account box is light blue `bg-blue-50/60 p-3.5 border border-blue-100` with white buttons `bg-white border-blue-200 hover:bg-blue-100/50`.
  - **Lines 106–110**: Error banner is `bg-red-50 p-3 border border-red-200 text-red-700`.
  - **Lines 117–142**: Form inputs use light borders and white backgrounds: `border-gray-300 py-2 px-3 text-gray-900 placeholder:text-gray-400 focus:ring-blue-600`.
  - **Lines 149–153**: Submit button is `bg-blue-600 hover:bg-blue-500`.
- **`src/app/register/page.tsx`**:
  - **Line 84**: Uses `bg-aqua-pinstripes`.
  - **Lines 87–99**: Uses `aqua-window`, `aqua-titlebar`, and traffic lights.
  - **Line 102**: Container has `bg-gradient-to-b from-white/95 to-slate-50/90`.
  - **Lines 123–198**: Form inputs use `bg-white border border-slate-300 text-slate-900`.
  - **Line 204**: Submit button uses `aqua-btn aqua-btn-primary`.

### C. Customer Dashboard (`src/app/customer/dashboard/page.tsx`)
- **Line 24–72**: Status badge helper `getStatusBadge()` renders light-mode pastel pills (`bg-amber-50 border-amber-300`, `bg-indigo-50 border-indigo-300`, `bg-emerald-50 border-emerald-300`, etc.) wrapped in `.aqua-badge`.
- **Line 75**: Uses `min-h-screen bg-aqua-pinstripes p-4 sm:p-8`.
- **Lines 78–116**: Header uses `aqua-window`, `aqua-titlebar`, `aqua-traffic-lights`, `bg-gradient-to-b from-white/95 to-slate-50/80`, `aqua-badge-blue`, and `aqua-btn-primary`.
- **Lines 129–149**: Empty state card uses `aqua-card`, `text-slate-900`, `text-slate-600`, and `aqua-btn-primary`.
- **Lines 153–234**: Case cards use `aqua-card border-slate-200/90`, `text-slate-900`, `text-slate-500`, and `.aqua-btn-primary`.

### D. Questionnaire Engine (`src/components/QuestionnaireEngine.tsx` & `src/app/customer/questionnaire/page.tsx`)
- **`src/app/customer/questionnaire/page.tsx` line 79**: `<div className="min-h-screen bg-aqua-pinstripes p-4 md:p-8">`.
- **`src/components/QuestionnaireEngine.tsx`**:
  - **Lines 264–304**: Window shell uses `aqua-window shadow-xl`, `aqua-titlebar`, traffic lights, and `aqua-badge` autosave indicators with light red/green/blue backgrounds.
  - **Lines 309–344**: Progress container uses `border-slate-200/80 bg-slate-50/60`, recessed bar with `bg-slate-200 border-slate-300/80`, and blue fill `from-blue-500 via-blue-600 to-indigo-600`.
  - **Lines 347–374**: Section pill buttons use `bg-blue-600 text-white`, `bg-emerald-100 text-emerald-800`, and `bg-slate-200/70 text-slate-600`.
  - **Lines 405–474**: Repeater questions use `aqua-card bg-slate-50/70 border-slate-300/80`, child boxes `bg-white border-slate-200`, and `aqua-btn-secondary` for "+ Add Item".
  - **Lines 480–533**: Text, textarea, select, and date fields use `bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500`.
  - **Lines 543–559**: Bottom buttons use `aqua-btn-secondary` (Previous) and `aqua-btn-primary` (Save & Continue).

### E. Customer Payment & Checkout (`src/app/customer/payment/page.tsx` & `src/app/customer/checkout/page.tsx`)
- **`src/app/customer/payment/page.tsx`**:
  - **Line 93**: Uses `min-h-screen bg-aqua-pinstripes`.
  - **Lines 96–106**: Mock alert uses `border-amber-400 bg-amber-50 text-amber-900 text-amber-800`.
  - **Lines 109–121**: Container uses `aqua-window`, `aqua-titlebar`, and traffic lights.
  - **Lines 143–193**: Pricing tier cards use `aqua-card`, `ring-blue-500`, `aqua-badge-blue`, and `bg-blue-600`.
  - **Lines 199–243**: Order summary uses `aqua-inset-well`, `aqua-btn-primary` (Success) and `aqua-btn-secondary text-red-700 border-red-300` (Failure).
  - **Lines 261–330**: Confirmation and failure states use `bg-green-100 text-green-600` and `bg-red-100 text-red-600`.
- **`src/app/customer/checkout/page.tsx`**:
  - Mirrors same Aqua window, pinstripes, and card structure.

### F. Document Delivery Page (`src/app/customer/document/page.tsx`)
- **Line 105**: Uses `min-h-screen bg-aqua-pinstripes`.
- **Lines 107–117**: Uses `aqua-window shadow-2xl`, `aqua-titlebar`, traffic lights.
- **Lines 142–181**: Document metadata card uses `aqua-card bg-slate-50/80 border-slate-300/80 text-slate-800`.
- **Line 187**: Download button uses `aqua-btn aqua-btn-primary py-3.5`.
- **Lines 196–212**: Statutory execution instructions box uses `bg-blue-50/70 border-blue-200 text-blue-950`.

---

## 2. Logic Chain

1. **Premise (R8 Requirement)**: The visual design system must transition from skeuomorphic Aqua to an OLED Dark Mode interface with:
   - True black foundation (`#000000`) for maximum power efficiency on OLED panels.
   - 3-level elevation scale: Level 1 (`#0a0a0a` / `#0f0f0f`), Level 2 (`#141414` / `#161616`), Level 3 (`#202020` / `#242424`).
   - Soft typography: `#e5e5e5` headings, `#d4d4d4` body text, `#a3a3a3` secondary/labels, `#737373` subtle timestamps/captions, avoiding harsh pure white (`#ffffff`).
   - Elegant legal warm amber/gold accents (`#d4a373` / `#c59b27`), muted indigo (`#6366f1`), and subtle status indicators (emerald, amber, rose, cyan).
   - Smooth transitions and deep dark shadows (`box-shadow: 0 4px 24px rgba(0, 0, 0, 0.8)`).
2. **Deduction 1 (Elimination of Skeuomorphic Chaff)**: The retro Aqua traffic lights (`.aqua-traffic-lights`, `.aqua-dot-*`) and gel gloss overlays contradict the clean, high-contrast OLED dark aesthetic. They should be refactored into minimalist dark window headers, sleek legal emblems, and subtle glowing status indicators.
3. **Deduction 2 (Form Inputs and Inset Wells)**: White inputs (`bg-white border-slate-300 text-slate-900`) and pastel wells cause intense glare on dark backgrounds. Replacing them with `#161616` recessed backgrounds, `#262626` borders, `#e5e5e5` text, and warm amber `#d4a373` focus rings provides calm visual comfort and high readability.
4. **Deduction 3 (Buttons & Actions)**: Primary actions should use prestige legal warm gold (`#d4a373` / hover `#c59b27` / text `#000000`), and secondary actions should use elevated dark surface (`#161616` / border `#262626` / text `#e5e5e5`). This preserves clear hierarchy without garish neon saturation.
5. **Deduction 4 (Functional & Test Safety)**: All test assertions (e.g. `calculateProgress`, autosave payload dispatching, button click callbacks, form fields, and audit log routes) rely on specific IDs, input names, routes, and query parameters. All refactoring must strictly preserve HTML IDs (`register-name`, `email-address`, `fullName`, etc.), input names, event handlers, and Next.js router hooks.

---

## 3. Caveats

1. **Explorer 1 Global Token Dependency**: Explorer 1 is defining global tokens and utility classes in `src/app/globals.css`. The blueprints below are designed with standard Tailwind utility classes and explicit hex codes (`bg-[#0a0a0a]`, `border-[#222222]`, `text-[#e5e5e5]`, `text-[#d4a373]`) so they render perfectly with or without helper classes.
2. **Preservation of Suspense Boundaries**: `CustomerPaymentPage`, `CheckoutPage`, and `DocumentPage` must retain their `<Suspense>` boundaries to satisfy Next.js 15/16 App Router build requirements for client-side search parameter parsing.
3. **No Database Schema or API Changes**: This refactor is purely presentation and layout (UI/UX). No API routes, prisma queries, or auth options are modified.

---

## 4. Conclusion & File-by-File Implementation Blueprints

The refactoring plan for all 8 files is detailed below. The Worker can directly apply these blueprints.

### Blueprint 1: `src/app/page.tsx` (Landing Page)
**Key Modifications**:
- Outer `main`: `min-h-screen bg-black text-[#d4d4d4] flex flex-col items-center justify-between px-4 sm:px-8 lg:px-12 py-6 sm:py-10 selection:bg-[#d4a373]/30 selection:text-white`
- Top Header:
  ```tsx
  <header className="w-full max-w-5xl mb-8 sm:mb-14">
    <div className="rounded-2xl bg-[#0a0a0a] border border-[#222222] shadow-[0_4px_24px_rgba(0,0,0,0.8)] flex items-center justify-between px-4 sm:px-6 py-3.5 transition-all">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide text-[#d4a373] bg-[#161616] border border-[#2a2a2a]">
          Trustworthy • Lawyer-Approved • Indian Succession Act
        </span>
      </div>
      <nav className="flex items-center gap-3">
        <Link
          href="/register"
          className="inline-flex items-center justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] text-neutral-950 font-semibold px-4 sm:px-5 py-1.5 text-xs sm:text-sm shadow-[0_2px_12px_rgba(212,163,115,0.25)] transition-all"
        >
          Register
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg bg-[#161616] hover:bg-[#202020] text-[#e5e5e5] border border-[#262626] hover:border-[#383838] font-medium px-4 sm:px-5 py-1.5 text-xs sm:text-sm transition-all"
        >
          Login
        </Link>
      </nav>
    </div>
  </header>
  ```
- Hero Section:
  ```tsx
  <section className="w-full max-w-4xl text-center py-10 sm:py-16 px-4">
    <div className="relative overflow-hidden rounded-3xl bg-[#0a0a0a] border border-[#222222] p-8 sm:p-14 shadow-[0_8px_40px_rgba(0,0,0,0.9)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(212,163,115,0.12),transparent_60%)] pointer-events-none" />
      <div className="flex justify-center mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#161616] border border-[#2a2a2a] px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-[#d4a373]">
          Indian Online Estate Planning
        </span>
      </div>
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#e5e5e5] mb-6 leading-tight">
        Make your wishes clear before your family has to guess.
      </h1>
      <p className="mt-6 text-lg sm:text-xl leading-relaxed text-[#a3a3a3] max-w-2xl mx-auto font-normal">
        Create a structured will through a guided questionnaire, using lawyer-approved document workflows with optional lawyer review. Automation handles the paperwork. Lawyers handle the law.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-xl bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] text-neutral-950 font-bold px-8 py-3.5 text-base sm:text-lg shadow-[0_4px_24px_rgba(212,163,115,0.3)] transition-all w-full sm:w-auto text-center"
        >
          Start Your Will
        </Link>
        <a
          href="#how-it-works"
          className="inline-flex items-center justify-center rounded-xl bg-[#161616] hover:bg-[#202020] text-[#e5e5e5] border border-[#2a2a2a] hover:border-[#383838] font-semibold px-6 py-3.5 text-sm sm:text-base transition-all w-full sm:w-auto text-center"
        >
          How It Works <span aria-hidden="true" className="ml-1">→</span>
        </a>
      </div>
    </div>
  </section>
  ```
- How It Works 4-Step Cards:
  Replace `.aqua-window` and `.aqua-titlebar` with:
  ```tsx
  <div className="group rounded-2xl bg-[#0a0a0a] hover:bg-[#0f0f0f] border border-[#222222] hover:border-[#333333] p-6 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.8)] transition-all duration-200">
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1c1c1c]">
      <span className="text-xs font-mono font-bold text-[#d4a373] uppercase tracking-wider">Step 01</span>
      <span className="w-1.5 h-1.5 rounded-full bg-[#333333] group-hover:bg-[#d4a373] transition-colors" />
    </div>
    <div className="flex-1 flex flex-col justify-start">
      <h3 className="text-lg font-bold text-[#e5e5e5] mb-2 group-hover:text-amber-200/90 transition-colors">
        01 — Answer questions
      </h3>
      <p className="text-sm text-[#a3a3a3] leading-relaxed">
        Tell us about yourself, your family and your assets through our guided questionnaire.
      </p>
    </div>
  </div>
  ```
- Footer:
  ```tsx
  <footer className="w-full max-w-5xl text-center py-6 text-xs text-[#737373] border-t border-[#1f1f1f] mt-12">
    <p>Online Will-Writing & Digital Estate Planning Platform • Indian Jurisdiction • Strictly Lawyer-Approved</p>
  </footer>
  ```

---

### Blueprint 2: `src/app/login/page.tsx` (Sign In Page)
**Key Modifications**:
- Outer background: `flex min-h-screen items-center justify-center bg-black px-4 py-12 selection:bg-[#d4a373]/30 selection:text-white`
- Card: `w-full max-w-md space-y-8 bg-[#0a0a0a] p-8 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.9)] border border-[#222222]`
- Headings: `text-[#e5e5e5]` and `text-[#a3a3a3]`
- Demo Accounts:
  ```tsx
  <div className="rounded-xl bg-[#111111] p-4 border border-[#222222] text-xs text-[#d4d4d4]">
    <p className="font-semibold text-[#d4a373] mb-2.5 flex items-center gap-1.5">
      <span>⚡</span> Click to select demo account:
    </p>
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => fillDemoAccount("customer@demo.com")}
        className="rounded-lg bg-[#161616] hover:bg-[#202020] hover:border-[#383838] border border-[#262626] px-3 py-2 text-left font-medium text-[#e5e5e5] transition-all shadow-sm"
      >
        👤 Customer (Resident)
      </button>
      <button
        type="button"
        onClick={() => fillDemoAccount("nri@demo.com")}
        className="rounded-lg bg-[#161616] hover:bg-[#202020] hover:border-[#383838] border border-[#262626] px-3 py-2 text-left font-medium text-[#e5e5e5] transition-all shadow-sm"
      >
        🌏 NRI Customer
      </button>
      <button
        type="button"
        onClick={() => fillDemoAccount("lawyer@demo.com")}
        className="rounded-lg bg-[#161616] hover:bg-[#202020] hover:border-[#383838] border border-[#262626] px-3 py-2 text-left font-medium text-[#e5e5e5] transition-all shadow-sm"
      >
        ⚖️ Reviewing Lawyer
      </button>
      <button
        type="button"
        onClick={() => fillDemoAccount("admin@demo.com")}
        className="rounded-lg bg-[#161616] hover:bg-[#202020] hover:border-[#383838] border border-[#262626] px-3 py-2 text-left font-medium text-[#e5e5e5] transition-all shadow-sm"
      >
        🛡️ System Admin
      </button>
    </div>
    <p className="mt-2.5 text-[#737373] text-[11px] text-center">
      Default demo password:{" "}
      <code className="font-mono font-semibold text-[#d4a373] bg-[#161616] px-1.5 py-0.5 rounded border border-[#262626]">
        password123
      </code>
    </p>
  </div>
  ```
- Error Box: `rounded-lg bg-rose-950/40 p-3.5 border border-rose-800/60 text-sm font-medium text-rose-300 text-center`
- Input fields:
  ```tsx
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
  ```
- Submit button:
  ```tsx
  <button
    type="submit"
    disabled={loading}
    className="group relative flex w-full justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] px-4 py-2.5 text-sm font-semibold text-neutral-950 shadow-[0_2px_12px_rgba(212,163,115,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
  >
    {loading ? "Signing in..." : "Sign in"}
  </button>
  ```
- Bottom Link:
  ```tsx
  <div className="pt-4 border-t border-[#1f1f1f] text-center">
    <p className="text-sm text-[#a3a3a3]">
      Don&apos;t have an account?{" "}
      <Link href="/register" className="font-semibold text-[#d4a373] hover:text-[#e0b589] hover:underline">
        Register
      </Link>
    </p>
  </div>
  ```

---

### Blueprint 3: `src/app/register/page.tsx` (Register Page)
**Key Modifications**:
- Outer `main`: `min-h-screen bg-black flex items-center justify-center px-4 py-12 text-[#d4d4d4] selection:bg-[#d4a373]/30 selection:text-white`
- Window card: `w-full max-w-md bg-[#0a0a0a] border border-[#222222] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.9)] overflow-hidden`
- Titlebar:
  ```tsx
  <div className="bg-[#111111] border-b border-[#222222] px-6 py-3.5 flex items-center justify-between">
    <span className="text-xs font-semibold text-[#d4a373] tracking-wide uppercase">
      Customer Registration
    </span>
    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
  </div>
  ```
- Body: `p-6 sm:p-8 space-y-6 bg-[#0a0a0a]`
- Headings:
  ```tsx
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
  ```
- Error Box: `rounded-lg bg-rose-950/40 p-3.5 border border-rose-800/60 text-xs text-rose-300 font-medium`
- Inputs (name, email, password, confirmPassword):
  ```tsx
  <label htmlFor="register-name" className="block text-xs font-semibold text-[#d4d4d4] mb-1.5">
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
  ```
- Submit button:
  ```tsx
  <button
    type="submit"
    disabled={loading}
    className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] text-neutral-950 shadow-[0_2px_12px_rgba(212,163,115,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
  >
    {loading ? "Creating Account..." : "Create Account"}
  </button>
  ```
- Bottom Link:
  ```tsx
  <div className="pt-4 border-t border-[#1f1f1f] text-center">
    <p className="text-xs text-[#a3a3a3]">
      Already have an account?{" "}
      <Link href="/login" className="font-semibold text-[#d4a373] hover:text-[#e0b589] hover:underline">
        Sign in here
      </Link>
    </p>
  </div>
  ```

---

### Blueprint 4: `src/app/customer/dashboard/page.tsx` (Customer Dashboard)
**Key Modifications**:
- Status badge mapping:
  ```tsx
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-300 border border-amber-800/60">
            Draft
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/40 text-blue-300 border border-blue-800/60">
            Submitted
          </span>
        );
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/40 text-indigo-300 border border-indigo-800/60">
            Under Review
          </span>
        );
      case "CLARIFICATION_REQUESTED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-950/40 text-orange-300 border border-orange-800/60">
            Clarification Needed
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
            Approved
          </span>
        );
      case "PAID":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-800/60">
            Paid
          </span>
        );
      case "GENERATED":
      case "FINAL":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
            Documents Ready
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-900 text-neutral-300 border border-neutral-800">
            {status}
          </span>
        );
    }
  };
  ```
- Header:
  ```tsx
  <header className="rounded-2xl bg-[#0a0a0a] border border-[#222222] shadow-[0_4px_24px_rgba(0,0,0,0.8)] overflow-hidden">
    <div className="bg-[#111111] border-b border-[#222222] px-6 py-3 flex items-center justify-between">
      <span className="text-xs font-semibold text-[#d4a373] tracking-wide uppercase">
        Customer Portal — Will & Estate Planning
      </span>
      <span className="text-xs text-[#737373] font-medium hidden sm:inline">
        {(session.user as any)?.email}
      </span>
    </div>

    <div className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0a0a0a]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#161616] text-[#d4a373] border border-[#2a2a2a]">
            Customer Dashboard
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#e5e5e5]">
          Welcome, {(session.user as any)?.name || "Valued Client"}
        </h1>
        <p className="text-xs sm:text-sm text-[#a3a3a3] mt-1">
          Manage your will preparation cases and track legal status in real-time
        </p>
      </div>

      <Link
        href="/customer/questionnaire"
        className="inline-flex items-center justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] text-neutral-950 font-semibold px-5 py-2.5 text-sm shadow-[0_2px_12px_rgba(212,163,115,0.2)] transition-all shrink-0"
      >
        + Start New Will
      </Link>
    </div>
  </header>
  ```
- Case Cards:
  ```tsx
  <div
    key={c.id}
    className="rounded-xl bg-[#0a0a0a] hover:bg-[#0f0f0f] border border-[#222222] hover:border-[#333333] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all duration-200"
  >
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="font-mono text-xs sm:text-sm font-bold text-[#e5e5e5]">
          Case #{c.id.slice(-8).toUpperCase()}
        </span>
        {getStatusBadge(c.status)}
        {c.flags && c.flags !== "STANDARD" && (
          <span className="text-[11px] font-semibold text-[#d4a373] bg-[#161616] px-2.5 py-0.5 rounded-full border border-[#2a2a2a]">
            {c.flags}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#737373]">
        <span>
          <strong className="text-[#a3a3a3] font-medium">Created:</strong>{" "}
          {new Date(c.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        <span>
          <strong className="text-[#a3a3a3] font-medium">Updated:</strong>{" "}
          {new Date(c.updatedAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {c.documents?.length > 0 && (
          <span>
            <strong className="text-[#a3a3a3] font-medium">Documents:</strong>{" "}
            {c.documents.length}
          </span>
        )}
      </div>
    </div>

    <div className="flex items-center gap-3 self-end sm:self-center">
      {c.status === "DRAFT" && (
        <Link
          href={`/customer/questionnaire?caseId=${c.id}`}
          className="inline-flex items-center justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] text-neutral-950 font-semibold px-4 py-2 text-xs sm:text-sm shadow-sm transition-all"
        >
          Resume Questionnaire →
        </Link>
      )}
      {c.status === "SUBMITTED" && (
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold text-blue-300 bg-blue-950/40 border border-blue-800/60">
          Awaiting Processing
        </span>
      )}
      {(c.status === "IN_REVIEW" || c.status === "CLARIFICATION_REQUESTED") && (
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold text-indigo-300 bg-indigo-950/40 border border-indigo-800/60">
          Under Lawyer Review
        </span>
      )}
      {(c.status === "APPROVED" ||
        c.status === "PAID" ||
        c.status === "GENERATED" ||
        c.status === "FINAL") && (
        <Link
          href={`/customer/document?caseId=${c.id}`}
          className="inline-flex items-center justify-center rounded-lg bg-[#161616] hover:bg-[#202020] text-[#e5e5e5] border border-[#2a2a2a] hover:border-[#383838] px-4 py-2 text-xs sm:text-sm font-semibold transition-all"
        >
          View Documents →
        </Link>
      )}
    </div>
  </div>
  ```

---

### Blueprint 5: `src/components/QuestionnaireEngine.tsx` & `src/app/customer/questionnaire/page.tsx`
**Key Modifications in `src/app/customer/questionnaire/page.tsx`**:
- Change wrapper to:
  ```tsx
  return (
    <div className="min-h-screen bg-black text-[#d4d4d4] p-4 md:p-8 selection:bg-[#d4a373]/30 selection:text-white">
      <QuestionnaireEngine caseId={caseId} initialAnswers={initialAnswers} />
    </div>
  );
  ```

**Key Modifications in `src/components/QuestionnaireEngine.tsx`**:
- Outer card shell & titlebar:
  ```tsx
  <div className="max-w-4xl mx-auto space-y-6">
    <div className="rounded-2xl bg-[#0a0a0a] border border-[#222222] shadow-[0_4px_30px_rgba(0,0,0,0.9)] overflow-hidden">
      <div className="bg-[#111111] border-b border-[#222222] px-5 sm:px-6 py-3.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#e5e5e5] tracking-wide truncate max-w-[200px] sm:max-w-md">
          Legal Will Preparation — Case #{caseId.slice(-8).toUpperCase()}
        </span>

        {/* Real-Time Autosave Status Indicator */}
        <div className="flex items-center">
          {saveStatus === "saving" && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-950/40 text-amber-300 border border-amber-800/60 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5 animate-ping inline-block" />
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 inline-block" />
              All changes saved {lastSavedTime ? `at ${lastSavedTime}` : ""}
            </span>
          )}
          {saveStatus === "error" && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-950/40 text-rose-300 border border-rose-800/60">
              <span className="w-2 h-2 rounded-full bg-rose-400 mr-1.5 inline-block" />
              Save failed - retrying...
            </span>
          )}
          {saveStatus === "idle" && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#161616] text-[#a3a3a3] border border-[#262626]">
              <span className="w-2 h-2 rounded-full bg-[#737373] mr-1.5 inline-block" />
              {lastSavedTime ? `Saved at ${lastSavedTime}` : "Autosave Active"}
            </span>
          )}
        </div>
      </div>

      <div className="bg-[#0a0a0a]">
        {/* Progress & Section Navigation Header */}
        <div className="p-5 sm:p-7 border-b border-[#222222] bg-[#0d0d0d]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#161616] text-[#d4a373] border border-[#2a2a2a]">
                  Section {currentSectionIndex + 1} of {activeSections.length}
                </span>
                <span className="text-xs font-semibold text-[#a3a3a3]">
                  {currentSection.title}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#e5e5e5]">
                {currentSection.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#a3a3a3] mt-0.5">
                {currentSection.description}
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-1">
              <span className="text-xs font-bold text-[#d4a373] font-mono">
                {progressPercentage}% Completed
              </span>
              <span className="text-[11px] text-[#737373]">
                Required questions answered
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-[#161616] p-0.5 border border-[#262626] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 shadow-[0_0_12px_rgba(212,163,115,0.4)]"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Horizontal Section Pills */}
          <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {activeSections.map((sec, idx) => {
              const isCurrent = idx === currentSectionIndex;
              const isCompleted = idx < currentSectionIndex;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={async () => {
                    if (currentSection && !isFlushing) {
                      await flushPendingSave(currentSection.id);
                      setCurrentSectionIndex(idx);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition shrink-0 ${
                    isCurrent
                      ? "bg-[#d4a373] text-neutral-950 font-bold shadow-sm"
                      : isCompleted
                      ? "bg-emerald-950/50 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60"
                      : "bg-[#161616] text-[#737373] hover:text-[#a3a3a3] hover:bg-[#202020] border border-transparent"
                  }`}
                >
                  {idx + 1}. {sec.title}
                </button>
              );
            })}
          </div>
        </div>
  ```
- Form Fields & Repeater:
  ```tsx
  {/* Repeater Box */}
  <div
    key={q.id}
    className="p-5 sm:p-6 bg-[#111111] border border-[#222222] rounded-xl space-y-4 shadow-sm"
  >
    <div className="flex justify-between items-center">
      <label className="block text-sm font-bold text-[#e5e5e5]">
        {q.label}
        {q.required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      <span className="text-xs text-[#737373] font-medium">
        {list.length} item{list.length === 1 ? "" : "s"} added
      </span>
    </div>

    {list.map((item: any, idx: number) => (
      <div
        key={idx}
        className="p-4 bg-[#161616] rounded-lg border border-[#262626] space-y-3"
      >
        <div className="flex justify-between items-center border-b border-[#222222] pb-2">
          <span className="text-xs font-bold text-[#a3a3a3]">
            Item #{idx + 1}
          </span>
          <button
            type="button"
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
            onClick={() => {
              const newList = list.filter((_: any, i: number) => i !== idx);
              handleChange(q.id, newList);
            }}
          >
            ✕ Remove
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {q.fields?.map((f: QuestionField) => (
            <div key={f.id} className="space-y-1">
              <label className="block text-xs font-semibold text-[#d4d4d4]">
                {f.label}
                {f.required && (
                  <span className="text-rose-400 ml-0.5">*</span>
                )}
              </label>
              <input
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-[#111111] border border-[#2a2a2a] text-[#e5e5e5] placeholder:text-[#555555] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373]"
                value={item[f.id] ?? ""}
                onChange={(e) => {
                  const newList = [...list];
                  newList[idx] = {
                    ...newList[idx],
                    [f.id]: e.target.value,
                  };
                  handleChange(q.id, newList);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    ))}

    <button
      type="button"
      className="inline-flex items-center justify-center rounded-lg bg-[#161616] hover:bg-[#202020] text-[#e5e5e5] border border-[#2a2a2a] hover:border-[#383838] px-4 py-2 text-xs font-semibold transition-all"
      onClick={() => handleChange(q.id, [...list, {}])}
    >
      + Add {q.label.replace(/^Add\s+/i, "")}
    </button>
  </div>
  ```
- Standard Input Fields (textarea, select, text/date/number/tel/email):
  ```tsx
  <div key={q.id} className="space-y-1.5">
    <label className="block text-xs sm:text-sm font-semibold text-[#d4d4d4]">
      {q.label}
      {q.required && <span className="text-rose-400 ml-1 font-bold">*</span>}
    </label>
    {/* Textarea */}
    {q.type === "textarea" ? (
      <textarea
        rows={3}
        className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#161616] border border-[#262626] text-[#e5e5e5] placeholder:text-[#555555] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] transition-colors"
        value={answers[q.id] ?? ""}
        onChange={(e) => handleChange(q.id, e.target.value)}
        placeholder="Enter details..."
      />
    ) : q.type === "single_select" || q.type === "yes_no" ? (
      <select
        className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#161616] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] transition-colors"
        value={answers[q.id] ?? ""}
        onChange={(e) => handleChange(q.id, e.target.value)}
      >
        <option value="">Select an option</option>
        {q.type === "yes_no" ? (
          <>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </>
        ) : (
          q.options?.map((opt: QuestionOption) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        )}
      </select>
    ) : (
      <input
        type={
          q.type === "email"
            ? "email"
            : q.type === "phone"
            ? "tel"
            : q.type === "date"
            ? "date"
            : q.type === "number"
            ? "number"
            : "text"
        }
        className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#161616] border border-[#262626] text-[#e5e5e5] placeholder:text-[#555555] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] transition-colors"
        value={answers[q.id] ?? ""}
        onChange={(e) => handleChange(q.id, e.target.value)}
        placeholder={`Enter ${q.label.toLowerCase()}...`}
      />
    )}
  </div>
  ```
- Bottom Actions:
  ```tsx
  <div className="pt-6 border-t border-[#222222] flex items-center justify-between gap-4">
    <button
      type="button"
      disabled={currentSectionIndex === 0 || isFlushing}
      onClick={handleBack}
      className="inline-flex items-center justify-center rounded-lg bg-[#161616] hover:bg-[#222222] text-[#e5e5e5] border border-[#262626] hover:border-[#383838] px-6 py-2.5 text-xs sm:text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      ← Previous Section
    </button>

    <button
      type="button"
      disabled={isFlushing}
      onClick={handleNext}
      className="inline-flex items-center justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] text-neutral-950 font-semibold px-8 py-2.5 text-xs sm:text-sm shadow-[0_2px_12px_rgba(212,163,115,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isFlushing
        ? "Saving..."
        : isLastSection
        ? "Review Answers & Continue →"
        : "Save & Continue →"}
    </button>
  </div>
  ```

---

### Blueprint 6: `src/app/customer/payment/page.tsx` (Interactive Mock Payment Gateway)
**Key Modifications**:
- Outer `min-h-screen bg-black text-[#d4d4d4] py-8 px-4 sm:px-6 lg:px-8 selection:bg-[#d4a373]/30 selection:text-white`
- Test Mode Alert Banner:
  ```tsx
  <div className="mb-6 rounded-xl border border-amber-800/60 bg-[#161208] p-4 shadow-[0_2px_16px_rgba(0,0,0,0.6)] flex items-start gap-3.5">
    <div className="text-2xl select-none">⚠️</div>
    <div>
      <div className="text-sm font-bold text-amber-300 tracking-wide uppercase">
        Mock Payment Gateway — Test Mode (No Real Money Charged)
      </div>
      <p className="text-xs text-amber-200/70 mt-0.5 leading-relaxed">
        This application is in demonstration mode. No real credit card or UPI charges will occur. Use the simulation buttons below to test success and failure transaction states.
      </p>
    </div>
  </div>
  ```
- Window Container & Header:
  ```tsx
  <div className="rounded-2xl bg-[#0a0a0a] border border-[#222222] shadow-[0_4px_30px_rgba(0,0,0,0.9)] overflow-hidden">
    <div className="bg-[#111111] border-b border-[#222222] px-6 py-3.5 flex items-center justify-between text-xs text-[#a3a3a3]">
      <div className="font-semibold text-[#d4a373] tracking-wider uppercase">
        Will Preparation Checkout — Case Ref: {caseId.substring(0, 10)}...
      </div>
      <div className="font-mono text-[#737373]">Safe Sandbox v1.0</div>
    </div>
    <div className="p-6 sm:p-8">
      {paymentStep === "SELECT" && (
        <>
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#e5e5e5] tracking-tight">
              Select Your Estate Planning Tier
            </h1>
            <p className="mt-2 text-sm text-[#a3a3a3]">
              Choose the legal tier that suits your estate complexity. All tiers include formal drafting compliant with the Indian Succession Act, 1925.
            </p>
          </div>
  ```
- Tier Pricing Cards:
  ```tsx
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    {Object.values(PAYMENT_TIERS).map((tier: PaymentTier) => {
      const isSelected = selectedTier === tier.id;
      return (
        <div
          key={tier.id}
          onClick={() => setSelectedTier(tier.id)}
          className={`cursor-pointer p-6 rounded-xl flex flex-col justify-between relative transition-all duration-200 ${
            isSelected
              ? "bg-[#141414] border-2 border-[#d4a373] shadow-[0_0_24px_rgba(212,163,115,0.18)] scale-[1.02]"
              : "bg-[#101010] hover:bg-[#161616] border border-[#222222] hover:border-[#333333]"
          }`}
        >
          {tier.recommended && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#d4a373] text-neutral-950 shadow-md">
              ★ Recommended
            </span>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-[#e5e5e5]">{tier.name}</h3>
              <input
                type="radio"
                name="tier"
                checked={isSelected}
                onChange={() => setSelectedTier(tier.id)}
                className="w-4 h-4 text-[#d4a373] accent-[#d4a373] focus:ring-[#d4a373]"
              />
            </div>
            <p className="text-xs text-[#a3a3a3] mb-4 min-h-[36px]">{tier.description}</p>
            <div className="mb-4">
              <span className="text-3xl font-extrabold text-[#e5e5e5]">₹{tier.price.toLocaleString("en-IN")}</span>
              <span className="text-xs text-[#737373] ml-1">one-time INR</span>
            </div>

            <div className="border-t border-[#222222] pt-4 space-y-2">
              {tier.features.map((feat, idx) => (
                <div key={idx} className="flex items-start text-xs text-[#d4d4d4] gap-2">
                  <span className="text-[#d4a373] font-bold">✓</span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#222222]">
            <div
              className={`w-full text-center py-2.5 rounded-lg text-xs font-bold transition-all ${
                isSelected
                  ? "bg-[#d4a373] text-neutral-950 shadow-sm"
                  : "bg-[#181818] text-[#a3a3a3] hover:text-[#e5e5e5] border border-[#262626]"
              }`}
            >
              {isSelected ? "Selected Plan" : "Choose Plan"}
            </div>
          </div>
        </div>
      );
    })}
  </div>
  ```
- Order Summary & Simulation Controls:
  ```tsx
  <div className="rounded-xl bg-[#121212] border border-[#222222] p-6 max-w-2xl mx-auto shadow-sm">
    <h4 className="text-sm font-bold text-[#e5e5e5] uppercase tracking-wide mb-4">
      Order Summary & Mock Checkout
    </h4>

    <div className="space-y-2 text-sm text-[#a3a3a3] border-b border-[#222222] pb-4 mb-4">
      <div className="flex justify-between">
        <span>Selected Plan:</span>
        <span className="font-semibold text-[#e5e5e5]">{currentPlan.name}</span>
      </div>
      <div className="flex justify-between">
        <span>Case Reference:</span>
        <span className="font-mono text-xs text-[#737373]">{caseId}</span>
      </div>
      <div className="flex justify-between">
        <span>GST (18% Mock Sandbox Waived):</span>
        <span className="text-emerald-400 font-medium">₹0 (Waived for MVP)</span>
      </div>
      <div className="flex justify-between text-base font-bold text-[#e5e5e5] pt-2 border-t border-[#262626]">
        <span>Total Payable:</span>
        <span>₹{currentPlan.price.toLocaleString("en-IN")}</span>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        type="button"
        disabled={loading}
        onClick={() => handleSimulatePayment("SUCCESS")}
        className="inline-flex items-center justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] py-3 px-4 text-sm font-bold text-neutral-950 shadow-[0_2px_12px_rgba(212,163,115,0.2)] disabled:opacity-50 transition-all"
      >
        {loading ? "Processing..." : "✓ Simulate Payment Success"}
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={() => handleSimulatePayment("FAILURE")}
        className="inline-flex items-center justify-center rounded-lg bg-[#1a1111] hover:bg-[#251515] border border-rose-800/60 py-3 px-4 text-sm font-bold text-rose-300 disabled:opacity-50 transition-all"
      >
        {loading ? "Processing..." : "✗ Simulate Payment Failure"}
      </button>
    </div>
  </div>
  ```
- Confirming, Success, and Failure states:
  - Confirming: `w-12 h-12 border-4 border-[#d4a373] border-t-transparent rounded-full animate-spin mx-auto mb-4`
  - Success: Emerald circle badge `bg-emerald-950/60 border border-emerald-800/60 text-emerald-300`, receipt box `bg-[#121212] border-[#222222]`, gold primary button to Dashboard.
  - Failure: Rose circle badge `bg-rose-950/60 border border-rose-800/60 text-rose-300`, buttons with `bg-[#d4a373]` (Try Again) and `bg-[#161616]` (Dashboard).

---

### Blueprint 7: `src/app/customer/checkout/page.tsx` (Plan Selection Quick Checkout)
**Key Modifications**:
- Follows exact same OLED dark design system as Blueprint 6:
  - Base: `min-h-screen bg-black text-[#d4d4d4] py-12 px-4`
  - Mock Banner: `rounded-xl border border-amber-800/60 bg-[#161208] p-4`
  - Container: `rounded-2xl bg-[#0a0a0a] border border-[#222222] p-6 sm:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.9)]`
  - Cards: `rounded-xl bg-[#111111] border border-[#222222] p-6 flex flex-col justify-between`
  - Recommended Card: `ring-2 ring-[#d4a373] bg-[#141414]`
  - Button: `rounded-lg bg-[#d4a373] hover:bg-[#c59b27] text-neutral-950 font-semibold w-full py-2.5 text-sm transition-all`
  - Suspense Fallback: `min-h-screen bg-black flex items-center justify-center p-8 text-[#737373]`

---

### Blueprint 8: `src/app/customer/document/page.tsx` (Document Delivery & Metadata)
**Key Modifications**:
- Outer `min-h-screen bg-black text-[#d4d4d4] py-12 px-4 selection:bg-[#d4a373]/30 selection:text-white`
- Shell: `max-w-3xl mx-auto rounded-2xl bg-[#0a0a0a] border border-[#222222] shadow-[0_4px_30px_rgba(0,0,0,0.9)] overflow-hidden`
- Titlebar:
  ```tsx
  <div className="bg-[#111111] border-b border-[#222222] px-6 py-3.5 flex items-center justify-between">
    <span className="text-xs font-semibold text-[#d4a373] uppercase tracking-wide">
      Document Delivery System — Case #{caseId.substring(0, 8)}
    </span>
    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
  </div>
  ```
- Status Header:
  ```tsx
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#222222] pb-6">
    <div>
      <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-[#161616] text-[#d4a373] border border-[#2a2a2a] mb-2">
        Verified Legal Document
      </span>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#e5e5e5] tracking-tight">
        Your Will is Generated & Ready
      </h1>
    </div>
    <div>
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
        Status: {docMeta?.status || (caseStatus === "PAID" ? "GENERATED" : caseStatus)}
      </span>
    </div>
  </div>
  ```
- Specifications Card:
  ```tsx
  <div className="p-6 bg-[#111111] border border-[#222222] rounded-xl space-y-4 shadow-sm">
    <div className="flex items-center justify-between border-b border-[#222222] pb-3">
      <span className="text-xs font-bold uppercase tracking-wider text-[#d4a373]">
        Document Specifications & Integrity
      </span>
      <span className="text-xs text-[#737373] font-mono">OpenXML DOCX</span>
    </div>

    {loading ? (
      <div className="py-4 text-center text-xs text-[#737373] animate-pulse">
        Loading verified document metadata...
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-[#737373] block">File Format:</span>
          <span className="font-semibold text-[#e5e5e5]">Microsoft Word (.docx)</span>
        </div>
        <div>
          <span className="text-[#737373] block">File Size:</span>
          <span className="font-semibold text-[#e5e5e5]">
            {formatBytes(docMeta?.fileSize ?? null)}
          </span>
        </div>
        <div>
          <span className="text-[#737373] block">Generated At:</span>
          <span className="font-semibold text-[#e5e5e5]">
            {docMeta?.createdAt ? formatDate(docMeta.createdAt) : "On Demand"}
          </span>
        </div>
        <div>
          <span className="text-[#737373] block">SHA256 Integrity Checksum:</span>
          <span className="font-mono text-[#d4a373] break-all text-[11px] bg-[#161616] px-2 py-0.5 rounded border border-[#262626]">
            {docMeta?.fileHash
              ? `${docMeta.fileHash.substring(0, 16)}...${docMeta.fileHash.substring(48)}`
              : "Verified upon download"}
          </span>
        </div>
      </div>
    )}
  </div>
  ```
- Download Button:
  ```tsx
  <a
    href={`/api/document/download?caseId=${caseId}`}
    className="inline-flex items-center justify-center w-full text-center py-3.5 text-base font-bold tracking-wide rounded-xl bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] text-neutral-950 shadow-[0_4px_20px_rgba(212,163,115,0.25)] transition-all"
  >
    Download Will (.DOCX)
  </a>
  ```
- Statutory Execution Instructions:
  ```tsx
  <div className="mt-8 pt-6 border-t border-[#222222]">
    <h2 className="text-base font-bold text-[#e5e5e5] mb-3 flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)] inline-block" />
      Statutory Execution Instructions (Indian Succession Act, 1925)
    </h2>
    <div className="bg-[#121212] border border-[#222222] rounded-xl p-5 text-xs text-[#d4d4d4] space-y-2.5 leading-relaxed">
      <p className="font-semibold text-[#e5e5e5]">
        To ensure full legal enforceability under Indian law:
      </p>
      <ol className="list-decimal list-inside space-y-1.5 text-[#a3a3a3] pl-1">
        <li><strong className="text-[#e5e5e5]">Print the Will:</strong> Print the complete document on clean legal or standard bond paper.</li>
        <li><strong className="text-[#e5e5e5]">Careful Review:</strong> Read all clauses, beneficiary allocations, and executor appointments.</li>
        <li><strong className="text-[#e5e5e5]">Two Attesting Witnesses:</strong> Execute the document in the continuous physical presence of at least two adult witnesses (Section 63).</li>
        <li><strong className="text-[#e5e5e5]">Beneficiary Disqualification:</strong> Neither of the two witnesses should be a beneficiary or spouse of a beneficiary under the Will.</li>
        <li><strong className="text-[#e5e5e5]">Safe Custody:</strong> Store the original signed instrument in a fire-proof locker and inform your named executor of its location.</li>
      </ol>
    </div>
  </div>
  ```

---

## 5. Verification Method

To independently verify this investigation and validate implementation by the Worker:

1. **Static Analysis & Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   Ensures zero TypeScript syntax errors, missing properties, or invalid prop types.
2. **Production Build Verification**:
   ```bash
   npm run build
   ```
   Verifies Next.js App Router static optimization, Suspense boundary compliance, and client component boundary integrity across `/`, `/login`, `/register`, `/customer/dashboard`, `/customer/questionnaire`, `/customer/checkout`, `/customer/payment`, and `/customer/document`.
3. **Automated Feature Test Suite**:
   ```bash
   node tests/tier1_features/test_f4_questionnaire_engine.js
   node tests/tier1_features/test_f5_autosave_resume.js
   node tests/tier1_features/test_f6_conditional_branching.js
   node tests/tier1_features/test_f10_mock_payment.js
   ```
   Ensures all underlying business logic, questionnaire schemas, autosave debouncing, and payment workflows continue to pass without regression.
4. **Visual Inspection**:
   - Verify `#000000` background across all views.
   - Verify absence of all `.aqua-*` classes and light `.bg-white`/`.bg-gray-50` cards.
   - Verify high contrast with `#e5e5e5` headings and `#d4a373` warm gold action buttons.
