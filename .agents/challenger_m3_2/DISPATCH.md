# Task Assignment: Challenger 2 (Milestone 3)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\challenger_m3_2`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `59624314-f71e-456e-93f6-c2287d67bede`

## Mandate & Scope
You are Challenger 2 for Milestone 3: Customer Portal, Case Lifecycle & Debounced Questionnaire Engine.
Your focus is EMPIRICAL SECURITY & WORKFLOW ADVERSARIAL TESTING:
1. IDOR vulnerability fuzzing:
   - User A attempting to POST / save to User B's case -> MUST reject with 403 Forbidden.
   - Unauthenticated client attempting to POST to `/api/questionnaire/save` -> MUST reject with 401 Unauthorized.
   - Unauthenticated client attempting to POST or GET `/api/cases` -> MUST reject with 401 Unauthorized.
2. Registration security fuzzing:
   - Duplicate email registration attempt -> MUST reject with 409 Conflict.
   - Short password (<6 chars) -> MUST reject with 400 Bad Request.
   - Verify passwords stored in database are valid bcrypt hashes (`$2a$10$...`) and NEVER plaintext.
   - Verify newly registered user can authenticate and create a case.
3. Conditional Branching & Downstream Rule Engine stress test:
   - `hasChildren = "No"` -> `hasMinorChildren` condition fails, `guardian` section inactive.
   - `hasChildren = "Yes"` & `hasMinorChildren = "No"` -> `guardian` section inactive.
   - `hasChildren = "Yes"` & `hasMinorChildren = "Yes"` -> `guardian` section activated; `LegalWorkflowEngine` generates `GUARDIAN_REQUIRED` flag.

## Required Reading:
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md`
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md`
3. `E:\Online will-writing & digital estate planning V0\.agents\worker_m3\handoff.md`

## Your Task:
1. Write an independent empirical challenge script in `.agents/challenger_m3_2/challenge_security.js` (or `.ts`).
2. Run your script against the real routes, models, and database (`prisma/dev.db`).
3. Verify that all security boundaries hold firm and zero unauthorized actions succeed.
4. Record your findings in `progress.md` and `handoff.md`.
5. Explicitly state your verdict in `handoff.md`: **APPROVE** or **REJECT**.
6. Send completion message to parent (`59624314-f71e-456e-93f6-c2287d67bede`).
