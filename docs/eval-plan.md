# Evaluation plan (written before any result is computed)

This file is committed before the evaluation scripts run, so the method can't drift to fit the result. Every number in the app's Proof tab comes from the two tests below. Each result is reported whether it is positive, null or negative.

## 1. Promotion lift (MLB and affiliated Minor League Baseball)

**Question:** how much does each kind of promotion change single-game attendance, and does a model fitted on one season hold up on the next?

- **Data:** regular-season games from the MLB Stats API, 2025 (fit) and 2026 (holdout); games with attendance of 100 or more. Raw rows stay local (`data/raw/`); only coefficients and per-club baselines are committed.
- **Promotion flags** (from the promotion type and name; a game can carry several):
  - fireworks: name mentions fireworks
  - bobblehead: name mentions bobblehead
  - other giveaway: type "Giveaway", not a bobblehead
  - theme night: type "Theme Days"
  - ticket offer: type "Ticket Offer"
  - opening day: name mentions opening day or night
- **Model:** log(attendance) on the promotion flags, plus:
  - club-season fixed effects
  - day of week
  - month
  - day/night
  - temperature bands
  - rain or delay

  Standard errors are clustered by club. Weekday (Mon-Thu) and weekend interactions are fitted for fireworks and giveaways.
- **Holdout check:** predict 2026 log attendance from the 2025 fit (club baselines re-estimated from 2026 games without promotions). Report:
  - mean absolute error against a weekday-and-month-only baseline;
  - whether each promotion coefficient's 2026 estimate falls inside the 2025 95% interval.
- **Reported as:** percentage lift with a 95% interval, by league tier.
- **Does not establish:** causation. Clubs choose when to run promotions, so these are observed associations after the controls above.

## 2. Sponsor fit (does the sponsor board name brands that really sponsor the club?)

**Question:** for each club, do the regional consumer brands ranked highest by the Desk include the brands that presented that club's 2026 promotions?

- **Labels:** each club's 2026 `presentedBy` names, split on separators, resolved to Qloo brands with a name-similarity guard. A label is rejected if it resolves to the club itself or another sports team. The resolution rate is reported, along with a hand check of 50 resolutions.
- **Rankers, each producing 300 brands per club:**
  1. City taste: Qloo brand insights with the club's city as the location signal.
  2. City + fan base: the same, plus the club's own Qloo entity as an interest signal, where one exists.
  3. Desk ranking: rank fusion of 1 and 2 (the product's ranking).
  4. LLM only: a fixed prompt asking for 300 regional consumer brands likely to sponsor the club; names resolved with the same guard.
  5. Placebo: ranker 1 run for a different club's city.
  6. National: the same brand insights with no location signal.
- **Metrics:** sponsors found in the top 100 and top 300, pooled and per club. 95% intervals from 2,000 bootstrap resamples of clubs.
- **Success:** the Desk ranking beats both LLM-only and placebo in the top 300, with an interval for the difference that excludes zero.
- **Reported as:** found / labelled, per ranker, with intervals. The share of real sponsors Qloo cannot resolve at all (local services, banks, dealers) is stated next to it.
- **Does not establish:** that a suggested brand would sign. Labels show who bought, not who should.
