import { researchGovernmentRequest } from "@/lib/location/agent";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) return Response.json({ error: "A research query is required." }, { status: 400 });
    const record = body as Record<string, unknown>; const query = typeof record.query === "string" ? record.query.trim() : ""; const issue = typeof record.issue === "string" ? record.issue.trim() : query; const category = typeof record.category === "string" ? record.category.trim() : "Government records";
    if (!query || query.length > 500) return Response.json({ error: "A query between 1 and 500 characters is required." }, { status: 400 });
    const result = await researchGovernmentRequest({ query, issue, category, searchWhenAuthorityMissing: true });
    return Response.json(result);
  } catch { return Response.json({ error: "Government research is temporarily unavailable." }, { status: 500 }); }
}
