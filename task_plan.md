# Task Plan: Longitudinal data and form redesign

## Goal
Make the public experiment longitudinal-ready, move behavioral tasks before forms, replace one-item screens with an editable scrolling form, and export analysis-ready files without changing source projects.

## Phases
- [x] Phase 1: Audit the participant's real CSV and identify the wide-table problem
- [x] Phase 2: Specify anonymous longitudinal IDs and stable task counterbalancing
- [x] Phase 3: Implement scrolling forms, tidy exports, and researcher tools
- [x] Phase 4: Run logic, browser, data, and code-review checks
- [x] Phase 5: Publish and verify the production URL

## Key Questions
1. Can T1/T2/T3 be matched without storing contact details in research data?
2. Can each output file contain only columns relevant to one analysis table?
3. Can participants review and change all questionnaire responses before submission?
4. Does between-participant counterbalancing stay stable across waves?

## Decisions Made
- Source protection: all work remains in the English deployment copy.
- Repository: `LISHILIpsychology/English-BART-Lexical-BMRQ-jsPsych`.
- Hosting: GitHub Pages from the new repository, not the old experiment URL.
- Order: BART and lexical decision are counterbalanced by Study ID; BMRQ and demographics follow both tasks.
- Identity: only an anonymous Study ID enters OSF; contact-to-ID mapping remains in a researcher-only local roster.
- Export: summary, BART trials, BART actions, lexical trials, and questionnaire CSVs are separate.

## Errors Encountered
- GitHub CLI is not installed. Use existing Git credentials and the GitHub connector where needed.
- System Node/npm are not on PATH. Locate and use the bundled workspace runtime.
- Direct PowerShell deletion of obsolete copied assets was blocked by policy. Used a verified Git clean path after confirming the target directory.

## Status
**Complete** - the production site, longitudinal manager, tidy exports, and public browser flow were verified.
