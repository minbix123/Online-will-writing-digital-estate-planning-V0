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
