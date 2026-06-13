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

const LOGIN_HEADERS = ['Timestamp', 'Serial No', 'Full Name', 'Contact No', 'Email', 'Designation', 'User ID', 'Password', 'Role', 'Page Access', 'Edit Access', 'Scope Class', 'Scope Section'];

const moduleColumns = (mod) => {
  const cols = ['Timestamp'];
  if (mod.autoId) cols.push(mod.idColumn);
  (mod.fields || []).forEach((f) => cols.push(f.key));
  return cols;
};

const wb = XLSX.utils.book_new();

// Login tab with seeded users for each role.
if (cfg.auth !== false) {
  const moduleLabels = (cfg.modules || []).map((m) => m.label);
  const hiddenForTeacher = (cfg.access && cfg.access.teacherHiddenModules) || [];
  const hiddenLabels = (cfg.modules || []).filter((m) => hiddenForTeacher.includes(m.key)).map((m) => m.label);

  // Staff — view + edit all data tabs (but not Settings — admin-only).
  const STAFF_PAGES = ['Dashboard', ...moduleLabels].join(', ');
  const STAFF_EDIT = moduleLabels.join(', ');
  // Teacher — view their class pages, NO financial/family modules, NO edit.
  const TEACHER_PAGES = ['Dashboard', ...moduleLabels.filter((l) => !hiddenLabels.includes(l))].join(', ');
  // Parent — scoped portal pages only, edits nothing. Contact No MUST equal the
  // Father/Mother Mobile of their child in Admissions (that mobile is the link).
  const PARENT_PAGES = 'My Child, My Child Fees, My Child Class';

  const loginRows = [
    LOGIN_HEADERS,
    // Cols: Timestamp,Serial,Name,Contact,Email,Designation,UserID,Password,Role,PageAccess,EditAccess,ScopeClass,ScopeSection
    ['', 1, 'Super Admin', '', '', 'Principal', 'admin', 'admin123', 'ADMIN', 'ALL', 'ALL', '', ''],
    ['', 2, 'School Staff', '', '', 'Office Staff', 'staff', 'staff123', 'STAFF', STAFF_PAGES, STAFF_EDIT, '', ''],
    // Teacher (sample) — class teacher of Class 5, Section A. Sees only that class, no fees.
    ['', 3, 'Class Teacher (sample)', '', '', 'Class Teacher', 'teacher', 'teacher123', 'TEACHER', TEACHER_PAGES, '', '5', 'A'],
    // Parent (sample) — Contact No must equal the child's Father/Mother Mobile.
    ['', 4, 'Parent (sample)', '9876543210', '', 'Parent', 'parent', 'parent123', 'PARENT', PARENT_PAGES, '', '', ''],
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
