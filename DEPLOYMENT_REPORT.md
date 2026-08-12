# Deployment Report

## Consent and questionnaire presentation update (2026-08-12)

- Replaced the brief bundled consent checkbox with written participant information and mutually exclusive agree/decline choices.
- Declining now stops before task progression and produces no research-response upload.
- Removed the requirement that participants confirm memorising or saving their Study ID; researcher-managed longitudinal links remain the primary matching method.
- Rebuilt numeric five- and seven-point items as responsive rating scales. Long endpoint labels remain inside their assigned controls and switch to full-width rows on narrow screens.
- Institution-specific ethics reference and researcher contact details still need to be inserted from the approved study documents before formal recruitment.
- Logic tests, desktop/mobile browser flow, consent-decline behavior, and rating-label overflow checks passed.
- Production GitHub Pages smoke test passed on the deployed consent/form update.

## Longitudinal/Tidy Data Update (2026-08-12)

- Behavioral tasks now precede questionnaires.
- BART and lexical decision order is balanced by stable Study ID and remains fixed across waves.
- The participant experiment collects no name, email, WeChat, or other contact field.
- BMRQ and background questions now use one editable scrolling form.
- Each visit uploads five analysis-ready files: summary, BART trials, BART actions, lexical trials, and questionnaire responses.
- A researcher-only in-memory roster manager creates T1/T2/T3 invitation links; its contact roster is never uploaded or stored in the public site.
- Logic and complete browser smoke tests passed after this update.

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
- Readiness: `ready_for_collection`
- Production GitHub Pages smoke test: passed
- DataPipe test upload: passed (`DEPLOYMENT_TEST_20260812_1212_099997.csv`)

## Data

BART balloon-summary rows include `subjID`, `trial`, `pumps`, and `explosion` for hBayesDM. Action rows include each pump/collect decision, decision RT, temporary reward before/after, and whether the action caused an explosion.

The BMRQ stores raw and reverse-scored item values, five subscale sums, and total score. Items 2 and 5 are reverse-scored.

## Deployment Target

- GitHub repository: `LISHILIpsychology/English-BART-Lexical-BMRQ-jsPsych`
- GitHub Pages URL: `https://lishilipsychology.github.io/English-BART-Lexical-BMRQ-jsPsych/`
- DataPipe experiment ID: `w8tCrTo7vcWM`
