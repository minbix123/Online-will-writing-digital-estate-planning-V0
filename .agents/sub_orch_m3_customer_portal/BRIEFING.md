# BRIEFING — Milestone 3 Sub-Orchestrator

## Mission
Deliver Milestone 3: Customer Portal, Case Lifecycle & Debounced Questionnaire Engine for the Indian Online Will-Writing Platform.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m3_customer_portal
- Original parent: Project Orchestrator
- Original parent conversation ID: f45b3edc-5fc5-413a-9706-3d4843297f01

## 🔒 My Workflow
- **Pattern**: Project Pattern (Iteration Loop)
- **Scope document**: E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m3_customer_portal\SCOPE.md
1. **Explore**: Survey current customer portal, questionnaire, registration, and save APIs.
2. **Execute**: Worker implements registration, customer dashboard, debounced autosave questionnaire (500ms), IDOR protection, conditional branching, and answer resume.
3. **Verify**: 2 Reviewers, 2 Challengers, 1 Forensic Auditor.
4. **Gate**: Evaluate all verdicts in GATE_STATUS.md.
5. **Handoff**: Write handoff.md and notify parent orchestrator.

## 🔒 Key Constraints
- Follow Project Pattern strictly.
- Forensic Auditor integrity violation is a binary veto.
- Preserve Aqua/Retro Mac OS X skeuomorphic design.
- Enforce strict ownership check on save API (`session.user.id === case.customerId`).
- Run all builds and tests via workers/reviewers/challengers.

## Current Parent
- Conversation ID: f45b3edc-5fc5-413a-9706-3d4843297f01

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_m3_1 | teamwork_preview_explorer | Registration & Case APIs investigation | COMPLETED | bf816e1b-b44e-45b2-9527-1aefd9ac4475 |
| explorer_m3_2 | teamwork_preview_explorer | Questionnaire Engine & Logic investigation | COMPLETED | eb22a35f-92b2-4812-b397-fdcf43cdb8d9 |
| explorer_m3_3 | teamwork_preview_explorer | Customer Dashboard, Resume & IDOR investigation | COMPLETED | 6673773f-9cef-46df-a820-ff74f7317fde |
| worker_m3 | teamwork_preview_worker | Customer Portal, Case Lifecycle & Debounced Questionnaire implementation | IN_PROGRESS | 23247260-2f8d-45f5-9534-b1ea176a0951 |

## Succession Status
- Succession required: no
- Spawn count: 4 / 20
- Pending subagents: 23247260-2f8d-45f5-9534-b1ea176a0951
