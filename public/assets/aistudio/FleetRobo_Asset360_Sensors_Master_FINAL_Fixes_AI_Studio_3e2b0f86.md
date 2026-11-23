# FleetRobo Asset360 — Sensors Master
## FINAL Repo-Audited Fixes | Create/Edit Fields FROZEN | Consistent Sectional Filters + Bulk Operations

**Repository:** `pratikdata2021-cyber/New-Fleetrobo-Asset360`  
**Branch/commit reviewed:** `main` / `2ee6114158ea82df9ec008e12b78899c60b1e730` (2026-11-22 17:43:32 UTC)  
**Primary source:** `src/components/SensorsMasterContent.tsx` (2,668 lines)  
**Related sources:** `src/types/modalMaster.ts`, `src/types/modelCategoryMaster.ts`, `src/types/companyModelEnablement.ts`, `src/components/modal-mapping/MappingFormDrawer.tsx`  
**Target:** Existing Google AI Studio React/TypeScript/localStorage prototype. NO BACKEND.

---

## 0. HIGHEST PRIORITY — User-approved scope and strict rules

1. **Do not change a single visible field in Create Sensor or Edit Sensor.** Do not add/remove/relabel/reorder/reposition fields, sections, required stars, tooltips, placeholders, controls, options, or the conditional physical-identifier label. Retain the **690px right-side drawer** and exact current form layout.
2. **Do not redesign the main Sensors page.** Preserve toolbar controls and their order, white/slate/orange theme, typography, badges, pagination, row actions, Column Catalogue, Saved Views, Details inspector, Import drawer and existing behavior except for explicitly approved functional fixes.
3. **Approved table exception:** remove **Inventory location** ONLY from the Sensors LIST TABLE and the Column Catalogue. Keep the `SensorRecord.inventoryLocation` property and any underlying import/storage/functional uses; **do not add it to the Create/Edit form**.
4. **Approved UI enhancements:** upgrade ONLY the existing **Filters right-side drawer** and **Bulk Operations right-side drawer** to the sectional, consistent FleetRobo master pattern. Match the latest implemented Model Category Master / Devices filtering-and-bulk visual language where available; preserve existing page-shell and toolbar positions.
5. **Four effective Sensor statuses:** `Inventory`, `Active`, `In Maintenance`, `Decommissioned`. Inventory/Active derived automatically from effective valid Asset Mapping; Maintenance and Decommissioned are protected admin overrides. Do not add a visible status selector to Create/Edit.
6. **Keep all sample and user data intact.** Preserve Sensor IDs, model IDs, existing identifiers, stored locations, measurement metadata, connections, hardware bindings, resource allocations, saved views and user-entered values. No destructive reseeding or localStorage reset.
7. **Only Sensor-specific functionality** plus minimal shared mapping/model-access fixes required for correctness. Do not redesign/modify Devices, SIM, Vehicle, Driver or other master UI. Shared status logic may be reused but must not silently change other masters' semantics.
8. If an older Devices Master **UI-frozen** `.md` conflicts with this document, its Create/Edit freeze still applies; the **latest user-requested sectional Filters/Bulk upgrade** is the explicit exception here.

---

## 1. ACTUAL current repo baseline — Create/Edit fields (freeze exactly)

Verified from `SensorsMasterContent.tsx` ~1822–2070. **These are the precise currently rendered inputs/controls**:

| Existing UI section | Field/control | Current nature | Final instruction |
|---|---|---|---|
| **1. Basic information** | **Organization Name** | Required organization selector; client scope locked | KEEP EXACTLY |
| | **Sensor category** | Required selector from enabled Sensor models | KEEP EXACTLY |
| | **Sensor name** | Required text field | KEEP EXACTLY |
| | **Sensor ID** | Required text field | KEEP EXACTLY |
| | **Physical identifier field** | Required text field whose label dynamically reads `Serial number`, `BLE MAC Address` or configured identifier type | KEEP EXACTLY |
| **2. Manufacturer and model** | **Vendor / Manufacturer** | Required selector | KEEP EXACTLY |
| | **Model** | Required selector | KEEP EXACTLY |
| | **Measurement capability** | **Read-only** value showing capability and unit, e.g. `Temperature (°C)` | KEEP EXACTLY |
| **3. Additional metadata** | **Notes** | Existing optional multiline textarea | KEEP EXACTLY |
| Footer | Cancel / Create Sensor / Save changes | Current placement and buttons | KEEP EXACTLY |

**Confirmed distinction:** `formLocation`, `formLifecycle`, `formRange`, `formCapabilities`, `formIdentifierType` etc. exist in component state or `SensorRecord`, but **Inventory Location, Inventory Status, Measurement Range, Connectivity Capabilities and Identifier Type are NOT separately rendered as user-editable Create/Edit fields.** DO NOT expose them as new inputs in this task. The existing dynamic physical identifier label stays exactly as is.

**Correct validation without UI changes:** keep the same error-banner area and current labels. When a required identifier or model is invalid, show an accurate error inside the EXISTING error region; do not add error cards or controls.

---

## 2. Final Sensor Status — mapping-connected (same mental model as Devices)

| Effective Sensor Status | Meaning | Source | Editable from Create/Edit? |
|---|---|---|---|
| **Inventory** | No valid CURRENT active sensor mapping/allocation | Derived from Asset Mapping | NO |
| **Active** | Sensor participates in at least one valid, activated, currently effective sensor-to-hardware or sensor-to-resource relationship | Derived from Asset Mapping | NO |
| **In Maintenance** | Temporary physical repair/calibration/hold | Protected admin override | NO; use existing Bulk/authorized actions |
| **Decommissioned** | Permanently retired; new mappings forbidden | Protected admin override | NO; use existing Bulk/authorized actions |

**Precedence:** `Decommissioned` > `In Maintenance` > `Active` when effective mapping exists > `Inventory`.

**Examples:**

| Scenario | Sensor status |
|---|---|
| Sensor freshly registered, unbound | Inventory |
| Only Draft membership | Inventory |
| Sensor binding starts tomorrow | Inventory; Scheduled mapping may be shown in Filter/Details independently |
| Sensor has current valid Device→Sensor binding in activated mapping | Active |
| Standalone sensor currently allocated to a Resource through activated connection | Active |
| Sensor has active connection with Device but no SIM | Active, when an effective mapping/binding exists |
| Sensor has two effective relationships; one ends | Active |
| Last effective mapping ends/gets canceled | Inventory |
| Admin holds sensor for calibration/repair | In Maintenance after resolving affected mappings |
| Admin returns it to service | Recompute from mapping; Active or Inventory accordingly |
| Permanently retired | Decommissioned; cannot rebind |

**Status is NOT:** `Model Category Master.status`, live `Online/Offline`, raw `ConnectionRecord.status`, or telecom/SIM activation status.

### 2A. Required shared derivation logic

- Reuse/extend `computeHardwareBindingStatus`, `computeResourceAllocationStatus`, `HardwareBinding`, `ConnectionRecord`, `ResourceAllocation` in `src/types/modalMaster.ts`; avoid duplicate rules or string-only membership checks.
- Derive by stable internal `SensorRecord.id`, matching `ConnectionRecord.memberIds`/`members`, `HardwareBinding.fromHardwareId/toHardwareId`, and applicable `ResourceAllocation.hardwareId`/whole-connection scope when genuinely attached.
- Only valid **currently effective**, activated connections and relationships produce Active; check `effectiveStartAt`, `effectiveEndAt`, `endedAt`, `statusOverride`, `Conflict`, cancellation, and connection state.
- Draft, inactive, needs-attention/conflicted, future-only, historical-ended or unrelated connection membership does NOT produce Active. If a connection is active but sensor is merely listed with no actual effective attachment, don't assume operational binding.
- Support direct-reporting standalone Sensors; a SIM is **not mandatory** for Active. The mapping builder currently derives connection status from Device+SIM presence, which is wrong for wired/BLE/direct-resource use cases. Fix this functional condition without changing Mapping UI.
- Re-evaluate on mapping create/update/end, localStorage `fleetrobo:modal-store-updated`, reload, and time-window changes. Dates must be evaluated against `now` rather than blindly trusting last-saved status.
- Keep existing stored `hardwareLifecycle` compatible, but use one computed effective status in the Sensors Table, filter, export, Details and Bulk eligibility. Do not leave two conflicting status sources.
- Device and Sensor may share a utility implementation, but this deliverable must not accidentally alter SIM carrier status logic or other unrelated screen designs.

### 2B. Existing legacy six statuses → four effective statuses

| Legacy stored status | Effective treatment |
|---|---|
| Inventory | Recalculate mapping; Inventory unless effectively mapped |
| Active | Recalculate mapping; do NOT trust old manual Active |
| In Maintenance | Preserve explicit override |
| Decommissioned | Preserve explicit terminal override |
| Suspended | Map to In Maintenance override; retain original status in safe migration/audit metadata |
| Pending Hardware Review | Retain review metadata; calculate effective Inventory/Active instead |

Never mass-delete historical values, links or identifiers. Use idempotent migration and retain existing seeded demo data.

---

## 3. Sensor LIST TABLE — lean and consistent, without Create UI impact

Source `src/types/modalMaster.ts` ~692–708 declares **15 columns**, in this exact order:

1. Organization (`company`)
2. Sensor name (`name`)
3. Sensor ID (`deviceId`)
4. Sensor type (`kind`)
5. Vendor / Manufacturer (`manufacturer`)
6. Model (`modelText`)
7. Identifier type (`identifierType`)
8. Serial number (`serial`)
9. Measurement capability (`measurementCapability`)
10. Measurement unit (`measurementUnit`)
11. Measurement range (`measurementRange`)
12. Inventory location (`inventoryLocation`)
13. Inventory status (`hardwareLifecycle`)
14. Registered (`registeredAt`)
15. Updated (`updatedAt`)

**Single approved list change:** remove `inventoryLocation` from `SENSOR_COLUMNS` and Column Catalogue → **14 original columns remain, same order, same widths, same names, same visibility/default behavior**. `SensorRecord.inventoryLocation` must NOT be removed from data model, import/export source records or historical data. It remains usable in Filters.

**Do not** add extra `Mapping Status`, `Assigned Vehicle`, `Connection Type`, `Sensor Health`, or `Connectivity` columns to main table in this task. Mapping status is a FILTER capability and a detail of existing links; not a new table column.

**Keep unchanged:** Search, Platform Admin Organization picker, Filters, Column Catalogue, Density, Saved Views, Refresh, Bulk actions, Import, Export, Create Sensor; row selection, sortable headers, actions, pagination, right-side inspector, current CSV export button.

**Functional consistency only:** table status badge must use derived 4-status resolver, and sort/filter/CSV must agree with what the table displays. Avoid `.replace(/\s*·\s*.*$/, '')` truncation of legitimate sensor names; repair underlying display/data handling without redesigning input.

---

## 4. FILTERS — SAME RIGHT-SIDE DRAWER, now sectional and useful

**Current actual page:** Filters drawer is 520px right-side and currently uses Organization (Admin), Sensor Type, Manufacturer, Measurement Unit, Inventory Status; it has Reset filters and Close. **Keep the drawer, enhance it rather than creating another page or modal.** Match existing latest FleetRobo Model Category Master / Devices master filter styling.

### Section 1 — Organization & Classification
- **Organization** — only for Platform Admin; tenant view is permanently scoped to the selected company. Never leak cross-company models/records.
- **Sensor Type** — searchable multi-select; dynamic values from authorized records and enabled catalogue (Temperature Sensor, Fuel Level Sensor/Fuel Sensor, Door Sensor, other custom catalogue types only where present).
- **Vendor / Manufacturer** — searchable multi-select; dependent on filtered scope.
- **Sensor Model** — searchable multi-select; actual model names selected from Company Model Access and records, not invented presets.
- **Identifier Type** — searchable multi-select (Serial Number, BLE MAC, MAC Address etc. only when configured/used).

### Section 2 — Measurement & Technical Data
- **Measurement Capability / Type** — dynamic multi-select (Temperature, Fuel Level, Door State etc. where present).
- **Measurement Unit** — searchable multi-select from actual data (`°C`, `°F`, `L`, `%`, `State`, other custom units if present). Do not hardcode an incomplete three-value list.
- **Measurement Range** — text search / existing ranges selector when actual range metadata exists; ranges stored as human-readable strings, so DO NOT invent numeric comparisons or parse arbitrary formats into fake min/max fields.
- **Sensor Connection Mode** — OPTIONAL only if reliably resolved via the associated Model Category Master `connectionMode` and valid model ID; do not add a blank filter or manufacture sensor-level connectivity values.

### Section 3 — Inventory & Asset Mapping
- **Sensor Status** — exactly Inventory, Active, In Maintenance, Decommissioned; derived as defined above.
- **Mapping Status** — Active Mapping, Scheduled, Unmapped, Historical/Ended (computed from actual connection/binding/allocation time windows, not arbitrary seeded labels).
- **Inventory Location** — **filter only**, select actual saved location values, even though list column was removed.

### Section 4 — Dates
- **Registered On** — From/To date range on `registeredAt`.
- **Last Updated** — From/To date range on `updatedAt`.

### Filter UI and behavior — consistent across masters
- Right-side sliding drawer; use existing overlay/header/close, consistent clean typography, subtle section dividers/collapsible groups and orange accent. Preserve page toolbar and Create/Edit UI.
- Searchable multi-select where applicable; `OR` inside a multi-value filter, `AND` across filters; single-value fields work too.
- Organization selection in main toolbar and drawer must stay synchronized; never two contradictory company filters.
- Real dynamic dropdown options from authorized Sensor records/canonical approved models, including custom values, zero fictitious options.
- Use **draft filter state inside drawer**: Cancel/X closes without applying pending edits; Apply Filters commits; Reset All clears controls and, on Apply, clears active filters. Applied-filter chips may appear directly beneath the existing toolbar without moving other controls, styled exactly like latest master pattern.
- Filters button count = number of active predicates (exclude global Search), not selected device count. Keep search outside drawer.
- Reset current page to 1 on applying filters, on search/filter changes, and when result count shrinks.
- Empty-state guidance and result count must match the filtered list; no crash when no models, locations or measurements exist.
- Filtering must apply consistently to sorting, visible rows, selective bulk actions, existing CSV Export and Saved Views. Persist new filter config when Save View is used, and read older saved views safely.
- Avoid duplicated Organization field outside/inside drawer if it creates confusion; keep existing toolbar Organization select as-is and synchronize both with the same state.
- **Do not add unrelated Device fields** like Platform Protocol, Camera Channels, SIM Slots or Device Modes to Sensor filters.

---

## 5. BULK OPERATIONS — consistent right-side panel, sensor-specific safety

**Current actual page:** 560px right-side `Bulk Operations · Sensors` drawer, with selection summary, action dropdown, optional target owner/status dropdown, eligibility/skipped counts, confirmation flow. Current action options:

- `Update ownership`
- `Update inventory status`
- `Decommission eligible`
- `Delete eligible`

**Keep these valid existing workflows, with safeguards; enhance ONLY the Bulk Operations drawer to match the latest FleetRobo sectioned layout**. Preserve its right-side behavior and page toolbar.

### Section A — Selection Summary
- Selected count (correct company and filtered scope), Eligible count, Skipped/Protected count.
- Show selected identifiers/names in a compact scrollable list (use existing pattern).
- Display a clear no-selection state without adding unrelated page UI.

### Section B — Choose Bulk Action

| Action | Decision / eligibility |
|---|---|
| **Send to Maintenance** | Set maintenance override only on eligible sensors, after active/scheduled mapping checks; never break active relationships silently |
| **Return to Service** | Clear maintenance override, recompute Active/Inventory based on mapping. Never force Active |
| **Update Inventory Location** | Update existing `inventoryLocation` record property without adding the field to Create/Edit or table |
| **Update ownership** | **Preserve existing action**, Platform Admin only; block when any unresolved mapping/binding/allocation or tenant eligibility conflicts exist; prevent cross-company data leakage |
| **Decommission eligible** | Keep existing action; prohibit mapping with retired sensor, verify all active/scheduled relationships and confirmation |
| **Delete eligible** | Keep; block deletion for any sensor with ANY active, future, ended or historical mapping/binding/allocation reference; preserve the current confirmation pattern |
| **Export Selected** | Export only the authorized selected sensor records, applying current column/export semantics. This option is inside existing Bulk drawer, no extra toolbar button |

The legacy `Update inventory status` is **not allowed to force Inventory/Active**. Either replace its inner options with valid Maintenance / Return to Service / Decommission operations, or keep the action label for backward compatibility while enforcing those derived-status rules. The allowed effective statuses are only the four defined earlier.

### Section C — Validation & Preview
- Display exact Selected / Eligible / Skipped counts and per-record skip reasons (e.g., `Active sensor binding`, `Scheduled mapping`, `Historical reference`, `Not authorized`, `Already decommissioned`, `Invalid status transition`, `Ownership conflict`).
- Recompute eligibility **again before commit**, not just when drawer opens; reject stale selections.
- Confirm destructive or company-transfer actions using the existing confirmation pattern; no silent deletes/moves.
- On partial success, update eligible only; skipped untouched. Accurate results toast and cleaned selection state.
- Existing single-row `Delete` modal must also block mapped/historically referenced sensors, not merely show warnings. An existing active-link warning badge is not enough to authorize delete.
- Preserve audit/history of status overrides and ownership changes in localStorage metadata, without new Create/Edit inputs.
- Bulk selection must not include old hidden selected IDs after company switch or filter change. Never change sensors outside authorized company scope.
- Don't turn sensor Device/Hardware status into connectivity Online/Offline; there's no live telemetry here.

---

## 6. Other source-confirmed fixes — FUNCTIONAL ONLY; do not alter Create/Edit presentation

| Priority | Source-reviewed issue | Required underlying fix |
|---|---|---|
| **P0** | `formLifecycle='Active'` initialized for newly created sensors (~238, ~399); new record can be Active before mapping (~575) | Compute `Inventory` for unbound new sensor; do not trust legacy form state |
| **P0** | Sensor serial prefilled with `SN-SENSOR-...` on Create (~387), blank serial replaced by `SN-${trimmedId}` on Save (~497) | Preserve physical identifier as actually entered; no fabricated real Serial/BLE MAC. Keep the SAME visible required field and placeholder. Require a valid real value where selected model requires it. |
| **P0** | Sensor Type / Manufacturer / Model fallback to Teltonika/EYE Sensor, unrelated catalogue options (~268–337, 368–402) | Exact company-approved active model only on new registration; no silent fallback; keep existing dropdown UI and conditional label. Legacy records remain editable/viewable without rewriting historical model |
| **P0** | `selectedSensorModelSpec` can pick the first manufacturer/category model even when model reference is unmatched (~324–335) | Exact matching on `category=Sensor`, type, manufacturer, model, and tenant-enabled `modelTypeId`; show existing error banner on mismatch |
| **P0** | `getEnabledModelsForCompanyName` gives unknown tenant global models or Adani fallback (`companyModelEnablement.ts` ~527–546) | Strict tenant isolation, unknown company returns empty; Platform Admin unrestricted only in platform-owner context |
| **P0** | `finalCompany`/`finalLocation` may silently use Adani Mundra / Mundra CT2 defaults (~524–528) | Resolve true company context; preserve legitimate existing location. For new sensor do not assert wrong warehouse; no visible location control is authorized in this task |
| **P0** | `Measurement capability / unit / range` and `BLE` can be fabricated by generic model defaults (~285–316, ~390–396, ~856–958) | Canonical spec only if actually defined; otherwise preserve existing value or mark unknown internally. Keep existing read-only Measurement capability field and all labels/UI unchanged |
| **P0** | JSON/CSV parser forces all non-`Fuel Sensor` records to `Temperature Sensor` (~845, ~908), losing Door/custom categories | Read true category from company-approved Model Category Master; preserve supported custom categories, validate unknown type rather than silently changing it |
| **P0** | Import auto-fills fake owner, model, range, unit, BLE, location and status (CSV/JSON ~810–976) | Validate actual source values and approved model/tenant; provide accurate existing upload success/skipped reporting; do not add new import wizard |
| **P0** | Individual Delete removes sensor regardless of active mapping references (~701–718); modal only warns (~2540+) | Block when ANY mapping/binding/allocation reference exists (active, scheduled, historical); no orphan references |
| **P0** | Bulk Decommission/Delete protects only Active connections (~727–750); `Update inventory status` freely overwrites derived Active/Inventory (~789–798) | Shared reference/transition guard; derived statuses; accurate eligibility preview |
| **P0** | Bulk `Update ownership` writes `s.company` while active mappings may still belong to old company (~789–791) | Platform Admin only; require mapping cleanup and atomic tenant consistency. No cross-tenant data transfer by ordinary user |
| **P1** | Status filter reads stored `s.hardwareLifecycle` (~606) while mapping may change | Use computed effective Sensor Status everywhere (filter/sort/badge/export/bulk) |
| **P1** | Saved views support only old `kind/manufacturer/unit/status` filters (~1707–1821) | Preserve older views, extend saved filter serialization for new sections and tolerate removed list column |
| **P1** | `selectedSensorRecords` drawn from ALL `store.sensors` regardless of current filtered scope (~722) | Intersect selected IDs with authorized current company and filtered list; recheck on confirm |
| **P1** | `Sensor name` list display strips the suffix after ` · ` (~1400) | Preserve original user-entered name in list/details without changing textbox or layout |
| **P1** | Inspector `Activity` tab creates two summary events instead of actual event history (~2271–2304) | Preserve tabs/layout, but use verifiable stored events if history exists; don't call synthetic summaries an immutable audit log |
| **P1** | Model metadata includes `connectionMode` but `SensorRecord` doesn't have it | Derive for optional Filters/Details via valid model ID only; no new Create field or invented per-unit data |
| **P1** | Main table currently contains `Inventory location` (~692–708 type constants) | Remove only that column from Sensor list and Column Catalogue; retain source value in data/filters/import |

### Special note on data never shown in Create form

Fields such as `measurementRange`, `capabilities`, `inventoryLocation` and lifecycle are still part of the internal record and used by other workflows. **Do not remove the properties**, even if invisible on Create. However, because there is no visible input, never pretend an unprovided new record had a real physical location/calibration range. Keep unknown internally as appropriate. Existing nonempty values stay intact.

---

## 7. Import / Export / Inspector / Saved Views — preserve visual UI

### Import
- Keep current `DirectBulkUploadView`, right-side Import Sensor drawer, CSV/JSON support, Download Template, Use Sample CSV, existing progress/success/failed states.
- Fix parser to handle `Door Sensor`, `Fuel Level Sensor` and other actually permitted types; do not coerce to Temperature by default.
- Validate selected company's enabled model definitions and primary hardware identifier. Do not require `Serial Number` literally if model uses BLE MAC or other supported identifier; keep single physical identifier Create field.
- No invented owner/location/manufacturer/model/measurement/unit/range/capabilities.
- Import status must not force `Active`; compute after stored mapping resolution.
- If no existing UI for per-row preview, use current upload error reporting and summary; no new wizard or full-page design.
- Keep Inventory Location field in import source data wherever it already exists (removing list column does NOT delete the field).

### Export
- Keep existing one-click Export toolbar behavior, preserving current visible-columns convention minus Inventory Location.
- Add **Export Selected** inside Bulk drawer as per latest user request, without new toolbar button.
- Export effective derived Sensor Status, not stale `hardwareLifecycle`.

### Details Inspector
- Keep Overview / Linked records / Activity tabs and existing drawer width/layout.
- Show effective Sensor status in existing status display locations; linked records computed from actual connections/bindings.
- Do not add new Mapping Status list column or a second drawer. Keep all historical connections visible appropriately, distinguished from current active connections by existing status information.

### Saved Views
- Keep existing Save/Apply/Delete controls and right drawer.
- Save/restore new filter groups and values; load legacy views without crashing, particularly if `hiddenCols` includes removed `inventoryLocation`.
- Saved views cannot override user/tenant authorization.

---

## 8. Exact technical scope — minimize changes

| File | Allowed modifications |
|---|---|
| `src/components/SensorsMasterContent.tsx` | Sensor status display/validation, sectional Filter Drawer, refined Bulk Drawer, import/selection/delete safety, existing components' logic. **Do not change Create/Edit JSX or visual structure.** |
| `src/types/modalMaster.ts` | Shared effective status derivation and safe optional metadata; delete `inventoryLocation` entry **only from `SENSOR_COLUMNS`**, never from `SensorRecord`. Preserve Device/SIM schemas and stored data. |
| `src/types/companyModelEnablement.ts` | Fix missing company access/isolation fallback if not already fixed from Devices release. |
| `src/components/modal-mapping/MappingFormDrawer.tsx` | Fix underlying connection activation shortcut (Device+SIM) and unknown-tenant fallback **only if not yet fixed**. No Mapping UI changes. |
| `src/types/modelCategoryMaster.ts` | Read canonical approved Sensor model metadata as needed; no new master UI fields. |

**Do not change:** `src/App.tsx`, menus/navigation, main toolbar order, Create/Edit Sensor fields, existing theme/css tokens, unrelated modules, other masters' UI.

If the current Google AI Studio working copy already contains newer Devices/Master filter styling than the GitHub snapshot, **reuse that working implementation as the design reference**. Source audit confirms the GitHub version still has basic filters; do not pretend the latest sectional UI is already in the GitHub commit.

---

## 9. Acceptance QA — all must pass

### Frozen UI
- [ ] Create Sensor/Edit Sensor contain exactly **9 visible field controls**: Organization, Sensor category, Sensor name, Sensor ID, dynamic physical identifier, Vendor/Manufacturer, Model, read-only Measurement capability, Notes; existing conditional labels and sections preserved.
- [ ] No additional Inventory Location, Status, Measurement Range, Connection Mode, Capabilities, Identifier Type or Mapping Status input added in Create/Edit.
- [ ] Main toolbar buttons/order/style and right-drawer widths unchanged except explicitly authorized filter/bulk internal redesign.
- [ ] Only Inventory Location removed from Sensor list and Column Catalogue; all other **14 column definitions** preserved.
- [ ] Saved views/inspector/import dialogs unchanged except required behavior corrections.

### Mapping status
- [ ] Unmapped new sensor = Inventory (not Active).
- [ ] Active effective Device→Sensor binding or direct Resource allocation = Active even without SIM.
- [ ] Draft, Scheduled future, Inactive, canceled, expired, conflicting or unrelated historical mapping = not Active.
- [ ] Last active mapping ends = Inventory; another active mapping remains = Active.
- [ ] Maintenance override > mapping status; return to service recalculates; Decommissioned is terminal for new mapping.
- [ ] Four statuses only on new status selection/filter/badges; legacy statuses migrated without lost provenance.
- [ ] No fake Online/Offline from mapping status.

### Filters & Bulk
- [ ] Four clearly separated Filter sections, searchable multi-select, functional dynamic options and date ranges.
- [ ] Status and Mapping Status are distinct filters; Inventory Location searchable in drawer but not shown as list column.
- [ ] Applied-filter count/chips, Apply/Reset, pagination, saved views and exports consistent.
- [ ] Bulk drawer shows accurate Selected/Eligible/Skipped with exact reasons and confirmation.
- [ ] Update ownership restricted to authorized Platform Admin and mapping-safe records.
- [ ] Return to Service doesn't force Active; status derived.
- [ ] Export Selected exports correct authorized selection, no extra toolbar button.
- [ ] Single/bulk delete blocks all currently or historically referenced sensors.

### Data integrity
- [ ] Exact company-enabled active model resolved; no fallback to wrong tenant/model.
- [ ] Physical BLE MAC/Serial never fabricated from Sensor ID.
- [ ] Door/custom sensors preserved on Import; measurement metadata accurate and not invented.
- [ ] Existing sensor data, connection references, registered/updated dates, saved views and custom catalogue entries preserved.
- [ ] No cross-tenant bulk action after company/filter switching.
- [ ] TypeScript build and all existing screen navigation pass.

---

## 10. Short Google AI Studio companion prompt

> Review the attached **FleetRobo Asset360 Sensors Master — FINAL Repo-Audited Fixes** `.md` and implement its instructions in my existing prototype.
>
> **Strictly preserve EVERY visible Create/Edit Sensor field, label, required marker, conditional identifier behavior, section and UI layout exactly as currently implemented.** Preserve main page toolbar and overall styling. Do not touch unrelated masters or build backend.
>
> The **only table-column removal** is `Inventory location` from Sensors list/Column Catalogue; retain its underlying data and use it in Filters.
>
> Upgrade ONLY the existing **right-side Filters drawer and Bulk Operations drawer** to the latest Model Category Master / Devices master sectional pattern. Make Sensor-specific filters for classification, measurements, mapping/status and dates. Support appropriate bulk actions with eligibility and safe mapping checks.
>
> Use **four mapping-driven effective statuses**: Inventory/Active auto-derived from valid effective Asset Mapping; In Maintenance/Decommissioned protected overrides. Fix the source-verified model/tenant fallback, fabricated sensor serial/defaults, Import type coercion, unsafe delete/bulk, stale status and tenant selection. Preserve every record and relationship. Run all QA checks.

---

## 11. Source anchors (reviewed against repo HEAD)

- `src/components/SensorsMasterContent.tsx` — state ~145–251; enabled models ~156–236; model lookup ~261–365; Create/Edit population and save ~368–590; filtered table ~592–658; delete/bulk ~699–807; CSV/JSON import ~809–986; toolbar ~1070–1285; table ~1370–1490; filter drawer ~1556–1705; Create/Edit visible JSX ~1822–2070; inspector ~2072–2304; bulk drawer ~2305–2474; import/confirm modals ~2474–2668.
- `src/types/modalMaster.ts` — `SensorRecord` ~55–77; six legacy `HardwareLifecycleStatus` values ~12–18; `SENSOR_COLUMNS` ~692–708; binding/allocation status helpers ~1180–1274; localStorage persistence ~3956+.
- `src/types/modelCategoryMaster.ts` — canonical Sensor-specific model metadata (`measurementType`, `measurementUnit`, `connectionMode`) ~52–84.
- `src/types/companyModelEnablement.ts` — tenant model-access fallback ~527–547.
- `src/components/modal-mapping/MappingFormDrawer.tsx` — SIM-presence-based target status ~1395 and unknown-company ID fallback ~1405.

**This file is an implementation specification, not a claim that the GitHub repository has already been modified.**
