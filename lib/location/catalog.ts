import type { AdministrativeLocation, LocationField } from "./types";

function field<T>(value: T | null, confidence = value === null ? 0 : 0.82): LocationField<T> {
  return { value, source: value === null ? null : "LOCAL_DATASET", sourceId: value === null ? null : "maharashtra-pilot-catalog", confidence };
}

function location(input: {
  id: string; name: string; entityType: AdministrativeLocation["entityType"]; aliases: string[];
  district: string; city?: string; locality?: string; pincode?: string; urbanLocalBody?: string;
  latitude?: number; longitude?: number; formattedAddress: string;
}): AdministrativeLocation {
  const state = { name: "Maharashtra", lgdCode: null };
  const district = { name: input.district, lgdCode: null };
  return {
    id: input.id,
    name: input.name,
    normalizedName: input.name.toLocaleLowerCase(),
    entityType: input.entityType,
    formattedAddress: input.formattedAddress,
    country: field({ name: "India", code: "IN" }, 0.98),
    state: field(state, 0.9), district: field(district, 0.86),
    division: field<{ name: string; lgdCode: string | null }>(null), subDistrict: field<{ name: string; lgdCode: string | null }>(null), taluka: field<{ name: string; lgdCode: string | null }>(null), block: field<{ name: string; lgdCode: string | null }>(null),
    city: field(input.city ? { name: input.city } : null),
    locality: field(input.locality ? { name: input.locality } : null), sublocality: field<{ name: string }>(null),
    village: field<{ name: string; lgdCode: string | null }>(null), pincode: field(input.pincode ?? null, input.pincode ? 0.8 : 0),
    urbanLocalBody: field(input.urbanLocalBody ? { name: input.urbanLocalBody, lgdCode: null } : null),
    ruralLocalBody: field<{ name: string; lgdCode: string | null }>(null), ward: field<{ name: string; lgdCode: string | null }>(null),
    coordinates: field(input.latitude !== undefined && input.longitude !== undefined ? { latitude: input.latitude, longitude: input.longitude } : null, 0.75),
    aliases: input.aliases, metadata: { catalog: "Maharashtra pilot; replace/refresh from official LGD ingestion" },
  };
}

export const MAHARASHTRA_LOCATION_CATALOG: AdministrativeLocation[] = [
  location({ id: "pilot-nerul", name: "Nerul", entityType: "LOCALITY", aliases: ["nerul", "नेरुळ"], district: "Thane", city: "Navi Mumbai", locality: "Nerul", pincode: "400706", urbanLocalBody: "Navi Mumbai Municipal Corporation", latitude: 19.033, longitude: 73.029, formattedAddress: "Nerul, Navi Mumbai, Maharashtra, India" }),
  location({ id: "pilot-sanpada", name: "Sanpada", entityType: "LOCALITY", aliases: ["sanpada", "सानपाडा"], district: "Thane", city: "Navi Mumbai", locality: "Sanpada", pincode: "400705", urbanLocalBody: "Navi Mumbai Municipal Corporation", latitude: 19.067, longitude: 73.009, formattedAddress: "Sanpada, Navi Mumbai, Maharashtra, India" }),
  location({ id: "pilot-navi-mumbai", name: "Navi Mumbai", entityType: "CITY", aliases: ["navi mumbai", "नवी मुंबई"], district: "Thane", city: "Navi Mumbai", urbanLocalBody: "Navi Mumbai Municipal Corporation", latitude: 19.033, longitude: 73.029, formattedAddress: "Navi Mumbai, Maharashtra, India" }),
  location({ id: "pilot-pune", name: "Pune", entityType: "CITY", aliases: ["pune", "पुणे"], district: "Pune", city: "Pune", urbanLocalBody: "Pune Municipal Corporation", latitude: 18.5204, longitude: 73.8567, formattedAddress: "Pune, Maharashtra, India" }),
  location({ id: "pilot-satara", name: "Satara", entityType: "DISTRICT", aliases: ["satara", "सातारा"], district: "Satara", city: "Satara", latitude: 17.6805, longitude: 74.0183, formattedAddress: "Satara, Maharashtra, India" }),
  location({ id: "pilot-nashik", name: "Nashik", entityType: "DISTRICT", aliases: ["nashik", "nasik", "नाशिक"], district: "Nashik", city: "Nashik", latitude: 20.0059, longitude: 73.791, formattedAddress: "Nashik, Maharashtra, India" }),
];
