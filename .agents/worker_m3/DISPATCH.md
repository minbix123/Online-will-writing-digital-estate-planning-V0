## 2026-09-17T07:03:14Z
You are the Implementation Worker for Milestone 3: Customer Portal, Case Lifecycle & Debounced Questionnaire Engine.
Working directory: E:\Online will-writing & digital estate planning V0\.agents\worker_m3
Project root: E:\Online will-writing & digital estate planning V0
Parent conversation ID: 59624314-f71e-456e-93f6-c2287d67bede

MANDATORY READING:
1. E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md
2. E:\Online will-writing & digital estate planning V0\PROJECT.md
3. E:\Online will-writing & digital estate planning V0\.agents\explorer_m3_1\handoff.md (Registration & Case Lifecycle Analysis)
4. E:\Online will-writing & digital estate planning V0\.agents\explorer_m3_2\handoff.md (Questionnaire Engine, 500ms Debounce & Conditional Branching)
5. E:\Online will-writing & digital estate planning V0\.agents\explorer_m3_3\handoff.md (Customer Dashboard, Resume & Save IDOR Security)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership:
You own and must implement the following files exclusively:
1. `src/app/api/auth/register/route.ts`:
   - Parse `name`, `email`, `password`. Normalize email with `.toLowerCase().trim()`.
   - Check duplicate email: return HTTP 409 Conflict `{ error: "User with this email already exists" }`.
   - Validate password length (min 6 chars).
   - Hash password using `bcrypt.hash(password, 10)` (using `bcryptjs`).
   - Create user with role `"CUSTOMER"` in Prisma.
   - Emit audit log via `createAuditLog({ actorId: user.id, action: "USER_REGISTERED", entity: "User", entityId: user.id })` (or direct Prisma auditLog create).
   - Return HTTP 201 `{ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } }`. NEVER return password.
2. `src/app/register/page.tsx`:
   - Customer registration page matching the platform's Aqua skeuomorphic design language (`.bg-aqua-pinstripes`, `.aqua-window`, `.aqua-input`, `.aqua-btn-primary`).
   - Form fields: Full Name, Email Address, Password, Confirm Password.
   - Client-side error handling, loading states, and redirect to `/login` or `/customer/dashboard` upon successful registration.
   - Include link back to `/login` ("Already have an account? Sign In").
3. Links in `src/app/login/page.tsx` and `src/app/page.tsx`:
   - In `src/app/login/page.tsx`, add link "Don't have an account? Register here" pointing to `/register`.
   - In `src/app/page.tsx`, add "Register" / "Sign Up" button in the header nav next to Login.
4. `src/app/api/cases/route.ts`:
   - POST handler: Authenticate via `getServerSession(authOptions)`. If no session, return 401.
     Create new Case for `(session.user as any).id`, `status: "DRAFT"`, `flags: "STANDARD"`.
     Emit audit log `CASE_CREATED`. Return HTTP 201 `{ case: newCase }`.
   - GET handler: Authenticate via `getServerSession(authOptions)`. Return user's cases `prisma.case.findMany({ where: { customerId: session.user.id }, orderBy: { createdAt: "desc" }, include: { documents: true, reviews: true } })`.
5. `src/app/customer/dashboard/page.tsx`:
   - Styled with Aqua skeuomorphic CSS (`.aqua-card`, `.aqua-badge`, `.aqua-btn-primary`, `.aqua-table`).
   - Display active cases with Case ID, Created Date, Status Badges (`DRAFT`, `SUBMITTED`, `IN_REVIEW`, `APPROVED`, `GENERATED`, `PAID`, `COMPLETED`).
   - For `DRAFT` cases, display "Continue Questionnaire →" button linking to `/customer/questionnaire?caseId=${case.id}`.
   - For `APPROVED` / `PAID` / `GENERATED` cases, display "View Documents →" button.
   - Header button "+ Start New Will": navigates to `/customer/questionnaire` (or triggers POST `/api/cases` and redirects).
   - Handle empty state with a welcoming Aqua card.
6. `src/lib/questionnaire.ts`:
   - In the `children` section (around lines 42-78), add the missing question `hasMinorChildren`:
     ```ts
     {
       id: "hasMinorChildren",
       label: "Do you have any minor children (under 18 years)?",
       type: "select",
       options: ["No", "Yes"],
       required: true,
       conditions: [{ field: "hasChildren", operator: "equals", value: "Yes" }],
     }
     ```
     This unlocks the `guardian` section when user answers Yes, allowing the downstream legal rule engine to detect `GUARDIAN_REQUIRED`.
7. `src/app/api/questionnaire/save/route.ts`:
   - Require session: `const session = await getServerSession(authOptions); if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });`
   - Validate body: `caseId`, `sectionId`, `data`.
   - Verify case existence and ownership:
     `const existingCase = await prisma.case.findUnique({ where: { id: caseId } });`
     If not found, return 404.
     If `existingCase.customerId !== (session.user as any).id && (session.user as any).role !== "ADMIN"`, return 403 Forbidden `{ error: "Forbidden: You do not own this case" }`.
   - Atomic upsert using `prisma.questionnaireAnswer.upsert`:
     ```ts
     const savedAnswer = await prisma.questionnaireAnswer.upsert({
       where: {
         caseId_questionId: {
           caseId,
           questionId: sectionId
         }
       },
       update: {
         answerData: JSON.stringify(data),
         questionnaireVersion: "v1.0"
       },
       create: {
         caseId,
         questionId: sectionId,
         questionnaireVersion: "v1.0",
         answerData: JSON.stringify(data)
       }
     });
     ```
   - Return HTTP 200 `{ success: true, updatedAt: new Date().toISOString() }`.
8. `src/app/customer/questionnaire/page.tsx`:
   - Await `searchParams` Promise for Next.js 16.
   - Query `caseData` with `include: { answers: true }`.
   - Reconstruct `initialAnswers`: iterate over `caseData.answers`, parse each JSON `answerData` and merge into an `initialAnswers` dictionary.
   - Pass `initialAnswers` to `<QuestionnaireEngine caseId={caseId} initialAnswers={initialAnswers} />`.
9. `src/components/QuestionnaireEngine.tsx`:
   - Accept `initialAnswers?: Record<string, any>` prop and initialize `answers` state with `initialAnswers || {}`.
   - Implement 500ms debounced autosave on answer changes:
     - Use a debounce timer (`useRef` / `setTimeout`) of 500ms.
     - When any input changes, update local state immediately, set status to saving, and after 500ms POST to `/api/questionnaire/save`.
     - Manage save status: `'idle' | 'saving' | 'saved' | 'error'`.
     - Render clear visual status indicators in the Aqua UI header:
       - Saving: Aqua pulsing badge "Saving..."
       - Saved: Green Aqua badge "All changes saved" with timestamp
       - Error: Amber/Red badge "Save failed - retrying..."
     - Flush pending save when user clicks "Next" or "Previous" so no answers are missed.
   - Conditional branching:
     - Evaluates conditions dynamically against current `answers`.
     - When `hasChildren === "Yes"` and `hasMinorChildren === "Yes"`, the `guardian` section is included in active sections.
   - Progress bar calculation:
     - Compute actual percentage based on completed required questions in active sections.
   - Beautiful Aqua / skeuomorphic UI with pill buttons, pinstripes, and glossy cards.

Verification Requirements:
1. `node "node_modules/typescript/bin/tsc" --noEmit` must pass with 0 errors.
2. `node "node_modules/next/dist/bin/next" build` must compile all routes cleanly.
3. `node tests/runner.js` must pass 131/131 tests with zero regressions.
4. Write and run a comprehensive verification script in `.agents/worker_m3/verify_m3.js` testing:
   - Registration of a new user, checking duplicate rejection (409) and bcrypt hash in DB
   - Case creation via POST `/api/cases`
   - Debounced save and atomic upsert in `QuestionnaireAnswer`
   - IDOR rejection on `/api/questionnaire/save` with another user
   - Resume hydration: confirming answers fetched from DB match saved answers
   - Conditional branching: checking that `hasMinorChildren` unlocks `guardian`
5. Document all changes in `changes.md` and write `handoff.md`.
6. Send completion message to parent orchestrator.
