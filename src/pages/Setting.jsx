import React, { useEffect, useState } from 'react';
import { Settings, UserCog, ShieldCheck, Plus, Pencil, Trash2, Eye, X, GraduationCap, Users, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchSheet, insertRow, updateRow, deleteRow } from '../utils/api';
import {
  LOGIN_SHEET, GRANTABLE_VIEW, GRANTABLE_EDIT, TEACHER_GRANTABLE_VIEW,
  PARENT_PORTAL_LABELS,
} from '../config';
import { useAuthStore } from '../store/authStore';

const blankUser = {
  'Full Name': '', 'Contact No': '', Email: '', Designation: '',
  'User ID': '', Password: '', Role: 'STAFF', viewAccess: [], editAccess: [],
  'Scope Class': '', 'Scope Section': '',
};

const parseList = (s, all) => {
  const v = String(s || '').trim();
  if (v.toUpperCase() === 'ALL') return [...all];
  return v.split(',').map((x) => x.trim()).filter(Boolean);
};

// Map a stored role to one of our 4 canonical roles (legacy USER -> STAFF).
const normRole = (r) => {
  const u = String(r || 'STAFF').toUpperCase();
  if (u === 'USER') return 'STAFF';
  return ['ADMIN', 'TEACHER', 'PARENT', 'STAFF'].includes(u) ? u : 'STAFF';
};

const ROLE_BADGE = {
  ADMIN: 'bg-indigo-100 text-indigo-700',
  TEACHER: 'bg-sky-100 text-sky-700',
  PARENT: 'bg-amber-100 text-amber-700',
  STAFF: 'bg-slate-100 text-slate-600',
};

const Setting = () => {
  const { user } = useAuthStore();
  const isAdmin = (user?.role || '').toUpperCase() === 'ADMIN';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(blankUser);
  const [editingId, setEditingId] = useState(null); // User ID being edited
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchSheet(LOGIN_SHEET);
      setUsers(data.slice(1));
    } catch (err) {
      console.error(err);
      toast.error('Could not load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg border border-sky-200 shadow-sm p-10 text-center text-slate-500">
        <ShieldCheck size={40} className="mx-auto text-sky-300 mb-3" />
        <p className="font-semibold text-gray-700">Admin access required</p>
        <p className="text-sm">You don't have permission to manage users.</p>
      </div>
    );
  }

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggle = (list, label) =>
    setForm((p) => ({
      ...p,
      [list]: p[list].includes(label) ? p[list].filter((l) => l !== label) : [...p[list], label],
    }));

  const resetForm = () => { setForm(blankUser); setEditingId(null); };

  const startEdit = (row) => {
    setEditingId(row[6]);
    setForm({
      'Full Name': row[2] || '', 'Contact No': row[3] || '', Email: row[4] || '',
      Designation: row[5] || '', 'User ID': row[6] || '', Password: row[7] || '',
      Role: normRole(row[8]),
      viewAccess: parseList(row[9], GRANTABLE_VIEW),
      editAccess: parseList(row[10], GRANTABLE_EDIT),
      'Scope Class': row[11] || '', 'Scope Section': row[12] || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (row) => {
    if (String(row[6]) === String(user?.username)) return toast.error("You can't delete your own account");
    if (!window.confirm(`Delete user "${row[2] || row[6]}"?`)) return;
    try {
      await deleteRow(LOGIN_SHEET, 'User ID', row[6]);
      toast.success('User deleted');
      loadUsers();
    } catch (err) { console.error(err); toast.error('Delete failed'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form['User ID'].trim() || !form.Password.trim() || !form['Full Name'].trim()) {
      toast.error('Full Name, User ID and Password are required');
      return;
    }
    if (form.Role === 'TEACHER' && !String(form['Scope Class']).trim()) {
      toast.error('Set the Scope Class for a teacher (e.g. 5)');
      return;
    }
    if (form.Role === 'PARENT' && !String(form['Contact No']).trim()) {
      toast.error("Set the parent's Contact No (must equal the child's Father/Mother Mobile)");
      return;
    }
    setSaving(true);

    // Derive Page Access / Edit Access from role.
    let pageAccess = '';
    let editAccess = '';
    if (form.Role === 'ADMIN') { pageAccess = 'ALL'; editAccess = 'ALL'; }
    else if (form.Role === 'PARENT') { pageAccess = PARENT_PORTAL_LABELS.join(', '); editAccess = ''; }
    else if (form.Role === 'TEACHER') { pageAccess = form.viewAccess.join(', '); editAccess = ''; }
    else { pageAccess = form.viewAccess.join(', '); editAccess = form.editAccess.join(', '); }

    const record = {
      'Full Name': form['Full Name'], 'Contact No': form['Contact No'], Email: form.Email,
      Designation: form.Designation, 'User ID': form['User ID'], Password: form.Password,
      Role: form.Role,
      'Page Access': pageAccess,
      'Edit Access': editAccess,
      'Scope Class': form.Role === 'TEACHER' ? form['Scope Class'] : '',
      'Scope Section': form.Role === 'TEACHER' ? form['Scope Section'] : '',
    };
    try {
      if (editingId) {
        await updateRow(LOGIN_SHEET, 'User ID', editingId, record);
        toast.success('User updated');
      } else {
        await insertRow(LOGIN_SHEET, record);
        toast.success('User added');
      }
      resetForm();
      loadUsers();
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const Chip = ({ active, onClick, children }) => (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${active ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-600 border-gray-200 hover:border-sky-300'}`}>
      {children}
    </button>
  );

  const isTeacher = form.Role === 'TEACHER';
  const isParent = form.Role === 'PARENT';
  const isStaff = form.Role === 'STAFF';
  const isAdminRole = form.Role === 'ADMIN';

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg border border-sky-200 shadow-sm p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
          <Settings className="text-sky-600" size={22} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Settings — Users & Access Control</h1>
          <p className="text-xs text-slate-500">Create Admin / Teacher / Parent / Staff logins and control exactly what each can see.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-sky-200 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <UserCog size={16} className="text-sky-600" /> {editingId ? `Edit User — ${editingId}` : 'Add New User'}
          </h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-xs font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1">
              <X size={14} /> Cancel edit
            </button>
          )}
        </div>

        {/* Role selector — big visual cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {[
            { v: 'STAFF', label: 'Staff', icon: UserCog, desc: 'Back-office, granted pages' },
            { v: 'TEACHER', label: 'Teacher', icon: Users, desc: 'Own class • no fees' },
            { v: 'PARENT', label: 'Parent', icon: GraduationCap, desc: 'Own child only' },
            { v: 'ADMIN', label: 'Admin', icon: ShieldCheck, desc: 'Full control' },
          ].map((r) => {
            const I = r.icon;
            const active = form.Role === r.v;
            return (
              <button type="button" key={r.v} onClick={() => setField('Role', r.v)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${active ? 'border-sky-600 bg-sky-50' : 'border-gray-200 hover:border-sky-300 bg-white'}`}>
                <I size={18} className={active ? 'text-sky-600' : 'text-slate-400'} />
                <p className={`mt-1 font-bold text-sm ${active ? 'text-sky-700' : 'text-gray-700'}`}>{r.label}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{r.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            ['Full Name', 'text'], ['Contact No', 'tel'], ['Email', 'email'],
            ['Designation', 'text'], ['User ID', 'text'], ['Password', 'text'],
          ].map(([label, type]) => (
            <div key={label} className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{label}{label === 'Contact No' && isParent && <span className="text-amber-600 font-semibold"> (must equal child's mobile)</span>}</label>
              <input
                type={type}
                value={form[label]}
                disabled={label === 'User ID' && !!editingId}
                onChange={(e) => setField(label, e.target.value)}
                className={`block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all ${label === 'User ID' && editingId ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50 focus:bg-white'}`}
              />
            </div>
          ))}
        </div>

        {/* Teacher scope */}
        {isTeacher && (
          <div className="mt-5 p-4 rounded-xl bg-sky-50 border border-sky-200">
            <p className="text-sm font-bold text-sky-700 flex items-center gap-1.5 mb-3"><Users size={15} /> Class Assignment (row-level scope)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Scope Class <span className="text-slate-400">(e.g. 5 — comma for many)</span></label>
                <input value={form['Scope Class']} onChange={(e) => setField('Scope Class', e.target.value)} placeholder="5" className="block w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Scope Section <span className="text-slate-400">(optional — blank = all)</span></label>
                <input value={form['Scope Section']} onChange={(e) => setField('Scope Section', e.target.value)} placeholder="A" className="block w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
            </div>
            <p className="text-[11px] text-sky-700/70 mt-2">The teacher will only see students of this class/section. Fee & family data are always hidden from teachers.</p>
          </div>
        )}

        {/* View / Edit access — staff & teacher only */}
        {(isStaff || isTeacher) && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Eye size={15} className="text-sky-600" /> View Access — pages this user can open</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(isTeacher ? TEACHER_GRANTABLE_VIEW : GRANTABLE_VIEW).map((label) => (
                  <Chip key={label} active={form.viewAccess.includes(label)} onClick={() => toggle('viewAccess', label)}>{label}</Chip>
                ))}
              </div>
            </div>
            {isStaff && (
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Pencil size={14} className="text-emerald-600" /> Edit Access — pages this user can add / edit / delete</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {GRANTABLE_EDIT.map((label) => {
                    const disabled = !form.viewAccess.includes(label);
                    return (
                      <button type="button" key={label} disabled={disabled}
                        onClick={() => toggle('editAccess', label)}
                        title={disabled ? 'Give View access first' : ''}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${form.editAccess.includes(label) ? 'bg-emerald-600 text-white border-emerald-600' : disabled ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {isTeacher && <p className="text-[11px] text-slate-400">Teachers are read-only by design — they can view their class but not add/edit/delete records.</p>}
          </div>
        )}

        {isParent && (
          <p className="mt-5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
            <Receipt size={15} className="shrink-0 mt-0.5" />
            Parents automatically see only their own child via the <b>Contact No</b> (which must equal the child's Father/Mother Mobile in Admissions). They get the My Child, Fees & Class pages — nothing else.
          </p>
        )}

        {isAdminRole && (
          <p className="mt-5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
            Admins automatically get full view + edit access to all pages and Settings.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          {editingId && (
            <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50">Cancel</button>
          )}
          <button type="submit" disabled={saving}
            className={`px-6 py-2.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-all flex items-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}>
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Saving...</>
            ) : (
              <><Plus size={18} /> {editingId ? 'Update User' : 'Add User'}</>
            )}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg border border-sky-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-sky-100">
          <h2 className="text-sm font-bold text-gray-900">Existing Users ({users.length})</h2>
        </div>
        <div className="overflow-auto">
          {loading ? (
            <div className="py-10 text-center text-slate-400 text-sm">Loading...</div>
          ) : users.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">No users found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-sky-50">
                <tr>
                  {['Name', 'User ID', 'Role', 'Scope', 'View Access', 'Actions'].map((h) => (
                    <th key={h} className={`font-bold text-sky-700 px-4 py-3 whitespace-nowrap ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((row, i) => {
                  const role = normRole(row[8]);
                  const scope = role === 'TEACHER'
                    ? `${row[11] || '—'}${row[12] ? '-' + row[12] : ''}`
                    : role === 'PARENT' ? (row[3] || '—') : '—';
                  return (
                    <tr key={i} className="hover:bg-sky-50/50 border-b border-gray-100">
                      <td className="px-4 py-2.5 text-gray-700">{row[2]}</td>
                      <td className="px-4 py-2.5 text-gray-700">{row[6]}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ROLE_BADGE[role]}`}>{role}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{scope}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[220px] truncate" title={row[9]}>{row[9] || '—'}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => startEdit(row)} className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-100" title="Edit"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Delete"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Setting;
