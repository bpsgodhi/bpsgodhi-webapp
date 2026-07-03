import { create } from 'zustand';
import toast from 'react-hot-toast';
import { fetchSheet, insertRow, updateRow, deleteRow } from '../utils/api';

// =====================================================================
//  Generic per-sheet cache with offline persistence.
//  sheets[sheetName] = { headers, rows, ts }
//
//  Data is mirrored to localStorage so the app opens INSTANTLY with the
//  last-known data and keeps working even when the Google Sheet sync is
//  slow or fails (network / Apps Script hiccup). A background refresh
//  updates it silently; on failure we keep showing the cached copy.
// =====================================================================
const CACHE_KEY = 'bps-sheet-cache';

const loadCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveCache = (sheets) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(sheets));
  } catch {
    /* quota exceeded — ignore, cache is best-effort */
  }
};

const useDataStore = create((set, get) => ({
  sheets: loadCache(), // hydrate from last session → instant first paint
  loading: {},

  getSheet: (name) => get().sheets[name] || { headers: [], rows: [] },
  isLoading: (name) => !!get().loading[name],
  // True only while a FIRST-EVER load is running (no cached data yet).
  isColdLoading: (name) => !!get().loading[name] && !get().sheets[name],
  lastSync: (name) => get().sheets[name]?.ts || null,

  fetchData: async (sheetName) => {
    set((s) => ({ loading: { ...s.loading, [sheetName]: true } }));
    try {
      const data = await fetchSheet(sheetName);
      let headers = [];
      let rows = [];
      if (data && data.length) {
        headers = data[0];
        rows = data.slice(1).reverse(); // newest first
      }
      set((s) => {
        const sheets = { ...s.sheets, [sheetName]: { headers, rows, ts: Date.now() } };
        saveCache(sheets);
        return { sheets, loading: { ...s.loading, [sheetName]: false } };
      });
    } catch (err) {
      console.error(err);
      // Only surface an error if we have NOTHING cached to show.
      if (!get().sheets[sheetName]) {
        toast.error(`Could not load "${sheetName}"`);
      }
      set((s) => ({ loading: { ...s.loading, [sheetName]: false } }));
    }
  },

  addRecord: async (mod, record) => {
    const res = await insertRow(mod.sheet, record, mod.autoId ? mod.idColumn : null, mod.idPrefix || '');
    await get().fetchData(mod.sheet);
    return res; // { success, generatedId }
  },

  editRecord: async (mod, matchValue, record) => {
    await updateRow(mod.sheet, mod.idColumn, matchValue, record);
    await get().fetchData(mod.sheet);
  },

  removeRecord: async (mod, matchValue) => {
    await deleteRow(mod.sheet, mod.idColumn, matchValue);
    await get().fetchData(mod.sheet);
  },
}));

export { useDataStore };
