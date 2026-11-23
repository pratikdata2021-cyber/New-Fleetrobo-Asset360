# FleetRobo Asset360 — Assets Mapping | FINAL GitHub-Audited Fixes

**Implementation target:** Existing frontend-only React + TypeScript + localStorage prototype (Google AI Studio). No backend or API development.  
**Repository:** `pratikdata2021-cyber/New-Fleetrobo-Asset360`  
**Audited branch / HEAD:** `main` / `2ee6114158ea82df9ec008e12b78899c60b1e730` (22 Nov 2026, 17:43:32 UTC).  
**Scope:** Both existing Mapping sub-tabs—**Assets Connection** (`ModalConnectionTab`) and **Resource Connection View** (`ResourceConnectionTab`)—plus their existing Create/Edit, bindings, relationship helpers, import/export, filters, bulk, saved views, and sync to Masters.

> ## CRITICAL NON-NEGOTIABLES
>
> 1. **DO NOT REDESIGN THE MAPPING PAGE.** Keep the existing two tabs, layout, toolbar, tables, expandable rows, column catalogues, cards, icons, styling, drawer widths, chips, details tabs, resource picker, hardware composer, confirmation modals, and navigation.
> 2. **CREATE / EDIT UI IS FROZEN.** Keep all existing visible inputs, conditional fields, controls, sections, actions, labels, placeholders, tooltips and order in **Create/Edit Mapping**, **Hardware Composition**, **Create/Edit Resource Allocation**, and **Resource-to-Resource Relationships**. **Add no new Create/Edit fields. Remove none.** Fix internal data and validation behavior, not form appearance.
> 3. **ONLY FILTERS AND BULK DRAWERS MAY BE VISUALLY STANDARDIZED**, staying within the existing right-side drawers and FleetRobo design language, like the latest Devices/Sensors/SIM Masters. No new toolbar buttons, tabs, full-screen flows, or layout changes.
> 4. **PRESERVE EVERY STORED RECORD AND REFERENCE:** connection IDs, physical hardware IDs, Vehicle/Driver IDs, historical/ended bindings, resource allocations, resource relationships, company ownership, timestamps, saved views and user-added data. Do not reset localStorage, re-seed over user changes, or fabricate values.
> 5. **Status semantics are different:** connection lifecycle is not hardware inventory, real-time online/offline, vehicle operational status, driver availability, or carrier SIM activation. Do not replace them with one generic status.
> 6. Implement the current code's business rules where valid, fix listed regressions and authorization holes, and run the QA matrix before declaring success.

---

## 1. Current source inventory — preserve the mental model

| Component | Exact role | User-visible controls to preserve |
|---|---|---|
| `src/components/ModalMappingContent.tsx` | Root container and company scope, manages shared store | **Assets Connection** and **Resource Connection View** tabs; breadcrumb, count, existing reset-demo affordance |
| `src/components/ModalConnectionTab.tsx` | 1 row = 1 Connection; table filters, sort, selection, export/import/bulk and record actions | Search, Filters, Columns, Saved Views, Density, Refresh, Bulk, Import, Export, Create Mapping; expandable member rows |
| `src/components/modal-mapping/MappingFormDrawer.tsx` | Create/Edit a Connection with resource nodes, attached Device/Sensor/SIM members, bindings, Save Draft/Activate | **Exact existing UI, selectors and buttons**; resource chips, hardware composer, confirmation summary |
| `src/components/modal-mapping/HardwareCompositionModal.tsx` | Device↔Sensor / Device↔SIM / Device↔Device attachment configuration, validation, time windows | Exact existing binding controls, quick-register flow, port/slot, Permanent/Temporal |
| `src/components/modal-mapping/ConnectionDetailsDrawer.tsx` | Connection inspector | Overview, Hardware, Bindings, Resources, Activity tabs |
| `src/components/modal-mapping/ModalConnectionOverlays.tsx` | Connection Filters, Columns, Saved Views, Export, Import, Bulk overlays | Keep all existing entry points and drawer style |
| `src/components/ResourceConnectionTab.tsx` | 1 row = 1 Resource Allocation, with hardware scoping and status | Existing table/expanded hierarchy, create/edit allocation drawer, end allocation modal, filter/bulk/import/export |
| `src/components/modal-mapping/ResourceRelationshipsPanel.tsx` | Vehicle/Driver/Fleet/Vendor/Place/Equipment ↔ resource relationships and rules | Existing Resource-to-Resource relationship creation/edit/history and rule selection |
| `src/types/modalMaster.ts` | Shared models, validators, status helpers, columns, storage, import helpers | Source of canonical logical types and compatibility aliases |

**Never merge the two tabs into one table.** A Connection is a logical container; a Hardware Binding links physical hardware; a Resource Allocation assigns a Resource to the Connection/individual hardware; a Resource Relationship associates two resources independently.

---

## 2. Final, consistent Mapping statuses — do NOT collapse them into Device's four statuses

### 2A. Connection lifecycle (exact existing 5 values)

| Status | Definition | Transition behavior |
|---|---|---|
| **Draft** | Saved but not activated | No device/sensor becomes Active solely from draft membership |
| **Scheduled** | User has activated the mapping but its valid effective relationships only start in the future | Becomes Active when valid effective relationships begin; requires recalculation |
| **Active** | Explicitly activated Connection with at least one valid *currently effective* attached binding/placement/assignment, no blocking conflict | SIM presence **not mandatory**; a valid sensor or IP-connected device can be active without SIM |
| **Inactive** | Explicitly deactivated Connection, retained for audit | Ending/deactivation must reconcile associated active/future bindings and allocations; no effective inventory activation |
| **Needs Attention** | Mapping with conflicts, invalid/missing references, incompatible hardware/port, or failed activation eligibility | Show existing warning styling; never make linked hardware Active due to a conflicted relationship |

**Critical distinction:** A Device/Sensor's effective inventory state is `Inventory` if no valid active mapping, `Active` if mapped via a currently effective activated relationship, with `In Maintenance`/`Decommissioned` as protected physical exceptions. Mapping `Scheduled` is not hardware `Active`. SIM carrier lifecycle remains independent from SIM assignment.

### 2B. Hardware Binding lifecycle (exact existing 5)
`Scheduled`, `Active`, `Ended`, `Conflict`, `Canceled`. Based on effective start/end, explicit end/cancel, self-reference, cycles, overlaps and compatible ports. Never use Online/Offline here.

### 2C. Resource Allocation lifecycle (exact existing 4)
`Scheduled`, `Active`, `Ended`, `Conflict`. Resource allocation is not Vehicle operational status (`Available/In Use/Maintenance/...`) or Driver status (`Active/Inactive/Suspended/Archived`). A resource's assignment can be active without changing the resource's operational status.

### 2D. Resource Relationship lifecycle (exact existing 4)
`Scheduled`, `Active`, `Ended`, `Conflict`, subject to rule catalog, cardinality, valid dates, and cycle prevention.

### 2E. Consistent recomputation and precedence
- **Explicit Inactive** blocks subsequent Active on that Connection; draft never auto-activates.
- **Needs Attention** wins over Active/Scheduled where blocking validations apply.
- Else a user-activated connection is **Active** if it has a presently effective valid relationship/attachment; **Scheduled** if future valid relationships exist but none are effective yet; a valid hardware-less resource-only draft should not imply device activation.
- A bare membership row is not proof of a currently active physical binding. To count a standalone unit, there must be an explicit current effective activated placement/allocation represented by the model.
- Ended, canceled, expired, conflicted and future-only relationships do **not** activate hardware now. When the final valid relationship ends, derived Device/Sensor inventory returns to Inventory unless Maintenance/Decommissioned override applies.
- Evaluate effective dates at current time, considering timezone, not just at save time. Recompute on mapping mutation, app reload, and other relevant store changes; avoid cached stale status.
- Preserve the Connection record's status as declared lifecycle intent, but display and use **effective status** consistently in existing chips, summary counts, filters, bulk eligibility, details and export. If needed, add a pure internal `computeEffectiveConnectionStatus` helper with backward compatibility; no new visible field.

---

## 3. P0: Confirmed code issues — highest priority fixes

| ID | Verified problem (file) | Exact required fix |
|---|---|---|
| **MAP-P0-01** | `MappingFormDrawer.tsx` ~1395 determines status by `hasDevice && hasSim => Active`, `hasDevice => Scheduled`, else Draft | Eliminate SIM-based shortcut; respect **Save Draft** vs **Activate**, current binding/assignment windows, conflict validation and standalone placements. No visual form change |
| **MAP-P0-02** | `MappingFormDrawer.tsx` ~1409 and other mapping paths use `COMPANY_NAME_TO_ID[targetClient] || 'comp-adani-mundra'` | Resolve **exact company ID**; unknown/missing company must fail safely (use existing form error) and never default to Adani |
| **MAP-P0-03** | `ModalConnectionTab.tsx` `handleConfirmDeleteConnection` ~143 deletes only parent `connections` row | **Never leave orphan `hardwareBindings`, `resourceAllocations` or relationship references.** Block hard delete whenever any active, scheduled, ended or historical dependency exists. Prefer existing **Deactivate** flow; do not auto-cascade-delete history |
| **MAP-P0-04** | `ModalConnectionTab.tsx` ~495 replaces all bindings on edit and restores only explicitly `endedAt` allocations | On Edit, preserve every unmodified binding and allocation, including ended/canceled/history, and change only those deliberately edited/ended. Stable binding/allocation IDs, audit and references must survive |
| **MAP-P0-05** | Deactivate connection ends hardware bindings, but its resource allocations are not reconciled (`ModalConnectionTab.tsx` ~580, ~1000) | Deactivation should block use of allocations and resolve/end or inactivate them according to existing lifecycle/temporal rules **without deleting history**. Update derived Device/Sensor statuses; show any conflict using existing confirmation/error UI |
| **MAP-P0-06** | Imported connection may be directly `Active` if status says Active and member is not SIM (`ModalConnectionTab.tsx` ~907), without valid bindings | Import as Draft or validate full activation evidence. A single unrelated member or a non-SIM category never proves activation |
| **MAP-P0-07** | Connection CSV import validates against hardcoded `MODAL_OWNERS`, invents fallback model IDs (`mcat-01/07/10`), Adani company ID/site | Validate actual authorized company, registered hardware and stable `modelTypeId`. Do not fabricate company, model, site or activation. Preserve existing Import UI |
| **MAP-P0-08** | `ResourceConnectionTab.tsx` import ~902 assigns synthetic `resourceId` for submitted Vehicle/Driver identifier without master lookup; defaults unknown type to Vehicle | Resolve **real Vehicle/Driver record IDs from correct client Master**, reject unknown identifiers/type, validate overlap, connection ownership, timezone/dates. Keep CSV/JSON UI unchanged |
| **MAP-P0-09** | `ResourceConnectionTab.tsx` Create/Edit ~646 checks overlap mainly for same Connection+type+resourceIdentifier, not underlying resource ID and all applicable exclusivity rules | Use canonical resource IDs; enforce true duplicate periods and configured cardinality (including cross-connection where required). Prevent linking a resource from a different company. Keep valid multi-mapping cases as allowed by rules |
| **MAP-P0-10** | `ResourceConnectionTab.tsx` connection and hardware target picked independently | Validate selected `formHardwareId` belongs to the selected connection/company; reject invalid/retired hardware; do not silently redirect to the first connection or ALL hardware when a selection becomes stale |
| **MAP-P0-11** | Hardware status snapshots `HardwareMembership.registrationStatus` can become stale | For effective status/eligibility, look up **current physical hardware IDs and overrides** in Device/Sensor/SIM Masters; snapshots only for historical display |
| **MAP-P0-12** | Reset Demo Data is a one-click persistent overwrite in `ModalMappingContent.tsx` ~95 | Protect existing user data from accidental reset using the **existing UI footprint**: confirmation via existing modal/pattern; only intentional explicit reset can replace seeds. Never auto-reset on edit/import |
| **MAP-P0-13** | `loadModalMasterStore` normalizes duplicate IDs with `ensureUniqueEntityIds` on load ~3956 | Do not silently change physical/connection/binding IDs without migrating **all related foreign keys**. Stable IDs are critical for mapping and status derivation |
| **MAP-P0-14** | Mapping's Resource→Resource persistence writes `saveModalMasterStore({...loadModalMasterStore(), resourceRelationships})` separately from parent `onCommit` | Combine resource relationships atomically with parent mapping commit; prevent stale overwrite/races, duplicate relation IDs and loss of independently saved changes. Preserve relationship history |
| **MAP-P0-15** | `ResourceConnectionTab.tsx` end-allocation action accepts a selected end time without sufficient guard against invalid chronology | Reject invalid/earlier-than-start or unintended future end for a current stop; use proper timezone; preserve ended time, reason, actor and history |

**Do not strip current status enums or records.** If data migration is required, it must be idempotent and preserve original status/audit context.

---

## 4. Create/Edit Mapping: no visible field changes, functional fixes only

Existing sequence to preserve:
1. Select target organization using the current selector; system generates Connection ID/site as implemented.
2. Add Resource nodes using existing **+ Vehicle, + Driver, + Fleet, + Vendor, + Place, + Equipment** resource picker/quick create.
3. Attach registered **Devices, Sensors, SIMs** through the existing hardware composer to resource or other hardware nodes.
4. Configure existing **Permanent / Temporal**, exact Start/End datetime, timezone, port/slot, compatible model and identifier.
5. Review existing expandable binding/tree rows; **Save as Draft** or **Activate Mapping** with the current confirmation summary.
6. Edit existing connection without duplicating hardware records, losing ended history or overwriting another user's newer mapping version.

Preserve every existing field/control, including the inline quick-register hardware entry and resource relationship dialogs. Fix only these behaviors:
- Verify all selected physical IDs belong to target company; model is eligible for **new selection** under Company Model Access and globally Active. Historically mapped deactivated models remain readable.
- Reject `Decommissioned` or `In Maintenance` hardware as *new effective attachments*; use existing error surface. For SIM, reject `Retired`/`Suspended` where carrier state disallows usage, without auto-editing carrier status.
- Ensure resource nodes are legitimate records of their declared type; prevent invented Vehicle/Driver references.
- Disallow self-bindings, sensor→sensor, SIM as parent, illegal model port/slot, duplicate occupied slot, overlapping SIM bindings, incompatible types, temporal end <= start, and cycles. Use existing `validateHardwareBindingPair`, `hasBindingCycle` and shared interval helpers. Apply checks **again at final commit**, not just at intermediate composer selection.
- On resource links apply `validateResourceRelationship` with configured rules (source/target type, cardinality, cycles, dates) also at final mapping commit; no bypass via embedded form.
- For an activation with valid future-only relationships show Scheduled. For a truly active eligible relationship show Active. For conflicts show Needs Attention / block activation based on severity; use the existing form error and confirmation UI.
- Retain stable existing Connection IDs and binding IDs on edit; append audit events for edit/activation/status changes. Prevent editing historical ended entries as if they were newly active.
- Ensure optimistic version check (`hasVersionConflict`) prevents stale commit instead of merely showing warning. Offer current existing close/review flow; no new control required.

### Date/time rules (all mapping forms)
- ISO timestamp storage with explicit timezone/offset; parse local picker values via existing helpers.
- Permanent = required start, open-ended until expressly ended. Temporal = required start and end with end strictly later than start.
- Reject impossible dates, invalid timezone input, overlapping exclusive assignments and backdated ending that invalidates history.
- `Scheduled` automatically becomes effective on its start date without any user manually forcing inventory status.

---

## 5. Existing tables, columns & views — no redesign

### 5A. Assets Connection list
- Keep **one parent row per Connection** and original default column set: **ORGANIZATION, RESOURCES, CONNECTED HARDWARE, DEVICES, SENSORS, SIMS, BINDINGS, STATUS, UPDATED ON**. Keep existing optional Column Catalogue entries and row expand/tree controls. **Do not remove fields or invent an extra status column.**
- Counts should use distinct stable physical IDs. Derived counts must not double-count a child on multiple paths. Active resource summaries should not count future, ended or conflicted allocations as currently active.
- Existing search/sort/pagination, density, saved views, row actions, details tabs, visible columns and export all consume same computed, company-scoped view.
- Resource allocation display must reflect actual Vehicle/Driver/Fleet/Vendor/Place/Equipment links—not just first Vehicle and Driver where unrelated resources exist.

### 5B. Resource Connection View
- Keep **one row per `ResourceAllocation`** (not one row per resource), existing default/optional columns, expandable hardware/child bindings and inspector.
- Preserve current **Create/Edit Allocation**, **End Allocation**, relationships, full Vehicle/Driver quick-create and associated buttons exactly. No field/layout changes.
- Derived allocation statuses from `computeResourceAllocationStatus` must incorporate parent Connection activation/inactivation and hardware eligibility when the allocation is scoped to hardware. A future allocation cannot be Active.
- Preserve the full relationship history; ending allocation does not mutate the Vehicle/Driver's operational availability status.

### 5C. Identity and company scoping
- Current top-level `activeCompanyScope` is already the data-access boundary: Platform Admin All Clients; tenant admin only own company; customer read-only.
- Enforce permission checks at **action execution**, not just by hiding buttons. Search/filter/results/export/selection/import/create/quick-create and saved views must not expose or mutate records outside authorized company.
- No hardcoded Adani fallback, no implicit first-organization selection for saving into an unrelated tenant.
- Every relationship reference must be resolvable by stable ID; reject orphan/unknown references in new writes; keep historical orphaned records visible with appropriate existing warning behavior until repaired.

---

## 6. Sectional Filters — consistency within existing right drawers ONLY

**Visual reference:** latest Devices/Sensors/SIM Filters drawers / existing FleetRobo design. Use current right-side drawer width/color/spacing and existing toolbar trigger. Add *section labels and sensible searchable/multi-select dropdowns only within the existing drawer*; never modify main mapping table or Create form.

### 6A. Assets Connection filter sections

| Section | Filters |
|---|---|
| **Organization & Connection** | Organization (Platform Admin only; enforce scope), Connection lifecycle (Draft/Scheduled/Active/Inactive/Needs Attention), optional Site if actual stored data |
| **Hardware Composition** | Hardware Category present (Device/Sensor/SIM), Device Model Type (existing company-enabled selector), optional Sensor/SIM model if actual records support |
| **Binding & Activation** | Binding Mode (Permanent/Temporal/None), Binding State (Scheduled/Active/Ended/Conflict/None), Binding Health if available from current computed data |
| **Resource Allocation** | Resource Allocated (Vehicle/Driver/Unallocated existing), optionally resource type (Fleet/Vendor/Place/Equipment) only when grounded in actual allocations |
| **Dates** | Updated From/To (existing), optional Created From/To only if `createdAt` is stored |

Do not invent options or add control for a property that cannot be evaluated from actual records. Apply **AND across filters, OR within a multi-select**, preserve global search outside drawer. Applied count, reset/apply, validation of From<=To, pagination reset, consistency with saved views/export and tenant context. If the reference prototype intentionally supports Basic/Advanced AND/OR, copy interaction **only if compatible with currently stored mapping filters**, otherwise stick to clear AND semantics.

### 6B. Resource Connection filter sections

| Section | Filters |
|---|---|
| **Resource & Connection** | Resource Type (Vehicle/Driver/Fleet/Vendor/Place/Equipment), Connection ID, Resource identifier, Organization if Platform Admin |
| **Allocation** | Allocation Status (Active/Scheduled/Ended/Conflict), Binding Mode (Permanent/Temporal), All Hardware / Specific Hardware scope |
| **Effective Period** | Effective From, Effective To, with chronological validation |

Preserve existing five filter controls, search bar and saved views. Add only genuinely supported filters inside existing drawer and wire them to same filtered rows, count, bulk selection, export and pagination. No new top-bar widgets.

---

## 7. Bulk Operations — existing right-side drawers; validated preview

### 7A. Assets Connection bulk
Preserve these **three current actions**, same entry point:
- **Export Selected Connections** — exported IDs must be exactly selected and within tenant scope.
- **End Active/Scheduled Bindings** — skip ended/canceled/conflicted bindings where inappropriate; apply exact end timestamp, reason, history; no deletion of member or Connection records.
- **Deactivate Connections** — check selected eligible Connections, protect already Inactive and records with unresolved child allocations, propagate deactivation to effective relationships safely, log before/after, preserve history.

Inside existing Bulk drawer show, as in other masters, **Selected / Eligible / Skipped + reason**, safe confirmation, and final result; avoid a brand-new modal layout. Recheck eligibility **just before commit**. Never operate on selected IDs hidden by tenant switch.

### 7B. Resource Connection bulk
Preserve existing **Export Selected** and **End Selected Allocations** actions. Provide accurate **Selected / Eligible / Already Ended / Skipped** with reason using existing drawer layout. Require end reason and correct current time. Protect invalid end timestamps; maintain connection audit where allocation changes. No owner/status updates to Vehicles/Drivers.

### Selection correctness
- Select All on page = current visible page only; existing select-all-matching behavior, if present, must be explicit.
- Switching company/tab/permissions must clear or intersect stale selected IDs; Selected count and Bulk target set must match exactly.
- Filters must never silently expand action scope; use stable IDs, not row index or display name.
- Export Selected must **never silently fall back to all filtered rows** when the user requested Selected but none are selected. Show existing validation/disabled state.

---

## 8. Import / Export / Saved Views — keep existing UI, fix only correctness

### Connections Import
- Preserve current CSV/JSON upload component, Download Template and Use Sample workflow.
- Match actual company and hardware ID under the same organization; require approved model for new hardware selection; distinguish connection membership from active binding.
- Imported `status: Active` alone never creates a valid active binding. Validate activation requirements or import Draft with explicit reason.
- Validate duplicates and reuse canonical IDs; correct row-level skipped reasons, no synthetic `mcat-*`, company ID, fake site, or unsupported active status.
- Prevent import from modifying any other organization's records.

### Resource Allocation Import
- Resolve and validate `connectionId`, resource type and actual resource master IDs (Vehicle Registration Number / Driver ID or contact as appropriate).
- Enforce tenant alignment, referenced hardware membership, valid start/end+timezone, overlap/cardinality, and record status; prevent dummy `res-imp-*` IDs for an imported Vehicle/Driver that exists in Masters.
- Keep current upload status and row error summary UI, no additional wizard.

### Export
- Preserve Assets Connection's **Visible Columns CSV** and existing **four-dataset relational export** (Connections, Membership, Bindings, Allocations); maintain explicit timestamps and foreign key links.
- Preserve Resource Connection's existing visible-column CSV and selected/filtered scope.
- Export only authorized data; derived effective statuses/counts match list filters. Keep IDs exact; do not export stale snapshots as authoritative current status.

### Saved Views
- Preserve both tabs' Saved Views components and storage. Views must restore relevant filters, sorting, visible columns, density and search as currently supported, without exposing other companies. Repair stale/unknown filter IDs gracefully, without deleting user views.

---

## 9. Cross-master synchronization requirements

| Source event | Required result |
|---|---|
| New physical Device/Sensor/SIM registered in Master | Eligible record appears in Mapping picker for the correct company, respecting enabled Model Category/Company Model Access |
| Mapping activated with valid current hardware placement/binding | Relevant Device/Sensor effective inventory status → **Active** (unless Maintenance/Decommissioned) |
| Mapping saved Draft / future scheduled | Relevant Device/Sensor effective inventory status remains **Inventory** unless another active relationship exists |
| Last valid binding/placement ended/deactivated | Device/Sensor effective inventory status → Inventory; preserve physical exception overrides |
| SIM assigned/unassigned | Existing SIM mapping/assignment label updates from effective assignment; **carrier lifecycle stays independent** |
| Vehicle or Driver allocation begins/ends | Resource Mapping status reflects assignment; **Vehicle/Driver operational status does not change** |
| Vehicle/Driver/Hardware record modified in its Master | Mapping resolves stable ID and updates appropriate display labels; no forced duplication or broken reference |
| Model globally inactivated or company access disabled | Existing historical connections remain readable; **new mapping selection** blocked where no longer eligible |
| Parent Connection inactivated | Dependent active links stop contributing to effective status and are reconciled/audited; no orphan records |

Listen to existing `fleetrobo:modal-store-updated` and `fleetrobo:resources-updated` events and localStorage updates; avoid write loops or status flicker. Recompute time-derived statuses after a date/time boundary or when the UI reopens; no backend, cron or fabricated heartbeat.

---

## 10. P1 functional/UI-consistency repairs

- Avoid sorting dates or numeric counts lexicographically, including the Connection / Allocation IDs; use existing `compareConnectionIds` and proper UTC/offset timestamp comparisons.
- Reset page to 1 when filters/search/company scope change, and ensure filtered row count, table, details and export agree.
- Link resource/hardware summary to actual currently valid allocation status, not `status !== Ended` (Scheduled and Conflict are **not active**).
- Preserve the entire Connection Activity timeline, audit timestamps, actor, change reason and version when bulk actions, allocation updates or ending bindings occur.
- Ensure current `hasVersionConflict` actually prevents stale save in `MappingFormDrawer`, not merely displays an alert.
- Do not send already-ended/scheduled future allocation to historical ended state without checking chronological effect; validate exact effective time.
- `Needs Attention` should be triggered by actual validation conflicts, not misinterpreted as offline device telemetry.
- Error messages should say **what is wrong + record / ID + corrective action** using existing toast/banner positions.
- Keep hierarchy/table data readable when a master model is inactive or a reference is historical; do not silently replace it with the first model.

---

## 11. QA / Acceptance matrix — must pass

### UI freeze
- [ ] Mapping page still has **Assets Connection** and **Resource Connection View** tabs, same navigation and main UI.
- [ ] Create/Edit Mapping, Hardware Composer, Resource Allocation and Resource Relationship forms have **identical visible fields/sections/labels/order and controls** as baseline.
- [ ] Existing table columns, expandable rows, pinned behavior, actions, badges, details tabs, toolbar order and drawer width/style remain unchanged.
- [ ] Only existing **Filter** and **Bulk** drawers receive consistent internal grouping/preview improvements.

### Lifecycle and asset sync
- [ ] Save Draft never activates a Device/Sensor, even if Device+SIM are selected.
- [ ] Activate valid Device→Sensor or Device→Device binding without SIM works when eligible.
- [ ] Future start produces Scheduled, then Active upon effective start, without manual activation of physical inventory.
- [ ] Expired, canceled, ended, conflicted and Draft relationships do not activate inventory.
- [ ] Ending last valid binding/placement returns Device/Sensor to Inventory; another valid active mapping keeps Active.
- [ ] Maintenance/Decommissioned exception blocks new effective hardware use; carrier status independent.
- [ ] Deactivated Connection no longer contributes to status, even if stale allocations/bindings exist.

### Data integrity and permissions
- [ ] No cross-tenant mapping selection, resource creation, import, export, saved-view or bulk leakage.
- [ ] Unknown company does not fall back to Adani.
- [ ] Existing ended bindings, allocations and relationship history persist after Edit Mapping.
- [ ] Deleting a Connection with dependent records is blocked, not orphaned or cascade-destroyed.
- [ ] SIM overlap, port/slot duplicate, invalid type, self-reference, cycles and temporal conflicts blocked.
- [ ] Resource import never invents arbitrary Vehicle/Driver master record IDs and never defaults unsupported resource type to Vehicle.
- [ ] Bulk selected/eligible/skipped counts and CSV Export Selected scope are exact.
- [ ] All existing record IDs, audit history, localStorage and saved views survive refresh/reload.
- [ ] TypeScript build succeeds and unrelated Masters/pages retain their UI and behavior.

---

## 12. Exact source locations reviewed

| File | Focus |
|---|---|
| `src/components/ModalMappingContent.tsx` | ~20–282: root scope, two tabs, store sync and reset demo |
| `src/components/ModalConnectionTab.tsx` | ~93–420: list/filter; ~143: delete; ~495: commit; ~580/999: deactivate; ~817–971: import; ~971: bulk; ~1770–2083: overlays |
| `src/components/ResourceConnectionTab.tsx` | ~145–484: enrichment/filter; ~495–783: form validation/save; ~784–862: end/bulk; ~902–1020: import; ~1770–2040: existing Filters and Bulk drawers |
| `src/components/modal-mapping/MappingFormDrawer.tsx` | ~220–639: form state; ~1395: status shortcut; ~1403–1560: commit; ~1570–2320: existing form/buttons/confirm |
| `src/components/modal-mapping/ModalConnectionOverlays.tsx` | ~70–249: connection filters; ~564–690: Import; ~702–783: Bulk |
| `src/components/modal-mapping/HardwareCompositionModal.tsx` | ~243 and ~601: conflict detection, port/slot and global assignment checks |
| `src/components/modal-mapping/ResourceRelationshipsPanel.tsx` | ~725–800: relationship validation & saves |
| `src/types/modalMaster.ts` | ~104–248: status/record types; ~728–975: mapping columns; ~1059–1274: binding and allocation validation/status; ~3548–3708: resource relationship status/validation; ~3956–4006: store loading & events |

**Deliverable = implementation instructions only. No GitHub files are modified by this Markdown document.**

---

## Copy-paste Google AI Studio companion prompt

Implement the attached **FleetRobo Asset360 — Assets Mapping FINAL GitHub-Audited Fixes** specification. Review the current repository first and apply functional fixes to **both Assets Connection and Resource Connection View**. STRICTLY preserve every Create/Edit Mapping, Hardware Composer, Resource Allocation and Resource Relationship field, layout, section, label and control. No page/table/navigation redesign. Make **only the existing Filter and Bulk drawers** consistent with the latest FleetRobo masters. Correct connection status lifecycle (Draft/Scheduled/Active/Inactive/Needs Attention), remove SIM-presence activation shortcuts, enforce company/model permissions, prevent orphan records and historical data loss, validate conflicts, and sync Devices/Sensors/SIM inventory and resource assignments properly. Preserve all IDs, existing data, history, saved views and seed records. Frontend/localStorage only; no backend. Run all acceptance tests and report exactly what was changed.
