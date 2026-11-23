# FleetRobo Asset360 — SIM Master
## Final GitHub-Audited Fixes | Create/Edit UI Frozen | Consistent Sectional Filters and Bulk Operations

**Repository:** `pratikdata2021-cyber/New-Fleetrobo-Asset360`  
**Reviewed branch:** `main`  
**Reviewed HEAD:** `2ee6114158ea82df9ec008e12b78899c60b1e730` (2026-11-22 17:43:32 UTC)  
**Primary source:** `src/components/SimMasterContent.tsx` (2,634 lines)  
**Shared sources:** `src/types/modalMaster.ts`, `src/types/modelCategoryMaster.ts`, `src/types/companyModelEnablement.ts`, mapping/binding logic.

> **Implement functional improvements in the EXISTING React/TypeScript/localStorage prototype.** No backend, no redesign of other pages, no reset of seeded or user data. Follow the latest implemented Devices Master and Model Category Master Filters/Bulk visual pattern, not a new design system.

---

## 1. Non-negotiable scope

1. **Create SIM / Edit SIM form is completely frozen.** Do not add, remove, rename, re-order, relocate, hide or re-label any existing visible field, section, option, required marker, tooltip, placeholder, or conditional control. Keep exact current form width and styling, including all three sections and the existing **SIM lifecycle status** dropdown.
2. **No main-page redesign.** Preserve page heading, toolbar button order, main table styling, row actions, Column Catalogue, Density, Saved Views, Refresh, Import, Export, pagination, the Details inspector, and existing confirmation modal styles.
3. **Only approved table-column removal:** remove **Inventory location** (`SIM_COLUMNS` key `location`) from the **SIM LIST table and Column Catalogue**. Do not delete or modify `SimRecord.location`, CSV/JSON import/export source data, saved inventory data, mapping references, or existing location values. Retain filtering on location inside advanced Filters.
4. **The two approved visual changes are inside the existing right-side Filter drawer and Bulk Operations drawer only**. Make them consistent with the latest Devices Master/Model Category Master standard: grouped sections, searchable controls as appropriate, readable section titles, selected/eligible/skipped summaries, sticky action footer. Preserve brand colors, typography and component language.
5. **Preserve all existing SIM fields, identifiers, companies, assignments, activation dates, plans, model access permissions, saved views, stored records and historical references.** Do not invent telecom attributes.
6. **SIM is not a Device.** Do not blindly copy Device-specific “In Maintenance”, channels, GPS protocol, or physical-hardware decommission wording into SIM UI. Preserve carrier subscription semantics.

---

## 2. Verified Create/Edit form — EXACT field inventory (no field changes)

Verified from `src/components/SimMasterContent.tsx` approximately lines 1727–2029.

| Existing section | Existing visible field/control | Keep |
|---|---|---|
| **1. Basic Information** | Organization Name (select; client user locked) | Exact same |
| | SIM category (select) | Exact same |
| | Dynamic **primary identifier** field, label from `activeIdentifierType` — normally ICCID | Exact same, including conditional label |
| | Form factor (select) | Exact same |
| **2. Operator and Plan** | Network operator (select) | Exact same |
| | Plan / data package (select) | Exact same |
| | Service Mode (select) | Exact same |
| | Model / Reference (conditional select, current condition unchanged) | Exact same |
| | Mobile number / MSISDN (conditional text field, current condition unchanged) | Exact same |
| **3. Additional metadata** | SIM lifecycle status (select) | Exact same — **do not remove this field** |
| | Activation date | Exact same |
| | Expiry / renewal date | Exact same |
| | Notes | Exact same |
| Footer | Cancel / Create SIM or Save changes | Exact same |

**Do not add** a new Inventory Location, Mapping Status, SIM ID, network speed or provider activation field to Create/Edit. `formSimId`, `location`, `network`, `modelTypeId` and `identifierType` may exist internally; this request does not authorize adding UI controls for them.

**Critical interpretation:** The existing **SIM lifecycle status** field is *carrier/service lifecycle data*, not a manually enforced mapping-derived inventory status. Its current choices (`Inventory`, `Active`, `Suspended`, `Inactive`, `Retired`) and saved values remain available in Create/Edit. The SIM list's existing *Inventory status* column can present a **calculated effective inventory status** without modifying that Create/Edit field. Do not silently delete `Inactive` legacy values or reinterpret existing carrier subscription data as an assignment.

---

## 3. SIM statuses — keep carrier and mapping concepts separate

### A. Effective SIM inventory status shown in the existing table/status filter

Four SIM-relevant outcomes:

| Effective status | Meaning | Calculation |
|---|---|---|
| **Inventory** | SIM registered but not currently part of a valid active hardware assignment; or pending activation | No valid effective active assignment; carrier not retired/blocked |
| **Active** | SIM has a valid active mapping/assignment **and** service is eligible | Valid current mapping to hardware/device, and carrier/service state supports use |
| **Suspended** | Service blocked, suspended or unavailable | Carrier/service state is `Suspended` or legacy `Inactive`; preserve original carrier status internally |
| **Retired** | SIM permanently retired | Explicit carrier lifecycle `Retired`; terminal for new assignments |

**Precedence:** `Retired` > `Suspended` > valid currently mapped `Active` > `Inventory`.

**Keep the existing Create/Edit SIM lifecycle status dropdown** and its source values intact. If an admin selects `Active` there while the SIM is not assigned, the list's effective inventory status remains `Inventory`: carrier service active is not the same as allocated to a device. If carrier lifecycle is `Inventory`, do not activate a new mapping until carrier eligibility is explicitly established by existing data/validation. `Inactive` must remain distinguishable from `Suspended` in stored carrier data even though effective inventory view groups them as unavailable.

### B. Assignment/mapping status — independent from SIM/carrier status

Derived from real Asset Mapping records, effective date windows and assignment references:

- **Assigned / Active Mapping:** one valid active SIM-to-hardware binding/assignment currently effective.
- **Scheduled:** future-effective binding/assignment; SIM is **not** yet Active by mapping.
- **Unassigned:** no active/scheduled assignment.
- **Historical / Ended:** only ended/expired/canceled historical assignments.
- **Conflict / Needs Attention:** invalid or conflicting binding; never derive Active.

Do not add an entirely new Mapping Status column if it doesn't exist: current SIM table already includes `Assigned to` and `Assigned connection`. These existing columns and the new Filter drawer must reflect correct effective assignments.

**Real cellular connectivity is NOT known from localStorage**: do not invent Online/Offline, network registration or carrier data-plan validity from an assignment.

### C. Source-of-truth and sync rules

- `src/types/modalMaster.ts`: source includes `SimRecord`, `HardwareBinding`, `ResourceAllocation`, `ConnectionRecord`, `SimAssignmentEvent` and helper `computeHardwareBindingStatus`.
- `src/components/SimMasterContent.tsx`: `activeAssignmentBySimId` currently considers **only** `simAssignments` rows where `!sa.end`. That does **not** prove a current active mapping (could be future, stale or present in inactive connection). Reconcile this legacy history with authoritative `hardwareBindings`, connection activation state and effective time windows.
- The same SIM may have historical assignments but **at most one valid current assignment** where the business validation forbids overlaps; detect conflicts and do not show the wrong device/connection.
- Use stable `SimRecord.id`, `HardwareBinding.toHardwareId`, `ConnectionRecord.memberIds/members`, actual connection id and `SimAssignmentEvent.simId`; do not derive ownership from ICCID string or names.
- Draft/Inactive/Scheduled/Needs Attention connections, canceled/expired/ended/conflicted bindings must not generate active assignment.
- Recompute on Create/Edit/Activate/End/Unassign of mappings, SIM carrier status changes, localStorage store updates, and page reload; compare binding timestamps with now rather than trusting last saved `status`.
- Changes in the SIM inventory must not silently alter Device/Sensor carrier or status fields; validate connected hardware relationships safely.

---

## 4. SIM Master table — keep existing appearance, remove ONLY Inventory location

`src/types/modalMaster.ts` currently has **15** `SIM_COLUMNS` keys:

1. `owner` — Organization
2. `iccid` — ICCID (current UI may show dynamic identifier label)
3. `id` — SIM ID
4. `category` — SIM category
5. `operator` — Operator / Provider
6. `plan` — Plan / package
7. `formFactor` — Form factor
8. `network` — Network
9. `msisdn` — Mobile number
10. `location` — Inventory location **REMOVE FROM LIST and Column Catalogue ONLY**
11. `status` — Inventory status
12. `assigned` — Assigned to
13. `connection` — Assigned connection
14. `activationDate` — Activation date
15. `renewalDate` — Renewal / expiry date

**Final = 14 existing columns**, same relative order and UI as before. Keep all other column definitions, labels, widths, table scroll, sorting, default visibility, select checkboxes, row action menu, pagination, filters, exported visible data and current Column Catalogue behavior.

The status field in the *existing table* should show the calculated effective inventory status. The inspector's existing Lifecycle line should preserve true carrier lifecycle (do not conflate), while existing Assigned to / Assigned connection show computed assignment. If necessary, use current text positions/tooltips; **no new inspector cards or tabs**.

Existing saved views whose `hiddenCols` or sort keys refer to `location` should degrade gracefully (ignore deprecated table key) without data loss. Keep existing one-click Export placement; no new top-level export menu.

---

## 5. Advanced Filters — right-side SECTIONAL drawer (approved visual change)

Keep current `Filter SIM Inventory` right-side drawer (~520 px), current header and backdrop, but organize the filter body into clear collapsible sections consistent with the latest Devices Master/Model Category Master Filter drawer. Keep current global search outside drawer. Searchable multi-selects where reasonable; existing single dropdowns may be reused if consistency requires it.

### Section 1 — Organization & SIM Classification

- **Organization** — Platform Admin only; client users are hard-locked to their current tenant (never expose other companies' SIMs).
- **SIM category** — M2M SIM / Standard SIM / IoT eSIM / actual category names from authorized model/data records. NOTE: `filterCategory` exists in state/filter logic but is **not rendered in current Filter drawer**. Add it.
- **Network operator / Provider** — actual available values, including valid `Other`, not only hardcoded Airtel/Jio/Vi/BSNL.
- **Model / Reference** — via actual stored `modelTypeId` or canonical enabled model; avoid inferences from plan names when real model id exists.
- **Form factor** — current recorded values (Nano/Micro/Triple/eSIM).

### Section 2 — Subscription & Service

- **Plan / Data package** — actual plans available to the authorized tenant.
- **Service mode or SIM type** — only if reliably available from canonical model/master data; otherwise omit.
- **Carrier lifecycle status** — retain existing five underlying service values, separate from mapping-derived inventory status.
- **Network** — optional and only if data is trustworthy; do NOT invent 4G/LTE in filtering when unspecified.

### Section 3 — Inventory & Mapping

- **Effective inventory status** — Inventory / Active / Suspended / Retired.
- **Assignment status** — Assigned/Active Mapping, Scheduled, Unassigned, Historical/Ended, Conflict/Needs Attention, based on actual mapping data.
- **Assigned hardware / Device** — searchable based on actual valid linked device identity, when available.
- **Connection / Mapping ID** — searchable actual connection id.
- **Inventory location** — FILTER ONLY. Keep underlying location data; never restore the removed LIST column.

### Section 4 — Dates

- **Activation date:** From / To.
- **Expiry / renewal date:** From / To.
- Optionally assignment start/end ranges **only if real mapping dates are available and useful**; don't fabricate them.

**Filter behavior contract**

- Section headers moderately larger than field labels; same background, border, spacing and icon style as the Devices advanced filter drawer.
- Searchable multi-select options from actual authorized stored values, not arbitrary global catalogs.
- **AND across fields; OR within a multi-select.** Date From/To inclusive by calendar date, correct handling for missing dates and invalid ranges.
- Maintain **draft filter state** while drawer is open. Footer: **Reset All** and **Apply Filters**; Apply updates table and closes drawer. Closing without Apply must not accidentally save a draft.
- Filters button shows accurate active-filter count. Chips for applied filters may appear in the existing filter-summary area **only**, without adding a new toolbar row or changing global layout.
- Combined search, filters, sorting, pagination, selected count, saved views and CSV export must agree.
- Reset pagination on filter changes. On company switch: reset or constrain selections and filter values to the newly permitted tenant.
- Existing `activeFilterCount` currently ignores `filterCategory`; fix counting for all newly implemented filters. The existing Reset/Refresh/Clear actions should reset every applicable filter.
- Non-admin must never see or act on records from another tenant, even when a saved view contains another company id.

---

## 6. Bulk Operations — consistent right-side sectional panel (approved visual change)

Keep existing right-side `Bulk Operations · SIM Master` drawer (~560 px), action selector, confirmation modal and top-level toolbar position. Match current Devices advanced Bulk UI and use three clear sections:

### Section 1 — Selection Summary

- **Selected N / Eligible M / Protected or Skipped K** with actual counts.
- Clear Selection action (inside the drawer only).
- Selection must be scoped to authorized displayed records; never accidentally operate on hidden records selected before tenant switch.

### Section 2 — Choose Bulk Action

**Preserve current actions** and safe semantics:

1. **Update owner** — existing action; block or require proper resolution for currently/scheduled mapped SIMs and enforce explicit authorized tenant targeting, don't just overwrite `owner`.
2. **Update lifecycle** — current carrier service status action; preserve underlying five choices, but **do not let this force mapping-derived inventory `Active`**. Suspension/retirement block active use appropriately.
3. **Update plan** — retain; do not claim the carrier plan actually changed outside this prototype. Preserve realistic metadata and audit action.
4. **Retire eligible** — retain; protect active/scheduled bindings and verify eligibility.
5. **Delete eligible** — retain; block permanently if referenced by active, scheduled **or historical** assignment/binding/connection, even if `simAssignments` has an `end` value.

**Add useful same-standard actions only inside the Bulk drawer:**

6. **Update Inventory Location** — update existing stored `SimRecord.location`, authorized records only; no Create/Edit field change.
7. **Export Selected** — selected authorized records only, same CSV conventions; no new toolbar button.

Do **not** add irrelevant Device actions like Send to Maintenance / Decommissioned. SIM uses carrier `Suspended/Retired`.

### Section 3 — Validation, Skipped Reasons & Confirmation

- Show each selected SIM and its eligibility, including current assignment, association or cross-company restriction.
- Compare against **current hardware bindings / connection membership / SIM history**, not just `simAssignments.find(sa => !sa.end)`.
- Confirm high-impact changes with the existing confirmation pattern and explicit consequence.
- Recheck eligibility immediately before execution, not only when the drawer opens.
- No partial writes to invalid/mismatched company models; update only authorized/eligible selected records.
- Keep all current button hierarchy, colors and responsive behavior.

---

## 7. GitHub-verified functional issues to fix (without Create/Edit UI changes)

| Priority | Verified source issue | Safe, invisible fix |
|---|---|---|
| **P0** | New SIM Create sets `formStatus('Active')` even though no mapping exists | Preserve carrier dropdown selection but derive **effective inventory** Inventory when no valid active mapping; never treat manual carrier status as assignment |
| **P0** | Create pre-fills an ICCID from the SIM count (`899186104312451...`) | Do not register fictional physical identifiers; leave field blank for genuine user entry; keep same field/placeholder |
| **P0** | `selectedSimModelSpec` falls back to the first matching/first globally available model when exact match missing | Validate exact allowed company + category + operator + model id, preserve historical model details on Edit |
| **P0** | `availableOperators` falls back to global `SIM_OPERATORS`, and Create uses Airtel/M2M defaults | Require authorized company-enabled models for new SIM registration; no fallback bypass |
| **P0** | Unknown tenant can inherit all global models or Adani access from `getEnabledModelsForCompanyName` | Fix strict company-ID permissions in shared utility; Platform Admin catalog only in explicit platform scope |
| **P0** | `activeAssignmentBySimId` trusts `!sa.end` without checking effective dates or connection/binding validity | Resolve current actual active assignments and scheduled/ended history safely |
| **P0** | Single SIM Delete removes record even if linked; modal only warns | Block deletion for any referenced SIM across mappings and assignment history; preserve confirmation styling |
| **P0** | Bulk Delete/Retire protects only open assignment events | Check active, scheduled and history references appropriately; re-evaluate before executing |
| **P0** | Bulk owner update can transfer assigned SIM across tenants | Block or require safe unassignment; never silently move foreign client inventory |
| **P0** | Bulk `Update lifecycle` writes manually chosen `Active` into inventory source status | Treat as carrier status only; effective inventory status mapping-derived |
| **P0** | CSV/JSON import silently inserts Airtel, 10GB plan, Nano SIM, Adani Port, Mundra CT2 and `4G LTE` | No fabricated operator, plan, owner, location, network or carrier plan state; validate real input/model metadata |
| **P0** | Import validates ICCID but drops `modelTypeId`, `category`, `identifierType` | Resolve canonical company-enabled model identity; preserve when supplied and valid. Do not auto-assign a different model |
| **P1** | SIM Category filter state exists but is missing from drawer | Add to approved sectional Filter drawer and active filter count |
| **P1** | Current Filter drawer has only Operator / Lifecycle / Organization | Replace body with specified 4 SIM-specific filter sections |
| **P1** | Bulk target selection comes from all enriched SIMs; selected IDs can survive scope changes | Restrict selection/actions by authorized current tenant + permitted selection, update counts |
| **P1** | Saved Views may become inconsistent with new filters | Preserve legacy views; extend format compatibly, don't wipe |
| **P1** | Create uses hardcoded `network:'4G LTE'`, derives category from plan when missing | Store truthful unknown/blank; favor canonical category/model metadata, don't invent network |
| **P1** | Existing generic `iccid` field also holds alternate primary identifier types when model identifier differs | Keep visible dynamic identifier input unchanged; normalize/migrate internal identity handling safely, without conflating MSISDN and ICCID |
| **P1** | Activity/History has a hardcoded fallback date and computed rows labelled history | Preserve current inspector UI but use real saved events; no fabricated timestamp |
| **P1** | Existing assignment and status display can disagree with mapping | Use a shared computed assignment/effective inventory resolver for table, filters, details, bulk, export |

**Existing SIM lifecycle statuses:** Source `SIM_LIFECYCLE_OPTIONS` includes `Inventory`, `Active`, `Suspended`, `Inactive`, `Retired`. Keep these **as carrier/service values** in Create/Edit and historical data; calculate **four effective inventory outcomes** separately. Do not force Device hardware “In Maintenance” into SIMs.

**Important hardcoded seed/sample caveat:** Existing sample telecom plans, network, IMSI/ICCID and mappings are demo data. Preserve all existing seeds and editable data as-is; fixes must stop inventing new data on create/import, not rewrite or destroy existing samples.

---

## 8. Compatibility and integration

- `src/components/SimMasterContent.tsx`: presentation changes ONLY in its current Filters/Bulk drawers, plus functional status computation, validation, safe actions, import/export and table `location` column removal via shared column catalogue.
- `src/types/modalMaster.ts`: retain all properties of `SimRecord`; remove only key `location` from `SIM_COLUMNS`, not from data, import or assignment. Add pure assignment/effective-status helper safely; reuse current binding date utilities.
- `src/types/companyModelEnablement.ts`: fix tenant permission leak **without losing legitimate company-enabled models**.
- `src/components/modal-mapping/MappingFormDrawer.tsx`: use actual valid assignment/connection activation; avoid assuming Device+SIM always implies Active or lacking SIM implies Scheduled; preserve UI.
- Sensor/Device masters: preserve forms and UI. No unrelated changes.
- `simAssignments` is a legacy/derived history stream; use binding and connection records for current status, while preserving history. Avoid false future Active states.
- Do not change App navigation, routing, colors or general master-page structure.

---

## 9. QA acceptance checklist

### Absolute Create/Edit and UI freeze
- [ ] Create SIM and Edit SIM have **identical visible fields, labels, sections, order, required markers, conditional controls, dropdown choices, help tooltips, form buttons and styling** as the reviewed baseline.
- [ ] The SIM lifecycle status field still exists and keeps all five *carrier* values; do not replace it with a new Mapping Status input.
- [ ] No new fields like Inventory Location, SIM ID or network appear in Create/Edit.
- [ ] Table has the same **14 remaining** columns in existing order; only Inventory Location absent from LIST and Column Catalogue.
- [ ] Toolbar, existing row action menu, inspector tabs, Import/Export and saved views remain functional and visually recognizable.
- [ ] Only Filters and Bulk drawer content gets the explicitly authorized sectional consistency update.

### Mapping/status correctness
- [ ] Unassigned but carrier-activated SIM displays effective Inventory; carrier state still stored as Active.
- [ ] Carrier-active SIM with a valid, currently effective mapping displays Active and correct Assigned to/Connection.
- [ ] Future-only mapping is Scheduled in filter/assignment logic; effective status not Active.
- [ ] Last binding ended/unassigned -> effective Inventory when not Suspended/Retired.
- [ ] Carrier Suspended/Inactive -> effective Suspended, not usable for new mapping.
- [ ] Carrier Retired -> effective Retired, terminal, mapped use blocked.
- [ ] Draft, inactive, canceled, expired, conflicted or unrelated bindings do not produce false Active.
- [ ] Same effective status across table, filters, inspector-derived assignment, bulk preview and export.
- [ ] Real Online/Offline/network validity never fabricated.

### Filtering and bulk safety
- [ ] Category filter now renders, works and counts; dynamic options are authorized/grounded.
- [ ] Four sections, multi-select behavior, Reset All / Apply, chips/counts, date ranges, saved views, pagination and export agree.
- [ ] Bulk actions show accurate Selected / Eligible / Skipped and clear, actionable skip reasons.
- [ ] Owner transfer, carrier suspension, retirement and Delete block unsafe current/scheduled associations.
- [ ] Permanent Delete never removes SIMs referenced by historical mapping/assignment records.
- [ ] Company switch cannot operate on previously selected foreign-company SIM IDs.

### Data preservation
- [ ] No existing SIM ICCID, MSISDN, company, location, plan, historical carrier lifecycle or assignment record overwritten.
- [ ] No fictional ICCIDs/operators/plans/networks/companies inserted automatically on Create/Import.
- [ ] Exact enabled models only; no cross-company fallback.
- [ ] localStorage migrations are safe/repeatable, saved views preserved; no backend.
- [ ] No compile errors, broken modal paths or unrelated UI changes.

---

## 10. Copy-paste companion prompt for Google AI Studio

> Implement the attached **FleetRobo Asset360 — SIM Master FINAL Fixes** specification in my existing React/TypeScript/localStorage prototype.
>
> **Strictly preserve the entire existing Create/Edit SIM form exactly: no changes to field count, labels, options, section names, order, layout or styling.** Keep the SIM lifecycle status field and existing carrier lifecycle values.
>
> Do not redesign the main page. **Remove Inventory Location only from the SIM LIST table and Column Catalogue**, not from data, filters or import. Make only the existing **Filters** and **Bulk Operations** right-side drawers consistent with the latest Devices/Model Category Master: four SIM-specific collapsible filter sections, correct search/multi-select/date filters, applied filter count, Reset/Apply, selected/eligible/skipped, safe bulk operations.
>
> Separate existing carrier service lifecycle from mapping-derived effective SIM inventory outcomes (Inventory, Active, Suspended, Retired); show accurate Assigned to / Assigned connection. Never treat an unassigned carrier-active SIM as mapped Active. Fix unsafe tenant/model fallback, invented ICCIDs/import defaults, assignment date logic, deletion/retirement and owner transfer; preserve all historical records and IDs.
>
> No backend; no unrelated modules/UI changes. Verify all QA criteria before finishing.

**This document is a specification; the GitHub repository has not been edited.**
