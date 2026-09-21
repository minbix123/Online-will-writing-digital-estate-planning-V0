import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { resolvePlanAmount, resolveTierKey } from "@/lib/payment";
import Razorpay from "razorpay";

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

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "",
    });

    // Create Razorpay Order
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // Amount in paise
      currency: "INR",
      receipt: `receipt_${caseId}_${Date.now()}`,
    });

    // Create PENDING payment record
    const payment = await prisma.payment.create({
      data: {
        caseId,
        amount,
        currency: "INR",
        status: "PENDING",
        mode: "RAZORPAY",
        razorpayOrderId: razorpayOrder.id,
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
        orderId: razorpayOrder.id,
        mode: "RAZORPAY",
      },
    });

    return NextResponse.json({
      paymentId: payment.id,
      amount: payment.amount,
      currency: "INR",
      tier: resolvedTier,
      status: "PENDING",
      orderId: razorpayOrder.id,
    });
  } catch (error) {
    console.error("Payment create error:", error);
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}
