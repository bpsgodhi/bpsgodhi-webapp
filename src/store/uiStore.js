import { create } from 'zustand';

// =====================================================================
//  Small UI store for app-wide primitives.
//  `confirm()` returns a Promise<boolean> so callers can simply do:
//     if (await confirm({ title, message })) { ...proceed }
//  replacing the native window.confirm() with a branded modal.
// =====================================================================
let resolver = null;

const useUIStore = create((set) => ({
  confirmState: null, // { title, message, confirmText, cancelText, danger }

  confirm: (opts = {}) =>
    new Promise((resolve) => {
      resolver = resolve;
      set({
        confirmState: {
          title: opts.title || 'Are you sure?',
          message: opts.message || '',
          confirmText: opts.confirmText || 'Confirm',
          cancelText: opts.cancelText || 'Cancel',
          danger: opts.danger || false,
        },
      });
    }),

  _resolveConfirm: (result) => {
    if (resolver) resolver(result);
    resolver = null;
    set({ confirmState: null });
  },
}));

// Convenience export so non-component code can call confirm() directly.
export const confirm = (opts) => useUIStore.getState().confirm(opts);
export { useUIStore };
