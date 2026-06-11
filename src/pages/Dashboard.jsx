import React, { useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { GraduationCap, IndianRupee, AlertCircle, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { MODULES, APP_NAME, getModule, canViewItem, firstAllowedPath } from '../config';

const PIE_COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const CLASS_ORDER = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const num = (v) => Number(String(v ?? '').replace(/[^\d.]/g, '')) || 0;
const toObjs = (sheet) => sheet.rows.map((r) => sheet.headers.reduce((a, h, i) => ((a[h] = r[i]), a), {}));

const Dashboard = () => {
  const { sheets, fetchData, getSheet } = useDataStore();
  const { user } = useAuthStore();
  const allowed = canViewItem(user, { path: '/dashboard', label: 'Dashboard' });

  useEffect(() => {
    if (allowed) MODULES.forEach((m) => fetchData(m.sheet));
  }, [fetchData, allowed]);

  if (!allowed) return <Navigate to={firstAllowedPath(user)} replace />;

  const admMod = getModule('admissions');
  const feeMod = getModule('feecollection');
  const famMod = getModule('families');

  const stats = useMemo(() => {
    const students = admMod ? toObjs(getSheet(admMod.sheet)) : [];
    const fees = feeMod ? toObjs(getSheet(feeMod.sheet)) : [];
    const families = famMod ? getSheet(famMod.sheet).rows.length : 0;

    const collected = fees.filter((f) => f['Status'] === 'Paid').reduce((s, f) => s + num(f['Amount']), 0);
    const pending = fees.filter((f) => f['Status'] === 'Pending').reduce((s, f) => s + num(f['Amount']), 0);
    const pendingCount = fees.filter((f) => f['Status'] === 'Pending').length;

    // Students per class.
    const clsMap = {};
    students.forEach((s) => {
      const c = String(s['Class'] ?? '').trim() || 'Unknown';
      clsMap[c] = (clsMap[c] || 0) + 1;
    });
    const byClass = CLASS_ORDER.filter((c) => clsMap[c]).map((c) => ({ name: c, students: clsMap[c] }));
    Object.keys(clsMap).filter((c) => !CLASS_ORDER.includes(c)).forEach((c) => byClass.push({ name: c, students: clsMap[c] }));

    return {
      totalStudents: students.length,
      collected, pending, pendingCount, families,
      byClass,
      feePie: [
        { name: 'Collected', value: collected },
        { name: 'Pending', value: pending },
      ].filter((d) => d.value > 0),
    };
  }, [sheets]); // eslint-disable-line react-hooks/exhaustive-deps

  const cards = [
    { label: 'Total Students', value: stats.totalStudents, icon: GraduationCap, color: '#0ea5e9' },
    { label: 'Fees Collected', value: `Rs. ${stats.collected.toLocaleString('en-IN')}`, icon: IndianRupee, color: '#10b981' },
    { label: 'Fees Pending', value: `Rs. ${stats.pending.toLocaleString('en-IN')}`, icon: AlertCircle, color: '#ef4444', sub: `${stats.pendingCount} pending dues` },
    { label: 'Families', value: stats.families, icon: Users, color: '#6366f1' },
  ];

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-sky-600 to-sky-500 rounded-lg shadow-sm p-5 text-white">
        <h1 className="text-xl font-bold flex items-center gap-2"><GraduationCap size={24} /> {APP_NAME}</h1>
        <p className="text-sm text-sky-100">School overview — students, fees & academics at a glance</p>
      </div>

      {/* Stat cards */}
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
                {c.sub && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{c.sub}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Students by class */}
        <div className="bg-white rounded-lg border border-sky-200 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Students by Class</h2>
          {stats.byClass.length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">No students yet.</p>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={stats.byClass} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="students" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Fees collected vs pending */}
        <div className="bg-white rounded-lg border border-sky-200 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Fees: Collected vs Pending</h2>
          {stats.feePie.length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">No fee records yet.</p>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={stats.feePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(d) => `Rs.${d.value}`}>
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip formatter={(v) => `Rs. ${Number(v).toLocaleString('en-IN')}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Per-module record counts */}
      <div className="bg-white rounded-lg border border-sky-200 shadow-sm p-4">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Records per Section</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {MODULES.map((m, i) => {
            const I = Icons[m.icon] || Icons.Table;
            return (
              <div key={m.key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                <I size={18} style={{ color: PIE_COLORS[i % PIE_COLORS.length] }} />
                <div>
                  <p className="text-base font-bold text-gray-900 leading-none">{getSheet(m.sheet).rows.length}</p>
                  <p className="text-[10px] text-slate-500">{m.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
