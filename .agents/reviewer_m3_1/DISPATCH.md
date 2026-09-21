# Task Assignment: Reviewer 1 (Milestone 3)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\reviewer_m3_1`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `59624314-f71e-456e-93f6-c2287d67bede`

## Mandate & Scope
You are Reviewer 1 for Milestone 3: Customer Portal, Case Lifecycle & Debounced Questionnaire Engine.
Your focus is Code Quality, Schema & API Conformance, Registration & Customer Dashboard, and Aqua Skeuomorphic UI.

## Required Reading:
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md`
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md`
3. `E:\Online will-writing & digital estate planning V0\.agents\worker_m3\changes.md`
4. `E:\Online will-writing & digital estate planning V0\.agents\worker_m3\handoff.md`

## What to Inspect:
1. `src/app/api/auth/register/route.ts`:
   - Validates email and password (min length).
   - Normalizes email (`.toLowerCase().trim()`).
   - Checks duplicate email (409 Conflict).
   - Hashes password using bcryptjs (10 rounds).
   - Emits `USER_REGISTERED` audit log.
   - Returns 201 with sanitized user payload (no password).
2. `src/app/register/page.tsx`:
   - Full Aqua skeuomorphic styling (`.bg-aqua-pinstripes`, `.aqua-window`, `.aqua-titlebar`, `.aqua-traffic-lights`, `.aqua-btn-primary`, `.aqua-input`).
   - Form fields, validation, error display.
   - Links to `/login`.
3. Links in `src/app/login/page.tsx` and `src/app/page.tsx` to `/register`.
4. `src/app/api/cases/route.ts`:
   - Authenticated GET (returns customer's cases) and POST (creates DRAFT case with `CASE_CREATED` audit log).
5. `src/app/customer/dashboard/page.tsx`:
   - Aqua styling, status badges (`DRAFT`, `SUBMITTED`, `IN_REVIEW`, `APPROVED`, etc.), "Resume Questionnaire →" button, "+ Start New Will".

## Verification Commands:
1. `node "node_modules/typescript/bin/tsc" --noEmit`
2. `node "node_modules/next/dist/bin/next" build`
3. `node tests/runner.js`
4. `node .agents/worker_m3/verify_m3.js`

## Deliverables:
- Write `progress.md` and `handoff.md` in your directory.
- In `handoff.md`, provide an explicit verdict: **APPROVE** or **REQUEST_CHANGES**.
- Send completion message to parent (`59624314-f71e-456e-93f6-c2287d67bede`).

## 2026-09-17T07:15:10Z
<USER_REQUEST>
You are Reviewer 1 for Milestone 3: Customer Portal, Case Lifecycle & Debounced Questionnaire Engine.
Working directory: E:\Online will-writing & digital estate planning V0\.agents\reviewer_m3_1
Project root: E:\Online will-writing & digital estate planning V0
Parent conversation ID: 59624314-f71e-456e-93f6-c2287d67bede

Read:
1. E:\Online will-writing & digital estate planning V0\.agents\reviewer_m3_1\DISPATCH.md
2. E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md
3. E:\Online will-writing & digital estate planning V0\PROJECT.md
4. E:\Online will-writing & digital estate planning V0\.agents\worker_m3\changes.md
5. E:\Online will-writing & digital estate planning V0\.agents\worker_m3\handoff.md

Inspect:
- src/app/api/auth/register/route.ts & src/app/register/page.tsx
- src/app/login/page.tsx & src/app/page.tsx
- src/app/api/cases/route.ts & src/app/customer/dashboard/page.tsx
- Aqua skeuomorphic UI styling conformance

Run verification commands:
- node "node_modules/typescript/bin/tsc" --noEmit
- node "node_modules/next/dist/bin/next" build
- node tests/runner.js
- node .agents/worker_m3/verify_m3.js

Write progress.md and handoff.md in your directory.
Explicitly state your verdict in handoff.md: APPROVE or REQUEST_CHANGES.
Send a completion message to parent with your verdict.
</USER_REQUEST>
