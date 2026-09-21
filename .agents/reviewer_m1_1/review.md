# Independent Code Review & Adversarial Stress-Testing Report (Milestone 1)

- **Reviewer**: Reviewer 1 (`reviewer_m1_1`)
- **Roles**: reviewer, critic
- **Milestone**: Milestone 1 (Codebase Audit, Performance Optimization & UI Theme Foundation)
- **Target Work Product**: Worker 1 (`worker_m1`) implementation across 10 files
- **Date**: 2026-09-16T10:53:00Z
- **Verdict**: **`APPROVE`**

---

## 1. Review Summary

**Verdict**: **`APPROVE`**

All requirements specified in `DISPATCH.md`, `SCOPE.md`, and Milestone 1 of `PROJECT.md` have been implemented cleanly, correctly, and without shortcuts or integrity violations. The implementation successfully eliminates the Next.js 16 async `searchParams` infinite loop, removes the invalid `react-form` package, eliminates render-phase state updates and the Back Navigation Trap in `QuestionnaireEngine.tsx`, wraps client `useSearchParams` in `<Suspense>`, establishes the pure CSS Aqua skeuomorphic theme foundation, and resolves all baseline TypeScript compiler and docx v9 type errors.

Independent verification confirmed that:
- `node "node_modules/typescript/bin/tsc" --noEmit` exits with **code 0 (0 errors)**.
- `node "node_modules/next/dist/bin/next" build` exits with **code 0 (0 errors)**, statically prerendering 15/15 routes without CSR bailout.

---

## 2. Integrity Verification

The work was evaluated against the integrity criteria:
- **Hardcoded test results**: None detected. All logic uses dynamic parameters, Prisma database queries, and dynamic session evaluation.
- **Dummy or facade implementations**: None detected. The async `searchParams` await, NextAuth `getSession` role routing, `<Suspense>` boundaries, and `activeSections` memoization are fully operational.
- **Shortcuts bypassing task**: None detected. All 8 assigned targets were resolved directly in source code.
- **Fabricated verification artifacts**: None. Independent execution of `tsc` and `next build` completely reproduced the reported 0-error results.
- **Integrity Tag**: `INTEGRITY_CLEAR`.

---

## 3. Findings

### [Informational / Coverage Gap] Finding 1: Plaintext Password Comparison Deferred to Milestone 2
- **What**: In `src/lib/auth.ts:23`, password verification performs a direct equality comparison: `user && user.password === credentials.password`.
- **Where**: `src/lib/auth.ts:22-30`.
- **Why**: Plaintext passwords pose security risks in production.
- **Context & Assessment**: Per `PROJECT.md` Feature 7 ("Password Hashing (bcryptjs)") and Feature 8 ("Secure Authentication & Demo Accounts"), bcrypt hashing and migration of seeds are explicitly scheduled for Milestone 2. Worker 1 appropriately scoped their fix to resolving the TypeScript nullability/type errors (`TS18048`, `TS2339`) without prematurely restructuring the authentication credentials pipeline before Milestone 2.
- **Recommendation**: Accept for Milestone 1; Milestone 2 implementers must implement bcrypt comparison and edge middleware as scheduled.

### [Informational / Coverage Gap] Finding 2: Questionnaire Keystroke Autosave and Mount Resume Deferred to Milestone 3
- **What**: `QuestionnaireEngine.tsx` saves progress on clicking "Next", but continuous debounced autosave (500ms keystroke debounce) and preloading answers from the database on initial mount are not yet implemented.
- **Where**: `src/components/QuestionnaireEngine.tsx:87-122`.
- **Why**: Refreshing the questionnaire page before clicking "Next" resets unsaved local state in this milestone.
- **Context & Assessment**: Per `PROJECT.md` Feature 13 ("Debounced Autosave Questionnaire: 500ms debounced autosave with Saving/Saved/Failed status indicators") and Feature 15 ("Questionnaire Resume on Refresh: Load persisted answers from database on mount so refreshes preserve state"), these capabilities are scheduled for Milestone 3. Worker 1 solved the immediate Milestone 1 scope: removing `react-form`, eliminating render-phase `setCurrentSectionIndex`, eliminating the Back Navigation Trap, introducing typed interfaces, and implementing controlled inputs.
- **Recommendation**: Accept for Milestone 1; Milestone 3 implementers must integrate answer pre-fetching on mount and 500ms debounced autosave.

### [Informational / Coverage Gap] Finding 3: Save API Authorization Check Deferred to Milestone 3
- **What**: `src/app/api/questionnaire/save/route.ts` retrieves the session via `getServerSession(authOptions)` but currently allows save operations without enforcing `session.user.id === case.customerId`.
- **Where**: `src/app/api/questionnaire/save/route.ts:7-11`.
- **Why**: Potential IDOR if a user specifies another user's `caseId`.
- **Context & Assessment**: Per `PROJECT.md` Feature 16 ("Save API Ownership Verification: Enforce `session.user.id === case.customerId` in `/api/questionnaire/save` to eliminate IDOR"), this is assigned to Milestone 3. In Milestone 1, `src/app/customer/questionnaire/page.tsx:39-42` enforces page-level customer ownership and redirects unauthorized access to `/customer/dashboard`.
- **Recommendation**: Milestone 3 implementers must enforce strict case ownership in `/api/questionnaire/save`.

---

## 4. Verified Claims Matrix

| Claim | Verified Via | Result | Notes |
|-------|--------------|--------|-------|
| TS compiler passes with 0 errors | Independent execution of `node "node_modules/typescript/bin/tsc" --noEmit` | **PASS** | Exit code 0, 0 errors |
| Next.js production build succeeds | Independent execution of `node "node_modules/next/dist/bin/next" build` | **PASS** | Exit code 0, Turbopack compiled in 1085ms, all 15 routes generated |
| Async `searchParams` eliminates infinite loop | Line-by-line inspection of `src/app/customer/questionnaire/page.tsx:8-36` | **PASS** | Properly typed as `Promise`, awaited before conditional check, query string preserved |
| `window.location.href = "/api/auth/session"` removed | Inspection of `src/app/login/page.tsx:18-43` | **PASS** | Removed; role-based routing via `router.push()` implemented cleanly |
| `useSearchParams` wrapped in `<Suspense>` | Inspection of `checkout/page.tsx` and `document/page.tsx` | **PASS** | Decoupled content components wrapped in `<Suspense fallback={...}>`; prerendered as static content |
| `react-form` removed & render-phase state setters eliminated | Inspection of `src/components/QuestionnaireEngine.tsx` | **PASS** | Replaced with React 19 pure state hooks; `activeSections` memoized; Back Navigation Trap resolved |
| Aqua / Retro Apple styling implemented | Inspection of `src/app/globals.css` and `src/app/page.tsx` | **PASS** | Pure CSS gradient gel buttons, pinstripes, acrylic window cards, traffic lights; mobile viewport overlays removed |
| Baseline compiler errors resolved | Inspection of `api/document/download/route.ts`, `lib/auth.ts`, `server/document-generator.ts` | **PASS** | Uint8Array conversion, session user casting, docx `TextRun` bold fix |

---

## 5. Adversarial Stress-Testing & Attack Scenarios

### Challenge 1: Next.js 16 `searchParams` Parameter Tampering & Array Ingestion
- **Assumption**: `searchParams.caseId` can be either a string, a string array (duplicate query parameters `?caseId=a&caseId=b`), or absent.
- **Attack Scenario**: Adversary passes malformed query parameters such as `?caseId=` or multiple `?caseId=foo&caseId=bar`.
- **Result**: `page.tsx:18-22` handles both string and array shapes:
  ```typescript
  let caseId = typeof resolvedParams?.caseId === "string"
    ? resolvedParams.caseId
    : Array.isArray(resolvedParams?.caseId)
    ? resolvedParams.caseId[0]
    : undefined;
  ```
  If empty/undefined, creates a new draft case and redirects to `/customer/questionnaire?caseId=${newCase.id}`. If present, line 39 verifies ownership via `prisma.case.findUnique`. If ownership check fails, redirects to `/customer/dashboard`.
- **Status**: **PASS (Robust)**.

### Challenge 2: The Back Navigation Trap in Conditional Questionnaires
- **Assumption**: A user who skips a conditional section (e.g., Section 2: Minor Children when answering "No") can freely navigate forward and backward without getting stuck or triggering React re-render errors.
- **Attack Scenario**: User answers "No" to minor children on Section 1. Navigates to Section 3. Realizes they want to review Section 1 and clicks "Back".
  - *Previous Behavior*: Index decremented to 1 (Section 2). Render body evaluated condition as false and executed `setCurrentSectionIndex(2)`, pushing the user back to Section 3 immediately and trapping them.
  - *Current Behavior*: `activeSections` derives only eligible sections using `useMemo`. If Section 2 conditions are unmet, `activeSections` only contains `[Section 1, Section 3, Section 4]`. The user is on index 1 (Section 3). Clicking "Back" decrements index to 0 (Section 1). The skipped section is completely bypassed in the active array.
- **Status**: **PASS (Robust)**.

### Challenge 3: Rapid Double-Clicking / Race Conditions on Questionnaire Next Button
- **Assumption**: A user rapidly clicks "Next" or "Review Answers" on poor network connectivity.
- **Attack Scenario**: Multiple concurrent POST requests to `/api/questionnaire/save` could create database contention or race conditions.
- **Result**: `QuestionnaireEngine.tsx:88-90` enforces:
  ```typescript
  if (!currentSection || isSaving) return;
  setIsSaving(true);
  ```
  Both the "Next" and "Back" buttons have `disabled={isSaving}`. Button text toggles to `"Saving..."`.
- **Status**: **PASS (Robust)**.

### Challenge 4: Client-Side Static Optimization Bailout on Unknown Search Parameters
- **Assumption**: Next.js 16 build compiler does not crash or warn on static prerendering for routes consuming dynamic search parameters.
- **Attack Scenario**: Build executes static generation across all routes without server-side request context.
- **Result**: Routes `/customer/checkout` and `/customer/document` prerendered cleanly as `○ (Static)` without any CSR bailout warnings due to explicit root `<Suspense>` boundaries.
- **Status**: **PASS (Robust)**.

---

## 6. Coverage Gaps & Unverified Items

- **End-to-end database seed execution**: Verified Prisma queries compile and build; verified demo accounts exist in `prisma/seed.ts`. Comprehensive seed verification is part of Milestone 2.
- **Edge Middleware protection**: `src/middleware.ts` is scheduled for Milestone 2.

---

## 7. Final Recommendation

**APPROVE**. Milestone 1 is verified complete, robust, and production-build ready. The orchestrator may safely proceed to Milestone 2 (Database Schema, Relational Integrity & Secure Authentication).
