import { understandIntent } from "@/lib/reasoning/gemini";
import type { IntentRequest } from "@/lib/reasoning/types";

export const runtime = "nodejs";

function parseIntentRequest(value: unknown): IntentRequest | null {
  if (typeof value !== "object" || value === null || !("text" in value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.text !== "string" || record.text.trim().length === 0 || record.text.length > 10000) return null;
  return {
    text: record.text.trim(),
    language: typeof record.language === "string" && record.language.trim() ? record.language.trim() : undefined,
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json();
    const intentRequest = parseIntentRequest(body);
    if (!intentRequest) {
      return Response.json({ error: "A non-empty request text is required." }, { status: 400 });
    }

    const result = await understandIntent(intentRequest);
    return Response.json(result);
  } catch {
    return Response.json({ error: "Unable to understand the request right now." }, { status: 500 });
  }
}
