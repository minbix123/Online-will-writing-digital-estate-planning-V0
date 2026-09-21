# Changes Report: Milestone 1 Implementation

- **Worker**: Worker 1 (`worker_m1`)
- **Milestone**: Milestone 1 (Performance & Build Fixes, Theme Foundation)
- **Parent Sub-Orchestrator**: `b9ae32ea-bf02-4e25-912d-0a32091419d9`
- **Timestamp**: 2026-09-16T10:48:00Z

---

## Modified Files Summary

### 1. `src/app/customer/questionnaire/page.tsx`
- **Issue**: Next.js 16 types `searchParams` as a Promise in Server Component pages. Accessing `searchParams.caseId` directly returned `undefined`, triggering an infinite redirect loop and inserting orphaned `Case` records on every page load.
- **Change**: Updated parameter typing to `searchParams: Promise<{ caseId?: string | string[] }>`. Added `const resolvedParams = await searchParams;` and extracted `caseId` safely supporting string or array values. Retained ownership verification and automatic draft case creation fallback.

### 2. `src/app/login/page.tsx`
- **Issue**: After successful credentials authentication, line 26 executed `window.location.href = "/api/auth/session"`, leaving users stranded on a raw JSON API response.
- **Change**: Removed `window.location.href = "/api/auth/session"`. Imported `getSession` from `next-auth/react`, awaited the session, and used Next.js `router.push(...)` to direct users cleanly to `/lawyer/dashboard`, `/admin/dashboard`, or `/customer/dashboard` based on `session.user.role`. Added loading state to prevent double submits.

### 3. `src/app/customer/checkout/page.tsx`
- **Issue**: `useSearchParams()` was called at the root of a client page component without an enclosing `<Suspense>` boundary, which causes CSR bailout and build errors during static optimization in Next.js 16.
- **Change**: Decoupled the page into an inner `CheckoutContent` component and an outer `CheckoutPage` default export wrapped with `<Suspense fallback={...}>`.

### 4. `src/app/customer/document/page.tsx`
- **Issue**: `useSearchParams()` was called directly at page level without `<Suspense>`, risking CSR bailout build failures.
- **Change**: Decoupled into `DocumentContent` and `DocumentPage` wrapped with `<Suspense fallback={...}>`.

### 5. `src/components/QuestionnaireEngine.tsx`
- **Issues**:
  - `import { useForm, FormProvider } from "react-form"` threw `TS2307: Cannot find module 'react-form'`.
  - Render-body execution of `setCurrentSectionIndex(currentSectionIndex + 1)` and `window.location.href` violated React 19 render purity rules and created the "Back Navigation Trap" (users unable to navigate backwards past skipped conditional sections).
  - Heterogeneous question objects caused `TS2339` errors for `conditions`, `fields`, and `options`.
  - Missing submit guards caused concurrent save requests.
- **Changes**:
  - Removed missing `react-form` and unused `react-hook-form` imports.
  - Introduced explicit TypeScript interfaces: `QuestionCondition`, `QuestionField`, `QuestionOption`, `Question`, and `Section`.
  - Derived `activeSections` using `useMemo` based on current `answers` and conditions; removed render-phase `setCurrentSectionIndex` calls entirely.
  - Added an index clamp `useEffect` if active sections shrink.
  - Converted form inputs to controlled inputs using nullish coalescing (`value ?? ""`).
  - Added `isSaving` guard and visual progress indicator.
  - Used `router.push(...)` for navigation to checkout.

### 6. `src/app/globals.css`
- **Requirement**: Establish the pure CSS Retro Apple / early Mac OS X / Aqua skeuomorphic design system foundation with zero image overhead.
- **Change**: Added production-ready CSS utility and component classes:
  - `.bg-aqua-pinstripes`: Subtle Mac OS X repeating linear gradient pinstripes.
  - `.aqua-card` & `.aqua-window`: Acrylic glass cards with specular inset bevels and ambient shadows.
  - `.aqua-titlebar`: Finder-style gradient titlebar.
  - `.aqua-traffic-lights`: Red, yellow, and green window control pills with inset specular highlights.
  - `.aqua-btn-primary`: Two-stage Aqua Blue Gel button with hover gloss and active press depth.
  - `.aqua-btn-secondary` / `.aqua-btn-silver`: Brushed platinum gel button.
  - `.aqua-badge` / `.aqua-badge-blue`: Capsule pill badge.
  - `.aqua-inset-well`: Recessed input and container wells.
  - `.aqua-glow-focus`: Focus-visible ring glow.

### 7. `src/app/page.tsx`
- **Requirement**: Apply Aqua styling, window cards, and gel buttons to the landing page while fixing mobile layout issues and preserving 100% copy and functionality.
- **Change**: Removed fixed-position viewport overlays (`fixed left-0 top-0` and `fixed bottom-0`) that obscured mobile content. Integrated the Aqua window header capsule with traffic lights, an acrylic glass hero card, 4 Finder-style window step cards for "How It Works", and primary/secondary Aqua Gel buttons. Preserved all copy, links, and SEO semantics verbatim.

### 8. `src/app/api/document/download/route.ts`
- **Issue**: Line 30 returned `new NextResponse(docxBuffer, ...)` where `docxBuffer` is a Node `Buffer`, which does not satisfy modern `BodyInit` types (`error TS2345`).
- **Change**: Wrapped `docxBuffer` in `new Uint8Array(docxBuffer)`.

### 9. `src/lib/auth.ts`
- **Issue**: `session.user` was flagged as possibly undefined (`TS18048`) and `id`/`role` did not exist on `DefaultSession["user"]` (`TS2339`).
- **Change**: Added defensive guard `if (token && session.user)` and asserted `(session.user as any).id` and `role`.

### 10. `src/server/document-generator.ts`
- **Issue**: `bold: true` was passed to `new Paragraph({...})`, which is invalid under `docx` v9 `IParagraphOptions` (`error TS2353`).
- **Change**: Placed `bold: true` onto a child `TextRun` component inside the paragraph.
