# FleetRobo – Vehicle Model Master (Admin) & Add Vehicle Integration

**Document type:** Product Requirement / Development Handoff  
**Module:** Admin → Setup → Vehicle Model Master  
**Related flow:** Setup / Asset Store → Add Vehicle  
**Status:** Proposed requirements – pending engineering validation  
**Version:** 1.0 | **Date:** 17 November 2026

## 1. Objective

Create a new centrally managed **Vehicle Model Master** in the FleetRobo Admin portal. Admins must be able to add, edit, activate/deactivate and search vehicle models; configure vehicle model-specific map icons for operational states; and make active models available in the existing **Machine Model** dropdown in the **Add Vehicle** flow.

**Important:** This requirement changes the dropdown's data source/filtering for vehicle entries; it does **not** require changing the existing field label **Machine Model** in Add Vehicle unless explicitly approved.

## 2. Current system reference

The supplied FleetRobo screenshots show:

- **Machine Type** master: Machine Type, Machine Category, Status, Created Date, Edit.
- **Machine Segment** master: Machine Segment, Machine Type, Status, Created Date, Edit.
- **Add/Edit Machine Model** screen: Machine Model Name, Machine Segment Name, icons for Poll, Not Poll, Move, Alarm, Immobilize, Stoppage and Towing, Fuel Tank Capacity, Vehicle Capacity, Is AC Reverse and Active.

The new Vehicle Model Master should reuse the visual pattern of existing Setup masters but provide a dedicated source of truth for models used by vehicle assets.

## 3. Scope

### In scope

1. New Admin page: **Setup → Vehicle Model Master**.
2. Listing page with search/filter, pagination, Add New and Edit actions.
3. Add/Edit Vehicle Model form, validations and status controls.
4. Model-specific vehicle image/icon management for all seven existing state types.
5. Default icon inheritance and per-state custom replacement, preview and reset.
6. Sample seed records for development and UAT.
7. Integration: **Add Vehicle → Machine Model dropdown** fetches **active vehicle models from this master**.
8. Preserve previously saved vehicle-model associations and prevent duplicate/invalid selections.

### Out of scope for V1

- Driver assignment; live GPS/ADAS/DMS telemetry; device installation/mapping; vehicle registration/chassis/engine numbers.
- Automatic inference of model details from registration number.
- Migration/deletion of existing Machine Model records without an approved mapping plan.
- Client-specific icon overrides (future enhancement, if needed).

## 4. Admin navigation and access

**Menu:** FleetRobo Admin → Setup → **Vehicle Model Master**.

| Role | View | Create | Edit | Deactivate |
|---|---|---|---|---|
| Super Admin | Yes | Yes | Yes | Yes |
| Authorized FleetRobo Admin | Yes | Yes | Yes | Yes |
| Client Admin | Configurable / read-only by default | No | No | No |
| Client User | No | No | No | No |

Role permissions are proposed and should be aligned with the existing RBAC module.

## 5. Vehicle Model Master – Listing page

**Page title:** Vehicle Model Master. **Primary action:** + Add New.

| Column | Description |
|---|---|
| S.No. | Pagination-aware serial number |
| Model ID | Unique system-generated identifier |
| Vehicle Manufacturer | E.g., Tata Motors |
| Vehicle Model Name | E.g., Prima 5530.S |
| Variant | E.g., 6x4 BS6 |
| Vehicle Type | Truck, Bus, Van, etc. |
| Vehicle Segment | HCV, LCV, Passenger, etc. |
| Map Icon Preview | Thumbnail of default/current vehicle state icon |
| Icon Setup | 7/7 configured, 5/7 inherited, etc. |
| Status | Active / Inactive |
| Created Date | System generated |
| Action | Edit / View |

**Controls:** Free-text search by manufacturer/model/variant; filters for type, segment and status; 10/25/50 records per page; pagination; Add New.

**Deactivate rather than hard delete:** Existing vehicle references must remain valid. Show a confirmation with number of dependent vehicles, if available.

## 6. Add / Edit Vehicle Model – Form fields

### A. Basic information

| Field | Data type / UI | Required | Example / Rule |
|---|---|---|---|
| Vehicle Model ID | Read-only; generated | System | `VM-000101` |
| Manufacturer | Searchable dropdown (prefer manufacturer master) | Yes | `Tata Motors` |
| Vehicle Model Name | Text, 100 chars | Yes | `Prima 5530.S` |
| Variant / Trim | Text, 100 chars | No | `6x4 BS6` |
| Vehicle Type | Dropdown | Yes | `Truck` |
| Vehicle Segment | Dropdown filtered by type | Yes | `Heavy Commercial Vehicle` |
| Model Year | Number (optional) | No | `2026` |
| Fuel Type | Dropdown | No | Diesel / Petrol / CNG / Electric / Hybrid |
| Description | Textarea | No | Operational notes |

### B. Specifications

| Field | Data type | Required | Note |
|---|---|---|---|
| Fuel Tank Capacity (L) | Decimal >= 0 | No | Keep consistent with existing Machine Model field |
| Payload Capacity (kg) | Decimal >= 0 | No | Explicit unit; not the same as seating capacity |
| Seating Capacity (persons) | Integer >= 0 | Conditional | Use for passenger models |
| Number of Axles | Integer >= 0 | No | Primarily applicable to commercial vehicles |
| Is AC Vehicle | Boolean | No | Default false |
| Is AC Reverse | Boolean | No | Retain compatibility with existing Machine Model config |
| Active | Boolean | Yes | Default true |

### C. Map Icon / Image Configuration (mandatory coverage)

For each of the **seven existing Machine Model states**, show **state name, current icon preview, system default filename, icon source (Default/Custom), Upload/Replace, Reset to Default**.

| Key | Label in UI | Reference filename from current UI | Suggested preview | Upload required? |
|---|---|---|---|---|
| `poll` | Polling | `DefaultIconPoll.png` | Green vehicle | No – default |
| `not_poll` | Not Polling | `DefaultIconNotPoll.png` | Grey/black vehicle | No – default |
| `move` | Moving | `DefaultIconMove.png` | Yellow vehicle | No – default |
| `alarm` | Alarm | `DefaultIconAlarm.png` | Blue vehicle + alarm badge | No – default |
| `immobilize` | Immobilized | `DefaultIconImmobilize.png` | Green vehicle marker | No – default |
| `stoppage` | Stoppage / Stopped | `DefaultIconStoppage.png` | Red vehicle | No – default |
| `towing` | Towing | `Towing Icon.png` | Tow indicator | No – default |

**Source clarification:** The filenames and states above are transcribed from the supplied Machine Model screenshot. Actual reusable image binaries, final icon color semantics and any towing image (the screenshot shows a broken preview) must be confirmed with engineering/design before implementation. Do not treat the previews or filenames alone as approved image assets.

**Recommended behavior:**

- On **Add New**, all 7 states are pre-populated from a managed **System Icon Library**.
- Admin may leave defaults unchanged, or upload a different image against any individual state.
- On upload: validate file type, size and resolution; show immediate image preview; allow replace and reset.
- Proposed accepted formats: PNG / WebP / SVG (sanitized SVG only); recommended transparent 64×64 or 128×128 px; max 200 KB per icon. Engineering to finalize limits based on map renderer.
- Store stable file/object IDs or URLs, not base64 blobs in the model table.
- Preserve current icon if the admin edits other fields without uploading a new file.
- Towing must not render a broken-image placeholder: use a verified fallback until a real asset is supplied.
- All seven icon slots must resolve to a valid default/custom asset before saving, even though **custom uploads are optional**.

**Suggested layout:** A 2-column grid of 7 state cards; each card contains preview, state name, `Default / Custom`, `Upload / Replace` and `Reset`. Eighth slot optional for future states. A large consolidated preview should show how icons will appear on Track on Map.

### D. Audit fields (read-only)

Created By, Created At, Last Modified By, Last Modified At.

## 7. Sample vehicle model seed data (illustrative, not catalog-verified)

> The records below are **sample/test data only**. Vehicle types, variants, capacities and specifications must be validated before production seeding. No manufacturer endorsement or claim of current model availability is intended.

| Model ID | Manufacturer | Vehicle Model Name | Variant | Vehicle Type | Segment | Fuel | Payload kg | Tank L | Status | Icon Set |
|---|---|---|---|---|---|---|---:|---:|---|---|
| VM-000101 | Tata Motors | Prima 5530.S | 6x4 BS6 | Truck | HCV | Diesel | — | — | Active | Default 7/7 |
| VM-000102 | Tata Motors | Ultra T.16 | Standard | Truck | MCV | Diesel | — | — | Active | Default 7/7 |
| VM-000103 | Ashok Leyland | Dost+ | Standard | Pickup | LCV | Diesel | — | — | Active | Default 7/7 |
| VM-000104 | Mahindra | Bolero Pik-Up | Standard | Pickup | LCV | Diesel | — | — | Active | Default 7/7 |
| VM-000105 | Eicher | Pro 2049 | Standard | Truck | LCV | Diesel | — | — | Active | Default 7/7 |
| VM-000106 | Tata Motors | Starbus | Standard | Bus | Passenger | Diesel | — | — | Active | Default 7/7 |
| VM-000107 | Force Motors | Traveller | Standard | Van | Passenger | Diesel | — | — | Active | Default 7/7 |
| VM-000108 | Generic | AC Container Van | Custom | Truck | HCV | Diesel | — | — | Active | Custom 2/7 + Default 5/7 |
| VM-000109 | Generic | Forklift Electric | Standard | Heavy Equipment | Industrial | Electric | — | — | Inactive | Default 7/7 |

**Sample exact dropdown options:**

- `Tata Motors – Prima 5530.S (6x4 BS6)`
- `Tata Motors – Ultra T.16 (Standard)`
- `Ashok Leyland – Dost+ (Standard)`
- `Mahindra – Bolero Pik-Up (Standard)`
- `Eicher – Pro 2049 (Standard)`
- `Tata Motors – Starbus (Standard)`
- `Force Motors – Traveller (Standard)`
- `Generic – AC Container Van (Custom)`

Inactive sample `VM-000109` must not appear for *new* Add Vehicle selections.

## 8. Add Vehicle integration – critical requirement

### Existing Add Vehicle flow

Wherever **Machine Model** is selected while adding a vehicle, populate it using the **Vehicle Model Master** introduced above.

### Proposed interaction

1. User opens **Add Vehicle**.
2. User selects Vehicle Category / Type / Segment (where these selectors already exist).
3. User opens the existing **Machine Model** dropdown.
4. Dropdown fetches **active Vehicle Model Master records**, filtered by selected type/segment when available; no unrelated machine/device models are returned.
5. Dropdown label displays `Manufacturer – Vehicle Model (Variant)`; submitted value is the stable `vehicle_model_id`.
6. On selection, available standard specs (fuel tank capacity, payload/seating capacity etc.) and icon-set reference can be prefilled/inherited, with clear rules for user overrides.
7. Save vehicle with `vehicle_model_id` relationship. On edit, reload its selected model even if subsequently deactivated (read-only/legacy selection). Admin must choose an active model to replace it.

**Backward compatibility:** If the existing API/database uses `machine_model_id`, do not silently repurpose that column. Engineering should choose either (a) a new `vehicle_model_id` plus compatibility mapping, or (b) a shared model table with an explicit `asset_type=VEHICLE` discriminator. Existing vehicle records and unrelated machine-model consumers must keep working.

### UX states

| Scenario | Expected behavior |
|---|---|
| Active vehicle model | Available in dropdown |
| Inactive vehicle model | Hidden for new selections; readable for existing records |
| No eligible models for selected type | Show `No vehicle models found` and Admin setup hint |
| Type/segment changed after model chosen | Clear selection if incompatible, notify user |
| Search by model/manufacturer | Searchable dropdown |
| Model record updated | Latest display values reflected; ID remains stable |
| Model deactivated while a vehicle uses it | Existing record and icon mapping remain visible |
| Service unreachable | Show explicit load error and Retry; do not substitute generic Machine Models |

### Example integration contract (illustrative, not existing APIs)

`GET /api/admin/vehicle-models?status=active&vehicleType=Truck&segment=HCV&search=prima`

```json
{
  "items": [
    {
      "id": "VM-000101",
      "manufacturer": "Tata Motors",
      "modelName": "Prima 5530.S",
      "variant": "6x4 BS6",
      "vehicleType": "Truck",
      "segment": "HCV",
      "active": true,
      "displayName": "Tata Motors – Prima 5530.S (6x4 BS6)",
      "iconSetId": "ICONSET-VM-000101"
    }
  ]
}
```

`POST /api/vehicles` – include `vehicleModelId: "VM-000101"` (or an approved compatibility field). All API paths/field names above are proposals and must be aligned to actual existing services.

## 9. Data model (recommended)

### `vehicle_models`

`id` (PK), `manufacturer_id` or `manufacturer_name`, `model_name`, `variant`, `vehicle_type_id`, `vehicle_segment_id`, `model_year`, `fuel_type`, `fuel_tank_capacity_l`, `payload_capacity_kg`, `seating_capacity`, `axle_count`, `is_ac_vehicle`, `is_ac_reverse`, `description`, `is_active`, `created_at`, `created_by`, `updated_at`, `updated_by`.

### `vehicle_model_icons`

`id` (PK), `vehicle_model_id` (FK), `state_key` (one of 7), `source` (`default`/`custom`), `asset_id`, `updated_at`, `updated_by`.

**Constraints:** Unique model+manufacturer+variant combination under the agreed normalized matching rule; uniqueness of (`vehicle_model_id`, `state_key`); validated model FK in Add Vehicle; immutable stable model IDs. Keep default icon definitions separately in `system_vehicle_state_icons` or equivalent config.

**Fallback order:** Custom model state icon → default icon for the vehicle type (if configured) → verified system state icon.

## 10. State priority and rendering

The master stores images, **not** live telemetry state. The Track on Map / Vehicle Dashboard renderer selects the relevant icon according to already-approved business rules. A vehicle may be polling, moving and in an alarm state simultaneously, so the renderer should prefer an approved priority or an alarm overlay without losing movement status.

**Do not implement an assumed priority from this document alone.** Confirm final status precedence with the VT/Platform team and apply consistently across pages. If a specific icon is unavailable, show the verified system fallback, never a broken image.

## 11. Acceptance criteria / UAT checklist

- [ ] Admin can navigate to Setup → Vehicle Model Master.
- [ ] Listing shows required columns, search, filters, pagination and active status.
- [ ] Admin can create a model with required name, manufacturer, vehicle type and segment.
- [ ] Duplicate model+manufacturer+variant combinations are rejected per agreed rule.
- [ ] All seven icon states appear with usable default assets and accurate previews.
- [ ] Admin can upload a custom icon for any state; replace it; reset that state to default.
- [ ] Editing basic information does not erase uploaded icons.
- [ ] Broken/missing default icon (especially towing) falls back safely.
- [ ] Add Vehicle's **Machine Model** dropdown shows every applicable active Vehicle Model Master entry, with pagination/search as necessary, and excludes non-vehicle Machine Models.
- [ ] Selecting a model saves the stable vehicle model ID and reloads correctly on Edit Vehicle.
- [ ] Inactive models are not offered for new selections but existing linked vehicles still display correctly.
- [ ] Type/segment changes revalidate or clear an incompatible model selection.
- [ ] API failure/loading/empty states are handled.
- [ ] Legacy vehicle records and other uses of existing Machine Model remain unaffected.
- [ ] RBAC, validation, audit fields and basic regression are verified.

## 12. Engineering work breakdown

| Workstream | Deliverable |
|---|---|
| Backend | Vehicle Model CRUD, filters, validation, status, relations and icon-set reference |
| Storage | Default asset library, custom image upload/storage and safe fallback |
| Admin UI | Listing, Add/Edit form, 7-icon configuration panel, previews |
| Add Vehicle UI | Machine Model dropdown from active Vehicle Model Master with type/segment filtering |
| Migration/compatibility | Resolve old machine_model_id linkage and existing vehicle records |
| QA | CRUD, image states, dropdown integration, deactivation, permissions, regression |

## 13. Product decisions to confirm before build

1. Is Vehicle Model a separate table or a vehicle-only view of the existing Machine Model table?
2. Does Add Vehicle retain the **Machine Model** label or eventually rename it to **Vehicle Model**?
3. Which existing selector controls dropdown filtering: Machine Type, Machine Segment or Vehicle Type/Segment?
4. Can we obtain the seven original default assets, especially a working Towing icon?
5. What is the source of truth for live icon precedence across Track on Map, Command Center and Vehicle Dashboard?
6. Should model images be global to all clients or support tenant overrides later?

**V1 recommendation:** Keep the existing Add Vehicle field label for minimal disruption; add Vehicle Model Master as a dedicated Admin master; use defaults for all seven states and optional overrides; filter active models in the existing Machine Model selector; protect all historical associations.
