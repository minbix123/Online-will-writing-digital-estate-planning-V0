# Dispatch: Test Infrastructure & Tier 1/Tier 2 Test Writer

- Identity: `test_writer_infra_t1_t2`
- Role: `teamwork_preview_test_writer`
- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\test_writer_infra_t1_t2`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Original Request: `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md`
- Project Scope: `E:\Online will-writing & digital estate planning V0\PROJECT.md`
- Test Scope: `E:\Online will-writing & digital estate planning V0\.agents\e2e_testing_orchestrator\SCOPE.md`
- Test Infra Spec: `E:\Online will-writing & digital estate planning V0\.agents\e2e_testing_orchestrator\TEST_INFRA.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks & Deliverables

1. **Publish TEST_INFRA.md at Project Root**:
   - Write `E:\Online will-writing & digital estate planning V0\TEST_INFRA.md` using the specification provided in `E:\Online will-writing & digital estate planning V0\.agents\e2e_testing_orchestrator\TEST_INFRA.md`.

2. **Build Test Runner & Harness in `tests/`**:
   - Create `tests/runner.js`:
     - Lightweight, zero-dependency Node.js test runner.
     - Supports CLI flags: `--tier=1`, `--tier=2`, `--tier=3`, `--tier=4`, or run all tiers if no flag.
     - Formatted colored terminal output with summary counts (Total, Passed, Failed, Duration).
     - Exits with `process.exit(0)` if all pass, `process.exit(1)` if any fail.
   - Create `tests/helpers/assert.js`:
     - Clean, robust assertion functions (`ok`, `equal`, `deepEqual`, `notEqual`, `throws`, `rejects`, `includes`, `match`).
   - Create `tests/helpers/fixtures.js`:
     - Standard Indian estate planning test data fixtures (testators in Bangalore/Mumbai/Delhi, NRI testators in Dubai/USA, minor children, guardians, bank accounts, mutual funds, demat accounts, immovable properties, family businesses, existing wills, executors).

3. **Implement Tier 1: Feature Coverage (55 tests across F1-F11)**:
   - Create `tests/tier1_features/`:
     - `test_f1_auth.js` (5 tests: Customer login, NRI login, Lawyer login, Admin login, password hashing verification)
     - `test_f2_rbac_idor.js` (5 tests: Customer isolation, Lawyer authorized access, Admin oversight, IDOR rejection on case access, IDOR rejection on document access)
     - `test_f3_case_lifecycle.js` (5 tests: Case creation, Initial DRAFT status, Case submission to SUBMITTED, Transition to IN_REVIEW/APPROVED, Dashboard summary retrieval)
     - `test_f4_questionnaire_engine.js` (5 tests: Section structure validation, text/number/boolean/select questions, required field enforcement, email/phone format validation, progress calculation)
     - `test_f5_autosave_resume.js` (5 tests: Debounced save payload structure, answer persistence, conflict prevention, timestamp updates, resume on session reload)
     - `test_f6_conditional_branching.js` (5 tests: Minor children triggers guardian section, NRI triggers foreign assets questions, business owner triggers commercial succession, existing will triggers revocation clause, unmarried with no kids bypasses guardian)
     - `test_f7_legal_workflow.js` (5 tests: GUARDIAN_REQUIRED rule evaluation, NRI flag evaluation, BUSINESS_INTEREST flag evaluation, EXISTING_WILL flag evaluation, lawyer review requirement determination)
     - `test_f8_template_lifecycle.js` (5 tests: Template creation in DRAFT, Transition to UNDER_REVIEW, LAWYER_APPROVED status requirement, LOCKED version immutability, unapproved clause rejection)
     - `test_f9_docx_generation.js` (5 tests: Structured testator data merging, asset schedule generation, clause merging, local storage file persistence, download authorization metadata)
     - `test_f10_mock_payment.js` (5 tests: Basic tier mock checkout, Lawyer Review tier checkout, Complex/NRI tier checkout, transactional status update, mock transparency tag)
     - `test_f11_audit_logging.js` (5 tests: Login audit event, case creation audit event, submission audit event, document gen audit event, UTC timestamp & actor verification)

4. **Implement Tier 2: Boundary & Corner Cases (55 tests across F1-F11)**:
   - Create `tests/tier2_boundaries/`:
     - `test_f1_auth_boundaries.js` (5 tests: Empty password, SQL injection attempt in email, non-existent user, case-sensitive email handling, expired/malformed session token)
     - `test_f2_rbac_boundaries.js` (5 tests: Forged user ID in header/body, Customer attempting lawyer approval endpoint, Lawyer attempting admin user deletion, Path traversal in case ID, Tampered role token)
     - `test_f3_case_boundaries.js` (5 tests: Duplicate case creation spam, Illegal status transition e.g. DRAFT directly to COMPLETED, Missing customer ID, Empty case title, Boundary status updates)
     - `test_f4_questionnaire_boundaries.js` (5 tests: Max length string input 10000 chars, Negative asset values, Malformed JSON answer payload, Unicode and regional Indian script characters in names, Array index out of bounds in beneficiaries)
     - `test_f5_autosave_boundaries.js` (5 tests: Rapid concurrent autosaves, Payload with zero keys, Network timeout / retry payload, Stale updatedAt timestamp, Overwriting answers with null)
     - `test_f6_conditional_boundaries.js` (5 tests: Toggle minor children true then false clears guardian, Multiple nested conditional triggers, Invalid boolean strings "yes"/"1", Conflicting flags handling, Boundary age calculation 17y364d vs 18y0d)
     - `test_f7_workflow_boundaries.js` (5 tests: Empty questionnaire answers evaluation, Extreme multi-flag combination, Undefined asset type handling, Missing testator age default, Rule engine isolation check against external side effects)
     - `test_f8_template_boundaries.js` (5 tests: Attempting doc gen with DRAFT template, Modifying a LOCKED template version, Injection of malicious HTML/JS in clause body, Empty template name/content, Duplicate version numbers)
     - `test_f9_docx_boundaries.js` (5 tests: Nil/empty assets array generation, 50+ beneficiaries stress test, Special XML/DOCX character escaping (& < > "), Generation request without payment, Concurrency generation safety)
     - `test_f10_payment_boundaries.js` (5 tests: Invalid payment tier name, Negative amount, Double payment submission idempotency, Failed payment state handling, Null transaction ID)
     - `test_f11_audit_boundaries.js` (5 tests: Audit record immutability - rejection of UPDATE/DELETE, Huge metadata payload handling, Missing actor ID handling for anonymous events, High frequency audit burst, Special characters in audit action)

5. **Run & Verify**:
   - Execute `node tests/runner.js --tier=1` and `node tests/runner.js --tier=2`.
   - Confirm all 110 tests execute and PASS.
   - Document the test execution command and console output in `handoff.md` in your working directory.

## 2026-09-16T10:39:49Z
Received orchestrator launch dispatch for `test_writer_infra_t1_t2`:
1. Publish `TEST_INFRA.md` at project root using exact content from `.agents/e2e_testing_orchestrator/TEST_INFRA.md`.
2. Build test harness: `tests/runner.js`, `tests/helpers/assert.js`, `tests/helpers/fixtures.js`.
3. Implement Tier 1: Feature Coverage (55 tests across F1-F11 in `tests/tier1_features/`).
4. Implement Tier 2: Boundary & Corner Cases (55 tests across F1-F11 in `tests/tier2_boundaries/`).
5. Run tests using `run_command` (`node tests/runner.js --tier=1` and `node tests/runner.js --tier=2`), confirm all 110 tests pass with exit code 0.
6. Write `handoff.md` in working directory and report results to parent orchestrator via `send_message`.

## 2026-09-16T10:50:22Z
Resume reminder received from orchestrator:
1. Confirm `TEST_INFRA.md` published at root (Done).
2. Build test runner harness in `tests/`: `runner.js`, `helpers/assert.js`, `helpers/fixtures.js`.
3. Implement Tier 1 (55 tests: F1-F11).
4. Implement Tier 2 (55 tests: F1-F11).
5. Run tests and verify 110/110 pass with exit code 0.
6. Write `handoff.md` and notify parent.
