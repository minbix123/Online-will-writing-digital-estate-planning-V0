# Comprehensive Analysis: Customer Dashboard, Questionnaire Resume, Save API & IDOR Security

**Explorer**: Explorer 3 (Milestone 3 — Customer Portal, Case Lifecycle & Debounced Questionnaire Engine)  
**Date**: 2026-09-16  
**Project Root**: `E:\Online will-writing & digital estate planning V0`  
**Working Directory**: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m3_3`  

---

## Executive Summary

This investigation analyzed the customer portal lifecycle, questionnaire resumption, autosave persistence, and security controls across:
1. `src/app/customer/dashboard/page.tsx`
2. `src/app/customer/questionnaire/page.tsx`
3. `src/components/QuestionnaireEngine.tsx`
4. `src/app/api/questionnaire/save/route.ts`
5. `src/lib/questionnaire.ts`
6. `tests/runner.js` and the 131-test E2E suite (`tests/tier1_features/`, `tests/tier2_boundaries/`, `tests/tier3_combinations/`, `tests/tier4_scenarios/`).

### Core Discoveries:
1. **Critical Security Vulnerability (Broken Auth & IDOR)** in `/api/questionnaire/save`: The route obtains NextAuth session but never enforces it, and performs zero ownership verification. Any unauthenticated attacker or malicious customer can tamper with any other user's will answers.
2. **Missing Questionnaire State Hydration (Resume Broken)**: `src/app/customer/questionnaire/page.tsx` fetches `caseData` but omits `answers`, and `QuestionnaireEngine.tsx` accepts only `caseId` with initial `answers` state defaulted to `{}`. Refreshes and "Continue Questionnaire" clicks reset all questionnaire fields to empty.
3. **Missing Debounced Keystroke Autosave**: `QuestionnaireEngine.tsx` currently only persists answers when clicking "Next". In-progress typing in section inputs is never saved if the user navigates away or closes the tab.
4. **Missing Conditional Trigger Question**: `src/lib/questionnaire.ts` conditions the `guardian` section on `hasMinorChildren === "Yes"`, but the `children` section lacks the `hasMinorChildren` question entirely, making the guardian section unreachable in normal flow.
5. **Direct DB Query vs. API Route in Dashboard**: `src/app/customer/dashboard/page.tsx` queries Prisma directly, which is valid for Server Components, but `/api/cases` does not exist yet to support programmatic case creation from client actions. Clicking "+ Start New Will" relies on a GET redirect side-effect in `/customer/questionnaire`.
6. **Zero Test Regressions**: All 131 existing tests in `tests/runner.js` currently pass. The proposed fixes strictly adhere to the schemas, data contracts, and test assertions in `test_f2_rbac_idor.js`, `test_f3_case_lifecycle.js`, `test_f4_questionnaire_engine.js`, `test_f5_autosave_resume.js`, and `test_f6_conditional_branching.js`.

---

## 1. Deep Dive: Customer Dashboard (`src/app/customer/dashboard/page.tsx`)

### 1.1 Data Loading Architecture
- **Implementation**: Server Component (`export default async function CustomerDashboard()`).
- **Data Source**: Direct Prisma ORM query at lines 11–18:
  ```tsx
  const cases = await prisma.case.findMany({
    where: { customerId: (session.user as any).id },
    orderBy: { createdAt: "desc" },
    include: {
      documents: true,
      reviews: true
    }
  });
  ```
- **Observations**:
  - Does NOT fetch from `/api/cases` (no `/api/cases` endpoint currently exists).
  - Server-side fetching is performant and avoids client-side waterfall requests.
  - Correctly scopes query by `customerId: session.user.id`.

### 1.2 Case Presentation & Action Links
- **Card Rendering** (lines 37–61):
  - Iterates over `cases.map((c) => ...)`.
  - Displays:
    - Case ID: `Case ID: {c.id}`
    - Status: `<span className="font-medium text-blue-600">{c.status}</span>` (Generic text, unstyled).
    - Date: `Started: {new Date(c.createdAt).toLocaleDateString()}`
- **Action Button Routing**:
  - `c.status === "DRAFT"`: Renders `<Link href={`/customer/questionnaire?caseId=${c.id}`}>Continue Questionnaire →</Link>`. (Correctly includes `caseId`).
  - `c.status in ["GENERATED", "APPROVED", "FINAL", "PAID"]`: Renders `<Link href={`/customer/document?caseId=${c.id}`}>View Documents →</Link>`.
  - `c.status in ["IN_REVIEW", "CLARIFICATION_REQUESTED"]`: Renders `<span className="text-orange-500 font-medium">Under Lawyer Review</span>`.
- **Defects & Gaps**:
  1. **Uncovered Status (`SUBMITTED`)**: If a case is in `SUBMITTED` status, none of the conditional branches match. It renders empty action space.
  2. **Styling Gap**: Currently uses plain Tailwind (`bg-gray-50`, `bg-white p-6 rounded-xl`, `border-gray-100`). It does not utilize the retro Aqua skeuomorphic CSS classes defined in `src/app/globals.css` (`.bg-aqua-pinstripes`, `.aqua-card`, `.aqua-badge`, `.aqua-btn`, `.aqua-titlebar`).

### 1.3 "Start New Will" Flow
- **Current Button**:
  ```tsx
  <Link href="/customer/questionnaire" className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-500">
    + Start New Will
  </Link>
  ```
- **Execution Mechanism**:
  - Navigates to `/customer/questionnaire` without query parameters.
  - `/customer/questionnaire/page.tsx` lines 24–36 detects missing `caseId`, creates a new `Case` record in Prisma (`status: "DRAFT"`, `flags: "STANDARD"`), and issues a Next.js `redirect('/customer/questionnaire?caseId=${caseId}')`.
- **Evaluation**:
  - While functional, mutating database state on a GET request is an HTTP/REST anti-pattern. If browser prefetching triggers on hover, or if search crawlers/extensions inspect the link, an unwanted draft case could be created.
  - **Recommendation**: Introduce `/api/cases/route.ts` with `POST` handler, and implement an explicit Aqua gel button "+ Start New Will" that creates the draft case programmatically and routes to `/customer/questionnaire?caseId=${newCase.id}`.

---

## 2. Deep Dive: Questionnaire Page & Hydration (`/customer/questionnaire/page.tsx`)

### 2.1 Async searchParams Handling
- **Implementation** (lines 7–23):
  ```tsx
  interface QuestionnairePageProps {
    searchParams: Promise<{ caseId?: string | string[] }>;
  }
  export default async function QuestionnairePage({ searchParams }: QuestionnairePageProps) {
    ...
    const resolvedParams = await searchParams;
    let caseId = typeof resolvedParams?.caseId === "string"
      ? resolvedParams.caseId
      : Array.isArray(resolvedParams?.caseId)
      ? resolvedParams.caseId[0]
      : undefined;
  ```
- **Observations**:
  - Complies with Next.js 16 requirements where `searchParams` is a `Promise`.
  - Awaits `resolvedParams` cleanly and prevents sync dynamic bailout crashes.

### 2.2 Case Ownership Verification
- **Implementation** (lines 38–42):
  ```tsx
  const caseData = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseData || caseData.customerId !== (session.user as any).id) {
    redirect("/customer/dashboard");
  }
  ```
- **Observations**:
  - The page itself properly validates that the authenticated customer owns the case before rendering.
  - Redirects non-owners to `/customer/dashboard`.

### 2.3 Critical Defect: Missing State Hydration (Resume Broken)
- **Problem**:
  Line 46 renders:
  ```tsx
  <QuestionnaireEngine caseId={caseId} />
  ```
  And `src/components/QuestionnaireEngine.tsx` line 47:
  ```tsx
  const [answers, setAnswers] = useState<Record<string, any>>({});
  ```
- **Consequence**:
  - `caseData` is fetched WITHOUT `include: { answers: true }`.
  - Even though answers are saved in the DB, they are never passed to `QuestionnaireEngine`.
  - `QuestionnaireEngine` starts with `{}` on every page load.
  - When the user refreshes or clicks "Continue Questionnaire" from the dashboard, all previously entered personal details, family members, assets, and selections appear completely blank!
- **Required Fix**:
  1. In `src/app/customer/questionnaire/page.tsx`:
     ```tsx
     const caseData = await prisma.case.findUnique({
       where: { id: caseId },
       include: { answers: true }
     });
     ...
     const initialAnswers: Record<string, any> = {};
     if (caseData?.answers) {
       for (const ans of caseData.answers) {
         try {
           const parsed = JSON.parse(ans.answerData);
           Object.assign(initialAnswers, parsed);
         } catch (e) {
           console.error("Error parsing answerData:", e);
         }
       }
     }
     ...
     <QuestionnaireEngine caseId={caseId} initialAnswers={initialAnswers} />
     ```
  2. In `src/components/QuestionnaireEngine.tsx`:
     ```tsx
     export default function QuestionnaireEngine({
       caseId,
       initialAnswers = {}
     }: {
       caseId: string;
       initialAnswers?: Record<string, any>;
     }) {
       const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers);
     ```

---

## 3. Deep Dive: Save API & Security (`src/app/api/questionnaire/save/route.ts`)

### 3.1 Authentication Breakdown
- **Current Code** (lines 6–11):
  ```tsx
  export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    
    // For MVP, we can allow anonymous users to start a case, or require auth.
    // We'll proceed assuming the user is either logged in, or we're running in demo mode.
  ```
- **Vulnerability**:
  - `session` is fetched, but never validated.
  - If `!session || !session.user`, execution proceeds unconditionally.
  - Any anonymous HTTP client can send POST requests to save arbitrary data.

### 3.2 IDOR Vulnerability (Case Ownership)
- **Current Code**:
  - Takes `caseId`, `sectionId`, and `data` directly from request JSON.
  - Performs no lookup of `Case` to check `case.customerId === session.user.id`.
  - Allows Customer A (or an unauthenticated user) to overwrite Customer B's will answers simply by supplying Customer B's `caseId`.

### 3.3 Persistence Mechanism: findFirst vs. Upsert
- **Current Code** (lines 20–42):
  ```tsx
  const existing = await prisma.questionnaireAnswer.findFirst({
    where: {
      caseId,
      questionId: sectionId
    }
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
- **Evaluation**:
  - `prisma/schema.prisma` defines:
    ```prisma
    model QuestionnaireAnswer {
      id                  String   @id @default(cuid())
      caseId              String
      case                Case     @relation(fields: [caseId], references: [id], onDelete: Cascade)
      questionnaireVersion String
      questionId          String
      sectionId           String?
      answerData          String
      createdAt           DateTime @default(now())
      updatedAt           DateTime @updatedAt

      @@unique([caseId, questionId])
      @@index([caseId])
      @@index([sectionId])
    }
    ```
  - Using `findFirst` followed by `create` is non-atomic and vulnerable to race conditions under rapid typing or concurrent requests, throwing SQLite unique constraint violations.
  - Prisma generates the compound unique selector `caseId_questionId`.
  - Atomic `prisma.questionnaireAnswer.upsert` must be used:
    ```tsx
    const saved = await prisma.questionnaireAnswer.upsert({
      where: {
        caseId_questionId: {
          caseId,
          questionId: sectionId,
        }
      },
      update: {
        answerData: JSON.stringify(data),
        sectionId: sectionId,
      },
      create: {
        caseId,
        questionnaireVersion: "v1.0",
        questionId: sectionId,
        sectionId: sectionId,
        answerData: JSON.stringify(data),
      }
    });
    ```
  - Populating `sectionId` alongside `questionId: sectionId` satisfies both index queries and backward compatibility with test suites.

### 3.4 Hardened Save API Design
```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { caseId, sectionId, data } = body;

    if (!caseId || !sectionId || data === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Server-side Authorization & IDOR Guard
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      select: { customerId: true, status: true }
    });

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (caseRecord.customerId !== userId && userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Not authorized to modify this case" }, { status: 403 });
    }

    // Atomic Compound Upsert using @@unique([caseId, questionId])
    const answer = await prisma.questionnaireAnswer.upsert({
      where: {
        caseId_questionId: {
          caseId,
          questionId: sectionId,
        }
      },
      update: {
        answerData: JSON.stringify(data),
        sectionId: sectionId,
      },
      create: {
        caseId,
        questionnaireVersion: "v1.0",
        questionId: sectionId,
        sectionId: sectionId,
        answerData: JSON.stringify(data),
      }
    });

    // Update case updatedAt timestamp
    await prisma.case.update({
      where: { id: caseId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      answer: {
        id: answer.id,
        caseId: answer.caseId,
        questionId: answer.questionId,
        updatedAt: answer.updatedAt.toISOString(),
      }
    });
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json({ error: "Failed to save answers" }, { status: 500 });
  }
}
```

---

## 4. Deep Dive: Autosave Engine (`src/components/QuestionnaireEngine.tsx`)

### 4.1 Missing Keystroke Debouncing
- In `QuestionnaireEngine.tsx`:
  - `handleChange(questionId, value)` updates `answers` React state:
    ```tsx
    const handleChange = (questionId: string, value: any) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };
    ```
  - There is NO debounced API call connected to `answers` changes.
  - The API call only occurs when clicking "Next" (`handleNext`).
- Requirement: 500ms debounced autosave.
  - When typing in any field, a 500ms timer debounces network calls.
  - If typing stops for 500ms, the current section's answers are persisted via POST `/api/questionnaire/save`.
  - State tracking:
    - `isSaving` (boolean)
    - `lastSavedAt` (Date | null)
    - `saveError` (string | null)
  - Visual status header:
    - While saving: Aqua pulsating indicator with text "Saving..."
    - When saved: "Saved at HH:MM:SS"
    - If error: "Save failed — retrying..."

### 4.2 Missing Conditional Field in `src/lib/questionnaire.ts`
- In `src/lib/questionnaire.ts` lines 80–88:
  ```ts
  {
    id: "guardian",
    title: "Guardian Nomination",
    description: "Appoint a guardian for your minor children.",
    conditions: [
      { field: "hasChildren", operator: "equals", value: "Yes" },
      { field: "hasMinorChildren", operator: "equals", value: "Yes" }
    ],
  ```
- In `children` section (lines 43–78):
  - Only contains `hasChildren` and `childrenList`.
  - Does NOT have question `hasMinorChildren`.
- Adding `hasMinorChildren`:
  ```ts
  {
    id: "hasMinorChildren",
    type: "yes_no",
    label: "Do you have any minor children (under 18 years of age)?",
    required: true,
    conditions: [
      { field: "hasChildren", operator: "equals", value: "Yes" }
    ]
  }
  ```
  This cleanly unlocks the guardian section when toggled to "Yes", directly satisfying Task 5 of Milestone 3.

---

## 5. Test Suite Verification & Regression Protection

### 5.1 Test Architecture
- **Runner**: `tests/runner.js` executes with `ts-node` + `tsconfig-paths` transpilation on Node.js against SQLite (`prisma/dev.db`).
- **Tiers Executed**:
  - **Tier 1 (Feature Coverage)**: 11 suites, 55 tests (Auth, RBAC/IDOR, Case Lifecycle, Questionnaire, Autosave/Resume, Branching, Workflow, Templates, DOCX, Payment, Audit).
  - **Tier 2 (Boundaries & Edge Cases)**: 11 suites, 55 tests.
  - **Tier 3 (Pairwise Combinations)**: 1 suite, 15 tests.
  - **Tier 4 (Real-World Scenarios)**: 1 suite, 6 tests.
  - **Total**: 131 tests.

### 5.2 Test Execution Result
- **Status**: **131 passed / 0 failed / 131 total**.
- **Execution Time**: ~30 seconds.

### 5.3 Critical Test Contracts to Preserve:
1. **`test_f5_autosave_resume.js`**:
   - `T1.5.1`: Expects save payload `{ caseId, sectionId, data }`.
   - `T1.5.2` & `T1.5.3`: Expects `questionId: sectionId` in `QuestionnaireAnswer`.
   - `T1.5.5`: Tests resumption by loading all answers for `caseId` and merging `JSON.parse(ans.answerData)` into a single state object.
2. **`test_f2_rbac_idor.js`**:
   - `T1.2.1`: Tests `canAccessCase(customer, custCase)`.
   - `T1.2.4`: Tests IDOR rejection when unauthorized customer accesses foreign case.
3. **`test_f6_conditional_branching.js`**:
   - `T1.6.1`: Tests guardian section condition `{ hasChildren: 'Yes', hasMinorChildren: 'Yes' }`.
   - Adding `hasMinorChildren` question in `children` section will not break any existing test assertions.

---

## 6. Implementation Action Plan for Implementers

| Priority | Task | Target File | Specific Actions |
|:---:|---|---|---|
| **P0** | **Fix IDOR & Auth in Save API** | `src/app/api/questionnaire/save/route.ts` | 1. Require session (401 if null).<br>2. Look up case and verify `case.customerId === session.user.id` or `role === "ADMIN"` (403 if unauthorized).<br>3. Replace `findFirst` + `create/update` with atomic `prisma.questionnaireAnswer.upsert` on `caseId_questionId`. |
| **P0** | **Hydrate Questionnaire on Mount** | `src/app/customer/questionnaire/page.tsx`<br>`src/components/QuestionnaireEngine.tsx` | 1. In `page.tsx`: fetch `answers: true` with `caseData`.<br>2. Merge parsed answerData into `initialAnswers`.<br>3. Pass `initialAnswers` to `QuestionnaireEngine`.<br>4. In `QuestionnaireEngine`: initialize `answers` state from `initialAnswers`. |
| **P1** | **Debounced Autosave (500ms)** | `src/components/QuestionnaireEngine.tsx` | 1. Add `useCallback` debounced save triggered on `answers` change.<br>2. Add `isSaving`, `lastSavedAt`, `saveError` states.<br>3. Render visual status badges in the questionnaire header.<br>4. Flush pending debounced save immediately on `handleNext`. |
| **P1** | **Add `hasMinorChildren` Field** | `src/lib/questionnaire.ts` | Add `hasMinorChildren` yes_no question conditioned on `hasChildren === "Yes"` inside the `children` section questions. |
| **P2** | **Case Creation API & Aqua UI** | `src/app/api/cases/route.ts`<br>`src/app/customer/dashboard/page.tsx` | 1. Create `src/app/api/cases/route.ts` (GET and POST).<br>2. In dashboard: style case cards with Aqua skeuomorphic CSS (`.aqua-card`, `.aqua-badge`, `.aqua-btn`).<br>3. Support `SUBMITTED` status badge.<br>4. Wire "+ Start New Will" button to explicit POST. |
| **P2** | **Customer Registration** | `src/app/register/page.tsx`<br>`src/app/api/auth/register/route.ts` | Build customer registration with bcrypt password hashing and automatic login/redirect. |

---

## Conclusion
The Customer Dashboard and Questionnaire Engine have a functional skeleton, but suffer from three critical gaps: missing IDOR/auth checks in the save endpoint, zero answer hydration upon reload/resume, and lack of debounced autosave. These gaps are well-isolated and can be resolved without changing database schemas or regressing the 131-test passing suite.
