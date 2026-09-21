import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DocumentGenerator } from "@/server/document-generator";
import { LegalWorkflowEngine } from "@/server/legal-workflows";
import { createAuditLog } from "@/lib/audit";
import { resolvePlanAmount, resolveTierKey } from "@/lib/payment";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    const body = await req.json().catch(() => null);
    if (!body || !body.caseId) {
      return NextResponse.json({ error: "Missing caseId" }, { status: 400 });
    }

    const { caseId, plan } = body;

    // Verify case exists
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: { answers: true },
    });

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // If session is present, verify ownership
    if (session && userId && caseData.customerId !== userId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: You do not own this case" },
        { status: 403 }
      );
    }

    const actorId = userId || caseData.customerId;
    const tierKey = resolveTierKey(plan);
    const amount = resolvePlanAmount(plan);
    const mockTxnId = `MOCK_TXN_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create completed Payment record
      const payment = await tx.payment.create({
        data: {
          caseId,
          amount,
          currency: "INR",
          status: "SUCCESS",
          mode: "MOCK",
          razorpayPaymentId: mockTxnId,
        },
      });

      // 2. Evaluate answers
      const answersMap: Record<string, any> = {};
      for (const ans of caseData.answers) {
        try {
          Object.assign(answersMap, JSON.parse(ans.answerData));
        } catch {}
      }

      const evaluation = await LegalWorkflowEngine.evaluate(answersMap);
      const requiresReview =
        evaluation.requiresLawyerReview ||
        tierKey === "LAWYER_REVIEW" ||
        tierKey === "COMPLEX_NRI" ||
        plan === "LAWYER_REVIEW";

      const nextStatus = requiresReview ? "IN_REVIEW" : "PAID";

      // 3. Update case status & flags
      await tx.case.update({
        where: { id: caseId },
        data: {
          status: nextStatus,
          flags: evaluation.flags.join(","),
        },
      });

      // 4. Centralized audit log
      await createAuditLog({
        actorId,
        action: "PAYMENT_COMPLETED",
        entity: "Payment",
        entityId: payment.id,
        caseId,
        details: {
          plan: tierKey,
          amount,
          transactionId: mockTxnId,
          status: nextStatus,
          flags: evaluation.flags,
          mode: "MOCK",
        },
        tx,
      });

      return {
        nextStatus,
        paymentId: payment.id,
      };
    });

    // 5. Generate document if PAID
    if (result.nextStatus === "PAID") {
      try {
        await DocumentGenerator.generate(caseId, actorId);
      } catch (err) {
        console.warn("Document generation warning in checkout:", err);
      }
    }

    return NextResponse.json({ success: true, status: result.nextStatus });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
