# Task Assignment: Worker (Milestone 5B: OLED Dark Mode UI/UX Refactor)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\worker_m5b`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `898420ba-c6a5-4a01-8505-4fa4c5a8aa30`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mission & Scope:
Execute the comprehensive OLED Dark Mode UI/UX refactor across all application surfaces per user requirement R8.

### Required Reading (Read First!):
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md` (Requirement R8)
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md`
3. `E:\Online will-writing & digital estate planning V0\.agents\explorer_m5b_1\handoff.md` (Global CSS tokens, aliasing, Navbar, Footer)
4. `E:\Online will-writing & digital estate planning V0\.agents\explorer_m5b_2\handoff.md` (Landing, Auth, and Customer Portal blueprints)
5. `E:\Online will-writing & digital estate planning V0\.agents\explorer_m5b_3\handoff.md` (Lawyer and Admin Portals blueprints)

### Implementation Roadmap:
1. **Global Styles & Design Tokens (`src/app/globals.css`)**:
   - Implement the OLED Dark Mode design system from `explorer_m5b_1/handoff.md`:
     - Canvas `#000000` true black base
     - 4-level surface elevation (`#000000` canvas, `#0a0a0a` level 1, `#141414` level 2, `#1f1f1f` level 3)
     - Neutral border scale (`#1f1f1f`, `#262626`, `#383838`)
     - Softer typography (`#e5e5e5`, `#d4d4d4`, `#a3a3a3`, `#737373` — avoid harsh `#ffffff`)
     - Low-saturation legal accents (Warm Legal Gold `#c59b27` / `#d4a373`, Muted Indigo `#6366f1` / `#818cf8`)
     - Ambient shadows and rim highlights
     - **CRITICAL**: Preserve backward-compatible aliasing for all 14 `.aqua-...` CSS classes (`.bg-aqua-pinstripes`, `.aqua-card`, `.aqua-window`, `.aqua-titlebar`, `.aqua-traffic-lights`, `.aqua-dot-red`, `.aqua-dot-yellow`, `.aqua-dot-green`, `.aqua-btn-primary`, `.aqua-btn-secondary`, `.aqua-badge`, `.aqua-badge-blue`, `.aqua-inset-well`, `.aqua-glow-focus`) styled in OLED Dark Mode to guarantee 100% test compatibility.
2. **Shared Navigation & Footer (`src/components/Navbar.tsx`, `src/components/Footer.tsx`)**:
   - Create `src/components/Navbar.tsx` and `src/components/Footer.tsx` using the complete code in `explorer_m5b_1/handoff.md`.
   - Update `src/app/layout.tsx` to set `<html lang="en" className="dark">` and ensure global styling.
3. **Landing Page & Authentication Pages**:
   - Apply blueprints from `explorer_m5b_2/handoff.md` to:
     - `src/app/page.tsx` (Preserve exact responsive classes tested by `tests/m1_challenger_stress_test.js`)
     - `src/app/login/page.tsx`
     - `src/app/register/page.tsx`
4. **Customer Portal**:
   - Apply blueprints from `explorer_m5b_2/handoff.md` to:
     - `src/app/customer/dashboard/page.tsx`
     - `src/app/customer/questionnaire/page.tsx`
     - `src/components/QuestionnaireEngine.tsx`
     - `src/app/customer/payment/page.tsx`
     - `src/app/customer/checkout/page.tsx` (preserve `<Suspense>` boundary and fallback text)
     - `src/app/customer/document/page.tsx` (preserve `<Suspense>` boundary and fallback text)
5. **Lawyer Portal**:
   - Apply blueprints from `explorer_m5b_3/handoff.md` to:
     - `src/app/lawyer/dashboard/page.tsx` & `src/components/ClaimCaseButton.tsx`
     - `src/app/lawyer/case/[id]/page.tsx` & `src/components/LawyerDecisionForm.tsx`
6. **Admin Portal**:
   - Apply blueprints from `explorer_m5b_3/handoff.md` to:
     - `src/app/admin/layout.tsx`
     - `src/app/admin/dashboard/page.tsx`
     - `src/app/admin/users/page.tsx` & `src/components/UserRoleSelector.tsx`
     - `src/app/admin/cases/page.tsx` & `src/components/AdminCaseAssigner.tsx`
     - `src/app/admin/templates/page.tsx` & `src/components/TemplateStatusManager.tsx`
     - `src/app/admin/audit-logs/page.tsx`

### Verification Commands (All Must Pass!):
1. `node "node_modules/typescript/bin/tsc" --noEmit`
2. `node "node_modules/next/dist/bin/next" build`
3. `node tests/m1_challenger_stress_test.js` (30/30 passed)
4. `node tests/runner.js` (131/131 passed)
5. `node .agents/worker_m5/verify_m5.js` (8/8 passed)

### Deliverables:
- Write `progress.md`, `changes.md`, and `handoff.md` in `E:\Online will-writing & digital estate planning V0\.agents\worker_m5b`.
- State your explicit verification output and command results in `handoff.md`.
- Send completion message to parent (`898420ba-c6a5-4a01-8505-4fa4c5a8aa30`).
