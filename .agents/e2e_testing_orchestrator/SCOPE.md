# Scope: E2E Testing Track (Indian Online Will-Writing & Estate Planning MVP)

## Test Architecture & Philosophy
- **Requirement-Driven & Opaque-Box**: Tests validate behavior against `ORIGINAL_REQUEST.md` and `PROJECT.md § Feature Inventory` from the perspective of external consumers, API clients, and end-users. No coupling to private internal variables or refactor-prone internals.
- **Progressive Testability**: Verification mechanisms must not require features more complex than what they verify. Early tests can verify core rule logic, schema validation, and API contracts before full multi-page UI pipelines are loaded.
- **Zero Mocking of Core Logic**: Real relational integrity, real deterministic rule evaluation, real password hashing, real DOCX document generation, real audit logging.

## Feature Inventory & Test Mapping
| # | Feature Area | User Requirement Ref | Tier 1 (Min 5) | Tier 2 (Min 5) | Tier 3 (Pairwise) | Tier 4 (Scenario) |
|---|--------------|----------------------|:--------------:|:--------------:|:-----------------:|:-----------------:|
| F1 | Auth & Demo Accounts | R3, R16 | 5 | 5 | ✓ | ✓ |
| F2 | RBAC & Security Isolation (IDOR) | R3, R13 | 5 | 5 | ✓ | ✓ |
| F3 | Customer Case Lifecycle | R4, R2 | 5 | 5 | ✓ | ✓ |
| F4 | Questionnaire Engine & Validation | R5 | 5 | 5 | ✓ | ✓ |
| F5 | Debounced Autosave & Resume | R5 | 5 | 5 | ✓ | ✓ |
| F6 | Conditional Branching Logic | R5, R6 | 5 | 5 | ✓ | ✓ |
| F7 | Deterministic Legal Workflow Engine | R6 | 5 | 5 | ✓ | ✓ |
| F8 | Template & Clause Lifecycle | R7 | 5 | 5 | ✓ | ✓ |
| F9 | Server-Side DOCX Generation | R10 | 5 | 5 | ✓ | ✓ |
| F10 | Mock Payment & Transactions | R11 | 5 | 5 | ✓ | ✓ |
| F11 | Tamper-Resistant Audit Logging | R12 | 5 | 5 | ✓ | ✓ |

## Test Tier Methodology & Targets
- **Tier 1: Feature Coverage (>=55 tests)**:
  - 5 tests per feature domain verifying happy-path functionality in isolation.
- **Tier 2: Boundary & Corner Cases (>=55 tests)**:
  - 5 tests per feature domain testing boundaries, empty strings, max lengths, negative numbers, missing required keys, unauthorized access attempts, malformed payloads, invalid state transitions.
- **Tier 3: Cross-Feature Combinations (>=15 tests)**:
  - Pairwise combinatorial testing between features:
    1. NRI status + Minor children + Foreign assets
    2. Existing will revocation + Business interests + Guardian designation
    3. Basic payment tier with questionnaire triggering lawyer review requirement
    4. Template locked state during concurrent document generation
    5. Customer IDOR attempt to access lawyer review notes and update case status
    6. Autosave resume after partial section submission and browser restart
    7. Document generation failure rollback and audit record capture
    8. Lawyer approval on submitted case transitioning to approved and completed
    9. Admin audit log inspection after multiple customer lifecycle actions
    10. Complex estate distribution with multi-beneficiary percentage validation (100% sum check)
    11. NRI customer with foreign assets requiring Complex/NRI payment tier
    12. Revocation of existing will with new executor and alternate executor assignment
    13. Customer trying to generate document before payment completion
    14. Lawyer trying to approve case assigned to another lawyer
    15. Edge case where all optional sections are skipped vs all populated
- **Tier 4: Real-World Application Scenarios (>=6 comprehensive scenarios)**:
  - Scenario 1: Young Indian Tech Professional (Bangalore) with Minor Children and Digital Assets (Appointing Guardian, Executor, Mutual Funds + Demat Distribution)
  - Scenario 2: Senior Citizen Business Owner (Mumbai) Revoking Old 2010 Will, Managing Commercial Assets & Alternate Executors
  - Scenario 3: Non-Resident Indian (NRI in USA/Dubai) Managing Cross-Border Property, Indian Bank Accounts, and Foreign Asset Exclusion
  - Scenario 4: Complex Multi-Heir Family Estate with Specific Legacies, Residual Estate Division (Equal Splitting), and Medical Proxy
  - Scenario 5: Lawyer Review & Redlining Workflow (Case flagged for business complexity, assigned to lawyer, reviewed with notes, status transitioned, and final will approved)
  - Scenario 6: End-to-End Audit Trail & Compliance Verification (Tracking every lifecycle event from registration, draft, autosave, submission, lawyer review, mock payment, DOCX generation to download)

## Test Directory & File Structure Plan
- `tests/`
  - `runner.js` / `runner.ts`: Lightweight, deterministic test runner with colored output, timings, tier filtering, and zero external framework bloat.
  - `tier1_features/`: Tier 1 feature tests (F1 through F11)
  - `tier2_boundaries/`: Tier 2 boundary & edge case tests (F1 through F11)
  - `tier3_combinations/`: Tier 3 pairwise cross-feature tests
  - `tier4_scenarios/`: Tier 4 real-world end-to-end scenarios
  - `helpers/`: Test fixtures, client mock session generators, deterministic assertion library, mock db/api clients.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1-TEST | Test Infrastructure & Runner Harness | Create `TEST_INFRA.md`, runner harness, assertions helper | none | DONE |
| M2-TEST | Tier 1 (Feature Coverage) & Tier 2 (Boundaries) | Implement 110 tests across F1-F11 for Tiers 1 & 2 | M1-TEST | DONE |
| M3-TEST | Tier 3 (Combinations) & Tier 4 (Real Scenarios) | Implement 15+ Tier 3 tests and 6 Tier 4 scenarios | M2-TEST | DONE |
| M4-TEST | Verification & Publication of `TEST_READY.md` | Run full test suite, verify 100% pass, publish `TEST_READY.md` | M3-TEST | DONE |
