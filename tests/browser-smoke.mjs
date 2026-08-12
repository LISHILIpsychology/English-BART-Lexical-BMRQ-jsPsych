import { chromium } from "file:///C:/Users/lilis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";

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

const bodyText = () => page.locator("body").innerText();
const waitForText = (text) => page.getByText(text, { exact: false }).first().waitFor({ state: "visible" });

await page.goto("http://127.0.0.1:8088/?debug=1&fast=1&smoke=1", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Enter full screen" }).click();

await page.locator("#contact").fill("codex-smoke");
await page.locator("input[name='adult_confirmation']").check();
await page.getByRole("button", { name: "Start", exact: true }).click();

await page.getByRole("button", { name: "Continue" }).click();
await page.locator("#survey_text_response").fill("22");
await page.getByRole("button", { name: "Next" }).click();
await page.locator("input[name='survey_response']").first().check();
await page.getByRole("button", { name: "Next" }).click();

await page.getByRole("button", { name: "Start practice" }).click();
await page.screenshot({ path: "tests/smoke-bart.png", fullPage: true });
await page.keyboard.press("Enter");
await waitForText("Formal Balloon Task");
await page.getByRole("button", { name: "Start formal task" }).click();
await page.keyboard.press("Space");
await page.keyboard.press("Space");
await waitForText("English Lexical Decision");

await page.getByRole("button", { name: "Start task" }).click();
await waitForText("way");
await page.keyboard.press("ArrowRight");
await waitForText("woy");
await page.keyboard.press("ArrowLeft");

await waitForText("Music Reward Questionnaire");
await page.getByRole("button", { name: "Start questionnaire" }).click();
await page.locator("input[name='survey_response']").nth(3).check();
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Next" }).click();
const download = await downloadPromise;
await download.saveAs("tests/smoke-output.csv");

await waitForText("Finished");
const text = await bodyText();
assert.match(text, /Thank you for participating/);
assert.equal(errors.length, 0, errors.join("\n"));

const state = await page.evaluate(() => window.EXPERIMENT_STATE);
const formalSummary = state.rows.find((row) => row.row_type === "bart_balloon_summary" && row.phase === "formal");
assert.equal(formalSummary.pumps, 2);
assert.equal(formalSummary.explosion, 1);
assert.equal(state.rows.filter((row) => row.task === "lexical_decision").length, 2);
assert.equal(state.rows.some((row) => row.task === "fishing_bandit"), false);

await page.screenshot({ path: "tests/smoke-finished.png", fullPage: true });
const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await mobileContext.newPage();
await mobilePage.goto("http://127.0.0.1:8088/?debug=1&fast=1&smoke=1", { waitUntil: "networkidle" });
await mobilePage.screenshot({ path: "tests/smoke-mobile.png", fullPage: true });
await mobileContext.close();
await browser.close();
console.log("Browser smoke test passed.");
