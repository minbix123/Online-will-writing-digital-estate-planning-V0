# Handoff Report: Performance & Build Audit

**Sender**: Performance & Build Explorer (`explorer_survey_perf`)  
**Recipient**: Orchestrator / Implementers  
**Working Directory**: `E:\Online will-writing & digital estate planning V0\.agents\explorer_survey_perf`  
**Target Project**: `E:\Online will-writing & digital estate planning V0`  
**Date**: 2026-09-16  

---

## 1. Observation

1. **Next.js Version & Async `searchParams`**:
   - `package.json:20`: `"next": "16.3.5"`, `"react": "19.2.8"`.
   - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md:12-14`: In Next.js 16/15, Page props require:
     ```tsx
     searchParams: Promise<{ [key: string]: string | string[] | undefined }>
     ```
   - `src/app/customer/questionnaire/page.tsx:7-29`:
     ```tsx
     export default async function QuestionnairePage({
       searchParams,
     }: {
       searchParams: { caseId?: string };
     }) { ...
       let caseId = searchParams.caseId;
       if (!caseId) {
         const newCase = await prisma.case.create({ ... });
         caseId = newCase.id;
         redirect(`/customer/questionnaire?caseId=${caseId}`);
       }
     ```
     `searchParams` is treated as a plain object rather than a Promise. `searchParams.caseId` evaluates to `undefined` at runtime.

2. **Nonexistent Module Import in Questionnaire Engine**:
   - `src/components/QuestionnaireEngine.tsx:4`:
     ```tsx
     import { useForm, FormProvider } from "react-form";
     ```
   - `node_modules/react-form` does not exist (`directory ... does not exist`).
   - `package.json:13-28` contains `"react-hook-form": "^7.88.0"`, but not `"react-form"`.

3. **Render-Time State Mutation in Questionnaire Engine**:
   - `src/components/QuestionnaireEngine.tsx:55-63`:
     ```tsx
     if (!checkConditions(currentSection.conditions)) {
       if (currentSectionIndex < questionnaireConfig.sections.length - 1) {
         setCurrentSectionIndex(currentSectionIndex + 1);
       } else {
         window.location.href = `/customer/checkout?caseId=${caseId}`;
       }
       return null;
     }
     ```
     `setCurrentSectionIndex` and `window.location.href` are invoked directly in the component body during render.

4. **Missing Database Indexes**:
   - `prisma/schema.prisma:46-55`:
     ```prisma
     model QuestionnaireAnswer {
       id                  String   @id @default(cuid())
       caseId              String
       case                Case     @relation(fields: [caseId], references: [id])
       questionnaireVersion String
       questionId          String
       answerData          String
       createdAt           DateTime @default(now())
       updatedAt           DateTime @updatedAt
     }
     ```
     No unique constraint (`@@unique([caseId, questionId])`) and no index on `caseId`.
   - `src/app/api/questionnaire/save/route.ts:21-25`:
     ```ts
     const existing = await prisma.questionnaireAnswer.findFirst({
       where: { caseId, questionId: sectionId }
     });
     ```
     Executes an unindexed table scan.

5. **Duplicate Document Generation on Download**:
   - `src/app/api/document/download/route.ts:28`:
     ```ts
     const { docxBuffer } = await DocumentGenerator.generate(caseId);
     ```
   - `src/server/document-generator.ts:96-104`:
     ```ts
     await prisma.document.create({
       data: { caseId, templateVersionId: templateVersion.id, status: "GENERATED", ... }
     });
     ```
     Every file download regenerates the DOCX buffer and inserts a new row into `prisma.document`.

6. **Login Navigation Glitch**:
   - `src/app/login/page.tsx:26-32`:
     ```ts
     window.location.href = "/api/auth/session";
     fetch('/api/auth/session').then(res => res.json()).then(session => { ... });
     ```
     Browser is directed immediately to the JSON endpoint `/api/auth/session`.

7. **Root-Level `useSearchParams()` Without Suspense**:
   - `src/app/customer/checkout/page.tsx:7` and `src/app/customer/document/page.tsx:7` call `useSearchParams()` at root of `"use client"` page with no `<Suspense>` wrapper.

8. **Missing Route and Mocked Tests**:
   - `src/app/lawyer/dashboard/page.tsx:56` links to `/lawyer/case/${c.id}`, but directory `src/app/lawyer/case` does not exist.
   - `src/server/legal-workflows/tests.ts:60-66` outputs fake test successes via hardcoded `console.log`.

9. **Landing Page UI Styling**:
   - `src/app/page.tsx:6, 12, 28` uses standard Tailwind classes (`bg-gray-50`, `text-blue-600`, `bg-blue-600`). No Aqua or retro Apple skeuomorphic visual treatments (pill buttons, gloss highlights, pinstripes) exist.

---

## 2. Logic Chain

1. **Slowness & Infinite Loop (Obs 1)**:
   - Next.js 16 changed `searchParams` into a Promise.
   - `src/app/customer/questionnaire/page.tsx` accesses `searchParams.caseId` synchronously without awaiting.
   - In JavaScript, accessing a property on an unresolved Promise yields `undefined`.
   - The condition `if (!caseId)` evaluates to `true`.
   - The handler runs `prisma.case.create` to generate a new case row, then immediately calls `redirect(...)`.
   - When the redirected request reaches the same page, `searchParams.caseId` is still a Promise, evaluating to `undefined` again.
   - **Conclusion**: The application enters an infinite redirect loop accompanied by a burst of redundant database write operations, causing severe freezing and database bloat.

2. **Compilation / Bundling Stalls (Obs 2)**:
   - `src/components/QuestionnaireEngine.tsx` imports from `"react-form"`.
   - Node cannot resolve `"react-form"`.
   - Next.js compilation fails with `Module not found: Can't resolve 'react-form'`.
   - **Conclusion**: The questionnaire page cannot bundle or compile cleanly.

3. **React Render Crashes (Obs 3)**:
   - In React 19, state setters called synchronously in the body of a component trigger an immediate re-render schedule.
   - When a user enters the questionnaire and reaches a conditional section (e.g. `guardian` where `hasMinorChildren !== "Yes"`), `setCurrentSectionIndex(currentSectionIndex + 1)` is called directly in render.
   - Consecutive skipped sections trigger multiple immediate renders within the same cycle, leading to React's fatal "Too many re-renders" exception.
   - **Conclusion**: The questionnaire engine freezes and crashes upon encountering conditional branches.

4. **Database Full Table Scans (Obs 4)**:
   - `QuestionnaireAnswer` has no indexes on `caseId` and `questionId`.
   - Every save call in `/api/questionnaire/save` calls `findFirst({ where: { caseId, questionId: sectionId } })`.
   - Without an index, SQLite performs a sequential scan over all answer rows.
   - **Conclusion**: Query latency compounds with every answered question and concurrent user.

5. **Document Generation Overhead & Row Duplication (Obs 5)**:
   - `GET /api/document/download` calls `DocumentGenerator.generate(caseId)` directly on every request.
   - `generate()` performs complete DOCX zip packing in-memory and executes an insert into `prisma.document`.
   - **Conclusion**: Repeated downloads duplicate database records and waste CPU cycles re-serializing already generated files.

6. **Login Screen Failure (Obs 6)**:
   - `window.location.href = "/api/auth/session"` runs immediately upon successful credential submission.
   - Navigation away to `/api/auth/session` interrupts client routing and displays raw session JSON.
   - **Conclusion**: Users are stranded on a raw JSON API response instead of landing on their dashboard.

---

## 3. Caveats

1. **Direct Terminal Execution Constraint**:
   - `run_command` in this environment required an interactive permission prompt that timed out waiting for user response.
   - Direct verification was performed via static analysis, code tracing, AST/source inspection, Next.js internal doc specifications, and schema checks.
2. **Payment Processing**:
   - As per `ORIGINAL_REQUEST.md`, mock payment processing is explicitly allowed for this MVP.
3. **Seed Data State**:
   - The database file `prisma/dev.db` exists. A fresh seed (`prisma/seed.ts`) will be needed once schema indexes and fixes are applied.

---

## 4. Conclusion

The reported severe slowness is **not** inherent to Next.js or React 19. It is caused by **concrete architectural bugs**:
1. An infinite redirect and redundant case-creation loop caused by unawaited async `searchParams` in Next.js 16 (`src/app/customer/questionnaire/page.tsx`).
2. A compilation failure caused by importing nonexistent module `"react-form"` (`src/components/QuestionnaireEngine.tsx`).
3. Render-phase state mutations causing React re-render loops in `QuestionnaireEngine.tsx`.
4. Missing indexes on foreign keys in `prisma/schema.prisma` causing full table scans.
5. Accidental document re-generation and row duplication on download (`/api/document/download`).
6. A hard navigation bug in `src/app/login/page.tsx` setting `window.location.href` to `/api/auth/session`.
7. Lack of `<Suspense>` wrappers around `useSearchParams()` in client pages.
8. Missing Aqua/skeuomorphic styling across the application.

All 8 bottlenecks are localized, fully understood, and have straightforward, low-risk remediation paths.

---

## 5. Verification Method

### Step 1: File Content Inspections
- Inspect `src/app/customer/questionnaire/page.tsx:7-29` to verify async `searchParams` handling.
- Inspect `src/components/QuestionnaireEngine.tsx:4` to verify removal of `react-form`.
- Inspect `src/components/QuestionnaireEngine.tsx:55-63` to verify removal of `setCurrentSectionIndex` in render body.
- Inspect `src/app/login/page.tsx:26-32` to verify removal of `window.location.href = "/api/auth/session"`.
- Inspect `prisma/schema.prisma` for `@@unique([caseId, questionId])` and foreign key indexes.

### Step 2: Build & Typecheck Commands
Once implementers apply the code fixes, verify with:
```bash
# Typecheck
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build
```
- **Passing Condition**: `npx tsc --noEmit` exits with 0 errors; `npm run build` generates static/dynamic routes in `.next/` without bailout or missing module warnings.
- **Invalidation Condition**: If `searchParams.caseId` remains unawaited, loading `/customer/questionnaire?caseId=test` will trigger `prisma.case.create` and return HTTP 307/308 redirect loops.
