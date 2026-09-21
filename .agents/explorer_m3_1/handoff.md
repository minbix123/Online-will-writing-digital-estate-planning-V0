# Handoff Report: Explorer 1 (Milestone 3)
**Topic**: Customer Registration & Case Lifecycle Analysis

## 1. Observation
1. **Registration Page**:
   - Tool `find_by_name` in `E:\Online will-writing & digital estate planning V0\src` for `*register*` returned `Found 0 results`.
   - `src/app/register/page.tsx` does not exist.
   - In `src/app/login/page.tsx`, line 145-153 renders the login form submit button, but contains no link or reference to `/register` or account registration.
   - In `src/app/page.tsx` lines 21-28, the navigation bar contains only a Link to `/login` (`<Link href="/login" className="aqua-btn aqua-btn-secondary ...">Login</Link>`).
2. **Registration Route Handler**:
   - `src/app/api/auth/register/route.ts` does not exist. Directory listing of `src/app/api/auth` shows only `[...nextauth]`.
3. **Case Management Route Handler**:
   - `src/app/api/cases/route.ts` does not exist. Directory listing of `src/app/api` shows only `auth`, `checkout`, `document`, and `questionnaire`.
   - In `src/app/customer/questionnaire/page.tsx` lines 24-36, case creation is implemented implicitly inside the Server Component:
     ```ts
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
   - In `src/app/customer/dashboard/page.tsx` line 26, the button `<Link href="/customer/questionnaire" ...>+ Start New Will</Link>` routes directly to the questionnaire without first creating a case via an API route.
4. **Database Schema**:
   - `prisma/schema.prisma` lines 10-28 define the `User` model with `id` (cuid), `email` (unique, indexed), `password` (string?), and `role` (default "CUSTOMER", indexed).
   - Lines 30-53 define the `Case` model with `customerId` (foreign key to `User` with `onDelete: Cascade`), `status` (default "DRAFT", indexed), `flags` (string?), and secondary indexes on `[customerId]`, `[lawyerId]`, `[status]`, `[createdAt]`.
   - Lines 55-69 define `QuestionnaireAnswer` with `@@unique([caseId, questionId])`.
   - Lines 186-202 define `AuditLog` with `actorId`, `action`, `entity`, `entityId`, `caseId`, `metadata`, `createdAt`, `timestamp`.
5. **Authentication Configuration**:
   - `src/lib/auth.ts` lines 19-35 use `credentials.email.toLowerCase().trim()`, lookup `prisma.user.findUnique({ where: { email } })`, and compare passwords using `bcrypt.compare(credentials.password, user.password)`.
   - Lines 42-59 implement `jwt` and `session` callbacks transferring `id`, `name`, `email`, and `role` to `session.user`.
   - Password hashing in `prisma/seed.ts` line 23 uses `bcrypt.hashSync('password123', 10)`.
   - In `src/middleware.ts` lines 55-61, route protection covers `/customer/:path*`, `/lawyer/:path*`, `/admin/:path*`, leaving `/register` and `/api/auth/*` publicly accessible.

## 2. Logic Chain
1. **From Observation 1 & 2**: Because neither `src/app/register/page.tsx` nor `src/app/api/auth/register/route.ts` exists, outside of pre-seeded demo accounts (`customer@demo.com`, `nri@demo.com`, `lawyer@demo.com`, `admin@demo.com`), new real users cannot sign up or interact with the platform.
2. **From Observation 4 & 5**: Because `prisma/seed.ts` and `src/lib/auth.ts` already use `bcryptjs` with salt rounds 10 and normalize emails with `.toLowerCase().trim()`, the registration endpoint `/api/auth/register/route.ts` must use identical normalization and `bcrypt.hash(password, 10)` to ensure accounts created via registration can successfully log in via NextAuth.
3. **From Observation 3**: Because `src/app/api/cases/route.ts` does not exist and case creation is currently embedded as a side effect of visiting `/customer/questionnaire`, creating an explicit POST `/api/cases` endpoint is necessary to fulfill Feature 11 ("Customer Registration & Case Creation: Allow new customer registration and explicit POST case creation") and the contract specified in `SCOPE.md`.
4. **From Observation 4 & 5**: In App Router Route Handlers, session validation can be securely performed with `const session = await getServerSession(authOptions)`. In GET `/api/cases`, filtering by `customerId: (session.user as any).id` strictly prevents IDOR vulnerabilities and enforces customer isolation.

## 3. Caveats
1. **Session Typing**: NextAuth's default TypeScript types do not include `id` and `role` on `session.user`. In the existing code, properties are cast via `(session.user as any).id` and `(session.user as any).role`. While functional, adding a `src/types/next-auth.d.ts` module augmentation will improve type safety.
2. **Dashboard UI Refinement**: `src/app/customer/dashboard/page.tsx` currently uses standard Tailwind classes instead of the Aqua / skeuomorphic CSS classes defined in `src/app/globals.css`. It can be refreshed with `.aqua-card` and `.aqua-badge` as part of M3 UI tasks.
3. **Questionnaire Save API**: Analysis of `/api/questionnaire/save` was scoped to Explorer 2, but initial inspection confirms it currently lacks session checks and IDOR protection.

## 4. Conclusion
The database schema (`prisma/schema.prisma`) and authentication configuration (`src/lib/auth.ts`) are completely ready and hardened to support customer registration and case lifecycle APIs. 
To implement Milestone 3 Tasks 1 & 2:
1. Create `src/app/api/auth/register/route.ts` with email normalization (`.toLowerCase().trim()`), duplicate check (409), `bcrypt.hash(password, 10)`, user creation with role `"CUSTOMER"` (201), and `USER_REGISTERED` audit log entry.
2. Create `src/app/register/page.tsx` with Aqua / skeuomorphic styling (`.bg-aqua-pinstripes`, `.aqua-window`, `.aqua-btn-primary`), form fields (`name`, `email`, `password`, `confirmPassword`), client validation, and auto-login/redirect flow.
3. Add cross-links between `/login`, `/register`, and `/page.tsx` header nav.
4. Create `src/app/api/cases/route.ts` with POST handler (creating DRAFT case for `session.user.id` and logging `CASE_CREATED`) and GET handler (returning user-scoped cases).

## 5. Verification Method
1. **File Inspection**:
   - Inspect `src/app/register/page.tsx` to verify Aqua CSS classes, form inputs, and validation logic.
   - Inspect `src/app/api/auth/register/route.ts` to verify `bcrypt.hash`, duplicate check, and omission of password from response.
   - Inspect `src/app/api/cases/route.ts` to verify `getServerSession(authOptions)` and `customerId: session.user.id` scoping.
2. **Automated Test Execution**:
   - Run `node tests/runner.js --tier=1` to ensure all existing Tier 1 features pass without regressions.
   - Run `node tests/runner.js` to verify all 4 tiers of tests succeed.
3. **End-to-End Registration & Case Creation Verification**:
   - Send POST to `/api/auth/register` with test user `{ name: "New User", email: "newuser@test.com", password: "password123" }` -> verify HTTP 201 response.
   - Attempt duplicate registration with same email -> verify HTTP 409 response.
   - Authenticate as newly registered user -> verify successful session creation.
   - Send POST to `/api/cases` with authenticated session -> verify HTTP 201 and case with status `DRAFT`.
   - Send GET to `/api/cases` -> verify returned case belongs to the authenticated user.
