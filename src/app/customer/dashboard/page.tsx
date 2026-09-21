import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function CustomerDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "CUSTOMER") {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  const cases = await prisma.case.findMany({
    where: { customerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      documents: true,
      reviews: true,
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-300 border border-amber-800/60">
            Draft
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/40 text-blue-300 border border-blue-800/60">
            Submitted
          </span>
        );
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/40 text-indigo-300 border border-indigo-800/60">
            Under Review
          </span>
        );
      case "CLARIFICATION_REQUESTED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-950/40 text-orange-300 border border-orange-800/60">
            Clarification Needed
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
            Approved
          </span>
        );
      case "PAID":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-800/60">
            Paid
          </span>
        );
      case "GENERATED":
      case "FINAL":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
            Documents Ready
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-900 text-neutral-300 border border-neutral-800">
            {status}
          </span>
        );
    }
  };

  return (
    <main className="min-h-screen bg-black text-[#e5e5e5] p-4 sm:p-8 selection:bg-[#d4a373]/30 selection:text-white">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Window Header */}
        <header className="rounded-2xl bg-[#0a0a0a] border border-[#222222] shadow-[0_4px_24px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="bg-[#111111] border-b border-[#222222] px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
            </div>
            <span className="text-xs font-semibold text-[#d4a373] tracking-wide uppercase font-mono">
              Customer Portal — Will & Estate Planning
            </span>
            <span className="text-xs text-[#737373] font-medium hidden sm:inline">
              {(session.user as any)?.email}
            </span>
          </div>

          <div className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0a0a0a]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#161616] text-[#d4a373] border border-[#2a2a2a]">
                  Customer Dashboard
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#e5e5e5]">
                Welcome, {(session.user as any)?.name || "Valued Client"}
              </h1>
              <p className="text-xs sm:text-sm text-[#a3a3a3] mt-1">
                Manage your will preparation cases and track legal status in real-time
              </p>
            </div>

            <Link
              href="/customer/questionnaire"
              className="inline-flex items-center justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] text-neutral-950 font-semibold px-5 py-2.5 text-sm shadow-[0_2px_12px_rgba(212,163,115,0.2)] transition-all shrink-0"
            >
              + Start New Will
            </Link>
          </div>
        </header>

        {/* Active Cases Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-[#e5e5e5]">Your Will Cases</h2>
            <span className="text-xs text-[#737373] font-medium">
              Total: {cases.length} case{cases.length === 1 ? "" : "s"}
            </span>
          </div>

          {cases.length === 0 ? (
            <div className="rounded-2xl bg-[#0a0a0a] border border-[#222222] p-10 sm:p-14 text-center shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
              <div className="max-w-md mx-auto space-y-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs uppercase tracking-wider text-[#d4a373] bg-[#161616] border border-[#2a2a2a]">
                  No Cases Active
                </span>
                <h3 className="text-xl font-bold text-[#e5e5e5]">
                  You haven&apos;t created any wills yet
                </h3>
                <p className="text-sm text-[#a3a3a3] leading-relaxed">
                  Our guided questionnaire walks you through every step: personal details, family members, asset distribution, executor appointments, and lawyer review.
                </p>
                <div className="pt-2">
                  <Link
                    href="/customer/questionnaire"
                    className="inline-flex items-center justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] text-neutral-950 font-semibold px-6 py-2.5 text-sm shadow-[0_2px_12px_rgba(212,163,115,0.2)] transition-all"
                  >
                    + Start New Will
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {cases.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl bg-[#0a0a0a] hover:bg-[#0f0f0f] border border-[#222222] hover:border-[#333333] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all duration-200"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="font-mono text-xs sm:text-sm font-bold text-[#e5e5e5]">
                        Case #{c.id.slice(-8).toUpperCase()}
                      </span>
                      {getStatusBadge(c.status)}
                      {c.flags && c.flags !== "STANDARD" && (
                        <span className="text-[11px] font-semibold text-[#d4a373] bg-[#161616] px-2.5 py-0.5 rounded-full border border-[#2a2a2a]">
                          {c.flags}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#737373]">
                      <span>
                        <strong className="text-[#a3a3a3] font-medium">Created:</strong>{" "}
                        {new Date(c.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span>
                        <strong className="text-[#a3a3a3] font-medium">Updated:</strong>{" "}
                        {new Date(c.updatedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {c.documents?.length > 0 && (
                        <span>
                          <strong className="text-[#a3a3a3] font-medium">Documents:</strong>{" "}
                          {c.documents.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contextual Action Button */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {c.status === "DRAFT" && (
                      <Link
                        href={`/customer/questionnaire?caseId=${c.id}`}
                        className="inline-flex items-center justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] text-neutral-950 font-semibold px-4 py-2 text-xs sm:text-sm shadow-sm transition-all"
                      >
                        Resume Questionnaire →
                      </Link>
                    )}

                    {c.status === "SUBMITTED" && (
                      <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold text-blue-300 bg-blue-950/40 border border-blue-800/60">
                        Awaiting Processing
                      </span>
                    )}

                    {(c.status === "IN_REVIEW" || c.status === "CLARIFICATION_REQUESTED") && (
                      <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold text-indigo-300 bg-indigo-950/40 border border-indigo-800/60">
                        Under Lawyer Review
                      </span>
                    )}

                    {(c.status === "APPROVED" ||
                      c.status === "PAID" ||
                      c.status === "GENERATED" ||
                      c.status === "FINAL") && (
                      <Link
                        href={`/customer/document?caseId=${c.id}`}
                        className="inline-flex items-center justify-center rounded-lg bg-[#161616] hover:bg-[#202020] text-[#e5e5e5] border border-[#2a2a2a] hover:border-[#383838] px-4 py-2 text-xs sm:text-sm font-semibold transition-all"
                      >
                        View Documents →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
