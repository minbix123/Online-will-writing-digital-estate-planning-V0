# Handoff Report — Explorer 2: Milestone 4 (Template & Clause System, Versioning, and Lifecycle States)

## 1. Observation

### 1.1 Prisma Schema: Models, Compound Constraints, and Lifecycle States
Directly inspected in `prisma/schema.prisma`:
- **Template Model** (lines 71–80):
  ```prisma
  model Template {
    id          String   @id @default(cuid())
    name        String
    description String?
    status      String   @default("DRAFT") // DRAFT, UNDER_REVIEW, LAWYER_APPROVED, LOCKED, ARCHIVED
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    versions    TemplateVersion[]
  }
  ```
- **TemplateVersion Model** (lines 82–95):
  ```prisma
  model TemplateVersion {
    id          String   @id @default(cuid())
    templateId  String
    template    Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
    version     Int
    content     String   // The text/structure of the template
    status      String   @default("DRAFT") // DRAFT, UNDER_REVIEW, LAWYER_APPROVED, LOCKED, ARCHIVED
    createdAt   DateTime @default(now())

    documents   Document[]

    @@unique([templateId, version])
    @@index([templateId])
  }
  ```
  - Line 93 defines the compound unique constraint: `@@unique([templateId, version])`.
  - Relation to `Template` is 1-to-many, with `onDelete: Cascade`.
  - Relation to `Document` is 1-to-many (`documents Document[]`).
- **Clause Model** (lines 97–106):
  ```prisma
  model Clause {
    id          String   @id @default(cuid())
    name        String
    description String?
    status      String   @default("DRAFT") // DRAFT, UNDER_REVIEW, LAWYER_APPROVED, LOCKED, ARCHIVED
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    versions    ClauseVersion[]
  }
  ```
- **ClauseVersion Model** (lines 108–119):
  ```prisma
  model ClauseVersion {
    id          String   @id @default(cuid())
    clauseId    String
    clause      Clause   @relation(fields: [clauseId], references: [id], onDelete: Cascade)
    version     Int
    content     String
    status      String   @default("DRAFT") // DRAFT, UNDER_REVIEW, LAWYER_APPROVED, LOCKED, ARCHIVED
    createdAt   DateTime @default(now())

    @@unique([clauseId, version])
    @@index([clauseId])
  }
  ```
  - Line 117 defines the compound unique constraint: `@@unique([clauseId, version])`.
  - Relation to `Clause` is 1-to-many, with `onDelete: Cascade`.
- **Document Model** (lines 130–152):
  ```prisma
  model Document {
    id                String   @id @default(cuid())
    caseId            String
    case              Case     @relation(fields: [caseId], references: [id], onDelete: Cascade)
    templateVersionId String
    templateVersion   TemplateVersion @relation(fields: [templateVersionId], references: [id])
    
    status            String   @default("DRAFT") // DRAFT, GENERATED, UNDER_REVIEW, CHANGES_REQUESTED, APPROVED, FINAL, SUPERSEDED
    clauseVersions    String   // Comma-separated list of ClauseVersion IDs used
    ruleVersions      String   // Information about rules applied
    
    pdfUrl            String?
    docxUrl           String?
    filePath          String?  // Storage path on disk (e.g. storage/documents/...)
    fileSize          Int?     // Size in bytes
    fileHash          String?  // SHA256 integrity hash
    
    createdAt         DateTime @default(now())
    updatedAt         DateTime @updatedAt

    @@index([caseId])
    @@index([status])
  }
  ```

### 1.2 Seeded Templates and Clauses in `prisma/seed.ts`
Directly inspected in `prisma/seed.ts`:
- **5 Legal Clauses Seeded** (lines 62–116):
  1. `STANDARD_DECLARATION` (v1, `status: 'LAWYER_APPROVED'`, description: 'Standard Revocation & Declaration Clause under Indian Succession Act, 1925')
  2. `EXECUTORS` (v1, `status: 'LAWYER_APPROVED'`, description: 'Appointment of Executors and Alternates for estate administration under Indian Succession Act, 1925')
  3. `GUARDIAN` (v1, `status: 'LAWYER_APPROVED'`, description: 'Testamentary Guardian Clause for minor children under Section 9 of the Hindu Minority and Guardianship Act, 1956')
  4. `NRI_ASSETS` (v1, `status: 'LAWYER_APPROVED'`, description: 'Cross-Border and NRI Foreign Assets Clause compliant with FEMA regulations and respective local succession laws')
  5. `BUSINESS_SUCCESSION` (v1, `status: 'LAWYER_APPROVED'`, description: 'Business Succession and Commercial Enterprise Interest Transfer Clause')
  - Both `Clause` and child `ClauseVersion` are created with `status: 'LAWYER_APPROVED'`.
- **2 Templates Seeded** (lines 118–148):
  1. `Comprehensive Indian Last Will & Testament`:
     - Template status: `LAWYER_APPROVED`
     - Child version: `version: 1`, `status: 'LAWYER_APPROVED'`, content template with placeholders `{{fullName}}`, `{{address}}`, `{{clausesContent}}`.
     - This is the single active, approved template in the database.
  2. `Draft Custom Will Template`:
     - Template status: `DRAFT`
     - Child version: `version: 1`, `status: 'DRAFT'`.

### 1.3 Document Generator Implementation (`src/server/document-generator.ts`)
Directly inspected in `src/server/document-generator.ts`:
- **Template Query** (lines 29–43):
  ```typescript
  const template = await prisma.template.findFirst({
    where: { status: "LAWYER_APPROVED" },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1
      }
    }
  });

  if (!template || template.versions.length === 0) {
    throw new Error("No approved template found");
  }

  const templateVersion = template.versions[0];
  let content = templateVersion.content;
  ```
- **Clause Handling** (lines 50–57):
  ```typescript
  // Add dynamically generated clauses
  if (answersMap["hasMinorChildren"] === "Yes") {
    content += `\n\n<p>GUARDIANSHIP: I appoint ${answersMap["guardianName"] || 'the named guardian'} to be the guardian of my minor children.</p>`;
  }

  if (answersMap["isNRI"] === "Yes") {
    content += `\n\n<p>FOREIGN ASSETS: This will also covers my assets located in ${answersMap["countryOfResidence"] || 'foreign countries'}.</p>`;
  }
  ```
  - Neither `prisma.clause` nor `prisma.clauseVersion` is queried.
- **Document Persistence Record** (lines 97–105):
  ```typescript
  await prisma.document.create({
    data: {
      caseId,
      templateVersionId: templateVersion.id,
      status: "GENERATED",
      clauseVersions: "v1", // Dummy for MVP
      ruleVersions: "v1",
    }
  });
  ```
  - `clauseVersions` is a dummy string `"v1"`.
  - `filePath`, `fileSize`, `fileHash` are not populated.
  - The generated buffer is returned in memory, but not written to `storage/documents/...`.
- **Download Endpoint** (`src/app/api/document/download/route.ts` lines 27–36):
  ```typescript
  const { docxBuffer } = await DocumentGenerator.generate(caseId);
  return new NextResponse(new Uint8Array(docxBuffer), { ... });
  ```
  - Every download call re-invokes `generate(caseId)` and inserts a new row in `prisma.document`, rather than serving existing persisted documents.

### 1.4 Legal Workflow Engine & Test Suite
- `src/server/legal-workflows/index.ts`:
  - `LegalWorkflowEngine.evaluate(answers)` returns `{ flags: string[], requiresLawyerReview: boolean }`.
  - Does NOT return `recommendedClauses: string[]` despite `PROJECT.md` line 85 specifying `{ flags: string[], requiresLawyerReview: boolean, recommendedClauses: string[] }`.
- `src/server/legal-workflows/tests.ts` (lines 60–66):
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
  - Tests 7–10 are mocked via `console.log` rather than asserting real database queries or API behaviors.
- `node tests/runner.js`:
  - Executed successfully: 131/131 tests passed in 30.58s.
  - Test suites include `test_f8_template_lifecycle.js` (5 tests), `test_f8_boundaries.js` (5 tests), `test_f9_docx_generation.js` (5 tests), `test_combinations.js` (15 tests), `test_scenarios.js` (6 scenarios).

### 1.5 Missing APIs / Server Actions
- Searched `src/app/api` and `src/app/admin`:
  - Zero API routes or server actions exist for creating, updating, approving, locking, or versioning templates or clauses.
  - `src/app/admin/dashboard/page.tsx` renders a static read-only list of templates and their statuses.

---

## 2. Logic Chain

1. **Schema Integrity**:
   - Observations in 1.1 show that `prisma/schema.prisma` already possesses the complete relational foundation: `Template`, `TemplateVersion`, `Clause`, `ClauseVersion`, and `Document`.
   - The compound unique constraints `@@unique([templateId, version])` and `@@unique([clauseId, version])` strictly prevent duplicate version numbers at the database engine level.
   - The 5 lifecycle statuses (`DRAFT`, `UNDER_REVIEW`, `LAWYER_APPROVED`, `LOCKED`, `ARCHIVED`) are designated in schema comments and tested in `test_f8_template_lifecycle.js`.
2. **Seed Data State**:
   - Observations in 1.2 demonstrate that `prisma/seed.ts` seeds 5 clauses, all marked `status: 'LAWYER_APPROVED'` at both `Clause` and `ClauseVersion` (v1) levels, covering Indian Succession Act, Hindu Minority and Guardianship Act, FEMA, and Business Succession.
   - `prisma/seed.ts` also correctly seeds 1 approved template (`Comprehensive Indian Last Will & Testament`, v1 `LAWYER_APPROVED`) and 1 unapproved template (`Draft Custom Will Template`, v1 `DRAFT`).
3. **Document Generator Gap**:
   - In 1.3, `DocumentGenerator.generate` queries `prisma.template.findFirst({ where: { status: "LAWYER_APPROVED" } })`.
   - However, it takes `versions[0]` sorted by `version: 'desc'` without verifying `version.status === "LAWYER_APPROVED" || version.status === "LOCKED"`. If an admin or lawyer creates a draft revision v2, the generator will blindly pick the unapproved v2.
   - Furthermore, `DocumentGenerator` completely bypasses `Clause` and `ClauseVersion`. It hardcodes inline HTML paragraphs for guardianship and foreign assets instead of querying and substituting the seeded `GUARDIAN` and `NRI_ASSETS` clauses.
   - It writes `"clauseVersions": "v1"` as a static dummy string, violating R7/R10 requirements that actual approved clause version IDs are tracked.
   - It fails to write the generated `.docx` file to `storage/documents/`, leaving `filePath`, `fileSize`, and `fileHash` empty, which causes download requests to re-generate the file repeatedly.
4. **Legal Workflow Engine Gap**:
   - In 1.4, `LegalWorkflowEngine.evaluate` assigns flags (`STANDARD`, `GUARDIAN_REQUIRED`, `NRI`, `FOREIGN_ASSETS`, `BUSINESS_INTEREST`, `EXISTING_WILL`), but does not return `recommendedClauses: string[]` or resolve them to `ClauseVersion` IDs.
   - `src/server/legal-workflows/tests.ts` fakes Tests 7–10 using plain `console.log` printouts.
5. **Admin / Management API Gap**:
   - In 1.5, neither API endpoints nor server actions exist for managing template/clause lifecycles or approving them. Currently, status updates are only performed via direct Prisma script calls in test suites.

---

## 3. Caveats

- **SQLite Enum Representation**: Because Prisma with SQLite does not support native PostgreSQL `enum` types, lifecycle statuses (`DRAFT`, `UNDER_REVIEW`, `LAWYER_APPROVED`, `LOCKED`, `ARCHIVED`) are stored as `String`. Type safety and status transition constraints must therefore be strictly enforced in application code / Zod schemas / server actions.
- **Single Active Template Assumption**: Currently, `DocumentGenerator` queries `findFirst` for any `LAWYER_APPROVED` template. In a multi-template system (e.g., Hindu Will vs. Muslim Will vs. Special Marriage Act Will), template selection must be driven by case answers or workflow evaluation.
- **Existing Test Runner Pass Rate**: All 131 tests in `tests/runner.js` currently pass because the test fixtures use direct Prisma operations and test assertions aligned with the current lightweight implementation. Enhancements to `DocumentGenerator` must preserve backwards compatibility with these 131 tests.

---

## 4. Conclusion

The database schema and seed data for Milestone 4 (Templates, Clauses, Versions, Compound Unique Constraints, and Lifecycle States) are **sound and fully implemented** in `prisma/schema.prisma` and `prisma/seed.ts`.

However, the **business logic in `src/server/document-generator.ts` and `src/server/legal-workflows/` contains four critical gaps** that must be resolved in Milestone 4 implementation:
1. **Template Version Status Guard**: `DocumentGenerator` must verify that the selected `TemplateVersion` itself is `LAWYER_APPROVED` or `LOCKED`, not merely the parent `Template`.
2. **Real Clause Querying & Merging**: `DocumentGenerator` must query `prisma.clauseVersion` for workflow-recommended clauses (`STANDARD_DECLARATION`, `EXECUTORS`, `GUARDIAN`, `NRI_ASSETS`, `BUSINESS_SUCCESSION`), replace tokens (`{{clausesContent}}`, `{{fullName}}`, `{{guardianName}}`, etc.), and record actual `clauseVersions` IDs in `prisma.document`.
3. **File Persistence & Download Deduplication**: Persist generated DOCX files to `storage/documents/{caseId}_{timestamp}.docx`, populate `filePath`, `fileSize`, `fileHash` (SHA-256), emit `DOCUMENT_GENERATED` audit log, and make `/api/document/download` serve the existing file when available.
4. **Real Assertions in `tests.ts`**: Replace fake `console.log` statements in `src/server/legal-workflows/tests.ts` with real programmatic assertions against Prisma records and generator outputs.
5. **Template & Clause Management Endpoints**: Implement server-side guarded API routes (or Server Actions) for template and clause creation, status transition (enforcing LAWYER/ADMIN RBAC), and version incrementing.

---

## 5. Verification Method

### 5.1 Automated Test Execution
Run the full 131-test suite to verify baseline integrity:
```powershell
node tests/runner.js
```
Expected output:
- Total Tests: 131
- Passed: 131
- Failed: 0

Run the workflow tests directly:
```powershell
npx tsx src/server/legal-workflows/tests.ts
```
Expected output:
- Prints test results (currently passes with 10/10, though tests 7-10 are console.logged).

### 5.2 Database Constraint Verification
Verify compound unique constraints by inspecting Prisma generated DMMF or SQLite schema:
```powershell
npx prisma validate
```
Expected: `The schema is valid.`

Verify seeded records via Prisma Client or Node one-liner:
```powershell
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); Promise.all([p.template.findMany({ include: { versions: true } }), p.clause.findMany({ include: { versions: true } })]).then(([t, c]) => { console.log('Templates:', t.length, 'Clauses:', c.length); process.exit(0); });"
```
Expected: 2 Templates (1 approved, 1 draft) and 5 Clauses (all approved).

### 5.3 Invalidation Conditions
This analysis is invalidated if:
1. `prisma/schema.prisma` is modified to remove `@@unique([templateId, version])` or `@@unique([clauseId, version])`.
2. `prisma/seed.ts` ceases to seed `LAWYER_APPROVED` clauses or templates.
3. Breaking changes are introduced to the `DocumentGenerator.generate(caseId)` function signature.
