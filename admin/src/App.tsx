import React, { useState } from 'react';
import { AdminProvider, useAdmin } from './AdminContext';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { SkeletonLoader } from './components/SkeletonLoader';
import { Login } from './views/Login';
import { SuperDashboard } from './views/SuperDashboard';
import { TenantManagement } from './views/TenantManagement';
import { BranchDashboard } from './views/BranchDashboard';
import { OrderManagement } from './views/OrderManagement';
import { MenuManagement } from './views/MenuManagement';
import { NotificationCenter } from './views/NotificationCenter';
import { CustomerManagement } from './views/CustomerManagement';
import { Menu, Sun, Moon, Bell } from 'lucide-react';
import './index.css';

const MainLayout: React.FC = () => {
  const { user, activeView, loading, restaurants, selectedBrandId } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  if (!user) {
    return <Login />;
  }

  const isSuper = user.role === 'super_admin';
  const activeRestaurant = restaurants.find((r) => r.id === selectedBrandId) || restaurants[0];

  // Helper to render the correct view
  const renderView = () => {
    switch (activeView) {
      case 'super_dashboard':
        return <SuperDashboard />;
      case 'tenant_management':
        return <TenantManagement />;
      case 'branch_dashboard':
        return <BranchDashboard />;
      case 'order_management':
        return <OrderManagement />;
      case 'menu_management':
        return <MenuManagement />;
      case 'notification_center':
        return <NotificationCenter />;
      case 'customer_management':
        return <CustomerManagement />;
      default:
        return isSuper ? <SuperDashboard /> : <BranchDashboard />;
    }
  };

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark' : ''} ${
      isSuper ? 'bg-slate-900 text-slate-100' : 'bg-zinc-50 text-zinc-800'
    }`}>
      {/* Navigation Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar */}
        <header className={`sticky top-0 z-20 flex h-16 items-center justify-between px-6 border-b transition-colors ${
          isSuper 
            ? 'bg-slate-900 border-slate-800' 
            : 'bg-white/80 backdrop-blur-md border-zinc-200/50'
        }`}>
          {/* Left section: Hamburger toggler for mobile */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`md:hidden p-2 rounded-xl border transition-colors ${
                isSuper
                  ? 'border-slate-800 hover:bg-slate-850 text-slate-400'
                  : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
              }`}
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 relative flex">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              </span>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isSuper ? 'text-slate-400' : 'text-zinc-500'}`}>
                Operational Sync Live
              </span>
            </div>
          </div>

          {/* Right section: System controls */}
          <div className="flex items-center gap-3">
            {/* Super Admin status badge for simulated preview mode */}
            {isSuper && activeView !== 'super_dashboard' && activeView !== 'tenant_management' && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                HQ Preview Mode: {activeRestaurant?.name}
              </span>
            )}

            {/* Dark Mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl border transition-colors ${
                isSuper
                  ? 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white'
                  : 'border-zinc-200/60 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Notifications */}
            <button
              className={`p-2.5 rounded-xl border transition-colors relative ${
                isSuper
                  ? 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white'
                  : 'border-zinc-200/60 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500"></span>
            </button>
          </div>
        </header>

        {/* Dynamic Inner Screen View */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {loading ? (
            <div className="space-y-6">
              <SkeletonLoader type="card" />
              <SkeletonLoader type="chart" />
              <SkeletonLoader type="table" />
            </div>
          ) : (
            renderView()
          )}
        </main>
      </div>

      {/* Floating Notifications */}
      <Toast />
    </div>
  );
};

function App() {
  return (
    <AdminProvider>
      <MainLayout />
    </AdminProvider>
  );
}

export default App;
