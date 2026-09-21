# Milestone 3 Adversarial Challenge Report: Customer Portal, Case Lifecycle & Debounced Questionnaire Engine

**Agent**: Challenger 1 (`challenger_m3_1`)  
**Parent Conversation ID**: `59624314-f71e-456e-93f6-c2287d67bede`  
**Working Directory**: `E:\Online will-writing & digital estate planning V0\.agents\challenger_m3_1`  
**Date**: 2026-09-17  
**Type**: Hard Handoff (Complete)  
**Verdict**: **APPROVE**

---

## 1. Observation

1. **Independent Empirical Adversarial Stress Test Script (`challenge_autosave.js`)**:
   - Command: `node .agents/challenger_m3_1/challenge_autosave.js`
   - Exit Code: `0`
   - Verbatim Output:
     ```
     ================================================================================
     CHALLENGER 1 (MILESTONE 3) — EMPIRICAL ADVERSARIAL AUTOSAVE STRESS TEST
     ================================================================================

     ▶ SUITE 1: 500ms Debounce Behavior & Rapid Typing Coalescing
         ✔ [PASS] Zero saves fired during continuous rapid typing burst — saveCount: 0, expected: 0
         ✔ [PASS] Debounce holds and does not fire at T=300ms (< 500ms threshold) — saveCount: 0, expected: 0
         ✔ [PASS] Exactly ONE save call fired after 500ms period of inactivity — saveCount: 1, expected: 1
         ✔ [PASS] Coalesced payload contains complete final typed string without truncation — fullName length: 65, expected: 65
         ✔ [PASS] Timer reset by secondary burst — no premature save at intermediate pause — saveCount: 0, expected: 0
         ✔ [PASS] Exactly ONE save call fired after burst 2 settles — saveCount: 1, expected: 1
         ✔ [PASS] Final value reflects full merged text ('Bengaluru') — city: Bengaluru
         ✔ [PASS] Immediate flush executes save instantly without waiting 500ms — saveCount: 1, expected: 1
         ✔ [PASS] Flushed payload contains the latest un-debounced keystrokes — fullName: Aarav Sharma
         ✔ [PASS] No redundant trailing save fires from cleared debounce timer — saveCount: 1, expected: 1
         ✔ [PASS] Rapid multi-field typing produces exactly one consolidated save — saveCount: 1, expected: 1
         ✔ [PASS] Consolidated payload preserves all 5 distinct fields without collision or loss — Fields captured: fullName, email, phone, maritalStatus, hasChildren

     ▶ SUITE 2: Concurrent Atomic Upsert Stress Test (Compound Key caseId_questionId)
         ✔ [PASS] Cold-start 30-way concurrent upsert generates ZERO P2002 unique collision errors — P2002 count: 0, expected: 0
         ✔ [PASS] Zero unexpected unhandled exceptions across all 30 concurrent promises — Other errors: 0
         ✔ [PASS] Database contains EXACTLY ONE row for compound key (zero duplicate rows) — Rows found: 1, expected: 1
         ✔ [PASS] Persisted row contains valid JSON data from one of the concurrent revisions — Final iteration stored: 2
         ✔ [PASS] Warm update 30-way concurrent upsert generates ZERO P2002 errors — P2002 count: 0, expected: 0
         ✔ [PASS] Warm update maintains exactly 1 row (zero duplicate explosion under write contention) — Rows found: 1, expected: 1
         ✔ [PASS] Cross-section 50-way bombardment generates ZERO P2002 errors across distinct sections — P2002 errors: 0
         ✔ [PASS] Exactly 5 distinct rows created in database corresponding to the 5 distinct sections — Distinct rows found: 5, expected: 5
         ✔ [PASS] Every section accurately stored with correct questionId without cross-talk — Found: assets, beneficiaries, children, executors, personal_info
         ✔ [PASS] 100% of concurrent unauthorized IDOR save requests are rejected with 403 Forbidden — Forbidden count: 15/15
         ✔ [PASS] Legitimate owner's data remains 100% untainted and uncorrupted — Answer data: {"section":"personal_info","batchIndex":8,"updated":17896296...

     ▶ SUITE 3: State Survival & Hydration Fidelity
         ✔ [PASS] Simulated page reload loads all saved section records — Loaded answers count: 6, expected: 6
         ✔ [PASS] Devanagari Unicode string survives serialization and hydration without corruption — hydrated fullName: श्री आरव शर्मा (Aarav Sharma)
         ✔ [PASS] Special characters (quotes, slashes, pluses) in address survive intact — addressLine1: Flat 1204, 'Palm Grove' Residency, 14th Cross / 2nd Main
         ✔ [PASS] Children repeater array length and element order preserved perfectly — Children count: 2
         ✔ [PASS] Assets repeater array with heterogeneous items and floating point valuations preserved — Asset items count: 4
         ✔ [PASS] Beneficiaries allocation percentages preserved with numeric precision — Total share sum: 100%
         ✔ [PASS] Conditional fields (hasChildren=Yes, hasMinorChildren=Yes) hydrated correctly — hasChildren: Yes, hasMinorChildren: Yes
         ✔ [PASS] Guardian section answers hydrated cleanly — guardianName: Sunita Sharma

     ▶ SUITE 4: Autosave State Machine Resilience
         ✔ [PASS] Initial state machine state is 'idle'
         ✔ [PASS] Keystroke transitions state from 'idle' to 'saving'
         ✔ [PASS] Successful save transitions state from 'saving' to 'saved'
         ✔ [PASS] Network/server failure transitions state from 'saving' to 'error' — State: error, Error: Network timeout: 504 Gateway Timeout
         ✔ [PASS] Retry save transitions state from 'error' back to 'saving' and clears previous error
         ✔ [PASS] Successful retry transitions state to 'saved'
         ✔ [PASS] Direct illegal transition from 'idle' to 'saved' is strictly rejected
         ✔ [PASS] Direct illegal transition from 'error' to 'saved' without re-saving is rejected
         ✔ [PASS] System does not report premature 'saved' when new edits were queued during in-flight save
         ✔ [PASS] Final state cleanly resolves to 'saved' only after all queued edits are committed

     --- Cleaning up test artifacts ---
     Cleanup complete.

     ================================================================================
     CHALLENGER 1 STRESS TEST EXECUTION SUMMARY
     ================================================================================
     Total Assertions : 41
     Passed           : 41
     Failed           : 0
       • SUITE 1: Debounce Timing & Coalescing: 12/12 passed
       • SUITE 2: Atomic Upsert Concurrency: 11/11 passed
       • SUITE 3: State Survival & Hydration: 8/8 passed
       • SUITE 4: Autosave State Machine: 10/10 passed

     >>> ALL ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY! <<<
     ```

2. **Milestone 3 Worker Verification Suite (`verify_m3.js`)**:
   - Command: `node .agents/worker_m3/verify_m3.js`
   - Exit Code: `0`
   - Results: 5/5 tests passed (Registration & Password Hashing, Case Creation & Isolation, Questionnaire Save & IDOR Prevention, Resume Hydration, Conditional Branching & Legal Workflow).

3. **Core Test Runner Regression Verification (`tests/runner.js`)**:
   - Command: `node tests/runner.js`
   - Exit Code: `0`
   - Results: 131/131 tests passed across all 4 tiers with 0 failures.

4. **TypeScript Typecheck Command & Result**:
   - Command: `node "node_modules/typescript/bin/tsc" --noEmit`
   - Exit Code: `0`
   - Output: Clean (zero errors).

5. **Code Inspection**:
   - `src/components/QuestionnaireEngine.tsx` (lines 61-77, 186-220):
     - Uses `useRef` for `debounceTimerRef` and `pendingDataRef`.
     - `handleChange` sets state immediately to `"saving"`, clears existing timer, and schedules `saveSectionData` at 500ms delay.
     - `flushPendingSave` clears any pending timer and calls `saveSectionData` immediately upon navigation (lines 209-220).
   - `src/app/api/questionnaire/save/route.ts` (lines 34-63):
     - IDOR ownership guard: `if (existingCase.customerId !== user.id && user.role !== "ADMIN") return 403`.
     - Atomic upsert targeting compound unique constraint `@@unique([caseId, questionId])`:
       ```typescript
       await prisma.questionnaireAnswer.upsert({
         where: { caseId_questionId: { caseId, questionId: sectionId } },
         update: { answerData: JSON.stringify(data ?? {}), questionnaireVersion: "v1.0", sectionId },
         create: { caseId, questionId: sectionId, sectionId, questionnaireVersion: "v1.0", answerData: JSON.stringify(data ?? {}) },
       });
       ```
   - `src/app/customer/questionnaire/page.tsx` (lines 54-77):
     - Server component loads case with `include: { answers: true }` and deserializes all section JSON into `initialAnswers`.

---

## 2. Logic Chain

1. **Debounce Timing & Rapid Keystroke Coalescing (Observation 1, Suite 1 & Observation 5)**:
   - *Observation*: During 50 rapid keystrokes spaced 15ms apart, `saveCount` was 0; 300ms after typing stopped, `saveCount` remained 0; at 600ms after typing stopped, `saveCount` transitioned to exactly 1, and the payload contained the full 65-character string.
   - *Observation*: When typing was interrupted by navigation, `flushPendingSave` executed immediately at T=50ms, saved the un-debounced text, and prevented any secondary orphan timer execution at T=600ms.
   - *Inference*: The 500ms debounce implementation in `QuestionnaireEngine.tsx` correctly absorbs high-frequency input streams without generating network noise and guarantees zero character truncation upon step navigation.

2. **Concurrent Atomic Upsert Stress & IDOR Prevention (Observation 1, Suite 2 & Observation 5)**:
   - *Observation*: 30 concurrent cold-start upserts and 30 concurrent warm-update upserts targeting the same `(caseId, questionId)` completed with exactly 0 `P2002` errors, 0 unhandled exceptions, and exactly 1 database row.
   - *Observation*: 50 concurrent requests across 5 distinct sections generated exactly 5 rows with 0 duplicate collisions or section cross-talk.
   - *Observation*: 15 concurrent unauthorized IDOR requests were 100% rejected with HTTP 403 Forbidden without altering or corrupting the legitimate owner's questionnaire data.
   - *Inference*: The compound unique constraint `caseId_questionId` combined with Prisma's atomic `upsert` and the server-side ownership guard provides robust relational concurrency and strict tenant isolation.

3. **State Survival & Hydration Fidelity (Observation 1, Suite 3 & Observation 5)**:
   - *Observation*: Realistic Indian estate planning data containing Devanagari Hindi Unicode ("श्री आरव शर्मा"), complex address strings with special characters (`/`, `'`), multi-item repeater arrays (children, heterogeneous assets, beneficiaries), and conditional flags (`hasChildren="Yes"`, `hasMinorChildren="Yes"`) was persisted into the database.
   - *Observation*: When loaded via simulated page reload (`findUnique` with `include: { answers: true }`), all 6 sections reconstructed with 100% field, array order, and type parity.
   - *Inference*: Page reloads and multi-session resume workflows preserve complete questionnaire state without data loss or corruption.

4. **Autosave State Machine Resilience (Observation 1, Suite 4)**:
   - *Observation*: The state machine strictly models `idle -> saving -> saved`, transitions to `error` on simulated 504 gateway timeouts, recovers to `saved` upon user retry, rejects illegal direct transitions (`idle -> saved` and `error -> saved`), and properly suppresses false `saved` indicators when edits are queued during in-flight saves.
   - *Inference*: The visual UI indicators (`Saving...`, `All changes saved at HH:MM:SS`, `Save failed - retrying...`) accurately reflect backend persistence reality.

5. **Regression-Free Workspace Integrity (Observations 2, 3, 4)**:
   - *Observation*: 131/131 existing test runner tests passed, 5/5 worker verification tests passed, and TypeScript typecheck emitted 0 errors.
   - *Inference*: Milestone 3 changes are clean, self-contained, and introduce zero regressions.

---

## 3. Caveats

- **Network Failure Simulation**: Network dropouts and 504 timeouts were simulated via client-side state machine testing rather than OS-level packet drops; however, the client error boundary and retry mechanism handle HTTP non-200 responses deterministically.
- **No other caveats**: All four mandate requirements were tested empirically against the live SQLite database (`prisma/dev.db`) and real source files.

---

## 4. Conclusion

Milestone 3 (Customer Portal, Case Lifecycle & Debounced Questionnaire Engine) has successfully endured all empirical adversarial stress tests:
- 500ms debounce coalesces rapid keystrokes without lost characters or redundant saves.
- Atomic compound upsert on `QuestionnaireAnswer(caseId, questionId)` withstands high write contention with **zero P2002 errors** and **zero duplicate rows**.
- State survival and resume hydration preserve 100% fidelity across complex Indian estate planning data structures and Hindi Unicode.
- Autosave state transitions are resilient under normal, error, and concurrent typing conditions.
- Server-side IDOR ownership checks strictly enforce customer isolation under concurrent assault.

**Final Verdict**: **APPROVE**

---

## 5. Verification Method

To independently execute and verify this adversarial challenge:

1. **Execute Challenger Stress Test Suite**:
   ```powershell
   node .agents/challenger_m3_1/challenge_autosave.js
   ```
   *Expected Output*: 41/41 assertions pass across all 4 suites with exit code 0:
   - Suite 1: Debounce Timing & Coalescing (12/12 passed)
   - Suite 2: Atomic Upsert Concurrency (11/11 passed)
   - Suite 3: State Survival & Hydration (8/8 passed)
   - Suite 4: Autosave State Machine (10/10 passed)

2. **Execute Worker Verification Suite**:
   ```powershell
   node .agents/worker_m3/verify_m3.js
   ```
   *Expected Output*: 5/5 tests pass with exit code 0.

3. **Execute Core Test Runner**:
   ```powershell
   node tests/runner.js
   ```
   *Expected Output*: Total Tests: 131, Passed: 131, Failed: 0.

4. **Execute TypeScript Typecheck**:
   ```powershell
   node "node_modules/typescript/bin/tsc" --noEmit
   ```
   *Expected Output*: Exit code 0, no errors reported.
