# Task Plan: Publish the English BART, lexical decision, and BMRQ experiment

## Goal
Audit, test, and publish the independent English experiment and verify its public URL and data pipeline without changing any original PsychoPy project or old GitHub repository.

## Phases
- [x] Phase 1: Confirm the isolated working copy and deployment target
- [x] Phase 2: Audit experiment logic, data schema, and upload behavior
- [x] Phase 3: Fix issues and run automated/local browser checks
- [x] Phase 4: Commit, push, enable GitHub Pages, and verify production
- [x] Phase 5: Produce deployment report and collection-readiness status

## Key Questions
1. Does the BART implementation count only pump actions and produce model-ready trial/action data?
2. Do fishing, lexical-decision, and questionnaire flows record complete, unambiguous data?
3. Does the unique filename scheme and DataPipe fallback work in production?
4. Is the new GitHub Pages URL reachable and independent of prior repositories?

## Decisions Made
- Source protection: all work remains in the English deployment copy.
- Repository: `LISHILIpsychology/English-BART-Lexical-BMRQ-jsPsych`.
- Hosting: GitHub Pages from the new repository, not the old experiment URL.

## Errors Encountered
- GitHub CLI is not installed. Use existing Git credentials and the GitHub connector where needed.
- System Node/npm are not on PATH. Locate and use the bundled workspace runtime.
- Direct PowerShell deletion of obsolete copied assets was blocked by policy. Used a verified Git clean path after confirming the target directory.

## Status
**Complete** - public deployment and the DataPipe collection path were verified.
