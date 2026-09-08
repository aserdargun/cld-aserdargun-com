# CLD working contract

- Build the source-backed Cloud Provider Cost Comparison (cld) — a bilingual, primary-source decision tool comparing pre-tax USD costs of cloud services available from Türkiye.
- Keep catalog and scenario truth in `data/` as versioned JSON; never connect to runtime price APIs, never invent `0 USD` placeholders, never rank records with missing or stale verification.
- Decision inputs are catalog records, region/scenario filters, user-set usage values, and the dated ECB EUR→USD rate. Cheapest/second-cheapest tags, ranking positions, scope notes, and 30-day staleness flags are observer outputs and never feed back into price computation.
- Behavior, experiment, world, simulation, metric, and export schema versions are explicit. Update affected versions when semantics change.
- Every catalog record carries a verification date and a primary-source URL; scenario recomputation is deterministic from (scenario, region, usage, FX) and is reproducible from exports. Reject runs whose records are stale, unsourced, or whose FX is missing or expired.
- Keep Turkish and English controls and explanations equivalent. Label model assumptions and simulation units.
- Verify `npm run validate:codex` and review `git diff --check` before handoff.
- Local work only unless the user authorizes external publication. Preserve unrelated work and processes.
