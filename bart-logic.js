export const DEFAULT_BART_REWARD = 0.05;

export function createBartState(condition, options = {}) {
  const rewardPerPump = options.rewardPerPump ?? DEFAULT_BART_REWARD;
  const startingReward = options.startingReward ?? 0;
  const explosionPoint = condition.explosion_point ?? condition.max_pumps;

  return {
    balloonId: condition.balloon_id,
    scheduleId: condition.schedule_id ?? "unspecified",
    explosionPoint,
    maxPossiblePumps: options.maxPossiblePumps ?? 128,
    rewardPerPump,
    startingReward,
    actualPumps: 0,
    temporaryReward: startingReward,
    popped: false,
    collected: false,
    active: true,
    actionLog: []
  };
}

export function pumpBalloon(state, rtMs = null) {
  if (!state.active) return state;

  const temporaryRewardBefore = state.temporaryReward;
  state.actualPumps += 1;
  const poppedAfterAction = state.actualPumps >= state.explosionPoint;

  if (poppedAfterAction) {
    state.popped = true;
    state.collected = false;
    state.temporaryReward = 0;
    state.active = false;
  } else {
    state.temporaryReward = roundCurrency(state.startingReward + state.actualPumps * state.rewardPerPump);
  }

  state.actionLog.push({
    action: "pump",
    action_index: state.actionLog.length + 1,
    pump_index: state.actualPumps,
    decision_rt_ms: rtMs,
    action_timestamp_iso: new Date().toISOString(),
    temporary_reward_before: temporaryRewardBefore,
    temporary_reward_after: state.temporaryReward,
    popped_after_action: poppedAfterAction
  });
  return state;
}

export function collectBalloon(state, rtMs = null) {
  if (!state.active) return state;

  state.collected = true;
  state.popped = false;
  state.active = false;
  state.actionLog.push({
    action: "collect",
    action_index: state.actionLog.length + 1,
    pump_index: state.actualPumps,
    decision_rt_ms: rtMs,
    action_timestamp_iso: new Date().toISOString(),
    temporary_reward_before: state.temporaryReward,
    temporary_reward_after: state.temporaryReward,
    popped_after_action: false
  });
  return state;
}

export function summarizeBartTrial(state, phase, trialIndex, bankedTotalBefore) {
  const earnings = state.popped ? 0 : state.temporaryReward;
  const bankedTotalAfter = roundCurrency(bankedTotalBefore + earnings);

  return {
    task: "bart",
    phase,
    trial_index: trialIndex,
    balloon_id: state.balloonId,
    schedule_id: state.scheduleId,
    explosion_point: state.explosionPoint,
    max_possible_pumps: state.maxPossiblePumps,
    n_pumps: state.actualPumps,
    pumps: state.actualPumps,
    explosion: state.popped ? 1 : 0,
    popped: state.popped,
    collected: state.collected,
    temporary_reward: roundCurrency(earnings),
    banked_total: bankedTotalAfter,
    action_log: JSON.stringify(state.actionLog)
  };
}

export function simulateBartActions(maxPumps, actions, options = {}) {
  const state = createBartState({ balloon_id: 1, explosion_point: maxPumps }, options);

  for (const action of actions) {
    if (!state.active) break;
    if (action === "Space") pumpBalloon(state);
    if (action === "Enter") collectBalloon(state);
  }

  return summarizeBartTrial(state, "test", 1, 0);
}

export function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function shuffleCopy(array, rng = Math.random) {
  const copy = array.map((item) => ({ ...item }));
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createSeededRng(seedText) {
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    seed ^= seedText.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  return function rng() {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
