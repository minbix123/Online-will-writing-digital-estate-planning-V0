import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../src/lib/auth";
import middleware, { config as middlewareConfig } from "../../src/middleware";

const prisma = new PrismaClient();
const SECRET = process.env.NEXTAUTH_SECRET || "fallback_secret_for_development";

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  expected: any;
  actual: any;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, category: string, expected: any, actual: any, details?: string) {
  const passed = !!condition;
  results.push({ name, category, passed, expected, actual, details });
  const status = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`[${status}] [${category}] ${name}`);
  if (!passed) {
    console.error(`       Expected: ${JSON.stringify(expected)}`);
    console.error(`       Actual:   ${JSON.stringify(actual)}`);
    if (details) console.error(`       Details:  ${details}`);
  }
}

async function runChallenge() {
  console.log("==================================================================");
  console.log("Starting Empirical Challenger M2.2: Auth, Bcrypt & RBAC Verification");
  console.log("==================================================================\n");

  // ====================================================================
  // SUITE 1: Bcrypt Password Verification against DB
  // ====================================================================
  console.log("--- SUITE 1: Bcrypt Password Verification ---");
  const demoEmails = [
    { email: "customer@demo.com", expectedRole: "CUSTOMER" },
    { email: "nri@demo.com", expectedRole: "CUSTOMER" },
    { email: "lawyer@demo.com", expectedRole: "LAWYER" },
    { email: "admin@demo.com", expectedRole: "ADMIN" },
  ];

  for (const account of demoEmails) {
    const user = await prisma.user.findUnique({
      where: { email: account.email },
    });

    assert(
      !!user,
      `User ${account.email} exists in database`,
      "Bcrypt & Database",
      true,
      !!user
    );

    if (!user) continue;

    assert(
      user.role === account.expectedRole,
      `User ${account.email} has correct role ${account.expectedRole}`,
      "Bcrypt & Database",
      account.expectedRole,
      user.role
    );

    // Verify bcrypt hash structure
    const isBcryptFormat = typeof user.password === "string" && /^\$2[ab]\$\d{2}\$[A-Za-z0-9./]{53}$/.test(user.password);
    assert(
      isBcryptFormat,
      `User ${account.email} password is valid bcrypt format ($2a/$2b, 60 chars)`,
      "Bcrypt & Database",
      true,
      isBcryptFormat,
      `Hash prefix: ${user.password.substring(0, 7)}... len=${user.password.length}`
    );

    // Verify correct password returns true
    const validCorrect = await bcrypt.compare("password123", user.password);
    assert(
      validCorrect === true,
      `User ${account.email} bcrypt.compare with 'password123' returns true`,
      "Bcrypt & Database",
      true,
      validCorrect
    );

    // Adversarial: incorrect passwords must return false
    const badPasswords = [
      { pw: "wrongpassword", desc: "wrongpassword" },
      { pw: "", desc: "empty string" },
      { pw: "Password123", desc: "capitalized 'Password123'" },
      { pw: "password123 ", desc: "trailing space 'password123 '" },
      { pw: " password123", desc: "leading space ' password123'" },
      { pw: "password124", desc: "off-by-one 'password124'" },
      { pw: "' OR '1'='1", desc: "SQL injection payload" },
    ];

    for (const bad of badPasswords) {
      const cmp = await bcrypt.compare(bad.pw, user.password);
      assert(
        cmp === false,
        `User ${account.email} bcrypt.compare with ${bad.desc} returns false`,
        "Bcrypt & Database",
        false,
        cmp
      );
    }
  }

  // ====================================================================
  // SUITE 2: NextAuth CredentialsProvider & Callbacks Logic
  // ====================================================================
  console.log("\n--- SUITE 2: Authentication Logic & Token Emulation ---");
  const credsProvider = authOptions.providers.find(
    (p: any) => p.id === "credentials" || p.name === "Credentials"
  ) as any;

  const authorize = credsProvider.options?.authorize ?? credsProvider.authorize;
  assert(
    typeof authorize === "function",
    "CredentialsProvider user-defined authorize function exists",
    "NextAuth Configuration",
    "function",
    typeof authorize
  );

  // 2.1 Authorize with all demo accounts
  for (const account of demoEmails) {
    const authUser = await authorize(
      { email: account.email, password: "password123" },
      {} as any
    );

    assert(
      !!authUser,
      `authorize() succeeds for ${account.email} with 'password123'`,
      "Credentials Authorize",
      true,
      !!authUser
    );

    if (authUser) {
      assert(
        authUser.email === account.email,
        `authorize() returns matching email for ${account.email}`,
        "Credentials Authorize",
        account.email,
        authUser.email
      );
      assert(
        authUser.role === account.expectedRole,
        `authorize() returns matching role ${account.expectedRole} for ${account.email}`,
        "Credentials Authorize",
        account.expectedRole,
        authUser.role
      );
      assert(
        typeof authUser.id === "string" && authUser.id.length > 0,
        `authorize() returns non-empty id for ${account.email}`,
        "Credentials Authorize",
        "non-empty string",
        authUser.id
      );
    }
  }

  // 2.2 Case and whitespace normalization on email
  const normalizedUser = await authorize(
    { email: "   CUSTOMER@Demo.Com   ", password: "password123" },
    {} as any
  );
  assert(
    !!normalizedUser && normalizedUser.email === "customer@demo.com",
    "authorize() normalizes email with trim and lowercase ('   CUSTOMER@Demo.Com   ')",
    "Credentials Authorize",
    "customer@demo.com",
    normalizedUser?.email
  );

  // 2.3 Invalid credentials edge cases
  const invalidAuthCases = [
    { creds: { email: "customer@demo.com", password: "wrongpassword" }, label: "wrong password" },
    { creds: { email: "nonexistent@demo.com", password: "password123" }, label: "non-existent user" },
    { creds: { email: "", password: "password123" }, label: "empty email" },
    { creds: { email: "customer@demo.com", password: "" }, label: "empty password" },
    { creds: { email: "", password: "" }, label: "empty email and password" },
    { creds: undefined, label: "undefined credentials" },
    { creds: { email: "customer@demo.com" } as any, label: "missing password property" },
    { creds: { password: "password123" } as any, label: "missing email property" },
  ];

  for (const tc of invalidAuthCases) {
    try {
      const res = await authorize(tc.creds, {} as any);
      assert(
        res === null,
        `authorize() returns null for ${tc.label}`,
        "Credentials Authorize",
        null,
        res
      );
    } catch (err: any) {
      assert(
        false,
        `authorize() threw unhandled exception on ${tc.label}: ${err.message}`,
        "Credentials Authorize",
        null,
        "threw exception"
      );
    }
  }

  // 2.4 JWT and Session Callbacks
  const jwtCallback = authOptions.callbacks?.jwt;
  assert(
    typeof jwtCallback === "function",
    "authOptions.callbacks.jwt exists",
    "Auth Callbacks",
    "function",
    typeof jwtCallback
  );

  const sessionCallback = authOptions.callbacks?.session;
  assert(
    typeof sessionCallback === "function",
    "authOptions.callbacks.session exists",
    "Auth Callbacks",
    "function",
    typeof sessionCallback
  );

  if (jwtCallback && sessionCallback) {
    // Initial JWT sign in
    const initialUser: any = {
      id: "usr_123",
      name: "Test Customer",
      email: "test@demo.com",
      role: "CUSTOMER",
    };
    const tokenAfterSignIn = await jwtCallback({
      token: {},
      user: initialUser,
    } as any);

    assert(
      tokenAfterSignIn.id === "usr_123" &&
      tokenAfterSignIn.email === "test@demo.com" &&
      tokenAfterSignIn.role === "CUSTOMER",
      "jwt callback populates id, name, email, and role from user",
      "Auth Callbacks",
      { id: "usr_123", email: "test@demo.com", role: "CUSTOMER" },
      { id: tokenAfterSignIn.id, email: tokenAfterSignIn.email, role: tokenAfterSignIn.role }
    );

    // Subsequent token refresh (user is undefined)
    const tokenRefreshed = await jwtCallback({
      token: { ...tokenAfterSignIn },
      user: undefined as any,
    } as any);

    assert(
      tokenRefreshed.id === "usr_123" &&
      tokenRefreshed.email === "test@demo.com" &&
      tokenRefreshed.role === "CUSTOMER",
      "jwt callback preserves id, name, email, and role on subsequent token refreshes",
      "Auth Callbacks",
      { id: "usr_123", email: "test@demo.com", role: "CUSTOMER" },
      { id: tokenRefreshed.id, email: tokenRefreshed.email, role: tokenRefreshed.role }
    );

    // Session callback population
    const sessionObj: any = {
      user: { name: "Test Customer", email: "test@demo.com" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    };
    const sessionResult = await sessionCallback({
      session: sessionObj,
      token: tokenAfterSignIn,
    } as any);

    assert(
      sessionResult.user?.id === "usr_123" &&
      (sessionResult.user as any)?.role === "CUSTOMER" &&
      sessionResult.user?.email === "test@demo.com",
      "session callback populates id, email, and role onto session.user",
      "Auth Callbacks",
      { id: "usr_123", email: "test@demo.com", role: "CUSTOMER" },
      { id: sessionResult.user?.id, email: sessionResult.user?.email, role: (sessionResult.user as any)?.role }
    );
  }

  // ====================================================================
  // SUITE 3: Edge Middleware RBAC Simulation
  // ====================================================================
  console.log("\n--- SUITE 3: Edge Middleware RBAC Simulation ---");

  // 3.1 Verify matcher configuration
  assert(
    Array.isArray(middlewareConfig?.matcher) &&
    middlewareConfig.matcher.includes("/customer/:path*") &&
    middlewareConfig.matcher.includes("/lawyer/:path*") &&
    middlewareConfig.matcher.includes("/admin/:path*"),
    "middleware matcher covers /customer/:path*, /lawyer/:path*, /admin/:path*",
    "Edge Middleware Config",
    ["/customer/:path*", "/lawyer/:path*", "/admin/:path*"],
    middlewareConfig?.matcher
  );

  // Helper to create simulated NextRequest with optional NextAuth session cookie
  async function createReq(urlStr: string, tokenData?: any): Promise<NextRequest> {
    const req = new NextRequest(new URL(urlStr, "http://localhost:3000"));
    if (tokenData) {
      const sessionToken = await encode({
        token: tokenData,
        secret: SECRET,
      });
      // NextAuth on localhost non-secure uses 'next-auth.session-token'
      req.cookies.set("next-auth.session-token", sessionToken);
    }
    return req;
  }

  // Helper to test middleware invocation
  async function testMiddleware(urlPath: string, tokenData?: any) {
    const req = await createReq(`http://localhost:3000${urlPath}`, tokenData);
    const res = await (middleware as any)(req);
    return res;
  }

  // 3.2 Unauthenticated Access Tests (No Token -> redirect to /login)
  const unauthRoutes = [
    "/customer/dashboard",
    "/customer/questionnaire",
    "/lawyer/dashboard",
    "/lawyer/case/123",
    "/admin/dashboard",
    "/admin/users",
    "/admin/audit-logs",
  ];

  for (const route of unauthRoutes) {
    const res = await testMiddleware(route, undefined);
    const location = res?.headers.get("location");
    const isRedirectToLogin = res?.status === 307 && !!location && location.includes("/login");
    assert(
      isRedirectToLogin,
      `Unauthenticated access to ${route} redirects to /login`,
      "Edge Middleware RBAC (Unauth)",
      true,
      isRedirectToLogin,
      `Status: ${res?.status}, Location: ${location}`
    );
  }

  // 3.3 CUSTOMER Role Tests
  const customerToken = {
    id: "cust_1",
    name: "Customer User",
    email: "customer@demo.com",
    role: "CUSTOMER",
  };

  // Permitted for CUSTOMER
  const customerAllowed = ["/customer/dashboard", "/customer/questionnaire", "/customer/checkout"];
  for (const route of customerAllowed) {
    const res = await testMiddleware(route, customerToken);
    // NextResponse.next() produces status 200 or no redirect header
    const isNext = !res || res.status === 200 || !res.headers.get("location");
    assert(
      isNext,
      `CUSTOMER accessing permitted route ${route} proceeds (status 200 / next)`,
      "Edge Middleware RBAC (Customer)",
      true,
      isNext
    );
  }

  // Blocked for CUSTOMER: /lawyer/* -> redirects to /customer/dashboard
  const customerBlockedLawyer = ["/lawyer/dashboard", "/lawyer/case/123"];
  for (const route of customerBlockedLawyer) {
    const res = await testMiddleware(route, customerToken);
    const location = res?.headers.get("location");
    const isRedirectToCustDash = !!location && location.endsWith("/customer/dashboard");
    assert(
      isRedirectToCustDash,
      `CUSTOMER accessing ${route} is redirected to /customer/dashboard`,
      "Edge Middleware RBAC (Customer)",
      "http://localhost:3000/customer/dashboard",
      location
    );
  }

  // Blocked for CUSTOMER: /admin/* -> redirects to /customer/dashboard
  const customerBlockedAdmin = ["/admin/dashboard", "/admin/users", "/admin/audit-logs"];
  for (const route of customerBlockedAdmin) {
    const res = await testMiddleware(route, customerToken);
    const location = res?.headers.get("location");
    const isRedirectToCustDash = !!location && location.endsWith("/customer/dashboard");
    assert(
      isRedirectToCustDash,
      `CUSTOMER accessing ${route} is redirected to /customer/dashboard`,
      "Edge Middleware RBAC (Customer)",
      "http://localhost:3000/customer/dashboard",
      location
    );
  }

  // 3.4 LAWYER Role Tests
  const lawyerToken = {
    id: "law_1",
    name: "Lawyer User",
    email: "lawyer@demo.com",
    role: "LAWYER",
  };

  // Permitted for LAWYER: /lawyer/*
  const lawyerAllowed = ["/lawyer/dashboard", "/lawyer/case/123"];
  for (const route of lawyerAllowed) {
    const res = await testMiddleware(route, lawyerToken);
    const isNext = !res || res.status === 200 || !res.headers.get("location");
    assert(
      isNext,
      `LAWYER accessing permitted route ${route} proceeds (status 200 / next)`,
      "Edge Middleware RBAC (Lawyer)",
      true,
      isNext
    );
  }

  // Blocked for LAWYER: /customer/* -> redirects to /lawyer/dashboard
  const lawyerBlockedCustomer = ["/customer/dashboard", "/customer/questionnaire"];
  for (const route of lawyerBlockedCustomer) {
    const res = await testMiddleware(route, lawyerToken);
    const location = res?.headers.get("location");
    const isRedirectToLawyerDash = !!location && location.endsWith("/lawyer/dashboard");
    assert(
      isRedirectToLawyerDash,
      `LAWYER accessing ${route} is redirected to /lawyer/dashboard`,
      "Edge Middleware RBAC (Lawyer)",
      "http://localhost:3000/lawyer/dashboard",
      location
    );
  }

  // Blocked for LAWYER: /admin/* -> redirects to /lawyer/dashboard
  const lawyerBlockedAdmin = ["/admin/dashboard", "/admin/templates"];
  for (const route of lawyerBlockedAdmin) {
    const res = await testMiddleware(route, lawyerToken);
    const location = res?.headers.get("location");
    const isRedirectToLawyerDash = !!location && location.endsWith("/lawyer/dashboard");
    assert(
      isRedirectToLawyerDash,
      `LAWYER accessing ${route} is redirected to /lawyer/dashboard`,
      "Edge Middleware RBAC (Lawyer)",
      "http://localhost:3000/lawyer/dashboard",
      location
    );
  }

  // 3.5 ADMIN Role Tests (Permitted across ALL routes)
  const adminToken = {
    id: "adm_1",
    name: "Admin User",
    email: "admin@demo.com",
    role: "ADMIN",
  };

  const adminAllRoutes = [
    "/admin/dashboard",
    "/admin/users",
    "/admin/cases",
    "/admin/templates",
    "/lawyer/dashboard",
    "/lawyer/case/123",
    "/customer/dashboard",
    "/customer/questionnaire",
  ];

  for (const route of adminAllRoutes) {
    const res = await testMiddleware(route, adminToken);
    const isNext = !res || res.status === 200 || !res.headers.get("location");
    assert(
      isNext,
      `ADMIN accessing route ${route} is permitted (status 200 / next)`,
      "Edge Middleware RBAC (Admin)",
      true,
      isNext
    );
  }

  // 3.6 Malformed / Invalid Role Token Tests (e.g. role: 'HACKER' or undefined role)
  const invalidRoleToken = {
    id: "bad_1",
    name: "Attacker",
    email: "attacker@bad.com",
    role: "HACKER",
  };

  const protectedRoutes = ["/admin/dashboard", "/lawyer/dashboard", "/customer/dashboard"];
  for (const route of protectedRoutes) {
    const res = await testMiddleware(route, invalidRoleToken);
    const location = res?.headers.get("location");
    const isRedirectToLogin = !!location && location.endsWith("/login");
    assert(
      isRedirectToLogin,
      `Invalid role ('HACKER') accessing ${route} is redirected to /login`,
      "Edge Middleware RBAC (Adversarial)",
      "http://localhost:3000/login",
      location
    );
  }

  // 3.7 Token with missing role property
  const noRoleToken = {
    id: "norole_1",
    name: "No Role",
    email: "norole@demo.com",
  };
  for (const route of protectedRoutes) {
    const res = await testMiddleware(route, noRoleToken);
    const location = res?.headers.get("location");
    const isRedirectToLogin = !!location && location.endsWith("/login");
    assert(
      isRedirectToLogin,
      `Token with missing role accessing ${route} is redirected to /login`,
      "Edge Middleware RBAC (Adversarial)",
      "http://localhost:3000/login",
      location
    );
  }

  // ====================================================================
  // SUMMARY
  // ====================================================================
  console.log("\n==================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS:  ${total}`);
  console.log(`PASSED:       ${passed}`);
  console.log(`FAILED:       ${failed}`);
  console.log("==================================================================");

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runChallenge().catch(async (err) => {
  console.error("FATAL ERROR in challenge runner:", err);
  await prisma.$disconnect();
  process.exit(1);
});
