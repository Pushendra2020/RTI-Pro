import type { IntentResponse, StructuredIntent } from "@/lib/reasoning/types";

const BASE_INTENT: Omit<StructuredIntent, "location" | "state" | "district"> = {
  issue: "Road construction and repair records",
  category: "Rural development",
  requestedInformation: [
    "Sanctioned amount and approval date",
    "Work order and estimated cost",
    "Contractor name and tender details",
    "Payments released against the work",
  ],
  timePeriod: "The last 5 financial years",
};

const SCHOOL_INTENT: Omit<StructuredIntent, "location" | "state" | "district"> = {
  ...BASE_INTENT,
  issue: "School facilities and expenditure records",
  category: "School education",
  requestedInformation: [
    "Funds sanctioned for the school",
    "Work orders and contractor details",
    "Bills and payments released",
    "Completion report and current status",
  ],
};

const WATER_INTENT: Omit<StructuredIntent, "location" | "state" | "district"> = {
  ...BASE_INTENT,
  issue: "Village water supply records",
  category: "Water supply and sanitation",
  requestedInformation: [
    "Project approval and sanctioned amount",
    "Name of the implementing agency",
    "Contractor and work order details",
    "Payments and completion records",
  ],
};

function inferState(text: string): string {
  const normalized = text.toLowerCase();
  if (normalized.includes("maharashtra") || normalized.includes("महाराष्ट्र")) {
    return "Maharashtra";
  }
  if (normalized.includes("nashik") || normalized.includes("नाशिक")) {
    return "Maharashtra";
  }
  return "Not specified; confirm state";
}

function inferDistrict(text: string): string {
  const normalized = text.toLowerCase();
  if (normalized.includes("nashik") || normalized.includes("नाशिक")) {
    return "Nashik";
  }
  return "Not specified; confirm district";
}

function inferLocation(text: string, state: string, district: string): string {
  if (!state.startsWith("Not specified") && !district.startsWith("Not specified")) {
    return `${district} district, ${state}`;
  }
  if (!state.startsWith("Not specified")) return state;
  if (!district.startsWith("Not specified")) return `${district} district`;
  return "Not specified; confirm location";
}

export function createLocalIntent(text: string): StructuredIntent {
  const normalized = text.toLowerCase();
  const base = normalized.includes("school") || normalized.includes("विद्यालय") || normalized.includes("शाळा")
    ? SCHOOL_INTENT
    : normalized.includes("water") || normalized.includes("पानी") || normalized.includes("पाणी")
      ? WATER_INTENT
      : BASE_INTENT;
  const state = inferState(text);
  const district = inferDistrict(text);

  return {
    ...base,
    location: inferLocation(text, state, district),
    state,
    district,
  };
}

export function createLocalIntentResponse(text: string, notice: string | null = null): IntentResponse {
  return {
    intent: createLocalIntent(text),
    source: "local-fallback",
    notice,
  };
}
