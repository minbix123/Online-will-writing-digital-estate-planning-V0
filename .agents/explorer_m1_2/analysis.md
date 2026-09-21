# Analysis: QuestionnaireEngine Import, Render-Time State Setters & React 19/Next.js 16 Lifecycle

- **Target File**: `src/components/QuestionnaireEngine.tsx`
- **Component**: `QuestionnaireEngine({ caseId }: { caseId: string })`
- **Milestone**: Milestone 1 (Baseline Fixes, Performance & Build Pipeline Health)
- **Investigator**: Explorer 2

---

## 1. Executive Summary

A comprehensive static and architectural audit of `src/components/QuestionnaireEngine.tsx` was performed. The component is responsible for rendering the customer's declarative multi-section will questionnaire. The audit identified four primary defects that prevent compilation, break runtime lifecycle in React 19 / Next.js 16, and trap users during navigation:

1. **Invalid / Phantom Dependency Import (TS2307)**:
   - Line 4 imports `{ useForm, FormProvider }` from `"react-form"`.
   - `react-form` is not installed in `package.json` (only `react-hook-form` is present), causing `tsc --noEmit` to fail with `TS2307: Cannot find module 'react-form' or its corresponding type declarations`.
   - Furthermore, `useForm`, `FormProvider`, and `useFormContext` (line 5) are never actually used in the component; form state is handled via native React `useState`.

2. **Render-Phase State Mutation & Navigation Side Effect (React 19 / Next.js 16 Anti-Pattern)**:
   - Lines 55-63 execute `setCurrentSectionIndex(currentSectionIndex + 1)` and `window.location.href = ...` directly in the component render body when section conditions are not met.
   - This violates React's strict purity contract, causing `Cannot update a component while rendering a different component` or infinite render loops.
   - In addition, it creates a **navigation trap**: if a user is on Section 4 and clicks "Back", the component navigates to Section 3; Section 3 detects unmet conditions during render and immediately forces `setCurrentSectionIndex` forward to Section 4 again. The user can never navigate backwards past a skipped section.

3. **TypeScript Union Property Errors (TS2339)**:
   - Untyped question mappings access `q.conditions`, `q.fields`, and `q.options`, generating TS2339 errors because TypeScript infers `questionnaireConfig.sections` as a union of heterogeneous object literals where some question types do not define those fields.

4. **React 19 Controlled Input & Navigation Discipline**:
   - `window.location.href` bypasses Next.js 16 App Router SPA navigation, causing full page reloads and state desynchronization.
   - `value={answers[q.id] || ""}` can lead to uncontrolled-to-controlled input warnings when values transition from undefined.

---

## 2. Detailed Findings

### Finding 1: Invalid Module Import & Form State Strategy
- **Location**: `src/components/QuestionnaireEngine.tsx:4-5`
- **Verbatim Code**:
  ```tsx
  import { useForm, FormProvider } from "react-form"; // Wait, we installed react-hook-form
  import { useFormContext } from "react-hook-form";
  ```
- **Observation**:
  - `package.json` contains:
    - `"react-hook-form": "^7.88.0"`
    - `"@hookform/resolvers": "^5.9.1"`
    - `"zod": "^4.6.5"`
  - `package.json` does **not** contain `react-form`.
  - The compiler outputs:
    ```
    src/components/QuestionnaireEngine.tsx(4,39): error TS2307: Cannot find module 'react-form' or its corresponding type declarations.
    ```
  - Inspection of lines 10-23 reveals that the component uses native React state:
    ```tsx
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [answers, setAnswers] = useState<any>({});
    const handleChange = (questionId: string, value: any) => {
      setAnswers({ ...answers, [questionId]: value });
    };
    ```
  - Neither `useForm`, `FormProvider`, nor `useFormContext` is referenced anywhere in the component body.
- **Resolution**:
  - Remove line 4 (`import { useForm, FormProvider } from "react-form"`) and line 5 (`import { useFormContext } from "react-hook-form"`).
  - Retain native React state management for Milestone 1. This cleanly resolves TS2307 while keeping form state simple and fast.

---

### Finding 2: Render-Time State Setter & Navigation Trap
- **Location**: `src/components/QuestionnaireEngine.tsx:55-63`
- **Verbatim Code**:
  ```tsx
  if (!checkConditions(currentSection.conditions)) {
    // Skip section if conditions not met
    if (currentSectionIndex < questionnaireConfig.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    } else {
      window.location.href = `/customer/checkout?caseId=${caseId}`;
    }
    return null;
  }
  ```
- **Observation**:
  - `checkConditions` checks section conditions against current answers (e.g. `hasChildren === "Yes"` and `hasMinorChildren === "Yes"` for the `guardian` section).
  - If conditions are not satisfied, lines 55-63 attempt to skip the section by calling `setCurrentSectionIndex(currentSectionIndex + 1)` **directly inside the render body**.
  - **Failure Mode 1 (React 19 Rule Violation)**: In React, render functions must remain pure. Calling state setters during render triggers re-render warnings (`Cannot update a component while rendering a different component`) or fatal infinite loop aborts (`Too many re-renders. React limits the number of renders to prevent an infinite loop`).
  - **Failure Mode 2 (Hard Navigation during Render)**: Executing `window.location.href = ...` during render phase triggers browser navigation during component mounting/rendering, breaking SSR and client hydration.
  - **Failure Mode 3 (The Back Navigation Trap)**:
    - Suppose Section 1 (`children`) has `hasChildren = "No"`.
    - Section 2 (`guardian`) has conditions requiring `hasChildren = "Yes"`.
    - User completes Section 1 and advances to Section 3 (`assets`).
    - On Section 3, user clicks "Back" (`setCurrentSectionIndex(currentSectionIndex - 1)`).
    - `currentSectionIndex` becomes 2 (`guardian`).
    - Section 2 renders. `checkConditions` evaluates to `false`.
    - Render body executes `setCurrentSectionIndex(currentSectionIndex + 1)`, instantly pushing index back to 3 (`assets`).
    - Result: The user is permanently unable to navigate backwards past Section 2!
- **Resolution**:
  - Never alter state or trigger navigation side-effects during render.
  - Derive `activeSections` dynamically using `useMemo`:
    ```tsx
    const activeSections = useMemo(() => {
      const allSections = questionnaireConfig.sections as unknown as Section[];
      return allSections.filter((sec) => checkConditions(sec.conditions, answers));
    }, [answers]);
    ```
  - Index `currentSectionIndex` directly points into `activeSections`.
  - When navigating "Next", increment index within `activeSections.length`.
  - When navigating "Back", decrement index within `activeSections.length`.
  - Because ineligible sections are never included in `activeSections`, the index never lands on an ineligible section.
  - Both forward and backward navigation operate seamlessly.
  - Clamp `currentSectionIndex` in a `useEffect` only if `activeSections` shrinks dynamically due to an answer change:
    ```tsx
    useEffect(() => {
      if (currentSectionIndex >= activeSections.length && activeSections.length > 0) {
        setCurrentSectionIndex(activeSections.length - 1);
      }
    }, [activeSections.length, currentSectionIndex]);
    ```

---

### Finding 3: TypeScript Type Checking Errors (TS2339)
- **Location**: `src/components/QuestionnaireEngine.tsx:72, 81, 139`
- **Compiler Output**:
  ```
  src/components/QuestionnaireEngine.tsx(72,34): error TS2339: Property 'conditions' does not exist on type ...
  src/components/QuestionnaireEngine.tsx(81,24): error TS2339: Property 'fields' does not exist on type ...
  src/components/QuestionnaireEngine.tsx(139,23): error TS2339: Property 'options' does not exist on type ...
  ```
- **Observation**:
  - `questionnaireConfig` in `src/lib/questionnaire.ts` is an untyped object literal.
  - In `QuestionnaireEngine.tsx`, `q` in `currentSection.questions.map((q) => ...)` is inferred as a union of specific object literals. Questions without `conditions`, `fields`, or `options` cause TypeScript to complain when those properties are accessed.
- **Resolution**:
  - Define explicit, clean TypeScript interfaces in `QuestionnaireEngine.tsx`:
    - `QuestionCondition`
    - `QuestionField`
    - `QuestionOption`
    - `Question`
    - `Section`
  - Cast `questionnaireConfig.sections as unknown as Section[]` and map `(q: Question)`.
  - This eliminates all TS2339 errors.

---

### Finding 4: React 19 & Next.js 16 Lifecycle & UX Polish
- **Location**: `src/components/QuestionnaireEngine.tsx:40, 84-95, 96-104, 107-112`
- **Observation**:
  - `window.location.href = ...` should be replaced with `useRouter()` from `next/navigation` (`router.push(...)`).
  - Inputs with `value={answers[q.id] || ""}` should use nullish coalescing `value={answers[q.id] ?? ""}` to prevent switching from uncontrolled to controlled.
  - Buttons in repeater rows (`Remove`, `+ Add`) must declare `type="button"` to avoid triggering unintended form submits.
  - Add `isSaving` state to prevent concurrent autosave POST requests when users click "Next" rapidly.
  - Add section progress bar (`Section X of Y (Z% Completed)`) to improve UI clarity and skeuomorphic polish.

---

## 3. Proposed Complete Code for `src/components/QuestionnaireEngine.tsx`

```tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { questionnaireConfig } from "@/lib/questionnaire";

// Typed definitions for questionnaire configuration
interface QuestionCondition {
  field: string;
  operator: "equals" | "not_equals" | string;
  value: any;
}

interface QuestionField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
}

interface QuestionOption {
  label: string;
  value: string;
}

interface Question {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: QuestionOption[];
  conditions?: QuestionCondition[];
  fields?: QuestionField[];
}

interface Section {
  id: string;
  title: string;
  description: string;
  conditions?: QuestionCondition[];
  questions: Question[];
}

export default function QuestionnaireEngine({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const checkConditions = (
    conditions?: QuestionCondition[],
    currentAnswers: Record<string, any> = answers
  ): boolean => {
    if (!conditions || conditions.length === 0) return true;
    for (const cond of conditions) {
      const val = currentAnswers[cond.field];
      if (cond.operator === "equals" && val !== cond.value) {
        return false;
      }
      if (cond.operator === "not_equals" && val === cond.value) {
        return false;
      }
    }
    return true;
  };

  // Derive active sections based on current answers; eliminates render-time skipping
  const activeSections: Section[] = useMemo(() => {
    const rawSections = questionnaireConfig.sections as unknown as Section[];
    return rawSections.filter((sec) => checkConditions(sec.conditions, answers));
  }, [answers]);

  // Safely clamp section index if answers change and activeSections count shrinks
  useEffect(() => {
    if (currentSectionIndex >= activeSections.length && activeSections.length > 0) {
      setCurrentSectionIndex(activeSections.length - 1);
    }
  }, [activeSections.length, currentSectionIndex]);

  const currentSection: Section | undefined = activeSections[currentSectionIndex] || activeSections[0];

  const handleChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = async () => {
    if (!currentSection) return;

    setIsSaving(true);
    setSaveError(null);

    // Autosave current section progress
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

      if (!res.ok) {
        console.error("Autosave response not ok:", res.status);
        setSaveError("Warning: Progress could not be saved to server.");
      }
    } catch (e) {
      console.error("Autosave failed:", e);
      setSaveError("Warning: Network error while saving progress.");
    } finally {
      setIsSaving(false);
    }

    if (currentSectionIndex < activeSections.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
    } else {
      // Completed all sections -> navigate to checkout via Next.js router
      router.push(`/customer/checkout?caseId=${caseId}`);
    }
  };

  const handleBack = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
    }
  };

  if (!currentSection) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-xl mt-10 text-center">
        <p className="text-gray-500">Loading questionnaire...</p>
      </div>
    );
  }

  const isLastSection = currentSectionIndex === activeSections.length - 1;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-xl mt-10">
      {/* Progress & Section Header */}
      <div className="mb-6 border-b pb-4">
        <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
          <span>
            Section {currentSectionIndex + 1} of {activeSections.length}
          </span>
          <span className="font-medium text-blue-600">
            {Math.round(((currentSectionIndex + 1) / activeSections.length) * 100)}% Completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentSectionIndex + 1) / activeSections.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-2">{currentSection.title}</h2>
      <p className="text-gray-600 mb-6">{currentSection.description}</p>

      {saveError && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-sm">
          {saveError}
        </div>
      )}

      <div className="space-y-6">
        {currentSection.questions.map((q: Question) => {
          if (!checkConditions(q.conditions)) return null;

          if (q.type === "repeater") {
            const list = answers[q.id] || [];
            return (
              <div key={q.id} className="border p-4 rounded-lg bg-gray-50">
                <label className="font-medium text-gray-800">{q.label}</label>
                {list.map((item: any, idx: number) => (
                  <div key={idx} className="mt-2 p-3 bg-white border rounded">
                    {q.fields?.map((f: QuestionField) => (
                      <div key={f.id} className="mt-2">
                        <label className="block text-sm text-gray-700">{f.label}</label>
                        <input
                          type={f.type === "number" ? "number" : "text"}
                          className="w-full border rounded p-2 mt-1"
                          value={item[f.id] ?? ""}
                          onChange={(e) => {
                            const newList = [...list];
                            newList[idx] = { ...newList[idx], [f.id]: e.target.value };
                            handleChange(q.id, newList);
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="mt-2 text-sm text-red-600 hover:text-red-800"
                      onClick={() => {
                        const newList = list.filter((_: any, i: number) => i !== idx);
                        handleChange(q.id, newList);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200"
                  onClick={() => handleChange(q.id, [...list, {}])}
                >
                  + Add {q.label.replace(/^Add\s+/i, "")}
                </button>
              </div>
            );
          }

          return (
            <div key={q.id}>
              <label className="block font-medium text-gray-800 mb-1">
                {q.label}
                {q.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {q.type === "textarea" ? (
                <textarea
                  className="w-full border rounded p-2"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                />
              ) : q.type === "single_select" || q.type === "yes_no" ? (
                <select
                  className="w-full border rounded p-2"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                >
                  <option value="">Select an option</option>
                  {q.type === "yes_no" ? (
                    <>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </>
                  ) : (
                    q.options?.map((opt: QuestionOption) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))
                  )}
                </select>
              ) : (
                <input
                  type={q.type}
                  className="w-full border rounded p-2"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          disabled={currentSectionIndex === 0 || isSaving}
          onClick={handleBack}
          className="px-6 py-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={handleNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : isLastSection ? "Review Answers" : "Next"}
        </button>
      </div>
    </div>
  );
}
```

---

## 4. Verification Method

To verify the proposed fix independently:
1. **Compilation & Typecheck**:
   Run:
   ```bash
   node ./node_modules/typescript/bin/tsc --noEmit
   ```
   Confirm that all 4 errors originating from `src/components/QuestionnaireEngine.tsx` (`TS2307` and `TS2339`) are completely resolved.
2. **Navigation Flow Verification**:
   - Navigate through Section 1 with `hasChildren: "No"`.
   - Click "Next". Confirm Section 2 (`guardian`) is omitted, and user arrives at Section 3 (`assets`).
   - Click "Back". Confirm user arrives back at Section 1 (`children`), verifying that the backward navigation trap is eliminated.
   - Complete all sections and click "Review Answers". Confirm `router.push("/customer/checkout?caseId=...")` executes smoothly without full page reload.
3. **Purity & Hydration Check**:
   - Inspect the browser console during rendering. Confirm zero warnings regarding `Cannot update a component while rendering a different component` or `uncontrolled input`.
