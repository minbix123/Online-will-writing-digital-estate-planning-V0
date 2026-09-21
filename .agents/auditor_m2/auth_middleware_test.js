const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Mirror of auth.ts authorize implementation
async function authorize(credentials) {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: credentials.email.toLowerCase().trim() },
  });

  if (!user || !user.password) {
    return null;
  }

  const isValid = await bcrypt.compare(credentials.password, user.password);
  if (isValid) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  return null;
}

// Mirror of middleware.ts path & role evaluation
function evaluateMiddleware(pathname, token) {
  const role = token?.role;

  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") {
      if (role === "LAWYER") {
        return { action: "REDIRECT", dest: "/lawyer/dashboard" };
      } else if (role === "CUSTOMER") {
        return { action: "REDIRECT", dest: "/customer/dashboard" };
      }
      return { action: "REDIRECT", dest: "/login" };
    }
  }

  if (pathname.startsWith("/lawyer")) {
    if (role !== "LAWYER" && role !== "ADMIN") {
      if (role === "CUSTOMER") {
        return { action: "REDIRECT", dest: "/customer/dashboard" };
      }
      return { action: "REDIRECT", dest: "/login" };
    }
  }

  if (pathname.startsWith("/customer")) {
    if (role !== "CUSTOMER" && role !== "ADMIN") {
      if (role === "LAWYER") {
        return { action: "REDIRECT", dest: "/lawyer/dashboard" };
      }
      return { action: "REDIRECT", dest: "/login" };
    }
  }

  return { action: "NEXT" };
}

async function runAuthTests() {
  const testResults = [];

  // Auth Tests
  const accounts = [
    { email: "customer@demo.com", expectedRole: "CUSTOMER" },
    { email: "nri@demo.com", expectedRole: "CUSTOMER" },
    { email: "lawyer@demo.com", expectedRole: "LAWYER" },
    { email: "admin@demo.com", expectedRole: "ADMIN" },
  ];

  for (const acc of accounts) {
    // 1. Valid login
    const res = await authorize({ email: acc.email, password: "password123" });
    testResults.push({
      test: `Auth valid ${acc.email}`,
      pass: res !== null && res.role === acc.expectedRole && res.email === acc.email
    });

    // 2. Invalid password
    const resBad = await authorize({ email: acc.email, password: "wrongpassword!" });
    testResults.push({
      test: `Reject bad password ${acc.email}`,
      pass: resBad === null
    });

    // 3. Case insensitivity in email
    const resUpper = await authorize({ email: acc.email.toUpperCase(), password: "password123" });
    testResults.push({
      test: `Email case insensitivity ${acc.email}`,
      pass: resUpper !== null && resUpper.role === acc.expectedRole
    });
  }

  // Adversarial Auth Bypass attempts
  const bypassTests = [
    { creds: { email: "customer@demo.com", password: "" }, name: "Empty password" },
    { creds: { email: "", password: "password123" }, name: "Empty email" },
    { creds: { email: "customer@demo.com", password: null }, name: "Null password" },
    { creds: { email: null, password: "password123" }, name: "Null email" },
    { creds: {}, name: "Empty object" },
    { creds: { email: "nonexistent@demo.com", password: "password123" }, name: "Nonexistent user" },
    { creds: { email: "customer@demo.com", password: "' OR '1'='1" }, name: "SQLi attempt in password" },
    { creds: { email: "' OR 1=1 --", password: "password123" }, name: "SQLi attempt in email" },
  ];

  for (const b of bypassTests) {
    const res = await authorize(b.creds);
    testResults.push({
      test: `Bypass attempt: ${b.name}`,
      pass: res === null
    });
  }

  // Middleware Matrix Tests
  const mwMatrix = [
    // Unauthenticated
    { path: "/customer/dashboard", token: null, expected: { action: "REDIRECT", dest: "/login" } },
    { path: "/lawyer/dashboard", token: null, expected: { action: "REDIRECT", dest: "/login" } },
    { path: "/admin/dashboard", token: null, expected: { action: "REDIRECT", dest: "/login" } },
    
    // Customer
    { path: "/customer/dashboard", token: { role: "CUSTOMER" }, expected: { action: "NEXT" } },
    { path: "/customer/questionnaire", token: { role: "CUSTOMER" }, expected: { action: "NEXT" } },
    { path: "/lawyer/dashboard", token: { role: "CUSTOMER" }, expected: { action: "REDIRECT", dest: "/customer/dashboard" } },
    { path: "/admin/dashboard", token: { role: "CUSTOMER" }, expected: { action: "REDIRECT", dest: "/customer/dashboard" } },

    // Lawyer
    { path: "/lawyer/dashboard", token: { role: "LAWYER" }, expected: { action: "NEXT" } },
    { path: "/customer/dashboard", token: { role: "LAWYER" }, expected: { action: "REDIRECT", dest: "/lawyer/dashboard" } },
    { path: "/admin/dashboard", token: { role: "LAWYER" }, expected: { action: "REDIRECT", dest: "/lawyer/dashboard" } },

    // Admin
    { path: "/admin/dashboard", token: { role: "ADMIN" }, expected: { action: "NEXT" } },
    { path: "/customer/dashboard", token: { role: "ADMIN" }, expected: { action: "NEXT" } },
    { path: "/lawyer/dashboard", token: { role: "ADMIN" }, expected: { action: "NEXT" } },
  ];

  for (const m of mwMatrix) {
    const res = evaluateMiddleware(m.path, m.token);
    const pass = res.action === m.expected.action && (res.action === "NEXT" || res.dest === m.expected.dest);
    testResults.push({
      test: `Middleware ${m.token ? m.token.role : 'ANON'} -> ${m.path}`,
      pass: pass,
      actual: res
    });
  }

  console.log("=== AUTH & MIDDLEWARE TEST RESULTS ===");
  console.log(JSON.stringify(testResults, null, 2));

  const allPassed = testResults.every(t => t.pass);
  console.log("OVERALL PASS:", allPassed);

  await prisma.$disconnect();
}

runAuthTests().catch(e => {
  console.error(e);
  process.exit(1);
});
