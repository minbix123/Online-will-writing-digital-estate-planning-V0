import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import LawyerDecisionForm from "@/components/LawyerDecisionForm";

interface LawyerCaseReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function LawyerCaseReviewPage({ params }: LawyerCaseReviewPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!session || (user?.role !== "LAWYER" && user?.role !== "ADMIN")) {
    redirect("/login");
  }

  const caseData = await prisma.case.findUnique({
    where: { id },
    include: {
      customer: true,
      lawyer: true,
      answers: true,
      documents: { orderBy: { createdAt: "desc" } },
      reviews: {
        include: { lawyer: true },
        orderBy: { createdAt: "desc" },
      },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!caseData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-[#0a0a0a] border border-[#242424] rounded-2xl p-8 max-w-md w-full text-center shadow-[0_4px_30px_rgba(0,0,0,0.85)]">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
          </div>
          <h2 className="text-xl font-bold text-[#e5e5e5] mb-2">Case Not Found</h2>
          <p className="text-xs text-[#a3a3a3] mb-6">
            The requested legal case #{id} does not exist in the platform registry.
          </p>
          <Link
            href="/lawyer/dashboard"
            className="inline-flex items-center justify-center px-6 py-2 rounded-lg text-xs font-semibold bg-[#1e1b4b] text-[#c7d2fe] border border-[#3730a3] hover:bg-[#312e81] hover:text-white transition-all"
          >
            ← Return to Docket
          </Link>
        </div>
      </div>
    );
  }

  // IDOR Protection: Case assigned to another advocate cannot be inspected by non-admin lawyers
  if (caseData.lawyerId && caseData.lawyerId !== user.id && user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-[#0a0a0a] border border-[#242424] rounded-2xl p-8 max-w-lg w-full text-center shadow-[0_4px_30px_rgba(0,0,0,0.85)]">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
          </div>
          <div className="w-12 h-12 bg-rose-950/50 text-rose-400 border border-rose-800/60 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">
            ⛔
          </div>
          <h2 className="text-xl font-bold text-[#e5e5e5] mb-2">Access Denied — Case Claimed</h2>
          <p className="text-xs text-[#a3a3a3] mb-6">
            This testamentary file has already been assigned to advocate{" "}
            <span className="font-bold text-[#d4d4d4]">{caseData.lawyer?.name || "another counsel"}</span>.
            Under advocate-client privilege isolation, other counsel may not review or download these records.
          </p>
          <Link
            href="/lawyer/dashboard"
            className="inline-flex items-center justify-center px-6 py-2 rounded-lg text-xs font-semibold bg-[#1e1b4b] text-[#c7d2fe] border border-[#3730a3] hover:bg-[#312e81] hover:text-white transition-all"
          >
            ← Return to My Docket
          </Link>
        </div>
      </div>
    );
  }

  // Parse structured questionnaire answers
  const parsedSections: Record<string, any> = {};
  for (const item of caseData.answers) {
    const key = item.questionId || item.sectionId || "section";
    try {
      parsedSections[key] = JSON.parse(item.answerData);
    } catch {
      parsedSections[key] = item.answerData;
    }
  }

  const personal = parsedSections["personal"] || {};
  const family = parsedSections["family"] || {};
  const assets = parsedSections["assets"] || {};
  const beneficiaries = parsedSections["beneficiaries"] || {};
  const executors = parsedSections["executors"] || {};

  const flagsList = (caseData.flags || "").split(",").filter(Boolean);

  return (
    <div className="min-h-screen bg-black text-[#e5e5e5] py-8 px-4 sm:px-6 lg:px-8 selection:bg-[#d4a373]/30 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
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
        <div className="aqua-window bg-[#0a0a0a] border border-[#242424] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.85)] overflow-hidden">
          <div className="aqua-titlebar bg-[#121212] border-b border-[#242424] px-5 py-3.5 flex items-center justify-between">
            <div className="aqua-traffic-lights flex items-center gap-2">
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
              <div className="aqua-card bg-[#121212] border border-[#242424] rounded-xl p-6 lg:col-span-2 shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
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
                <div className="aqua-inset-well bg-[#0e0e0e] border border-[#242424] rounded-xl p-4 text-xs space-y-2">
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
                          &ldquo;{rev.notes}&rdquo;
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
  );
}
