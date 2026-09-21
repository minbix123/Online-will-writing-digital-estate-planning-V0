## 2026-09-16T13:31:32Z
# Task Assignment: Test Writer (Tier 3 Combinations & Tier 4 Scenarios)

- Working Directory: E:\Online will-writing & digital estate planning V0\.agents\test_writer_tier3_tier4
- Project Root: E:\Online will-writing & digital estate planning V0
- Parent Orchestrator ID: a7401278-1286-424a-949a-ce0a951cf495
- Role: teamwork_preview_test_writer

## Mandate
Implement all 15 test cases for Tier 3 (Pairwise Cross-Feature Combinations) in `tests/tier3_combinations/` AND all 6 end-to-end real-world scenarios for Tier 4 in `tests/tier4_scenarios/`.

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
1. Create directory `tests/tier3_combinations/` containing pairwise combination tests (15 test cases total, e.g. in `tests/tier3_combinations/test_combinations.js` or separate files `test_c1_to_c5.js`, etc.):
   - C1: Auth + Case Creation: Customer logs in and immediately creates initial draft case.
   - C2: Branching + Workflow: Minor children triggering GUARDIAN_REQUIRED flag and recommended guardian clause.
   - C3: Branching + Workflow + Payment: NRI status with foreign assets triggering NRI flag and recommending Complex/NRI tier.
   - C4: Branching + Workflow: Existing Will flag triggering revocation clause recommendation.
   - C5: Questionnaire + Autosave Resume: Progressive multi-section answers saved across steps and resumed completely.
   - C6: IDOR Protection + Case Access: Cross-customer case access rejection (Customer A cannot read or modify Customer B's case).
   - C7: RBAC + Template Management: Non-admin/non-lawyer cannot transition template to LAWYER_APPROVED.
   - C8: Workflow Engine + DOCX Generator: Workflow flags and recommended clauses correctly drive clause inclusion in generated document.
   - C9: Template Lifecycle + DOCX Generator: Generating document with unapproved (DRAFT) template fails; approved template succeeds.
   - C10: Case Lifecycle + Mock Payment: Case transitions from DRAFT -> SUBMITTED upon successful payment completion.
   - C11: Auth + Audit Logging: Login event creates immutable audit log entry with actor ID and UTC timestamp.
   - C12: Case Lifecycle + Audit Logging: Case creation and status transition generate corresponding audit logs.
   - C13: DOCX Generation + Audit Logging: Successful document generation emits DOCUMENT_GENERATED audit log.
   - C14: RBAC + Audit Logging: Unauthorized access attempts are rejected and leave audit logs intact without data leakage.
   - C15: Autosave + Branching + Workflow: Changing parent answers (hasChildren from Yes to No) updates workflow flags and removes invalid child clauses.

2. Create directory `tests/tier4_scenarios/` containing 6 end-to-end real-world estate planning application scenario tests as defined in `TEST_INFRA.md § Real-World Application Scenarios`:
   - Scenario 1: Young Tech Professional (Bangalore) with Minor Children & Digital Assets (F1, F3, F4, F5, F6, F7, F9, F10, F11)
   - Scenario 2: Senior Citizen Business Owner (Mumbai) Revoking Old Will & Commercial Succession (F1, F3, F4, F6, F7, F8, F9, F11)
   - Scenario 3: NRI (Dubai/USA) Managing Cross-Border Property & Indian Bank Accounts (F1, F3, F6, F7, F9, F10, F11)
   - Scenario 4: Multi-Heir Family Estate with Specific Legacies & Equal Residuary Division (F3, F4, F5, F7, F8, F9, F11)
   - Scenario 5: Lawyer Review & Redlining Workflow for High-Risk Estate (F1, F2, F3, F7, F8, F9, F10, F11)
   - Scenario 6: End-to-End Compliance, Tamper-Resistance & Audit Verification (F1, F2, F3, F5, F8, F9, F10, F11)

### Verification & Completion
- Each file must export `{ name: '...', tests: [ { name: '...', fn: async () => { ... } }, ... ] }`.
- Run `node tests/runner.js --tier=3` and verify all 15 combination tests pass.
- Run `node tests/runner.js --tier=4` and verify all 6 scenario tests pass.
- Write a complete handoff report to `E:\Online will-writing & digital estate planning V0\.agents\test_writer_tier3_tier4\handoff.md`.
- Send a completion message via `send_message` back to orchestrator (`a7401278-1286-424a-949a-ce0a951cf495`).

