import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-aqua-pinstripes text-[#e5e5e5] flex flex-col items-center justify-between px-4 sm:px-8 lg:px-12 py-6 sm:py-10">
      {/* Top Navigation Capsule Bar */}
      <header className="w-full max-w-5xl mb-8 sm:mb-14">
        <div className="aqua-window flex items-center justify-between px-4 sm:px-6 py-3 border border-[#262626] bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            {/* Window Traffic Lights */}
            <div className="aqua-traffic-lights hidden sm:flex">
              <span className="aqua-dot aqua-dot-red" title="Close" />
              <span className="aqua-dot aqua-dot-yellow" title="Minimize" />
              <span className="aqua-dot aqua-dot-green" title="Zoom" />
            </div>
            <span className="aqua-badge aqua-badge-blue text-xs font-semibold tracking-wide">
              Trustworthy • Advocate-Approved • Indian Succession Act
            </span>
          </div>

          <nav className="flex items-center gap-3">
            <Link
              href="/register"
              className="aqua-btn aqua-btn-primary px-5 py-1.5 text-xs sm:text-sm font-semibold shadow-sm"
            >
              Register
            </Link>
            <Link
              href="/login"
              className="aqua-btn aqua-btn-secondary px-5 py-1.5 text-xs sm:text-sm font-semibold shadow-sm"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section Card */}
      <section className="w-full max-w-4xl text-center py-10 sm:py-16 px-4">
        <div className="aqua-card p-8 sm:p-14 shadow-2xl border border-[#262626] bg-[#0a0a0a]">
          <div className="flex justify-center mb-6">
            <span className="aqua-badge text-xs uppercase tracking-widest text-[#d4a373] font-bold px-4 py-1 border border-[#383838]">
              Indian Online Estate Planning
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#e5e5e5] mb-6 leading-tight">
            Make your wishes clear before your family has to guess.
          </h1>

          <p className="mt-6 text-lg sm:text-xl leading-relaxed text-[#a3a3a3] max-w-2xl mx-auto font-normal">
            Create a structured will through a guided questionnaire, using lawyer-approved document workflows with optional lawyer review. Automation handles the paperwork. Lawyers handle the law.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <Link
              href="/login"
              className="aqua-btn aqua-btn-primary px-8 py-3.5 text-base sm:text-lg font-semibold w-full sm:w-auto text-center shadow-[0_2px_12px_rgba(99,102,241,0.25)]"
            >
              Start Your Will
            </Link>
            <a
              href="#how-it-works"
              className="aqua-btn aqua-btn-secondary px-6 py-3.5 text-sm sm:text-base font-semibold w-full sm:w-auto text-center"
            >
              How It Works <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="w-full max-w-5xl py-12 sm:py-20">
        <div className="text-center mb-10 sm:mb-14">
          <span className="aqua-badge aqua-badge-blue mb-3">Workflow</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#e5e5e5] tracking-tight">
            How It Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="aqua-window flex flex-col justify-between border border-[#262626] bg-[#0a0a0a]">
            <div className="aqua-titlebar">
              <div className="aqua-traffic-lights">
                <span className="aqua-dot aqua-dot-red" />
                <span className="aqua-dot aqua-dot-yellow" />
                <span className="aqua-dot aqua-dot-green" />
              </div>
              <span className="text-[11px] font-bold text-[#a3a3a3] tracking-wide uppercase">Step 01</span>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-start">
              <h3 className="text-lg font-bold text-[#e5e5e5] mb-2">01 — Answer questions</h3>
              <p className="text-sm text-[#a3a3a3] leading-relaxed">
                Tell us about yourself, your family and your assets through our guided questionnaire.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="aqua-window flex flex-col justify-between border border-[#262626] bg-[#0a0a0a]">
            <div className="aqua-titlebar">
              <div className="aqua-traffic-lights">
                <span className="aqua-dot aqua-dot-red" />
                <span className="aqua-dot aqua-dot-yellow" />
                <span className="aqua-dot aqua-dot-green" />
              </div>
              <span className="text-[11px] font-bold text-[#a3a3a3] tracking-wide uppercase">Step 02</span>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-start">
              <h3 className="text-lg font-bold text-[#e5e5e5] mb-2">02 — Information is structured</h3>
              <p className="text-sm text-[#a3a3a3] leading-relaxed">
                The application determines which configured document workflow applies securely.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="aqua-window flex flex-col justify-between border border-[#262626] bg-[#0a0a0a]">
            <div className="aqua-titlebar">
              <div className="aqua-traffic-lights">
                <span className="aqua-dot aqua-dot-red" />
                <span className="aqua-dot aqua-dot-yellow" />
                <span className="aqua-dot aqua-dot-green" />
              </div>
              <span className="text-[11px] font-bold text-[#a3a3a3] tracking-wide uppercase">Step 03</span>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-start">
              <h3 className="text-lg font-bold text-[#e5e5e5] mb-2">03 — Generate your document</h3>
              <p className="text-sm text-[#a3a3a3] leading-relaxed">
                Your answers populate an approved template without relying on AI hallucination.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="aqua-window flex flex-col justify-between border border-[#262626] bg-[#0a0a0a]">
            <div className="aqua-titlebar">
              <div className="aqua-traffic-lights">
                <span className="aqua-dot aqua-dot-red" />
                <span className="aqua-dot aqua-dot-yellow" />
                <span className="aqua-dot aqua-dot-green" />
              </div>
              <span className="text-[11px] font-bold text-[#a3a3a3] tracking-wide uppercase">Step 04</span>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-start">
              <h3 className="text-lg font-bold text-[#e5e5e5] mb-2">04 — Complete the process</h3>
              <p className="text-sm text-[#a3a3a3] leading-relaxed">
                Download, print and complete the applicable signing process. Optional lawyer review available.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-5xl text-center py-6 text-xs text-[#737373] border-t border-[#1f1f1f] mt-12">
        <p>Online Will-Writing & Digital Estate Planning Platform • Indian Jurisdiction • Strictly Lawyer-Approved</p>
      </footer>
    </main>
  );
}
