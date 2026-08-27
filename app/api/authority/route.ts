import { NextResponse } from "next/server";
import { findAuthority } from "@/lib/authority/lookup";
import type { AuthorityLookupInput } from "@/lib/authority/types";

function parseInput(value: unknown): AuthorityLookupInput | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.state !== "string" || typeof record.district !== "string" || typeof record.category !== "string" || typeof record.issue !== "string") return null;
  return {
    state: record.state.trim(),
    district: record.district.trim(),
    category: record.category.trim(),
    issue: record.issue.trim(),
  };
}

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const input = parseInput(body);
  if (!input || !input.state || !input.district || !input.category || !input.issue) {
    return NextResponse.json({ error: "A state, district, category and issue are required." }, { status: 400 });
  }

  const result = await findAuthority(input);
  return NextResponse.json(result);
}
