# ITR JSON Schemas

Canonical JSON Schemas for validating the ITR JSON that Bharat Tax Mitra
generates. **Single source** for both the frontend (Ajv, offline) and the
backend export Lambda (Python `jsonschema`) — do not duplicate; import from here
(OPT-P3.1: one schema, two validators).

## Files

| File | Form | AY | Status |
|------|------|----|--------|
| `itr1-fy2025-26.schema.json` | ITR-1 (Sahaj) | 2025-26 | v1.0.0 — faithful subset (see below) |

## ⚠️ Provenance & the production gate

These schemas mirror the **structure** of the IT Portal ITR JSON as documented
in `design.md` (the `ITR1Export` interface) and cover exactly the fields this app
produces for a salary + other-sources filer. They are a **faithful subset**, not
the verbatim government schema.

**Before production filing, replace with the official schema:**

1. Download the current offline utility from the IT Department:
   <https://www.incometax.gov.in/iec/foportal/downloads/offline-utilities>
2. Extract the bundled ITR-1/2/3/4 JSON schema files for the target AY.
3. Diff field names against these subsets and reconcile the generator
   (`frontend/src/services/itrExport.ts`) + validator.
4. Bump the version and the `$comment` provenance block, and record the source
   date here.

This procurement step is tracked as task **3.2.1a** and is a hard production
gate — the app can develop and self-test against these subsets, but a real
filing must validate against the official schema the portal itself uses.

## Annual refresh

The IT Department publishes updated schemas each assessment year. On the annual
refresh: repeat the steps above for the new AY, add a new
`itrN-fyYYYY-YY.schema.json`, and keep the prior year's file for amended returns.
