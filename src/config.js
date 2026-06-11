// =====================================================================
//  Derives everything from src/app.config.json (the single source of
//  truth). To change the app, edit app.config.json — not this file.
// =====================================================================
import appConfig from './app.config.json';

export const APP_NAME = appConfig.appName;
export const THEME = appConfig.theme || 'sky';
export const AUTH_ENABLED = appConfig.auth !== false;
export const LOGIN_SHEET = appConfig.loginSheet || 'Login';

export const MODULES = appConfig.modules || [];

// Full ordered column list for a module's sheet (matches gen-database.cjs).
export const moduleColumns = (mod) => {
  const cols = ['Timestamp'];
  if (mod.autoId) cols.push(mod.idColumn);
  mod.fields.forEach((f) => cols.push(f.key));
  return cols;
};

export const getModule = (key) => MODULES.find((m) => m.key === key);

// Sidebar / routes.
export const MENU_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  ...MODULES.map((m) => ({ path: `/m/${m.key}`, label: m.label, icon: m.icon || 'Table' })),
  // Parent-portal pages (scoped to the logged-in parent's mobile). Hidden from
  // ADMIN; shown to a USER only if listed in their Page Access column.
  { path: '/my-fees', label: 'My Fees', icon: 'Receipt', userOnly: true },
  { path: '/my-class', label: 'My Class', icon: 'CalendarClock', userOnly: true },
  { path: '/setting', label: 'Setting', icon: 'Settings', adminOnly: true },
];

// Login sheet column order (must match Code.gs + gen-database.cjs).
export const LOGIN_HEADERS = [
  'Timestamp', 'Serial No', 'Full Name', 'Contact No', 'Email',
  'Designation', 'User ID', 'Password', 'Role', 'Page Access', 'Edit Access',
];

// Pages an admin can grant VIEW access to (Dashboard + every module + parent pages).
export const GRANTABLE_VIEW = ['Dashboard', ...MODULES.map((m) => m.label), 'My Fees', 'My Class'];
// Pages an admin can grant EDIT (add/edit/delete) access to — data modules only.
export const GRANTABLE_EDIT = MODULES.map((m) => m.label);

// ----------------------- Access-control helpers ----------------------
const listOf = (s) => String(s || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);

export const isAdmin = (user) => String(user?.role || '').toUpperCase() === 'ADMIN';

// Can this user SEE a given menu item?
export const canViewItem = (user, item) => {
  if (item.userOnly && isAdmin(user)) return false; // parent pages hidden from admin
  if (isAdmin(user)) return true;
  if (item.adminOnly) return false;
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
  if (isAdmin(user)) return true;
  const e = listOf(user?.editAccess);
  return e.includes('all') || e.includes(String(label).toLowerCase());
};
