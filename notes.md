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
