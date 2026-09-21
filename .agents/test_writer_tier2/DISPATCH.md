# Task Assignment: Test Writer (Tier 2 Boundaries)

- Working Directory: E:\Online will-writing & digital estate planning V0\.agents\test_writer_tier2
- Project Root: E:\Online will-writing & digital estate planning V0
- Parent Orchestrator ID: a7401278-1286-424a-949a-ce0a951cf495
- Role: teamwork_preview_test_writer

## Mandate
Implement all 55 test cases for Tier 2 (Boundary & Corner Cases) in `tests/tier2_boundaries/`.

### Required Inputs to Read First:
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md`
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md`
3. `E:\Online will-writing & digital estate planning V0\TEST_INFRA.md`
4. `E:\Online will-writing & digital estate planning V0\tests\runner.js`
5. `E:\Online will-writing & digital estate planning V0\tests\helpers\assert.js`
6. `E:\Online will-writing & digital estate planning V0\tests\helpers\fixtures.js`
7. `E:\Online will-writing & digital estate planning V0\tests\helpers\db.js`
8. Existing Tier 1 tests in `E:\Online will-writing & digital estate planning V0\tests\tier1_features\` for reference structure.

### Detailed Requirements
Create directory `tests/tier2_boundaries/` containing 11 test files (5 tests each = 55 tests):
1. `tests/tier2_boundaries/test_f1_boundaries.js`: Auth & Demo Accounts boundaries (empty email/password, oversized strings, whitespace handling, case insensitivity, malformed email formats)
2. `tests/tier2_boundaries/test_f2_boundaries.js`: RBAC & IDOR boundaries (unauthenticated API calls, cross-customer case ID access, lawyer accessing unassigned case, client-supplied role tampering, client-supplied status tampering)
3. `tests/tier2_boundaries/test_f3_boundaries.js`: Customer Case Lifecycle boundaries (empty/null title handling, invalid state transitions e.g. DRAFT to APPROVED directly, duplicate draft case handling, retrieval with non-existent UUID, deletion/cancellation of submitted case)
4. `tests/tier2_boundaries/test_f4_boundaries.js`: Questionnaire Engine boundaries (empty answers payload, invalid section ID, missing required fields validation, type mismatch e.g. string for boolean/number, unknown field preservation/stripping)
5. `tests/tier2_boundaries/test_f5_boundaries.js`: Autosave & Resume boundaries (empty answer batch, concurrent save simulation, saving answers for non-existent case ID, partial answers persistence across reloads, 10KB+ large text fields)
6. `tests/tier2_boundaries/test_f6_boundaries.js`: Conditional Branching boundaries (hasChildren='No' with minor children data provided, hasMinorChildren='No' with guardian data, isNRI='No' with foreign asset countries, hasExistingWill='No' with revocation clause fields, invalid boolean answers)
7. `tests/tier2_boundaries/test_f7_boundaries.js`: Deterministic Legal Workflow Engine boundaries (empty answers object evaluation, unknown answers handling, edge combinations like minor children + existing will, missing spouse name when married, extreme asset values / zero values)
8. `tests/tier2_boundaries/test_f8_boundaries.js`: Template & Clause Lifecycle boundaries (generating document with DRAFT template rejected, duplicate template key/version, unauthorized role attempting template approval, updating locked template rejected, retrieving non-existent template version)
9. `tests/tier2_boundaries/test_f9_boundaries.js`: Server-Side DOCX Generation boundaries (generation for case with missing required sections rejected, invalid case ID, template file missing or corrupted handling, special characters / unicode Indic text in testator name, concurrent generation requests)
10. `tests/tier2_boundaries/test_f10_boundaries.js`: Mock Payment boundaries (unknown payment tier, negative payment amount rejected, re-paying already paid case, payment for non-existent case, payment transaction rollback on failure)
11. `tests/tier2_boundaries/test_f11_boundaries.js`: Tamper-Resistant Audit Logging boundaries (recording audit with missing required fields, attempting to mutate/update audit log rejected, attempting to delete audit log rejected, querying audit logs with non-admin role rejected, audit log timestamp verification in UTC)

### Verification & Completion
- Each file must export `{ name: '...', tests: [ { name: '...', fn: async () => { ... } }, ... ] }`.
- Run `node tests/runner.js --tier=2` and verify all 55 tests pass with exit code 0.
- Write a complete handoff report to `E:\Online will-writing & digital estate planning V0\.agents\test_writer_tier2\handoff.md`.
- Send a completion message via `send_message` back to orchestrator (`a7401278-1286-424a-949a-ce0a951cf495`).

## 2026-09-16T13:31:32Z
You are the Tier 2 Test Writer for the Indian Online Will-Writing & Digital Estate Planning Platform MVP.
Working directory: E:\Online will-writing & digital estate planning V0\.agents\test_writer_tier2
Project root: E:\Online will-writing & digital estate planning V0
Parent orchestrator ID: a7401278-1286-424a-949a-ce0a951cf495
Role: specialist, qa, test_writer
