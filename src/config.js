// =====================================================================
//  Single source of truth — everything is derived from app.config.json.
//  To re-brand the app for a new client, or change access rules, edit
//  app.config.json (branding / access blocks). Do NOT hardcode school
//  names or rules in components — read them from here.
// =====================================================================
import appConfig from './app.config.json';

// ----------------------------- Branding ------------------------------
export const BRANDING = appConfig.branding || {};
// Product/app title (shown in sidebar, login, browser). Institution name
// (used on receipts, ID cards, reports) is SCHOOL_NAME.
export const APP_NAME = BRANDING.shortName || appConfig.appName || 'School ERP';
// Compact name for tight spots like the sidebar header (mobile/desktop).
export const APP_SHORT_NAME = BRANDING.miniName || APP_NAME;
export const SCHOOL_NAME = BRANDING.schoolName || appConfig.appName || 'School';
export const THEME = appConfig.theme || BRANDING.primaryColor || 'sky';

export const AUTH_ENABLED = appConfig.auth !== false;
export const LOGIN_SHEET = appConfig.loginSheet || 'Login';
export const MODULES = appConfig.modules || [];

// Access / scoping rules (white-label: all keys come from config).
export const ACCESS = appConfig.access || {};
const CLASS_FIELD = ACCESS.classField || 'Class';
const SECTION_FIELD = ACCESS.sectionField || 'Section';
const PARENT_PHONE_FIELDS = ACCESS.parentPhoneFields || ['Father Mobile', 'Mother Mobile'];
const FINANCIAL_MODULES = ACCESS.financialModules || [];
const TEACHER_HIDDEN_MODULES = ACCESS.teacherHiddenModules || [];
const TEACHER_HIDDEN_FIELDS = ACCESS.teacherHiddenFields || [];

// Full ordered column list for a module's sheet (matches gen-database.cjs).
export const moduleColumns = (mod) => {
  const cols = ['Timestamp'];
  if (mod.autoId) cols.push(mod.idColumn);
  mod.fields.forEach((f) => cols.push(f.key));
  return cols;
};

export const getModule = (key) => MODULES.find((m) => m.key === key);
export const isFinancialModule = (mod) => FINANCIAL_MODULES.includes(mod?.key);

// ------------------------------- Roles -------------------------------
// ADMIN  — super admin, full view + edit, Settings, school-wide data.
// TEACHER— scoped to their class(es); NO financial/fee data.
// PARENT — scoped to their own child only (portal pages).
// STAFF  — back-office staff; page/edit access granted per-user (legacy "USER").
export const ROLES = { ADMIN: 'ADMIN', TEACHER: 'TEACHER', PARENT: 'PARENT', STAFF: 'STAFF' };

export const roleOf = (user) => {
  const r = String(user?.role || '').toUpperCase();
  if (r === 'USER') return ROLES.STAFF; // legacy back-compat
  return [ROLES.ADMIN, ROLES.TEACHER, ROLES.PARENT, ROLES.STAFF].includes(r) ? r : ROLES.STAFF;
};
export const isAdmin = (user) => roleOf(user) === ROLES.ADMIN;
export const isTeacher = (user) => roleOf(user) === ROLES.TEACHER;
export const isParent = (user) => roleOf(user) === ROLES.PARENT;
export const isStaff = (user) => roleOf(user) === ROLES.STAFF;

// ------------------------------- Menu --------------------------------
// `portal` items are role-private dashboards (only that role sees them).
export const MENU_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  ...MODULES.map((m) => ({ path: `/m/${m.key}`, label: m.label, icon: m.icon || 'Table', moduleKey: m.key })),
  // Role portals (scoped to the logged-in user).
  { path: '/my-students', label: 'My Students', icon: 'Users', portal: ROLES.TEACHER },
  { path: '/my-child', label: 'My Child', icon: 'GraduationCap', portal: ROLES.PARENT },
  { path: '/my-fees', label: 'My Child Fees', icon: 'Receipt', portal: ROLES.PARENT },
  { path: '/my-class', label: 'My Child Class', icon: 'CalendarClock', portal: ROLES.PARENT },
  { path: '/setting', label: 'Setting', icon: 'Settings', adminOnly: true },
];

// Login sheet column order (must match Code.gs + gen-database.cjs).
// Index 11/12 (Scope Class / Section) added for teacher row-level scoping.
export const LOGIN_HEADERS = [
  'Timestamp', 'Serial No', 'Full Name', 'Contact No', 'Email',
  'Designation', 'User ID', 'Password', 'Role', 'Page Access', 'Edit Access',
  'Scope Class', 'Scope Section',
];

// Pages an admin can grant VIEW access to (Dashboard + every module).
export const GRANTABLE_VIEW = ['Dashboard', ...MODULES.map((m) => m.label)];
// Pages an admin can grant EDIT (add/edit/delete) access to — data modules only.
export const GRANTABLE_EDIT = MODULES.map((m) => m.label);
// Pages a TEACHER may be granted (financial / hidden modules excluded by config).
export const TEACHER_GRANTABLE_VIEW = ['Dashboard', ...MODULES.filter((m) => !TEACHER_HIDDEN_MODULES.includes(m.key)).map((m) => m.label)];
// Default pages auto-granted to a new teacher / parent in Settings.
export const DEFAULT_TEACHER_VIEW = TEACHER_GRANTABLE_VIEW;
export const PARENT_PORTAL_LABELS = MENU_ITEMS.filter((i) => i.portal === ROLES.PARENT).map((i) => i.label);

// --------------------------- Access helpers --------------------------
const listOf = (s) => String(s || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);

// Can a TEACHER see this module at all? (financial/PII modules are blocked.)
const teacherCanSeeModule = (moduleKey) => moduleKey && !TEACHER_HIDDEN_MODULES.includes(moduleKey);

// Can this user SEE a given menu item?
export const canViewItem = (user, item) => {
  const role = roleOf(user);

  // Role portals: only the matching role.
  if (item.portal) return role === item.portal;
  // Settings: admin only.
  if (item.adminOnly) return role === ROLES.ADMIN;

  if (role === ROLES.ADMIN) return true;
  if (role === ROLES.PARENT) return false; // parents use portals only

  if (role === ROLES.TEACHER) {
    if (item.path === '/dashboard') return true; // scoped teacher dashboard
    if (item.moduleKey && !teacherCanSeeModule(item.moduleKey)) return false;
    const allow = listOf(user?.pageAccess);
    if (allow.includes('all')) return true;
    return allow.includes(String(item.label).toLowerCase());
  }

  // STAFF — page-access driven.
  const allow = listOf(user?.pageAccess);
  if (allow.includes('all')) return true;
  if (item.path === '/dashboard') return allow.includes('dashboard');
  return allow.includes(String(item.label).toLowerCase());
};

// Menu items visible to this user, in order.
export const visibleMenuItems = (user) => MENU_ITEMS.filter((i) => canViewItem(user, i));

// Where to land after login = first visible page.
export const firstAllowedPath = (user) => (visibleMenuItems(user)[0]?.path || '/dashboard');

// Can this user EDIT (add/edit/delete) records of a module label?
export const canEdit = (user, label) => {
  const role = roleOf(user);
  if (role === ROLES.ADMIN) return true;
  if (role === ROLES.TEACHER || role === ROLES.PARENT) return false; // read-only by design
  const e = listOf(user?.editAccess);
  return e.includes('all') || e.includes(String(label).toLowerCase());
};

// --------------------------- Row-level scoping -----------------------
// Keep only the last 10 digits so "+91 98765 43210" matches "9876543210".
export const normPhone = (s) => String(s ?? '').replace(/\D/g, '').slice(-10);
const normTxt = (s) => String(s ?? '').trim().toLowerCase();

// A teacher's assigned classes / sections (comma-separated on the login row).
export const teacherClasses = (user) =>
  String(user?.scopeClass || '').split(',').map((x) => normTxt(x)).filter(Boolean);
export const teacherSections = (user) =>
  String(user?.scopeSection || '').split(',').map((x) => normTxt(x)).filter(Boolean);

// Does a record (object keyed by header) belong to a parent's child?
export const recordBelongsToParent = (user, rowObj) => {
  const contact = normPhone(user?.contact);
  if (!contact) return false;
  return PARENT_PHONE_FIELDS.some((f) => normPhone(rowObj[f]) === contact);
};

// Filter raw rows (arrays) for the logged-in user's role.
// `headers` is the sheet header array; returns the rows this user may see.
export const scopeRows = (user, mod, headers, rows) => {
  const role = roleOf(user);
  if (role === ROLES.ADMIN || role === ROLES.STAFF) return rows;

  const classIdx = headers.indexOf(CLASS_FIELD);
  const sectionIdx = headers.indexOf(SECTION_FIELD);

  if (role === ROLES.TEACHER) {
    const classes = teacherClasses(user);
    const sections = teacherSections(user);
    // Module has no class column (e.g. Subjects) -> not student-PII, show all.
    if (classIdx < 0 || classes.length === 0) return rows;
    return rows.filter((r) => {
      if (!classes.includes(normTxt(r[classIdx]))) return false;
      if (sections.length && sectionIdx >= 0 && !sections.includes(normTxt(r[sectionIdx]))) return false;
      return true;
    });
  }

  if (role === ROLES.PARENT) {
    return rows.filter((r) => {
      const obj = headers.reduce((a, h, i) => ((a[h] = r[i]), a), {});
      return recordBelongsToParent(user, obj);
    });
  }
  return rows;
};

// Column indices a user may see (teachers don't see sensitive fields).
export const visibleColumnIdx = (user, headers) => {
  if (!isTeacher(user) || TEACHER_HIDDEN_FIELDS.length === 0) return headers.map((_, i) => i);
  return headers.map((_, i) => i).filter((i) => !TEACHER_HIDDEN_FIELDS.includes(headers[i]));
};
