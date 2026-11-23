# FleetRobo Asset360 — Resources → Vehicles
## FINAL GitHub-Audited Specification | Create/Edit Frozen | Filter & Bulk Consistency

**Repository:** `pratikdata2021-cyber/New-Fleetrobo-Asset360`  
**Reviewed:** `main` HEAD `2ee6114158ea82df9ec008e12b78899c60b1e730`, 22 Nov 2026  
**Implementation environment:** existing React/TypeScript + localStorage prototype in Google AI Studio; **no backend**.

> ## Highest priority — scope guard
> **DO NOT modify, remove, reorder, hide, rename, or add ANY existing Create/View/Edit Vehicle field, 7 sections, tooltips, labels, validations UI, custom controls, buttons or layout.** Preserve the existing ~940px VehicleDrawer and its working Machine Model Master dropdown, icons/visuals and existing data. **No overall Vehicles page redesign.** Only improve existing right-side **Sectional Filters** and **Bulk Operations** for consistency, and fix source-confirmed functional issues in data/status/mapping, import, selection, validation and export. Do not change unrelated modules or add new table columns. Do **not** remove the Vehicles `Location` / `Zone` data or columns: earlier removal of Inventory Location applied only to Device/Sensor/SIM inventory tables.

---

## 1. Current GitHub architecture (verified)

| Location | Current behavior | Preserve / fix |
|---|---|---|
| `src/components/VehiclesPageContent.tsx` | Vehicle list, search, table/cards, status tabs, column catalogue, sorting, saved views, bulk, filters, import/export, detail | Keep presentation and functional controls; correct cross-tenant scoping, filter count, selection, status sync |
| `src/components/VehicleDrawer.tsx` | Seven-section Create/View/Edit drawer; model picker linked to Vehicle Model Master; validation and prefill | **EXACT JSX + UI fields frozen**; fix validation/data resolution only where necessary |
| `src/components/FilterDrawer.tsx` + `src/types/filters.ts` | Existing ~675px sectional Filter Drawer with 61 definitions, Basic (AND) / Advanced (OR), filter search, reset/apply and unsaved-warning | Keep, fix broken date ranges, invalid choices and meaningless filters; consistent polish **inside this drawer only** |
| `src/components/BulkOperationsDrawer.tsx` | Existing bulk drawer with 4 coded operation types (`status`, `fleet_add`, `fleet_remove`, `transporter`), eligibility review; Export Selected separately | Keep all existing actions, preview and export; improve safety and consistency **inside this drawer only** |
| `src/types/vehicle.ts` | `Vehicle`, nine operational statuses, lookup catalogues, `fleetrobo_vehicle_master_v3` | Preserve record shapes, IDs, sample data and existing relationships; fix seed reintroduction behavior |
| `src/components/VehicleModelMasterContent.tsx` and `src/types/vehicleModelMaster.ts` | Canonical Vehicle Model Master | Use model IDs; do not modify model master UI |
| `src/types/modalMaster.ts` | `resourceAllocations`, `resourceRelationships` and time-aware status helpers | Read derived resource mapping, do not overwrite operational status |

**Existing 9 operational statuses; DO NOT replace them with the 4 Device Inventory statuses:**
`Available`, `In Use`, `Maintenance`, `Out of Service`, `Reserved`, `Inactive`, `Accident / Damage`, `Compliance Hold`, `Stolen`.

**Existing quick tabs:** `All vehicles`, `Available`, `In Use`, `Maintenance`, `Out of Service`, `Inactive`. Other four status types remain valid and accessible via the existing complete status filter and All vehicles. Do not add extra tabs or alter styling unless requested separately.

---

## 2. Create / View / Edit Vehicle — preserve every current section and field

| Section name in existing drawer | Current fields and important UI | REQUIRED outcome |
|---|---|---|
| **Section 1 — Basic Vehicle Details** | Registration Number, optional Vehicle Type and Vehicle Segment filters for Machine Model, searchable **Machine Model** picker, Chassis No., Registration Date, Engine No., Transporter, Year of Make, Machine Owner, Active Status toggle | **Every visible field and order identical.** Existing Vehicle Model Master selection, model-linked metadata, optional type/segment filters and tooltips unchanged |
| **Section 2 — Vehicle & Operational Settings** | Over Speed Limit, Fuel Theft Limit, Fuel Refill, Fuel Calibration Type, Fuel Type, Fuel Tank Capacity, Zone, Mobile Number, Packager Number | All intact |
| **Section 3 — Insurance Details** | Insurance Company, Policy Number, Insurance From/To | All intact |
| **Section 4 — Purchase & Warranty** | Purchase Date, Warranty From/To, Extended Warranty From/To | All intact |
| **Section 5 — Documents & Verification** | Aadhar Number and existing Aadhar, RC, general document, extended warranty upload slots | All intact; preserve attachments |
| **Section 6 — Additional Information** | Vehicle Name, Make, Internal ID, Asset Type/Class, Trim, Color, Call Sign, Serial Number, Fuel Card Number | All intact |
| **Section 7 — Vehicle Skills** | Existing searchable multi-select and custom skill handling | All intact |

- Do not remove technical/operational fields even if some look optional, duplicated or unusual. **No form cleanup in this task.**
- Preserve existing section navigation, prefill, file uploads, missing-field messages, discard confirmation, field validation and exact drawer geometry.
- `active_status` toggle is already present. Do not remove it; correct **data consistency** with `status` where an operation moves to/from `Inactive`.
- Keep canonical `vehicle_model_id` as stable reference. Inactive/deleted-from-catalog models on existing vehicles remain readable; new registration only uses active/valid catalog models. No model auto-switch on edit.

---

## 3. Operational Status vs. Resource Mapping — separate concepts

| Concept | Authoritative data | Rule |
|---|---|---|
| **Vehicle Operational Status** | `Vehicle.status` | Retain the nine existing options; user's vehicle/fleet operational availability is NOT automatically `Active` merely because a Device is mapped |
| **Vehicle Active toggle** | `Vehicle.active_status` | Must not contradict `Vehicle.status` (e.g. `status='Inactive'` with active toggle true); keep toggle UI intact |
| **Vehicle Mapping / Allocation State** | Actual effective `resourceAllocations` / `resourceRelationships` from Asset Mapping | Derived separately: assigned/current, scheduled, ended/historical or unassigned; use existing data rather than fabricated status |
| **Device Hardware Status** | Device Mapping + hardware overrides | Completely separate from vehicle operational status |
| **Live Telematics / Online** | Verified telemetry when available | Do not fabricate vehicle online/offline or infer from mapping |

When a Vehicle is selected as a resource in Asset Mapping, determine active allocation using actual `resourceType:'Vehicle'`, stable `resourceId`, connection validity, `effectiveStartAt`, `effectiveEndAt`, `endedAt` and conflict/cancel conditions. Use the existing `computeResourceAllocationStatus` helper; never treat simply having a historical `Vehicle.driver` or `Vehicle.fleets` value as proof of active Asset Mapping.

**Important decision:** Do NOT automatically change `Available` to `In Use` on creating any hardware connection. Vehicle operational state could be managed independently by fleet operations. Preserve current status semantics while keeping mapping lookup accurate.

---

## 4. Filters — use the existing 61-filter **sectional** drawer, not a new drawer

**Visual direction:** Match currently implemented FleetRobo/Model Category Master filtering style where practical, but stay within existing Vehicles `FilterDrawer` boundaries: the same right-side location, width, heading, filter search, Basic/Advanced mode, section names, existing tooltips, Reset/Apply sticky footer and unsaved draft protection. No changes to Vehicle Create drawer or page toolbar.

### Existing filter domains to preserve
- **Organisation** — company/tenant; company-scoped and permission-aware.
- **Vehicle Identity** — Registration Number, Vehicle Name, Internal ID, VIN/Chassis, Make, Machine Model, Year, Serial, Fuel Card, operational Vehicle Status.
- **Business / Resource Relationships** — hub, client, transporter, vendor, assigned driver, fleets/trailers, where defined in existing 61 filter catalogue.
- **Vehicle Specifications / Operational Settings** — existing fuel/vehicle class/zone/odometer/skills and other metadata represented by `ALL_61_FILTERS`.
- **Insurance, Purchase, Warranty, Compliance, Dates and other existing filter groups** — retain all current defined items; do not truncate or replace 61-filter schema with four dropdowns.

### Required functional fixes
1. **P0: Date range comparison** currently uses `Number('YYYY-MM-DD')`, yielding `NaN`, so date filters may silently match everything. Compare date ranges as parsed timestamps (for dates) and number ranges as actual numbers. Validate From <= To using correctly typed comparisons.
2. **P0: Placeholder filter options**: `getOptionsForFilter` currently falls back to `['Option 1','Option 2','Option 3']`. Remove fake options. Resolve from authorized/current dataset or canonical lookup; if none, show a disabled empty state inside existing control.
3. **P0: Do not silently pass unimplemented filters**: ensure all 61 filter keys map to a genuine canonical vehicle field, safe derived property, or explicitly show unavailable/disabled when data is not represented. Do not make a filter appear functional when its callback always returns true.
4. Respect owning `companyContext` as a strict outer scope for ALL Basic AND/Advanced OR matching. Any OR must never bypass tenant, status quick tab, or global search. Search and filters intersect with those outer constraints.
5. Within one multi-select, values use OR; between selected filter fields use existing Basic AND or Advanced OR (clearly described by current UI). Keep empty arrays and blank date ranges out of active count.
6. Recompute current matched count, active filter badge, sort, pagination, Saved Views and Export to the same filtered result. Reset page to 1 on filter changes.
7. Keep actual existing UI sections and options; only improve their behavior, validation, searchability and data-dependent values. Do not create extra toolbar filters or new page cards.
8. Keep unsaved-change confirmation for cancel/backdrop and preserve Saved Views semantics/tenancy.

---

## 5. Bulk Operations — same **existing** drawer + safe preview

**Coded actions in `BulkOperationsDrawer.tsx` (KEEP):**

| Operation | Final safe behavior |
|---|---|
| Change Vehicle Status | Select one of **9 existing statuses**. Skip unchanged records; check valid transition, ownership and safety. Keep `active_status` coherent with Inactive. |
| Add to Fleet/Group | Add canonical fleet/group membership, no duplicates, no cross-tenant membership. |
| Remove from Fleet/Group | Remove only a membership that exists; preserve other memberships. |
| Change Transporter | Only transporter permitted for vehicle's owning company; preserve existing vendor and driver references unless expressly changed elsewhere. |
| Export Selected | Preserve existing export callback and modal. Selection must remain company-authorized. |

**Consistency improvements ONLY inside existing Bulk drawer:** same branded header, action selection, configured target selector, Selected/Eligible/Skipped counts, per-record reason, Review then Confirm footer as current patterns. Never skip the preview, never claim a change before it has been applied, and revalidate eligibility during commit.

P0: In `VehiclesPageContent.tsx`, selected vehicles sent to Bulk come from ALL `vehicles.filter(v=>selectedIds.has(v.id))` rather than authorized `scopedVehicles`. On company change, old IDs can remain selected. **Intersect both selection and action target with current authorized `scopedVehicles`; clear selection when company context changes.**

P0: `handleCommitBulkAction` changes `status` without synchronizing `active_status`; fix this without touching its UI.

P1: Treat historical Asset/Resource allocations as references when considering destructive actions elsewhere, but do not add a Delete Selected operation to the existing bulk menu.

---

## 6. Other source-verified consistency / integrity bugs

| Priority | Verified issue | Functional-only fix |
|---|---|---|
| P0 | Individual delete directly removes vehicle from Master (`handleConfirmDeleteVehicle`) without checking Resource allocations/relationships | Block destructive deletion for vehicles referenced in mappings or history; keep existing confirmation modal and UI; explain via existing toast/message |
| P0 | `loadVehicleMasterStore` automatically merges missing demo seed IDs back into saved data | Do not resurrect intentionally deleted records. Migrate seeds only through versioned one-time initialization or explicit demo reset; preserve existing localStorage |
| P0 | Company / client / transporter may be represented by inconsistent fields across old records | Normalize for access checks and display without overwriting the canonical owning company; never leak cross-tenant resources |
| P0 | Bulk status `Inactive` vs `active_status` toggle can contradict | Update consistently; don't make `In Use`, `Available`, etc. automatically equal to mapping state |
| P0 | Filter date/numeric range logic can silently ignore invalid/missing values | Correct typed comparisons, reject invalid ranges, match missing-value records only when explicitly requested |
| P0 | Filter lookup fallback invents options | Build options from actual scoped records / canonical masters; preserve historical selection values as read-only where needed |
| P1 | Machine Model should be linked by `vehicle_model_id`, not just text `machine_model` | Keep exact picker unchanged; maintain stable ID and view historical inactive model accurately |
| P1 | Selection across filtered/sorted pages may contain hidden records | Show accurate selection counts; narrow to authorized company at action time; no surprises |
| P1 | Vehicle import vs Create may validate plates, chassis and model differently | Share validation functions; preserve existing ImportDrawer UI; reject bad duplicates with row-level summary |
| P1 | Saved Views currently in component state; filter/schema changes may cause inconsistent application | Preserve existing views within session and, if persistence is enhanced, do so non-destructively without adding UI |

**Do not delete optional table columns.** No Vehicles `Inventory Location` table column exists matching the Device/Sensor/SIM cleanup request. Keep Vehicle main default columns, Column Catalogue, table/cards view, status tabs and page actions intact.

---

## 7. QA / acceptance

- [ ] Create/View/Edit Vehicle drawer visually identical; all 7 sections and every field preserved.
- [ ] Vehicle Model Master searchable picker + vehicle images/metadata, custom skills and documents still work.
- [ ] All 9 operational statuses remain valid, including status filter; `active_status` does not contradict `Inactive`.
- [ ] Vehicle active mapping is derived separately from operational Vehicle Status; no false Online state.
- [ ] Vehicle mapped/unmapped/scheduled/ended transitions respect temporal resource allocations.
- [ ] Date filters and year/numeric filters correctly match boundaries; valid missing data is handled deliberately.
- [ ] No `Option 1/2/3` dummy options; no silent, non-functional filter keys.
- [ ] Existing Basic/Advanced filter logic, active count, Saved Views, reset, table/cards, Export and pagination still work.
- [ ] Bulk acts ONLY on explicitly selected and currently authorized vehicles; preview = commit eligibility.
- [ ] Status bulk updates synchronize `active_status`; transporter/fleet changes don't silently reassign other fields.
- [ ] Delete of historical/active referenced vehicle cannot break Resource allocations.
- [ ] No previously deleted vehicle seed is automatically reintroduced on reload.
- [ ] Existing localStorage records, IDs, documents, filters, and related Driver/Mappings data are preserved.
- [ ] No backend, no extra modal, no new Vehicle Create field, no main UI redesign; build succeeds.

---

## 8. Compact Google AI Studio instruction

Implement this attached **Vehicles Resources — FINAL Fixes** spec in the existing FleetRobo Asset360 prototype. **Freeze all existing Create/View/Edit Vehicle fields, seven sections and the 940px drawer UI.** Preserve the main page, table/cards, status tabs, column catalogue, all data and records. Improve only the current sectional Filter and Bulk Operations drawers for consistency, fixing date/number filters, dummy options, tenant scope, selection eligibility, nine operational status consistency, and historical mapping/delete safety. Keep Vehicle operational status distinct from Asset Mapping and Device online/status. No backend or unrelated redesign. Run the QA checklist.

**No GitHub code changes are performed by this document.**
