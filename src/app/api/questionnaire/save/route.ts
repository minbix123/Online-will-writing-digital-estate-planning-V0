import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { caseId, sectionId, data } = body;

    if (!caseId || !sectionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify case existence and ownership
    const existingCase = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const user = session.user as any;
    if (existingCase.customerId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: You do not own this case" },
        { status: 403 }
      );
    }

    // Atomic upsert using compound unique constraint caseId_questionId
    const savedAnswer = await prisma.questionnaireAnswer.upsert({
      where: {
        caseId_questionId: {
          caseId,
          questionId: sectionId,
        },
      },
      update: {
        answerData: JSON.stringify(data ?? {}),
        questionnaireVersion: "v1.0",
        sectionId,
      },
      create: {
        caseId,
        questionId: sectionId,
        sectionId,
        questionnaireVersion: "v1.0",
        answerData: JSON.stringify(data ?? {}),
      },
    });

    return NextResponse.json({
      success: true,
      updatedAt: savedAnswer.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json({ error: "Failed to save answers" }, { status: 500 });
  }
}
