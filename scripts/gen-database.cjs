/**
 * Generates the importable Google Sheet database (.xlsx) from
 * src/app.config.json — a "Login" tab (headers + default admin) plus
 * one tab per module with the correct column headers.
 *
 * Usage:  node scripts/gen-database.cjs
 * Requires the "xlsx" package (it's a project dependency).
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const cfgPath = path.join(__dirname, '..', 'src', 'app.config.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

const LOGIN_HEADERS = ['Timestamp', 'Serial No', 'Full Name', 'Contact No', 'Email', 'Designation', 'User ID', 'Password', 'Role', 'Page Access', 'Edit Access'];

const moduleColumns = (mod) => {
  const cols = ['Timestamp'];
  if (mod.autoId) cols.push(mod.idColumn);
  (mod.fields || []).forEach((f) => cols.push(f.key));
  return cols;
};

const wb = XLSX.utils.book_new();

// Login tab with a default admin user.
if (cfg.auth !== false) {
  // Page Access (view) for USER rows = comma-separated page labels (or ALL).
  const STAFF_PAGES = 'Dashboard, Admissions, Admission Fees, Fee Collection, Subjects, Teachers, Classes, Timetable, Family Register';
  // Staff can edit data modules (but not via Settings — that's admin-only).
  const STAFF_EDIT = 'Admissions, Admission Fees, Fee Collection, Subjects, Teachers, Classes, Timetable, Family Register';
  // Parent sees only the two scoped portal pages, and edits nothing.
  const PARENT_PAGES = 'My Fees, My Class';
  const loginRows = [
    LOGIN_HEADERS,
    // Cols: Timestamp, Serial No, Full Name, Contact No, Email, Designation, User ID, Password, Role, Page Access, Edit Access
    // Super Admin — full view + edit on everything incl. Settings.
    ['', 1, 'Super Admin', '', '', 'Principal', 'admin', 'admin123', 'ADMIN', 'ALL', 'ALL'],
    // Staff — view + edit data tabs, no Settings.
    ['', 2, 'School Staff', '', '', 'Staff', 'staff', 'staff123', 'USER', STAFF_PAGES, STAFF_EDIT],
    // Parent — VIEW ONLY scoped portal. Contact No MUST equal the Father/Mother
    // Mobile in Admissions for this parent's child (that mobile is the link key).
    ['', 3, 'Parent (sample)', '9876543210', '', 'Parent', 'parent', 'parent123', 'USER', PARENT_PAGES, ''],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(loginRows), cfg.loginSheet || 'Login');
}

// One tab per module (headers only).
(cfg.modules || []).forEach((mod) => {
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([moduleColumns(mod)]), mod.sheet);
});

const safe = String(cfg.appName || 'App').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
const outName = `${safe}-Database.xlsx`;
const outPath = path.join(__dirname, '..', outName);
XLSX.writeFile(wb, outPath);

console.log('Created ' + outName + ' with tabs: ' + wb.SheetNames.join(', '));
