import { MAHARASHTRA_LOCATION_CATALOG } from "./catalog";
import type { AdministrativeLocation, LocationCandidate, LocationContext, LocationResolution } from "./types";
import { lgdMatches, loadLgdLocations } from "./lgd";

const cache = new Map<string, { expiresAt: number; result: LocationResolution }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function normalize(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim(); }
function key(query: string, context: LocationContext): string { return normalize([query, context.state, context.district, context.city, context.pincode].filter(Boolean).join("|")); }
function emptyField<T>(): { value: T | null; source: null; sourceId: null; confidence: number } { return { value: null, source: null, sourceId: null, confidence: 0 }; }
function emptyLocation(id: string, name: string): AdministrativeLocation {
  return { id, name, normalizedName: normalize(name), entityType: "LOCALITY", formattedAddress: null, country: emptyField(), state: emptyField(), district: emptyField(), division: emptyField(), subDistrict: emptyField(), taluka: emptyField(), block: emptyField(), city: emptyField(), locality: emptyField(), sublocality: emptyField(), village: emptyField(), pincode: emptyField(), urbanLocalBody: emptyField(), ruralLocalBody: emptyField(), ward: emptyField(), coordinates: emptyField(), aliases: [], metadata: {} };
}
function candidateScore(item: AdministrativeLocation, query: string, context: LocationContext): number {
  const text = normalize(query); const aliases = [...item.aliases.map(normalize), item.normalizedName]; const matchedAlias = aliases.filter((alias) => alias && text.includes(alias)).sort((left, right) => right.length - left.length)[0]; const queryPincode = text.match(/\b\d{6}\b/)?.[0]; const matchedPincode = item.pincode.value === context.pincode || item.pincode.value === queryPincode;
  let score = matchedAlias ? 0.65 + Math.min(matchedAlias.length / 100, 0.12) : matchedPincode ? 0.7 : 0;
  if (matchedAlias && item.entityType === "LOCALITY") score += 0.08;
  if (context.city && item.city.value?.name.toLocaleLowerCase() === context.city.toLocaleLowerCase()) score += 0.12;
  if (context.district && item.district.value?.name.toLocaleLowerCase() === context.district.toLocaleLowerCase()) score += 0.12;
  if (context.pincode && item.pincode.value === context.pincode) score += 0.2;
  if (normalize(item.name) === text) score += 0.12;
  return Math.min(score, 0.99);
}
function localResolve(query: string, context: LocationContext, catalog: AdministrativeLocation[] = MAHARASHTRA_LOCATION_CATALOG): LocationResolution | null {
  const ranked = catalog.map((item) => ({ item, score: candidateScore(item, query, context) })).filter(({ score }) => score >= 0.65).sort((a, b) => b.score - a.score);
  if (!ranked.length) return null;
  const candidates: LocationCandidate[] = ranked.map(({ item }) => ({ location: item, reason: "Matched the place name and available Maharashtra administrative catalog fields." }));
  if (ranked.length > 1 && ranked[0].score - ranked[1].score < 0.02) return { status: "ambiguous", confidence: ranked[0].score, originalQuery: query, source: { geocoder: null, administrative: "local_dataset", fallback: null }, resolved: null, candidates, notice: "More than one location matched. Please choose the location you mean." };
  return { status: "resolved", confidence: ranked[0].score, originalQuery: query, source: { geocoder: null, administrative: "local_dataset", fallback: null }, resolved: ranked[0].item, candidates, notice: "Resolved using the local Maharashtra administrative catalog. Refresh it with official LGD data for production coverage." };
}

function extractAddressComponents(components: Array<{ long_name?: string; short_name?: string; types?: string[] }>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const component of components) for (const type of component.types ?? []) output[type] = component.long_name ?? component.short_name ?? "";
  return output;
}
async function googleResolve(query: string): Promise<LocationResolution | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim(); if (!apiKey) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json"); url.searchParams.set("address", query); url.searchParams.set("components", "country:IN"); url.searchParams.set("key", apiKey);
  try {
    const response = await fetch(url, { cache: "no-store" }); if (!response.ok) return null;
    const body: unknown = await response.json(); if (typeof body !== "object" || body === null || !("results" in body)) return null;
    const results = body.results; if (!Array.isArray(results) || results.length === 0) return null;
    const first = results[0]; if (typeof first !== "object" || first === null) return null;
    const record = first as Record<string, unknown>; const components = Array.isArray(record.address_components) ? record.address_components.filter((item): item is { long_name?: string; short_name?: string; types?: string[] } => typeof item === "object" && item !== null) : [];
    const parts = extractAddressComponents(components); const geometry = typeof record.geometry === "object" && record.geometry !== null ? record.geometry as Record<string, unknown> : {};
    const coordinates = typeof geometry.location === "object" && geometry.location !== null ? geometry.location as Record<string, unknown> : {};
    const resolved = emptyLocation(String(record.place_id ?? "google-result"), String(record.formatted_address ?? query));
    resolved.formattedAddress = typeof record.formatted_address === "string" ? record.formatted_address : query; resolved.entityType = "LOCALITY";
    resolved.country = { value: parts.country ? { name: parts.country, code: parts.country === "India" ? "IN" : parts.country } : null, source: parts.country ? "GOOGLE_GEOCODING" : null, sourceId: String(record.place_id ?? "google"), confidence: parts.country ? 0.9 : 0 };
    resolved.state = { value: parts.administrative_area_level_1 ? { name: parts.administrative_area_level_1, lgdCode: null } : null, source: parts.administrative_area_level_1 ? "GOOGLE_GEOCODING" : null, sourceId: String(record.place_id ?? "google"), confidence: parts.administrative_area_level_1 ? 0.78 : 0 };
    resolved.district = { value: parts.administrative_area_level_2 ? { name: parts.administrative_area_level_2, lgdCode: null } : null, source: parts.administrative_area_level_2 ? "GOOGLE_GEOCODING" : null, sourceId: String(record.place_id ?? "google"), confidence: parts.administrative_area_level_2 ? 0.72 : 0 };
    resolved.city = { value: parts.locality ? { name: parts.locality } : null, source: parts.locality ? "GOOGLE_GEOCODING" : null, sourceId: String(record.place_id ?? "google"), confidence: parts.locality ? 0.8 : 0 };
    resolved.locality = { value: parts.neighborhood ? { name: parts.neighborhood } : null, source: parts.neighborhood ? "GOOGLE_GEOCODING" : null, sourceId: String(record.place_id ?? "google"), confidence: parts.neighborhood ? 0.75 : 0 };
    resolved.pincode = { value: parts.postal_code ?? null, source: parts.postal_code ? "GOOGLE_GEOCODING" : null, sourceId: String(record.place_id ?? "google"), confidence: parts.postal_code ? 0.9 : 0 };
    const latitude = typeof coordinates.lat === "number" ? coordinates.lat : null; const longitude = typeof coordinates.lng === "number" ? coordinates.lng : null;
    resolved.coordinates = { value: latitude !== null && longitude !== null ? { latitude, longitude } : null, source: latitude !== null && longitude !== null ? "GOOGLE_GEOCODING" : null, sourceId: String(record.place_id ?? "google"), confidence: latitude !== null && longitude !== null ? 0.98 : 0 };
    const confidence = resolved.state.value && resolved.district.value ? 0.86 : 0.68;
    const local = localResolve(query, { state: parts.administrative_area_level_1, district: parts.administrative_area_level_2, city: parts.locality, pincode: parts.postal_code });
    if (local?.resolved) {
      const reconciled = { ...local.resolved, formattedAddress: resolved.formattedAddress ?? local.resolved.formattedAddress, coordinates: resolved.coordinates.value ? resolved.coordinates : local.resolved.coordinates };
      return { ...local, originalQuery: query, confidence: Math.max(local.confidence, confidence), source: { geocoder: "google", administrative: "local_dataset", fallback: null }, resolved: reconciled, notice: "Location matched to the local administrative catalog after Google Geocoding." };
    }
    return { status: confidence >= 0.7 ? "resolved" : "not_found", confidence, originalQuery: query, source: { geocoder: "google", administrative: null, fallback: null }, resolved: confidence >= 0.7 ? resolved : null, candidates: [], notice: "Location identified by Google Geocoding; government LGD reconciliation is still required for missing administrative levels." };
  } catch { return null; }
}
async function nominatimResolve(query: string): Promise<LocationResolution | null> {
  const base = process.env.NOMINATIM_BASE_URL?.trim() || "https://nominatim.openstreetmap.org/search"; const url = new URL(base); url.searchParams.set("q", query); url.searchParams.set("format", "jsonv2"); url.searchParams.set("addressdetails", "1"); url.searchParams.set("countrycodes", "in"); url.searchParams.set("limit", "5");
  try { const response = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Saathi-RTI-location-resolver/1.0" } }); if (!response.ok) return null; const body: unknown = await response.json(); if (!Array.isArray(body) || body.length === 0) return null; const first = body[0]; if (typeof first !== "object" || first === null) return null; const record = first as Record<string, unknown>; const address = typeof record.address === "object" && record.address !== null ? record.address as Record<string, unknown> : {}; const resolved = emptyLocation(String(record.place_id ?? "nominatim"), String(record.display_name ?? query)); resolved.formattedAddress = String(record.display_name ?? query); const name = (keyName: string) => typeof address[keyName] === "string" ? String(address[keyName]) : null; resolved.country = { value: { name: name("country") ?? "India", code: "IN" }, source: "NOMINATIM", sourceId: String(record.place_id ?? "nominatim"), confidence: 0.78 }; resolved.state = { value: name("state") ? { name: name("state") as string, lgdCode: null } : null, source: name("state") ? "NOMINATIM" : null, sourceId: String(record.place_id ?? "nominatim"), confidence: 0.65 }; resolved.district = { value: name("state_district") ? { name: name("state_district") as string, lgdCode: null } : null, source: name("state_district") ? "NOMINATIM" : null, sourceId: String(record.place_id ?? "nominatim"), confidence: 0.62 }; resolved.pincode = { value: name("postcode"), source: name("postcode") ? "NOMINATIM" : null, sourceId: String(record.place_id ?? "nominatim"), confidence: name("postcode") ? 0.78 : 0 }; const lat = Number(record.lat); const lon = Number(record.lon); resolved.coordinates = { value: Number.isFinite(lat) && Number.isFinite(lon) ? { latitude: lat, longitude: lon } : null, source: Number.isFinite(lat) && Number.isFinite(lon) ? "NOMINATIM" : null, sourceId: String(record.place_id ?? "nominatim"), confidence: 0.85 }; return { status: "resolved", confidence: 0.68, originalQuery: query, source: { geocoder: "nominatim", administrative: null, fallback: "nominatim" }, resolved, candidates: [], notice: "Location identified with OpenStreetMap fallback. Confirm the place before continuing." }; } catch { return null; }
}

export async function resolveIndianLocation(query: string, context: LocationContext = {}): Promise<LocationResolution> {
  const originalQuery = query.trim(); const cacheKey = key(originalQuery, context); const cached = cache.get(cacheKey); if (cached && cached.expiresAt > Date.now()) return cached.result;
  const google = await googleResolve(originalQuery); if (google) { cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result: google }); return google; }
  const lgdLocations = await loadLgdLocations(); const lgd = lgdMatches(lgdLocations, originalQuery, context); const lgdResult = lgd.length ? localResolve(originalQuery, context, lgd) : null; if (lgdResult && lgd.length) { const result = { ...lgdResult, resolved: lgd[0], candidates: lgd.map((location) => ({ location, reason: "Matched an imported official LGD record." })), source: { geocoder: null, administrative: "lgd" as const, fallback: null }, notice: "Resolved against the imported official LGD dataset." }; cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result }); return result; } const local = localResolve(originalQuery, context); if (local) { cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result: local }); return local; }
  const nominatim = await nominatimResolve(originalQuery); if (nominatim) { cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result: nominatim }); return nominatim; }
  const result: LocationResolution = { status: "not_found", confidence: 0, originalQuery, source: { geocoder: null, administrative: null, fallback: null }, resolved: null, candidates: [], notice: "We could not resolve this location. Add a city, district, state, or pincode so the request is not routed by guesswork." }; cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result }); return result;
}
