import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!session || user?.role !== "ADMIN") {
    redirect("/login");
  }

  // Parallel Promise.all aggregation to prevent sequential roundtrips
  const [
    totalUsers,
    usersByRole,
    totalCases,
    casesByStatus,
    paymentAggregates,
    paymentsByStatus,
    templatesByStatus,
    clauseCount,
    recentLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.case.count(),
    prisma.case.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.payment.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.template.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.clause.count(),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { actor: true },
    }),
  ]);

  const totalRevenue = paymentAggregates._sum.amount || 0;
  const successfulPayments = paymentAggregates._count._all || 0;

  // Build helper maps for breakdown rendering
  const roleMap: Record<string, number> = {};
  usersByRole.forEach((r) => {
    roleMap[r.role] = r._count._all;
  });

  const caseStatusMap: Record<string, number> = {};
  casesByStatus.forEach((s) => {
    caseStatusMap[s.status] = s._count._all;
  });

  const paymentStatusMap: Record<string, number> = {};
  paymentsByStatus.forEach((p) => {
    paymentStatusMap[p.status] = p._count._all;
  });

  const totalTemplates = templatesByStatus.reduce((acc, curr) => acc + curr._count._all, 0);

  return (
    <div className="space-y-8">
      {/* Top Welcome & Subheading */}
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
            className="aqua-btn-primary inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1e1b4b] text-[#c7d2fe] border border-[#3730a3] hover:bg-[#312e81] transition-all"
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

      {/* 4 Core Metric Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="aqua-card bg-[#121212] border border-[#242424] hover:border-[#383838] p-5 rounded-xl transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
          <div className="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider">
            Total Users
          </div>
          <div className="mt-2 text-3xl font-bold text-[#e5e5e5] font-mono">{totalUsers}</div>
          <div className="mt-3 pt-3 border-t border-[#1f1f1f] flex flex-wrap gap-1 text-[11px]">
            <span className="aqua-badge px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1e1b4b]/40 text-[#c7d2fe] border border-[#3730a3]/50">
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

        {/* Legal Knowledge Base */}
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

      {/* Live UTC Audit Stream Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#e5e5e5]">Live UTC Audit Trail Feed</h2>
            <p className="text-xs text-[#8a8a8a]">
              Most recent critical system, security, payment, and legal events in standardized UTC.
            </p>
          </div>
          <Link
            href="/admin/audit-logs"
            className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-[#161616] text-[#d4d4d4] border border-[#282828] hover:bg-[#202020] hover:text-white transition-all"
          >
            Full Audit Viewer →
          </Link>
        </div>

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
      </div>
    </div>
  );
}
