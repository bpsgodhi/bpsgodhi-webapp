import React from 'react';
import { Menu, RefreshCw } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { MODULES, canViewItem } from '../config';

const Header = ({ onMenuClick, user }) => {
  const { fetchData, loading } = useDataStore();
  const isSyncing = Object.values(loading).some(Boolean);

  // Only sync the sheets this user is actually allowed to view.
  const syncAll = () =>
    MODULES
      .filter((m) => canViewItem(user, { path: `/m/${m.key}`, label: m.label, moduleKey: m.key }))
      .forEach((m) => fetchData(m.sheet));

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-sky-200">
      <div className="flex justify-between items-center h-16 px-4 sm:px-6">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={syncAll}
            disabled={isSyncing}
            className={`px-3 py-1.5 border border-sky-200 rounded-lg text-sky-700 bg-sky-50/50 hover:bg-sky-100 hover:text-sky-800 disabled:opacity-50 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm ${isSyncing ? 'animate-pulse' : ''}`}
            title="Sync with Google Sheet"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Sheet'}</span>
          </button>

          <div className="h-8 w-px bg-sky-200 mx-1 hidden sm:block"></div>

          <div className="flex items-center gap-3 pl-2">
            <div className="text-right pr-2">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{user?.name || 'User'}</p>
              <p className="text-[11px] font-medium text-slate-500 leading-tight">ID: {user?.username || '—'}</p>
              <p className="text-[10px] uppercase font-bold text-sky-600 tracking-wider mt-0.5">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
