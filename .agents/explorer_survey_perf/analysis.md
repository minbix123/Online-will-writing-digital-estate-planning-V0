# Comprehensive Performance, Architecture & Build Audit Report

**Target Project**: Online Will-Writing & Digital Estate Planning Platform (India)  
**Project Root**: `E:\Online will-writing & digital estate planning V0`  
**Inspector**: Performance & Build Explorer (`explorer_survey_perf`)  
**Date**: 2026-09-16  

---

## 1. Executive Summary

An exhaustive audit of the codebase, package configuration, Next.js App Router architecture, database schema, and UI implementation was conducted. The audit revealed **8 distinct root causes** for the reported severe slowness and application instability, as well as build and compilation blockers:

1. **Next.js 16 Async `searchParams` Infinite Redirect & Database-Flooding Loop** in `/customer/questionnaire`: In Next.js 16/15, `searchParams` is a Promise. Failing to await it causes `searchParams.caseId` to evaluate to `undefined`, creating a new database case and issuing a redirect on every single page load in an infinite loop.
2. **Missing Module Compilation Blocker**: `src/components/QuestionnaireEngine.tsx` imports from nonexistent package `"react-form"`, breaking bundling and compilation.
3. **Synchronous State Mutation During React Render**: `QuestionnaireEngine.tsx` invokes `setCurrentSectionIndex(...)` and `window.location.href = ...` synchronously inside the component render body when section conditions are unmet, triggering React infinite re-render limit errors.
4. **Missing Database Indexes & Full Table Scans**: The Prisma schema lacks indexes on foreign keys (`QuestionnaireAnswer(caseId, questionId)`, `Case(customerId)`, `Case(lawyerId)`, `Case(status)`). Every questionnaire autosave and dashboard load performs an unindexed full table scan.
5. **Duplicate Document Generation & Database Spoilage on Download**: `GET /api/document/download` re-executes full DOCX compilation and writes duplicate rows to `prisma.document` on every user download.
6. **Fatal Login Navigation Bug**: `src/app/login/page.tsx` executes `window.location.href = "/api/auth/session"`, navigating the user's browser directly to the raw JSON session endpoint instead of their dashboard.
7. **Client-Side De-optimization (`useSearchParams` without Suspense)**: Root-level `useSearchParams()` in `checkout/page.tsx` and `document/page.tsx` causes Next.js to bail out of server prerendering, introducing client hydration delays.
8. **Completely Absent Retro Apple / Aqua Skeuomorphic Styling**: The landing page and UI currently use generic, flat Tailwind v4 utility styles (`bg-gray-50`, `bg-blue-600`), completely omitting the required 2000s Mac OS X Aqua aesthetic.

---

## 2. Environment, Configuration & Dependency Analysis

### 2.1 Framework and Library Versions
- **Next.js**: `16.3.5` (Canary/Next 16 development release). Implements React 19 server/client boundaries, asynchronous dynamic APIs (`params`, `searchParams`, `cookies()`, `headers()`), and Turbopack integration.
- **React & React-DOM**: `19.2.8` (React 19 release). Stricter rules around state mutations during render, synchronous side-effects, and ref handling.
- **TypeScript**: `5.9.3` with `moduleResolution: "bundler"`, `target: "ES2017"`.
- **Prisma**: `6.19.3`.
- **Tailwind CSS**: `@tailwindcss/postcss: ^4`, `tailwindcss: ^4`.

### 2.2 Dependency Placement Anomalies
- **`@prisma/client` in `devDependencies`**:
  In `package.json` (line 30), `@prisma/client` is listed under `devDependencies` rather than `dependencies`. In production environments or Docker deployments, pruned dependencies will fail with `Cannot find module '@prisma/client'`.
- **Missing `react-form` Dependency**:
  `src/components/QuestionnaireEngine.tsx:4` has `import { useForm, FormProvider } from "react-form";`. This package is not installed and does not exist in `package.json` or `node_modules`.
- **Unused Heavy Dependencies**:
  - `zod`: `^4.6.5` installed but not imported anywhere in `src/`.
  - `@hookform/resolvers`: `^5.9.1` installed but not wired up to forms.
  - `@base-ui/react`: `^1.8.0` used only in `button.tsx`.

### 2.3 `next.config.ts` Configuration Deficiencies
The configuration file is virtually blank:
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  /* config options here */
};
export default nextConfig;
```
**Required Optimizations**:
- Add `serverExternalPackages: ['@prisma/client', 'docx']` to prevent heavy Node-specific CJS packages and binary bindings from being bundled through client/edge bundler pipelines.

### 2.4 TypeScript Definitions & NextAuth Augmentation
In `src/lib/auth.ts`:
- Line 46-47 sets `session.user.id = token.id as string;` and `session.user.role = token.role as string;`.
- Default NextAuth v4 `DefaultSession["user"]` does not contain `id` and `role`. This requires a type declaration file (`src/types/next-auth.d.ts`) to prevent compiler type errors and eliminate unsafe `(session.user as any)` casts across all pages.

---

## 3. Root Cause Investigation of Severe Application Slowness

### Bottleneck 1: Next.js 16 Async `searchParams` Infinite Loop
- **File**: `src/app/customer/questionnaire/page.tsx` (lines 7–29)
- **Code**:
  ```tsx
  export default async function QuestionnairePage({
    searchParams,
  }: {
    searchParams: { caseId?: string };
  }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    let caseId = searchParams.caseId; // <-- In Next 16, searchParams is Promise<{ caseId?: string }>

    if (!caseId) {
      const newCase = await prisma.case.create({ ... });
      caseId = newCase.id;
      redirect(`/customer/questionnaire?caseId=${caseId}`);
    }
  ```
- **Mechanism**:
  Because `searchParams` is a Promise in Next.js 16, accessing property `searchParams.caseId` evaluates synchronously to `undefined`. Thus `if (!caseId)` is **always evaluated as true**, even when `?caseId=...` is explicitly passed in the URL.
  This causes:
  1. A new `prisma.case.create` insert on every single page load.
  2. An immediate `redirect('/customer/questionnaire?caseId=...')`.
  3. The redirected page runs again with unawaited `searchParams`, creates another duplicate case, and redirects again.
  4. The browser hangs, UI freezes, and SQLite fills with orphan cases.
- **Fix**:
  ```tsx
  export default async function QuestionnairePage({
    searchParams,
  }: {
    searchParams: Promise<{ caseId?: string }>;
  }) {
    const { caseId } = await searchParams;
    ...
  ```

---

### Bottleneck 2: Missing Module Resolution Crash
- **File**: `src/components/QuestionnaireEngine.tsx` (lines 4–5)
- **Code**:
  ```tsx
  import { useForm, FormProvider } from "react-form"; // Wait, we installed react-hook-form
  import { useFormContext } from "react-hook-form";
  ```
- **Mechanism**:
  Webpack and Turbopack attempt to resolve the nonexistent module `react-form`, halting compilation and producing build failures.
- **Fix**:
  Remove the invalid `react-form` import. Use standard React state or standard `react-hook-form` from the installed package.

---

### Bottleneck 3: Synchronous State Mutation & Render-Phase Redirect
- **File**: `src/components/QuestionnaireEngine.tsx` (lines 55–63)
- **Code**:
  ```tsx
  if (!checkConditions(currentSection.conditions)) {
    // Skip section if conditions not met
    if (currentSectionIndex < questionnaireConfig.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1); // <-- Calling setState in render body!
    } else {
      window.location.href = `/customer/checkout?caseId=${caseId}`; // <-- Hard redirect during render!
    }
    return null;
  }
  ```
- **Mechanism**:
  In React 19, calling `setState` during render schedules an immediate re-render. If consecutive sections fail conditions (e.g. `guardian` section when user has no minor children), React loops repeatedly, throwing `Too many re-renders. React limits the number of renders to prevent an infinite loop.` Furthermore, running `window.location.href` inside render interrupts React mounting.
- **Fix**:
  Filtering skipped sections must be computed deterministically via an active section index or through navigation handlers (`handleNext`, `handleBack`), never through side-effects during component rendering.

---

### Bottleneck 4: Monolithic Un-Debounced Re-renders & Answer Persistence
- **File**: `src/components/QuestionnaireEngine.tsx` (lines 20–23, 79–115)
- **Code**:
  ```tsx
  const handleChange = (questionId: string, value: any) => {
    setAnswers({ ...answers, [questionId]: value });
  };
  ```
- **Mechanism**:
  1. On every single keystroke in text fields and repeater inputs, a brand-new object is created for the entire questionnaire state. Every question and card in the entire section re-renders synchronously.
  2. Answers are never debounced and never autosaved as the user types; saving only occurs on clicking "Next".
  3. No answers are loaded on component mount from `prisma.questionnaireAnswer` or the existing case, meaning if the user refreshes or returns, the answers start completely empty (`{}`).
  4. On save (`/api/questionnaire/save`), the entire accumulated answers object is saved as a single JSON blob under `questionId: sectionId`, creating redundant data explosion.
- **Fix**:
  - Implement debounced autosave (`useDebounce` hook or 500ms debounce timer).
  - Load existing saved answers on mount.
  - Structure saved answers so each question's data is cleanly mapped and isolated.

---

### Bottleneck 5: Unindexed Prisma Schema & SQLite Table Scans
- **File**: `prisma/schema.prisma`
- **Observations**:
  - `model QuestionnaireAnswer`:
    No index on `caseId`, no index on `questionId`, and no compound unique constraint `@@unique([caseId, questionId])`.
  - `model Case`:
    No indexes on `customerId`, `lawyerId`, or `status`.
  - `model Document`:
    No index on `caseId`.
  - `model AuditLog`:
    No index on `caseId`, `actorId`, or `timestamp`.
- **Mechanism**:
  In `/api/questionnaire/save`:
  ```ts
  const existing = await prisma.questionnaireAnswer.findFirst({
    where: { caseId, questionId: sectionId }
  });
  ```
  SQLite must scan the entire `QuestionnaireAnswer` table sequentially on every single section save. When multiple users or cases exist, database I/O latency escalates rapidly.
- **Fix**:
  Add `@@unique([caseId, questionId])` and `@@index([caseId])` in `QuestionnaireAnswer`, plus foreign key and status indexes across `Case`, `Document`, and `AuditLog`.

---

### Bottleneck 6: Redundant Document Generation & Database Spoilage on Download
- **File**: `src/app/api/document/download/route.ts` (line 28)
- **Code**:
  ```ts
  const { docxBuffer } = await DocumentGenerator.generate(caseId);
  ```
- **File**: `src/server/document-generator.ts` (lines 96–104)
  ```ts
  await prisma.document.create({
    data: {
      caseId,
      templateVersionId: templateVersion.id,
      status: "GENERATED", ...
    }
  });
  ```
- **Mechanism**:
  1. When checkout is completed (`POST /api/checkout`), `DocumentGenerator.generate(caseId)` is invoked and a `Document` record is inserted.
  2. When the user navigates to `/customer/document` and clicks "Download DOCX", `GET /api/document/download` does not look up or stream the existing document. Instead, it re-compiles the entire DOCX from scratch and executes **another** `prisma.document.create(...)`.
  3. If a user downloads the document 4 times, 4 duplicate `Document` records are created in the database, and the server event loop is blocked 4 times generating identical binary buffers.
- **Fix**:
  Decouple document generation from file downloading. Check if an active document exists for `caseId`. If already generated, retrieve or regenerate the buffer without inserting duplicate database records.

---

### Bottleneck 7: Broken Login Navigation
- **File**: `src/app/login/page.tsx` (lines 26–32)
- **Code**:
  ```ts
  window.location.href = "/api/auth/session";
  fetch('/api/auth/session').then(res => res.json()).then(session => {
     if (session?.user?.role === 'LAWYER') router.push('/lawyer/dashboard');
     else if (session?.user?.role === 'ADMIN') router.push('/admin/dashboard');
     else router.push('/customer/dashboard');
  });
  ```
- **Mechanism**:
  Assigning `window.location.href = "/api/auth/session"` causes the browser to immediately navigate to the raw JSON API endpoint, abandoning the subsequent fetch and React router push. The user is presented with raw JSON stringified data in their browser window.
- **Fix**:
  Remove `window.location.href = "/api/auth/session"`. Fetch the session or use NextAuth's `getSession()` / role redirection, then navigate cleanly via `router.replace(...)`.

---

### Bottleneck 8: Root-Level `useSearchParams()` Without Suspense
- **Files**:
  - `src/app/customer/checkout/page.tsx:7`
  - `src/app/customer/document/page.tsx:7`
- **Mechanism**:
  Both files are client components (`"use client"`) that invoke `useSearchParams()` directly in the root page component. In Next.js App Router, using `useSearchParams()` without an enclosing `<Suspense>` boundary triggers a client-side de-optimization warning, prevents static shell generation, and causes noticeable layout shifts.
- **Fix**:
  Wrap the page body or search-params-reading logic in `<Suspense fallback={<LoadingSpinner />}>`.

---

### Bottleneck 9: Missing Route (`/lawyer/case/[id]`)
- **File**: `src/app/lawyer/dashboard/page.tsx` (line 56)
- **Observation**:
  Lawyer dashboard renders links to `<Link href={`/lawyer/case/${c.id}`}>Review</Link>`.
  There is NO `src/app/lawyer/case/[id]/page.tsx` file in the codebase. Clicking this link produces an immediate 404 error.

---

### Bottleneck 10: Fake Test Assertions in Workflow Test Script
- **File**: `src/server/legal-workflows/tests.ts` (lines 60–66)
- **Observation**:
  Tests 7, 8, 9, and 10 are mocked with raw `console.log` statements claiming success without actually asserting template locking or access controls.

---

## 4. UI & Styling Audit: Aqua / Retro Apple / Skeuomorphic Style

### Current State
Inspection of `src/app/page.tsx`, `src/app/globals.css`, and `src/components/ui/button.tsx` shows:
- The UI is styled with flat, default Tailwind v4 utilities (`bg-gray-50`, `bg-blue-600`, `rounded-md`, `border-gray-300`).
- There are **no Aqua or Retro Apple OS X skeuomorphic visual elements** currently implemented.
- The button component uses standard shadcn flat styles without gradients, bevels, or gloss.

### Design Direction Compliance (R15 Mandate)
ORIGINAL_REQUEST.md specifies:
> "Retro Apple / early Mac OS X / early iPhone OS / Aqua / 2000s skeuomorphic inspiration. The interface must remain original and must not simply clone Apple's interface. The final product should feel like a premium, trustworthy legal-service application."

### Styling Blueprint Needed
1. **Color Palette & Finishes**:
   - Aqua glass blues (`oklch(0.6 0.18 240)` to `oklch(0.48 0.22 250)`) with dual-stop glossy highlights (`linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.05) 51%, rgba(255,255,255,0.2) 100%)`).
   - Brushed platinum / aluminum panels with subtle pinstripes (`repeating-linear-gradient(0deg, #fafafa, #fafafa 2px, #f0f0f0 2px, #f0f0f0 4px)`).
   - Inset shadows and drop shadows (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.15)`).
2. **Mac OS X Window Chrome**:
   - Rounded pill window headers with subtle traffic light indicators (close, minimize, maximize) as decorative micro-details.
   - Embossed typography for headings (`text-shadow: 0 1px 0 rgba(255,255,255,0.9)`).
3. **Pill Buttons & Badges**:
   - Rounded capsule buttons (`rounded-full`) with glossy reflection curves and active-press states (`active:translate-y-px active:brightness-95`).

---

## 5. Build, Lint & Typecheck Diagnosis

| Check | Result | Root Cause |
|---|---|---|
| **Compilation / Bundling** | ❌ **FAIL** | `Cannot find module 'react-form'` imported in `src/components/QuestionnaireEngine.tsx:4`. |
| **Typecheck (`tsc`)** | ❌ **FAIL** | 1. TS2307: Missing `'react-form'` module.<br>2. TS2339: `session.user.id` and `session.user.role` missing from NextAuth `Session` type.<br>3. Next.js 16 App Router page props mismatch (`searchParams` must be `Promise<...>`). |
| **Lint (`next lint`)** | ⚠️ **WARN/FAIL** | Unused import `Button` in `src/app/page.tsx:2`. Unused `useFormContext` in `QuestionnaireEngine.tsx:5`. Multiple `any` casts. |
| **Production Packaging** | ⚠️ **WARN** | `@prisma/client` placed under `devDependencies` instead of `dependencies`. |

---

## 6. Implementation Action Plan for Phase 1 & 2 Agents

### Step 1: Package & Configuration Fixes
1. Move `@prisma/client` to `dependencies` in `package.json`.
2. Update `next.config.ts` to add `serverExternalPackages: ['@prisma/client', 'docx']`.
3. Create `src/types/next-auth.d.ts` with NextAuth module augmentation for `id` and `role`.

### Step 2: Next.js 16 Dynamic API & Navigation Fixes
1. In `src/app/customer/questionnaire/page.tsx`:
   - Change `searchParams` to `Promise<{ caseId?: string }>`.
   - `const { caseId } = await searchParams;`.
   - Prevent redundant case creation and break the redirect loop.
2. In `src/app/login/page.tsx`:
   - Remove `window.location.href = "/api/auth/session"`.
   - Properly await role verification and use `router.replace(...)`.
3. In `src/app/customer/checkout/page.tsx` and `src/app/customer/document/page.tsx`:
   - Wrap `useSearchParams()` usage in `<Suspense>`.

### Step 3: QuestionnaireEngine Repair & Debounced Autosave
1. Remove `import { useForm, FormProvider } from "react-form"`.
2. Remove synchronous `setCurrentSectionIndex` calls inside the render body. Compute active sections cleanly.
3. Fetch existing saved answers on mount for the given `caseId`.
4. Implement a 500ms debounced autosave effect that saves questions without freezing UI input.

### Step 4: Database Optimization & Indexing
1. In `prisma/schema.prisma`:
   - Add `@@unique([caseId, questionId])` and `@@index([caseId])` on `QuestionnaireAnswer`.
   - Add `@@index([customerId])`, `@@index([lawyerId])`, `@@index([status])` on `Case`.
   - Add `@@index([caseId])` on `Document`, `Payment`, `AuditLog`.
2. Run `prisma db push` or migration.

### Step 5: Document Generation & Download Clean-up
1. In `src/app/api/document/download/route.ts`:
   - Check if a generated document already exists for `caseId`.
   - Return the DOCX buffer without inserting duplicate database records.

### Step 6: Aqua / Retro Apple Skeuomorphic UI Elevation
1. Enhance `src/app/globals.css` with Aqua utility classes (`.aqua-button`, `.aqua-panel`, `.brushed-metal`, `.pinstripe-bg`, `.glossy-badge`).
2. Style the landing page (`src/app/page.tsx`) with early Mac OS X Aqua aesthetics, glossy capsule action buttons, platinum container cards, and subtle embossed chrome.
