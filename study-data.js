export const EXPERIMENT_CONFIG = {
  experimentName: "Risk Taking, English Lexical Processing, and Music Reward Study",
  version: "2026-08-12-ethics-review-v4",
  site: "MY_UM",
  country: "Malaysia",
  languageVersion: "en",
  recruitmentOpen: false,
  ethicsReference: "PENDING_UMREC_APPROVAL",
  consentVersion: "DRAFT_2026-08-12",
  datapipeExperimentId: "w8tCrTo7vcWM",
  bartRewardPerPump: 0.05,
  bartInitialTemporaryReward: 0.05,
  bartMaximumPossiblePumps: 128,
  lexicalTrialCount: 80,
  surveyItemCount: 35
};

export const BART_PRACTICE_CONDITIONS = [
  { balloon_id: "P01", explosion_point: 6, schedule_id: "practice_v1" },
  { balloon_id: "P02", explosion_point: 12, schedule_id: "practice_v1" },
  { balloon_id: "P03", explosion_point: 18, schedule_id: "practice_v1" }
];

// Three balanced sets of ten, each with a mean hidden breakpoint of 64.
// Order is shuffled per session with a reproducible session seed.
const FORMAL_BREAKPOINTS = [
  8, 122, 43, 76, 55, 98, 31, 67, 115, 25,
  14, 111, 52, 84, 39, 127, 21, 72, 95, 25,
  4, 119, 46, 88, 33, 104, 17, 79, 123, 27
];

export const BART_FORMAL_CONDITIONS = FORMAL_BREAKPOINTS.map((explosionPoint, index) => ({
  balloon_id: `F${String(index + 1).padStart(2, "0")}`,
  explosion_point: explosionPoint,
  schedule_id: "balanced_x128_v1"
}));

const LEXICAL_PAIRS = [
  ["way", "woy"], ["and", "anf"], ["new", "neu"], ["for", "fot"],
  ["out", "ous"], ["want", "wunt"], ["much", "mech"], ["play", "ptay"],
  ["hour", "heur"], ["line", "lipe"], ["their", "theyr"], ["about", "aboot"],
  ["think", "thenk"], ["which", "whicb"], ["could", "courd"], ["should", "shoule"],
  ["become", "becone"], ["factor", "fector"], ["decade", "secade"], ["system", "sistem"],
  ["program", "pregram"], ["country", "countey"], ["between", "bedween"], ["company", "compane"],
  ["believe", "beliefe"], ["business", "bussness"], ["remember", "rememper"], ["question", "quesdion"],
  ["anything", "anythink"], ["research", "pesearch"], ["different", "bifferent"], ["important", "importent"],
  ["political", "pofitical"], ["community", "compunity"], ["including", "incluting"], ["everything", "eferything"],
  ["experience", "exberience"], ["especially", "especialty"], ["technology", "tochnology"], ["population", "bopulation"]
];

export const LEXICAL_TRIALS = LEXICAL_PAIRS.flatMap(([word, nonword], pairIndex) => [
  {
    stimulus_id: `LDT${String(pairIndex * 2 + 1).padStart(3, "0")}`,
    stimulus: word,
    length: word.length,
    correct_response: "ArrowRight",
    lexicality: "word"
  },
  {
    stimulus_id: `LDT${String(pairIndex * 2 + 2).padStart(3, "0")}`,
    stimulus: nonword,
    length: nonword.length,
    correct_response: "ArrowLeft",
    lexicality: "nonword"
  }
]);

const agreementOptions = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neither agree nor disagree" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" }
];

const sevenPointOptions = [
  { value: 1, label: "1 - Very low" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4 - Moderate" },
  { value: 5, label: "5" },
  { value: 6, label: "6" },
  { value: 7, label: "7 - Very high" }
];

export const BACKGROUND_ITEMS = [
  {
    id: "DEM01", scale: "demographics", kind: "number", prompt: "What is your age in years?",
    required: true, min: 18, max: 99
  },
  {
    id: "DEM02", scale: "demographics", kind: "choice", prompt: "What is your gender?", required: true,
    options: [
      { value: "woman", label: "Woman" }, { value: "man", label: "Man" },
      { value: "nonbinary", label: "Non-binary" }, { value: "self_describe", label: "Prefer to self-describe" },
      { value: "prefer_not", label: "Prefer not to say" }
    ]
  },
  {
    id: "DEM03", scale: "demographics", kind: "text", prompt: "What is your nationality or citizenship?",
    required: true
  },
  {
    id: "DEM04", scale: "demographics", kind: "text",
    prompt: "How would you describe your ethnic or cultural group? You may list more than one.", required: true
  },
  {
    id: "DEM05", scale: "demographics", kind: "choice", prompt: "What is your current level of study?", required: true,
    options: [
      { value: "undergraduate", label: "Undergraduate" }, { value: "postgraduate", label: "Postgraduate" },
      { value: "not_current_student", label: "Not currently a student" }, { value: "other", label: "Other" }
    ]
  },
  {
    id: "DEM06", scale: "hearing", kind: "choice", prompt: "Do you have a diagnosed hearing difficulty or use a hearing aid?", required: true,
    options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }, { value: "prefer_not", label: "Prefer not to say" }]
  },
  {
    id: "MUS01", scale: "music_background", kind: "choice", prompt: "Have you received formal musical training?", required: true,
    options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]
  },
  {
    id: "MUS02", scale: "music_background", kind: "number",
    prompt: "How many total years of formal musical training have you completed? Enter 0 if none.", required: true, min: 0, max: 80
  },
  {
    id: "LANG01", scale: "language_background", kind: "text",
    prompt: "What language or languages did you first learn as a child? You may list more than one.", required: true
  },
  {
    id: "LANG02", scale: "language_background", kind: "text",
    prompt: "Which other languages can you understand, speak, read, or write?", required: true
  },
  {
    id: "LANG03", scale: "language_background", kind: "text",
    prompt: "Which language do you use most often in daily life?", required: true
  },
  {
    id: "LANG04", scale: "language_background", kind: "number",
    prompt: "At what age did you begin learning English? Enter 0 if English was learned from birth.", required: true, min: 0, max: 80
  },
  {
    id: "LANG05", scale: "language_background", kind: "choice",
    prompt: "How would you rate your current English reading proficiency?", required: true, options: sevenPointOptions
  },
  {
    id: "LANG06", scale: "language_background", kind: "number",
    prompt: "About what percentage of your daily language use is in English?", required: true, min: 0, max: 100
  },
  {
    id: "LANG07", scale: "language_background", kind: "choice",
    prompt: "Are most of your current classes or work activities conducted in English?", required: true,
    options: [{ value: "mostly", label: "Mostly in English" }, { value: "partly", label: "Partly in English" }, { value: "rarely", label: "Rarely or never in English" }]
  }
];

const BMRQ_PROMPTS = [
  "When I share music with someone, I feel a special connection with that person.",
  "In my free time, I hardly listen to music.",
  "I like to listen music that contains emotion.",
  "Music keeps me company when I'm alone.",
  "I don't like to dance, not even with music I like.",
  "Music makes me bond with other people.",
  "I inform myself about music I like.",
  "I get emotional when listening to certain pieces of music.",
  "Music calms and relaxes me.",
  "Music often makes me dance.",
  "I'm always looking for new music.",
  "I can become tearful or cry when I listen to a melody that I like very much.",
  "I like to sing or play an instrument with other people.",
  "Music helps me chill out.",
  "I can't help humming or singing along to music that I like.",
  "At a concert, I feel connected to the performers and the audience.",
  "I spend quite a bit of money on music and related items.",
  "I sometimes feel chills when I hear a melody that I like.",
  "Music comforts me.",
  "When I hear a tune I like a lot I can't help tapping or moving to its beat."
];

export const BMRQ_ITEMS = BMRQ_PROMPTS.map((prompt, index) => ({
  id: `BMRQ${String(index + 1).padStart(2, "0")}`,
  scale: "BMRQ",
  kind: "choice",
  prompt,
  required: true,
  reverse_scored: index === 1 || index === 4,
  options: agreementOptions
}));

export const SURVEY_ITEMS = [...BACKGROUND_ITEMS, ...BMRQ_ITEMS].map((item, index) => ({
  ...item,
  number: index + 1
}));
