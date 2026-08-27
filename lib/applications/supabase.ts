import type { ApplicationInsert, ApplicationRecord } from "./types";
import { isApplicationRow, mapApplicationRow } from "./types";

function getApplicationStoreConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

function applicationHeaders(key: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export function hasApplicationStore(): boolean {
  return getApplicationStoreConfig() !== null;
}

export async function createApplication(input: {
  id: string;
  sessionId: string;
  applicantName: string;
  applicantEmail: string;
  applicantMobile: string;
  state: string;
  district: string;
  department: string;
  publicAuthority: string;
  draft: string;
}): Promise<ApplicationRecord> {
  const config = getApplicationStoreConfig();
  if (!config) throw new Error("Application store is not configured.");

  const row: ApplicationInsert = {
    id: input.id,
    session_id: input.sessionId,
    applicant_name: input.applicantName,
    applicant_email: input.applicantEmail,
    applicant_mobile: input.applicantMobile,
    state: input.state,
    district: input.district,
    department: input.department,
    public_authority: input.publicAuthority,
    draft: input.draft,
    status: "submitted",
  };
  const response = await fetch(`${config.url}/rest/v1/applications`, {
    method: "POST",
    headers: { ...applicationHeaders(config.key), Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Application could not be stored.");
  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || payload.length !== 1 || !isApplicationRow(payload[0])) {
    throw new Error("Application store returned an invalid record.");
  }
  return mapApplicationRow(payload[0]);
}

export async function findApplication(id: string): Promise<ApplicationRecord | null> {
  const config = getApplicationStoreConfig();
  if (!config) throw new Error("Application store is not configured.");

  const response = await fetch(`${config.url}/rest/v1/applications?select=*&id=eq.${encodeURIComponent(id)}`, {
    headers: applicationHeaders(config.key),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Application could not be retrieved.");
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error("Application store returned an invalid response.");
  const row = payload[0];
  return row && isApplicationRow(row) ? mapApplicationRow(row) : null;
}
