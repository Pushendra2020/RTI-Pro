const supportedAudioTypes: Record<string, string> = {
  "audio/aac": "aac",
  "audio/amr": "amr",
  "audio/flac": "flac",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/webm": "webm",
  "audio/x-aac": "aac",
  "audio/x-flac": "flac",
  "audio/x-m4a": "m4a",
  "audio/x-wav": "wav",
  "audio/x-ms-wma": "wma",
  "audio/wma": "wma",
};

export const MAX_SPEECH_RECORDING_SECONDS = 25;

export function speechAudioMetadata(mimeType: string): { mimeType: string; extension: string } {
  const baseType = mimeType.toLowerCase().split(";", 1)[0]?.trim() ?? "";
  const extension = supportedAudioTypes[baseType] ?? "webm";
  return {
    mimeType: baseType || "audio/webm",
    extension,
  };
}
