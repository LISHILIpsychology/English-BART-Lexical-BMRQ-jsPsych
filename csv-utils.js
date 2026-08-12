export const DATA_COLUMNS = [
  "session_id",
  "started_at_iso",
  "filename",
  "subject_id",
  "participant_code",
  "participant_contact",
  "participant_email",
  "row_index",
  "task",
  "phase",
  "block",
  "condition",
  "row_type",
  "trial_index",
  "subjID",
  "trial",
  "rt",
  "rt_ms",
  "decision_rt_ms",
  "timestamp",
  "action_timestamp_iso",
  "anticipatory",
  "timeout",
  "response",
  "accuracy",
  "stimulus_id",
  "stimulus",
  "lexicality",
  "correct_response",
  "balloon_id",
  "schedule_id",
  "rng_seed",
  "explosion_point",
  "max_possible_pumps",
  "reward_per_pump",
  "starting_reward",
  "n_pumps",
  "pumps",
  "explosion",
  "popped",
  "collected",
  "action",
  "action_index",
  "pump_index",
  "temporary_reward_before",
  "temporary_reward_after",
  "popped_after_action",
  "temporary_reward",
  "banked_total_before",
  "banked_total",
  "question_id",
  "scale",
  "item",
  "value",
  "scored_value",
  "reverse_scored",
  "score_name",
  "score_value",
  "action_log",
  "user_agent"
];

export function createSessionId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `sess_${formatDateParts(new Date()).compact}_${randomPart}`;
}

export function createDataFilename(contact = "anonymous") {
  const now = new Date();
  const parts = formatDateParts(now);
  const contactPart = sanitizeFilenamePart(contact || "anonymous").slice(0, 18) || "anonymous";
  const randomPart = Math.random().toString(36).slice(2, 8).padEnd(6, "x");
  const fractional = String(now.getMilliseconds()).padStart(3, "0") + String(Math.floor(Math.random() * 10));
  return `${parts.date}_${parts.hourMinute}_${parts.seconds}${fractional}_${contactPart}_${randomPart}.csv`;
}

export function rowsToCsv(rows, columns = DATA_COLUMNS) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(","));
  }
  return lines.join("\n");
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
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function csvCell(value) {
  if (value === undefined || value === null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
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
