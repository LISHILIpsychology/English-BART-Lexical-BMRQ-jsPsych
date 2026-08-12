# English BART + Lexical Decision + BMRQ Experiment

Independent static jsPsych experiment. It does not depend on PsychoPy, PsychoJS, Pavlovia, or runtime Excel files.

## Timeline

```text
Written participant information, explicit consent, and anonymous Study ID
  -> BART and lexical decision in Study-ID-balanced order
  -> one editable scrolling form: BMRQ first, then background information
  -> five tidy DataPipe uploads, with local CSV fallback
```

## Longitudinal Participant Management

- No email, WeChat, name, or other contact field appears in the participant experiment.
- Study IDs use the format `P-XXXX-XXXX-XXXX` and remain constant at T1, T2, and T3.
- Task order is deterministically derived from Study ID, so approximately half complete BART first and half lexical decision first. The same participant keeps the same order at follow-up.
- The researcher-only manager is at `researcher/index.html`. It keeps the contact-to-ID roster only in page memory and can export/import a local roster CSV.
- Follow-up links use `?pid=P-XXXX-XXXX-XXXX&wave=T2` or `wave=T3`.
- The roster CSV contains identifiable contact information and must be stored separately from OSF research data in an access-controlled location.

## Consent

- The first page presents written information about the purpose, procedures, duration, foreseeable burden, voluntary participation, withdrawal, privacy, and data use.
- Participants must actively select either `I agree to participate` or `I do not agree to participate`.
- Declining ends the visit before any task starts and does not create or upload a research-response file.
- The Study ID is shown as an optional participant backup. Longitudinal matching is managed through the separate researcher roster, so participants are not expected to memorise it.
- Before recruitment, the approved investigator name, institution, ethics reference, and direct contact details should be added from the final ethics documents. They are not fabricated in this repository.

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
- Items appear in one scrollable form and can be reviewed or changed until final submission.
- Questionnaire CSV stores item-level responses; summary CSV stores total and five four-item subscale sums.
- Long questionnaire prompts are not included in the CSV.

## Data Upload

- Endpoint: `https://pipe.jspsych.org/api/data/`
- DataPipe experiment ID: `w8tCrTo7vcWM`
- Request fields: `experimentID`, `filename`, `data`
- Five files are uploaded per visit: `summary`, `bart_trials`, `bart_actions`, `lexical_trials`, and `questionnaire`.
- Filename: `StudyID_Wave_YYYYMMDD_HHmmss_mmm_SessionSuffix__FileType.csv`.
- Study ID is stable across visits; session suffix and timestamp make every filename unique.
- CSVs contain no contact fields.
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
