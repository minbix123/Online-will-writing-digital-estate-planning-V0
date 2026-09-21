import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import ClaimCaseButton from "@/components/ClaimCaseButton";

export default async function LawyerDashboard() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!session || (user?.role !== "LAWYER" && user?.role !== "ADMIN")) {
    redirect("/login");
  }

  // 1. Fetch cases assigned specifically to this lawyer
  const myCases = await prisma.case.findMany({
    where: {
      lawyerId: user.id,
    },
    orderBy: { updatedAt: "desc" },
    include: {
      customer: true,
      reviews: true,
      documents: true,
    },
  });

  // 2. Fetch unassigned cases in review queue
  const unassignedCases = await prisma.case.findMany({
    where: {
      lawyerId: null,
      status: {
        in: ["IN_REVIEW", "SUBMITTED"],
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      reviews: true,
    },
  });

  // 3. Metric totals
  const completedReviewsCount = await prisma.lawyerReview.count({
    where: {
      lawyerId: user.id,
      status: "COMPLETED",
    },
  });

  return (
    <div className="min-h-screen bg-black text-[#e5e5e5] py-8 px-4 sm:px-6 lg:px-8 selection:bg-[#d4a373]/30 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Main OLED Dark Window */}
        <div className="aqua-window bg-[#0a0a0a] border border-[#242424] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.85)] overflow-hidden">
          {/* Titlebar */}
          <div className="aqua-titlebar bg-[#121212] border-b border-[#242424] px-5 py-3.5 flex items-center justify-between">
            <div className="aqua-traffic-lights flex items-center gap-2">
              <span className="aqua-dot aqua-dot-red w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
              <span className="aqua-dot aqua-dot-yellow w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
              <span className="aqua-dot aqua-dot-green w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
            </div>
            <div className="text-xs font-semibold text-[#a3a3a3] tracking-wider uppercase font-mono">
              Advocate Review Console — Counsel: {user.name || user.email}
            </div>
            <div className="aqua-badge px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#1e1b4b]/60 text-[#a5b4fc] border border-[#3730a3]/50">
              {user.role} Verified
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Quick Metrics Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="aqua-card bg-[#121212] border border-[#242424] hover:border-[#383838] p-5 rounded-xl transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
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
                    <tbody className="divide-y divide-[#181818] font-normal">
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
                    <tbody className="divide-y divide-[#181818] font-normal">
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
  );
}
