import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import TemplateStatusManager from "@/components/TemplateStatusManager";

export default async function AdminTemplatesPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!session || user?.role !== "ADMIN") {
    redirect("/login");
  }

  const [templates, clauses] = await Promise.all([
    prisma.template.findMany({
      include: {
        versions: { orderBy: { version: "desc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.clause.findMany({
      include: {
        versions: { orderBy: { version: "desc" } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242424] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#e5e5e5] tracking-tight">
            Legal Template & Clause Lifecycle Governance
          </h1>
          <p className="text-xs text-[#8a8a8a] mt-0.5">
            Control legal clause states according to statutory requirements. Only templates and clauses in{" "}
            <span className="font-semibold text-[#10b981]">LAWYER_APPROVED</span> or{" "}
            <span className="font-semibold text-[#818cf8]">LOCKED</span> state may be compiled into customer documents.
          </p>
        </div>
        <button
          type="button"
          className="aqua-btn-primary inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1e1b4b] text-[#c7d2fe] border border-[#3730a3] hover:bg-[#312e81] whitespace-nowrap self-start sm:self-auto transition-all"
        >
          + New Clause Definition
        </button>
      </div>

      {/* Templates Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#e5e5e5]">Document Templates</h2>
            <p className="text-xs text-[#8a8a8a]">Core master document skeletons.</p>
          </div>
          <span className="aqua-badge px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#141414] text-[#a3a3a3] border border-[#262626]">
            {templates.length} Templates
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#242424] bg-[#0c0c0c]">
          <table className="min-w-full divide-y divide-[#1f1f1f] text-left text-sm bg-[#0c0c0c]">
            <thead className="bg-[#141414] text-xs font-semibold uppercase text-[#8a8a8a] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Template Name</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Versions</th>
                <th className="px-5 py-3.5">Last Updated</th>
                <th className="px-5 py-3.5 text-right">Lifecycle Transition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181818] font-normal">
              {templates.map((t) => {
                const latestVersion = t.versions[0];
                return (
                  <tr key={t.id} className="hover:bg-[#141414] transition-colors duration-150">
                    <td className="px-5 py-4">
                      <div className="font-medium text-[#e5e5e5]">{t.name}</div>
                      <div className="text-xs text-[#737373] max-w-md">{t.description}</div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                          t.status === "LAWYER_APPROVED"
                            ? "bg-[#064e3b]/40 text-[#6ee7b7] border-[#047857]/50"
                            : t.status === "LOCKED"
                            ? "bg-[#1e1b4b]/40 text-[#c7d2fe] border-[#3730a3]/50"
                            : t.status === "ARCHIVED"
                            ? "bg-[#450a0a]/40 text-[#fca5a5] border-[#7f1d1d]/50"
                            : "bg-[#78350f]/40 text-[#fcd34d] border-[#b45309]/50"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs">
                      <span className="font-medium text-[#e5e5e5]">
                        v{latestVersion ? latestVersion.version : "1.0"}
                      </span>
                      <span className="text-[#737373] ml-1">({t.versions.length} versions)</span>
                    </td>

                    <td className="px-5 py-4 text-xs font-mono text-[#737373] whitespace-nowrap">
                      {new Date(t.updatedAt).toISOString().replace("T", " ").substring(0, 16)} UTC
                    </td>

                    <td className="px-5 py-4 text-right">
                      <TemplateStatusManager
                        targetId={t.id}
                        targetType="template"
                        currentStatus={t.status}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clauses Section */}
      <div className="space-y-4 pt-4 border-t border-[#242424]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#e5e5e5]">Statutory Legal Clauses</h2>
            <p className="text-xs text-[#8a8a8a]">
              Modular legal clauses merged conditionally by the deterministic legal workflow engine.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#141414] text-[#a3a3a3] border border-[#262626]">
            {clauses.length} Clauses
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#242424] bg-[#0c0c0c]">
          <table className="min-w-full divide-y divide-[#1f1f1f] text-left text-sm bg-[#0c0c0c]">
            <thead className="bg-[#141414] text-xs font-semibold uppercase text-[#8a8a8a] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Clause Name & Description</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Versions</th>
                <th className="px-5 py-3.5">Last Updated</th>
                <th className="px-5 py-3.5 text-right">Lifecycle Transition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181818] font-normal">
              {clauses.map((c) => {
                const latestVersion = c.versions[0];
                return (
                  <tr key={c.id} className="hover:bg-[#141414] transition-colors duration-150">
                    <td className="px-5 py-4">
                      <span className="font-medium text-[#e5e5e5]">{c.name}</span>
                      {c.description && (
                        <p className="text-xs text-[#737373] mt-0.5">{c.description}</p>
                      )}
                      {latestVersion && (
                        <p className="text-xs text-[#8a8a8a] mt-1 line-clamp-2 max-w-lg font-serif italic">
                          "{latestVersion.content.substring(0, 120)}..."
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                          c.status === "LAWYER_APPROVED"
                            ? "bg-[#064e3b]/40 text-[#6ee7b7] border-[#047857]/50"
                            : c.status === "LOCKED"
                            ? "bg-[#1e1b4b]/40 text-[#c7d2fe] border-[#3730a3]/50"
                            : c.status === "ARCHIVED"
                            ? "bg-[#450a0a]/40 text-[#fca5a5] border-[#7f1d1d]/50"
                            : "bg-[#78350f]/40 text-[#fcd34d] border-[#b45309]/50"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs">
                      <span className="font-medium text-[#e5e5e5]">
                        v{latestVersion ? latestVersion.version : "1.0"}
                      </span>
                      <span className="text-[#737373] ml-1">({c.versions.length} versions)</span>
                    </td>

                    <td className="px-5 py-4 text-xs font-mono text-[#737373] whitespace-nowrap">
                      {new Date(c.updatedAt).toISOString().replace("T", " ").substring(0, 16)} UTC
                    </td>

                    <td className="px-5 py-4 text-right">
                      <TemplateStatusManager
                        targetId={c.id}
                        targetType="clause"
                        currentStatus={c.status}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
