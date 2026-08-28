"use client";

import Link from "next/link";
import { useState } from "react";

interface StoredApplication { registrationNumber?: string; submittedAt?: string; department?: { name?: string } | null; publicAuthority?: { publicAuthority?: string } | null; submission?: { status?: string } }

export default function TrackPage() {
  const [id, setId] = useState("");
  const [found, setFound] = useState<StoredApplication | null>(null);
  const lookup = () => { try { const value: unknown = JSON.parse(window.localStorage.getItem("rti-manual-draft") ?? "null"); if (typeof value === "object" && value !== null && "submission" in value && typeof value.submission === "object" && value.submission !== null && "registrationNumber" in value.submission && value.submission.registrationNumber === id.trim()) setFound(value as StoredApplication); else setFound(null); } catch { setFound(null); } };
  return <main className="mx-auto max-w-[760px] px-5 py-12 sm:px-8"><Link href="/" className="text-sm font-semibold text-[#526158] underline decoration-[#b8c8bc] underline-offset-4">← Saathi home</Link><p className="mt-12 text-xs font-semibold uppercase tracking-[0.2em] text-[#ec6a2c]">Application tracking</p><h1 className="mt-3 text-5xl font-semibold tracking-[-0.07em] text-[#13201c]">A clear status, at a glance.</h1><div className="mt-8 flex flex-col gap-3 sm:flex-row"><input className="field flex-1 font-mono" value={id} onChange={(event) => setId(event.target.value)} placeholder="MH-RTI-2026-12345" /><button className="primary-button" onClick={lookup}>Check status</button></div>{found ? <div className="mt-8 border border-[#b8c8bc] bg-[#eef4ee] p-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e5b43]">Submitted</p><p className="mt-3 text-xl font-semibold text-[#13201c]">{found.registrationNumber}</p><p className="mt-4 text-sm leading-7 text-[#526158]">Department: {found.department?.name}<br />Government office: {found.publicAuthority?.publicAuthority}<br />Date: {found.submittedAt ? new Date(found.submittedAt).toLocaleDateString("en-IN") : "—"}<br />Current status: Submitted</p></div> : <p className="mt-8 text-sm leading-6 text-[#6c7770]">Enter the application ID saved on this device. Manual applications are demo records only.</p>}</main>;
}
