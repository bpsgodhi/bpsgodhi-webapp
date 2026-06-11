import React, { useEffect, useMemo } from 'react';
import { CalendarClock, BookOpen, User, Inbox } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { getModule } from '../config';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const norm = (s) => String(s ?? '').replace(/\D/g, '').slice(-10);

const toObjs = (sheet) =>
  sheet.rows.map((r) => sheet.headers.reduce((a, h, i) => ((a[h] = r[i]), a), {}));

const MyClass = () => {
  const { user } = useAuthStore();
  const { getSheet, fetchData, isLoading, sheets } = useDataStore();

  const admMod = getModule('admissions');
  const ttMod = getModule('timetable');

  useEffect(() => {
    fetchData(admMod.sheet);
    fetchData(ttMod.sheet);
  }, [fetchData, admMod.sheet, ttMod.sheet]);

  const contact = norm(user?.contact);
  const loading = isLoading(admMod.sheet) || isLoading(ttMod.sheet);

  const children = useMemo(() => {
    const students = toObjs(getSheet(admMod.sheet));
    const tt = toObjs(getSheet(ttMod.sheet));

    const mine = students.filter(
      (s) => contact && (norm(s['Father Mobile']) === contact || norm(s['Mother Mobile']) === contact)
    );

    return mine.map((c) => {
      const cls = String(c['Class'] ?? '').trim();
      const sec = String(c['Section'] ?? '').trim();
      const periods = tt.filter(
        (t) => String(t['Class'] ?? '').trim() === cls && (!sec || String(t['Section'] ?? '').trim() === sec)
      );

      // Distinct Subject -> Teacher list.
      const subjMap = {};
      periods.forEach((p) => {
        const subj = String(p['Subject'] ?? '').trim();
        if (subj && !subjMap[subj]) subjMap[subj] = p['Teacher Name'] || '—';
      });

      // Timetable grouped by day, sorted Mon..Sat.
      const byDay = {};
      periods.forEach((p) => {
        const d = p['Day'] || 'Other';
        (byDay[d] = byDay[d] || []).push(p);
      });
      const days = Object.keys(byDay)
        .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
        .map((d) => ({ day: d, rows: byDay[d] }));

      return {
        adm: String(c['Admission No'] ?? '').trim(),
        name: `${c['First Name'] || ''} ${c['Last Name'] || ''}`.trim() || c['Admission No'],
        cls, sec,
        subjects: Object.entries(subjMap).map(([subject, teacher]) => ({ subject, teacher })),
        days,
      };
    });
  }, [sheets, admMod.sheet, ttMod.sheet, contact]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg border border-sky-200 shadow-sm p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
          <CalendarClock className="text-sky-600" size={22} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">My Child's Class</h1>
          <p className="text-xs text-slate-500">Subjects, teachers & weekly timetable</p>
        </div>
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
      ) : children.length === 0 ? (
        <div className="bg-white rounded-lg border border-sky-200 p-10 text-center text-slate-500 flex flex-col items-center gap-2">
          <Inbox size={36} className="text-slate-300" />
          No student is linked to your mobile number ({user?.contact || '—'}). Ask the school to set your mobile as the Father/Mother Mobile in Admissions.
        </div>
      ) : (
        children.map((c) => (
          <div key={c.adm} className="bg-white rounded-lg border border-sky-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-sky-50 border-b border-sky-200">
              <h2 className="font-bold text-gray-900">{c.name}</h2>
              <p className="text-xs text-slate-500">Class {c.cls || '—'}{c.sec ? `-${c.sec}` : ''}</p>
            </div>

            <div className="p-4 space-y-4">
              {/* Subject -> Teacher */}
              <div>
                <h3 className="text-sm font-bold text-sky-700 flex items-center gap-1.5 mb-2"><BookOpen size={15} /> Subjects & Teachers</h3>
                {c.subjects.length === 0 ? (
                  <p className="text-sm text-slate-400">No subjects/timetable added for this class yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {c.subjects.map((s) => (
                      <div key={s.subject} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50">
                        <span className="font-medium text-gray-800">{s.subject}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1"><User size={12} /> {s.teacher}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Weekly timetable */}
              {c.days.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-sky-700 flex items-center gap-1.5 mb-2"><CalendarClock size={15} /> Weekly Timetable</h3>
                  <div className="space-y-3">
                    {c.days.map((d) => (
                      <div key={d.day} className="border border-gray-100 rounded-lg overflow-hidden">
                        <div className="px-3 py-1.5 bg-sky-100/60 text-sky-700 font-semibold text-xs">{d.day}</div>
                        <table className="w-full text-sm">
                          <tbody>
                            {d.rows.map((p, i) => (
                              <tr key={i} className="border-b border-gray-50 last:border-0">
                                <td className="px-3 py-2 text-slate-500 whitespace-nowrap w-36">{p['Period Time']}</td>
                                <td className="px-3 py-2 font-medium text-gray-800">{p['Subject']}</td>
                                <td className="px-3 py-2 text-slate-500 text-right whitespace-nowrap">{p['Teacher Name'] || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MyClass;
