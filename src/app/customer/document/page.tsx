"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

interface DocMetadata {
  id: string;
  status: string;
  fileSize: number | null;
  fileHash: string | null;
  createdAt: string;
  filePath: string | null;
  templateVersionId: string;
}

function DocumentContent() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [loading, setLoading] = useState<boolean>(true);
  const [docMeta, setDocMeta] = useState<DocMetadata | null>(null);
  const [caseStatus, setCaseStatus] = useState<string>("DRAFT");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) return;

    let isMounted = true;
    async function fetchMetadata() {
      try {
        setLoading(true);
        const res = await fetch(`/api/document/metadata?caseId=${caseId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch document metadata");
        }
        const data = await res.json();
        if (isMounted) {
          if (data.exists && data.document) {
            setDocMeta(data.document);
          }
          if (data.caseStatus) {
            setCaseStatus(data.caseStatus);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load document information");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchMetadata();
    return () => {
      isMounted = false;
    };
  }, [caseId]);

  if (!caseId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="rounded-2xl bg-[#0a0a0a] border border-[#222222] p-8 max-w-md w-full text-center shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
          </div>
          <span className="text-xs font-semibold text-[#d4a373] uppercase tracking-wider block mb-2">
            Missing Parameter
          </span>
          <p className="text-[#a3a3a3] font-medium my-4 text-sm">
            Missing Case ID in query parameter. Please return to your cases.
          </p>
          <Link
            href="/customer/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] text-neutral-950 font-semibold px-5 py-2 text-xs shadow-sm transition-all"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const formatBytes = (bytes: number | null) => {
    if (!bytes || bytes === 0) return "Pending calculation";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#d4d4d4] py-12 px-4 selection:bg-[#d4a373]/30 selection:text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="rounded-2xl bg-[#0a0a0a] border border-[#222222] shadow-[0_4px_30px_rgba(0,0,0,0.9)] overflow-hidden">
          {/* Titlebar */}
          <div className="bg-[#111111] border-b border-[#222222] px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
            </div>
            <span className="text-xs font-semibold text-[#d4a373] uppercase tracking-wide font-mono">
              Document Delivery System — Case #{caseId.substring(0, 8)}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          </div>

          <div className="p-8 sm:p-10 space-y-6 bg-[#0a0a0a]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#222222] pb-6">
              <div>
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-[#161616] text-[#d4a373] border border-[#2a2a2a] mb-2">
                  Verified Legal Document
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#e5e5e5] tracking-tight">
                  Your Will is Generated & Ready
                </h1>
              </div>
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
                  Status: {docMeta?.status || (caseStatus === "PAID" ? "GENERATED" : caseStatus)}
                </span>
              </div>
            </div>

            <p className="text-[#a3a3a3] text-sm leading-relaxed">
              Your comprehensive Last Will and Testament has been compiled in accordance with the Indian Succession Act, 1925
              using deterministic legal rules and approved clauses.
            </p>

            {/* Document Metadata Card */}
            <div className="p-6 bg-[#111111] border border-[#222222] rounded-xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#222222] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#d4a373]">
                  Document Specifications & Integrity
                </span>
                <span className="text-xs text-[#737373] font-mono">OpenXML DOCX</span>
              </div>

              {loading ? (
                <div className="py-4 text-center text-xs text-[#737373] animate-pulse">
                  Loading verified document metadata...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#737373] block">File Format:</span>
                    <span className="font-semibold text-[#e5e5e5]">Microsoft Word (.docx)</span>
                  </div>
                  <div>
                    <span className="text-[#737373] block">File Size:</span>
                    <span className="font-semibold text-[#e5e5e5]">
                      {formatBytes(docMeta?.fileSize ?? null)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#737373] block">Generated At:</span>
                    <span className="font-semibold text-[#e5e5e5]">
                      {docMeta?.createdAt ? formatDate(docMeta.createdAt) : "On Demand"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#737373] block">SHA256 Integrity Checksum:</span>
                    <span className="font-mono text-[#d4a373] break-all text-[11px] bg-[#161616] px-2 py-0.5 rounded border border-[#262626]">
                      {docMeta?.fileHash
                        ? `${docMeta.fileHash.substring(0, 16)}...${docMeta.fileHash.substring(48)}`
                        : "Verified upon download"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Download Action Buttons */}
            <div className="space-y-3 pt-2">
              <a
                href={`/api/document/download?caseId=${caseId}`}
                className="inline-flex items-center justify-center w-full text-center py-3.5 text-base font-bold tracking-wide rounded-xl bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] text-neutral-950 shadow-[0_4px_20px_rgba(212,163,115,0.25)] transition-all"
              >
                Download Will (.DOCX)
              </a>
            </div>

            {/* Signing Instructions */}
            <div className="mt-8 pt-6 border-t border-[#222222]">
              <h2 className="text-base font-bold text-[#e5e5e5] mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)] inline-block" />
                Statutory Execution Instructions (Indian Succession Act, 1925)
              </h2>
              <div className="bg-[#121212] border border-[#222222] rounded-xl p-5 text-xs text-[#d4d4d4] space-y-2.5 leading-relaxed">
                <p className="font-semibold text-[#e5e5e5]">
                  To ensure full legal enforceability under Indian law:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[#a3a3a3] pl-1">
                  <li><strong className="text-[#e5e5e5]">Print the Will:</strong> Print the complete document on clean legal or standard bond paper.</li>
                  <li><strong className="text-[#e5e5e5]">Careful Review:</strong> Read all clauses, beneficiary allocations, and executor appointments.</li>
                  <li><strong className="text-[#e5e5e5]">Two Attesting Witnesses:</strong> Execute the document in the continuous physical presence of at least two adult witnesses (Section 63).</li>
                  <li><strong className="text-[#e5e5e5]">Beneficiary Disqualification:</strong> Neither of the two witnesses should be a beneficiary or spouse of a beneficiary under the Will.</li>
                  <li><strong className="text-[#e5e5e5]">Safe Custody:</strong> Store the original signed instrument in a fire-proof locker and inform your named executor of its location.</li>
                </ol>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-[#222222]">
              <Link href="/customer/dashboard" className="text-xs text-[#d4a373] hover:underline font-semibold transition-colors">
                ← Return to Customer Dashboard
              </Link>
              <span className="text-[11px] text-[#737373]">Deterministic Legal Engine v1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center p-8">
          <div className="rounded-2xl bg-[#0a0a0a] border border-[#222222] p-8 text-center text-xs text-[#a3a3a3] font-medium shadow-xl">
            Loading document details...
          </div>
        </div>
      }
    >
      <DocumentContent />
    </Suspense>
  );
}
