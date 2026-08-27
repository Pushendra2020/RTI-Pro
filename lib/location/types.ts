export type LocationEntityType =
  | "STATE" | "DISTRICT" | "DIVISION" | "SUB_DISTRICT" | "TALUKA" | "TEHSIL" | "BLOCK"
  | "VILLAGE" | "CITY" | "TOWN" | "LOCALITY" | "SUBLOCALITY" | "MUNICIPAL_CORPORATION"
  | "MUNICIPAL_COUNCIL" | "NAGAR_PANCHAYAT" | "GRAM_PANCHAYAT" | "WARD" | "PINCODE";

export type LocationSource = "USER" | "GOOGLE_GEOCODING" | "DATA_GOV_IN" | "LGD" | "NOMINATIM" | "LOCAL_DATASET";

export interface LocationField<T> {
  value: T | null;
  source: LocationSource | null;
  sourceId: string | null;
  confidence: number;
}

export interface AdministrativeLocation {
  id: string;
  name: string;
  normalizedName: string;
  entityType: LocationEntityType;
  formattedAddress: string | null;
  country: LocationField<{ name: string; code: string }>;
  state: LocationField<{ name: string; lgdCode: string | null }>;
  district: LocationField<{ name: string; lgdCode: string | null }>;
  division: LocationField<{ name: string; lgdCode: string | null }>;
  subDistrict: LocationField<{ name: string; lgdCode: string | null }>;
  taluka: LocationField<{ name: string; lgdCode: string | null }>;
  block: LocationField<{ name: string; lgdCode: string | null }>;
  city: LocationField<{ name: string }>;
  locality: LocationField<{ name: string }>;
  sublocality: LocationField<{ name: string }>;
  village: LocationField<{ name: string; lgdCode: string | null }>;
  pincode: LocationField<string>;
  urbanLocalBody: LocationField<{ name: string; lgdCode: string | null }>;
  ruralLocalBody: LocationField<{ name: string; lgdCode: string | null }>;
  ward: LocationField<{ name: string; lgdCode: string | null }>;
  coordinates: LocationField<{ latitude: number; longitude: number }>;
  aliases: string[];
  metadata: Record<string, string>;
}

export interface LocationCandidate {
  location: AdministrativeLocation;
  reason: string;
}

export interface LocationResolution {
  status: "resolved" | "ambiguous" | "not_found";
  confidence: number;
  originalQuery: string;
  source: { geocoder: "google" | "nominatim" | null; administrative: "lgd" | "local_dataset" | null; fallback: "nominatim" | null };
  resolved: AdministrativeLocation | null;
  candidates: LocationCandidate[];
  notice: string | null;
}

export interface LocationContext {
  state?: string;
  district?: string;
  city?: string;
  pincode?: string;
}
