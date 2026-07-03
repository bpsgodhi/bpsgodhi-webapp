import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, User, UserRound, BookOpen, CalendarClock, ArrowRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { getModule, scopeRows, teacherClasses, teacherSections } from '../config';

const toObjs = (sheet) => sheet.rows.map((r) => sheet.headers.reduce((a, h, i) => ((a[h] = r[i]), a), {}));

// Class-scoped dashboard for a class teacher. Deliberately shows NO fees / money.
const TeacherDashboard = () => {
  const { user } = useAuthStore();
  const { sheets, fetchData, getSheet } = useDataStore();
  const admMod = getModule('admissions');
  const ttMod = getModule('timetable');

  useEffect(() => {
    fetchData(admMod.sheet);
    if (ttMod) fetchData(ttMod.sheet);
  }, [fetchData, admMod.sheet, ttMod]);

  const classes = teacherClasses(user);
  const sections = teacherSections(user);

  const stats = useMemo(() => {
    const aSheet = getSheet(admMod.sheet);
    const students = scopeRows(user, admMod, aSheet.headers, aSheet.rows)
      .map((r) => aSheet.headers.reduce((a, h, i) => ((a[h] = r[i]), a), {}));

    const tSheet = ttMod ? getSheet(ttMod.sheet) : { headers: [], rows: [] };
    const periods = ttMod ? scopeRows(user, ttMod, tSheet.headers, tSheet.rows)
      .map((r) => tSheet.headers.reduce((a, h, i) => ((a[h] = r[i]), a), {})) : [];

    const g = (s) => String(s['Gender'] ?? '').trim().toLowerCase();
    const boys = students.filter((s) => g(s) === 'male').length;
    const girls = students.filter((s) => g(s) === 'female').length;

    const secMap = {};
    students.forEach((s) => {
      const k = String(s['Section'] ?? '').trim() || '—';
      secMap[k] = (secMap[k] || 0) + 1;
    });
    const bySection = Object.entries(secMap).map(([name, students]) => ({ name: `Sec ${name}`, students }));

    const subjects = [...new Set(periods.map((p) => String(p['Subject'] ?? '').trim()).filter(Boolean))];

    return { total: students.length, boys, girls, bySection, subjects };
  }, [sheets, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const scopeText = `${classes.map((c) => c.toUpperCase()).join(', ') || 'Not assigned'}${sections.length ? ' — Sec ' + sections.map((s) => s.toUpperCase()).join('/') : ''}`;

  const cards = [
    { label: 'My Students', value: stats.total, icon: Users, color: '#16437f' },
    { label: 'Boys', value: stats.boys, icon: User, color: '#6366f1' },
    { label: 'Girls', value: stats.girls, icon: UserRound, color: '#ec4899' },
    { label: 'Subjects', value: stats.subjects.length, icon: BookOpen, color: '#10b981' },
  ];

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-sky-600 to-sky-500 rounded-lg shadow-sm p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Users size={24} /> Welcome, {user?.name || 'Teacher'}</h1>
          <p className="text-sm text-sky-100">Class Teacher — {scopeText}</p>
        </div>
        <Link to="/my-students" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-sm font-semibold transition-colors w-fit">
          View Roster <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const I = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-lg border border-sky-200 shadow-sm p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: c.color }}>
                <I size={24} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900 leading-none truncate">{c.value}</p>
                <p className="text-xs font-medium text-slate-500 mt-1">{c.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-sky-200 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Students by Section</h2>
          {stats.bySection.length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">No students in your class yet.</p>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={stats.bySection} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="students" fill="#16437f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-sky-200 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5"><BookOpen size={15} className="text-sky-600" /> Subjects in My Class</h2>
          {stats.subjects.length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">No timetable/subjects added for your class yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stats.subjects.map((s) => (
                <span key={s} className="px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-sm font-medium">{s}</span>
              ))}
            </div>
          )}
          <Link to="/my-students" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-700">
            <CalendarClock size={15} /> Open full student roster <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
