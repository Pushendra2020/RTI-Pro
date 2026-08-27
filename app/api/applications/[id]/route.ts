import { findApplication, hasApplicationStore } from "@/lib/applications/supabase";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!hasApplicationStore()) {
    return Response.json({ error: "Mock application storage is not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  if (!/^RTI-\d{4}-\d{4,6}$/.test(id)) {
    return Response.json({ error: "The application ID is invalid." }, { status: 400 });
  }

  try {
    const application = await findApplication(id);
    if (!application) return Response.json({ error: "Application not found." }, { status: 404 });
    return Response.json({ application, source: "supabase" });
  } catch {
    return Response.json({ error: "The application could not be retrieved." }, { status: 502 });
  }
}
