# FleetRobo Asset360 — Company Model Access | Final Focused Fixes

**Source:** `pratikdata2021-cyber/New-Fleetrobo-Asset360`, `main` commit `2ee6114158ea82df9ec008e12b78899c60b1e730` (2026-11-22).  
**Scope:** Company Management > one company > **Model Access** tab, related Company Directory counters/filters, and only the necessary connected model-access helpers. **Do not redesign, build a backend, or change unrelated masters.**

## 1. Preserve what is already working

Keep Company Directory, company selector, company detail tabs, model enable/disable toggles, pending changes, Save Changes / Cancel, in-use warning, batch enable/disable, audit log, existing seed companies/model grants, stable company IDs/model IDs, and white/off-white/orange FleetRobo styling. This is an improvement of existing UI, not a rewrite. Never remove existing fields.

## 2. P0/P1 gaps and fixes

| Priority | Verified source issue | Required fix |
|---|---|---|
| P0 | `getEnabledModelsForCompanyName` returns all global active models for unknown company | **Fail closed** for unknown/blank ordinary company: return no enabled models; explicit Platform Admin context alone can view the global catalogue |
| P0 | Missing company grants fall back to `comp-adani-mundra` | Remove accidental cross-tenant fallback; grants must resolve via stable `companyId`, not display name. Preserve only explicit, known legacy defaults for their actual company |
| P0 | Bulk Disable bypasses single-toggle in-use confirmation | Require consolidated confirmation of affected **in-use** models, counts, and historical preservation before queuing changes |
| P0 | Switching company silently discards pending edits | Save / Discard / Stay confirmation on company switch and Back navigation when dirty |
| P0 | Add Company generates legal name, fake email/phone/city and auto-enables model IDs `mcat-03`/`mcat-10` | Do not fabricate company data or grant models automatically. Newly created companies start with no grants until explicit admin approval; preserve older existing grants |
| P1 | `inUseMap` initialized once, not refreshed on store changes | Recompute / refresh counts from actual inventory and bindings (or clearly label verified demo counts); don't invent real-time totals |
| P1 | Selection count uses `selectedModelIds.length === filteredModels.length` | Select-all checks exact intersection of visible IDs; clear/reconcile selection when filtering or changing company; never apply an action to hidden unintended IDs |
| P1 | Enabled counts can include globally inactive model grants | Separate **Granted** vs **Currently Available** counts; Effective Available = company allowed + company active + global model active |
| P1 | Filters inline rather than standard right-side drawer | Add sectional Filter Drawer, with search outside and applied chips |
| P1 | Batch buttons are inline | Add standard right-side Bulk Operations drawer with preview, eligibility and Save Changes behavior |
| P1 | Model access fields still use Type Name, Model / Reference, Identifier Type | Align display labels with Model Category Master while retaining internal keys |
| P1 | Actor in audit is hardcoded `Platform Admin` | Display actual selected prototype actor/role; clearly distinguish demo actor if real identity unavailable; preserve old audit entries |

## 3. Company Directory — fields and columns

**Existing list defaults to preserve:** Company Name (+ legal name), Industry, Sites, Company Status, Enabled Model Types, Actions.  
**Additional optional columns:** Company ID, City/Country, Contact Email, Granted Models, Currently Available Models, Device/Sensor/SIM enabled counts, Last Updated. Keep Company Overview, Sites, Activity & Audit, Add Company modal as they exist; touch Add Company only to stop fake defaults and automatic model permissions.

**Company Status:** Active / Onboarding / Inactive (never conflate with model statuses). Inactive companies must not register new hardware; onboarding eligibility must be explicitly controlled, not silently treated as active.

## 4. Company > Model Access table — exact contract

| Default column | Description |
|---|---|
| Select checkbox | Safe multi-selection |
| Company Access | Enabled / Disabled toggle; mark Unsaved pending changes |
| Category | Device / Sensor / SIM |
| Model Type | `typeName` from global catalogue |
| Manufacturer / Provider | Category-aware label using current `manufacturer` value |
| Model Name / Number | `modelReference` |
| Identifier Types | All identifier formats, multi-value display |
| Global Model Status | Active / Inactive from Model Category Master |
| In Use | Assigned inventory/mapping count, with reliable provenance |

**Optional columns:** Model ID, Device Function, Supported Modes, SIM Type, Model Last Updated, Pending Change, Currently Available.  
**Counts above table:** Total Global Models, Granted Models, Currently Available Models, Granted Devices, Sensors, SIMs, In-Use Assets. Explain grant vs effective availability. Avoid a misleading numerator if global model is inactive.

**No model creation/editing from this tab.** Link to Model Category Master for model specification creation; this page grants or revokes company access only.

## 5. Filters — RIGHT-SIDE sectional drawer, same as Driver/Vehicle Master

Keep concise toolbar: **Global Model Search | Filters (active count) | Columns | Bulk Operations (when selected)**. Do not scatter six dropdowns across the toolbar. Use matching existing white/orange UI, right-side slide-in, collapsible sections, sticky footer **Reset All** / **Apply Filters**. Applied filter chips below toolbar. Apply AND across filter groups and OR within a multi-select.

| Drawer section | Filters |
|---|---|
| 1. Model Identity | Category, Model Type, Manufacturer/Provider, Model Name/Number, Identifier Types |
| 2. Access & Eligibility | Company Access Enabled/Disabled, Global Model Status Active/Inactive, Currently Available Yes/No, Pending Change Yes/No |
| 3. Device Configuration | Device Function, Modes, Protocols, Connectivity — show for Device category |
| 4. Sensor/SIM Configuration | Measurement Type/Unit, SIM Type, Form Factor — show only when applicable |
| 5. Usage & Audit | In Use Yes/No, In-Use Count range, Model Updated On date range |

Company Directory filters: separate right-side drawer using Company Status, Industry, City/Country, Enabled Models Yes/No; keep its existing company search. Do not confuse company directory filters with model-access filters. Filter option values are derived from actual records. Filter changes reconcile selection, counts and the current view. Avoid controls for unavailable data.

## 6. Access, save, and bulk rules

| Operation | Required behavior |
|---|---|
| Single Enable | Allowed only for global Active model and authorized company; queue pending change |
| Single Disable | If in use, show exact impact warning; preserve existing inventory/history; queue pending change |
| Bulk Enable | Select eligible models, preview eligible/skipped and reasons; queue pending only after confirmation |
| Bulk Disable | Show in-use models/counts before confirmation, never bypass warning |
| Save Changes | Commit only actual changed `companyId + modelId` flags, emit sync event, append audit entries, clear pending state |
| Cancel/Reset Pending | Revert queued changes, not committed flags; confirm when switching company with pending edits |
| Export | Filtered and Selected CSV, including company ID/name, model ID, global status, access status, effective availability and counts; no sensitive unrelated data |
| Delete model | **Never from Company Access** — global model deletion is controlled at Model Category Master |

Right-side Bulk Operations drawer should provide **Enable Selected, Disable Selected, Export Selected, Clear Selection**. No bulk-delete or global status edits here. Keep pending vs saved vs effective statuses visually distinct. Audit entries contain real model ID, company ID, action, old/new flag, actor and timestamp; no false claim of immutability beyond prototype storage.

## 7. Cross-module contract

- `modelId` is a stable global catalogue ID; `companyId` is the authoritative tenant key. Do not identify tenants using potentially duplicate company display names.
- A model is selectable for a *new* Device, Sensor, SIM registration or Asset Mapping only when the global model is Active **and** the correct company has an Enabled grant **and** the company is eligible for new registrations.
- Revoking access never deletes or changes historical devices, SIMs, sensors, or mappings; they remain visible in details/history.
- Reactivating a global model does not auto-regrant permissions previously disabled by a company admin/platform admin.
- Keep using existing localStorage prototype stores/events, but ensure all relevant pages refresh from them after committed changes. No backend required.
- Restrict access-management controls to Platform Admin prototype role; ordinary tenants can view their allowed models where appropriate, not edit other tenant grants.

## 8. Acceptance checks

1. Unknown company gets **zero** effective enabled models, never Adani's or the global catalogue.
2. Company A changes cannot alter Company B model access.
3. Existing model/company IDs and prior grants survive the update and refresh.
4. New company creation contains no fake legal/contact data or auto-granted models.
5. Single and bulk disable in-use models show warnings before pending changes.
6. Switching company with unsaved edits prompts Save / Discard / Stay.
7. Global inactive model cannot be newly enabled; existing in-use records persist.
8. Granted and Currently Available counts reconcile and explain inactive global models.
9. Search + filters + selected IDs + counts + export are aligned, including empty states.
10. Right-side filters and bulk drawers open/close, scroll and preserve existing UI layout.
11. Save Changes creates appropriate audit records and refreshes dependent modules.
12. Existing Company Overview / Sites / Activity tabs continue to work.

## 9. One-shot Google AI Studio instruction

Implement **only** the above Company Model Access fixes against the existing FleetRobo Asset360 React prototype. Preserve all existing fields, role views, sample companies, real IDs, previously saved grants, tabs, drawers and white/orange styling. Treat tenant isolation, in-use bulk-disable safeguards, and pending-edit safety as P0; then standardize columns, right-side sectional filters, right-side Bulk Operations and exports. Do not invent backend APIs, company information, model capabilities, in-use metrics, or permissions. Preserve historical asset and mapping data. Test all 12 acceptance checks and correct any failures. Do not modify unrelated modules.
