# Task Assignment: Challenger 2 (Milestone 4)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\challenger_m4_2`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `59624314-f71e-456e-93f6-c2287d67bede`

## Mandate & Scope
You are Challenger 2 for Milestone 4: Deterministic Legal Workflow, Template/Clause System & DOCX Gen.
Your focus is EMPIRICAL SECURITY & ADVERSARIAL WORKFLOW TESTING:
1. Legal Workflow Engine adversarial fuzzing:
   - Malformed, empty, type-corrupted answers -> must not crash, must return valid flags.
   - All permutations of legal flags: `STANDARD`, `GUARDIAN_REQUIRED`, `NRI`, `FOREIGN_ASSETS`, `BUSINESS_INTEREST`, `EXISTING_WILL`.
   - Verify `recommendedClauses` matches flags in all cases.
2. Real test assertions in `tests.ts`:
   - Verify all 10 tests run and throw on mismatch.
   - Verify draft template is rejected by DocumentGenerator.
   - Verify template version locking.
3. Download API RBAC & IDOR Security:
   - Customer A attempting to download Customer B's document -> must return 403 Forbidden.
   - Unassigned lawyer attempting to download private draft case of another lawyer -> must return 403 Forbidden.
   - Unauthenticated request -> must return 401 Unauthorized.

## Your Task:
1. Write an independent empirical challenge script in `.agents/challenger_m4_2/challenge_workflow_rbac.js` (or `.ts`).
2. Run your script against the real routes, models, and database.
3. Record findings in `progress.md` and `handoff.md`.
4. State your explicit verdict in `handoff.md`: **APPROVE** or **REJECT**.
5. Send completion message to parent (`59624314-f71e-456e-93f6-c2287d67bede`).
