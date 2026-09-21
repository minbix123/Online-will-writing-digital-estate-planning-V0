# E2E Test Infra: Indian Online Will-Writing & Digital Estate Planning Platform MVP

## Test Philosophy
- **Opaque-box & Requirement-Driven**: Tests validate behavior against `ORIGINAL_REQUEST.md` and `PROJECT.md § Feature Inventory` from the perspective of external consumers, API clients, and end-users. No coupling to private internal implementation details.
- **Methodology**: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.
- **Progressive Testability**: Verification mechanisms do not require features more complex than what they verify. Early tests can verify core rule logic, schema validation, and API contracts before full multi-page UI pipelines are loaded.

## Feature Inventory & Test Matrix
| # | Feature Domain | Source Requirement | Tier 1 (Min 5) | Tier 2 (Min 5) | Tier 3 (Pairwise) | Tier 4 (Scenario) |
|---|----------------|-------------------|:--------------:|:--------------:|:-----------------:|:-----------------:|
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

## Test Architecture
- **Test runner**: `node tests/runner.js` (can also be invoked via `npm test`)
- **Pass/Fail Semantics**: Exit code 0 if all tests pass; non-zero (1) if any test fails.
- **Output Format**: Hierarchical tier-by-tier output with feature grouping, status symbols (PASS/FAIL), timing in milliseconds, and summary metrics.
- **Directory Layout**:
  - `tests/runner.js`: Test runner engine with tier filtering (`--tier=1`, `--tier=2`, etc.) and failure reporting.
  - `tests/helpers/assert.js`: Deterministic assertion helper library (equal, deepEqual, throws, resolves, etc.).
  - `tests/helpers/fixtures.js`: Reusable domain fixtures (testators, assets, beneficiaries, questionnaire answer sets, valid/invalid inputs).
  - `tests/tier1_features/`: Tier 1 tests organized by feature domain (55 tests).
  - `tests/tier2_boundaries/`: Tier 2 tests testing edge cases and boundaries (55 tests).
  - `tests/tier3_combinations/`: Tier 3 pairwise interaction tests (15 tests).
  - `tests/tier4_scenarios/`: Tier 4 full real-world estate planning user journeys (6 scenarios).

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Young Tech Professional (Bangalore) with Minor Children & Digital Assets | F1, F3, F4, F5, F6, F7, F9, F10, F11 | Medium-High |
| 2 | Senior Citizen Business Owner (Mumbai) Revoking Old Will & Commercial Succession | F1, F3, F4, F6, F7, F8, F9, F11 | High |
| 3 | NRI (Dubai/USA) Managing Cross-Border Property & Indian Bank Accounts | F1, F3, F6, F7, F9, F10, F11 | High |
| 4 | Multi-Heir Family Estate with Specific Legacies & Equal Residuary Division | F3, F4, F5, F7, F8, F9, F11 | High |
| 5 | Lawyer Review & Redlining Workflow for High-Risk Estate | F1, F2, F3, F7, F8, F9, F10, F11 | High |
| 6 | End-to-End Compliance, Tamper-Resistance & Audit Verification | F1, F2, F3, F5, F8, F9, F10, F11 | High |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥5 per feature = **55 test cases**
- **Tier 2 (Boundary & Corner Cases)**: ≥5 per feature = **55 test cases**
- **Tier 3 (Cross-Feature Combinations)**: Pairwise coverage of major feature interactions = **15 test cases**
- **Tier 4 (Real-World Application Scenarios)**: Realistic end-to-end user journeys = **6 test cases**
- **Total Minimum Threshold**: 131 test cases
