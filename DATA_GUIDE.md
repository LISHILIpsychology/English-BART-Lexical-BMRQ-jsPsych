# Data Guide

Each participant visit uploads five CSV files with the same filename prefix.

## 1. `summary.csv`

One row per visit. Start here for most analyses. It contains the stable `study_id`, visit `wave`, unique `session_id`, task order, BART summary measures, lexical decision accuracy/RT, and BMRQ scores.

## 2. `bart_trials.csv`

One row per balloon, including practice and formal balloons. Formal modeling fields include `subjID`, `trial`, `pumps`, and `explosion`, plus the hidden breakpoint, seed, earnings, banked total, and trial RT.

`pumps` counts only Space presses. Enter never adds a pump.

## 3. `bart_actions.csv`

One row per pump or collect action. Use this only for detailed action-sequence or within-balloon timing analysis.

## 4. `lexical_trials.csv`

One row per lexical decision trial with stimulus, lexicality, response, accuracy, timeout, and RT.

## 5. `questionnaire.csv`

One row per BMRQ or background item. It stores question IDs and coded responses without long question wording.

## Longitudinal Join

Join visits using `study_id`. Keep `wave` in long format or pivot T1/T2/T3 as needed. Never join using `session_id`, because every visit intentionally receives a new session identifier.

## Privacy

The researcher roster is separate. It maps a contact label to `study_id`, exists only in page memory until exported, and must not be uploaded to the public GitHub repository, DataPipe, or OSF research-data component.
