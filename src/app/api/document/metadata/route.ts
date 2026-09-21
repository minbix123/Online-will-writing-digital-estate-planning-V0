import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canAccessCase } from "@/lib/case-access";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const caseId = url.searchParams.get("caseId");

  if (!caseId) {
    return NextResponse.json({ error: "Missing caseId" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const caseData = await prisma.case.findUnique({
    where: { id: caseId }
  });

  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (!canAccessCase(session, caseData)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const document = await prisma.document.findFirst({
    where: { caseId },
    orderBy: { createdAt: "desc" }
  });

  if (!document) {
    return NextResponse.json({ exists: false, caseStatus: caseData.status }, { status: 200 });
  }

  return NextResponse.json(
    {
      exists: true,
      caseStatus: caseData.status,
      document: {
        id: document.id,
        status: document.status,
        fileSize: document.fileSize,
        fileHash: document.fileHash,
        templateVersionId: document.templateVersionId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      }
    },
    { status: 200 }
  );
}
