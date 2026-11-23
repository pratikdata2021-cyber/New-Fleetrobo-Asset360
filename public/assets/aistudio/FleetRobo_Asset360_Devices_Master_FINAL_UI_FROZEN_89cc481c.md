# FleetRobo Asset360 — Devices Master
## FINAL GitHub-Audited Implementation Specification — UI Frozen / Create Fields Frozen

**Repository:** `pratikdata2021-cyber/New-Fleetrobo-Asset360`  
**Reviewed branch:** `main`  
**Reviewed HEAD:** `2ee6114158ea82df9ec008e12b78899c60b1e730` (2026-11-22 17:43:32 UTC)  
**Primary page:** `src/components/DevicesMasterContent.tsx`  
**Purpose:** Apply ONLY the approved Devices Master data/functional fixes. This is a frontend-only React/TypeScript/localStorage prototype.

> **HIGHEST-PRIORITY USER INSTRUCTIONS — OVERRIDE ALL PRIOR DEVICE MASTER V1/V2 PROMPTS**
>
> 1. **ZERO Create/Edit form field changes.** Do not add, remove, rename, hide, move, reorder, merge or change any existing visible input, dropdown, option, section, tooltip, label, required marker, placeholder, or field grouping in Create Device / Edit Device. Keep the exact existing drawer.
> 2. **ZERO UI redesign.** Preserve exact current look and feel: dimensions, sections, headers, button placement, tables, toolbar, modals, right-side drawers, filters, typography, colors, icons, spacing, interactions, and responsive behavior. Do not add dashboard cards, filter sections, chip rows, mapping columns, extra buttons, or new drawers.
> 3. **ONLY explicitly approved presentation exception:** remove `Inventory location` from the **Devices LIST TABLE and its Column Catalogue**, without removing the `inventoryLocation` data property anywhere or changing the Create/Edit form.
> 4. **Four Device statuses** with functional mapping-driven logic: `Inventory`, `Active`, `In Maintenance`, `Decommissioned`. Update values in existing status badge/filter/eligible status actions, using the same existing visual controls/styling.
> 5. **Preserve all existing data**: devices, sensors, SIMs, model IDs, company IDs, connections, bindings, allocations, saved views, custom options, imported data and historical records. Never reset seed data or overwrite users' localStorage.
> 6. **Fix behavior, not appearance.** Any earlier request to add Create fields, redesign filters, build new sections, show extra status columns, or add bulk controls is **CANCELED** by this document.

---

## 1. Actual repository baseline — what is on screen RIGHT NOW

### 1A. Create / Edit drawer — EXACT existing visible fields

This is the complete, verified field inventory from `DevicesMasterContent.tsx` lines ~2034–2664. **Do not change this inventory.**

| Existing section — preserve exact name | Existing field/control | Current UI nature | Decision |
|---|---|---|---|
| **1. Basic information** | Organization Name | Required select; client view locked, platform admin selectable | **KEEP EXACTLY** |
| | Device category | Required select | **KEEP EXACTLY** |
| | Device name | Required text input | **KEEP EXACTLY** |
| | Device ID | Required text input | **KEEP EXACTLY** |
| | IMEI | Conditional text input when selected model supports IMEI | **KEEP EXACTLY** |
| | Serial Number | Conditional text input when model supports Serial Number | **KEEP EXACTLY** |
| | Existing other hardware identifier input | Conditional input for custom model identifier type | **KEEP EXACTLY** |
| **2. Manufacturer and model** | Vendor / Manufacturer | Required select | **KEEP EXACTLY** |
| | Model | Required select | **KEEP EXACTLY** |
| | Mode (Multi-select) | Existing multi-select, search and custom mode affordances | **KEEP EXACTLY** |
| | Platform Protocol | Existing selector, search and custom protocol affordances | **KEEP EXACTLY** |
| **3. Additional metadata** | Notes | Existing textarea | **KEEP EXACTLY** |
| Footer | Cancel / Create Device or Save changes | Existing buttons | **KEEP EXACTLY** |

**Crucial verified detail:** `formLocation`, `formLifecycle`, `formChannelCount` and `formIdentifierType` are already in component state and/or the stored `DeviceRecord`, but **Inventory Location, Inventory Status, Channels and an explicit Identifier Type selector are NOT separately rendered as visible fields in the current Create/Edit drawer**. **Do not expose or add them now.** Earlier v2 text proposing those new form fields is superseded.

Do not rename `Mode`, drop custom modes, turn Platform Protocol into a different UI, change when identifier fields appear, or add any additional visible status field.

### 1B. Current table and toolbar

`src/types/modalMaster.ts` currently declares **16 `DEVICE_COLUMNS`**:

`company`, `name`, `deviceId`, `kind`, `manufacturer`, `modelText`, `identifierType`, `mode`, `platformProtocol`, `channelCount`, `serial`, `imei`, `inventoryLocation`, `hardwareLifecycle`, `registeredAt`, `updatedAt`.

**Final table:** remove **only** `inventoryLocation` from `DEVICE_COLUMNS`, resulting in **15 existing columns** with their current order, labels, widths and visibility unchanged. The `inventoryLocation` field remains in stored records, import template/processing, existing location-related logic and full device details wherever already supported.

- Keep Search, existing Organization selector (Platform Admin), Filters button, Column Catalogue, Density, Saved Views, Refresh, Bulk actions, Import, Export and Create Device **exactly as positioned now**.
- Keep existing row checkboxes, sorting, status pills, row actions, pagination and right-side drawers.
- **Do not add a `Mapping Status` column**: it is *not* in the current `DEVICE_COLUMNS`, and this task does not authorize a new one.
- Do not move Mode, Protocol, Channels, IMEI/Serial or Dates into different default/optional layouts. All columns other than Inventory Location stay as currently configured.
- Saved views that reference `inventoryLocation` must ignore that removed table key safely, without wiping saved views or the original record data.
- Export behavior remains the **existing single Export button**, using the current visible-column export convention (minus the removed column); **do not add an export-choice dialog or new buttons**.

### 1C. Existing right-side drawers — PRESERVE ALL

- Filters drawer (520px), Saved Views drawer, Create/Edit drawer (690px), Details inspector (690px), Bulk Operations drawer, Import drawer (620px).
- Preserve their existing headings, organization, layout, width, header/footer positions, control types, and existing modal designs.
- **Do not implement the earlier five-section "Advanced Filters" redesign for Devices**. Keep existing Organization, Device category, Vendor/Manufacturer and Inventory status filters. Improve only option accuracy and how they filter the derived status.
- Keep existing Bulk Operations UI and DirectBulkUploadView; implement protective validation within those existing flows.

---

## 2. FINAL Device Status contract (four statuses)

| Displayed Device Status | Meaning | Ownership | How it is assigned |
|---|---|---|---|
| **Inventory** | This device has no valid, currently effective **active** Asset Mapping connection/relationship | Mapping-derived | Automatically |
| **Active** | This device currently participates in at least one valid, activated, effective Asset Mapping connection/relationship | Mapping-derived | Automatically |
| **In Maintenance** | Device temporarily held out of service, regardless of historical mapping | Device override | Existing permitted admin operation |
| **Decommissioned** | Device permanently retired and unavailable for new mapping | Device override | Existing permitted admin operation |

**Precedence:** `Decommissioned` > `In Maintenance` > mapping-derived `Active` > `Inventory`.

**Never conflate:**
- Device Inventory Status (`Inventory/Active/In Maintenance/Decommissioned`).
- Global Model Status (`Active/Inactive` in Model Category Master).
- Mapping/Connection status (`Draft/Scheduled/Active/Inactive/Needs Attention`).
- Real-time connectivity status (`Online/Offline`): no heartbeat source exists in this prototype; do not fabricate it.

**No manual forcing of Inventory/Active.** These are results of mapping logic. Status updates must not mark an unmapped device Active or keep a mapped device as Inventory.

### 2A. Exact lifecycle examples

| Scenario | Final Device Status |
|---|---|
| Device just registered, never mapped | Inventory |
| Device in a saved Draft mapping | Inventory |
| Device has future-only Scheduled binding/allocation | Inventory |
| Device in a properly activated, currently effective mapping | Active |
| Device has an effective mapping to a resource or another hardware unit but no SIM | Active |
| One mapping ends, another active mapping remains | Active |
| Last active mapping ends/expires/cancels | Inventory |
| Device sent to repair/hold after resolving mapping conflicts | In Maintenance |
| Device returned from maintenance | Recalculate: Active if currently mapped, else Inventory |
| Device retired via a valid admin operation | Decommissioned |
| Mapping record exists historically but is Ended/Inactive | Inventory unless an override applies |

### 2B. Derivation requirements — implement in shared **logic only**

- Build a single **pure** helper such as `deriveDeviceStatus(deviceId, store, nowMs)` inside an existing suitable shared type/utility module, with a backward-compatible optional override field if needed.
- Resolve device by stable **physical `DeviceRecord.id`**, not by mutable Device Name, IMEI or display text.
- Use the existing `ConnectionRecord.memberIds/members` and legacy `hardwareId/parentId` references, plus current `hardwareBindings` and `resourceAllocations`.
- A record marked Draft, Scheduled, Inactive, Needs Attention, a canceled/ended/expired binding, a conflicted relationship, or only a future-effective allocation **must not** generate Active.
- A connection that is activated and has an applicable **currently effective mapping** can produce Active even when no SIM is present. Check binding/allocation start/end windows, `endedAt`, `statusOverride`, the linked connection status, and device membership; don't count unrelated bindings in the same connection.
- Reuse/extend existing `computeHardwareBindingStatus` and `computeResourceAllocationStatus` from `src/types/modalMaster.ts` rather than duplicating date rules.
- For a standalone member in an activated connection with no explicit pairwise binding, count it only if it truly represents an activated device placement/allocation supported by the mapping model; **mere draft or unbound membership is not enough**. Do not guess if relationship data is missing.
- Recompute on mapping create/edit/activate/end/unmap, maintenance state changes, relevant localStorage events and app reload. Evaluate effective dates against current time, not just last-saved status.
- Sync the same computed value into the **existing** Devices status pill, current Inventory-status filter, Inspector status display, export rows, and bulk eligibility. **Do not introduce new UI components.**

### 2C. Critical existing mapping code fix

`src/components/modal-mapping/MappingFormDrawer.tsx` ~1395 currently does:

- Device + SIM => connection `Active`
- Device without SIM => connection `Scheduled`
- No device => connection `Draft`

**Fix the connection activation/validation logic, not the mapping layout.** SIM presence is not a sufficient or necessary condition for active mapping. Respect explicit Draft vs Activate action, valid current bindings/allocations, device membership and effective windows. **Do not alter MappingFormDrawer's visible UI or create new fields.**

### 2D. Existing statuses / data migration

Current `HardwareLifecycleStatus` union includes six options. Only **four** should be presented as effective Device statuses:

- Legacy `Inventory` / `Active`: recompute against actual mappings; keep original stored values in non-destructive migration metadata if necessary.
- Legacy `In Maintenance` / `Decommissioned`: preserve as existing explicit overrides.
- Legacy `Suspended`: translate to In Maintenance override; record original value.
- Legacy `Pending Hardware Review`: preserve review metadata; effective status derives from mapping (usually Inventory if unmapped), not a fifth status.
- Migration must be deterministic, safe to repeat, scoped to Device records only, and must not mutate Sensor/SIM statuses inadvertently.
- `hardwareLifecycle` may be retained for backward compatibility; **avoid two competing sources of truth**. A dedicated optional `statusOverride` is acceptable in the internal record shape. Do not add a visible form input.
- Do not destroy all saved data on code load or silently restore deleted/modified sample records.

---

## 3. Source-verified bugs to fix **without changing the Create UI**

| Priority | Exact current implementation problem | Functional-only repair |
|---|---|---|
| P0 | Create initializes `formLifecycle='Active'`; saved new devices can be Active before any mapping | New unbound device must display Inventory; compute current effective status; never trust manual form-state Active |
| P0 | Existing `effectiveSerial` and `effectiveImei` copy `Device ID` when physical identifier input is empty | Never generate physical Serial/IMEI from internal Device ID; retain blank where optional and validate real supplied identifiers |
| P0 | Enabled category/manufacturer/model lists fall back to hardcoded GPS/Teltonika/FMB120/catelogue if no company-enabled model | New Create: require exact globally Active, company-enabled model; no silent fallback. Keep the same existing selects and their presentation |
| P0 | `selectedModelSpec` uses first category / first global enabled model when exact selected model is not found | Resolve exact company + Device category + Manufacturer + Model -> canonical `modelTypeId`; show error in **existing error banner** when unmatched |
| P0 | Existing registration may silently persist an incorrect company and model pairing | Validate organization context and `modelTypeId`, especially Platform Admin with All Organizations selected |
| P0 | `availableModels` asserts `defaultProtocol:'MQTT'`, `channelCount:4` for a canonical model even if not specified | Use actual matching model/category capabilities where defined; do not fabricate technical specifications |
| P0 | `capabilities` defaults `['Cellular']` for unknown matches | Persist accurate model metadata or empty/unknown; preserve existing legitimate values |
| P0 | `handleConfirmDeleteDevice` deletes without checking mapping use; warning chips do not prevent confirmation | Keep **same confirmation modal UI** but block deletion for any device referenced by active, scheduled **or historical** mapping/binding/allocation |
| P0 | Bulk status update directly overwrites `hardwareLifecycle` including Inventory/Active | Do not overwrite mapping-derived state; use existing Bulk Operations UI for exception transitions/return-to-service logic only |
| P0 | Bulk Decommission/Delete checks `Active` connections only, not other mapping references | Compute eligible vs skipped from all relevant mapping references; preserve existing count and reason presentation |
| P0 | CSV/JSON import invents `Adani Port`, `Teltonika`, `FMB120`, `Mundra CT2`, `MQTT`, Cellular/BLE and 4 channels | Enforce tenant/model/identifier validation; use actual source data only. Keep upload UI/template entry points unchanged |
| P0 | Unknown company can see global model catalogue or inherit Adani access via fallback | Unknown company => no permitted models; Platform Admin global catalog only in explicit admin context |
| P0 | Mapping builder `targetClient` can resolve unknown ID to `comp-adani-mundra` | Resolve actual tenant ID; fail safely when unmatched |
| P1 | `selectedIds` persist across company/filter switches; bulk gets records from whole store | Scope bulk target set to current authorized/visible company; never operate on hidden cross-tenant rows |
| P1 | Status filter compares `d.hardwareLifecycle`, not real mapping-derived status | Filter using shared status resolver; keep exact filter control and position |
| P1 | Saved view stores status filter and hidden table column keys that may be legacy | Migrate old status filters and ignore `inventoryLocation` table-key safely while preserving view data |
| P1 | Model/status metadata can become stale when a tenant deactivates a model | Keep legacy device detail readable; prevent **new** use of disabled models without rewriting old records |
| P1 | Device name is stripped after the `·` character on save/display | Preserve full user's entered name; do not affect field appearance |
| P1 | Device List/Details/Export can show different status from mapping | Use the same resolver and do not overwrite historic physical identifiers or dates |
| P1 | Existing Activity tab prints two synthetic summary rows | Keep the **same Activity tab**; avoid presenting generated summary as genuine append-only audit; preserve existing text layout and use actual events if supported internally |

**Field-preservation note:** The present custom hardware-identifier input internally uses `formSerial`. Do **not** add a new visible input to fix this. If exact typed identifier handling is necessary, maintain it in invisible/backward-compatible state, without changing any visible field, condition, label or option.

**Device name note:** Keep the textbox and label as-is; repair only data mutation logic. Historic names should remain unchanged until user edits them; avoid mass rewrites.

---

## 4. Bulk actions: same drawer and same control footprint

- Existing right-side **Bulk Operations · Devices** drawer, action dropdown, target dropdown, eligibility count, skipped preview, footer and delete confirmation stay untouched structurally.
- No new button, no new section, no new reason field, no new dialog.
- Existing "Update inventory status" action must **not** force `Active`/`Inventory`. If these legacy targets remain in the existing dropdown:
  - Selecting `Inventory` for a maintenance-held record means **clear the override and recalculate** (which may display Active if mapped), NOT forcibly set Inventory.
  - Selecting `Active` may only request recalculation/validation; it MUST NOT activate an unmapped device; use the existing toast if the request cannot change status.
  - `In Maintenance` is a temporary override; verify incompatible active/scheduled mapping dependencies first.
  - `Decommissioned` is a restricted override; verify dependencies and preserve history.
- Keep "Decommission eligible" and "Delete eligible" options, but protect **all** mapping references, including ended/historical ones for deletion.
- `Suspended` and `Pending Hardware Review` are not valid **new effective statuses**; remove only their selectable target entries if currently shown, preserving legacy stored records.
- Keep current selection/count UI; select-all is current-page scoped. Clear or intersect selected IDs when tenant changes; validate eligibility again at action execution.

**No new lifecycle-reason UI**: when existing confirmation/reason support is present, reuse it; otherwise log action internally. Do not insert a new input into Create/Edit or Bulk.

---

## 5. Filters, Saved Views, Table, Details, Import and Export — no redesign

### Filter drawer
Keep the **current right-side drawer and its four filter controls**, plus the existing toolbar search, with no sectional redesign or additional filters. The only functional adjustment is to calculate the Inventory Status filter from the shared resolver and expose exactly the four effective Device statuses. Make existing Manufacturer/Category filters use actual authorized data rather than allowing a mismatched record.

### Table / Column Catalogue
- Delete **only** the `inventoryLocation` column definition from the Devices list catalogue.
- Do not touch any of the other 15 column definitions, their order/labels/widths, default visibility or column-catalogue categories.
- Keep current status pill styling, but show the 4 effective status values from the shared resolver.
- Keep current export as **one click** of visible columns over filtered/sorted rows. Do not create an export menu. Export computed effective status in the existing status column.
- Maintain table pagination, keyboard behavior, sorting, selection and scrolling as before.

### Saved Views
Keep current Saved Views drawer and current controls. Existing saved views whose `hiddenCols` contains `inventoryLocation` must still apply correctly. Preserve sort/filter/query; never allow a saved view to grant cross-tenant access.

### Inspector
Keep Overview / Linked records / Activity tabs, same current drawer and layout. Replace stale Device Status values with computed effective values in existing text positions. Do not add a Mapping Status column/card or extra details panel.

### Import
Keep existing CSV/JSON import drawer and DirectBulkUploadView workflow and the existing template download/sample buttons. Correct parser and saving behavior only:
- No fake tenant, model, location, IMEI, serial, protocol, channels or capabilities.
- Resolve actual company-enabled `modelTypeId`, enforce duplicates and validate category/manufacturer/model consistently with existing Create flow.
- No import-specified forced `Active`; new records derive from mapping. Existing historical data remains readable.
- Reuse existing success/error summary; **do not add a new preview table, wizard, uploader or columns**.
- Keep `Inventory Location` in import data and template (it is removed only from the LIST column).
- Avoid requiring Serial for every model if its enabled identifier specification uses IMEI/custom identifier instead.
- Ensure failed rows do not partially mutate unrelated company records.

### Cross-module sync
- Change Asset Mapping **functional status validity** only as needed; **no mapping UI redesign**.
- Read existing `fleetrobo:modal-store-updated` / local storage sync events; recompute when mapping changes or time passes.
- The current connection `registrationStatus` snapshot is not the live truth; avoid using cached status when mapping changed.
- Device Model Category is an approved **definition**; Devices are **physical instances**. Do not rewrite historical Device model details when model deactivates.
- Do not change Sensor Master or SIM Master visible UI; do not silently reassign their carrier/physical statuses in this Device-only delivery.

---

## 6. Approved source files / scope

**Likely affected (logic and one expressly removed table column):**

1. `src/components/DevicesMasterContent.tsx` — derive/display status, validation, bulk safety, import, name handling, saved view tolerance, no visible form or layout changes.
2. `src/types/modalMaster.ts` — shared effective-mapping status helper; safe Device-record compatibility; **remove `inventoryLocation` from `DEVICE_COLUMNS` only**. Preserve `DeviceRecord.inventoryLocation`.
3. `src/components/modal-mapping/MappingFormDrawer.tsx` — remove SIM-presence connection-status shortcut and unknown company-ID fallback. Preserve all mapping UI.
4. `src/types/companyModelEnablement.ts` — repair unknown-company/Adani fallback for authorized model selection. Preserve existing admin access.
5. Other helper types as absolutely necessary; **do not rewrite** neighboring masters or styling.

**Must not change:** `src/App.tsx` navigation, CSS/theme tokens, Create/Edit JSX field structure, modal widths, button positions, table layout (except removal of the approved `Inventory location` column), product menus, vehicle/driver/other master forms, unrelated seed records.

---

## 7. QA — PASS/FAIL acceptance criteria

### UI freeze regression (MANDATORY)
- [ ] Existing Create/Edit Device field **count, names, section names, order, labels, placeholders, required markers, tooltips, custom-mode/protocol controls and conditional visibility** exactly match baseline.
- [ ] No new visible Create/Edit fields appear, including Inventory Location, manual Status, Channels, SIM Slots, Ports, Identifier Type selector or Mapping Status.
- [ ] Same drawer widths, colors, typography, layout, spacings, toolbar control order, row actions, filter structure, bulk UI, import UI and inspector tabs.
- [ ] Every previously working visible option/control remains present; company/model dropdown option availability may change **only** to enforce genuine authorization.
- [ ] Devices list still has the same column order/appearance except `Inventory location` absent from table and Column Catalogue; 15 other columns remain.
- [ ] No additional filter section, chip row, button, export menu, mapping column or modal was introduced.

### Status and integrity
- [ ] Newly registered unmapped Device displays Inventory even if historical code initialized `formLifecycle` to Active.
- [ ] Valid activated/effective mapping makes Device Active without needing SIM.
- [ ] Draft/future/expired/canceled/ended/invalid mappings do not produce Active.
- [ ] Removing last valid active mapping makes Inventory; with another valid active mapping, remains Active.
- [ ] In Maintenance and Decommissioned overrides outrank mapping-derived status.
- [ ] Maintenance release recomputes status; decommissioned device cannot be mapped.
- [ ] Legacy Suspended/Pending Hardware Review records are safely handled and original information retained.
- [ ] Filters, list, Details, Export and Bulk all reflect the same effective Device status.
- [ ] Model-only `Active` never misrepresented as Device Status or connectivity Online.

### Validation and data protection
- [ ] Create validates exact company-enabled active Model ID; never silently defaults to unrelated manufacturer/model.
- [ ] Empty optional IMEI/Serial does not get a fake Device ID value; provided identifiers validate against duplicates.
- [ ] Model deactivation doesn't corrupt historical device details or mapping references.
- [ ] Individual Delete and Bulk Delete cannot remove hardware referenced by any existing mapping history.
- [ ] In-use Device Maintenance/Decommission actions cannot silently break active allocations.
- [ ] Import rejects wrong-company or fake-model rows without fabricated defaults.
- [ ] Selected devices from another company cannot be changed after tenant/filter switch.
- [ ] Saved views and all localStorage seed/custom records survive migrations/refresh.
- [ ] Existing CSV/JSON Import, Export, Saved Views, Column Catalogue, sorting, table pagination and right drawers still work.
- [ ] TypeScript build succeeds; there are no new errors, broken routes, or blank states.

---

## 8. Paste-along AI Studio instruction

> Study the attached **FleetRobo Asset360 Devices Master — FINAL UI Frozen** file and implement its specified functional fixes in `pratikdata2021-cyber/New-Fleetrobo-Asset360`.
>
> **STRICTLY DO NOT CHANGE ANY UI**: no layout, styling, drawer size, filter redesign, new components, additional buttons, or changes to ANY existing visible Create/Edit field, label, option, section, or placement. Keep the Create/Edit field inventory 100% identical.
>
> **Only approved visual exception:** remove Inventory Location as a **Devices table column** (and from Column Catalogue); preserve underlying inventory-location data and import.
>
> Implement exactly four effective Device statuses: Inventory and Active automatically derived from valid current Asset Mapping; In Maintenance and Decommissioned are protected overrides. Fix SIM-dependent mapping activation, stale status, incorrect model/company fallback, fabricated IMEI/Serial/defaults, unsafe delete/bulk/import, and tenant selection. Preserve every saved record and historical mapping. No backend. Confirm UI freeze and QA checks.

---

## 9. Verified GitHub source locations

| Source | Relevant code |
|---|---|
| `src/components/DevicesMasterContent.tsx` | Form state ~210–257; model lookup ~324–369; Create/Edit save ~729–853; filters ~855–935; Delete/Bulk ~970–1076; CSV/JSON import ~1080–1228; toolbar/table ~1311–1720; Filters drawer ~1790–1920; Create/Edit visible fields ~2034–2664; Inspector ~2670–2890; Bulk/Import/confirmations ~2900–3250 |
| `src/types/modalMaster.ts` | `DeviceRecord` ~27–53; six legacy status values ~12–18; `DEVICE_COLUMNS` ~673–690; binding/allocation status helpers ~1180–1274; saved storage event support ~3956–4006 |
| `src/components/modal-mapping/MappingFormDrawer.tsx` | Device/SIM-based `computedTargetStatus` ~1395; tenant-ID fallback ~1405; connection status commit ~1527–1545 |
| `src/types/companyModelEnablement.ts` | Unknown-company and Adani access fallback ~527–547 |

**Repository code is not modified by this Markdown specification. Implement only after reading this document and the current GitHub source.**
