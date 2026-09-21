import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { DocumentGenerator } from "@/server/document-generator";

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
    if (!body || !body.caseId || !body.decision) {
      return NextResponse.json(
        { error: "Missing required fields: caseId and decision are mandatory" },
        { status: 400 }
      );
    }

    const { caseId, decision, notes } = body;

    if (!["APPROVE", "REQUEST_CHANGES", "REJECT"].includes(decision)) {
      return NextResponse.json(
        { error: "Invalid decision. Must be APPROVE, REQUEST_CHANGES, or REJECT." },
        { status: 400 }
      );
    }

    if ((decision === "REQUEST_CHANGES" || decision === "REJECT") && (!notes || !notes.trim())) {
      return NextResponse.json(
        { error: "Review notes and legal observations are required when requesting changes or rejecting." },
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

    // Enforce lawyer assignment isolation
    if (existingCase.lawyerId && existingCase.lawyerId !== userId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: This case is assigned to another advocate" },
        { status: 403 }
      );
    }

    // Atomic transaction for review creation, status transition, and audit logging
    const result = await prisma.$transaction(async (tx) => {
      // Auto-assign lawyer if unassigned
      if (!existingCase.lawyerId) {
        await tx.case.update({
          where: { id: caseId },
          data: { lawyerId: userId },
        });
      }

      let nextStatus = "APPROVED";
      let reviewStatus = "COMPLETED";
      let auditAction = "CASE_APPROVED";

      if (decision === "APPROVE") {
        nextStatus = "APPROVED";
        reviewStatus = "COMPLETED";
        auditAction = "CASE_APPROVED";
      } else if (decision === "REQUEST_CHANGES") {
        nextStatus = "CLARIFICATION_REQUESTED";
        reviewStatus = "REQUESTED";
        auditAction = "CHANGES_REQUESTED";
      } else if (decision === "REJECT") {
        nextStatus = "REJECTED";
        reviewStatus = "COMPLETED";
        auditAction = "CASE_REJECTED";
      }

      // 1. Create LawyerReview record
      const review = await tx.lawyerReview.create({
        data: {
          caseId,
          lawyerId: userId,
          status: reviewStatus,
          notes: notes?.trim() || null,
        },
      });

      // 2. Update Case status
      const updatedCase = await tx.case.update({
        where: { id: caseId },
        data: { status: nextStatus },
      });

      // 3. Centralized Audit Log
      await createAuditLog({
        actorId: userId,
        action: auditAction,
        entity: "Case",
        entityId: caseId,
        caseId,
        details: {
          decision,
          reviewId: review.id,
          nextStatus,
          notes: notes?.trim() || null,
        },
        tx,
      });

      // Also log LAWYER_REVIEW_SUBMITTED for telemetry completeness
      await createAuditLog({
        actorId: userId,
        action: "LAWYER_REVIEW_SUBMITTED",
        entity: "LawyerReview",
        entityId: review.id,
        caseId,
        details: { decision, notesLength: notes ? notes.trim().length : 0 },
        tx,
      });

      return {
        nextStatus,
        reviewId: review.id,
      };
    });

    // If case was approved, generate the final DOCX document
    if (decision === "APPROVE") {
      try {
        await DocumentGenerator.generate(caseId, userId);
      } catch (docErr) {
        console.warn("Document generation upon lawyer approval warning:", docErr);
      }
    }

    return NextResponse.json({
      success: true,
      status: result.nextStatus,
      reviewId: result.reviewId,
      message: `Case status transitioned to ${result.nextStatus}`,
    });
  } catch (error) {
    console.error("Lawyer review submission error:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
