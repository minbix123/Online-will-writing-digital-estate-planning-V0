import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!session || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cases = await prisma.case.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: "desc" },
      include: { documents: true, reviews: true },
    });

    return NextResponse.json({ cases }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch cases:", error);
    return NextResponse.json(
      { error: "Failed to fetch cases" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!session || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const newCase = await prisma.case.create({
      data: {
        customerId: userId,
        status: "DRAFT",
        flags: "STANDARD",
      },
    });

    // Create AuditLog entry via centralized audit logger
    await createAuditLog({
      action: "CASE_CREATED",
      entity: "Case",
      entityId: newCase.id,
      actorId: userId,
      caseId: newCase.id,
      details: { status: "DRAFT", flags: "STANDARD" },
    });

    return NextResponse.json({ case: newCase }, { status: 201 });
  } catch (error) {
    console.error("Failed to create case:", error);
    return NextResponse.json(
      { error: "Failed to create case" },
      { status: 500 }
    );
  }
}
