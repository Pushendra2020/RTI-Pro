import { createApplication, hasApplicationStore } from "@/lib/applications/supabase";
import { isValidEmailAddress, isValidMobileNumber } from "@/lib/applications/validation";

export const runtime = "nodejs";
export const maxDuration = 15;

interface CreateApplicationBody {
  applicationId?: unknown;
  sessionId?: unknown;
  applicantName?: unknown;
  applicantEmail?: unknown;
  applicantMobile?: unknown;
  state?: unknown;
  district?: unknown;
  department?: unknown;
  publicAuthority?: unknown;
  draft?: unknown;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request): Promise<Response> {
  if (!hasApplicationStore()) {
    return Response.json({ error: "Mock application storage is not configured." }, { status: 503 });
  }

  let body: CreateApplicationBody;
  try {
    body = (await request.json()) as CreateApplicationBody;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const input = {
    id: stringValue(body.applicationId),
    sessionId: stringValue(body.sessionId),
    applicantName: stringValue(body.applicantName),
    applicantEmail: stringValue(body.applicantEmail),
    applicantMobile: stringValue(body.applicantMobile),
    state: stringValue(body.state),
    district: stringValue(body.district),
    department: stringValue(body.department),
    publicAuthority: stringValue(body.publicAuthority),
    draft: stringValue(body.draft),
  };
  if (Object.values(input).some((value) => !value)) {
    return Response.json({ error: "All application fields are required." }, { status: 400 });
  }
  if (!/^RTI-\d{4}-\d{4,6}$/.test(input.id)) {
    return Response.json({ error: "The application ID is invalid." }, { status: 400 });
  }
  if (!isValidEmailAddress(input.applicantEmail)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!isValidMobileNumber(input.applicantMobile)) {
    return Response.json({ error: "Enter a valid mobile number with 8 to 15 digits." }, { status: 400 });
  }
  if (input.applicantEmail.length > 240 || input.draft.length > 12000 || input.sessionId.length > 120) {
    return Response.json({ error: "One or more application fields are too long." }, { status: 400 });
  }

  try {
    const application = await createApplication(input);
    return Response.json({ application, source: "supabase" }, { status: 201 });
  } catch {
    return Response.json({ error: "The mock application could not be stored." }, { status: 502 });
  }
}
