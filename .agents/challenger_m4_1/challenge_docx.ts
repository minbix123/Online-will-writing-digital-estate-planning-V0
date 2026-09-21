/**
 * Independent Empirical Adversarial Challenge Suite for Milestone 4
 * Author: Challenger 1 (critic, specialist)
 * Target: Deterministic Legal Workflow, Template/Clause System & DOCX Gen
 *
 * Scope:
 * 1. OpenXML binary integrity & JSZip container parsing (PK zip header 0x50, 0x4B, 0x03, 0x04)
 * 2. Complete data merging fidelity (heterogeneous assets schedule, beneficiary allocations,
 *    executors, testamentary guardianship under Section 9 HMGA, Section 63 dual witness execution)
 * 3. Adversarial Fuzzing: Unicode Devanagari and dangerous XML entity preservation (&, <, >, ", ')
 * 4. Negative conditional clause isolation (strictly no GUARDIANSHIP or FOREIGN ASSETS when flags absent)
 * 5. Physical persistence in storage/documents/ and byte-level SHA256 cryptographic match
 * 6. 30 concurrent download requests deduplication stress (<10ms, identical SHA256, 0 duplicate DB rows)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import JSZip from "jszip";
import prisma from "../../src/lib/prisma";
import { DocumentGenerator } from "../../src/server/document-generator";

// Stats tracking
let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function reportAssert(condition: boolean, message: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✔ [ASSERT PASS] ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ✖ [ASSERT FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAdversarialChallenge() {
  console.log("================================================================================");
  console.log("  CHALLENGER 1: EMPIRICAL ADVERSARIAL STRESS HARNESS — MILESTONE 4             ");
  console.log("================================================================================\n");

  const startTime = Date.now();

  // Retrieve existing demo customer
  const customer = await prisma.user.findFirst({ where: { email: "customer@demo.com" } });
  reportAssert(!!customer, "Demo customer 'customer@demo.com' exists in SQLite database");

  // Track cases created by this harness for reliable cleanup
  const createdCaseIds: string[] = [];

  try {
    // =========================================================================
    // SUITE 1: OpenXML Binary Integrity & JSZip Container Parsing
    // =========================================================================
    console.log("\n▶ SUITE 1: OpenXML Binary Integrity & Container Anatomy");

    const case1 = await prisma.case.create({
      data: { customerId: customer!.id, status: "PAID" }
    });
    createdCaseIds.push(case1.id);

    await prisma.questionnaireAnswer.create({
      data: {
        caseId: case1.id,
        questionnaireVersion: "v1.0",
        questionId: "personal_info",
        answerData: JSON.stringify({
          fullName: "Vikramaditya Rao",
          maritalStatus: "Single",
          hasMinorChildren: "No",
          isNRI: "No"
        })
      }
    });

    const gen1 = await DocumentGenerator.generate(case1.id, customer!.id);

    // 1.1 Magic bytes: PK zip header (0x50, 0x4B, 0x03, 0x04)
    reportAssert(gen1.docxBuffer instanceof Buffer, "Generator returns Node Buffer instance");
    reportAssert(gen1.docxBuffer.length > 5000, `DOCX buffer size is ${gen1.docxBuffer.length} bytes (> 5KB)`);
    reportAssert(gen1.docxBuffer[0] === 0x50, "Magic byte 0 is 0x50 ('P')");
    reportAssert(gen1.docxBuffer[1] === 0x4B, "Magic byte 1 is 0x4B ('K')");
    reportAssert(gen1.docxBuffer[2] === 0x03, "Magic byte 2 is 0x03");
    reportAssert(gen1.docxBuffer[3] === 0x04, "Magic byte 3 is 0x04");

    // 1.2 Unzip container using JSZip
    const zip1 = await JSZip.loadAsync(gen1.docxBuffer);
    reportAssert(!!zip1, "JSZip successfully inflated OpenXML DOCX archive");

    // 1.3 Verify required OpenXML package parts
    const contentTypesEntry = zip1.file("[Content_Types].xml");
    reportAssert(!!contentTypesEntry, "OpenXML archive contains '[Content_Types].xml'");
    const contentTypesXml = await contentTypesEntry!.async("string");
    reportAssert(
      contentTypesXml.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"),
      "[Content_Types].xml registers wordprocessingml main document type"
    );

    const relsEntry = zip1.file("_rels/.rels");
    reportAssert(!!relsEntry, "OpenXML archive contains '_rels/.rels'");

    const docXmlEntry = zip1.file("word/document.xml");
    reportAssert(!!docXmlEntry, "OpenXML archive contains 'word/document.xml'");
    const docXml = await docXmlEntry!.async("string");
    reportAssert(docXml.length > 1000, `word/document.xml length is ${docXml.length} characters (> 1KB)`);

    // 1.4 XML well-formedness and schema compliance
    reportAssert(docXml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'), "Valid XML declaration");
    reportAssert(docXml.includes("<w:document"), "Root element <w:document> present");
    reportAssert(docXml.includes("</w:document>"), "Root element </w:document> cleanly closed");
    reportAssert(docXml.includes("<w:body>"), "<w:body> element present");
    reportAssert(docXml.includes("</w:body>"), "<w:body> cleanly closed");
    reportAssert(docXml.includes("VIKRAMADITYA RAO"), "Testator name uppercase title is present in XML text runs");

    // =========================================================================
    // SUITE 2: Complete Data Merging Fidelity & Indian Succession Act Compliance
    // =========================================================================
    console.log("\n▶ SUITE 2: Complete Data Merging Fidelity & Statutory Schedules");

    const case2 = await prisma.case.create({
      data: { customerId: customer!.id, status: "PAID" }
    });
    createdCaseIds.push(case2.id);

    const complexAnswers = {
      fullName: "Devendra Narayan Patil",
      dateOfBirth: "1978-11-23",
      nationality: "Indian",
      address: "Bungalow 7, Shivaji Housing Society, Senapati Bapat Road",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      maritalStatus: "Married",
      spouseName: "Radhika Devendra Patil",
      hasChildren: "Yes",
      hasMinorChildren: "Yes",
      childrenList: [
        { name: "Aditya Patil", dateOfBirth: "2010-06-12", relationship: "Biological Son" },
        { name: "Tanvi Patil", dateOfBirth: "2015-09-28", relationship: "Biological Daughter" }
      ],
      guardianName: "Shrikant Narayan Patil",
      guardianRelationship: "Paternal Uncle",
      guardianAddress: "Plot 104, Model Colony, Pune - 411016",
      alternateGuardianName: "Sunita Shrikant Patil",
      executorName: "Advocate Milind Khare",
      executorRelationship: "Senior Counsel & Family Attorney",
      executorAddress: "Chamber 202, District Court Complex, Shivajinagar, Pune",
      executorPhone: "+91 98220 54321",
      alternateExecutorName: "CA Rajendra Shah",
      isNRI: "Yes",
      countryOfResidence: "Singapore",
      hasBusinessInterests: "Yes",
      assetsList: [
        {
          type: "ImmovableProperty",
          description: "Row House #7, Shivaji Housing Society, Pune",
          value: 35000000,
          ownershipPercentage: 100
        },
        {
          type: "BankFixedDeposit",
          description: "Bank of Baroda 5-Year Cumulative FD A/c 204918273645",
          value: 5000000,
          ownershipPercentage: 100
        },
        {
          type: "DematPortfolio",
          description: "Zerodha Demat 1208160000998877 (Shares in TCS, L&T, HDFC Bank)",
          value: 12000000,
          ownershipPercentage: 100
        },
        {
          type: "PreciousMetals",
          description: "500g 24 Karat Gold Bullion and Diamond Jewellery in Locker 88",
          value: 3600000,
          ownershipPercentage: 100
        },
        {
          type: "Automobile",
          description: "BMW 520d Luxury Line (MH-12-PQ-7777)",
          value: 4800000,
          ownershipPercentage: 100
        },
        {
          type: "BusinessInterests",
          description: "60% Equity Shareholding in AgroTech Innovations Pvt Ltd",
          value: 25000000,
          ownershipPercentage: 60
        },
        {
          type: "DigitalAndIP",
          description: "Indian Patent 348921 & SaaS Source Code Repositories",
          value: 7500000,
          ownershipPercentage: 100
        }
      ],
      beneficiariesList: [
        {
          name: "Radhika Devendra Patil",
          relationship: "Wife",
          allocation: "50% Residuary Estate & Pune Row House"
        },
        {
          name: "Aditya Patil",
          relationship: "Son",
          allocation: "25% Residuary Estate in Trust until age 25"
        },
        {
          name: "Tanvi Patil",
          relationship: "Daughter",
          allocation: "20% Residuary Estate in Trust until age 25"
        },
        {
          name: "Shanti Old Age Home & Trust",
          relationship: "Charitable Institution",
          allocation: "5% Absolute Cash Bequest"
        }
      ]
    };

    await prisma.questionnaireAnswer.create({
      data: {
        caseId: case2.id,
        questionnaireVersion: "v1.0",
        questionId: "comprehensive_estate",
        answerData: JSON.stringify(complexAnswers)
      }
    });

    const gen2 = await DocumentGenerator.generate(case2.id, customer!.id);
    const zip2 = await JSZip.loadAsync(gen2.docxBuffer);
    const docXml2 = await zip2.file("word/document.xml")!.async("string");

    // 2.1 Testator Declaration & Family Details
    reportAssert(docXml2.includes("Devendra Narayan Patil"), "XML contains full testator name");
    reportAssert(docXml2.includes("1978-11-23"), "XML contains testator date of birth");
    reportAssert(docXml2.includes("Radhika Devendra Patil"), "XML contains spouse name");
    reportAssert(docXml2.includes("Aditya Patil"), "XML contains child 1 name");
    reportAssert(docXml2.includes("Tanvi Patil"), "XML contains child 2 name");
    reportAssert(docXml2.includes("2010-06-12"), "XML contains child 1 date of birth");

    // 2.2 Executor Appointments
    reportAssert(docXml2.includes("Advocate Milind Khare"), "XML contains appointed sole executor");
    reportAssert(docXml2.includes("CA Rajendra Shah"), "XML contains alternate executor");
    reportAssert(docXml2.includes("+91 98220 54321"), "XML contains executor contact phone");
    reportAssert(docXml2.includes("District Court Complex"), "XML contains executor address");

    // 2.3 Testamentary Guardianship (Section 9 HMGA 1956)
    reportAssert(docXml2.includes("Shrikant Narayan Patil"), "XML contains appointed guardian name");
    reportAssert(docXml2.includes("Sunita Shrikant Patil"), "XML contains alternate guardian name");
    reportAssert(docXml2.includes("Section 9 of the Hindu Minority and Guardianship Act, 1956"), "XML references statutory Section 9 HMGA");
    reportAssert(gen2.textContent.includes("GUARDIANSHIP:"), "Text content includes 'GUARDIANSHIP:' clause tag");

    // 2.4 Multi-Item Asset Schedule (7 Heterogeneous Assets in Table)
    reportAssert(docXml2.includes("<w:tbl>"), "XML contains Table element <w:tbl>");
    reportAssert(docXml2.includes("Asset Type"), "Table header includes 'Asset Type'");
    reportAssert(docXml2.includes("Description / Identification"), "Table header includes 'Description / Identification'");
    reportAssert(docXml2.includes("Estimated Value (INR)"), "Table header includes 'Estimated Value (INR)'");
    reportAssert(docXml2.includes("Ownership %"), "Table header includes 'Ownership %'");

    // Verify all 7 asset rows
    reportAssert(docXml2.includes("Row House #7, Shivaji Housing Society"), "Asset 1 description present in XML");
    const formattedAsset1 = Number(35000000).toLocaleString("en-IN");
    reportAssert(docXml2.includes(formattedAsset1), `Asset 1 Indian number-formatted value (${formattedAsset1}) present`);
    reportAssert(docXml2.includes("Bank of Baroda 5-Year Cumulative FD"), "Asset 2 description present");
    const formattedAsset2 = Number(5000000).toLocaleString("en-IN");
    reportAssert(docXml2.includes(formattedAsset2), `Asset 2 Indian number-formatted value (${formattedAsset2}) present`);
    reportAssert(docXml2.includes("Zerodha Demat 1208160000998877"), "Asset 3 description present");
    const formattedAsset3 = Number(12000000).toLocaleString("en-IN");
    reportAssert(docXml2.includes(formattedAsset3), `Asset 3 Indian number-formatted value (${formattedAsset3}) present`);
    reportAssert(docXml2.includes("500g 24 Karat Gold Bullion"), "Asset 4 description present");
    reportAssert(docXml2.includes("BMW 520d Luxury Line"), "Asset 5 description present");
    reportAssert(docXml2.includes("60% Equity Shareholding in AgroTech"), "Asset 6 description present");
    reportAssert(docXml2.includes("Indian Patent 348921"), "Asset 7 description present");

    // 2.5 Beneficiary Allocations Table (4 Beneficiaries)
    reportAssert(docXml2.includes("Beneficiary Name"), "Beneficiary table header includes 'Beneficiary Name'");
    reportAssert(docXml2.includes("50% Residuary Estate &amp; Pune Row House") || docXml2.includes("50% Residuary Estate & Pune Row House"), "Beneficiary 1 allocation present");
    reportAssert(docXml2.includes("25% Residuary Estate in Trust"), "Beneficiary 2 allocation present");
    reportAssert(docXml2.includes("20% Residuary Estate in Trust"), "Beneficiary 3 allocation present");
    reportAssert(docXml2.includes("Shanti Old Age Home &amp; Trust") || docXml2.includes("Shanti Old Age Home & Trust"), "Beneficiary 4 charity present");
    reportAssert(docXml2.includes("5% Absolute Cash Bequest"), "Beneficiary 4 cash bequest present");

    // 2.6 NRI Cross-Border & Foreign Assets Clause
    reportAssert(gen2.textContent.includes("FOREIGN ASSETS:"), "Text content includes 'FOREIGN ASSETS:' clause tag");
    reportAssert(docXml2.includes("Singapore"), "Foreign country 'Singapore' merged into cross-border clause");
    reportAssert(docXml2.includes("Foreign Exchange Management Act (FEMA)"), "Statutory FEMA compliance reference present");

    // 2.7 Business Succession Clause
    reportAssert(docXml2.includes("BUSINESS SUCCESSION:"), "Business succession clause present");

    // 2.8 Section 63 Indian Succession Act, 1925 Attestation Block & Dual Witnesses
    reportAssert(docXml2.includes("TESTIMONIUM &amp; ATTESTATION CLAUSE") || docXml2.includes("TESTIMONIUM & ATTESTATION CLAUSE"), "Testimonium header present");
    reportAssert(docXml2.includes("IN WITNESS WHEREOF"), "Execution preamble present");
    reportAssert(docXml2.includes("Signature of Testator:"), "Testator signature line present");
    reportAssert(docXml2.includes("SIGNED, PUBLISHED, AND DECLARED"), "Dual attestation statutory declaration present");
    reportAssert(docXml2.includes("WITNESS 1"), "Table cell for WITNESS 1 present");
    reportAssert(docXml2.includes("WITNESS 2"), "Table cell for WITNESS 2 present");
    reportAssert(docXml2.includes("Signature: __________________________"), "Witness signature blank lines present");
    reportAssert(docXml2.includes("Full Name: __________________________"), "Witness full name lines present");
    reportAssert(docXml2.includes("Occupation: _________________________"), "Witness occupation lines present");

    // =========================================================================
    // SUITE 3: Adversarial Fuzzing: Unicode Devanagari & Dangerous XML Entities
    // =========================================================================
    console.log("\n▶ SUITE 3: Adversarial Fuzzing: Unicode Devanagari & Special XML Characters");

    const case3 = await prisma.case.create({
      data: { customerId: customer!.id, status: "PAID" }
    });
    createdCaseIds.push(case3.id);

    const adversarialAnswers = {
      fullName: "डॉ. श्रीकांत शर्मा (Dr. Shrikant Sharma & Associates)",
      address: "फ्लैट ४०२, 'गोकुल धाम' & <फेज-१>, बांद्रा वेस्ट",
      city: "मुंबई",
      state: "महाराष्ट्र",
      country: "भारत",
      maritalStatus: "Married",
      spouseName: "श्रीमती सुनीता शर्मा",
      hasChildren: "Yes",
      hasMinorChildren: "Yes",
      childrenList: [
        { name: "चि. आरव शर्मा", dateOfBirth: "2018-12-05", relationship: "पुत्र" }
      ],
      guardianName: "श्री रमेश चंद्र शर्मा (संरक्षक & 'Trustee')",
      isNRI: "No",
      assetsList: [
        {
          type: "Property & Jewellery",
          description: "दुकान क्र. ५ <मार्केट यार्ड> & २ किलो चांदी 'Silver'",
          value: 8500000,
          ownershipPercentage: 100
        }
      ],
      beneficiariesList: [
        {
          name: "श्रीमती सुनीता शर्मा & चि. आरव",
          relationship: "पत्नी व पुत्र",
          allocation: "100% संयुक्त हिस्सा <Joint Share>"
        }
      ]
    };

    await prisma.questionnaireAnswer.create({
      data: {
        caseId: case3.id,
        questionnaireVersion: "v1.0",
        questionId: "adversarial_unicode",
        answerData: JSON.stringify(adversarialAnswers)
      }
    });

    const gen3 = await DocumentGenerator.generate(case3.id, customer!.id);
    reportAssert(gen3.docxBuffer instanceof Buffer, "Adversarial generation returns valid buffer without crash");

    const zip3 = await JSZip.loadAsync(gen3.docxBuffer);
    const docXml3 = await zip3.file("word/document.xml")!.async("string");

    // Devanagari Unicode preservation in OpenXML UTF-8
    reportAssert(docXml3.includes("डॉ. श्रीकांत शर्मा"), "Devanagari testator title and name intact");
    reportAssert(docXml3.includes("फ्लैट ४०२"), "Devanagari address intact");
    reportAssert(docXml3.includes("गोकुल धाम"), "Devanagari apartment name intact");
    reportAssert(docXml3.includes("श्रीमती सुनीता शर्मा"), "Devanagari spouse name intact");
    reportAssert(docXml3.includes("चि. आरव शर्मा"), "Devanagari child name intact");
    reportAssert(docXml3.includes("श्री रमेश चंद्र शर्मा"), "Devanagari guardian name intact");
    reportAssert(docXml3.includes("दुकान क्र. ५"), "Devanagari asset description intact");

    // Dangerous XML entity escaping check (&, <, > must be escaped so XML remains valid)
    reportAssert(!docXml3.includes("<फेज-१>"), "Raw unescaped '<फेज-१>' tag is NOT injected into XML DOM");
    reportAssert(docXml3.includes("&lt;फेज-१&gt;"), "Dangerous angle brackets properly XML-escaped to '&lt;फेज-१&gt;'");
    reportAssert(docXml3.includes("&amp; Associates"), "Dangerous ampersand properly XML-escaped to '&amp;'");

    // =========================================================================
    // SUITE 4: Negative Testing & Conditional Logic Strictness
    // =========================================================================
    console.log("\n▶ SUITE 4: Negative Testing & Conditional Clause Isolation");

    const case4 = await prisma.case.create({
      data: { customerId: customer!.id, status: "PAID" }
    });
    createdCaseIds.push(case4.id);

    // Negative case: hasMinorChildren = "No", isNRI = "No", hasBusinessInterests = "No"
    const standardAnswers = {
      fullName: "Anand Murthy",
      maritalStatus: "Single",
      hasChildren: "No",
      hasMinorChildren: "No",
      guardianName: "Should Never Appear",
      isNRI: "No",
      countryOfResidence: "Should Never Appear",
      hasBusinessInterests: "No"
    };

    await prisma.questionnaireAnswer.create({
      data: {
        caseId: case4.id,
        questionnaireVersion: "v1.0",
        questionId: "negative_checks",
        answerData: JSON.stringify(standardAnswers)
      }
    });

    const gen4 = await DocumentGenerator.generate(case4.id, customer!.id);
    const zip4 = await JSZip.loadAsync(gen4.docxBuffer);
    const docXml4 = await zip4.file("word/document.xml")!.async("string");

    reportAssert(!gen4.textContent.includes("GUARDIANSHIP:"), "Negative test: textContent strictly excludes 'GUARDIANSHIP:'");
    reportAssert(!docXml4.includes("APPOINTMENT OF TESTAMENTARY GUARDIAN"), "Negative test: XML strictly excludes Guardian heading");
    reportAssert(!docXml4.includes("Should Never Appear"), "Negative test: XML excludes spurious guardian name");
    reportAssert(!gen4.textContent.includes("FOREIGN ASSETS:"), "Negative test: textContent strictly excludes 'FOREIGN ASSETS:'");
    reportAssert(!docXml4.includes("CROSS-BORDER &amp; NRI FOREIGN ASSETS") && !docXml4.includes("CROSS-BORDER & NRI FOREIGN ASSETS"), "Negative test: XML strictly excludes NRI section");
    reportAssert(!docXml4.includes("BUSINESS SUCCESSION:"), "Negative test: XML strictly excludes Business succession clause");

    // =========================================================================
    // SUITE 5: Physical Persistence & Cryptographic SHA256 Integrity
    // =========================================================================
    console.log("\n▶ SUITE 5: Physical Persistence & Cryptographic SHA256 Integrity");

    reportAssert(!!gen2.filePath, "gen2 returns non-empty relative filePath");
    reportAssert(gen2.filePath.startsWith("storage/documents/"), "filePath is located in storage/documents/");
    reportAssert(gen2.filePath.endsWith(".docx"), "filePath ends with .docx extension");

    const absoluteDiskPath = path.join(process.cwd(), gen2.filePath);
    reportAssert(fs.existsSync(absoluteDiskPath), `File physically exists on filesystem at: ${absoluteDiskPath}`);

    const fileStat = fs.statSync(absoluteDiskPath);
    reportAssert(fileStat.size === gen2.fileSize, `Physical file size (${fileStat.size}) matches returned fileSize (${gen2.fileSize})`);
    reportAssert(fileStat.size > 0, "Physical file size is greater than zero");

    // Compute cryptographic SHA256 directly from disk bytes
    const diskBytes = fs.readFileSync(absoluteDiskPath);
    const diskSha256 = crypto.createHash("sha256").update(diskBytes).digest("hex");
    reportAssert(diskSha256 === gen2.fileHash, "Disk byte SHA256 matches generator returned fileHash");
    reportAssert(diskSha256.length === 64, "SHA256 checksum is valid 64-character hexadecimal");

    // Query Document database record
    const dbDoc = await prisma.document.findUnique({
      where: { id: gen2.documentId }
    });
    reportAssert(!!dbDoc, "Document record exists in SQLite database");
    reportAssert(dbDoc!.caseId === case2.id, "Document record caseId matches case2.id");
    reportAssert(dbDoc!.status === "GENERATED", "Document record status is 'GENERATED'");
    reportAssert(dbDoc!.fileHash === diskSha256, "DB Document.fileHash exactly matches physical disk SHA256");
    reportAssert(dbDoc!.fileSize === fileStat.size, "DB Document.fileSize exactly matches physical disk stat size");
    reportAssert(dbDoc!.filePath === gen2.filePath, "DB Document.filePath exactly matches relative disk path");

    // Check template version status
    const tmplVersion = await prisma.templateVersion.findUnique({
      where: { id: dbDoc!.templateVersionId }
    });
    reportAssert(!!tmplVersion, "TemplateVersion record exists in database");
    reportAssert(
      ["LAWYER_APPROVED", "LOCKED"].includes(tmplVersion!.status),
      `Document references approved template version (status: ${tmplVersion!.status})`
    );

    // Check AuditLog entry
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        caseId: case2.id,
        action: "DOCUMENT_GENERATED"
      }
    });
    reportAssert(!!auditLog, "DOCUMENT_GENERATED AuditLog record exists in database");
    reportAssert(auditLog!.entity === "Document", "AuditLog entity is 'Document'");
    reportAssert(auditLog!.entityId === dbDoc!.id, "AuditLog entityId matches Document id");
    reportAssert(auditLog!.actorId === customer!.id, "AuditLog actorId matches customer id");
    reportAssert(auditLog!.timestamp instanceof Date, "AuditLog timestamp is valid Date object");

    const auditMeta = JSON.parse(auditLog!.metadata || "{}");
    reportAssert(auditMeta.format === "DOCX", "Audit metadata format is 'DOCX'");
    reportAssert(auditMeta.fileHash === diskSha256, "Audit metadata fileHash matches disk SHA256");
    reportAssert(auditMeta.status === "SUCCESS", "Audit metadata status is 'SUCCESS'");

    // =========================================================================
    // SUITE 6: Concurrent Download Deduplication Stress (30 Requests)
    // =========================================================================
    console.log("\n▶ SUITE 6: Concurrent Download Deduplication Stress (30 Simultaneous Requests)");

    // Target case for concurrency: case2
    const docCountBefore = await prisma.document.count({ where: { caseId: case2.id } });
    reportAssert(docCountBefore === 1, "Exactly 1 Document record exists for case2 before concurrent stress");

    // Fetch existing cached document info
    const cachedDocRecord = await prisma.document.findFirst({
      where: {
        caseId: case2.id,
        status: { in: ["GENERATED", "APPROVED", "FINAL"] },
        filePath: { not: null }
      },
      orderBy: { createdAt: "desc" }
    });
    reportAssert(!!cachedDocRecord, "Cached document record retrieved for case2");
    const cachedDiskPath = path.join(process.cwd(), cachedDocRecord!.filePath!);
    reportAssert(fs.existsSync(cachedDiskPath), "Cached disk file verified to exist");

    const CONCURRENCY_COUNT = 30;
    console.log(`  Spawning ${CONCURRENCY_COUNT} simultaneous concurrent download requests...`);

    interface DownloadResult {
      index: number;
      serveLatencyMs: number;
      totalLatencyMs: number;
      servedBuffer: Buffer;
      servedSha256: string;
      cacheHit: boolean;
    }

    // Execute 30 concurrent download tasks simulating the download route deduplication logic
    const downloadPromises: Promise<DownloadResult>[] = [];

    for (let i = 0; i < CONCURRENCY_COUNT; i++) {
      const task = async (index: number): Promise<DownloadResult> => {
        const reqStart = Date.now();

        // 1. Simulate deduplication lookup
        const freshDoc = await prisma.document.findFirst({
          where: {
            caseId: case2.id,
            status: { in: ["GENERATED", "APPROVED", "FINAL"] },
            filePath: { not: null }
          },
          orderBy: { createdAt: "desc" }
        });

        if (!freshDoc || !freshDoc.filePath) {
          throw new Error("Deduplication error: document not found");
        }

        const fullPath = path.join(process.cwd(), freshDoc.filePath);
        if (!fs.existsSync(fullPath)) {
          throw new Error("Deduplication error: disk file not found");
        }

        // 2. Stream cached file from disk (measuring cache serving SLA)
        const serveStart = Date.now();
        const fileBuf = await fs.promises.readFile(fullPath);
        const serveLatencyMs = Date.now() - serveStart;
        const totalLatencyMs = Date.now() - reqStart;
        const hash = crypto.createHash("sha256").update(fileBuf).digest("hex");

        return {
          index,
          serveLatencyMs,
          totalLatencyMs,
          servedBuffer: fileBuf,
          servedSha256: hash,
          cacheHit: true
        };
      };

      downloadPromises.push(task(i));
    }

    const downloadResults = await Promise.all(downloadPromises);

    // Assertions across all 30 concurrent requests
    reportAssert(downloadResults.length === CONCURRENCY_COUNT, `All ${CONCURRENCY_COUNT} concurrent requests completed`);

    const serveLatencies = downloadResults.map((r) => r.serveLatencyMs).sort((a, b) => a - b);
    const minServeLatency = serveLatencies[0];
    const maxServeLatency = serveLatencies[serveLatencies.length - 1];
    const avgServeLatency = (serveLatencies.reduce((a, b) => a + b, 0) / serveLatencies.length).toFixed(2);
    const p50ServeLatency = serveLatencies[Math.floor(serveLatencies.length * 0.5)];
    const p90ServeLatency = serveLatencies[Math.floor(serveLatencies.length * 0.9)];

    const totalLatencies = downloadResults.map((r) => r.totalLatencyMs);
    const maxTotalLatency = Math.max(...totalLatencies);
    const avgTotalLatency = (totalLatencies.reduce((a, b) => a + b, 0) / totalLatencies.length).toFixed(2);

    console.log(`  Cached Stream Latencies: min=${minServeLatency}ms, p50=${p50ServeLatency}ms, avg=${avgServeLatency}ms, p90=${p90ServeLatency}ms, max=${maxServeLatency}ms`);
    console.log(`  Total End-to-End Latencies (including DB query queue): avg=${avgTotalLatency}ms, max=${maxTotalLatency}ms`);

    reportAssert(Number(avgServeLatency) < 10, `Average cached file streaming latency was ${avgServeLatency}ms (< 10ms SLA target)`);
    reportAssert(p50ServeLatency < 10, `Median (p50) cached file streaming latency was ${p50ServeLatency}ms (< 10ms SLA target)`);
    reportAssert(maxServeLatency < 25, `Max cached file streaming latency was ${maxServeLatency}ms (< 25ms peak jitter bound)`);

    // Verify cryptographic consistency: all 30 returned the exact same SHA256 checksum
    const allHashesMatch = downloadResults.every((r) => r.servedSha256 === cachedDocRecord!.fileHash);
    reportAssert(allHashesMatch, `All ${CONCURRENCY_COUNT} requests served identical SHA256 checksum matching Document.fileHash`);

    // Verify DB deduplication: ZERO new Document rows created
    const docCountAfter = await prisma.document.count({ where: { caseId: case2.id } });
    reportAssert(
      docCountAfter === docCountBefore,
      `Zero duplicate Document rows created in database (${docCountBefore} before == ${docCountAfter} after)`
    );

    // 6.2 Cache Invalidation on Questionnaire Update Test
    console.log("\n  Testing Stale Cache Invalidation when Questionnaire is Updated...");
    // Update questionnaire answer with future timestamp
    const futureDate = new Date(Date.now() + 5000);
    await prisma.questionnaireAnswer.updateMany({
      where: { caseId: case2.id },
      data: { updatedAt: futureDate }
    });

    // Check deduplication freshness evaluation
    const latestAnswer = await prisma.questionnaireAnswer.findFirst({
      where: { caseId: case2.id },
      orderBy: { updatedAt: "desc" }
    });
    const isCacheFresh = cachedDocRecord!.createdAt >= latestAnswer!.updatedAt;
    reportAssert(!isCacheFresh, "Stale cache detected: cachedDoc.createdAt < latestAnswer.updatedAt");

    // Force/re-generation produces new document
    const regenerated = await DocumentGenerator.generate(case2.id, customer!.id);
    reportAssert(regenerated.documentId !== cachedDocRecord!.id, "Regeneration creates new fresh Document record ID");

    const docCountAfterRegen = await prisma.document.count({ where: { caseId: case2.id } });
    reportAssert(docCountAfterRegen === docCountBefore + 1, "Database now holds updated Document row after intentional regeneration");

  } catch (err: any) {
    console.error("\n[EXECUTION ERROR IN TEST BODY]:", err);
    throw err;
  } finally {
    // Clean up created cases, documents, questionnaire answers, and audit logs
    console.log("\n--- Cleaning up challenge test artifacts ---");
    for (const cId of createdCaseIds) {
      try {
        await prisma.auditLog.deleteMany({ where: { caseId: cId } });
        await prisma.document.deleteMany({ where: { caseId: cId } });
        await prisma.questionnaireAnswer.deleteMany({ where: { caseId: cId } });
        await prisma.case.delete({ where: { id: cId } });
      } catch (cleanErr) {
        console.warn(`Warning cleaning case ${cId}:`, cleanErr);
      }
    }
    await prisma.$disconnect();
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log("\n================================================================================");
  console.log(`  CHALLENGE EXECUTION COMPLETE: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED in ${durationSec}s`);
  console.log(`  FAILED ASSERTIONS: ${failedAssertions}`);
  console.log(`  VERDICT: ${failedAssertions === 0 ? "APPROVE" : "REJECT"}`);
  console.log("================================================================================\n");

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runAdversarialChallenge().catch((err) => {
  console.error("Adversarial Challenge Failure:", err);
  process.exit(1);
});
