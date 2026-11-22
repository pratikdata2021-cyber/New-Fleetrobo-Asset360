# FleetRobo 2.0 — MODAL MAPPING | FINAL CONNECTIONS & RESOURCE VIEW
## Complete Google AI Studio implementation specification — 1440 × 900

**Scope:** Existing **Binary Admin → Asset Store → Modal Mapping** module, primarily its two data-list tabs, create mapping form, binding details and row inspection.  
**Priority:** Accurate, readable **table columns / records / row details / actions**; preserve the existing FleetRobo table-first design from the attached screenshot.  
**Source baseline:** User-supplied Modal Connection screenshot showing `Modal Connection (276)` and `Resource Connection View (258)`, search / Filters / Columns / Density / Saved views / Refresh / Bulk actions / Import / Export / + Create Mapping, horizontal scroll, row actions, pagination.  
**Product decisions incorporated from discussion:** global type creation; company-specific model enablement; physical Device/Sensor/SIM registries; per-pair hardware bindings; exact **date + time** validity; optional resource allocation; **no Connection Type/Architecture selector**; gateway is simply a **Device**; **no connection topology diagram or tree** in this module.

> ## MASTER IMPLEMENTATION INSTRUCTION
> **EDIT THE EXISTING PROTOTYPE, DO NOT REBUILD THE APPLICATION SHELL.** Preserve the exact existing sidebar, company switcher, header, page-local two tabs, orange active state, compact enterprise toolbar and row/table language. Change **only the Modal Mapping module and its local drawers/overlays**. Remove `Connection Architecture`, `Standalone Device`, `Gateway Mapping`, `Sensor via Gateway`, `Direct Sensor`, `View as Tree` and all topology-graph controls from this module. Model-connected relationships **exist as explicit binding rows**, not as architecture modes or graphics.
>
> The example counts and inventory are prototype seeds, **not live platform measurements**. Do not invent API connections or claim physical hardware was tested.

---

# 1. Mental model: three distinct kinds of data

| Layer | What a record represents | Source / owner | How Modal Mapping uses it |
|---|---|---|---|
| **Global Model Category Master** | Reusable **Device / Sensor / SIM Type**; e.g. ADAS/DMS Dashcam + MettaX MC202N | Binary Hardware / Platform Admin | Supplies type/model metadata and expected identifier kind. |
| **Company Model Access** | Specific global model enabled for **Adani Mundra** | Binary Platform Admin → Company Details → Model Access | Only enabled, globally active model types appear for new mapping. |
| **Physical Hardware Master** | Actual client-assigned Device, Sensor or SIM unit with **unique identifier** | Client-level masters, authorized Hardware / PMO | Search and select actual IMEI / Device ID / Sensor ID / Serial / ICCID. |
| **Connection** | One named grouping of selected physical hardware: `Connection Name` + generated `Connection ID` | Modal Mapping | One parent row in **Modal Connection** list. |
| **Hardware Binding** | One specific relationship **From hardware → To hardware** with its own validity | Modal Mapping → Bindings | Multiple child records per connection, each Permanent / Temporal. |
| **Resource Allocation** | Actual Vehicle / Driver / other resource linked to the connection or a hardware unit | Client Resource Masters + Modal Mapping | Listed separately in **Resource Connection View**; does not create a new resource. |

**Important:** A Device may function as a gateway but is still Category = **Device**. A Device → Device link is handled exactly like other pairwise links. Do not ask the user to select connection architecture, gateway mode, direct/standalone or a global binding period before adding hardware.

**One-line user journey:** `Client selected → Create Mapping → Connection Name & ID → + Device / + Sensor / + SIM → + Bind Hardware Pair(s) → optional Vehicle / Driver Allocation → Review → Save Draft / Create Mapping`.

---

# 2. Existing page frame — do not redesign

**Viewport:** 1440 × 900, including existing global shell. Table must fit the content area and permit horizontal scrolling rather than cutting off fields.

1. Existing local tabs, unchanged labels: **Modal Connection** and **Resource Connection View**; tab count is derived from matching records.
2. Existing compact toolbar: Search, Filters, Columns, Density, Saved views, Refresh, Bulk actions, Import, Export, and orange **+ Create Mapping**.
3. Existing selected-row counter and seed-data disclaimer; change the obsolete architecture-based totals on the right to a correct aggregate: e.g. `276 connections · [N] with hardware bindings · [N] with resources`. Counts must be computed, not hardcoded. Do **not** show `84 Standalone · 132 Sensor via Gateway · 60 Direct` after removing the architecture concept.
4. Column headers: uppercase/small label, light-gray header background, sort arrows, ⓘ info tooltips, row checkbox, right-aligned eye/edit/ellipsis.
5. Table rows: compact single or two-line cells, subtle separators, alternating hover; preserve horizontal scrollbar, not the giant dashboard cards.
6. Footer: `Showing 1–20 of N records`, rows per page `10 / 20 / 25 / 50 / 100`, First / Prev / page x of y / Next / Last. Preserve the screenshot's pagination style.
7. **No topology panel on the listing, create form, View Details, or Resource Connection View.** Do not replace it with a mini tree. Use **tables, text, chips and relational detail lists**.
8. No standalone KPI dashboard, no new top-level sidebar entry, no seven-step connection wizard.

### Page-level state

- `companyId` from the top-bar client context is fixed for all list queries and actions.
- Binary Platform Admin may choose a client to work on; PMO sees only authorized clients. Never leak another client's physical identifier into search.
- Search, filtering, column visibility, sort and pagination operate **independently for each tab**.
- Selecting rows on one tab must not select rows on the other tab.

---

# 3. TAB ONE: MODAL CONNECTION — THE FINAL LISTING TABLE

## 3.1 Mandatory default columns (in this order)

Each heading has a working **ⓘ tooltip**, including the selection and action columns. Keep the first two identity columns and Actions pinned wherever feasible.

| Order | Final column label | Meaning and data source | Exact row display / interaction | ⓘ Tooltip copy |
|---:|---|---|---|---|
| 0 | **Select** | Checkbox; row-level selection | Checkbox, header select-all for current filtered **page**. | “Select connections for permitted bulk operations. Selection does not change records until an action is confirmed.” |
| 1 | **CONNECTION ID** | Unique system-generated connection key | `CON-1277`, mono weight, clickable to open View Details; no editing | “System-generated identifier of this connection record. This is not a device IMEI or sensor ID.” |
| 2 | **CONNECTION NAME** | PMO-entered readable name | Two-line display if needed; clicking opens View Details | “Name given to this mapping by the user, usually referencing client, site or installed hardware.” |
| 3 | **CONNECTED HARDWARE** | **All** selected hardware in the connection, summarized | Primary visible unit: `MTX-AD-10292 · MettaX MC202N`; second muted line: `+1 Device · +2 Sensors · +1 SIM`; hover / `View hardware` opens detail list | “The registered Device, Sensor and SIM units included in the connection. Click to inspect identifiers and models; does not show a topology diagram.” |
| 4 | **DEVICES** | Number of distinct physical Device units included | `2` with small Device icon | “Number of Device records in this connection. Gateways are counted as Devices.” |
| 5 | **SENSORS** | Number of distinct Sensor units | `2` with Sensor icon; `0` if absent | “Number of registered Sensors in this connection, including standalone sensors.” |
| 6 | **SIMS** | Number of distinct registered SIM units | `1` with SIM icon; `0` if absent | “Number of SIM records selected for this connection; each SIM is identified by its ICCID.” |
| 7 | **BINDINGS** | Number of **hardware-to-hardware binding records** | `4` as link icon + number; click opens Bindings detail section | “Number of recorded pairwise relationships (e.g. Device→Device, Device→Sensor, Device→SIM), each with independent effective date and time.” |
| 8 | **RESOURCE ALLOCATION** | Associated client resource identifiers | `🚚 MH26AH1192` and small secondary `Driver · +91…43210`, or `Not allocated` | “Vehicle registration and optional driver contact associated with this connection. Resource records come from the client masters.” |
| 9 | **STATUS** | Overall **connection lifecycle**, not the per-binding status | `Draft`, `Active`, `Scheduled`, `Inactive` or `Needs Attention` chips; see §7 | “Connection lifecycle status. A connection may contain bindings with different periods or statuses; inspect Bindings for details.” |
| 10 | **UPDATED ON** | Last edit, save or binding change | `13 Nov 2026 · 02:35 PM` plus timezone in tooltip | “Most recent change to this connection or its membership/bindings, shown in the selected site's timezone.” |
| 11 | **ACTIONS** | Quick row actions | `Eye View`, `Pencil Edit`, `⋯ More`; fixed on right, accessible tooltips | “View details, edit the mapping, or open additional permitted lifecycle actions.” |

**Do not retain these misleading old columns:** `HARDWARE TYPE` as one value, `MODEL` as one value, `CONNECTION ARCHITECTURE`, `P` (unless the old `P` has a separately verified business meaning), and the old `Standalone Device` tag. A single connection can have several models and several hardware classes.

### 3.2 Optional columns in **Columns** panel (default hidden)

These can be toggled on without changing the underlying data; respect table width and horizontal scrolling.

| Optional column | Contents / rule | ⓘ Tooltip |
|---|---|---|
| Primary Device / Main Hardware | First selected primary unit, or first hardware record if no primary is designated; **not** a gateway/architecture field | “Primary selected hardware, if designated; other hardware remains in the same connection.” |
| Primary Model | Manufacturer + Model Reference for primary unit, or `—` | “Model associated with the displayed primary hardware; other models may also exist in this connection.” |
| Hardware Identifiers | Comma-separated shortened unique identifiers with click-to-view full detail | “Unique unit identifiers of all registered hardware in this connection.” |
| Binding Health | `All valid`, `Mixed`, `Conflict`, `No bindings`; derived from pairwise binding checks | “Validation summary across individual hardware bindings; not live device connectivity.” |
| Active / Scheduled / Ended Bindings | Three per-status counts, each independently computed | “Counts of binding periods by their effective date-time status.” |
| Effective From (Earliest) | Earliest valid start among the connection's binding rows; `—` if no bindings | “Earliest pairwise binding effective start; individual start times may differ.” |
| Effective To (Latest) | Latest finite end, else `Open-ended / Mixed`; explicitly **not** a connection-wide expiry | “Summary only; open the Bindings list for each relationship's exact end date and time.” |
| Site / Location | Client-selected site where known; otherwise `—` | “Site context associated with the connection, if recorded.” |
| Created By | User who initially created the connection | “Original mapping creator.” |
| Created On | Creation timestamp with timezone | “When the connection record was first saved.” |
| Last Updated By | Last editing actor | “Person who last modified this connection or its relationships.” |
| Notes | Truncated purpose/description | “Optional operational description captured on creation.” |
| Hardware Verification | `Not checked`, `Pending`, etc. only if actual existing data supports it; never manufacture a connection test | “Hardware verification information, separate from mapping and registration.” |

**UI trade-off:** Default table has many columns; on 1440×900 show the pinned identity columns, a readable hardware summary and Actions, with the remaining columns horizontally scrollable. Do not shrink text to illegibility. Allow user to hide columns and save that view.

## 3.3 Demonstration rows (invented demo relationships, not live devices)

**Important:** The following rows are **test fixtures**, not assertions about current customer inventory or hardware capability. Model names come from discussion; unique IDs, site assignment, bindings and statuses are *sample* values. Prefer reusing matching existing prototype seed records where available. If existing identifiers differ, use the source's actual seeded values consistently.

| Connection ID | Connection Name | Connected Hardware (summary) | Device | Sensor | SIM | Bindings | Resource Allocation | Status |
|---|---|---|---:|---:|---:|---:|---|---|
| `CON-1277` | Mundra – Vehicle Kit 01 | `MTX-AD-10292 · MettaX MC202N` + `1 Device · 1 Sensor · 1 SIM` | 2 | 1 | 1 | 3 | `MH26AH1192` · Driver linked | Active |
| `CON-1278` | Mundra – Fuel Monitoring 02 | `GPS-9002 · GPS Tracker` + `2 Sensors` | 1 | 2 | 0 | 2 | `GJ12AB1234` | Active |
| `CON-1279` | Mundra – DVR Kit 03 | `DVR-88921 · DVR/MDVR` + `1 Device (IP Camera)` | 2 | 0 | 0 | 1 | Not allocated | Draft |
| `CON-1280` | Mundra – Sensor Only 04 | `SNS-TMP-410 · Temperature Sensor` | 0 | 1 | 0 | 0 | Not allocated | Draft |
| `CON-1281` | Mundra – SIM Setup 05 | `SIM ICCID …0142` | 0 | 0 | 1 | 0 | Not allocated | Draft |
| `CON-1282` | Mundra – Telematics 06 | `MTX-AD-10400 · MettaX MC202L` + `1 SIM` | 1 | 0 | 1 | 1 | `MH12AB1234` | Scheduled |

**Important semantic distinction:** A one-node connection has **0 pairwise hardware bindings**; that is legitimate. Zero-device Sensor-only records may exist if the sensor model supports direct use. A SIM-only connection may be saved as **Draft** for preparation, but final activation of a SIM-only connection must require a supported operational use case or a valid device association; do not pretend an unattached SIM is communicating.

## 3.4 Connected Hardware cell interaction — avoid topology UI

Click `CONNECTED HARDWARE`, counts, or eye icon to open **Connection Details** right-side drawer (`~560–640 px`, wider if needed) with **three table-based sections**:

**A. Overview** — Name, Connection ID, Client, status, description, Created/Updated timestamps.  
**B. Hardware Inventory** — `Category | Type / Model | Manufacturer/Provider | Identifier Type | Actual Identifier | Registration Status | Actions`. One row per Device/Sensor/SIM.  
**C. Bindings** — `Binding ID | From Hardware | → | To Hardware | Mode | Effective Start (Date Time) | Effective End (Date Time) | Status | Actions`. One row per pair, no nodes or tree.  
**D. Resource Allocations** — `Resource Type | Resource Identifier | Effective Start | Effective End | Status | Actions`.  
**E. Activity** — actor, date-time, action, before/after summary.

Use tabs `Overview | Hardware | Bindings | Resources | Activity` **within the drawer** if space is constrained. Every count/link takes user to the relevant detail tab. The Back/Close operation preserves search/filter/scroll position.

---

# 4. TAB TWO: RESOURCE CONNECTION VIEW — FINAL TABLE

This remains a **separate tab** in the same page, not a separate module. Show a **flat, searchable list of resource allocation records**. **Do not show a resource topology tree or expandable graphical hierarchy.**

### 4.1 Mandatory default columns

| Order | Column | Exact content | ⓘ Tooltip |
|---:|---|---|---|
| 0 | Select | Page-level and per-row checkbox | “Select resource allocations for permitted bulk actions.” |
| 1 | ALLOCATION ID | Unique allocation record ID such as `RCA-2041` | “Unique ID of this resource-to-connection allocation, not the hardware identifier.” |
| 2 | CONNECTION ID | Link to `CON-1277` details | “Connection whose selected hardware is associated with this resource.” |
| 3 | CONNECTION NAME | Readable connection name | “Name of the associated mapping.” |
| 4 | RESOURCE TYPE | `Vehicle`, `Driver` (and other supported existing Resource Masters only) | “Type of existing client-owned resource being allocated.” |
| 5 | RESOURCE IDENTIFIER | Vehicle Registration No. or Driver Contact No. | “Lookup key of this client resource; vehicle uses registration number and driver uses mobile/contact number.” |
| 6 | ASSIGNED HARDWARE | `All hardware in connection`, or a specific hardware ID if node-level allocation exists | “Whether the resource applies to the whole connection or a specific registered hardware unit.” |
| 7 | EFFECTIVE START | `13 Nov 2026 · 10:30 AM IST` | “Exact local date and time when this resource allocation becomes effective.” |
| 8 | EFFECTIVE END | `—` for open-ended, otherwise exact date-time | “Exact end of this allocation, when applicable.” |
| 9 | STATUS | `Scheduled / Active / Ended / Conflict` | “Allocation status derived from its validity period and validation.” |
| 10 | ACTIONS | View / Edit / End Allocation / History | “Manage this allocation without changing unrelated hardware bindings.” |

**Optional columns:** Client, Site, Assigned By, Assigned On, Unassigned By, End Reason, Binding Mode, Driver Display Name, Vehicle Display Name, Last Updated. All have tooltips. Retain the resource view's own search / filters / selected count / saved view / export / pagination.

### 4.2 Resource rules

- Vehicle search by **Registration No.**, e.g. `MH26AH1192`, from the selected client's Vehicle Master.
- Driver search by **Contact No.**, e.g. `+91 98765 43210`, from the selected client's Driver Master.
- Driver allocation is **optional and independent** of Device–Vehicle installation. Driver change must **not** automatically remap physical hardware.
- Resource allocations may have their own validity if the system supports timed allocation. This is **separate** from the `Device→Sensor` or `Device→SIM` binding periods.
- If Vehicle/Driver is not found and the actor is authorized, offer inline `+ Create Vehicle / + Create Driver` or bulk vehicle import that returns to the same mapping context. Otherwise, show a permissions-safe request/blocked state.
- Avoid duplicated active allocation periods where business rules disallow overlaps; do not remove history.

### 4.3 Demo rows (illustrative)

| Allocation ID | Connection | Resource Type | Identifier | Assigned Hardware | Start | End | Status |
|---|---|---|---|---|---|---|---|
| RCA-2041 | CON-1277 | Vehicle | MH26AH1192 | Whole connection | 13 Nov 2026 10:30 IST | — | Active |
| RCA-2042 | CON-1277 | Driver | +91 98765 43210 | Whole connection | 13 Nov 2026 10:30 IST | 13 Nov 2026 18:00 IST | Active |
| RCA-2043 | CON-1282 | Vehicle | MH12AB1234 | Whole connection | 20 Nov 2026 09:00 IST | — | Scheduled |

---

# 5. CREATE / EDIT MAPPING — one simple form, not an architecture wizard

**Entry:** orange `+ Create Mapping` opens the existing large right-side drawer or page-local full-width form in the established FleetRobo style. The screenshot baseline uses overlays/drawers; prefer a **large drawer with sticky header and footer**. Never add a new sidebar destination.

**Always-visible fixed fields (top row):**

| Field | UI and validation | ⓘ help |
|---|---|---|
| **Connection Name*** | Free text; required; e.g. `Mundra – Vehicle Kit 01` | “Readable name of this overall mapping. Does not need to match a hardware model.” |
| **Connection ID** | Auto-generated, unique, immutable, read-only, e.g. `CON-1277` | “Permanent record ID generated by FleetRobo; not a device IMEI/serial or ICCID.” |
| Description | Optional textarea, collapsible if needed | “Optional site/use-case notes for this mapping.” |

**Hardware Composer:** Compact section with exactly these primary actions: **`+ Add Device` | `+ Add Sensor` | `+ Add SIM`**. The creation starts with zero selected units; any allowed category can be selected first (do not force a primary gateway or root device).

Each action opens the same compact category-specific selector (inline card or right-side sub-drawer):

1. `Category` is derived from the clicked action; **Device / Sensor / SIM only**.
2. `Enabled Model Type*` searchable dropdown, **only** models enabled and active for selected client. Show `Type Name · Manufacturer/Provider · Model/Reference` (e.g. `ADAS/DMS Dashcam · MettaX · MC202N`).
3. `Identifier Type` read-only from that model definition; Device ID, IMEI, Serial No., Sensor ID or ICCID (SIM). Do not hardcode every MettaX item as IMEI—use the stored model's identifier type.
4. `Search Identifier*` queries **registered physical units** of that model owned/assigned to this client. Supports partial search; result row shows identifier, model, unit status and whether available/already mapped. Search is **not** a free-text invented physical unit.
5. Select registered unit; `Add Device / Add Sensor / Add SIM` adds it to a simple **Selected Hardware table**.
6. `No results` → authorized `+ Register [Device / Sensor / SIM]` inline action; preserve draft and return with new unit selected, subject to Hardware review rules. No silent cross-client transfer.
7. Repeat for extra units of same/different category. Show all in hardware table; no hierarchy graphic.

**Hardware table inside form:** `Category | Type/Model | Identifier Type | Identifier | Client / Registration Status | Actions (Remove / Change)`.

**No connection architecture field**, no standalone/gateway/direct mode selector, and no forced protocol/server/network configuration to create the mapping. Global type creation and client enablement stay in their own Admin pages; physical hardware creation stays in client masters or authorized quick create.

## 5.1 Pairwise Hardware Bindings — required where hardware relationships exist

After adding at least 2 physical units, show compact **`Hardware Bindings`** table and `+ Add Binding` button.

**Binding form fields** (one record per pair):

| Field | Control | Rules / tooltip |
|---|---|---|
| **From Hardware*** | Searchable single select, from selected hardware | “First endpoint of this relationship. A Device can be a parent for another Device, Sensor or SIM when supported.” |
| **To Hardware*** | Searchable single select, excluding From | “Second endpoint. Cannot select the same physical unit as both sides.” |
| **Relationship / Connected To** | Readable caption from From → To; optional `Port/Slot` only when supported | “The actual attachment between these two selected hardware units. No architecture mode needs to be selected.” |
| **Binding Mode*** | Single select `∞ Permanent` / `◷ Temporal` | “Permanent = starts at a specified time with no preset end. Temporal = defined start and end period.” |
| **Effective Start*** | Date picker **plus time (HH:MM, with seconds supported)** and timezone | “Exact date/time from which this pairwise relationship is valid.” |
| **Effective End*** | Date + time for Temporal; hidden/disabled for Permanent | “Exact end of this particular hardware relationship. Required only for Temporal.” |
| Timezone | Site/client timezone, e.g. Asia/Kolkata; shown explicitly | “Timezone in which the entered local date and time is interpreted.” |
| Status | Read-only derived state | “Scheduled before start; Active during period; Ended after end; Conflict if validation fails.” |
| Notes | Optional textarea | “Why this pair was connected or changed; useful for maintenance audit.” |

**Important behavior:**
- Each pair has **its own** Binding Mode and effective Start/End **date + time**. No single global Binding Mode/Date control for the whole connection.
- A Device→Device binding is valid if supported by configuration. **Gateway is still Category = Device**.
- Device→Sensor, Device→SIM, and optional Sensor→Device are handled through the **same pair UI** when supported. Do not assume every combination is physically valid; validate supported attachment and slots.
- SIM slot selection is conditional, shown only if selected device has documented slots. Do not always show Slot 1 and Slot 2.
- Child can be selected as `To` of another Device if its model supports linking; avoid circular links, e.g. A→B and B→A over overlapping active periods.
- Prevent conflicting overlapping bindings for the same SIM/device slot and unsupported multi-parent hardware relationships. Do not block legitimate history or a future nonoverlapping temporal replacement.
- Permanent means **open-ended** (not a fixed future expiry); an authorized user can **End Binding** with exact end date and time, preserving history.
- Draft can contain partially entered hardware/bindings; **Activate/Create Mapping** requires all applicable validation.

**Bindings table inside form:** `Binding ID | From | → | To | Mode | Effective Start | Effective End | Status | Edit | Remove`.

### 5.2 Resource allocation below Bindings — optional

`Resource Allocation (Optional)` compact section: `+ Add Resource`.

- Resource Type dropdown: Vehicle / Driver (and other existing supported client Resource Masters).
- `Vehicle → Registration No. search`, `Driver → Contact No. search`.
- Selected resource chip with name/id; optional exact resource-allocation start/end if enabled by established lifecycle model.
- Absence of Vehicle/Driver must not automatically prevent a valid hardware-only mapping from being saved or activated where supported.

### 5.3 Footer

`Cancel` | `Save as Draft` | **`Create Mapping`** (or `Save Changes` in edit). Confirmation uses text summary, **not a topology graphic**. On success return to Modal Connection tab, new row visible with the saved hardware/binding/resource counts. If user remains in drawer, provide View Details/Close actions.

---

# 6. ROW DETAILS & ACTION MENU — table-first only

**View (eye):** open right-side details drawer. Do not display a topology diagram. Present `Overview`, `Hardware`, `Bindings`, `Resources`, `Activity` as compact tabs with tables.

**Edit (pencil):** same Create/Edit form, prepopulated. Existing binding records and past periods must not be silently rewritten; use controlled Edit / End / New Binding and audit tracking.

**More (ellipsis):** menu `Duplicate as Draft (without claiming the same active hardware)`, `End/Deactivate Connection`, `View Activity`, `Export This Record` **only where supported by permissions and system semantics**. If cloning, start a fresh Connection ID and require fresh binding validation; do not silently activate duplicate assignments.

**Bulk actions:** `Export Selected`, `Deactivate Selected`, `End Selected Bindings` where permitted; destructive changes require preview and confirmation; do not use bulk actions to bypass active relation constraints. Hide unavailable operations rather than offering fake actions.

**Import:** CSV/JSON wizard or simple panel matching source UI. Require preview/validation of client, connection identity, hardware identifiers, type enablement, pair endpoints, binding periods, duplicate conflicts; reject or flag invalid rows and offer downloadable errors. Preserve valid rows per documented import policy. Do not pretend existing live backend integration.

**Export:** Export the **currently filtered set** with selected/visible columns as specified, not just current page; include explicit export scope toggle if user selected rows. Date-time strings include timezone; identifiers exported as **text** (avoid Excel/scientific-notation damage to IMEI and ICCID). For full relational export, use separate `Connections`, `Hardware Membership`, `Bindings`, `Resource Allocations` datasets or sheets; do not flatten multivalued relationships into misleading single-value cells.

---

# 7. STATUS & TIME SEMANTICS — MUST NOT MIX THESE

| Object | Possible states | Rule |
|---|---|---|
| **Connection** | Draft, Scheduled, Active, Inactive, Needs Attention | Overall record lifecycle; it does not determine whether an individual binding is currently active. |
| **Hardware physical unit** | Registered, Assigned, Pending Hardware Review, Retired (as supported) | Actual physical registry state; not a connection status. |
| **Hardware Binding** | Scheduled, Active, Ended, Conflict, Canceled | Derived from one pair's own effective start/end date-time and validation; end is exclusive if using half-open intervals `[start, end)`. |
| **Resource Allocation** | Scheduled, Active, Ended, Conflict | Independent allocation validity; driver change doesn't remap device. |
| **Connectivity / Network Health** | Online, Offline, Unknown, etc., if available | Comes from operational telemetry; **not** evidence that the connection or binding is successfully activated. |

**Date-time examples:** `13 Nov 2026 10:30:00 IST`, `20 Nov 2026 23:59:59 IST`; show explicit timezone in tooltip/label. Store ISO 8601 timestamps with offset or UTC + site timezone, never date-only strings. For Temporal: require End > Start. For Permanent: no End required or prefilled. Warn if times overlap a conflicting active relationship. Use browser locale display where appropriate, but do not silently change timezone.

**Connection activation example:** One connection includes `Device A`, `Device B`, `Sensor S`, `SIM X`. Bindings: `Device A→B Permanent from 10:30`, `Device B→Sensor S Temporal from 12:00 to 18:00`, `Device A→SIM X Permanent from 10:45`. All three remain independent; do **not** compute one false universal ‘Effective End’ for the connection.

---

# 8. SEARCH, FILTERS, SORT, DENSITY, SAVED VIEWS

## Modal Connection filter panel

| Control | Options / logic | ⓘ tooltip |
|---|---|---|
| Free-text Search | Connection Name, Connection ID, any registered hardware identifier, manufacturer/model, vehicle registration, driver contact | “Find a mapping by connection identity, registered hardware identifier, model or linked resource.” |
| Status | All / Draft / Scheduled / Active / Inactive / Needs Attention | “Filter by overall connection lifecycle.” |
| Hardware Category Present | All / Device / Sensor / SIM | “Find connections that include at least one unit in the selected category.” |
| Device Model Type | Multi or searchable single select of client-enabled Device types | “Filter connections containing a specific registered Device model.” |
| Binding Mode Present | All / Permanent / Temporal / None | “Find connections containing at least one binding with this period type.” |
| Binding State | All / Active / Scheduled / Ended / Conflict / None | “Filter by state of any contained pairwise binding.” |
| Resource Allocated | All / Vehicle / Driver / Unallocated | “Find connections with associated resource records.” |
| Updated On | From/To date or date-time range | “Filter by last change timestamp in the selected timezone.” |

**Multi-entity filters match `ANY` within a connection** unless UI explicitly provides `ALL`. Filters combine with AND across different filter fields.

**Sort:** Connection ID, Name, Device/Sensor/SIM counts, Bindings count, Status, Last Updated. Keep identity-aware numeric sorting for `CON-1009` vs `CON-1010`.

**Columns:** Show/hide/restore default/drag reorder optional, with sticky ID and Actions. Every table header has ⓘ. **Density:** Comfortable/Compact with row height and max lines changing while content remains accessible. **Saved Views:** name + filters + search + sort + visible columns + density, scoped to each user and client where supported. **Refresh:** refresh current local dataset (demo, not polling). **Pagination:** reset to page 1 after changed filters; preserve page on closing drawer if possible.

## Resource Connection View filters

Search Allocation ID / Connection ID / Vehicle Reg No. / Driver Contact; filter Resource Type, Allocation State, Validity Period, Site, and optionally Hardware Identifier. Use the same toolbar interaction pattern.

---

# 9. PERMISSIONS & VALIDATION

| Situation | Expected behavior |
|---|---|
| Client did not enable MettaX MC202L | Not selectable for **new** Adani Mundra mappings; retain existing historical references. |
| IMEI / Sensor ID / ICCID not in client's register | Empty lookup + authorized Register Missing Hardware action; never auto-invent identifier. |
| Identifier belongs to different tenant | Show conflict; block direct binding; route authorized reassignment with audit. |
| Existing active SIM used in another device during overlapping period | Block or request authorized migration/end previous binding; preserve old relationship. |
| Two records have same unique identifier | Reject duplicate registration; point to existing physical record. |
| Hardware pair incompatible / unsupported link | Explain incompatible relationship; don't activate silently. |
| A→B→A or self-link | Block cycle / self binding where parent-child semantic applies. |
| Temporal End ≤ Start | Inline error; disable final submit, allow Draft. |
| Resource vehicle missing | Inline Create Vehicle or Bulk Upload (authorized) inside the create journey; return with selected record. |
| Existing mapping has draft pending hardware review | Save Draft / Needs Attention; define the rule for activation before enabling it. |
| No hardware selected | Keep Draft available, disable Create Mapping. |
| One Device or one Sensor only | Allow single-node connection with zero hardware bindings where that hardware is supported standalone. |
| Client only has Sensors enabled | Do not force a gateway or Device Type. |
| Two people edit same connection | Warn on stale version; avoid silent overwrite. |
| Deactivate connection with active bindings | Show impact/confirmation; end or suspend relevant bindings with explicit policy, audit changes. |

**RBAC:** Binary Platform Admin manages model enablement and cross-client exceptions; authorized Hardware Team manages global types/configuration/assignment; PMO maps within permitted clients; client users see only entitled records. Reuse existing FleetRobo permissions; never access another client's hardware from this list.

---

# 10. IMPLEMENTATION DATA SHAPES — FOR A FUNCTIONAL PROTOTYPE

Reuse the current state/store and APIs if present. If backend is not implemented, keep local seeded demo state clearly labelled as a prototype; do not claim production persistence.

```ts
type Category = 'Device' | 'Sensor' | 'SIM';
type BindingMode = 'Permanent' | 'Temporal';
type BindingStatus = 'Scheduled' | 'Active' | 'Ended' | 'Conflict' | 'Canceled';

type HardwareMembership = {
  hardwareId: string;              // exact existing client-owned physical record ID
  category: Category;
  modelTypeId: string;             // globally defined and enabled for this client
  identifierType: string;          // from model definition
  identifierValue: string;         // from actual physical registry, never model master
};

type Connection = {
  id: string; companyId: string; name: string; description?: string;
  memberIds: string[];             // many physical devices/sensors/SIMs
  status: 'Draft' | 'Scheduled' | 'Active' | 'Inactive' | 'Needs Attention';
  createdAt: string; updatedAt: string; createdBy: string; updatedBy: string;
};

type HardwareBinding = {
  id: string; connectionId: string;
  fromHardwareId: string; toHardwareId: string;
  mode: BindingMode;
  effectiveStartAt: string;        // ISO with offset / canonical UTC timestamp
  effectiveEndAt?: string | null;  // required Temporal, empty Permanent
  timezone: string;                // e.g. Asia/Kolkata
  portOrSlot?: string | null;      // conditional where supported
  notes?: string;
};

type ResourceAllocation = {
  id: string; companyId: string; connectionId: string;
  resourceType: 'Vehicle' | 'Driver' | string;
  resourceId: string;              // references existing client Resource Master
  hardwareId?: string | null;      // null = applies to whole connection
  effectiveStartAt?: string | null;
  effectiveEndAt?: string | null;
  timezone?: string | null;
};
```

**Derived list counts:** `devices = unique member hardware IDs where category Device`; similarly Sensors/SIMs; `bindings = number of binding rows for connection`; resource summary = active/current allocation references. **Do not** duplicate each binding as a connection row. One connection may contain 2 Devices, 3 Sensors, 1 SIM, 5 bindings and 2 resource allocations and must still appear as **one** row in Modal Connection.

**Migration from older seeded source:** Keep existing `connections`, `devices`, `sensors`, `sims`, `bindings`, `resources` IDs where possible. Migrate older `Standalone / Sensor via Gateway / Direct` values **only as historical/backing records**, infer pairwise binding rows **only when source contains an actual linked parent and child**. Do not fabricate gateway/port links when missing. Preserve existing seeded records / pagination count where compatible; make category/type/model selection driven by current Model Category Master and Company Model Access. Remove architecture-related UI/filters/columns in this module without deleting legacy data needed elsewhere.

---

# 11. REQUIRED UI STATES TO BUILD AND TEST

**Directory:**
1. `Modal Connection` table default (search clear, default columns, 20 rows, both tabs and toolbar).
2. Search by `CON-1277`, `MC202N`, IMEI/Device ID, ICCID and vehicle registration.
3. Filters drawer open; category/status/binding state; zero matching rows; Clear Filters.
4. Columns panel hide/show; Density compact/comfortable; Saved view create/apply/delete; sorted ascending/descending.
5. Row hover; select 1/multiple/select page; Bulk actions; disabled invalid bulk action.
6. View Details drawer with **overview/hardware/bindings/resources/activity tables**, no topology.
7. Edit connection and status change with confirmations.
8. Resource Connection View flat table, filtered to vehicle/driver, with validity and history.
9. Import invalid data, export filtered/all, refresh and pagination boundaries.

**Create flow:**
10. Blank Create Mapping: Name + autogenerated ID; three Add buttons.
11. Add Device: enabled model type, identifier search, found/missing/assigned-elsewhere states.
12. Add second Device: same category, with distinct physical ID; gateway-to-gateway possible without gateway type selector.
13. Add Sensor(s) and SIM(s): model / identifier lookup, one or more units, no unnecessary SIM if not required.
14. `+ Add Binding`: Device→Device, Device→Sensor, Device→SIM; each with own Permanent/Temporal and exact Start/End date-time.
15. Invalid binding (cycle, duplicate ICCID period, same endpoint, unsupported pair, end before start).
16. Resource allocation: Vehicle by Registration Number, Driver by Contact; optional, quick-create if missing and permitted.
17. Save Draft with incomplete fields; reopen and resume; Activate/Create only when validations pass.
18. Review text-based mapping summary and success; new **single** row appears in listing with computed counts.
19. Temporal binding scheduled in future, active now, ended after end; inspect per-binding status and timezone.

---

# 12. ACCEPTANCE CHECKLIST — MUST ALL PASS

- [ ] Existing global FleetRobo sidebar/topbar unchanged; page local `Modal Connection` and `Resource Connection View` tabs preserved.
- [ ] Screen remains a **dense table-first** layout like the reference screenshot at 1440×900.
- [ ] Existing toolbar, row selection, horizontal scrolling, pagination and sticky Actions all work.
- [ ] **Connection Architecture** column/filter/architecture mode and `Standalone/Gateway/Direct` labels removed from UI.
- [ ] **No topology graph, hierarchy tree or View-as-Tree** UI anywhere in this module.
- [ ] Modal Connection table shows Connection ID, Name, multi-hardware summary, Device/Sensor/SIM counts, Bindings count, Resource Allocation, Status, Updated On, Actions.
- [ ] Every table column and every form/filter label has contextual ⓘ tooltip.
- [ ] Hardware Type and Model are not falsely flattened into one value; primary model is optional and explicitly labelled as such.
- [ ] One connection stays **one row**, no matter how many hardware units/pairs are linked.
- [ ] Category remains Device/Sensor/SIM; gateway counted as Device.
- [ ] Only client-enabled model types can be selected for new mappings.
- [ ] Identifier search selects registered physical client-owned units and respects unique identifiers/tenant isolation.
- [ ] Add Device, Add Sensor, Add SIM all repeat and populate the selected hardware table.
- [ ] **Every hardware-to-hardware pair has its own independent binding** with Permanent/Temporal and exact date-time, including Device→Device.
- [ ] Temporal binding requires End > Start and explicit timezone; Permanent is open-ended.
- [ ] Conflict validation, historical preservation, edit/end binding and role restrictions work.
- [ ] Resource Connection View is a flat relational table, not a topology tree.
- [ ] Vehicle by Registration Number and Driver by Contact are selectable; driver allocation is optional and separate from physical vehicle mapping.
- [ ] Draft / Create / Edit / Details / Import / Export / Bulk / Saved Views / Filters / Sort / Pagination all function in the prototype.
- [ ] Demo labels and limitations are honest; no fake production hardware connection claims.
- [ ] No unrelated module redesigned or broken.

**Final design instruction:** **Preserve the screenshot's table UI, upgrade the schema from one hardware/architecture row to a complete multi-hardware Connection row, and express every relationship as an inspectable date-time-bound row. Nothing should require viewing or drawing a topology.**

---

# 13. EXACT GOOGLE AI STUDIO PROMPT TO PASTE WITH THIS FILE

> Update the EXISTING FleetRobo 2.0 prototype's **Binary Admin → Asset Store → Modal Mapping** module using the attached Markdown as the mandatory implementation specification and the attached screenshot as the visual baseline. Preserve the two existing tabs **Modal Connection** and **Resource Connection View**, toolbar, table styling, selection, filters, columns, density, saved views, refresh, bulk, import/export, row actions and pagination. The core task is to rebuild the **tables and row details** so a connection is one parent record containing multiple registered Devices, Sensors, SIMs, pairwise hardware bindings and optional Vehicle/Driver allocations. Implement the exact default/optional columns, realistic demo records, detail drawers and ⓘ tooltips in the file. **Remove the old Connection Architecture column and all Standalone/Gateway/Direct connection modes. A gateway is a Device, not a separate category. Do not create any visual connection topology, tree, network diagram, or View-as-Tree feature.** In Create Mapping keep Connection Name and generated Connection ID, three buttons + Add Device / + Add Sensor / + Add SIM, identifier lookup restricted to the selected client's enabled models and actual registered physical units, plus independent hardware-pair bindings with Permanent/Temporal validity and **exact start/end date and time with timezone**. Resource Allocation is optional (Vehicle by Registration No.; Driver by Contact). Preserve existing global app shell, routes, data structures where possible and all unrelated pages. Functional prototype actions must genuinely update saved data, counts and tables; use existing APIs only if available, otherwise clearly labelled local demo state. Validate all acceptance criteria in the attached Markdown before finishing.
