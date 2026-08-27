import { retrieveOfficialContext } from "@/lib/rag/pinecone";

export const runtime = "nodejs";

function parseRequest(value: unknown): { query: string; topK?: number } | null {
  if (typeof value !== "object" || value === null || !("query" in value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.query !== "string" || record.query.trim().length === 0 || record.query.length > 12000) return null;
  const topK = typeof record.topK === "number" && Number.isInteger(record.topK) ? record.topK : undefined;
  return { query: record.query.trim(), topK };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json();
    const parsed = parseRequest(body);
    if (!parsed) return Response.json({ error: "A non-empty retrieval query is required." }, { status: 400 });
    return Response.json(await retrieveOfficialContext(parsed.query, parsed.topK));
  } catch {
    return Response.json({ error: "Unable to retrieve official guidance right now." }, { status: 500 });
  }
}
