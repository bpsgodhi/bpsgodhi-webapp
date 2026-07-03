import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Search, CornerDownLeft } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { MODULES, MENU_ITEMS, canViewItem } from '../config';

// App-wide search + quick-nav. Opens with Ctrl/Cmd+K (or the header button
// via the `bps-open-search` window event). Searches every module the user
// can see — jump to a page or straight to a matching record.
const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { sheets } = useDataStore();

  // Global open triggers.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('bps-open-search', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('bps-open-search', onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const navItems = useMemo(
    () => MENU_ITEMS.filter((i) => canViewItem(user, i)),
    [user]
  );

  // Build the result list: page nav matches + record matches across modules.
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = [];

    // 1) Page / module navigation.
    navItems.forEach((i) => {
      if (!term || i.label.toLowerCase().includes(term)) {
        out.push({ type: 'page', label: i.label, icon: i.icon, to: i.path });
      }
    });

    // 2) Record matches (only when actually searching).
    if (term.length >= 2) {
      const viewableModules = MODULES.filter((m) =>
        canViewItem(user, { path: `/m/${m.key}`, label: m.label, moduleKey: m.key })
      );
      for (const m of viewableModules) {
        const sheet = sheets[m.sheet];
        if (!sheet?.rows?.length) continue;
        let hits = 0;
        for (const row of sheet.rows) {
          if (row.some((cell) => String(cell ?? '').toLowerCase().includes(term))) {
            const label = row
              .filter((c) => c && !String(c).startsWith('http') && !/^\d{10,}$/.test(String(c)))
              .slice(0, 3)
              .join(' · ');
            out.push({ type: 'record', label: label || '(record)', icon: m.icon, module: m.label, to: `/m/${m.key}?q=${encodeURIComponent(term)}` });
            if (++hits >= 5) break; // cap per module
          }
        }
      }
    }
    return out.slice(0, 40);
  }, [q, navItems, sheets, user]);

  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  const go = (item) => {
    if (!item) return;
    setOpen(false);
    navigate(item.to);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-4 border-b border-gray-100">
          <Search size={20} className="text-sky-600 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search students, modules, records…"
            className="flex-1 py-4 text-base outline-none placeholder-gray-400"
          />
          <kbd className="text-[10px] font-semibold text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 shrink-0">ESC</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto scrollbar-hide py-2">
          {results.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">No matches found</p>
          ) : (
            results.map((r, i) => {
              const I = Icons[r.icon] || Icons.Table;
              return (
                <button
                  key={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === active ? 'bg-sky-50' : ''}`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${i === active ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <I size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900 truncate">{r.label}</span>
                    <span className="block text-[11px] text-gray-400">{r.type === 'page' ? 'Go to page' : r.module}</span>
                  </span>
                  {i === active && <CornerDownLeft size={14} className="text-sky-500 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
