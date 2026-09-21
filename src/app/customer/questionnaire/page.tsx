import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { redirect } from "next/navigation";
import QuestionnaireEngine from "@/components/QuestionnaireEngine";

interface QuestionnairePageProps {
  searchParams: Promise<{ caseId?: string | string[] }>;
}

export default async function QuestionnairePage({
  searchParams,
}: QuestionnairePageProps) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    redirect("/login");
  }

  const userId = (session.user as any).id;
  const resolvedParams = await searchParams;
  let caseId =
    typeof resolvedParams?.caseId === "string"
      ? resolvedParams.caseId
      : Array.isArray(resolvedParams?.caseId)
      ? resolvedParams.caseId[0]
      : undefined;

  if (!caseId) {
    // Create new case explicitly in DRAFT status
    const newCase = await prisma.case.create({
      data: {
        customerId: userId,
        status: "DRAFT",
        flags: "STANDARD",
      },
    });

    // Record audit log for case creation via centralized logger
    await createAuditLog({
      action: "CASE_CREATED",
      entity: "Case",
      entityId: newCase.id,
      actorId: userId,
      caseId: newCase.id,
      details: { status: "DRAFT", flags: "STANDARD" },
    });

    caseId = newCase.id;
    redirect(`/customer/questionnaire?caseId=${caseId}`);
  }

  // Query case with include: { answers: true } and verify ownership
  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
    include: { answers: true },
  });

  if (!caseData || caseData.customerId !== userId) {
    redirect("/customer/dashboard");
  }

  // Hydrate initial answers from stored section answers
  const initialAnswers: Record<string, any> = {};
  if (caseData.answers && Array.isArray(caseData.answers)) {
    for (const ans of caseData.answers) {
      try {
        const parsed = JSON.parse(ans.answerData);
        if (parsed && typeof parsed === "object") {
          Object.assign(initialAnswers, parsed);
        }
      } catch (e) {
        console.error("Failed to parse stored answer data:", e);
      }
    }
  }

  return (
    <div className="min-h-screen bg-black text-[#d4d4d4] p-4 md:p-8 selection:bg-[#d4a373]/30 selection:text-white">
      <QuestionnaireEngine caseId={caseId} initialAnswers={initialAnswers} />
    </div>
  );
}
