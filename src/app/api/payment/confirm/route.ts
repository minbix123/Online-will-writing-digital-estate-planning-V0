import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { LegalWorkflowEngine } from "@/server/legal-workflows";
import { DocumentGenerator } from "@/server/document-generator";
import { resolveTierKey } from "@/lib/payment";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!session || !userId) {
      return NextResponse.json({ error: "Unauthorized: Session required" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.paymentId || !body.status) {
      return NextResponse.json(
        { error: "Missing required parameters: paymentId and status are required" },
        { status: 400 }
      );
    }

    const { paymentId, status } = body;

    if (status !== "SUCCESS" && status !== "FAILURE") {
      return NextResponse.json(
        { error: "Invalid status: Must be SUCCESS or FAILURE" },
        { status: 400 }
      );
    }

    // Verify payment existence & case ownership
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { case: { include: { answers: true } } },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    if (payment.case.customerId !== userId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to confirm this payment" },
        { status: 403 }
      );
    }

    // Execute atomic state transition within prisma.$transaction
    const result = await prisma.$transaction(async (tx) => {
      if (status === "FAILURE") {
        const updatedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: { status: "FAILED" },
        });

        await createAuditLog({
          actorId: userId,
          action: "PAYMENT_FAILED",
          entity: "Payment",
          entityId: paymentId,
          caseId: payment.caseId,
          details: {
            reason: "Simulated payment failure",
            amount: payment.amount,
            mode: "MOCK",
          },
          tx,
        });

        return {
          success: false,
          paymentStatus: updatedPayment.status,
          caseStatus: payment.case.status,
          message: "Payment simulation failed as requested.",
        };
      }

      // Handle SUCCESS status
      const mockTxnId = `MOCK_TXN_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "SUCCESS",
          razorpayPaymentId: mockTxnId,
        },
      });

      // Parse questionnaire answers to evaluate deterministic legal flags
      const answersMap: Record<string, any> = {};
      for (const ans of payment.case.answers) {
        try {
          Object.assign(answersMap, JSON.parse(ans.answerData));
        } catch {
          // ignore corrupted section JSON
        }
      }

      const evaluation = await LegalWorkflowEngine.evaluate(answersMap);
      const tierKey = resolveTierKey(payment.amount);

      // Transition to IN_REVIEW if required by rules or selected lawyer plan
      const requiresReview =
        evaluation.requiresLawyerReview ||
        tierKey === "LAWYER_REVIEW" ||
        tierKey === "COMPLEX_NRI";

      const nextCaseStatus = requiresReview ? "IN_REVIEW" : "PAID";

      const updatedCase = await tx.case.update({
        where: { id: payment.caseId },
        data: {
          status: nextCaseStatus,
          flags: evaluation.flags.join(","),
        },
      });

      // Centralized audit log within the same database transaction
      await createAuditLog({
        actorId: userId,
        action: "PAYMENT_COMPLETED",
        entity: "Payment",
        entityId: paymentId,
        caseId: payment.caseId,
        details: {
          amount: updatedPayment.amount,
          currency: updatedPayment.currency,
          transactionId: mockTxnId,
          tier: tierKey,
          caseStatus: nextCaseStatus,
          requiresReview,
          flags: evaluation.flags,
          mode: "MOCK",
        },
        tx,
      });

      return {
        success: true,
        paymentStatus: updatedPayment.status,
        caseStatus: updatedCase.status,
        transactionId: mockTxnId,
        tier: tierKey,
        requiresReview,
        caseId: payment.caseId,
      };
    });

    // If status is PAID (Basic Will without review flags), trigger initial DOCX generation
    if (result.success && result.caseStatus === "PAID") {
      try {
        await DocumentGenerator.generate(payment.caseId, userId);
      } catch (docErr) {
        console.warn("Document pre-generation warning:", docErr);
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Payment confirm error:", error);
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 });
  }
}
