import React, { useEffect, useMemo, useState } from 'react';
import { Users, Search, Inbox, Phone, User, Cake, VenetianMask, MapPin, Printer } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { getModule, scopeRows, teacherClasses, teacherSections, SCHOOL_NAME } from '../config';
import { printIdCard } from '../utils/print';

const toObjs = (sheet) =>
  sheet.rows.map((r) => sheet.headers.reduce((a, h, i) => ((a[h] = r[i]), a), {}));

const initials = (n) => String(n || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// Teacher portal — roster of the logged-in teacher's class(es). NO fee data.
const MyStudents = () => {
  const { user } = useAuthStore();
  const { getSheet, fetchData, isLoading, sheets } = useDataStore();
  const admMod = getModule('admissions');
  const [query, setQuery] = useState('');

  useEffect(() => { fetchData(admMod.sheet); }, [fetchData, admMod.sheet]);

  const loading = isLoading(admMod.sheet);
  const classes = teacherClasses(user);
  const sections = teacherSections(user);

  const students = useMemo(() => {
    const sheet = getSheet(admMod.sheet);
    const scoped = scopeRows(user, admMod, sheet.headers, sheet.rows);
    return scoped.map((r) => sheet.headers.reduce((a, h, i) => ((a[h] = r[i]), a), {}));
  }, [sheets, admMod, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      Object.values(s).some((v) => String(v ?? '').toLowerCase().includes(q)));
  }, [students, query]);

  const scopeText = `${classes.map((c) => c.toUpperCase()).join(', ') || 'Not assigned'}${sections.length ? ' — Section ' + sections.map((s) => s.toUpperCase()).join('/') : ''}`;

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-sky-600 to-sky-500 rounded-lg shadow-sm p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white/20 rounded-lg flex items-center justify-center"><Users size={24} /></div>
          <div>
            <h1 className="text-xl font-bold">My Students</h1>
            <p className="text-sm text-sky-100">Class {scopeText} • {students.length} students</p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-200" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name / father / mobile..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/15 placeholder-sky-100 text-white border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
          />
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-lg border border-amber-200 p-10 text-center text-amber-700 flex flex-col items-center gap-2">
          <Inbox size={36} className="text-amber-300" />
          No class is assigned to your account yet. Ask the admin to set your <b>Scope Class</b> (and Section) in Settings.
        </div>
      ) : loading ? (
        <div className="bg-white rounded-lg border border-sky-200 p-10 flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Loading...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-sky-200 p-10 text-center text-slate-500 flex flex-col items-center gap-2">
          <Inbox size={36} className="text-slate-300" />
          No students found for your class.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => {
            const name = `${s['First Name'] || ''} ${s['Last Name'] || ''}`.trim() || s['Admission No'];
            const photo = String(s['Student Photo'] || '');
            const hasPhoto = /^https?:\/\//i.test(photo);
            return (
              <div key={s['Admission No']} className="bg-white rounded-xl border border-sky-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 p-4 border-b border-sky-100 bg-sky-50/40">
                  {hasPhoto ? (
                    <img src={photo} alt={name} className="w-14 h-14 rounded-lg object-cover border border-sky-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-lg">{initials(name)}</div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{name}</p>
                    <p className="text-xs text-slate-500">{s['Admission No']} • Class {s['Class']}{s['Section'] ? `-${s['Section']}` : ''}</p>
                  </div>
                </div>
                <div className="p-4 space-y-1.5 text-sm">
                  <Row icon={VenetianMask} label="Gender" value={s['Gender']} />
                  <Row icon={Cake} label="DOB" value={s['Date of Birth']} />
                  <Row icon={User} label="Father" value={s['Father Name']} />
                  <Row icon={Phone} label="Mobile" value={s['Father Mobile']} />
                  <Row icon={MapPin} label="Address" value={s['Address']} />
                </div>
                <div className="px-4 pb-4">
                  <button
                    onClick={() => printIdCard(SCHOOL_NAME, s)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-sky-200 text-sky-700 bg-sky-50/50 hover:bg-sky-100 text-xs font-semibold transition-colors"
                  >
                    <Printer size={14} /> Print ID Card
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Row = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2 text-slate-600">
    <Icon size={14} className="text-sky-500 mt-0.5 shrink-0" />
    <span className="text-slate-400 w-14 shrink-0">{label}</span>
    <span className="text-gray-800 font-medium break-words">{value || '—'}</span>
  </div>
);

export default MyStudents;
