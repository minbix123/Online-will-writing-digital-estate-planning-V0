# Handoff Report: Milestone 4 — Explorer 3
**Topic**: DOCX Document Generation, Comprehensive Data Merging, Local File Storage & Dedup Download API  
**Author**: Explorer 3  
**Date**: 2026-09-17T07:27:00Z  
**Project Root**: `E:\Online will-writing & digital estate planning V0`  
**Working Directory**: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m4_3`  

---

## 1. Observation

### 1.1 `src/server/document-generator.ts` Analysis
Direct inspection of `src/server/document-generator.ts` (lines 1–110) reveals:
- **Library**: Imports `{ Document, Packer, Paragraph, TextRun } from "docx"` (v9.5.1 in `package.json`).
- **Answer Parsing** (lines 18–24):
  ```ts
  const answersMap: Record<string, any> = {};
  for (const ans of caseData.answers) {
    try {
      const parsed = JSON.parse(ans.answerData);
      Object.assign(answersMap, parsed);
    } catch(e) {}
  }
  ```
- **Template Query** (lines 29–37): Queries `prisma.template.findFirst({ where: { status: "LAWYER_APPROVED" }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } })`.
- **Data Merging Scope** (lines 47–57):
  ```ts
  const fullName = answersMap["fullName"] || caseData.customer.name || "Unknown Name";
  content = content.replace(/{{fullName}}/g, fullName);
  
  if (answersMap["hasMinorChildren"] === "Yes") {
    content += `\n\n<p>GUARDIANSHIP: I appoint ${answersMap["guardianName"] || 'the named guardian'} to be the guardian of my minor children.</p>`;
  }

  if (answersMap["isNRI"] === "Yes") {
    content += `\n\n<p>FOREIGN ASSETS: This will also covers my assets located in ${answersMap["countryOfResidence"] || 'foreign countries'}.</p>`;
  }
  ```
- **Document Structure** (lines 59–92): Compiles only 6 basic text paragraphs into a single section:
  1. Title: `"LAST WILL AND TESTAMENT"`
  2. Subtitle: `"This document is the Last Will and Testament of ${fullName}."`
  3. Attribution: `"Generated via Online Will-Writing Platform."`
  4. Heading: `"Content Preview:"`
  5. Body: `content.replace(/<[^>]*>?/gm, '')` (a single raw string paragraph)
  6. Footer: `"Template Version: ${templateVersion.id} (v${templateVersion.version})"`
- **Missing Data Sections**:
  - `personal_info`: `address`, `city`, `state`, `country`, `nationality`, `dateOfBirth`, `maritalStatus`, `spouseName` are completely omitted. In the template content (`prisma/seed.ts` line 128: `<h1>Last Will and Testament of {{fullName}}</h1><p>I, {{fullName}}, residing at {{address}}...`), `{{address}}` is never replaced.
  - `children`: `childrenList` (array of `{ name, dateOfBirth, relationship }`) is completely omitted.
  - `assets`: `assetsList` (array of `{ type, description, value, ownershipPercentage }`) covering real estate, bank accounts, investments, digital assets, business interests, and personal property is completely omitted. No Asset Schedule is generated.
  - `beneficiaries`: `beneficiariesList` (array of `{ name, relationship, allocation }`) is completely omitted. No Disposition of Property or Beneficiary Allocation table/schedule is generated.
  - `executor`: `executorName`, `executorRelationship`, `executorAddress`, `executorPhone`, and `alternateExecutorName` are completely omitted. No Executor Appointment section is generated.
  - `guardian`: Only appends an inline string with `guardianName`; omits `guardianRelationship`, `guardianAddress`, and `alternateGuardianName`.
  - `legal clauses`: The Prisma models `Clause` and `ClauseVersion` are **never queried**. The template's `{{clausesContent}}` placeholder is left untouched. Clauses are hardcoded as inline strings.
- **File Persistence**:
  - `Packer.toBuffer(doc)` produces an in-memory `Buffer` at line 94.
  - **Zero file system writes occur**. No `fs` module is imported. The `storage/` directory does not exist on disk (confirmed by `list_dir` error: `directory E:\Online will-writing & digital estate planning V0\storage does not exist`).
- **Prisma Metadata**:
  - Lines 97–105:
    ```ts
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
  - `filePath`, `fileSize`, `fileHash`, and `docxUrl` defined on the `Document` schema (`prisma/schema.prisma` lines 141–146) are **left null**.
- **Audit Logging**:
  - `DocumentGenerator.generate` **does not create an audit log**.
  - Currently, test suites (`test_combinations.js` line 598, `test_scenarios.js` lines 150, 678) have to manually invoke `prisma.auditLog.create({ action: 'DOCUMENT_GENERATED', ... })` after generation.

### 1.2 `src/app/api/document/download/route.ts` Analysis
Direct inspection of `src/app/api/document/download/route.ts` (lines 1–41) reveals:
- **Unconditional Re-generation on Download** (line 28):
  ```ts
  const { docxBuffer } = await DocumentGenerator.generate(caseId);
  ```
  Every HTTP `GET /api/document/download?caseId=...` executes `DocumentGenerator.generate(caseId)`, triggering:
  1. Full DB queries for case, answers, and templates.
  2. Full CPU-heavy `Packer.toBuffer(doc)` compilation.
  3. `prisma.document.create(...)` creating a new `Document` row in SQLite on every single click.
- **Duplicate Generation in User Flow**:
  - In `src/app/api/checkout/route.ts` (line 56), document generation is **already performed** upon payment completion:
    ```ts
    // 3. Document Generation
    await DocumentGenerator.generate(caseId);
    ```
  - When the customer is redirected to `/customer/document?caseId=...` and clicks `"Download DOCX"`, `/api/document/download` generates a **second** document. If the user refreshes or downloads again, a **third** document is generated.
- **RBAC / IDOR Flaw** (line 23):
  ```ts
  if (!caseData || (caseData.customerId !== user.id && user.role !== "LAWYER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  ```
  - `user.role !== "LAWYER"` allows **any user with the LAWYER role to download any case's document**, even if:
    - The case belongs to another lawyer (`caseData.lawyerId !== user.id`).
    - The case is a private customer draft not in review (`caseData.status === 'DRAFT'`).
  - Violates `PROJECT.md § Case Lifecycle Contract` (line 76) and `tests/helpers/test_utils.js` (lines 80–82):
    `Lawyer access: user.role === 'ADMIN' || (user.role === 'LAWYER' && (case.lawyerId === user.id || case.lawyerId === null || case.status === 'IN_REVIEW'))`.

### 1.3 `src/app/customer/document/page.tsx`
- Lines 34–39:
  ```tsx
  <a 
    href={`/api/document/download?caseId=${caseId}`}
    className="block w-full text-center bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700"
  >
    Download DOCX
  </a>
  ```
  Direct anchor link trigger. When deduplication is implemented in `/api/document/download/route.ts`, this link will immediately stream the cached DOCX file without re-generation.

### 1.4 Test Suite Baseline
- Command: `node tests/runner.js`
- Result: **131 tests passed, 0 failed** across all 4 tiers (Tier 1: 55, Tier 2: 55, Tier 3: 15, Tier 4: 6).
- Tests assert:
  - `assert.includes(result.textContent, 'Aarav Sharma')`
  - `assert.includes(result.textContent, 'GUARDIANSHIP:')`
  - `assert.includes(result.textContent, 'Sunita Sharma')`
  - `assert.includes(result.textContent, 'FOREIGN ASSETS:')`
  - `assert.includes(result.textContent, 'United Arab Emirates')`
  - `assert.equal(buf[0], 0x50)` (PK OpenXML zip header)
  - Prisma `Document` record created with status `'GENERATED'`

---

## 2. Logic Chain

1. **Premise 1: Legal Validity & Completeness (Indian Succession Act, 1925)**:
   - A valid Indian Will requires:
     - Identification of Testator (name, father/spouse name, age, permanent address, sound mind declaration).
     - Revocation of prior wills and testamentary dispositions.
     - Appointment of Executors and alternates with administrative powers.
     - Appointment of Testamentary Guardian (Section 9, Hindu Minority and Guardianship Act, 1956) if minor children exist.
     - Comprehensive Schedule of Assets (immovable properties, movable/bank/demat, digital, business interests).
     - Clear disposition of property and percentage allocations to named beneficiaries, plus a residuary estate clause.
     - Cross-border FEMA / overseas compliance clause for NRI assets.
     - Attestation clause with signatures of Testator and two attesting witnesses (Section 63, Indian Succession Act, 1925).
   - Currently, `document-generator.ts` omits 80% of these statutory components, outputting only 6 unstyled paragraphs.

2. **Premise 2: Template & Clause Integration**:
   - `prisma/seed.ts` seeds approved clauses: `STANDARD_DECLARATION`, `EXECUTORS`, `GUARDIAN`, `NRI_ASSETS`, `BUSINESS_SUCCESSION`.
   - `document-generator.ts` never loads from `Clause` or `ClauseVersion`. It hardcodes text strings and leaves `{{address}}` and `{{clausesContent}}` in the template unreplaced.
   - Dynamic clause injection based on workflow flags (`STANDARD`, `GUARDIAN_REQUIRED`, `NRI`, `FOREIGN_ASSETS`, `BUSINESS_INTEREST`, `EXISTING_WILL`) must fetch approved clause versions, substitute user variables, and assemble them into the document.

3. **Premise 3: File Persistence & Metadata Compliance**:
   - `PROJECT.md § Document Generation Contract` specifies:
     - Saved to `storage/documents/{caseId}_{timestamp}.docx`.
     - `Document` model must record `filePath`, `fileSize`, `fileHash`, and `status`.
     - Emits `DOCUMENT_GENERATED` audit log.
   - Currently, no files are written to disk; `Document` metadata fields remain `null`; no audit log is created by the generator.
   - Persisting the file to `storage/documents/{caseId}_{timestamp}.docx`, calculating SHA256 `fileHash`, recording byte `fileSize`, and inserting the `DOCUMENT_GENERATED` audit log fulfills the contract and enables deduplication.

4. **Premise 4: Deduplication & Performance**:
   - Re-generating DOCX on every download causes unnecessary CPU spikes (`Packer.toBuffer`) and database bloat (duplicate `Document` rows).
   - A cached document is valid if:
     - A `Document` record exists for `caseId` with status in `["GENERATED", "APPROVED", "FINAL"]`.
     - The physical file exists on disk at `filePath`.
     - No questionnaire answers have been modified since document generation (`latestAnswer.updatedAt <= doc.createdAt`).
   - If valid, `/api/document/download/route.ts` can stream the cached file from disk in < 5ms.
   - If answers changed or file is missing (or `?force=true`), generate once, update disk and DB, emit audit log, and serve.

5. **Premise 5: RBAC & IDOR Enforcement**:
   - The current check `caseData.customerId !== user.id && user.role !== "LAWYER" && user.role !== "ADMIN"` permits any lawyer to download any customer's document.
   - Tightening this check to verify case assignment (`caseData.lawyerId === user.id || caseData.lawyerId === null || caseData.status === "IN_REVIEW"`) eliminates the cross-tenant IDOR vulnerability.

---

## 3. Caveats

1. **Preserving Exact String Matches for Existing Tests**:
   - Existing automated test suites (`test_f9_docx_generation.js`, `test_combinations.js`, `test_scenarios.js`) check for exact substrings in `textContent`:
     - `'Aarav Sharma'`
     - `'GUARDIANSHIP:'`
     - `'Sunita Sharma'`
     - `'FOREIGN ASSETS:'`
     - `'United Arab Emirates'`
     - When `hasMinorChildren === 'No'`, `assert.equal(textContent.includes('GUARDIANSHIP:'), false)`.
   - Any upgraded generator must ensure that `textContent` continues to include these exact strings under those conditions so zero test regressions occur.
2. **Actor ID Propagation**:
   - Project contract specifies `generateDocument(caseId: string, actorId: string)`.
   - Some tests call `DocumentGenerator.generate(caseId)` with only 1 argument.
   - `actorId` must be optional: `static async generate(caseId: string, actorId?: string)`, defaulting to `caseData.customerId` if not provided.
3. **Database Transaction Boundaries**:
   - Document metadata creation and audit logging should ideally occur within a transaction (`prisma.$transaction`) or sequential await to ensure consistency.
4. **PDF Generation**:
   - As indicated on `/customer/document/page.tsx`, PDF generation is mocked/stubbed for MVP; DOCX is the authoritative downloadable artifact.

---

## 4. Conclusion & Proposed Architecture

### 4.1 Upgraded `src/server/document-generator.ts`
The generator must be upgraded with the following structure:
1. **Method Signature**: `static async generate(caseId: string, actorId?: string): Promise<{ docxBuffer: Buffer; textContent: string; documentId: string; filePath: string; fileHash: string; fileSize: number }>`
2. **Data Extraction**: Extract and structure all fields from `caseData.answers`:
   - `testator`: `fullName`, `dateOfBirth`, `nationality`, `address`, `city`, `state`, `country`, `email`, `phone`, `maritalStatus`, `spouseName`
   - `family`: `hasChildren`, `hasMinorChildren`, `childrenList` (parsed array)
   - `guardian`: `guardianName`, `guardianRelationship`, `guardianAddress`, `alternateGuardianName`
   - `assets`: `assetsList` (parsed array categorized into Immovable, Financial/Bank/Investments, Digital/Business, Personal)
   - `beneficiaries`: `beneficiariesList` (parsed array with `name`, `relationship`, `allocation`)
   - `executors`: `executorName`, `executorRelationship`, `executorAddress`, `executorPhone`, `alternateExecutorName`
   - `nri`: `isNRI`, `countryOfResidence`, `foreignAssetCountries`
   - `existingWill`: `hasExistingWill`
3. **Clause Integration**:
   - Query approved clauses from Prisma (`ClauseVersion` where `status === "LAWYER_APPROVED"`).
   - Substitute variables:
     - `STANDARD_DECLARATION`: replace `{{fullName}}`, `{{address}}`
     - `EXECUTORS`: replace `{{executorName}}`, `{{executorRelation}}`, `{{alternateExecutorName}}`
     - `GUARDIAN`: replace `{{guardianName}}` (only included if `hasMinorChildren === "Yes"`)
     - `NRI_ASSETS`: replace `{{countryOfResidence}}` (only included if `isNRI === "Yes"`)
     - `BUSINESS_SUCCESSION`: replace `{{businessName}}`, `{{businessSuccessor}}` (if business assets exist)
4. **Rich DOCX Document Assembly**:
   - Use `docx` package with styled `Table`, `TableRow`, `TableCell`, `Paragraph`, `HeadingLevel`, `BorderStyle`.
   - Title: Centered, Bold 28pt: "LAST WILL AND TESTAMENT"
   - Section 1: Declaration of Testator & Revocation of Prior Wills
   - Section 2: Family Details (Spouse and Children)
   - Section 3: Appointment of Executors & Alternate Executors
   - Section 4: Appointment of Testamentary Guardian (conditional)
   - Section 5: Schedule of Assets (Formatted Table: Asset Type, Description, Value, Ownership %)
   - Section 6: Disposition of Estate & Beneficiary Allocations (Formatted Table: Beneficiary, Relationship, Allocation Share)
   - Section 7: NRI & Cross-Border Assets Clause (conditional)
   - Section 8: Attestation & Execution (Testator signature line + 2 Attesting Witness signature blocks per Indian Succession Act, 1925)
5. **Disk Persistence**:
   - Create storage directory if missing: `path.join(process.cwd(), 'storage', 'documents')` (`mkdirSync({ recursive: true })`)
   - Filename: `${caseId}_${Date.now()}.docx`
   - Write file: `await fs.promises.writeFile(absolutePath, docxBuffer)`
6. **Database Record & Audit Log**:
   - Compute SHA256: `crypto.createHash('sha256').update(docxBuffer).digest('hex')`
   - Create Prisma `Document`:
     - `caseId`, `templateVersionId`, `status: "GENERATED"`, `clauseVersions`, `ruleVersions: "v1.0"`
     - `filePath`: relative path (`storage/documents/${filename}`)
     - `fileSize`: `docxBuffer.length`
     - `fileHash`: sha256 hex string
     - `docxUrl`: `/api/document/download?caseId=${caseId}`
   - Create `AuditLog`:
     - `action: "DOCUMENT_GENERATED"`
     - `entity: "Document"`
     - `entityId: document.id`
     - `actorId: actorId || caseData.customerId`
     - `caseId: caseId`
     - `metadata`: JSON string with format, filePath, fileSize, fileHash, status SUCCESS

### 4.2 Upgraded `src/app/api/document/download/route.ts`
Implement deduplication and strict RBAC:
1. **RBAC Guard**:
   ```ts
   const isOwner = user.role === "CUSTOMER" && caseData.customerId === user.id;
   const isAssignedLawyer = user.role === "LAWYER" && (caseData.lawyerId === user.id || caseData.lawyerId === null || caseData.status === "IN_REVIEW");
   const isAdmin = user.role === "ADMIN";
   if (!isOwner && !isAssignedLawyer && !isAdmin) {
     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
   }
   ```
2. **Deduplication Check**:
   - Query latest `Document` where `caseId === caseId` and `status in ["GENERATED", "APPROVED", "FINAL"]` ordered by `createdAt desc`.
   - If found and `filePath` exists on disk:
     - Check freshness: compare `doc.createdAt` against latest `QuestionnaireAnswer.updatedAt` and `caseData.updatedAt`.
     - If fresh and not forced (`!force`):
       - Read file from disk: `await fs.promises.readFile(absolutePath)`.
       - Stream cached buffer immediately (no re-compilation, no DB write).
3. **Fallback Generation**:
   - If not cached or stale:
     - Call `DocumentGenerator.generate(caseId, user.id)`.
     - Stream the newly compiled and persisted buffer.

---

## 5. Verification Method

### 5.1 Automated Regression Verification
Run the complete test runner:
```powershell
node tests/runner.js
```
Expected: All 131 tests continue to pass.

### 5.2 Unit Verification Commands for Document Generator
Run targeted F9 test suite:
```powershell
node tests/runner.js --file=test_f9_docx_generation.js
node tests/runner.js --file=test_f9_boundaries.js
```

### 5.3 Deduplication & Persistence Verification Steps
1. **File Storage Verification**:
   - Trigger generation via test or checkout.
   - Inspect local filesystem: verify `storage/documents/{caseId}_{timestamp}.docx` exists and file size > 500 bytes.
   - Verify OpenXML PK header (`0x50, 0x4B, 0x03, 0x04`).
2. **Document Metadata Verification**:
   - Query Prisma `Document` record: verify `filePath !== null`, `fileSize > 0`, `fileHash` is 64-char SHA256 hex string.
   - Query Prisma `AuditLog` record: verify `action === "DOCUMENT_GENERATED"`, `caseId === caseId`, and `actorId` matches user.
3. **Deduplication API Verification**:
   - Make two consecutive `GET /api/document/download?caseId={id}` requests.
   - Verify `prisma.document.count({ where: { caseId } })` remains 1 (no duplicate row created on second download).
   - Verify second response matches cached file on disk with identical SHA256 hash.
4. **RBAC IDOR Verification**:
   - Customer B requesting `/api/document/download?caseId={customerA_caseId}` receives 403 Forbidden.
   - Unassigned lawyer requesting draft case of another lawyer receives 403 Forbidden.
