import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-black border-t border-[#1f1f1f] py-8 px-4 sm:px-6 lg:px-8 mt-auto text-xs text-[#737373]">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Col 1: Platform Info */}
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#e5e5e5] tracking-tight">NyayaWill</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#141414] text-[#a3a3a3] border border-[#262626]">
                OLED Dark Edition
              </span>
            </div>
            <p className="text-xs text-[#a3a3a3] leading-relaxed max-w-md">
              Secure online will-writing and digital estate planning platform for users in India.
              Strictly deterministic document generation using advocate-approved templates under the Indian Succession Act, 1925.
            </p>
          </div>

          {/* Col 2: Legal Framework */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
              Legal Framework
            </div>
            <ul className="space-y-1 text-xs">
              <li className="text-[#a3a3a3]">Indian Succession Act, 1925</li>
              <li className="text-[#a3a3a3]">Statutory Attestation (§63)</li>
              <li className="text-[#a3a3a3]">Advocate Review Protocol</li>
              <li className="text-[#a3a3a3]">Zero AI Hallucination</li>
            </ul>
          </div>

          {/* Col 3: System Status & Security */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
              Platform Integrity
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Deterministic Rules Engine Active</span>
              </div>
              <div className="text-[#a3a3a3]">
                Tamper-Resistant UTC Audit Trail
              </div>
              <div className="text-[#a3a3a3]">
                Server-Side RBAC & Encryption
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-4 border-t border-[#1f1f1f] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#737373]">
          <div>
            © {new Date().getFullYear()} NyayaWill Platform. Strictly confidential & privileged document processing.
          </div>
          <div className="flex items-center gap-4">
            <span>Power-Efficient OLED Theme</span>
            <span>•</span>
            <span>Indian Jurisdiction</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
