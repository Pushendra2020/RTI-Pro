export type ApplicationStatus = "submitted" | "under_review" | "response_due";

export interface ApplicationRecord {
  id: string;
  createdAt: string;
  applicantName: string;
  applicantEmail: string;
  applicantMobile: string;
  state: string;
  district: string;
  department: string;
  publicAuthority: string;
  draft: string;
  status: ApplicationStatus;
}

export interface ApplicationRow {
  id: string;
  session_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_mobile: string;
  state: string;
  district: string;
  department: string;
  public_authority: string;
  draft: string;
  status: ApplicationStatus;
  created_at: string;
}

export type ApplicationInsert = Record<string, string | undefined> & {
  id: string;
  session_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_mobile: string;
  state: string;
  district: string;
  department: string;
  public_authority: string;
  draft: string;
  status: ApplicationStatus;
  created_at?: string;
}

export interface ApplicationDatabase {
  public: {
    Tables: {
      applications: {
        Row: ApplicationRow;
        Insert: ApplicationInsert;
        Update: Partial<ApplicationInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export function mapApplicationRow(row: ApplicationRow): ApplicationRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    applicantName: row.applicant_name,
    applicantEmail: row.applicant_email,
    applicantMobile: row.applicant_mobile,
    state: row.state,
    district: row.district,
    department: row.department,
    publicAuthority: row.public_authority,
    draft: row.draft,
    status: row.status,
  };
}

export function isApplicationRow(value: unknown): value is ApplicationRow {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && typeof record.session_id === "string"
    && typeof record.applicant_name === "string"
    && typeof record.applicant_email === "string"
    && typeof record.applicant_mobile === "string"
    && typeof record.state === "string"
    && typeof record.district === "string"
    && typeof record.department === "string"
    && typeof record.public_authority === "string"
    && typeof record.draft === "string"
    && (record.status === "submitted" || record.status === "under_review" || record.status === "response_due")
    && typeof record.created_at === "string";
}

export function isApplicationRecord(value: unknown): value is ApplicationRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && typeof record.createdAt === "string"
    && typeof record.applicantName === "string"
    && typeof record.applicantEmail === "string"
    && typeof record.applicantMobile === "string"
    && typeof record.state === "string"
    && typeof record.district === "string"
    && typeof record.department === "string"
    && typeof record.publicAuthority === "string"
    && typeof record.draft === "string"
    && (record.status === "submitted" || record.status === "under_review" || record.status === "response_due");
}

export interface ApplicationApiResponse {
  application: ApplicationRecord;
  source: "supabase";
}

export function isApplicationApiResponse(value: unknown): value is ApplicationApiResponse {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return record.source === "supabase" && isApplicationRecord(record.application);
}
