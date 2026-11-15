import { z } from "zod";
import { parseCsv } from "@/lib/csv";
import {
  CLIENT_TYPE_VALUES,
  TAX_TYPE_CODES,
  type ClientType,
  type TaxType,
} from "@/lib/constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : null));

/** Add / edit form. */
export const clientSchema = z.object({
  id: z.uuid().nullable(),
  name: z.string().trim().min(1, "Enter the client name.").max(200, "Use at most 200 characters."),
  client_type: z.enum(CLIENT_TYPE_VALUES, { message: "Choose a client type." }),
  contact_person: optionalText(200),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.email("Enter a valid email address.").nullable()),
  phone: optionalText(50),
  tin: optionalText(50),
  notes: optionalText(2000),
  is_active: z.boolean(),
  tax_types: z.array(z.enum(TAX_TYPE_CODES)).min(1, "Tick at least one tax type."),
});
export type ClientInput = z.input<typeof clientSchema>;

// ---------------------------------------------------------------------------
// CSV bulk add: columns name, client_type, tax_types (e.g. "CIT;APIT;WHT").
// ---------------------------------------------------------------------------

export const CSV_HEADER = ["name", "client_type", "tax_types"] as const;
export const CSV_TEMPLATE =
  "name,client_type,tax_types\n" +
  '"ABC (Pvt) Ltd",company,CIT;APIT;WHT\n' +
  "Nimal Perera,individual,IIT\n" +
  "Silva & Sons,partnership,PIT;WHT\n";
export const MAX_IMPORT_ROWS = 1000;

export type ImportRow = {
  line: number;
  name: string;
  client_type: ClientType | null;
  tax_types: TaxType[];
  errors: string[];
};

/**
 * Parses and validates the CSV text. `existingNames` are the lower-cased names
 * already in the database (non-deleted), so duplicates can be flagged up front.
 * Names repeated inside the file are flagged on the second and later rows.
 */
export function parseClientCsv(text: string, existingNames: Set<string>) {
  const parsed = parseCsv(text);
  const fileErrors: string[] = [];

  if (parsed.length > 0 && parsed[0].cells[0]?.toLowerCase() === "name") {
    const header = parsed[0].cells.map((c) => c.toLowerCase());
    if (CSV_HEADER.some((h, i) => header[i] !== h)) {
      fileErrors.push(`The header row must be: ${CSV_HEADER.join(",")}`);
    }
    parsed.shift();
  }
  if (parsed.length === 0) fileErrors.push("The file has no client rows.");
  if (parsed.length > MAX_IMPORT_ROWS) {
    fileErrors.push(`Import at most ${MAX_IMPORT_ROWS} clients at a time.`);
  }

  const seen = new Set<string>();
  const rows: ImportRow[] = parsed.map(({ line, cells }) => {
    const errors: string[] = [];
    const [rawName = "", rawType = "", ...rest] = cells;
    // Tax types may sit in one cell ("CIT;WHT") or spill into extra columns if unquoted.
    const rawTaxes = rest.join(";");

    const name = rawName.replace(/\s+/g, " ").trim();
    const key = name.toLowerCase();
    if (!name) errors.push("Name is missing.");
    else if (name.length > 200) errors.push("Name is longer than 200 characters.");
    else if (existingNames.has(key)) errors.push("A client with this name already exists.");
    else if (seen.has(key)) errors.push("This name appears earlier in the file.");
    if (name) seen.add(key);

    const typeValue = rawType.toLowerCase();
    const client_type = (CLIENT_TYPE_VALUES as string[]).includes(typeValue)
      ? (typeValue as ClientType)
      : null;
    if (!rawType) errors.push("Client type is missing.");
    else if (!client_type) {
      errors.push(`Unknown client type "${rawType}". Use company, individual or partnership.`);
    }

    const tokens = rawTaxes
      .split(/[;|,\s]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    const unknown = tokens.filter((t) => !(TAX_TYPE_CODES as string[]).includes(t));
    const tax_types = [...new Set(tokens.filter((t) => !unknown.includes(t)))] as TaxType[];
    if (unknown.length) {
      errors.push(`Unknown tax type ${unknown.map((u) => `"${u}"`).join(", ")}. Use CIT, IIT, PIT, WHT or APIT.`);
    }
    if (tokens.length === 0) errors.push("Tax types are missing.");

    return { line, name, client_type, tax_types, errors };
  });

  return { rows, fileErrors };
}
