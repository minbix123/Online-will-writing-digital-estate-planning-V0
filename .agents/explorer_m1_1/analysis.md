# Technical Analysis: Next.js 16 Async searchParams, Suspense Boundaries & Login Redirection

**Author**: Explorer 1 (Milestone 1)  
**Date**: 2026-09-16  
**Target Files**:
1. `src/app/customer/questionnaire/page.tsx`
2. `src/app/login/page.tsx`
3. `src/app/customer/checkout/page.tsx`
4. `src/app/customer/document/page.tsx`

---

## 1. Executive Summary

This investigation analyzed three critical stability, performance, and runtime failure points identified in Milestone 1:
1. **Next.js 16 Async `searchParams` Failure (`src/app/customer/questionnaire/page.tsx`)**: In Next.js 16.3.5, page `searchParams` is an asynchronous `Promise`. Accessing `searchParams.caseId` synchronously without `await` yields `undefined` on every request. This trips the `if (!caseId)` guard on every render, executing `prisma.case.create()` and `redirect('/customer/questionnaire?caseId=' + caseId)`. The client follows the redirect, Next.js evaluates the page again, `searchParams.caseId` is again `undefined`, and another case is inserted into SQLite. This triggers an **infinite redirect loop (`ERR_TOO_MANY_REDIRECTS`)** and severe database pollution.
2. **Session Endpoint Navigation Bug (`src/app/login/page.tsx`)**: In `handleLogin`, line 26 sets `window.location.href = "/api/auth/session"`. This triggers a hard browser navigation directly to NextAuth's JSON session endpoint, displaying raw JSON in the browser instead of directing the user to their role-specific dashboard.
3. **Missing `<Suspense>` Boundaries for `useSearchParams()` (`src/app/customer/checkout/page.tsx` & `src/app/customer/document/page.tsx`)**: Both files are `"use client"` components that invoke `useSearchParams()` directly in the root page component without being enclosed in a React `<Suspense>` boundary. In Next.js App Router, calling `useSearchParams()` outside `<Suspense>` causes client-side rendering bailout warnings and breaks static page generation during `next build`.

---

## 2. Issue 1: `src/app/customer/questionnaire/page.tsx`

### 2.1 Code Observation
Lines 7–30 of `src/app/customer/questionnaire/page.tsx`:
```typescript
7: export default async function QuestionnairePage({
8:   searchParams,
9: }: {
10:   searchParams: { caseId?: string };
11: }) {
12:   const session = await getServerSession(authOptions);
13:   if (!session) redirect("/login");
14: 
15:   let caseId = searchParams.caseId;
16: 
17:   if (!caseId) {
18:     // Create new case
19:     const newCase = await prisma.case.create({
20:       data: {
21:         customerId: (session.user as any).id,
22:         status: "DRAFT",
23:         flags: "STANDARD"
24:       }
25:     });
26:     caseId = newCase.id;
27:     // We could redirect to the URL with caseId to ensure refresh works
28:     redirect(`/customer/questionnaire?caseId=${caseId}`);
29:   }
```

### 2.2 Mechanics & Root Cause
- As defined in `package.json`, the project uses `"next": "16.3.5"` and `"react": "19.2.8"`.
- In Next.js 15+, page props `params` and `searchParams` in App Router Server Components were transitioned to asynchronous Promises (`searchParams: Promise<Record<string, string | string[] | undefined>>`).
- When `QuestionnairePage` receives `searchParams`, it is an unsettled or resolved `Promise`.
- Line 15 executes synchronous property access: `let caseId = searchParams.caseId;`. Because `searchParams` is a `Promise`, accessing property `caseId` yields `undefined`.
- Line 17: `if (!caseId)` evaluates to `true`.
- Line 19–25: SQLite performs `prisma.case.create(...)`.
- Line 28: `redirect('/customer/questionnaire?caseId=' + caseId)` throws a Next.js redirect control error, sending an HTTP 307 redirect back to the client.
- The browser fetches `/customer/questionnaire?caseId=...`.
- The Next.js server executes `QuestionnairePage` again for the redirect request. Because `searchParams` is still a `Promise`, accessing `.caseId` without `await` is *still* `undefined`.
- Result: An infinite loop of case creation and redirects, generating dozens of garbage database rows in `dev.db` until the browser crashes with `ERR_TOO_MANY_REDIRECTS`.

### 2.3 Required Solution
1. Update props typing: `searchParams: Promise<{ caseId?: string | string[] }>`.
2. Await `searchParams` immediately at the top of the function: `const resolvedParams = await searchParams;`.
3. Normalize `caseId` to handle string or array query parameter formats safely:
   ```typescript
   let caseId = typeof resolvedParams?.caseId === "string" 
     ? resolvedParams.caseId 
     : Array.isArray(resolvedParams?.caseId) 
     ? resolvedParams.caseId[0] 
     : undefined;
   ```

### 2.4 Exact Proposed Replacement Snippet for Implementer
Target file: `src/app/customer/questionnaire/page.tsx`

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import QuestionnaireEngine from "@/components/QuestionnaireEngine";

interface QuestionnairePageProps {
  searchParams: Promise<{ caseId?: string | string[] }>;
}

export default async function QuestionnairePage({
  searchParams,
}: QuestionnairePageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const resolvedParams = await searchParams;
  let caseId = typeof resolvedParams?.caseId === "string"
    ? resolvedParams.caseId
    : Array.isArray(resolvedParams?.caseId)
    ? resolvedParams.caseId[0]
    : undefined;

  if (!caseId) {
    // Create new case if none provided in query params
    const newCase = await prisma.case.create({
      data: {
        customerId: (session.user as any).id,
        status: "DRAFT",
        flags: "STANDARD"
      }
    });
    caseId = newCase.id;
    // Redirect to the URL with caseId to ensure URL bookmarking and refresh persistence work
    redirect(`/customer/questionnaire?caseId=${caseId}`);
  }

  // Verify ownership
  const caseData = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseData || caseData.customerId !== (session.user as any).id) {
    redirect("/customer/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <QuestionnaireEngine caseId={caseId} />
    </div>
  );
}
```

---

## 3. Issue 2: `src/app/login/page.tsx`

### 3.1 Code Observation
Lines 13–34 of `src/app/login/page.tsx`:
```typescript
13:   const handleLogin = async (e: React.FormEvent) => {
14:     e.preventDefault();
15:     const res = await signIn("credentials", {
16:       redirect: false,
17:       email,
18:       password,
19:     });
20: 
21:     if (res?.error) {
22:       setError("Invalid credentials");
23:     } else {
24:       // Redirect based on role in a real app; for MVP we fetch session or assume customer if they click customer link.
25:       // We will redirect to a role-router page or just assume Customer for now.
26:       window.location.href = "/api/auth/session"; // We can check session and redirect accordingly, 
27:       // but for V0 MVP, let's just push to a generic entry or fetch session and route.
28:       fetch('/api/auth/session').then(res => res.json()).then(session => {
29:          if (session?.user?.role === 'LAWYER') router.push('/lawyer/dashboard');
30:          else if (session?.user?.role === 'ADMIN') router.push('/admin/dashboard');
31:          else router.push('/customer/dashboard');
32:       });
33:     }
34:   };
```

### 3.2 Mechanics & Root Cause
- Line 26 executes `window.location.href = "/api/auth/session";`.
- In JavaScript, assigning to `window.location.href` instantly navigates the browser window to the given URI.
- The route `/api/auth/session` is NextAuth's internal JSON endpoint. It responds with `Content-Type: application/json`.
- The user is thrown onto a white screen showing raw JSON text:
  `{"user":{"name":"Demo Customer","email":"customer@demo.com","role":"CUSTOMER"},"expires":"..."}`.
- Lines 28–32 (`fetch(...)` and `router.push(...)`) are completely bypassed or killed during browser navigation.
- Furthermore, `src/lib/auth.ts` populates `session.user.role` as `"CUSTOMER" | "LAWYER" | "ADMIN"`.
- Client components should use `getSession()` from `next-auth/react` to inspect the newly established session and cleanly execute `router.push(...)` according to the role:
  - `"LAWYER"` -> `/lawyer/dashboard`
  - `"ADMIN"` -> `/admin/dashboard`
  - All others (including `"CUSTOMER"`) -> `/customer/dashboard`
- Adding `router.refresh()` ensures layouts and server components re-sync with the session cookie.
- Adding a `loading` state disables the button and prevents double submissions while credentials verify.

### 3.3 Exact Proposed Replacement Snippet for Implementer
Target file: `src/app/login/page.tsx`

```typescript
"use client";

import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      // Fetch the updated session to determine user role
      const session = await getSession();
      const role = session?.user?.role;

      if (role === "LAWYER") {
        router.push("/lawyer/dashboard");
      } else if (role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/customer/dashboard");
      }
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred during login");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Demo Accounts: customer@demo.com, nri@demo.com, lawyer@demo.com, admin@demo.com
            <br /> Password: password123
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="relative block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 4. Issue 3: `src/app/customer/checkout/page.tsx` & `src/app/customer/document/page.tsx`

### 4.1 Code Observation

#### In `src/app/customer/checkout/page.tsx`:
```typescript
1: "use client";
2: 
3: import { useSearchParams, useRouter } from "next/navigation";
4: import { useState } from "react";
5: 
6: export default function CheckoutPage() {
7:   const searchParams = useSearchParams();
8:   const caseId = searchParams.get("caseId");
...
```

#### In `src/app/customer/document/page.tsx`:
```typescript
1: "use client";
2: 
3: import { useSearchParams, useRouter } from "next/navigation";
4: import Link from "next/link";
5: 
6: export default function DocumentPage() {
7:   const searchParams = useSearchParams();
8:   const caseId = searchParams.get("caseId");
...
```

### 4.2 Mechanics & Root Cause
- In Next.js App Router, using `useSearchParams()` in a Client Component that is statically rendered causes the pre-rendering phase during `next build` to de-opt into client-side rendering or throw a fatal build error:
  `Error: useSearchParams() should be wrapped in a suspense boundary at page "/customer/checkout".`
- The Next.js convention is strict: The component *calling* `useSearchParams()` cannot wrap itself in `<Suspense>`. It must be called in a child component that sits inside `<Suspense>`.
- Additionally, `src/app/customer/document/page.tsx` imports `useRouter` on line 3, which is never used.

### 4.3 Architectural Pattern
For each page:
1. Move the existing page body and hooks into an inner component: `CheckoutContent` and `DocumentContent`.
2. Export the default page function (`CheckoutPage` and `DocumentPage`) wrapping the inner component in `<Suspense fallback={<FallbackUI />}>`.
3. Provide an Aqua/clean loading skeleton for the fallback UI to avoid layout shift.

### 4.4 Exact Proposed Replacement Snippets for Implementer

#### Target File A: `src/app/customer/checkout/page.tsx`
```typescript
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (plan: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, plan })
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/customer/document?caseId=${caseId}`);
      } else {
        alert("Checkout failed: " + data.error);
      }
    } catch (e) {
      alert("Error processing checkout");
    }
    setLoading(false);
  };

  if (!caseId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow border text-center">
          <p className="text-gray-700 font-medium">Missing Case ID in query parameter.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Select Your Plan</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow border">
            <h2 className="text-xl font-bold mb-2">Basic</h2>
            <p className="text-gray-600 mb-4">Guided questionnaire, Document preparation, PDF, Signing instructions. No lawyer review.</p>
            <p className="text-2xl font-bold mb-6">₹999</p>
            <button 
              disabled={loading}
              onClick={() => handleCheckout("BASIC")}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Select Basic (Mock Pay)
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border-2 border-blue-500 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 text-xs font-bold rounded-full">RECOMMENDED</span>
            <h2 className="text-xl font-bold mb-2">Lawyer Review</h2>
            <p className="text-gray-600 mb-4">Everything in Basic, plus Human lawyer review, Clarification requests, Final approval.</p>
            <p className="text-2xl font-bold mb-6">₹2,999</p>
            <button 
              disabled={loading}
              onClick={() => handleCheckout("LAWYER_REVIEW")}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Select Review (Mock Pay)
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border">
            <h2 className="text-xl font-bold mb-2">Complex / NRI</h2>
            <p className="text-gray-600 mb-4">For foreign assets, multiple properties, business interests, or unusual circumstances.</p>
            <p className="text-2xl font-bold mb-6">₹4,999</p>
            <button 
              disabled={loading}
              onClick={() => handleCheckout("COMPLEX_NRI")}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Select Complex (Mock Pay)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-gray-500 font-medium">Loading checkout options...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
```

#### Target File B: `src/app/customer/document/page.tsx`
```typescript
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function DocumentContent() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  if (!caseId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow border text-center">
          <p className="text-gray-700 font-medium">Missing Case ID in query parameter.</p>
          <Link href="/customer/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow border">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Document is Ready</h1>
        <p className="text-gray-600 mb-8">
          Your will has been generated successfully using the deterministic legal workflow engine. 
          Please download the document below.
        </p>

        <div className="space-y-4">
          <a 
            href={`/api/document/download?caseId=${caseId}`}
            className="block w-full text-center bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700"
          >
            Download DOCX
          </a>
          
          <button 
            onClick={() => alert("PDF generation is currently mocked. Please download the DOCX.")}
            className="block w-full text-center bg-gray-100 text-gray-800 font-semibold py-3 rounded-md border hover:bg-gray-200"
          >
            Download PDF (Mocked)
          </button>
        </div>

        <div className="mt-12 border-t pt-8">
          <h2 className="text-2xl font-bold mb-4">Signing Instructions</h2>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <h3 className="font-bold text-blue-800 mb-2">Before completing your document:</h3>
            <ol className="list-decimal list-inside text-blue-900 space-y-2">
              <li>Print the document.</li>
              <li>Read the entire document carefully.</li>
              <li>Sign where indicated in the presence of two witnesses.</li>
              <li>Complete the applicable witness/signing requirements.</li>
              <li>Keep the original in a secure location.</li>
              <li>Tell a trusted person where it is stored.</li>
            </ol>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/customer/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DocumentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-gray-500 font-medium">Loading document details...</div>
      </div>
    }>
      <DocumentContent />
    </Suspense>
  );
}
```

---

## 5. Verification & Validation Protocol for Implementer

| Target Component | Expected Verification Result | Command / Method |
|------------------|------------------------------|------------------|
| `customer/questionnaire/page.tsx` | Navigating to `/customer/questionnaire` creates exactly one case and redirects to `/customer/questionnaire?caseId=<id>`. Subsequent refreshes on that URL reuse the existing case without loop or new case creation. | Server console inspection & browser reload test |
| `login/page.tsx` | Submitting credentials navigates to `/customer/dashboard`, `/lawyer/dashboard`, or `/admin/dashboard` based on account role. URL never navigates to `/api/auth/session`. | Sign in as `customer@demo.com`, `lawyer@demo.com`, `admin@demo.com` |
| `customer/checkout/page.tsx` & `customer/document/page.tsx` | No missing Suspense warnings during compilation or SSR. Clean fallback renders during initial hydration. | `npx tsc --noEmit` and `npm run build` |
