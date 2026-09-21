# Handoff Report: Customer Dashboard, Questionnaire Resume, Save API & IDOR Security

**Agent**: Explorer 3 (Milestone 3 — Customer Portal, Case Lifecycle & Debounced Questionnaire Engine)  
**Date**: 2026-09-16  
**Status**: Complete (Hard Handoff)  
**Artifact**: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m3_3\analysis.md`  

---

## 1. Observation

1. **Customer Dashboard Data Fetching (`src/app/customer/dashboard/page.tsx` lines 11–18)**:
   ```tsx
   const cases = await prisma.case.findMany({
     where: { customerId: (session.user as any).id },
     orderBy: { createdAt: "desc" },
     include: {
       documents: true,
       reviews: true
     }
   });
   ```
   Direct Prisma query inside an async Server Component. There is no call to an API endpoint, and `/api/cases` does not exist in `src/app/api/`.

2. **Customer Dashboard Action Links (`src/app/customer/dashboard/page.tsx` lines 45–58)**:
   ```tsx
   {c.status === "DRAFT" && (
     <Link href={`/customer/questionnaire?caseId=${c.id}`} className="text-blue-600 hover:underline font-medium">
       Continue Questionnaire →
     </Link>
   )}
   {c.status === "GENERATED" || c.status === "APPROVED" || c.status === "FINAL" || c.status === "PAID" ? (
     <Link href={`/customer/document?caseId=${c.id}`} className="text-blue-600 hover:underline font-medium">
       View Documents →
     </Link>
   ) : null}
   {(c.status === "IN_REVIEW" || c.status === "CLARIFICATION_REQUESTED") && (
     <span className="text-orange-500 font-medium">Under Lawyer Review</span>
   )}
   ```
   If `c.status === "SUBMITTED"`, no action or status badge is rendered.

3. **Start New Will Navigation (`src/app/customer/dashboard/page.tsx` lines 26–28)**:
   ```tsx
   <Link href="/customer/questionnaire" className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-500">
     + Start New Will
   </Link>
   ```
   It links to `/customer/questionnaire` without a `caseId`.

4. **Async searchParams Handling (`src/app/customer/questionnaire/page.tsx` lines 7–23)**:
   ```tsx
   interface QuestionnairePageProps {
     searchParams: Promise<{ caseId?: string | string[] }>;
   }
   export default async function QuestionnairePage({ searchParams }: QuestionnairePageProps) {
     ...
     const resolvedParams = await searchParams;
     let caseId = typeof resolvedParams?.caseId === "string"
       ? resolvedParams.caseId
       : Array.isArray(resolvedParams?.caseId)
       ? resolvedParams.caseId[0]
       : undefined;
   ```
   Correctly awaits `searchParams` Promise for Next.js 16.

5. **Missing Answers in Case Query (`src/app/customer/questionnaire/page.tsx` lines 39–46)**:
   ```tsx
   const caseData = await prisma.case.findUnique({ where: { id: caseId } });
   if (!caseData || caseData.customerId !== (session.user as any).id) {
     redirect("/customer/dashboard");
   }

   return (
     <div className="min-h-screen bg-gray-50 p-4 md:p-8">
       <QuestionnaireEngine caseId={caseId} />
     </div>
   );
   ```
   `caseData` is queried without `include: { answers: true }`. `QuestionnaireEngine` is passed only `caseId={caseId}` with no initial answers.

6. **Empty Initial State in Engine (`src/components/QuestionnaireEngine.tsx` lines 44–47)**:
   ```tsx
   export default function QuestionnaireEngine({ caseId }: { caseId: string }) {
     const router = useRouter();
     const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
     const [answers, setAnswers] = useState<Record<string, any>>({});
   ```
   `answers` state initializes to `{}` on every mount, with no fetch or hydration logic.

7. **Save API Missing Auth and Ownership Check (`src/app/api/questionnaire/save/route.ts` lines 6–18)**:
   ```tsx
   export async function POST(req: Request) {
     const session = await getServerSession(authOptions);
     
     // For MVP, we can allow anonymous users to start a case, or require auth.
     // We'll proceed assuming the user is either logged in, or we're running in demo mode.

     try {
       const body = await req.json();
       const { caseId, sectionId, data } = body;

       if (!caseId || !sectionId) {
         return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
       }
   ```
   Zero checks on `session` validity; zero checks verifying `session.user.id === case.customerId`.

8. **Save API Non-Atomic Upsert (`src/app/api/questionnaire/save/route.ts` lines 20–43)**:
   ```tsx
   const existing = await prisma.questionnaireAnswer.findFirst({
     where: { caseId, questionId: sectionId }
   });
   if (existing) {
     await prisma.questionnaireAnswer.update({
       where: { id: existing.id },
       data: { answerData: JSON.stringify(data) }
     });
   } else {
     await prisma.questionnaireAnswer.create({
       data: {
         caseId,
         questionnaireVersion: "v1.0",
         questionId: sectionId,
         answerData: JSON.stringify(data)
       }
     });
   }
   ```
   Uses sequential `findFirst` and `create/update` instead of `prisma.questionnaireAnswer.upsert` with compound unique `caseId_questionId`.

9. **Missing `hasMinorChildren` Question (`src/lib/questionnaire.ts` lines 43–88)**:
   `guardian` section specifies:
   `conditions: [{ field: "hasChildren", operator: "equals", value: "Yes" }, { field: "hasMinorChildren", operator: "equals", value: "Yes" }]`.
   `children` section only has `hasChildren` and `childrenList` repeater. `hasMinorChildren` is absent.

10. **Test Suite Execution Command & Results**:
    Executed `node tests/runner.js`. Output:
    `Total Tests: 131, Passed: 131, Failed: 0, Total Time: 30370ms. ALL TESTS PASSED.`

---

## 2. Logic Chain

1. **From Observation 5 & 6 to Resume Broken**:
   Because `src/app/customer/questionnaire/page.tsx` does not fetch answers and passes only `caseId` to `QuestionnaireEngine`, and because `QuestionnaireEngine` initializes `answers` to empty `{}` without any client-side query, any page reload or subsequent visit via the "Continue Questionnaire" button resets the form fields to blank. Therefore, state persistence across sessions and refreshes is completely broken in the UI.

2. **From Observation 7 to IDOR & Auth Vulnerability**:
   Because `/api/questionnaire/save` does not enforce `session` and does not check case ownership against `session.user.id`, any client can POST an arbitrary `caseId` and overwrite any other user's stored questionnaire answers, representing both Broken Authentication (CWE-306) and IDOR (CWE-639).

3. **From Observation 8 to Race Condition**:
   Because `/api/questionnaire/save` issues a separate `findFirst` followed by `create`, rapid debounced autosaves or concurrent requests can encounter a race condition where two requests observe `existing === null` and both attempt `create`, triggering a unique constraint error on `@@unique([caseId, questionId])`. Replacing this with `prisma.questionnaireAnswer.upsert({ where: { caseId_questionId: { caseId, questionId: sectionId } } })` guarantees atomic persistence.

4. **From Observation 9 to Conditional Branching Blockage**:
   Because the `guardian` section requires `hasMinorChildren === "Yes"` but the questionnaire never asks this question, the condition evaluates to `false` in standard user flows. Adding `hasMinorChildren` to `children` section questions resolves this without altering existing schema or test contracts.

5. **From Observation 10 to Regression Safety**:
   Because all 131 tests pass and test assertions in `test_f5_autosave_resume.js` already store and reload section answers keyed by `questionId: sectionId` with JSON stringified payloads, aligning `page.tsx` and `QuestionnaireEngine.tsx` with this pattern will achieve 100% contract compliance with zero regressions.

---

## 3. Caveats

- Customer Registration (`/register` and `/api/auth/register`) was not implemented yet in the repository; this investigation confirmed the need for its creation as scheduled in Milestone 3 Task 1.
- The Lawyer review and Admin portals belong to Milestone 5, but the IDOR guard in the save API must allow `session.user.role === "ADMIN"` for future admin support.
- No caveats regarding database schema migrations: the schema already contains all necessary relations, indexes, and compound unique constraints (`@@unique([caseId, questionId])`).

---

## 4. Conclusion

1. **Save API (`/api/questionnaire/save/route.ts`)**: Must enforce session authentication (401), verify case ownership (`session.user.id === case.customerId` or `ADMIN`) (403), and use atomic `prisma.questionnaireAnswer.upsert`.
2. **Questionnaire Hydration (`/customer/questionnaire/page.tsx` & `QuestionnaireEngine.tsx`)**: Must fetch `caseData.answers` on the server, parse the JSON, pass `initialAnswers` to `QuestionnaireEngine`, and initialize state with it.
3. **Autosave Engine (`QuestionnaireEngine.tsx`)**: Must add a 500ms debounced save triggered by `answers` change, with visual Saving / Saved / Failed indicators in the header.
4. **Questionnaire Config (`src/lib/questionnaire.ts`)**: Must add the missing `hasMinorChildren` yes/no question to the `children` section.
5. **Dashboard & Case Creation (`src/app/customer/dashboard/page.tsx` & `src/app/api/cases/route.ts`)**: Must create `POST /api/cases` for explicit case creation and style dashboard cards with Aqua skeuomorphic CSS classes.

---

## 5. Verification Method

1. **Automated Test Suite**:
   Run:
   ```powershell
   node tests/runner.js
   ```
   Expected: 131/131 tests pass with zero errors.

2. **Autosave and Resume Specific Tests**:
   Run:
   ```powershell
   node tests/tier1_features/test_f5_autosave_resume.js
   node tests/tier2_boundaries/test_f5_boundaries.js
   ```
   Expected: All 10 tests pass, confirming compound unique upsert semantics and reload reconstruction.

3. **IDOR Security Verification**:
   Run:
   ```powershell
   node tests/tier1_features/test_f2_rbac_idor.js
   ```
   Expected: All 5 tests pass, confirming cross-customer isolation and IDOR rejection.

4. **Code Inspection**:
   - Verify `src/app/api/questionnaire/save/route.ts` includes `401 Unauthorized` check and `403 Forbidden` case ownership check.
   - Verify `src/app/customer/questionnaire/page.tsx` includes `include: { answers: true }` and passes `initialAnswers` to `QuestionnaireEngine`.
