# White-Label Setup & Clone Guide

This app is built to be **re-sold to any school**. All school-specific data lives in
**one file**: [`src/app.config.json`](src/app.config.json). To make a copy for a new client
you change config + the Google Sheet — **no component code is touched**.

---

## 1. Roles (4 built-in)

| Role | Sees | Can edit? | Scoped to |
|------|------|-----------|-----------|
| **ADMIN** | Everything + Settings | Yes (all) | Whole school |
| **TEACHER** | Their class students, Subjects, Classes, Timetable. **No fees, no family register.** | **No (read-only)** | `Scope Class` + `Scope Section` |
| **PARENT** | Their own child's full profile, fees & class only | No | Their `Contact No` = child's mobile |
| **STAFF** | Whatever pages admin grants | Per-page grant | Whole school |

Row-level rules live in `app.config.json → access` and are enforced in
[`src/config.js`](src/config.js) (`scopeRows`, `visibleColumnIdx`, `canViewItem`, `canEdit`).

---

## 2. Login sheet — REQUIRED columns

The **Login** tab now has 13 columns (added **L** & **M**):

```
A Timestamp | B Serial No | C Full Name | D Contact No | E Email | F Designation
G User ID | H Password | I Role | J Page Access | K Edit Access
L Scope Class | M Scope Section
```

- **Role** = `ADMIN` / `TEACHER` / `PARENT` / `STAFF`
- **Scope Class / Section** = only for `TEACHER` (e.g. `5` and `A`; class can be comma-separated `5,6`; blank section = whole class).
- **Parent**: leave Scope blank, but **Contact No must equal the child's Father/Mother Mobile** in Admissions — that mobile is the only link.

You normally never edit these by hand — create users from **Settings** inside the app.

### Migrating the existing BPS live sheet (do once)
1. In the **Login** tab add two new header cells: **`Scope Class`** (col L) and **`Scope Section`** (col M).
2. Change each teacher's **Role** to `TEACHER` and fill their Scope Class/Section.
3. Change each parent's **Role** from `USER` to `PARENT`.  ⚠️ *Old `USER` rows are now treated as **STAFF** — parents left as `USER` will wrongly see staff pages.*
4. Staff rows: `USER` still works (treated as STAFF), or set them to `STAFF`.
5. Admin rows stay `ADMIN`.

> Tip: the regenerated `BPS-School-ERP-Database.xlsx` already has the correct columns and a sample of each role (`admin/admin123`, `teacher/teacher123`, `parent/parent123`, `staff/staff123`). Use it as the reference layout — **don't re-import over live data** or you'll wipe it.

---

## 3. Cloning for a NEW client (≈10 minutes)

1. **Copy the whole project folder**, rename it.
2. Edit `src/app.config.json → branding`:
   ```json
   "branding": {
     "schoolName": "New Public School",
     "shortName": "NPS ERP",
     "tagline": "Your tagline here",
     "address": "Full address", "phone": "...", "email": "...", "website": "...",
     "poweredBy": "Acemark", "academicYear": "2025-26"
   }
   ```
   This name/address flows automatically into the login screen, sidebar, dashboards,
   fee receipts and ID cards.
3. (Optional) Adjust `modules`, class lists, or the `access` rules:
   - `financialModules` / `teacherHiddenModules` — what teachers must never see.
   - `parentPhoneFields` — which columns link a parent to a child.
   - `classField` / `sectionField` — the scope columns.
4. Run `npm run gen-db` → produces `<School>-Database.xlsx`.
5. Create a fresh Google Sheet, import that xlsx, deploy the Apps Script
   (`google-apps-script/Code.gs`) as a Web App, put its URL + Sheet ID in `.env`.
6. `npm run build` → deploy `dist/`. Done.

---

## 4. Security note (be honest with the client)

The backend is a Google Sheet behind an Apps Script web app, which returns whole
sheets. Role scoping (teacher = own class, parent = own child) is enforced in the
**browser**, so it is correct for normal use but is **not** a hard security boundary
against a technical user inspecting network traffic. For true server-side isolation
the Apps Script `doGet` would need to filter rows by the logged-in user — a future
upgrade. For a school front-office / parent-portal use case this is the standard trade-off.

Also: **parent isolation depends on unique mobile numbers.** If several students share
the same placeholder mobile in Admissions, that parent login will see all of them.
Clean the Father/Mother Mobile column before going live.
