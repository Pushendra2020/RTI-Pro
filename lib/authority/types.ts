export interface AuthorityCandidate {
  id: string;
  state: string;
  district: string;
  category: string;
  department: string;
  publicAuthority: string;
  aliases: string[];
  portalName: string;
  portalUrl: string;
  sourceTitle: string;
  sourceUrl: string;
  verifiedAt: string;
  active: boolean;
  matchReason?: string;
}

export interface AuthorityLookupInput {
  state: string;
  district: string;
  category: string;
  issue: string;
}

export interface AuthorityLookupResult {
  candidate: AuthorityCandidate | null;
  candidates: AuthorityCandidate[];
  source: "supabase" | "local-fallback";
  verified: boolean;
  notice: string | null;
}

export interface AuthorityDirectoryDepartment {
  id: string;
  name: string;
  category: string;
  authorityCount: number;
}

export interface AuthorityRow {
  id: string;
  state: string;
  district: string;
  category: string;
  department: string;
  public_authority: string;
  aliases: string[];
  portal_name: string;
  portal_url: string;
  source_title: string;
  source_url: string;
  verified_at: string;
  active: boolean;
}

export interface Database {
  public: {
    Tables: {
      public_authorities: {
        Row: AuthorityRow;
        Insert: Omit<AuthorityRow, "id"> & { id?: string };
        Update: Partial<AuthorityRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export function isAuthorityCandidate(value: unknown): value is AuthorityCandidate {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && typeof record.state === "string"
    && typeof record.district === "string"
    && typeof record.category === "string"
    && typeof record.department === "string"
    && typeof record.publicAuthority === "string"
    && typeof record.sourceUrl === "string";
}

export function isAuthorityLookupResult(value: unknown): value is AuthorityLookupResult {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (record.candidate === null || isAuthorityCandidate(record.candidate))
    && Array.isArray(record.candidates)
    && record.candidates.every(isAuthorityCandidate)
    && (record.source === "supabase" || record.source === "local-fallback")
    && typeof record.verified === "boolean"
    && (record.notice === null || typeof record.notice === "string");
}
