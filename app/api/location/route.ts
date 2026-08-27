import { resolveIndianLocation } from "@/lib/location/resolver";
import type { LocationContext } from "@/lib/location/types";

export const runtime = "nodejs";
export const maxDuration = 15;

function parseContext(value: unknown): LocationContext {
  if (typeof value !== "object" || value === null) return {};
  const record = value as Record<string, unknown>;
  const text = (key: string): string | undefined => typeof record[key] === "string" && record[key].trim() ? record[key].trim() : undefined;
  return { state: text("state"), district: text("district"), city: text("city"), pincode: text("pincode") };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) return Response.json({ error: "A location query is required." }, { status: 400 });
    const record = body as Record<string, unknown>;
    const query = typeof record.query === "string" ? record.query.trim() : "";
    if (!query || query.length > 500) return Response.json({ error: "A location query between 1 and 500 characters is required." }, { status: 400 });
    const language = typeof record.language === "string" ? record.language.trim() : undefined;
    const result = await resolveIndianLocation(query, { ...parseContext(record.context), ...(language ? {} : {}) });
    return Response.json(result);
  } catch {
    return Response.json({ error: "Location resolution is temporarily unavailable." }, { status: 500 });
  }
}
