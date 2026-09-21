# Task Assignment: Reviewer 2 (Milestone 4)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\reviewer_m4_2`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `59624314-f71e-456e-93f6-c2287d67bede`

## Mandate & Scope
You are Reviewer 2 for Milestone 4: Deterministic Legal Workflow, Template/Clause System & DOCX Gen.
Your focus is DOCX Document Assembly, Comprehensive Data Merging, Disk Storage Persistence, Deduplication Caching, and Aqua UI.

## Required Reading:
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md`
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md`
3. `E:\Online will-writing & digital estate planning V0\.agents\worker_m4\changes.md`
4. `E:\Online will-writing & digital estate planning V0\.agents\worker_m4\handoff.md`

## What to Inspect:
1. `src/server/document-generator.ts`:
   - Comprehensive data merging across testator details, children list, executors & alternates, testamentary guardian, assets schedule table, beneficiary allocations table, NRI clause, and Indian Succession Act 1925 dual-witness attestation block.
   - Preserves exact test substrings ('Aarav Sharma', 'GUARDIANSHIP:', 'Sunita Sharma', 'FOREIGN ASSETS:', 'United Arab Emirates', PK header).
   - Writes file to `storage/documents/{caseId}_{timestamp}.docx`.
   - Computes SHA256 checksum, populates `filePath`, `fileSize`, `fileHash` on `Document`.
   - Emits `DOCUMENT_GENERATED` audit log in UTC.
2. `src/app/api/document/download/route.ts`:
   - Fast disk cache deduplication (<5ms, serves cached file, 0 duplicate DB rows).
   - Strict lawyer assignment RBAC.
3. `src/app/customer/document/page.tsx`:
   - Aqua skeuomorphic design, metadata display (size, date, checksum), download trigger.

## Verification Commands:
1. `node "node_modules/typescript/bin/tsc" --noEmit`
2. `node "node_modules/next/dist/bin/next" build`
3. `node tests/runner.js`
4. `npx tsx .agents/worker_m4/verify_m4.js`

## Deliverables:
- Write `progress.md` and `handoff.md` in your directory.
- In `handoff.md`, provide an explicit verdict: **APPROVE** or **REQUEST_CHANGES**.
- Send completion message to parent (`59624314-f71e-456e-93f6-c2287d67bede`).

## 2026-09-17T07:39:19Z
<USER_REQUEST>
You are Reviewer 2 for Milestone 4: Deterministic Legal Workflow, Template/Clause System & DOCX Gen.
Working directory: E:\Online will-writing & digital estate planning V0\.agents\reviewer_m4_2
Project root: E:\Online will-writing & digital estate planning V0
Parent conversation ID: 59624314-f71e-456e-93f6-c2287d67bede

Read:
1. E:\Online will-writing & digital estate planning V0\.agents\reviewer_m4_2\DISPATCH.md
2. E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md
3. E:\Online will-writing & digital estate planning V0\PROJECT.md
4. E:\Online will-writing & digital estate planning V0\.agents\worker_m4\changes.md
5. E:\Online will-writing & digital estate planning V0\.agents\worker_m4\handoff.md

Inspect:
- src/server/document-generator.ts (rich data merging, tables, exact test strings 'Aarav Sharma', 'GUARDIANSHIP:', 'Sunita Sharma', 'FOREIGN ASSETS:', 'United Arab Emirates', disk write in storage/documents/, SHA256 hash, Document record metadata, DOCUMENT_GENERATED audit log)
- src/app/api/document/download/route.ts (dedup disk caching, lawyer RBAC)
- src/app/customer/document/page.tsx (Aqua UI, document metadata)

Run verification commands:
- node "node_modules/typescript/bin/tsc" --noEmit
- node "node_modules/next/dist/bin/next" build
- node tests/runner.js
- npx tsx .agents/worker_m4/verify_m4.js

Write progress.md and handoff.md in your directory.
Explicitly state your verdict: APPROVE or REQUEST_CHANGES.
Send completion message to parent.
</USER_REQUEST>
