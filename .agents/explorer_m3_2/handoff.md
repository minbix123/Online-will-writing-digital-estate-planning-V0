# Handoff Report: Questionnaire Engine, Debounce Architecture & Conditional Branching (Milestone 3)

**Agent**: Explorer 2 (`explorer_m3_2`)  
**Parent Conversation ID**: `d256a4dc-c8f6-40c8-9b50-7a9197d3e05e`  
**Working Directory**: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m3_2`  
**Date**: 2026-09-16  
**Type**: Hard Handoff (Investigation Complete)

---

## 1. Observation

### 1.1 State Management & Autosave in `src/components/QuestionnaireEngine.tsx`
- **Lines 46-50**:
  ```typescript
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  ```
  `answers` is initialized to `{}` with no `initialAnswers` prop or hydration effect from API or database.
- **Lines 83-85**:
  ```typescript
  const handleChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };
  ```
  Keystrokes only update local React state. No network call or debounce timer is initiated on change.
- **Lines 87-114**:
  Autosave is exclusively triggered when clicking the "Next" button in `handleNext`:
  ```typescript
  const handleNext = async () => {
    if (!currentSection || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/questionnaire/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          sectionId: currentSection.id,
          data: answers,
        }),
      });
  ```
  There is zero debouncing (0ms delay) anywhere in `QuestionnaireEngine.tsx`.
- **Status Indicators (Lines 165-169 & 280)**:
  - `Saving...`: Only appears on the Next button label (`{isSaving ? "Saving..." : isLastSection ? "Review Answers" : "Next"}`).
  - `Saved`: Absent. No "Saved" indicator or timestamp exists in the component.
  - `Save failed`: Renders an amber alert box `{saveError}` when `fetch` fails.
- **Progress Calculation (Lines 149-150 & 157)**:
  ```typescript
  {Math.round(((currentSectionIndex + 1) / activeSections.length) * 100)}% Completed
  ```
  Progress is computed as the fraction of the current section index over total active sections, ignoring whether questions are answered.

### 1.2 Declarative Schema in `src/lib/questionnaire.ts`
- **Lines 42-78 (`children` Section)**:
  Defines `hasChildren` and `childrenList` (repeater). The question `hasMinorChildren` is **missing**.
- **Lines 80-88 (`guardian` Section)**:
  ```typescript
  id: "guardian",
  title: "Guardian Nomination",
  description: "Appoint a guardian for your minor children.",
  conditions: [
    { field: "hasChildren", operator: "equals", value: "Yes" },
    { field: "hasMinorChildren", operator: "equals", value: "Yes" }
  ],
  ```
  Because `hasMinorChildren` is never asked, `answers["hasMinorChildren"]` is undefined. The `guardian` section is filtered out of `activeSections` in `QuestionnaireEngine.tsx` (lines 69-72) and is never rendered.
- **NRI Section (Lines 130-159)**:
  Defines `isNRI`, with conditional questions `countryOfResidence` and `foreignAssetCountries` showing when `isNRI === "Yes"`.
- **Business Assets (Lines 108-120)**:
  Option `BusinessInterests` inside `assetsList` repeater.
- **Existing Will (Lines 191-207)**:
  `hasExistingWill` with options `No`, `Yes`, `Not sure`.

### 1.3 Downstream Consumption
- **`src/server/legal-workflows/index.ts` (Lines 20-22)**:
  ```typescript
  if (answers.hasMinorChildren === "Yes") {
    flags.add("GUARDIAN_REQUIRED");
  }
  ```
- **`src/server/document-generator.ts` (Lines 51-53)**:
  ```typescript
  if (answersMap["hasMinorChildren"] === "Yes") {
    content += `\n\n<p>GUARDIANSHIP: I appoint ${answersMap["guardianName"] || 'the named guardian'} to be the guardian of my minor children.</p>`;
  }
  ```

### 1.4 Persistence & Authorization in `src/app/api/questionnaire/save/route.ts`
- **Lines 7-11**:
  ```typescript
  const session = await getServerSession(authOptions);
  // For MVP, we can allow anonymous users to start a case, or require auth.
  // We'll proceed assuming the user is either logged in, or we're running in demo mode.
  ```
  No session presence check or case ownership guard (`case.customerId === session.user.id`). Unauthenticated users or non-owners can overwrite questionnaire answers.

### 1.5 Hydration in `src/app/customer/questionnaire/page.tsx`
- **Lines 39-47**:
  `caseData` is fetched with `findUnique({ where: { id: caseId } })` without `include: { answers: true }`, and `<QuestionnaireEngine caseId={caseId} />` is rendered without `initialAnswers`.

---

## 2. Logic Chain

1. **Autosave Defect**:
   - *Observation*: `handleChange` only updates local React state; save network request only executes on Next button click in `handleNext()`.
   - *Inference*: Project requirements (R5, PROJECT.md feature 13, SCOPE.md task 3) require a 500ms debounced autosave architecture on user input. Without this, user data entered in a section is lost if the user navigates away or refreshes before clicking Next.

2. **Missing `hasMinorChildren` Defect**:
   - *Observation*: `src/lib/questionnaire.ts` lines 42-78 do not define `hasMinorChildren`, but lines 80-88 make `guardian` section conditional on `hasMinorChildren === "Yes"`.
   - *Observation*: Downstream `LegalWorkflowEngine` and `DocumentGenerator` specifically check `answers.hasMinorChildren === "Yes"`.
   - *Inference*: Because the user cannot answer `hasMinorChildren`, the guardian section cannot be reached in the UI, `GUARDIAN_REQUIRED` flag cannot be triggered from questionnaire inputs, and guardianship clauses cannot be included in generated documents.

3. **Loss of State on Refresh**:
   - *Observation*: `customer/questionnaire/page.tsx` does not fetch `case.answers` or pass initial answers to `QuestionnaireEngine`. `QuestionnaireEngine` starts with `answers = {}`.
   - *Inference*: Any page refresh or returning to the questionnaire from the customer dashboard wipes local state and displays empty inputs, violating R5 ("Saved answers must survive page refresh and later sessions").

4. **Progress Calculation Discrepancy**:
   - *Observation*: UI computes `((currentSectionIndex + 1) / activeSections.length) * 100`, whereas test runner (`tests/helpers/test_utils.js`) computes `(answeredQuestions / totalQuestions) * 100`.
   - *Inference*: The UI shows misleading 11% for 0 answered questions and 100% before filling the last section. It must align with the ratio of answered active required questions.

5. **Security Hole (IDOR)**:
   - *Observation*: `/api/questionnaire/save/route.ts` ignores session validation and case ownership.
   - *Inference*: Any caller with a valid `caseId` can overwrite any customer's legal questionnaire data, violating R13 and PROJECT.md Feature 16.

---

## 3. Caveats

1. **Test Suite Status**:
   `node tests/runner.js` passes 131/131 tests because unit/integration tests evaluate the backend utilities and mock payloads directly rather than mounting the React UI. The bugs identified exist in the React client engine and UI-layer integration.
2. **Review Step UI**:
   The "Next" button displays "Review Answers" on the final section, but routes straight to `/customer/checkout`. An actual read-only summary/review step before checkout is desirable for legal accuracy.
3. **Database Schema Constraints**:
   `QuestionnaireAnswer` has a unique constraint `@@unique([caseId, questionId])`. The save route currently uses `questionId: sectionId`. This is functional as long as all section answers are stored together per section.

---

## 4. Conclusion

The Questionnaire Engine requires the following concrete implementations during Milestone 3:
1. **Add `hasMinorChildren` Question**: In `src/lib/questionnaire.ts` inside the `children` section, conditional on `hasChildren === "Yes"`. This unlocks the `guardian` section and downstream workflow evaluation.
2. **Implement 500ms Debounce in `QuestionnaireEngine.tsx`**: Add `useRef` debounce timer (500ms) on `handleChange` targeting `/api/questionnaire/save`.
3. **Visual Status Indicators**: Add an Aqua-styled indicator badge displaying `Saving...`, `Saved at [time]`, and `Save failed`.
4. **Hydrate Answers on Mount**: In `src/app/customer/questionnaire/page.tsx`, fetch `case.answers` with `include: { answers: true }`, merge parsed JSON into `initialAnswers`, and pass to `QuestionnaireEngine`.
5. **Accurate Progress Calculation**: Replace section-index formula with the ratio of populated required fields in active sections.
6. **Enforce Ownership Guard**: In `src/app/api/questionnaire/save/route.ts`, enforce `session.user.id === case.customerId` with HTTP 401/403 responses.

---

## 5. Verification Method

1. **Automated Test Suite**:
   ```bash
   node tests/runner.js
   ```
   Ensure 131/131 tests continue passing.
2. **Inspect Files**:
   - `src/lib/questionnaire.ts`: Verify `hasMinorChildren` exists in `children` section.
   - `src/components/QuestionnaireEngine.tsx`: Check for `500ms` debounce timer, `saveStatus` states (`saving`, `saved`, `error`), and `initialAnswers` hydration.
   - `src/app/api/questionnaire/save/route.ts`: Check `session?.user?.id === case.customerId` check.
   - `src/app/customer/questionnaire/page.tsx`: Verify `caseData.answers` is queried and passed to `QuestionnaireEngine`.
3. **Manual Behavioral Verification**:
   - Start a will, answer Section 1, wait 500ms, confirm "Saved at [time]" indicator appears.
   - Refresh the page: confirm Section 1 answers remain populated.
   - Select `hasChildren = Yes`: confirm `hasMinorChildren` appears.
   - Select `hasMinorChildren = Yes`: confirm `Guardian Nomination` section becomes active in navigation.
