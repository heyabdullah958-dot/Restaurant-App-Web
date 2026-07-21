import React, { useState, useEffect } from 'react';
import { useAdmin } from '../AdminContext';
import { fetchAllManagers, changeManagerPassword, fetchBranches, createManagerAccount } from '../services/api';
import { 
  KeyRound, 
  Search, 
  Lock, 
  X, 
  CheckCircle2, 
  Mail, 
  Store, 
  Loader2, 
  ShieldAlert,
  UserPlus,
  Building2,
  MapPin,
  Eye,
  EyeOff,
  Copy,
  CheckCheck,
  ChevronDown,
  GitBranch,
  Bell
} from 'lucide-react';

interface Manager {
  id: number;
  username: string;
  email: string;
  restaurant_name: string;
  restaurant_id: number | null;
  branch_name?: string;
  branch_id?: number | null;
  notification_email?: string;
}

interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
  restaurant_id: number;
  restaurant_name: string;
}

interface CreatedManagerCredentials {
  username: string;
  password: string;
  restaurant: string;
  branch: string;
  notification_email: string;
}

const MOCK_BRANCHES: Branch[] = [
  { id: 1, name: 'Johar Town', address: 'PIA Road, Hakim Chowk', phone: '0327-4945947', is_active: true, restaurant_id: 4, restaurant_name: 'Tandoori Stop' },
  { id: 2, name: 'Lake City', address: 'Opposite Lake City Mall', phone: '', is_active: true, restaurant_id: 4, restaurant_name: 'Tandoori Stop' },
  { id: 3, name: 'GT Road Baghbanpura', address: 'GT Road, Baghbanpura', phone: '0326-6811177', is_active: true, restaurant_id: 4, restaurant_name: 'Tandoori Stop' },
  { id: 4, name: 'Johar Town', address: 'Johar Town, Lahore', phone: '', is_active: true, restaurant_id: 3, restaurant_name: 'Jush' },
  { id: 5, name: 'DHA', address: 'DHA, Lahore', phone: '', is_active: true, restaurant_id: 3, restaurant_name: 'Jush' },
  { id: 6, name: 'Gulberg', address: 'Gulberg, Lahore', phone: '', is_active: true, restaurant_id: 3, restaurant_name: 'Jush' },
  { id: 7, name: 'Saddar', address: 'Saddar, Lahore', phone: '', is_active: true, restaurant_id: 3, restaurant_name: 'Jush' },
  { id: 8, name: 'Johar Town', address: 'Johar Town, Lahore', phone: '', is_active: true, restaurant_id: 7, restaurant_name: 'GetAFomo' },
  { id: 9, name: 'DHA', address: 'DHA, Lahore', phone: '', is_active: true, restaurant_id: 7, restaurant_name: 'GetAFomo' },
  { id: 10, name: 'Gulberg', address: 'Gulberg, Lahore', phone: '', is_active: true, restaurant_id: 7, restaurant_name: 'GetAFomo' },
];

const MOCK_MANAGERS: Manager[] = [
  { id: 2, username: 'manager_tandooristoppk_johar_town', email: 'manager@tandooristoppk.com', restaurant_name: 'TandooriStopPK', restaurant_id: 4, branch_name: 'Johar Town', branch_id: 1, notification_email: 'manager@tandooristoppk.com' },
  { id: 3, username: 'manager_tandooristoppk_lake_city', email: 'manager2@tandooristoppk.com', restaurant_name: 'TandooriStopPK', restaurant_id: 4, branch_name: 'Lake City', branch_id: 2, notification_email: 'manager2@tandooristoppk.com' },
  { id: 4, username: 'manager_jushhpk_johar_town', email: 'manager@jushhpk.com', restaurant_name: 'JushhPK', restaurant_id: 3, branch_name: 'Johar Town', branch_id: 4, notification_email: 'manager@jushhpk.com' },
  { id: 5, username: 'manager_getafomo_johar_town', email: 'manager@getafomo.com', restaurant_name: 'GetAFomo', restaurant_id: 7, branch_name: 'Johar Town', branch_id: 8, notification_email: 'manager@getafomo.com' },
];

export const ManagerManagement: React.FC = () => {
  const { showToast, restaurants } = useAdmin();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  // New state variables for Branch Manager creation
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    restaurant_id: '' as string | number,
    branch_id: '' as string | number,
    notification_email: '',
    password: '',
  });
  const [creating, setCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedManagerCredentials | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

  const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');

  const loadManagers = async () => {
    setLoading(true);
    if (isMock) {
      setTimeout(() => {
        setManagers(MOCK_MANAGERS);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      const data = await fetchAllManagers();
      setManagers(data);
    } catch (err: any) {
      console.error('[Load Managers Failed]', err);
      showToast('Failed to load manager accounts. Using offline mocks.', 'error');
      setManagers(MOCK_MANAGERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagers();
  }, []);

  const handleRestaurantChange = async (restaurantIdStr: string) => {
    setCreateForm((prev) => ({
      ...prev,
      restaurant_id: restaurantIdStr,
      branch_id: '',
    }));

    if (!restaurantIdStr) {
      setBranches([]);
      return;
    }

    const restaurantId = Number(restaurantIdStr);
    setBranchesLoading(true);

    if (isMock) {
      setTimeout(() => {
        const filteredMockBranches = MOCK_BRANCHES.filter(
          (b) => b.restaurant_id === restaurantId
        );
        setBranches(filteredMockBranches);
        setBranchesLoading(false);
      }, 400);
      return;
    }

    try {
      const data = await fetchBranches(restaurantId);
      setBranches(data);
    } catch (err: any) {
      console.error('[Fetch Branches Failed]', err);
      showToast('Failed to load branches for selected restaurant.', 'error');
      setBranches(MOCK_BRANCHES.filter((b) => b.restaurant_id === restaurantId));
    } finally {
      setBranchesLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.restaurant_id) {
      showToast('Please select a restaurant.', 'error');
      return;
    }
    if (!createForm.branch_id) {
      showToast('Please select a branch location.', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!createForm.notification_email || !emailRegex.test(createForm.notification_email.trim())) {
      showToast('Please enter a valid notification email address.', 'error');
      return;
    }
    if (createForm.password.trim() && createForm.password.trim().length < 8) {
      showToast('Password must be at least 8 characters if provided.', 'error');
      return;
    }

    setCreating(true);

    if (isMock) {
      setTimeout(() => {
        const selectedRest = restaurants.find((r) => r.id === Number(createForm.restaurant_id));
        const selectedBranch = branches.find((b) => b.id === Number(createForm.branch_id));
        const restName = selectedRest?.name || 'Restaurant';
        const branchName = selectedBranch?.name || 'Branch';

        const generatedPass = createForm.password.trim() || 'Secr3t!' + Math.floor(1000 + Math.random() * 9000);
        const generatedUser = `manager_${restName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${branchName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

        const newManager: Manager = {
          id: Date.now(),
          username: generatedUser,
          email: createForm.notification_email.trim(),
          restaurant_name: restName,
          restaurant_id: Number(createForm.restaurant_id),
          branch_name: branchName,
          branch_id: Number(createForm.branch_id),
          notification_email: createForm.notification_email.trim(),
        };

        MOCK_MANAGERS.unshift(newManager);
        setCreatedCredentials({
          username: generatedUser,
          password: generatedPass,
          restaurant: restName,
          branch: branchName,
          notification_email: createForm.notification_email.trim(),
        });
        setShowCreateForm(false);
        setCreateForm({ restaurant_id: '', branch_id: '', notification_email: '', password: '' });
        setCreating(false);
        loadManagers();
      }, 800);
      return;
    }

    try {
      const response = await createManagerAccount({
        restaurant_id: Number(createForm.restaurant_id),
        branch_id: Number(createForm.branch_id),
        notification_email: createForm.notification_email.trim(),
        ...(createForm.password.trim() ? { password: createForm.password.trim() } : {}),
      });

      setCreatedCredentials({
        username: response.username,
        password: response.password,
        restaurant: response.restaurant,
        branch: response.branch,
        notification_email: response.notification_email,
      });

      setShowCreateForm(false);
      setCreateForm({ restaurant_id: '', branch_id: '', notification_email: '', password: '' });
      showToast('Manager account created successfully!', 'success');
      loadManagers();
    } catch (err: any) {
      console.error('[Create Manager Failed]', err);
      showToast(err.message || 'Failed to create manager account.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManager) return;
    if (newPassword.trim().length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    setUpdating(true);
    if (isMock) {
      setTimeout(() => {
        showToast(`[Demo Mode] Password for ${selectedManager.username} set to: ${newPassword}`, 'success');
        setUpdating(false);
        setSelectedManager(null);
        setNewPassword('');
      }, 800);
      return;
    }

    try {
      await changeManagerPassword(selectedManager.id, newPassword.trim());
      showToast(`Password updated successfully for ${selectedManager.username}!`, 'success');
      setSelectedManager(null);
      setNewPassword('');
    } catch (err: any) {
      console.error('[Change Password Failed]', err);
      showToast(err.message || 'Failed to update manager password.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const copyToClipboard = (text: string, field: 'username' | 'password') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast(`Copied ${field} to clipboard!`, 'info');
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const filteredManagers = managers.filter((m) =>
    m.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.restaurant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.branch_name && m.branch_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalManagersCount = managers.length;
  const uniqueBranchesCount = new Set(managers.filter((m) => m.branch_name).map((m) => m.branch_name)).size;
  const uniqueRestaurantsCount = new Set(managers.filter((m) => m.restaurant_name).map((m) => m.restaurant_name)).size;

  const getBrandColors = (slug: string) => {
    const clean = slug.toLowerCase().replace(/[^a-z]/g, '');
    switch (clean) {
      case 'seenbanao':
        return { text: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
      case 'dineatblue':
        return { text: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' };
      case 'jushhpk':
        return { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
      case 'tandooristoppk':
        return { text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
      case 'sandmelts':
        return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
      case 'birdmanfoodspk':
        return { text: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' };
      case 'getafomo':
        return { text: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' };
      default:
        return { text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. HEADER ROW */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <GitBranch className="text-blue-500" size={24} />
            Branch Manager Accounts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage branch manager accounts, assign locations, and configure notification alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isMock && (
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs px-3 py-1.5 rounded-full font-bold">
              <ShieldAlert size={14} className="animate-pulse" />
              <span>Demo Mode (Changes simulated)</span>
            </div>
          )}
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <UserPlus size={16} />
            Create Manager
          </button>
        </div>
      </div>

      {/* 2. STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Managers</p>
            <p className="text-2xl font-bold text-white mt-1">{totalManagersCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <UserPlus size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Active Branches</p>
            <p className="text-2xl font-bold text-white mt-1">{uniqueBranchesCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <MapPin size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Restaurants</p>
            <p className="text-2xl font-bold text-white mt-1">{uniqueRestaurantsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Building2 size={20} />
          </div>
        </div>
      </div>

      {/* 3. SEARCH + FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by username, brand, branch, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/60 rounded-lg py-2.5 pl-9 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-all focus:border-blue-500"
          />
        </div>
        <div className="text-[11px] text-slate-400 font-medium">
          Total manager records: <span className="text-white font-bold">{filteredManagers.length}</span>
        </div>
      </div>

      {/* 4. MANAGER GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <span className="text-sm text-slate-500 font-medium">Loading manager databases...</span>
        </div>
      ) : filteredManagers.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-dashed border-slate-800 rounded-xl">
          <ShieldAlert className="mx-auto text-slate-600 mb-3" size={40} />
          <h3 className="text-sm font-bold text-slate-400">No Managers Found</h3>
          <p className="text-xs text-slate-500 mt-1">Try modifying your search filter query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredManagers.map((manager) => {
            const colors = getBrandColors(manager.restaurant_name);
            return (
              <div 
                key={manager.id} 
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-xl p-5 flex flex-col justify-between shadow-lg relative group overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-600/5 to-transparent rounded-bl-full pointer-events-none" />
                
                <div>
                  {/* Title & Brand badge */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-slate-200 text-sm tracking-tight">{manager.username}</h3>
                      <span className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 block">Branch Manager</span>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-md font-extrabold border uppercase tracking-wider flex items-center gap-1 ${colors.bg} ${colors.text}`}>
                      <Store size={10} />
                      {manager.restaurant_name}
                    </span>
                  </div>

                  {/* Body elements */}
                  <div className="space-y-2 border-t border-slate-800/80 pt-3.5 mb-5 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-slate-500" />
                      <span className="truncate">{manager.email || 'No email registered'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Lock size={12} className="text-slate-500" />
                      <span>Password: <span className="font-mono text-slate-500 font-bold">••••••••</span></span>
                    </div>

                    {/* Branch row */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/40">
                      <MapPin size={12} className={manager.branch_name ? "text-emerald-400" : "text-slate-500"} />
                      {manager.branch_name ? (
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-md">
                          {manager.branch_name}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">No branch assigned</span>
                      )}
                    </div>

                    {/* Notification email row */}
                    {manager.notification_email && manager.notification_email !== manager.email && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Bell size={12} className="text-amber-400" />
                        <span className="truncate" title="Order Alert Email">{manager.notification_email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => setSelectedManager(manager)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white font-bold py-2 px-3 rounded-lg text-xs transition-all active:scale-[0.98]"
                >
                  <KeyRound size={13} />
                  Change Credentials
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. CREATE MANAGER SIDE PANEL */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            onClick={() => { if(!creating) setShowCreateForm(false); }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity"
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl z-50 overflow-y-auto flex flex-col transition-transform duration-300 translate-x-0">
            <div className="h-1 bg-gradient-to-r from-blue-600 to-purple-600" />
            
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus size={20} className="text-blue-500" />
                Create Branch Manager
              </h2>
              <button
                disabled={creating}
                onClick={() => setShowCreateForm(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* a) Restaurant */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    BRAND / RESTAURANT
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={createForm.restaurant_id}
                      onChange={(e) => handleRestaurantChange(e.target.value)}
                      disabled={creating}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all appearance-none pr-8 cursor-pointer"
                    >
                      <option value="">Select a restaurant...</option>
                      {restaurants.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.city})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* b) Branch */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    BRANCH LOCATION
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={createForm.branch_id}
                      onChange={(e) => setCreateForm({ ...createForm, branch_id: e.target.value })}
                      disabled={!createForm.restaurant_id || branchesLoading || creating}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all appearance-none pr-8 cursor-pointer disabled:opacity-50"
                    >
                      <option value="">
                        {branchesLoading
                          ? 'Loading branches...'
                          : !createForm.restaurant_id
                          ? 'Select a restaurant first...'
                          : branches.length === 0
                          ? 'No branches available'
                          : 'Select branch...'}
                      </option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.address ? `— ${b.address}` : ''}
                        </option>
                      ))}
                    </select>
                    {branchesLoading ? (
                      <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />
                    ) : (
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    )}
                  </div>
                </div>

                {/* c) Notification Email */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    NOTIFICATION EMAIL
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="manager@restaurant.com"
                    value={createForm.notification_email}
                    onChange={(e) => setCreateForm({ ...createForm, notification_email: e.target.value })}
                    disabled={creating}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Order alerts will be sent to this address
                  </p>
                </div>

                {/* d) Password (Optional) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    PASSWORD (OPTIONAL)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Leave blank to auto-generate"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      disabled={creating}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Minimum 8 characters if provided. Leave blank to auto-generate a secure password.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg text-xs shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      Create Manager Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. CREDENTIALS REVEAL MODAL */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" />

          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl shadow-2xl p-6 relative z-10 overflow-hidden space-y-4">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-blue-500" />
            
            {/* Header */}
            <div>
              <h3 className="font-bold text-emerald-400 text-lg flex items-center gap-2">
                <CheckCircle2 size={20} />
                Manager Created Successfully!
              </h3>
              <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-400 text-xs flex items-center gap-2">
                <ShieldAlert size={16} className="shrink-0" />
                <span>⚠️ Save these credentials now. The password is shown ONCE.</span>
              </div>
            </div>

            {/* Credentials Fields */}
            <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs">
              {/* Username */}
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Username</span>
                  <span className="font-mono text-white font-bold text-sm">{createdCredentials.username}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(createdCredentials.username, 'username')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg transition-all flex items-center gap-1 text-[11px]"
                >
                  {copiedField === 'username' ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedField === 'username' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Password */}
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Password</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-emerald-400 font-bold text-sm ${!showPassword ? 'blur-sm hover:blur-none select-all' : ''}`}>
                      {createdCredentials.password}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-500 hover:text-slate-300 text-xs"
                    >
                      {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(createdCredentials.password, 'password')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg transition-all flex items-center gap-1 text-[11px]"
                >
                  {copiedField === 'password' ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedField === 'password' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-400 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Restaurant:</span>
                  <span className="text-white font-medium">{createdCredentials.restaurant}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Branch:</span>
                  <span className="text-white font-medium">{createdCredentials.branch}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Notification Email:</span>
                  <span className="text-white font-medium">{createdCredentials.notification_email}</span>
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => {
                setCreatedCredentials(null);
                setShowPassword(false);
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-lg text-xs transition-all mt-4"
            >
              Done — I've saved the credentials
            </button>
          </div>
        </div>
      )}

      {/* Existing Password Change Modal for selected manager */}
      {selectedManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Background backdrop blur */}
          <div 
            onClick={() => { if(!updating) setSelectedManager(null); }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Dialog content box */}
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl shadow-2xl p-6 relative z-10 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-blue-400" />
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Lock size={16} className="text-blue-500" />
                Change Password
              </h3>
              <button
                disabled={updating}
                onClick={() => setSelectedManager(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-400">
                You are updating the credentials for <span className="text-white font-bold font-mono">{selectedManager.username}</span> ({selectedManager.restaurant_name}).
              </p>
            </div>

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <input
                  type="text"
                  required
                  placeholder="At least 6 characters..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={updating}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => setSelectedManager(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-lg text-xs transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-lg text-xs shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updating ? (
                    <>
                      <Loader2 className="animate-spin" size={12} />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={12} />
                      Save Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
