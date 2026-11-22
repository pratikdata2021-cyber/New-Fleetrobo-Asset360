# FleetRobo 2.0 — Vendor Master / Transporter Integration

## Objective
Update the **existing FleetRobo 2.0 HTML prototype** using the supplied Vendor Master screen and legacy Transporter Master screenshots as the source of truth. **Do not create a separate Transporter Master.** Add **Transporter / Logistics Provider** as a Vendor Type, with conditional fields in the existing Vendor Create/Edit/View flow.

## 1. Preserve the existing product UI
- Keep the Binary Semantics / FleetRobo visual design, typography, coral highlights, sidebar, tenant header and navigation **unchanged**.
- Preserve the existing **Vendor Master directory**, table columns, status tabs, search, filters, sort, column chooser, list/grid toggle, saved views, import/export, bulk operations, pagination and row actions.
- Preserve Create / Edit / View operations and the original data model, public/internal IDs, statuses and other Vendor Types. For Create/Edit, use **one continuous, full-length scrollable form** with all fields visible in sequence (not a wizard, multi-page flow, tabs or collapsed accordions); the existing listing UI must remain unchanged.
- **Do not add KPI cards, dashboard widgets, counters above tables, extra menu items or redesigned screens.**

## 2. Vendor Type = Transporter
- Add **Transporter / Logistics Provider** to Vendor Type options in create/edit and directory filters.
- Selecting this type reveals transporter-specific form sections. Other Vendor Types continue using their existing forms and data.
- Keep legacy **Transporter Code** as a separate optional external/legacy reference; **do not overwrite** the Vendor Public ID or Internal ID.
- Preserve existing Vendor Name, primary address/place and contact fields without duplication. Prepopulate shared fields when editing.

## 3. Transporter fields & form sections
Include every relevant field below, retaining legacy required markers where shown; make required fields clearly identifiable by an asterisk (*) and enforce them with inline validation. Reuse existing form controls and two-column field layouts in **one continuous scrolling form**. Use clear section headings, but do **not** hide sections in accordions or split the flow into steps.

**A. Organisation & Identity**
- Company Name (organisation context), Client Name (client context), Vendor/Transporter Name **required**, Transporter Code (legacy), Vendor Type, Active status, Transporter Logo upload.

**B. Registered Address**
- PinCode; Country **required**; State **required**; City (retain original validation); Address **required**; Address Coordinates: Latitude and Longitude.

**C. Billing Details**
- “Billing address same as registered address” checkbox; Billing Address, Billing Pincode, Billing Country, Billing State, Billing City. When checked, copy registered-address values and keep them in sync appropriately.

**D. Primary & Additional Contacts**
- Company Phone No.; Contact Person; Contact No. **required**; Alternate Contact No.; Contact Email ID; Mobile No. **required**; Email ID **required**; Alternate Email ID.

**E. Tax & Legal Information**
- PAN No., GST No., CIN No.

**F. Contract & Compliance**
- Is Contract Signed checkbox. Keep the existing vendor contract fields if already present; **do not invent a mandatory contract date** unless the source prototype requires it.

The screenshots show Company Name, Client Name, Transporter Name, Transporter Code, PinCode, Country, State, City, Address, Coordinates, all billing fields, company/contact details, PAN, GST, CIN, contract signed, logo and Active: **do not omit any of these**.

## 4. Important: No Operational Relationships in this phase
- **Do not implement any Operational Relationships section in the Vendor Create/Edit form.**
- Do not add Associated Fleets, Sites / Zones, Vehicles, Drivers, Vendor–Fleet mapping or relationship actions inside Vendor Master.
- All cross-entity connections, effective-date bindings and mapping history will be handled in **Modal Mapping in a separate phase**. Do not build them now.
- Keep existing Vendor Master fields otherwise unchanged.

## 5. Existing linked User Accounts must remain intact
- **Do not remove, replace, or break User Account linkage** already present in Vendor Master: linked user accounts, vendor personnel membership, access-related UI, and relevant create/view/edit operations.
- Existing Vendor ↔ User Account associations must persist when a vendor is classified as Transporter; transporter-specific fields are additive, not a replacement.

## 6. Transporter identity across FleetRobo
- Treat the Vendor record with `Vendor Type = Transporter / Logistics Provider` as the **single canonical transporter identity** across the platform.
- Reuse its stable Vendor ID and retain the legacy Transporter Code as an external reference. Existing transporter selectors, searches, filters, labels, reports, imports, and references throughout FleetRobo should resolve to this vendor record without losing linked data or breaking existing screens.
- Preserve backward compatibility with legacy transporter references and avoid duplicate Transporter Master entities. **Do not build or introduce new Fleet/Vehicle/Driver mappings in this phase**; those workflows belong to Modal Mapping.

## 7. Interaction & validation
- Make Vendor Type switching, the single-page Create/Edit/View flow, field validation, Same as Registered Address, Active status and logo selection functional.
- Validate required fields and email/phone formats using existing product conventions; preserve relevant cascading Country → State → City logic where available.
- Save transporter-specific fields on the Vendor record; retain edits when reopening; render correct Vendor Type in the listing.
- Maintain current sample data and existing vendors. Do not replace working UI with placeholders.

## 8. Final deliverable
Return **one complete, working HTML prototype** based directly on the attached current FleetRobo HTML. This is an **incremental Vendor Master enhancement**, not a redesign or a full Asset Store restructuring. Ensure all existing operations still work, and the one long Create/Edit form ends with **Contract & Compliance** (no Operational Relationships section).
