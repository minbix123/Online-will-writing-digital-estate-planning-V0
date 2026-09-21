import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

interface AdminAuditLogsPageProps {
  searchParams: Promise<{ action?: string; q?: string; page?: string }>;
}

export default async function AdminAuditLogsPage({ searchParams }: AdminAuditLogsPageProps) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!session || user?.role !== "ADMIN") {
    redirect("/login");
  }

  const { action: filterAction, q: searchQuery, page: pageStr } = await searchParams;

  const page = Math.max(1, parseInt(pageStr || "1", 10) || 1);
  const take = 20;
  const skip = (page - 1) * take;

  const whereClause: any = {};
  if (filterAction && filterAction !== "ALL") {
    whereClause.action = filterAction;
  }
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim();
    whereClause.OR = [
      { caseId: { contains: q } },
      { action: { contains: q } },
      { entityId: { contains: q } },
      { metadata: { contains: q } },
      { actor: { email: { contains: q } } },
      { actor: { name: { contains: q } } },
    ];
  }

  const [auditLogs, totalCount, actionTypes] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereClause,
      take,
      skip,
      orderBy: { createdAt: "desc" },
      include: { actor: true },
    }),
    prisma.auditLog.count({ where: whereClause }),
    prisma.auditLog.groupBy({
      by: ["action"],
      _count: { _all: true },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / take);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-[#242424] pb-4">
        <h1 className="text-xl font-bold text-[#e5e5e5] tracking-tight">
          Immutable System Audit Trail Explorer
        </h1>
        <p className="text-xs text-[#8a8a8a] mt-0.5">
          Tamper-resistant audit record covering all authentication, payment state transitions, case status modifications, and legal workflow events in strict UTC.
        </p>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-[#0e0e0e] p-4 rounded-xl border border-[#242424] flex flex-col sm:flex-row gap-4 justify-between items-center text-xs">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <span className="font-semibold text-[#8a8a8a]">Filter by Event:</span>
          <form method="GET" action="/admin/audit-logs" className="inline-flex items-center gap-2">
            {searchQuery && <input type="hidden" name="q" value={searchQuery} />}
            <select
              name="action"
              defaultValue={filterAction || "ALL"}
              className="p-1.5 rounded-lg border border-[#2e2e2e] bg-[#161616] text-[#e5e5e5] font-medium focus:border-[#6366f1] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Events ({actionTypes.reduce((a, b) => a + b._count._all, 0)})</option>
              {actionTypes.map((act) => (
                <option key={act.action} value={act.action}>
                  {act.action} ({act._count._all})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-2.5 py-1.5 bg-[#1e1b4b] text-[#c7d2fe] rounded-lg border border-[#3730a3] hover:bg-[#312e81] font-semibold text-xs transition-all"
            >
              Filter
            </button>
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
              className="aqua-btn-primary inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1e1b4b] text-[#c7d2fe] border border-[#3730a3] hover:bg-[#312e81] transition-all"
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

      {/* Audit Log Table */}
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
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-xs text-[#737373]">
                  No audit log entries found matching criteria.
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => {
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
                      <span className="aqua-badge px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#1a1a2e] text-[#a5b4fc] border border-[#2e2e54]">
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
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
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
    </div>
  );
}
