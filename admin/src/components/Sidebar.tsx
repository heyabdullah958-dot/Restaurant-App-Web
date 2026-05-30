import React from 'react';
import { useAdmin } from '../AdminContext';
import { 
  LayoutDashboard, 
  Store, 
  ClipboardList, 
  ChefHat, 
  LogOut, 
  X,
  Bell,
  Users
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, activeView, setView, logout, restaurants, selectedBrandId, setSelectedBrand } = useAdmin();

  if (!user) return null;

  const isSuper = user.role === 'super_admin';
  const activeRestaurant = restaurants.find((r) => r.id === selectedBrandId) || restaurants[0];

  // Map brand colors to backgrounds
  const getBrandBgColor = () => {
    switch (activeRestaurant?.slug) {
      case 'seenbanao': return 'bg-seenbanao';
      case 'dineatblue': return 'bg-dineatblue';
      case 'jushhpk': return 'bg-jushhpk';
      case 'tandooristoppk': return 'bg-tandooristoppk';
      case 'sandmelts': return 'bg-sandmelts';
      case 'birdmanfoodspk': return 'bg-birdmanfoodspk';
      case 'getafomo': return 'bg-getafomo';
      default: return 'bg-orange-600';
    }
  };

  const getBrandTextColor = () => {
    switch (activeRestaurant?.slug) {
      case 'seenbanao': return 'text-seenbanao';
      case 'dineatblue': return 'text-dineatblue';
      case 'jushhpk': return 'text-jushhpk';
      case 'tandooristoppk': return 'text-tandooristoppk';
      case 'sandmelts': return 'text-sandmelts';
      case 'birdmanfoodspk': return 'text-birdmanfoodspk';
      case 'getafomo': return 'text-getafomo';
      default: return 'text-orange-600';
    }
  };

  const activeLinkClass = isSuper
    ? 'bg-slate-700/60 text-white border-l-4 border-blue-500'
    : `bg-slate-100 text-slate-900 border-l-4 ${getBrandTextColor() === 'text-seenbanao' ? 'border-seenbanao' : getBrandTextColor() === 'text-dineatblue' ? 'border-dineatblue' : getBrandTextColor() === 'text-jushhpk' ? 'border-jushhpk' : getBrandTextColor() === 'text-tandooristoppk' ? 'border-tandooristoppk' : getBrandTextColor() === 'text-sandmelts' ? 'border-sandmelts' : getBrandTextColor() === 'text-birdmanfoodspk' ? 'border-birdmanfoodspk' : 'border-getafomo'}`;

  const inactiveLinkClass = isSuper
    ? 'text-slate-400 hover:bg-slate-800/80 hover:text-white border-l-4 border-transparent'
    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-40 w-64 flex flex-col justify-between border-r shadow-sm transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isSuper 
            ? 'bg-slate-950 border-slate-800 text-white' 
            : 'bg-white border-zinc-200 text-zinc-800'
        }`}
      >
        {/* Top Branding Section */}
        <div>
          <div className={`p-6 border-b flex justify-between items-center ${isSuper ? 'border-slate-800' : 'border-zinc-100'}`}>
            <div className="flex items-center gap-2.5">
              {isSuper ? (
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
                  FS
                </div>
              ) : (
                <div className={`w-9 h-9 rounded-lg ${getBrandBgColor()} flex items-center justify-center font-bold text-white shadow-lg`}>
                  {activeRestaurant?.name[0]}
                </div>
              )}
              <div>
                <h3 className="font-bold tracking-tight text-sm">
                  {isSuper ? 'FoodSphere HQ' : activeRestaurant?.name}
                </h3>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isSuper ? 'text-blue-400' : 'text-zinc-400'}`}>
                  {isSuper ? 'Super-Admin Console' : 'VIP Tenant Panel'}
                </span>
              </div>
            </div>
            
            {/* Mobile Close Button */}
            <button 
              onClick={() => setIsOpen(false)}
              className="md:hidden p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Super-Admin tenant selector utility (for previewing Manager modes) */}
          {isSuper && restaurants.length > 0 && (
            <div className="px-4 py-3 mx-4 mt-4 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1.5">
                Simulated Branch View
              </label>
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrand(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 p-1.5 rounded outline-none font-medium cursor-pointer focus:border-blue-500"
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.is_active ? '' : '(Inactive)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1 px-2">
            {isSuper ? (
              // SUPER-ADMIN NAVIGATION LINKS
              <>
                <button
                  onClick={() => { setView('super_dashboard'); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    activeView === 'super_dashboard' ? activeLinkClass : inactiveLinkClass
                  }`}
                >
                  <LayoutDashboard size={18} />
                  HQ Dashboard
                </button>
                <button
                  onClick={() => { setView('tenant_management'); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    activeView === 'tenant_management' ? activeLinkClass : inactiveLinkClass
                  }`}
                >
                  <Store size={18} />
                  Tenant Registry
                </button>
                <button
                  onClick={() => { setView('menu_management'); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    activeView === 'menu_management' ? activeLinkClass : inactiveLinkClass
                  }`}
                >
                  <ChefHat size={18} />
                  Menu Engineering
                </button>
                <button
                  onClick={() => { setView('customer_management'); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    activeView === 'customer_management' ? activeLinkClass : inactiveLinkClass
                  }`}
                >
                  <Users size={18} />
                  Customers
                </button>
                <button
                  onClick={() => { setView('notification_center'); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    activeView === 'notification_center' ? activeLinkClass : inactiveLinkClass
                  }`}
                >
                  <Bell size={18} />
                  Notifications
                </button>
              </>
            ) : (
              // BRANCH-MANAGER NAVIGATION LINKS
              <>
                <button
                  onClick={() => { setView('branch_dashboard'); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all-300 ${
                    activeView === 'branch_dashboard' ? activeLinkClass : inactiveLinkClass
                  }`}
                >
                  <LayoutDashboard size={18} />
                  Workspace Home
                </button>
                <button
                  onClick={() => { setView('order_management'); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all-300 ${
                    activeView === 'order_management' ? activeLinkClass : inactiveLinkClass
                  }`}
                >
                  <ClipboardList size={18} />
                  Live Order Board
                </button>
                <button
                  onClick={() => { setView('menu_management'); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all-300 ${
                    activeView === 'menu_management' ? activeLinkClass : inactiveLinkClass
                  }`}
                >
                  <ChefHat size={18} />
                  Menu Engineering
                </button>
              </>
            )}
          </nav>
        </div>

        {/* User Card & Logout Bottom */}
        <div className={`p-4 border-t ${isSuper ? 'border-slate-800 bg-slate-900/40' : 'border-zinc-100 bg-zinc-50'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
              isSuper ? 'bg-slate-700 text-slate-100' : 'bg-zinc-200 text-zinc-700'
            }`}>
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold truncate">{user.username}</h4>
              <p className={`text-[10px] truncate ${isSuper ? 'text-slate-400' : 'text-zinc-500'}`}>
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold border transition-all ${
              isSuper
                ? 'border-slate-700 hover:bg-slate-800 hover:text-rose-400 hover:border-rose-500/30 text-slate-300'
                : 'border-zinc-200 hover:bg-zinc-100 hover:text-rose-600 hover:border-rose-200 text-zinc-600'
            }`}
          >
            <LogOut size={14} />
            Logout Workspace
          </button>
        </div>
      </aside>
    </>
  );
};
