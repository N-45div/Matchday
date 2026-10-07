"""Promotion lift model, following docs/eval-plan.md section 1.

Reads data/raw/games-<season>.json (from scripts/pull-games.mjs) and data/teams/baseball.json.
Writes only aggregates: data/lift/lift.json (coefficients, intervals, holdout check) and
data/lift/baselines.json (per-club average attendance by weekday and month).

Run: python analysis/lift.py
"""

import json
import re
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf

ROOT = Path(__file__).resolve().parent.parent
TIERS = {"MLB": [1], "MiLB": [11, 12, 13, 14]}
PROMO_TERMS = ["fireworks", "bobblehead", "giveaway", "theme", "ticket_offer", "opening"]


def load(season: str) -> pd.DataFrame:
    games = json.loads((ROOT / f"data/raw/games-{season}.json").read_text(encoding="utf-8"))
    rows = []
    for g in games:
        if g["status"] != "Final" or not g["attendance"] or g["attendance"] < 100 or g["doubleHeader"] == "Y":
            continue
        names = " ".join((p["name"] or "") for p in g["promos"]).lower()
        types = {p["type"] for p in g["promos"]}
        bobble = "bobble" in names
        weather = g["weather"] or {}
        condition = (weather.get("condition") or "").lower()
        temp = weather.get("temp")
        rows.append(
            {
                "season": season,
                "sport": g["sportId"],
                "club": g["homeId"],
                "date": g["date"],
                "attendance": g["attendance"],
                "fireworks": int("firework" in names),
                "bobblehead": int(bobble),
                "giveaway": int("Giveaway" in types and not bobble),
                "theme": int("Theme Days" in types),
                "ticket_offer": int("Ticket Offer" in types),
                "opening": int(bool(re.search(r"opening (day|night)", names))),
                "night": int(g["dayNight"] == "night"),
                "rain": int(bool(re.search(r"rain|drizzle|shower", condition))),
                "delayed": int((g["delayMinutes"] or 0) > 0),
                "temp_band": "missing" if temp is None or np.isnan(temp) else str(int(min(max(temp, 40), 99) // 10 * 10)),
            }
        )
    df = pd.DataFrame(rows)
    d = pd.to_datetime(df["date"])
    df["weekday"] = d.dt.day_name()
    df["month"] = d.dt.month.astype(str)
    df["midweek"] = d.dt.dayofweek.isin([0, 1, 2, 3]).astype(int)
    df["club_season"] = df["club"].astype(str) + "_" + df["season"]
    df["log_att"] = np.log(df["attendance"])
    return df


CONTROLS = "C(weekday) + C(month) + night + C(temp_band) + rain + delayed"
PROMOS = " + ".join(PROMO_TERMS) + " + fireworks:midweek + giveaway:midweek + bobblehead:midweek"


def fit(df: pd.DataFrame, with_promos: bool = True):
    formula = f"log_att ~ {PROMOS + ' + ' if with_promos else ''}{CONTROLS} + C(club_season)"
    return smf.ols(formula, data=df).fit(cov_type="cluster", cov_kwds={"groups": df["club"]})


def pct(b: float) -> float:
    return round(100 * (np.exp(b) - 1), 1)


def effects(model) -> dict:
    out = {}
    ci = model.conf_int()
    for term in PROMO_TERMS + ["fireworks:midweek", "giveaway:midweek", "bobblehead:midweek"]:
        out[term] = {"lift_pct": pct(model.params[term]), "ci95": [pct(ci.loc[term, 0]), pct(ci.loc[term, 1])], "p": round(float(model.pvalues[term]), 4)}
    for base in ["fireworks", "giveaway", "bobblehead"]:
        b = model.params[base] + model.params[f"{base}:midweek"]
        out[f"{base}_midweek_total"] = {"lift_pct": pct(b)}
    return out


def holdout_mae(train: pd.DataFrame, test: pd.DataFrame, with_promos: bool) -> float:
    """Fit on train, re-estimate each club's baseline from test games without promotions, score all test games."""
    model = fit(train, with_promos)
    params = model.params
    design = test.copy()
    shared = [p for p in params.index if not p.startswith("C(club_season)") and p != "Intercept"]
    # Rebuild the shared part of the prediction term by term.
    contrib = np.zeros(len(design))
    for name in shared:
        m = re.match(r"C\((\w+)\)\[T\.(.+)\]", name)
        if m:
            col, level = m.groups()
            contrib += params[name] * (design[col].astype(str) == level).to_numpy()
        elif ":" in name:
            a, b = name.split(":")
            contrib += params[name] * (design[a] * design[b]).to_numpy()
        else:
            contrib += params[name] * design[name].to_numpy()
    design["shared"] = contrib
    no_promo = design[design[PROMO_TERMS].sum(axis=1) == 0]
    baseline = (no_promo["log_att"] - no_promo["shared"]).groupby(no_promo["club"]).mean()
    design = design[design["club"].isin(baseline.index)]
    pred = design["club"].map(baseline) + design["shared"]
    return round(float(np.mean(np.abs(np.exp(pred) - design["attendance"]))), 1)


def main() -> None:
    games = pd.concat([load("2025"), load("2026")], ignore_index=True)
    result = {"source": "MLB Stats API, regular season", "seasons": ["2025", "2026"], "tiers": {}}
    for tier, sports in TIERS.items():
        df = games[games["sport"].isin(sports)]
        train, test = df[df["season"] == "2025"], df[df["season"] == "2026"]
        m25, m26 = fit(train), fit(test)
        e25, e26 = effects(m25), effects(m26)
        stable = {t: bool(e25[t]["ci95"][0] <= e26[t]["lift_pct"] <= e25[t]["ci95"][1]) for t in PROMO_TERMS}
        result["tiers"][tier] = {
            "games": {"2025": int(len(train)), "2026": int(len(test))},
            "clubs": int(df["club"].nunique()),
            "fit_2025": e25,
            "fit_2026": e26,
            "pooled": effects(fit(df)),
            "holdout_2026": {
                "mae_with_promotions": holdout_mae(train, test, True),
                "mae_without_promotions": holdout_mae(train, test, False),
                "coefficient_2026_inside_2025_ci": stable,
            },
        }
        print(tier, "games", len(df), "fireworks", result["tiers"][tier]["pooled"]["fireworks"], "holdout", result["tiers"][tier]["holdout_2026"])

    plain = games[games[PROMO_TERMS].sum(axis=1) == 0]
    baselines = {}
    for key in ["weekday", "month"]:
        grouped = plain.groupby(["club", "season", key])["attendance"].agg(["mean", "count"]).round(0).reset_index()
        for r in grouped.itertuples(index=False):
            club = baselines.setdefault(f"mlb-{r.club}", {}).setdefault(r.season, {"weekday": {}, "month": {}})
            club[key][getattr(r, key)] = {"mean": int(r.mean), "games": int(r.count)}
    out = ROOT / "data/lift"
    out.mkdir(parents=True, exist_ok=True)
    (out / "lift.json").write_text(compact_json(result, inline_depth=3) + "\n", encoding="utf-8")
    (out / "baselines.json").write_text(compact_json(baselines, inline_depth=1) + "\n", encoding="utf-8")


def compact_json(obj, inline_depth: int, depth: int = 0) -> str:
    """Pretty-prints the top levels and keeps anything deeper than inline_depth on one line."""
    if not isinstance(obj, dict) or depth >= inline_depth:
        return json.dumps(obj, separators=(",", ":"))
    pad = "  " * (depth + 1)
    items = [f'{pad}{json.dumps(k)}: {compact_json(v, inline_depth, depth + 1)}' for k, v in obj.items()]
    return "{\n" + ",\n".join(items) + "\n" + "  " * depth + "}"


if __name__ == "__main__":
    main()
