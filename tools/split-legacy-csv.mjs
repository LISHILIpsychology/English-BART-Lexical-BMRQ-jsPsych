import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Usage: node tools/split-legacy-csv.mjs <legacy.csv> [output-directory]");
const outputDirectory = process.argv[3] || path.join(path.dirname(inputPath), `${path.basename(inputPath, ".csv")}_TIDY`);
const rows = parseCsv(fs.readFileSync(inputPath, "utf8"));
if (!rows.length) throw new Error("No data rows found.");
fs.mkdirSync(outputDirectory, { recursive: true });

const shared = ["subject_id", "session_id", "started_at_iso"];
const outputs = {
  summary: {
    rows: () => [buildSummary(rows)],
    columns: ["subject_id", "session_id", "started_at_iso", "bart_formal_balloon_count", "bart_total_pumps", "bart_explosions", "bart_adjusted_mean_pumps", "bart_banked_total", "lexical_trial_count", "lexical_responded_count", "lexical_accuracy_responded", "lexical_accuracy_all", "lexical_mean_rt_correct_ms", "bmrq_musical_seeking", "bmrq_emotion_evocation", "bmrq_mood_regulation", "bmrq_sensory_motor", "bmrq_social_reward", "bmrq_total"]
  },
  bart_trials: {
    filter: (row) => row.row_type === "bart_balloon_summary",
    columns: [...shared, "phase", "trial", "balloon_id", "schedule_id", "rng_seed", "explosion_point", "max_possible_pumps", "reward_per_pump", "starting_reward", "pumps", "n_pumps", "explosion", "popped", "collected", "temporary_reward", "banked_total_before", "banked_total", "rt_ms", "timestamp"]
  },
  bart_actions: {
    filter: (row) => row.row_type === "bart_action",
    columns: [...shared, "phase", "trial", "balloon_id", "schedule_id", "rng_seed", "explosion_point", "action_index", "action", "pump_index", "decision_rt_ms", "anticipatory", "temporary_reward_before", "temporary_reward_after", "popped_after_action", "action_timestamp_iso"]
  },
  lexical_trials: {
    filter: (row) => row.row_type === "lexical_trial",
    columns: [...shared, "trial", "stimulus_id", "stimulus", "lexicality", "correct_response", "response", "accuracy", "rt_ms", "anticipatory", "timeout", "timestamp"]
  },
  questionnaire: {
    filter: (row) => row.row_type === "survey_item" || row.row_type === "survey_score",
    columns: [...shared, "row_type", "question_id", "scale", "response", "value", "scored_value", "reverse_scored", "score_name", "score_value"]
  }
};

for (const [name, spec] of Object.entries(outputs)) {
  const selected = spec.rows ? spec.rows() : rows.filter(spec.filter);
  fs.writeFileSync(path.join(outputDirectory, `${name}.csv`), toCsv(selected, spec.columns), "utf8");
  console.log(`${name}: ${selected.length} rows`);
}

function buildSummary(allRows) {
  const first = allRows[0] || {};
  const bart = allRows.filter((row) => row.row_type === "bart_balloon_summary" && row.phase === "formal");
  const adjusted = bart.filter((row) => Number(row.explosion) === 0);
  const lexical = allRows.filter((row) => row.row_type === "lexical_trial");
  const responded = lexical.filter((row) => row.timeout !== "true" && row.response !== "timeout");
  const correct = lexical.filter((row) => Number(row.accuracy) === 1 && row.rt_ms !== "");
  const scores = Object.fromEntries(allRows.filter((row) => row.row_type === "survey_score").map((row) => [row.score_name, row.score_value]));
  const average = (values) => values.length ? values.reduce((sum, value) => sum + Number(value), 0) / values.length : "";
  return {
    subject_id: first.subject_id,
    session_id: first.session_id,
    started_at_iso: first.started_at_iso,
    bart_formal_balloon_count: bart.length,
    bart_total_pumps: bart.reduce((sum, row) => sum + Number(row.pumps), 0),
    bart_explosions: bart.reduce((sum, row) => sum + Number(row.explosion), 0),
    bart_adjusted_mean_pumps: adjusted.length ? average(adjusted.map((row) => row.pumps)).toFixed(3) : "",
    bart_banked_total: bart.at(-1)?.banked_total || "",
    lexical_trial_count: lexical.length,
    lexical_responded_count: responded.length,
    lexical_accuracy_responded: responded.length ? (responded.filter((row) => Number(row.accuracy) === 1).length / responded.length).toFixed(4) : "",
    lexical_accuracy_all: lexical.length ? (lexical.filter((row) => Number(row.accuracy) === 1).length / lexical.length).toFixed(4) : "",
    lexical_mean_rt_correct_ms: correct.length ? average(correct.map((row) => row.rt_ms)).toFixed(2) : "",
    bmrq_musical_seeking: scores.musical_seeking || "",
    bmrq_emotion_evocation: scores.emotion_evocation || "",
    bmrq_mood_regulation: scores.mood_regulation || "",
    bmrq_sensory_motor: scores.sensory_motor || "",
    bmrq_social_reward: scores.social_reward || "",
    bmrq_total: scores.total || ""
  };
}

function parseCsv(text) {
  const records = [];
  let row = [], cell = "", quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted && char === '"' && input[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(cell); records.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); records.push(row); }
  const [headers = [], ...data] = records;
  return data.filter((record) => record.some(Boolean)).map((record) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), record[index] || ""]))
  );
}

function toCsv(rows, columns) {
  const lines = [columns.join(",")];
  rows.forEach((row) => lines.push(columns.map((column) => csvCell(row[column])).join(",")));
  return `\uFEFF${lines.join("\n")}`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
