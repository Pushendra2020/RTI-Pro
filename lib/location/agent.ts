import { findAuthority } from "@/lib/authority/lookup";
import { verifyAuthoritySource } from "@/lib/authority/verify";
import { resolveIndianLocation } from "./resolver";
import type { LocationContext, LocationResolution } from "./types";
import type { AuthorityCandidate } from "@/lib/authority/types";
import { GoogleGenAI, Type } from "@google/genai";

export interface GovernmentSearchSource { title: string; url: string; snippet: string; domain: string; }
export interface LocationResearchResult { location: LocationResolution; authority: AuthorityCandidate | null; sources: GovernmentSearchSource[]; notice: string | null; }

const authoritySchema = {
  type: Type.OBJECT,
  properties: {
    sourceIndex: { type: Type.INTEGER, description: "Zero-based index of the supporting search result." },
    department: { type: Type.STRING },
    publicAuthority: { type: Type.STRING },
    portalName: { type: Type.STRING },
    portalUrl: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
  },
  required: ["sourceIndex", "department", "publicAuthority", "portalName", "portalUrl", "confidence"],
  additionalProperties: false,
} as const;

function officialUrl(value: unknown): URL | null { if (typeof value !== "string") return null; try { const url = new URL(value); return url.protocol === "https:" && (url.hostname.endsWith(".gov.in") || url.hostname.endsWith(".nic.in")) ? url : null; } catch { return null; } }
function missingAdministrativeFields(location: LocationResolution): boolean { const resolved = location.resolved; return !resolved || !resolved.state.value || !resolved.district.value || (!resolved.subDistrict.value && !resolved.city.value && !resolved.village.value); }

async function searchOfficialGovernmentSources(query: string): Promise<GovernmentSearchSource[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY?.trim(); const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID?.trim();
  if (!apiKey || !engineId) return [];
  const url = new URL("https://www.googleapis.com/customsearch/v1"); url.searchParams.set("q", `${query} responsible authority official government`); url.searchParams.set("key", apiKey); url.searchParams.set("cx", engineId); url.searchParams.set("num", "8");
  try { const response = await fetch(url, { cache: "no-store" }); if (!response.ok) return []; const body: unknown = await response.json(); if (typeof body !== "object" || body === null || !("items" in body) || !Array.isArray(body.items)) return []; return body.items.map((item): GovernmentSearchSource | null => { if (typeof item !== "object" || item === null) return null; const record = item as Record<string, unknown>; const sourceUrl = officialUrl(record.link); if (!sourceUrl) return null; return { title: typeof record.title === "string" ? record.title : sourceUrl.hostname, url: sourceUrl.toString(), snippet: typeof record.snippet === "string" ? record.snippet : "", domain: sourceUrl.hostname }; }).filter((item): item is GovernmentSearchSource => item !== null); } catch { return []; }
}

function parseAuthorityResponse(value: unknown): { sourceIndex: number; department: string; publicAuthority: string; portalName: string; portalUrl: string; confidence: number } | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.sourceIndex !== "number" || !Number.isInteger(record.sourceIndex) || typeof record.department !== "string" || typeof record.publicAuthority !== "string" || typeof record.portalName !== "string" || typeof record.portalUrl !== "string" || typeof record.confidence !== "number") return null;
  return { sourceIndex: record.sourceIndex, department: record.department.trim(), publicAuthority: record.publicAuthority.trim(), portalName: record.portalName.trim(), portalUrl: record.portalUrl.trim(), confidence: record.confidence };
}

async function rankAuthorityFromSearch(input: { issue: string; category: string; state: string; district: string; sources: GovernmentSearchSource[] }): Promise<AuthorityCandidate | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || input.sources.length === 0) return null;
  const sourceText = input.sources.map((source, index) => `[${index}] ${source.title}\nURL: ${source.url}\nSnippet: ${source.snippet}`).join("\n\n");
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
      contents: `You identify a responsible Indian public authority for an RTI request using only the official search results below. Do not guess or use general world knowledge. Return a candidate only if one result explicitly supports the authority's responsibility for the described issue and jurisdiction. If the project is ambiguous, choose no candidate by returning null.\n\nRequest issue: ${input.issue}\nCategory: ${input.category}\nState: ${input.state}\nDistrict: ${input.district}\n\nOfficial search results:\n${sourceText}`,
      config: { temperature: 0, maxOutputTokens: 400, responseMimeType: "application/json", responseSchema: authoritySchema },
    });
    const parsed = parseAuthorityResponse(response.text ? JSON.parse(response.text) as unknown : null);
    if (!parsed || parsed.confidence < 0.78 || parsed.sourceIndex < 0 || parsed.sourceIndex >= input.sources.length) return null;
    const supportingSource = input.sources[parsed.sourceIndex];
    const candidate: AuthorityCandidate = {
      id: `web-${parsed.sourceIndex}-${supportingSource.domain}`,
      state: input.state,
      district: input.district,
      category: input.category,
      department: parsed.department,
      publicAuthority: parsed.publicAuthority,
      aliases: [],
      portalName: parsed.portalName,
      portalUrl: supportingSource.url,
      sourceTitle: supportingSource.title,
      sourceUrl: supportingSource.url,
      verifiedAt: new Date().toISOString().slice(0, 10),
      active: true,
      matchReason: `Google found an official source connecting this authority to your ${input.category.toLowerCase()} request in ${input.district}.`,
    };
    const verification = await verifyAuthoritySource(candidate);
    return verification.verified ? candidate : null;
  } catch {
    return null;
  }
}

export async function researchGovernmentRequest(input: { query: string; context?: LocationContext; issue: string; category: string; searchWhenAuthorityMissing?: boolean }): Promise<LocationResearchResult> {
  const location = await resolveIndianLocation(input.query, input.context);
  let authority: AuthorityCandidate | null = null; let sources: GovernmentSearchSource[] = [];
  if (location.resolved?.state.value?.name && location.resolved.district.value?.name) {
    const result = await findAuthority({ state: location.resolved.state.value.name, district: location.resolved.district.value.name, category: input.category, issue: input.issue }); authority = result.candidate;
    if (!authority && input.searchWhenAuthorityMissing) {
      sources = await searchOfficialGovernmentSources(`${input.issue} ${input.category} ${location.resolved.formattedAddress ?? input.query} ${location.resolved.state.value.name} ${location.resolved.district.value.name}`);
      authority = await rankAuthorityFromSearch({ issue: input.issue, category: input.category, state: location.resolved.state.value.name, district: location.resolved.district.value.name, sources });
    }
  } else if (missingAdministrativeFields(location)) {
    sources = await searchOfficialGovernmentSources(input.query);
  }
  const notice = authority ? "The authority was identified from an official Google result and its source is reachable." : sources.length ? "Official Google search evidence was found, but it did not support a sufficiently confident authority match." : location.notice;
  return { location, authority, sources, notice };
}
