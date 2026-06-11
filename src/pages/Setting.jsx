import React, { useEffect, useState } from 'react';
import { Settings, UserCog, ShieldCheck, Plus, Pencil, Trash2, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchSheet, insertRow, updateRow, deleteRow } from '../utils/api';
import { LOGIN_SHEET, GRANTABLE_VIEW, GRANTABLE_EDIT } from '../config';
import { useAuthStore } from '../store/authStore';

const blankUser = {
  'Full Name': '', 'Contact No': '', Email: '', Designation: '',
  'User ID': '', Password: '', Role: 'USER', viewAccess: [], editAccess: [],
};

const parseList = (s, all) => {
  const v = String(s || '').trim();
  if (v.toUpperCase() === 'ALL') return [...all];
  return v.split(',').map((x) => x.trim()).filter(Boolean);
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
      Role: String(row[8] || 'USER').toUpperCase(),
      viewAccess: parseList(row[9], GRANTABLE_VIEW),
      editAccess: parseList(row[10], GRANTABLE_EDIT),
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
    setSaving(true);
    const record = {
      'Full Name': form['Full Name'], 'Contact No': form['Contact No'], Email: form.Email,
      Designation: form.Designation, 'User ID': form['User ID'], Password: form.Password,
      Role: form.Role,
      'Page Access': form.Role === 'ADMIN' ? 'ALL' : form.viewAccess.join(', '),
      'Edit Access': form.Role === 'ADMIN' ? 'ALL' : form.editAccess.join(', '),
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

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg border border-sky-200 shadow-sm p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
          <Settings className="text-sky-600" size={22} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Settings — Users & Access Control</h1>
          <p className="text-xs text-slate-500">Create staff/parent logins and control which pages they can view and edit.</p>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            ['Full Name', 'text'], ['Contact No', 'tel'], ['Email', 'email'],
            ['Designation', 'text'], ['User ID', 'text'], ['Password', 'text'],
          ].map(([label, type]) => (
            <div key={label} className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{label}{label === 'Contact No' && <span className="text-slate-400"> (parent: child's mobile)</span>}</label>
              <input
                type={type}
                value={form[label]}
                disabled={label === 'User ID' && !!editingId}
                onChange={(e) => setField(label, e.target.value)}
                className={`block w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all ${label === 'User ID' && editingId ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50 focus:bg-white'}`}
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <select value={form.Role} onChange={(e) => setField('Role', e.target.value)}
              className="block w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all">
              <option value="USER">USER (Staff / Parent)</option>
              <option value="ADMIN">ADMIN (Super Admin)</option>
            </select>
          </div>
        </div>

        {form.Role === 'USER' ? (
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Eye size={15} className="text-sky-600" /> View Access — pages this user can open</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {GRANTABLE_VIEW.map((label) => (
                  <Chip key={label} active={form.viewAccess.includes(label)} onClick={() => toggle('viewAccess', label)}>{label}</Chip>
                ))}
              </div>
            </div>
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
              <p className="text-[11px] text-slate-400 mt-1.5">Pages with View but not Edit are read-only. Parents: give View = "My Fees, My Class" only, no Edit.</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
            Admins automatically get full view + edit access to all pages.
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
                  {['Name', 'User ID', 'Role', 'View Access', 'Edit Access', 'Actions'].map((h) => (
                    <th key={h} className={`font-bold text-sky-700 px-4 py-3 whitespace-nowrap ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((row, i) => (
                  <tr key={i} className="hover:bg-sky-50/50 border-b border-gray-100">
                    <td className="px-4 py-2.5 text-gray-700">{row[2]}</td>
                    <td className="px-4 py-2.5 text-gray-700">{row[6]}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${String(row[8]).toUpperCase() === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                        {String(row[8] || 'USER').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[220px] truncate" title={row[9]}>{row[9] || '—'}</td>
                    <td className="px-4 py-2.5 text-emerald-600 text-xs max-w-[200px] truncate" title={row[10]}>{row[10] || '—'}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => startEdit(row)} className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-100" title="Edit"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Setting;
