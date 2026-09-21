/**
 * Empirical Challenger Verification Suite for Milestone 1
 * 
 * Verifies:
 * 1. Next.js 16 Promise searchParams resolution logic (exact production logic)
 * 2. QuestionnaireEngine activeSections derivation and forward/backward navigation
 * 3. Boundary conditions, condition evaluations, and repeater field handling
 */

import { questionnaireConfig } from "../src/lib/questionnaire.ts";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  totalTests++;
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    passedTests++;
    console.log(`  ✓ PASS: ${message} (got ${actualStr})`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message} (expected ${expectedStr}, got ${actualStr})`);
  }
}

console.log("===============================================================================");
console.log("EMPIRICAL CHALLENGER TEST SUITE — MILESTONE 1");
console.log("===============================================================================\n");

// -----------------------------------------------------------------------------
// PART 1: Next.js 16 Promise searchParams Resolution Logic
// -----------------------------------------------------------------------------
console.log("--- PART 1: Promise searchParams Resolution Logic ---");

// Production function mirroring src/app/customer/questionnaire/page.tsx:17-23
async function resolveCaseId(searchParams) {
  const resolvedParams = await searchParams;
  let caseId = typeof resolvedParams?.caseId === "string"
    ? resolvedParams.caseId
    : Array.isArray(resolvedParams?.caseId)
    ? resolvedParams.caseId[0]
    : undefined;
  return caseId;
}

async function runSearchParamsTests() {
  // Test 1.1: Single string caseId
  const r1 = await resolveCaseId(Promise.resolve({ caseId: "test-123" }));
  assertEqual(r1, "test-123", "Extract single string caseId from resolved Promise");

  // Test 1.2: Array caseId with single element
  const r2 = await resolveCaseId(Promise.resolve({ caseId: ["test-456"] }));
  assertEqual(r2, "test-456", "Extract first string from array caseId");

  // Test 1.3: Array caseId with multiple elements
  const r3 = await resolveCaseId(Promise.resolve({ caseId: ["primary-case", "secondary-case"] }));
  assertEqual(r3, "primary-case", "Extract first item when multiple values passed");

  // Test 1.4: Empty object in Promise
  const r4 = await resolveCaseId(Promise.resolve({}));
  assertEqual(r4, undefined, "Empty object resolves caseId to undefined");

  // Test 1.5: Explicit undefined caseId
  const r5 = await resolveCaseId(Promise.resolve({ caseId: undefined }));
  assertEqual(r5, undefined, "Explicit undefined resolves to undefined");

  // Test 1.6: Empty array caseId
  const r6 = await resolveCaseId(Promise.resolve({ caseId: [] }));
  assertEqual(r6, undefined, "Empty array resolves to undefined (no out-of-bounds error)");

  // Test 1.7: Null searchParams in Promise
  const r7 = await resolveCaseId(Promise.resolve(null));
  assertEqual(r7, undefined, "Null searchParams resolves safely to undefined");

  // Test 1.8: Undefined searchParams in Promise
  const r8 = await resolveCaseId(Promise.resolve(undefined));
  assertEqual(r8, undefined, "Undefined searchParams resolves safely to undefined");

  // Test 1.9: Non-string, non-array types (e.g. numeric or boolean)
  const r9 = await resolveCaseId(Promise.resolve({ caseId: 12345 }));
  assertEqual(r9, undefined, "Numeric caseId resolves to undefined for type safety");

  const r10 = await resolveCaseId(Promise.resolve({ caseId: true }));
  assertEqual(r10, undefined, "Boolean caseId resolves to undefined");

  // Test 1.10: Empty string
  const r11 = await resolveCaseId(Promise.resolve({ caseId: "" }));
  assertEqual(r11, "", "Empty string returns '' (falsy, correctly triggers case creation via !caseId)");

  // Test 1.11: Delayed async promise resolution
  const delayedPromise = new Promise((resolve) => {
    setTimeout(() => resolve({ caseId: "async-delayed-uuid" }), 15);
  });
  const r12 = await resolveCaseId(delayedPromise);
  assertEqual(r12, "async-delayed-uuid", "Resolves correctly across asynchronous microtask boundary");

  // Test 1.12: Concurrent resolution of multiple promises
  const promises = [
    resolveCaseId(Promise.resolve({ caseId: "c1" })),
    resolveCaseId(Promise.resolve({ caseId: "c2" })),
    resolveCaseId(Promise.resolve({ caseId: "c3" }))
  ];
  const r13 = await Promise.all(promises);
  assertEqual(r13, ["c1", "c2", "c3"], "Concurrent resolution of independent searchParams requests");
}

await runSearchParamsTests();
console.log();

// -----------------------------------------------------------------------------
// PART 2: QuestionnaireEngine Condition Evaluation and activeSections
// -----------------------------------------------------------------------------
console.log("--- PART 2: QuestionnaireEngine ActiveSections & Navigation ---");

// Production condition checker from src/components/QuestionnaireEngine.tsx:51-66
function checkConditions(conditions, currentAnswers) {
  if (!conditions || conditions.length === 0) return true;
  for (const cond of conditions) {
    const val = currentAnswers[cond.field];
    if (cond.operator === "equals" && val !== cond.value) {
      return false;
    }
    if (cond.operator === "not_equals" && val === cond.value) {
      return false;
    }
  }
  return true;
}

// Production activeSections derivation from src/components/QuestionnaireEngine.tsx:69-72
function deriveActiveSections(answers) {
  const rawSections = questionnaireConfig.sections;
  return rawSections.filter((sec) => checkConditions(sec.conditions, answers));
}

// Test 2.1: Default raw configuration
assertEqual(questionnaireConfig.sections.length, 9, "Raw questionnaire configuration has exactly 9 sections");

// Test 2.2: Condition evaluation operators
assert(checkConditions(undefined, {}), "Undefined conditions evaluate to true");
assert(checkConditions([], {}), "Empty conditions evaluate to true");
assert(checkConditions([{ field: "a", operator: "equals", value: "x" }], { a: "x" }), "Equals operator matches equal value");
assert(!checkConditions([{ field: "a", operator: "equals", value: "x" }], { a: "y" }), "Equals operator rejects different value");
assert(!checkConditions([{ field: "a", operator: "equals", value: "x" }], {}), "Equals operator rejects missing field");
assert(checkConditions([{ field: "a", operator: "not_equals", value: "x" }], { a: "y" }), "Not_equals matches non-matching value");
assert(!checkConditions([{ field: "a", operator: "not_equals", value: "x" }], { a: "x" }), "Not_equals rejects equal value");

// Test 2.3: Multi-condition AND evaluation
const multiConds = [
  { field: "hasChildren", operator: "equals", value: "Yes" },
  { field: "hasMinorChildren", operator: "equals", value: "Yes" }
];
assert(!checkConditions(multiConds, {}), "Multi-condition: false when empty answers");
assert(!checkConditions(multiConds, { hasChildren: "Yes" }), "Multi-condition: false when only 1 of 2 matches");
assert(!checkConditions(multiConds, { hasMinorChildren: "Yes" }), "Multi-condition: false when only 2nd condition matches");
assert(checkConditions(multiConds, { hasChildren: "Yes", hasMinorChildren: "Yes" }), "Multi-condition: true when both match");

// Test 2.4: Active sections with default / empty answers
const defaultActive = deriveActiveSections({});
assertEqual(defaultActive.length, 8, "Empty answers yield 8 active sections (guardian excluded)");
const defaultIds = defaultActive.map(s => s.id);
assert(!defaultIds.includes("guardian"), "Guardian section is NOT in activeSections when answers are empty");
assertEqual(defaultIds, [
  "personal_info",
  "children",
  "assets",
  "nri",
  "beneficiaries",
  "executor",
  "existing_will",
  "special_circumstances"
], "Active sections order matches expected sequence excluding guardian");

// Test 2.5: Active sections with hasChildren: 'No'
const noChildrenActive = deriveActiveSections({ hasChildren: "No" });
assertEqual(noChildrenActive.length, 8, "hasChildren: 'No' yields 8 active sections");
assert(!noChildrenActive.map(s => s.id).includes("guardian"), "Guardian section is excluded when hasChildren is 'No'");

// Test 2.6: Active sections with hasChildren: 'Yes' and hasMinorChildren: 'Yes'
const withMinorChildrenActive = deriveActiveSections({
  hasChildren: "Yes",
  hasMinorChildren: "Yes"
});
assertEqual(withMinorChildrenActive.length, 9, "hasChildren: 'Yes' AND hasMinorChildren: 'Yes' yields 9 active sections");
const withMinorIds = withMinorChildrenActive.map(s => s.id);
assert(withMinorIds.includes("guardian"), "Guardian section IS included in activeSections");
assertEqual(withMinorIds[2], "guardian", "Guardian section is inserted at index 2 (after children, before assets)");

console.log();

// -----------------------------------------------------------------------------
// PART 3: Navigation Simulation Harness
// -----------------------------------------------------------------------------
console.log("--- PART 3: Navigation Simulation Harness ---");

class QuestionnaireSimulation {
  constructor(initialAnswers = {}) {
    this.answers = { ...initialAnswers };
    this.currentSectionIndex = 0;
    this.navigationHistory = [];
    this.checkoutReached = false;
  }

  getActiveSections() {
    return deriveActiveSections(this.answers);
  }

  getCurrentSection() {
    const active = this.getActiveSections();
    return active[this.currentSectionIndex] || active[0];
  }

  setAnswer(questionId, value) {
    this.answers[questionId] = value;
    // Mirror QuestionnaireEngine.tsx:74-79 useEffect clamp
    const active = this.getActiveSections();
    if (this.currentSectionIndex >= active.length && active.length > 0) {
      this.currentSectionIndex = active.length - 1;
    }
  }

  handleNext() {
    const active = this.getActiveSections();
    this.navigationHistory.push({
      action: "next",
      fromIndex: this.currentSectionIndex,
      fromSectionId: active[this.currentSectionIndex]?.id
    });

    if (this.currentSectionIndex < active.length - 1) {
      this.currentSectionIndex += 1;
    } else {
      this.checkoutReached = true;
    }
  }

  handleBack() {
    const active = this.getActiveSections();
    this.navigationHistory.push({
      action: "back",
      fromIndex: this.currentSectionIndex,
      fromSectionId: active[this.currentSectionIndex]?.id
    });

    if (this.currentSectionIndex > 0) {
      this.currentSectionIndex -= 1;
    }
  }
}

// Simulation Scenario 1: Forward navigation without children (guardian skipped)
console.log("Simulation 1: User with no children moves forward past conditional section");
const sim1 = new QuestionnaireSimulation({ hasChildren: "No" });
assertEqual(sim1.getCurrentSection().id, "personal_info", "Starts at personal_info (index 0)");

sim1.handleNext(); // to children
assertEqual(sim1.getCurrentSection().id, "children", "Navigates to children (index 1)");

sim1.handleNext(); // should skip guardian and go to assets
assertEqual(sim1.getCurrentSection().id, "assets", "Navigates directly to assets (index 2), skipping guardian");

// Now navigate BACK
sim1.handleBack(); // back from assets
assertEqual(sim1.getCurrentSection().id, "children", "Navigates BACK from assets directly to children (index 1)");

sim1.handleBack(); // back from children
assertEqual(sim1.getCurrentSection().id, "personal_info", "Navigates BACK from children to personal_info (index 0)");

// Check for boundary on back
sim1.handleBack();
assertEqual(sim1.getCurrentSection().id, "personal_info", "Back button at index 0 does not underflow");

// Forward all the way to completion
const visitedIds = [];
while (!sim1.checkoutReached) {
  visitedIds.push(sim1.getCurrentSection().id);
  sim1.handleNext();
}

assert(!visitedIds.includes("guardian"), "Guardian was NEVER entered across entire questionnaire run");
assertEqual(visitedIds, [
  "personal_info",
  "children",
  "assets",
  "nri",
  "beneficiaries",
  "executor",
  "existing_will",
  "special_circumstances"
], "Visited all 8 active sections in correct order");
assert(sim1.checkoutReached, "Reached checkout navigation after final section");

console.log();

// Simulation Scenario 2: Dynamic Answer Change (Back-and-Forth conditional activation)
console.log("Simulation 2: User toggles hasChildren on and off dynamically");
const sim2 = new QuestionnaireSimulation();

// User fills section 0
sim2.handleNext(); // at children (index 1)
assertEqual(sim2.getCurrentSection().id, "children", "At children section");

// User selects hasChildren: 'Yes', hasMinorChildren: 'Yes'
sim2.setAnswer("hasChildren", "Yes");
sim2.setAnswer("hasMinorChildren", "Yes");
assertEqual(sim2.getActiveSections().length, 9, "Active sections expanded to 9");

// User navigates Next into Guardian
sim2.handleNext();
assertEqual(sim2.getCurrentSection().id, "guardian", "User enters guardian section (index 2)");

// User navigates Next into Assets
sim2.handleNext();
assertEqual(sim2.getCurrentSection().id, "assets", "User enters assets section (index 3)");

// User navigates Back into Guardian
sim2.handleBack();
assertEqual(sim2.getCurrentSection().id, "guardian", "User navigates Back into guardian section (index 2)");

// User navigates Back into Children
sim2.handleBack();
assertEqual(sim2.getCurrentSection().id, "children", "User navigates Back into children section (index 1)");

// Now user changes mind and selects hasChildren: 'No'
sim2.setAnswer("hasChildren", "No");
assertEqual(sim2.getActiveSections().length, 8, "Active sections shrink back to 8");
assertEqual(sim2.getCurrentSection().id, "children", "User remains safely at children section (index 1)");

// User clicks Next -> must land on assets, skipping guardian!
sim2.handleNext();
assertEqual(sim2.getCurrentSection().id, "assets", "User moves directly from children to assets without encountering guardian");

// User clicks Back -> must land on children, NO TRAP!
sim2.handleBack();
assertEqual(sim2.getCurrentSection().id, "children", "User navigates Back to children without getting trapped or bounced forward");

console.log();

// Simulation Scenario 3: Shrink active sections when at boundary
console.log("Simulation 3: Section index clamp when activeSections shrinks at boundary");
const sim3 = new QuestionnaireSimulation({
  hasChildren: "Yes",
  hasMinorChildren: "Yes"
});
// Navigate all the way to index 8 (special_circumstances in 9-section config)
for (let i = 0; i < 8; i++) {
  sim3.handleNext();
}
assertEqual(sim3.currentSectionIndex, 8, "At last section (index 8, 9 total sections)");
assertEqual(sim3.getCurrentSection().id, "special_circumstances", "Section is special_circumstances");

// Now suppose answers change such that guardian is excluded
sim3.setAnswer("hasChildren", "No");
assertEqual(sim3.getActiveSections().length, 8, "Active sections reduced to 8");
assertEqual(sim3.currentSectionIndex, 7, "Index clamped to 7 (activeSections.length - 1)");
assertEqual(sim3.getCurrentSection().id, "special_circumstances", "Current section remains special_circumstances safely");

console.log();

// -----------------------------------------------------------------------------
// PART 4: Question-Level Conditions & Repeater Verification
// -----------------------------------------------------------------------------
console.log("--- PART 4: Question-Level Conditions & Repeater Logic ---");

const personalInfoSection = questionnaireConfig.sections.find(s => s.id === "personal_info");
const spouseQuestion = personalInfoSection.questions.find(q => q.id === "spouseName");
assert(spouseQuestion !== undefined, "Spouse name question exists");
assert(!checkConditions(spouseQuestion.conditions, { maritalStatus: "Single" }), "Spouse question hidden when maritalStatus is Single");
assert(checkConditions(spouseQuestion.conditions, { maritalStatus: "Married" }), "Spouse question visible when maritalStatus is Married");

const nriSection = questionnaireConfig.sections.find(s => s.id === "nri");
const countryResQuestion = nriSection.questions.find(q => q.id === "countryOfResidence");
assert(countryResQuestion !== undefined, "countryOfResidence question exists");
assert(!checkConditions(countryResQuestion.conditions, { isNRI: "No" }), "Country of residence hidden when isNRI is No");
assert(checkConditions(countryResQuestion.conditions, { isNRI: "Yes" }), "Country of residence visible when isNRI is Yes");

console.log("\n===============================================================================");
console.log(`TEST SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log("===============================================================================");

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
