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
  createStudyId,
  normalizeStudyId,
  isValidStudyId,
  normalizeWave,
  deriveTaskOrder,
  createSessionId,
  createFileBase,
  createDataFilename,
  downloadCsv,
  rowsToCsv,
  uploadToDataPipe
} from "./csv-utils.js";

const ParameterType = window.jsPsychModule.ParameterType;
const query = new URLSearchParams(window.location.search);
const DEBUG_MODE = query.has("debug");
const FAST_MODE = query.has("fast");
const SMOKE_MODE = DEBUG_MODE && query.has("smoke");
const REVIEW_MODE = DEBUG_MODE && query.get("review") === "1";
const suppliedStudyId = normalizeStudyId(query.get("pid"));
const invalidSuppliedId = Boolean(query.get("pid")) && !isValidStudyId(suppliedStudyId);
const initialStudyId = isValidStudyId(suppliedStudyId) ? suppliedStudyId : createStudyId();
const initialWave = normalizeWave(query.get("wave"));
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
  participant: {
    studyId: initialStudyId,
    wave: initialWave,
    idSource: isValidStudyId(suppliedStudyId) ? "invitation_link" : "generated_at_entry"
  },
  taskOrder: deriveTaskOrder(initialStudyId),
  taskOrderSequence: [],
  fileBase: "pending",
  rngSeeds: {},
  rows: [],
  questionnaireRows: [],
  bmrqScores: {},
  exports: [],
  bartPracticeBanked: 0,
  bartFormalBanked: 0,
  consentGiven: false,
  consentDeclined: false,
  debugMode: DEBUG_MODE,
  reviewMode: REVIEW_MODE,
  uploadComplete: false
};

configureParticipant(initialStudyId, initialWave);
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
  jsPsych.endExperiment("The experiment was stopped. Completed task rows remain in local recovery storage.");
}, true);

function configureParticipant(studyId, wave) {
  appState.participant.studyId = normalizeStudyId(studyId);
  appState.participant.wave = normalizeWave(wave);
  appState.taskOrder = deriveTaskOrder(appState.participant.studyId);
  appState.taskOrderSequence = appState.taskOrder === "BART_LEXICAL"
    ? ["bart", "lexical"]
    : ["lexical", "bart"];
  appState.fileBase = createFileBase(
    appState.participant.studyId,
    appState.participant.wave,
    appState.sessionId
  );
  appState.rngSeeds = {
    bart: `${appState.participant.studyId}_${appState.participant.wave}_bart`,
    lexical: `${appState.participant.studyId}_${appState.participant.wave}_lexical`
  };
}

function baseMetadata() {
  return {
    study_id: appState.participant.studyId,
    wave: appState.participant.wave,
    session_id: appState.sessionId,
    site: EXPERIMENT_CONFIG.site,
    country: EXPERIMENT_CONFIG.country,
    language_version: EXPERIMENT_CONFIG.languageVersion,
    study_version: EXPERIMENT_CONFIG.version,
    ethics_reference: EXPERIMENT_CONFIG.ethicsReference,
    consent_version: EXPERIMENT_CONFIG.consentVersion,
    task_order: appState.taskOrder,
    started_at_iso: appState.startedAtIso
  };
}

function checkpoint() {
  if (!appState.consentGiven) return;
  try {
    localStorage.setItem("english_bart_lexical_bmrq_checkpoint_v4", JSON.stringify({
      ...baseMetadata(),
      file_base: appState.fileBase,
      rows: appState.rows,
      questionnaire_rows: appState.questionnaireRows
    }));
  } catch {
    // Browser storage is only a recovery layer; OSF remains the primary destination.
  }
}

function appendDataRow(row) {
  const fullRow = {
    ...baseMetadata(),
    timestamp: new Date().toISOString(),
    ...row
  };
  appState.rows.push(fullRow);
  checkpoint();
  return fullRow;
}

function calculateBmrqScores(questionnaireRows) {
  const scores = Object.fromEntries(
    questionnaireRows
      .filter((row) => row.scale === "BMRQ")
      .map((row) => [row.question_id, Number(row.scored_value)])
  );
  if (Object.keys(scores).length !== BMRQ_ITEMS.length) return {};
  const groups = {
    musical_seeking: ["BMRQ02", "BMRQ07", "BMRQ11", "BMRQ17"],
    emotion_evocation: ["BMRQ03", "BMRQ08", "BMRQ12", "BMRQ18"],
    mood_regulation: ["BMRQ04", "BMRQ09", "BMRQ14", "BMRQ19"],
    sensory_motor: ["BMRQ05", "BMRQ10", "BMRQ15", "BMRQ20"],
    social_reward: ["BMRQ01", "BMRQ06", "BMRQ13", "BMRQ16"]
  };
  const output = Object.fromEntries(
    Object.entries(groups).map(([name, ids]) => [name, ids.reduce((sum, id) => sum + scores[id], 0)])
  );
  output.total = Object.values(output).reduce((sum, value) => sum + value, 0);
  const revisedExcluded = new Set(["BMRQ02", "BMRQ05", "BMRQ10", "BMRQ17"]);
  output.revised16_total = Object.entries(scores)
    .filter(([id]) => !revisedExcluded.has(id))
    .reduce((sum, [, value]) => sum + value, 0);
  return output;
}

function money(value) {
  return `${roundCurrency(value).toFixed(2)} task credits`;
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

function saveStudyIdCard() {
  const card = [
    "Cross-Cultural Cognition Study",
    `Study ID: ${appState.participant.studyId}`,
    `Current visit: ${appState.participant.wave}`,
    "Keep this code for the 3-month and 6-month follow-up visits.",
    "This code contains no name, email address, or phone number."
  ].join("\n");
  const blob = new Blob([card], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `STUDY_ID_${appState.participant.studyId}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

function makeParticipantFormPlugin() {
  return class ParticipantFormPlugin {
    static info = { name: "participant-form", version: "2.0.0", data: {}, parameters: {} };

    constructor(jsPsychInstance) {
      this.jsPsych = jsPsychInstance;
    }

    trial(displayElement) {
      const start = performance.now();
      if (invalidSuppliedId) {
        displayElement.innerHTML = `<div class="screen"><section class="panel compact">
          <h1>Invalid study link</h1>
          <p>The Study ID in this invitation is not valid. Please ask the researcher for a new link.</p>
        </section></div>`;
        return;
      }

      const isReturning = appState.participant.idSource === "invitation_link";
      displayElement.innerHTML = `
        <div class="screen consent-screen">
          <section class="panel participant-panel">
            <header class="consent-header">
              <span class="consent-eyebrow">Participant information and written informed consent</span>
              ${REVIEW_MODE ? '<div class="ethics-review-banner">Ethics committee preview. Recruitment and data upload are disabled.</div>' : ""}
              <h1>Risk Taking, English Lexical Processing, and Music Reward Study</h1>
              <p>Please read the information below before deciding whether to take part.</p>
            </header>
            <div class="consent-information">
              <section>
                <h2>What is this study about?</h2>
                <p>This three-wave research examines risk taking, English word recognition, and responses to music in university students in Malaysia and China. You must be a university student aged at least 18 years to participate. This is research, not a clinical or intelligence test.</p>
              </section>
              <section>
                <h2>What will I do?</h2>
                <p>You will complete a balloon decision task, an English word/non-word task, a music reward questionnaire, and brief background questions. Each visit takes approximately 30 to 40 minutes and requires a laptop or desktop computer with a physical keyboard. Follow-ups occur in approximately three and six months.</p>
              </section>
              <section>
                <h2>Are there any risks or benefits?</h2>
                <p>No risks beyond possible temporary boredom, fatigue, or mild frustration are expected. You may take a break before starting a new section. There is no guaranteed direct benefit from taking part.</p>
              </section>
              <section>
                <h2>Is participation voluntary?</h2>
                <p>Taking part is voluntary and will not affect grades, services, or your relationship with either university. You may decline now or stop without penalty. After submission, you may ask the team to delete a visit by quoting your Study ID within 30 days, unless the data have already been irreversibly de-identified or included in completed analysis.</p>
              </section>
              <section>
                <h2>How will my data be used?</h2>
                <p>The study records a pseudonymous Study ID, task responses, reaction times, questionnaire answers, and general background information. It does not ask for your name, personal email, phone/WeChat, student number, exact birth date, or precise location. Pseudonymous data are sent by HTTPS through DataPipe to a restricted OSF project. A separate encrypted Malaysia roster is used for follow-up and compensation; direct identifiers are never added to task files.</p>
              </section>
              <section>
                <h2>Compensation</h2>
                <p>The proposed compensation is RM10 per visit, subject to final ethics and budget approval. It is fixed and never depends on balloon earnings, speed, accuracy, or questionnaire answers. Electronic voucher/transfer is preferred; an optional collection point near the UM 24-hour study/library area may be offered. Final approved details will be supplied before recruitment.</p>
              </section>
              <section>
                <h2>Questions or concerns</h2>
                <p>Researcher and supervisor details will be inserted before recruitment. Participant-rights concerns may be directed to UMREC at umrec@um.edu.my or +603-7967 7022 ext. 2369. This preview is not an invitation to participate.</p>
              </section>
            </div>
            <div class="study-id-box">
              <div>
                <span class="study-id-label">Anonymous Study ID</span>
                <strong id="study-id-value">${escapeHtml(appState.participant.studyId)}</strong>
              </div>
              <div class="study-id-actions">
                <button id="copy-study-id" class="secondary-button" type="button">Copy ID</button>
                <button id="download-study-id" class="secondary-button" type="button">Download ID card</button>
                <button id="print-study-id" class="secondary-button" type="button">Print ID card</button>
              </div>
            </div>
            <p class="privacy-note">Visit: <strong>${escapeHtml(appState.participant.wave)}</strong>. This code contains no contact information. Your researcher will use the same code for follow-up invitations${isReturning ? "." : "; saving a copy is optional backup."}</p>
            <form id="participant-form" class="consent-form" novalidate>
              <div class="consent-confirmations">
                <label><input name="age_confirm" type="checkbox"><span>I confirm that I am at least 18 years old and am currently a university student.</span></label>
                <label><input name="information_confirm" type="checkbox"><span>I have read and understood the Participant Information Sheet above and know how to contact the study team.</span></label>
              </div>
              <fieldset class="consent-decision">
                <legend>Your decision</legend>
                <label class="consent-choice">
                  <input name="consent_decision" value="agree" type="radio" required>
                  <span><strong>I agree to participate.</strong> I confirm that I am at least 18 years old, have read the information above, and freely consent to take part.</span>
                </label>
                <label class="consent-choice decline-choice">
                  <input name="consent_decision" value="decline" type="radio" required>
                  <span><strong>I do not agree to participate.</strong></span>
                </label>
              </fieldset>
              <button id="start-experiment" class="primary-button" type="submit" disabled>Agree and start experiment</button>
              <div id="participant-message" class="error-text" aria-live="polite"></div>
            </form>
          </section>
        </div>`;

      const message = displayElement.querySelector("#participant-message");
      displayElement.querySelector("#copy-study-id").addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(appState.participant.studyId);
          message.className = "success-text";
          message.textContent = "Study ID copied.";
        } catch {
          message.className = "error-text";
          message.textContent = "Please write down the Study ID shown above.";
        }
      });
      displayElement.querySelector("#download-study-id").addEventListener("click", saveStudyIdCard);
      displayElement.querySelector("#print-study-id").addEventListener("click", () => window.print());

      const form = displayElement.querySelector("#participant-form");
      const startButton = displayElement.querySelector("#start-experiment");
      const updateConsentButton = () => {
        const decision = form.querySelector('input[name="consent_decision"]:checked')?.value;
        const confirmationsComplete = form.elements.age_confirm.checked && form.elements.information_confirm.checked;
        startButton.disabled = decision === "agree" ? !confirmationsComplete : !decision;
        startButton.textContent = decision === "decline" ? "Confirm and leave study" : "Agree and start experiment";
        message.textContent = "";
      };
      form.querySelectorAll("input").forEach((control) => control.addEventListener("change", updateConsentButton));
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const decision = new FormData(form).get("consent_decision");
        if (!decision || (decision === "agree" && (!form.elements.age_confirm.checked || !form.elements.information_confirm.checked))) {
          message.className = "error-text";
          message.textContent = "To participate, confirm your age/student status, confirm that you read the information, and select I agree. You may select I do not agree without making these confirmations.";
          return;
        }
        if (decision !== "agree") {
          appState.consentDeclined = true;
          try { localStorage.removeItem("english_bart_lexical_bmrq_checkpoint_v4"); } catch {}
          displayElement.innerHTML = `<div class="screen"><section class="panel compact decline-panel">
            <h1>You have chosen not to participate</h1>
            <p>Thank you for considering this study. The experiment has not started and no research responses have been submitted.</p>
            <p>You may now close this browser tab.</p>
          </section></div>`;
          return;
        }
        const rtMs = Math.round(performance.now() - start);
        appState.consentGiven = true;
        appendDataRow({
          task: "enrollment",
          row_type: "enrollment",
          id_source: appState.participant.idSource,
          response: "consented",
          consent_version: EXPERIMENT_CONFIG.consentVersion,
          consent_age_confirmed: true,
          consent_information_confirmed: true,
          rt_ms: rtMs
        });
        this.jsPsych.finishTrial({ task: "enrollment", rt: rtMs });
      });
    }
  };
}

function itemFieldHtml(item, order) {
  const required = item.required ? "required" : "";
  if (item.options) {
    const isNumericRating = item.options.length >= 5
      && item.options.length <= 7
      && item.options.every((option) => Number.isFinite(Number(option.value)));
    if (isNumericRating) {
      return `<fieldset class="form-question rating-question" data-question-id="${item.id}">
        <legend><span>${order}.</span> ${escapeHtml(item.prompt)}</legend>
        <div class="rating-options rating-options-${item.options.length}" role="radiogroup">
          ${item.options.map((option) => {
            const rawLabel = String(option.label);
            const anchorLabel = rawLabel === String(option.value)
              ? ""
              : rawLabel.replace(/^\d+\s*-\s*/, "");
            return `<label class="rating-option" aria-label="${escapeHtml(`${option.value} ${anchorLabel}`.trim())}">
              <input type="radio" name="q_${item.id}" value="${escapeHtml(option.value)}" data-label="${escapeHtml(option.label)}" ${required}>
              <span class="rating-number">${escapeHtml(option.value)}</span>
              <span class="rating-label">${escapeHtml(anchorLabel)}</span>
            </label>`;
          }).join("")}
        </div>
      </fieldset>`;
    }
    return `<fieldset class="form-question" data-question-id="${item.id}">
      <legend><span>${order}.</span> ${escapeHtml(item.prompt)}</legend>
      <div class="form-options ${item.options.length > 6 ? "compact-options" : ""}">
        ${item.options.map((option) => `<label>
          <input type="radio" name="q_${item.id}" value="${escapeHtml(option.value)}" data-label="${escapeHtml(option.label)}" ${required}>
          <span>${escapeHtml(option.label)}</span>
        </label>`).join("")}
      </div>
    </fieldset>`;
  }
  return `<div class="form-question" data-question-id="${item.id}">
    <label for="q_${item.id}"><span>${order}.</span> ${escapeHtml(item.prompt)}</label>
    <input id="q_${item.id}" name="q_${item.id}" type="${item.kind === "number" ? "number" : "text"}"
      ${item.min !== undefined ? `min="${item.min}"` : ""}
      ${item.max !== undefined ? `max="${item.max}"` : ""}
      maxlength="180" ${required}>
  </div>`;
}

function makeLongFormPlugin() {
  return class LongFormPlugin {
    static info = {
      name: "long-form",
      version: "2.0.0",
      data: {},
      parameters: { items: { type: ParameterType.OBJECT, default: [] } }
    };

    constructor(jsPsychInstance) {
      this.jsPsych = jsPsychInstance;
    }

    trial(displayElement, trial) {
      const start = performance.now();
      const items = trial.items;
      const musicItems = items.filter((item) => item.scale === "BMRQ");
      const backgroundItems = items.filter((item) => item.scale !== "BMRQ");
      const draftKey = `questionnaire_draft_${appState.participant.studyId}_${appState.participant.wave}`;
      displayElement.innerHTML = `
        <div class="long-form-screen">
          <form id="long-form" class="long-form" novalidate>
            <header class="form-header">
              <h1>Questionnaires and background information</h1>
              <p>All questions are shown on this page. You may scroll back and change any response before final submission.</p>
            </header>
            <div class="form-status-bar">
              <span id="answered-count">0 of ${items.length} answered</span>
              <span>Study ID: ${escapeHtml(appState.participant.studyId)}</span>
            </div>
            <section class="form-section">
              <h2>Music Reward Questionnaire</h2>
              ${musicItems.map((item, index) => itemFieldHtml(item, index + 1)).join("")}
            </section>
            <section class="form-section">
              <h2>Background information</h2>
              ${backgroundItems.map((item, index) => itemFieldHtml(item, musicItems.length + index + 1)).join("")}
            </section>
            <section class="form-submit-band">
              <p>Review your responses above before submitting. After submission, responses cannot be changed.</p>
              <button class="primary-button" type="submit">Submit all responses</button>
              <div id="form-error" class="error-text" aria-live="polite"></div>
            </section>
          </form>
        </div>`;

      const form = displayElement.querySelector("#long-form");
      const error = displayElement.querySelector("#form-error");
      const count = displayElement.querySelector("#answered-count");

      const restoreDraft = () => {
        try {
          const draft = JSON.parse(localStorage.getItem(draftKey) || "{}");
          Object.entries(draft).forEach(([name, value]) => {
            const controls = form.querySelectorAll(`[name="${name}"]`);
            controls.forEach((control) => {
              if (control.type === "radio") control.checked = control.value === String(value);
              else control.value = String(value);
            });
          });
        } catch {
          // A malformed draft is ignored; the displayed form remains usable.
        }
      };

      const getDraft = () => {
        const draft = {};
        items.forEach((item) => {
          if (item.options) {
            const checked = form.querySelector(`[name="q_${item.id}"]:checked`);
            if (checked) draft[`q_${item.id}`] = checked.value;
          } else {
            const input = form.querySelector(`[name="q_${item.id}"]`);
            if (input && input.value !== "") draft[`q_${item.id}`] = input.value;
          }
        });
        return draft;
      };

      const updateProgress = () => {
        const answered = Object.keys(getDraft()).length;
        count.textContent = `${answered} of ${items.length} answered`;
        try { localStorage.setItem(draftKey, JSON.stringify(getDraft())); } catch {}
      };

      restoreDraft();
      updateProgress();
      form.querySelectorAll("input").forEach((control) => {
        const handleEdit = () => {
          control.closest(".form-question")?.classList.remove("missing");
          error.textContent = "";
          updateProgress();
        };
        control.addEventListener("input", handleEdit);
        control.addEventListener("change", handleEdit);
        control.addEventListener("click", handleEdit);
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const firstInvalid = form.querySelector(":invalid");
        if (firstInvalid) {
          error.textContent = "Please answer every required question. The first missing item has been highlighted.";
          firstInvalid.closest(".form-question")?.classList.add("missing");
          firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
          firstInvalid.focus({ preventScroll: true });
          return;
        }

        const formRtMs = Math.round(performance.now() - start);
        appState.questionnaireRows = items.map((item, index) => {
          const selected = form.querySelector(`[name="q_${item.id}"]:checked`);
          const control = selected || form.querySelector(`[name="q_${item.id}"]`);
          const value = control?.value ?? "";
          const responseLabel = selected?.dataset.label ?? value;
          const numericValue = Number(value);
          const scoredValue = item.scale === "BMRQ" && Number.isFinite(numericValue)
            ? (item.reverse_scored ? 6 - numericValue : numericValue)
            : "";
          return {
            ...baseMetadata(),
            submitted_at_iso: new Date().toISOString(),
            form_rt_ms: formRtMs,
            item_order: index + 1,
            question_id: item.id,
            scale: item.scale,
            response_code: value,
            response_label: responseLabel,
            scored_value: scoredValue,
            reverse_scored: item.scale === "BMRQ" ? Boolean(item.reverse_scored) : ""
          };
        });
        appState.bmrqScores = calculateBmrqScores(appState.questionnaireRows);
        try { localStorage.removeItem(draftKey); } catch {}
        checkpoint();
        this.jsPsych.finishTrial({ task: "questionnaire", rt: formRtMs });
      });
    }
  };
}

function makeBartTrialPlugin() {
  return class BartTrialPlugin {
    static info = {
      name: "bart-trial",
      version: "2.0.0",
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
        const growth = Math.sqrt(Math.min(state.actualPumps, state.maxPossiblePumps));
        const width = 104 + Math.round(growth * 13);
        const height = 134 + Math.round(growth * 18);
        displayElement.innerHTML = `
          <div class="bart-stage">
            <section class="bart-dashboard">
              <div class="metric-card"><div class="label">${trial.phase === "practice" ? "Practice balloon" : "Balloon"}</div><div class="value">${trial.trial_index} of ${trial.total_trials}</div></div>
              <div class="metric-card"><div class="label">Current balloon value</div><div class="value">${money(state.temporaryReward)}</div></div>
              <div class="metric-card"><div class="label">Banked total</div><div class="value">${money(appState[bankKey])}</div></div>
            </section>
            <section class="bart-visual-area"><div class="balloon-rig">
              <div class="balloon" style="--balloon-width:${width}px; --balloon-height:${height}px"></div>
              <div class="pop-mark">POP</div>
              <div class="pump" aria-hidden="true"><div class="pump-hose"></div><div class="pump-stem"></div><div class="pump-handle"></div><div class="pump-body"></div><div class="pump-base"></div></div>
            </div></section>
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
          row_type: "bart_action",
          phase: trial.phase,
          trial: trial.trial_index,
          balloon_id: state.balloonId,
          schedule_id: state.scheduleId,
          rng_seed: appState.rngSeeds.bart,
          explosion_point: state.explosionPoint,
          action: action.action,
          action_index: action.action_index,
          pump_index: action.pump_index,
          decision_rt_ms: action.decision_rt_ms,
          anticipatory: action.decision_rt_ms < 100,
          temporary_reward_before: action.temporary_reward_before,
          temporary_reward_after: action.temporary_reward_after,
          popped_after_action: action.popped_after_action,
          action_timestamp_iso: action.action_timestamp_iso
        }));
        appendDataRow({
          ...summary,
          row_type: "bart_balloon",
          subjID: appState.participant.studyId,
          trial: trial.trial_index,
          rng_seed: appState.rngSeeds.bart,
          banked_total_before: bankedTotalBefore,
          rt_ms: Math.round(performance.now() - trialStart),
          timestamp: trialOnsetIso,
          response
        });

        const message = state.popped
          ? "The balloon popped. Nothing was added to the bank."
          : `${money(summary.temporary_reward)} was added to the bank.`;
        displayElement.innerHTML = `<div class="bart-stage">
          <section class="bart-dashboard">
            <div class="metric-card"><div class="label">Balloon</div><div class="value">${trial.trial_index} of ${trial.total_trials}</div></div>
            <div class="metric-card"><div class="label">Result</div><div class="value">${state.popped ? "Popped" : "Collected"}</div></div>
            <div class="metric-card"><div class="label">Banked total</div><div class="value">${money(appState[bankKey])}</div></div>
          </section>
          <section class="bart-visual-area"><div class="panel compact"><h2>${state.popped ? "Popped" : "Collected"}</h2><p>${message}</p></div></section>
          <div class="bart-help">Next balloon loading...</div>
        </div>`;
        this.jsPsych.pluginAPI.setTimeout(() => this.jsPsych.finishTrial({ task: "bart", phase: trial.phase }), TIMING.bartFeedbackMs);
      };

      const onKeyDown = (event) => {
        if (finished || event.repeat) return;
        const decisionRt = Math.round(performance.now() - decisionStart);
        if (event.code === "Space") {
          event.preventDefault();
          pumpBalloon(state, decisionRt);
          if (state.popped) {
            displayElement.querySelector(".balloon")?.classList.add("popped");
            displayElement.querySelector(".pop-mark")?.classList.add("show");
            this.jsPsych.pluginAPI.setTimeout(() => finish("popped"), TIMING.bartPopMs);
          } else render();
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

const EXPORT_SCHEMAS = {
  summary: [
    "study_id", "wave", "session_id", "site", "country", "language_version", "study_version", "ethics_reference",
    "consent_version", "task_order", "started_at_iso", "completed_at_iso",
    "bart_formal_balloon_count", "bart_total_pumps", "bart_explosions", "bart_adjusted_mean_pumps",
    "bart_banked_total", "lexical_trial_count", "lexical_responded_count", "lexical_accuracy_responded",
    "lexical_accuracy_all", "lexical_mean_rt_correct_ms", "bmrq_musical_seeking", "bmrq_emotion_evocation", "bmrq_mood_regulation",
    "bmrq_sensory_motor", "bmrq_social_reward", "bmrq_total", "bmrq_revised16_total"
  ],
  bart_trials: [
    "study_id", "wave", "session_id", "site", "country", "language_version", "task_order", "phase", "trial", "subjID", "balloon_id", "schedule_id",
    "rng_seed", "explosion_point", "max_possible_pumps", "reward_per_pump", "starting_reward", "pumps", "n_pumps",
    "explosion", "popped", "collected", "temporary_reward", "banked_total_before", "banked_total", "rt_ms", "timestamp"
  ],
  bart_actions: [
    "study_id", "wave", "session_id", "site", "country", "language_version", "task_order", "phase", "trial", "balloon_id", "schedule_id", "rng_seed",
    "explosion_point", "action_index", "action", "pump_index", "decision_rt_ms", "anticipatory",
    "temporary_reward_before", "temporary_reward_after", "popped_after_action", "action_timestamp_iso"
  ],
  lexical_trials: [
    "study_id", "wave", "session_id", "site", "country", "language_version", "task_order", "trial", "rng_seed", "stimulus_id", "stimulus", "lexicality",
    "correct_response", "response", "accuracy", "rt_ms", "anticipatory", "timeout", "timestamp"
  ],
  questionnaire: [
    "study_id", "wave", "session_id", "site", "country", "language_version", "task_order", "submitted_at_iso", "form_rt_ms", "item_order", "question_id",
    "scale", "response_code", "scored_value", "reverse_scored"
  ]
};

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + Number(value), 0) / values.length : "";
}

function buildSummaryRow() {
  const bart = appState.rows.filter((row) => row.row_type === "bart_balloon" && row.phase === "formal");
  const adjusted = bart.filter((row) => Number(row.explosion) === 0);
  const lexical = appState.rows.filter((row) => row.row_type === "lexical_trial");
  const responded = lexical.filter((row) => !row.timeout);
  const correct = lexical.filter((row) => Number(row.accuracy) === 1 && row.rt_ms !== "");
  return {
    ...baseMetadata(),
    completed_at_iso: new Date().toISOString(),
    bart_formal_balloon_count: bart.length,
    bart_total_pumps: bart.reduce((sum, row) => sum + Number(row.pumps), 0),
    bart_explosions: bart.reduce((sum, row) => sum + Number(row.explosion), 0),
    bart_adjusted_mean_pumps: adjusted.length ? mean(adjusted.map((row) => row.pumps)).toFixed(3) : "",
    bart_banked_total: appState.bartFormalBanked.toFixed(2),
    lexical_trial_count: lexical.length,
    lexical_responded_count: responded.length,
    lexical_accuracy_responded: responded.length ? (responded.filter((row) => Number(row.accuracy) === 1).length / responded.length).toFixed(4) : "",
    lexical_accuracy_all: lexical.length ? (lexical.filter((row) => Number(row.accuracy) === 1).length / lexical.length).toFixed(4) : "",
    lexical_mean_rt_correct_ms: correct.length ? mean(correct.map((row) => row.rt_ms)).toFixed(2) : "",
    bmrq_musical_seeking: appState.bmrqScores.musical_seeking ?? "",
    bmrq_emotion_evocation: appState.bmrqScores.emotion_evocation ?? "",
    bmrq_mood_regulation: appState.bmrqScores.mood_regulation ?? "",
    bmrq_sensory_motor: appState.bmrqScores.sensory_motor ?? "",
    bmrq_social_reward: appState.bmrqScores.social_reward ?? "",
    bmrq_total: appState.bmrqScores.total ?? "",
    bmrq_revised16_total: appState.bmrqScores.revised16_total ?? ""
  };
}

function buildExports() {
  const groups = {
    summary: [buildSummaryRow()],
    bart_trials: appState.rows.filter((row) => row.row_type === "bart_balloon"),
    bart_actions: appState.rows.filter((row) => row.row_type === "bart_action"),
    lexical_trials: appState.rows.filter((row) => row.row_type === "lexical_trial"),
    questionnaire: appState.questionnaireRows
  };
  return Object.entries(groups).map(([type, rows]) => ({
    type,
    rows,
    filename: createDataFilename(appState.fileBase, type),
    csv: rowsToCsv(rows, EXPORT_SCHEMAS[type])
  }));
}

function downloadAllExports(exports) {
  exports.forEach((file, index) => window.setTimeout(() => downloadCsv(file.filename, file.csv), index * 180));
}

function makeUploadPlugin() {
  return class UploadPlugin {
    static info = { name: "upload-data", version: "2.0.0", data: {}, parameters: {} };

    constructor(jsPsychInstance) {
      this.jsPsych = jsPsychInstance;
    }

    trial(displayElement) {
      const exports = buildExports();
      appState.exports = exports;
      displayElement.innerHTML = `<div class="screen"><section class="panel">
        <h1>Saving data</h1>
        <p>Five clearly separated analysis files are being prepared.</p>
        <div id="upload-list" class="upload-file-list">
          ${exports.map((file) => `<div class="upload-file" data-file="${file.type}"><strong>${file.type}</strong><span>Waiting</span></div>`).join("")}
        </div>
        <button id="download-all" class="secondary-button" type="button">Download all files</button>
        <div id="save-status" class="status-line">Preparing secure upload...</div>
      </section></div>`;
      displayElement.querySelector("#download-all").addEventListener("click", () => downloadAllExports(exports));
      const status = displayElement.querySelector("#save-status");
      const setFileStatus = (type, text, failed = false) => {
        const line = displayElement.querySelector(`[data-file="${type}"] span`);
        if (line) {
          line.textContent = text;
          if (failed) line.parentElement.classList.add("failed");
        }
      };

      if (appState.debugMode || appState.reviewMode) {
        exports.forEach((file) => setFileStatus(file.type, "Test mode: ready"));
        status.textContent = appState.reviewMode
          ? "Ethics review mode: cloud upload is disabled."
          : "Test mode: cloud upload skipped.";
        this.jsPsych.pluginAPI.setTimeout(() => this.jsPsych.finishTrial({ task: "upload", debug: true }), TIMING.uploadDelayMs);
        return;
      }

      const uploadSequentially = async () => {
        const failures = [];
        for (const file of exports) {
          setFileStatus(file.type, "Uploading");
          try {
            await uploadToDataPipe({ experimentID: EXPERIMENT_CONFIG.datapipeExperimentId, filename: file.filename, data: file.csv });
            setFileStatus(file.type, "Uploaded");
          } catch (error) {
            failures.push({ file, error });
            setFileStatus(file.type, "Failed; use local download", true);
          }
        }
        if (failures.length === 0) {
          appState.uploadComplete = true;
          localStorage.removeItem("english_bart_lexical_bmrq_checkpoint_v4");
          status.textContent = "Upload complete. All five files were saved to OSF.";
        } else {
          status.classList.add("error");
          status.textContent = `${failures.length} cloud file(s) failed. Click Download all files to keep a complete local backup.`;
          downloadAllExports(failures.map(({ file }) => file));
        }
        this.jsPsych.pluginAPI.setTimeout(
          () => this.jsPsych.finishTrial({ task: "upload", uploaded: failures.length === 0 }),
          TIMING.uploadDelayMs
        );
      };
      uploadSequentially();
    }
  };
}

function buildBartTimeline() {
  const trials = [];
  trials.push(screenTrial(
    "Balloon Task",
    `<p>Press <strong>Space</strong> to pump the balloon. Each successful pump adds ${money(EXPERIMENT_CONFIG.bartRewardPerPump)} to its current value.</p>
     <p>Press <strong>Enter</strong> to collect the current value. If the balloon pops first, that balloon earns nothing. The explosion point is hidden.</p>
     <p>Your goal is to bank as many task credits as possible. Task credits are experimental feedback and are not additional cash compensation. The number of pumps is not displayed.</p>`,
    "Start practice"
  ));
  const practice = SMOKE_MODE ? BART_PRACTICE_CONDITIONS.slice(0, 1) : BART_PRACTICE_CONDITIONS;
  practice.forEach((condition, index) => trials.push({
    type: BartTrialPlugin,
    condition,
    phase: "practice",
    trial_index: index + 1,
    total_trials: practice.length
  }));
  trials.push(screenTrial(
    "Formal Balloon Task",
    `<p>The formal task contains ${BART_FORMAL_CONDITIONS.length} balloons.</p><p>Space pumps; Enter collects. Try to bank as much as possible.</p>`,
    "Start formal task"
  ));
  const bartRng = createSeededRng(appState.rngSeeds.bart);
  const order = [0, 1, 2].flatMap((blockIndex) =>
    shuffleCopy(BART_FORMAL_CONDITIONS.slice(blockIndex * 10, blockIndex * 10 + 10), bartRng)
  );
  const active = SMOKE_MODE ? [{ ...order[0], explosion_point: 2 }] : order;
  active.forEach((condition, index) => trials.push({
    type: BartTrialPlugin,
    condition,
    phase: "formal",
    trial_index: index + 1,
    total_trials: active.length
  }));
  return trials;
}

function buildLexicalTimeline() {
  const trials = [screenTrial(
    "English Lexical Decision",
    `<p>A letter string will appear after each fixation cross.</p>
     <p>Press <strong>Left Arrow</strong> for a non-word and <strong>Right Arrow</strong> for a real English word.</p>
     <p>Respond as quickly and accurately as possible. There are ${LEXICAL_TRIALS.length} trials.</p>`,
    "Start task"
  )];
  const lexicalRng = createSeededRng(appState.rngSeeds.lexical);
  const order = shuffleCopy(LEXICAL_TRIALS, lexicalRng);
  const active = SMOKE_MODE ? [
    LEXICAL_TRIALS.find((item) => item.stimulus === "way"),
    LEXICAL_TRIALS.find((item) => item.stimulus === "woy")
  ] : order;
  active.forEach((trial, index) => {
    trials.push({
      type: window.jsPsychHtmlKeyboardResponse,
      stimulus: '<div class="lexical-screen"><div class="fixation-cross" aria-label="fixation"></div></div>',
      choices: "NO_KEYS",
      response_ends_trial: false,
      trial_duration: TIMING.lexicalFixationMs,
      data: { task: "lexical_fixation" }
    });
    trials.push({
      type: window.jsPsychHtmlKeyboardResponse,
      stimulus: `<div class="lexical-screen"><div class="lexical-word">${escapeHtml(trial.stimulus)}</div><div class="lexical-hint">Left: non-word &nbsp;&nbsp; Right: word</div></div>`,
      choices: ["ArrowLeft", "ArrowRight"],
      trial_duration: TIMING.lexicalResponseMs,
      data: { task: "lexical_decision", trial_index: index + 1 },
      on_start: () => { trial.onset_iso = new Date().toISOString(); },
      on_finish: (data) => {
        const timedOut = data.response === null;
        const correct = !timedOut && jsPsych.pluginAPI.compareKeys(data.response, trial.correct_response);
        appendDataRow({
          task: "lexical_decision",
          row_type: "lexical_trial",
          trial: index + 1,
          rng_seed: appState.rngSeeds.lexical,
          timestamp: trial.onset_iso,
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
  return trials;
}

const ParticipantFormPlugin = makeParticipantFormPlugin();
const LongFormPlugin = makeLongFormPlugin();
const BartTrialPlugin = makeBartTrialPlugin();
const UploadPlugin = makeUploadPlugin();
const timeline = [{ type: ParticipantFormPlugin }];

timeline.push({
  type: window.jsPsychFullscreen,
  fullscreen_mode: true,
  message: "<p>The behavioral tasks will now switch to full screen.</p><p>Please use a physical keyboard and do not refresh the page.</p>",
  button_label: "Enter full screen"
});

for (const task of appState.taskOrderSequence) {
  timeline.push(...(task === "bart" ? buildBartTimeline() : buildLexicalTimeline()));
}

timeline.push({
  type: window.jsPsychFullscreen,
  fullscreen_mode: false,
  message: "<p>The behavioral tasks are complete.</p><p>The questionnaires will open in a scrollable page.</p>",
  button_label: "Continue to questionnaires"
});
timeline.push({ type: LongFormPlugin, items: [...BMRQ_ITEMS, ...BACKGROUND_ITEMS] });
timeline.push({ type: UploadPlugin });
timeline.push(screenTrial(
  "Finished",
  `<p>Your responses have been processed. Thank you for participating.</p>
   <div class="study-id-box finished-id"><div><span class="study-id-label">Study ID for follow-up</span><strong>${escapeHtml(appState.participant.studyId)}</strong></div></div>
   <div class="finished-actions"><button class="secondary-button" type="button" onclick="window.print()">Print ID</button></div>
   <p>Keep this ID and use the personalized link sent by the researcher for the next visit. The approved recruitment notice will explain compensation and contact procedures.</p>`,
  "Finish"
));

if (!EXPERIMENT_CONFIG.recruitmentOpen && !REVIEW_MODE) {
  document.querySelector("#jspsych-target").innerHTML = `
    <div class="screen ethics-lock-screen"><section class="panel compact ethics-lock-panel">
      <span class="consent-eyebrow">Ethics review status</span>
      <h1>Recruitment is not open</h1>
      <p>This study website is being prepared for ethics review. It is not currently accepting participants or collecting research data.</p>
      <p>Please return only after receiving an approved invitation from the research team.</p>
      <div class="ethics-lock-meta"><strong>Ethics reference</strong><span>${escapeHtml(EXPERIMENT_CONFIG.ethicsReference)}</span></div>
    </section></div>`;
} else {
  jsPsych.run(timeline);
}
