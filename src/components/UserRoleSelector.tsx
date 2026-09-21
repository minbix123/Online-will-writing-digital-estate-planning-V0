"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UserRoleSelectorProps {
  userId: string;
  currentRole: string;
  isSelf: boolean;
}

export default function UserRoleSelector({ userId, currentRole, isSelf }: UserRoleSelectorProps) {
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRoleChange = async (newRole: string) => {
    if (newRole === role) return;
    if (isSelf) {
      alert("You cannot modify your own administrator role.");
      return;
    }

    const confirmed = confirm(`Are you sure you want to change this user's role to ${newRole}?`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update role");
        setRole(currentRole);
      } else {
        setRole(newRole);
        router.refresh();
      }
    } catch {
      alert("Network error while updating user role");
      setRole(currentRole);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <select
        value={role}
        disabled={loading || isSelf}
        onChange={(e) => handleRoleChange(e.target.value)}
        className="text-xs py-1 px-2.5 rounded-md border border-[#2e2e2e] bg-[#161616] text-[#e5e5e5] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] disabled:opacity-50 font-medium transition-colors cursor-pointer"
      >
        <option value="CUSTOMER">CUSTOMER</option>
        <option value="LAWYER">LAWYER</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      {loading && <span className="text-[10px] text-[#818cf8] animate-pulse">Saving...</span>}
    </div>
  );
}
