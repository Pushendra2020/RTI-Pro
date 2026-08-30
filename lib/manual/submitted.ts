import type { RTIApplicationDraft } from "@/lib/manual/types";

const SUBMITTED_STORAGE_KEY = "rti-submitted-applications";

export interface SubmittedApplication {
  registrationNumber: string;
  submittedAt: string;
  department: { name: string } | null;
  publicAuthority: { publicAuthority: string } | null;
  status: string;
  jurisdiction?: string;
  request?: string;
}

export function isSubmittedApplication(value: unknown): value is SubmittedApplication {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.registrationNumber === "string" && typeof record.submittedAt === "string" && typeof record.status === "string";
}

export function toSubmittedApplication(draft: RTIApplicationDraft): SubmittedApplication {
  return {
    registrationNumber: draft.submission.registrationNumber,
    submittedAt: draft.submission.submittedAt,
    department: draft.department ? { name: draft.department.name } : null,
    publicAuthority: draft.publicAuthority ? { publicAuthority: draft.publicAuthority.publicAuthority } : null,
    status: draft.submission.status,
    jurisdiction: [draft.jurisdiction.city, draft.jurisdiction.district, draft.jurisdiction.state].filter(Boolean).join(", "),
    request: draft.request.informationRequested,
  };
}

export function readSubmittedApplications(): SubmittedApplication[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(SUBMITTED_STORAGE_KEY) ?? "null");
    return Array.isArray(parsed) ? parsed.filter(isSubmittedApplication) : [];
  } catch { return []; }
}

export function saveSubmittedApplication(application: SubmittedApplication): void {
  if (typeof window === "undefined") return;
  const existing = readSubmittedApplications().filter((item) => item.registrationNumber !== application.registrationNumber);
  window.localStorage.setItem(SUBMITTED_STORAGE_KEY, JSON.stringify([...existing, application]));
}

export function findSubmittedApplication(registrationNumber: string): SubmittedApplication | null {
  const id = registrationNumber.trim();
  if (!id) return null;
  return readSubmittedApplications().find((item) => item.registrationNumber === id) ?? null;
}
