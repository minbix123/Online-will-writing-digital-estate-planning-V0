# Handoff Report: Explorer 3 — Lawyer & Admin Portals OLED Dark Mode Refactoring Blueprint

**Agent ID**: Explorer 3 (`explorer_m5b_3`)  
**Parent Conversation ID**: `898420ba-c6a5-4a01-8505-4fa4c5a8aa30`  
**Milestone**: Milestone 5B (OLED Dark Mode UI/UX Refactor)  
**Date**: 2026-09-20  

---

## 1. Observation

A full technical inspection was conducted across the Lawyer and Admin Portals, including 8 primary routes and 5 tightly-coupled companion UI components:

1. **`src/app/lawyer/dashboard/page.tsx`**:
   - Line 53: Uses `<div className="min-h-screen bg-aqua-pinstripes py-8 px-4 sm:px-6 lg:px-8">`.
   - Lines 56–70: Uses `.aqua-window`, `.aqua-titlebar`, `.aqua-traffic-lights`, `.aqua-dot`, `.aqua-badge-blue`.
   - Lines 75, 85, 95: Metric cards use `.aqua-card p-5` with high-contrast text classes (`text-gray-900`, `text-amber-600`, `text-green-600`).
   - Lines 117, 215: Empty states use `.aqua-inset-well p-8 text-center` with light text colors (`text-gray-600`, `text-gray-400`).
   - Lines 127–138, 225–236: Tables use light themes (`border-gray-200`, `bg-white`, `thead className="bg-gray-50 text-gray-600"`).
   - Lines 184–190: Uses `.aqua-btn.aqua-btn-primary`.
   - Line 272: Renders `<ClaimCaseButton caseId={c.id} />`.

2. **`src/app/lawyer/case/[id]/page.tsx`**:
   - Lines 38, 60, 104: Base container uses `bg-aqua-pinstripes`.
   - Lines 39, 61, 120: Windows use `.aqua-window` and `.aqua-titlebar`.
   - Lines 147, 193: Cards use `.aqua-card p-6`.
   - Lines 237, 263, 288, 317: Structured answer inspection sections use `.aqua-inset-well p-4 text-xs`.
   - Line 221: Action button uses `.aqua-btn.aqua-btn-secondary`.
   - Line 365: Integrates `<LawyerDecisionForm caseId={caseData.id} currentStatus={caseData.status} />`.

3. **`src/app/admin/layout.tsx`**:
   - Lines 27–30: Outer shell uses `bg-aqua-pinstripes` and `.aqua-window`.
   - Lines 32–46: Titlebar uses `.aqua-titlebar` with red admin badge (`bg-red-100 text-red-900`).
   - Lines 49–80: Navigation toolbar uses `bg-gradient-to-b from-gray-100 to-gray-200 border-b border-gray-300` and `.aqua-btn-silver`.

4. **`src/app/admin/dashboard/page.tsx`**:
   - Lines 80, 83: Header action buttons use `.aqua-btn-primary` and `.aqua-btn-secondary`.
   - Lines 92, 111, 133, 154: 4 telemetry cards use `.aqua-card p-5` with light border separators (`border-gray-100`).
   - Lines 98–106, 118–129, 142–150, 160–166: Role, case status, and payment breakdown badges use light pastel classes (`bg-blue-50`, `bg-amber-50`, `bg-emerald-50`, etc.).
   - Lines 184–240: Live audit table uses light-mode table wrapper (`bg-white`, `border-gray-200`, `hover:bg-gray-50`).

5. **`src/app/admin/users/page.tsx`**:
   - Lines 59–96: Filter pill links use `bg-white text-gray-700 border-gray-300 hover:bg-gray-50`.
   - Lines 101–173: User table uses `bg-white`, `border-gray-200`, `thead className="bg-gray-50"`, and light role badges (`bg-red-100`, `bg-purple-100`, `.aqua-badge-blue`).
   - Line 166: Embeds `<UserRoleSelector userId={u.id} currentRole={u.role} isSelf={isSelf} />`.

6. **`src/app/admin/cases/page.tsx`**:
   - Lines 63–78: Status filter buttons use `bg-white text-gray-700 border-gray-300 hover:bg-gray-50`.
   - Lines 83–206: Master case docket table uses light styles with `aqua-badge`, `.aqua-btn-silver`, `.aqua-btn-primary`.
   - Line 150: Embeds `<AdminCaseAssigner caseId={c.id} currentLawyerId={c.lawyerId} lawyers={lawyers} />`.

7. **`src/app/admin/templates/page.tsx`**:
   - Line 46: "+ New Clause Definition" button uses `.aqua-btn.aqua-btn-primary`.
   - Lines 62–123, 137–205: Tables for templates and clauses use `bg-white`, `border-gray-200`, `divide-gray-100`, and light badge styling.
   - Lines 111, 193: Embeds `<TemplateStatusManager targetId={t.id} targetType="template" currentStatus={t.status} />`.

8. **`src/app/admin/audit-logs/page.tsx`**:
   - Lines 71–119: Filter and search toolbar uses `bg-gray-50 border border-gray-200` with white inputs (`bg-white text-gray-800 border-gray-300`).
   - Line 77: Inline `onChange` handler on `<select>` within an `async` Server Component.
   - Lines 122–222: Audit trail table uses `bg-white`, `hover:bg-gray-50`.
   - Line 208: JSON inspector `<pre>` uses `bg-gray-900 text-emerald-400`.
   - Lines 238, 248: Pagination links use `.aqua-btn.aqua-btn-silver`.

9. **Companion Components**:
   - `ClaimCaseButton.tsx`: Uses `.aqua-btn.aqua-btn-primary`.
   - `LawyerDecisionForm.tsx`: Uses `.aqua-inset-well`, `.aqua-btn`, `bg-white`, light border states.
   - `UserRoleSelector.tsx`: Uses `border-gray-300 bg-white text-gray-800`.
   - `AdminCaseAssigner.tsx`: Uses `border-gray-300 bg-white text-gray-800`.
   - `TemplateStatusManager.tsx`: Uses `.aqua-btn-primary`, `.aqua-btn-silver`, `.aqua-btn`.

---

## 2. Logic Chain

1. **Design System Mandate (Requirement R8)**:
   - Must provide true blacks (`#000000`) for OLED display efficiency.
   - Must use carefully selected dark grays (`#0a0a0a` to `#242424`) to establish clear surface elevation without harsh contrast.
   - Must avoid pure white text (`#ffffff`), substituting soft neutral tones (`#e5e5e5` for primary headings, `#d4d4d4` for body/values, `#a3a3a3` for secondary labels, `#737373` for captions/timestamps).
   - Must use non-jarring, low-saturation status accents (Emerald `#10b981`, Amber `#f59e0b`, Rose `#f43f5e`, Indigo `#818cf8`, Warm Amber `#d4a373`).
   - Must provide smooth CSS transitions and natural dark-mode hover states without blinding bright flash.

2. **Backend & RBAC Invariance**:
   - Server-side authorization checks (`getServerSession(authOptions)`, role checks `user.role === 'LAWYER'`, `user.role === 'ADMIN'`) must remain 100% untouched.
   - All Prisma relational queries, aggregate metrics, pagination math, URL searchParams, and server actions/API endpoints must be preserved exactly.

3. **Structural Parity & Component Boundaries**:
   - Lawyer portal and Admin portal consist of deep data tables, analytical KPI metric cards, detailed dossier panels, and critical interactive workflow forms.
   - Refactoring will replace every obsolete Aqua class (`.aqua-pinstripes`, `.aqua-window`, `.aqua-titlebar`, `.aqua-card`, `.aqua-inset-well`, `.aqua-btn*`, `.aqua-badge*`) with calibrated OLED Dark Mode tokens.
   - Client components (`ClaimCaseButton`, `LawyerDecisionForm`, `UserRoleSelector`, `AdminCaseAssigner`, `TemplateStatusManager`) must match the exact same dark elevation and input styles.
   - In `src/app/admin/audit-logs/page.tsx`, the inline `onChange` on `<select>` in a Server Component must be adapted into a query form submission or client island to guarantee hydration cleanliness.

---

## 3. Caveats

- **No Source Code Modifications Made**: Explorer 3 is strictly read-only. No files outside `.agents/explorer_m5b_3` were edited.
- **Dependency on Global Tokens**: The blueprints provide direct Tailwind utility classes matching the OLED tokens agreed with Explorer 1. If Explorer 1 defines shorthand utility classes (e.g. `.oled-card`), the Worker can use either shorthand or direct utility classes. Both are completely compatible.
- **Server Component Integrity**: Form inputs that do not need JavaScript client state (e.g. search bars) use standard HTML `GET` forms to remain zero-bundle server components.

---

## 4. Conclusion & File-by-File Blueprints

### Summary of Design System Tokens for Lawyer & Admin Portals

| Element | Old Aqua / Light Style | OLED Dark Mode Replacement |
|---|---|---|
| **Canvas / Background** | `.bg-aqua-pinstripes` / `#f4f6f9` | `bg-black text-[#e5e5e5]` (True black `#000000`) |
| **Main Window Container** | `.aqua-window` / linear-gradient | `bg-[#0a0a0a] border border-[#242424] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.85)]` |
| **Window Titlebar** | `.aqua-titlebar` / linear-gradient | `bg-[#121212] border-b border-[#242424] px-5 py-3.5` |
| **Window Traffic Lights** | `.aqua-traffic-lights` / `.aqua-dot-*` | `flex items-center gap-1.5` with `w-2.5 h-2.5 rounded-full bg-[#ef4444]/60`, `bg-[#f59e0b]/60`, `bg-[#10b981]/60` |
| **Metric / KPI Cards** | `.aqua-card p-5` / linear-gradient | `bg-[#121212] border border-[#242424] hover:border-[#383838] p-5 rounded-xl transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.5)]` |
| **Inset Wells / Dossier Panels** | `.aqua-inset-well` / `#fbfcfd` | `bg-[#0e0e0e] border border-[#242424] rounded-xl` |
| **Data Tables** | `bg-white divide-gray-200 border-gray-200` | `bg-[#0c0c0c] divide-[#1f1f1f] border border-[#242424] rounded-xl` |
| **Table Headers** | `bg-gray-50 text-gray-600` | `bg-[#141414] text-[#8a8a8a] text-xs font-semibold uppercase tracking-wider` |
| **Table Rows Hover** | `hover:bg-blue-50/40` / `hover:bg-gray-50` | `hover:bg-[#161616] transition-colors duration-150` |
| **Primary Buttons** | `.aqua-btn.aqua-btn-primary` | `inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1e1b4b] text-[#c7d2fe] border border-[#3730a3] hover:bg-[#312e81] hover:text-white transition-all` |
| **Secondary / Silver Buttons** | `.aqua-btn.aqua-btn-secondary` | `inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#161616] text-[#d4d4d4] border border-[#282828] hover:bg-[#202020] hover:text-white transition-all` |
| **Status Badges: Approved** | `bg-green-100 text-green-800 border-green-300` | `bg-[#064e3b]/40 text-[#6ee7b7] border border-[#047857]/50 px-2.5 py-0.5 rounded-full text-[11px] font-medium` |
| **Status Badges: In Review / Warning** | `bg-amber-100 text-amber-800 border-amber-300` | `bg-[#78350f]/40 text-[#fcd34d] border border-[#b45309]/50 px-2.5 py-0.5 rounded-full text-[11px] font-medium` |
| **Status Badges: Default / Paid** | `.aqua-badge-blue` | `bg-[#1e1b4b]/40 text-[#a5b4fc] border border-[#3730a3]/50 px-2.5 py-0.5 rounded-full text-[11px] font-medium` |
| **Select / Input Elements** | `bg-white border-gray-300 text-gray-800` | `bg-[#141414] border border-[#2e2e2e] text-[#e5e5e5] rounded-lg text-xs focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]` |

---

### Detailed Implementation Blueprints

#### Blueprint 1: `src/app/lawyer/dashboard/page.tsx`

**Target File**: `src/app/lawyer/dashboard/page.tsx`  
**Rationale**: Transforms the Lawyer Workbench from skeuomorphic Aqua pinstripes and glossy buttons to an ultra-efficient OLED Dark terminal.

```tsx
// Outer Container & Window
<div className="min-h-screen bg-black text-[#e5e5e5] py-8 px-4 sm:px-6 lg:px-8">
  <div className="max-w-6xl mx-auto space-y-6">
    <div className="bg-[#0a0a0a] border border-[#242424] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.85)] overflow-hidden">
      
      {/* Titlebar */}
      <div className="bg-[#121212] border-b border-[#242424] px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
        </div>
        <div className="text-xs font-semibold text-[#a3a3a3] tracking-wider uppercase font-mono">
          Advocate Review Console — Counsel: {user.name || user.email}
        </div>
        <div className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#1e1b4b]/60 text-[#a5b4fc] border border-[#3730a3]/50">
          {user.role} Verified
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* Quick Metrics Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#121212] border border-[#242424] hover:border-[#383838] p-5 rounded-xl transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
            <div className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider">
              My Assigned Cases
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-3xl font-bold text-[#e5e5e5] font-mono">{myCases.length}</div>
              <span className="text-xs text-[#818cf8] font-medium">Active Docket</span>
            </div>
          </div>

          <div className="bg-[#121212] border border-[#242424] hover:border-[#383838] p-5 rounded-xl transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
            <div className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider">
              Unassigned Queue
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-3xl font-bold text-[#f59e0b] font-mono">{unassignedCases.length}</div>
              <span className="text-xs text-[#d97706] font-medium">Available to Claim</span>
            </div>
          </div>

          <div className="bg-[#121212] border border-[#242424] hover:border-[#383838] p-5 rounded-xl transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
            <div className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider">
              Completed Reviews
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-3xl font-bold text-[#10b981] font-mono">{completedReviewsCount}</div>
              <span className="text-xs text-[#059669] font-medium">Approved / Delivered</span>
            </div>
          </div>
        </div>

        {/* Section 1: My Assigned Cases */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#e5e5e5] tracking-tight">My Assigned Cases</h2>
              <p className="text-xs text-[#8a8a8a]">Cases specifically assigned to your legal docket.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#161616] text-[#d4d4d4] border border-[#2e2e2e]">
              {myCases.length} Cases
            </span>
          </div>

          {myCases.length === 0 ? (
            <div className="bg-[#0d0d0d] border border-[#242424] rounded-xl p-8 text-center">
              <p className="text-sm text-[#a3a3a3] font-medium">
                You do not have any active assigned cases.
              </p>
              <p className="text-xs text-[#666666] mt-1">
                Claim a pending case from the unassigned review queue below to begin scrutiny.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#242424] bg-[#0c0c0c]">
              <table className="min-w-full divide-y divide-[#1f1f1f] text-left text-sm bg-[#0c0c0c]">
                <thead className="bg-[#141414] text-xs font-semibold uppercase text-[#8a8a8a] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Case ID</th>
                    <th className="px-5 py-3.5">Testator / Customer</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Legal Flags</th>
                    <th className="px-5 py-3.5">Last Updated</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a] font-normal">
                  {myCases.map((c) => {
                    const flags = (c.flags || "").split(",").filter(Boolean);
                    const isApproved = c.status === "APPROVED";
                    const isClarification = c.status === "CLARIFICATION_REQUESTED";

                    return (
                      <tr key={c.id} className="hover:bg-[#161616] transition-colors duration-150">
                        <td className="px-5 py-4 font-mono font-medium text-[#e5e5e5]">
                          {c.id.slice(-8)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-[#e5e5e5]">
                            {c.customer.name || "Anonymous Testator"}
                          </div>
                          <div className="text-xs text-[#737373] font-mono">{c.customer.email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                              isApproved
                                ? "bg-[#064e3b]/40 text-[#6ee7b7] border-[#047857]/50"
                                : isClarification
                                ? "bg-[#78350f]/40 text-[#fcd34d] border-[#b45309]/50"
                                : "bg-[#1e1b4b]/40 text-[#c7d2fe] border-[#4338ca]/50"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {flags.map((f, i) => (
                              <span
                                key={i}
                                className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-[#181818] text-[#d4d4d4] border border-[#2a2a2a]"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-[#737373] font-mono">
                          {new Date(c.updatedAt).toISOString().replace("T", " ").substring(0, 16)} UTC
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/lawyer/case/${c.id}`}
                            className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e1b4b] text-[#c7d2fe] border border-[#3730a3] hover:bg-[#312e81] hover:text-white transition-all duration-150"
                          >
                            Open Review →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Unassigned Review Queue */}
        <div className="space-y-4 pt-6 border-t border-[#242424]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#e5e5e5] tracking-tight">Available Review Queue (Unassigned)</h2>
              <p className="text-xs text-[#8a8a8a]">
                Paid client cases awaiting lawyer assignment. Claim a case to lock and conduct your review.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#2a1a05] text-[#fbbf24] border border-[#78350f]">
              {unassignedCases.length} Pending
            </span>
          </div>

          {unassignedCases.length === 0 ? (
            <div className="bg-[#0d0d0d] border border-[#242424] rounded-xl p-8 text-center">
              <p className="text-sm text-[#a3a3a3] font-medium">
                The unassigned case queue is currently empty.
              </p>
              <p className="text-xs text-[#666666] mt-1">
                New testator submissions requiring advocate scrutiny will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#242424] bg-[#0c0c0c]">
              <table className="min-w-full divide-y divide-[#1f1f1f] text-left text-sm bg-[#0c0c0c]">
                <thead className="bg-[#141414] text-xs font-semibold uppercase text-[#8a8a8a] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Case ID</th>
                    <th className="px-5 py-3.5">Testator / Customer</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Workflow Flags</th>
                    <th className="px-5 py-3.5">Submission Date</th>
                    <th className="px-5 py-3.5 text-right">Claim Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a] font-normal">
                  {unassignedCases.map((c) => {
                    const flags = (c.flags || "").split(",").filter(Boolean);

                    return (
                      <tr key={c.id} className="hover:bg-[#161616] transition-colors duration-150">
                        <td className="px-5 py-4 font-mono font-medium text-[#e5e5e5]">
                          {c.id.slice(-8)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-[#e5e5e5]">
                            {c.customer.name || "Anonymous Testator"}
                          </div>
                          <div className="text-xs text-[#737373] font-mono">{c.customer.email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#78350f]/40 text-[#fcd34d] border border-[#b45309]/50">
                            {c.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {flags.map((f, i) => (
                              <span
                                key={i}
                                className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-[#2a1a05] text-[#fbbf24] border border-[#78350f]"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-[#737373] font-mono">
                          {new Date(c.createdAt).toISOString().replace("T", " ").substring(0, 16)} UTC
                        </td>
                        <td className="px-5 py-4 text-right">
                          <ClaimCaseButton caseId={c.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
</div>
```

---

#### Blueprint 2: `src/components/ClaimCaseButton.tsx`

**Target File**: `src/components/ClaimCaseButton.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ClaimCaseButtonProps {
  caseId: string;
}

export default function ClaimCaseButton({ caseId }: ClaimCaseButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClaim = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lawyer/cases/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to claim case.");
        setLoading(false);
        return;
      }

      router.push(`/lawyer/case/${caseId}`);
      router.refresh();
    } catch (err) {
      alert("Network error while claiming case.");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClaim}
      disabled={loading}
      className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2e1065] text-[#d8b4fe] border border-[#581c87] hover:bg-[#3b0764] hover:text-white hover:border-[#7e22ce] active:translate-y-0.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
    >
      {loading ? "Claiming..." : "Claim & Review →"}
    </button>
  );
}
```

---

#### Blueprint 3: `src/app/lawyer/case/[id]/page.tsx`

**Target File**: `src/app/lawyer/case/[id]/page.tsx`  
**Rationale**: Transforms the scrutiny dossier, legal flags badges, testator record, 4 verification categories, and historical log into a low-eye-strain, high-legibility OLED dark theme.

```tsx
// Outer Container & Breadcrumb
<div className="min-h-screen bg-black text-[#e5e5e5] py-8 px-4 sm:px-6 lg:px-8">
  <div className="max-w-6xl mx-auto space-y-6">
    <div className="flex items-center justify-between">
      <Link
        href="/lawyer/dashboard"
        className="text-xs font-medium text-[#818cf8] hover:text-[#a5b4fc] transition-colors flex items-center gap-1"
      >
        ← Back to Legal Portal Docket
      </Link>
      <div className="text-xs text-[#737373]">
        Case Ref: <span className="font-mono font-medium text-[#e5e5e5]">{caseData.id}</span>
      </div>
    </div>

    {/* Main Window */}
    <div className="bg-[#0a0a0a] border border-[#242424] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.85)] overflow-hidden">
      <div className="bg-[#121212] border-b border-[#242424] px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
        </div>
        <div className="text-xs font-semibold text-[#a3a3a3] tracking-wider uppercase font-mono">
          Case Scrutiny File — {caseData.customer.name || caseData.customer.email}
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border ${
            caseData.status === "APPROVED"
              ? "bg-[#064e3b]/50 text-[#6ee7b7] border-[#047857]/60"
              : caseData.status === "CLARIFICATION_REQUESTED"
              ? "bg-[#78350f]/50 text-[#fcd34d] border-[#b45309]/60"
              : "bg-[#1e1b4b]/50 text-[#c7d2fe] border-[#4338ca]/60"
          }`}
        >
          Status: {caseData.status}
        </span>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* Top Summary: Testator & Risk Flags */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Testator Identity Card */}
          <div className="bg-[#121212] border border-[#242424] rounded-xl p-6 lg:col-span-2 shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between border-b border-[#242424] pb-3 mb-4">
              <h3 className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider">
                Testator Identity Record
              </h3>
              <span className="text-xs text-[#737373]">Registered Customer</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#737373] block mb-0.5">Full Legal Name:</span>
                <span className="font-semibold text-[#e5e5e5] text-sm">
                  {personal.fullName || caseData.customer.name || "Not Specified"}
                </span>
              </div>

              <div>
                <span className="text-[#737373] block mb-0.5">Email Address:</span>
                <span className="font-medium text-[#d4d4d4] font-mono">{caseData.customer.email}</span>
              </div>

              <div>
                <span className="text-[#737373] block mb-0.5">Contact Phone:</span>
                <span className="font-medium text-[#d4d4d4]">{personal.phone || "Not Specified"}</span>
              </div>

              <div>
                <span className="text-[#737373] block mb-0.5">Marital Status:</span>
                <span className="font-medium text-[#d4d4d4]">{personal.maritalStatus || "Not Specified"}</span>
              </div>

              <div>
                <span className="text-[#737373] block mb-0.5">Residential Address:</span>
                <span className="font-medium text-[#d4d4d4]">{personal.address || "Not Specified"}</span>
              </div>

              <div>
                <span className="text-[#737373] block mb-0.5">NRI / Citizenship:</span>
                <span className={`font-medium ${personal.isNRI === "Yes" ? "text-[#fbbf24]" : "text-[#d4d4d4]"}`}>
                  {personal.isNRI === "Yes" ? "Non-Resident Indian (NRI)" : "Resident Indian"}
                </span>
              </div>
            </div>
          </div>

          {/* Legal Risk Flags & Actions Card */}
          <div className="bg-[#121212] border border-[#242424] rounded-xl p-6 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
            <div>
              <div className="border-b border-[#242424] pb-3 mb-4">
                <h3 className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider">
                  Workflow Rule Flags
                </h3>
              </div>

              <div className="space-y-2 mb-4">
                {flagsList.length === 0 ? (
                  <span className="text-xs text-[#737373] italic">Standard Estate (No flags)</span>
                ) : (
                  flagsList.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#6366f1]" />
                      <span className="text-xs font-medium text-[#d4d4d4] font-mono">{f}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#242424]">
              <span className="text-xs text-[#737373] block mb-2 font-medium">Draft Instrument:</span>
              <a
                href={`/api/document/download?caseId=${caseData.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-[#181818] text-[#e5e5e5] border border-[#303030] hover:bg-[#222222] hover:border-[#404040] transition-all"
              >
                ⬇ Download DOCX Draft
              </a>
            </div>
          </div>
        </div>

        {/* Structured Questionnaire Inspector */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-[#e5e5e5] border-b border-[#242424] pb-2">
            Questionnaire Answers Verification
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Family & Minor Protection */}
            <div className="bg-[#0e0e0e] border border-[#242424] rounded-xl p-4 text-xs space-y-2">
              <h4 className="font-semibold text-[#818cf8] uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                <span>🛡️</span> 1. Family & Minor Protection
              </h4>
              <div className="space-y-1.5 text-[#d4d4d4]">
                <div>
                  <span className="text-[#737373]">Minor Children:</span>{" "}
                  <span className="font-medium">{family.hasMinorChildren || "No"}</span>
                </div>
                {family.guardianName && (
                  <div>
                    <span className="text-[#737373]">Named Guardian:</span>{" "}
                    <span className="font-medium">{family.guardianName}</span> (Relationship:{" "}
                    {family.guardianRelationship || "N/A"})
                  </div>
                )}
                {family.alternateGuardian && (
                  <div>
                    <span className="text-[#737373]">Alternate Guardian:</span>{" "}
                    <span className="font-medium">{family.alternateGuardian}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Appointment of Executors */}
            <div className="bg-[#0e0e0e] border border-[#242424] rounded-xl p-4 text-xs space-y-2">
              <h4 className="font-semibold text-[#818cf8] uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                <span>⚖️</span> 2. Appointment of Executors
              </h4>
              <div className="space-y-1.5 text-[#d4d4d4]">
                <div>
                  <span className="text-[#737373]">Primary Executor:</span>{" "}
                  <span className="font-medium">{executors.primaryExecutorName || "Not Nominated"}</span>
                </div>
                {executors.primaryExecutorRelationship && (
                  <div>
                    <span className="text-[#737373]">Relationship:</span>{" "}
                    <span>{executors.primaryExecutorRelationship}</span>
                  </div>
                )}
                {executors.alternateExecutorName && (
                  <div>
                    <span className="text-[#737373]">Alternate Executor:</span>{" "}
                    <span className="font-medium">{executors.alternateExecutorName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Assets Schedule */}
            <div className="bg-[#0e0e0e] border border-[#242424] rounded-xl p-4 text-xs space-y-2">
              <h4 className="font-semibold text-[#818cf8] uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                <span>📜</span> 3. Schedule of Assets & Properties
              </h4>
              <div className="space-y-1.5 text-[#d4d4d4]">
                <div>
                  <span className="text-[#737373]">Business Interests:</span>{" "}
                  <span className="font-medium">{assets.hasBusinessInterests || "No"}</span>
                </div>
                <div>
                  <span className="text-[#737373]">Foreign Assets:</span>{" "}
                  <span className="font-medium">{assets.hasForeignAssets || "No"}</span>
                </div>
                {assets.assetsList && Array.isArray(assets.assetsList) && (
                  <div className="mt-2 pt-2 border-t border-[#1f1f1f]">
                    <span className="text-[#737373] block mb-1 font-medium">Declared Assets:</span>
                    <ul className="list-disc list-inside space-y-1">
                      {assets.assetsList.map((a: any, idx: number) => (
                        <li key={idx}>
                          <span className="font-medium text-[#e5e5e5]">{a.type || "Asset"}:</span>{" "}
                          {a.description || a.details || "No description"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Beneficiaries & Distribution */}
            <div className="bg-[#0e0e0e] border border-[#242424] rounded-xl p-4 text-xs space-y-2">
              <h4 className="font-semibold text-[#818cf8] uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                <span>👥</span> 4. Beneficiaries & Distribution Directives
              </h4>
              <div className="space-y-1.5 text-[#d4d4d4]">
                {beneficiaries.beneficiariesList && Array.isArray(beneficiaries.beneficiariesList) ? (
                  <ul className="list-disc list-inside space-y-1">
                    {beneficiaries.beneficiariesList.map((b: any, idx: number) => (
                      <li key={idx}>
                        <span className="font-medium text-[#e5e5e5]">{b.name}</span> ({b.relationship}) —{" "}
                        {b.sharePercentage ? `${b.sharePercentage}%` : b.allocation || "Equal share"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[#737373]">Standard residual distribution to direct legal heirs.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Past Review History */}
        {caseData.reviews.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider">
              Historical Review Log
            </h4>
            <div className="space-y-2">
              {caseData.reviews.map((rev) => (
                <div key={rev.id} className="p-3.5 bg-[#121212] border border-[#242424] rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[#737373]">
                    <span className="font-medium text-[#d4d4d4]">
                      Advocate {rev.lawyer?.name || "Counsel"} — Determination:{" "}
                      <span className="text-[#a5b4fc] font-mono">{rev.status}</span>
                    </span>
                    <span className="font-mono">
                      {new Date(rev.createdAt).toISOString().replace("T", " ").substring(0, 16)} UTC
                    </span>
                  </div>
                  {rev.notes && (
                    <p className="text-[#a3a3a3] italic bg-[#0a0a0a] p-2.5 rounded border border-[#1f1f1f]">
                      "{rev.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decision Form */}
        <div className="pt-4 border-t border-[#242424]">
          <LawyerDecisionForm caseId={caseData.id} currentStatus={caseData.status} />
        </div>
      </div>
    </div>
  </div>
</div>
```

---

#### Blueprint 4: `src/components/LawyerDecisionForm.tsx`

**Target File**: `src/components/LawyerDecisionForm.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LawyerDecisionFormProps {
  caseId: string;
  currentStatus: string;
}

export default function LawyerDecisionForm({ caseId, currentStatus }: LawyerDecisionFormProps) {
  const [decision, setDecision] = useState<"APPROVE" | "REQUEST_CHANGES" | "REJECT">("APPROVE");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    if ((decision === "REQUEST_CHANGES" || decision === "REJECT") && !notes.trim()) {
      setFeedback({
        type: "error",
        message: "Detailed legal notes and instructions are required when requesting changes or rejecting.",
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/lawyer/cases/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          decision,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          message: data.error || "Failed to submit review decision.",
        });
        setLoading(false);
        return;
      }

      setFeedback({
        type: "success",
        message: `Decision successfully recorded! Case transitioned to ${data.status}.`,
      });

      router.refresh();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Network error while submitting review.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0e0e0e] border border-[#242424] rounded-xl p-6 shadow-[0_2px_16px_rgba(0,0,0,0.6)]">
      <h3 className="text-base font-semibold text-[#e5e5e5] mb-1">
        Counsel Review Decision & Statutory Certification
      </h3>
      <p className="text-xs text-[#8a8a8a] mb-4">
        Record your formal determination. Approving the case generates the legally finalized DOCX testamentary instrument.
      </p>

      {feedback && (
        <div
          className={`mb-4 p-3 rounded-lg text-xs font-medium border ${
            feedback.type === "success"
              ? "bg-[#064e3b]/30 text-[#6ee7b7] border-[#047857]/60"
              : "bg-[#450a0a]/30 text-[#fca5a5] border-[#7f1d1d]/60"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Decision Selection Tabs */}
        <div>
          <label className="block text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider mb-2">
            Determination Action
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDecision("APPROVE")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all ${
                decision === "APPROVE"
                  ? "bg-[#064e3b] text-[#ecfdf5] border-[#059669] shadow-[0_0_12px_rgba(5,150,105,0.25)]"
                  : "bg-[#141414] text-[#a3a3a3] border-[#262626] hover:bg-[#1a1a1a] hover:text-[#e5e5e5]"
              }`}
            >
              ✓ Approve & Certify
            </button>

            <button
              type="button"
              onClick={() => setDecision("REQUEST_CHANGES")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all ${
                decision === "REQUEST_CHANGES"
                  ? "bg-[#78350f] text-[#fffbeb] border-[#d97706] shadow-[0_0_12px_rgba(217,119,6,0.25)]"
                  : "bg-[#141414] text-[#a3a3a3] border-[#262626] hover:bg-[#1a1a1a] hover:text-[#e5e5e5]"
              }`}
            >
              ✎ Request Clarification
            </button>

            <button
              type="button"
              onClick={() => setDecision("REJECT")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all ${
                decision === "REJECT"
                  ? "bg-[#7f1d1d] text-[#fef2f2] border-[#dc2626] shadow-[0_0_12px_rgba(220,38,38,0.25)]"
                  : "bg-[#141414] text-[#a3a3a3] border-[#262626] hover:bg-[#1a1a1a] hover:text-[#e5e5e5]"
              }`}
            >
              ✕ Reject Application
            </button>
          </div>
        </div>

        {/* Notes Textarea */}
        <div>
          <label className="block text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider mb-1">
            Advocate Notes & Legal Scrutiny Remarks
            {(decision === "REQUEST_CHANGES" || decision === "REJECT") && (
              <span className="text-[#f87171] ml-1">* Mandatory</span>
            )}
          </label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              decision === "APPROVE"
                ? "Optional remarks (e.g. 'All succession declarations, executor appointments, and schedule of properties verified compliant with Indian Succession Act, 1925.')"
                : "Specify exact clauses or asset descriptions that require clarification or reason for rejection..."
            }
            className="w-full text-xs p-3.5 rounded-lg border border-[#2e2e2e] bg-[#141414] text-[#e5e5e5] placeholder-[#555555] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] focus:outline-none transition-all"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`py-2.5 px-6 rounded-lg text-xs font-semibold transition-all shadow-[0_1px_6px_rgba(0,0,0,0.5)] ${
              decision === "APPROVE"
                ? "bg-[#059669] hover:bg-[#047857] text-white border border-[#10b981]"
                : decision === "REJECT"
                ? "bg-[#dc2626] hover:bg-[#b91c1c] text-white border border-[#ef4444]"
                : "bg-[#d97706] hover:bg-[#b45309] text-white border border-[#f59e0b]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? "Submitting..." : `Confirm ${decision.replace("_", " ")}`}
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

#### Blueprint 5: `src/app/admin/layout.tsx`

**Target File**: `src/app/admin/layout.tsx`  
**Rationale**: Replaces the Aqua titlebar, striped backdrop, and metallic tab toolbar with an OLED Dark navigation shell.

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!session || !user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    if (user.role === "LAWYER") {
      redirect("/lawyer/dashboard");
    } else {
      redirect("/customer/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-black text-[#e5e5e5] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Unified OLED Dark Window Container */}
        <div className="bg-[#0a0a0a] border border-[#242424] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.85)] overflow-hidden">
          
          {/* Window Titlebar */}
          <div className="bg-[#121212] border-b border-[#242424] px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
            </div>
            <div className="text-xs font-semibold text-[#a3a3a3] tracking-wider uppercase font-mono">
              Estate Planning OS — Central Administrator Terminal
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] bg-[#450a0a]/50 text-[#fca5a5] border border-[#7f1d1d]/60 font-bold uppercase tracking-wide">
                Admin: {user.name || user.email}
              </span>
            </div>
          </div>

          {/* Navigation Toolbar */}
          <div className="bg-[#101010] border-b border-[#242424] px-4 py-2.5 flex flex-wrap gap-2 text-xs font-medium">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#d4d4d4] bg-[#161616] border border-[#282828] hover:bg-[#202020] hover:text-[#ffffff] hover:border-[#383838] transition-all duration-150"
            >
              📊 System Dashboard
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#d4d4d4] bg-[#161616] border border-[#282828] hover:bg-[#202020] hover:text-[#ffffff] hover:border-[#383838] transition-all duration-150"
            >
              👥 User Management
            </Link>
            <Link
              href="/admin/cases"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#d4d4d4] bg-[#161616] border border-[#282828] hover:bg-[#202020] hover:text-[#ffffff] hover:border-[#383838] transition-all duration-150"
            >
              📁 Master Cases Docket
            </Link>
            <Link
              href="/admin/templates"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#d4d4d4] bg-[#161616] border border-[#282828] hover:bg-[#202020] hover:text-[#ffffff] hover:border-[#383838] transition-all duration-150"
            >
              📜 Templates & Clauses
            </Link>
            <Link
              href="/admin/audit-logs"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#d4d4d4] bg-[#161616] border border-[#282828] hover:bg-[#202020] hover:text-[#ffffff] hover:border-[#383838] transition-all duration-150"
            >
              🛡️ Audit Trail Viewer
            </Link>
          </div>

          {/* Subpage Container */}
          <div className="p-6 sm:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
```

---

#### Blueprint 6: `src/app/admin/dashboard/page.tsx`

**Target File**: `src/app/admin/dashboard/page.tsx`  
**Rationale**: Refactors the 4 telemetry cards, live audit table feed, and role breakdown pills into the OLED depth scale (`#0a0a0a` base, `#121212` cards, `#1f1f1f` borders).

```tsx
// Header
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242424] pb-4">
  <div>
    <h1 className="text-2xl font-bold text-[#e5e5e5] tracking-tight">
      System Metrics & Platform Health
    </h1>
    <p className="text-xs text-[#8a8a8a] mt-1">
      Real-time telemetry, relational database aggregations, and immutable security audit stream.
    </p>
  </div>
  <div className="flex gap-2">
    <Link
      href="/admin/cases"
      className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1e1b4b] text-[#c7d2fe] border border-[#3730a3] hover:bg-[#312e81] transition-all"
    >
      Inspect All Cases →
    </Link>
    <Link
      href="/admin/audit-logs"
      className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#161616] text-[#d4d4d4] border border-[#282828] hover:bg-[#202020] transition-all"
    >
      View Full Audit Trail
    </Link>
  </div>
</div>

// 4 Core Metric Panels
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Total Users */}
  <div className="bg-[#121212] border border-[#242424] hover:border-[#383838] p-5 rounded-xl transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
    <div className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider">
      Total Users
    </div>
    <div className="mt-2 text-3xl font-bold text-[#e5e5e5] font-mono">{totalUsers}</div>
    <div className="mt-3 pt-3 border-t border-[#1f1f1f] flex flex-wrap gap-1 text-[11px]">
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1e1b4b]/40 text-[#c7d2fe] border border-[#3730a3]/50">
        Customers: {roleMap["CUSTOMER"] || 0}
      </span>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#3b0764]/40 text-[#e9d5ff] border border-[#6b21a8]/50">
        Lawyers: {roleMap["LAWYER"] || 0}
      </span>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#450a0a]/40 text-[#fca5a5] border border-[#7f1d1d]/50">
        Admins: {roleMap["ADMIN"] || 0}
      </span>
    </div>
  </div>

  {/* Total Cases */}
  <div className="bg-[#121212] border border-[#242424] hover:border-[#383838] p-5 rounded-xl transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
    <div className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider">
      Total Cases
    </div>
    <div className="mt-2 text-3xl font-bold text-[#e5e5e5] font-mono">{totalCases}</div>
    <div className="mt-3 pt-3 border-t border-[#1f1f1f] flex flex-wrap gap-1 text-[11px]">
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#78350f]/40 text-[#fcd34d] border border-[#b45309]/50">
        In Review: {caseStatusMap["IN_REVIEW"] || 0}
      </span>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#064e3b]/40 text-[#6ee7b7] border border-[#047857]/50">
        Approved: {caseStatusMap["APPROVED"] || 0}
      </span>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1e1b4b]/40 text-[#a5b4fc] border border-[#3730a3]/50">
        Paid: {caseStatusMap["PAID"] || 0}
      </span>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#181818] text-[#a3a3a3] border border-[#282828]">
        Draft: {caseStatusMap["DRAFT"] || 0}
      </span>
    </div>
  </div>

  {/* Mock Revenue */}
  <div className="bg-[#121212] border border-[#242424] hover:border-[#383838] p-5 rounded-xl transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
    <div className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider">
      Mock Revenue (INR)
    </div>
    <div className="mt-2 text-3xl font-bold text-[#10b981] font-mono">
      ₹{totalRevenue.toLocaleString("en-IN")}
    </div>
    <div className="mt-3 pt-3 border-t border-[#1f1f1f] flex flex-wrap gap-1 text-[11px]">
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#064e3b]/40 text-[#6ee7b7] border border-[#047857]/50">
        Success: {successfulPayments}
      </span>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#78350f]/40 text-[#fcd34d] border border-[#b45309]/50">
        Pending: {paymentStatusMap["PENDING"] || 0}
      </span>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#450a0a]/40 text-[#fca5a5] border border-[#7f1d1d]/50">
        Failed: {paymentStatusMap["FAILED"] || 0}
      </span>
    </div>
  </div>

  {/* Legal Library */}
  <div className="bg-[#121212] border border-[#242424] hover:border-[#383838] p-5 rounded-xl transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
    <div className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider">
      Legal Knowledge Base
    </div>
    <div className="mt-2 text-3xl font-bold text-[#818cf8] font-mono">{totalTemplates}</div>
    <div className="mt-3 pt-3 border-t border-[#1f1f1f] flex flex-wrap gap-1 text-[11px]">
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1e1b4b]/40 text-[#c7d2fe] border border-[#3730a3]/50">
        Clauses: {clauseCount}
      </span>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#064e3b]/40 text-[#6ee7b7] border border-[#047857]/50">
        Approved: {templatesByStatus.find((t) => t.status === "LAWYER_APPROVED")?._count._all || 0}
      </span>
    </div>
  </div>
</div>

// Live Audit Stream Table
<div className="overflow-x-auto rounded-xl border border-[#242424] bg-[#0c0c0c]">
  <table className="min-w-full divide-y divide-[#1f1f1f] text-left text-sm bg-[#0c0c0c]">
    <thead className="bg-[#141414] text-xs font-semibold uppercase text-[#8a8a8a] tracking-wider">
      <tr>
        <th className="px-5 py-3.5">Timestamp (UTC)</th>
        <th className="px-5 py-3.5">Action Type</th>
        <th className="px-5 py-3.5">Actor</th>
        <th className="px-5 py-3.5">Target Entity</th>
        <th className="px-5 py-3.5">Case ID</th>
        <th className="px-5 py-3.5">Event Metadata</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-[#181818] font-normal">
      {recentLogs.map((log) => {
        let metadataPreview = "";
        try {
          const parsed = JSON.parse(log.metadata || "{}");
          metadataPreview = JSON.stringify(parsed);
        } catch {
          metadataPreview = log.metadata || "";
        }

        return (
          <tr key={log.id} className="hover:bg-[#141414] transition-colors duration-150">
            <td className="px-5 py-3.5 font-mono text-xs text-[#737373] whitespace-nowrap">
              {new Date(log.createdAt).toISOString().replace("T", " ").substring(0, 19)} UTC
            </td>
            <td className="px-5 py-3.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#1a1a2e] text-[#a5b4fc] border border-[#2e2e54]">
                {log.action}
              </span>
            </td>
            <td className="px-5 py-3.5 text-xs text-[#d4d4d4]">
              {log.actor ? (
                <div>
                  <div className="font-medium text-[#e5e5e5]">{log.actor.name || log.actor.email}</div>
                  <div className="text-[10px] text-[#737373] font-mono">{log.actor.role}</div>
                </div>
              ) : (
                <span className="text-[#666666] italic">System / Anonymous</span>
              )}
            </td>
            <td className="px-5 py-3.5 text-xs text-[#a3a3a3] font-mono">
              {log.entity || "-"}
            </td>
            <td className="px-5 py-3.5 text-xs font-mono text-[#737373]">
              {log.caseId ? log.caseId.slice(-8) : "-"}
            </td>
            <td className="px-5 py-3.5 text-xs font-mono text-[#737373] max-w-xs truncate">
              {metadataPreview || "-"}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
```

---

#### Blueprint 7: `src/app/admin/users/page.tsx` & `src/components/UserRoleSelector.tsx`

**Target File**: `src/app/admin/users/page.tsx`

```tsx
// Header & Role Filter Pills
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242424] pb-4">
  <div>
    <h1 className="text-xl font-bold text-[#e5e5e5] tracking-tight">
      User Directory & Access Administration
    </h1>
    <p className="text-xs text-[#8a8a8a] mt-0.5">
      Manage authenticated accounts, view case workloads, and provision role privileges.
    </p>
  </div>

  <div className="flex items-center gap-1.5 text-xs">
    <span className="text-[#737373] font-medium mr-1">Filter:</span>
    {[
      { label: `All (${users.length})`, val: undefined },
      { label: "Customers", val: "CUSTOMER" },
      { label: "Lawyers", val: "LAWYER" },
      { label: "Admins", val: "ADMIN" },
    ].map((tab) => {
      const isActive = (!filterRole && !tab.val) || filterRole === tab.val;
      return (
        <Link
          key={tab.label}
          href={tab.val ? `/admin/users?role=${tab.val}` : "/admin/users"}
          className={`px-3 py-1 rounded-full font-semibold border transition-colors ${
            isActive
              ? "bg-[#1e1b4b] text-[#c7d2fe] border-[#3730a3]"
              : "bg-[#141414] text-[#a3a3a3] border-[#262626] hover:bg-[#1c1c1c] hover:text-[#e5e5e5]"
          }`}
        >
          {tab.label}
        </Link>
      );
    })}
  </div>
</div>

// Users Table
<div className="overflow-x-auto rounded-xl border border-[#242424] bg-[#0c0c0c]">
  <table className="min-w-full divide-y divide-[#1f1f1f] text-left text-sm bg-[#0c0c0c]">
    <thead className="bg-[#141414] text-xs font-semibold uppercase text-[#8a8a8a] tracking-wider">
      <tr>
        <th className="px-5 py-3.5">User</th>
        <th className="px-5 py-3.5">Assigned Role</th>
        <th className="px-5 py-3.5">Workload / Cases</th>
        <th className="px-5 py-3.5">Registration Date (UTC)</th>
        <th className="px-5 py-3.5 text-right">Role Mutation</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-[#181818] font-normal">
      {users.map((u) => {
        const isSelf = u.id === currentUser.id;
        const caseCount = u.role === "LAWYER" ? u._count.assignedCases : u._count.cases;

        return (
          <tr key={u.id} className="hover:bg-[#141414] transition-colors duration-150">
            <td className="px-5 py-4">
              <div className="font-medium text-[#e5e5e5] flex items-center gap-2">
                {u.name || "Anonymous"}
                {isSelf && (
                  <span className="text-[10px] bg-[#450a0a]/50 text-[#fca5a5] border border-[#7f1d1d]/60 px-1.5 py-0.5 rounded font-bold">
                    You
                  </span>
                )}
              </div>
              <div className="text-xs text-[#737373] font-mono">{u.email}</div>
              <div className="text-[10px] text-[#555555] font-mono">ID: {u.id.slice(-8)}</div>
            </td>

            <td className="px-5 py-4">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase border ${
                  u.role === "ADMIN"
                    ? "bg-[#450a0a]/40 text-[#fca5a5] border-[#7f1d1d]/50"
                    : u.role === "LAWYER"
                    ? "bg-[#3b0764]/40 text-[#e9d5ff] border-[#6b21a8]/50"
                    : "bg-[#1e1b4b]/40 text-[#c7d2fe] border-[#3730a3]/50"
                }`}
              >
                {u.role}
              </span>
            </td>

            <td className="px-5 py-4 text-xs">
              {u.role === "LAWYER" ? (
                <div>
                  <span className="font-medium text-[#e5e5e5]">{caseCount} cases</span>{" "}
                  <span className="text-[#8a8a8a]">assigned</span>
                  <div className="text-[10px] text-[#737373]">
                    {u._count.lawyerReviews} reviews conducted
                  </div>
                </div>
              ) : (
                <div>
                  <span className="font-medium text-[#e5e5e5]">{caseCount} cases</span>{" "}
                  <span className="text-[#8a8a8a]">authored</span>
                </div>
              )}
            </td>

            <td className="px-5 py-4 text-xs font-mono text-[#737373] whitespace-nowrap">
              {new Date(u.createdAt).toISOString().replace("T", " ").substring(0, 16)} UTC
            </td>

            <td className="px-5 py-4 text-right">
              <UserRoleSelector userId={u.id} currentRole={u.role} isSelf={isSelf} />
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
```

**Target Component**: `src/components/UserRoleSelector.tsx`

```tsx
// Dropdown Select inside UserRoleSelector
<div className="flex items-center justify-end gap-1.5">
  <select
    value={role}
    disabled={loading || isSelf}
    onChange={(e) => handleRoleChange(e.target.value)}
    className="text-xs py-1 px-2.5 rounded-md border border-[#2e2e2e] bg-[#161616] text-[#e5e5e5] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] disabled:opacity-50 font-medium transition-colors cursor-pointer"
  >
    <option value="CUSTOMER">CUSTOMER</option>
    <option value="LAWYER">LAWYER</option>
    <option value="ADMIN">ADMIN</option>
  </select>
  {loading && <span className="text-[10px] text-[#818cf8] animate-pulse">Saving...</span>}
</div>
```

---

#### Blueprint 8: `src/app/admin/cases/page.tsx` & `src/components/AdminCaseAssigner.tsx`

**Target File**: `src/app/admin/cases/page.tsx`

```tsx
// Filter Pills
<div className="flex flex-wrap items-center gap-1.5 text-xs">
  <span className="text-[#737373] font-medium mr-1">Status:</span>
  {statusList.map((st) => {
    const isActive = (!filterStatus && st === "ALL") || filterStatus === st;
    return (
      <Link
        key={st}
        href={st === "ALL" ? "/admin/cases" : `/admin/cases?status=${st}`}
        className={`px-3 py-1 rounded-full font-semibold border transition-colors ${
          isActive
            ? "bg-[#1e1b4b] text-[#c7d2fe] border-[#3730a3]"
            : "bg-[#141414] text-[#a3a3a3] border-[#262626] hover:bg-[#1c1c1c] hover:text-[#e5e5e5]"
        }`}
      >
        {st}
      </Link>
    );
  })}
</div>

// Cases Table
<div className="overflow-x-auto rounded-xl border border-[#242424] bg-[#0c0c0c]">
  <table className="min-w-full divide-y divide-[#1f1f1f] text-left text-sm bg-[#0c0c0c]">
    <thead className="bg-[#141414] text-xs font-semibold uppercase text-[#8a8a8a] tracking-wider">
      <tr>
        <th className="px-5 py-3.5">Case ID</th>
        <th className="px-5 py-3.5">Customer / Testator</th>
        <th className="px-5 py-3.5">Status</th>
        <th className="px-5 py-3.5">Assigned Counsel</th>
        <th className="px-5 py-3.5">Payment</th>
        <th className="px-5 py-3.5">Created Date (UTC)</th>
        <th className="px-5 py-3.5 text-right">Actions</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-[#181818] font-normal">
      {cases.length === 0 ? (
        <tr>
          <td colSpan={7} className="px-5 py-8 text-center text-xs text-[#737373]">
            No cases found matching the specified status filter.
          </td>
        </tr>
      ) : (
        cases.map((c) => {
          const latestPayment = c.payments[0];
          const flags = (c.flags || "").split(",").filter(Boolean);

          return (
            <tr key={c.id} className="hover:bg-[#141414] transition-colors duration-150">
              <td className="px-5 py-4 font-mono font-medium text-[#e5e5e5]">
                {c.id.slice(-8)}
              </td>

              <td className="px-5 py-4">
                <div className="font-medium text-[#e5e5e5]">
                  {c.customer.name || "Anonymous Testator"}
                </div>
                <div className="text-xs text-[#737373] font-mono">{c.customer.email}</div>
                {flags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {flags.slice(0, 2).map((f, i) => (
                      <span
                        key={i}
                        className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-[#181818] text-[#a3a3a3] border border-[#282828] font-mono"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </td>

              <td className="px-5 py-4">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                    c.status === "APPROVED"
                      ? "bg-[#064e3b]/40 text-[#6ee7b7] border-[#047857]/50"
                      : c.status === "IN_REVIEW"
                      ? "bg-[#78350f]/40 text-[#fcd34d] border-[#b45309]/50"
                      : c.status === "PAID"
                      ? "bg-[#1e1b4b]/40 text-[#a5b4fc] border-[#3730a3]/50"
                      : "bg-[#181818] text-[#a3a3a3] border-[#282828]"
                  }`}
                >
                  {c.status}
                </span>
              </td>

              <td className="px-5 py-4">
                <AdminCaseAssigner
                  caseId={c.id}
                  currentLawyerId={c.lawyerId}
                  lawyers={lawyers}
                />
              </td>

              <td className="px-5 py-4 text-xs">
                {latestPayment ? (
                  <div>
                    <span className="font-medium text-[#e5e5e5]">
                      ₹{latestPayment.amount.toLocaleString("en-IN")}
                    </span>
                    <span
                      className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        latestPayment.status === "SUCCESS"
                          ? "bg-[#064e3b]/40 text-[#6ee7b7] border-[#047857]/50"
                          : "bg-[#78350f]/40 text-[#fcd34d] border-[#b45309]/50"
                      }`}
                    >
                      {latestPayment.status}
                    </span>
                  </div>
                ) : (
                  <span className="text-[#666666] italic">Unpaid</span>
                )}
              </td>

              <td className="px-5 py-4 text-xs font-mono text-[#737373] whitespace-nowrap">
                {new Date(c.createdAt).toISOString().replace("T", " ").substring(0, 16)} UTC
              </td>

              <td className="px-5 py-4 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/lawyer/case/${c.id}`}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#161616] text-[#d4d4d4] border border-[#282828] hover:bg-[#202020] hover:text-white transition-all"
                  >
                    Inspect File
                  </Link>
                  <a
                    href={`/api/document/download?caseId=${c.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1e1b4b] text-[#c7d2fe] border border-[#3730a3] hover:bg-[#312e81] transition-all"
                  >
                    DOCX
                  </a>
                </div>
              </td>
            </tr>
          );
        })
      )}
    </tbody>
  </table>
</div>
```

**Target Component**: `src/components/AdminCaseAssigner.tsx`

```tsx
// Dropdown Select inside AdminCaseAssigner
<div className="flex items-center gap-1.5">
  <select
    value={selectedLawyerId}
    disabled={loading}
    onChange={(e) => handleAssign(e.target.value)}
    className="text-xs py-1 px-2 rounded-md border border-[#2e2e2e] bg-[#161616] text-[#e5e5e5] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] font-medium transition-colors cursor-pointer"
  >
    <option value="">— Unassigned —</option>
    {lawyers.map((l) => (
      <option key={l.id} value={l.id}>
        Adv. {l.name || l.email}
      </option>
    ))}
  </select>
  {loading && <span className="text-[10px] text-[#818cf8] animate-pulse">Assigning...</span>}
</div>
```

---

#### Blueprint 9: `src/app/admin/templates/page.tsx` & `src/components/TemplateStatusManager.tsx`

**Target File**: `src/app/admin/templates/page.tsx`

```tsx
// Header
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242424] pb-4">
  <div>
    <h1 className="text-xl font-bold text-[#e5e5e5] tracking-tight">
      Legal Template & Clause Lifecycle Governance
    </h1>
    <p className="text-xs text-[#8a8a8a] mt-0.5">
      Control legal clause states according to statutory requirements. Only templates and clauses in{" "}
      <span className="font-semibold text-[#10b981]">LAWYER_APPROVED</span> or{" "}
      <span className="font-semibold text-[#818cf8]">LOCKED</span> state may be compiled into customer documents.
    </p>
  </div>
  <button
    type="button"
    className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1e1b4b] text-[#c7d2fe] border border-[#3730a3] hover:bg-[#312e81] whitespace-nowrap self-start sm:self-auto transition-all"
  >
    + New Clause Definition
  </button>
</div>

// Templates & Clauses Tables Structure
<div className="overflow-x-auto rounded-xl border border-[#242424] bg-[#0c0c0c]">
  <table className="min-w-full divide-y divide-[#1f1f1f] text-left text-sm bg-[#0c0c0c]">
    <thead className="bg-[#141414] text-xs font-semibold uppercase text-[#8a8a8a] tracking-wider">
      <tr>
        <th className="px-5 py-3.5">Name & Description</th>
        <th className="px-5 py-3.5">Status</th>
        <th className="px-5 py-3.5">Versions</th>
        <th className="px-5 py-3.5">Last Updated</th>
        <th className="px-5 py-3.5 text-right">Lifecycle Transition</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-[#181818] font-normal">
      {/* Status Badges Mapping */}
      {/* LAWYER_APPROVED: bg-[#064e3b]/40 text-[#6ee7b7] border-[#047857]/50 */}
      {/* LOCKED: bg-[#1e1b4b]/40 text-[#c7d2fe] border-[#3730a3]/50 */}
      {/* ARCHIVED: bg-[#450a0a]/40 text-[#fca5a5] border-[#7f1d1d]/50 */}
      {/* DRAFT: bg-[#78350f]/40 text-[#fcd34d] border-[#b45309]/50 */}
    </tbody>
  </table>
</div>
```

**Target Component**: `src/components/TemplateStatusManager.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TemplateStatusManagerProps {
  targetId: string;
  targetType: "template" | "clause";
  currentStatus: string;
}

export default function TemplateStatusManager({
  targetId,
  targetType,
  currentStatus,
}: TemplateStatusManagerProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    setLoading(true);

    try {
      const payload: any = { status: newStatus };
      if (targetType === "template") payload.templateId = targetId;
      else payload.clauseId = targetId;

      const res = await fetch("/api/admin/templates/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update lifecycle status");
      } else {
        router.refresh();
      }
    } catch {
      alert("Network error while updating lifecycle status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5 flex-wrap">
      {currentStatus !== "LAWYER_APPROVED" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => handleStatusChange("LAWYER_APPROVED")}
          className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#064e3b] text-[#ecfdf5] border border-[#059669] hover:bg-[#047857] transition-all disabled:opacity-50"
        >
          Approve
        </button>
      )}

      {currentStatus !== "LOCKED" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => handleStatusChange("LOCKED")}
          className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#1e1b4b] text-[#c7d2fe] border border-[#3730a3] hover:bg-[#312e81] transition-all disabled:opacity-50"
        >
          Lock
        </button>
      )}

      {currentStatus !== "ARCHIVED" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => handleStatusChange("ARCHIVED")}
          className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#450a0a]/60 text-[#fca5a5] border border-[#7f1d1d] hover:bg-[#7f1d1d] transition-all disabled:opacity-50"
        >
          Archive
        </button>
      )}

      {currentStatus !== "DRAFT" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => handleStatusChange("DRAFT")}
          className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium text-[#737373] hover:text-[#d4d4d4] hover:bg-[#1a1a1a] transition-all disabled:opacity-50"
        >
          Reset Draft
        </button>
      )}

      {loading && <span className="text-[10px] text-[#818cf8] animate-pulse">Updating...</span>}
    </div>
  );
}
```

---

#### Blueprint 10: `src/app/admin/audit-logs/page.tsx`

**Target File**: `src/app/admin/audit-logs/page.tsx`  
**Rationale**: Eliminates Server Component event-handler issues while establishing the OLED dark theme with high-legibility JSON inspector and pagination controls.

```tsx
// Filter & Search Toolbar (Using native GET form navigation to keep 100% Server Component purity)
<div className="bg-[#0e0e0e] p-4 rounded-xl border border-[#242424] flex flex-col sm:flex-row gap-4 justify-between items-center text-xs">
  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
    <span className="font-semibold text-[#8a8a8a]">Filter by Event:</span>
    <form method="GET" action="/admin/audit-logs" className="inline-flex">
      {searchQuery && <input type="hidden" name="q" value={searchQuery} />}
      <select
        name="action"
        defaultValue={filterAction || "ALL"}
        // Note: Can submit on form submit or wrap in client component
        className="p-1.5 rounded-lg border border-[#2e2e2e] bg-[#161616] text-[#e5e5e5] font-medium focus:border-[#6366f1] focus:outline-none cursor-pointer"
      >
        <option value="ALL">All Events ({actionTypes.reduce((a, b) => a + b._count._all, 0)})</option>
        {actionTypes.map((act) => (
          <option key={act.action} value={act.action}>
            {act.action} ({act._count._all})
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="ml-2 px-2 py-1 bg-[#161616] text-[#e5e5e5] rounded border border-[#2e2e2e]">Apply</button>
      </noscript>
    </form>
  </div>

  <div className="flex items-center gap-2 w-full sm:w-auto">
    <form method="GET" action="/admin/audit-logs" className="flex items-center gap-2 w-full">
      {filterAction && filterAction !== "ALL" && (
        <input type="hidden" name="action" value={filterAction} />
      )}
      <input
        type="text"
        name="q"
        defaultValue={searchQuery || ""}
        placeholder="Search actor, case ID, metadata..."
        className="p-1.5 rounded-lg border border-[#2e2e2e] bg-[#161616] text-[#e5e5e5] placeholder-[#555555] w-full sm:w-64 focus:border-[#6366f1] focus:outline-none font-medium"
      />
      <button
        type="submit"
        className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1e1b4b] text-[#c7d2fe] border border-[#3730a3] hover:bg-[#312e81] transition-all"
      >
        Search
      </button>
      {searchQuery && (
        <Link
          href="/admin/audit-logs"
          className="text-xs text-[#737373] hover:text-[#d4d4d4] underline transition-colors"
        >
          Clear
        </Link>
      )}
    </form>
  </div>
</div>

// Table & JSON Inspector
<div className="overflow-x-auto rounded-xl border border-[#242424] bg-[#0c0c0c]">
  <table className="min-w-full divide-y divide-[#1f1f1f] text-left text-sm bg-[#0c0c0c]">
    <thead className="bg-[#141414] text-xs font-semibold uppercase text-[#8a8a8a] tracking-wider">
      <tr>
        <th className="px-5 py-3.5">Timestamp (UTC)</th>
        <th className="px-5 py-3.5">Action Type</th>
        <th className="px-5 py-3.5">Actor / Principal</th>
        <th className="px-5 py-3.5">Target Entity</th>
        <th className="px-5 py-3.5">Case ID</th>
        <th className="px-5 py-3.5">Structured Metadata (JSON)</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-[#181818] font-normal">
      {auditLogs.map((log) => {
        let formattedJson = "";
        let hasMetadata = false;
        try {
          if (log.metadata) {
            const parsed = JSON.parse(log.metadata);
            formattedJson = JSON.stringify(parsed, null, 2);
            hasMetadata = true;
          }
        } catch {
          formattedJson = log.metadata || "";
          hasMetadata = !!log.metadata;
        }

        return (
          <tr key={log.id} className="hover:bg-[#141414] transition-colors duration-150">
            <td className="px-5 py-4 font-mono text-xs text-[#737373] whitespace-nowrap">
              {new Date(log.createdAt).toISOString().replace("T", " ").substring(0, 19)} UTC
            </td>

            <td className="px-5 py-4">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#1a1a2e] text-[#a5b4fc] border border-[#2e2e54]">
                {log.action}
              </span>
            </td>

            <td className="px-5 py-4 text-xs">
              {log.actor ? (
                <div>
                  <div className="font-medium text-[#e5e5e5]">{log.actor.name || log.actor.email}</div>
                  <div className="text-[10px] text-[#737373] font-mono">{log.actor.email}</div>
                  <span className="text-[9px] bg-[#181818] px-1 py-0.2 rounded text-[#a3a3a3] font-mono font-semibold">
                    {log.actor.role}
                  </span>
                </div>
              ) : (
                <span className="text-[#666666] italic">System / Unauthenticated</span>
              )}
            </td>

            <td className="px-5 py-4 text-xs font-mono text-[#a3a3a3]">
              <div>{log.entity || "-"}</div>
              {log.entityId && (
                <div className="text-[10px] text-[#555555]">{log.entityId.slice(-8)}</div>
              )}
            </td>

            <td className="px-5 py-4 text-xs font-mono text-[#a3a3a3]">
              {log.caseId ? (
                <Link
                  href={`/admin/cases`}
                  className="text-[#818cf8] hover:text-[#a5b4fc] hover:underline font-mono font-medium"
                >
                  {log.caseId.slice(-8)}
                </Link>
              ) : (
                "-"
              )}
            </td>

            <td className="px-5 py-4 text-xs max-w-sm">
              {hasMetadata ? (
                <details className="cursor-pointer group">
                  <summary className="text-[11px] text-[#818cf8] group-hover:text-[#a5b4fc] group-hover:underline font-mono truncate">
                    {log.metadata?.substring(0, 45)}...
                  </summary>
                  <pre className="mt-2 text-[10px] bg-[#050505] text-[#34d399] p-3 rounded-lg overflow-x-auto font-mono max-h-48 border border-[#1f1f1f] shadow-inner">
                    {formattedJson}
                  </pre>
                </details>
              ) : (
                <span className="text-[#666666] italic text-[11px]">No metadata</span>
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>

// Pagination Bar
<div className="flex items-center justify-between text-xs text-[#737373] pt-2">
  <div>
    Showing <span className="font-semibold text-[#d4d4d4]">{skip + 1}</span> to{" "}
    <span className="font-semibold text-[#d4d4d4]">{Math.min(skip + take, totalCount)}</span> of{" "}
    <span className="font-semibold text-[#d4d4d4]">{totalCount}</span> audit records
  </div>

  <div className="flex gap-2">
    {page > 1 && (
      <Link
        href={`/admin/audit-logs?page=${page - 1}${filterAction ? `&action=${filterAction}` : ""}${
          searchQuery ? `&q=${searchQuery}` : ""
        }`}
        className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium text-[#d4d4d4] bg-[#161616] border border-[#282828] hover:bg-[#202020] hover:text-white transition-all"
      >
        ← Previous
      </Link>
    )}
    {page < totalPages && (
      <Link
        href={`/admin/audit-logs?page=${page + 1}${filterAction ? `&action=${filterAction}` : ""}${
          searchQuery ? `&q=${searchQuery}` : ""
        }`}
        className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium text-[#d4d4d4] bg-[#161616] border border-[#282828] hover:bg-[#202020] hover:text-white transition-all"
      >
        Next →
      </Link>
    )}
  </div>
</div>
```

---

## 5. Verification Method

To independently verify this refactoring plan:

1. **Syntax & Type Check**:
   - Run: `npx tsc --noEmit`
   - Invalidation condition: Any missing props, undefined CSS classes, or syntax errors.

2. **Next.js Production Build**:
   - Run: `npm run build`
   - Invalidation condition: Any SSR hydration error, unhandled promise in `params`/`searchParams`, or compilation failure.

3. **Visual Contrast & OLED Compliance**:
   - Verify that all pages have a pure `#000000` base background without light bleed.
   - Verify that panels and cards sit at `#0a0a0a` to `#161616`.
   - Inspect text colors in DevTools: confirm primary text is `#e5e5e5` and no harsh pure `#ffffff` is used for body content.
   - Confirm status badges have low-saturation dark backgrounds (`bg-[#064e3b]/40`, `bg-[#78350f]/40`, `bg-[#450a0a]/40`) with soft readable text.
   - Invalidation condition: Appearance of light-gray backgrounds, skeuomorphic Aqua gradients, or unstyled tables.

4. **Functional & RBAC Integrity**:
   - Login as `lawyer@demo.com` (`password123`) -> visit `/lawyer/dashboard` -> open a review `/lawyer/case/[id]` -> test decision form (`APPROVE`, `REQUEST_CHANGES`, `REJECT`) -> verify DOCX download.
   - Login as `admin@demo.com` (`password123`) -> visit `/admin/dashboard` -> test `/admin/users` role selector -> test `/admin/cases` lawyer assigner -> test `/admin/templates` lifecycle actions -> test `/admin/audit-logs` search and JSON inspector.
   - Invalidation condition: 403/500 errors, broken form submissions, or database mutations failing.
