# Task Plan: Consent and questionnaire presentation update

## Goal
Add a readable written-consent decision at entry and redesign rating-scale questions so labels never overflow on desktop or mobile, without changing source projects.

## Phases
- [x] Phase 1: Inspect current entry, consent behavior, questionnaire markup, and responsive CSS
- [x] Phase 2: Implement written consent with explicit agree/decline behavior
- [x] Phase 3: Implement accessible responsive rating scales
- [x] Phase 4: Run logic, browser, visual, and code-review checks
- [ ] Phase 5: Commit, publish, and verify the production URL

## Key Questions
1. Is consent an informed, affirmative decision rather than a bundled checkbox?
2. Does declining prevent all task progression and data upload?
3. Do five- and seven-point labels remain legible without overflow at all tested widths?

## Decisions Made
- Source protection: all work remains in the English deployment copy.
- Repository: `LISHILIpsychology/English-BART-Lexical-BMRQ-jsPsych`.
- Consent: written participant information is shown before any task; agree and decline are mutually exclusive radio options.
- Identity: Study ID remains visible and copyable as a backup, but participants are not required to memorize it.
- Missing institution-specific ethics/contact details are not invented; the page refers participants to the invitation while documentation flags final ethics review.
- Rating layout: numeric rating scales use a dedicated responsive component with visible radio controls and stable labels.

## Errors Encountered
- GitHub CLI is not installed. Use existing Git credentials and the GitHub connector where needed.
- System Node/npm are not on PATH. Locate and use the bundled workspace runtime.
- Direct PowerShell deletion of obsolete copied assets was blocked by policy. Used a verified Git clean path after confirming the target directory.

## Status
**Currently in Phase 5** - preparing the verified copy for GitHub Pages deployment.
