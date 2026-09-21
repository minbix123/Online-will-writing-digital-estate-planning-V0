# Handoff Report: Database, Schema, Authentication & RBAC Audit

**Author**: Database & Authentication Explorer (`explorer_survey_db_auth`)  
**Target Recipient**: Orchestrator (`parent`) & Downstream Implementers  
**Working Directory**: `E:\Online will-writing & digital estate planning V0\.agents\explorer_survey_db_auth`  
**Date**: 2026-09-16  

---

## 1. Observation

### Obs 1: Plaintext Passwords in Database & Seed Script
- **File**: `prisma/seed.ts:17-51`
- **Verbatim Code**:
  ```ts
  const customer = await prisma.user.create({
    data: {
      name: 'Demo Customer',
      email: 'customer@demo.com',
      password: 'password123', // Dummy password for V0 MVP
      role: 'CUSTOMER'
    }
  })
  ```
- **Observation**: All 4 seed accounts (`customer@demo.com`, `nri@demo.com`, `lawyer@demo.com`, `admin@demo.com`) store the string `'password123'` unhashed in `User.password`.
- **File**: `package.json:13-41` shows no password hashing library (`bcrypt`, `bcryptjs`, `argon2`, `scrypt`) is installed in `dependencies` or `devDependencies`.

### Obs 2: Plaintext Password Comparison & Hardcoded Secret Fallback
- **File**: `src/lib/auth.ts:22-30`
- **Verbatim Code**:
  ```ts
  // In a real app, hash password and compare. For V0 MVP, direct comparison or dummy logic for demo.
  if (user && user.password === credentials.password) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
  ```
- **File**: `src/lib/auth.ts:58`
- **Verbatim Code**:
  ```ts
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_development",
  ```
- **Observation**: Passwords are authenticated via direct string equality. The JWT secret falls back to the hardcoded string `"fallback_secret_for_development"`.

### Obs 3: Broken Client-Side Login Navigation
- **File**: `src/app/login/page.tsx:26-32`
- **Verbatim Code**:
  ```tsx
  window.location.href = "/api/auth/session"; // We can check session and redirect accordingly, 
  // but for V0 MVP, let's just push to a generic entry or fetch session and route.
  fetch('/api/auth/session').then(res => res.json()).then(session => {
     if (session?.user?.role === 'LAWYER') router.push('/lawyer/dashboard');
     else if (session?.user?.role === 'ADMIN') router.push('/admin/dashboard');
     else router.push('/customer/dashboard');
  });
  ```
- **Observation**: Setting `window.location.href = "/api/auth/session"` causes the browser to immediately navigate to the raw JSON dump of NextAuth session, breaking the intended client-side redirect.

### Obs 4: Critical IDOR and Missing Auth in API Routes
- **File**: `src/app/api/questionnaire/save/route.ts:7-44`
- **Verbatim Code**:
  ```ts
  export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    
    // For MVP, we can allow anonymous users to start a case, or require auth.
    // We'll proceed assuming the user is either logged in, or we're running in demo mode.

    try {
      const body = await req.json();
      const { caseId, sectionId, data } = body;
  ```
  - **Observation**: `session` is fetched but never checked for `null`. There is no check that `case.customerId === session.user.id`. Any unauthenticated or cross-customer caller can overwrite answers for any `caseId`.
- **File**: `src/app/api/checkout/route.ts:6-20`
  - **Observation**: `getServerSession` is not imported or used. Any caller can POST `{ caseId, plan }`, creating payment records and transitioning case statuses without authentication.
- **File**: `src/app/api/document/download/route.ts:23-25`
- **Verbatim Code**:
  ```ts
  const user = session.user as any;
  if (!caseData || (caseData.customerId !== user.id && user.role !== "LAWYER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  ```
  - **Observation**: If `user.role === "LAWYER"`, the condition evaluates to `false`, allowing any lawyer to download the document of any customer case regardless of case assignment (`caseData.lawyerId`).

### Obs 5: Missing Migrations and Missing Schema Constraints/Indexes
- **Directory Inspection**: `prisma/` contains only `dev.db`, `schema.prisma`, `seed.ts`. `prisma/migrations/` does not exist.
- **File**: `package.json:11`: `"push": "prisma db push --accept-data-loss"`.
- **File**: `prisma/schema.prisma:46-55`:
  `QuestionnaireAnswer` lacks `@@unique([caseId, questionId])` and `@@index([caseId])`.
- **File**: `prisma/schema.prisma:68-77`:
  `TemplateVersion` lacks `@@unique([templateId, version])`.
- **File**: `prisma/schema.prisma:126-134`:
  `LawyerReview` has no `lawyerId` foreign key to `User`.
- **File**: `prisma/schema.prisma:150-159`:
  `AuditLog` lacks `entity` and `entityId` columns.
- **File**: `prisma/schema.prisma`: Zero secondary indexes on foreign keys (`customerId`, `lawyerId`, `caseId`, `actorId`, `status`).

### Obs 6: Dead Links and Missing Workflow Endpoints
- **File**: `src/app/lawyer/dashboard/page.tsx:56`
  ```tsx
  <Link href={`/lawyer/case/${c.id}`} className="text-blue-600 hover:text-blue-900">Review</Link>
  ```
  - **Directory Search**: `src/app/lawyer` contains only `dashboard/page.tsx`. The path `/lawyer/case/[id]` does not exist, resulting in a 404 error when clicking "Review".
- **File**: `src/server/legal-workflows/tests.ts:60-66`
  - Fake test results logged (`console.log('✅ Test 7...')`) rather than evaluating actual assertions.

---

## 2. Logic Chain

1. **Premise 1 (from Obs 1 & Obs 2)**: Passwords are stored in plaintext in the SQLite database and compared using simple equality. `NEXTAUTH_SECRET` uses a hardcoded fallback string.
   - *Inference*: Anyone with read access to the SQLite file `dev.db` obtains all user passwords instantly. Any attacker on the local network or internet can forge JWT session tokens using the hardcoded secret.

2. **Premise 2 (from Obs 3)**: The login handler explicitly redirects the browser to `window.location.href = "/api/auth/session"`.
   - *Inference*: Standard user login is broken. Users will see a raw JSON dump in their browser rather than being routed to their dashboard.

3. **Premise 3 (from Obs 4)**: Neither `/api/checkout` nor `/api/questionnaire/save` validates session ownership against `case.customerId`. Furthermore, `/api/document/download` allows all lawyers global access to any case document.
   - *Inference*: The application is critically vulnerable to Insecure Direct Object Reference (IDOR) and privilege escalation. An unauthenticated attacker can manipulate answers and trigger payments for any case. Any lawyer can view confidential legal documents of cases they are not assigned to.

4. **Premise 4 (from Obs 5)**: `QuestionnaireAnswer` has no compound unique constraint `@@unique([caseId, questionId])`, and `prisma/migrations` is absent (`db push` used).
   - *Inference*: Concurrent autosaves produce duplicate rows. Database schema is unversioned and cannot be deployed deterministically to production without risk of data loss.

5. **Premise 5 (from Obs 6)**: Lawyer dashboard links to `/lawyer/case/${c.id}` which does not exist.
   - *Inference*: The lawyer review workflow cannot be executed in the current UI.

---

## 3. Caveats

- **No Caveats on Explored Code**: All TS/TSX files, configuration, seed scripts, and schema files in the project were inspected directly via `view_file` and `list_dir`.
- **Environment Interaction Limitation**: Direct terminal command execution (`run_command`) timed out waiting for user approval in this environment; hence, runtime execution was not performed, but static analysis of the complete codebase was fully exhaustive.
- **Mock Payment Provider**: The payment flow is confirmed to be an internal mock (`mode: "MOCK"`, amount stored in Float), which is explicitly acceptable for MVP per R11.

---

## 4. Conclusion

The existing database and authentication layer is in a fragile, proof-of-concept state with critical security and architectural defects that must be resolved before proceeding to feature completion:
1. **Security Emergency**: Replace plaintext passwords with `bcryptjs` hashing in both `prisma/seed.ts` and `src/lib/auth.ts`. Require `NEXTAUTH_SECRET` via `.env`.
2. **Access Control Emergency**: Fix IDOR vulnerabilities on `/api/questionnaire/save`, `/api/checkout`, and `/api/document/download`. Add Next.js Edge Middleware (`src/middleware.ts`) for global session and role enforcement.
3. **Database Integrity**: Add `@@unique([caseId, questionId])`, `@@unique([templateId, version])`, `LawyerReview.lawyerId`, and indexes on foreign keys (`customerId`, `lawyerId`, `caseId`, `status`) in `prisma/schema.prisma`.
4. **Transaction Safety**: Wrap multi-step checkout mutations in `prisma.$transaction`.
5. **UI & Routing Fixes**: Fix the `/login` redirect bug and build the missing `/lawyer/case/[id]` review route.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Plaintext Passwords & Auth Logic**:
   - Inspect `prisma/seed.ts` lines 21, 30, 39, 48. Notice `password: 'password123'`.
   - Inspect `src/lib/auth.ts` line 23. Notice `user.password === credentials.password`.
2. **Verify IDOR on API Endpoints**:
   - Inspect `src/app/api/checkout/route.ts`. Search for `getServerSession`. (It is completely absent).
   - Inspect `src/app/api/questionnaire/save/route.ts` lines 7-15. Notice `session` is fetched but never verified or compared to `case.customerId`.
   - Inspect `src/app/api/document/download/route.ts` line 23. Notice `user.role !== "LAWYER"` allows any lawyer to download any document.
3. **Verify Login Redirect Bug**:
   - Inspect `src/app/login/page.tsx` line 26. Notice `window.location.href = "/api/auth/session"`.
4. **Verify Missing Lawyer Route**:
   - Inspect `src/app/lawyer/` directory. Notice only `dashboard/page.tsx` exists; `case/[id]/page.tsx` is missing.
5. **Verify Missing Indexes & Constraints**:
   - Inspect `prisma/schema.prisma` lines 46-55 (`QuestionnaireAnswer`) and lines 126-134 (`LawyerReview`). Notice missing unique constraints and missing `lawyerId` relation.
