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
  Users,
  Lock
} from 'lucide-react';
import { changeOwnPassword, updateUserProfile, getToken } from '../services/api';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, activeView, setView, logout, restaurants, selectedBrandId, setSelectedBrand, showToast, updateUser } = useAdmin();

  const [showPassModal, setShowPassModal] = React.useState(false);
  const [usernameInput, setUsernameInput] = React.useState(user?.username || '');
  const [emailInput, setEmailInput] = React.useState(user?.email || '');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loadingModal, setLoadingModal] = React.useState(false);
  const [modalError, setModalError] = React.useState('');

  // Sync inputs when user changes
  React.useEffect(() => {
    if (user) {
      setUsernameInput(user.username);
      setEmailInput(user.email || '');
    }
  }, [user]);

  if (!user) return null;

  const isSuper = user.role === 'super_admin';
  const activeRestaurant = restaurants.find((r) => r.id === selectedBrandId) || restaurants[0];

  const getFocusBorderColor = () => {
    switch (activeRestaurant?.slug) {
      case 'seenbanao': return 'focus:border-seenbanao';
      case 'dineatblue': return 'focus:border-dineatblue';
      case 'jushhpk': return 'focus:border-jushhpk';
      case 'tandooristoppk': return 'focus:border-tandooristoppk';
      case 'sandmelts': return 'focus:border-sandmelts';
      case 'birdmanfoodspk': return 'focus:border-birdmanfoodspk';
      case 'getafomo': return 'focus:border-getafomo';
      default: return 'focus:border-orange-600';
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    
    if (!usernameInput.trim()) {
      setModalError('Username cannot be empty');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setModalError('Password must be at least 6 characters long');
        return;
      }
      if (newPassword !== confirmPassword) {
        setModalError('Passwords do not match');
        return;
      }
    }

    setLoadingModal(true);
    try {
      const isMock = !getToken() || !!localStorage.getItem('foodsphere_admin_mock_user');
      
      if (isMock) {
        // Simulate update
        updateUser({ username: usernameInput, email: emailInput });
        showToast('Credentials updated successfully (Demo Mode)', 'success');
        setShowPassModal(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        // 1. Update Profile (username, email)
        if (usernameInput !== user.username || emailInput !== (user.email || '')) {
          await updateUserProfile({ username: usernameInput, email: emailInput });
          updateUser({ username: usernameInput, email: emailInput });
        }

        // 2. Update Password (if provided)
        if (newPassword) {
          await changeOwnPassword(newPassword);
        }

        showToast('Account credentials updated successfully!', 'success');
        setShowPassModal(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      console.error('[Update Credentials Error]', err);
      setModalError(err.message || 'Failed to update credentials. Please try again.');
    } finally {
      setLoadingModal(false);
    }
  };

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
    : `bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-l-4 ${
        getBrandTextColor() === 'text-seenbanao' ? 'border-seenbanao' :
        getBrandTextColor() === 'text-dineatblue' ? 'border-dineatblue' :
        getBrandTextColor() === 'text-jushhpk' ? 'border-jushhpk' :
        getBrandTextColor() === 'text-tandooristoppk' ? 'border-tandooristoppk' :
        getBrandTextColor() === 'text-sandmelts' ? 'border-sandmelts' :
        getBrandTextColor() === 'text-birdmanfoodspk' ? 'border-birdmanfoodspk' : 'border-getafomo'
      }`;

  const inactiveLinkClass = isSuper
    ? 'text-slate-400 hover:bg-slate-800/80 hover:text-white border-l-4 border-transparent'
    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white border-l-4 border-transparent';

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
            : 'bg-white dark:bg-slate-900 border-zinc-200 dark:border-slate-800 text-zinc-800 dark:text-slate-100'
        }`}
      >
        {/* Top Branding Section */}
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-0.5">
          <div className={`p-6 border-b flex justify-between items-center ${isSuper ? 'border-slate-800' : 'border-zinc-100 dark:border-slate-800'}`}>
            <div className="flex items-center gap-2.5">
              {isSuper ? (
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
                  FS
                </div>
              ) : (
                <div className={`w-9 h-9 rounded-lg ${getBrandBgColor()} flex items-center justify-center font-bold text-white shadow-lg`}>
                  {activeRestaurant?.name?.[0] || ''}
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
                  onClick={() => { setView('manager_management'); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    activeView === 'manager_management' ? activeLinkClass : inactiveLinkClass
                  }`}
                >
                  <Lock size={18} />
                  Manager Accounts
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
        <div className={`p-4 border-t ${isSuper ? 'border-slate-800 bg-slate-900/40' : 'border-zinc-100 dark:border-slate-800 bg-zinc-50 dark:bg-slate-900/40'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
              isSuper ? 'bg-slate-700 text-slate-100' : 'bg-zinc-200 dark:bg-slate-800 text-zinc-700 dark:text-slate-350'
            }`}>
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold truncate">{user.username}</h4>
              <p className={`text-[10px] truncate ${isSuper ? 'text-slate-400' : 'text-zinc-500 dark:text-slate-400'}`}>
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPassModal(true)}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 mb-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${
              isSuper
                ? 'border-slate-700 hover:bg-slate-800 hover:text-blue-400 hover:border-blue-500/30 text-slate-300'
                : 'border-zinc-200 dark:border-slate-800 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 hover:border-zinc-300 dark:hover:border-slate-700 text-zinc-600 dark:text-slate-400'
            }`}
          >
            <Lock size={14} />
            Update Credentials
          </button>
          <button
            onClick={logout}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold border transition-all duration-200 ${
              isSuper
                ? 'border-slate-700 hover:bg-slate-800 hover:text-rose-400 hover:border-rose-500/30 text-slate-300'
                : 'border-zinc-200 dark:border-slate-800 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 hover:border-zinc-300 dark:hover:border-slate-700 text-zinc-600 dark:text-slate-400'
            }`}
          >
            <LogOut size={14} />
            Logout Workspace
          </button>
        </div>
      </aside>

      {/* Update Credentials Modal */}
      {showPassModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className={`w-full max-w-md rounded-xl border p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
              isSuper 
                ? 'bg-slate-900 border-slate-800 text-white shadow-blue-500/5' 
                : 'bg-white dark:bg-slate-900 border-zinc-200 dark:border-slate-800 text-zinc-800 dark:text-slate-100'
            }`}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold tracking-tight">Update Credentials</h3>
              <button 
                onClick={() => { setShowPassModal(false); setModalError(''); }}
                className={`p-1.5 rounded-lg transition-all ${
                  isSuper ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-zinc-100 dark:hover:bg-slate-850 text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-200'
                }`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Error Message */}
            {modalError && (
              <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-xs font-semibold animate-shake">
                {modalError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleUpdateCredentials} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 mb-1.5">
                  Login ID (Username)
                </label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className={`w-full text-sm p-2.5 rounded-lg border outline-none transition-all duration-200 ${
                    isSuper
                      ? 'bg-slate-950 border-slate-800 focus:border-blue-500 text-slate-100'
                      : `bg-zinc-50 dark:bg-slate-950 border-zinc-200 dark:border-slate-800 ${getFocusBorderColor()} text-zinc-800 dark:text-slate-100`
                  }`}
                  placeholder="Enter login ID"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className={`w-full text-sm p-2.5 rounded-lg border outline-none transition-all duration-200 ${
                    isSuper
                      ? 'bg-slate-950 border-slate-800 focus:border-blue-500 text-slate-100'
                      : `bg-zinc-50 dark:bg-slate-950 border-zinc-200 dark:border-slate-800 ${getFocusBorderColor()} text-zinc-800 dark:text-slate-100`
                  }`}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <hr className={isSuper ? 'border-slate-800' : 'border-zinc-150 dark:border-slate-800'} />

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 mb-1.5">
                  New Password <span className="text-[10px] font-normal lowercase text-slate-500">(Leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full text-sm p-2.5 rounded-lg border outline-none transition-all duration-200 ${
                    isSuper
                      ? 'bg-slate-950 border-slate-800 focus:border-blue-500 text-slate-100'
                      : `bg-zinc-50 dark:bg-slate-950 border-zinc-200 dark:border-slate-800 ${getFocusBorderColor()} text-zinc-800 dark:text-slate-100`
                  }`}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full text-sm p-2.5 rounded-lg border outline-none transition-all duration-200 ${
                    isSuper
                      ? 'bg-slate-950 border-slate-800 focus:border-blue-500 text-slate-100'
                      : `bg-zinc-50 dark:bg-slate-950 border-zinc-200 dark:border-slate-800 ${getFocusBorderColor()} text-zinc-800 dark:text-slate-100`
                  }`}
                  placeholder="Confirm password"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowPassModal(false); setModalError(''); }}
                  disabled={loadingModal}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border ${
                    isSuper
                      ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                      : 'border-zinc-200 dark:border-slate-800 hover:bg-zinc-50 dark:hover:bg-slate-800 text-zinc-600 dark:text-slate-350'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingModal}
                  className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition-all duration-200 shadow-md ${
                    isSuper
                      ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20 disabled:bg-blue-800'
                      : `${getBrandBgColor()} hover:opacity-90 disabled:opacity-50`
                  }`}
                >
                  {loadingModal ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
