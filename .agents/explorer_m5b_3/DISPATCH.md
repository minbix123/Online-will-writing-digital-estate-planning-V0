# Task Assignment: Explorer 3 (Milestone 5B: Lawyer & Admin Portals OLED Refactor)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m5b_3`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `898420ba-c6a5-4a01-8505-4fa4c5a8aa30`

## Mission & Scope:
You are Explorer 3 for Milestone 5B (OLED Dark Mode UI/UX Refactor).
Your technical investigation focuses on:
1. **Lawyer Portal**:
   - `src/app/lawyer/dashboard/page.tsx`: Lawyer workbench, metrics tiles, assigned cases list, unassigned queue, claim action button.
   - `src/app/lawyer/case/[id]/page.tsx`: Scrutiny dossier, legal flags badges, testator profile, answer verification categories, review decision form (`APPROVE`, `REQUEST_CHANGES`, `REJECT`), notes textarea, DOCX download button.
2. **Admin Portal**:
   - `src/app/admin/layout.tsx`: Navigation bar, role indicator, route tabs.
   - `src/app/admin/dashboard/page.tsx`: Aggregated KPI metric cards, status breakdown charts/cards, revenue aggregate, recent audit stream.
   - `src/app/admin/users/page.tsx`: User management table, role selector component, filter tabs.
   - `src/app/admin/cases/page.tsx`: Case docket, status filters, lawyer assigner dropdown component.
   - `src/app/admin/templates/page.tsx`: Template and clause lifecycle manager, statutory status change modal/dropdown.
   - `src/app/admin/audit-logs/page.tsx`: Audit trail viewer, search input, action filters, JSON metadata inspector.

## Requirements:
- Inspect all above files. Identify current Aqua classes (`.aqua-...`) and styling.
- Formulate a comprehensive file-by-file refactoring plan mapping all dashboard metrics, tables, forms, modals, and buttons to the OLED Dark Mode design system.
- Preserve all existing RBAC logic, data queries, forms, mutations, and audit logging.

## Required Reading:
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md` (Requirement R8)
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md`

## Deliverables:
- Write `progress.md` and `handoff.md` in your directory.
- Deliver clear, actionable implementation blueprints for the Worker.
- Send completion message to parent (`898420ba-c6a5-4a01-8505-4fa4c5a8aa30`).
