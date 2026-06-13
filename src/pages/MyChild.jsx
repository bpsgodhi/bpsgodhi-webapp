import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Inbox, User, Cake, VenetianMask, Phone, MapPin, IdCard,
  Receipt, CalendarClock, Printer, BadgeInfo, Users as UsersIcon,
} from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { getModule, recordBelongsToParent, SCHOOL_NAME } from '../config';
import { printIdCard } from '../utils/print';

const toObjs = (sheet) =>
  sheet.rows.map((r) => sheet.headers.reduce((a, h, i) => ((a[h] = r[i]), a), {}));

const initials = (n) => String(n || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// Parent portal — full profile of the parent's own child / children only.
const MyChild = () => {
  const { user } = useAuthStore();
  const { getSheet, fetchData, isLoading, sheets } = useDataStore();
  const admMod = getModule('admissions');

  useEffect(() => { fetchData(admMod.sheet); }, [fetchData, admMod.sheet]);

  const loading = isLoading(admMod.sheet);
  const hasContact = !!String(user?.contact || '').replace(/\D/g, '');

  const children = useMemo(() => {
    const students = toObjs(getSheet(admMod.sheet));
    return students.filter((s) => recordBelongsToParent(user, s));
  }, [sheets, admMod, user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-sky-600 to-sky-500 rounded-lg shadow-sm p-5 text-white">
        <h1 className="text-xl font-bold flex items-center gap-2"><GraduationCap size={24} /> My Child</h1>
        <p className="text-sm text-sky-100">Complete profile, class & fee status for your child{children.length > 1 ? 'ren' : ''}</p>
      </div>

      {!hasContact ? (
        <div className="bg-white rounded-lg border border-amber-200 p-10 text-center text-amber-700">
          Your account has no linked mobile number. Ask the school to set your mobile as the child's Father/Mother Mobile.
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
        children.map((c) => {
          const name = `${c['First Name'] || ''} ${c['Last Name'] || ''}`.trim() || c['Admission No'];
          const photo = String(c['Student Photo'] || '');
          const hasPhoto = /^https?:\/\//i.test(photo);
          return (
            <div key={c['Admission No']} className="bg-white rounded-xl border border-sky-200 shadow-sm overflow-hidden">
              {/* Banner */}
              <div className="p-5 bg-sky-50/60 border-b border-sky-100 flex items-center gap-4">
                {hasPhoto ? (
                  <img src={photo} alt={name} className="w-20 h-20 rounded-xl object-cover border border-sky-200 shadow-sm" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-2xl">{initials(name)}</div>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate">{name}</h2>
                  <p className="text-sm text-slate-500">Admission No: <b>{c['Admission No'] || '—'}</b></p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-sky-600 text-white text-xs font-semibold">
                    Class {c['Class'] || '—'}{c['Section'] ? `-${c['Section']}` : ''}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                <Section title="Student Details" icon={BadgeInfo}>
                  <Field icon={VenetianMask} label="Gender" value={c['Gender']} />
                  <Field icon={Cake} label="Date of Birth" value={c['Date of Birth']} />
                  <Field icon={IdCard} label="Caste / Category" value={c['Caste']} />
                  <Field icon={GraduationCap} label="Previous School" value={c['Previous School']} />
                </Section>
                <Section title="Parents & Contact" icon={UsersIcon}>
                  <Field icon={User} label="Father" value={c['Father Name']} />
                  <Field icon={Phone} label="Father Mobile" value={c['Father Mobile']} />
                  <Field icon={User} label="Mother" value={c['Mother Name']} />
                  <Field icon={Phone} label="Mother Mobile" value={c['Mother Mobile']} />
                  <Field icon={MapPin} label="Address" value={c['Address']} />
                </Section>
              </div>

              {/* Quick actions */}
              <div className="px-5 pb-5 flex flex-wrap gap-2">
                <Link to="/my-fees" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
                  <Receipt size={16} /> View Fees
                </Link>
                <Link to="/my-class" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
                  <CalendarClock size={16} /> Class & Timetable
                </Link>
                <button onClick={() => printIdCard(SCHOOL_NAME, c)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-sky-200 text-sky-700 bg-sky-50/50 hover:bg-sky-100 text-sm font-semibold transition-colors">
                  <Printer size={16} /> Print ID Card
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

const Section = ({ title, icon: Icon, children }) => (
  <div className="py-2">
    <h3 className="text-sm font-bold text-sky-700 flex items-center gap-1.5 mb-2"><Icon size={15} /> {title}</h3>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const Field = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2 text-sm">
    <Icon size={14} className="text-sky-500 mt-0.5 shrink-0" />
    <span className="text-slate-400 w-28 shrink-0">{label}</span>
    <span className="text-gray-800 font-medium break-words">{value || '—'}</span>
  </div>
);

export default MyChild;
