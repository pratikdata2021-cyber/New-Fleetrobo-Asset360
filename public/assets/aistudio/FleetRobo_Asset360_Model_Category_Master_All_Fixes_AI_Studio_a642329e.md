# FleetRobo Asset360 — Model Category Master | Final Fixes

**Target repository:** `pratikdata2021-cyber/New-Fleetrobo-Asset360` (`main`)

**Implementation goal:** Upgrade the **existing Model Category Master**, not rebuild it. Implement **all fixes below** as a single, focused Google AI Studio task. This is a **frontend React/TypeScript prototype**, **no backend**. Preserve the white/light FleetRobo UI, orange accent, existing tabs, drawers, tooltips, options, local demo data, model IDs, existing inventory relationships and navigation. **DO NOT remove any existing Create/Edit field** or modify unrelated pages beyond necessary model-dropdown integration. Avoid resetting user-saved localStorage data.

## A. Existing gaps and exact fixes

| Priority | Current gap | Required fix |
|---|---|---|
| P0 | Table says **Type Name**, **Model / Reference**, **Identifier Type**, **Status**; drawer says **Brand**, **Registration Status**. | Align all Create/Edit/View/List/Filter/Export labels to **Model Type**, **Model Name / Number**, **Identifier Types**, **Model Status**. Keep existing internal data keys (`typeName`, `modelReference`, `identifierTypes`, `status`) for compatibility. |
| P0 | `Brand` means different things across categories. | Contextual label **Manufacturer / Brand** (Device/Sensor) versus **Network Operator / Provider** (SIM). Preserve `manufacturer` field and existing values. |
| P0 | Device Function, Mode and Protocol inputs are not fully category-gated in the drawer. | Show Device-only controls only for **Device**; Sensor-only for **Sensor**; SIM-only for **SIM**. Do not delete underlying data or fields. |
| P0 | `modelReference` can be blank for newly created Device models. | For **new Device models**, require **Model Name / Number**. Do not invalidate legacy Device records or require a model number for SIM/Sensor definitions. |
| P0 | Delete simply removes model definition; no reliable relationship guard. | Block delete when the model is referenced by Devices, Sensors, SIMs, company-model-access assignments, or mappings. Show explanation and offer **Deactivate**. Existing records must never become orphaned. |
| P0 | Company model lookup may fall back to all global models or another company's access for unknown company. | Unknown company = **no enabled models**. Only Platform Admin sees the full global catalogue. Every client gets its own company-ID-scoped enabled models. |
| P0 | Local storage loader can restore deleted seed `mcat-13` and treat a valid empty array as missing data. | Restore seed data **only when storage is absent/invalid**, not when explicitly saved empty; do not reinsert deleted IDs. Migrate old records without changing IDs. |
| P1 | `connectivity`, `simSupported` exist in model schema but are not editable in the form; Sensor `connectionMode` already has form state but is not shown. | Add functional Create/Edit controls for **Connectivity Types**, **SIM Supported**, and **Sensor Connection Mode**; preserve existing record values when editing. |
| P1 | Video capability mixes `Cam1`, `Cam2` etc. into Modes. | Preserve existing Modes; additionally define optional **Maximum Camera Channels** for video-capable models. This is model *capability*, not per-device channel assignment. Never infer channel counts. |
| P1 | CSV export omits most category-specific fields; no complete Model Category CSV import. | Add robust **Import CSV**, template, preview/error report and **Export Selected / Filtered / All** with full fields. |
| P1 | No record multi-select / bulk drawer in Model Category Master. | Add checkboxes, selection counter, and consistent **right-side Bulk Operations drawer**. |
| P1 | Reset demo data can replace records and document attachments are metadata-only. | Add destructive reset confirmation + prototype-only labeling; do not imply attachments are downloadable if bytes are not stored. |
| P1 | SIM validity uses `parseInt`, which can truncate decimals. | Strictly validate **positive whole-number months**; reject decimals and mixed text. |

## B. Add / Edit / View drawer — field contract

**Keep exactly three existing sections** and make their section headings readable. Tooltips only where the meaning is non-obvious. Asterisk = required on new records. Preserve existing input values and custom option creators.

| Section | Field displayed | Requirement / behavior |
|---|---|---|
| 1. Primary Classification | **Category*** | Device / Sensor / SIM; category-dependent form. |
| 1 | **Model Type*** | Existing `typeName`; preserve quick-pick suggestions and free text. |
| 1 | **Manufacturer / Brand*** or **Network Operator / Provider*** | Same stored `manufacturer`; category-specific label, options and custom entry. |
| 1 | **Model Name / Number** | Existing `modelReference`; **required for new Device**, optional for Sensor/SIM and legacy records. Do not confuse with physical serial/IMEI. |
| 1 | **Identifier Types*** | Existing multi-select/custom identifiers; minimum one; show recommended category choices. |
| 2. Device | **Device Function*** | Preserve all existing functions and custom option. |
| 2. Device | **Supported Modes** | Preserve existing multi-select and custom options. |
| 2. Device | **Supported Protocols** | Preserve existing multi-select and custom options. |
| 2. Device | **Connectivity Types** | Expose existing `connectivity`: multiselect, optional; e.g. Cellular/Wi-Fi/BLE/Ethernet. |
| 2. Device | **SIM Supported** | Expose existing `simSupported`: Yes / No / Unknown; default **Unknown**, not a fabricated Yes. |
| 2. Device | **Maximum Camera Channels** | **New**, optional positive integer for applicable camera/MDVR/ADAS/DMS models; do not default to 4. |
| 2. Sensor | **Measurement Type*** | Preserve Temperature, Fuel Level, Door State, Pressure, Other. |
| 2. Sensor | **Measurement Unit** | Preserve choices; require only when the selected measurement needs one; State or Not Applicable for binary sensors. |
| 2. Sensor | **Connection Mode** | Expose existing `connectionMode`: Gateway-connected / Standalone / Both / Unknown. |
| 2. SIM | **SIM Type*** | Preserve M2M / Standard / IoT / Other. |
| 2. SIM | **Form Factor** | Preserve Physical SIM / eSIM. |
| 2. SIM | **Default Validity (Months)** | Optional; if supplied, strictly positive whole integer. |
| 3. Documentation & Governance | **Description** | Keep optional textarea. |
| 3 | **Documentation URL** | Keep optional; accept only valid `http` / `https` URL. |
| 3 | **Supporting Documents** | Preserve attach/remove, existing metadata and visible file list; no fictitious working download. |
| 3 | **Model Status** | Active / Inactive. Default Active for new model only. |

**Drawer behavior:** Right-side Add/Edit/View remains. Preserve Cancel, sticky Save footer and unsaved-change dialog. Category change should warn if it clears entered category-specific values; for a referenced existing model lock category to avoid breaking downstream records. View must display every saved field including newly exposed ones. All fields must round-trip correctly through localStorage after refresh.

## C. List view + filters + columns

| Area | Final requirement |
|---|---|
| Keep **nine current default columns** | 1 Model Type; 2 Category; 3 Manufacturer / Provider; 4 Model Name / Number; 5 Identifier Types; 6 Category Details; 7 Supporting Documents; 8 Model Status; 9 Updated On. Preserve derived Category Details. |
| Column Catalogue — optional | Device Function, Supported Modes, Supported Protocols, Connectivity Types, SIM Supported, Maximum Camera Channels, Measurement Type, Measurement Unit, Connection Mode, SIM Type, Form Factor, Default Validity (Months), Description, Documentation URL, Created On. |
| Search | Case-insensitive across Model Type, Manufacturer/Operator, Model Name / Number and Identifier Types. |
| Filters | Keep All/Devices/Sensors/SIMs tabs and Model Status; add searchable Manufacturer/Operator filter. Reset/Clear works. |
| Table utilities | Sorting, pagination (10/25/50), custom show/hide/reorder/pin where supported, sticky row actions, empty-state message. Keep column labels the same as Create/Edit. |
| Row actions | View, Edit, Activate/Deactivate, Delete **only if unreferenced**; explain disabled delete. |

## D. Status, deletion and bulk operations

| Action | Final behavior |
|---|---|
| **Active** | Eligible for platform catalogue and *new* client enablement, but still requires company-level permission before registration. |
| **Inactive** | Not selectable for **new** inventory or enablement. Existing inventory, mappings and historical records stay visible. |
| Deactivate | Confirmation both from row action **and Edit status field**; show known affected relationships, or say impact unknown rather than fake counts. |
| Reactivate | Restore global availability; **do not automatically enable** for any client. |
| Delete | Only if no references; show confirmation. No bulk delete. |
| Bulk drawer | Right-side drawer with **Activate, Deactivate, Bulk Edit Description/Documentation URL, Export Selected, Clear Selection**. Apply only to eligible selected rows, with preview + confirmation and outcomes; no changes to Category/Model Type/Manufacturer/technical specs in bulk. |

## E. CSV template, import and export

| Feature | Final behavior |
|---|---|
| Template columns | Category, Model Type, Manufacturer / Provider, Model Name / Number, Identifier Types, Device Function, Supported Modes, Supported Protocols, Connectivity Types, SIM Supported, Maximum Camera Channels, Measurement Type, Measurement Unit, Connection Mode, SIM Type, Form Factor, Default Validity (Months), Description, Documentation URL, Model Status. |
| Required validation | Category + Model Type + Manufacturer/Provider + at least 1 Identifier Type; **Model Name / Number + Device Function** if Device; **Measurement Type** if Sensor; **SIM Type** if SIM. |
| CSV parsing | Correctly handle quoted commas, escaped quotes, line breaks and UTF-8; trim whitespace; use exact canonical field mapping. Multi-select values in one cell use a documented separator, e.g. `;`. |
| Duplicate handling | Compare normalized Category + Model Type + Manufacturer/Provider + Model Name/Number (when supplied); preview **Create / Update / Skip**. Never silently overwrite. |
| Import preview | Counts for Valid, Duplicate, Invalid, Unchanged; row number + field-level errors, downloadable error CSV, clear commit action. Do not invent missing model specs. |
| Export | Selected / Filtered / All, full-field or visible-columns option; quote-safe downloadable CSV. Preserve original values. |

## F. Required shared integration (do not redesign other pages)

| Destination | Contract |
|---|---|
| **Company Model Access** | Model IDs are canonical/stable; new Active model appears for Platform Admin to enable. Per-company enabled map uses actual **company ID**, not fallback to another tenant. |
| **Device / Sensor / SIM Masters** | Create dropdown shows **Active + company-enabled + matching category** models only; Edit/View still resolves historical referenced model after deactivation. |
| **Asset Mapping** | Preserve existing model ID relationships; use saved technical capability metadata when relevant; do not automatically rewire connections or assign channels. |
| **LocalStorage / seeded data** | Preserve user edits, deletions, empty lists, sample IDs and existing stored records. No reset on mount or migration. |

## G. Acceptance tests — finish only after all pass

1. Create Device/Sensor/SIM with proper category-specific fields; **no Device controls shown for Sensor/SIM**.
2. Edit and refresh retains Connectivity, SIM Supported, Sensor Connection Mode and camera channel capability.
3. Existing fields, custom values, legacy empty model references, attachments and seeds remain intact.
4. New Device blank model number rejected; duplicate definition rejected; invalid URL and decimal SIM validity rejected.
5. View/List/CSV labels and saved values match Create/Edit.
6. Active/Inactive properly affects new-registration dropdowns without breaking old model references.
7. Referenced delete blocked; unreferenced delete persists after refresh; deleted `mcat-13` does not reappear; deliberately empty store stays empty.
8. Unknown company cannot access all global models or another company's enablement.
9. Bulk actions respect eligibility, confirm before commit and preserve unselected records.
10. Import preview/error download/Update-Skip decisions and filtered/selected/all export work correctly.
11. Browser prototype runs with no TS/React errors; existing design and unrelated module flows are unchanged.

## Execution instruction to Google AI Studio

**Implement the above changes in the existing project, not a new demo screen.** Start with P0 field consistency and data-integrity/tenant-scope fixes, then P1 UI and bulk CSV workflows. Keep all existing functionality. Do not create backend services. Do not modify out-of-scope Fleet, Vendor, or Vehicle/Driver pages. Only minimal necessary shared integration code is allowed. After completion, briefly report **files updated, behaviors fixed and acceptance-test outcomes**; do not generate a long PRD in response.
