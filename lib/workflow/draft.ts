import type { AuthorityCandidate } from "@/lib/authority/types";
import type { StructuredIntent } from "@/lib/reasoning/types";

export function createRtiDraft(intent: StructuredIntent, authority: AuthorityCandidate | null): string {
  const recipient = authority?.department ?? "The appropriate Public Information Officer";
  const jurisdiction = intent.location.startsWith("Not specified")
    ? "the location described in my request"
    : intent.location;
  const information = intent.requestedInformation
    .map((item, index) => `${index + 1}. ${item}.`)
    .join("\n");

  return `To,\nThe Public Information Officer,\n${recipient}\n\nSubject: Request for information about ${intent.issue.toLowerCase()}\n\nPlease provide the following information regarding ${jurisdiction} for ${intent.timePeriod.toLowerCase()}:\n\n${information}\n\nPlease provide the information in electronic form where available.`;
}

export function validateRtiDraft(
  intent: StructuredIntent | null,
  authority: AuthorityCandidate | null,
  draft: string,
): string[] {
  const issues: string[] = [];
  const normalizedDraft = draft.toLowerCase();

  if (!intent) issues.push("The request intent could not be understood.");
  if (!authority) issues.push("Confirm a public authority before reviewing the draft.");
  if (draft.trim().length < 120) issues.push("The draft is too short to be a useful information request.");
  if (draft.length > 12000) issues.push("The draft is longer than the supported 12,000-character limit.");
  if (!/provide|records|information|copy/i.test(draft)) {
    issues.push("The draft should clearly ask for records or information.");
  }

  if (intent) {
    for (const item of intent.requestedInformation) {
      if (!normalizedDraft.includes(item.toLowerCase())) {
        issues.push(`The requested item “${item}” is missing from the draft.`);
      }
    }
  }

  if (/guaranteed|must approve|will definitely be paid|will certainly be repaired/i.test(normalizedDraft)) {
    issues.push("Remove guarantees or unsupported claims about what the government will do.");
  }

  return issues;
}
