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
import {
  createStudyId,
  normalizeStudyId,
  isValidStudyId,
  normalizeWave,
  deriveTaskOrder,
  createSessionId,
  createFileBase,
  createDataFilename,
  rowsToCsv
} from "../csv-utils.js";

const zeroPumpCollect = simulateBartActions(10, ["Enter"], { startingReward: 0.05 });
assert.equal(zeroPumpCollect.n_pumps, 0);
assert.equal(zeroPumpCollect.temporary_reward, 0.05);

const collected = simulateBartActions(10, ["Space", "Space", "Enter"], { startingReward: 0.05 });
assert.equal(collected.n_pumps, 2, "Enter must not count as a pump");
assert.equal(collected.pumps, 2);
assert.equal(collected.explosion, 0);
assert.equal(collected.temporary_reward, 0.15);

const popped = simulateBartActions(3, ["Space", "Space", "Space"], { startingReward: 0.05 });
assert.equal(popped.n_pumps, 3);
assert.equal(popped.explosion, 1);
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
assert.deepEqual(shuffledA, shuffledB);

assert.equal(LEXICAL_TRIALS.length, 80);
assert.equal(LEXICAL_TRIALS.filter((trial) => trial.lexicality === "word").length, 40);
assert.equal(LEXICAL_TRIALS.filter((trial) => trial.lexicality === "nonword").length, 40);
assert.equal(BACKGROUND_ITEMS.length, 15);
assert.equal(BMRQ_ITEMS.length, 20);
assert.equal(SURVEY_ITEMS.length, EXPERIMENT_CONFIG.surveyItemCount);
assert.deepEqual(BMRQ_ITEMS.filter((item) => item.reverse_scored).map((item) => item.id), ["BMRQ02", "BMRQ05"]);

const deterministicId = createStudyId(Uint8Array.from({ length: 12 }, (_, index) => index));
assert.equal(deterministicId, "P-ABCD-EFGH-JKLM");
assert.equal(isValidStudyId(deterministicId), true);
assert.equal(isValidStudyId("P-ABCI-EFGH-JKLM"), false, "Ambiguous I must be rejected");
assert.equal(normalizeStudyId(" p-abcd-efgh-jklm "), deterministicId);
assert.equal(normalizeWave("t2"), "T2");
assert.equal(normalizeWave("unexpected"), "T1");
assert.equal(deriveTaskOrder(deterministicId), deriveTaskOrder(deterministicId));
assert.ok(["BART_LEXICAL", "LEXICAL_BART"].includes(deriveTaskOrder(deterministicId)));

const fixedDate = new Date(2026, 7, 12, 14, 35, 13, 124);
const session = createSessionId(fixedDate, Uint8Array.from({ length: 8 }, (_, index) => index));
const base = createFileBase(deterministicId, "T2", session, fixedDate);
assert.match(base, /^P-ABCD-EFGH-JKLM_T2_20260812_143513_124_[A-Z0-9-]{8}$/);
assert.equal(createDataFilename(base, "bart_trials"), `${base}__bart_trials.csv`);

const csv = rowsToCsv(
  [{ study_id: deterministicId, wave: "T1", question_id: "BMRQ01", response_code: 4 }],
  ["study_id", "wave", "question_id", "response_code"]
);
assert.ok(csv.startsWith("\uFEFF"));
assert.ok(csv.includes("question_id"));
assert.equal(csv.includes("participant_contact"), false);
assert.equal(csv.includes("participant_email"), false);
assert.equal(csv.includes("When I share music"), false);

console.log("All tests passed.");
