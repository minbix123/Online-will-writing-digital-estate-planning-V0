# Feature Inventory & Workflow Audit Report

**Project**: Indian Will-Writing & Digital Estate Planning Platform  
**Target Root**: `E:\Online will-writing & digital estate planning V0`  
**Explorer**: Feature & Workflow Explorer  
**Date**: 2026-09-16  
**Status**: Comprehensive Read-Only Audit Complete  

---

## 1. Executive Summary & Feature Categorization Matrix

A thorough line-by-line inspection was conducted across all pages, components, API endpoints, server classes, and Prisma models. The platform currently presents an early proof-of-concept skeleton with high-level visual scaffolding, but suffers from critical functional blockers, fake/mocked assertions, broken navigation paths, missing persistence/resume logic, unauthenticated endpoints, and unmanaged legal workflows.

### Feature Classification Summary

| Feature Area | Sub-Feature / Component | Status | Key Evidence / Primary Defect |
|---|---|---|---|
| **Auth & RBAC** | Plaintext Demo Login | **Partially Functional** | Works with seed accounts, but passwords are in plaintext without hashing (`src/lib/auth.ts:23`). |
| | Login Routing & Redirection | **Broken** | Line 26 in `src/app/login/page.tsx` navigates directly to raw JSON endpoint `window.location.href = "/api/auth/session"`. |
| | User Registration | **Missing** | No registration form or endpoint exists in the repository. |
| | Server-Side RBAC Enforcement | **Partially Functional** | Pages verify role, but `/api/questionnaire/save` and `/api/checkout` have zero authentication or authorization checks. |
| **Customer Portal** | Case Listing (Dashboard) | **Functional** | Server component queries and lists customer's cases with ID and status (`src/app/customer/dashboard/page.tsx:11-18`). |
| | Case Creation | **Partially Functional** | Mutates DB as side effect during GET page render (`src/app/customer/questionnaire/page.tsx:19-25`); Next.js 15 async `searchParams` bug. |
| | Case Status Display | **Partially Functional** | Shows DRAFT, IN_REVIEW, GENERATED/PAID, but omits workflow flags and lawyer notes. |
| | Case History & Timeline | **Missing** | No activity log or case history view available to the customer. |
| | Document Signing Guidance | **Functional** | Static instructions displayed on `/customer/document` (`src/app/customer/document/page.tsx:38-49`). |
| **Questionnaire** | JSON Schema Definition | **Partially Functional** | 9 sections defined (`src/lib/questionnaire.ts:1-218`), but `hasMinorChildren` question is omitted, locking the Guardian section. |
| | Branching / Skip Conditions | **Partially Functional** | Single `equals` operator evaluated; condition check triggers state update in render phase (`QuestionnaireEngine.tsx:55-63`). |
| | Debounced Autosave | **Missing** | No debouncing, no typing listener; save only triggers on explicit "Next" button click (`QuestionnaireEngine.tsx:24-35`). |
| | Resume / Refresh Persistence | **Broken** | `answers` state initialized to `{}` without fetching previous answers on mount; page refresh clears all form inputs. |
| | Input Validation | **Missing** | `required: true` in config is completely ignored; empty forms can be advanced. |
| | Review Answers Step | **Missing** | Final button says "Review Answers" but immediately redirects to `/customer/checkout` without review screen. |
| **Legal Workflow** | Rule Evaluation (`LegalWorkflowEngine`) | **Partially Functional** | Deterministic if-conditions evaluate 5 flags (`src/server/legal-workflows/index.ts:8-53`). |
| | UI Isolation | **Functional** | Pure server-side TypeScript class with zero UI coupling. |
| | Personal Law Nuances | **Missing** | No logic for Hindu Succession Act, Indian Succession Act, or Muslim personal law. |
| | Test Suite Verification | **Broken / Mocked** | Tests 1-6 execute, but Tests 7-10 are hardcoded `console.log("✅...")` dummy strings (`src/server/legal-workflows/tests.ts:60-68`). |
| **Templates & Clauses** | Template Database Models | **Partially Functional** | `Template` and `TemplateVersion` exist; seeded with 1 DRAFT and 1 LAWYER_APPROVED template. |
| | Template Lifecycle States | **Broken** | Schema uses freeform string; lacks `UNDER_REVIEW`, `LOCKED`, or `ARCHIVED`; `TemplateVersion` has no status. |
| | Clause Library & Versioning | **Mocked / Missing** | Models exist, but 0 clauses seeded; `DocumentGenerator` hardcodes HTML strings; no clause management. |
| | Template Admin Management | **Missing** | Admin dashboard displays a read-only list with no creation, editing, or approval actions. |
| **Lawyer Portal** | Case Queue Listing | **Partially Functional** | Displays `IN_REVIEW` and `APPROVED` cases, but shows all platform cases without filtering by assigned lawyer. |
| | Case Review Page (`/lawyer/case/[id]`)| **Broken / 404** | Table button links to `/lawyer/case/${c.id}` (`src/app/lawyer/dashboard/page.tsx:56`), which does NOT exist (returns 404). |
| | Case Assignment & Notes | **Missing** | `LawyerReview` model is never queried or created; no notes or assignment UI/API. |
| | Approval / Rejection Actions | **Missing** | No endpoints or UI buttons for lawyer review decisions. |
| **Admin Portal** | System Counters | **Functional** | Displays total users and cases (`src/app/admin/dashboard/page.tsx:10-11`). |
| | User & Case Management | **Missing** | No user listing, role management, or case intervention capabilities. |
| | Audit Log Viewer | **Partially Functional** | Displays 10 most recent logs (`src/app/admin/dashboard/page.tsx:17-21`), but lacks filtering, pagination, or detail views. |
| **DocGen** | Server-Side DOCX Generation | **Partially Functional** | Uses `docx` library Packer (`src/server/document-generator.ts:60-93`) to build a binary buffer. |
| | Template Placeholder Merging | **Broken / Incomplete** | Only `{{fullName}}` replaced; HTML tags stripped into a single unformatted text paragraph; all other answers ignored. |
| | Persistence & Document URLs | **Broken** | File is never written to disk or storage; `pdfUrl` and `docxUrl` remain `null` in DB record. |
| | Download Endpoint | **Broken** | Regenerates a new document and inserts a duplicate DB record on every single download (`/api/document/download`). |
| | PDF Generation | **Mocked** | Browser alert: `alert("PDF generation is currently mocked.")` (`src/app/customer/document/page.tsx:30`). |
| **Payment** | Multi-Tier Pricing UI | **Functional** | Displays Basic (₹999), Lawyer Review (₹2,999), Complex/NRI (₹4,999) (`src/app/customer/checkout/page.tsx:38-78`). |
| | Mock Payment Processing | **Partially Functional** | Inserts `Payment` record with status `SUCCESS` and mode `MOCK` (`src/app/api/checkout/route.ts:12-19`). |
| | Transaction Boundaries | **Broken** | No `prisma.$transaction` across Payment, Case update, Document creation, and AuditLog. |
| | Payment Endpoint Security | **Broken** | `/api/checkout` has zero authentication or ownership verification (severe IDOR). |
| **Audit Logging** | AuditLog Table | **Functional** | Model exists with timestamp, actorId, action, caseId, and metadata (`prisma/schema.prisma:150-159`). |
| | Event Coverage | **Broken (9% coverage)**| Only 1 event logged (`PAYMENT_SUCCESS_AND_DOC_GENERATED` in checkout); 10 of 11 required event types are completely omitted. |
| | Actor Traceability | **Broken** | Checkout log leaves `actorId` null (`src/app/api/checkout/route.ts:59-65`). |

---

## 2. Customer Portal Audit

### 2.1 Case Creation and Routing Defects
- **Side-Effect in Page Component**: In `src/app/customer/questionnaire/page.tsx:17-29`:
  ```typescript
  if (!caseId) {
    // Create new case
    const newCase = await prisma.case.create({
      data: {
        customerId: (session.user as any).id,
        status: "DRAFT",
        flags: "STANDARD"
      }
    });
    caseId = newCase.id;
    redirect(`/customer/questionnaire?caseId=${caseId}`);
  }
  ```
  Navigating to `/customer/questionnaire` (or refreshing before params attach) silently inserts a new Case record into SQLite. There is no explicit user confirmation (e.g., "Create New Case" POST action).
- **Next.js 15/16 Async `searchParams` Issue**: In `src/app/customer/questionnaire/page.tsx:7-15`:
  `searchParams` is typed as `{ caseId?: string }` and accessed directly as `let caseId = searchParams.caseId;`. In Next.js 15 and 16, `searchParams` is a `Promise<{ caseId?: string }>` and must be awaited (`const { caseId } = await searchParams;`). Accessing it synchronously triggers Next.js dev runtime warnings and potential production hydration mismatches.

### 2.2 Login Redirection Defect
- In `src/app/login/page.tsx:26-32`:
  ```typescript
  window.location.href = "/api/auth/session"; // We can check session and redirect accordingly, 
  // but for V0 MVP, let's just push to a generic entry or fetch session and route.
  fetch('/api/auth/session').then(res => res.json()).then(session => {
     if (session?.user?.role === 'LAWYER') router.push('/lawyer/dashboard');
     else if (session?.user?.role === 'ADMIN') router.push('/admin/dashboard');
     else router.push('/customer/dashboard');
  });
  ```
  Executing `window.location.href = "/api/auth/session"` causes the browser to navigate immediately to the raw NextAuth JSON endpoint. The user is left staring at raw JSON (`{"user":{...}}`), preventing the router redirect from ever taking effect.

### 2.3 Dashboard State & Customer Isolation
- `src/app/customer/dashboard/page.tsx:11-18` correctly queries cases with `where: { customerId: (session.user as any).id }`.
- However, case status display is simplistic: it handles `DRAFT`, `IN_REVIEW`, `CLARIFICATION_REQUESTED`, and `GENERATED/APPROVED/FINAL/PAID`. It does not show legal workflow flags (e.g. `NRI`, `GUARDIAN_REQUIRED`) or lawyer notes to the customer.

---

## 3. Questionnaire Engine Audit

### 3.1 Schema & Section Configuration (`src/lib/questionnaire.ts`)
The engine defines 9 sections with 22 total questions. However, an analysis of the conditional triggers revealed a fatal logical flaw:
- **The Unreachable Guardian Section**:
  In `src/lib/questionnaire.ts:80-88`:
  ```typescript
  id: "guardian",
  title: "Guardian Nomination",
  description: "Appoint a guardian for your minor children.",
  conditions: [
    { field: "hasChildren", operator: "equals", value: "Yes" },
    { field: "hasMinorChildren", operator: "equals", value: "Yes" }
  ],
  ```
  In section `children` (`src/lib/questionnaire.ts:43-77`), the questions are `hasChildren` (yes/no) and `childrenList` (repeater with `name`, `dateOfBirth`, `relationship`). The field `hasMinorChildren` does not exist anywhere in the questions configuration!
  As a consequence, `answers["hasMinorChildren"]` is permanently `undefined`. The condition `val !== "Yes"` always evaluates to `true`, forcing `checkConditions` to return `false`. The Guardian section is permanently skipped.

### 3.2 Autosave Mechanism
Requirement R5 specifies:
> "Autosave must be debounced. Do NOT send a database request on every keystroke. Use: Input → local state → debounce → persistence. Prevent duplicate/concurrent saves. Display appropriate states such as: Saving, Saved, Save failed."

**Audit Finding**:
- Debounced autosave is **completely missing**.
- In `src/components/QuestionnaireEngine.tsx:24-35`, save is invoked ONLY when the user clicks the "Next" button (`handleNext`):
  ```typescript
  const handleNext = async () => {
    // Autosave
    try {
      await fetch("/api/questionnaire/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, sectionId: currentSection.id, data: answers })
      });
    } catch (e) {
      console.error("Autosave failed", e);
    }
  ```
- If a user spends 15 minutes typing and accidentally refreshes or navigates away before clicking "Next", **all input is lost**.
- There are no UI indicators for "Saving", "Saved", or "Save failed".
- If the fetch fails, the error is swallowed with `console.error` and navigation proceeds anyway.

### 3.3 Resume / Refresh State Loss
- In `src/components/QuestionnaireEngine.tsx:12`:
  `const [answers, setAnswers] = useState<any>({});`
- There is no `useEffect` or initial props that fetch or populate answers from previous sessions or database records.
- When a user resumes a case from the dashboard (`/customer/questionnaire?caseId=...`), `answers` is empty. The form fields render completely blank.

### 3.4 Unauthenticated Save API & Data Corruption
- In `src/app/api/questionnaire/save/route.ts:6-49`:
  - There is **no session check** or caller authentication.
  - Any unauthenticated request with a valid `caseId` can overwrite case answers (IDOR).
  - It saves `data` (the entire cumulative `answers` dictionary) into `QuestionnaireAnswer` using `questionId: sectionId`. This dumps the entire global answer state under each section key rather than persisting individual answers or section-specific data.

### 3.5 Render-Time State Mutation Bug
- In `src/components/QuestionnaireEngine.tsx:55-63`:
  ```typescript
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
  `setCurrentSectionIndex` is called directly during the render pass! In React 19, updating state during render of the same component triggers warnings and unpredictable skipping behavior.
- Furthermore, clicking the "Back" button (`setCurrentSectionIndex(currentSectionIndex - 1)`) backwards into a skipped section immediately triggers this forward jump again, effectively trapping the user.

---

## 4. Deterministic Legal Workflow Engine

### 4.1 Rule Definitions & Isolation
The workflow logic in `src/server/legal-workflows/index.ts:8-53` is clean, deterministic, and properly isolated from UI components.
- Evaluates:
  1. `maritalStatus === "Other"` → `LEGAL_REVIEW_REQUIRED`, `MANUAL_CONSULTATION_REQUIRED`
  2. `hasMinorChildren === "Yes"` → `GUARDIAN_REQUIRED`
  3. `isNRI === "Yes"` → `NRI`, `FOREIGN_ASSETS`, `LEGAL_REVIEW_REQUIRED`
  4. `asset.type === "BusinessInterests"` → `BUSINESS_INTEREST`, `LEGAL_REVIEW_REQUIRED`
  5. `hasExistingWill === "Yes" || "Not sure"` → `EXISTING_WILL`, `LEGAL_REVIEW_REQUIRED`

### 4.2 Fake Test Assertions in `tests.ts`
In `src/server/legal-workflows/tests.ts:60-68`:
```typescript
// Test 7 & 8: Template blocking logic is implemented in DocumentGenerator (it queries LAWYER_APPROVED).
// I will just mock Test 7 and Test 8 here.
console.log(`✅ Test 7 (Draft template blocks production generation) - Verified via DocumentGenerator query`);
console.log(`✅ Test 8 (Approved template succeeds) - Verified via DocumentGenerator query`);
console.log(`✅ Test 9 (Template version locked) - Verified via Prisma schema tracking templateVersionId`);
console.log(`✅ Test 10 (Unauthorized access denied) - Verified via API auth check in download route`);

passed += 4;
total += 4;
```
**Audit Finding**: Tests 7, 8, 9, and 10 do NOT execute any code or test any behavior. They are hardcoded mock logs designed to give a false appearance of test suite completion.

### 4.3 Missing Indian Legal Succession Requirements
Under Indian succession law:
- **Personal Laws**: Succession rules differ under the Hindu Succession Act, 1956 (applicable to Hindus, Buddhists, Jains, Sikhs) and Muslim Personal Law (Shariat) Application Act, 1937. Under Muslim law, testamentary disposition is generally restricted to 1/3 of the estate without heirs' consent. The engine has no personal law branch.
- **Section 67, Indian Succession Act, 1925**: Any bequest to an attesting witness or spouse of an attesting witness is void. The engine does not validate whether an executor or beneficiary is listed as an attesting witness.

---

## 5. Template & Clause Management

### 5.1 Lifecycle States Deficiency
Requirement R7 mandates:
> `DRAFT → UNDER_REVIEW → LAWYER_APPROVED → LOCKED/ARCHIVED`

- In `prisma/schema.prisma:57-66`, `Template.status` is a freeform String with comment `// DRAFT, LAWYER_APPROVED, DISABLED`.
- The intermediate review state (`UNDER_REVIEW`) and immutable state (`LOCKED` / `ARCHIVED`) are absent.
- `TemplateVersion` has no status field; version records cannot be independently reviewed or approved.

### 5.2 Clause Library & Hardcoded Text
- Prisma defines `Clause` and `ClauseVersion` models (`prisma/schema.prisma:79-97`).
- In `prisma/seed.ts`, **zero clauses are seeded**.
- In `src/server/document-generator.ts:51-57`, clauses are hardcoded as raw string literals:
  ```typescript
  if (answersMap["hasMinorChildren"] === "Yes") {
    content += `\n\n<p>GUARDIANSHIP: I appoint ${answersMap["guardianName"] || 'the named guardian'} to be the guardian of my minor children.</p>`;
  }
  if (answersMap["isNRI"] === "Yes") {
    content += `\n\n<p>FOREIGN ASSETS: This will also covers my assets located in ${answersMap["countryOfResidence"] || 'foreign countries'}.</p>`;
  }
  ```
- Clauses are not managed, versioned, or retrieved from the database.

---

## 6. Lawyer Portal & Admin Portal

### 6.1 Lawyer Portal Critical Defect: Dead 404 Route
In `src/app/lawyer/dashboard/page.tsx:56`:
```typescript
<Link href={`/lawyer/case/${c.id}`} className="text-blue-600 hover:text-blue-900">Review</Link>
```
- **Audit Finding**: Route `/lawyer/case/[id]` does **not exist anywhere in the repository**.
- Clicking "Review" leads to a 404 Not Found error.
- Lawyers cannot view answers, view workflow flags, write review notes, request clarifications, or approve/reject cases.

### 6.2 Case Assignment & Tenant Isolation
- In `src/app/lawyer/dashboard/page.tsx:12-22`, cases are fetched with:
  `where: { status: { in: ["IN_REVIEW", "CLARIFICATION_REQUESTED", "APPROVED"] } }`.
- The query does NOT filter by `lawyerId: session.user.id`. Any authenticated lawyer can see all cases in review across the entire platform.
- There is no mechanism or API to assign a case to a specific lawyer.

### 6.3 Admin Portal Deficiencies
In `src/app/admin/dashboard/page.tsx:10-74`:
- Only shows `Total Users` count and `Total Cases` count.
- Shows read-only template list without create, edit, or approval actions.
- Shows 10 most recent audit logs without pagination, filtering, or search.
- User management, case management, and payment visibility are entirely missing.

---

## 7. Document Generation

### 7.1 DOCX Implementation (`src/server/document-generator.ts`)
- Document generator uses the `docx` library.
- Placeholders: Only `{{fullName}}` is replaced (`line 48`). All other questionnaire data (addresses, beneficiaries, asset breakdown, executor nominations) is discarded from the template body.
- Formatting: Strips HTML tags using regex (`line 83`) and dumps all text into a single `Paragraph`. There are no section headers, tables of assets, signature blocks, or attestation clauses.
- File Storage: Does not persist generated DOCX to disk, cloud storage, or database blob. `pdfUrl` and `docxUrl` on the `Document` record are left `null`.

### 7.2 Violation of Explicit Action & Trigger Discipline
Requirement R10 mandates that document generation must only happen on explicit, authorized action.
- In `src/app/api/checkout/route.ts:56`, `DocumentGenerator.generate(caseId)` is automatically called during checkout, even if the case status is `IN_REVIEW` and requires lawyer approval!
- In `src/app/api/document/download/route.ts:28`, `DocumentGenerator.generate(caseId)` is executed on every single GET request, generating a new buffer and creating a duplicate `Document` database entry every time a file is downloaded.
- In `src/app/customer/document/page.tsx:23-27`, the download link is directly accessible to the customer even if the case is under lawyer review.

---

## 8. Payment & Audit Logging

### 8.1 Payment System
- Tiers: Basic (₹999), Lawyer Review (₹2,999), Complex/NRI (₹4,999).
- Mock payment correctly inserts a record in `prisma.payment` with `status: "SUCCESS"` and `mode: "MOCK"`.
- **Defects**:
  - `/api/checkout` is completely unauthenticated.
  - Multi-table update (`payment.create`, `case.update`, `document.create`, `auditLog.create`) is executed sequentially without `prisma.$transaction`. A failure in document generation leaves payment created but document failed without rollback.

### 8.2 Audit Logging Coverage
Requirement R12 mandates logging 11 specific event types:
1. `LOGIN` — **MISSING** (No log in `src/lib/auth.ts` or `src/app/api/auth`)
2. `CASE_CREATED` — **MISSING** (No log in `src/app/customer/questionnaire/page.tsx`)
3. `QUESTIONNAIRE_SUBMISSION` — **MISSING** (No log in `src/app/api/questionnaire/save`)
4. `CASE_STATUS_CHANGED` — **MISSING** (No independent log on status transitions)
5. `LAWYER_REVIEW` — **MISSING** (Lawyer review feature does not exist)
6. `TEMPLATE_CREATED_UPDATED` — **MISSING** (No template management)
7. `TEMPLATE_APPROVED` — **MISSING** (No template approval)
8. `DOCUMENT_GENERATED` — **MISSING** (No log inside `DocumentGenerator.generate`)
9. `DOCUMENT_DOWNLOADED` — **MISSING** (No log inside `src/app/api/document/download`)
10. `PAYMENT_STATE_CHANGED` — **PARTIALLY LOGGED** (Logged as `PAYMENT_SUCCESS_AND_DOC_GENERATED`, but `actorId` is null)
11. `ADMIN_ACTION` — **MISSING** (No admin actions exist)

**Audit Finding**: Audit logging coverage is less than 10%. Furthermore, logs have no cryptographic hash chaining or immutability enforcement.

---

## 9. Actionable Technical Remediation Plan

To convert this prototype into a production-grade Indian Will-Writing MVP:

1. **Authentication & Routing Fixes**:
   - Fix `src/app/login/page.tsx`: Remove `window.location.href = "/api/auth/session"`; use `signIn("credentials")` callback to redirect based on `session.user.role`.
   - Add password hashing using `bcryptjs` or `argon2` in `prisma/seed.ts` and `src/lib/auth.ts`.
   - Add user registration route and API.

2. **Questionnaire Engine Overhaul**:
   - Fix `src/lib/questionnaire.ts`: Add `hasMinorChildren` (or compute it from `childrenList` dates of birth) to unlock the Guardian section.
   - Implement debounced autosave: Use `useCallback` + lodash/custom debounce (e.g. 1000ms) on `answers` state changes calling `/api/questionnaire/save`.
   - Add visual status pill ("Saved", "Saving...", "Save Failed").
   - Fix resume: Add `useEffect` on mount to fetch existing case answers from `/api/questionnaire?caseId=${caseId}`.
   - Add required field validation before advancing sections.
   - Add a dedicated "Review Answers" step before proceeding to payment.
   - Secure `/api/questionnaire/save` with `getServerSession` and ownership verification.

3. **Lawyer & Admin Portal Construction**:
   - Create `src/app/lawyer/case/[id]/page.tsx` with:
     - Case questionnaire answers view.
     - Workflow flags inspector.
     - Lawyer review notes form saving to `LawyerReview`.
     - Decision buttons: "Approve Case", "Request Clarification", "Reject".
   - Restrict lawyer queries to cases assigned to them or unassigned pool.
   - Build Admin CRUD for users, templates, and clause library.

4. **Document Generation & Template Architecture**:
   - Seed real legal clauses in `Clause` and `ClauseVersion` tables for Indian wills (Testimonium, Revocation, Guardian, Asset schedules, Witness attestation under Indian Succession Act).
   - In `DocumentGenerator`, replace all questionnaire placeholders (assets, beneficiaries, executors) and pull clauses from database records.
   - Save generated DOCX file to disk (e.g., `public/generated-documents/` or secure private storage) and store file path in `Document.docxUrl`.
   - In `/api/document/download`, serve the stored file rather than regenerating and duplicating database records on every request.
   - Guard document generation: Only allow generation if case status is `PAID` (for standard cases) or `APPROVED` (for cases requiring lawyer review).

5. **Payment & Audit Log Hardening**:
   - Wrap checkout operations in `prisma.$transaction`.
   - Authenticate `/api/checkout` with `getServerSession`.
   - Implement comprehensive audit logging helper (`logAuditEvent({ actorId, action, caseId, metadata })`) called on login, case creation, questionnaire save, checkout, document generation, document download, and lawyer actions.
