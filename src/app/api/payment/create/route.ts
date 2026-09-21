import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { resolvePlanAmount, resolveTierKey } from "@/lib/payment";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!session || !userId) {
      return NextResponse.json({ error: "Unauthorized: Session required" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.caseId) {
      return NextResponse.json({ error: "Missing required parameter: caseId" }, { status: 400 });
    }

    const { caseId, tier } = body;

    // Validate case existence & ownership
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        payments: {
          where: { status: "SUCCESS" },
        },
      },
    });

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (caseData.customerId !== userId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to pay for this case" },
        { status: 403 }
      );
    }

    // Check if already paid
    if (caseData.status === "PAID" || caseData.status === "APPROVED" || caseData.payments.length > 0) {
      return NextResponse.json(
        { error: "Case is already paid", status: caseData.status },
        { status: 400 }
      );
    }

    const resolvedTier = resolveTierKey(tier);
    const amount = resolvePlanAmount(tier || resolvedTier);
    const mockOrderId = `mock_order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Create PENDING payment record
    const payment = await prisma.payment.create({
      data: {
        caseId,
        amount,
        currency: "INR",
        status: "PENDING",
        mode: "MOCK",
        razorpayOrderId: mockOrderId,
      },
    });

    // Centralized audit logging
    await createAuditLog({
      actorId: userId,
      action: "PAYMENT_INITIATED",
      entity: "Payment",
      entityId: payment.id,
      caseId,
      details: {
        tier: resolvedTier,
        amount,
        currency: "INR",
        orderId: mockOrderId,
        mode: "MOCK",
      },
    });

    return NextResponse.json({
      paymentId: payment.id,
      amount: payment.amount,
      currency: "INR",
      tier: resolvedTier,
      status: "PENDING",
      orderId: mockOrderId,
    });
  } catch (error) {
    console.error("Payment create error:", error);
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}
