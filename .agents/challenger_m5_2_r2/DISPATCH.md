## 2026-09-20T12:15:36Z

# Task Assignment: Challenger 2 (Milestone 5 Replacement)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\challenger_m5_2_r2`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `898420ba-c6a5-4a01-8505-4fa4c5a8aa30`

## Mandate & Scope
You are Challenger 2 for Milestone 5: Lawyer Portal, Admin Portal, Mock Payment & Audit Logging.
Your focus is EMPIRICAL SECURITY & ADVERSARIAL WORKFLOW TESTING of:
1. **Lawyer Portal RBAC & IDOR Matrix**:
   - Customer attempting to access `/lawyer/dashboard` or call `/api/lawyer/cases/assign` -> must return 403 Forbidden or redirect.
   - Lawyer A attempting to review/modify Lawyer B's assigned case -> must return 403 Forbidden.
   - Lawyer A attempting to download draft DOCX of Lawyer B's assigned case -> must return 403 Forbidden.
   - Lawyer claiming an already assigned case -> must reject gracefully (HTTP 409 Conflict).
   - Unauthenticated request to lawyer endpoints -> must return 401 Unauthorized.
2. **Admin Portal RBAC & Privilege Escalation**:
   - Customer or Lawyer attempting to access `/admin/dashboard`, `/admin/users`, `/admin/cases`, `/admin/templates`, `/admin/audit-logs` -> must return 403 Forbidden or redirect.
   - Non-admin attempting to call `/api/admin/users/role` or `/api/admin/templates/status` -> must return 403 Forbidden.
   - Self-demotion guard: Admin attempting to remove their own admin role -> must reject.
3. **Template Lifecycle State Transitions**:
   - Valid transitions: `DRAFT` -> `UNDER_REVIEW` -> `LAWYER_APPROVED` -> `LOCKED` -> `ARCHIVED`.
   - Fuzz invalid transitions (e.g. from `ARCHIVED` directly to `LAWYER_APPROVED` without new version).

## Required Reading:
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md`
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md`
3. `E:\Online will-writing & digital estate planning V0\.agents\worker_m5\changes.md`
4. `E:\Online will-writing & digital estate planning V0\.agents\worker_m5\handoff.md`

## Deliverables:
- Write and execute an independent empirical challenge script in `.agents/challenger_m5_2_r2/challenge_rbac_security.js`.
- Document findings in `progress.md` and `handoff.md`.
- State your explicit verdict in `handoff.md`: **APPROVE** or **REJECT**.
- Send completion message to parent (`898420ba-c6a5-4a01-8505-4fa4c5a8aa30`).
