"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { PAYMENT_TIERS, PaymentTier } from "@/lib/payment";

function PaymentContent() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");
  const router = useRouter();

  const [selectedTier, setSelectedTier] = useState<"BASIC" | "LAWYER_REVIEW" | "COMPLEX_NRI">("LAWYER_REVIEW");
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"SELECT" | "CONFIRMING" | "SUCCESS" | "FAILED">("SELECT");
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationDetails, setConfirmationDetails] = useState<any>(null);

  if (!caseId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="rounded-2xl bg-[#0a0a0a] border border-[#222222] max-w-md w-full p-6 text-center shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
          </div>
          <h2 className="text-xl font-bold text-[#e5e5e5] mb-2">Missing Case Reference</h2>
          <p className="text-[#a3a3a3] text-sm mb-6">
            Missing Case ID in query parameter. Please select a case from your customer dashboard.
          </p>
          <Link
            href="/customer/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] text-neutral-950 font-semibold px-6 py-2 text-sm shadow-sm transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentPlan = PAYMENT_TIERS[selectedTier];

  const handleSimulatePayment = async (status: "SUCCESS" | "FAILURE") => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // Step 1: Initiate payment record via /api/payment/create
      const createRes = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, tier: selectedTier }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || "Failed to initiate payment");
      }

      const paymentId = createData.paymentId;
      setActivePaymentId(paymentId);
      setPaymentStep("CONFIRMING");

      // Step 2: Atomic confirmation via /api/payment/confirm
      const confirmRes = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, status }),
      });

      const confirmData = await confirmRes.json();

      if (status === "SUCCESS" && confirmData.success) {
        setPaymentStep("SUCCESS");
        setConfirmationDetails(confirmData);
      } else {
        setPaymentStep("FAILED");
        setErrorMessage(
          status === "FAILURE"
            ? "Payment declined as requested by simulation."
            : confirmData.error || "Transaction confirmation failed."
        );
      }
    } catch (err: any) {
      setPaymentStep("FAILED");
      setErrorMessage(err.message || "Network error while processing mock payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black bg-aqua-pinstripes text-[#d4d4d4] py-8 px-4 sm:px-6 lg:px-8 selection:bg-[#d4a373]/30 selection:text-white">
      <div className="max-w-5xl mx-auto">
        {/* Prominent Mock Warning Banner */}
        <div className="mb-6 rounded-xl border border-amber-800/60 bg-[#161208] p-4 shadow-[0_2px_16px_rgba(0,0,0,0.6)] flex items-start gap-3.5">
          <div className="text-2xl select-none">⚠️</div>
          <div>
            <div className="text-sm font-bold text-amber-300 tracking-wide uppercase">
              Mock Payment Gateway — Test Mode (No Real Money Charged)
            </div>
            <p className="text-xs text-amber-200/70 mt-0.5 leading-relaxed">
              This application is in demonstration mode. No real credit card or UPI charges will occur. Use the simulation buttons below to test success and failure transaction states.
            </p>
          </div>
        </div>

        {/* Main Window Container */}
        <div className="aqua-window rounded-2xl bg-[#0a0a0a] border border-[#222222] shadow-[0_4px_30px_rgba(0,0,0,0.9)] overflow-hidden">
          {/* Titlebar */}
          <div className="aqua-titlebar bg-[#111111] border-b border-[#222222] px-6 py-3.5 flex items-center justify-between text-xs text-[#a3a3a3]">
            <div className="aqua-traffic-lights flex items-center gap-2">
              <span className="aqua-dot aqua-dot-red w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
              <span className="aqua-dot aqua-dot-yellow w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
              <span className="aqua-dot aqua-dot-green w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
            </div>
            <div className="font-semibold text-[#d4a373] tracking-wider uppercase font-mono">
              Will Preparation Checkout — Case Ref: {caseId.substring(0, 10)}...
            </div>
            <div className="font-mono text-[#737373]">Safe Sandbox v1.0</div>
          </div>

          <div className="p-6 sm:p-8">
            {paymentStep === "SELECT" && (
              <>
                <div className="text-center max-w-2xl mx-auto mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#e5e5e5] tracking-tight">
                    Select Your Estate Planning Tier
                  </h1>
                  <p className="mt-2 text-sm text-[#a3a3a3]">
                    Choose the legal tier that suits your estate complexity. All tiers include formal drafting compliant with the Indian Succession Act, 1925.
                  </p>
                </div>

                {/* Plan Tier Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {Object.values(PAYMENT_TIERS).map((tier: PaymentTier) => {
                    const isSelected = selectedTier === tier.id;
                    return (
                      <div
                        key={tier.id}
                        onClick={() => setSelectedTier(tier.id)}
                        className={`cursor-pointer p-6 rounded-xl flex flex-col justify-between relative transition-all duration-200 ${
                          isSelected
                            ? "bg-[#141414] border-2 border-[#d4a373] shadow-[0_0_24px_rgba(212,163,115,0.18)] scale-[1.02]"
                            : "bg-[#101010] hover:bg-[#161616] border border-[#222222] hover:border-[#333333]"
                        }`}
                      >
                        {tier.recommended && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#d4a373] text-neutral-950 shadow-md">
                            ★ Recommended
                          </span>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-[#e5e5e5]">{tier.name}</h3>
                            <input
                              type="radio"
                              name="tier"
                              checked={isSelected}
                              onChange={() => setSelectedTier(tier.id)}
                              className="w-4 h-4 text-[#d4a373] accent-[#d4a373] focus:ring-[#d4a373]"
                            />
                          </div>
                          <p className="text-xs text-[#a3a3a3] mb-4 min-h-[36px]">{tier.description}</p>
                          <div className="mb-4">
                            <span className="text-3xl font-extrabold text-[#e5e5e5]">₹{tier.price.toLocaleString("en-IN")}</span>
                            <span className="text-xs text-[#737373] ml-1">one-time INR</span>
                          </div>

                          <div className="border-t border-[#222222] pt-4 space-y-2">
                            {tier.features.map((feat, idx) => (
                              <div key={idx} className="flex items-start text-xs text-[#d4d4d4] gap-2">
                                <span className="text-[#d4a373] font-bold">✓</span>
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-[#222222]">
                          <div
                            className={`w-full text-center py-2.5 rounded-lg text-xs font-bold transition-all ${
                              isSelected
                                ? "bg-[#d4a373] text-neutral-950 shadow-sm"
                                : "bg-[#181818] text-[#a3a3a3] hover:text-[#e5e5e5] border border-[#262626]"
                            }`}
                          >
                            {isSelected ? "Selected Plan" : "Choose Plan"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Order Summary & Simulation Controls */}
                <div className="rounded-xl bg-[#121212] border border-[#222222] p-6 max-w-2xl mx-auto shadow-sm">
                  <h4 className="text-sm font-bold text-[#e5e5e5] uppercase tracking-wide mb-4">
                    Order Summary & Mock Checkout
                  </h4>

                  <div className="space-y-2 text-sm text-[#a3a3a3] border-b border-[#222222] pb-4 mb-4">
                    <div className="flex justify-between">
                      <span>Selected Plan:</span>
                      <span className="font-semibold text-[#e5e5e5]">{currentPlan.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Case Reference:</span>
                      <span className="font-mono text-xs text-[#737373]">{caseId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (18% Mock Sandbox Waived):</span>
                      <span className="text-emerald-400 font-medium">₹0 (Waived for MVP)</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-[#e5e5e5] pt-2 border-t border-[#262626]">
                      <span>Total Payable:</span>
                      <span>₹{currentPlan.price.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Dual Simulation Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSimulatePayment("SUCCESS")}
                      className="inline-flex items-center justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] py-3 px-4 text-sm font-bold text-neutral-950 shadow-[0_2px_12px_rgba(212,163,115,0.2)] disabled:opacity-50 transition-all"
                    >
                      {loading ? "Processing..." : "✓ Simulate Payment Success"}
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSimulatePayment("FAILURE")}
                      className="inline-flex items-center justify-center rounded-lg bg-[#1a1111] hover:bg-[#251515] border border-rose-800/60 py-3 px-4 text-sm font-bold text-rose-300 disabled:opacity-50 transition-all"
                    >
                      {loading ? "Processing..." : "✗ Simulate Payment Failure"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Processing State */}
            {paymentStep === "CONFIRMING" && (
              <div className="py-16 text-center">
                <div className="w-12 h-12 border-4 border-[#d4a373] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#e5e5e5]">Processing Mock Transaction...</h3>
                <p className="text-sm text-[#a3a3a3] mt-1">
                  Executing atomic database transaction and evaluating workflow classification.
                </p>
              </div>
            )}

            {/* Success State */}
            {paymentStep === "SUCCESS" && (
              <div className="py-12 px-4 max-w-lg mx-auto text-center">
                <div className="w-16 h-16 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-inner">
                  ✓
                </div>
                <h2 className="text-2xl font-bold text-[#e5e5e5] mb-2">Payment Simulated Successfully!</h2>
                <p className="text-sm text-[#a3a3a3] mb-6">
                  Your mock payment of ₹{currentPlan.price.toLocaleString("en-IN")} has been recorded in the database audit log.
                </p>

                <div className="rounded-xl bg-[#121212] border border-[#222222] p-4 text-left text-xs space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-[#737373]">Transaction ID:</span>
                    <span className="font-mono font-semibold text-[#e5e5e5]">{confirmationDetails?.transactionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#737373]">Case Status:</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
                      {confirmationDetails?.caseStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#737373]">Review Required:</span>
                    <span className="font-semibold text-[#e5e5e5]">
                      {confirmationDetails?.requiresReview ? "Yes (Advocate Review)" : "No (Auto-approved)"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => router.push(`/customer/dashboard`)}
                    className="inline-flex items-center justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] text-neutral-950 font-semibold px-6 py-2.5 text-sm shadow-sm transition-all"
                  >
                    Go to Customer Dashboard
                  </button>
                  {confirmationDetails?.caseStatus === "PAID" && (
                    <button
                      onClick={() => router.push(`/customer/document?caseId=${caseId}`)}
                      className="inline-flex items-center justify-center rounded-lg bg-[#161616] hover:bg-[#202020] text-[#e5e5e5] border border-[#2a2a2a] hover:border-[#383838] px-6 py-2.5 text-sm font-semibold transition-all"
                    >
                      View Draft Document
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Failure State */}
            {paymentStep === "FAILED" && (
              <div className="py-12 px-4 max-w-lg mx-auto text-center">
                <div className="w-16 h-16 bg-rose-950/60 border border-rose-800/60 text-rose-300 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-inner">
                  ✕
                </div>
                <h2 className="text-2xl font-bold text-[#e5e5e5] mb-2">Payment Simulation Declined</h2>
                <p className="text-sm text-[#a3a3a3] mb-6">
                  {errorMessage || "The transaction was simulated as a failure or encountered an error."}
                </p>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setPaymentStep("SELECT")}
                    className="inline-flex items-center justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] text-neutral-950 font-semibold px-6 py-2.5 text-sm shadow-sm transition-all"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => router.push("/customer/dashboard")}
                    className="inline-flex items-center justify-center rounded-lg bg-[#161616] hover:bg-[#202020] text-[#e5e5e5] border border-[#2a2a2a] hover:border-[#383838] px-6 py-2.5 text-sm font-semibold transition-all"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center p-8">
          <div className="rounded-2xl bg-[#0a0a0a] border border-[#222222] p-8 text-center">
            <div className="text-[#a3a3a3] font-medium">Loading checkout options...</div>
          </div>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
