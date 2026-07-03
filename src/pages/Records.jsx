import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Navigate, useSearchParams } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Plus, Search, Pencil, Trash2, Inbox, Filter, X as XIcon, MessageCircle, Download, Printer, ReceiptText, IdCard, Lock, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { confirm } from '../store/uiStore';
import RecordModal from '../components/RecordModal';
import { SkeletonTable } from '../components/Skeleton';
import {
  getModule, SCHOOL_NAME, canEdit, canViewItem, firstAllowedPath,
  scopeRows, visibleColumnIdx, isTeacher, teacherClasses, teacherSections,
} from '../config';
import { printReceipt, printIdCard, printTable } from '../utils/print';

const PAGE_SIZE = 25;

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

  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({}); // { fieldKey: selectedValue }
  const [modal, setModal] = useState(null); // { mode, initial }
  const [sort, setSort] = useState({ idx: null, dir: 1 }); // header index + direction
  const [page, setPage] = useState(1);
  const [hiddenCols, setHiddenCols] = useState(() => new Set());
  const [showColMenu, setShowColMenu] = useState(false);

  useEffect(() => {
    if (mod) fetchData(mod.sheet);
    // Deep-link: /m/<key>?q=<term> (from global search) pre-fills the search.
    setQuery(searchParams.get('q') || '');
    setFilters({});
    setSort({ idx: null, dir: 1 });
    setPage(1);
    setHiddenCols(new Set());
  }, [mod, fetchData, searchParams]);

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
  // Columns actually shown in the table (user can hide some for a cleaner view).
  const shownColIdx = colIdx.filter((i) => !hiddenCols.has(i));
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

  // Column sort (numeric-aware: "10" sorts after "9", dates/strings natural).
  const sorted = useMemo(() => {
    if (sort.idx == null) return filtered;
    const idx = sort.idx;
    const asNum = (v) => {
      const s = String(v ?? '').trim();
      if (!s) return null;
      const n = Number(s.replace(/[^\d.-]/g, ''));
      return Number.isFinite(n) && /\d/.test(s) ? n : null;
    };
    return [...filtered].sort((a, b) => {
      const an = asNum(a[idx]), bn = asNum(b[idx]);
      let c;
      if (an !== null && bn !== null) c = an - bn;
      else c = String(a[idx] ?? '').localeCompare(String(b[idx] ?? ''), undefined, { numeric: true, sensitivity: 'base' });
      return c * sort.dir;
    });
  }, [filtered, sort]);

  // Pagination.
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to first page whenever the result set changes.
  useEffect(() => { setPage(1); }, [query, filters, sort]);

  const toggleSort = (i) =>
    setSort((s) => (s.idx === i ? { idx: i, dir: -s.dir } : { idx: i, dir: 1 }));

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
    const ok = await confirm({
      title: `Delete this ${mod.label.replace(/s$/, '')}?`,
      message: 'This will permanently remove the record from the sheet. This cannot be undone.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
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
          <div className="relative">
            <button
              onClick={() => setShowColMenu((v) => !v)}
              title="Show / hide columns"
              className="px-3 py-2.5 rounded-lg border border-sky-200 text-sky-700 bg-sky-50/50 hover:bg-sky-100 font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <SlidersHorizontal size={17} /> <span className="hidden lg:inline">Columns</span>
            </button>
            {showColMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowColMenu(false)} />
                <div className="absolute right-0 mt-1 w-56 max-h-72 overflow-y-auto bg-white border border-sky-200 rounded-xl shadow-xl z-30 p-2 scrollbar-hide">
                  <p className="text-[11px] font-bold text-slate-400 uppercase px-2 py-1">Show columns</p>
                  {colIdx.map((i) => (
                    <label key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sky-50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={!hiddenCols.has(i)}
                        onChange={() => setHiddenCols((prev) => {
                          const next = new Set(prev);
                          next.has(i) ? next.delete(i) : next.add(i);
                          return next;
                        })}
                        className="accent-sky-600"
                      />
                      <span className="truncate text-gray-700">{headers[i]}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
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
          {loading && headers.length === 0 ? (
            <div className="p-3"><SkeletonTable rows={9} cols={Math.min(6, (mod.fields?.length || 5))} /></div>
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
                  {shownColIdx.map((i) => {
                    const isSorted = sort.idx === i;
                    return (
                      <th key={i} className="text-left font-bold text-sky-700 px-4 py-3 whitespace-nowrap border-b border-sky-200">
                        <button onClick={() => toggleSort(i)} className="inline-flex items-center gap-1 hover:text-sky-900 group">
                          {headers[i]}
                          {isSorted
                            ? (sort.dir === 1 ? <ChevronUp size={14} /> : <ChevronDown size={14} />)
                            : <ChevronsUpDown size={13} className="text-sky-300 group-hover:text-sky-500" />}
                        </button>
                      </th>
                    );
                  })}
                  <th className="text-right font-bold text-sky-700 px-4 py-3 whitespace-nowrap border-b border-sky-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((row, ri) => {
                  const rowObj = rowToObject(row);
                  const showWa = whatsAppApplies(mod.whatsapp, rowObj);
                  return (
                  <tr key={row[idIdx] ?? ri} className="hover:bg-sky-50/50 transition-colors border-b border-gray-100">
                    {shownColIdx.map((ci) => (
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

        {/* Pagination footer */}
        {!loading && sorted.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-sky-100 bg-sky-50/40 text-xs text-slate-500">
            <span>
              Showing <b className="text-slate-700">{(safePage - 1) * PAGE_SIZE + 1}</b>–<b className="text-slate-700">{Math.min(safePage * PAGE_SIZE, sorted.length)}</b> of <b className="text-slate-700">{sorted.length}</b>
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="p-1.5 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 font-semibold text-slate-600">Page {safePage} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="p-1.5 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
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
