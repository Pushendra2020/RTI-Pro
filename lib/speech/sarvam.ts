import { SarvamAIClient } from "sarvamai";
import type { SarvamAI } from "sarvamai";

const supportedModels: SarvamAI.SpeechToTextModel[] = ["saaras:v3", "saaras:v4"];

function languageCodeFor(language: string): SarvamAI.SpeechToTextLanguage {
  if (language === "हिन्दी" || language === "hi-IN") return "hi-IN";
  if (language === "मराठी" || language === "mr-IN") return "mr-IN";
  return "en-IN";
}

function modelForEnvironment(): SarvamAI.SpeechToTextModel {
  const configured = process.env.SARVAM_STT_MODEL?.trim();
  return configured && supportedModels.includes(configured as SarvamAI.SpeechToTextModel)
    ? configured as SarvamAI.SpeechToTextModel
    : "saaras:v3";
}

export function hasSarvamSpeechKey(): boolean {
  return Boolean(getSarvamApiKey());
}

function getSarvamApiKey(): string | null {
  return process.env.SARVAM_API_KEY?.trim()
    || process.env.SARVAM_API_SUBSCRIPTION_KEY?.trim()
    || null;
}

export async function transcribeWithSarvam(file: File, language: string): Promise<{
  transcript: string;
  languageCode: string | null;
}> {
  const model = modelForEnvironment();
  const client = new SarvamAIClient({
    apiSubscriptionKey: getSarvamApiKey() ?? undefined,
  });
  const request = {
    file,
    model,
    language_code: languageCodeFor(language),
  };
  const result = model === "saaras:v3"
    ? await client.speechToText.transcribe({ ...request, mode: "transcribe" })
    : await client.speechToText.transcribe(request);

  return {
    transcript: result.transcript.trim(),
    languageCode: result.language_code ?? null,
  };
}
