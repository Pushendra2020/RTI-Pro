import type { AuthorityCandidate } from "./types";

const VERIFICATION_TIMEOUT_MS = 4500;

function isOfficialHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return host.endsWith(".gov.in") || host.endsWith(".nic.in") || host === "gov.in" || host === "nic.in";
}

export interface AuthorityVerificationResult {
  verified: boolean;
  notice: string;
}

export async function verifyAuthoritySource(candidate: AuthorityCandidate): Promise<AuthorityVerificationResult> {
  let url: URL;
  try { url = new URL(candidate.sourceUrl); } catch { return { verified: false, notice: "The authority record has an invalid official source URL." }; }
  if (url.protocol !== "https:" || !isOfficialHostname(url.hostname)) return { verified: false, notice: "The authority record is not linked to an official government domain." };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFICATION_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store", redirect: "follow", headers: { "User-Agent": "Saathi-RTI-authority-verifier/1.0" } });
    if (!response.ok) return { verified: false, notice: "The linked official source could not be reached successfully." };
    const finalUrl = new URL(response.url);
    if (finalUrl.protocol !== "https:" || !isOfficialHostname(finalUrl.hostname)) return { verified: false, notice: "The authority source redirected outside an official government domain." };
    return { verified: true, notice: "The linked official government source is reachable." };
  } catch { return { verified: false, notice: "The linked official source could not be checked right now." }; }
  finally { clearTimeout(timeout); }
}
