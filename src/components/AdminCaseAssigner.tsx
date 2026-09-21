"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LawyerOption {
  id: string;
  name: string | null;
  email: string | null;
}

interface AdminCaseAssignerProps {
  caseId: string;
  currentLawyerId: string | null;
  lawyers: LawyerOption[];
}

export default function AdminCaseAssigner({
  caseId,
  currentLawyerId,
  lawyers,
}: AdminCaseAssignerProps) {
  const [selectedLawyerId, setSelectedLawyerId] = useState(currentLawyerId || "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAssign = async (newLawyerId: string) => {
    const targetId = newLawyerId === "" ? null : newLawyerId;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/cases/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          lawyerId: targetId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update case assignment");
        setSelectedLawyerId(currentLawyerId || "");
      } else {
        setSelectedLawyerId(newLawyerId);
        router.refresh();
      }
    } catch {
      alert("Network error while assigning lawyer");
      setSelectedLawyerId(currentLawyerId || "");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={selectedLawyerId}
        disabled={loading}
        onChange={(e) => handleAssign(e.target.value)}
        className="text-xs py-1 px-2 rounded-md border border-[#2e2e2e] bg-[#161616] text-[#e5e5e5] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] font-medium transition-colors cursor-pointer"
      >
        <option value="">— Unassigned —</option>
        {lawyers.map((l) => (
          <option key={l.id} value={l.id}>
            Adv. {l.name || l.email}
          </option>
        ))}
      </select>
      {loading && <span className="text-[10px] text-[#818cf8] animate-pulse">Assigning...</span>}
    </div>
  );
}
