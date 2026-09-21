# Handoff Report: Reviewer 2 (Milestone 3)

**Agent**: Reviewer 2 (`reviewer_m3_2`)  
**Roles**: Reviewer, Adversarial Critic  
**Parent Conversation ID**: `59624314-f71e-456e-93f6-c2287d67bede`  
**Working Directory**: `E:\Online will-writing & digital estate planning V0\.agents\reviewer_m3_2`  
**Milestone**: Milestone 3 — Customer Portal, Case Lifecycle & Debounced Questionnaire Engine  
**Date**: 2026-09-17  
**Type**: Hard Handoff (Complete)  
**Verdict**: **APPROVE**  

---

## 1. Observation

### 1.1 Typecheck & Build Execution
- **Command**: `node "node_modules/typescript/bin/tsc" --noEmit`  
  **Exit Code**: `0`  
  **Stdout/Stderr**: Clean / no diagnostic errors.  
- **Command**: `node "node_modules/next/dist/bin/next" build`  
  **Exit Code**: `0`  
  **Result**: 18/18 routes compiled and prerendered successfully (Turbopack, Next.js 16.3.5). Static pages generated cleanly, including `/register`, `/api/auth/register`, `/api/cases`, `/api/questionnaire/save`, and `/customer/questionnaire`.

### 1.2 Automated Test Suite Execution
- **Command**: `node tests/runner.js`  
  **Exit Code**: `0`  
  **Output Summary**:
  ```
  ========================================================================
    TEST EXECUTION SUMMARY
  ========================================================================
    Total Tests  : 131
    Passed       : 131
    Failed       : 0
    Total Time   : 73771ms

      ALL TESTS PASSED
  ```

### 1.3 Milestone 3 Dedicated Verification Suite
- **Command**: `node .agents/worker_m3/verify_m3.js`  
  **Exit Code**: `0`  
  **Output Summary**:
  ```
  ========================================================================
  Starting Milestone 3 Verification Suite
  ========================================================================

  [TEST 1] Testing Customer Registration & Password Hashing...
    ✔ Registration validation, bcrypt hashing, audit logging, and duplicate check verified.

  [TEST 2] Testing Case Creation & Customer Isolation...
    ✔ Case creation in DRAFT, audit logging, and customer isolation verified.

  [TEST 3] Testing Questionnaire Save & IDOR Authorization Check...
    ✔ IDOR authorization check, atomic upsert, and duplicate prevention verified.

  [TEST 4] Testing Resume Hydration Across Multiple Sections...
    ✔ Server-side answer retrieval and full initialAnswers hydration verified.

  [TEST 5] Testing Conditional Branching & Legal Workflow Evaluation...
    ✔ Conditional unlocking of guardian section and GUARDIAN_REQUIRED legal flag verified.

  ========================================================================
  ALL MILESTONE 3 VERIFICATION TESTS PASSED SUCCESSFULLY!
  ========================================================================
  ```

### 1.4 Direct Code Inspection Findings

1. **`src/app/api/questionnaire/save/route.ts`**:
   - Lines 7–11: Enforces session requirement via `getServerSession(authOptions)` returning HTTP 401 Unauthorized for unauthenticated requests.
   - Lines 14–23: Body validation for `caseId` and `sectionId` returning HTTP 400 Bad Request.
   - Lines 26–32: Case existence check returning HTTP 404 Not Found.
   - Lines 34–40: Strict IDOR authorization check:
     ```typescript
     const user = session.user as any;
     if (existingCase.customerId !== user.id && user.role !== "ADMIN") {
       return NextResponse.json(
         { error: "Forbidden: You do not own this case" },
         { status: 403 }
       );
     }
     ```
   - Lines 42–62: Atomic persistence using compound unique key `caseId_questionId` (`@@unique([caseId, questionId])` in `prisma/schema.prisma`):
     ```typescript
     const savedAnswer = await prisma.questionnaireAnswer.upsert({
       where: {
         caseId_questionId: {
           caseId,
           questionId: sectionId,
         },
       },
       update: {
         answerData: JSON.stringify(data ?? {}),
         questionnaireVersion: "v1.0",
         sectionId,
       },
       create: {
         caseId,
         questionId: sectionId,
         sectionId,
         questionnaireVersion: "v1.0",
         answerData: JSON.stringify(data ?? {}),
       },
     });
     ```
   - Zero hardcoded mock returns; real database transaction with Prisma.

2. **`src/app/customer/questionnaire/page.tsx`**:
   - Lines 8–20: Awaits Next.js 16 async `searchParams` Promise properly:
     ```typescript
     const resolvedParams = await searchParams;
     ```
   - Lines 28–52: Auto-creates initial case in `DRAFT` status if no `caseId` parameter provided, emitting `CASE_CREATED` audit log.
   - Lines 54–62: Server-side case ownership validation: queries `prisma.case.findUnique({ where: { id: caseId }, include: { answers: true } })` and redirects unauthorized customers (`caseData.customerId !== userId`) to `/customer/dashboard`.
   - Lines 64–77: Hydrates `initialAnswers` dictionary by parsing stored JSON records with safe error-handling:
     ```typescript
     const initialAnswers: Record<string, any> = {};
     if (caseData.answers && Array.isArray(caseData.answers)) {
       for (const ans of caseData.answers) {
         try {
           const parsed = JSON.parse(ans.answerData);
           if (parsed && typeof parsed === "object") {
             Object.assign(initialAnswers, parsed);
           }
         } catch (e) {
           console.error("Failed to parse stored answer data:", e);
         }
       }
     }
     ```
   - Line 81: Passes `initialAnswers` to `<QuestionnaireEngine caseId={caseId} initialAnswers={initialAnswers} />`.

3. **`src/components/QuestionnaireEngine.tsx`**:
   - Lines 51–68: Initializes state from `initialAnswers` prop and tracks answers with `answers` state and `pendingDataRef`.
   - Lines 62, 187–206: Debounced autosave with a 500ms `useRef` timer:
     ```typescript
     const handleChange = (questionId: string, value: any) => {
       const updated = { ...answers, [questionId]: value };
       setAnswers(updated);
       pendingDataRef.current = updated;
       setSaveStatus("saving");
       if (debounceTimerRef.current) {
         clearTimeout(debounceTimerRef.current);
       }
       const currentSecId = currentSection?.id;
       if (currentSecId) {
         debounceTimerRef.current = setTimeout(() => {
           saveSectionData(currentSecId, pendingDataRef.current);
         }, 500);
       }
     };
     ```
   - Lines 209–220: Guaranteed zero data loss on navigation via `flushPendingSave(sectionId)`:
     ```typescript
     const flushPendingSave = async (sectionId: string) => {
       if (debounceTimerRef.current) {
         clearTimeout(debounceTimerRef.current);
         debounceTimerRef.current = null;
       }
       setIsFlushing(true);
       try {
         await saveSectionData(sectionId, pendingDataRef.current);
       } finally {
         setIsFlushing(false);
       }
     };
     ```
     Invoked before changing step in `handleNext`, `handleBack`, and horizontal section pill tab buttons.
   - Lines 278–303: Visual status indicators:
     - `Saving...` (pulsing blue badge with ping animation)
     - `All changes saved at HH:MM:SS` (emerald green badge with timestamp)
     - `Save failed - retrying...` (red badge with inline `Retry Save` trigger)
     - `Autosave Active` / `Saved at HH:MM:SS` (idle state)
   - Lines 114–144: Accurate progress percentage calculation mirroring test runner `TestUtils.calculateProgress`: counts answered required fields against active required fields in active sections.
   - Lines 104–108: Dynamic section index boundary clamping when active section count changes due to conditional questions.

4. **`src/lib/questionnaire.ts`**:
   - Lines 53–65: Added `hasMinorChildren` question in `children` section with `required: true` and condition `hasChildren === "Yes"`:
     ```typescript
     {
       id: "hasMinorChildren",
       type: "yes_no",
       label: "Do you have any minor children (under 18 years of age)?",
       required: true,
       conditions: [
         {
           field: "hasChildren",
           operator: "equals",
           value: "Yes"
         }
       ]
     }
     ```
   - Lines 93–108: Unlocks `guardian` section when `hasChildren === "Yes"` AND `hasMinorChildren === "Yes"`.
   - In `src/server/legal-workflows/index.ts` (lines 19–22), `hasMinorChildren === "Yes"` evaluates to `flags.add("GUARDIAN_REQUIRED")`.

5. **`src/app/api/auth/register/route.ts` & `src/app/api/cases/route.ts`**:
   - `register`: Email normalized via `.toLowerCase().trim()`, 409 Conflict on existing email, password length >= 6 validated, bcrypt hashed (`bcrypt.hash(password, 10)`), role defaulted to `CUSTOMER`, `USER_REGISTERED` audit log created, sanitized 201 response.
   - `cases`: Customer isolation strictly enforced on GET (`customerId: session.user.id`), DRAFT case created on POST with `CASE_CREATED` audit log.

---

## 2. Logic Chain

1. **Type Safety & Build Cleanliness**:
   Direct observation of `tsc --noEmit` (exit 0) and `next build` (exit 0) proves that all component typings, async `searchParams` contracts in Next.js 16, and client/server boundaries (`"use client"`) are fully compliant.
2. **Zero Regressions on Core Test Suite**:
   Direct execution of `node tests/runner.js` passed all 131 tests across all 4 tiers (Unit, Boundaries, Pairwise Combinations, and Real-World Scenarios). This confirms no existing functionality broke during Milestone 3.
3. **Autosave Debouncing & Data Integrity**:
   Inspection of `QuestionnaireEngine.tsx` proves keystrokes are batched in-memory with a 500ms timeout rather than flooding the database. Crucially, the presence of `flushPendingSave` on navigation ensures zero unsaved edits are lost when advancing through sections.
4. **IDOR & Server-Side Security**:
   Inspection of `src/app/api/questionnaire/save/route.ts` and `src/app/customer/questionnaire/page.tsx` proves that unauthorized case access is blocked server-side (HTTP 403 / redirect to dashboard). Cross-customer manipulation is prevented regardless of client-side tampering.
5. **Resume & Hydration Verification**:
   Inspection of `page.tsx` and execution of `verify_m3.js` Test 4 confirms that reloading the questionnaire retrieves all persisted section records, parses the stored JSON, and passes a reconstructed `initialAnswers` dictionary to `QuestionnaireEngine`, preserving state across page reloads.
6. **Conditional Branching & Legal Workflow Trigger**:
   Inspection of `src/lib/questionnaire.ts` and `verify_m3.js` Test 5 confirms that the `hasMinorChildren` question activates the `guardian` section in the UI and deterministically produces the `GUARDIAN_REQUIRED` flag in `LegalWorkflowEngine`.

---

## 3. Adversarial Review & Critic Analysis

### 3.1 Integrity Violation Check
- **Hardcoded test results or facade logic**: NONE. All database operations use real Prisma queries; password checks use genuine bcryptjs comparisons; audit logs are genuinely written to SQLite.
- **Shortcuts or bypassed requirements**: NONE. Real debouncing with `useRef`, real Next.js 16 async searchParams resolution, real server-side RBAC and IDOR guards.
- **Fabricated verification outputs**: NONE. Commands were executed directly in terminal and logged verbatim with matching exit codes.
- **Integrity Assessment**: **NO INTEGRITY VIOLATION DETECTED.**

### 3.2 Failure Mode & Edge Case Stress-Testing

| Attack Scenario | Predicted / Observed Behavior | Assessment |
|---|---|---|
| **Rapid typing and concurrent saves** | Debounce timer is reset on every keystroke (`clearTimeout`). Only the final keystroke triggers a network request after 500ms of inactivity. | **ROBUST** |
| **Immediate navigation during debounce delay** | User types and clicks "Next" or section tab before 500ms expires. `flushPendingSave` clears the pending timer and executes an immediate awaitable save before navigating. | **ROBUST** |
| **Network failure on save** | Save endpoint failure caught; UI transitions badge to red "Save failed - retrying..." and provides manual "Retry Save" button. | **ROBUST** |
| **IDOR cross-user payload injection** | Authenticated User A POSTs answers with `caseId` belonging to User B. API verifies `existingCase.customerId !== user.id` and immediately aborts with HTTP 403 Forbidden. | **ROBUST** |
| **Unauthenticated save request** | POST to `/api/questionnaire/save` with missing/expired session returns HTTP 401 Unauthorized before any DB lookup. | **ROBUST** |
| **Section deactivation out-of-bounds index** | User enters `hasChildren="Yes"`, navigates to section 3 (`guardian`), and retroactively selects `hasChildren="No"`. Clamping hook in `QuestionnaireEngine.tsx` clamps `currentSectionIndex` to `activeSections.length - 1`. | **ROBUST** |
| **Corrupted JSON in persisted answers** | `JSON.parse` wrapped in try/catch block in `src/app/customer/questionnaire/page.tsx`, preventing unhandled 500 exceptions on malformed database entries. | **ROBUST** |

---

## 4. Caveats

1. **Review Step Route**: Completing the final section in `QuestionnaireEngine.tsx` redirects directly to `/customer/checkout?caseId=${caseId}`. An explicit dedicated read-only summary/review page before checkout can be added in future milestones if desired.
2. **SQLite Multi-Process Write Locks**: When running heavy concurrent test suites across multiple node processes simultaneously, SQLite may experience write-lock timeouts (`P1008`). Sequential execution of test suites is standard and expected for SQLite in MVP development.

---

## 5. Conclusion

The Milestone 3 implementation satisfies all requirements specified in `PROJECT.md`, `ORIGINAL_REQUEST.md`, and `DISPATCH.md`. The autosave debouncing architecture, hydration engine, IDOR security guards, customer registration, case creation, and conditional legal branching are genuinely implemented with high quality, rigorous verification, and zero regressions.

**Final Verdict**: **APPROVE**

---

## 6. Verification Method

To independently reproduce and verify this review:

1. **TypeScript Typecheck**:
   ```powershell
   node "node_modules/typescript/bin/tsc" --noEmit
   ```
   *Expected*: Exit code 0, 0 errors.

2. **Next.js Production Build**:
   ```powershell
   node "node_modules/next/dist/bin/next" build
   ```
   *Expected*: Exit code 0, all 18 routes compiled and generated.

3. **Core Test Runner**:
   ```powershell
   node tests/runner.js
   ```
   *Expected*: Exit code 0, 131/131 tests passed.

4. **Dedicated Milestone 3 Verification Suite**:
   ```powershell
   node .agents/worker_m3/verify_m3.js
   ```
   *Expected*: Exit code 0, 5/5 tests passed (Customer Registration, Case Creation & Isolation, Questionnaire Save & IDOR Prevention, Resume Hydration, Conditional Branching & Legal Workflow).
