import {
  EXPERIMENT_CONFIG,
  BART_PRACTICE_CONDITIONS,
  BART_FORMAL_CONDITIONS,
  LEXICAL_TRIALS,
  BACKGROUND_ITEMS,
  BMRQ_ITEMS
} from "./study-data.js";
import {
  createBartState,
  pumpBalloon,
  collectBalloon,
  summarizeBartTrial,
  shuffleCopy,
  createSeededRng,
  roundCurrency
} from "./bart-logic.js";
import {
  DATA_COLUMNS,
  createDataFilename,
  createSessionId,
  downloadCsv,
  rowsToCsv,
  uploadToDataPipe
} from "./csv-utils.js";

const ParameterType = window.jsPsychModule.ParameterType;
const query = new URLSearchParams(window.location.search);
const DEBUG_MODE = query.has("debug");
const FAST_MODE = query.has("fast");
const SMOKE_MODE = DEBUG_MODE && query.has("smoke");
const TIMING = {
  bartFeedbackMs: FAST_MODE ? 30 : 700,
  bartPopMs: FAST_MODE ? 20 : 320,
  lexicalFixationMs: FAST_MODE ? 20 : 750,
  lexicalResponseMs: FAST_MODE ? 500 : 3000,
  uploadDelayMs: FAST_MODE ? 40 : 900
};

const appState = {
  sessionId: createSessionId(),
  startedAtIso: new Date().toISOString(),
  filename: "pending.csv",
  rngSeed: "pending",
  participant: { code: "", contact: "", email: "" },
  rows: [],
  bartPracticeBanked: 0,
  bartFormalBanked: 0,
  debugMode: DEBUG_MODE,
  uploadComplete: false
};

window.EXPERIMENT_STATE = appState;

const jsPsych = window.initJsPsych({
  display_element: "jspsych-target",
  show_progress_bar: true,
  auto_update_progress_bar: true,
  on_finish: () => {},
  on_close: () => checkpoint()
});

window.addEventListener("beforeunload", () => checkpoint());
window.addEventListener("keydown", (event) => {
  if (event.code !== "Escape") return;
  event.preventDefault();
  checkpoint();
  jsPsych.endExperiment("The experiment was stopped. Completed rows remain in local recovery storage.");
}, true);

function checkpoint() {
  try {
    localStorage.setItem("english_bart_lexical_bmrq_checkpoint", JSON.stringify({
      session_id: appState.sessionId,
      filename: appState.filename,
      rows: appState.rows
    }));
  } catch {
    // Local storage is only a crash-recovery layer; CSV upload remains primary.
  }
}

function appendDataRow(row) {
  const defaultBlock = row.task === "participant_info" ? 0
    : row.phase === "background" ? 1
      : row.task === "bart" && row.phase === "practice" ? 2
        : row.task === "bart" && row.phase === "formal" ? 3
          : row.task === "lexical_decision" ? 4
            : row.phase === "music_reward" ? 5
              : "";
  const fullRow = {
    session_id: appState.sessionId,
    started_at_iso: appState.startedAtIso,
    filename: appState.filename,
    subject_id: appState.participant.code,
    participant_code: appState.participant.code,
    participant_contact: appState.participant.contact,
    participant_email: appState.participant.email,
    subjID: appState.participant.code,
    rng_seed: appState.rngSeed,
    block: defaultBlock,
    condition: row.condition ?? row.row_type ?? row.task,
    timestamp: new Date().toISOString(),
    row_index: appState.rows.length + 1,
    user_agent: window.navigator.userAgent,
    ...row
  };
  appState.rows.push(fullRow);
  checkpoint();
  return fullRow;
}

function appendBmrqScores() {
  const scores = Object.fromEntries(
    appState.rows
      .filter((row) => row.scale === "BMRQ" && row.row_type === "survey_item")
      .map((row) => [row.question_id, Number(row.scored_value)])
  );
  const groups = {
    musical_seeking: ["BMRQ02", "BMRQ07", "BMRQ11", "BMRQ17"],
    emotion_evocation: ["BMRQ03", "BMRQ08", "BMRQ12", "BMRQ18"],
    mood_regulation: ["BMRQ04", "BMRQ09", "BMRQ14", "BMRQ19"],
    sensory_motor: ["BMRQ05", "BMRQ10", "BMRQ15", "BMRQ20"],
    social_reward: ["BMRQ01", "BMRQ06", "BMRQ13", "BMRQ16"]
  };
  if (Object.keys(scores).length !== BMRQ_ITEMS.length) return;
  const subscaleScores = Object.fromEntries(
    Object.entries(groups).map(([name, ids]) => [name, ids.reduce((sum, id) => sum + scores[id], 0)])
  );
  const allScores = Object.values(subscaleScores);
  const output = { ...subscaleScores, total: allScores.reduce((sum, value) => sum + value, 0) };
  Object.entries(output).forEach(([name, value]) => appendDataRow({
    task: "survey_score",
    phase: "music_reward",
    row_type: "survey_score",
    scale: "BMRQ",
    score_name: name,
    score_value: value
  }));
}

function money(value) {
  return `$${roundCurrency(value).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function screenTrial(title, bodyHtml, button = "Continue") {
  return {
    type: window.jsPsychHtmlButtonResponse,
    stimulus: `<div class="screen"><section class="panel compact"><h1>${title}</h1>${bodyHtml}</section></div>`,
    choices: [button],
    button_html: (choice) => `<button class="primary-button">${choice}</button>`,
    data: { task: "screen" }
  };
}

function makeParticipantFormPlugin() {
  return class ParticipantFormPlugin {
    static info = { name: "participant-form", version: "1.0.0", data: {}, parameters: {} };

    constructor(jsPsychInstance) {
      this.jsPsych = jsPsychInstance;
    }

    trial(displayElement) {
      const start = performance.now();
      displayElement.innerHTML = `
        <div class="screen">
          <section class="panel">
            <h1>English Decision and Music Study</h1>
            <p>Complete this study on a laptop or desktop computer with a physical keyboard.</p>
            <form id="participant-form" class="form-grid" autocomplete="on">
              <div class="form-field full">
                <label for="contact">WeChat, email, or another contact method</label>
                <input id="contact" name="contact" type="text" maxlength="120" required>
              </div>
              <div class="form-field full">
                <label for="email">Email (optional, if not entered above)</label>
                <input id="email" name="email" type="email" maxlength="120">
              </div>
              <label class="consent-row full">
                <input name="adult_confirmation" type="checkbox" required>
                <span>I confirm that I am at least 18 years old and agree to take part.</span>
              </label>
              <div class="form-field full">
                <button class="primary-button" type="submit">Start</button>
                <div id="participant-error" class="error-text" aria-live="polite"></div>
              </div>
            </form>
          </section>
        </div>`;

      const form = displayElement.querySelector("#participant-form");
      const error = displayElement.querySelector("#participant-error");
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.reportValidity()) {
          error.textContent = "Please complete the required fields.";
          return;
        }
        const formData = new FormData(form);
        const participantCode = `P_${appState.sessionId.slice(-8)}`;
        appState.participant = {
          code: participantCode,
          contact: String(formData.get("contact") || "").trim(),
          email: String(formData.get("email") || "").trim()
        };
        appState.filename = createDataFilename(appState.participant.code);
        appState.rngSeed = `${appState.sessionId}_bart`;
        const rtMs = Math.round(performance.now() - start);
        appendDataRow({
          task: "participant_info",
          phase: "setup",
          row_type: "form_summary",
          rt_ms: rtMs,
          response: "submitted"
        });
        this.jsPsych.finishTrial({ task: "participant_info", rt: rtMs });
      });
    }
  };
}

function makeSurveyTrialPlugin() {
  return class SurveyTrialPlugin {
    static info = {
      name: "survey-trial",
      version: "1.0.0",
      data: {},
      parameters: {
        item: { type: ParameterType.OBJECT, default: undefined },
        trial_index: { type: ParameterType.INT, default: 1 },
        total_items: { type: ParameterType.INT, default: 1 }
      }
    };

    constructor(jsPsychInstance) {
      this.jsPsych = jsPsychInstance;
    }

    trial(displayElement, trial) {
      const { item } = trial;
      const start = performance.now();
      const optionHtml = item.options ? `
        <div class="option-list ${item.options.length > 6 ? "compact-options" : ""}">
          ${item.options.map((option) => `
            <label class="option-item">
              <input type="radio" name="survey_response" value="${escapeHtml(option.value)}" data-label="${escapeHtml(option.label)}">
              <span>${escapeHtml(option.label)}</span>
            </label>`).join("")}
        </div>` : `
        <input id="survey_text_response" name="survey_text_response" type="${item.kind === "number" ? "number" : "text"}"
          ${item.min !== undefined ? `min="${item.min}"` : ""}
          ${item.max !== undefined ? `max="${item.max}"` : ""}
          ${item.required ? "required" : ""}>`;

      displayElement.innerHTML = `
        <div class="screen">
          <form id="survey-form" class="survey-card">
            <div class="survey-progress">Item ${trial.trial_index} of ${trial.total_items}</div>
            <div class="survey-prompt">${escapeHtml(item.prompt)}</div>
            ${optionHtml}
            <button class="primary-button" type="submit">Next</button>
            <div id="survey-error" class="error-text" aria-live="polite"></div>
          </form>
        </div>`;

      const form = displayElement.querySelector("#survey-form");
      const error = displayElement.querySelector("#survey-error");
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        let response = "";
        let value = "";
        if (item.options) {
          const selected = form.querySelector("input[name='survey_response']:checked");
          if (!selected && item.required) {
            error.textContent = "Please choose one option.";
            return;
          }
          response = selected ? selected.dataset.label : "";
          value = selected ? selected.value : "";
        } else {
          const input = form.querySelector("#survey_text_response");
          if (!input.reportValidity()) return;
          response = input.value.trim();
          value = response;
        }

        const numericValue = Number(value);
        const scoredValue = item.scale === "BMRQ" && Number.isFinite(numericValue)
          ? (item.reverse_scored ? 6 - numericValue : numericValue)
          : value;
        const rtMs = Math.round(performance.now() - start);
        appendDataRow({
          task: "survey",
          phase: item.scale === "BMRQ" ? "music_reward" : "background",
          row_type: "survey_item",
          trial_index: trial.trial_index,
          rt_ms: rtMs,
          response,
          question_id: item.id,
          scale: item.scale,
          item: item.id,
          value,
          scored_value: scoredValue,
          reverse_scored: Boolean(item.reverse_scored)
        });
        if (item.id === "BMRQ20") appendBmrqScores();
        this.jsPsych.finishTrial({ task: "survey", question_id: item.id, rt: rtMs });
      });
    }
  };
}

function makeBartTrialPlugin() {
  return class BartTrialPlugin {
    static info = {
      name: "bart-trial",
      version: "1.0.0",
      data: {},
      parameters: {
        condition: { type: ParameterType.OBJECT, default: undefined },
        phase: { type: ParameterType.STRING, default: "formal" },
        trial_index: { type: ParameterType.INT, default: 1 },
        total_trials: { type: ParameterType.INT, default: 30 }
      }
    };

    constructor(jsPsychInstance) {
      this.jsPsych = jsPsychInstance;
    }

    trial(displayElement, trial) {
      const state = createBartState(trial.condition, {
        rewardPerPump: EXPERIMENT_CONFIG.bartRewardPerPump,
        startingReward: EXPERIMENT_CONFIG.bartInitialTemporaryReward,
        maxPossiblePumps: EXPERIMENT_CONFIG.bartMaximumPossiblePumps
      });
      const bankKey = trial.phase === "practice" ? "bartPracticeBanked" : "bartFormalBanked";
      const bankedTotalBefore = appState[bankKey];
      const trialStart = performance.now();
      const trialOnsetIso = new Date().toISOString();
      let decisionStart = trialStart;
      let finished = false;

      const render = () => {
        const growth = Math.min(state.actualPumps, 30);
        const width = 104 + growth * 5;
        const height = 134 + growth * 7;
        displayElement.innerHTML = `
          <div class="bart-stage">
            <section class="bart-dashboard">
              <div class="metric-card">
                <div class="label">${trial.phase === "practice" ? "Practice balloon" : "Balloon"}</div>
                <div class="value">${trial.trial_index} of ${trial.total_trials}</div>
              </div>
              <div class="metric-card">
                <div class="label">Current balloon value</div>
                <div class="value">${money(state.temporaryReward)}</div>
              </div>
              <div class="metric-card">
                <div class="label">Banked total</div>
                <div class="value">${money(appState[bankKey])}</div>
              </div>
            </section>
            <section class="bart-visual-area">
              <div class="balloon-rig">
                <div class="balloon" style="--balloon-width:${width}px; --balloon-height:${height}px"></div>
                <div class="pop-mark">POP</div>
                <div class="pump" aria-hidden="true">
                  <div class="pump-hose"></div><div class="pump-stem"></div><div class="pump-handle"></div>
                  <div class="pump-body"></div><div class="pump-base"></div>
                </div>
              </div>
            </section>
            <div class="bart-help">Space: pump &nbsp;&nbsp; Enter: collect and bank</div>
          </div>`;
        decisionStart = performance.now();
      };

      const finish = (response) => {
        if (finished) return;
        finished = true;
        window.removeEventListener("keydown", onKeyDown);
        const summary = summarizeBartTrial(state, trial.phase, trial.trial_index, bankedTotalBefore);
        appState[bankKey] = summary.banked_total;

        state.actionLog.forEach((action) => appendDataRow({
          task: "bart",
          phase: trial.phase,
          row_type: "bart_action",
          trial_index: trial.trial_index,
          trial: trial.trial_index,
          balloon_id: state.balloonId,
          schedule_id: state.scheduleId,
          explosion_point: state.explosionPoint,
          max_possible_pumps: state.maxPossiblePumps,
          reward_per_pump: state.rewardPerPump,
          starting_reward: state.startingReward,
          action: action.action,
          response: action.action,
          action_index: action.action_index,
          pump_index: action.pump_index,
          decision_rt_ms: action.decision_rt_ms,
          action_timestamp_iso: action.action_timestamp_iso,
          anticipatory: action.decision_rt_ms < 100,
          temporary_reward_before: action.temporary_reward_before,
          temporary_reward_after: action.temporary_reward_after,
          popped_after_action: action.popped_after_action,
          banked_total_before: bankedTotalBefore,
          banked_total: summary.banked_total
        }));

        appendDataRow({
          ...summary,
          row_type: "bart_balloon_summary",
          subjID: appState.participant.code,
          trial: trial.trial_index,
          reward_per_pump: state.rewardPerPump,
          starting_reward: state.startingReward,
          banked_total_before: bankedTotalBefore,
          rt_ms: Math.round(performance.now() - trialStart),
          timestamp: trialOnsetIso,
          response
        });

        const message = state.popped
          ? "The balloon popped. Nothing was added to the bank."
          : `${money(summary.temporary_reward)} was added to the bank.`;
        displayElement.innerHTML = `
          <div class="bart-stage">
            <section class="bart-dashboard">
              <div class="metric-card"><div class="label">Balloon</div><div class="value">${trial.trial_index} of ${trial.total_trials}</div></div>
              <div class="metric-card"><div class="label">Result</div><div class="value">${state.popped ? "Popped" : "Collected"}</div></div>
              <div class="metric-card"><div class="label">Banked total</div><div class="value">${money(appState[bankKey])}</div></div>
            </section>
            <section class="bart-visual-area"><div class="panel compact"><h2>${state.popped ? "Popped" : "Collected"}</h2><p>${message}</p></div></section>
            <div class="bart-help">Next balloon loading...</div>
          </div>`;
        this.jsPsych.pluginAPI.setTimeout(
          () => this.jsPsych.finishTrial({ task: "bart", phase: trial.phase }),
          TIMING.bartFeedbackMs
        );
      };

      const onKeyDown = (event) => {
        if (finished) return;
        if (event.repeat) return;
        const decisionRt = Math.round(performance.now() - decisionStart);
        if (event.code === "Space") {
          event.preventDefault();
          pumpBalloon(state, decisionRt);
          if (state.popped) {
            displayElement.querySelector(".balloon")?.classList.add("popped");
            displayElement.querySelector(".pop-mark")?.classList.add("show");
            this.jsPsych.pluginAPI.setTimeout(() => finish("popped"), TIMING.bartPopMs);
          } else {
            render();
          }
        } else if (event.code === "Enter") {
          event.preventDefault();
          collectBalloon(state, decisionRt);
          finish("collected");
        }
      };

      render();
      window.addEventListener("keydown", onKeyDown);
    }
  };
}

function makeUploadPlugin() {
  return class UploadPlugin {
    static info = { name: "upload-data", version: "1.0.0", data: {}, parameters: {} };

    constructor(jsPsychInstance) {
      this.jsPsych = jsPsychInstance;
    }

    trial(displayElement) {
      const filename = appState.filename === "pending.csv"
        ? createDataFilename(appState.participant.code)
        : appState.filename;
      appState.filename = filename;
      appState.rows.forEach((row) => { row.filename = filename; });
      const csv = rowsToCsv(appState.rows, DATA_COLUMNS);

      displayElement.innerHTML = `
        <div class="screen"><section class="panel compact"><h1>Saving data</h1>
          <div class="upload-status">
            <div id="save-status" class="status-line">Preparing ${escapeHtml(filename)}</div>
            <button id="download-copy" class="secondary-button" type="button">Download a local copy</button>
          </div>
        </section></div>`;
      displayElement.querySelector("#download-copy").addEventListener("click", () => downloadCsv(filename, csv));
      const status = displayElement.querySelector("#save-status");

      if (appState.debugMode) {
        status.textContent = "Test mode: cloud upload skipped. A local CSV copy will download.";
        downloadCsv(filename, csv);
        this.jsPsych.pluginAPI.setTimeout(
          () => this.jsPsych.finishTrial({ task: "upload", debug: true }),
          TIMING.uploadDelayMs
        );
        return;
      }

      uploadToDataPipe({ experimentID: EXPERIMENT_CONFIG.datapipeExperimentId, filename, data: csv })
        .then(() => {
          appState.uploadComplete = true;
          localStorage.removeItem("english_bart_lexical_bmrq_checkpoint");
          status.textContent = `Upload complete: ${filename}`;
          this.jsPsych.pluginAPI.setTimeout(
            () => this.jsPsych.finishTrial({ task: "upload", uploaded: true }),
            TIMING.uploadDelayMs
          );
        })
        .catch((error) => {
          status.classList.add("error");
          status.textContent = `Cloud upload failed. A local CSV copy will download. Error: ${error.message}`;
          downloadCsv(filename, csv);
          this.jsPsych.pluginAPI.setTimeout(
            () => this.jsPsych.finishTrial({ task: "upload", uploaded: false }),
            TIMING.uploadDelayMs
          );
        });
    }
  };
}

const ParticipantFormPlugin = makeParticipantFormPlugin();
const SurveyTrialPlugin = makeSurveyTrialPlugin();
const BartTrialPlugin = makeBartTrialPlugin();
const UploadPlugin = makeUploadPlugin();
const timeline = [];
const bartRngSeed = `${appState.sessionId}_bart`;
appState.rngSeed = bartRngSeed;

timeline.push({
  type: window.jsPsychFullscreen,
  fullscreen_mode: true,
  message: "<p>The experiment will switch to full screen.</p><p>Please use a physical keyboard and do not refresh the page.</p>",
  button_label: "Enter full screen"
});
timeline.push({ type: ParticipantFormPlugin });

timeline.push(screenTrial(
  "Background information",
  "<p>First, please answer a short set of demographic, musical training, and language background questions.</p>",
  "Continue"
));
const activeBackgroundItems = SMOKE_MODE ? BACKGROUND_ITEMS.slice(0, 2) : BACKGROUND_ITEMS;
activeBackgroundItems.forEach((item, index) => timeline.push({
  type: SurveyTrialPlugin,
  item,
  trial_index: index + 1,
  total_items: activeBackgroundItems.length
}));

timeline.push(screenTrial(
  "Balloon Task",
  `<p>Press <strong>Space</strong> to pump the balloon. Each successful pump adds ${money(EXPERIMENT_CONFIG.bartRewardPerPump)} to its current value.</p>
   <p>Press <strong>Enter</strong> to collect the current value. If the balloon pops first, that balloon earns nothing. The explosion point is hidden.</p>
   <p>Your goal is to bank as much money as possible. The number of pumps is not displayed.</p>`,
  "Start practice"
));
const activePracticeConditions = SMOKE_MODE ? BART_PRACTICE_CONDITIONS.slice(0, 1) : BART_PRACTICE_CONDITIONS;
activePracticeConditions.forEach((condition, index) => timeline.push({
  type: BartTrialPlugin,
  condition,
  phase: "practice",
  trial_index: index + 1,
  total_trials: activePracticeConditions.length
}));

timeline.push(screenTrial(
  "Formal Balloon Task",
  `<p>The formal task contains ${BART_FORMAL_CONDITIONS.length} balloons.</p><p>Space pumps; Enter collects. Try to bank as much as possible.</p>`,
  "Start formal task"
));
const bartRng = createSeededRng(bartRngSeed);
const formalBartOrder = [0, 1, 2].flatMap((blockIndex) =>
  shuffleCopy(BART_FORMAL_CONDITIONS.slice(blockIndex * 10, blockIndex * 10 + 10), bartRng)
);
const activeFormalBartOrder = SMOKE_MODE ? [{ ...formalBartOrder[0], explosion_point: 2 }] : formalBartOrder;
activeFormalBartOrder.forEach((condition, index) => timeline.push({
  type: BartTrialPlugin,
  condition,
  phase: "formal",
  trial_index: index + 1,
  total_trials: activeFormalBartOrder.length
}));

timeline.push(screenTrial(
  "English Lexical Decision",
  `<p>A letter string will appear after each fixation cross.</p>
   <p>Press <strong>Left Arrow</strong> for a non-word and <strong>Right Arrow</strong> for a real English word.</p>
   <p>Respond as quickly and accurately as possible. There are ${LEXICAL_TRIALS.length} trials.</p>`,
  "Start task"
));
const activeLexicalTrials = SMOKE_MODE ? LEXICAL_TRIALS.slice(0, 2) : shuffleCopy(LEXICAL_TRIALS);
activeLexicalTrials.forEach((trial, index) => {
  timeline.push({
    type: window.jsPsychHtmlKeyboardResponse,
    stimulus: '<div class="lexical-screen"><div class="fixation-cross" aria-label="fixation"></div></div>',
    choices: "NO_KEYS",
    response_ends_trial: false,
    trial_duration: TIMING.lexicalFixationMs,
    data: { task: "lexical_fixation" }
  });
  timeline.push({
    type: window.jsPsychHtmlKeyboardResponse,
    stimulus: `<div class="lexical-screen"><div class="lexical-word">${escapeHtml(trial.stimulus)}</div><div class="lexical-hint">Left: non-word &nbsp;&nbsp; Right: word</div></div>`,
    choices: ["ArrowLeft", "ArrowRight"],
    trial_duration: TIMING.lexicalResponseMs,
    data: { task: "lexical_decision", trial_index: index + 1 },
    on_finish: (data) => {
      const timedOut = data.response === null;
      const correct = !timedOut && jsPsych.pluginAPI.compareKeys
        ? jsPsych.pluginAPI.compareKeys(data.response, trial.correct_response)
        : data.response === trial.correct_response;
      appendDataRow({
        task: "lexical_decision",
        phase: "formal",
        row_type: "lexical_trial",
        trial_index: index + 1,
        trial: index + 1,
        rt_ms: timedOut ? "" : data.rt,
        response: timedOut ? "timeout" : data.response,
        accuracy: timedOut ? -1 : (correct ? 1 : 0),
        anticipatory: !timedOut && data.rt < 100,
        timeout: timedOut,
        stimulus_id: trial.stimulus_id,
        stimulus: trial.stimulus,
        lexicality: trial.lexicality,
        correct_response: trial.correct_response
      });
    }
  });
});

timeline.push(screenTrial(
  "Music Reward Questionnaire",
  `<p>Please indicate how strongly you agree or disagree with each statement about music.</p><p>There are ${BMRQ_ITEMS.length} items.</p>`,
  "Start questionnaire"
));
const activeBmrqItems = SMOKE_MODE ? [BMRQ_ITEMS.at(-1)] : BMRQ_ITEMS;
activeBmrqItems.forEach((item, index) => timeline.push({
  type: SurveyTrialPlugin,
  item,
  trial_index: index + 1,
  total_items: activeBmrqItems.length
}));

timeline.push({ type: UploadPlugin });
timeline.push(screenTrial(
  "Finished",
  "<p>Your responses have been processed. Thank you for participating.</p><p>You may now close this page.</p>",
  "Finish"
));

jsPsych.run(timeline);
