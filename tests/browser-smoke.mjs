import { chromium } from "file:///C:/Users/lilis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";

const baseUrl = process.env.EXPERIMENT_URL || "http://127.0.0.1:8088/";
const participantId = "P-ABCD-EFGH-JKLM";
const smokeUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}pid=${participantId}&wave=T2&debug=1&fast=1&smoke=1`;
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

const waitForText = (text) => page.getByText(text, { exact: false }).first().waitFor({ state: "visible" });

await page.goto(smokeUrl, { waitUntil: "networkidle" });
await waitForText(participantId);
assert.equal(await page.locator("input[type='email']").count(), 0);
assert.equal(await page.getByText("WeChat", { exact: false }).count(), 0);
await page.locator("input[name='adult_confirmation']").check();
await page.locator("input[name='id_confirmation']").check();
await page.getByRole("button", { name: "Start experiment" }).click();
await page.getByRole("button", { name: "Enter full screen" }).click();

const firstTask = await page.locator("h1").first().innerText();
const taskOrder = await page.evaluate(() => window.EXPERIMENT_STATE.taskOrder);
assert.equal(firstTask, taskOrder === "BART_LEXICAL" ? "Balloon Task" : "English Lexical Decision");

async function completeBart() {
  await page.getByRole("button", { name: "Start practice" }).click();
  await page.keyboard.press("Enter");
  await waitForText("Formal Balloon Task");
  await page.getByRole("button", { name: "Start formal task" }).click();
  await page.keyboard.press("Space");
  await page.waitForTimeout(25);
  await page.keyboard.press("Space");
  await page.getByText("Popped", { exact: true }).first().waitFor({ state: "visible" });
}

async function completeLexical() {
  await page.getByRole("button", { name: "Start task" }).click();
  await waitForText("way");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(25);
  await waitForText("woy");
  await page.keyboard.press("ArrowLeft");
}

if (taskOrder === "BART_LEXICAL") {
  await completeBart();
  await waitForText("English Lexical Decision");
  await completeLexical();
} else {
  await completeLexical();
  await waitForText("Balloon Task");
  await completeBart();
}

await page.waitForTimeout(1000);
if (await page.getByRole("button", { name: "Continue to questionnaires" }).count() > 0) {
  await page.getByRole("button", { name: "Continue to questionnaires" }).click();
}
await waitForText("Questionnaires and background information");
assert.match(await page.locator("#answered-count").innerText(), /^0 of 35 answered$/);
assert.equal(await page.getByText("Music Reward Questionnaire", { exact: true }).count(), 1);
assert.equal(await page.getByText("Background information", { exact: true }).count(), 1);

await page.getByRole("button", { name: "Submit all responses" }).click();
assert.match(await page.locator("#form-error").innerText(), /answer every required question/i);
assert.equal(await page.locator(".form-question.missing").count(), 1);

for (const fieldset of await page.locator("fieldset.form-question").all()) {
  await fieldset.locator("input[type='radio']").first().check();
}
for (const input of await page.locator(".form-question > input").all()) {
  const type = await input.getAttribute("type");
  if (type === "number") {
    const minimum = Number(await input.getAttribute("min") || 0);
    await input.fill(String(Math.max(minimum, 20)));
  } else {
    await input.fill("test response");
  }
}
if (!/^35 of 35 answered$/.test(await page.locator("#answered-count").innerText())) {
  console.log("FORM_ERRORS:", errors);
}
assert.match(await page.locator("#answered-count").innerText(), /^35 of 35 answered$/);
await page.screenshot({ path: "tests/smoke-long-form.png", fullPage: true });
await page.getByRole("button", { name: "Submit all responses" }).click();

await waitForText("Saving data");
assert.equal(await page.locator(".upload-file").count(), 5);
await waitForText("Finished");
assert.equal(errors.length, 0, errors.join("\n"));

const state = await page.evaluate(() => window.EXPERIMENT_STATE);
assert.equal(state.participant.studyId, participantId);
assert.equal(state.participant.wave, "T2");
assert.equal("contact" in state.participant, false);
assert.equal("email" in state.participant, false);
assert.equal(state.questionnaireRows.length, 35);
assert.equal(state.exports.length, 5);
assert.deepEqual(state.exports.map((file) => file.type), ["summary", "bart_trials", "bart_actions", "lexical_trials", "questionnaire"]);
assert.ok(state.exports.every((file) => file.filename.startsWith(`${participantId}_T2_`)));
assert.ok(state.exports.every((file) => !file.csv.includes("participant_contact")));
assert.ok(state.exports.every((file) => !file.csv.includes("participant_email")));
const formalSummary = state.rows.find((row) => row.row_type === "bart_balloon" && row.phase === "formal");
assert.equal(formalSummary.pumps, 2);
assert.equal(formalSummary.explosion, 1);

await page.screenshot({ path: "tests/smoke-long-form-finished.png", fullPage: true });
const researcherPage = await context.newPage();
await researcherPage.goto(new URL("researcher/", baseUrl).href, { waitUntil: "networkidle" });
await researcherPage.getByRole("button", { name: "New participant" }).click();
await researcherPage.getByRole("button", { name: "New participant" }).click();
await researcherPage.getByRole("button", { name: "New participant" }).click();
await researcherPage.getByRole("button", { name: "New participant" }).click();
await researcherPage.getByRole("button", { name: "New participant" }).click();
await researcherPage.getByRole("button", { name: "New participant" }).click();
assert.equal(await researcherPage.locator("#roster-body tr").count(), 6);
assert.match(await researcherPage.locator("#roster-body tr strong").first().innerText(), /^P-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
const orderLabels = await researcherPage.locator("#roster-body tr td:nth-child(3)").allTextContents();
assert.equal(orderLabels.filter((value) => value === "BART first").length, 3);
assert.equal(orderLabels.filter((value) => value === "Lexical first").length, 3);
assert.equal(await researcherPage.evaluate(() => Object.keys(localStorage).some((key) => key.includes("roster"))), false);

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await mobileContext.newPage();
await mobilePage.goto(smokeUrl, { waitUntil: "networkidle" });
await mobilePage.screenshot({ path: "tests/smoke-mobile-longitudinal-entry.png", fullPage: true });
await mobileContext.close();
await browser.close();
console.log("Browser smoke test passed.");
