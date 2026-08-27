import { createClient } from "@supabase/supabase-js";
import { LOCAL_AUTHORITY_DATA } from "./data";
import type { AuthorityCandidate, AuthorityLookupInput, AuthorityLookupResult, AuthorityRow, Database } from "./types";

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

function withReason(candidate: AuthorityCandidate, input: AuthorityLookupInput): AuthorityCandidate {
  const topic = input.category.toLowerCase();
  return {
    ...candidate,
    matchReason: `Matched your ${topic} request with the ${candidate.district} jurisdiction and this department's public records scope.`,
  };
}

function rankCandidates(candidates: AuthorityCandidate[], input: AuthorityLookupInput): AuthorityCandidate[] {
  return candidates
    .filter((candidate) => candidate.active)
    .map((candidate, index) => ({ candidate, score: scoreCandidate(candidate, input), index }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ candidate }) => withReason(candidate, input));
}

function localResult(input: AuthorityLookupInput): AuthorityLookupResult {
  const candidates = rankCandidates(LOCAL_AUTHORITY_DATA, input);
  return { candidate: candidates[0] ?? null, candidates, source: "local-fallback" };
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
    .limit(25);

  if (error || !data || data.length === 0) return localResult(input);

  const candidates = rankCandidates(data.map(mapRow), input);
  return { candidate: candidates[0] ?? null, candidates, source: "supabase" };
}
