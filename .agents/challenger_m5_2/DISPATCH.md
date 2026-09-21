# Task Assignment: Challenger 2 (Milestone 5)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\challenger_m5_2`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `59624314-f71e-456e-93f6-c2287d67bede`

## Mandate & Scope
You are Challenger 2 for Milestone 5: Lawyer Portal, Admin Portal, Mock Payment & Audit Logging.
Your focus is EMPIRICAL SECURITY & ADVERSARIAL WORKFLOW TESTING of:
1. **Lawyer Portal RBAC & IDOR Matrix**:
   - Customer attempting to access `/lawyer/dashboard` or call `/api/lawyer/cases/assign` -> must return 403 Forbidden or redirect.
   - Lawyer A attempting to review/modify Lawyer B's assigned case -> must return 403 Forbidden.
   - Lawyer A attempting to download draft DOCX of Lawyer B's assigned case -> must return 403 Forbidden.
   - Lawyer claiming an already assigned case -> must reject gracefully.
   - Unauthenticated request to lawyer endpoints -> must return 401 Unauthorized.
2. **Admin Portal RBAC & Privilege Escalation**:
   - Customer or Lawyer attempting to access `/admin/dashboard`, `/admin/users`, `/admin/cases`, `/admin/templates`, `/admin/audit-logs` -> must return 403 Forbidden or redirect.
   - Non-admin attempting to call `/api/admin/users/role` or `/api/admin/templates/status` -> must return 403 Forbidden.
   - Self-demotion guard: Admin attempting to remove their own admin role -> must reject.
3. **Template Lifecycle State Transitions**:
   - Valid transitions: `DRAFT` -> `UNDER_REVIEW` -> `LAWYER_APPROVED` -> `LOCKED` -> `ARCHIVED`.
   - Fuzz invalid transitions (e.g. from `ARCHIVED` directly to `LAWYER_APPROVED` without new version).

## Your Task:
1. Write an independent empirical challenge script in `.agents/challenger_m5_2/challenge_rbac_security.js` (or `.ts`).
2. Run your script against the real routes, models, and database.
3. Record findings in `progress.md` and `handoff.md`.
4. State your explicit verdict in `handoff.md`: **APPROVE** or **REJECT**.
5. Send completion message to parent (`59624314-f71e-456e-93f6-c2287d67bede`).

## 2026-09-17T12:30:29Z
You are Challenger 2 for Milestone 5: Lawyer Portal, Admin Portal, Mock Payment & Audit Logging.

Your working directory is:
E:\Online will-writing & digital estate planning V0\.agents\challenger_m5_2
Project root:
E:\Online will-writing & digital estate planning V0
Parent conversation ID:
59624314-f71e-456e-93f6-c2287d67bede

Read these files immediately before starting:
1. E:\Online will-writing & digital estate planning V0\.agents\challenger_m5_2\DISPATCH.md
2. E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md
3. E:\Online will-writing & digital estate planning V0\PROJECT.md
4. E:\Online will-writing & digital estate planning V0\.agents\worker_m5\handoff.md

Your Mandate & Scope:
Perform EMPIRICAL SECURITY & ADVERSARIAL WORKFLOW TESTING:
1. Lawyer Portal RBAC & IDOR Matrix:
   - Customer attempting to call /api/lawyer/cases/assign -> 403 Forbidden.
   - Lawyer A attempting to review Lawyer B's assigned case -> 403 Forbidden.
   - Lawyer A attempting to download draft DOCX of Lawyer B's assigned case -> 403 Forbidden.
   - Unauthenticated requests -> 401 Unauthorized.
2. Admin Portal RBAC & Privilege Escalation:
   - Customer/Lawyer accessing admin endpoints -> 403 Forbidden.
   - Self-demotion guard: Admin attempting to remove their own admin role -> rejected.
3. Template Lifecycle State Transitions:
   - Valid transitions: DRAFT -> UNDER_REVIEW -> LAWYER_APPROVED -> LOCKED -> ARCHIVED.
   - Fuzz invalid transitions.

Deliverables:
- Write and execute an independent challenge script: .agents/challenger_m5_2/challenge_rbac_security.js (or .ts).
- Document results in progress.md and handoff.md.
- State your explicit verdict in handoff.md: APPROVE or REJECT.
- Send completion message to parent (59624314-f71e-456e-93f6-c2287d67bede) with assertion counts.
