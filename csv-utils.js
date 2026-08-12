const STUDY_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createStudyId(randomBytes) {
  const bytes = randomBytes || secureRandomBytes(12);
  const characters = Array.from(bytes, (byte) => STUDY_ID_ALPHABET[byte % STUDY_ID_ALPHABET.length]);
  return `P-${characters.slice(0, 4).join("")}-${characters.slice(4, 8).join("")}-${characters.slice(8, 12).join("")}`;
}

export function normalizeStudyId(value) {
  return String(value || "").trim().toUpperCase();
}

export function isValidStudyId(value) {
  return /^P-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(normalizeStudyId(value));
}

export function normalizeWave(value) {
  const wave = String(value || "T1").trim().toUpperCase();
  return ["T1", "T2", "T3"].includes(wave) ? wave : "T1";
}

export function deriveTaskOrder(studyId) {
  return hashText(normalizeStudyId(studyId)) % 2 === 0 ? "BART_LEXICAL" : "LEXICAL_BART";
}

export function createSessionId(date = new Date(), randomBytes) {
  const randomPart = Array.from(randomBytes || secureRandomBytes(8), (byte) =>
    STUDY_ID_ALPHABET[byte % STUDY_ID_ALPHABET.length]
  ).join("");
  return `S-${formatDateParts(date).compact}-${randomPart}`;
}

export function createFileBase(studyId, wave, sessionId, date = new Date()) {
  const parts = formatDateParts(date);
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");
  const sessionSuffix = sanitizeFilenamePart(sessionId).slice(-8) || "SESSION";
  return `${normalizeStudyId(studyId)}_${normalizeWave(wave)}_${parts.date}_${parts.hourMinute}${parts.seconds}_${milliseconds}_${sessionSuffix}`;
}

export function createDataFilename(fileBase, fileType) {
  const type = sanitizeFilenamePart(fileType).toLowerCase() || "data";
  return `${sanitizeFilenamePart(fileBase)}__${type}.csv`;
}

export function rowsToCsv(rows, columns) {
  const selectedColumns = columns || collectColumns(rows);
  const lines = [selectedColumns.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(selectedColumns.map((column) => csvCell(row[column])).join(","));
  }
  return `\uFEFF${lines.join("\n")}`;
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function uploadToDataPipe({ experimentID, filename, data }) {
  const response = await fetch("https://pipe.jspsych.org/api/data/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ experimentID, filename, data })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    const message = body.message || body.error || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

export function sanitizeFilenamePart(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function secureRandomBytes(length) {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(bytes);
  for (let index = 0; index < length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  return bytes;
}

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function collectColumns(rows) {
  const columns = [];
  const seen = new Set();
  rows.forEach((row) => Object.keys(row).forEach((column) => {
    if (!seen.has(column)) {
      seen.add(column);
      columns.push(column);
    }
  }));
  return columns;
}

function csvCell(value) {
  if (value === undefined || value === null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function formatDateParts(date) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return {
    compact: `${yyyy}${mm}${dd}${hh}${mi}${ss}`,
    date: `${yyyy}${mm}${dd}`,
    hourMinute: `${hh}${mi}`,
    seconds: ss
  };
}
