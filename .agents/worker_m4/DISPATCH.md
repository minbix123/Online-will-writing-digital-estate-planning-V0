# Task Assignment: Implementation Worker (Milestone 4)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\worker_m4`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `59624314-f71e-456e-93f6-c2287d67bede`

## Mandate & Scope
You are the Implementation Worker for Milestone 4: Deterministic Legal Workflow, Template/Clause System & DOCX Gen.

## Required Reading:
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md`
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md`
3. Explorer handoff reports:
   - `E:\Online will-writing & digital estate planning V0\.agents\explorer_m4_1\handoff.md` (Legal Workflow & Tests)
   - `E:\Online will-writing & digital estate planning V0\.agents\explorer_m4_2\handoff.md` (Template & Clause System)
   - `E:\Online will-writing & digital estate planning V0\.agents\explorer_m4_3\handoff.md` (DOCX Gen, Storage & Dedup)

## MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## File Ownership & Implementation Tasks:
1. `src/server/legal-workflows/index.ts`:
   - Update `evaluate(answers: Record<string, any>)` return type and value to include `recommendedClauses: string[]` matching `PROJECT.md` contract.
   - Recommended clauses:
     - Always include `STANDARD_DECLARATION`, `EXECUTORS`
     - If `hasMinorChildren === "Yes"`, include `GUARDIAN`
     - If `isNRI === "Yes"`, include `NRI_ASSETS`
     - If business assets or `hasBusinessInterests === "Yes"` or `assetsList` includes business assets, include `BUSINESS_SUCCESSION`
   - Clean up unused imports.
2. `src/server/legal-workflows/tests.ts`:
   - Replace fake `console.log` checkmarks in Tests 7–10 with REAL programmatic assertions using Node `assert` (throwing on failure).
   - Test 7: Verify draft template is rejected by DocumentGenerator query (throws "No approved template found").
   - Test 8: Verify approved template succeeds.
   - Test 9: Verify template version locking / tracking templateVersionId.
   - Test 10: Verify unauthorized access is blocked (session / ownership).
   - Make `tests.ts` executable via `npx tsx src/server/legal-workflows/tests.ts` and exit with 0 on pass, non-zero on failure.
3. `src/server/document-generator.ts`:
   - Query approved Template (`status: "LAWYER_APPROVED"` or `"LOCKED"`), and strictly ensure child `TemplateVersion.status` is `"LAWYER_APPROVED"` or `"LOCKED"`.
   - Query approved Clauses (`ClauseVersion` where `status: "LAWYER_APPROVED"` or `"LOCKED"`) from Prisma matching recommended clauses.
   - Comprehensive data extraction & merging:
     - Testator Personal Information: `fullName`, `dateOfBirth`, `nationality`, `address`, `city`, `state`, `country`, `maritalStatus`, `spouseName` (replace `{{fullName}}`, `{{address}}`).
     - Family: `childrenList` (names, DOBs, relationships).
     - Executors: `executorName`, `executorRelationship`, `executorAddress`, `executorPhone`, `alternateExecutorName`.
     - Guardians: `guardianName`, `guardianRelationship`, `guardianAddress`, `alternateGuardianName` (when `hasMinorChildren === "Yes"`).
     - Assets Schedule: structured tables for Immovable Property, Financial/Bank/Investments, Digital/Business, Personal Property from `assetsList`.
     - Beneficiary Allocations: structured table with `name`, `relationship`, `allocation` percentage from `beneficiariesList`.
     - NRI clause (when `isNRI === "Yes"`).
     - Attestation & Witness Execution block compliant with Indian Succession Act, 1925 (Testator signature line + 2 Attesting Witness signature lines with Name, Address, Occupation).
   - CRITICAL TEST COMPATIBILITY: Ensure `textContent` continues to include exact test match strings:
     - `'Aarav Sharma'`
     - `'GUARDIANSHIP:'` (when `hasMinorChildren === "Yes"`)
     - `'Sunita Sharma'`
     - `'FOREIGN ASSETS:'` (when `isNRI === "Yes"`)
     - `'United Arab Emirates'`
     - Ensure when `hasMinorChildren !== "Yes"`, `'GUARDIANSHIP:'` is NOT included.
   - Disk Persistence:
     - Ensure `storage/documents/` directory exists (`fs.mkdirSync(..., { recursive: true })`).
     - Write file to `storage/documents/${caseId}_${Date.now()}.docx`.
     - Compute SHA256 `fileHash`.
     - Create Prisma `Document` record with `filePath`, `fileSize`, `fileHash`, `docxUrl`, and comma-separated `clauseVersions` IDs.
     - Emit `DOCUMENT_GENERATED` audit log in UTC.
4. `src/app/api/document/download/route.ts`:
   - Enforce RBAC: Customer owner, assigned lawyer (`case.lawyerId === user.id || case.lawyerId === null || case.status === "IN_REVIEW"`), or Admin. Non-owners return 403 Forbidden.
   - Deduplication:
     - Check if existing `Document` record exists for `caseId` with status `["GENERATED", "APPROVED", "FINAL"]` and physical file exists on disk.
     - If fresh (`doc.createdAt >= latestAnswer.updatedAt`) and `!force`, stream cached file from disk in < 5ms without DB write.
     - Fallback to `DocumentGenerator.generate(caseId, user.id)` only if missing, stale, or forced.
5. `src/app/customer/document/page.tsx`:
   - Enhance UI with Aqua skeuomorphic styling (`.aqua-window`, `.aqua-card`, `.aqua-badge`).
   - Display document metadata: File size, generation date, SHA256 checksum preview, status badge.
   - Working "Download DOCX" button.

## Verification Requirements:
1. `node "node_modules/typescript/bin/tsc" --noEmit` must pass with 0 errors.
2. `node "node_modules/next/dist/bin/next" build` must compile all routes cleanly.
3. `node tests/runner.js` must pass 131/131 tests with 0 regressions.
4. `npx tsx src/server/legal-workflows/tests.ts` must pass with real automated assertions.
5. Write and run `.agents/worker_m4/verify_m4.js` testing:
   - Legal workflow rule evaluation & recommended clauses
   - Real assertions in tests.ts
   - DOCX generation with complete data merging, tables, and clauses
   - Physical file storage in `storage/documents/` with SHA256 hash and audit log
   - Deduplication on download (second call serves cached file, no duplicate DB rows)
   - Lawyer RBAC and customer IDOR rejection
6. Document in `changes.md` and `handoff.md`.
7. Send completion message to parent orchestrator.
