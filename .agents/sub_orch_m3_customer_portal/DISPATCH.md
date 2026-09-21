# Task Assignment: Sub-Orchestrator for Milestone 3 (Customer Portal, Case Lifecycle & Debounced Questionnaire Engine)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m3_customer_portal`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `f45b3edc-5fc5-413a-9706-3d4843297f01`
- Original Request: `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md`
- Project Scope: `E:\Online will-writing & digital estate planning V0\PROJECT.md`
- Test Infrastructure: `E:\Online will-writing & digital estate planning V0\TEST_INFRA.md` & `TEST_READY.md`

## Scope & Objectives
You are the **Sub-Orchestrator for Milestone 3**: Customer Portal, Case Lifecycle & Debounced Questionnaire Engine.

### Core Features to Deliver:
1. **Customer Registration & Case Management**:
   - `src/app/register/page.tsx`: Customer registration page with validation, hashing passwords with `bcryptjs`, preventing duplicate emails, and clean Aqua styling.
   - Case Creation API (`src/app/api/cases/route.ts`): Authenticated endpoint to create a new case for `session.user.id` (`status: "DRAFT"`), and list user's existing cases.
2. **Customer Dashboard (`src/app/customer/dashboard/page.tsx`)**:
   - Live dashboard showing active cases, status badges, last updated date, "Resume Questionnaire" button, and "Start New Will" action.
   - Direct link to resume into `/customer/questionnaire?caseId=<id>`.
3. **Debounced Autosave Questionnaire Engine (`src/components/QuestionnaireEngine.tsx`)**:
   - Resilient, debounced autosave (500ms debounce window).
   - Clear visual status indicators: `Saving...`, `Saved (All changes saved)`, `Save failed`.
   - Section navigation across all questionnaire modules (Personal, Family, Assets, Beneficiaries, Executors, Special Clauses).
   - Progress bar calculation based on answered questions.
4. **Questionnaire Save API & IDOR Protection (`src/app/api/questionnaire/save/route.ts`)**:
   - Authenticated endpoint verifying that the requesting user owns the case (`case.customerId === session.user.id`).
   - Atomic upsert into `QuestionnaireAnswer` utilizing compound unique constraint `@@unique([caseId, questionId])`.
   - Rejects unauthorized access with HTTP 403.
5. **Conditional Branching & Dynamic Questions (`src/lib/questionnaire.ts`)**:
   - Add/verify `hasMinorChildren` question in Family section; conditionally prompt for Guardian name, relationship, contact.
   - Support conditional branches for NRI status, foreign assets, business assets, and existing will revocation.
6. **Questionnaire Resume on Mount**:
   - When `/customer/questionnaire?caseId=<id>` is mounted or refreshed, query existing answers from the database and hydrate questionnaire state.
7. **Verification & Gate Mandate**:
   - Execute the Project Pattern iteration loop:
     - Spawn fresh Explorer(s) (`teamwork_preview_explorer`) to analyze existing components and routes.
     - Spawn Worker (`teamwork_preview_worker`) with mandatory anti-cheating warning.
     - Spawn 2 Reviewers (`teamwork_preview_reviewer`) independently.
     - Spawn 2 Challengers (`teamwork_preview_challenger`) independently to verify debouncing, autosave persistence, IDOR rejection, and resume hydration.
     - Spawn 1 Forensic Auditor (`teamwork_preview_auditor`) to verify zero integrity violations.
   - Record all verdicts in `GATE_STATUS.md`.
   - Run `node tests/runner.js` and ensure all existing tests continue to pass with 0 regressions.
   - When Gate PASS is reached, write `handoff.md` and notify parent orchestrator (`f45b3edc-5fc5-413a-9706-3d4843297f01`).

## 2026-09-16T14:18:34Z
Sub-Orchestrator for Milestone 3: Customer Portal, Case Lifecycle & Debounced Questionnaire Engine.
Objectives:
1. Customer Registration & Case Creation:
   - Build customer registration at `src/app/register/page.tsx` and `src/app/api/auth/register/route.ts` with bcrypt password hashing (10 salt rounds), email deduplication, and input validation.
   - Build case creation endpoint `src/app/api/cases/route.ts` (POST creates new Case for `session.user.id` in `DRAFT` status; GET returns authenticated user's cases).
2. Customer Dashboard (`src/app/customer/dashboard/page.tsx`):
   - Display active cases with case IDs, status badges (e.g. `DRAFT`, `SUBMITTED`), created/updated dates, "Resume Questionnaire" button linking to `/customer/questionnaire?caseId=<id>`, and "Start New Will" action.
   - Case history list with proper layout and retro Aqua aesthetic.
3. Debounced Autosave Questionnaire Engine (`src/components/QuestionnaireEngine.tsx` & `/customer/questionnaire/page.tsx`):
   - Implement 500ms debounced auto-saving on field changes.
   - Visual status indicator in the UI: `Saving...`, `Saved` (with checkmark or timestamp), `Save failed`.
   - Smooth navigation across sections (Personal, Family, Assets, Beneficiaries, Executors, Clauses).
   - Progress bar showing percentage completion.
4. Save API & IDOR Security (`src/app/api/questionnaire/save/route.ts`):
   - Enforce authorization: verify `session.user.id === case.customerId` (or `ADMIN`). Reject unauthorized attempts with HTTP 403.
   - Atomic upsert into `QuestionnaireAnswer` using `@@unique([caseId, questionId])`.
5. Conditional Branching (`src/lib/questionnaire.ts`):
   - Include `hasMinorChildren` boolean question in Family section; conditionally prompt for Guardian name, relationship, and contact information when true.
   - Support conditional questions for NRI status, foreign assets, business assets, and existing will.
6. Questionnaire Resume on Mount:
   - When `/customer/questionnaire?caseId=<id>` is mounted or refreshed, query existing answers from the database and hydrate questionnaire state so user can resume without losing progress.

## 2026-09-17T07:03:14Z [RESUMPTION DISPATCH]
You are resuming as Sub-Orchestrator for Milestone 3: Customer Portal, Case Lifecycle & Debounced Questionnaire Engine.
Working directory: `E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m3_customer_portal`.
Project root: `E:\Online will-writing & digital estate planning V0`.
Parent orchestrator conversation ID: `59624314-f71e-456e-93f6-c2287d67bede`.

Status Check:
- The 3 parallel Explorers (`explorer_m3_1`, `explorer_m3_2`, `explorer_m3_3`) already completed their analyses and their reports are available at:
  - `E:\Online will-writing & digital estate planning V0\.agents\explorer_m3_1\handoff.md` (Registration & Case APIs)
  - `E:\Online will-writing & digital estate planning V0\.agents\explorer_m3_2\handoff.md` (Questionnaire Engine, 500ms Debounce, Conditional Branching)
  - `E:\Online will-writing & digital estate planning V0\.agents\explorer_m3_3\handoff.md` (Dashboard, Hydration & Save IDOR Security)

Execution Plan:
1. Update `progress.md` and `BRIEFING.md` in your working directory.
2. Spawn fresh Worker (`worker_m3` in `.agents/worker_m3`) to implement:
   - `src/app/api/auth/register/route.ts` (bcryptjs, deduplication, 201 response, audit log)
   - `src/app/register/page.tsx` (Aqua skeuomorphic design, client validation)
   - Links in `src/app/login/page.tsx` and `src/app/page.tsx` to `/register`
   - `src/app/api/cases/route.ts` (POST create case with status DRAFT for user, GET user's cases, audit log)
   - `src/app/customer/dashboard/page.tsx` (Aqua styling, status badges, resume links, start new will)
   - `src/lib/questionnaire.ts` (add `hasMinorChildren` question in children section)
   - `src/app/api/questionnaire/save/route.ts` (session auth 401, ownership check `session.user.id === case.customerId` 403, atomic `prisma.questionnaireAnswer.upsert` with compound key)
   - `src/app/customer/questionnaire/page.tsx` (fetch `caseData.answers`, parse JSON, pass `initialAnswers`)
   - `src/components/QuestionnaireEngine.tsx` (500ms debounced autosave, visual Saving/Saved/Failed badges, initialAnswers hydration, accurate progress calculation, responsive Aqua UI)
   - Verification: Worker runs `node tests/runner.js`, `npx tsc --noEmit`, and `npm run build`.
3. Spawn 2 Reviewers (`reviewer_m3_1`, `reviewer_m3_2`).
4. Spawn 2 Challengers (`challenger_m3_1`, `challenger_m3_2`) for empirical testing:
   - Challenger 1: Debounce timing, rapid keystroke coalescing, atomic upsert, autosave visual indicators, and refresh/hydration state retention.
   - Challenger 2: IDOR vulnerability stress test, cross-customer isolation, conditional branching (`hasMinorChildren` -> guardian section), and registration/login end-to-end.
5. Spawn 1 Forensic Auditor (`auditor_m3`, archetype `teamwork_preview_auditor`) to verify zero integrity violations.
6. Evaluate Gate in `GATE_STATUS.md`. When Gate passes (strict AND across all reviewers/challengers/auditor), update `progress.md`, write `handoff.md`, and send a message back to parent orchestrator (`59624314-f71e-456e-93f6-c2287d67bede`).
