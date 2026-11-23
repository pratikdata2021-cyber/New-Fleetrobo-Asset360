# FleetRobo Asset360 — Vehicle Model Master
## FINAL GitHub-Audited AI Studio Implementation Specification · Create/Edit UI Frozen

**Repository:** `pratikdata2021-cyber/New-Fleetrobo-Asset360`  
**Reviewed branch / commit:** `main` / `2ee6114158ea82df9ec008e12b78899c60b1e730` (2026-11-22 17:43:32 UTC)  
**Primary sources:** `src/components/VehicleModelMasterContent.tsx`, `src/types/vehicleModelMaster.ts`, `src/components/VehicleDrawer.tsx`, `src/types/vehicle.ts`  
**Target:** Google AI Studio / React + TypeScript + localStorage prototype. **No backend, APIs, schema server, or unrelated redesign.**

> **NON-NEGOTIABLE:** Preserve EVERY existing Create / View / Edit Vehicle Model field, section, label, order, tooltip, validation affordance, icon tile, thumbnail, upload control, preview, button, drawer dimensions, and styling. Do not redesign the master table or change its existing fields/columns. The ONLY sanctioned UI improvements are a consistent **Filters** drawer and **Bulk Operations** drawer, with a minimal selection affordance in the list, following the latest implemented FleetRobo Model Category Master / Devices Master pattern. Everything else is functional fixes under the existing UI.

## 1. Actual GitHub baseline (verified)

**Page:** Admin Setup → Vehicle Model Master. A global Vehicle Model catalog, used as the source for **Add Vehicle → Machine Model**. This is NOT the same as Device Model Category Master, Device Status, Asset Mapping, or live vehicle connectivity.

**Model lifecycle = exactly TWO statuses:** `Active` and `Inactive` (`isActive` boolean). Active means selectable for **new** vehicle registration. Inactive is unavailable for new selections but must remain readable and linked on already registered vehicles. **Never** derive Model Status from Resource Mapping or Vehicle Operational Status.

**Current listing:** global text Search; inline Vehicle Type, Vehicle Segment and Status selects; Clear Filters; Refresh; Export CSV; Add New; Reset Sample Models; sortable 14-column table (including row number and Actions), View/Edit/Activate-Deactivate/Delete row menu, paging 10/25/50. Table contains Model ID, Vehicle Manufacturer, Vehicle Model Name, Variant, Vehicle Type, Vehicle Segment, Model Year, Map Icon Preview, Icon Setup, Status, Created Date, and existing display columns. **Keep the exact current table structure and columns**; add only a narrow checkbox selection affordance if required for bulk operations.

**Important source distinction:** There is currently NO separate Vehicle Model Master Filters drawer, NO Bulk Operations drawer, and NO row-selection state for vehicle models in this repository snapshot. Do not falsely treat them as pre-existing or attempt to reuse a non-existent module. Build these two targeted drawers by reusing the latest FleetRobo master design (if available in AI Studio prototype), without altering unrelated UI.

### 1A. Create/Edit field inventory — LOCKED 100%

| Existing section | Existing visible fields / controls | Rule |
|---|---|---|
| **A. Basic Information** | Vehicle Model ID (generated, immutable), Manufacturer (searchable + custom OEM), Vehicle Model Name, Variant / Trim, Vehicle Type, Vehicle Segment, Model Year, Fuel Type, Description | **KEEP identical** |
| **B. Specifications & Status** | Fuel Tank Capacity (L), Payload Capacity (kg), Seating Capacity (persons), Number of Axles, Is AC Vehicle, Is AC Reverse, Active/Inactive catalog switch | **KEEP identical** |
| **C. Map Icon / Image Configuration (7 States)** | 7 state cards, status icon previews, Default/Custom badges, image upload/replace/reset, preview chooser | **KEEP identical** |
| **D. Audit Fields (Read-Only)** | Existing Created By/On and Updated By/On audit display | **KEEP identical** |
| Footer / header | Existing Save / Cancel / edit-from-view / close and unsaved-changes guard | **KEEP identical** |

**Do not add or remove ANY Create/Edit field**, including a Company dropdown, Mapping Status, Inventory Location, new image field, new dates or extra specifications. Do not move, rename, merge, reorder or hide any section or input.

### 1B. Preserve all seven map states exactly

1. Polling (`poll`, `DefaultIconPoll.png`)
2. Not Polling (`not_poll`, `DefaultIconNotPoll.png`)
3. Moving (`move`, `DefaultIconMove.png`)
4. Alarm (`alarm`, `DefaultIconAlarm.png`)
5. Immobilized (`immobilize`, `DefaultIconImmobilize.png`)
6. Stoppage / Stopped (`stoppage`, `DefaultIconStoppage.png`)
7. Towing (`towing`, `Towing Icon.png`)

These are **vehicle map marker states**, NOT Model Master lifecycle statuses. Preserve the existing inline SVG defaults, custom image uploads (PNG/WebP/SVG, ≤200 KB each), thumbnails, state-by-state metadata (`source`, `assetId`, `previewUrl`, `updatedAt`, `updatedBy`), icon reset, image preview and badge counter (`Custom N/7 + Default M/7`). No external image dependency. Never overwrite custom icons on edit, activate/deactivate, filter or migration.

## 2. Final model lifecycle behavior

| Situation | Model Status / behavior |
|---|---|
| New model | `Active` default, as existing Create does |
| Admin deactivates model | Model `Inactive`; absent from **new** Add Vehicle selection; historical Vehicle `vehicle_model_id` remains intact |
| Admin reactivates model | Model `Active`; available in new selections |
| Existing Vehicle references inactive model | Vehicle can still display its selected model, images and saved specs; no silent remapping or blank value |
| Model is used by 1+ Vehicles | **Deletion blocked**; recommend existing Deactivate Instead action |
| Model has 0 dependent Vehicles | Eligible for guarded deletion with existing confirmation UI |
| Model is Active but no Vehicle uses it | Still Active; model status NEVER derived from usage |
| Vehicle mapped to Device/SIM/Driver | No effect on Model Status |

Preserve Model ID `VM-XXXXXX` as a stable global identifier; continue to store it on `Vehicle.vehicle_model_id`. Model identity is manufacturer + model name + variant, normalized for duplicate checking; type, segment and model year are properties, not substitutes for identity. Historical vehicle records should not change when global model specs or images change unless an explicit supported updating workflow exists.

## 3. P0 / P1 bugs and inconsistencies — functional fixes, no form UI changes

| Severity | Source-verified issue | Exact repair |
|---|---|---|
| **P0** | `VehicleModelMasterContent.tsx` `handleConfirmDelete` physically deletes a model even when `countDependentVehicles() > 0`; existing confirmation only warns | Block destructive deletion **inside handler** and Bulk Delete eligibility whenever any registered Vehicle references Model ID or legacy exact label. Preserve reference, icons, history; use existing warning / Deactivate Instead action |
| **P0** | Global source-of-truth is labeled Platform Admin, but `handleOpenAdd`, edit, status toggle, delete, reset can still be invoked under other company context | Enforce Platform Admin permissions at **event handlers/commands**, not only button appearance. In non-admin context preserve page visual state; action attempts must not mutate global catalog. Respect existing user permission design |
| **P0** | `loadVehicleModelStore()` returns demo seeds when a valid saved array is empty, undoing a legitimately empty catalog after reload | Treat an explicitly stored `[]` as valid; use seeds only when storage is genuinely uninitialized. Do not silently recreate deleted/replaced records |
| **P0** | `Reset sample models` can overwrite all custom entries and uploaded icons | Keep existing visible Reset button, but restrict to authorized admin, require existing confirmation where available or reuse current confirm pattern, explicitly explain data loss, and never auto-reset during normal loading |
| **P0** | `getNormalizedModelComboKey()` guards duplicates by manufacturer+model+variant, but `VehicleDrawer.selectedMasterModel` legacy fallback also matches bare `modelName` (potential ambiguous OEM/variant) | Always prefer exact immutable `vehicle_model_id`. Legacy label resolution is allowed only if uniquely matched; if ambiguous, preserve old text and do not select a random model |
| **P0** | `VehicleDrawer.handleModelFilterChange` clears selected model ID/name when user changes temporary Type/Segment dropdown filters | Filter change should narrow **choices**, not silently wipe a previously saved selection. Keep selected model visible, show existing compatibility notice, and require explicit replacement before save if incompatible |
| **P1** | Numeric validation only tests `< 0`, so text like `abc` can become `NaN` in Tank/Payload/Seats/Axles and be JSON serialized unexpectedly | For nonblank input require finite valid numbers. Fuel tank/payload ≥0; seats/axles nonnegative **integers**; model year integer 1980–2100 as existing specified range. Preserve all visible numeric fields, placeholders and feedback placement |
| **P1** | Icon upload accepts an allowed file **extension** even if MIME mismatches, potentially treating invalid content as SVG/PNG | Validate MIME/content consistently; prevent active scripting in SVG preview/data URI; keep exact same upload UI and 200KB cap. Do not drop existing valid uploaded icons on upgrade |
| **P1** | Loading a model with legacy/missing `icons` fills default icons, but malformed icon slot data can break preview | Normalize all seven slots; use default for absent/broken slot only, keep existing valid custom slots, preserve persisted metadata |
| **P1** | `getActiveVehicleModels` globally filters by `isActive`; existing linked inactive model may become unselectable/hidden in edit dropdown | Keep inactive selected model readable during Edit/View while limiting new choices to Active. Preserve `vehicle_model_id` and specs unless the user explicitly switches model |
| **P1** | Vehicle Model export currently includes only scalar model fields and Icon Setup count, not full icon image binary | Preserve the existing **CSV format** as-is; do not claim CSV preserves icon bytes. If export selected is added to Bulk, use same existing CSV headers and respect selection. No import feature or additional export format unless expressly requested |
| **P1** | Header/model count and filters query global `records`; company context currently identifies a global catalog | Treat this page as a global admin-owned catalog. Do not invent tenant-specific Vehicle Model enablement, duplicate it per company, or use unapproved fallback company IDs |

**Important:** The Add Vehicle `Machine Model` dropdown already reads `loadVehicleModelStore()`, subscribes to `fleetrobo:vehicle-models-updated`, filters active models for new choices, and prefills manufacturer, type, segment, fuel defaults and tank capacity after selection. **Preserve this working connection.** Ensure inactive historical records remain readable by ID.

## 4. Final Filters drawer — ONLY approved UI upgrade

**Current repo:** inline toolbar filters: Type, Segment, Status. **Target:** make filtering visually/behaviorally consistent with latest Model Category Master and Devices Master by introducing ONE compact right-side **Filters** drawer within the existing design system, while preserving search, counts, sorting, paging and current table. Keep the current header/toolbar design recognizable. Avoid duplicate simultaneous inline/drawer controls for the same field; migrate the three inline filters into the drawer if needed. No other layout redesign.

**Suggested sections and relevant filters:**

| Section | Field | Control & sourcing |
|---|---|---|
| **1. Model Identity** | Manufacturer | searchable multi-select from existing model records + canonical OEM catalog |
| | Vehicle Model Name | searchable typeahead or existing-text contains |
| | Variant / Trim | searchable dropdown, existing distinct values |
| **2. Vehicle Classification** | Vehicle Type | searchable multi-select sourced from `VEHICLE_TYPES` and stored values |
| | Vehicle Segment | cascading filtered multi-select based on selected type(s); preserve valid legacy stored values |
| | Fuel Type | searchable multi-select from `VEHICLE_MODEL_FUEL_TYPES` and stored values |
| **3. Specifications & Icons** | Model Year | from/to numeric year range |
| | AC Vehicle | All / Yes / No |
| | Icon Setup | All / Default 7/7 / Custom 1–6 / Custom 7/7, computed using `getIconSetupSummary()` |
| **4. Lifecycle & Usage** | Model Status | Active / Inactive only |
| | Linked Vehicles | Unused / In Use (based on `countDependentVehicles()`), optionally count range |
| | Created On | from/to date range using actual createdAt |

- No Organization filter: Vehicle Model Master is **global**, not a company-scoped inventory catalog.
- Search stays in main toolbar. Search inside filter drawer finds filter definitions.
- Prefer searchable dropdowns and real data; no placeholder `Option 1/2/3`.
- AND across different fields, OR within selected values of one multi-select; clear tooltips; valid date/year ranges; no false matches on missing data.
- Maintain draft vs applied filters, `Reset All`, `Apply Filters`, applied count, existing pagination reset and CSV export of matching rows. Save Views if a shared available component already exists; **do not create unrelated workflow**.
- Reuse existing slate/white/orange typography, border radius, icon sizes and sticky footer from latest FleetRobo filter drawer; no new visual language.
- Unused/Linked condition uses actual Vehicle Master records; never infer from mapping connection count or fabricated association.

## 5. Final Bulk Operations drawer — ONLY approved UI upgrade

**Current repo has NO bulk action drawer.** Add one consistent right-hand panel using the same visual system as Model Category Master. A minimal per-row selection checkbox + select-all for page in the list are acceptable; do not modify existing table columns, headings, click-to-view, row menus, sorting, icon preview or pagination. Selection must be scoped to model records only. Keep export and row actions functional.

**Bulk actions:**

| Action | Eligibility and behavior |
|---|---|
| **Activate Eligible Models** | Inactive only; already-active skipped. Never touch Vehicle operational status |
| **Deactivate Eligible Models** | Active only; existing vehicles keep ID, saved specs and icon associations |
| **Delete Eligible Models** | Only if **zero dependent Vehicles**; linked models skipped with precise counts; preserve audit-friendly confirmation |
| **Export Selected** | Reuse the existing CSV export header/schema; export **selected models** only |

**Do NOT add** bulk manufacturer/variant/model ID changes, bulk icon replacement, bulk reset, hard-delete-all, or any operation that alters historical Vehicle identity. These are dangerous for catalog integrity.

**Drawer pattern:** Selected → Choose Action → Eligibility Preview (Eligible/Skipped with concrete reasons) → Confirm. Recheck eligibility and global admin permission at execution time; do not rely on a stale preview or disable-only logic. Selected across pages may persist; reset when permission/context changes and ignore IDs not in current authorized dataset. Provide stable counts. Deletion requires confirmation with dependency information. Preserve current single-row Actions and confirmation modal.

## 6. Vehicle Model → Vehicle Master integration (must pass)

- `Vehicle Model Master` = global, reusable configuration; `Vehicles Master` = individual physical vehicles; they are different entities. Model Status is never set by any Asset Mapping or live GPS connectivity.
- New Vehicle → Machine Model lists **only Active** models, searchable by ID, OEM, model, variant, type, segment. Once selected, save `vehicle_model_id` canonical ID, not only the label.
- Prefill current fields without inventing any fields: `machine_model`, `model`, `make`, `trim`, `type`, `vehicle_segment`, `class`, `fuel_type`, `fuel_tank_capacity` (if provided). Never overwrite explicitly user-edited fields on background refresh.
- Model is deactivated or edited after a Vehicle was registered: existing Vehicle retains `vehicle_model_id`, identifier, snapshot values and ability to View/Edit; no auto-switch to a model with the same name.
- Check linked Vehicles before delete using `countDependentVehicles()` and canonical ID; legacy name matching should be cautious: ambiguous match → block and request explicit data correction rather than deleting unsafely.
- The existing icon bundle is retained in Vehicle Model Master and is intended for the seven map states. Do not falsely mark heartbeat/telematics state based on Model Status, and do not claim live Track on Map wiring exists unless actually verified in the relevant map component.
- Do not change Devices/Sensors/SIM statuses, Driver Master or Asset Mapping state as part of Vehicle Model changes.

## 7. Import/export, data protection and audit

- **Existing functionality:** Export CSV; there is **no native Vehicle Model import drawer in the reviewed repository**. Do not invent a new Import workflow in this task.
- Preserve all seeded and user-created model records and all seven icons. Existing localStorage key: `fleetrobo_vehicle_model_master_v1`.
- Never overwrite legitimate `[]` storage with default seed records. Existing Reset Sample Models button should be explicitly destructive and admin-only, not automatically executed.
- Status changes update `updatedBy/updatedAt` and preserve `createdBy/createdAt`. Do not forge a detailed audit timeline from only two timestamps.
- Vehicle model IDs cannot be recycled even if a deleted model previously existed in Vehicle Master history. Generate collision-safe IDs; check historical vehicle_model_id references.
- Do not change existing CSV headers/format except exporting the requested selected subset under `Export Selected`.
- Ensure uploads function with the prototype's storage limits; expose the existing error affordance for quota failures instead of silently claiming success.

## 8. Files permitted to change

1. `src/components/VehicleModelMasterContent.tsx` — functional validation, permission and dependency guards; sectional Filters and Bulk drawer only; preserve Create/View/Edit JSX.
2. `src/types/vehicleModelMaster.ts` — safe localStorage loading, robust dependency and icon validation helpers, ID behavior, no schema-breaking migrations.
3. `src/components/VehicleDrawer.tsx` — only correct Model ID lookup, stale/ambiguous legacy fallback, existing dropdown selection and preservation. **Do not change ANY Create Vehicle field or UI.**
4. A small reusable filter/bulk drawer component is allowed if it reuses the existing FleetRobo master design. Do not duplicate unrelated components.

**Prohibited changes:** overall navigation, page branding, table existing columns/labels, unrelated masters, driver fields, vehicle Create fields, model Create/Edit sections or image card UI, global CSS/theme, backend/API integration, seed overwrites, independent tenant-specific model catalog.

## 9. Mandatory QA acceptance checklist

### UI freeze / scope
- [ ] A/B/C/D Create/Edit sections and every field, label, tooltip, conditional, placeholder, icon and action match baseline exactly.
- [ ] All seven icon cards still preview/upload/replace/reset correctly; custom icons persist on reload and on status change.
- [ ] Main table existing columns/order, thumbnails, sorting, row actions and pagination unchanged (selection checkbox may be added for Bulk only).
- [ ] Filter and Bulk panel styles match latest existing master design; no unrelated UI changed.

### Master lifecycle
- [ ] Only Active/Inactive Model Status; not dependent on any vehicle mapping or Online state.
- [ ] New Vehicle dropdown lists active models; inactive linked model still displays in Edit/View without changing ID.
- [ ] Deactivation preserves all linked Vehicles; reactivation makes model selectable again.
- [ ] Delete with 1+ dependent Vehicles cannot execute, even through keyboard action or Bulk; Deactivate Instead remains available.
- [ ] Deleting unlinked model is allowed only after confirmation; IDs are not accidentally reused.
- [ ] Non-Platform-Admin cannot create/edit/status-change/delete/reset global Model entries through direct handler invocation.

### Data and quality
- [ ] Duplicate OEM+Model+Variant case-insensitive/whitespace-normalized selection blocked.
- [ ] No NaN/Infinity/negative invalid specifications saved; year integer 1980–2100; seats/axles integer.
- [ ] Invalid icon MIME, content, >200KB and unsafe SVG blocked; valid images preserved.
- [ ] LocalStorage explicitly-empty array stays empty after refresh; model custom records and icons never overwritten by automatic seed reset.
- [ ] Search/Filters match actual data; multiselect AND/OR semantics, applied counts, resetting, year/date ranges, exporting and pagination work.
- [ ] Bulk eligibility counts, tenant permissions, row selection and confirmations work; no linked-model deletion possible.
- [ ] TypeScript build passes, no broken existing dropdowns, no mutation of unrelated module data.

## 10. One-shot AI Studio companion prompt

> Implement the attached **Vehicle Model Master FINAL Fixes** specification in my existing FleetRobo Asset360 React/TypeScript/localStorage prototype. Study the current GitHub files. **DO NOT CHANGE ANY EXISTING CREATE/VIEW/EDIT MODEL FIELD, SECTION, ICON CARD, FILE-UPLOAD CONTROL, LAYOUT OR STYLING.** Preserve all 7 Track on Map icon states. Retain Model Status **Active/Inactive only**, independent of Asset Mapping. Correct the unsafe delete of models linked to Vehicles, company permissions, localStorage empty-array reset, model-ID linkage and ambiguous lookup, numeric validation and icon upload safety. Add only a compact sectional **Filters** drawer and **Bulk Operations** drawer consistent with the latest FleetRobo Model Category Master / Devices Master design; minimally add row selection, but do not redesign the table. Keep Add Vehicle → Machine Model correctly linked, preserve historical Vehicles, existing IDs, seed/custom model records, saved images and all other modules. No backend. Verify every acceptance test.

---

**GitHub review references:** `VehicleModelMasterContent.tsx` form ~1435–2260, status/delete ~649–694, filters ~872–975, table ~1001–1325; `vehicleModelMaster.ts` seven states ~3–104, record ~113–136, storage ~507–557, dependencies ~608–621; `VehicleDrawer.tsx` model lookup/prefill ~352–461. This file is an implementation specification; it has **not modified the GitHub repository**.
