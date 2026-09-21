import type { Session } from "next-auth";

type ProtectedCase = {
  customerId: string;
  lawyerId: string | null;
  status: string;
};

/**
 * The single server-side access rule for case-scoped resources.
 * Unassigned IN_REVIEW cases are visible to the lawyer queue; once claimed,
 * only the assigned lawyer (or an admin) retains access.
 */
export function canAccessCase(session: Session | null, caseData: ProtectedCase): boolean {
  const user = session?.user as (Session["user"] & { id?: string; role?: string }) | undefined;
  if (!user?.id || !user.role) return false;

  if (user.role === "ADMIN") return true;
  if (user.role === "CUSTOMER") return caseData.customerId === user.id;
  if (user.role === "LAWYER") {
    return caseData.lawyerId === user.id ||
      (caseData.lawyerId === null && caseData.status === "IN_REVIEW");
  }

  return false;
}
