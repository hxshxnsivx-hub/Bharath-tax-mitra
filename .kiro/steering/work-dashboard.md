---
inclusion: auto
---

# Bharat Tax Mitra — Master Work Dashboard

> Auto-included in every Kiro session. **Last verified: 2026-08-05** against the live tree with a full green gate.
> Methodology: every claim below was re-derived from source files + test runs on the day of writing — not carried
> forward from a previous dashboard. The prior revision of this file (pre-Module-0) was **entirely obsolete**: all
> seven of its "critical gaps" have since been closed. Do not trust an unverified dashboard; re-run the gate.

---

## ✅ CURRENT GATE — all green (2026-08-05)

| Gate | Command | Result |
|------|---------|--------|
| Backend tests | `cd backend && python -m pytest -q` | **204 passed**, coverage **82.95%** (fail-under 70%) |
| Frontend tests | `cd frontend && npx vitest run` | **446 passed**, 17 skipped (43 files pass, 1 skipped) |
| Types | `cd frontend && npx tsc --noEmit` | **0 errors** |
| Lint | `npm run lint --workspace=frontend` | **clean** (`--max-warnings 0`) |
| Build | `npm run build` | **✓** — PWA precache 30 entries / 1573.65 KiB |
| Bundle | `npm run check:bundle` | **PASS** — 324.11 KB gz initial vs 500 KB budget |

Run them in that order — it mirrors CI.

---

## 📊 PHASE PROGRESS (verified checkbox counts, `.kiro/specs/bharat-tax-mitra/tasks.md`)

| Phase | Done | Partial | Todo | Total | % | Status |
|-------|------|---------|------|-------|---|--------|
| Module 0 — Gap closures | 43 | 0 | 1 | 44 | **98%** | Only DLT production OTP (0.6) left — telecom-gated |
| Phase 1 — Foundation & tax engine | 29 | 0 | 2 | 31 | **94%** | Shipped. 2 open = optional `*` property tests |
| Phase 2 — Document AI | 0 | 0 | 25 | 25 | **0%** | Not started; **re-scoped into Phase 5** (Anthropic, not Textract/Bedrock) |
| Phase 3 — Compliance & export | 10 | 2 | 6 | 18 | **61%** | Client-side ITR JSON + PDF + dual validator done |
| Phase 4 — Privacy & production | 18 | 3 | 24 | 45 | **43%** | All *client* legs done; the rest is AWS-deploy or human-audit |
| Module OPT — Enhancement pass | 14 | 0 | 10 | 24 | **58%** | Cross-cutting + UI polish done |
| Phase 5 — BTM 2.0 (agentic) | 9 | 1 | 22 | 32 | **30%** | Optimiser + decision engine + provider + assistant UI in |
| **Total** | **123** | **6** | **90** | **219** | **~58%** | |

**The honest read**: ~58% raw understates it. Almost every open item is gated on *an AWS account, an
Anthropic API key, an official IT-Portal schema file, or a human audit lab* — not on local build work.
The locally-buildable surface is largely complete.

---

## 🎯 WHAT IS ACTUALLY BUILDABLE RIGHT NOW (no key, no cloud)

Ranked. These are the only meaningful tasks that need nothing but this repo:

| # | Task | Why it's unblocked | Where |
|---|------|--------------------|-------|
| 1 | **5.9.1 / 5.9.2** — full category taxonomy + per-category eligibility & document checklists | Pure data + routing. `assistantData.ts` already has 8 categories; the spec wants 9 mains (Salaried · Business · Professional · Investor · Property · Senior · HUF · NRI · Company) with sub-trees | `frontend/src/components/assistant/assistantData.ts` |
| 2 | **5.4.2** — schema-constrained output | The dependency-free draft-07 walker already exists and is proven; point it at a *plan* schema as well as the ITR one | `frontend/src/services/itrValidator.ts` |
| 3 | **OPT-P1.1** — tax calculator in a Web Worker | Engine is pure and golden-vector-pinned; moving it off the main thread is mechanical | `frontend/src/services/taxCalculator.ts` |
| 4 | **1.3.5 / 1.6.5 / 3.2.4** — the optional `*` property tests | `fast-check` is already a dependency | `frontend/src/services/__tests__/` |
| 5 | **5.1.2** — CP-SAT model | Needs `ortools` in `backend/requirements.txt`; only worth it once caps genuinely interact | `backend/src/optimization/` |
| 6 | **OPT-UI.5 / UI.6** — bottom-sheet + form UX | Deferred by decision, not blocked | `frontend/src/components/ui/` |

Everything else needs: an **AWS account** (Phase 2 infra, 4.1/4.2/4.4/4.7, server PDF), an **Anthropic API key**
(5.3 swarm, 5.4.3+ RAG, 5.2.3 streaming), the **official IT-Portal schema** (3.2.1a → Phase 3 checkpoint),
a **human audit lab** (4.13.x), or is **net-new domain work** (5.6 GST, 5.8 GAAR).

---

## 🔴 REAL OPEN RISKS (not "gaps" — these are live and worth acting on)

| # | Flag | Issue | Location | Action |
|---|------|-------|----------|--------|
| 1 | 🟠 | **The ITR-1 schema is a hand-written subset, not the official file.** Both validators pass against it, so a green validation today does **not** mean the IT Portal will accept the JSON. This is the single biggest correctness risk in the repo. | `shared/schemas/itr1-fy2025-26.schema.json` (+ `README.md` gate) | Task **3.2.1a** — source the offline-utility schema before any real filing |
| 2 | 🟠 | **Property-based testing is far thinner than the plan claims.** The Testing Strategy says "37 correctness properties"; `design.md` defines **46**; only Properties 1-4 are actually generative (`fast-check`, one file), and there are **zero `hypothesis` tests in the backend**. | `frontend/src/services/__tests__/taxCalculator.property.test.ts` | Either build the missing property tests or restate the claim honestly |
| 3 | 🟡 | **`ChatView.tsx` is a stale placeholder** that still advertises "Powered by Amazon Bedrock (Claude 3)" and "🚧 Coming in Phase 4" — both superseded by the 2026-07-18 provider migration, and a *working* assistant (`GuidedAssistant`) already ships elsewhere in the app. Users can reach a screen that contradicts the product. | `frontend/src/pages/views/ChatView.tsx` | Either point the Chat tab at `GuidedAssistant` or update the copy to the Phase 5 story |
| 4 | 🟡 | **Initial bundle nearly doubled** — 179.5 KB → **324.11 KB** gz since motion + assistant + charts landed. Still inside the 500 KB gate with 35% headroom, but Rollup now warns on chunk size. | `frontend/vite.config.ts` | A `manualChunks` pass before the next big feature |
| 5 | 🟡 | **`ExtractionProgress.tsx` is dead code** — nothing imports it, and its 12 runtime tests are `describe.skip`ped pending the Phase-2 / OPT-P2.5 push-channel decision. | `frontend/src/components/ExtractionProgress.tsx` | Leave parked, or delete and reinstate with 2.6.x |
| 6 | 🔵 | **Nothing is committed.** The working tree carries ~35 modified + a large untracked set (optimizer, providers, assistant, ITR export, golden vectors). Last commit is 2026-06-14 and its message is a typo (`Initalizing aoo>ts`). Weeks of verified work exists only on this disk. | repo root | Commit in coherent slices — this is a real data-loss exposure |
| 7 | 🔵 | **`4.11.2` sync-frequency adaptation is unbuilt** even though its input layer exists — `useNetworkQuality` detects 2G/slow-2G, but `syncService` only does fixed exponential backoff and never consults it. | `frontend/src/services/syncService.ts` | Thread `isSlow` into the retry cadence |

---

## 🧭 ARCHITECTURE INVARIANTS — do not regress these

These were each hard-won; breaking one silently reintroduces a fixed bug.

- **Tax maths lives in exactly two places** (`taxCalculator.ts`, `calculate.py`) kept in lockstep by
  `shared/golden-vectors.json` (24 statutory-boundary vectors). The optimiser, the mock server and the
  assistant **call** the engine — they never re-implement it. Regenerate vectors only on a deliberate
  tax-math change; the changed file *is* the review artifact.
- **Money is exact-integer half-up** — TS `pctOf`/`sumPctOf`/`roundRupee`, Python `_pct_of`/`_round_half_up`.
  Never bare Python `round()` (banker's rounding diverges from JS). Vectors V25-V27 sit on `.50` boundaries
  as tripwires.
- **ESLint config must stay at `frontend/.eslintrc.json`**, never repo root — ESLint 8 resolves plugins
  relative to the config dir and they're installed in `frontend/node_modules`.
- **No Ajv.** `itrValidator.ts` is a deliberate dependency-free draft-07 walker; Vite's dep pre-bundler
  mangles Ajv 8 (empty `instancePath`). Backend uses Python `jsonschema` against the *same* schema file.
- **PII masking lives only in `src/utils/pii.ts`** (client) and `backend/src/providers/pii.py` (server).
  Don't re-inline `redact`. Server-side redaction runs before *every* outbound model call.
- **Language state has two stores** (localStorage `btm_lang` + IndexedDB) and
  `i18n/config.ts::applyLanguageSideEffects` is the single side-effect path — it must also run at
  **startup restore**, because a no-op `changeLanguage` does not fire `languageChanged`.
- **Dependency-light by choice**: `AnimatedFigure` (rAF count-up) and `celebrate.ts` (canvas confetti) are
  hand-rolled on purpose. Don't "upgrade" them to libraries.
- **CDK stack order is database → appconfig → auth → frontend** (auth consumes AppConfig IDs).

---

## 🖥️ ENVIRONMENT GOTCHAS

- **Windows console is cp1252** — printing `₹` (U+20B9) from Python crashes. Use `PYTHONIOENCODING=utf-8`.
- **Single-file pytest runs need `--no-cov`** — default `addopts` enforce `--cov-fail-under=70` across
  `src/lambdas`+`src/shared`, so a one-file run fails on coverage alone.
- **The Browser pane runs pages with `document.hidden=true`** — Chrome suspends all `requestAnimationFrame`,
  so framer-motion never executes there and screenshots time out. Verify animation via DOM/computed-style
  probes with `javascript_tool`.
- **jsdom lacks `Element.scrollTo`** — calling it unguarded in a `useEffect` throws in the passive-effect
  phase and takes down the whole tree. Always `ref.current?.scrollTo?.({...})`.
- **jsdom never drives rAF**, so `src/test/setup.ts` stubs `matchMedia` to report `prefers-reduced-motion`
  as matching — that's why `AnimatedFigure` renders its final value in tests. Framer queries the bare
  `(prefers-reduced-motion)`, so match loosely.

---

## 📁 FILE STRUCTURE VERDICT

**Professional-grade. No restructuring required.** All three cleanup actions from the previous revision are
done: `frontend/src/types/` deleted, docs moved to `docs/frontend/`, `infrastructure/lib/stacks/` built out
(4 stacks). `backend/docs/` now holds `api.md` rather than being empty.

```
Bharath-tax-mitra/
├── frontend/          React 18 PWA — 44 test files, ui/ layout/ feedback/ motion/ charts/ assistant/ results/
├── backend/           Python 3.11 — lambdas/{auth,tax_calculation,tax_rules} + optimization/ + providers/
├── infrastructure/    CDK — database · appconfig · auth · frontend stacks
├── shared/            types + tax rules (FY25-26, FY26-27) + golden vectors + ITR schema
├── docs/              reference (Finance Bill PDF) + frontend/
└── .kiro/             specs (requirements · design · tasks) + steering (this file)
```

---

_Methodology: checkbox counts parsed from `tasks.md`; every "done" spot-checked against the implementing file
and its test; every gate re-run. Re-verify before trusting — this file ages badly._
