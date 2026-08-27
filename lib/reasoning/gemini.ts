import { GoogleGenAI, Type } from "@google/genai";
import { createLocalIntentResponse } from "@/lib/reasoning/local";
import { isStructuredIntent } from "@/lib/reasoning/types";
import type { IntentRequest, IntentResponse, StructuredIntent } from "@/lib/reasoning/types";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_FALLBACK_MODEL = "gemini-3.1-flash-lite";

const intentJsonSchema = {
  type: Type.OBJECT,
  properties: {
    issue: {
      type: Type.STRING,
      description: "A concise description of the public service, project, decision, payment, or records the citizen is asking about.",
    },
    location: {
      type: Type.STRING,
      description: "The location, district, state, or local area related to the request. State when the location is uncertain.",
    },
    state: {
      type: Type.STRING,
      description: "The Indian state connected to the request, or an explicit uncertainty note when it cannot be identified.",
    },
    district: {
      type: Type.STRING,
      description: "The Indian district connected to the request, or an explicit uncertainty note when it cannot be identified.",
    },
    category: {
      type: Type.STRING,
      description: "The most likely government subject category, such as Rural development, School education, Water supply and sanitation, Revenue and land, or Public health.",
    },
    requestedInformation: {
      type: Type.ARRAY,
      description: "Specific records or facts the citizen should request from a public authority.",
      items: { type: Type.STRING },
      minItems: "1",
      maxItems: "8",
    },
    timePeriod: {
      type: Type.STRING,
      description: "The period requested by the citizen, or a clear confirmation prompt when no period was given.",
    },
  },
  required: ["issue", "location", "state", "district", "category", "requestedInformation", "timePeriod"],
  additionalProperties: false,
} as const;

function buildPrompt(request: IntentRequest): string {
  const language = request.language ?? "English";
  return `You are the intent extraction layer for Saathi, an RTI citizen assistant in India.

Convert the citizen's words into a careful structured intent for authority lookup. Do not invent a department, authority, law, fact, amount, date, or location. Preserve uncertainty in the relevant field instead of guessing. Use plain English in every output field, even when the citizen writes in Hindi or Marathi. The selected interface language is ${language}.

Return only the requested JSON object. Extract what records the citizen is actually asking for, not a complaint response. If no time period is stated, write "Not specified; confirm the period".

Citizen request:
${request.text}`;
}

function parseStructuredIntent(text: string | undefined): StructuredIntent | null {
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return isStructuredIntent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function generateWithModel(ai: GoogleGenAI, model: string, request: IntentRequest): Promise<StructuredIntent> {
  const response = await ai.models.generateContent({
    model,
    contents: buildPrompt(request),
    config: {
      temperature: 0.1,
      maxOutputTokens: 600,
      responseMimeType: "application/json",
      responseSchema: intentJsonSchema,
    },
  });

  const intent = parseStructuredIntent(response.text);
  if (!intent) throw new Error("Gemini returned an invalid structured intent");
  return intent;
}

export async function understandIntent(request: IntentRequest): Promise<IntentResponse> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const provider = process.env.MODEL_PROVIDER?.trim().toLowerCase() || "gemini";
  if (!apiKey || provider !== "gemini") {
    return createLocalIntentResponse(
      request.text,
      apiKey ? "The configured reasoning provider is not available in this build, so we used the local demo parser." : "No Gemini key is configured, so we used the local demo parser."
    );
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK_MODEL;
  const ai = new GoogleGenAI({ apiKey });

  try {
    const intent = await generateWithModel(ai, model, request);
    return { intent, source: "gemini", notice: null };
  } catch {
    if (fallbackModel && fallbackModel !== model) {
      try {
        const intent = await generateWithModel(ai, fallbackModel, request);
        return { intent, source: "gemini", notice: `The primary reasoning model was unavailable, so Saathi used ${fallbackModel}.` };
      } catch {
        // The local parser keeps the demo usable when both configured models fail.
      }
    }
    return createLocalIntentResponse(request.text, "The reasoning model was unavailable, so we used the local demo parser.");
  }
}
