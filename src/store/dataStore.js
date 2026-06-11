import { create } from 'zustand';
import toast from 'react-hot-toast';
import { fetchSheet, insertRow, updateRow, deleteRow } from '../utils/api';

// Generic per-sheet cache: sheets[sheetName] = { headers, rows }
const useDataStore = create((set, get) => ({
  sheets: {},
  loading: {},

  getSheet: (name) => get().sheets[name] || { headers: [], rows: [] },
  isLoading: (name) => !!get().loading[name],

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
      set((s) => ({
        sheets: { ...s.sheets, [sheetName]: { headers, rows } },
        loading: { ...s.loading, [sheetName]: false },
      }));
    } catch (err) {
      console.error(err);
      toast.error(`Could not load "${sheetName}" from sheet`);
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
