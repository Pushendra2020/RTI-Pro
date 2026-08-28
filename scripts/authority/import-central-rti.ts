import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DIRECTORY_URL = "https://rtionline.gov.in/request/allpa.php";
const DIRECTORY_SOURCE = "https://rtionline.gov.in/request/allpa.php";
const PORTAL_URL = "https://rtionline.gov.in/";

interface DirectoryRow { level: number; id: string; parentId: string; name: string; }
interface AuthorityInsert { id: string; state: string; district: string; category: string; department: string; public_authority: string; aliases: string[]; portal_name: string; portal_url: string; source_title: string; source_url: string; verified_at: string; active: boolean; }

function loadEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

function decodeHtml(value: string): string {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16))).replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)));
}

function cleanName(value: string): string { return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()); }

function attribute(row: string, name: string): string { return row.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1] ?? ""; }

function parseDirectory(html: string): DirectoryRow[] {
  const rows: DirectoryRow[] = [];
  for (const match of html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)) {
    const row = match[0];
    const level = Number(attribute(row, "data-level"));
    const id = attribute(row, "data-id");
    if (!Number.isInteger(level) || !id) continue;
    const cell = row.match(/<td\b[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "";
    const withoutToggle = cell.replace(/^[\s\S]*?<\/span>/i, "");
    const name = cleanName(withoutToggle);
    if (name) rows.push({ level, id, parentId: attribute(row, "data-parent"), name });
  }
  return rows;
}

function makeRows(rows: DirectoryRow[]): AuthorityInsert[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const importedAt = new Date().toISOString().slice(0, 10);
  return rows.filter((row) => row.level > 0).map((row) => {
    let parent = byId.get(row.parentId);
    while (parent && parent.level > 0) parent = byId.get(parent.parentId);
    const department = parent?.name ?? "Central Government Public Authorities";
    return {
      id: `central-rti-${row.level}-${row.id}`,
      state: "Central Government",
      district: "India",
      category: "Central Government",
      department,
      public_authority: row.name,
      aliases: [row.name.toLowerCase()],
      portal_name: "Central RTI Online Portal",
      portal_url: PORTAL_URL,
      source_title: "Central RTI Online public authorities directory",
      source_url: DIRECTORY_SOURCE,
      verified_at: importedAt,
      active: true,
    };
  });
}

async function main(): Promise<void> {
  loadEnv();
  const response = await fetch(DIRECTORY_URL, { headers: { "User-Agent": "Saathi-RTI-directory-import/1.0" } });
  if (!response.ok) throw new Error(`Official directory returned HTTP ${response.status}`);
  const rows = makeRows(parseDirectory(await response.text()));
  if (rows.length < 2900) throw new Error(`Parsed only ${rows.length} authorities; refusing an incomplete import.`);
  const uniqueIds = new Set(rows.map((row) => row.id));
  if (uniqueIds.size !== rows.length) throw new Error(`Official directory produced ${rows.length - uniqueIds.size} duplicate authority IDs; refusing an ambiguous import.`);
  console.log(`Parsed ${rows.length} Central RTI authority records.`);
  if (process.argv.includes("--dry-run")) return;
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: deactivateError } = await supabase.from("public_authorities").update({ active: false }).like("id", "central-rti-%");
  if (deactivateError) throw new Error(`Could not retire the previous Central RTI import: ${deactivateError.message}`);
  for (let index = 0; index < rows.length; index += 500) {
    const batch = rows.slice(index, index + 500);
    const { error } = await supabase.from("public_authorities").upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`Supabase import failed at ${index}: ${error.message}`);
    console.log(`Imported ${Math.min(index + batch.length, rows.length)}/${rows.length}`);
  }
  const { count, error } = await supabase.from("public_authorities").select("id", { count: "exact", head: true }).eq("state", "Central Government").eq("active", true);
  if (error) throw new Error(`Supabase verification failed: ${error.message}`);
  console.log(`Verified ${count ?? 0} active Central Government authority rows in Supabase.`);
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Central RTI import failed."); process.exitCode = 1; });
