# Milestone 3 Technical Investigation: Questionnaire Engine, Debounce Architecture & Conditional Branching

**Explorer**: Explorer 2 (Milestone 3)  
**Date**: 2026-09-16  
**Scope**: Questionnaire Engine (`src/components/QuestionnaireEngine.tsx`), Declarative Schema (`src/lib/questionnaire.ts`), Persistence (`src/app/api/questionnaire/save/route.ts`), Hydration & Resume (`src/app/customer/questionnaire/page.tsx`), and Downstream Workflows (`src/server/legal-workflows/index.ts`).

---

## Executive Summary

1. **Autosave & Debounce Architecture**:
   - **Current State**: There is **no debounced autosave** implemented. Autosave is only triggered when the user clicks the "Next" button in `handleNext()`. Form keystrokes and option changes update React state in memory (`answers`) without scheduling any background save.
   - **Required State**: A 500ms debounced auto-save triggered on keystroke (`Input → local state → debounce 500ms → persistence`) with in-flight concurrency protection.

2. **Visual Status Indicators**:
   - **Current State**: Only the "Next" button text changes to `"Saving..."` while `isSaving === true`. There is **no "Saved"** or "Last saved at [timestamp]" indicator. A "Save failed" banner is conditionally shown if the network request fails.
   - **Required State**: A dedicated status indicator in the header/footer with Aqua styling displaying:
     - `Saving...` (in-flight network request)
     - `Saved` / `All changes saved at HH:MM:SS` (after successful save)
     - `Save failed` / `Offline - retrying...` (on error)

3. **Conditional Branching & The Missing `hasMinorChildren` Bug**:
   - **Critical Bug Discovered**: In `src/lib/questionnaire.ts`, the `children` (Family) section defines only `hasChildren` and `childrenList`. The question **`hasMinorChildren` is completely missing** from the schema.
   - **Consequence**: The `guardian` section specifies conditions `hasChildren === "Yes"` AND `hasMinorChildren === "Yes"`. Because `hasMinorChildren` is never asked, `guardian` is **permanently hidden and unreachable**. Furthermore, `LegalWorkflowEngine` and `DocumentGenerator` rely on `hasMinorChildren === "Yes"` to trigger `GUARDIAN_REQUIRED` and generate guardianship clauses. Adding `hasMinorChildren` to `children` section is a mandatory fix.

4. **Progress Percentage Calculation**:
   - **Current State**: Naively calculated as `Math.round(((currentSectionIndex + 1) / activeSections.length) * 100)`. It tracks only the section index the user is viewing, not question completion. Even with 0 questions answered, viewing Section 1 displays `11% Completed`, and Section 9 displays `100% Completed`.
   - **Required State**: Must compute the ratio of answered required fields to total active required fields across all active sections (matching `tests/helpers/test_utils.js`).

5. **State Hydration & Session Resume**:
   - **Current State**: `src/app/customer/questionnaire/page.tsx` mounts `<QuestionnaireEngine caseId={caseId} />` without passing existing persisted answers. `QuestionnaireEngine` initializes `answers` to `{}`. Consequently, page refresh or clicking "Continue Questionnaire" from the dashboard wipes local form state, resetting user inputs.
   - **Required State**: Load persisted `QuestionnaireAnswer` records on page mount and hydrate `QuestionnaireEngine` with `initialAnswers`.

6. **Security Vulnerability in Save API**:
   - `src/app/api/questionnaire/save/route.ts` does not authenticate the session or verify case ownership (`case.customerId === session.user.id`). Any user can overwrite questionnaire answers for any `caseId` (IDOR).

---

## 1. Deep Dive: `src/components/QuestionnaireEngine.tsx`

### 1.1 State Management

`QuestionnaireEngine.tsx` currently manages four state variables:

```typescript
const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
const [answers, setAnswers] = useState<Record<string, any>>({});
const [isSaving, setIsSaving] = useState(false);
const [saveError, setSaveError] = useState<string | null>(null);
```

#### Observations:
- **`currentSectionIndex`**: Integer representing the index within `activeSections` (derived via `useMemo` from `questionnaireConfig.sections` filtered by `checkConditions`).
- **`answers`**: Plain object dictionary mapping question keys to input values. Initialized as `{}`.
- **Deficiencies in State**:
  1. **No Initial State Hydration**: There is no prop or fetch hook to receive existing saved answers. If a user previously saved answers and refreshes the browser, `answers` resets to `{}`.
  2. **No `lastSavedAt` Timestamp**: No timestamp state tracking when answers were successfully saved to the server.
  3. **No Granular Save Status**: Only a binary `isSaving` boolean exists. No state enum such as `"idle" | "saving" | "saved" | "error"`.
  4. **No Form Validation State**: No state for field errors (`errors: Record<string, string>`).

### 1.2 Autosave Triggering & Debounce Architecture

#### Current Behavior:
```typescript
const handleChange = (questionId: string, value: any) => {
  setAnswers((prev) => ({ ...prev, [questionId]: value }));
};
```
- `handleChange` only updates local React state (`setAnswers`).
- Network persistence occurs **only** inside `handleNext`:
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
      ...
  ```
- **Debouncing**: **NONE**. No `setTimeout`, `useRef`, or debounced callback exists.
- **Debounce Delay**: Not implemented (0ms).
- **Concurrency Control**: Only guards against concurrent `handleNext` calls via `if (isSaving) return`. There is no request cancellation (AbortController) or debounced queue.

#### Required Debounce Design:
To fulfill PROJECT.md (Feature 13) and R5:
1. Debounce delay: **500ms** after user typing stops.
2. Structure:
   ```
   User input → Update local React state (`answers`) → Trigger 500ms debounced callback → POST `/api/questionnaire/save` → Update `saveStatus` ("saved") & `lastSavedAt`.
   ```
3. Use `useRef<NodeJS.Timeout | null>` or `useCallback` with debounce to ensure unmounted components or rapid typing do not fire duplicate/out-of-order POST requests.
4. Concurrency protection: Maintain an active save flag or track sequence IDs.

### 1.3 Visual Status Indicators

| Indicator State | Current Code Location | Visual Appearance | Gap / Defect |
|-----------------|----------------------|-------------------|--------------|
| **`Saving...`** | Line 280 (button label) | Button text: `"Saving..."` | Only visible on the Next button while clicking Next. Not visible during form typing. |
| **`Saved`** | None | **Missing entirely** | No indicator exists to reassure users their inputs are safely stored. |
| **`Save failed`** | Line 165-169 | Amber banner: `Warning: Progress could not be saved to server.` | Appears only after Next button click failure. |

#### Required Aqua UI Status Indicator:
Add a top-right status badge in the questionnaire header:
- **Saving**: Spinner or pulsing Aqua blue gel badge: `Saving changes...`
- **Saved**: Green check / soft Aqua glow: `All changes saved at [time]`
- **Save Failed**: Amber/Red alert badge with "Retry" button: `Save failed. Click to retry.`

### 1.4 Section Navigation

#### How Navigation Works:
1. Sections are defined in `questionnaireConfig.sections`.
2. Active sections are computed dynamically:
   ```typescript
   const activeSections: Section[] = useMemo(() => {
     const rawSections = questionnaireConfig.sections as unknown as Section[];
     return rawSections.filter((sec) => checkConditions(sec.conditions, answers));
   }, [answers]);
   ```
3. Boundary clamping prevents out-of-bounds index errors if conditional sections disappear:
   ```typescript
   useEffect(() => {
     if (currentSectionIndex >= activeSections.length && activeSections.length > 0) {
       setCurrentSectionIndex(activeSections.length - 1);
     }
   }, [activeSections.length, currentSectionIndex]);
   ```
4. Step Navigation:
   - **Back**: Decrements `currentSectionIndex` by 1. Disabled at index 0.
   - **Next**: Calls `handleNext()`, saves data, and if `currentSectionIndex < activeSections.length - 1`, increments index by 1.
   - **Last Section**: If on the final section, button text shows `"Review Answers"`, but clicking it executes `router.push('/customer/checkout?caseId=${caseId}')`.
   - **Direct Navigation**: No step bar, section pill list, or jumping between sections is supported.

### 1.5 Completion Progress Percentage Calculation

#### Current Formula:
```typescript
{Math.round(((currentSectionIndex + 1) / activeSections.length) * 100)}% Completed
```
- **Flaws**:
  - Based solely on current section index.
  - Section 1 of 9 shows `11%` before the user types anything.
  - Final section shows `100%` before any inputs on that section are completed.
  - Does not measure whether required fields are populated.
- **Specification Formula** (from `tests/helpers/test_utils.js` `calculateProgress`):
  - Count all active required questions: `totalQuestions`.
  - Count how many active required questions have non-empty answers: `answeredQuestions`.
  - Return: `totalQuestions === 0 ? 100 : Math.round((answeredQuestions / totalQuestions) * 100)`.

---

## 2. Deep Dive: `src/lib/questionnaire.ts`

### 2.1 Defined Sections and Questions

The configuration defines 9 sections:

| # | Section ID | Title | Condition | Questions Defined |
|---|------------|-------|-----------|-------------------|
| 1 | `personal_info` | About You | None | `fullName`, `dateOfBirth`, `nationality`, `address`, `city`, `state`, `country`, `email`, `phone`, `maritalStatus`, `spouseName` (cond: `maritalStatus === 'Married'`) |
| 2 | `children` | Children | None | `hasChildren`, `childrenList` (repeater; cond: `hasChildren === 'Yes'`) |
| 3 | `guardian` | Guardian Nomination | `hasChildren === 'Yes'` AND `hasMinorChildren === 'Yes'` | `guardianName`, `guardianRelationship`, `guardianAddress`, `alternateGuardianName` |
| 4 | `assets` | Assets & Properties | None | `assetsList` (repeater: `type`, `description`, `value`, `ownershipPercentage`) |
| 5 | `nri` | NRI / Foreign Assets | None | `isNRI`, `countryOfResidence` (cond: `isNRI === 'Yes'`), `foreignAssetCountries` (cond: `isNRI === 'Yes'`) |
| 6 | `beneficiaries` | Beneficiaries | None | `beneficiariesList` (repeater: `name`, `relationship`, `allocation`) |
| 7 | `executor` | Executor | None | `executorName`, `executorRelationship`, `executorAddress`, `executorPhone`, `alternateExecutorName` |
| 8 | `existing_will` | Existing Will | None | `hasExistingWill` (`No`, `Yes`, `Not sure`) |
| 9 | `special_circumstances` | Special Circumstances | None | `specialNotes` (textarea, optional) |

### 2.2 The Family Section & The Missing `hasMinorChildren` Bug

#### Exact Code in `src/lib/questionnaire.ts` (lines 42-78):
```typescript
{
  id: "children",
  title: "Children",
  description: "Information about your children.",
  questions: [
    {
      id: "hasChildren",
      type: "yes_no",
      label: "Do you have children?",
      required: true
    },
    {
      id: "childrenList",
      type: "repeater",
      label: "Add Child",
      required: true,
      conditions: [
        { field: "hasChildren", operator: "equals", value: "Yes" }
      ],
      fields: [
        { id: "name", type: "text", label: "Name", required: true },
        { id: "dateOfBirth", type: "date", label: "Date of Birth", required: true },
        {
          id: "relationship",
          type: "single_select",
          label: "Relationship",
          required: true,
          options: [
            { label: "Biological", value: "Biological" },
            { label: "Adopted", value: "Adopted" },
            { label: "Other", value: "Other" }
          ]
        }
      ]
    }
  ]
}
```

#### Exact Code in Section 3 (`guardian`) (lines 80-95):
```typescript
{
  id: "guardian",
  title: "Guardian Nomination",
  description: "Appoint a guardian for your minor children.",
  conditions: [
    { field: "hasChildren", operator: "equals", value: "Yes" },
    { field: "hasMinorChildren", operator: "equals", value: "Yes" }
  ],
  questions: [
    { id: "guardianName", type: "text", label: "Proposed Guardian Name", required: true },
    { id: "guardianRelationship", type: "text", label: "Relationship to Child", required: true },
    { id: "guardianAddress", type: "textarea", label: "Guardian Address", required: true },
    { id: "alternateGuardianName", type: "text", label: "Alternate Guardian Name (Optional)", required: false }
  ]
}
```

#### Root Cause Analysis:
- `hasMinorChildren` is **never asked** in the `children` section or anywhere else in the questionnaire!
- As a consequence:
  - `answers.hasMinorChildren` is always undefined.
  - `checkConditions` for `guardian` checks `{ field: "hasMinorChildren", operator: "equals", value: "Yes" }`, which evaluates to `false`.
  - The Guardian section is permanently stripped from `activeSections`.
  - In `src/server/legal-workflows/index.ts`:
    ```typescript
    if (answers.hasMinorChildren === "Yes") {
      flags.add("GUARDIAN_REQUIRED");
    }
    ```
    This legal rule is never triggered via the user questionnaire.
  - In `src/server/document-generator.ts`:
    ```typescript
    if (answersMap["hasMinorChildren"] === "Yes") {
      content += `\n\n<p>GUARDIANSHIP: I appoint ${answersMap["guardianName"] || 'the named guardian'} to be the guardian of my minor children.</p>`;
    }
    ```
    The guardianship clause is never rendered in the generated DOCX.

#### Required Fix in `src/lib/questionnaire.ts`:
Add `hasMinorChildren` to the `children` section with conditional display when `hasChildren === "Yes"`:
```typescript
{
  id: "hasMinorChildren",
  type: "yes_no",
  label: "Do any of your children require a legal guardian (under 18 years of age)?",
  required: true,
  conditions: [
    { field: "hasChildren", operator: "equals", value: "Yes" }
  ]
}
```
And add contact info (`guardianContact` / phone) to `guardian` questions for completeness.

### 2.3 Conditional Logic for NRI, Foreign Assets, Business Assets, and Existing Will

1. **NRI Status & Foreign Assets**:
   - `isNRI` is a `yes_no` question: `"Do you currently live outside India or own assets outside India?"`
   - If `isNRI === "Yes"`, two conditional questions are displayed:
     - `countryOfResidence` (text, required)
     - `foreignAssetCountries` (text, required)
   - Evaluated in `LegalWorkflowEngine`: sets flags `NRI`, `FOREIGN_ASSETS`, `LEGAL_REVIEW_REQUIRED`.
   - Evaluated in `DocumentGenerator`: injects FOREIGN ASSETS clause into DOCX.

2. **Business Assets**:
   - Represented as an option inside `assetsList` repeater under `type`:
     `{ label: "Business Interests", value: "BusinessInterests" }`.
   - There are currently no sub-conditional questions (e.g. company name, percentage ownership, partnership deed).
   - Evaluated in `LegalWorkflowEngine`:
     ```typescript
     if (answers.assetsList && Array.isArray(answers.assetsList)) {
       for (const asset of answers.assetsList) {
         if (asset.type === "BusinessInterests") {
           flags.add("BUSINESS_INTEREST");
           flags.add("LEGAL_REVIEW_REQUIRED");
         }
       }
     }
     ```
     Triggers `BUSINESS_INTEREST` and requires lawyer review.

3. **Existing Will**:
   - Handled in `existing_will` section:
     `hasExistingWill` with options: `No`, `Yes`, `Not sure`.
   - Evaluated in `LegalWorkflowEngine`:
     ```typescript
     if (answers.hasExistingWill === "Yes" || answers.hasExistingWill === "Not sure") {
       flags.add("EXISTING_WILL");
       flags.add("LEGAL_REVIEW_REQUIRED");
     }
     ```
     Triggers `EXISTING_WILL` and lawyer review.

### 2.4 Supported Question Types and Validation Rules

#### Supported Input Types in Component:
- `text` -> `<input type="text" />`
- `textarea` -> `<textarea />`
- `single_select` -> `<select>` populated with `q.options`
- `yes_no` -> `<select>` with hardcoded "Yes" / "No"
- `date` -> `<input type="date" />`
- `number` -> `<input type="number" />`
- `email` -> `<input type="email" />`
- `phone` -> `<input type="phone" />` (note: HTML standard is `type="tel"`)
- `repeater` -> Array of structured sub-objects with "+ Add" and "Remove" controls

#### Validation Rules Assessment:
- **Client-side Validation**: **COMPLETELY ABSENT** in `QuestionnaireEngine.tsx`.
  - Questions are flagged `required: true`, and red asterisks are displayed.
  - However, `handleNext` contains **no validation checks**. A user can click through the entire questionnaire leaving every single field blank and proceed to checkout!
  - Repeater items do not validate whether child fields are filled.
  - No email format check (e.g., regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`).
  - No phone number validation (e.g., Indian phone regex `^(\+91[\s-]?)?[6789]\d{9}$`).
  - No percentage validation on `ownershipPercentage` (0-100%).

---

## 3. Deep Dive: Persistence, API & Resume Flow

### 3.1 Persistence in `/api/questionnaire/save/route.ts`

```typescript
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  try {
    const body = await req.json();
    const { caseId, sectionId, data } = body;
    ...
    const existing = await prisma.questionnaireAnswer.findFirst({
      where: { caseId, questionId: sectionId }
    });
    if (existing) {
      await prisma.questionnaireAnswer.update({
        where: { id: existing.id },
        data: { answerData: JSON.stringify(data) }
      });
    } else {
      await prisma.questionnaireAnswer.create({
        data: {
          caseId,
          questionnaireVersion: "v1.0",
          questionId: sectionId,
          answerData: JSON.stringify(data)
        }
      });
    }
```

#### Defects Found:
1. **Critical Security / IDOR**:
   - Comment states: `// For MVP, we can allow anonymous users to start a case, or require auth.`
   - Does NOT verify if `session` exists.
   - Does NOT verify `case.customerId === session.user.id`.
   - Anyone can modify answers of any case ID.
2. **Data Structure Mismatch**:
   - `data` passed is the entire `answers` object (`data: answers`).
   - It is saved with `questionId: sectionId`.
   - Each section save writes a snapshot of all answers under that section's key.
   - Downstream readers (`checkout/route.ts` and `document-generator.ts`) iterate through all answers and `Object.assign(answersMap, JSON.parse(ans.answerData))`. This works because all objects are merged, but is redundant.
3. **Prisma Upsert**:
   - Uses `findFirst` followed by `update` or `create`, rather than `prisma.questionnaireAnswer.upsert({ where: { caseId_questionId: { caseId, questionId: sectionId } } })`.

### 3.2 State Hydration & Resume on Refresh

In `src/app/customer/questionnaire/page.tsx`:
```typescript
  // Verify ownership
  const caseData = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseData || caseData.customerId !== (session.user as any).id) {
    redirect("/customer/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <QuestionnaireEngine caseId={caseId} />
    </div>
  );
```

#### Defect:
- `caseData` is fetched without `include: { answers: true }`.
- `QuestionnaireEngine` receives only `caseId={caseId}`.
- Neither the server page nor the client component retrieves existing answers on load.
- On browser refresh or resuming from dashboard, all previously saved answers are blank in the form.

---

## 4. Implementation Recommendations for Implementer

### Recommendation 1: Fix `src/lib/questionnaire.ts`
1. Add `hasMinorChildren` question to `children` section:
   ```typescript
   {
     id: "hasMinorChildren",
     type: "yes_no",
     label: "Do you have any minor children (under the age of 18)?",
     required: true,
     conditions: [
       { field: "hasChildren", operator: "equals", value: "Yes" }
     ]
   }
   ```
2. Update `guardian` section conditions to rely on `hasMinorChildren === "Yes"` and ensure guardian contact field is present.

### Recommendation 2: Implement 500ms Debounced Autosave in `QuestionnaireEngine.tsx`
1. Add state:
   ```typescript
   const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
   const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
   const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
   ```
2. Debounced save function:
   ```typescript
   const debouncedSave = useCallback((currentAnswers: Record<string, any>, sectionId: string) => {
     if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
     setSaveStatus("saving");
     saveTimeoutRef.current = setTimeout(async () => {
       try {
         const res = await fetch("/api/questionnaire/save", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ caseId, sectionId, data: currentAnswers })
         });
         if (res.ok) {
           setSaveStatus("saved");
           setLastSavedAt(new Date());
           setSaveError(null);
         } else {
           setSaveStatus("error");
           setSaveError("Auto-save failed. Check connection.");
         }
       } catch (err) {
         setSaveStatus("error");
         setSaveError("Network error during auto-save.");
       }
     }, 500);
   }, [caseId]);
   ```
3. Trigger `debouncedSave(newAnswers, currentSection.id)` on every `handleChange`.
4. Render an Aqua status indicator pill showing:
   - "Saving..." (pulsing Aqua dot)
   - "Saved" / "Saved at HH:MM:SS" (green check / pill)
   - "Save failed" (red/amber retry badge)

### Recommendation 3: Hydrate Persisted Answers on Page Load
In `src/app/customer/questionnaire/page.tsx`:
1. Query `prisma.case.findUnique({ where: { id: caseId }, include: { answers: true } })`.
2. Reconstruct answer map:
   ```typescript
   const initialAnswers: Record<string, any> = {};
   for (const ans of caseData.answers) {
     try { Object.assign(initialAnswers, JSON.parse(ans.answerData)); } catch(e) {}
   }
   ```
3. Pass `initialAnswers={initialAnswers}` to `<QuestionnaireEngine caseId={caseId} initialAnswers={initialAnswers} />`.
4. In `QuestionnaireEngine`: initialize `const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers || {})`.

### Recommendation 4: Accurate Progress Percentage
Compute progress using the specification algorithm:
```typescript
const progress = useMemo(() => {
  let total = 0;
  let filled = 0;
  for (const sec of activeSections) {
    for (const q of sec.questions || []) {
      if (!checkConditions(q.conditions, answers)) continue;
      if (q.required) {
        total++;
        const val = answers[q.id];
        if (val !== undefined && val !== null && val !== "") {
          if (Array.isArray(val) ? val.length > 0 : true) filled++;
        }
      }
    }
  }
  return total === 0 ? 0 : Math.round((filled / total) * 100);
}, [activeSections, answers]);
```

### Recommendation 5: Client-Side Validation on "Next"
Add section-level validation in `handleNext`:
- Verify all active required questions in `currentSection` have non-empty values.
- If email: validate with email regex.
- If phone: validate with Indian phone regex.
- If invalid: set field error state and prevent navigation until corrected.

### Recommendation 6: Security Guard on `/api/questionnaire/save`
Enforce server-side authorization:
```typescript
const session = await getServerSession(authOptions);
if (!session || !session.user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const userCase = await prisma.case.findUnique({ where: { id: caseId } });
if (!userCase || userCase.customerId !== (session.user as any).id) {
  return NextResponse.json({ error: "Forbidden: Not case owner" }, { status: 403 });
}
```
Use `prisma.questionnaireAnswer.upsert` with compound key `caseId_questionId`.
