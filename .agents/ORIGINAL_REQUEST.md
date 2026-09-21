# Original User Request

## 2026-09-16T10:26:21Z

# Teamwork Project Prompt

> Status: Launched
> Goal: Build a complete, performant, secure MVP of an online will-preparation and digital estate-planning platform for users in India, starting from the existing V0 codebase and converting it from a proof-of-concept into a genuinely functional application.

## Project

Working directory:
`E:\Online will-writing & digital estate planning V0`

Integrity mode: development

IMPORTANT:
* Work on the existing project.
* Do NOT create an unrelated replacement project.
* Preserve the existing landing page and any functionality that is genuinely working.
* Do NOT assume the previous walkthrough accurately describes the current implementation.
* Inspect the actual codebase before making architectural or implementation decisions.
* Do not use fake functionality to satisfy acceptance criteria.
* Payment may remain a clearly identified mock payment system for this MVP.
* All other core functionality must be real and connected end-to-end.

---

# R1 — CODEBASE AUDIT & PERFORMANCE OPTIMIZATION

First inspect the entire existing application.

Audit:
* Next.js App Router
* Next.js version
* React
* TypeScript
* Prisma
* database
* authentication
* middleware
* API routes
* Server Actions
* React components
* layouts/providers
* questionnaire code
* workflow code
* document generation
* payment implementation
* tests
* configuration
* environment variables
* dependencies

Determine what is:
* functional
* partially functional
* broken
* mocked
* missing
* unnecessarily duplicated

Do not trust README files, walkthroughs, comments, or previous claims without verifying the implementation.

### Performance

The current application is reported to be extremely slow.
Find the actual root causes.
Investigate, measure, and fix:
* Next.js compilation
* Next.js 15 async `searchParams` / `params` usage where applicable
* excessive client-side rendering
* unnecessary `"use client"`
* excessive React rerenders
* useEffect loops
* repeated API requests
* repeated database queries
* inefficient Prisma usage
* repeated PrismaClient construction
* authentication/session overhead
* middleware overhead
* unnecessary polling
* synchronous/blocking operations
* unnecessarily large client bundles
* unnecessary dependencies
* document generation during page rendering
* inefficient data fetching
* excessive logging

Do not simply state that development mode is slow.
Identify measurable bottlenecks and fix them.

The application should:
* start reliably
* navigate without severe freezing
* render pages without unexplained multi-second blocks
* avoid unnecessary repeated requests
* avoid unnecessary database operations

Do not sacrifice correctness or security merely to improve performance.

---

# R2 — DATABASE & BACKEND

Build or repair the actual relational backend.

The conceptual data model must support:
* User
* Case
* QuestionnaireAnswer
* Template
* Clause
* Document
* Payment
* AuditLog

Use proper:
* primary keys
* foreign keys
* relationships
* indexes
* unique constraints
* validation
* timestamps
* transaction boundaries

Evaluate the current Prisma + SQLite architecture.
If it is appropriate for the MVP, retain it.
If the existing architecture has a genuine technical limitation that would prevent the required functionality, select an appropriate alternative and migrate carefully.

Possible technologies may include:
* Prisma
* PostgreSQL
* SQLite
* Supabase
* other appropriate managed infrastructure

Do not introduce external infrastructure merely for the sake of complexity.
Database credentials/secrets must never be exposed to the client.
Critical multi-step operations must use transactions where appropriate.

---

# R3 — AUTHENTICATION & RBAC

Authentication must be real.

Verify the existing demo accounts:
Customer: `customer@demo.com`
NRI Customer: `nri@demo.com`
Lawyer: `lawyer@demo.com`
Admin: `admin@demo.com`
Password: `password123`

Verify actual login and session behavior.

Roles:
* CUSTOMER
* LAWYER
* ADMIN

Server-side authorization is mandatory.
Customers must only access their own cases.
Lawyers must only access cases they are authorized/assigned to.
Admins may access administrative functionality.
Do not rely on hiding UI elements.
Direct URL manipulation, forged IDs, and unauthorized API/server-action calls must be rejected server-side.
Test IDOR and privilege-escalation scenarios.

---

# R4 — CUSTOMER PORTAL

Implement the complete customer experience:
Landing page
→ Register/Login
→ Customer Dashboard
→ Create Case
→ Questionnaire
→ Autosave
→ Resume
→ Review Answers
→ Submit Case
→ Workflow Evaluation
→ Payment
→ Lawyer Review if required
→ Document Generation
→ Download
→ Case History

All operations must use real persisted data.
No fake success messages.
No dead buttons.
No placeholder dashboards.
Page refreshes must preserve state where persistence is expected.

---

# R5 — QUESTIONNAIRE ENGINE

Implement a reusable JSON-driven questionnaire engine.

Support:
* multiple sections
* multiple question types
* required questions
* optional questions
* validation
* conditional questions
* branching
* progress tracking
* back/next navigation
* review
* submission
* resume

### Autosave

Autosave must be debounced.
Do NOT send a database request on every keystroke.
Use:
Input → local state → debounce → persistence

Prevent duplicate/concurrent saves.
The UI must remain responsive while saving.
Display appropriate states such as:
* Saving
* Saved
* Save failed

Saved answers must survive page refresh and later sessions.

---

# R6 — DETERMINISTIC LEGAL WORKFLOW

Implement an isolated, deterministic server-side Legal Workflow Engine.

The workflow engine must evaluate questionnaire answers using explicit rules.
Example flags include:
* `GUARDIAN_REQUIRED`
* `NRI`
* `BUSINESS_INTEREST`
* `EXISTING_WILL`

Rules must be:
* deterministic
* explicit
* testable
* isolated from UI code

AI must NOT independently:
* invent legal clauses
* invent legal requirements
* determine legal validity
* make arbitrary legal decisions

Legal content must originate from explicitly approved templates/clauses.

---

# R7 — TEMPLATE & CLAUSE MANAGEMENT

Implement controlled template/version management.

Templates must have lifecycle states.
Only explicitly approved templates may be used for document generation.
For example:
DRAFT → UNDER_REVIEW → LAWYER_APPROVED → LOCKED/ARCHIVED

The exact state model may be adapted if the existing implementation has a better justified design.
Once a template version is locked/approved for a case, later template changes must not silently alter that case's document source.
Customers must never be allowed to inject arbitrary legal clauses.

---

# R8 — LAWYER PORTAL

Implement a real Lawyer Portal.

Lawyers must be able to:
* view assigned cases
* open authorized cases
* view questionnaire answers
* view workflow flags
* review cases
* add review notes
* update permitted statuses
* approve/reject where appropriate
* access authorized documents

Lawyer access must be enforced server-side.

---

# R9 — ADMIN PORTAL

Implement a real Admin Portal.

Admin functionality should include:
* dashboard statistics
* user management
* case management
* template management
* clause management
* payment visibility
* audit logs

Destructive operations require confirmation.
Administrative operations must be audited.

---

# R10 — DOCUMENT GENERATION

Implement real server-side DOCX generation.

The process must be:
1. Retrieve submitted questionnaire answers.
2. Evaluate deterministic workflow rules.
3. Identify the appropriate approved template.
4. Confirm that the template version is authorized for use.
5. Merge permitted user data.
6. Generate the DOCX server-side.
7. Store document metadata.
8. Create an audit-log entry.
9. Allow authorized users to download the document.

DOCX generation must NOT happen during:
* landing-page rendering
* login
* dashboard loading
* questionnaire rendering
* autosave
* ordinary navigation

It must occur only through an explicit authorized operation.

---

# R11 — PAYMENT

Keep payment processing as an MVP/mock-payment implementation unless a real payment provider is explicitly required.

Supported tiers:
* Basic
* Lawyer Review
* Complex/NRI

Mock payment status must be clearly represented internally.
Do not claim that a real financial transaction occurred.
Payment state must be persisted.
Checkout/state transitions involving multiple database changes must use transactions where appropriate.

---

# R12 — AUDIT LOGGING

Implement detailed audit logging.

At minimum capture:
* login
* case creation
* questionnaire submission
* case status changes
* lawyer review
* template creation/update
* template approval
* document generation
* document download
* payment-state changes
* administrative actions

Audit records should contain:
* actor
* action
* entity
* entity ID
* timestamp
* relevant metadata

Use UTC for storage.
Normal users must not be able to modify or delete audit records.

---

# R13 — SECURITY

Perform a security review of the complete application.

Test for:
* broken authentication
* broken authorization
* IDOR
* privilege escalation
* unauthorized case access
* unauthorized document access
* insecure server actions
* insecure API routes
* password-storage problems
* session vulnerabilities
* CSRF where applicable
* XSS
* SQL injection
* mass assignment
* unsafe file handling
* missing input validation
* missing rate limiting on sensitive endpoints
* exposed secrets
* sensitive data accidentally returned to clients

All sensitive operations must be authorized server-side.
Use secure password hashing/session mechanisms where applicable.
Do not expose secrets in source code.

---

# R14 — TESTING

Select an appropriate testing framework based on the existing stack, such as Vitest/Jest and Playwright where appropriate.

Implement tests for:

### Authentication
* successful login
* invalid login
* role routing
* session handling

### Authorization
* customer isolation
* lawyer authorization
* admin authorization
* direct URL manipulation
* unauthorized API/server-action access

### Questionnaire
* validation
* conditional questions
* persistence
* autosave
* resume

### Workflow
* NRI
* guardian required
* existing will
* business interest
* deterministic rule behavior

### Templates
* approval restrictions
* locked version behavior

### Documents
* authorized generation
* unauthorized generation rejection
* approved template enforcement
* download authorization

### Audit
* required actions create audit records
* audit records cannot be modified by ordinary users

Do not disable tests simply to obtain a passing result.

---

# R15 — UI/UX

Preserve the existing design direction:
Retro Apple / early Mac OS X / early iPhone OS / Aqua / 2000s skeuomorphic inspiration.
The interface must remain original and must not simply clone Apple's interface.
The final product should feel like a premium, trustworthy legal-service application.

Prioritize:
* responsive design
* accessibility
* keyboard navigation
* readable typography
* clear navigation
* loading states
* empty states
* error states
* confirmation states
* useful feedback
* fast interactions
* subtle microinteractions

Do not allow visual polish to compromise application performance.

---

# R16 — PRODUCTION READINESS

Before declaring the MVP complete:

Verify:
* production build succeeds
* TypeScript checks pass
* linting passes where configured
* database migrations work
* seed/demo setup works
* authentication works
* authorization works
* all critical routes work
* no obvious console errors
* no unhandled server errors
* no exposed secrets
* no fake core functionality
* document generation works
* database persistence works
* tests pass

Ensure the project can be started cleanly from a fresh environment using documented setup instructions.

---

# DEVELOPMENT PROTOCOL

Do NOT attempt to blindly generate the entire platform in one pass.
Work incrementally:
1. AUDIT
2. PERFORMANCE FIX
3. AUTHENTICATION
4. DATABASE
5. CUSTOMER CASES
6. QUESTIONNAIRE
7. LEGAL WORKFLOW
8. LAWYER PORTAL
9. ADMIN PORTAL
10. TEMPLATE SYSTEM
11. DOCUMENT GENERATION
12. PAYMENTS
13. AUDIT LOGGING
14. SECURITY
15. TESTING
16. UI POLISH
17. PRODUCTION VERIFICATION

After each major phase:
IMPLEMENT → RUN → TEST → FIX → VERIFY → CONTINUE

Do not proceed while the current phase has obvious blocking errors.
Do not rewrite working functionality unnecessarily.
Do not create duplicate implementations of existing features.
Do not create fake APIs.
Do not create placeholder buttons pretending that functionality exists.
Do not declare completion because files were generated.
A feature is complete only when it works end-to-end with real persisted data and appropriate authorization.

---

# FIRST ACTION

START WITH THE EXISTING CODEBASE.
Do not immediately start generating new features.

First:
1. Inspect the repository.
2. Determine the actual current architecture.
3. Determine what genuinely works.
4. Identify the root causes of the severe slowness.
5. Fix those performance problems.
6. Verify the existing landing page still works.
7. Verify authentication.
8. Verify database connectivity.
9. Run the existing tests.
10. Report the current implementation state and then continue with the next appropriate phase.

The objective is not to produce another walkthrough claiming that the platform exists.
The objective is to turn the existing V0 project into a genuinely functional, secure, performant MVP.

## 2026-09-16T13:26:29Z

[SYSTEM RESUMPTION NOTICE]
Due to a server restart, the previous subagent execution was interrupted.
You are picking up the project mid-execution. 
Milestone 1 (Performance Fixes & Aqua UI) has ALREADY BEEN COMPLETED and verified.
Read `PROJECT.md` to restore your context, then immediately RESUME execution starting with Milestone 2 (Database Schema Hardening, bcrypt, and Edge Middleware RBAC).
Follow the original protocol below.

# Teamwork Project Prompt

> Status: Launched
> Goal: Build a complete, performant, secure MVP of an online will-preparation and digital estate-planning platform for users in India, starting from the existing V0 codebase and converting it from a proof-of-concept into a genuinely functional application.

## Project

Working directory:
`E:\Online will-writing & digital estate planning V0`

Integrity mode: development

IMPORTANT:
* Work on the existing project.
* Do NOT create an unrelated replacement project.
* Preserve the existing landing page and any functionality that is genuinely working.
* Do NOT assume the previous walkthrough accurately describes the current implementation.
* Inspect the actual codebase before making architectural or implementation decisions.
* Do not use fake functionality to satisfy acceptance criteria.
* Payment may remain a clearly identified mock payment system for this MVP.
* All other core functionality must be real and connected end-to-end.

## 2026-09-17T07:01:21Z

# Teamwork Project Prompt

> Status: Ready for launch — awaiting user approval
> Goal: Build a genuinely functional, production-ready MVP of the Online Will-Writing & Digital Estate Planning platform.
> Requested team: [none — teamwork routes from the description]

You are working on an **existing working beta** of an Online Will-Writing & Digital Estate Planning platform.

Working directory: `E:\Online will-writing & digital estate planning V0`
Integrity mode: development

## Requirements

### R1. First: Inspect the Existing Project
Before modifying the architecture, inspect the entire repository (Framework, Runtime, Database, Authentication, API architecture, Routes, Existing tests, Document generation, etc.). Test the existing beta in an actual browser and determine which functionality is real, mocked, or broken. Preserve working functionality whenever possible.

### R2. End-to-End Workflow & Roles
Implement a real end-to-end workflow (Landing Page -> Registration/Login -> Dashboard -> Create Case -> Questionnaire with Autosave -> Submit -> Lawyer Assignment -> Lawyer Review -> Approval -> Document Generation -> Storage -> Download).
Support CUSTOMER, LAWYER, and ADMIN roles with server-side RBAC and protected resources.

### R3. Relational Database & State Machine
Use a proper relational schema modeling Users, Cases, QuestionnaireResponses, Payments, Templates, Clauses, GeneratedDocuments, and AuditLogs. Implement a controlled case state machine where transitions happen only through authorized server-side actions. Ensure data integrity (no orphaned records, no impossible states).

### R4. Questionnaire Engine
Implement a JSON/schema-driven questionnaire engine supporting multiple data types, conditional branching, and required fields. The branching logic must be deterministic. Include debounced autosave with real-time save indicators, and progressive disclosure UX.

### R5. Legal Workflow & Document Generation
Implement an isolated, deterministic server-side Legal Workflow Engine. AI must NOT invent legal clauses or make arbitrary legal decisions. Implement controlled template/version management. Generate DOCX documents server-side using approved templates and persisted case data, and store them securely using object storage.

### R6. Payment & Audit Logging
Implement a payment abstraction (mock provider acceptable for MVP) with persistent payment states and transactional operations. Implement detailed, immutable audit logging for all critical system actions.

### R7. Security & Privacy
Perform a complete security review covering broken authentication, IDOR, privilege escalation, CSRF, XSS, and rate limiting. Enforce all sensitive operations server-side. Do not log sensitive questionnaire answers unless necessary.

### R8. UI/UX & Production Readiness
Implement a distinctive "Modern 2026 product + early-2000s Apple/Aqua inspiration" visual design system. Ensure responsive design, accessibility, empty states, and error handling. Run a production build, fix TS/lint errors, provide deployment documentation, and prepare safe development seed data.

## Verification Resources
The user requires explicit browser testing and security testing of the application. The final output must pass all provided test cases in the "SECURITY TESTING" and "AUTOMATED TESTING" sections.

## Acceptance Criteria

### Security & Access Control
- [ ] Customer A trying to access Customer B's case returns 403/404.
- [ ] Customer calling lawyer endpoint returns Unauthorized.
- [ ] Lawyer trying to access unassigned case returns Unauthorized.
- [ ] Customer trying to approve own case returns Unauthorized.
- [ ] Customer trying to download another user's document returns Unauthorized.
- [ ] User manipulating case status in request is Rejected.
- [ ] User manually calling admin API is Rejected server-side.

### Customer Workflow
- [ ] Registration, login, verification, and password reset work.
- [ ] Case creation, questionnaire (with conditional logic, validation, autosave, and resume) work.
- [ ] Case tracking, document viewing, and downloading work.

### Lawyer & Admin Workflows
- [ ] Lawyer authentication, assignment, case access, review, notes, change requests, and approval work.
- [ ] Admin authentication, user/case management, lawyer assignment, template/clause management, payment visibility, and audit logs work.

### Platform Integrity
- [ ] Database is persistent, authentication is secure, and RBAC is enforced server-side.
- [ ] Documents are private, templates/clauses are versioned, and documents are generated strictly from approved sources.
- [ ] Tests pass, typecheck passes, lint passes, and the production build succeeds.

## 2026-09-20T12:10:51Z

[SYSTEM RESUMPTION & SCOPE CHANGE NOTICE]
Due to a system reboot, your previous run was interrupted.
You are picking up the project mid-execution.
Milestones 1 through 4 have ALREADY BEEN COMPLETED and verified.
Milestone 5 Implementation was finished, and the Milestone 5 Gate Verification was currently running.

Additionally, the USER has requested a pivot in the visual design language (changing from Aqua to OLED Dark Mode). 
Please read `PROJECT.md` to restore your context, immediately RESUME execution starting with finalizing Milestone 5, and then refactor the UI/UX according to the updated R8 requirement before declaring the final product complete.

# Teamwork Project Prompt

> Status: Launched
> Goal: Build a genuinely functional, production-ready MVP of the Online Will-Writing & Digital Estate Planning platform.
> Requested team: [none — teamwork routes from the description]

You are working on an **existing working beta** of an Online Will-Writing & Digital Estate Planning platform.

Working directory: `E:\Online will-writing & digital estate planning V0`
Integrity mode: development

## Requirements

### R1. First: Inspect the Existing Project
Before modifying the architecture, inspect the entire repository (Framework, Runtime, Database, Authentication, API architecture, Routes, Existing tests, Document generation, etc.). Test the existing beta in an actual browser and determine which functionality is real, mocked, or broken. Preserve working functionality whenever possible.

### R2. End-to-End Workflow & Roles
Implement a real end-to-end workflow (Landing Page -> Registration/Login -> Dashboard -> Create Case -> Questionnaire with Autosave -> Submit -> Lawyer Assignment -> Lawyer Review -> Approval -> Document Generation -> Storage -> Download).
Support CUSTOMER, LAWYER, and ADMIN roles with server-side RBAC and protected resources.

### R3. Relational Database & State Machine
Use a proper relational schema modeling Users, Cases, QuestionnaireResponses, Payments, Templates, Clauses, GeneratedDocuments, and AuditLogs. Implement a controlled case state machine where transitions happen only through authorized server-side actions. Ensure data integrity (no orphaned records, no impossible states).

### R4. Questionnaire Engine
Implement a JSON/schema-driven questionnaire engine supporting multiple data types, conditional branching, and required fields. The branching logic must be deterministic. Include debounced autosave with real-time save indicators, and progressive disclosure UX.

### R5. Legal Workflow & Document Generation
Implement an isolated, deterministic server-side Legal Workflow Engine. AI must NOT invent legal clauses or make arbitrary legal decisions. Implement controlled template/version management. Generate DOCX documents server-side using approved templates and persisted case data, and store them securely using object storage.

### R6. Payment & Audit Logging
Implement a payment abstraction (mock provider acceptable for MVP) with persistent payment states and transactional operations. Implement detailed, immutable audit logging for all critical system actions.

### R7. Security & Privacy
Perform a complete security review covering broken authentication, IDOR, privilege escalation, CSRF, XSS, and rate limiting. Enforce all sensitive operations server-side. Do not log sensitive questionnaire answers unless necessary.

### R8. UI/UX & Production Readiness
Design a sophisticated dark mode interface optimized for OLED displays and extended use, featuring carefully crafted contrast levels and subtle color accents that reduce eye strain while maintaining visual hierarchy. Use a refined dark color palette with true blacks for OLED efficiency, complemented by carefully selected dark grays and subtle, non-jarring accent colors. Implement smooth transitions between different darkness levels, with interactive elements that provide clear visual feedback without harsh brightness changes. Create UI components with subtle depth through strategic use of darker and lighter elements, avoiding pure white text and using softer alternatives for better readability. Include thoughtful dark mode considerations like reduced contrast for secondary information, subtle shadows that work in dark contexts, and careful handling of image assets to prevent harsh visual transitions. Design state changes and hover effects that feel natural in dark environments, with special attention to maintaining readability and reducing eye strain during extended use. Structure information with clear visual hierarchy while maintaining the calming benefits of dark mode. The overall experience should feel professional and refined while providing the benefits of dark mode - reduced eye strain, better battery life on OLED displays, and elegant aesthetics suitable for both day and night use.
Ensure responsive design, accessibility, empty states, and error handling. Run a production build, fix TS/lint errors, provide deployment documentation, and prepare safe development seed data.

## Verification Resources
The user requires explicit browser testing and security testing of the application. The final output must pass all provided test cases in the "SECURITY TESTING" and "AUTOMATED TESTING" sections.

## Acceptance Criteria

### Security & Access Control
- [ ] Customer A trying to access Customer B's case returns 403/404.
- [ ] Customer calling lawyer endpoint returns Unauthorized.
- [ ] Lawyer trying to access unassigned case returns Unauthorized.
- [ ] Customer trying to approve own case returns Unauthorized.
- [ ] Customer trying to download another user's document returns Unauthorized.
- [ ] User manipulating case status in request is Rejected.
- [ ] User manually calling admin API is Rejected server-side.

### Customer Workflow
- [ ] Registration, login, verification, and password reset work.
- [ ] Case creation, questionnaire (with conditional logic, validation, autosave, and resume) work.
- [ ] Case tracking, document viewing, and downloading work.

### Lawyer & Admin Workflows
- [ ] Lawyer authentication, assignment, case access, review, notes, change requests, and approval work.
- [ ] Admin authentication, user/case management, lawyer assignment, template/clause management, payment visibility, and audit logs work.

### Platform Integrity
- [ ] Database is persistent, authentication is secure, and RBAC is enforced server-side.
- [ ] Documents are private, templates/clauses are versioned, and documents are generated strictly from approved sources.
- [ ] Tests pass, typecheck passes, lint passes, and the production build succeeds.

## 2026-09-20T12:40:03Z

The user has provided a new instruction for the final phase of the project: 'after the ui ux is set optmise the website for faster local deployment and do not run any unnecessary tests'. Please update the project plan to prioritize local deployment speed optimization and explicitly bypass any redundant or unnecessary verification/testing gates going forward to speed up delivery.
