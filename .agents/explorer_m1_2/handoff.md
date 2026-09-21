# Handoff Report: QuestionnaireEngine Import, Render-Time State Setters & Lifecycle

- **Role**: Explorer 2 (Milestone 1)
- **Target File**: `src/components/QuestionnaireEngine.tsx`
- **Working Directory**: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m1_2`
- **Parent Conversation ID**: `b9ae32ea-bf02-4e25-912d-0a32091419d9`
- **Type**: Hard (Task Complete)

---

## 1. Observation

Direct observations from tool executions and codebase inspection:

### Observation 1.1: Broken Dependency Import (TS2307)
- **File**: `src/components/QuestionnaireEngine.tsx:4-5`
- **Code**:
  ```tsx
  4: import { useForm, FormProvider } from "react-form"; // Wait, we installed react-hook-form
  5: import { useFormContext } from "react-hook-form";
  ```
- **Command**: `node ./node_modules/typescript/bin/tsc --noEmit`
- **Result**:
  ```
  src/components/QuestionnaireEngine.tsx(4,39): error TS2307: Cannot find module 'react-form' or its corresponding type declarations.
  ```
- **Package Manifest**: `package.json` line 24 includes `"react-hook-form": "^7.88.0"`. `react-form` does not exist in `dependencies` or `devDependencies`.
- **Usage Audit**: A full search of `src/components/QuestionnaireEngine.tsx` confirms neither `useForm`, `FormProvider`, nor `useFormContext` is invoked anywhere in the file.

### Observation 1.2: Render-Time State Mutation and Side Effect
- **File**: `src/components/QuestionnaireEngine.tsx:55-63`
- **Code**:
  ```tsx
  55:   if (!checkConditions(currentSection.conditions)) {
  56:     // Skip section if conditions not met
  57:     if (currentSectionIndex < questionnaireConfig.sections.length - 1) {
  58:       setCurrentSectionIndex(currentSectionIndex + 1);
  59:     } else {
  60:       window.location.href = `/customer/checkout?caseId=${caseId}`;
  61:     }
  62:     return null;
  63:   }
  ```
- **Context**: This block is placed directly within the component render body (outside of any event handler or `useEffect`).
- **Section Configuration**: `src/lib/questionnaire.ts:79-88` specifies conditions on section `guardian`:
  ```ts
  conditions: [
    { field: "hasChildren", operator: "equals", value: "Yes" },
    { field: "hasMinorChildren", operator: "equals", value: "Yes" }
  ]
  ```

### Observation 1.3: Untyped Question Union Errors (TS2339)
- **File**: `src/components/QuestionnaireEngine.tsx:72, 81, 139`
- **Code**:
  ```tsx
  72:   if (!checkConditions(q.conditions)) return null;
  ...
  81:   {q.fields?.map((f: any) => (
  ...
  139:  q.options?.map((opt: any) => (
  ```
- **Command**: `node ./node_modules/typescript/bin/tsc --noEmit`
- **Result**:
  ```
  src/components/QuestionnaireEngine.tsx(72,34): error TS2339: Property 'conditions' does not exist on type ...
  src/components/QuestionnaireEngine.tsx(81,24): error TS2339: Property 'fields' does not exist on type ...
  src/components/QuestionnaireEngine.tsx(139,23): error TS2339: Property 'options' does not exist on type ...
  ```

### Observation 1.4: Direct `window.location.href` and Uncontrolled Inputs
- **File**: `src/components/QuestionnaireEngine.tsx:40, 60, 87, 124, 130, 148`
- **Code**:
  ```tsx
  40:   window.location.href = `/customer/checkout?caseId=${caseId}`;
  ```
  And inputs with `value={answers[q.id] || ""}` without nullish coalescing or type guards.

---

## 2. Logic Chain

1. **Premise 1 (TS2307 Cause)**: From Observation 1.1, `react-form` is not an installed npm package, and neither it nor `react-hook-form` is used in the component body. State is managed via `useState`.
   - **Inference**: Removing line 4 (`import { useForm, FormProvider } from "react-form"`) and line 5 (`import { useFormContext } from "react-hook-form"`) eliminates error TS2307 with zero loss of functionality.

2. **Premise 2 (React 19 State Mutation Rule)**: React 19 strictly requires render functions to be pure without side-effects. Calling `setCurrentSectionIndex` during render body (Observation 1.2) triggers React warnings (`Cannot update a component while rendering a different component`) or fatal infinite render loop traps.
   - **Inference**: State setting must only occur inside event handlers (`handleNext`, `handleBack`) or within lifecycle hooks (`useEffect`).

3. **Premise 3 (The Back Navigation Trap)**:
   - When a user on Section 3 clicks "Back", `currentSectionIndex` is set to 2.
   - Section 2's conditions evaluate to `false` (e.g. `hasChildren === "No"`).
   - The render body executes lines 55-63 and immediately calls `setCurrentSectionIndex(currentSectionIndex + 1)` (back to Section 3).
   - **Inference**: Attempting to skip conditional sections during the render phase traps the user from ever navigating backwards past an ineligible section.
   - **Solution**: Derive active sections dynamically:
     ```tsx
     const activeSections = useMemo(() => {
       const rawSections = questionnaireConfig.sections as unknown as Section[];
       return rawSections.filter((sec) => checkConditions(sec.conditions, answers));
     }, [answers]);
     ```
     By keeping `currentSectionIndex` as an index into `activeSections`, the component never renders an ineligible section, lines 55-63 are removed entirely, and both Forward and Backward navigation navigate only through eligible sections.

4. **Premise 4 (TypeScript TS2339 Resolution)**: In Observation 1.3, `q` lacks explicit type annotations.
   - **Inference**: Defining explicit interfaces `QuestionCondition`, `QuestionField`, `QuestionOption`, `Question`, and `Section` ensures strict type safety and resolves all three TS2339 compiler errors.

5. **Premise 5 (Next.js 16 Navigation & React 19 Controlled Inputs)**:
   - In Next.js 16 App Router, client-side transitions must use `useRouter().push(...)` instead of `window.location.href` to avoid full browser reload and preserve auth session/state.
   - Using `value={answers[q.id] ?? ""}` avoids React 19 uncontrolled-to-controlled input warnings.
   - Adding `isSaving` state prevents concurrent double-clicks and duplicate API requests to `/api/questionnaire/save`.

---

## 3. Caveats

- **Scope Boundary**: This investigation focuses strictly on `src/components/QuestionnaireEngine.tsx`. Other files with separate TypeScript errors (e.g., `src/app/api/document/download/route.ts`, `src/lib/auth.ts`, `src/server/document-generator.ts`) are assigned to other implementers/milestones and were not modified.
- **Autosave Debouncing (Milestone 3)**: Autosave currently triggers on clicking "Next" (saving the section answers). Continuous debounced autosave (500ms keystroke debounce) and answer resume from DB are scheduled for Milestone 3 (Features 13 and 15). The proposed implementation provides clean foundations (`isSaving`, `saveError`, controlled inputs) that directly facilitate Milestone 3.
- **`hasMinorChildren` Question (Milestone 3)**: In `src/lib/questionnaire.ts`, the `guardian` section requires `{ field: "hasMinorChildren", operator: "equals", value: "Yes" }`, but the `children` section currently only defines `hasChildren`. Adding `hasMinorChildren` to `src/lib/questionnaire.ts` is scheduled for Milestone 3 (Feature 14). With the `activeSections` logic, `guardian` is cleanly omitted until that field is present and satisfied.

---

## 4. Conclusion

`src/components/QuestionnaireEngine.tsx` requires replacement with a clean, type-safe implementation that:
1. Deletes unused and missing imports (`react-form`, `react-hook-form`).
2. Eliminates render-time state updates (`setCurrentSectionIndex(currentSectionIndex + 1)`) and render-time `window.location.href`.
3. Implements `activeSections = useMemo(...)` for smooth forward and backward navigation across conditional sections.
4. Uses Next.js 16 `useRouter().push(...)` for checkout redirection.
5. Introduces complete TypeScript interfaces resolving all TS2339 errors.
6. Handles controlled inputs with `value ?? ""` and prevents concurrent save requests with `isSaving`.

The full proposed drop-in code is documented in Section 3 of `analysis.md`.

---

## 5. Verification Method

### Independent Verification Steps:
1. **TypeScript Typecheck**:
   Execute:
   ```bash
   powershell -Command "node '.\node_modules\typescript\bin\tsc' --noEmit"
   ```
   **Expected Result**: Zero errors reported for `src/components/QuestionnaireEngine.tsx`.
   - `TS2307` (`Cannot find module 'react-form'`) is gone.
   - `TS2339` (`Property 'conditions' does not exist...`) is gone.
   - `TS2339` (`Property 'fields' does not exist...`) is gone.
   - `TS2339` (`Property 'options' does not exist...`) is gone.

2. **React 19 Pure Render Verification**:
   - Run development server: `npm run dev`
   - Open `/customer/questionnaire?caseId=<caseId>`
   - Verify browser console does not emit:
     `Warning: Cannot update a component while rendering a different component`
     or `Too many re-renders`.

3. **Conditional Navigation Verification**:
   - In Section 1 (`About You`), fill fields and click Next.
   - In Section 2 (`Children`), select `Do you have children? -> No`. Click Next.
   - Observe that Section 3 (`Guardian Nomination`) is omitted, and the user lands on `Assets & Properties`.
   - On `Assets & Properties`, click "Back".
   - **Verification Condition**: The user returns to Section 2 (`Children`), proving the Back Navigation Trap is eliminated.

4. **Invalidation Conditions**:
   - If calling `tsc --noEmit` still reports any error in `src/components/QuestionnaireEngine.tsx`.
   - If clicking "Back" from a section following a skipped conditional section bounces the user forward.
   - If React logs any render-phase setState warning in the browser console.
