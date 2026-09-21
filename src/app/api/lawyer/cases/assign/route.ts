import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!session || !userId) {
      return NextResponse.json({ error: "Unauthorized: Login required" }, { status: 401 });
    }

    if (userRole !== "LAWYER" && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Counsel or Administrator credentials required" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.caseId) {
      return NextResponse.json({ error: "Missing caseId in request body" }, { status: 400 });
    }

    const { caseId } = body;
    let targetLawyerId = userId;

    // Admin may assign to a specific lawyer
    if (userRole === "ADMIN" && body.lawyerId) {
      targetLawyerId = body.lawyerId;
    }

    // Verify target lawyer exists
    const lawyerUser = await prisma.user.findUnique({
      where: { id: targetLawyerId },
    });

    if (!lawyerUser || (lawyerUser.role !== "LAWYER" && lawyerUser.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Invalid lawyer ID specified" },
        { status: 400 }
      );
    }

    // Verify case exists
    const existingCase = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Check if case is already assigned to a different lawyer
    if (existingCase.lawyerId && existingCase.lawyerId !== targetLawyerId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Conflict: This case has already been claimed by another advocate" },
        { status: 409 }
      );
    }

    // Update case assignment
    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: {
        lawyerId: targetLawyerId,
      },
      include: {
        customer: true,
        lawyer: true,
      },
    });

    // Emit centralized audit log
    await createAuditLog({
      actorId: userId,
      action: "LAWYER_ASSIGNED",
      entity: "Case",
      entityId: caseId,
      caseId: caseId,
      details: {
        assignedLawyerId: targetLawyerId,
        lawyerName: lawyerUser.name,
        assignedBy: userId,
        priorLawyerId: existingCase.lawyerId,
      },
    });

    return NextResponse.json({
      success: true,
      case: updatedCase,
      message: `Case successfully claimed by advocate ${lawyerUser.name || lawyerUser.email}`,
    });
  } catch (error) {
    console.error("Case assignment error:", error);
    return NextResponse.json({ error: "Failed to assign case" }, { status: 500 });
  }
}
