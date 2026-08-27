import { randomUUID } from "node:crypto";
import { runRtiWorkflow } from "@/lib/workflow/graph";

export const runtime = "nodejs";
export const maxDuration = 60;

interface WorkflowRequestBody {
  text?: unknown;
  language?: unknown;
  sessionId?: unknown;
  confirmed?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  let body: WorkflowRequestBody;
  try {
    body = (await request.json()) as WorkflowRequestBody;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const language = typeof body.language === "string" && body.language.trim().length > 0
    ? body.language.trim()
    : "English";
  const sessionId = typeof body.sessionId === "string" && body.sessionId.trim().length > 0
    ? body.sessionId.trim()
    : randomUUID();
  const confirmed = body.confirmed === true;

  if (!text) {
    return Response.json({ error: "text is required." }, { status: 400 });
  }
  if (text.length > 8000) {
    return Response.json({ error: "text must be 8,000 characters or fewer." }, { status: 400 });
  }
  if (language.length > 50 || sessionId.length > 120) {
    return Response.json({ error: "language or sessionId is too long." }, { status: 400 });
  }

  try {
    const result = await runRtiWorkflow({ sessionId, inputText: text, inputLanguage: language, confirmed });
    return Response.json(result);
  } catch {
    return Response.json({ error: "The RTI workflow could not be completed." }, { status: 500 });
  }
}
