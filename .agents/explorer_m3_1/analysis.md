# Milestone 3 Investigation Analysis: Customer Registration & Case Lifecycle

## Executive Summary
This investigation analyzed the customer registration flow and case lifecycle architecture for Milestone 3 of the Indian Online Will-Writing & Digital Estate Planning Platform MVP. Currently, neither the customer registration page (`src/app/register/page.tsx`) nor the registration API route (`src/app/api/auth/register/route.ts`) nor the case lifecycle API (`src/app/api/cases/route.ts`) exist in the codebase. Case creation currently occurs implicitly as a side effect inside the Server Component of `/customer/questionnaire/page.tsx`. The database schema (`prisma/schema.prisma`) is already hardened with proper relational integrity, indexes, and constraints. NextAuth is configured with `bcryptjs` in `src/lib/auth.ts`, enabling session retrieval via `getServerSession(authOptions)`.

---

## 1. Investigation Focus 1: `src/app/register/page.tsx`

### 1.1 Existence & Current State
- **File Existence**: `src/app/register/page.tsx` does **NOT** exist.
- **Current Entry Points**:
  - The landing page (`src/app/page.tsx`) only provides a navigation link to `/login` and a CTA button ("Start Your Will") pointing to `/login`.
  - The login page (`src/app/login/page.tsx`) does not have a link to register a new user.
  - As a result, new customers have no user interface to sign up unless demo accounts are used.

### 1.2 Proposed UI Structure & Theme Compliance
To maintain visual consistency with the established Retro Apple / Aqua / skeuomorphic design language defined in `src/app/globals.css`:
- **Theme Elements**:
  - Background: `.bg-aqua-pinstripes` (Classic Mac OS X pinstripe background).
  - Main Container: `.aqua-window` or `.aqua-card` with subtle glass gradients, soft borders (`rgba(185, 195, 210, 0.7)`), and dual inner highlights (`inset 0 1px 0 rgba(255, 255, 255, 0.95)`).
  - Titlebar: `.aqua-titlebar` with `.aqua-traffic-lights` (red, yellow, green glass dots) and an `.aqua-badge` indicating "Customer Registration".
  - Button Styling: Primary submission button using `.aqua-btn .aqua-btn-primary` (gel blue gradient with inner highlights, text shadow, and press animation); secondary links styled using `.aqua-btn .aqua-btn-secondary` or standard muted text link.
  - Input Fields: Inset fields using `.aqua-inset-well` and `.aqua-glow-focus` with clear floating/top labels.

### 1.3 Form Inputs & Validation
- **Required Inputs**:
  1. `name`: Full legal name (string, trimmed, required).
  2. `email`: Email address (email type, trimmed, lowercased, required).
  3. `password`: Password (string, minimum 6 or 8 characters, required).
  4. `confirmPassword`: Password confirmation (must match password).
- **Client-Side Validation**:
  - Validate all fields are non-empty before submission.
  - Email regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
  - Password length check (`password.length >= 6`).
  - Passwords equality check (`password === confirmPassword`).
  - Clear, accessible error messages in an Aqua alert banner (`bg-red-50 text-red-700 border border-red-200 rounded-lg p-3`).
  - Active submission state: `isSubmitting` / `loading` to disable the submit button and prevent duplicate submissions.

### 1.4 Registration & Post-Registration Flow
1. User fills the form and submits.
2. Form executes a POST request to `/api/auth/register` with `{ name, email, password }`.
3. If response status is `201 Created`:
   - Seamless auto-login: Execute `signIn("credentials", { redirect: false, email, password })`.
   - On successful sign-in, redirect user to `/customer/dashboard`.
   - Fallback: redirect to `/login?registered=true` with a success toast/banner.
4. If response status is `409 Conflict`:
   - Display: `"An account with this email address already exists. Please sign in instead."`
5. If response status is `400 Bad Request`:
   - Display specific validation error message returned by the server.
6. If response status is `500`:
   - Display fallback error: `"Registration failed due to a server error. Please try again later."`

### 1.5 Cross-Navigation Enhancements
- In `src/app/register/page.tsx`: Include `"Already have an account? Sign in"` pointing to `/login`.
- In `src/app/login/page.tsx`: Include `"Don't have an account? Register here"` pointing to `/register`.
- In `src/app/page.tsx`: Add a `"Register"` button in the header navigation capsule next to `"Login"`.

---

## 2. Investigation Focus 2: `src/app/api/auth/register/route.ts`

### 2.1 Existence & Current State
- **File Existence**: `src/app/api/auth/register/route.ts` does **NOT** exist.
- `src/app/api/auth` currently contains only `[...nextauth]/route.ts`.

### 2.2 Endpoint Specification
- **Method**: `POST`
- **Authentication**: Public route (no session required). Note: `src/middleware.ts` correctly excludes `/api/auth/*` from restriction.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securePassword123"
  }
  ```

### 2.3 Step-by-Step Processing Logic
1. **Request Parsing & Validation**:
   - Parse JSON safely with `await req.json()`.
   - Validate field presence: `name`, `email`, `password`.
   - If missing: Return HTTP `400 Bad Request`:
     ```json
     { "error": "Name, email, and password are required" }
     ```
   - Validate email format using standard regex. If invalid: Return HTTP `400 Bad Request`.
   - Validate password minimum length (`password.length >= 6`). If too short: Return HTTP `400 Bad Request` with `"Password must be at least 6 characters"`.
2. **Email Normalization & Duplicate Prevention**:
   - Normalize email: `const normalizedEmail = email.toLowerCase().trim();`
   - Query Prisma for existing user:
     ```ts
     const existing = await prisma.user.findUnique({
       where: { email: normalizedEmail }
     });
     if (existing) {
       return NextResponse.json(
         { error: "User with this email already exists" },
         { status: 409 }
       );
     }
     ```
3. **Password Hashing**:
   - Use `bcryptjs.hash(password, 10)` (salt rounds = 10), matching `prisma/seed.ts` and `src/lib/auth.ts`:
     ```ts
     import bcrypt from "bcryptjs";
     const hashedPassword = await bcrypt.hash(password, 10);
     ```
4. **User Creation**:
   - Role must default to `"CUSTOMER"`:
     ```ts
     const user = await prisma.user.create({
       data: {
         name: name.trim(),
         email: normalizedEmail,
         password: hashedPassword,
         role: "CUSTOMER",
       },
       select: {
         id: true,
         name: true,
         email: true,
         role: true,
         createdAt: true,
       }
     });
     ```
   - **Security Guard**: `password` is strictly omitted from the returned payload.
5. **Audit Logging**:
   - Record registration event in `prisma.auditLog`:
     ```ts
     await prisma.auditLog.create({
       data: {
         actorId: user.id,
         action: "USER_REGISTERED",
         entity: "User",
         entityId: user.id,
         metadata: JSON.stringify({ email: user.email, role: user.role }),
       }
     });
     ```
6. **HTTP Response**:
   - Return HTTP `201 Created`:
     ```json
     {
       "user": {
         "id": "cuid...",
         "name": "Jane Doe",
         "email": "jane@example.com",
         "role": "CUSTOMER",
         "createdAt": "2026-09-16T..."
       },
       "message": "User registered successfully"
     }
     ```

---

## 3. Investigation Focus 3: `src/app/api/cases/route.ts`

### 3.1 Existence & Current State
- **File Existence**: `src/app/api/cases/route.ts` does **NOT** exist.
- **Current Case Creation Workaround**:
  - Currently in `src/app/customer/questionnaire/page.tsx` (lines 24-36), if a user loads `/customer/questionnaire` without a `caseId` query param, the Server Component creates a case on-the-fly:
    ```ts
    if (!caseId) {
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
  - This implicit creation creates an architectural gap:
    - No explicit POST endpoint exists for client apps or dashboard actions.
    - Pre-rendering or bot crawlers hitting `/customer/questionnaire` could trigger unintentional case creations.
    - No audit log is generated upon case creation.

### 3.2 POST Handler Specification (`/api/cases`)
- **Authentication**:
  ```ts
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  ```
- **Role Enforcement**:
  - Customers and Admins may create cases.
  - If role is `"LAWYER"`, reject with `403 Forbidden` (`"Lawyers cannot create customer draft cases"`).
- **Creation Logic**:
  ```ts
  const userId = (session.user as any).id;
  const newCase = await prisma.case.create({
    data: {
      customerId: userId,
      status: "DRAFT",
      flags: "STANDARD",
    },
    include: {
      customer: {
        select: { id: true, name: true, email: true }
      }
    }
  });
  ```
- **Audit Log Emission**:
  ```ts
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "CASE_CREATED",
      entity: "Case",
      entityId: newCase.id,
      caseId: newCase.id,
      metadata: JSON.stringify({ status: newCase.status, flags: newCase.flags }),
    }
  });
  ```
- **Response**: HTTP `201 Created`:
  ```json
  {
    "case": {
      "id": "cuid...",
      "customerId": "user_cuid...",
      "status": "DRAFT",
      "flags": "STANDARD",
      "createdAt": "2026-09-16T..."
    }
  }
  ```

### 3.3 GET Handler Specification (`/api/cases`)
- **Authentication**:
  ```ts
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  ```
- **Role-Based Scoping (RBAC & IDOR Protection)**:
  - If `role === "CUSTOMER"`:
    - Scope strictly to `customerId: (session.user as any).id`:
      ```ts
      const cases = await prisma.case.findMany({
        where: { customerId: (session.user as any).id },
        orderBy: { createdAt: "desc" },
        include: { documents: true, reviews: true }
      });
      ```
  - If `role === "ADMIN"`:
    - Return all cases across the system with customer metadata:
      ```ts
      const cases = await prisma.case.findMany({
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { id: true, name: true, email: true } }, documents: true, reviews: true }
      });
      ```
  - If `role === "LAWYER"`:
    - Return assigned cases or cases needing review:
      ```ts
      const cases = await prisma.case.findMany({
        where: {
          OR: [
            { lawyerId: (session.user as any).id },
            { lawyerId: null, status: { in: ["IN_REVIEW", "PAID", "SUBMITTED"] } }
          ]
        },
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { id: true, name: true, email: true } }, documents: true, reviews: true }
      });
      ```
- **Response**: HTTP `200 OK`:
  ```json
  { "cases": [ ... ] }
  ```

---

## 4. Investigation Focus 4: `prisma/schema.prisma` Inspection

### 4.1 Schema Verification
The `prisma/schema.prisma` was inspected and verified to contain the necessary models and relational configurations:

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  password      String?   // Stores bcryptjs salt rounds 10 hash
  image         String?
  role          String    @default("CUSTOMER") // CUSTOMER, LAWYER, ADMIN
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  cases         Case[]    @relation("CustomerCases")
  assignedCases Case[]    @relation("LawyerCases")
  lawyerReviews LawyerReview[] @relation("LawyerReviews")
  auditLogs     AuditLog[]

  @@index([email])
  @@index([role])
}

model Case {
  id            String    @id @default(cuid())
  customerId    String
  customer      User      @relation("CustomerCases", fields: [customerId], references: [id], onDelete: Cascade)
  lawyerId      String?
  lawyer        User?     @relation("LawyerCases", fields: [lawyerId], references: [id])
  
  status        String    @default("DRAFT") // DRAFT, PAID, IN_REVIEW, CLARIFICATION_REQUESTED, REVISION_REQUIRED, APPROVED, DELIVERED
  flags         String?   // Comma-separated list of flags: STANDARD, GUARDIAN_REQUIRED, NRI, FOREIGN_ASSETS, BUSINESS_INTEREST, COMPLEX_FAMILY, EXISTING_WILL, LEGAL_REVIEW_REQUIRED, MANUAL_CONSULTATION_REQUIRED
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  answers       QuestionnaireAnswer[]
  documents     Document[]
  reviews       LawyerReview[]
  payments      Payment[]
  auditLogs     AuditLog[]

  @@index([customerId])
  @@index([lawyerId])
  @@index([status])
  @@index([createdAt])
}

model QuestionnaireAnswer {
  id                  String   @id @default(cuid())
  caseId              String
  case                Case     @relation(fields: [caseId], references: [id], onDelete: Cascade)
  questionnaireVersion String  // E.g., "v1.0"
  questionId          String
  sectionId           String?
  answerData          String   // JSON payload of the answer
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([caseId, questionId])
  @@index([caseId])
  @@index([sectionId])
}

model AuditLog {
  id          String   @id @default(cuid())
  actorId     String?
  actor       User?    @relation(fields: [actorId], references: [id])
  action      String
  entity      String?  // e.g., Case, Document, User, Payment, Template
  entityId    String?  // ID of the target entity
  caseId      String?
  case        Case?    @relation(fields: [caseId], references: [id])
  metadata    String?  // JSON string
  createdAt   DateTime @default(now())
  timestamp   DateTime @default(now()) // alias for backwards compatibility

  @@index([actorId])
  @@index([entity, entityId])
  @@index([createdAt])
}
```

### 4.2 Relational Integrity Assessment
1. **Primary & Foreign Keys**: Primary keys use `cuid()`. Foreign key from `Case.customerId` to `User.id` includes `onDelete: Cascade`.
2. **Indexes**: Secondary indexes exist on `User.email`, `User.role`, `Case.customerId`, `Case.lawyerId`, `Case.status`, `Case.createdAt`.
3. **Compound Constraints**: `QuestionnaireAnswer` enforces `@@unique([caseId, questionId])`, guaranteeing answers for a specific question can be upserted cleanly without duplicate records.
4. **AuditLog**: Retains optional relations to `User` and `Case`, allowing logging of system and unauthenticated actions while linking registered user actions.

---

## 5. Investigation Focus 5: `src/lib/auth.ts` & Session Handling in Route Handlers

### 5.1 NextAuth Configuration Analysis
In `src/lib/auth.ts`:
```ts
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (isValid) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).name = token.name as string;
        (session.user as any).email = token.email as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_development",
};
```

### 5.2 Retrieving Session in Route Handlers
In Next.js App Router Route Handlers, session retrieval is performed via:
```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;
  ...
}
```
- **Validation**:
  - `session` will be `null` if no valid JWT session cookie is present.
  - `session.user` contains `id`, `name`, `email`, `role`.
  - Because `DefaultSession["user"]` in NextAuth v4 does not include `id` and `role` by default, properties are accessed via `(session.user as any).id` and `(session.user as any).role`, matching the conventions established across `src/app/customer/dashboard/page.tsx` and `src/app/customer/questionnaire/page.tsx`.

---

## 6. Implementation Blueprint for Milestone 3

| Component | Target File | Actions Required |
|-----------|-------------|------------------|
| Customer Registration Page | `src/app/register/page.tsx` | Create `"use client"` page with Aqua Mac OS X window styling, form inputs (`name`, `email`, `password`, `confirmPassword`), validation, auto-login or redirect on 201, and links to `/login`. |
| Login Page Cross-Link | `src/app/login/page.tsx` | Add link `"Don't have an account? Register here"` to `/register`. |
| Landing Page Header | `src/app/page.tsx` | Add `"Register"` button in the navigation capsule bar alongside `"Login"`. |
| Registration API | `src/app/api/auth/register/route.ts` | Validate inputs (required, email regex, min password 6), normalize email (`.toLowerCase().trim()`), check duplicate email (409), hash with `bcrypt.hash(password, 10)`, create User with role `"CUSTOMER"`, emit `USER_REGISTERED` audit log, return 201 without password. |
| Cases API | `src/app/api/cases/route.ts` | POST: authenticate via `getServerSession(authOptions)`, check role, create Case with `status: "DRAFT"`, emit `CASE_CREATED` audit log, return 201.<br>GET: authenticate via `getServerSession(authOptions)`, query cases scoped by role (`customerId === session.user.id` for CUSTOMER), return 200. |
| Customer Dashboard | `src/app/customer/dashboard/page.tsx` | Connect "+ Start New Will" button to explicit case creation or POST `/api/cases`, refine UI with Aqua skeuomorphic cards and status badges. |
