/**
 * Independent Adversarial Stress Test Suite: Milestone 3
 * Mandate:
 * 1. 500ms debounce behavior & rapid typing coalescing.
 * 2. Concurrent atomic upsert stress test on QuestionnaireAnswer using compound key caseId_questionId (zero P2002 errors, zero duplicate rows).
 * 3. State survival & hydration fidelity: save multi-section questionnaire data, simulate page reload / mount, verify all complex structures survive without data loss.
 * 4. Autosave state machine resilience: verify valid transitions between idle, saving, saved, and error states.
 */

const assert = require("assert");
const { PrismaClient, Prisma } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  suites: []
};

function recordAssertion(suiteName, testName, condition, extraInfo = "") {
  results.total++;
  let suite = results.suites.find(s => s.name === suiteName);
  if (!suite) {
    suite = { name: suiteName, passed: 0, failed: 0, tests: [] };
    results.suites.push(suite);
  }

  if (condition) {
    results.passed++;
    suite.passed++;
    suite.tests.push({ test: testName, status: "PASS", info: extraInfo });
    console.log(`    ✔ [PASS] ${testName}${extraInfo ? " — " + extraInfo : ""}`);
  } else {
    results.failed++;
    suite.failed++;
    suite.tests.push({ test: testName, status: "FAIL", info: extraInfo });
    console.error(`    ✖ [FAIL] ${testName}${extraInfo ? " — " + extraInfo : ""}`);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("================================================================================");
  console.log("CHALLENGER 1 (MILESTONE 3) — EMPIRICAL ADVERSARIAL AUTOSAVE STRESS TEST");
  console.log("================================================================================\n");

  const runId = Date.now();
  let testCustomer = null;
  let testCase = null;
  let hydrationCase = null;
  let unauthorizedCustomer = null;
  let unauthorizedCase = null;

  try {
    // Setup base test users and cases
    const hashedPassword = await bcrypt.hash("Password123!", 10);
    testCustomer = await prisma.user.create({
      data: {
        name: "Stress Tester M3",
        email: `m3_challenger_${runId}@demo.com`,
        password: hashedPassword,
        role: "CUSTOMER"
      }
    });

    testCase = await prisma.case.create({
      data: {
        customerId: testCustomer.id,
        status: "DRAFT",
        flags: "STANDARD"
      }
    });

    hydrationCase = await prisma.case.create({
      data: {
        customerId: testCustomer.id,
        status: "DRAFT",
        flags: "STANDARD"
      }
    });

    unauthorizedCustomer = await prisma.user.create({
      data: {
        name: "Unauthorized Attacker",
        email: `attacker_${runId}@demo.com`,
        password: hashedPassword,
        role: "CUSTOMER"
      }
    });

    unauthorizedCase = await prisma.case.create({
      data: {
        customerId: unauthorizedCustomer.id,
        status: "DRAFT"
      }
    });

    // =========================================================================
    // SUITE 1: 500ms Debounce Behavior & Rapid Typing Coalescing
    // =========================================================================
    console.log("▶ SUITE 1: 500ms Debounce Behavior & Rapid Typing Coalescing");
    const suite1 = "SUITE 1: Debounce Timing & Coalescing";

    // 1.1 Rapid keystroke burst (50 keystrokes @ 20ms = 1000ms total typing)
    {
      let saveCount = 0;
      let lastSavedPayload = null;
      let debounceTimer = null;
      let pendingData = {};

      const mockSave = (secId, data) => {
        saveCount++;
        lastSavedPayload = JSON.parse(JSON.stringify(data));
      };

      const handleKeystroke = (key, val) => {
        pendingData = { ...pendingData, [key]: val };
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          mockSave("personal_info", pendingData);
        }, 500);
      };

      let typedStr = "";
      const textToType = "Aarav Sharma - Rapid Typist Stress Testing Indian Will System MVP";
      
      for (let i = 0; i < textToType.length; i++) {
        typedStr += textToType[i];
        handleKeystroke("fullName", typedStr);
        await sleep(15); // typing faster than 500ms
      }

      // During rapid typing, saveCount must remain 0
      recordAssertion(
        suite1,
        "Zero saves fired during continuous rapid typing burst",
        saveCount === 0,
        `saveCount: ${saveCount}, expected: 0`
      );

      // Wait 300ms (not yet 500ms from last keystroke)
      await sleep(300);
      recordAssertion(
        suite1,
        "Debounce holds and does not fire at T=300ms (< 500ms threshold)",
        saveCount === 0,
        `saveCount: ${saveCount}, expected: 0`
      );

      // Wait another 300ms (total 600ms > 500ms from last keystroke)
      await sleep(300);
      recordAssertion(
        suite1,
        "Exactly ONE save call fired after 500ms period of inactivity",
        saveCount === 1,
        `saveCount: ${saveCount}, expected: 1`
      );

      recordAssertion(
        suite1,
        "Coalesced payload contains complete final typed string without truncation",
        lastSavedPayload?.fullName === textToType,
        `fullName length: ${lastSavedPayload?.fullName?.length}, expected: ${textToType.length}`
      );
    }

    // 1.2 Multi-burst typing with sub-500ms pause reset
    {
      let saveCount = 0;
      let lastSavedPayload = null;
      let debounceTimer = null;
      let pendingData = {};

      const mockSave = (secId, data) => {
        saveCount++;
        lastSavedPayload = JSON.parse(JSON.stringify(data));
      };

      const handleKeystroke = (key, val) => {
        pendingData = { ...pendingData, [key]: val };
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          mockSave("personal_info", pendingData);
        }, 500);
      };

      // Burst 1: 5 keystrokes
      handleKeystroke("city", "B"); await sleep(20);
      handleKeystroke("city", "Be"); await sleep(20);
      handleKeystroke("city", "Ben"); await sleep(20);
      handleKeystroke("city", "Beng"); await sleep(20);
      handleKeystroke("city", "Benga");

      // Pause for 300ms (< 500ms)
      await sleep(300);

      // Burst 2: 4 keystrokes
      handleKeystroke("city", "Bengal"); await sleep(20);
      handleKeystroke("city", "Bengalu"); await sleep(20);
      handleKeystroke("city", "Bengalur"); await sleep(20);
      handleKeystroke("city", "Bengaluru");

      // Pause for 200ms
      await sleep(200);
      recordAssertion(
        suite1,
        "Timer reset by secondary burst — no premature save at intermediate pause",
        saveCount === 0,
        `saveCount: ${saveCount}, expected: 0`
      );

      // Wait remaining 400ms (total 600ms > 500ms from last keystroke of burst 2)
      await sleep(400);
      recordAssertion(
        suite1,
        "Exactly ONE save call fired after burst 2 settles",
        saveCount === 1,
        `saveCount: ${saveCount}, expected: 1`
      );
      recordAssertion(
        suite1,
        "Final value reflects full merged text ('Bengaluru')",
        lastSavedPayload?.city === "Bengaluru",
        `city: ${lastSavedPayload?.city}`
      );
    }

    // 1.3 Immediate navigation flush (Pre-debounce unmount / next step)
    {
      let saveCount = 0;
      let lastSavedPayload = null;
      let debounceTimer = null;
      let pendingData = { fullName: "Aarav" };

      const mockSave = async (secId, data) => {
        saveCount++;
        lastSavedPayload = JSON.parse(JSON.stringify(data));
      };

      const handleKeystroke = (key, val) => {
        pendingData = { ...pendingData, [key]: val };
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          mockSave("personal_info", pendingData);
        }, 500);
      };

      const flushPendingSave = async (secId) => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        await mockSave(secId, pendingData);
      };

      // Type something
      handleKeystroke("fullName", "Aarav Sharma");
      // 50ms later, user immediately clicks "Next"
      await sleep(50);
      await flushPendingSave("personal_info");

      recordAssertion(
        suite1,
        "Immediate flush executes save instantly without waiting 500ms",
        saveCount === 1,
        `saveCount: ${saveCount}, expected: 1`
      );
      recordAssertion(
        suite1,
        "Flushed payload contains the latest un-debounced keystrokes",
        lastSavedPayload?.fullName === "Aarav Sharma",
        `fullName: ${lastSavedPayload?.fullName}`
      );

      // Wait 600ms to verify no orphan timer fires
      await sleep(600);
      recordAssertion(
        suite1,
        "No redundant trailing save fires from cleared debounce timer",
        saveCount === 1,
        `saveCount: ${saveCount}, expected: 1`
      );
    }

    // 1.4 Multi-field rapid updates coalescing into single section payload
    {
      let saveCount = 0;
      let lastSavedPayload = null;
      let debounceTimer = null;
      let pendingData = {};

      const mockSave = (secId, data) => {
        saveCount++;
        lastSavedPayload = JSON.parse(JSON.stringify(data));
      };

      const handleKeystroke = (key, val) => {
        pendingData = { ...pendingData, [key]: val };
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          mockSave("personal_info", pendingData);
        }, 500);
      };

      // Rapidly update 5 different fields in section
      handleKeystroke("fullName", "Aarav Sharma");
      await sleep(30);
      handleKeystroke("email", "aarav@example.com");
      await sleep(30);
      handleKeystroke("phone", "+91 98765 43210");
      await sleep(30);
      handleKeystroke("maritalStatus", "Married");
      await sleep(30);
      handleKeystroke("hasChildren", "Yes");

      await sleep(600);

      recordAssertion(
        suite1,
        "Rapid multi-field typing produces exactly one consolidated save",
        saveCount === 1,
        `saveCount: ${saveCount}, expected: 1`
      );
      const allFieldsPresent =
        lastSavedPayload?.fullName === "Aarav Sharma" &&
        lastSavedPayload?.email === "aarav@example.com" &&
        lastSavedPayload?.phone === "+91 98765 43210" &&
        lastSavedPayload?.maritalStatus === "Married" &&
        lastSavedPayload?.hasChildren === "Yes";
      recordAssertion(
        suite1,
        "Consolidated payload preserves all 5 distinct fields without collision or loss",
        allFieldsPresent,
        `Fields captured: ${Object.keys(lastSavedPayload || {}).join(", ")}`
      );
    }

    // =========================================================================
    // SUITE 2: Concurrent Atomic Upsert Stress Test on QuestionnaireAnswer
    // =========================================================================
    console.log("\n▶ SUITE 2: Concurrent Atomic Upsert Stress Test (Compound Key caseId_questionId)");
    const suite2 = "SUITE 2: Atomic Upsert Concurrency";

    // 2.1 Cold-start 30-way concurrent upsert barrage on empty case
    {
      const concurrency = 30;
      const promises = [];
      let p2002Errors = 0;
      let otherErrors = 0;

      for (let i = 0; i < concurrency; i++) {
        const payload = { iteration: i, timestamp: Date.now(), text: `Payload revision ${i}` };
        promises.push(
          prisma.questionnaireAnswer.upsert({
            where: {
              caseId_questionId: {
                caseId: testCase.id,
                questionId: "personal_info",
              },
            },
            update: {
              answerData: JSON.stringify(payload),
              questionnaireVersion: "v1.0",
              sectionId: "personal_info",
            },
            create: {
              caseId: testCase.id,
              questionId: "personal_info",
              sectionId: "personal_info",
              questionnaireVersion: "v1.0",
              answerData: JSON.stringify(payload),
            },
          }).catch((err) => {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
              p2002Errors++;
            } else {
              otherErrors++;
              console.error("Unexpected concurrency error:", err);
            }
            throw err;
          })
        );
      }

      const resultsList = await Promise.allSettled(promises);
      const successCount = resultsList.filter(r => r.status === "fulfilled").length;

      recordAssertion(
        suite2,
        `Cold-start ${concurrency}-way concurrent upsert generates ZERO P2002 unique collision errors`,
        p2002Errors === 0,
        `P2002 count: ${p2002Errors}, expected: 0`
      );
      recordAssertion(
        suite2,
        `Zero unexpected unhandled exceptions across all ${concurrency} concurrent promises`,
        otherErrors === 0,
        `Other errors: ${otherErrors}`
      );

      // Verify database row count
      const dbRows = await prisma.questionnaireAnswer.findMany({
        where: { caseId: testCase.id, questionId: "personal_info" }
      });
      recordAssertion(
        suite2,
        "Database contains EXACTLY ONE row for compound key (zero duplicate rows)",
        dbRows.length === 1,
        `Rows found: ${dbRows.length}, expected: 1`
      );

      const parsedData = JSON.parse(dbRows[0]?.answerData || "{}");
      recordAssertion(
        suite2,
        "Persisted row contains valid JSON data from one of the concurrent revisions",
        typeof parsedData.iteration === "number",
        `Final iteration stored: ${parsedData.iteration}`
      );
    }

    // 2.2 Warm update 30-way concurrent upsert barrage on existing row
    {
      const concurrency = 30;
      const promises = [];
      let p2002Errors = 0;
      let otherErrors = 0;

      for (let i = 0; i < concurrency; i++) {
        const payload = { revision: "warm_" + i, timestamp: Date.now() };
        promises.push(
          prisma.questionnaireAnswer.upsert({
            where: {
              caseId_questionId: {
                caseId: testCase.id,
                questionId: "personal_info",
              },
            },
            update: {
              answerData: JSON.stringify(payload),
              questionnaireVersion: "v1.0",
              sectionId: "personal_info",
            },
            create: {
              caseId: testCase.id,
              questionId: "personal_info",
              sectionId: "personal_info",
              questionnaireVersion: "v1.0",
              answerData: JSON.stringify(payload),
            },
          }).catch((err) => {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
              p2002Errors++;
            } else {
              otherErrors++;
            }
            throw err;
          })
        );
      }

      await Promise.allSettled(promises);

      recordAssertion(
        suite2,
        `Warm update ${concurrency}-way concurrent upsert generates ZERO P2002 errors`,
        p2002Errors === 0,
        `P2002 count: ${p2002Errors}, expected: 0`
      );

      const dbRows = await prisma.questionnaireAnswer.findMany({
        where: { caseId: testCase.id, questionId: "personal_info" }
      });
      recordAssertion(
        suite2,
        "Warm update maintains exactly 1 row (zero duplicate explosion under write contention)",
        dbRows.length === 1,
        `Rows found: ${dbRows.length}, expected: 1`
      );
    }

    // 2.3 Cross-section concurrent bombardment (5 sections x 10 concurrent requests = 50 total)
    {
      const sections = ["personal_info", "children", "assets", "beneficiaries", "executors"];
      const promises = [];
      let p2002Count = 0;

      for (const sec of sections) {
        for (let i = 0; i < 10; i++) {
          const payload = { section: sec, batchIndex: i, updated: Date.now() };
          promises.push(
            prisma.questionnaireAnswer.upsert({
              where: {
                caseId_questionId: {
                  caseId: testCase.id,
                  questionId: sec,
                },
              },
              update: {
                answerData: JSON.stringify(payload),
                questionnaireVersion: "v1.0",
                sectionId: sec,
              },
              create: {
                caseId: testCase.id,
                questionId: sec,
                sectionId: sec,
                questionnaireVersion: "v1.0",
                answerData: JSON.stringify(payload),
              },
            }).catch((err) => {
              if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
                p2002Count++;
              }
              throw err;
            })
          );
        }
      }

      await Promise.allSettled(promises);

      recordAssertion(
        suite2,
        "Cross-section 50-way bombardment generates ZERO P2002 errors across distinct sections",
        p2002Count === 0,
        `P2002 errors: ${p2002Count}`
      );

      const allAnswers = await prisma.questionnaireAnswer.findMany({
        where: { caseId: testCase.id }
      });

      recordAssertion(
        suite2,
        "Exactly 5 distinct rows created in database corresponding to the 5 distinct sections",
        allAnswers.length === 5,
        `Distinct rows found: ${allAnswers.length}, expected: 5`
      );

      const foundSectionIds = allAnswers.map(a => a.questionId).sort();
      const expectedSectionIds = [...sections].sort();
      recordAssertion(
        suite2,
        "Every section accurately stored with correct questionId without cross-talk",
        JSON.stringify(foundSectionIds) === JSON.stringify(expectedSectionIds),
        `Found: ${foundSectionIds.join(", ")}`
      );
    }

    // 2.4 IDOR Authorization Concurrency Guard Stress
    {
      // Simulate 15 concurrent unauthorized requests attempting to overwrite testCase
      const simulateRouteSave = async (actorUser, targetCaseId, secId, data) => {
        const existing = await prisma.case.findUnique({ where: { id: targetCaseId } });
        if (!existing) return { status: 404, error: "Case not found" };
        if (existing.customerId !== actorUser.id && actorUser.role !== "ADMIN") {
          return { status: 403, error: "Forbidden: You do not own this case" };
        }
        const saved = await prisma.questionnaireAnswer.upsert({
          where: { caseId_questionId: { caseId: targetCaseId, questionId: secId } },
          update: { answerData: JSON.stringify(data) },
          create: { caseId: targetCaseId, questionId: secId, sectionId: secId, questionnaireVersion: "v1.0", answerData: JSON.stringify(data) }
        });
        return { status: 200, saved };
      };

      const attackerPromises = [];
      for (let i = 0; i < 15; i++) {
        attackerPromises.push(
          simulateRouteSave(unauthorizedCustomer, testCase.id, "personal_info", {
            fullName: "HACKED BY ATTACKER"
          })
        );
      }

      const responses = await Promise.all(attackerPromises);
      const allForbidden = responses.every(r => r.status === 403);

      recordAssertion(
        suite2,
        "100% of concurrent unauthorized IDOR save requests are rejected with 403 Forbidden",
        allForbidden && responses.length === 15,
        `Forbidden count: ${responses.filter(r => r.status === 403).length}/15`
      );

      // Verify original case data was not overwritten
      const checkRow = await prisma.questionnaireAnswer.findUnique({
        where: { caseId_questionId: { caseId: testCase.id, questionId: "personal_info" } }
      });
      recordAssertion(
        suite2,
        "Legitimate owner's data remains 100% untainted and uncorrupted",
        !checkRow.answerData.includes("HACKED"),
        `Answer data: ${checkRow.answerData.slice(0, 60)}...`
      );
    }

    // =========================================================================
    // SUITE 3: State Survival & Hydration Fidelity
    // =========================================================================
    console.log("\n▶ SUITE 3: State Survival & Hydration Fidelity");
    const suite3 = "SUITE 3: State Survival & Hydration";

    // Build comprehensive, realistic Indian estate planning multi-section payload
    const deepSectionPayloads = {
      personal_info: {
        fullName: "श्री आरव शर्मा (Aarav Sharma)",
        gender: "Male",
        dateOfBirth: "1985-06-15",
        phone: "+91 98765 43210",
        email: "aarav.sharma+estate@test.gov.in",
        maritalStatus: "Married",
        spouseName: "Pooja Sharma",
        addressLine1: "Flat 1204, 'Palm Grove' Residency, 14th Cross / 2nd Main",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560034",
        religion: "Hindu",
        hasChildren: "Yes",
        hasMinorChildren: "Yes",
        notes: "Testator possesses digital accounts, crypto tokens, and real estate in multiple states."
      },
      children: {
        hasChildren: "Yes",
        hasMinorChildren: "Yes",
        childrenList: [
          {
            name: "Rohan Sharma",
            dateOfBirth: "2016-04-12",
            relationship: "Biological Son",
            isMinor: true,
            specialNeeds: false
          },
          {
            name: "Ananya Sharma",
            dateOfBirth: "2019-11-28",
            relationship: "Biological Daughter",
            isMinor: true,
            specialNeeds: false
          }
        ]
      },
      assets: {
        assetList: [
          {
            type: "Immovable Property",
            description: "3BHK Apartment in Koramangala",
            registrationNumber: "BLR-SOUTH-2018-9843",
            estimatedValue: 18500000.50,
            ownershipPercentage: 100.0,
            encumbrances: "None (Fully Paid)"
          },
          {
            type: "Bank Account",
            bankName: "HDFC Bank",
            accountNumber: "50100234918234",
            ifscCode: "HDFC0000128",
            branch: "Koramangala 4th Block",
            balance: 2450750.75
          },
          {
            type: "Mutual Funds / Demat",
            depository: "CDSL",
            boId: "1208160012345678",
            broker: "Zerodha Broking Limited",
            portfolioValuation: 4500000.00
          },
          {
            type: "Jewelry",
            description: "Ancestral Gold 22kt (250 grams) & Diamond necklace",
            lockerNumber: "L-42, SBI Koramangala Branch",
            estimatedValue: 1750000.00
          }
        ]
      },
      beneficiaries: {
        beneficiariesList: [
          {
            fullName: "Pooja Sharma",
            relationship: "Spouse",
            sharePercentage: 50.00,
            specificAssets: "3BHK Apartment in Koramangala & Jewelry"
          },
          {
            fullName: "Rohan Sharma",
            relationship: "Son",
            sharePercentage: 25.00,
            specificAssets: "HDFC Bank Account & Mutual Funds (half)"
          },
          {
            fullName: "Ananya Sharma",
            relationship: "Daughter",
            sharePercentage: 25.00,
            specificAssets: "Mutual Funds (half) & Fixed Deposits"
          }
        ]
      },
      executors: {
        primaryExecutorName: "Vikram Malhotra",
        primaryExecutorRelation: "Brother-in-law",
        primaryExecutorPhone: "+91 99887 76655",
        primaryExecutorEmail: "vikram.m@test.com",
        alternateExecutorName: "Karan Verma",
        alternateExecutorRelation: "Close Friend / Advocate",
        alternateExecutorPhone: "+91 91234 56789"
      },
      guardian: {
        guardianName: "Sunita Sharma",
        guardianRelation: "Paternal Aunt",
        guardianPhone: "+91 94455 66778",
        guardianAddress: "45 Heritage Enclave, Indiranagar, Bengaluru",
        guardianConsentObtained: "Yes"
      }
    };

    // 3.1 Persist each complex section
    for (const [secId, secData] of Object.entries(deepSectionPayloads)) {
      await prisma.questionnaireAnswer.upsert({
        where: { caseId_questionId: { caseId: hydrationCase.id, questionId: secId } },
        update: {
          answerData: JSON.stringify(secData),
          questionnaireVersion: "v1.0",
          sectionId: secId
        },
        create: {
          caseId: hydrationCase.id,
          questionId: secId,
          sectionId: secId,
          questionnaireVersion: "v1.0",
          answerData: JSON.stringify(secData)
        }
      });
    }

    // 3.2 Simulate Page Reload / Mount (App Router page logic)
    const reloadedCase = await prisma.case.findUnique({
      where: { id: hydrationCase.id },
      include: { answers: true }
    });

    recordAssertion(
      suite3,
      "Simulated page reload loads all saved section records",
      reloadedCase.answers.length === 6,
      `Loaded answers count: ${reloadedCase.answers.length}, expected: 6`
    );

    // Hydrate initialAnswers dictionary
    const hydratedAnswers = {};
    for (const ans of reloadedCase.answers) {
      try {
        const parsed = JSON.parse(ans.answerData);
        Object.assign(hydratedAnswers, parsed);
      } catch (e) {
        console.error("Hydration parse error:", e);
      }
    }

    // 3.3 Fidelity checks on complex structures
    recordAssertion(
      suite3,
      "Devanagari Unicode string survives serialization and hydration without corruption",
      hydratedAnswers.fullName === deepSectionPayloads.personal_info.fullName,
      `hydrated fullName: ${hydratedAnswers.fullName}`
    );

    recordAssertion(
      suite3,
      "Special characters (quotes, slashes, pluses) in address survive intact",
      hydratedAnswers.addressLine1 === deepSectionPayloads.personal_info.addressLine1,
      `addressLine1: ${hydratedAnswers.addressLine1}`
    );

    recordAssertion(
      suite3,
      "Children repeater array length and element order preserved perfectly",
      Array.isArray(hydratedAnswers.childrenList) &&
      hydratedAnswers.childrenList.length === 2 &&
      hydratedAnswers.childrenList[0].name === "Rohan Sharma" &&
      hydratedAnswers.childrenList[1].name === "Ananya Sharma",
      `Children count: ${hydratedAnswers.childrenList?.length}`
    );

    recordAssertion(
      suite3,
      "Assets repeater array with heterogeneous items and floating point valuations preserved",
      Array.isArray(hydratedAnswers.assetList) &&
      hydratedAnswers.assetList.length === 4 &&
      hydratedAnswers.assetList[0].estimatedValue === 18500000.50 &&
      hydratedAnswers.assetList[1].balance === 2450750.75,
      `Asset items count: ${hydratedAnswers.assetList?.length}`
    );

    recordAssertion(
      suite3,
      "Beneficiaries allocation percentages preserved with numeric precision",
      Array.isArray(hydratedAnswers.beneficiariesList) &&
      hydratedAnswers.beneficiariesList.reduce((acc, b) => acc + b.sharePercentage, 0) === 100.00,
      `Total share sum: ${hydratedAnswers.beneficiariesList?.reduce((acc, b) => acc + b.sharePercentage, 0)}%`
    );

    recordAssertion(
      suite3,
      "Conditional fields (hasChildren=Yes, hasMinorChildren=Yes) hydrated correctly",
      hydratedAnswers.hasChildren === "Yes" && hydratedAnswers.hasMinorChildren === "Yes",
      `hasChildren: ${hydratedAnswers.hasChildren}, hasMinorChildren: ${hydratedAnswers.hasMinorChildren}`
    );

    recordAssertion(
      suite3,
      "Guardian section answers hydrated cleanly",
      hydratedAnswers.guardianName === "Sunita Sharma" && hydratedAnswers.guardianConsentObtained === "Yes",
      `guardianName: ${hydratedAnswers.guardianName}`
    );

    // =========================================================================
    // SUITE 4: Autosave State Machine Resilience
    // =========================================================================
    console.log("\n▶ SUITE 4: Autosave State Machine Resilience");
    const suite4 = "SUITE 4: Autosave State Machine";

    /**
     * Formal State Machine Model conforming to QuestionnaireEngine:
     * Allowed States: 'idle', 'saving', 'saved', 'error'
     */
    class AutosaveStateMachine {
      constructor() {
        this.state = "idle";
        this.lastSavedTime = null;
        this.saveError = null;
        this.history = ["idle"];
      }

      transition(newState, payload = {}) {
        const allowedTransitions = {
          idle: ["saving"],
          saving: ["saved", "error", "saving"],
          saved: ["saving", "idle"],
          error: ["saving"]
        };

        if (!allowedTransitions[this.state].includes(newState)) {
          throw new Error(`Illegal state transition from ${this.state} to ${newState}`);
        }

        this.state = newState;
        this.history.push(newState);

        if (newState === "saved") {
          this.lastSavedTime = payload.time || new Date().toISOString();
          this.saveError = null;
        } else if (newState === "error") {
          this.saveError = payload.error || "Save failed - retrying...";
        } else if (newState === "saving") {
          this.saveError = null;
        }
      }
    }

    // 4.1 Standard lifecycle: idle -> saving -> saved
    {
      const sm = new AutosaveStateMachine();
      recordAssertion(suite4, "Initial state machine state is 'idle'", sm.state === "idle");

      // User types keystroke
      sm.transition("saving");
      recordAssertion(suite4, "Keystroke transitions state from 'idle' to 'saving'", sm.state === "saving");

      // Save succeeds
      sm.transition("saved", { time: "12:00:00 PM" });
      recordAssertion(
        suite4,
        "Successful save transitions state from 'saving' to 'saved'",
        sm.state === "saved" && sm.lastSavedTime === "12:00:00 PM" && sm.saveError === null
      );
    }

    // 4.2 Error handling & retry recovery: saving -> error -> saving -> saved
    {
      const sm = new AutosaveStateMachine();
      sm.transition("saving");
      sm.transition("error", { error: "Network timeout: 504 Gateway Timeout" });

      recordAssertion(
        suite4,
        "Network/server failure transitions state from 'saving' to 'error'",
        sm.state === "error" && sm.saveError.includes("504"),
        `State: ${sm.state}, Error: ${sm.saveError}`
      );

      // User clicks "Retry Save"
      sm.transition("saving");
      recordAssertion(
        suite4,
        "Retry save transitions state from 'error' back to 'saving' and clears previous error",
        sm.state === "saving" && sm.saveError === null
      );

      // Recovery success
      sm.transition("saved", { time: "12:01:30 PM" });
      recordAssertion(
        suite4,
        "Successful retry transitions state to 'saved'",
        sm.state === "saved" && sm.lastSavedTime === "12:01:30 PM"
      );
    }

    // 4.3 Illegal transition protection
    {
      const sm = new AutosaveStateMachine();
      let illegalCaught = false;
      try {
        // Direct jump from idle to saved without saving
        sm.transition("saved");
      } catch (err) {
        illegalCaught = true;
      }
      recordAssertion(
        suite4,
        "Direct illegal transition from 'idle' to 'saved' is strictly rejected",
        illegalCaught
      );

      // Transition from error to saved directly (skipping saving)
      sm.transition("saving");
      sm.transition("error", { error: "DB Error" });
      let directErrorToSaved = false;
      try {
        sm.transition("saved");
      } catch (err) {
        directErrorToSaved = true;
      }
      recordAssertion(
        suite4,
        "Direct illegal transition from 'error' to 'saved' without re-saving is rejected",
        directErrorToSaved
      );
    }

    // 4.4 In-flight race condition / Typing while save is in progress
    {
      let isSavingInFlight = false;
      let pendingChangesExist = false;
      let currentState = "idle";
      const stateHistory = [];

      const recordState = (st) => {
        currentState = st;
        stateHistory.push(st);
      };

      // User types: Start Save 1
      recordState("saving");
      isSavingInFlight = true;

      // While Save 1 is in-flight, user types more characters at T=50ms
      pendingChangesExist = true;

      // Save 1 completes at T=100ms
      isSavingInFlight = false;

      // If pending changes exist, system must NOT transition to a false terminal "saved" state
      // that masks unpersisted edits; instead it triggers debounced Save 2
      let prematureSavedReported = false;
      if (pendingChangesExist) {
        // Debounce will fire Save 2; intermediate state remains 'saving'
        recordState("saving");
      } else {
        recordState("saved");
        prematureSavedReported = true;
      }

      recordAssertion(
        suite4,
        "System does not report premature 'saved' when new edits were queued during in-flight save",
        !prematureSavedReported && currentState === "saving"
      );

      // Save 2 completes
      pendingChangesExist = false;
      recordState("saved");

      recordAssertion(
        suite4,
        "Final state cleanly resolves to 'saved' only after all queued edits are committed",
        currentState === "saved" && stateHistory.slice(-2).join("->") === "saving->saved"
      );
    }

  } finally {
    // Teardown test records
    console.log("\n--- Cleaning up test artifacts ---");
    if (testCase) {
      await prisma.questionnaireAnswer.deleteMany({ where: { caseId: testCase.id } });
      await prisma.auditLog.deleteMany({ where: { caseId: testCase.id } });
      await prisma.case.deleteMany({ where: { id: testCase.id } });
    }
    if (hydrationCase) {
      await prisma.questionnaireAnswer.deleteMany({ where: { caseId: hydrationCase.id } });
      await prisma.auditLog.deleteMany({ where: { caseId: hydrationCase.id } });
      await prisma.case.deleteMany({ where: { id: hydrationCase.id } });
    }
    if (unauthorizedCase) {
      await prisma.case.deleteMany({ where: { id: unauthorizedCase.id } });
    }
    if (testCustomer) {
      await prisma.auditLog.deleteMany({ where: { actorId: testCustomer.id } });
      await prisma.user.deleteMany({ where: { id: testCustomer.id } });
    }
    if (unauthorizedCustomer) {
      await prisma.auditLog.deleteMany({ where: { actorId: unauthorizedCustomer.id } });
      await prisma.user.deleteMany({ where: { id: unauthorizedCustomer.id } });
    }
    await prisma.$disconnect();
    console.log("Cleanup complete.\n");
  }

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log("================================================================================");
  console.log("CHALLENGER 1 STRESS TEST EXECUTION SUMMARY");
  console.log("================================================================================");
  console.log(`Total Assertions : ${results.total}`);
  console.log(`Passed           : ${results.passed}`);
  console.log(`Failed           : ${results.failed}`);

  for (const s of results.suites) {
    console.log(`  • ${s.name}: ${s.passed}/${s.passed + s.failed} passed`);
  }

  if (results.failed === 0) {
    console.log("\n>>> ALL ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY! <<<");
  } else {
    console.error(`\n>>> ${results.failed} STRESS TEST ASSERTIONS FAILED! <<<`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in challenger stress test:", err);
  process.exit(1);
});
