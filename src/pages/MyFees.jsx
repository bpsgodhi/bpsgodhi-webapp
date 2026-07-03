import React, { useEffect, useMemo } from 'react';
import { Receipt, IndianRupee, CheckCircle2, AlertCircle, Inbox } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { getModule } from '../config';

const MONTH_ORDER = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

// Keep only the last 10 digits so "+91 98765 43210" matches "9876543210".
const norm = (s) => String(s ?? '').replace(/\D/g, '').slice(-10);

const toObjs = (sheet) =>
  sheet.rows.map((r) => sheet.headers.reduce((a, h, i) => ((a[h] = r[i]), a), {}));

const MyFees = () => {
  const { user } = useAuthStore();
  const { getSheet, fetchData, isLoading, sheets } = useDataStore();

  const admMod = getModule('admissions');
  const feeMod = getModule('feecollection');

  useEffect(() => {
    fetchData(admMod.sheet);
    fetchData(feeMod.sheet);
  }, [fetchData, admMod.sheet, feeMod.sheet]);

  const contact = norm(user?.contact);
  const loading = isLoading(admMod.sheet) || isLoading(feeMod.sheet);

  const groups = useMemo(() => {
    const students = toObjs(getSheet(admMod.sheet));
    const fees = toObjs(getSheet(feeMod.sheet));

    // Children of this parent — match father or mother mobile.
    const children = students.filter(
      (s) => contact && (norm(s['Father Mobile']) === contact || norm(s['Mother Mobile']) === contact)
    );
    const childAdms = new Set(children.map((c) => String(c['Admission No'] ?? '').trim()));

    // Fees that belong to this parent (by mobile or by their child's admission no).
    const myFees = fees.filter(
      (f) => norm(f['Father Mobile']) === contact || childAdms.has(String(f['Admission No'] ?? '').trim())
    );

    // Group fees per child (by Admission No, falling back to Student Name).
    const map = {};
    const labelFor = (c) => `${c['First Name'] || ''} ${c['Last Name'] || ''}`.trim();
    children.forEach((c) => {
      const adm = String(c['Admission No'] ?? '').trim();
      map[adm] = { adm, name: labelFor(c) || adm, cls: c['Class'], sec: c['Section'], fees: [] };
    });
    myFees.forEach((f) => {
      const adm = String(f['Admission No'] ?? '').trim();
      if (!map[adm]) map[adm] = { adm, name: f['Student Name'] || adm, cls: f['Class'], sec: f['Section'], fees: [] };
      map[adm].fees.push(f);
    });

    return Object.values(map).map((g) => {
      g.fees.sort((a, b) => MONTH_ORDER.indexOf(a['Month']) - MONTH_ORDER.indexOf(b['Month']));
      g.pendingAmt = g.fees.filter((f) => f['Status'] === 'Pending').reduce((s, f) => s + (Number(f['Amount']) || 0), 0);
      g.paidAmt = g.fees.filter((f) => f['Status'] === 'Paid').reduce((s, f) => s + (Number(f['Amount']) || 0), 0);
      return g;
    });
  }, [sheets, admMod.sheet, feeMod.sheet, contact]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPending = groups.reduce((s, g) => s + g.pendingAmt, 0);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg border border-sky-200 shadow-sm p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
            <Receipt className="text-sky-600" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">My Children's Fees</h1>
            <p className="text-xs text-slate-500">Month-wise paid / pending status</p>
          </div>
        </div>
        {totalPending > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Total Pending</p>
            <p className="text-xl font-bold text-red-600 flex items-center gap-1 justify-end"><IndianRupee size={18} />{totalPending}</p>
          </div>
        )}
      </div>

      {!contact ? (
        <div className="bg-white rounded-lg border border-sky-200 p-10 text-center text-slate-500">
          This page is for parent logins. Your account has no linked mobile number (Contact No in the Login sheet).
        </div>
      ) : loading ? (
        <div className="bg-white rounded-lg border border-sky-200 p-10 flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Loading...</span>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-lg border border-sky-200 p-10 text-center text-slate-500 flex flex-col items-center gap-2">
          <Inbox size={36} className="text-slate-300" />
          No student is linked to your mobile number ({user?.contact || '—'}). Ask the school to set your mobile as the Father/Mother Mobile in Admissions.
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.adm} className="bg-white rounded-lg border border-sky-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-sky-50 border-b border-sky-200 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-bold text-gray-900">{g.name}</h2>
                <p className="text-xs text-slate-500">Admission No: {g.adm || '—'} • Class {g.cls || '—'}{g.sec ? `-${g.sec}` : ''}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 size={16} /> Paid Rs.{g.paidAmt}</span>
                <span className="text-red-600 font-semibold flex items-center gap-1"><AlertCircle size={16} /> Pending Rs.{g.pendingAmt}</span>
              </div>
            </div>
            {g.fees.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">No fee records yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-sky-50">
                  <tr>
                    <th className="text-left font-bold text-sky-700 px-4 py-2.5 border-b border-sky-200">Month</th>
                    <th className="text-left font-bold text-sky-700 px-4 py-2.5 border-b border-sky-200">Session</th>
                    <th className="text-left font-bold text-sky-700 px-4 py-2.5 border-b border-sky-200">Amount</th>
                    <th className="text-left font-bold text-sky-700 px-4 py-2.5 border-b border-sky-200">Paid On</th>
                    <th className="text-left font-bold text-sky-700 px-4 py-2.5 border-b border-sky-200">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {g.fees.map((f, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-4 py-2.5 text-gray-700">{f['Month']}</td>
                      <td className="px-4 py-2.5 text-gray-700">{f['Session']}</td>
                      <td className="px-4 py-2.5 text-gray-700">Rs.{f['Amount']}</td>
                      <td className="px-4 py-2.5 text-gray-700">{f['Paid On'] || '—'}</td>
                      <td className="px-4 py-2.5">
                        {f['Status'] === 'Paid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold"><CheckCircle2 size={13} /> Paid</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold"><AlertCircle size={13} /> Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default MyFees;
