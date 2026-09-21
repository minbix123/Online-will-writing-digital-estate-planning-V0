# Task Assignment: Challenger 1 (Milestone 4)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\challenger_m4_1`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `59624314-f71e-456e-93f6-c2287d67bede`

## Mandate & Scope
You are Challenger 1 for Milestone 4: Deterministic Legal Workflow, Template/Clause System & DOCX Gen.
Your focus is EMPIRICAL ADVERSARIAL TESTING of:
1. DOCX binary integrity, OpenXML PK zip header (`0x50, 0x4B, 0x03, 0x04`), and parseability.
2. Complete data merging fidelity across all estate planning sections (heterogeneous assets, multi-item beneficiary lists, minor children, executor appointments, Devanagari Unicode, special characters).
3. Physical file persistence in `storage/documents/` and cryptographic SHA256 integrity match between file on disk and `Document.fileHash`.
4. Concurrent download deduplication stress: 30 concurrent download requests -> verify all serve cached file with identical SHA256, in <10ms, and create ZERO duplicate `Document` rows in the database.

## Your Task:
1. Write an independent empirical challenge script in `.agents/challenger_m4_1/challenge_docx.js` (or `.ts`).
2. Run your script against the real database (`prisma/dev.db`) and real routes/generators.
3. Record findings in `progress.md` and `handoff.md`.
4. State your explicit verdict in `handoff.md`: **APPROVE** or **REJECT**.
5. Send completion message to parent (`59624314-f71e-456e-93f6-c2287d67bede`).
