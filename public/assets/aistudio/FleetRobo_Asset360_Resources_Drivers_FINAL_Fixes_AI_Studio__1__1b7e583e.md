# FleetRobo Asset360 — Resources → Drivers
## FINAL GitHub-Audited Specification | Create/Edit Frozen | Filter & Bulk Consistency

**Repository:** `pratikdata2021-cyber/New-Fleetrobo-Asset360`  
**Reviewed:** `main` HEAD `2ee6114158ea82df9ec008e12b78899c60b1e730`, 22 Nov 2026  
**Implementation:** Existing frontend-only React/TypeScript/localStorage prototype in Google AI Studio; **no backend**.

> ## Highest priority — UI and data freeze
> **Do not add/remove/rename/reorder/hide/move ANY field, tooltip, label, section, validation UI, account-link flow, document upload, button or control in Create / View / Edit Driver.** Preserve all **nine existing sections** and the exact existing drawer and design. Do not redesign Drivers table/grid, status tabs, toolbar, Saved Views, Column Catalogue, Import, Export or History. **Only evolve the existing sectional Filter drawer and existing Bulk drawer for consistency**, plus critical functional/data bugs. Keep every existing user-supplied record and mapping. Do not import the four Device hardware inventory statuses into Drivers.

---

## 1. Current GitHub architecture (verified)

| File | Current structure / intent |
|---|---|
| `src/components/DriversPageContent.tsx` | Driver list, table/grid, status tabs, search, 27-filter drawer, 6-action bulk drawer, saved views, selection, import/export and history |
| `src/components/DriverDrawer.tsx` | **9-section** Create/View/Edit Driver drawer with account-linking and licence validation |
| `src/components/DriverFilterDrawer.tsx` + `src/types/driverFilters.ts` | Already has **27 defined filters** across five sections; Basic AND / Advanced OR, filter search, draft/apply and unsaved-change warning |
| `src/components/DriverBulkDrawer.tsx` | **6 action types**: activate, deactivate, suspend, archive, transporter, verify; Review + eligible/skipped; Export Selected separate |
| `src/types/driver.ts` | Driver record, four Driver statuses, `deriveDriverBadges`, demo data and localStorage |
| `src/components/DriverImportDrawer.tsx` | CSV import with fallback/default data and direct upload UI |
| `src/components/DriverExportModal.tsx` | Selected/filtered export, visible/all columns and multiple formats |
| `src/types/modalMaster.ts` | Asset Mapping `resourceAllocations`/`resourceRelationships` with `resourceType:'Driver'` and effectivity helpers |

**Existing Driver statuses — KEEP all 4:** `Active`, `Inactive`, `Suspended`, `Archived`.

Driver operational status is independent from Vehicle Operational Status, hardware Device Status, Carrier SIM Status and Driver-to-Vehicle Mapping Status. An unassigned Active driver is still Active as a driver record; absence of mapping does not make Driver Inactive.

---

## 2. Freeze existing Create / View / Edit Driver fields — all NINE sections

| Section (actual current label) | Existing fields/controls to preserve EXACTLY |
|---|---|
| **Section 1 — User Accounts** | Existing linked/new account modes; user search/selection; account name, email, phone, country, role, avatar/image, account linkage behaviors |
| **Section 2 — Basic & Mandatory Details** | Licence Number, First Name, DOB, Mobile Number, Licence From, Licence To and their existing requirements/tooltips |
| **Section 3 — Transporter** | Transporter selector and Vendor Status toggle with current owner scope |
| **Section 4 — Identity & Personal Details** | Middle/Last Name, Father's Name, Aadhaar, Blood Group, Qualification, Driving Experience, Joining Date |
| **Section 5 — Contact & Address** | Alternate Number, Emergency Number, Local and Permanent Address, both PIN fields |
| **Section 6 — Licence Details** | Read-only Licence/Validity summary, Licence Type, Issuing Authority |
| **Section 7 — Compliance & Verification** | Existing Police Verification, Training, RTO Certified checkboxes; summary and Remarks |
| **Section 8 — Documents** | Existing Aadhaar upload, profile/image, licence document and attachment UI |
| **Section 9 — Additional Settings** | Existing Active Status toggle and RFID smart-card toggle |

- **No form additions/removals whatsoever**. Keep the existing conditional account mode and tab/section navigation, validation errors and uploaded attachments.
- Current company is an ownership context; no new editable Company field in the drawer. Transporter remains from the canonical vendor master where available.
- Do not silently change `status` or mapping flags when only account information is edited.
- Fix persisted values and validation in the existing save handler **without changing field presentation**.

---

## 3. Final status & mapping contract

| Item | State & meaning | Source |
|---|---|---|
| Driver Operational Status | `Active`, `Inactive`, `Suspended`, `Archived` | `Driver.status`, admin/allowed driver actions |
| Licence status | Valid, Expiring within 30 days, Expired, Missing | **Derived from Licence To and current date** |
| Verification status | Existing Verified/Pending based on RTO, Police, Training | `deriveDriverBadges`, retain existing logic and UI |
| Document status | Complete/Partial/Missing | Existing uploaded Aadhaar/Licence files |
| Account linkage | Linked/Not linked | Existing linked account ID |
| Driver mapping | Mapped, Unmapped, Expired (compatible with current badge/filter labels) | **Actual effective Resource Allocation / Driver–Vehicle relationship**, not fake registration data |

**Never map Driver.status directly from whether a vehicle is assigned.** A Driver may be operationally Active and Unmapped. A driver may be Inactive even while a stale/historical mapping exists; prevent invalid *new* allocation while preserving history.

**Critical current bug:** `deriveDriverBadges` uses `new Date('2026-11-11T00:00:00Z')` as today. Replace with actual date/time (local-aware) and validate correctly at expiry boundary. **No changing date fields or UI**.

**Critical current mapping bug:** `deriveDriverBadges` currently uses `driver.reg` and `driver.mappingActive` legacy fields to declare `Mapped/Expired`; `DriverDrawer` creates defaults `reg:'GJ12BW4501'` and `mappingActive:true`. This fabricates an assignment. Instead derive via `resourceAllocations` of type `Driver` and valid `resourceRelationships` between Driver and Vehicle (stable resource ID, effective start/end, endedAt, conflicts), using the shared mapping helpers. If real mapping data cannot be resolved, show Unmapped/Unknown as supported by existing UI; never claim a specific vehicle is mapped from invented defaults. Keep legacy fields readable for existing records but do not create new false links. Avoid orphaning historic references.

---

## 4. Filters — preserve all 27, fix semantics, align visual standard inside current drawer

Existing 27 filter definitions / FIVE groups (do NOT replace with four dropdowns):

1. **User Accounts (6):** Account Mapping/Status, Account Name, Email, Account Phone, Country, Role.
2. **Ownership (4):** Company, Transporter, Vendor Status, Joining Date.
3. **Primary (4):** Driver Status, Licence Number, Registration Number, Mapping Status.
4. **Licence and compliance (9):** Licence expiry/validity/date/type, Verification, RTO, Police, Training, Documents and the exact 9 definitions from `ALL_27_DRIVER_FILTERS`.
5. **Identity (4):** RFID, Blood Group, Date of Birth, Driving Experience.

**Design scope:** Consistent right-side sectional style with current FleetRobo, matching Vehicles and latest Model Category Master patterns where compatible. **Reuse `DriverFilterDrawer`**; keep its size, searchable filters, grouped headings, Basic AND/Advanced OR, draft state, applied count, Reset/Apply and unsaved-change warning. Improve usability *within the existing drawer*; do not change page toolbar or Driver form.

### Verified / required filter correctness

- **P0:** `DriversPageContent.tsx` filter switch lacks explicit handling for some defined keys, including `joining`, `mapping`, `licenceFrom`, `licenceTo` and `dob`; default often returns `true`. **Implement every one of the 27 filters against real fields/derived statuses.** A selected filter must not be a no-op.
- **P0:** Existing date range validation uses numeric coercion on date strings (`Number('YYYY-MM-DD')` becomes NaN), and consumers often do not apply these ranges. Parse real dates, support From/To boundaries, validate From <= To; missing values must not pass an active date filter accidentally.
- **P0:** `experience` numeric range is read as `Number(filterVal)` even when filter input is `{from,to}`; implement inclusive lower/upper bounds and zero correctly.
- **P0:** `reg` filter definition is a TEXT Registration Number search but page's branch treats filterVal as an array of `['Assigned','Unassigned']`, so typing a plate may fail. Make `reg` a true case-insensitive registration-text query; use `mapping` for Mapped/Unmapped/Expired.
- **P0:** Current OR mode must retain outer company scope, status tab and search; status is also an AND constraint as current UI states. No cross-company results via OR.
- **P0:** Account mapping / licence expiry / verification / documents / mapping filter values must come from accurate derivation, not stale defaults or fake records.
- **P1:** Use canonical transporters dependent on selected allowed company. Do not allow Company filter to expose unauthorized tenants.
- **P1:** Count only applied non-empty filters; within a multi-select OR, across fields Basic AND or Advanced OR per existing mode. Saved Views and Export match same results.
- **P1:** Keep all original 27 filters and five groups, remove no data. Searchable inputs and consistent section spacing can be polished inside drawer only; no new page filters.

---

## 5. Bulk Operations — preserve exact 6 actions, revalidate safely

**Existing `DriverBulkDrawer` actions (keep):**

| Action | Safe functional rule |
|---|---|
| Activate | Skip already Active; do not casually reactivate **Archived** records through normal bulk (require separate authorized restore semantics, no new UI). Licence/compliance issues should be surfaced; do not claim a verified licence from a status toggle. |
| Deactivate | Skip already Inactive; skip Archived; must not silently rewrite existing valid/historical mapping links |
| Suspend | Skip already Suspended/Archived; preserve other records |
| Archive | Keep historical records/references, prevent unsafe new assignment; do not hard-delete |
| Change Transporter | Only transporter belonging to the same owning company; keep company unchanged |
| Update Verification | Apply only selected RTO/Police/Training flags; leave other flags unchanged; no fabricated verification |
| Export Selected | Preserve existing Export callback/modal; export the correct selected authorized records |

**P0 functional bug in commit handler:** In `DriversPageContent.tsx`, `values.rto`/`values.police`/`values.training` are supplied as **booleans** from `DriverBulkDrawer`, but the handler compares them to strings `'yes'` and `'keep'`. This can wrongly set selected verification flags to `false`. **Fix type/contract and only change flags actually specified.**

**P0:** Row quick action toggles any non-Active record to Active, including Archived or Suspended, without eligibility guards. Reuse same transition policy; preserve existing ellipsis and actions UI.

**P0:** Bulk selection persists across company switches, and existing callback trusts eligible IDs computed earlier. Revalidate authorized company, selected IDs and eligibility at commit; don't alter hidden or cross-tenant records. Present Selected / Eligible / Skipped and reasons in existing review layout.

**P1:** Keep existing step-based action menu → configuration → review → confirm design and styling. Align spacing, section text and skipped-reason conventions with Vehicles without replacing the drawer or adding new actions.

---

## 6. Other source-verified integrity fixes with ZERO Create form change

| Priority | Source issue | Functional-only correction |
|---|---|---|
| P0 | `DriverDrawer` save defaults missing `phone` to `9800000000`, company to `Adani Port`, transporter to `Western Logistics`, blood to `B+`, joining to `2023-01-01` | Never fabricate a person's identity/phone/compliance/organization; validate or preserve blank optional fields and current permitted tenant. Keep the exact form controls. |
| P0 | Driver create default `reg='GJ12BW4501'`, `mappingActive=true`, `nextRest='2026-11-20'` | Remove these *fabricated new-record values*; derive mapping from actual allocations; preserve legitimate historical legacy values |
| P0 | `DriverImportDrawer` defaults missing licence validity dates to `2020-01-01` / `2030-01-01`, and marks imported RTO/Police/Training/RFID all `true` | Require valid source dates or reject row; preserve true certification only if explicitly in input; missing means not verified. No import UI redesign. |
| P0 | Driver Import defaults company `Adani Pvt Ltd` regardless of current tenant | Import only within authorized company context; no fabricated owner/vendor; no cross-tenant imports |
| P0 | Individual driver delete removes resource without checking active/historical Driver allocations/relationships | Block deletion of referenced records; preserve existing modal; offer existing toast/error without inventing UI. Archive is preferred for historical people records. |
| P0 | Fixed calendar reference for licence expiry | Use current actual date and local timezone semantics; recompute when relevant |
| P0 | Bulk verification action contract mismatch | Treat explicit booleans correctly; `undefined` means no change |
| P1 | Driver account linkage is mocked/local in prototype | Preserve existing User Account form and behavior; do not claim a real authenticated user was provisioned; no backend |
| P1 | Existing verification badge is RTO + Police + Training; this is not the same as licence validity | Preserve the distinct badges. Optionally prevent operational assignment for expired licence within existing validation without changing visible form. |
| P1 | Saved views and filters may refer to old demo values | Preserve saved views, canonicalize options, and keep current table/grid and columns |
| P1 | `loadDriverMasterStore` treats an empty array as no data and seeds demo drivers | A deliberate empty driver store must remain empty; seed only on first initialization/explicit reset |

**Privacy:** Driver data includes phone, DOB, address, Aadhaar and documents. Do not broaden visibility, copy these into toast/logs or create additional default data. Keep tenant isolation on filter/column/export and bulk operations.

---

## 7. UI invariants / things NOT to change

- Main Drivers header, quick status tabs, search toolbar, QA test-state selector, table/grid, status pills, Column Catalogue and existing default visible columns.
- `DriverDrawer` (ALL 9 sections, fields, existing tooltips, account linking, files and validations display).
- Existing `DriverFilterDrawer` (27 filters/five groups, modes, layout, controls; only requested consistency polish and fixes within same drawer).
- Existing `DriverBulkDrawer` (6 actions + export, same right-side workflow, eligibility preview; only consistency polish and fixes).
- Existing `DriverImportDrawer`, `DriverExportModal` selected/filtered scopes and formats, History UI, saved views and user uploaded files.
- Existing Driver statuses and licence/compliance concepts; do **not** apply Vehicle or Device status labels.
- Do not remove table columns, including existing Location-related column if any. The previous `Inventory Location` table removal applies only to hardware inventory pages, not Driver Resources.
- No extra pages, buttons, backend/API, dummy account creation claims, CSS theme or unrelated edits.

---

## 8. QA / acceptance tests

- [ ] **Every** Create/View/Edit Driver visible field, nine section names/order, labels, conditional controls, notes, upload slots, input/tooltips and drawer layout unchanged.
- [ ] Driver operational statuses remain exactly Active, Inactive, Suspended, Archived; mapping badge separate.
- [ ] A new unassigned driver is NOT shown as Mapped to a fabricated vehicle.
- [ ] Driver mapping shows effective active/scheduled/ended allocations accurately; legacy text does not override mapping.
- [ ] Licence expiry uses current date; 30-day boundary and expired/missing cases are correct.
- [ ] All **27** filter definitions work; no silent defaults; date/numeric ranges and registration-text search function.
- [ ] AND/OR respects tenant, quick status tab, search and saved views; filter active count is accurate.
- [ ] Bulk verification `yes/no/keep` behavior is correct; update one checkbox without changing the other two.
- [ ] Archived drivers cannot be automatically Activated through a quick toggle or unsafe bulk rule.
- [ ] Selection cannot operate on drivers belonging to another company after context change.
- [ ] Imported drivers do not receive invented licence dates, verified compliance, registration, phone, transporter or company.
- [ ] Individual delete cannot sever any historical/active Driver mapping.
- [ ] User-uploaded documents, records, IDs, CSV import/export, Saved Views, QA UI and History still work.
- [ ] Existing fields, UI and product navigation unchanged; no backend; TypeScript build passes.

---

## 9. Compact Google AI Studio instruction

Implement the attached **Drivers Resources — FINAL Fixes** specification in my existing FleetRobo Asset360 prototype. **Absolutely no change to any Create/View/Edit Driver field, 9 sections, account linking, upload control or drawer UI.** Preserve the main directory, its status tabs, 27 filters, 6-action bulk panel, saved views, import/export and data. Improve the existing right-side Filter/Bulk drawers for cross-master consistency and fix date/number/text filtering, stale/fake Driver mapping, hardcoded licence expiry date, bulk verification booleans, tenant scoping, deletion safeguards, and fabricated Create/Import defaults. Keep Driver Operational Status separate from Resource Mapping. No backend or unrelated design changes. Verify QA checklist end-to-end.

**No GitHub code changes are performed by this Markdown document.**
