import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import UserRoleSelector from "@/components/UserRoleSelector";

interface AdminUsersPageProps {
  searchParams: Promise<{ role?: string }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any;

  if (!session || currentUser?.role !== "ADMIN") {
    redirect("/login");
  }

  const { role: filterRole } = await searchParams;

  const whereClause: any = {};
  if (filterRole && ["CUSTOMER", "LAWYER", "ADMIN"].includes(filterRole.toUpperCase())) {
    whereClause.role = filterRole.toUpperCase();
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          cases: true,
          assignedCases: true,
          lawyerReviews: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header & Role Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242424] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#e5e5e5] tracking-tight">
            User Directory & Access Administration
          </h1>
          <p className="text-xs text-[#8a8a8a] mt-0.5">
            Manage authenticated accounts, view case workloads, and provision role privileges.
          </p>
        </div>

        {/* Filter Badges / Buttons */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[#737373] font-medium mr-1">Filter:</span>
          {[
            { label: `All (${users.length})`, val: undefined },
            { label: "Customers", val: "CUSTOMER" },
            { label: "Lawyers", val: "LAWYER" },
            { label: "Admins", val: "ADMIN" },
          ].map((tab) => {
            const isActive = (!filterRole && !tab.val) || filterRole === tab.val;
            return (
              <Link
                key={tab.label}
                href={tab.val ? `/admin/users?role=${tab.val}` : "/admin/users"}
                className={`px-3 py-1 rounded-full font-semibold border transition-colors ${
                  isActive
                    ? "bg-[#1e1b4b] text-[#c7d2fe] border-[#3730a3]"
                    : "bg-[#141414] text-[#a3a3a3] border-[#262626] hover:bg-[#1c1c1c] hover:text-[#e5e5e5]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-xl border border-[#242424] bg-[#0c0c0c]">
        <table className="min-w-full divide-y divide-[#1f1f1f] text-left text-sm bg-[#0c0c0c]">
          <thead className="bg-[#141414] text-xs font-semibold uppercase text-[#8a8a8a] tracking-wider">
            <tr>
              <th className="px-5 py-3.5">User</th>
              <th className="px-5 py-3.5">Assigned Role</th>
              <th className="px-5 py-3.5">Workload / Cases</th>
              <th className="px-5 py-3.5">Registration Date (UTC)</th>
              <th className="px-5 py-3.5 text-right">Role Mutation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#181818] font-normal">
            {users.map((u) => {
              const isSelf = u.id === currentUser.id;
              const caseCount = u.role === "LAWYER" ? u._count.assignedCases : u._count.cases;

              return (
                <tr key={u.id} className="hover:bg-[#141414] transition-colors duration-150">
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#e5e5e5] flex items-center gap-2">
                      {u.name || "Anonymous"}
                      {isSelf && (
                        <span className="text-[10px] bg-[#450a0a]/50 text-[#fca5a5] border border-[#7f1d1d]/60 px-1.5 py-0.5 rounded font-bold">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#737373] font-mono">{u.email}</div>
                    <div className="text-[10px] text-[#555555] font-mono">ID: {u.id.slice(-8)}</div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`aqua-badge px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase border ${
                        u.role === "ADMIN"
                          ? "bg-[#450a0a]/40 text-[#fca5a5] border-[#7f1d1d]/50"
                          : u.role === "LAWYER"
                          ? "bg-[#3b0764]/40 text-[#e9d5ff] border-[#6b21a8]/50"
                          : "bg-[#1e1b4b]/40 text-[#c7d2fe] border-[#3730a3]/50"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-xs">
                    {u.role === "LAWYER" ? (
                      <div>
                        <span className="font-medium text-[#e5e5e5]">{caseCount} cases</span>{" "}
                        <span className="text-[#8a8a8a]">assigned</span>
                        <div className="text-[10px] text-[#737373]">
                          {u._count.lawyerReviews} reviews conducted
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="font-medium text-[#e5e5e5]">{caseCount} cases</span>{" "}
                        <span className="text-[#8a8a8a]">authored</span>
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-4 text-xs font-mono text-[#737373] whitespace-nowrap">
                    {new Date(u.createdAt).toISOString().replace("T", " ").substring(0, 16)} UTC
                  </td>

                  <td className="px-5 py-4 text-right">
                    <UserRoleSelector userId={u.id} currentRole={u.role} isSelf={isSelf} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
