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
