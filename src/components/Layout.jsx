import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import CommandPalette from './CommandPalette';
import { useAuthStore } from '../store/authStore';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <div className="flex h-[100dvh] bg-white overflow-hidden">
      <CommandPalette />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all h-[100dvh]">
        <Header onMenuClick={() => setSidebarOpen(true)} user={user} />

        <main className="flex-1 flex flex-col p-2 sm:p-3 overflow-hidden relative z-0 min-h-0">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col animate-fade-in min-h-0 overflow-y-auto scrollbar-hide">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Layout;
