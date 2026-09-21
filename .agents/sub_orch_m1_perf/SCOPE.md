# Scope: Milestone 1 — Codebase Audit, Performance Optimization & UI Theme Foundation

## Architecture
- Framework: Next.js 16 (App Router), React 19, TypeScript
- Scope focus: Compilation and runtime stability, eliminate async searchParams infinite loop, fix client-side state setters during render, wrap client searchParams in Suspense, establish Aqua / Retro Apple / skeuomorphic visual theme foundation in globals.css.

## Feature Inventory for Milestone 1
| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 1 | Async searchParams Fix | In `src/app/customer/questionnaire/page.tsx`, `searchParams` is a Promise in Next.js 16. Awaited properly before reading `caseId`. | DONE |
| 2 | Dependency & Compilation Fix | In `src/components/QuestionnaireEngine.tsx`, removed invalid `react-form` import and resolved all TS2339 union errors. | DONE |
| 3 | Render-Time State Setter Fix | In `src/components/QuestionnaireEngine.tsx`, derived `activeSections` via `useMemo` and eliminated render-time state setters and Back Navigation Trap. | DONE |
| 4 | Login Redirection Bug Fix | In `src/app/login/page.tsx`, removed `window.location.href = "/api/auth/session"`. Implemented clean client-side routing based on authenticated user role. | DONE |
| 5 | Suspense Boundaries for useSearchParams | In `src/app/customer/checkout/page.tsx` and `src/app/customer/document/page.tsx`, wrapped `useSearchParams()` inside `<Suspense>`. | DONE |
| 6 | Retro Aqua / Skeuomorphic UI Foundation | Added pure CSS Aqua / early Mac OS X skeuomorphic styles in `globals.css` and polished `src/app/page.tsx` responsive layout. | DONE |
| 7 | Clean Build & Typecheck | Verified `node "node_modules/typescript/bin/tsc" --noEmit` and `node "node_modules/next/dist/bin/next" build` succeed with 0 errors. | DONE |

## Interface Contracts & Guidelines
- Next.js 16 async props: Server Components must declare `searchParams: Promise<Record<string, string | string[] | undefined>>` and `await searchParams`.
- Client Component Suspense: Any client component using `useSearchParams()` must be wrapped in a `<Suspense>` boundary if statically rendered or page-level.
- React 19 State: No state setting during render body (`Cannot update a component while rendering a different component`).
- Design Tokens: Aqua gloss gradients, subtle shadows, rounded pill buttons (`rounded-full`, glass reflections), retro Apple pinstripes / brushed metallic accents in `src/app/globals.css`.

## Code Layout (Milestone 1 Targets)
- `src/app/customer/questionnaire/page.tsx` (Server Component - async searchParams)
- `src/components/QuestionnaireEngine.tsx` (Client Component - form import & render-time state setter)
- `src/app/login/page.tsx` (Client Component - login redirect)
- `src/app/customer/checkout/page.tsx` (Client Component - Suspense boundary)
- `src/app/customer/document/page.tsx` (Client Component - Suspense boundary)
- `src/app/globals.css` (Aqua / Retro Apple design system & utilities)
- `src/app/page.tsx` (Landing page - visual styling polish)
