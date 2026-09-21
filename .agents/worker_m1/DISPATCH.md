# Task Assignment: Implementer for Milestone 1 (Performance & Build Fixes, Theme Foundation)

- Role: teamwork_preview_worker
- Working Directory: E:\Online will-writing & digital estate planning V0\.agents\worker_m1
- Project Root: E:\Online will-writing & digital estate planning V0
- Parent Sub-Orchestrator Conversation ID: b9ae32ea-bf02-4e25-912d-0a32091419d9

## Mandatory Files to Read:
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md` (Read in full)
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md`
3. `E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m1_perf\SCOPE.md`
4. Explorer 1 Handoff: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m1_1\handoff.md`
5. Explorer 2 Handoff: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m1_2\handoff.md`
6. Explorer 3 Handoff: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m1_3\handoff.md`

## Mandatory Integrity Warning:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Write Ownership:
You have exclusive write ownership over:
- `src/app/customer/questionnaire/page.tsx`
- `src/app/login/page.tsx`
- `src/app/customer/checkout/page.tsx`
- `src/app/customer/document/page.tsx`
- `src/components/QuestionnaireEngine.tsx`
- `src/app/globals.css`
- `src/app/page.tsx`
- `src/app/api/document/download/route.ts`
- `src/lib/auth.ts`
- `src/server/document-generator.ts`

## Tasks to Execute:
1. `src/app/customer/questionnaire/page.tsx`:
   - Change `searchParams` type to `Promise<{ caseId?: string | string[] }>`
   - `const resolvedParams = await searchParams;` and extract `caseId` properly.
   - Retain ownership verification and case creation fallback.
2. `src/app/login/page.tsx`:
   - Eliminate `window.location.href = "/api/auth/session"`.
   - Call `await getSession()` and navigate cleanly via `router.push(...)` based on role (`LAWYER`, `ADMIN`, `CUSTOMER`).
3. `src/app/customer/checkout/page.tsx` & `src/app/customer/document/page.tsx`:
   - Decouple into inner content components and wrap `useSearchParams()` inside `<Suspense fallback={...}>`.
4. `src/components/QuestionnaireEngine.tsx`:
   - Remove invalid `import { useForm, FormProvider } from "react-form"` and unused `react-hook-form` imports.
   - Replace render-time `setCurrentSectionIndex(...)` and eliminate the Back Navigation Trap by using `activeSections = useMemo(...)` based on section conditions and answers.
   - Add TypeScript interfaces resolving all `TS2339` errors on questions/options/fields.
   - Use `value={answers[q.id] ?? ""}` and add `isSaving` guard against concurrent submits.
5. `src/app/globals.css`:
   - Add pure CSS Aqua skeuomorphic design system classes (`.bg-aqua-pinstripes`, `.aqua-window`, `.aqua-card`, `.aqua-titlebar`, `.aqua-traffic-lights`, `.aqua-btn-primary`, `.aqua-btn-secondary`, `.aqua-badge`, `.aqua-inset-well`) as specified in Explorer 3's report.
6. `src/app/page.tsx`:
   - Apply Aqua styling, window cards, and gel buttons to the landing page, removing broken fixed mobile banners while preserving 100% of copy and functionality.
7. Baseline Type & Build Fixes:
   - `src/app/api/document/download/route.ts:30`: Wrap `new Uint8Array(docxBuffer)`.
   - `src/lib/auth.ts:46-47`: Add guard `if (token && session.user)` and assert user id/role.
   - `src/server/document-generator.ts:80`: Put `bold: true` on child `TextRun`.
8. Verification:
   Run:
   `node "node_modules/typescript/bin/tsc" --noEmit`
   `node "node_modules/next/dist/bin/next" build`
   Ensure both pass with exit code 0.

## Output Requirements:
- Write `changes.md` and `handoff.md` in `E:\Online will-writing & digital estate planning V0\.agents\worker_m1`.
- Include full verification commands and terminal outputs in `handoff.md`.
- Send a completion message back to parent (`b9ae32ea-bf02-4e25-912d-0a32091419d9`).

## 2026-09-16T10:44:52Z
<USER_REQUEST>
You are Worker 1 for Milestone 1.
Your working directory is `E:\Online will-writing & digital estate planning V0\.agents\worker_m1`.
Read your task instructions at `E:\Online will-writing & digital estate planning V0\.agents\worker_m1\DISPATCH.md`.
Read `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md`, `E:\Online will-writing & digital estate planning V0\PROJECT.md`, and `E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m1_perf\SCOPE.md`.
Also read Explorer reports:
- `E:\Online will-writing & digital estate planning V0\.agents\explorer_m1_1\handoff.md`
- `E:\Online will-writing & digital estate planning V0\.agents\explorer_m1_2\handoff.md`
- `E:\Online will-writing & digital estate planning V0\.agents\explorer_m1_3\handoff.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement all 8 tasks specified in DISPATCH.md.
Run verification commands:
- `node "node_modules/typescript/bin/tsc" --noEmit`
- `node "node_modules/next/dist/bin/next" build`
Ensure zero errors.
Write `changes.md` and `handoff.md` in your directory.
Send message to parent sub-orchestrator (`b9ae32ea-bf02-4e25-912d-0a32091419d9`) when complete.
</USER_REQUEST>
