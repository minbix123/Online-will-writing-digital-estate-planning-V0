# Task Assignment: Reviewer 1 (Milestone 5)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\reviewer_m5_1`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `59624314-f71e-456e-93f6-c2287d67bede`

## Mandate & Scope
You are Reviewer 1 for Milestone 5: Lawyer Portal, Admin Portal, Mock Payment & Audit Logging.
Your review focus is: **Lawyer Portal, Case Review Workflow, Review Decisions (APPROVE/REJECT/REQUEST_CHANGES), Case Assignment, and Lawyer IDOR/RBAC**.

## Required Reading:
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md`
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md`
3. `E:\Online will-writing & digital estate planning V0\.agents\worker_m5\changes.md`
4. `E:\Online will-writing & digital estate planning V0\.agents\worker_m5\handoff.md`

## What to Inspect:
1. `src/app/lawyer/dashboard/page.tsx`:
   - Segregation of "My Assigned Cases" and "Unassigned Cases Queue".
   - Aqua skeuomorphic UI styling (`.aqua-window`, `.aqua-card`, `.aqua-badge`, `.aqua-btn-primary`).
   - Claim Case action and link to `/lawyer/case/[id]`.
2. `src/app/api/lawyer/cases/assign/route.ts`:
   - Enforces lawyer RBAC (`LAWYER` or `ADMIN`).
   - Correctly assigns `case.lawyerId` and emits `LAWYER_ASSIGNED` audit log.
3. `src/app/lawyer/case/[id]/page.tsx`:
   - Renders testator details, questionnaire answers, workflow flags, and document download link.
   - Interactive determination form: `APPROVE`, `REJECT`, `REQUEST_CHANGES` with notes.
4. `src/app/api/lawyer/cases/review/route.ts`:
   - Enforces ownership/assignment (`case.lawyerId === session.user.id || role === "ADMIN"`).
   - Atomic transaction creates `LawyerReview` record, updates `Case.status`, emits `LAWYER_REVIEW_SUBMITTED` audit log.
5. `src/app/api/document/download/route.ts`:
   - Strict IDOR check: only assigned lawyer or unassigned review case can download, cross-lawyer access blocked.

## Verification Commands to Run:
1. `node "node_modules/typescript/bin/tsc" --noEmit`
2. `node "node_modules/next/dist/bin/next" build`
3. `node tests/runner.js` (must pass 131/131)
4. `node .agents/worker_m5/verify_m5.js` (must pass 8/8)

## Deliverables:
- Write `progress.md` and `handoff.md` in your directory.
- State your explicit verdict in `handoff.md`: **APPROVE** or **REQUEST_CHANGES**.


## 2026-09-17T12:30:29Z
You are Reviewer 1 for Milestone 5: Lawyer Portal, Admin Portal, Mock Payment & Audit Logging.
Working directory: E:\Online will-writing & digital estate planning V0\.agents\reviewer_m5_1
Parent conversation ID: 59624314-f71e-456e-93f6-c2287d67bede
Focus: Lawyer Portal, Case Review Workflow, Review Decisions (APPROVE/REJECT/REQUEST_CHANGES), Case Assignment, and Lawyer IDOR/RBAC.
