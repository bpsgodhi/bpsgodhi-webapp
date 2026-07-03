import React from 'react';
import { Menu, RefreshCw, Search } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { MODULES, canViewItem, APP_NAME } from '../config';

const Header = ({ onMenuClick, user }) => {
  const { fetchData, loading } = useDataStore();
  const isSyncing = Object.values(loading).some(Boolean);

  // Only sync the sheets this user is actually allowed to view.
  const syncAll = () =>
    MODULES
      .filter((m) => canViewItem(user, { path: `/m/${m.key}`, label: m.label, moduleKey: m.key }))
      .forEach((m) => fetchData(m.sheet));

  const initial = (user?.name || 'U').trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-sky-200">
      <div className="flex justify-between items-center h-16 px-4 sm:px-6">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          <img src="/bps-logo.svg" alt={APP_NAME} className="h-12 w-12 object-contain shrink-0" />
          <span className="text-lg font-bold text-sky-600 tracking-tight truncate hidden sm:block">{APP_NAME}</span>

          <button
            onClick={() => window.dispatchEvent(new Event('bps-open-search'))}
            title="Search (Ctrl+K)"
            className="ml-2 hidden md:flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg border border-sky-200 bg-sky-50/50 text-slate-400 hover:bg-sky-100 hover:border-sky-300 transition-all w-56"
          >
            <Search size={16} className="shrink-0" />
            <span className="text-sm flex-1 text-left">Search…</span>
            <kbd className="text-[10px] font-semibold text-sky-600 bg-white border border-sky-200 rounded px-1.5 py-0.5 shrink-0">Ctrl K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => window.dispatchEvent(new Event('bps-open-search'))}
            title="Search (Ctrl+K)"
            className="md:hidden p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
          >
            <Search size={20} />
          </button>
          <button
            onClick={syncAll}
            disabled={isSyncing}
            className="group flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-sky-500 text-white text-xs font-bold shadow-sm hover:shadow-md hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            title="Sync with Google Sheet"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing…' : 'Sync Sheet'}</span>
          </button>

          <div className="h-9 w-px bg-sky-200 mx-0.5 sm:mx-1 hidden sm:block"></div>

          {/* User chip */}
          <div className="flex items-center gap-2.5 pl-0.5">
            <div className="text-right hidden sm:block leading-tight">
              <p className="text-sm font-bold text-gray-900">{user?.name || 'User'}</p>
              <span className="inline-flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] uppercase font-bold tracking-wider text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">{user?.role || 'USER'}</span>
                <span className="text-[10px] font-medium text-slate-400">#{user?.username || '—'}</span>
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-700 to-sky-500 text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-white shrink-0">
              {initial}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
