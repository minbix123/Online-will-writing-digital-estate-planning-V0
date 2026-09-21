import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!session || user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.caseId) {
      return NextResponse.json({ error: "Missing caseId parameter" }, { status: 400 });
    }

    const { caseId, lawyerId } = body;

    const existingCase = await prisma.case.findUnique({
      where: { id: caseId },
      include: { lawyer: true },
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    let targetLawyerName = "Unassigned";

    if (lawyerId) {
      const lawyer = await prisma.user.findUnique({
        where: { id: lawyerId },
      });

      if (!lawyer || (lawyer.role !== "LAWYER" && lawyer.role !== "ADMIN")) {
        return NextResponse.json(
          { error: "Specified user is not a registered advocate or administrator" },
          { status: 400 }
        );
      }
      targetLawyerName = lawyer.name || lawyer.email || "Unknown";
    }

    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: {
        lawyerId: lawyerId || null,
      },
      include: {
        customer: true,
        lawyer: true,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "ADMIN_CASE_ASSIGNED",
      entity: "Case",
      entityId: caseId,
      caseId,
      details: {
        assignedLawyerId: lawyerId || null,
        assignedLawyerName: targetLawyerName,
        previousLawyerId: existingCase.lawyerId,
        assignedByAdmin: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      case: updatedCase,
      message: `Case successfully assigned to ${targetLawyerName}`,
    });
  } catch (error) {
    console.error("Admin case assignment error:", error);
    return NextResponse.json({ error: "Failed to assign case" }, { status: 500 });
  }
}
