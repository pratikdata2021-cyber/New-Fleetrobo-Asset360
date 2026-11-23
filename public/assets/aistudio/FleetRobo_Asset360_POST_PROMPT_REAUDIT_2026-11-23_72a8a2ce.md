# FleetRobo Asset360 — Post-Prompt GitHub Re-Audit & Targeted Fixes

**Repository:** https://github.com/pratikdata2021-cyber/New-Fleetrobo-Asset360  
**Branch:** `main`  
**Latest inspected commit:** `d5195301c2978030850f788b827d4481174af029`  
**Prior audit baseline:** `b431b038d40486a853f35bcf5fa15b883f9fd503`  
**Latest commit time:** 23 November 2026, 10:33:54 UTC (16:03:54 IST)  
**Method:** GitHub connector, inspected current source after two newer commits. Static source review only: build, TypeScript lint, deployed UI and end-to-end behavior NOT executed or certified.

## Executive verdict

**PARTIALLY UPDATED — NOT READY FOR FINAL ACCEPTANCE.** Two commits and 24 changed files appear since the prior audit. New code adds cross-organization navigation/filter guards and window-focus / 30-second status recalculation. None of the six core findings below is conclusively resolved. The mapping hardware-binding history gap remains release-blocking.

## Confirmed changes since previous audit

1. `1756e8f` (2026-11-23T09:40:00Z): cross-organization filtering and routing guards for Vehicles/Drivers and navigation in `src/App.tsx`.
2. `d519530` (2026-11-23T10:33:54Z): 30-second status tick + window-focus listeners in Devices/Sensors/SIM/Mapping views. Cleanup calls for timers/listeners exist in inspected components.
3. Company/context selection on Vehicles/Drivers prunes previously selected out-of-scope rows, and Driver filtering supports Organization. **UI behavior still requires browser regression tests.**

## Outstanding defects — precise source evidence

### P0 — MAP-HISTORY-01: Removed hardware bindings can disappear from history

- `src/components/modal-mapping/MappingFormDrawer.tsx` ~1210–1218: `handleRequestRemoveMember` filters matching bindings out of `draftBindings`.
- Same file ~2050–2058: submitted `bindings: draftBindings`.
- `src/components/ModalConnectionTab.tsx` ~614–650: reconciling a mapping preserves omitted binding IDs **only if already `endedAt` or `Canceled`**, so previously active omitted binding IDs may vanish.
- **Fix:** before saving an edited connection, diff pre-edit bindings against draft bindings. Convert every removed prior active/scheduled binding to an ended historical record (timestamp, actor, reason) and persist it; never hard-delete referenced binding history. Ensure member removal also ends or safely reconciles dependent allocations. Preserve IDs.
- **Acceptance:** Create Active mapping with Device→SIM; edit mapping, remove SIM, save. Binding remains in history as Ended with original ID and end reason; connection/device/SIM statuses refresh correctly. Repeat with future scheduled binding.
- **Already working:** removed resource allocations are converted to ended history in `MappingFormDrawer.tsx` ~1994–2005. Do not regress.

### P1 — DEVICE-BULK-01: Bulk delete count / selection mismatch

- `src/components/DevicesMasterContent.tsx` ~1228–1250: collects `actuallyDeleted` but toast displays `safeIds.size`; removes all `safeIds` from selection, even items blocked by mapping references.
- **Fix:** count only successful deletions and remove only actually deleted IDs from selected set. Report skipped/blocked IDs/reasons. Re-validate eligibility immediately before mutation.
- **Acceptance:** Mix selected deletable and currently referenced devices; actual deletion count and skipped count are accurate, referenced devices remain selected and intact.

### P1 — DRIVER-LICENCE-01: Quick Activate can set expired/missing licence driver to Active

- `src/components/DriversPageContent.tsx` ~546–586: switches to `Active` first, then merely displays a warning if licence is Expired/Missing.
- **Fix:** adopt explicit product rule: if Active means operational eligibility, block activate until licence passes compliance; otherwise keep administrative status separate and block mapping/dispatch eligibility. Apply consistently to row toggle, bulk activate and creation/import validation.
- **Acceptance:** Expired/missing licence cannot become operationally eligible through row toggle, bulk, or import. Valid driver activation works.

### P1 — DRIVER-IMPORT-01: Fabricated default values on CSV import

- `src/components/DriverImportDrawer.tsx` ~204–228: missing `Driver Status` falls back to `'Active'`, missing `Licence Type` falls back to `'HMV'`.
- **Fix:** do not infer licence type or automatic operational activation from absent CSV fields; use explicit Unknown/pending state only if supported, otherwise reject row with reason or use the agreed safe existing status. Keep mandatory date checks and explicit RTO/Police/Training flags working.
- **Acceptance:** Blank licence type or status does not silently become `HMV` / `Active`.

### P1 — SIM-IMPORT-01: Ambiguous model picks first matching record

- `src/components/SimMasterContent.tsx` ~1247–1265: `matchedModels` filtered by provided attributes; any non-empty result uses `[0]`, even when length > 1.
- **Fix:** require a single exact enabled company model. If multiple match, reject row with actionable reason and request model reference/identifier instead of silently choosing first.
- **Acceptance:** Two company-enabled SIM models same operator/category but different model reference + CSV omits reference -> skipped with ambiguity reason; explicit valid reference imports correctly.

### P1 — DEVICE-PROTOCOL-01: Platform Protocol always required

- `src/components/DevicesMasterContent.tsx` ~890–899: `if (!trimmedName || !trimmedId || !singleProtocol)` requires protocol for all models.
- **Fix:** make protocol required only when selected company-enabled model's protocol/integration contract demands it. Preserve Create/Edit control, label and UI structure. Still validate allowed protocol options for applicable models.
- **Acceptance:** Model with no protocol requirement can be saved without an arbitrary protocol; model requiring protocol still validates correctly.

### P1 — RESOURCE-BULK-01: Future allocation ends at a future date

- `src/components/ResourceConnectionTab.tsx` ~1288–1298: for scheduled allocation, `safeEndIso` becomes `start + 1 second` rather than the actual cancellation timestamp.
- **Fix:** distinguish cancellation-before-start from ending an already active allocation. Record current action timestamp accurately, preserve original future window in history; do not invent a future end as though it occurred.
- **Acceptance:** Bulk end/cancel a future allocation; status becomes Canceled/Ended as supported by existing schema, action timestamp is now, original planned start remains historical; no active period is fabricated.

## Guardrails

- **No changes to existing Create/Edit fields/sections/labels.** No redesign of tables, headers, side navigation, Vehicle Model's seven map icons, existing filter/bulk drawer visual language, or unrelated modules.
- No backend. Frontend React/TypeScript/localStorage only.
- Do not overwrite sample data, user data, IDs, saved views, relationships, mapping history or company access settings.
- Retain mapping-derived status model for Devices/Sensors; SIM carrier and inventory/mapping statuses remain distinct; Vehicle/Driver operational status is independent from mapping.
- Re-evaluate company authorization and record eligibility at commit, not only at opening a drawer.

## Release validation

- `npm run lint` (TypeScript noEmit) and `npm run build` (Vite). Inspect browser console; no runtime exceptions.
- End-to-end tests for seven issues above, plus cross-tenant access, date/time effective states and historical record retention.
- Screenshot comparison of Create/Edit for Devices, Sensors, SIM, Vehicles, Drivers, Mapping and Vehicle Model Master.
- GitHub has **0 Actions runs** and **no commit statuses** for latest head at inspection time. Do not claim automated tests passed.

## Paste into Google AI Studio (targeted follow-up prompt)

> Audit current main against the attached Post-Prompt Re-Audit document. Implement **only** the seven enumerated defect fixes (MAP-HISTORY-01, DEVICE-BULK-01, DRIVER-LICENCE-01, DRIVER-IMPORT-01, SIM-IMPORT-01, DEVICE-PROTOCOL-01, RESOURCE-BULK-01). Preserve all existing Create/Edit fields and layouts and current filters/bulk visuals; avoid unrelated refactoring. Use actual canonical tenant, model, mapping and history records; no mock fixes or fake success counts. Implement regression tests or code assertions for each acceptance case. Run `npm run lint` and `npm run build`, and report passed/failed checks with evidence and an exact changed-files list. Do not declare completion unless all listed acceptance cases pass.
