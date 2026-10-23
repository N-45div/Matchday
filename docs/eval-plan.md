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

## Amendment (Oct 13 2026, before any sponsor-fit result was computed)

Resolving 300 LLM-proposed names per club through Qloo search would take about 33,000 rate-limited calls, which isn't feasible. So the sponsor-fit test adds a second scoring method, applied identically to every ranker:

- **Name match:** a ranked brand counts as a hit if its name matches one of the club's 2026 presenter names under the same name-similarity guard used for label resolution. The rankers are Qloo's ranked entity names and the LLM's ranked names.
- **ID match** (as originally planned) is still reported for the Qloo rankers 1, 2, 3, 5 and 6.
- The LLM-only comparison uses the name match only.
- **Known bias, stated up front:** an LLM may recall published sponsor relationships from its training data. That favours the LLM arm, so a Desk win over it is conservative.

## Amendment 2 (Oct 13 2026, after the 2026 result, before any 2025 result)

The pre-registered 2026 test came out as follows:
- The Desk ranking beat the placebo.
- It **lost** to the LLM alone (name match, top 300: 136 vs 248).

An exploratory look at the same 2026 data showed the two find different sponsors: 85 of the Desk's 136 hits were missed by the LLM. That suggests a hybrid. Because the idea came from the 2026 data, it's tested here on a separate label set:

- **Labels:** each club's **2025** promotion presenters (same splitting and name guard).
- **Hybrid ranker:** the LLM's top 150 names followed by the Desk ranking's top 150 names, de-duplicated by name. That makes 300 names, the same length as the LLM-only list.
- **Test:** hybrid vs LLM-only top 300, name match, 2,000 bootstrap resamples of clubs.
- **Success:** hybrid finds more 2025 sponsors, with a 95% interval for the difference that excludes zero.
- **Caveat stated up front:** many sponsors renew year to year, so 2025 labels overlap with 2026. This is a replication on a second season, not a fully independent sample.
- The LLM lists are the same cached responses used for 2026 (the prompt doesn't depend on season).

## 3. Family theme nights (Oct 24 2026, written before any theme subject is extracted, resolved or scored)

**Question:** do theme nights draw more fans in towns whose taste runs toward the night's subject? If they do, Qloo can pick family theme nights a club's own town will turn out for, where an assistant would suggest the same few franchises everywhere (124 of the 150 clubs ran a Star Wars promotion in 2026).

- **Games:** the regular-season games of section 1 (2025 and 2026, final, attendance of 100 or more, no doubleheaders), MLB and the affiliated minor leagues, that carry a "Theme Days" promotion.
- **Subject of each theme.** For each distinct theme name, Claude Haiku 5.5 (a fixed prompt in `analysis/theme-subjects.mts`) names the pop-culture subject the night is built on: a film, TV show, franchise, character, music artist or game. It answers none for nights built on something else (appreciation and heritage nights, faith and family nights, drink specials, dogs, kids running the bases), and says whether the subject suits all ages.
- **Resolved in Qloo** with `/search`: the first result that is a brand, film, TV show, artist or video game.
- **Family-safe only.** A subject counts if the model says it suits all ages, it isn't about alcohol, gambling or tobacco, and, for a film, Qloo's content rating isn't R or NC-17.
- **Subjects kept:** those with theme nights at three or more different clubs, so each can be compared across towns.
- **Outcome:** the game's residual from the section 1 model, fitted per tier on 2025 and 2026 together with every promotion flag: log attendance minus the fitted value. Positive means the night drew more than the model expects for a theme night at that club on that date.
- **Scores for each game's subject in its club's town (the arms):**
  1. **Qloo local taste.** The subject's affinity from `/v2/insights` with `signal.location.query` set to the club's market (the location the sponsor board uses) and `filter.results.entities` listing the kept subjects of that type, minus the subject's mean affinity across all club markets where Qloo returns it. A pair Qloo doesn't return is left out.
  2. **Assistant.** Claude Haiku 5.5 rates from 0 to 10 how strongly families in the club's town would turn out for a night built on the subject, compared with a typical town with a ballclub (a fixed prompt, no tools or data).
  3. **Placebo.** The Qloo local score of the same subject in another club's market, from a fixed random pairing of clubs (seed 21).
- **Analysis.** The residual and each score are demeaned within subject, so a subject is only ever compared with itself across towns and national popularity drops out. Then the Spearman correlation of the demeaned residual with each demeaned score, over all kept games, with a 95% interval from 2,000 bootstrap resamples of clubs. Paired bootstrap differences: Qloo minus placebo, Qloo minus assistant.
- **Success:** Qloo's correlation is above zero with an interval that excludes zero, and above the placebo's. Qloo against the assistant is reported either way.
- **Product rule, fixed now.** Matchday suggests family theme nights for each club from Qloo local taste either way. If the test succeeds, the page says the ranking was tested and how; if it doesn't, the page says the ranking is untested and shows the result.
- **Does not establish:** clubs choose their own themes, and may already pick ones their town likes, so this is association, not a controlled test. A night's draw also reflects its giveaway, marketing and the opponent. The number of games per subject may be small, so a null result is possible and will be reported as such.

### Amendment to section 3 (Oct 24 2026, after scoring coverage was seen, before any outcome was computed)

- **Why.** Arm 1 returns too little. On the first 20 clubs, Qloo's location insights returned a score for 128 of 520 subject-town pairs (25%), and none at all for subjects such as Harry Potter (37 clubs ran a night on it) and Toy Story. Arm 1 stays as written and is still reported, but it rests on a handful of subjects.
- **Arm 1b, Qloo heatmap pull.** One national Qloo heatmap per kept subject (`filter.type=urn:heatmap`, `signal.interests.entities` set to the subject), then each club's pull: the popularity-weighted mean affinity of the heatmap cells within 60 km of its ballpark (`analysis/theme-heatmaps.mts`). Demeaned within subject like the other scores. This is the measure the agent's live theme check uses.
- **Placebo for arm 1b:** the same subject's heatmap pull at another club's ballpark, from the same fixed pairing (seed 21).
- **Same analysis and success rule** as arm 1, plus paired differences 1b minus its placebo and 1b minus the assistant.
- **Product rule, replacing the one above.** The desk ranks a club's theme ideas by heatmap pull, which covers every kept subject and club. If arm 1b succeeds, the page says that ranking was tested and how; otherwise it says the ranking is untested and shows the result. Arm 1 is reported either way.
