# Milestone 3 Implementation Changes

**Date**: 2026-09-17  
**Agent**: Implementation Worker (`worker_m3`)  
**Scope**: Customer Portal, Case Lifecycle & Debounced Questionnaire Engine  

---

## 1. Summary of Changes

Milestone 3 establishes a fully functional, secure, and resilient customer experience:
- New customers can register, receive bcrypt-hashed accounts, and immediately sign in.
- Customers can create and manage will cases with server-side customer isolation and audit trails.
- The questionnaire engine features debounced autosave (500ms), visual status indicators, hydration of stored answers upon reload, and accurate progress calculation.
- The questionnaire schema properly asks `hasMinorChildren` when `hasChildren === "Yes"`, unlocking the `guardian` nomination section and triggering the deterministic legal workflow engine.
- All API routes enforce strict server-side authentication and IDOR ownership guards.
- The UI adheres to the retro Apple / early Mac OS X Aqua skeuomorphic design system.

---

## 2. File-by-File Changes

### 2.1 `src/app/api/auth/register/route.ts`
- **Purpose**: Authenticated customer account creation.
- **Key Logic**:
  - Validates full legal name, email regex, and password minimum length (6 chars).
  - Normalizes email with `.toLowerCase().trim()`.
  - Performs duplicate email check returning HTTP 409 Conflict.
  - Hashes password with `bcrypt.hash(password, 10)` (bcryptjs).
  - Creates user in database with default role `"CUSTOMER"`.
  - Creates an audit log entry (`USER_REGISTERED`) with UTC timestamp.
  - Returns HTTP 201 with sanitized user payload (omits password hash).

### 2.2 `src/app/register/page.tsx`
- **Purpose**: Skeuomorphic customer sign-up page.
- **Key Logic**:
  - Styled with `.bg-aqua-pinstripes`, `.aqua-window`, `.aqua-titlebar`, `.aqua-traffic-lights`, `.aqua-badge`, `.aqua-btn-primary`.
  - Form fields: Full Legal Name, Email Address, Password, Confirm Password.
  - Client-side validation, password match verification, loading states, and error handling.
  - Automatically signs in the user upon successful registration via NextAuth `signIn("credentials")` and redirects to `/customer/dashboard`.
  - Links to `/login` for existing users.

### 2.3 `src/app/login/page.tsx` and `src/app/page.tsx`
- **Purpose**: Cross-linking navigation between landing, login, and registration.
- **Key Logic**:
  - In `src/app/login/page.tsx`: Added "Don't have an account? Register" link pointing to `/register`.
  - In `src/app/page.tsx`: Added "Register" button alongside "Login" in the Aqua top navigation bar.

### 2.4 `src/app/api/cases/route.ts`
- **Purpose**: Case lifecycle management endpoints.
- **Key Logic**:
  - `GET`: Authenticates session via `getServerSession(authOptions)`. Returns user-scoped cases filtered by `customerId: session.user.id`, ordered by `createdAt: desc`, including documents and reviews.
  - `POST`: Authenticates session (401 if missing). Creates a new `Case` for the user with `status: "DRAFT"` and `flags: "STANDARD"`. Creates a `CASE_CREATED` audit log entry. Returns HTTP 201 with the created case.

### 2.5 `src/app/customer/dashboard/page.tsx`
- **Purpose**: Customer dashboard and case tracking.
- **Key Logic**:
  - Restyled using full Aqua skeuomorphic CSS classes (`.aqua-window`, `.aqua-card`, `.aqua-badge`, `.aqua-btn-primary`, `.aqua-titlebar`).
  - Displays case history with Case ID, formatted dates, documents count, and contextual status badges (`DRAFT`, `SUBMITTED`, `IN_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED`, `PAID`, `GENERATED`, `FINAL`).
  - Contextual buttons: "Resume Questionnaire →" for `DRAFT` cases; "View Documents →" for `APPROVED`/`PAID`/`GENERATED`/`FINAL` cases; status banners for in-review cases.
  - "+ Start New Will" header button and empty-state welcoming card.

### 2.6 `src/lib/questionnaire.ts`
- **Purpose**: Questionnaire configuration schema.
- **Key Logic**:
  - Added `required: true` to `hasMinorChildren` yes/no question inside `children` section conditional on `hasChildren === "Yes"`.
  - Allows `guardian` section (`conditions: [{ field: "hasChildren", operator: "equals", value: "Yes" }, { field: "hasMinorChildren", operator: "equals", value: "Yes" }]`) to unlock dynamically.

### 2.7 `src/app/api/questionnaire/save/route.ts`
- **Purpose**: Secure, atomic questionnaire autosave endpoint.
- **Key Logic**:
  - Requires active session; returns HTTP 401 Unauthorized if unauthenticated.
  - Validates request body (`caseId`, `sectionId`, `data`).
  - Verifies case existence (404 if not found).
  - Enforces IDOR ownership check: `existingCase.customerId !== user.id && user.role !== "ADMIN"` returns HTTP 403 Forbidden.
  - Uses atomic `prisma.questionnaireAnswer.upsert` with compound key `caseId_questionId: { caseId, questionId: sectionId }` to eliminate race conditions and prevent duplicate rows.
  - Returns HTTP 200 `{ success: true, updatedAt: ISOString }`.

### 2.8 `src/app/customer/questionnaire/page.tsx`
- **Purpose**: Server-rendered questionnaire wrapper with answer hydration.
- **Key Logic**:
  - Awaits Next.js 16 `searchParams` Promise.
  - Verifies case ownership (`caseData.customerId !== session.user.id` redirects to dashboard).
  - Queries case with `include: { answers: true }`.
  - Reconstructs `initialAnswers` dictionary by parsing stored JSON `answerData` records.
  - Passes `initialAnswers` prop to `<QuestionnaireEngine caseId={caseId} initialAnswers={initialAnswers} />`.

### 2.9 `src/components/QuestionnaireEngine.tsx`
- **Purpose**: Debounced client-side questionnaire engine with Aqua styling.
- **Key Logic**:
  - Accepts `initialAnswers` prop and initializes state with loaded data.
  - 500ms debounced autosave using `useRef` debounce timer and synced data ref.
  - Visual status indicators in Aqua titlebar:
    - Saving... (Aqua pulsing badge with animation)
    - All changes saved at HH:MM:SS (Green badge with timestamp)
    - Save failed - retrying... (Red badge with retry button)
    - Autosave Active (Idle badge)
  - Flushes pending saves immediately when clicking Next, Previous, or Section tabs to guarantee zero data loss.
  - Progress calculation accurately mirrors `calculateProgress` (ratio of answered required questions in active sections).
  - Dynamic conditional branching for sections and questions.
  - Aqua skeuomorphic UI with pinstripes, window chrome, traffic lights, and recessed well inputs.

### 2.10 `.agents/worker_m3/verify_m3.js`
- **Purpose**: Dedicated Milestone 3 integration verification test suite.
- **Key Logic**:
  - Test 1: Registration logic, email normalization, password validation, bcrypt hashing, audit logging, duplicate conflict check.
  - Test 2: Case creation in DRAFT, audit logging, customer isolation in case queries.
  - Test 3: IDOR prevention check (rejecting cross-customer saves) and atomic upsert validation.
  - Test 4: Multi-section answer persistence and resume hydration.
  - Test 5: Conditional branching (`hasMinorChildren`) and `LegalWorkflowEngine` flag evaluation (`GUARDIAN_REQUIRED`).
