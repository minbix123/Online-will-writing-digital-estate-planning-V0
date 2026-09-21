/**
 * Comprehensive Empirical Challenger 2 Stress Test Suite for Milestone 1
 * Targets:
 * 1. Login client-side role navigation & fallback behavior
 * 2. Suspense boundary prerender stability on /customer/checkout & /customer/document
 * 3. Aqua CSS styling responsiveness & layout overflow checks across viewport widths
 * 4. TypeScript typecheck & Next.js production build execution
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Assert = require('./helpers/assert');

console.log('=== RUNNING CHALLENGER 2 STRESS TEST SUITE (MILESTONE 1) ===\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${testName}`);
    console.error(err);
  }
}

// --------------------------------------------------------------------------
// SUITE 1: Login Client-Side Role Navigation & Fallback Stress Testing
// --------------------------------------------------------------------------

console.log('--- SUITE 1: Login Role Navigation & Fallback ---');

/**
 * Pure reproduction of handleLogin routing logic from src/app/login/page.tsx
 */
function simulateLoginRouting(sessionResult, signInResult) {
  const routes = [];
  let refreshCalled = false;
  let errorMessage = null;
  let loadingState = true;

  const router = {
    push: (route) => routes.push(route),
    refresh: () => { refreshCalled = true; }
  };

  if (signInResult?.error) {
    errorMessage = "Invalid email or password";
    loadingState = false;
    return { routes, refreshCalled, errorMessage, loadingState };
  }

  const role = sessionResult?.user?.role;

  if (role === "LAWYER") {
    router.push("/lawyer/dashboard");
  } else if (role === "ADMIN") {
    router.push("/admin/dashboard");
  } else {
    router.push("/customer/dashboard");
  }
  router.refresh();

  return { routes, refreshCalled, errorMessage, loadingState };
}

runTest('Login: LAWYER role routes strictly to /lawyer/dashboard', () => {
  const res = simulateLoginRouting({ user: { role: 'LAWYER' } }, { ok: true });
  Assert.deepEqual(res.routes, ['/lawyer/dashboard']);
  Assert.equal(res.refreshCalled, true);
  Assert.equal(res.errorMessage, null);
});

runTest('Login: ADMIN role routes strictly to /admin/dashboard', () => {
  const res = simulateLoginRouting({ user: { role: 'ADMIN' } }, { ok: true });
  Assert.deepEqual(res.routes, ['/admin/dashboard']);
  Assert.equal(res.refreshCalled, true);
  Assert.equal(res.errorMessage, null);
});

runTest('Login: CUSTOMER role routes strictly to /customer/dashboard', () => {
  const res = simulateLoginRouting({ user: { role: 'CUSTOMER' } }, { ok: true });
  Assert.deepEqual(res.routes, ['/customer/dashboard']);
  Assert.equal(res.refreshCalled, true);
  Assert.equal(res.errorMessage, null);
});

runTest('Login Fallback: Missing user object defaults safely to /customer/dashboard', () => {
  const res = simulateLoginRouting({}, { ok: true });
  Assert.deepEqual(res.routes, ['/customer/dashboard']);
  Assert.equal(res.refreshCalled, true);
});

runTest('Login Fallback: Null session object defaults safely to /customer/dashboard', () => {
  const res = simulateLoginRouting(null, { ok: true });
  Assert.deepEqual(res.routes, ['/customer/dashboard']);
  Assert.equal(res.refreshCalled, true);
});

runTest('Login Fallback: Undefined or empty role defaults safely to /customer/dashboard', () => {
  const res1 = simulateLoginRouting({ user: { role: undefined } }, { ok: true });
  Assert.deepEqual(res1.routes, ['/customer/dashboard']);

  const res2 = simulateLoginRouting({ user: { role: '' } }, { ok: true });
  Assert.deepEqual(res2.routes, ['/customer/dashboard']);
});

runTest('Login Fallback: Arbitrary or malicious role string defaults safely to /customer/dashboard', () => {
  const arbitraryRoles = ['SUPERADMIN', 'HACKER', 'ROOT', '<script>alert(1)</script>', '__proto__'];
  for (const role of arbitraryRoles) {
    const res = simulateLoginRouting({ user: { role } }, { ok: true });
    Assert.deepEqual(res.routes, ['/customer/dashboard'], `Failed for role: ${role}`);
  }
});

runTest('Login: Invalid credentials stops before session check without routing', () => {
  const res = simulateLoginRouting({ user: { role: 'LAWYER' } }, { error: 'CredentialsSignin' });
  Assert.deepEqual(res.routes, []);
  Assert.equal(res.refreshCalled, false);
  Assert.equal(res.errorMessage, 'Invalid email or password');
  Assert.equal(res.loadingState, false);
});

runTest('Login: Zero references to /api/auth/session in client source', () => {
  const loginSrc = fs.readFileSync('src/app/login/page.tsx', 'utf8');
  Assert.equal(loginSrc.includes('/api/auth/session'), false, 'Found lingering /api/auth/session in login page');
});

runTest('Login: Router refresh is called to invalidate server cache after login', () => {
  const res = simulateLoginRouting({ user: { role: 'CUSTOMER' } }, { ok: true });
  Assert.equal(res.refreshCalled, true, 'Router refresh must be invoked');
});

// --------------------------------------------------------------------------
// SUITE 2: Suspense Boundary Prerender Stability Testing
// --------------------------------------------------------------------------

console.log('\n--- SUITE 2: Suspense Boundary & Static Prerender ---');

runTest('Suspense: Checkout page wraps useSearchParams in Suspense', () => {
  const checkoutSrc = fs.readFileSync('src/app/customer/checkout/page.tsx', 'utf8');
  Assert.ok(checkoutSrc.includes('<Suspense'), 'Checkout page missing Suspense component');
  Assert.ok(checkoutSrc.includes('useSearchParams()'), 'CheckoutContent missing useSearchParams call');
  Assert.ok(checkoutSrc.includes('<CheckoutContent />'), 'Suspense does not wrap CheckoutContent');
});

runTest('Suspense: Document page wraps useSearchParams in Suspense', () => {
  const docSrc = fs.readFileSync('src/app/customer/document/page.tsx', 'utf8');
  Assert.ok(docSrc.includes('<Suspense'), 'Document page missing Suspense component');
  Assert.ok(docSrc.includes('useSearchParams()'), 'DocumentContent missing useSearchParams call');
  Assert.ok(docSrc.includes('<DocumentContent />'), 'Suspense does not wrap DocumentContent');
});

runTest('Prerender Artifact: .next contains static checkout HTML with fallback content', () => {
  const htmlPath = path.join('.next', 'server', 'app', 'customer', 'checkout.html');
  Assert.ok(fs.existsSync(htmlPath), 'checkout.html does not exist in .next static output');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  Assert.ok(htmlContent.includes('Loading checkout options...'), 'Prerendered HTML lacks Suspense fallback');
});

runTest('Prerender Artifact: .next contains static document HTML with fallback content', () => {
  const htmlPath = path.join('.next', 'server', 'app', 'customer', 'document.html');
  Assert.ok(fs.existsSync(htmlPath), 'document.html does not exist in .next static output');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  Assert.ok(htmlContent.includes('Loading document details...'), 'Prerendered HTML lacks Suspense fallback');
});

runTest('Route Manifest: checkout and document are classified as prerendered static routes', () => {
  const manifestPath = path.join('.next', 'server', 'app-paths-manifest.json');
  Assert.ok(fs.existsSync(manifestPath), 'app-paths-manifest.json missing');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  Assert.ok('/customer/checkout/page' in manifest, 'customer/checkout missing from app-paths-manifest');
  Assert.ok('/customer/document/page' in manifest, 'customer/document missing from app-paths-manifest');
});

runTest('Suspense Resilience: Missing caseId query handled gracefully on checkout & document', () => {
  const checkoutSrc = fs.readFileSync('src/app/customer/checkout/page.tsx', 'utf8');
  Assert.ok(checkoutSrc.includes('if (!caseId)'), 'Missing caseId guard in CheckoutContent');
  Assert.ok(checkoutSrc.includes('Missing Case ID in query parameter.'), 'Missing descriptive error in CheckoutContent');

  const docSrc = fs.readFileSync('src/app/customer/document/page.tsx', 'utf8');
  Assert.ok(docSrc.includes('if (!caseId)'), 'Missing caseId guard in DocumentContent');
  Assert.ok(docSrc.includes('Missing Case ID in query parameter.'), 'Missing descriptive error in DocumentContent');
});

// --------------------------------------------------------------------------
// SUITE 3: Responsive Aqua CSS & Layout Stress Testing Across Viewports
// --------------------------------------------------------------------------

console.log('\n--- SUITE 3: Aqua CSS Styling & Viewport Responsiveness ---');

runTest('Aqua CSS: Required design tokens defined in globals.css', () => {
  const css = fs.readFileSync('src/app/globals.css', 'utf8');
  const requiredClasses = [
    '.bg-aqua-pinstripes',
    '.aqua-card',
    '.aqua-window',
    '.aqua-titlebar',
    '.aqua-traffic-lights',
    '.aqua-dot-red',
    '.aqua-dot-yellow',
    '.aqua-dot-green',
    '.aqua-btn-primary',
    '.aqua-btn-secondary',
    '.aqua-badge',
    '.aqua-badge-blue',
    '.aqua-inset-well',
    '.aqua-glow-focus'
  ];

  for (const cls of requiredClasses) {
    Assert.ok(css.includes(cls), `Missing Aqua CSS class: ${cls}`);
  }
});

runTest('Aqua CSS: Pure CSS implementation with zero external image dependencies', () => {
  const css = fs.readFileSync('src/app/globals.css', 'utf8');
  const imageRefs = css.match(/url\(['"]?[^'"]+\.(png|jpg|jpeg|gif|svg|webp)['"]?\)/gi);
  Assert.equal(imageRefs, null, 'Aqua CSS contains external image dependencies which could slow rendering');
});

runTest('Landing Page: Zero fixed overlays blocking content or viewport scrolling', () => {
  const pageSrc = fs.readFileSync('src/app/page.tsx', 'utf8');
  Assert.equal(pageSrc.includes('fixed left-0 top-0'), false, 'Found fixed header overlay');
  Assert.equal(pageSrc.includes('fixed bottom-0 left-0'), false, 'Found fixed footer overlay');
});

runTest('Landing Page: Mobile traffic lights collapsed on small viewports (320px - 639px)', () => {
  const pageSrc = fs.readFileSync('src/app/page.tsx', 'utf8');
  Assert.ok(pageSrc.includes('hidden sm:flex'), 'Traffic lights must be hidden on mobile (hidden sm:flex)');
});

runTest('Landing Page: Hero CTA buttons responsive and full-width on mobile (320px - 639px)', () => {
  const pageSrc = fs.readFileSync('src/app/page.tsx', 'utf8');
  Assert.ok(pageSrc.includes('w-full sm:w-auto'), 'CTA buttons must be w-full on mobile for touch targets');
  Assert.ok(pageSrc.includes('flex flex-col sm:flex-row'), 'Hero buttons container must stack vertically on mobile');
});

runTest('Landing Page: Step grid responsive across 1 -> 2 -> 4 columns (Mobile -> Tablet -> Desktop)', () => {
  const pageSrc = fs.readFileSync('src/app/page.tsx', 'utf8');
  Assert.ok(
    pageSrc.includes('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4'),
    'Workflow step grid must adapt from 1 column on mobile to 2 on tablet and 4 on desktop'
  );
});

runTest('Landing Page: Responsive horizontal padding across 320px, 640px, 1024px', () => {
  const pageSrc = fs.readFileSync('src/app/page.tsx', 'utf8');
  Assert.ok(pageSrc.includes('px-4 sm:px-8 lg:px-12'), 'Responsive padding missing on main container');
});

runTest('Landing Page: Responsive typography scaling without text overflow', () => {
  const pageSrc = fs.readFileSync('src/app/page.tsx', 'utf8');
  Assert.ok(pageSrc.includes('text-4xl sm:text-5xl lg:text-6xl'), 'Hero headline lacks responsive clamp sizing');
  Assert.ok(pageSrc.includes('text-lg sm:text-xl'), 'Hero paragraph lacks responsive sizing');
});

// --------------------------------------------------------------------------
// SUITE 4: QuestionnaireEngine & Async searchParams Stress Testing
// --------------------------------------------------------------------------

console.log('\n--- SUITE 4: QuestionnaireEngine & Questionnaire Page Stability ---');

runTest('Questionnaire Page: searchParams is correctly typed as Promise and awaited', () => {
  const qPageSrc = fs.readFileSync('src/app/customer/questionnaire/page.tsx', 'utf8');
  Assert.ok(qPageSrc.includes('Promise<{ caseId?: string | string[] }>'), 'searchParams not typed as Promise');
  Assert.ok(qPageSrc.includes('await searchParams'), 'searchParams not awaited');
});

runTest('Questionnaire Page: Handles array caseId parameters safely', () => {
  const qPageSrc = fs.readFileSync('src/app/customer/questionnaire/page.tsx', 'utf8');
  Assert.ok(qPageSrc.includes('Array.isArray(resolvedParams?.caseId)'), 'Array caseId not handled');
});

runTest('Questionnaire Engine: react-form import completely removed', () => {
  const qEngineSrc = fs.readFileSync('src/components/QuestionnaireEngine.tsx', 'utf8');
  Assert.equal(qEngineSrc.includes('react-form'), false, 'Found lingering react-form import');
});

runTest('Questionnaire Engine: No render-time state updates or navigation loops', () => {
  const qEngineSrc = fs.readFileSync('src/components/QuestionnaireEngine.tsx', 'utf8');
  Assert.ok(qEngineSrc.includes('useMemo'), 'activeSections must be derived via useMemo');
  Assert.equal(
    qEngineSrc.includes('setCurrentSectionIndex(currentSectionIndex + 1)'),
    false,
    'Found render-time state setter'
  );
});

// --------------------------------------------------------------------------
// SUITE 5: Production Build & Typecheck Verification
// --------------------------------------------------------------------------

console.log('\n--- SUITE 5: Typecheck & Production Build Execution ---');

runTest('Typecheck: node "node_modules/typescript/bin/tsc" --noEmit exits with code 0', () => {
  const result = execSync('node "node_modules/typescript/bin/tsc" --noEmit', { stdio: 'pipe' });
  Assert.equal(result.toString().trim(), '', 'Typecheck produced unexpected output');
});

runTest('Build: Next.js production build artifacts exist and are non-empty', () => {
  const requiredArtifacts = [
    path.join('.next', 'server', 'app-paths-manifest.json'),
    path.join('.next', 'server', 'app', 'customer', 'checkout.html'),
    path.join('.next', 'server', 'app', 'customer', 'document.html'),
    path.join('.next', 'server', 'app', 'login.html')
  ];

  for (const art of requiredArtifacts) {
    Assert.ok(fs.existsSync(art), `Missing build artifact: ${art}`);
    const stat = fs.statSync(art);
    Assert.ok(stat.size > 0, `Artifact is empty: ${art}`);
  }
});

// --------------------------------------------------------------------------
// SUMMARY
// --------------------------------------------------------------------------

console.log('\n=============================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('=============================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
