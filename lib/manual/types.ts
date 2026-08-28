import type { AuthorityCandidate } from "@/lib/authority/types";

export type ManualStep = "jurisdiction" | "department" | "authority" | "applicant" | "request" | "preferences" | "review" | "payment" | "success";

export interface RTIApplicationDraft {
  currentStep: ManualStep;
  jurisdiction: { state: string; district: string; city: string; pincode: string };
  department: { id: string; name: string; category: string } | null;
  publicAuthority: AuthorityCandidate | null;
  applicant: { fullName: string; address: string; mobile: string; email: string; emailVerified: boolean };
  request: { subject: string; informationRequested: string; structuredItems: string[] };
  informationPeriod: { type: string; from: string; to: string; description: string };
  delivery: { mode: string };
  bpl: { isBpl: boolean; proofFileName: string };
  attachments: Array<{ id: string; name: string; size: number; type: string }>;
  payment: { required: boolean; amount: number; status: "not_required" | "pending" | "paid"; transactionId: string };
  submission: { status: string; registrationNumber: string; submittedAt: string };
}

export function createManualDraft(): RTIApplicationDraft {
  return {
    currentStep: "jurisdiction",
    jurisdiction: { state: "", district: "", city: "", pincode: "" },
    department: null,
    publicAuthority: null,
    applicant: { fullName: "", address: "", mobile: "", email: "", emailVerified: false },
    request: { subject: "", informationRequested: "", structuredItems: [] },
    informationPeriod: { type: "", from: "", to: "", description: "" },
    delivery: { mode: "" },
    bpl: { isBpl: false, proofFileName: "" },
    attachments: [],
    payment: { required: true, amount: 10, status: "pending", transactionId: "" },
    submission: { status: "", registrationNumber: "", submittedAt: "" },
  };
}
