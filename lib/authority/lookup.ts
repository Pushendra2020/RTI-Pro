import { createClient } from "@supabase/supabase-js";
import { LOCAL_AUTHORITY_DATA } from "./data";
import { verifyAuthoritySource } from "./verify";
import type { AuthorityCandidate, AuthorityDirectoryDepartment, AuthorityLookupInput, AuthorityLookupResult, AuthorityRow, Database } from "./types";

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function mapRow(row: AuthorityRow): AuthorityCandidate {
  return {
    id: row.id,
    state: row.state,
    district: row.district,
    category: row.category,
    department: row.department,
    publicAuthority: row.public_authority,
    aliases: row.aliases,
    portalName: row.portal_name,
    portalUrl: row.portal_url,
    sourceTitle: row.source_title,
    sourceUrl: row.source_url,
    verifiedAt: row.verified_at,
    active: row.active,
  };
}

function scoreCandidate(candidate: AuthorityCandidate, input: AuthorityLookupInput): number {
  const query = normalize(`${input.issue} ${input.category}`);
  const state = normalize(input.state);
  const district = normalize(input.district);
  const category = normalize(input.category);
  const candidateCategory = normalize(candidate.category);
  const candidateDistrict = normalize(candidate.district);
  let score = 0;

  if (normalize(candidate.state) === state) score += 5;
  if (candidateDistrict === district) score += 5;
  if (candidateCategory === category) score += 5;
  if (query.includes(candidateCategory)) score += 3;
  for (const alias of candidate.aliases) {
    if (query.includes(normalize(alias))) score += 2;
  }
  return score;
}

function hasTopicMatch(candidate: AuthorityCandidate, input: AuthorityLookupInput): boolean {
  const query = normalize(`${input.issue} ${input.category}`);
  const category = normalize(input.category);
  const candidateCategory = normalize(candidate.category);
  return candidateCategory === category || query.includes(candidateCategory) || candidate.aliases.some((alias) => query.includes(normalize(alias)));
}

function withReason(candidate: AuthorityCandidate, input: AuthorityLookupInput): AuthorityCandidate {
  const topic = input.category.toLowerCase();
  return {
    ...candidate,
    matchReason: `Matched your ${topic} request with the ${candidate.district} jurisdiction and this department's public records scope.`,
  };
}

function rankCandidates(candidates: AuthorityCandidate[], input: AuthorityLookupInput): AuthorityCandidate[] {
  const state = normalize(input.state);
  const district = normalize(input.district);
  return candidates
    .filter((candidate) => candidate.active)
    .filter((candidate) => normalize(candidate.state) === state && normalize(candidate.district) === district)
    .filter((candidate) => hasTopicMatch(candidate, input))
    .map((candidate, index) => ({ candidate, score: scoreCandidate(candidate, input), index }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ candidate }) => withReason(candidate, input));
}

async function localResult(input: AuthorityLookupInput): Promise<AuthorityLookupResult> {
  const candidates = rankCandidates(LOCAL_AUTHORITY_DATA, input);
  return verifiedResult(candidates, input, "local-fallback");
}

async function verifiedResult(candidates: AuthorityCandidate[], input: AuthorityLookupInput, source: AuthorityLookupResult["source"]): Promise<AuthorityLookupResult> {
  for (const candidate of candidates.slice(0, 3)) {
    const verification = await verifyAuthoritySource(candidate);
    if (verification.verified) return { candidate, candidates: [candidate], source, verified: true, notice: verification.notice };
  }
  return {
    candidate: null,
    candidates: [],
    source,
    verified: false,
    notice: candidates.length ? "A matching authority record exists, but its official government source could not be verified right now." : "No verified authority record matches this state, district, and request topic.",
  };
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function findAuthority(input: AuthorityLookupInput): Promise<AuthorityLookupResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return localResult(input);

  const { data, error } = await supabase
    .from("public_authorities")
    .select("*")
    .eq("active", true)
    .eq("state", input.state)
    .eq("district", input.district)
    .range(0, 4999);

  if (error || !data || data.length === 0) return localResult(input);

  const candidates = rankCandidates(data.map(mapRow), input);
  return verifiedResult(candidates, input, "supabase");
}

export async function listAuthorityDirectory(input: { state: string; district: string }): Promise<AuthorityDirectoryDepartment[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return Array.from(new Map(LOCAL_AUTHORITY_DATA.filter((row) => row.state === input.state && row.district === input.district).map((row) => [row.category, row])).values()).map((row) => ({ id: row.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: row.department, category: row.category, authorityCount: 1 }));
  }
  const { data, error } = await supabase.from("public_authorities").select("id, category, department").eq("active", true).eq("state", input.state).eq("district", input.district).range(0, 4999);
  if (error || !data) return [];
  const grouped = new Map<string, AuthorityDirectoryDepartment>();
  for (const row of data) {
    const category = typeof row.category === "string" ? row.category : "Government records";
    const department = typeof row.department === "string" ? row.department : category;
    const key = `${category}|${department}`;
    const current = grouped.get(key);
    grouped.set(key, current ? { ...current, authorityCount: current.authorityCount + 1 } : { id: `directory-${grouped.size}`, name: department, category, authorityCount: 1 });
  }
  return Array.from(grouped.values()).sort((left, right) => left.name.localeCompare(right.name));
}
