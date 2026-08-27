import { hasSarvamSpeechKey, transcribeWithSarvam } from "@/lib/speech/sarvam";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  if (!(file instanceof File)) {
    return Response.json({ error: "An audio file is required." }, { status: 400 });
  }
  if (file.size === 0 || file.size > 10 * 1024 * 1024) {
    return Response.json({ error: "Audio must be between 1 byte and 10 MB." }, { status: 400 });
  }

  try {
    const result = await transcribeWithSarvam(file, typeof language === "string" ? language : "English");
    if (!result.transcript) {
      return Response.json({ error: "Sarvam returned an empty transcript." }, { status: 422 });
    }
    return Response.json({
      transcript: result.transcript,
      languageCode: result.languageCode,
      source: "sarvam",
      notice: null,
    });
  } catch {
    return Response.json({ error: "Sarvam could not transcribe this recording." }, { status: 502 });
  }
}
