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
