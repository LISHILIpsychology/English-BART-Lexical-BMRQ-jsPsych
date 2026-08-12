# English BART + Lexical Decision + BMRQ Experiment

Independent static jsPsych experiment. It does not depend on PsychoPy, PsychoJS, Pavlovia, or runtime Excel files.

## Timeline

```text
Contact and consent
  -> 15 demographic, music-training, and multilingual-background items
  -> BART instructions and 3 practice balloons
  -> BART formal task: 30 balloons
  -> English lexical decision: 80 trials
  -> Barcelona Music Reward Questionnaire: 20 items
  -> DataPipe upload, with local CSV fallback
```

## Trial Windows

### BART

```text
Decision display (until key; RT begins when decision display appears)
  -> Space: record one pump and update value
       -> safe: next decision display
       -> hidden explosion point reached: pop feedback, 320 ms
  -> Enter: collect feedback, 700 ms
  -> next balloon
```

- Formal balloons use one hidden `x=128` risk distribution.
- The 30 formal breakpoints are balanced in three sets of ten and shuffled with a saved reproducible seed.
- `Space` is the only input that increments `n_pumps` / `pumps`.
- `Enter` records a collect action and never increments pumps.
- The UI never shows pump count or hidden breakpoint.
- A new balloon displays `$0.05`; each successful pump adds `$0.05`.
- The CSV includes action rows and balloon-summary rows. Summary rows expose the hBayesDM-compatible fields `subjID`, `trial`, `pumps`, and `explosion`.

### Lexical Decision

```text
Fixation cross, 750 ms
  -> stimulus until response (RT begins at stimulus onset)
  -> Left Arrow = non-word; Right Arrow = real English word
  -> next trial
```

The embedded materials contain 40 words and 40 matched nonwords. English background variables are collected to support interpretation in a multilingual Malaysian sample.

### BMRQ

- 20 items, five-point response scale.
- Items 2 and 5 are reverse-scored.
- CSV stores raw response, scored response, total score, and five four-item subscale sums.
- Long questionnaire prompts are not included in the CSV.

## Data Upload

- Endpoint: `https://pipe.jspsych.org/api/data/`
- DataPipe experiment ID: `w8tCrTo7vcWM`
- Request fields: `experimentID`, `filename`, `data`
- Filename: `YYYYMMDD_HHmm_SSffff_anonymous-code_random6.csv`; contact details are not exposed in the filename.
- Failed uploads trigger a local CSV download; completed rows are also checkpointed in browser local storage until upload succeeds.

## Local Run

```powershell
python -m http.server 8088
```

Open `http://127.0.0.1:8088/`. For a no-upload test with shortened delays, open `http://127.0.0.1:8088/?debug=1&fast=1`.

## Tests

```powershell
node tests\run-tests.mjs
```

The tests cover BART off-by-one behavior, explosion coding, balanced/reproducible breakpoint schedules, lexical materials, BMRQ scoring flags, unique filenames, and absence of fishing fields.

## Deployment

- Repository: `LISHILIpsychology/English-BART-Lexical-BMRQ-jsPsych`
- Public URL: `https://lishilipsychology.github.io/English-BART-Lexical-BMRQ-jsPsych/`
