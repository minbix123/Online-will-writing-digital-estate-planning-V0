## 2026-09-20T12:28:58Z

# Task Assignment: Explorer 1 (Milestone 5B: OLED Dark Mode Global CSS & UI Components)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m5b_1`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `898420ba-c6a5-4a01-8505-4fa4c5a8aa30`

## Mission & Scope:
You are Explorer 1 for Milestone 5B (OLED Dark Mode UI/UX Refactor).
Your technical investigation focuses on:
1. **Global CSS Design Tokens & Color Palette**:
   - True black foundation: `#000000` for OLED display power efficiency.
   - Surface elevation scale:
     - Base / Canvas: `#000000`
     - Level 1 (Cards, panels, sidebars): `#0a0a0a` or `#0f0f0f`
     - Level 2 (Inputs, nested containers, dropdowns): `#161616`
     - Level 3 (Hover states, active elements, borders): `#222222` to `#2a2a2a`
   - Softer typography scale (avoid harsh pure white `#ffffff`):
     - Primary text: `#e5e5e5`
     - Secondary text: `#d4d4d4`
     - Muted/caption text: `#a3a3a3`
     - Disabled/subtle text: `#737373`
   - Non-jarring accent colors (reduced eye strain):
     - Elegant legal gold / warm amber: `#d4a373` or `#c59b27`
     - Muted slate / indigo: `#6366f1` / `#818cf8`
     - Subtle status indicators: Emerald (`#10b981`), Amber (`#f59e0b`), Rose (`#f43f5e`)
   - Subtle dark-mode shadows (`box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 255, 255, 0.05)`).
   - Smooth CSS transitions (`transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`).
2. **Component Refactoring Plan**:
   - `src/app/globals.css`: Replacement of `.aqua-...` classes with `.oled-...` or clean dark utility classes.
   - `src/components/Navbar.tsx`: OLED dark header with subtle border-b (`#1f1f1f`), session badge, role badge, navigation links.
   - `src/components/Footer.tsx`: OLED dark footer.
   - `src/components/ui/` or shared components: buttons (primary, secondary, danger, ghost), cards, badges, inputs, alerts, modals.

## Required Reading:
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md` (Requirement R8)
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md`
3. Existing `src/app/globals.css`, `src/components/Navbar.tsx`, `src/components/Footer.tsx`

## Deliverables:
- Write `progress.md` and `handoff.md` in your directory.
- Provide concrete CSS rules, token definitions, and refactoring recommendations for the Worker.
- Send completion message to parent (`898420ba-c6a5-4a01-8505-4fa4c5a8aa30`).
