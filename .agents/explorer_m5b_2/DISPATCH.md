# Task Assignment: Explorer 2 (Milestone 5B: Landing, Auth & Customer Portal OLED Refactor)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m5b_2`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `898420ba-c6a5-4a01-8505-4fa4c5a8aa30`

## Mission & Scope:
You are Explorer 2 for Milestone 5B (OLED Dark Mode UI/UX Refactor).
Your technical investigation focuses on:
1. **Landing Page & Authentication Pages**:
   - `src/app/page.tsx`: Landing page hero, features grid, pricing table, testimonial cards, CTA sections refactored to OLED dark theme.
   - `src/app/login/page.tsx` & `src/app/register/page.tsx`: Auth card, form inputs, demo account quick-fill buttons, error banners refactored to OLED dark theme.
2. **Customer Portal Pages & Components**:
   - `src/app/customer/dashboard/page.tsx`: Case cards, status badges, quick actions, empty states.
   - `src/components/QuestionnaireEngine.tsx` & `src/app/customer/questionnaire/page.tsx`: Form sections, progress bar, saving/saved badge, question inputs (text, radio, checkbox, date, select, dynamic repeaters), conditional branching disclosures.
   - `src/app/customer/payment/page.tsx`: Tier pricing selection cards, mock gateway test mode alert, payment trigger buttons.
   - `src/app/customer/document/page.tsx`: Document status card, metadata viewer (hash, size, UTC generated timestamp), certified DOCX download action button.

## Requirements:
- Inspect all above files. Identify current Aqua classes (`.aqua-...`) and inline/Tailwind styles.
- Formulate a comprehensive file-by-file refactoring plan mapping existing elements to OLED Dark Mode tokens.
- Ensure all forms, inputs, badges, transitions, and hover states adhere to the R8 requirement.

## Required Reading:
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md` (Requirement R8)
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md`

## Deliverables:
- Write `progress.md` and `handoff.md` in your directory.
- Deliver clear, actionable implementation blueprints for the Worker.
- Send completion message to parent (`898420ba-c6a5-4a01-8505-4fa4c5a8aa30`).

## 2026-09-20T12:28:58Z
You are Explorer 2 for Milestone 5B (OLED Dark Mode UI/UX Refactor).
Your working directory is:
E:\Online will-writing & digital estate planning V0\.agents\explorer_m5b_2
Project root:
E:\Online will-writing & digital estate planning V0
Parent conversation ID:
898420ba-c6a5-4a01-8505-4fa4c5a8aa30

Read these files immediately before starting:
1. E:\Online will-writing & digital estate planning V0\.agents\explorer_m5b_2\DISPATCH.md
2. E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md (Requirement R8)
3. E:\Online will-writing & digital estate planning V0\PROJECT.md
4. src/app/page.tsx
5. src/app/login/page.tsx
6. src/app/register/page.tsx
7. src/app/customer/dashboard/page.tsx
8. src/components/QuestionnaireEngine.tsx
9. src/app/customer/payment/page.tsx
10. src/app/customer/document/page.tsx

Your Mandate & Scope:
Investigate and design the OLED Dark Mode refactoring blueprint for:
- Landing page (page.tsx)
- Auth pages (login, register)
- Customer Portal (dashboard, questionnaire engine, payment page, document download page)

Map all existing Aqua (.aqua-*) classes and inline/Tailwind styles to the OLED Dark Mode design system.

Deliverables:
- Write progress.md and handoff.md in your directory.
- Deliver file-by-file implementation blueprints with concrete code snippets.
- Send completion message to parent (898420ba-c6a5-4a01-8505-4fa4c5a8aa30).

