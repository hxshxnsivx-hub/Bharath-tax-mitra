"""
Advocate-Adversary Decision Engine — Bharat Tax Mitra 2.0, Module 5.5.1.

The pure tax optimiser (Module 5.1) minimises rupees. But the *right* choice for
a real taxpayer also weighs the soft costs the rupee figure can't see: the
paperwork burden of the old regime, capital locked in 80C/NPS instruments, and
how defensible each claim is. This engine layers those criteria on top of the
optimiser and produces a WEIGHTED verdict.

It is deliberately deterministic and offline — no LLM. The advocate/adversary
*arguments* will later be authored by agents (Module 5.5.2), but the *scoring*
that adjudicates them lives here, so the decision is reproducible and auditable.

Each option (old vs new regime) is scored 0..1 on four criteria; a weight
profile turns those into a single composite. Flip the profile and the
recommendation can change — exactly the "for vs against, weighted" behaviour:
  · max_saving  — follow the rupees almost entirely
  · balanced    — rupees matter most, but effort/liquidity/certainty count
  · min_effort  — prefer the simpler, more-liquid, more-certain choice unless
                  the saving is large

The soft-criterion scores are transparent, documented heuristics — NOT statute.
They shape presentation and tie-breaking, never the tax numbers themselves.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from src.optimization.tax_optimizer import OptimizerInput, optimize

# Weight profiles over the four criteria. Each sums to 1.0.
WEIGHT_PROFILES: dict[str, dict[str, float]] = {
    "max_saving": {"saving": 0.85, "effort": 0.05, "liquidity": 0.05, "certainty": 0.05},
    "balanced":   {"saving": 0.50, "effort": 0.20, "liquidity": 0.15, "certainty": 0.15},
    "min_effort": {"saving": 0.30, "effort": 0.30, "liquidity": 0.25, "certainty": 0.15},
}

# Soft-criterion heuristics (documented, not statutory):
_OLD_EFFORT_SCORE = 0.5     # old regime always needs proof for every claim
_NEW_EFFORT_SCORE = 1.0     # new regime: nothing to substantiate
_OLD_CERTAINTY_SCORE = 0.75  # deductions can be questioned in assessment
_NEW_CERTAINTY_SCORE = 1.0
_LIQUIDITY_CAP = 200_000.0   # 80C + 80CCD(1B) ceiling — the most that can be locked


@dataclass
class OptionScore:
    regime: str
    tax: int
    composite: float
    breakdown: dict[str, float]


@dataclass
class DecisionResult:
    weight_profile: str
    recommended_regime: str        # highest weighted composite
    pure_min_tax_regime: str       # the cheaper regime on rupees alone
    weighted_overrides_rupees: bool  # True when soft criteria flipped the choice
    options: list[OptionScore]     # ranked, best first
    advocate: list[str]
    adversary: list[str]
    note: str

    def to_dict(self) -> dict:
        return {
            "weightProfile": self.weight_profile,
            "recommendedRegime": self.recommended_regime,
            "pureMinTaxRegime": self.pure_min_tax_regime,
            "weightedOverridesRupees": self.weighted_overrides_rupees,
            "options": [
                {"regime": o.regime, "tax": o.tax, "composite": round(o.composite, 4), "breakdown": o.breakdown}
                for o in self.options
            ],
            "advocate": self.advocate,
            "adversary": self.adversary,
            "note": self.note,
        }


def decide(inp: OptimizerInput, weight_profile: str = "balanced") -> DecisionResult:
    if weight_profile not in WEIGHT_PROFILES:
        raise ValueError(
            f"Unknown weight profile {weight_profile!r}; expected one of {sorted(WEIGHT_PROFILES)}"
        )
    w = WEIGHT_PROFILES[weight_profile]

    opt = optimize(inp)
    old_tax, new_tax = opt.old_tax_optimal, opt.new_tax
    t_hi, t_lo = max(old_tax, new_tax), min(old_tax, new_tax)
    span = t_hi - t_lo

    def saving_score(tax: int) -> float:
        # Cheaper option scores 1, dearer scores 0; equal → both 1.
        return 1.0 if span == 0 else (t_hi - tax) / span

    old_liquidity = 1.0 - min(1.0, opt.budget_deployed / _LIQUIDITY_CAP)
    old_breakdown = {
        "saving": round(saving_score(old_tax), 4),
        "effort": _OLD_EFFORT_SCORE,
        "liquidity": round(old_liquidity, 4),
        "certainty": _OLD_CERTAINTY_SCORE,
    }
    new_breakdown = {
        "saving": round(saving_score(new_tax), 4),
        "effort": _NEW_EFFORT_SCORE,
        "liquidity": 1.0,
        "certainty": _NEW_CERTAINTY_SCORE,
    }

    def composite(bd: dict[str, float]) -> float:
        return sum(w[k] * bd[k] for k in w)

    old_opt = OptionScore("old", old_tax, composite(old_breakdown), old_breakdown)
    new_opt = OptionScore("new", new_tax, composite(new_breakdown), new_breakdown)

    options = sorted([old_opt, new_opt], key=lambda o: o.composite, reverse=True)
    recommended = options[0].regime
    pure_min = "new" if new_tax <= old_tax else "old"
    overrides = recommended != pure_min

    # Reuse the optimiser's grounded arguments; add the weighting rationale.
    advocate = list(opt.advocate)
    adversary = list(opt.adversary)

    if overrides:
        note = (
            f"On rupees alone the {pure_min} regime is cheaper by ₹{span:,}, but under the "
            f"'{weight_profile}' weighting the {recommended} regime wins on effort, liquidity and "
            "certainty — the saving is too small to justify the paperwork and locked capital."
        )
    elif span == 0:
        note = "Both regimes cost the same; the new regime is preferred for simplicity."
    else:
        note = (
            f"The {recommended} regime is both the cheaper choice (by ₹{span:,}) and the winner "
            f"under the '{weight_profile}' weighting."
        )

    return DecisionResult(
        weight_profile=weight_profile,
        recommended_regime=recommended,
        pure_min_tax_regime=pure_min,
        weighted_overrides_rupees=overrides,
        options=options,
        advocate=advocate,
        adversary=adversary,
        note=note,
    )
