"""Family theme nights (docs/eval-plan.md section 3), exactly as written there.

Outcome: each theme night's residual from section 1's model (fit per tier on 2025 and 2026 together, every promotion flag).
Scores: Qloo local taste (the subject's affinity in the club's market minus its mean across club markets), the assistant's 0-10
rating, and a placebo (the same subject's Qloo local taste in another club's market, fixed pairing, seed 21). The amendment adds
arm 1b, heatmap pull within 60 km of the ballpark (data/cache/themes/heatmap-pulls.json), with its own placebo. Residual and scores
are demeaned within subject; Spearman over all kept games; 95% intervals from 2,000 bootstrap resamples of clubs.

Inputs: data/raw/games-*.json (gitignored), data/teams/baseball.json, data/cache/themes/{subjects,scores}.json (gitignored).
Writes aggregates only to data/eval/theme-nights.json. Run: python analysis/theme_eval.py
"""

import importlib.util
import json
import random
import re
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

ROOT = Path(__file__).resolve().parent.parent
BOOT = 2000

spec = importlib.util.spec_from_file_location("lift", ROOT / "analysis/lift.py")
lift = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lift)


def theme_name(name):
    name = re.sub(r"\s+(presented|powered|sponsored|brought to you)\s+by\b.*$", "", name, flags=re.I)
    return re.sub(r"\s+", " ", name).strip()


subjects = json.loads((ROOT / "data/cache/themes/subjects.json").read_text(encoding="utf-8"))
scores = json.loads((ROOT / "data/cache/themes/scores.json").read_text(encoding="utf-8"))
kept = set(scores["kept"])
teams = [t["id"] for t in json.loads((ROOT / "data/teams/baseball.json").read_text(encoding="utf-8"))["teams"]]

# Each kept game's subject: the first family-safe theme on it whose subject was kept.
subject_of = {}
for season in ("2025", "2026"):
    for g in json.loads((ROOT / f"data/raw/games-{season}.json").read_text(encoding="utf-8")):
        for p in g["promos"]:
            if p["type"] != "Theme Days" or not p["name"]:
                continue
            a = subjects.get(theme_name(p["name"]))
            if a and a["subject"] in kept and a["allAges"] and not a["vice"]:
                subject_of[(season, g["homeId"], g["date"])] = a["subject"]
                break

# Residuals from the section 1 model, per tier.
games = pd.concat([lift.load("2025"), lift.load("2026")], ignore_index=True)
rows = []
for tier, sports in lift.TIERS.items():
    df = games[games["sport"].isin(sports)].copy()
    df["resid"] = lift.fit(df).resid
    for r in df[df["theme"] == 1].itertuples():
        s = subject_of.get((r.season, r.club, r.date))
        if s:
            rows.append({"tier": tier, "club": f"mlb-{r.club}", "subject": s, "resid": r.resid})
kept_games = pd.DataFrame(rows)

# Qloo local taste: affinity in the club's market minus the subject's mean across club markets.
affinity = {(club, s): a for club, by in scores["qloo"].items() for s, a in by.items()}
mean = {s: np.mean([a for (c, s2), a in affinity.items() if s2 == s]) for s in kept if any(s2 == s for (_, s2) in affinity)}
local = lambda club, s: affinity[(club, s)] - mean[s] if (club, s) in affinity else np.nan

shuffled = teams[:]
random.Random(21).shuffle(shuffled)
placebo_club = {shuffled[i]: shuffled[(i + 1) % len(shuffled)] for i in range(len(shuffled))}

kept_games["qloo"] = [local(c, s) for c, s in zip(kept_games["club"], kept_games["subject"])]
# A club no longer in the 150 (it moved or changed level since 2025) has no scores and no placebo partner: its games drop out.
kept_games["placebo"] = [local(placebo_club[c], s) if c in placebo_club else np.nan for c, s in zip(kept_games["club"], kept_games["subject"])]
kept_games["assistant"] = [scores["assistant"].get(c, {}).get(s, np.nan) for c, s in zip(kept_games["club"], kept_games["subject"])]

# Arm 1b (amendment): heatmap pull at the club's ballpark, and at its placebo club's.
pulls = json.loads((ROOT / "data/cache/themes/heatmap-pulls.json").read_text(encoding="utf-8"))
pull = lambda club, s: pulls.get(s, {}).get(club, np.nan)
kept_games["heatmap"] = [pull(c, s) for c, s in zip(kept_games["club"], kept_games["subject"])]
kept_games["heatmap_placebo"] = [pull(placebo_club[c], s) if c in placebo_club else np.nan for c, s in zip(kept_games["club"], kept_games["subject"])]


def demeaned(d, col):
    return d[col] - d.groupby("subject")[col].transform("mean")


def arm(d, col):
    """Spearman of demeaned residual with demeaned score, on the games that have the score."""
    d = d[d[col].notna()].copy()
    d["r"], d["s"] = demeaned(d, "resid"), demeaned(d, col)
    return d


def rho(d):
    return spearmanr(d["r"], d["s"]).statistic if len(d) > 2 else np.nan


def boot(frames, seed=7):
    """Bootstrap over clubs: one statistic per frame, or a difference when given two frames."""
    clubs = sorted(set().union(*[set(f["club"]) for f in frames]))
    rng = np.random.default_rng(seed)
    by_club = [{c: f[f["club"] == c] for c in clubs} for f in frames]
    stats = []
    for _ in range(BOOT):
        pick = rng.choice(clubs, len(clubs))
        values = [rho(pd.concat([b[c] for c in pick if len(b[c])])) for b in by_club]
        stats.append(values[0] if len(values) == 1 else values[0] - values[1])
    point = rho(frames[0]) if len(frames) == 1 else rho(frames[0]) - rho(frames[1])
    s = np.array([x for x in stats if not np.isnan(x)])
    return {"mean": round(float(point), 3), "ci95": [round(float(np.percentile(s, 2.5)), 3), round(float(np.percentile(s, 97.5)), 3)]}


def paired(d, a, b):
    both = d[d[a].notna() & d[b].notna()]
    return {**boot([arm(both, a), arm(both, b)]), "n": int(len(both))}


def main():
    arms = {k: arm(kept_games, k) for k in ("qloo", "placebo", "assistant", "heatmap", "heatmap_placebo")}
    both = kept_games[kept_games["qloo"].notna() & kept_games["placebo"].notna()]
    with_assistant = kept_games[kept_games["qloo"].notna() & kept_games["assistant"].notna()]
    result = {
        "plan": "docs/eval-plan.md section 3",
        "theme_games_with_kept_subject": int(len(kept_games)),
        "subjects": int(kept_games["subject"].nunique()),
        "clubs": int(kept_games["club"].nunique()),
        "games_by_tier": {k: int(v) for k, v in kept_games["tier"].value_counts().items()},
        "top_subjects": {k: int(v) for k, v in kept_games["subject"].value_counts().head(15).items()},
        "spearman_demeaned_residual_vs_score": {k: {**boot([d]), "n": int(len(d))} for k, d in arms.items()},
        "qloo_minus_placebo": {**boot([arm(both, "qloo"), arm(both, "placebo")]), "n": int(len(both))},
        "qloo_minus_assistant": {**boot([arm(with_assistant, "qloo"), arm(with_assistant, "assistant")]), "n": int(len(with_assistant))},
        "amendment_heatmap": {
            "heatmap_minus_placebo": paired(kept_games, "heatmap", "heatmap_placebo"),
            "heatmap_minus_assistant": paired(kept_games, "heatmap", "assistant"),
            "subjects_scored": int(kept_games[kept_games["heatmap"].notna()]["subject"].nunique()),
        },
        "arm1_subjects_scored": int(kept_games[kept_games["qloo"].notna()]["subject"].nunique()),
    }
    out = ROOT / "data/eval"
    out.mkdir(parents=True, exist_ok=True)
    (out / "theme-nights.json").write_text(json.dumps(result, indent=1) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
