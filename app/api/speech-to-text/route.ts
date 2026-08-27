import { hasSarvamSpeechKey, transcribeWithSarvam } from "@/lib/speech/sarvam";
import { speechAudioMetadata } from "@/lib/speech/audio";

export const runtime = "nodejs";
export const maxDuration = 60;

function providerStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const record = error as Record<string, unknown>;
  return typeof record.statusCode === "number" ? record.statusCode : null;
}

export async function POST(request: Request): Promise<Response> {
  if (!hasSarvamSpeechKey()) {
    return Response.json({ error: "Sarvam speech-to-text is not configured." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Audio upload must use multipart form data." }, { status: 400 });
  }

  const file = formData.get("file");
  const language = formData.get("language");
  if (!(file instanceof Blob)) {
    return Response.json({ error: "An audio file is required." }, { status: 400 });
  }
  if (file.size === 0 || file.size > 10 * 1024 * 1024) {
    return Response.json({ error: "Audio must be between 1 byte and 10 MB." }, { status: 400 });
  }

  try {
    const audioMetadata = speechAudioMetadata(file.type);
    const normalizedFile = new File(
      [await file.arrayBuffer()],
      "saathi-voice." + audioMetadata.extension,
      { type: audioMetadata.mimeType },
    );
    const result = await transcribeWithSarvam(normalizedFile, typeof language === "string" ? language : "English");
    if (!result.transcript) {
      return Response.json({ error: "Sarvam returned an empty transcript." }, { status: 422 });
    }
    return Response.json({
      transcript: result.transcript,
      languageCode: result.languageCode,
      source: "sarvam",
      notice: null,
    });
  } catch (error) {
    const status = providerStatus(error);
    const message = status === 401 || status === 403
      ? "Sarvam rejected the API key. Check SARVAM_API_KEY in your environment variables."
      : status === 400 || status === 422
        ? "Sarvam rejected this recording. Keep it under 30 seconds, check the selected language, and try again."
        : status === 429
          ? "Sarvam rate limit reached. Please wait a moment and try again."
          : "Sarvam could not transcribe this recording. Please try again or type your request.";
    const responseStatus = status === 400 || status === 422 ? 422 : status === 429 ? 429 : 502;
    return Response.json({ error: message, providerStatus: status }, { status: responseStatus });
  }
}
