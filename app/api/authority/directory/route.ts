import { NextResponse } from "next/server";
import { listAuthorityDirectory } from "@/lib/authority/lookup";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json();
  if (typeof body !== "object" || body === null || !("state" in body) || !("district" in body) || typeof body.state !== "string" || typeof body.district !== "string" || !body.state.trim() || !body.district.trim()) {
    return NextResponse.json({ error: "A state and district are required." }, { status: 400 });
  }
  const departments = await listAuthorityDirectory({ state: body.state.trim(), district: body.district.trim() });
  return NextResponse.json({ departments });
}
