import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!session || !user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    if (user.role === "LAWYER") {
      redirect("/lawyer/dashboard");
    } else {
      redirect("/customer/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-black bg-aqua-pinstripes text-[#e5e5e5] py-6 px-4 sm:px-6 lg:px-8 selection:bg-[#d4a373]/30 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Unified OLED Dark Window Container */}
        <div className="aqua-window bg-[#0a0a0a] border border-[#242424] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.85)] overflow-hidden">
          {/* Window Titlebar */}
          <div className="aqua-titlebar bg-[#121212] border-b border-[#242424] px-5 py-3.5 flex items-center justify-between">
            <div className="aqua-traffic-lights flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
            </div>
            <div className="text-xs font-semibold text-[#a3a3a3] tracking-wider uppercase font-mono">
              Estate Planning OS — Central Administrator Terminal
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] bg-[#450a0a]/50 text-[#fca5a5] border border-[#7f1d1d]/60 font-bold uppercase tracking-wide">
                Admin: {user.name || user.email}
              </span>
            </div>
          </div>

          {/* Navigation Toolbar */}
          <div className="bg-[#101010] border-b border-[#242424] px-4 py-2.5 flex flex-wrap gap-2 text-xs font-medium">
            <Link
              href="/admin/dashboard"
              className="aqua-btn-silver inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#d4d4d4] bg-[#161616] border border-[#282828] hover:bg-[#202020] hover:text-[#ffffff] hover:border-[#383838] transition-all duration-150"
            >
              📊 System Dashboard
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#d4d4d4] bg-[#161616] border border-[#282828] hover:bg-[#202020] hover:text-[#ffffff] hover:border-[#383838] transition-all duration-150"
            >
              👥 User Management
            </Link>
            <Link
              href="/admin/cases"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#d4d4d4] bg-[#161616] border border-[#282828] hover:bg-[#202020] hover:text-[#ffffff] hover:border-[#383838] transition-all duration-150"
            >
              📁 Master Cases Docket
            </Link>
            <Link
              href="/admin/templates"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#d4d4d4] bg-[#161616] border border-[#282828] hover:bg-[#202020] hover:text-[#ffffff] hover:border-[#383838] transition-all duration-150"
            >
              📜 Templates & Clauses
            </Link>
            <Link
              href="/admin/audit-logs"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#d4d4d4] bg-[#161616] border border-[#282828] hover:bg-[#202020] hover:text-[#ffffff] hover:border-[#383838] transition-all duration-150"
            >
              🛡️ Audit Trail Viewer
            </Link>
          </div>

          {/* Subpage Container */}
          <div className="p-6 sm:p-8 bg-[#0a0a0a]">{children}</div>
        </div>
      </div>
    </div>
  );
}
