# Notes: English Experiment Deployment

## Working Copy
- Path: `C:\Users\lilis\Desktop\EXP_china\Codex尝试部署英文版`
- Branch: `main`
- Remote: `https://github.com/LISHILIpsychology/English-BART-Lexical-BMRQ-jsPsych.git`
- Initial worktree state: clean

## Audit Findings
- Scope reduced to BART, English lexical decision, BMRQ, multilingual background, and brief demographics.
- Fishing and unrelated questionnaire content removed.
- BART now produces both action-level rows and hBayesDM-compatible balloon summaries.
- BMRQ retains 20 original English items; items 2 and 5 are reverse-scored.

## Verification
- Logic tests passed.
- Desktop browser full-flow smoke test passed without console/page errors.
- Responsive screenshots inspected; no incoherent overlap.
- CSV checked for BART pump/explosion coding, lexical RT/accuracy, and absence of fishing fields.
- GitHub Pages production smoke run passed.
- DataPipe test upload returned `Success`: `DEPLOYMENT_TEST_20260812_1212_099997.csv`.

## Longitudinal Redesign
- The supplied real CSV has 492 rows and 60 columns because five record types were combined into one sparse event table.
- New formal recruitment uses `P-XXXX-XXXX-XXXX` Study IDs and `T1/T2/T3` waves.
- Task order is derived from Study ID, balancing participants while remaining unchanged across waves.
- Contact information is kept only in a researcher-side local roster and never included in experiment data or filenames.

## Design Evidence
- Counterbalancing task order across participants controls sequence/order effects; with two tasks, the manager maintains a 1:1 allocation between BART-first and lexical-first IDs.
- The same ID retains the same task order at every wave so task-order changes cannot masquerade as longitudinal change.
- Validated questionnaire item order is retained; the BMRQ is not randomized item-by-item because item ordering can contribute to the instrument's psychometric behavior.
- Pseudonymization guidance recommends keeping the participant-ID linkage key separately from research data. The roster tool therefore keeps contact labels in page memory only and requires researcher-controlled export/import.

Sources:
- https://pubmed.ncbi.nlm.nih.gov/24903688/
- https://doi.org/10.1016/j.paid.2013.03.008
- https://staff.napier.ac.uk/services/governance-compliance/governance/DataProtection/Documents/Research/Basic_Pseudonymisation_Guidance.pdf

## Consent and Form Presentation Update
- The prior entry page bundled age and agreement into one short checkbox and did not present written study information.
- The new entry must explain purpose, procedures, approximate duration, voluntary participation, foreseeable burden, privacy/data use, withdrawal limits, and contact route before the participant decides.
- Institution-specific investigator details and ethics approval numbers were not available in the copied project and must not be fabricated.
- Declining consent must not call `finishTrial`, append an enrollment row, checkpoint participant metadata, or reach the upload timeline.
- Five- and seven-point numeric response sets need dedicated rating-scale markup. Long endpoint labels should wrap inside their own track position on desktop and become full-width rows on narrow screens.
