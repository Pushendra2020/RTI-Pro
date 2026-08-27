import { SarvamAIClient } from "sarvamai";
import type { SarvamAI } from "sarvamai";

const supportedModels: SarvamAI.SpeechToTextModel[] = ["saaras:v3", "saaras:v4"];

function languageCodeFor(language: string): SarvamAI.SpeechToTextLanguage {
  if (language === "हिन्दी") return "hi-IN";
  if (language === "मराठी") return "mr-IN";
  return "en-IN";
}

function modelForEnvironment(): SarvamAI.SpeechToTextModel {
  const configured = process.env.SARVAM_STT_MODEL?.trim();
  return configured && supportedModels.includes(configured as SarvamAI.SpeechToTextModel)
    ? configured as SarvamAI.SpeechToTextModel
    : "saaras:v3";
}

export function hasSarvamSpeechKey(): boolean {
  return Boolean(process.env.SARVAM_API_KEY?.trim());
}

export async function transcribeWithSarvam(file: File, language: string): Promise<{
  transcript: string;
  languageCode: string | null;
}> {
  const client = new SarvamAIClient({
    apiSubscriptionKey: process.env.SARVAM_API_KEY?.trim(),
  });
  const result = await client.speechToText.transcribe({
    file,
    model: modelForEnvironment(),
    mode: "transcribe",
    language_code: languageCodeFor(language),
  });

  return {
    transcript: result.transcript.trim(),
    languageCode: result.language_code ?? null,
  };
}
