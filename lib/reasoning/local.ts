import type { IntentResponse, StructuredIntent } from "@/lib/reasoning/types";

const ROAD_INTENT: StructuredIntent = {
  issue: "Road construction and repair records",
  location: "Nashik district, Maharashtra",
  state: "Maharashtra",
  district: "Nashik",
  category: "Rural development",
  requestedInformation: [
    "Sanctioned amount and approval date",
    "Work order and estimated cost",
    "Contractor name and tender details",
    "Payments released against the work",
  ],
  timePeriod: "The last 5 financial years",
};

const SCHOOL_INTENT: StructuredIntent = {
  ...ROAD_INTENT,
  issue: "School facilities and expenditure records",
  category: "School education",
  requestedInformation: [
    "Funds sanctioned for the school",
    "Work orders and contractor details",
    "Bills and payments released",
    "Completion report and current status",
  ],
};

const WATER_INTENT: StructuredIntent = {
  ...ROAD_INTENT,
  issue: "Village water supply records",
  category: "Water supply and sanitation",
  requestedInformation: [
    "Project approval and sanctioned amount",
    "Name of the implementing agency",
    "Contractor and work order details",
    "Payments and completion records",
  ],
};

function inferLocation(text: string): string {
  const normalized = text.toLowerCase();
  if (normalized.includes("nashik") || normalized.includes("नाशिक")) {
    return "Nashik district, Maharashtra";
  }
  if (normalized.includes("maharashtra") || normalized.includes("महाराष्ट्र")) {
    return "Maharashtra";
  }
  return "Nashik district, Maharashtra (confirm location)";
}

export function createLocalIntent(text: string): StructuredIntent {
  const normalized = text.toLowerCase();
  const base = normalized.includes("school") || normalized.includes("विद्यालय") || normalized.includes("शाळा")
    ? SCHOOL_INTENT
    : normalized.includes("water") || normalized.includes("पानी") || normalized.includes("पाणी")
      ? WATER_INTENT
      : ROAD_INTENT;

  return {
    ...base,
    location: inferLocation(text),
    state: "Maharashtra",
    district: "Nashik",
  };
}

export function createLocalIntentResponse(text: string, notice: string | null = null): IntentResponse {
  return {
    intent: createLocalIntent(text),
    source: "local-fallback",
    notice,
  };
}
