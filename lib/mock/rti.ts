import type { AuthorityCandidate, AuthorityDirectoryDepartment, AuthorityLookupInput, AuthorityLookupResult } from "@/lib/authority/types";
import type { AdministrativeLocation, LocationContext, LocationField, LocationResolution } from "@/lib/location/types";

const MOCK_NOTICE = "POC mock data: confirm the official directory before filing. These are not live or government-verified records.";

export interface MockPocLocation {
  state: string;
  district: string;
  city: string;
  pincode: string;
  aliases: string[];
}

export const MOCK_POC_LOCATIONS: MockPocLocation[] = [
  // 410206 is Panvel (Raigad), so it must be listed ahead of Navi Mumbai —
  // resolveMockLocation takes the first alias match, not the best one.
  { state: "Maharashtra", district: "Raigad", city: "Panvel", pincode: "410206", aliases: ["panvel", "raigad", "410206", "पनवेल"] },
  { state: "Maharashtra", district: "Thane", city: "Navi Mumbai", pincode: "400614", aliases: ["navi mumbai", "thane", "400614", "नवी मुंबई"] },
  { state: "Maharashtra", district: "Mumbai", city: "Mumbai", pincode: "400001", aliases: ["mumbai", "400001", "मुंबई"] },
  { state: "Karnataka", district: "Bengaluru Urban", city: "Bengaluru", pincode: "560001", aliases: ["bengaluru", "bangalore", "bengaluru urban", "560001"] },
  { state: "Telangana", district: "Hyderabad", city: "Hyderabad", pincode: "500001", aliases: ["hyderabad", "500001"] },
  { state: "Tamil Nadu", district: "Chennai", city: "Chennai", pincode: "600001", aliases: ["chennai", "600001"] },
  { state: "Gujarat", district: "Ahmedabad", city: "Ahmedabad", pincode: "380001", aliases: ["ahmedabad", "380001"] },
  { state: "Delhi", district: "New Delhi", city: "New Delhi", pincode: "110001", aliases: ["new delhi", "delhi", "110001"] },
  { state: "Uttar Pradesh", district: "Lucknow", city: "Lucknow", pincode: "226001", aliases: ["lucknow", "226001"] },
];

const GOVERNMENT_AREAS = [
  { category: "Roads & Public Works", department: "Roads & Public Works Department", aliases: ["road", "roads", "road construction", "road repair", "pothole", "sanction", "work order", "contractor", "tender"] },
  { category: "Education", department: "Education Department", aliases: ["education", "school", "teacher", "classroom", "midday meal", "scholarship", "school building"] },
  { category: "Health", department: "Health Department", aliases: ["health", "hospital", "clinic", "medicine", "ambulance", "health centre", "doctor"] },
  { category: "Agriculture", department: "Agriculture Department", aliases: ["agriculture", "farmer", "crop", "seed", "fertilizer", "irrigation", "farm"] },
  { category: "Water Resources", department: "Water Resources", aliases: ["water", "water supply", "tap", "pipeline", "drinking water", "water shortage", "water connection"] },
  { category: "Rural Development", department: "Rural Development Department", aliases: ["rural", "village", "gram panchayat", "panchayat", "rural development"] },
  { category: "Municipal Services", department: "Municipal Services", aliases: ["municipal", "garbage", "waste", "drainage", "sewage", "streetlight", "property tax", "birth certificate", "death certificate"] },
  { category: "Housing", department: "Housing Department", aliases: ["housing", "house", "flat", "slum", "rehabilitation", "allotment", "building permission"] },
  { category: "Revenue / Land", department: "Revenue and Land Records Department", aliases: ["revenue", "land", "property", "7/12", "mutation", "survey", "property card", "encroachment"] },
  { category: "Police", department: "Police Department", aliases: ["police", "fir", "complaint", "station", "crime", "traffic police"] },
  { category: "Other", department: "General Administration Department", aliases: ["other", "government records", "public records", "information"] },
] as const;

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
}

function field<T>(value: T | null, confidence = value === null ? 0 : 1): LocationField<T> {
  return { value, source: value === null ? null : "LOCAL_DATASET", sourceId: value === null ? null : "saathi-poc-mock", confidence };
}

function officeName(location: MockPocLocation, category: string): string {
  if (category === "Roads & Public Works") return `${location.state} Public Works Department — ${location.district} Division`;
  if (category === "Revenue / Land") return `Office of the District Collector, ${location.district} — Revenue Branch`;
  if (category === "Agriculture") return `District Agriculture Office, ${location.district}`;
  if (category === "Rural Development") return `District Rural Development Agency, ${location.district}`;
  if (category === "Police") return `${location.city} Police — RTI Cell`;
  if (category === "Other") return `${location.city} District Administration — General Administration`;
  return `${location.city} Municipal Administration — ${category}`;
}

function mockAuthority(location: MockPocLocation, area: typeof GOVERNMENT_AREAS[number]): AuthorityCandidate {
  return {
    id: `mock-poc-${normalize(location.state).replace(/\s+/g, "-")}-${normalize(location.district).replace(/\s+/g, "-")}-${normalize(area.category).replace(/[^a-z0-9]+/g, "-")}`,
    state: location.state,
    district: location.district,
    city: location.city,
    pincode: location.pincode,
    category: area.category,
    department: area.department,
    publicAuthority: officeName(location, area.category),
    aliases: [...area.aliases],
    portalName: "Not applicable — POC mock route",
    portalUrl: "",
    sourceTitle: "Saathi POC mock mapping",
    sourceUrl: "",
    verifiedAt: "",
    active: true,
    dataOrigin: "mock-poc",
  };
}

const MOCK_AUTHORITY_DATA = MOCK_POC_LOCATIONS.flatMap((location) => GOVERNMENT_AREAS.map((area) => mockAuthority(location, area)));

function isMockJurisdiction(state: string, district: string): boolean {
  return MOCK_POC_LOCATIONS.some((location) => normalize(location.state) === normalize(state) && normalize(location.district) === normalize(district));
}

function locationMatches(location: MockPocLocation, query: string, context: LocationContext): boolean {
  const value = normalize([query, context.state, context.district, context.city, context.pincode].filter((item): item is string => typeof item === "string").join(" "));
  return location.aliases.some((alias) => value.includes(normalize(alias)));
}

function topicMatch(candidate: AuthorityCandidate, input: AuthorityLookupInput): boolean {
  const query = normalize(`${input.category} ${input.issue}`);
  return query.includes(normalize(candidate.category)) || candidate.aliases.some((alias) => query.includes(normalize(alias)));
}

function asAdministrativeLocation(location: MockPocLocation): AdministrativeLocation {
  return {
    id: `poc-${normalize(location.state).replace(/\s+/g, "-")}-${normalize(location.district).replace(/\s+/g, "-")}-${normalize(location.city).replace(/\s+/g, "-")}-${location.pincode}`,
    name: location.city,
    normalizedName: normalize(location.city),
    entityType: "CITY",
    formattedAddress: `${location.city}, ${location.district}, ${location.state}, India - ${location.pincode}`,
    country: field({ name: "India", code: "IN" }),
    state: field({ name: location.state, lgdCode: null }), district: field({ name: location.district, lgdCode: null }),
    division: field<{ name: string; lgdCode: string | null }>(null), subDistrict: field<{ name: string; lgdCode: string | null }>(null), taluka: field<{ name: string; lgdCode: string | null }>(null), block: field<{ name: string; lgdCode: string | null }>(null),
    city: field({ name: location.city }), locality: field({ name: location.city }), sublocality: field<{ name: string }>(null), village: field<{ name: string; lgdCode: string | null }>(null), pincode: field(location.pincode),
    urbanLocalBody: field<{ name: string; lgdCode: string | null }>(null), ruralLocalBody: field<{ name: string; lgdCode: string | null }>(null), ward: field<{ name: string; lgdCode: string | null }>(null), coordinates: field<{ latitude: number; longitude: number }>(null),
    aliases: location.aliases,
    metadata: { dataOrigin: "mock-poc", disclosure: "POC mock location data; not a verified administrative record." },
  };
}

export function resolveMockLocation(query: string, context: LocationContext = {}): LocationResolution | null {
  const location = MOCK_POC_LOCATIONS.find((candidate) => locationMatches(candidate, query, context));
  if (!location) return null;
  const resolved = asAdministrativeLocation(location);
  return {
    status: "resolved",
    confidence: 1,
    originalQuery: query.trim(),
    source: { geocoder: null, administrative: "local_dataset", fallback: null },
    resolved,
    candidates: [{ location: resolved, reason: "Matched the Saathi POC mock location scope." }],
    notice: `POC mock location data for ${location.city}, ${location.district}, ${location.state} (${location.pincode}); not a verified administrative record.`,
  };
}

export function findMockAuthority(input: AuthorityLookupInput): AuthorityLookupResult | null {
  if (!isMockJurisdiction(input.state, input.district)) return null;
  const candidates = MOCK_AUTHORITY_DATA.filter((candidate) => normalize(candidate.state) === normalize(input.state) && normalize(candidate.district) === normalize(input.district) && topicMatch(candidate, input)).map((candidate) => ({ ...candidate, matchReason: `POC mock mapping selected for this ${candidate.category.toLocaleLowerCase()} request in ${candidate.city}, ${candidate.district}.` }));
  if (!candidates.length) return null;
  return { candidate: candidates[0], candidates, source: "mock", verified: false, notice: MOCK_NOTICE };
}

export function listMockAuthorityDepartments(input: { state: string; district: string }): AuthorityDirectoryDepartment[] | null {
  if (!isMockJurisdiction(input.state, input.district)) return null;
  const authorityCount = MOCK_POC_LOCATIONS.filter((location) => normalize(location.state) === normalize(input.state) && normalize(location.district) === normalize(input.district)).length;
  return GOVERNMENT_AREAS.map((area) => ({ id: area.category.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-"), name: area.category, category: area.category, authorityCount }));
}
