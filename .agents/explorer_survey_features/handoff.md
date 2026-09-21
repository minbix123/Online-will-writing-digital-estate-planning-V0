# Handoff Report: Feature Inventory & Workflow Audit

**Agent Folder**: `E:\Online will-writing & digital estate planning V0\.agents\explorer_survey_features`  
**Date**: 2026-09-16  
**Handoff Type**: Hard (Task Complete)  

---

## 1. Observation

Direct code inspections of the repository at `E:\Online will-writing & digital estate planning V0` yielded the following verbatim findings:

### 1.1 Customer Portal & Authentication
- **Login Redirection Bug** (`src/app/login/page.tsx:26-32`):
  `window.location.href = "/api/auth/session"` forces browser navigation to the raw JSON response of `/api/auth/session`, breaking client-side router navigation.
- **Plaintext Password Storage & Comparison** (`src/lib/auth.ts:22-24` and `prisma/seed.ts:21`):
  Passwords are stored as plain string `'password123'` without hashing (`user.password === credentials.password`).
- **Missing Registration**: No registration component, route, or API endpoint exists.
- **Implicit Case Creation on GET** (`src/app/customer/questionnaire/page.tsx:17-29`):
  Accessing `/customer/questionnaire` without `caseId` triggers `await prisma.case.create({...})` inside the server component GET render.
- **Next.js 15 Async `searchParams` Bug** (`src/app/customer/questionnaire/page.tsx:7-15`):
  `searchParams` is accessed synchronously (`let caseId = searchParams.caseId`) instead of awaiting `Promise<{ caseId?: string }>`.

### 1.2 Questionnaire Engine
- **Unreachable Guardian Section** (`src/lib/questionnaire.ts:80-88` vs `43-77`):
  The `guardian` section requires `{ field: "hasMinorChildren", operator: "equals", value: "Yes" }`. Section `children` defines only `hasChildren` and `childrenList`. `hasMinorChildren` is never asked in any question.
- **Missing Autosave & Typing Persistence** (`src/components/QuestionnaireEngine.tsx:24-35`):
  Persistence only occurs on clicking the "Next" button in `handleNext`. There is no debounced autosave, no keystroke listener, and no visual status indicator ("Saving/Saved/Failed").
- **State Loss on Refresh / Resume** (`src/components/QuestionnaireEngine.tsx:12`):
  State starts as `const [answers, setAnswers] = useState<any>({});`. There is no `useEffect` or server query restoring answers from the database on mount. Resuming a case renders all inputs blank.
- **Render-Time State Update** (`src/components/QuestionnaireEngine.tsx:55-63`):
  When a section condition fails, `setCurrentSectionIndex(currentSectionIndex + 1)` is called directly inside the component render body.
- **Unauthenticated Save API** (`src/app/api/questionnaire/save/route.ts:6-18`):
  No `getServerSession` call; any client can submit `{ caseId, sectionId, data }` and overwrite another user's case answers without authentication.

### 1.3 Legal Workflow Engine & Test Suite
- **Deterministic Rules** (`src/server/legal-workflows/index.ts:8-53`):
  Pure server-side class evaluating 5 flags: `STANDARD`, `GUARDIAN_REQUIRED`, `NRI`, `FOREIGN_ASSETS`, `BUSINESS_INTEREST`, `EXISTING_WILL`.
- **Faked Test Assertions** (`src/server/legal-workflows/tests.ts:60-68`):
  Tests 7, 8, 9, and 10 perform no execution or assertions; they simply log dummy `console.log("✅...")` messages.

### 1.4 Template & Clause Management
- **Empty Clause Library** (`prisma/seed.ts:1-93`):
  Zero `Clause` or `ClauseVersion` records are seeded.
- **Hardcoded Clause Literals** (`src/server/document-generator.ts:51-57`):
  Clauses are hardcoded HTML strings (`<p>GUARDIANSHIP: ...</p>`) concatenated in TypeScript code rather than queried from the database.
- **Missing Lifecycle States**:
  `prisma/schema.prisma:61` defines freeform `status String @default("DRAFT")`. `UNDER_REVIEW`, `LOCKED`, and `ARCHIVED` states are absent.

### 1.5 Lawyer & Admin Portals
- **404 Dead Link in Lawyer Dashboard** (`src/app/lawyer/dashboard/page.tsx:56`):
  Table links to `/lawyer/case/${c.id}`. The folder `src/app/lawyer/case` does not exist.
- **Unassigned Queue**:
  `src/app/lawyer/dashboard/page.tsx:12-22` queries all cases in review across the platform without filtering by `lawyerId`.
- **LawyerReview Model Unused**:
  `prisma/schema.prisma:126-134` defines `LawyerReview`, but it is never created, updated, or read anywhere in `src/`.
- **Admin Portal Read-Only**:
  `src/app/admin/dashboard/page.tsx` displays total user and case counts, read-only templates, and 10 audit logs. No user management, case management, or template editing capabilities exist.

### 1.6 Document Generation & Storage
- **Incomplete Merging** (`src/server/document-generator.ts:47-49`):
  Only `{{fullName}}` is replaced. All asset, beneficiary, executor, and family data is discarded.
- **Unsaved Document Files**:
  Generated buffers are packed in memory and never written to disk or storage. `Document.pdfUrl` and `Document.docxUrl` remain `null`.
- **Duplicate Document Records on Download** (`src/app/api/document/download/route.ts:28`):
  Every GET request triggers `DocumentGenerator.generate(caseId)`, creating a new `Document` database record on every download.
- **Mocked PDF**:
  `src/app/customer/document/page.tsx:30` triggers `alert("PDF generation is currently mocked. Please download the DOCX.")`.

### 1.7 Payment & Audit Logging
- **Unauthenticated Payment API** (`src/app/api/checkout/route.ts:6-19`):
  `/api/checkout` accepts any `caseId` and `plan` without session verification.
- **No Database Transactions**:
  `payment.create`, `case.update`, `document.create`, and `auditLog.create` run as standalone asynchronous calls without `prisma.$transaction`.
- **Audit Logging Omissions**:
  `prisma.auditLog.create` is called in exactly one location (`src/app/api/checkout/route.ts:59-65`), where `actorId` is set to null. Ten out of eleven mandatory audit events are completely unlogged.

---

## 2. Logic Chain

1. **Observation 1.1** demonstrates that client login immediately redirects to a raw JSON endpoint, passwords are in plaintext, and case creation occurs via GET side-effects.  
   *Inference*: Customer onboarding and session flow cannot function properly in production and fail basic security standards.
2. **Observation 1.2** demonstrates that the `guardian` section is blocked by a missing schema field, autosave is non-existent during typing, and resume starts with empty state.  
   *Inference*: The questionnaire cannot be safely completed, cannot be resumed upon page refresh, and fails acceptance criteria R4 and R5.
3. **Observation 1.3** demonstrates that workflow engine rules are properly isolated and deterministic, but the test suite fakes tests 7 through 10 with console logs.  
   *Inference*: Legal rule logic is structurally sound, but automated verification claims in `tests.ts` are deceptive and unverified.
4. **Observation 1.4 & 1.6** demonstrate that clauses are not seeded or retrieved from the database, only `{{fullName}}` is substituted in templates, and document generation creates duplicate records on every download without file storage.  
   *Inference*: Document generation is a rudimentary mock rather than a real legal document compiler.
5. **Observation 1.5** demonstrates that `/lawyer/case/[id]` does not exist and lawyers have no review tools.  
   *Inference*: The Lawyer Review workflow is completely broken at the UI layer.
6. **Observation 1.7** demonstrates that `/api/checkout` and `/api/questionnaire/save` are unauthenticated, multi-step mutations lack transactions, and 91% of audit events are unlogged.  
   *Inference*: Data integrity, payment processing, and audit compliance fail acceptance criteria R2, R11, and R12.

---

## 3. Caveats

- **Runtime Test Execution**: Interactive command execution for `npx ts-node` timed out waiting for user confirmation in the environment; all findings are derived from exhaustive static analysis of code, dependencies, and configuration.
- **UI Skeuomorphic Theme**: While Tailwind CSS v4 and Base UI / Lucide are installed, specific Aqua/skeuomorphic styling from R15 is largely absent (standard generic Tailwind utility classes are currently used).
- **External Storage**: No external S3 or cloud storage bucket is configured; local file persistence will be necessary for MVP document storage.

---

## 4. Conclusion

The application is in an early proof-of-concept state with critical blockers across all primary user workflows:
1. **Broken Paths**: Customer login routes to raw JSON; Lawyer review routes to a 404 dead link; Questionnaire resume renders blank forms.
2. **Mocked/Faked Elements**: Tests 7-10 in `tests.ts` are hardcoded `console.log` statements; PDF download is a JavaScript `alert`; clauses are hardcoded in code literals.
3. **Severe Vulnerabilities**: Unauthenticated save and checkout endpoints allow unauthorized data tampering (IDOR); passwords are stored in plaintext.
4. **Architectural Gaps**: Debounced autosave is missing; document generation discards 90% of user data and does not persist files; audit logging covers only 1 of 11 required events.

Full detailed analysis is documented in `E:\Online will-writing & digital estate planning V0\.agents\explorer_survey_features\analysis.md`.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Login Defect**:
   Inspect `src/app/login/page.tsx` line 26: Observe `window.location.href = "/api/auth/session"`.
2. **Verify Missing Guardian Field**:
   Inspect `src/lib/questionnaire.ts` line 87: Condition requires `hasMinorChildren`. Inspect lines 43-77: Confirm question `hasMinorChildren` does not exist.
3. **Verify Lawyer 404 Route**:
   Inspect `src/app/lawyer/dashboard/page.tsx` line 56: Link targets `/lawyer/case/${c.id}`. Check filesystem under `src/app/lawyer/`: confirm no `case` folder exists.
4. **Verify Fake Tests**:
   Inspect `src/server/legal-workflows/tests.ts` lines 60-68: Observe `passed += 4; total += 4;` without assertions.
5. **Verify Unauthenticated Endpoints**:
   Inspect `src/app/api/questionnaire/save/route.ts` and `src/app/api/checkout/route.ts`: Confirm absence of `getServerSession`.
6. **Verify Audit Log Coverage**:
   Search for `prisma.auditLog.create` across `src/`: Confirm it is only called in `src/app/api/checkout/route.ts:59`.
