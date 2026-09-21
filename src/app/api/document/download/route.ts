import { NextResponse } from "next/server";
import { DocumentGenerator } from "@/server/document-generator";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

import { createAuditLog } from "@/lib/audit";
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

  // Verify access & RBAC
  const caseData = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (!canAccessCase(session, caseData)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = session.user as any;

  const force = url.searchParams.get("force") === "true";

  // Deduplication: check if fresh cached document already exists on disk
  if (!force) {
    const existingDoc = await prisma.document.findFirst({
      where: {
        caseId,
        status: { in: ["GENERATED", "APPROVED", "FINAL"] },
        filePath: { not: null }
      },
      orderBy: { createdAt: "desc" }
    });

    if (existingDoc && existingDoc.filePath) {
      const fileName = path.basename(existingDoc.filePath);
      const isVercel = !!process.env.VERCEL;
      const fullDiskPath = isVercel 
        ? path.join("/tmp/documents", fileName) 
        : path.join(process.cwd(), "storage", "documents", fileName);

      if (fs.existsSync(fullDiskPath)) {
        // Freshness check: confirm no questionnaire answer was updated after document creation
        const latestAnswer = await prisma.questionnaireAnswer.findFirst({
          where: { caseId },
          orderBy: { updatedAt: "desc" }
        });

        const isFresh = !latestAnswer || existingDoc.createdAt >= latestAnswer.updatedAt;

        if (isFresh) {
          const cachedBuffer = await fs.promises.readFile(fullDiskPath);
          await createAuditLog({
            actorId: user.id,
            action: "DOCUMENT_DOWNLOADED",
            entity: "Document",
            entityId: existingDoc.id,
            caseId,
            details: { cache: "HIT", filePath: existingDoc.filePath },
          });
          return new NextResponse(new Uint8Array(cachedBuffer), {
            headers: {
              "Content-Disposition": `attachment; filename="Will_Document_${caseId}.docx"`,
              "Content-Type":
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "X-Cache": "HIT",
              "X-Document-Id": existingDoc.id
            }
          });
        }
      }
    }
  }

  // Fallback to on-demand generation if cache is missing, stale, or force=true
  try {
    const { docxBuffer, documentId } = await DocumentGenerator.generate(caseId, user.id);
    await createAuditLog({
      actorId: user.id,
      action: "DOCUMENT_DOWNLOADED",
      entity: "Document",
      entityId: documentId,
      caseId,
      details: { cache: "MISS" },
    });

    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        "Content-Disposition": `attachment; filename="Will_Document_${caseId}.docx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "X-Cache": "MISS",
        "X-Document-Id": documentId
      }
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Failed to generate document" }, { status: 500 });
  }
}
