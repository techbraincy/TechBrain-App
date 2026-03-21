/**
 * Google Sheets client using the public CSV export URL.
 *
 * No API key, no service account, no Google Cloud setup required.
 *
 * Requirements:
 * - The Google Sheet must be set to "Anyone with the link can view"
 *   (Share → General access → "Anyone with the link" → Viewer)
 *
 * The spreadsheet ID is the long string in the sheet URL:
 *   docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
 */

/**
 * Extracts the sheet/tab name from a range notation.
 * "Sheet1"        → "Sheet1"
 * "Sheet1!A1:Z100" → "Sheet1"
 * "My Tab!B2:D50"  → "My Tab"
 */
function sheetNameFromRange(rangeNotation: string): string {
  return rangeNotation.includes("!") ? rangeNotation.split("!")[0] : rangeNotation;
}

/**
 * Parse a single CSV line, handling quoted fields and escaped quotes.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else if (ch === "\r") {
      // skip carriage returns (Windows line endings)
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parse a full CSV string into a 2D array of strings.
 */
function parseCSV(csv: string): string[][] {
  return csv
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map(parseCSVLine);
}

/**
 * Fetch all rows from a Google Sheet as a 2D string array.
 * Returns null if the sheet is not publicly accessible.
 * Throws on network or parse errors.
 */
export async function fetchSheetData(
  spreadsheetId: string,
  rangeNotation: string
): Promise<string[][] | null> {
  const sheetName = sheetNameFromRange(rangeNotation);

  const url =
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export` +
    `?format=csv&sheet=${encodeURIComponent(sheetName)}`;

  const res = await fetch(url, {
    // Prevent Next.js from caching this at the fetch layer —
    // our DB-level cache handles freshness instead.
    cache: "no-store",
    headers: { Accept: "text/csv" },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      'Sheet is not publicly accessible. ' +
      'In Google Sheets: Share → General access → "Anyone with the link" → Viewer.'
    );
  }

  if (!res.ok) {
    throw new Error(`Google Sheets export failed: HTTP ${res.status}`);
  }

  // If the sheet is private, Google redirects to a login page (HTML, not CSV).
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    throw new Error(
      'Sheet returned an HTML page instead of CSV — it is likely private. ' +
      'Set sharing to "Anyone with the link can view".'
    );
  }

  const csv = await res.text();
  if (!csv.trim()) return [];

  return parseCSV(csv);
}
