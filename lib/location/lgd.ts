import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AdministrativeLocation, LocationField, LocationContext } from "./types";

interface LgdRow { id: string; name: string; normalizedName: string; entityType: string; stateCode: string | null; districtCode: string | null; subDistrictCode: string | null; blockCode: string | null; villageCode: string | null; lgdCode: string | null; pincode: string | null; parentId: string | null; source: string; sourceId: string | null; aliases: string[]; isActive: boolean; metadata: Record<string, unknown> }

function field<T>(value: T | null, source: "LGD" | null, sourceId: string | null, confidence: number): LocationField<T> { return { value, source, sourceId, confidence }; }
function text(metadata: Record<string, unknown>, name: string): string | null { return typeof metadata[name] === "string" && metadata[name] ? String(metadata[name]) : null; }
function toLocation(row: LgdRow): AdministrativeLocation {
  const sourceId = row.sourceId ?? row.lgdCode ?? row.id; const source = "LGD" as const; const stateName = text(row.metadata, "stateName") ?? text(row.metadata, "state_name"); const districtName = text(row.metadata, "districtName") ?? text(row.metadata, "district_name");
  const state = stateName ? { name: stateName, lgdCode: row.stateCode } : null; const district = districtName ? { name: districtName, lgdCode: row.districtCode } : null;
  const blank = <T>(): LocationField<T> => field<T>(null, null, null, 0); const named = (value: string | null): LocationField<{ name: string }> => field(value ? { name: value } : null, value ? source : null, value ? sourceId : null, value ? 0.96 : 0); const namedGovernment = (value: string | null, code: string | null): LocationField<{ name: string; lgdCode: string | null }> => field(value ? { name: value, lgdCode: code } : null, value ? source : null, value ? sourceId : null, value ? 0.96 : 0);
  return { id: row.id, name: row.name, normalizedName: row.normalizedName, entityType: row.entityType as AdministrativeLocation["entityType"], formattedAddress: [row.name, districtName, stateName, "India"].filter(Boolean).join(", ") || null, country: field({ name: "India", code: "IN" }, source, sourceId, 0.98), state: field(state, state ? source : null, state ? sourceId : null, state ? 0.99 : 0), district: field(district, district ? source : null, district ? sourceId : null, district ? 0.99 : 0), division: blank(), subDistrict: blank(), taluka: blank(), block: blank(), city: named(text(row.metadata, "cityName") ?? text(row.metadata, "city_name")), locality: named(null), sublocality: named(null), village: row.villageCode ? field({ name: row.name, lgdCode: row.villageCode }, source, sourceId, 0.99) : blank(), pincode: field(row.pincode, row.pincode ? source : null, row.pincode ? sourceId : null, row.pincode ? 0.99 : 0), urbanLocalBody: namedGovernment(text(row.metadata, "urbanLocalBody"), row.lgdCode), ruralLocalBody: namedGovernment(text(row.metadata, "ruralLocalBody"), row.lgdCode), ward: namedGovernment(text(row.metadata, "wardName"), row.lgdCode), coordinates: blank(), aliases: row.aliases, metadata: { source: row.source, stateCode: row.stateCode ?? "", districtCode: row.districtCode ?? "", subDistrictCode: row.subDistrictCode ?? "", blockCode: row.blockCode ?? "", villageCode: row.villageCode ?? "", parentId: row.parentId ?? "" } };
}

export async function loadLgdLocations(): Promise<AdministrativeLocation[]> {
  const filePath = path.join(process.cwd(), "data", "location", "lgd-normalized.json");
  try { const parsed: unknown = JSON.parse(await readFile(filePath, "utf8")); if (typeof parsed !== "object" || parsed === null || !("rows" in parsed) || !Array.isArray(parsed.rows)) return []; return parsed.rows.filter((row): row is LgdRow => typeof row === "object" && row !== null && typeof (row as Record<string, unknown>).name === "string").filter((row) => row.isActive !== false).map(toLocation); } catch { return []; }
}

export function lgdMatches(locations: AdministrativeLocation[], query: string, context: LocationContext): AdministrativeLocation[] {
  const normalized = query.toLocaleLowerCase(); const pincode = normalized.match(/\b\d{6}\b/)?.[0]; return locations.filter((location) => location.aliases.some((alias) => normalized.includes(alias.toLocaleLowerCase())) || normalized.includes(location.normalizedName) || Boolean(pincode && location.pincode.value === pincode) || Boolean(context.pincode && location.pincode.value === context.pincode));
}
