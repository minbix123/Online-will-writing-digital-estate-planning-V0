import { NextResponse } from "next/server";
import { questionnaireConfig } from "@/lib/questionnaire";

export async function GET() {
  return NextResponse.json(questionnaireConfig);
}
