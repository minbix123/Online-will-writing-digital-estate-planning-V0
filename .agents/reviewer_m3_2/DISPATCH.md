# Task Assignment: Reviewer 2 (Milestone 3)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\reviewer_m3_2`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `59624314-f71e-456e-93f6-c2287d67bede`

## Mandate & Scope
You are Reviewer 2 for Milestone 3: Customer Portal, Case Lifecycle & Debounced Questionnaire Engine.
Your focus is Autosave Debounce Architecture, Questionnaire Hydration, IDOR Protection, Atomic Persistence, and Legal Branching.

## Required Reading:
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md`
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md`
3. `E:\Online will-writing & digital estate planning V0\.agents\worker_m3\changes.md`
4. `E:\Online will-writing & digital estate planning V0\.agents\worker_m3\handoff.md`

## What to Inspect:
1. `src/app/api/questionnaire/save/route.ts`:
   - 401 Unauthorized if unauthenticated.
   - 403 Forbidden if `case.customerId !== session.user.id && role !== "ADMIN"` (strict IDOR guard).
   - Atomic `prisma.questionnaireAnswer.upsert` on compound key `caseId_questionId`.
2. `src/app/customer/questionnaire/page.tsx`:
   - Next.js 16 async `searchParams` properly awaited.
   - Ownership check on case before rendering.
   - Queries `caseData` with `include: { answers: true }`.
   - Parses stored JSON answers into `initialAnswers` dictionary.
   - Passes `initialAnswers` to `<QuestionnaireEngine caseId={caseId} initialAnswers={initialAnswers} />`.
3. `src/components/QuestionnaireEngine.tsx`:
   - Hydrates state from `initialAnswers`.
   - 500ms debounced autosave on field edits with `useRef` timer.
   - Flushes pending saves on navigation.
   - Displays clear visual status badges: Saving..., Saved at HH:MM:SS, Save failed.
   - Dynamic conditional evaluation against answers.
   - Accurate progress percentage based on completed required questions.
4. `src/lib/questionnaire.ts`:
   - `hasMinorChildren` question in `children` section with `required: true` and condition `hasChildren === "Yes"`.
   - Correctly unlocks `guardian` section and downstream `GUARDIAN_REQUIRED` flag in `LegalWorkflowEngine`.

## Verification Commands:
1. `node "node_modules/typescript/bin/tsc" --noEmit`
2. `node tests/runner.js`
3. `node .agents/worker_m3/verify_m3.js`

## Deliverables:
- Write `progress.md` and `handoff.md` in your directory.
- In `handoff.md`, provide an explicit verdict: **APPROVE** or **REQUEST_CHANGES**.
- Send completion message to parent (`59624314-f71e-456e-93f6-c2287d67bede`).
