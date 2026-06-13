import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Plus, Search, Pencil, Trash2, Inbox, Filter, X as XIcon, MessageCircle, Download, Printer, ReceiptText, IdCard, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import RecordModal from '../components/RecordModal';
import {
  getModule, SCHOOL_NAME, canEdit, canViewItem, firstAllowedPath,
  scopeRows, visibleColumnIdx, isTeacher, teacherClasses, teacherSections,
} from '../config';
import { printReceipt, printIdCard, printTable } from '../utils/print';

// Render a cell — clickable link for pasted Drive / image URLs, plain text otherwise.
const Cell = ({ value }) => {
  const str = String(value ?? '');
  if (/^https?:\/\//i.test(str)) {
    return (
      <a
        href={str}
        target="_blank"
        rel="noreferrer"
        className="text-sky-600 underline hover:text-sky-700"
      >
        View
      </a>
    );
  }
  return <>{str}</>;
};

// Build a WhatsApp click-to-chat URL from a module's `whatsapp` config + a row object.
// Template placeholders like {Student Name} are filled from the row's column values.
const buildWhatsAppUrl = (wa, rowObj) => {
  let phone = String(rowObj[wa.phoneField] ?? '').replace(/\D/g, '');
  if (phone.length === 10) phone = '91' + phone; // default to India country code
  const msg = String(wa.template || '').replace(/\{([^}]+)\}/g, (_, k) => String(rowObj[k.trim()] ?? ''));
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
};

const whatsAppApplies = (wa, rowObj) => {
  if (!wa) return false;
  if (!String(rowObj[wa.phoneField] ?? '').replace(/\D/g, '')) return false;
  if (wa.onlyWhen) return String(rowObj[wa.onlyWhen.field] ?? '').trim() === wa.onlyWhen.equals;
  return true;
};

const Records = () => {
  const { key } = useParams();
  const mod = getModule(key);
  const { user } = useAuthStore();
  const editable = canEdit(user, mod?.label);
  const { getSheet, isLoading, fetchData, addRecord, editRecord, removeRecord } = useDataStore();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({}); // { fieldKey: selectedValue }
  const [modal, setModal] = useState(null); // { mode, initial }

  useEffect(() => {
    if (mod) fetchData(mod.sheet);
    setQuery('');
    setFilters({});
  }, [mod, fetchData]);

  if (!mod) {
    return <div className="bg-white rounded-lg border border-sky-200 p-10 text-center text-slate-500">Unknown page.</div>;
  }

  // Role guard: e.g. teachers cannot open financial modules even via URL.
  if (!canViewItem(user, { path: `/m/${mod.key}`, label: mod.label, moduleKey: mod.key })) {
    return <Navigate to={firstAllowedPath(user)} replace />;
  }

  const { headers, rows: rawRows } = getSheet(mod.sheet);
  // Row-level scoping: teachers see only their class, parents only their child.
  const rows = scopeRows(user, mod, headers, rawRows);
  // Column-level: teachers don't see sensitive columns (Aadhaar etc.).
  const colIdx = visibleColumnIdx(user, headers);
  const visibleHeaders = colIdx.map((i) => headers[i]);
  const loading = isLoading(mod.sheet);
  const ModIcon = Icons[mod.icon] || Icons.Table;
  const idIdx = headers.indexOf(mod.idColumn);

  // Teacher scope label for the header ("Class 5-A").
  const scopeLabel = isTeacher(user)
    ? `${teacherClasses(user).map((c) => c.toUpperCase()).join(', ') || 'your class'}${teacherSections(user).length ? ' — Sec ' + teacherSections(user).map((s) => s.toUpperCase()).join('/') : ''}`
    : '';

  // Fields the config marks as filterable -> dropdown filters above the table.
  const filterFields = (mod.fields || []).filter((f) => f.filterable);

  // Options for a filter dropdown: explicit config options, else distinct
  // values found in that column (so lookup/dynamic columns also filter).
  const filterOptions = (f) => {
    if (f.options && f.options.length) return f.options;
    const ci = headers.indexOf(f.key);
    if (ci < 0) return [];
    return [...new Set(rows.map((r) => String(r[ci] ?? '').trim()).filter(Boolean))].sort();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      // Column filters (exact match against the matching header value).
      for (const f of filterFields) {
        const val = filters[f.key];
        if (!val) continue;
        const ci = headers.indexOf(f.key);
        if (ci < 0) continue;
        if (String(row[ci] ?? '').trim() !== val) return false;
      }
      // Free-text search across all columns.
      if (q && !row.some((c) => String(c ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, query, filters, headers, filterFields]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const rowToObject = (row) => headers.reduce((acc, h, i) => ({ ...acc, [h]: row[i] }), {});

  const handleAdd = async (form) => {
    const res = await addRecord(mod, form);
    toast.success(`Saved${res?.generatedId ? ` (${res.generatedId})` : ''}`);
  };

  const handleEdit = async (form) => {
    const matchValue = modal.initial[mod.idColumn];
    await editRecord(mod, matchValue, form);
    toast.success('Updated');
  };

  // Export/print only the columns this user is allowed to see.
  const projectRow = (r) => colIdx.map((i) => r[i]);

  const handleExport = () => {
    if (!headers.length) return toast.error('Nothing to export');
    const ws = XLSX.utils.aoa_to_sheet([visibleHeaders, ...filtered.map(projectRow)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, mod.label.slice(0, 31));
    XLSX.writeFile(wb, `${mod.label}.xlsx`);
    toast.success('Exported to Excel');
  };

  const handlePrintList = () => {
    if (!filtered.length) return toast.error('Nothing to print');
    printTable(SCHOOL_NAME, mod.label, visibleHeaders, filtered.map(projectRow));
  };

  const handleDelete = async (row) => {
    const matchValue = idIdx >= 0 ? row[idIdx] : null;
    if (matchValue == null) return toast.error('No ID column to delete by');
    if (!window.confirm(`Delete this ${mod.label.replace(/s$/, '')}?`)) return;
    try {
      await removeRecord(mod, matchValue);
      toast.success('Deleted');
    } catch (err) {
      console.error(err);
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-3 flex flex-col min-h-0 flex-1">
      {/* Header */}
      <div className="bg-white rounded-lg border border-sky-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
            <ModIcon className="text-sky-600" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{mod.label}</h1>
            <p className="text-xs text-slate-500">
              {rows.length} record{rows.length !== 1 ? 's' : ''}
              {scopeLabel && <span className="ml-1.5 inline-flex items-center gap-1 text-sky-700 font-semibold"><Lock size={11} /> {scopeLabel}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={handleExport}
            title="Export to Excel"
            className="px-3 py-2.5 rounded-lg border border-sky-200 text-sky-700 bg-sky-50/50 hover:bg-sky-100 font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download size={17} /> <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handlePrintList}
            title="Print list"
            className="px-3 py-2.5 rounded-lg border border-sky-200 text-sky-700 bg-sky-50/50 hover:bg-sky-100 font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Printer size={17} /> <span className="hidden sm:inline">Print</span>
          </button>
          {editable ? (
            <button
              onClick={() => setModal({ mode: 'add', initial: null })}
              className="px-4 py-2.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Plus size={18} /> Add
            </button>
          ) : (
            <span className="px-3 py-2.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-semibold whitespace-nowrap">View only</span>
          )}
        </div>
      </div>

      {/* Filter bar (only for modules that define filterable fields) */}
      {filterFields.length > 0 && (
        <div className="bg-white rounded-lg border border-sky-200 shadow-sm p-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 mr-1">
            <Filter size={14} /> Filter
          </span>
          {filterFields.map((f) => (
            <select
              key={f.key}
              value={filters[f.key] || ''}
              onChange={(e) => setFilters((p) => ({ ...p, [f.key]: e.target.value }))}
              className={`px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all ${filters[f.key] ? 'bg-sky-50 border-sky-300 text-sky-700 font-medium' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
            >
              <option value="">{f.label}: All</option>
              {filterOptions(f).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ))}
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters({})}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              <XIcon size={14} /> Clear ({activeFilterCount})
            </button>
          )}
          <span className="ml-auto text-xs text-slate-500">{filtered.length} match{filtered.length !== 1 ? 'es' : ''}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-sky-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Loading...</span>
            </div>
          ) : headers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Inbox size={36} />
              <span className="text-sm">No data. Ensure the "{mod.sheet}" sheet has a header row.</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Inbox size={36} />
              <span className="text-sm">No matching records.</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-sky-50 sticky top-0 z-10">
                <tr>
                  {colIdx.map((i) => (
                    <th key={i} className="text-left font-bold text-sky-700 px-4 py-3 whitespace-nowrap border-b border-sky-200">{headers[i]}</th>
                  ))}
                  <th className="text-right font-bold text-sky-700 px-4 py-3 whitespace-nowrap border-b border-sky-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, ri) => {
                  const rowObj = rowToObject(row);
                  const showWa = whatsAppApplies(mod.whatsapp, rowObj);
                  return (
                  <tr key={ri} className="hover:bg-sky-50/50 transition-colors border-b border-gray-100">
                    {colIdx.map((ci) => (
                      <td key={ci} className="px-4 py-2.5 text-gray-700 whitespace-nowrap"><Cell value={row[ci]} /></td>
                    ))}
                    <td className="px-4 py-2.5 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        {showWa && (
                          <a
                            href={buildWhatsAppUrl(mod.whatsapp, rowObj)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors"
                            title="Send WhatsApp reminder"
                          >
                            <MessageCircle size={14} /> {mod.whatsapp.label || 'WhatsApp'}
                          </a>
                        )}
                        {mod.printable === 'receipt' && (
                          <button
                            onClick={() => printReceipt(SCHOOL_NAME, rowObj)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Print fee receipt"
                          >
                            <ReceiptText size={16} />
                          </button>
                        )}
                        {mod.printable === 'idcard' && (
                          <button
                            onClick={() => printIdCard(SCHOOL_NAME, rowObj)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Print ID card"
                          >
                            <IdCard size={16} />
                          </button>
                        )}
                        {editable && (
                          <>
                            <button
                              onClick={() => setModal({ mode: 'edit', initial: rowObj })}
                              className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-100 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(row)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
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

      {modal && (
        <RecordModal
          mod={mod}
          mode={modal.mode}
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSubmit={modal.mode === 'edit' ? handleEdit : handleAdd}
        />
      )}
    </div>
  );
};

export default Records;
