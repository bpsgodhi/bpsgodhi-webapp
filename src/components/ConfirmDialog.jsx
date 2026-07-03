import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

// Branded confirm modal driven by uiStore. Mounted once at app root.
const ConfirmDialog = () => {
  const { confirmState, _resolveConfirm } = useUIStore();

  useEffect(() => {
    if (!confirmState) return;
    const onKey = (e) => {
      if (e.key === 'Escape') _resolveConfirm(false);
      if (e.key === 'Enter') _resolveConfirm(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmState, _resolveConfirm]);

  if (!confirmState) return null;
  const { title, message, confirmText, cancelText, danger } = confirmState;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => _resolveConfirm(false)} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-scale-in">
        <button onClick={() => _resolveConfirm(false)} className="absolute top-3 right-3 p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
          <X size={18} />
        </button>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${danger ? 'bg-red-100' : 'bg-sky-100'}`}>
          <AlertTriangle size={24} className={danger ? 'text-red-600' : 'text-sky-600'} />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {message && <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{message}</p>}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => _resolveConfirm(false)}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={() => _resolveConfirm(true)}
            autoFocus
            className={`flex-1 py-2.5 rounded-lg text-white font-semibold shadow-sm transition-all ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-sky-600 hover:bg-sky-700'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
