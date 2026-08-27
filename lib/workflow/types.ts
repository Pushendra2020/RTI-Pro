import { isAuthorityCandidate } from "@/lib/authority/types";
import type { AuthorityCandidate } from "@/lib/authority/types";
import { isStructuredIntent } from "@/lib/reasoning/types";
import type { StructuredIntent } from "@/lib/reasoning/types";
import { isOfficialContextResult } from "@/lib/rag/types";
import type { OfficialContextResult } from "@/lib/rag/types";

export type WorkflowStatus = "running" | "needs_clarification" | "awaiting_confirmation" | "blocked" | "submitted";

export interface WorkflowInput {
  sessionId: string;
  inputText: string;
  inputLanguage: string;
  confirmed?: boolean;
}

export interface WorkflowState {
  sessionId: string;
  inputText: string;
  inputLanguage: string;
  intent: StructuredIntent | null;
  clarificationQuestions: string[];
  authorityCandidates: AuthorityCandidate[];
  selectedAuthority: AuthorityCandidate | null;
  officialContext: OfficialContextResult | null;
  draft: string;
  validationIssues: string[];
  status: WorkflowStatus;
  reasoningNotice: string | null;
  authorityNotice: string | null;
  ragNotice: string | null;
  userConfirmed: boolean;
  applicationId: string | null;
  trace: string[];
}

export type WorkflowResponse = WorkflowState;

export function isWorkflowResponse(value: unknown): value is WorkflowResponse {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.sessionId === "string"
    && typeof record.inputText === "string"
    && typeof record.inputLanguage === "string"
    && (record.intent === null || isStructuredIntent(record.intent))
    && Array.isArray(record.clarificationQuestions)
    && record.clarificationQuestions.every((question) => typeof question === "string")
    && Array.isArray(record.authorityCandidates)
    && record.authorityCandidates.every(isAuthorityCandidate)
    && (record.selectedAuthority === null || isAuthorityCandidate(record.selectedAuthority))
    && (record.officialContext === null || isOfficialContextResult(record.officialContext))
    && typeof record.draft === "string"
    && Array.isArray(record.validationIssues)
    && record.validationIssues.every((issue) => typeof issue === "string")
    && (record.status === "running" || record.status === "needs_clarification" || record.status === "awaiting_confirmation" || record.status === "blocked" || record.status === "submitted")
    && (record.reasoningNotice === null || typeof record.reasoningNotice === "string")
    && (record.authorityNotice === null || typeof record.authorityNotice === "string")
    && (record.ragNotice === null || typeof record.ragNotice === "string")
    && typeof record.userConfirmed === "boolean"
    && (record.applicationId === null || typeof record.applicationId === "string")
    && Array.isArray(record.trace)
    && record.trace.every((node) => typeof node === "string");
}
