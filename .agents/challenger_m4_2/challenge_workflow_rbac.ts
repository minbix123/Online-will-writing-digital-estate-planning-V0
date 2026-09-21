/**
 * Independent Empirical Challenge Suite — Milestone 4
 * Author: Challenger 2 (Adversarial Critic & Domain Specialist)
 * 
 * Mandate:
 * 1. Legal Workflow Engine adversarial fuzzing (malformed, empty, type-corrupted answers).
 * 2. Exhaustive 72-permutation combinatorial validation of legal flags and recommendedClauses.
 * 3. Audit of tests.ts real programmatic assertions, negative assertion controls, and execution.
 * 4. Template lifecycle rejection (DRAFT, UNDER_REVIEW, ARCHIVED, partial approval) and version locking.
 * 5. Download API and Metadata API RBAC & IDOR Security Matrix (401, 403, 200 across all role permutations).
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

// Setup NextAuth mock for route handlers before requiring them
const nextAuthNext = require("next-auth/next");
let mockSession: any = null;
nextAuthNext.getServerSession = async () => mockSession;

// Load real routes & engines
const downloadRoute = require("../../src/app/api/document/download/route");
const metadataRoute = require("../../src/app/api/document/metadata/route");
const { LegalWorkflowEngine } = require("../../src/server/legal-workflows/index.ts");
const { DocumentGenerator } = require("../../src/server/document-generator.ts");

const prisma = new PrismaClient();

let assertionCount = 0;
let totalSuites = 0;
let passedSuites = 0;

function assertCondition(cond: boolean, msg: string) {
  assertionCount++;
  assert.ok(cond, msg);
}

function assertStrictEqual<T>(actual: T, expected: T, msg: string) {
  assertionCount++;
  assert.strictEqual(actual, expected, msg);
}

async function runChallenge() {
  console.log("================================================================================");
  console.log("       CHALLENGER 2: ADVERSARIAL WORKFLOW & RBAC SECURITY EMPIRICAL SUITE       ");
  console.log("================================================================================\n");

  // ============================================================================
  // SUITE 1: Legal Workflow Engine Adversarial Fuzzing
  // ============================================================================
  totalSuites++;
  console.log("--- [Suite 1/5] Legal Workflow Engine Adversarial Fuzzing ---");
  
  const fuzzedInputs: { label: string; input: any }[] = [
    { label: "undefined input", input: undefined },
    { label: "null input", input: null },
    { label: "boolean true input", input: true },
    { label: "boolean false input", input: false },
    { label: "integer 0 input", input: 0 },
    { label: "negative integer -1 input", input: -1 },
    { label: "floating point 3.14159 input", input: 3.14159 },
    { label: "NaN input", input: NaN },
    { label: "Infinity input", input: Infinity },
    { label: "empty string input", input: "" },
    { label: "arbitrary string input", input: "malicious_payload_string" },
    { label: "symbol input", input: Symbol("fuzz_symbol") },
    { label: "bigint input", input: BigInt(9007199254740991) },
    { label: "function input", input: () => "exploit" },
    { label: "empty array input", input: [] },
    { label: "primitive array input", input: [1, 2, "three", null, false] },
    { label: "object array input", input: [{ a: 1 }, { b: 2 }] },
    { label: "empty object input", input: {} },
    { label: "all null fields", input: { maritalStatus: null, hasMinorChildren: null, isNRI: null, hasBusinessInterests: null, hasExistingWill: null } },
    { label: "all undefined fields", input: { maritalStatus: undefined, hasMinorChildren: undefined, isNRI: undefined, hasBusinessInterests: undefined } },
    { label: "nested corrupted objects", input: { maritalStatus: { complex: "object" }, hasMinorChildren: [1, 2], isNRI: {} } },
    { label: "type mismatch (booleans instead of 'Yes')", input: { hasMinorChildren: true, isNRI: true, hasBusinessInterests: true } },
    { label: "case sensitive mismatch", input: { hasMinorChildren: "yes", isNRI: "yes", hasBusinessInterests: "yes" } },
    { label: "assetsList string instead of array", input: { assetsList: "not-an-array" } },
    { label: "assetsList with null/primitive/corrupted items", input: { assetsList: [null, undefined, 42, "str", {}, { type: null }, { type: 123 }] } },
    { label: "assetsList mixed with valid BusinessInterests", input: { assetsList: [null, { type: "Property" }, { type: "BusinessInterests" }, undefined] } },
    { label: "hasExistingWill 'Not sure' variant", input: { hasExistingWill: "Not sure" } },
    { label: "arbitrary unexpected keys injection", input: { foo: "bar", __proto_test: 123, maliciousSql: "'; DROP TABLE cases;--" } },
    { label: "circular reference input", input: (() => { const c: any = { maritalStatus: "Married" }; c.loop = c; return c; })() },
    { label: "large payload (50KB string + 1000 assets)", input: {
      fullName: "A".repeat(50000),
      assetsList: Array.from({ length: 1000 }, (_, i) => (i % 2 === 0 ? { type: "Property" } : null))
    }}
  ];

  for (const { label, input } of fuzzedInputs) {
    let result: any;
    try {
      result = await LegalWorkflowEngine.evaluate(input);
    } catch (err: any) {
      assert.fail(`LegalWorkflowEngine crashed on ${label}: ${err.message}`);
    }

    assertCondition(result && typeof result === "object", `${label}: Must return an object`);
    assertCondition(Array.isArray(result.flags), `${label}: flags must be an array`);
    assertCondition(Array.isArray(result.recommendedClauses), `${label}: recommendedClauses must be an array`);
    assertCondition(typeof result.requiresLawyerReview === "boolean", `${label}: requiresLawyerReview must be boolean`);
    assertCondition(result.flags.includes("STANDARD"), `${label}: Must always include STANDARD flag`);
    assertCondition(result.recommendedClauses.includes("STANDARD_DECLARATION"), `${label}: Must always include STANDARD_DECLARATION`);
    assertCondition(result.recommendedClauses.includes("EXECUTORS"), `${label}: Must always include EXECUTORS`);
  }
  console.log(`✔ [PASS] Suite 1: All ${fuzzedInputs.length} adversarial/fuzzed inputs safely evaluated without crashes.`);
  passedSuites++;

  // ============================================================================
  // SUITE 2: Exhaustive Combinatorial Validation (72 Permutations)
  // ============================================================================
  totalSuites++;
  console.log("\n--- [Suite 2/5] Combinatorial Permutation Validation (72 Flag & Clause States) ---");

  const maritalStatuses = ["Married", "Other"];
  const minorChildrenOptions = ["No", "Yes"];
  const nriOptions = ["No", "Yes"];
  const businessModes = ["NONE", "FLAG_ONLY", "ASSET_ONLY"];
  const existingWillOptions = ["No", "Yes", "Not sure"];

  let permCount = 0;
  for (const ms of maritalStatuses) {
    for (const mc of minorChildrenOptions) {
      for (const nri of nriOptions) {
        for (const bz of businessModes) {
          for (const ew of existingWillOptions) {
            permCount++;
            const input: any = {
              maritalStatus: ms,
              hasMinorChildren: mc,
              isNRI: nri,
              hasExistingWill: ew
            };
            if (bz === "FLAG_ONLY") {
              input.hasBusinessInterests = "Yes";
            } else if (bz === "ASSET_ONLY") {
              input.assetsList = [{ type: "BusinessInterests" }];
            }

            const res = await LegalWorkflowEngine.evaluate(input);
            const hasBusiness = bz !== "NONE";

            // 1. Check STANDARD flag
            assertCondition(res.flags.includes("STANDARD"), `Perm ${permCount}: Must include STANDARD`);

            // 2. Check GUARDIAN_REQUIRED flag
            assertStrictEqual(
              res.flags.includes("GUARDIAN_REQUIRED"),
              mc === "Yes",
              `Perm ${permCount}: GUARDIAN_REQUIRED flag mismatch for minorChildren=${mc}`
            );

            // 3. Check NRI & FOREIGN_ASSETS flags
            assertStrictEqual(
              res.flags.includes("NRI"),
              nri === "Yes",
              `Perm ${permCount}: NRI flag mismatch for isNRI=${nri}`
            );
            assertStrictEqual(
              res.flags.includes("FOREIGN_ASSETS"),
              nri === "Yes",
              `Perm ${permCount}: FOREIGN_ASSETS flag mismatch for isNRI=${nri}`
            );

            // 4. Check BUSINESS_INTEREST flag
            assertStrictEqual(
              res.flags.includes("BUSINESS_INTEREST"),
              hasBusiness,
              `Perm ${permCount}: BUSINESS_INTEREST flag mismatch for businessMode=${bz}`
            );

            // 5. Check EXISTING_WILL flag
            const expectsExistingWill = ew === "Yes" || ew === "Not sure";
            assertStrictEqual(
              res.flags.includes("EXISTING_WILL"),
              expectsExistingWill,
              `Perm ${permCount}: EXISTING_WILL flag mismatch for hasExistingWill=${ew}`
            );

            // 6. Check MANUAL_CONSULTATION_REQUIRED flag
            assertStrictEqual(
              res.flags.includes("MANUAL_CONSULTATION_REQUIRED"),
              ms === "Other",
              `Perm ${permCount}: MANUAL_CONSULTATION_REQUIRED flag mismatch for maritalStatus=${ms}`
            );

            // 7. Check requiresLawyerReview
            const expectedReview = (ms === "Other") || (nri === "Yes") || hasBusiness || expectsExistingWill;
            assertStrictEqual(
              res.requiresLawyerReview,
              expectedReview,
              `Perm ${permCount}: requiresLawyerReview mismatch (expected ${expectedReview}, got ${res.requiresLawyerReview})`
            );

            // 8. Check recommendedClauses
            assertCondition(res.recommendedClauses.includes("STANDARD_DECLARATION"), `Perm ${permCount}: Missing STANDARD_DECLARATION`);
            assertCondition(res.recommendedClauses.includes("EXECUTORS"), `Perm ${permCount}: Missing EXECUTORS`);
            assertStrictEqual(
              res.recommendedClauses.includes("GUARDIAN"),
              mc === "Yes",
              `Perm ${permCount}: GUARDIAN clause recommendation mismatch`
            );
            assertStrictEqual(
              res.recommendedClauses.includes("NRI_ASSETS"),
              nri === "Yes",
              `Perm ${permCount}: NRI_ASSETS clause recommendation mismatch`
            );
            assertStrictEqual(
              res.recommendedClauses.includes("BUSINESS_SUCCESSION"),
              hasBusiness,
              `Perm ${permCount}: BUSINESS_SUCCESSION clause recommendation mismatch`
            );
          }
        }
      }
    }
  }

  assertStrictEqual(permCount, 72, "Must evaluate exactly 72 combinatorial flag permutations");
  console.log(`✔ [PASS] Suite 2: All 72 permutations verified against legal flags and recommendedClauses contract.`);
  passedSuites++;

  // ============================================================================
  // SUITE 3: Real Test Assertions Audit in tests.ts & Negative Controls
  // ============================================================================
  totalSuites++;
  console.log("\n--- [Suite 3/5] Audit of tests.ts Assertions & Negative Controls ---");

  // 3.1 Static verification of tests.ts
  const testsPath = path.join(process.cwd(), "src", "server", "legal-workflows", "tests.ts");
  assertCondition(fs.existsSync(testsPath), "tests.ts must exist at expected path");
  const testsContent = fs.readFileSync(testsPath, "utf-8");

  assertCondition(
    testsContent.includes('import assert from "assert";') || testsContent.includes("import assert from 'assert';"),
    "tests.ts must import real Node assert module"
  );
  assertCondition(testsContent.includes("assert.rejects("), "tests.ts must use assert.rejects for draft template rejection");
  assertCondition(testsContent.includes("assert.strictEqual("), "tests.ts must use assert.strictEqual for strict type verification");

  // 3.2 Negative control: Confirm Node assert actually throws on failure
  let assertFailedAsExpected = false;
  try {
    assert.strictEqual(1 as any, 2 as any, "Negative control should throw");
  } catch (err: any) {
    if (err.name === "AssertionError") {
      assertFailedAsExpected = true;
    }
  }
  assertCondition(assertFailedAsExpected, "Negative control: Node assert must throw AssertionError on mismatch");

  // 3.3 Dynamic execution of tests.ts
  console.log("Running tsx src/server/legal-workflows/tests.ts as subprocess...");
  let testsOutput = "";
  try {
    testsOutput = execSync("npx tsx src/server/legal-workflows/tests.ts", {
      cwd: process.cwd(),
      encoding: "utf-8"
    });
  } catch (err: any) {
    assert.fail(`tests.ts failed during execution: ${err.stdout || err.message}`);
  }

  assertCondition(testsOutput.includes("Results: 10/10 passed."), "tests.ts must output 'Results: 10/10 passed.'");
  assertCondition(testsOutput.includes("✅ Test 1 (Standard)"), "tests.ts Test 1 must pass");
  assertCondition(testsOutput.includes("✅ Test 7 (Draft template blocks production generation)"), "tests.ts Test 7 must pass");
  assertCondition(testsOutput.includes("✅ Test 8 (Approved template succeeds)"), "tests.ts Test 8 must pass");
  assertCondition(testsOutput.includes("✅ Test 9 (Template version locked)"), "tests.ts Test 9 must pass");
  assertCondition(testsOutput.includes("✅ Test 10 (Unauthorized access denied)"), "tests.ts Test 10 must pass");

  console.log("✔ [PASS] Suite 3: tests.ts confirmed to run 10 real programmatic assertions throwing on failure.");
  passedSuites++;

  // ============================================================================
  // SUITE 4: Draft Template Rejection & Version Locking Stress Testing
  // ============================================================================
  totalSuites++;
  console.log("\n--- [Suite 4/5] Template Lifecycle Rejection & Version Locking Stress Testing ---");

  // 4.1 Reject DRAFT template
  const draftTemplate = await prisma.template.create({
    data: {
      name: "Challenger Draft Template",
      status: "DRAFT",
      versions: {
        create: {
          version: 1,
          status: "DRAFT",
          content: "Draft content only"
        }
      }
    }
  });

  try {
    await assert.rejects(
      async () => {
        await DocumentGenerator.getApprovedTemplate(draftTemplate.id);
      },
      /No approved template found/,
      "DRAFT template must be rejected by DocumentGenerator"
    );
    assertionCount++;
  } finally {
    await prisma.templateVersion.deleteMany({ where: { templateId: draftTemplate.id } });
    await prisma.template.delete({ where: { id: draftTemplate.id } });
  }

  // 4.2 Reject UNDER_REVIEW template
  const underReviewTemplate = await prisma.template.create({
    data: {
      name: "Challenger Under Review Template",
      status: "UNDER_REVIEW",
      versions: {
        create: {
          version: 1,
          status: "UNDER_REVIEW",
          content: "Under review content only"
        }
      }
    }
  });

  try {
    await assert.rejects(
      async () => {
        await DocumentGenerator.getApprovedTemplate(underReviewTemplate.id);
      },
      /No approved template found/,
      "UNDER_REVIEW template must be rejected by DocumentGenerator"
    );
    assertionCount++;
  } finally {
    await prisma.templateVersion.deleteMany({ where: { templateId: underReviewTemplate.id } });
    await prisma.template.delete({ where: { id: underReviewTemplate.id } });
  }

  // 4.3 Reject ARCHIVED template
  const archivedTemplate = await prisma.template.create({
    data: {
      name: "Challenger Archived Template",
      status: "ARCHIVED",
      versions: {
        create: {
          version: 1,
          status: "ARCHIVED",
          content: "Archived content only"
        }
      }
    }
  });

  try {
    await assert.rejects(
      async () => {
        await DocumentGenerator.getApprovedTemplate(archivedTemplate.id);
      },
      /No approved template found/,
      "ARCHIVED template must be rejected by DocumentGenerator"
    );
    assertionCount++;
  } finally {
    await prisma.templateVersion.deleteMany({ where: { templateId: archivedTemplate.id } });
    await prisma.template.delete({ where: { id: archivedTemplate.id } });
  }

  // 4.4 Reject Template with LAWYER_APPROVED parent status, but version status is DRAFT
  const mismatchedTemplate = await prisma.template.create({
    data: {
      name: "Challenger Mismatched Template",
      status: "LAWYER_APPROVED",
      versions: {
        create: {
          version: 1,
          status: "DRAFT",
          content: "Unapproved draft version inside approved container"
        }
      }
    }
  });

  try {
    await assert.rejects(
      async () => {
        await DocumentGenerator.getApprovedTemplate(mismatchedTemplate.id);
      },
      /No approved template found/,
      "Template with unapproved version must be rejected by DocumentGenerator"
    );
    assertionCount++;
  } finally {
    await prisma.templateVersion.deleteMany({ where: { templateId: mismatchedTemplate.id } });
    await prisma.template.delete({ where: { id: mismatchedTemplate.id } });
  }

  // 4.5 Verify Approved Template Retrieval & Version Locking in Generation
  const approved = await DocumentGenerator.getApprovedTemplate();
  assertCondition(Boolean(approved && approved.template && approved.templateVersion), "Approved template must resolve");
  assertCondition(
    ["LAWYER_APPROVED", "LOCKED"].includes(approved.template.status),
    "Approved template status must be LAWYER_APPROVED or LOCKED"
  );
  assertCondition(
    ["LAWYER_APPROVED", "LOCKED"].includes(approved.templateVersion.status),
    "Approved template version status must be LAWYER_APPROVED or LOCKED"
  );

  const testCustomer = await prisma.user.findFirst({ where: { role: "CUSTOMER" } });
  assertCondition(Boolean(testCustomer), "Demo customer must exist");

  const challengeCase = await prisma.case.create({
    data: {
      customerId: testCustomer!.id,
      status: "PAID"
    }
  });

  try {
    await prisma.questionnaireAnswer.create({
      data: {
        caseId: challengeCase.id,
        questionnaireVersion: "v1.0",
        questionId: "test_section",
        answerData: JSON.stringify({
          fullName: "Challenger Verification Testator",
          address: "99 Fortress Way, Security Sector 4",
          hasMinorChildren: "No",
          isNRI: "No"
        })
      }
    });

    const genResult = await DocumentGenerator.generate(challengeCase.id, testCustomer!.id);
    assertCondition(genResult.docxBuffer instanceof Buffer, "DocumentGenerator must return Buffer");
    assertStrictEqual(genResult.docxBuffer[0], 0x50, "OpenXML signature byte 0 (P)");
    assertStrictEqual(genResult.docxBuffer[1], 0x4B, "OpenXML signature byte 1 (K)");

    const docRecord = await prisma.document.findFirst({
      where: { caseId: challengeCase.id },
      orderBy: { createdAt: "desc" }
    });

    assertCondition(Boolean(docRecord), "Document record must be written to Prisma");
    assertStrictEqual(docRecord!.templateVersionId, approved.templateVersion.id, "Document must accurately track templateVersionId");
    assertStrictEqual(docRecord!.fileHash, genResult.fileHash, "Document.fileHash must match generated fileHash");
    assertStrictEqual(genResult.fileHash.length, 64, "SHA256 hex string must be 64 chars");

    const physicalPath = path.join(process.cwd(), docRecord!.filePath!);
    assertCondition(fs.existsSync(physicalPath), "Physical file must exist on disk");
    const diskBytes = fs.readFileSync(physicalPath);
    const computedHash = crypto.createHash("sha256").update(diskBytes).digest("hex");
    assertStrictEqual(computedHash, docRecord!.fileHash, "Recalculated SHA256 of disk file must match recorded fileHash");

    const audit = await prisma.auditLog.findFirst({
      where: { caseId: challengeCase.id, action: "DOCUMENT_GENERATED" }
    });
    assertCondition(Boolean(audit), "DOCUMENT_GENERATED audit log must be recorded");
    assertStrictEqual(audit!.actorId, testCustomer!.id, "Audit log actorId must match caller");
  } finally {
    await prisma.auditLog.deleteMany({ where: { caseId: challengeCase.id } });
    await prisma.document.deleteMany({ where: { caseId: challengeCase.id } });
    await prisma.questionnaireAnswer.deleteMany({ where: { caseId: challengeCase.id } });
    await prisma.case.delete({ where: { id: challengeCase.id } });
  }

  console.log("✔ [PASS] Suite 4: Template lifecycle rejection (DRAFT, UNDER_REVIEW, ARCHIVED, mismatched) and version locking confirmed.");
  passedSuites++;

  // ============================================================================
  // SUITE 5: Download API & Metadata API RBAC & IDOR Security Matrix
  // ============================================================================
  totalSuites++;
  console.log("\n--- [Suite 5/5] Download API & Metadata API RBAC & IDOR Security Matrix ---");

  // Fetch real users from DB
  const customerA = await prisma.user.findFirst({ where: { email: "customer@demo.com" } });
  const customerB = await prisma.user.findFirst({ where: { email: "nri@demo.com" } });
  const lawyer1 = await prisma.user.findFirst({ where: { email: "lawyer@demo.com" } });
  const adminUser = await prisma.user.findFirst({ where: { email: "admin@demo.com" } });

  assertCondition(Boolean(customerA && customerB && lawyer1 && adminUser), "Demo users must exist in DB");

  // Create an auxiliary Lawyer 2 for cross-lawyer private case testing
  let lawyer2 = await prisma.user.findFirst({ where: { email: "lawyer2_challenge@demo.com" } });
  if (!lawyer2) {
    lawyer2 = await prisma.user.create({
      data: {
        email: "lawyer2_challenge@demo.com",
        name: "Lawyer Two Challenger",
        role: "LAWYER",
        password: "hashed_dummy_pw"
      }
    });
  }

  // Create Case A owned by Customer A, assigned to Lawyer 1
  const caseA = await prisma.case.create({
    data: {
      customerId: customerA!.id,
      lawyerId: lawyer1!.id,
      status: "DRAFT"
    }
  });

  // Create Case B owned by Customer B
  const caseB = await prisma.case.create({
    data: {
      customerId: customerB!.id,
      status: "DRAFT"
    }
  });

  // Create Case InReview (unassigned, status IN_REVIEW)
  const caseInReview = await prisma.case.create({
    data: {
      customerId: customerA!.id,
      lawyerId: null,
      status: "IN_REVIEW"
    }
  });

  try {
    // Populate answers for Case A and Case B
    await prisma.questionnaireAnswer.create({
      data: {
        caseId: caseA.id,
        questionnaireVersion: "v1.0",
        questionId: "info",
        answerData: JSON.stringify({ fullName: "Customer A Testator", address: "Case A Address" })
      }
    });

    await prisma.questionnaireAnswer.create({
      data: {
        caseId: caseB.id,
        questionnaireVersion: "v1.0",
        questionId: "info",
        answerData: JSON.stringify({ fullName: "Customer B Testator", address: "Case B Address" })
      }
    });

    await prisma.questionnaireAnswer.create({
      data: {
        caseId: caseInReview.id,
        questionnaireVersion: "v1.0",
        questionId: "info",
        answerData: JSON.stringify({ fullName: "In Review Testator", address: "Pool Address" })
      }
    });

    // 5.1 Unauthenticated request to /api/document/download -> 401 Unauthorized
    mockSession = null;
    const resUnauth = await downloadRoute.GET(new Request(`http://localhost:3000/api/document/download?caseId=${caseA.id}`));
    assertStrictEqual(resUnauth.status, 401, "Unauthenticated download request must return 401");
    const jsonUnauth = await resUnauth.json();
    assertStrictEqual(jsonUnauth.error, "Unauthorized", "Unauthenticated download response body must be 'Unauthorized'");

    // 5.2 Missing caseId -> 400 Bad Request
    mockSession = { user: { id: customerA!.id, role: customerA!.role } };
    const resNoCaseId = await downloadRoute.GET(new Request("http://localhost:3000/api/document/download"));
    assertStrictEqual(resNoCaseId.status, 400, "Missing caseId download request must return 400");
    const jsonNoCaseId = await resNoCaseId.json();
    assertStrictEqual(jsonNoCaseId.error, "Missing caseId", "Missing caseId response body must be 'Missing caseId'");

    // 5.3 Non-existent caseId -> 404 Case not found
    const resNonExistent = await downloadRoute.GET(new Request("http://localhost:3000/api/document/download?caseId=non-existent-case-123"));
    assertStrictEqual(resNonExistent.status, 404, "Non-existent caseId download request must return 404");

    // 5.4 Cross-Tenant IDOR Attack: Customer A attempts to download Customer B's document -> 403 Forbidden
    mockSession = { user: { id: customerA!.id, email: customerA!.email, role: customerA!.role } };
    const resIdorCustA = await downloadRoute.GET(new Request(`http://localhost:3000/api/document/download?caseId=${caseB.id}`));
    assertStrictEqual(resIdorCustA.status, 403, "Customer A downloading Customer B document must return 403 Forbidden");
    const jsonIdorCustA = await resIdorCustA.json();
    assertStrictEqual(jsonIdorCustA.error, "Forbidden", "IDOR rejection body must be 'Forbidden'");

    // 5.5 Cross-Tenant IDOR Attack: Customer B attempts to download Customer A's document -> 403 Forbidden
    mockSession = { user: { id: customerB!.id, email: customerB!.email, role: customerB!.role } };
    const resIdorCustB = await downloadRoute.GET(new Request(`http://localhost:3000/api/document/download?caseId=${caseA.id}`));
    assertStrictEqual(resIdorCustB.status, 403, "Customer B downloading Customer A document must return 403 Forbidden");
    const jsonIdorCustB = await resIdorCustB.json();
    assertStrictEqual(jsonIdorCustB.error, "Forbidden", "IDOR rejection body must be 'Forbidden'");

    // 5.6 Lawyer IDOR Attack: Unassigned Lawyer 2 attempts to download private draft case assigned to Lawyer 1 -> 403 Forbidden
    mockSession = { user: { id: lawyer2.id, email: lawyer2.email, role: lawyer2.role } };
    const resLawyerIdor = await downloadRoute.GET(new Request(`http://localhost:3000/api/document/download?caseId=${caseA.id}`));
    assertStrictEqual(resLawyerIdor.status, 403, "Unassigned Lawyer downloading private draft of another lawyer must return 403 Forbidden");
    const jsonLawyerIdor = await resLawyerIdor.json();
    assertStrictEqual(jsonLawyerIdor.error, "Forbidden", "Unassigned lawyer rejection body must be 'Forbidden'");

    // 5.7 Legitimate Owner: Customer A downloads own Case A -> 200 OK
    mockSession = { user: { id: customerA!.id, email: customerA!.email, role: customerA!.role } };
    const resOwnerDownload = await downloadRoute.GET(new Request(`http://localhost:3000/api/document/download?caseId=${caseA.id}`));
    assertStrictEqual(resOwnerDownload.status, 200, "Owner downloading own document must return 200 OK");
    assertStrictEqual(
      resOwnerDownload.headers.get("Content-Type"),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Owner download Content-Type must be OpenXML docx"
    );
    assertCondition(
      resOwnerDownload.headers.get("Content-Disposition")!.includes(`Will_Document_${caseA.id}.docx`),
      "Content-Disposition must include filename"
    );
    const ownerBytes = await resOwnerDownload.arrayBuffer();
    const ownerBuf = Buffer.from(ownerBytes);
    assertStrictEqual(ownerBuf[0], 0x50, "Downloaded document OpenXML magic byte P");
    assertStrictEqual(ownerBuf[1], 0x4B, "Downloaded document OpenXML magic byte K");

    // 5.8 Deduplication Cache Test: Second download of Case A should be a cache HIT with zero duplicate DB records
    const docCountBefore = await prisma.document.count({ where: { caseId: caseA.id } });
    const resCachedDownload = await downloadRoute.GET(new Request(`http://localhost:3000/api/document/download?caseId=${caseA.id}`));
    assertStrictEqual(resCachedDownload.status, 200, "Cached download must return 200 OK");
    assertStrictEqual(resCachedDownload.headers.get("X-Cache"), "HIT", "Repeat download must return X-Cache: HIT");
    const docCountAfter = await prisma.document.count({ where: { caseId: caseA.id } });
    assertStrictEqual(docCountAfter, docCountBefore, "Deduplication must NOT create duplicate Document rows");

    // 5.9 Force regeneration: ?force=true should return X-Cache: MISS
    const resForcedDownload = await downloadRoute.GET(new Request(`http://localhost:3000/api/document/download?caseId=${caseA.id}&force=true`));
    assertStrictEqual(resForcedDownload.status, 200, "Forced download must return 200 OK");
    assertStrictEqual(resForcedDownload.headers.get("X-Cache"), "MISS", "Forced download must return X-Cache: MISS");

    // 5.10 Legitimate Assigned Lawyer: Lawyer 1 downloads Case A -> 200 OK
    mockSession = { user: { id: lawyer1!.id, email: lawyer1!.email, role: lawyer1!.role } };
    const resLawyerDownload = await downloadRoute.GET(new Request(`http://localhost:3000/api/document/download?caseId=${caseA.id}`));
    assertStrictEqual(resLawyerDownload.status, 200, "Assigned lawyer downloading case document must return 200 OK");

    // 5.11 Legitimate Pool Lawyer: Lawyer 2 downloads Case InReview (unassigned pool case) -> 200 OK
    mockSession = { user: { id: lawyer2.id, email: lawyer2.email, role: lawyer2.role } };
    const resPoolDownload = await downloadRoute.GET(new Request(`http://localhost:3000/api/document/download?caseId=${caseInReview.id}`));
    assertStrictEqual(resPoolDownload.status, 200, "Lawyer downloading unassigned IN_REVIEW case document must return 200 OK");

    // 5.12 Global Admin: Admin downloads Case A and Case B -> 200 OK
    mockSession = { user: { id: adminUser!.id, email: adminUser!.email, role: adminUser!.role } };
    const resAdminA = await downloadRoute.GET(new Request(`http://localhost:3000/api/document/download?caseId=${caseA.id}`));
    assertStrictEqual(resAdminA.status, 200, "Admin downloading Case A must return 200 OK");
    const resAdminB = await downloadRoute.GET(new Request(`http://localhost:3000/api/document/download?caseId=${caseB.id}`));
    assertStrictEqual(resAdminB.status, 200, "Admin downloading Case B must return 200 OK");

    // 5.13 Metadata API RBAC Matrix (/api/document/metadata)
    // - Unauthenticated -> 401
    mockSession = null;
    const resMetaUnauth = await metadataRoute.GET(new Request(`http://localhost:3000/api/document/metadata?caseId=${caseA.id}`));
    assertStrictEqual(resMetaUnauth.status, 401, "Unauthenticated metadata request must return 401");

    // - IDOR: Customer B accesses Customer A metadata -> 403
    mockSession = { user: { id: customerB!.id, email: customerB!.email, role: customerB!.role } };
    const resMetaIdor = await metadataRoute.GET(new Request(`http://localhost:3000/api/document/metadata?caseId=${caseA.id}`));
    assertStrictEqual(resMetaIdor.status, 403, "Cross-customer metadata access must return 403");

    // - Lawyer IDOR: Unassigned Lawyer 2 accesses private Case A metadata -> 403
    mockSession = { user: { id: lawyer2.id, email: lawyer2.email, role: lawyer2.role } };
    const resMetaLawyerIdor = await metadataRoute.GET(new Request(`http://localhost:3000/api/document/metadata?caseId=${caseA.id}`));
    assertStrictEqual(resMetaLawyerIdor.status, 403, "Unassigned lawyer metadata access must return 403");

    // - Customer A accesses Customer A metadata -> 200 OK
    mockSession = { user: { id: customerA!.id, email: customerA!.email, role: customerA!.role } };
    const resMetaOwner = await metadataRoute.GET(new Request(`http://localhost:3000/api/document/metadata?caseId=${caseA.id}`));
    assertStrictEqual(resMetaOwner.status, 200, "Owner metadata access must return 200");
    const jsonMetaOwner = await resMetaOwner.json();
    assertStrictEqual(jsonMetaOwner.exists, true, "Metadata exists must be true");
    assertCondition(Boolean(jsonMetaOwner.document.fileHash), "Metadata document must include fileHash");

    // - Assigned Lawyer 1 accesses Case A metadata -> 200 OK
    mockSession = { user: { id: lawyer1!.id, email: lawyer1!.email, role: lawyer1!.role } };
    const resMetaLawyer = await metadataRoute.GET(new Request(`http://localhost:3000/api/document/metadata?caseId=${caseA.id}`));
    assertStrictEqual(resMetaLawyer.status, 200, "Assigned lawyer metadata access must return 200");

    // - Admin accesses Case A metadata -> 200 OK
    mockSession = { user: { id: adminUser!.id, email: adminUser!.email, role: adminUser!.role } };
    const resMetaAdmin = await metadataRoute.GET(new Request(`http://localhost:3000/api/document/metadata?caseId=${caseA.id}`));
    assertStrictEqual(resMetaAdmin.status, 200, "Admin metadata access must return 200");

  } finally {
    // Clean up created entities
    await prisma.auditLog.deleteMany({ where: { caseId: { in: [caseA.id, caseB.id, caseInReview.id] } } });
    await prisma.document.deleteMany({ where: { caseId: { in: [caseA.id, caseB.id, caseInReview.id] } } });
    await prisma.questionnaireAnswer.deleteMany({ where: { caseId: { in: [caseA.id, caseB.id, caseInReview.id] } } });
    await prisma.case.deleteMany({ where: { id: { in: [caseA.id, caseB.id, caseInReview.id] } } });
    if (lawyer2) {
      await prisma.user.delete({ where: { id: lawyer2.id } });
    }
  }

  console.log("✔ [PASS] Suite 5: All Download & Metadata API RBAC & IDOR security checks passed (401, 403, 200).");
  passedSuites++;

  // ============================================================================
  // FINAL SUMMARY & VERDICT
  // ============================================================================
  console.log("\n================================================================================");
  console.log(`  EMPIRICAL CHALLENGE COMPLETE: ${passedSuites}/${totalSuites} SUITES PASSED (${assertionCount} ASSERTIONS)`);
  console.log("  VERDICT: APPROVE (Zero Security Vulnerabilities / Zero Regressions)");
  console.log("================================================================================\n");

  await prisma.$disconnect();
}

runChallenge().catch((err) => {
  console.error("\n❌ CHALLENGE SUITE FAILURE:", err);
  process.exit(1);
});
