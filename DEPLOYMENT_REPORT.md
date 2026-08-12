# Deployment Report

## Scope

This independent English static experiment contains only:

- Brief consent/contact, demographic, music-training, and multilingual-background items
- BART: 3 practice and 30 formal balloons
- English lexical decision: 80 trials
- Barcelona Music Reward Questionnaire: 20 items
- DataPipe/OSF CSV upload with a browser-download fallback

Fishing and all unrelated questionnaire scales were removed. Original PsychoPy folders and old GitHub repositories were not modified.

## Verification

- Logic/unit tests: passed
- JavaScript syntax checks: passed
- Desktop browser end-to-end smoke run: passed
- Responsive screenshot check: passed
- Browser console/page errors: none
- CSV inspection: passed
- BART `Space, Space, Enter`: `pumps=2`, no off-by-one
- BART explosion on second Space: `pumps=2`, `explosion=1`
- Questionnaire prompts absent from CSV: passed
- Fishing fields/content absent: passed

## Code Audit

- Platform: jsPsych 8.2.3
- Review mode: code audit
- Critical issues: 0
- Major issues: 0
- Readiness: `ready_for_collection`, subject to a real DataPipe test upload and production URL check after deployment

## Data

BART balloon-summary rows include `subjID`, `trial`, `pumps`, and `explosion` for hBayesDM. Action rows include each pump/collect decision, decision RT, temporary reward before/after, and whether the action caused an explosion.

The BMRQ stores raw and reverse-scored item values, five subscale sums, and total score. Items 2 and 5 are reverse-scored.

## Deployment Target

- GitHub repository: `LISHILIpsychology/English-BART-Lexical-BMRQ-jsPsych`
- GitHub Pages URL: `https://lishilipsychology.github.io/English-BART-Lexical-BMRQ-jsPsych/`
- DataPipe experiment ID: `w8tCrTo7vcWM`
