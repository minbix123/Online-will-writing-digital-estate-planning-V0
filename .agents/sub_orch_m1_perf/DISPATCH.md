# Task Assignment: Sub-Orchestrator for Milestone 1 (Performance & Build)

- Working Directory: E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m1_perf
- Project Root: E:\Online will-writing & digital estate planning V0
- Parent Orchestrator ID: e6a2842f-15ec-4d9a-a9e5-716b515ba023
- Original Request: E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md
- Project Scope: E:\Online will-writing & digital estate planning V0\PROJECT.md

## Scope & Mandate
You are the **Sub-Orchestrator for Milestone 1**: Codebase Audit, Performance Optimization & UI Theme Foundation.

### Milestone 1 Objectives
From `PROJECT.md` and Survey Explorer findings:
1. **Async searchParams Fix**:
   In `src/app/customer/questionnaire/page.tsx`, `searchParams` is a Promise in Next.js 16. Await `searchParams` properly before reading `caseId` to prevent the infinite redirect loop and redundant case creations.
2. **Missing Dependency / Broken Import Fix**:
   In `src/components/QuestionnaireEngine.tsx:4`, remove invalid `import { useForm, FormProvider } from "react-form"` (replace with `react-hook-form` already in package.json or native React state).
3. **Eliminate Render-Time State Setter**:
   In `src/components/QuestionnaireEngine.tsx:55-63`, remove `setCurrentSectionIndex(currentSectionIndex + 1)` from the component render body (use `useEffect` or handle transition on user action).
4. **Login Redirection Bug Fix**:
   In `src/app/login/page.tsx:26`, remove `window.location.href = "/api/auth/session"`. Implement clean client-side routing based on authenticated user role.
5. **Suspense Boundaries for useSearchParams**:
   In `src/app/customer/checkout/page.tsx` and `src/app/customer/document/page.tsx`, wrap `useSearchParams()` usage inside `<Suspense>` boundaries.
6. **UI Foundation (Retro Apple / Aqua / Skeuomorphic Styling)**:
   Add Aqua / 2000s skeuomorphic CSS styles, pill buttons, glossy highlights, subtle pinstripes, and polished card styling in `globals.css` and landing page `src/app/page.tsx` without degrading rendering performance.
7. **Clean Build & Verification**:
   Execute the iteration loop (Explorer -> Worker -> Reviewers -> Challengers -> Forensic Auditor -> Gate) to implement and verify that `npx tsc --noEmit` and `npm run build` pass cleanly with 0 errors.

### Protocol
- Maintain `BRIEFING.md`, `SCOPE.md`, `progress.md`, and `GATE_STATUS.md` in your working directory.
- Delegate implementation to Workers and verify through Reviewers, Challengers, and the Forensic Auditor.
- Report back to parent orchestrator with `handoff.md` once Gate PASS is achieved.

## 2026-09-16T10:36:46Z
You are the Sub-Orchestrator for Milestone 1: Codebase Audit, Performance Optimization & UI Theme Foundation.
Your working directory is: `E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m1_perf`.
Project root: `E:\Online will-writing & digital estate planning V0`.
Parent orchestrator conversation ID: `e6a2842f-15ec-4d9a-a9e5-716b515ba023`.

MANDATORY: Read `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md`, `E:\Online will-writing & digital estate planning V0\PROJECT.md`, and your task assignment at `E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m1_perf\DISPATCH.md`.

Your objective:
1. Initialize your `BRIEFING.md`, `SCOPE.md`, and `progress.md`.
2. Execute the iteration loop for Milestone 1:
   - Fix unawaited async `searchParams` in Next.js 16 (`src/app/customer/questionnaire/page.tsx:7-29`).
   - Fix invalid import `react-form` in `src/components/QuestionnaireEngine.tsx:4`.
   - Eliminate render-time `setCurrentSectionIndex` calls in `QuestionnaireEngine.tsx:55-63`.
   - Fix login redirect bug (`window.location.href = "/api/auth/session"`) in `src/app/login/page.tsx:26-32`.
   - Wrap `useSearchParams()` in `<Suspense>` in client pages (`checkout`, `document`).
   - Add Aqua / Retro Apple / skeuomorphic CSS styles and polish in `src/app/globals.css` and `src/app/page.tsx`.
   - Ensure clean compilation, typecheck (`npx tsc --noEmit`), and build (`npm run build`).
3. Run Worker -> Reviewers (2) -> Challengers (2) -> Forensic Auditor -> Gate.
4. Record verdicts in `GATE_STATUS.md`.
5. Once Gate passes, write `handoff.md` and send a message back to parent orchestrator.

