# Scope: Milestone 3 — Customer Portal, Case Lifecycle & Debounced Questionnaire Engine

## Architecture
- **Registration & Auth**: Next.js App Router route `/register` invoking registration server action/API with `bcryptjs.hash(password, 10)`.
- **Case Management**: `/api/cases` GET and POST handlers guarded by NextAuth session.
- **Customer Dashboard**: `/customer/dashboard` server/client component displaying active cases, status, timestamps, and resume buttons.
- **Questionnaire Engine**: `src/components/QuestionnaireEngine.tsx` with `useCallback` debounced auto-save (500ms), state management for `isSaving`, `lastSavedAt`, `saveError`, section steps, and progress indicator.
- **Questionnaire Persistence**: `/api/questionnaire/save` with strict `case.customerId === session.user.id` verification and Prisma upsert on `[caseId, questionId]`.
- **Conditional Branching**: Declarative questionnaire schema in `src/lib/questionnaire.ts` supporting dependent questions (e.g. `hasMinorChildren` -> guardian fields).

## Milestones & Tasks
| # | Task | Target Files | Verification | Status |
|---|------|-------------|--------------|--------|
| 1 | Customer Registration | `src/app/register/page.tsx`, `src/app/api/auth/register/route.ts` | Register new user, verify hashed password in DB, login with new user | PLANNED |
| 2 | Case Creation & Dashboard | `src/app/customer/dashboard/page.tsx`, `src/app/api/cases/route.ts` | Create draft case, view case list with status badges & resume links | PLANNED |
| 3 | Questionnaire Engine & 500ms Debounce | `src/components/QuestionnaireEngine.tsx`, `/customer/questionnaire/page.tsx` | Visual saving indicators, rapid typing debounce, persisted answers | PLANNED |
| 4 | Save API & IDOR Security | `src/app/api/questionnaire/save/route.ts` | Upsert into QuestionnaireAnswer, reject non-owner access with 403 | PLANNED |
| 5 | Conditional Branching & Dynamic Fields | `src/lib/questionnaire.ts`, `QuestionnaireEngine.tsx` | Toggle `hasMinorChildren`, verify guardian fields show/hide | PLANNED |
| 6 | Resume on Mount / Refresh | `src/app/customer/questionnaire/page.tsx` | Load persisted answers on refresh, form populated with saved data | PLANNED |
| 7 | Full Gate Verification | All above | Worker + 2 Reviewers + 2 Challengers + Auditor | PLANNED |

## Interface Contracts
- **Case Creation**: POST `/api/cases` -> `{ case: { id: string, customerId: string, status: "DRAFT", createdAt: string } }`
- **Questionnaire Save**: POST `/api/questionnaire/save` `{ caseId: string, questionId: string, answerData: any }` -> `{ success: true, answer: QuestionnaireAnswer }`
- **Questionnaire Fetch**: GET `/api/cases/[id]` or `/api/questionnaire?caseId=...` -> `{ answers: Record<string, any> }`
- **Security Guard**: `session?.user?.id === case.customerId`, else return HTTP 403 Forbidden.
