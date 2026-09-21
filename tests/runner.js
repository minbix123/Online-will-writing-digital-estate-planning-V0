/**
 * Lightweight Zero-Dependency E2E Test Runner for Indian Online Will-Writing Platform
 * Supports Tier-based execution (--tier=1, --tier=2, --tier=3, --tier=4)
 * Formatted hierarchical output, timing, summary counts, and exit codes.
 */

const fs = require('fs');
const path = require('path');

// Automatically register ts-node and tsconfig-paths so tests can import both JS and TS application modules
try {
  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
      module: 'commonjs',
      moduleResolution: 'node',
      esModuleInterop: true
    }
  });
  const tsConfigPaths = require('tsconfig-paths');
  tsConfigPaths.register({
    baseUrl: path.resolve(__dirname, '..'),
    paths: {
      '@/*': ['src/*']
    }
  });
} catch (err) {
  // Fallback to native Node
}

// ANSI color escape codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m'
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    tier: null,
    filter: null,
    file: null,
    bail: false,
    verbose: false
  };

  for (const arg of args) {
    if (arg.startsWith('--tier=')) {
      options.tier = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--filter=')) {
      options.filter = arg.split('=')[1];
    } else if (arg === '--bail') {
      options.bail = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (!arg.startsWith('--') && arg.endsWith('.js')) {
      options.file = arg;
    }
  }

  return options;
}

const TIER_DIRS = {
  1: { dir: 'tier1_features', label: 'Tier 1: Feature Coverage' },
  2: { dir: 'tier2_boundaries', label: 'Tier 2: Boundary & Corner Cases' },
  3: { dir: 'tier3_combinations', label: 'Tier 3: Pairwise Combinations' },
  4: { dir: 'tier4_scenarios', label: 'Tier 4: Real-World Scenarios' }
};

function getTestFiles(tierNum) {
  const tierConfig = TIER_DIRS[tierNum];
  if (!tierConfig) return [];

  const tierDirPath = path.join(__dirname, tierConfig.dir);
  if (!fs.existsSync(tierDirPath)) return [];

  return fs.readdirSync(tierDirPath)
    .filter(f => f.startsWith('test_') && f.endsWith('.js'))
    .sort()
    .map(f => path.join(tierDirPath, f));
}

async function runSuite(suite, suiteIndex, totalSuites) {
  let passed = 0;
  let failed = 0;
  const failures = [];

  const suiteName = suite.name || 'Anonymous Test Suite';
  console.log(`\n${colors.bold}${colors.cyan}▶ [Suite ${suiteIndex}/${totalSuites}] ${suiteName}${colors.reset}`);

  for (const t of suite.tests) {
    const testName = t.name;
    const startTime = Date.now();
    try {
      if (typeof t.fn !== 'function') {
        throw new Error(`Test "${testName}" has no executable function`);
      }
      await t.fn();
      const duration = Date.now() - startTime;
      passed++;
      console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${testName} ${colors.gray}(${duration}ms)${colors.reset}`);
    } catch (err) {
      const duration = Date.now() - startTime;
      failed++;
      console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${testName} ${colors.gray}(${duration}ms)${colors.reset}`);
      failures.push({ testName, error: err, suiteName });
    }
  }

  return { passed, failed, failures };
}

async function runAll() {
  const options = parseArgs();
  const suiteStartTime = Date.now();

  console.log(`\n${colors.bold}${colors.magenta}========================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.white}  Indian Online Will-Writing & Digital Estate Planning Platform MVP${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}  Deterministic E2E Test Suite Runner${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}========================================================================${colors.reset}`);

  let tiersToRun = [1, 2, 3, 4];
  if (options.tier) {
    if (!TIER_DIRS[options.tier]) {
      console.error(`${colors.red}Invalid tier: ${options.tier}. Supported tiers: 1, 2, 3, 4.${colors.reset}`);
      process.exit(1);
    }
    tiersToRun = [options.tier];
    console.log(`${colors.yellow}Targeting Tier ${options.tier}: ${TIER_DIRS[options.tier].label}${colors.reset}`);
  } else {
    console.log(`${colors.yellow}Executing all available tiers (1 to 4)${colors.reset}`);
  }

  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;
  const allFailures = [];

  for (const tierNum of tiersToRun) {
    const files = getTestFiles(tierNum);
    if (files.length === 0) {
      continue;
    }

    const tierInfo = TIER_DIRS[tierNum];
    console.log(`\n${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}  ${tierInfo.label} (${files.length} test modules)${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    let suiteIdx = 1;
    for (const filePath of files) {
      // Filter by filename or test pattern if requested
      if (options.file && !path.normalize(filePath).toLowerCase().includes(path.normalize(options.file).toLowerCase())) continue;

      let moduleExport;
      try {
        moduleExport = require(filePath);
      } catch (loadErr) {
        console.error(`${colors.red}Failed to load test file ${filePath}: ${loadErr.message}${colors.reset}`);
        grandFailed++;
        allFailures.push({
          testName: `File Load: ${path.basename(filePath)}`,
          error: loadErr,
          suiteName: path.basename(filePath)
        });
        continue;
      }

      let suiteObj;
      if (typeof moduleExport === 'function') {
        const tests = [];
        const testHelper = (name, fn) => tests.push({ name, fn });
        testHelper.test = testHelper;
        await moduleExport(testHelper);
        suiteObj = { name: path.basename(filePath, '.js'), tests };
      } else if (moduleExport && Array.isArray(moduleExport.tests)) {
        suiteObj = moduleExport;
      } else if (Array.isArray(moduleExport)) {
        suiteObj = { name: path.basename(filePath, '.js'), tests: moduleExport };
      } else {
        console.error(`${colors.red}Test file ${filePath} must export { name, tests: [...] } or an array of tests.${colors.reset}`);
        grandFailed++;
        allFailures.push({
          testName: `Contract: ${path.basename(filePath)}`,
          error: new Error('Invalid export format'),
          suiteName: path.basename(filePath)
        });
        continue;
      }

      if (options.filter) {
        suiteObj.tests = suiteObj.tests.filter(t => t.name.toLowerCase().includes(options.filter.toLowerCase()));
      }

      const res = await runSuite(suiteObj, suiteIdx++, files.length);
      grandPassed += res.passed;
      grandFailed += res.failed;
      grandTotal += (res.passed + res.failed);
      allFailures.push(...res.failures);

      if (options.bail && res.failed > 0) {
        console.log(`\n${colors.yellow}[BAIL] Halting execution due to --bail option.${colors.reset}`);
        break;
      }
    }
  }

  const grandDuration = Date.now() - suiteStartTime;

  // Disconnect prisma if connected
  try {
    const { getPrisma } = require('./helpers/db');
    await getPrisma().$disconnect();
  } catch (e) {}

  // Print Failures Detail if any
  if (allFailures.length > 0) {
    console.log(`\n${colors.bold}${colors.red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}${colors.red}  FAILURES SUMMARY (${allFailures.length})${colors.reset}`);
    console.log(`${colors.bold}${colors.red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    allFailures.forEach((f, idx) => {
      console.log(`\n${colors.red}${idx + 1}) [${f.suiteName}] ${f.testName}${colors.reset}`);
      console.log(`${colors.gray}${f.error.stack || f.error.message}${colors.reset}`);
    });
  }

  // Print Summary Table
  console.log(`\n${colors.bold}${colors.magenta}========================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.white}  TEST EXECUTION SUMMARY${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}========================================================================${colors.reset}`);
  console.log(`  Total Tests  : ${colors.bold}${grandTotal}${colors.reset}`);
  console.log(`  Passed       : ${colors.bold}${colors.green}${grandPassed}${colors.reset}`);
  console.log(`  Failed       : ${colors.bold}${grandFailed === 0 ? colors.green : colors.red}${grandFailed}${colors.reset}`);
  console.log(`  Total Time   : ${colors.bold}${grandDuration}ms${colors.reset}`);

  if (grandFailed === 0 && grandTotal > 0) {
    console.log(`\n  ${colors.bold}${colors.bgGreen}${colors.white}  ALL TESTS PASSED  ${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n  ${colors.bold}${colors.bgRed}${colors.white}  TEST SUITE FAILED  ${colors.reset}\n`);
    process.exit(1);
  }
}

// Support running single suite directly from node command
module.exports = {
  runSuite: async function(suite) {
    console.log(`\n${colors.bold}${colors.cyan}Executing Single Suite: ${suite.name}${colors.reset}`);
    const res = await runSuite(suite, 1, 1);
    console.log(`\nResult: ${res.passed} passed, ${res.failed} failed.`);
    if (res.failed > 0) {
      res.failures.forEach((f, idx) => {
        console.log(`\n${idx + 1}) ${f.testName}`);
        console.log(f.error.stack || f.error.message);
      });
      process.exit(1);
    } else {
      process.exit(0);
    }
  },
  runAll
};

if (require.main === module) {
  runAll().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
}
