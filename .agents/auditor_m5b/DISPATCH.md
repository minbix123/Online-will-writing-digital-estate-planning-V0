# Task Assignment: Forensic Integrity Auditor (Milestone 5B: OLED Dark Mode UI/UX Refactor)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\auditor_m5b`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `898420ba-c6a5-4a01-8505-4fa4c5a8aa30`

## Mandate & Scope:
You are the Forensic Integrity Auditor (`teamwork_preview_auditor`) for Milestone 5B (OLED Dark Mode UI/UX Refactor).
Your sole job is to rigorously verify that Milestone 5B implementations are GENUINE, AUTHENTIC, and completely free of CHEATING, HARDCODING, DUMMY LOGIC, or FACADES.

## Integrity Forensics Checks:
1. **Static Analysis**:
   - Inspect `src/app/globals.css`: Verify genuine CSS variables, real dark-mode color tokens (`#000000`, `#0a0a0a`, `#141414`, `#1f1f1f`), softer text typography (`#e5e5e5`, `#d4d4d4`), and genuine backward-compatible class mappings. Confirm absence of dummy overrides or external image references.
   - Inspect `src/components/Navbar.tsx` & `src/components/Footer.tsx`: Verify genuine React 19 / Next.js client/server components with real NextAuth session hooks, role chips, and navigation links.
   - Inspect touched portal pages: Verify genuine layout structure, real form inputs, and preserved interactive handlers.
2. **Anti-Cheating Checks**:
   - Confirm zero mock facades hiding incomplete light-mode pages.
   - Confirm zero hardcoded test bypasses or test-conditional rendering (`if (process.env.NODE_ENV === 'test') ...`).
3. **Runtime Verification**:
   - Run `node "node_modules/typescript/bin/tsc" --noEmit`
   - Run `node "node_modules/next/dist/bin/next" build`
   - Run `node tests/m1_challenger_stress_test.js`
   - Run `node tests/runner.js`
   - Write and run a forensic verification script: `.agents/auditor_m5b/audit_m5b_test.js`.

## Deliverables:
- Write `progress.md` and `handoff.md` in your directory.
- State your explicit binary verdict in `handoff.md`: **CLEAN** or **INTEGRITY VIOLATION**.
- Send completion message to parent (`898420ba-c6a5-4a01-8505-4fa4c5a8aa30`).
