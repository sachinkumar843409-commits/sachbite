// ============================================================
// Menu PDF extractor — suggests {name, price} pairs from an
// uploaded menu PDF's text. This is a HEURISTIC, not a guarantee:
// PDF menus vary wildly in layout (tables, columns, decorative
// fonts, prices as images), so results MUST be reviewed/edited by
// the admin before anything is added to the real menu. Nothing in
// this file writes to the database or the live menu.
// ============================================================

const pdfParse = require("pdf-parse");

// Matches a price token: optional ₹/Rs/INR prefix, digits, optional decimal.
// Grouped so we can pull the numeric value out separately from the prefix.
const PRICE_PATTERN = /(?:₹|rs\.?|inr)?\s?(\d{2,4}(?:\.\d{1,2})?)\s*(?:\/-)?$/i;

// Lines that are almost certainly NOT menu items (headers, addresses, phone
// numbers, page furniture) — skip these outright so they don't pollute results.
const SKIP_LINE_PATTERNS = [
  /^page\s+\d+/i,
  /^menu$/i,
  /^www\./i,
  /^http/i,
  /^\+?\d[\d\s-]{8,}$/, // phone-number-shaped lines
  /^[-–—_=]{3,}$/, // divider lines
];

function cleanName(raw) {
  return raw
    .replace(/[.\-–—_]{2,}/g, " ") // dotted leaders like "Veg Biryani....."
    .replace(/[\s.\-–—_:]+$/, "") // trailing separator/dash/colon right before the price
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Extracts candidate menu items from raw PDF text.
 * Returns an array of { name, price, sourceLine } — sourceLine is kept so
 * the admin UI can show what the extraction was based on, for easy review.
 */
function extractMenuItemsFromText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const results = [];

  for (const line of lines) {
    if (line.length < 3 || line.length > 80) continue;
    if (SKIP_LINE_PATTERNS.some((p) => p.test(line))) continue;

    const match = line.match(PRICE_PATTERN);
    if (!match) continue;

    const price = Number(match[1]);
    if (!price || price < 10 || price > 9999) continue; // sanity bounds, not a real menu price otherwise

    const namePart = cleanName(line.slice(0, match.index));
    if (!namePart || namePart.length < 2) continue;
    if (/^\d+$/.test(namePart)) continue; // name is just digits — not a real item

    results.push({ name: namePart, price, sourceLine: line });
    if (results.length >= 60) break; // sanity cap for garbled/huge PDFs
  }

  return results;
}

/**
 * Runs pdf-parse on a PDF buffer and returns extracted candidate items.
 * Throws if the PDF can't be parsed at all (e.g. scanned image with no
 * text layer) — the caller should surface that as a clear message rather
 * than silently returning an empty list, since a scanned menu needs a
 * different approach (OCR), not this text-based one.
 */
async function extractMenuFromPdfBuffer(buffer) {
  const parsed = await pdfParse(buffer);
  const text = parsed.text || "";

  if (!text.trim()) {
    const err = new Error(
      "Is PDF mein readable text nahi mila — shayad yeh scanned image hai (photo se banayi gayi PDF). Text-based PDF chahiye is feature ke liye."
    );
    err.code = "NO_TEXT_LAYER";
    throw err;
  }

  return extractMenuItemsFromText(text);
}

module.exports = { extractMenuItemsFromText, extractMenuFromPdfBuffer };
