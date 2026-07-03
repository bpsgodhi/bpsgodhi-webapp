import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { LogOut as LogOutIcon, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { visibleMenuItems, APP_SHORT_NAME } from '../config';

// Resolve a lucide icon by its string name, with a safe fallback.
const Icon = ({ name, ...props }) => {
  const Cmp = Icons[name] || Icons.Table;
  return <Cmp {...props} />;
};

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const visibleItems = visibleMenuItems(user);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-[60] lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-56 bg-white border-r border-sky-200 z-[70] transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-sky-200 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <img src="/bps-logo.svg" alt={APP_SHORT_NAME} className="w-full h-full object-contain" />
              </div>
              <span className="text-base font-bold text-sky-600 tracking-tight leading-tight truncate">{APP_SHORT_NAME}</span>
            </div>
            <button onClick={onClose} className="lg:hidden p-2 hover:bg-sky-100 rounded-lg shrink-0">
              <X size={20} className="text-sky-600" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
            {visibleItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
                  ${isActive
                    ? 'bg-sky-100 text-sky-700 font-semibold border-l-4 border-gold-400'
                    : 'text-gray-700 hover:bg-sky-50 hover:text-sky-700 border-l-4 border-transparent'}
                `}
              >
                <Icon name={item.icon} size={20} className="group-hover:scale-110 transition-transform" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-sky-200 bg-sky-50">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white transition-all font-semibold shadow-sm"
            >
              <LogOutIcon size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
