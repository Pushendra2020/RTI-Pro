import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { randomInt } from "node:crypto";
import { findAuthority } from "@/lib/authority/lookup";
import type { AuthorityCandidate } from "@/lib/authority/types";
import { understandIntent } from "@/lib/reasoning/gemini";
import type { StructuredIntent } from "@/lib/reasoning/types";
import { retrieveOfficialContext } from "@/lib/rag/pinecone";
import { createRtiDraft, validateRtiDraft } from "@/lib/workflow/draft";
import type { WorkflowInput, WorkflowState } from "@/lib/workflow/types";

export const RtiWorkflowState = Annotation.Root({
  sessionId: Annotation<string>,
  inputText: Annotation<string>,
  inputLanguage: Annotation<string>,
  userConfirmed: Annotation<boolean>,
  applicationId: Annotation<string | null>,
  intent: Annotation<StructuredIntent | null>,
  clarificationQuestions: Annotation<string[]>(),
  authorityCandidates: Annotation<AuthorityCandidate[]>(),
  selectedAuthority: Annotation<AuthorityCandidate | null>,
  authorityVerified: Annotation<boolean>,
  officialContext: Annotation<WorkflowState["officialContext"]>,
  draft: Annotation<string>(),
  validationIssues: Annotation<string[]>(),
  status: Annotation<WorkflowState["status"]>(),
  reasoningNotice: Annotation<string | null>,
  authorityNotice: Annotation<string | null>,
  ragNotice: Annotation<string | null>,
  trace: Annotation<string[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
});

type RtiState = typeof RtiWorkflowState.State;
type RtiUpdate = typeof RtiWorkflowState.Update;

function trace(node: string): string[] {
  return [node];
}

function isUnresolved(value: string): boolean {
  return value.trim().toLowerCase().startsWith("not specified");
}

function normalizeIntent(intent: StructuredIntent): StructuredIntent {
  return {
    ...intent,
    issue: intent.issue.trim(),
    location: intent.location.trim(),
    state: intent.state.trim(),
    district: intent.district.trim(),
    category: intent.category.trim(),
    requestedInformation: intent.requestedInformation.map((item) => item.trim()).filter(Boolean),
    timePeriod: intent.timePeriod.trim(),
  };
}

async function understandRequestNode(state: RtiState): Promise<RtiUpdate> {
  const result = await understandIntent({ text: state.inputText, language: state.inputLanguage });
  return {
    intent: result.intent,
    reasoningNotice: result.notice,
    status: "running",
    trace: trace("UnderstandRequest"),
  };
}

function extractEntitiesNode(state: RtiState): RtiUpdate {
  if (!state.intent) {
    return {
      validationIssues: ["The request could not be converted into structured information."],
      status: "blocked",
      trace: trace("ExtractEntities"),
    };
  }

  return { intent: normalizeIntent(state.intent), trace: trace("ExtractEntities") };
}

function resolveJurisdictionNode(state: RtiState): RtiUpdate {
  if (!state.intent) return { trace: trace("ResolveJurisdiction") };
  return { intent: normalizeIntent(state.intent), trace: trace("ResolveJurisdiction") };
}

function clarifyRequestNode(state: RtiState): RtiUpdate {
  const intent = state.intent;
  if (!intent) {
    return {
      clarificationQuestions: ["What information or records would you like to request?"],
      status: "needs_clarification",
      trace: trace("ClarifyRequest"),
    };
  }

  const questions: string[] = [];
  if (intent.category === "Government records") {
    questions.push("What public service, project, payment, or decision are the records about?");
  }
  if (isUnresolved(intent.state) || isUnresolved(intent.district)) {
    questions.push("Which state and district is this request about?");
  }
  if (isUnresolved(intent.timePeriod)) {
    questions.push("Which time period should the records cover? For example, 2022–2025 or the last three financial years.");
  }

  return {
    clarificationQuestions: questions,
    status: questions.length > 0 ? "needs_clarification" : "running",
    trace: trace("ClarifyRequest"),
  };
}

async function findAuthorityNode(state: RtiState): Promise<RtiUpdate> {
  const intent = state.intent;
  if (!intent) {
    return {
      authorityCandidates: [],
      selectedAuthority: null,
      authorityVerified: false,
      authorityNotice: "No authority can be selected until the request is understood.",
      trace: trace("FindAuthority"),
    };
  }

  if (isUnresolved(intent.state) || isUnresolved(intent.district)) {
    return {
      authorityCandidates: [],
      selectedAuthority: null,
      authorityVerified: false,
      authorityNotice: "State and district must be confirmed before we can select a public authority.",
      trace: trace("FindAuthority"),
    };
  }

  const result = await findAuthority({
    state: intent.state,
    district: intent.district,
    category: intent.category,
    issue: intent.issue,
  });

  return {
    authorityCandidates: result.candidates,
    selectedAuthority: result.candidate,
    authorityVerified: result.verified,
    authorityNotice: result.notice,
    status: result.verified ? "running" : "blocked",
    trace: trace("FindAuthority"),
  };
}

async function retrieveRulesNode(state: RtiState): Promise<RtiUpdate> {
  const intent = state.intent;
  const query = intent
    ? `${intent.issue}. ${intent.category}. ${intent.state}, ${intent.district}. ${intent.requestedInformation.join(". ")}`
    : state.inputText;
  const result = await retrieveOfficialContext(query, 4);
  return {
    officialContext: result,
    ragNotice: result.notice,
    trace: trace("RetrieveRules"),
  };
}

function generateDraftNode(state: RtiState): RtiUpdate {
  if (!state.intent) {
    return { draft: "", trace: trace("GenerateDraft") };
  }
  return {
    draft: createRtiDraft(state.intent, state.selectedAuthority),
    trace: trace("GenerateDraft"),
  };
}

function validateDraftNode(state: RtiState): RtiUpdate {
  const issues = validateRtiDraft(state.intent, state.selectedAuthority, state.draft);
  return {
    validationIssues: issues,
    status: issues.length > 0 ? "blocked" : "awaiting_confirmation",
    trace: trace("ValidateDraft"),
  };
}

function userConfirmationNode(state: RtiState): RtiUpdate {
  return {
    status: state.userConfirmed && state.validationIssues.length === 0 ? "running" : state.validationIssues.length > 0 ? "blocked" : "awaiting_confirmation",
    trace: trace("UserConfirmation"),
  };
}

function mockSubmitNode(state: RtiState): RtiUpdate {
  if (!state.userConfirmed || state.validationIssues.length > 0) {
    return { status: "blocked", trace: trace("MockSubmit") };
  }

  return {
    applicationId: `RTI-2026-${randomInt(1000, 10000)}`,
    status: "submitted",
    trace: trace("MockSubmit"),
  };
}

const graph = new StateGraph(RtiWorkflowState)
  .addNode("UnderstandRequest", understandRequestNode)
  .addNode("ExtractEntities", extractEntitiesNode)
  .addNode("ResolveJurisdiction", resolveJurisdictionNode)
  .addNode("ClarifyRequest", clarifyRequestNode)
  .addNode("FindAuthority", findAuthorityNode)
  .addNode("RetrieveRules", retrieveRulesNode)
  .addNode("GenerateDraft", generateDraftNode)
  .addNode("ValidateDraft", validateDraftNode)
  .addNode("UserConfirmation", userConfirmationNode)
  .addNode("MockSubmit", mockSubmitNode)
  .addEdge(START, "UnderstandRequest")
  .addEdge("UnderstandRequest", "ExtractEntities")
  .addEdge("ExtractEntities", "ResolveJurisdiction")
  .addEdge("ResolveJurisdiction", "ClarifyRequest")
  .addConditionalEdges("ClarifyRequest", (state) => state.clarificationQuestions.length > 0 ? END : "FindAuthority")
  .addConditionalEdges("FindAuthority", (state) => state.selectedAuthority && state.authorityVerified ? "RetrieveRules" : END)
  .addEdge("RetrieveRules", "GenerateDraft")
  .addEdge("GenerateDraft", "ValidateDraft")
  .addEdge("ValidateDraft", "UserConfirmation")
  .addConditionalEdges("UserConfirmation", (state) => state.userConfirmed && state.validationIssues.length === 0 ? "MockSubmit" : END)
  .addEdge("MockSubmit", END)
  .compile({
    name: "rti-citizen-workflow",
    description: "Serverless RTI intent, authority, official context, drafting, and validation workflow.",
  });

export async function runRtiWorkflow(input: WorkflowInput): Promise<WorkflowState> {
  const result = await graph.invoke({
    sessionId: input.sessionId,
    inputText: input.inputText,
    inputLanguage: input.inputLanguage,
    userConfirmed: input.confirmed ?? false,
    applicationId: null,
    intent: null,
    clarificationQuestions: [],
    authorityCandidates: [],
    selectedAuthority: null,
    authorityVerified: false,
    officialContext: null,
    draft: "",
    validationIssues: [],
    status: "running",
    reasoningNotice: null,
    authorityNotice: null,
    ragNotice: null,
    trace: [],
  });

  return result;
}
