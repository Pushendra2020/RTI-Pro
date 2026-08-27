import type { IntentResponse, StructuredIntent } from "@/lib/reasoning/types";

const GENERIC_INTENT: Omit<StructuredIntent, "location" | "state" | "district"> = {
  issue: "The public service, project, or decision described in the request",
  category: "Government records",
  requestedInformation: [
    "Relevant files, orders, approvals, or correspondence",
    "The name of the responsible office and officers",
    "Action taken and the current status",
  ],
  timePeriod: "Not specified; confirm the period",
};

const ROAD_INTENT: Omit<StructuredIntent, "location" | "state" | "district"> = {
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
  ...GENERIC_INTENT,
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
  ...GENERIC_INTENT,
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
  if (normalized.includes("nashik") || normalized.includes("नाशिक") || normalized.includes("mumbai") || normalized.includes("मुंबई")) {
    return "Maharashtra";
  }
  return "Not specified; confirm state";
}

function inferDistrict(text: string): string {
  const normalized = text.toLowerCase();
  if (normalized.includes("nashik") || normalized.includes("नाशिक")) {
    return "Nashik";
  }
  if (normalized.includes("mumbai") || normalized.includes("मुंबई")) {
    return "Mumbai";
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

function inferTimePeriod(text: string): string {
  const normalized = text.toLowerCase();
  const range = normalized.match(/\b(20\d{2})\s*(?:to|[-–])\s*(20\d{2})\b/);
  if (range) return range[1] + " to " + range[2];
  const years = normalized.match(/\b(?:last|past)\s+(\d+)\s+(?:financial\s+)?years?\b/);
  if (years) return "The last " + years[1] + " years";
  if (normalized.includes("पिछले 5 साल") || normalized.includes("मागील ५ वर्ष")) return "The last 5 years";
  return "Not specified; confirm the period";
}

export function createLocalIntent(text: string): StructuredIntent {
  const normalized = text.toLowerCase();
  const base = normalized.includes("school") || normalized.includes("विद्यालय") || normalized.includes("शाळा")
    ? SCHOOL_INTENT
    : normalized.includes("water") || normalized.includes("पानी") || normalized.includes("पाणी")
      ? WATER_INTENT
      : normalized.includes("road") || normalized.includes("रस्ता") || normalized.includes("सड़क")
        ? ROAD_INTENT
        : GENERIC_INTENT;
  const state = inferState(text);
  const district = inferDistrict(text);

  return {
    ...base,
    timePeriod: inferTimePeriod(text),
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
