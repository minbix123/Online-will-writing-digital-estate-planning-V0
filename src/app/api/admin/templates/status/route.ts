import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

const VALID_STATUSES = ["DRAFT", "UNDER_REVIEW", "LAWYER_APPROVED", "LOCKED", "ARCHIVED"];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!session || user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.status || (!body.templateId && !body.clauseId)) {
      return NextResponse.json(
        { error: "Missing required parameters: status and either templateId or clauseId are required" },
        { status: 400 }
      );
    }

    const { templateId, clauseId, versionId, status } = body;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    if (templateId) {
      const template = await prisma.template.findUnique({
        where: { id: templateId },
        include: { versions: { orderBy: { version: "desc" }, take: 1 } },
      });

      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }

      // Update template and its latest version
      await prisma.$transaction(async (tx) => {
        await tx.template.update({
          where: { id: templateId },
          data: { status },
        });

        if (template.versions.length > 0) {
          const targetVersionId = versionId || template.versions[0].id;
          await tx.templateVersion.update({
            where: { id: targetVersionId },
            data: { status },
          });
        }

        await createAuditLog({
          actorId: user.id,
          action: status === "LAWYER_APPROVED" ? "TEMPLATE_APPROVED" : status === "LOCKED" ? "TEMPLATE_LOCKED" : "TEMPLATE_STATUS_CHANGED",
          entity: "Template",
          entityId: templateId,
          details: {
            templateName: template.name,
            previousStatus: template.status,
            newStatus: status,
            versionId: versionId || (template.versions[0]?.id ?? null),
          },
          tx,
        });
      });

      return NextResponse.json({
        success: true,
        entity: "Template",
        id: templateId,
        status,
        message: `Template ${template.name} updated to ${status}`,
      });
    }

    if (clauseId) {
      const clause = await prisma.clause.findUnique({
        where: { id: clauseId },
        include: { versions: { orderBy: { version: "desc" }, take: 1 } },
      });

      if (!clause) {
        return NextResponse.json({ error: "Clause not found" }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.clause.update({
          where: { id: clauseId },
          data: { status },
        });

        if (clause.versions.length > 0) {
          const targetVersionId = versionId || clause.versions[0].id;
          await tx.clauseVersion.update({
            where: { id: targetVersionId },
            data: { status },
          });
        }

        await createAuditLog({
          actorId: user.id,
          action: status === "LAWYER_APPROVED" ? "CLAUSE_APPROVED" : "CLAUSE_STATUS_CHANGED",
          entity: "Clause",
          entityId: clauseId,
          details: {
            clauseTitle: clause.name,
            previousStatus: clause.status,
            newStatus: status,
            versionId: versionId || (clause.versions[0]?.id ?? null),
          },
          tx,
        });
      });

      return NextResponse.json({
        success: true,
        entity: "Clause",
        id: clauseId,
        status,
        message: `Clause ${clause.name} updated to ${status}`,
      });
    }

    return NextResponse.json({ error: "No target processed" }, { status: 400 });
  } catch (error) {
    console.error("Template status update error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
