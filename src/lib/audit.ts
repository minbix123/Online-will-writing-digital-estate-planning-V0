import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "USER_REGISTERED"
  | "USER_LOGIN"
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILURE"
  | "CASE_CREATED"
  | "QUESTIONNAIRE_SAVED"
  | "QUESTIONNAIRE_SUBMITTED"
  | "PAYMENT_INITIATED"
  | "PAYMENT_COMPLETED"
  | "PAYMENT_FAILED"
  | "LAWYER_ASSIGNED"
  | "LAWYER_REVIEW_SUBMITTED"
  | "CASE_REVIEW_STARTED"
  | "CASE_APPROVED"
  | "CASE_REJECTED"
  | "CHANGES_REQUESTED"
  | "DOCUMENT_GENERATED"
  | "DOCUMENT_DOWNLOADED"
  | "TEMPLATE_CREATED"
  | "TEMPLATE_STATUS_CHANGED"
  | "TEMPLATE_APPROVED"
  | "TEMPLATE_LOCKED"
  | "CLAUSE_STATUS_CHANGED"
  | "CLAUSE_APPROVED"
  | "ADMIN_CASE_ASSIGNED"
  | "ADMIN_STATUS_OVERRIDE"
  | "USER_ROLE_UPDATED"
  | (string & {});

export interface CreateAuditLogParams {
  actorId?: string | null;
  userId?: string | null; // Alias for actorId
  action: AuditAction;
  entity?: string | null;
  entityId?: string | null;
  caseId?: string | null;
  metadata?: Record<string, any> | string | null;
  details?: Record<string, any> | string | null; // Alias for metadata
  ipAddress?: string | null;
  userAgent?: string | null;
  tx?: Prisma.TransactionClient;
}

/**
 * Centralized, tamper-resistant audit logger.
 * Enforces UTC timestamping, safe JSON metadata formatting, and optional
 * Prisma transaction client support for atomic workflows.
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  const actorId = params.actorId || params.userId || null;
  const rawMeta = params.metadata !== undefined ? params.metadata : params.details;

  let metadataObj: Record<string, any> | null = null;
  if (typeof rawMeta === "string") {
    try {
      metadataObj = JSON.parse(rawMeta);
    } catch {
      metadataObj = { text: rawMeta };
    }
  } else if (rawMeta && typeof rawMeta === "object") {
    metadataObj = { ...rawMeta };
  }

  if (params.ipAddress) {
    metadataObj = metadataObj || {};
    metadataObj.ipAddress = params.ipAddress;
  }
  if (params.userAgent) {
    metadataObj = metadataObj || {};
    metadataObj.userAgent = params.userAgent;
  }

  let serializedMetadata: string | null = null;
  if (metadataObj !== null) {
    try {
      serializedMetadata = JSON.stringify(metadataObj);
    } catch {
      serializedMetadata = JSON.stringify({ error: "Failed to serialize metadata" });
    }
  }

  const now = new Date(); // Standardized UTC Date instance
  const db = params.tx || prisma;

  return await db.auditLog.create({
    data: {
      actorId,
      action: params.action,
      entity: params.entity || null,
      entityId: params.entityId || null,
      caseId: params.caseId || null,
      metadata: serializedMetadata,
      createdAt: now,
      timestamp: now,
    },
  });
}

export default createAuditLog;
