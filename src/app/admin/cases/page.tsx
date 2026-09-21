import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminCaseAssigner from "@/components/AdminCaseAssigner";

interface AdminCasesPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminCasesPage({ searchParams }: AdminCasesPageProps) {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any;

  if (!session || currentUser?.role !== "ADMIN") {
    redirect("/login");
  }

  const { status: filterStatus } = await searchParams;

  const whereClause: any = {};
  if (filterStatus && filterStatus !== "ALL") {
    whereClause.status = filterStatus.toUpperCase();
  }

  const [cases, lawyers] = await Promise.all([
    prisma.case.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        lawyer: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        reviews: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["LAWYER", "ADMIN"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const statusList = ["ALL", "DRAFT", "PAID", "IN_REVIEW", "CLARIFICATION_REQUESTED", "APPROVED", "REJECTED"];

  return (
    <div className="space-y-6">
      {/* Header & Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242424] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#e5e5e5] tracking-tight">
            Master Cases Docket & Assignment Matrix
          </h1>
          <p className="text-xs text-[#8a8a8a] mt-0.5">
            System-wide overview of all customer will submissions, payment verification, and lawyer assignments.
          </p>
        </div>

        {/* Filter Buttons */}
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
      </div>

      {/* Cases Table */}
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
                        className={`aqua-badge px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
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
                          className="aqua-btn-silver inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#161616] text-[#d4d4d4] border border-[#282828] hover:bg-[#202020] hover:text-white transition-all"
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
    </div>
  );
}
