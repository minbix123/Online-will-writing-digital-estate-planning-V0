"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { PAYMENT_TIERS } from "@/lib/payment";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (plan: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, plan })
      });
      const data = await res.json();
      if (data.success) {
        if (data.status === "PAID") {
          router.push(`/customer/document?caseId=${caseId}`);
        } else {
          router.push(`/customer/dashboard`);
        }
      } else {
        alert("Checkout failed: " + data.error);
      }
    } catch (e) {
      alert("Error processing checkout");
    }
    setLoading(false);
  };

  if (!caseId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="rounded-2xl bg-[#0a0a0a] border border-[#222222] p-6 text-center max-w-md w-full shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
          </div>
          <p className="text-[#e5e5e5] font-medium">Missing Case ID in query parameter.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black bg-aqua-pinstripes text-[#d4d4d4] py-12 px-4 selection:bg-[#d4a373]/30 selection:text-white">
      <div className="max-w-5xl mx-auto">
        {/* Prominent Mock Warning Banner */}
        <div className="mb-6 rounded-xl border border-amber-800/60 bg-[#161208] p-4 shadow-[0_2px_16px_rgba(0,0,0,0.6)] flex items-start gap-3.5">
          <div className="text-2xl select-none">⚠️</div>
          <div>
            <div className="text-sm font-bold text-amber-300 tracking-wide uppercase">
              MOCK PAYMENT GATEWAY / TEST MODE — No real money is charged
            </div>
            <p className="text-xs text-amber-200/70 mt-0.5 leading-relaxed">
              Select a tier below for immediate atomic processing or visit the interactive simulator.
            </p>
          </div>
        </div>

        <div className="aqua-window rounded-2xl bg-[#0a0a0a] border border-[#222222] p-6 sm:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.9)] overflow-hidden">
          <div className="bg-[#111111] border-b border-[#222222] -mt-6 -mx-6 sm:-mt-8 sm:-mx-8 p-4 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
            </div>
            <div className="text-xs font-semibold text-[#d4a373] tracking-wider uppercase font-mono">
              Select Your Plan — Case Ref: {caseId.substring(0, 8)}...
            </div>
            <Link
              href={`/customer/payment?caseId=${caseId}`}
              className="text-xs text-[#d4a373] hover:underline font-semibold"
            >
              Open Interactive Gateway →
            </Link>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-center text-[#e5e5e5] mb-8">Select Your Plan</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Basic */}
            <div className="aqua-card rounded-xl bg-[#101010] border border-[#222222] p-6 flex flex-col justify-between hover:border-[#333333] transition-all">
              <div>
                <h2 className="text-xl font-bold text-[#e5e5e5] mb-2">Basic</h2>
                <p className="text-[#a3a3a3] text-sm mb-4 min-h-[40px]">
                  Guided questionnaire, Document preparation, DOCX, Signing instructions. No lawyer review.
                </p>
                <p className="text-2xl font-extrabold text-[#e5e5e5] mb-6">₹1,499</p>
              </div>
              <button 
                disabled={loading}
                onClick={() => handleCheckout("BASIC")}
                className="inline-flex items-center justify-center rounded-lg bg-[#161616] hover:bg-[#202020] text-[#e5e5e5] border border-[#2a2a2a] hover:border-[#383838] w-full py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
              >
                {loading ? "Processing..." : "Select Basic (Mock Pay)"}
              </button>
            </div>

            {/* Lawyer Review */}
            <div className="rounded-xl bg-[#141414] border-2 border-[#d4a373] p-6 flex flex-col justify-between relative shadow-[0_0_24px_rgba(212,163,115,0.18)]">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#d4a373] text-neutral-950 shadow-md">
                ★ RECOMMENDED
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#e5e5e5] mb-2">Lawyer Review</h2>
                <p className="text-[#a3a3a3] text-sm mb-4 min-h-[40px]">
                  Everything in Basic, plus Human advocate review, Clarification requests, Final approval.
                </p>
                <p className="text-2xl font-extrabold text-[#e5e5e5] mb-6">₹3,999</p>
              </div>
              <button 
                disabled={loading}
                onClick={() => handleCheckout("LAWYER_REVIEW")}
                className="inline-flex items-center justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] text-neutral-950 font-bold w-full py-2.5 text-sm shadow-[0_2px_12px_rgba(212,163,115,0.2)] transition-all disabled:opacity-50"
              >
                {loading ? "Processing..." : "Select Review (Mock Pay)"}
              </button>
            </div>

            {/* Complex / NRI */}
            <div className="rounded-xl bg-[#101010] border border-[#222222] p-6 flex flex-col justify-between hover:border-[#333333] transition-all">
              <div>
                <h2 className="text-xl font-bold text-[#e5e5e5] mb-2">Complex / NRI</h2>
                <p className="text-[#a3a3a3] text-sm mb-4 min-h-[40px]">
                  For foreign assets, multiple properties, business interests, or unusual circumstances.
                </p>
                <p className="text-2xl font-extrabold text-[#e5e5e5] mb-6">₹7,999</p>
              </div>
              <button 
                disabled={loading}
                onClick={() => handleCheckout("COMPLEX_NRI")}
                className="inline-flex items-center justify-center rounded-lg bg-[#161616] hover:bg-[#202020] text-[#e5e5e5] border border-[#2a2a2a] hover:border-[#383838] w-full py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
              >
                {loading ? "Processing..." : "Select Complex (Mock Pay)"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="text-gray-500 font-medium">Loading checkout options...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
