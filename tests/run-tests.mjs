import assert from "node:assert/strict";
import { simulateBartActions, createSeededRng, shuffleCopy } from "../bart-logic.js";
import {
  EXPERIMENT_CONFIG,
  BART_FORMAL_CONDITIONS,
  BART_PRACTICE_CONDITIONS,
  LEXICAL_TRIALS,
  BACKGROUND_ITEMS,
  BMRQ_ITEMS,
  SURVEY_ITEMS
} from "../study-data.js";
import { DATA_COLUMNS, createDataFilename, rowsToCsv } from "../csv-utils.js";

const zeroPumpCollect = simulateBartActions(10, ["Enter"], { startingReward: 0.05 });
assert.equal(zeroPumpCollect.n_pumps, 0);
assert.equal(zeroPumpCollect.temporary_reward, 0.05);

const collected = simulateBartActions(10, ["Space", "Space", "Enter"], { startingReward: 0.05 });
assert.equal(collected.n_pumps, 2, "Enter must not count as a pump");
assert.equal(collected.pumps, 2, "Model-ready pumps must equal Space presses");
assert.equal(collected.explosion, 0, "Collected balloon must be coded explosion=0");
assert.equal(collected.popped, false);
assert.equal(collected.collected, true);
assert.equal(collected.temporary_reward, 0.15, "Base value plus two pumps should be banked");

const popped = simulateBartActions(3, ["Space", "Space", "Space"], { startingReward: 0.05 });
assert.equal(popped.n_pumps, 3);
assert.equal(popped.explosion, 1);
assert.equal(popped.popped, true);
assert.equal(popped.temporary_reward, 0);

assert.equal(BART_PRACTICE_CONDITIONS.length, 3);
assert.equal(BART_FORMAL_CONDITIONS.length, 30);
assert.ok(BART_FORMAL_CONDITIONS.every((row) => row.explosion_point >= 1 && row.explosion_point <= 128));
for (let block = 0; block < 3; block += 1) {
  const blockRows = BART_FORMAL_CONDITIONS.slice(block * 10, block * 10 + 10);
  assert.equal(blockRows.reduce((sum, row) => sum + row.explosion_point, 0) / 10, 64);
}
const shuffledA = shuffleCopy(BART_FORMAL_CONDITIONS, createSeededRng("same-seed"));
const shuffledB = shuffleCopy(BART_FORMAL_CONDITIONS, createSeededRng("same-seed"));
assert.deepEqual(shuffledA, shuffledB, "BART order must be reproducible from the recorded seed");

assert.equal(LEXICAL_TRIALS.length, 80);
assert.equal(LEXICAL_TRIALS.filter((trial) => trial.lexicality === "word").length, 40);
assert.equal(LEXICAL_TRIALS.filter((trial) => trial.lexicality === "nonword").length, 40);
assert.equal(LEXICAL_TRIALS.find((trial) => trial.lexicality === "word").correct_response, "ArrowRight");
assert.equal(LEXICAL_TRIALS.find((trial) => trial.lexicality === "nonword").correct_response, "ArrowLeft");

assert.equal(BACKGROUND_ITEMS.length, 15);
assert.equal(BMRQ_ITEMS.length, 20);
assert.equal(SURVEY_ITEMS.length, EXPERIMENT_CONFIG.surveyItemCount);
assert.deepEqual(BMRQ_ITEMS.filter((item) => item.reverse_scored).map((item) => item.id), ["BMRQ02", "BMRQ05"]);
assert.equal(new Set(SURVEY_ITEMS.map((item) => item.id)).size, SURVEY_ITEMS.length);

const filename = createDataFilename("wechat test");
assert.match(filename, /^\d{8}_\d{4}_\d{6}_wechat_test_[a-z0-9]{6}\.csv$/);
assert.ok(DATA_COLUMNS.includes("subjID"));
assert.ok(DATA_COLUMNS.includes("pumps"));
assert.ok(DATA_COLUMNS.includes("explosion"));
assert.ok(DATA_COLUMNS.includes("decision_rt_ms"));
assert.equal(DATA_COLUMNS.some((column) => column.startsWith("lake")), false);

const csv = rowsToCsv([{ task: "survey", question_id: "BMRQ01", value: 4, scored_value: 4 }]);
assert.ok(csv.includes("question_id"));
assert.equal(csv.includes("When I share music"), false, "Question prompts must not be written to CSV");

console.log("All tests passed.");
