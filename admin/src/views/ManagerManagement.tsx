import React, { useState, useEffect } from 'react';
import { useAdmin } from '../AdminContext';
import { fetchAllManagers, changeManagerPassword } from '../services/api';
import { 
  KeyRound, 
  Search, 
  Lock, 
  X, 
  CheckCircle2, 
  Mail, 
  Store, 
  Loader2, 
  ShieldAlert
} from 'lucide-react';

interface Manager {
  id: number;
  username: string;
  email: string;
  restaurant_name: string;
  restaurant_id: number | null;
}

export const ManagerManagement: React.FC = () => {
  const { showToast } = useAdmin();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');

  // Mocks for development/fallback
  const MOCK_MANAGERS: Manager[] = [
    { id: 2, username: 'seenbanao_mgr', email: 'manager@seenbanao.com', restaurant_name: 'SeenBanao', restaurant_id: 1 },
    { id: 3, username: 'dineatblue_mgr', email: 'manager@dineatblue.com', restaurant_name: 'DineAtBlue', restaurant_id: 2 },
    { id: 4, username: 'jushhpk_mgr', email: 'manager@jushhpk.com', restaurant_name: 'JushhPK', restaurant_id: 3 },
    { id: 5, username: 'tandooristoppk_mgr', email: 'manager@tandooristoppk.com', restaurant_name: 'TandooriStopPK', restaurant_id: 4 },
    { id: 6, username: 'sandmelts_mgr', email: 'manager@sandmelts.com', restaurant_name: 'SandMelts', restaurant_id: 5 },
    { id: 7, username: 'birdmanfoodspk_mgr', email: 'manager@birdmanfoodspk.com', restaurant_name: 'BirdmanFoodsPK', restaurant_id: 6 },
    { id: 8, username: 'getafomo_mgr', email: 'manager@getafomo.com', restaurant_name: 'GetAFomo', restaurant_id: 7 },
  ];

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

  const filteredManagers = managers.filter(m => 
    m.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.restaurant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic colors matching brand identity rules
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
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <KeyRound className="text-blue-500" size={24} />
            Manager Credentials
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Securely monitor branch managers and adjust their API access passwords.
          </p>
        </div>
        {isMock && (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs px-3 py-1.5 rounded-full font-bold">
            <ShieldAlert size={14} className="animate-pulse" />
            <span>Demo Mode (Changes simulated)</span>
          </div>
        )}
      </div>

      {/* Control filters bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by username, brand, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/60 rounded-lg py-2.5 pl-9 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-all focus:border-blue-500"
          />
        </div>
        <div className="text-[11px] text-slate-400 font-medium">
          Total manager records: <span className="text-white font-bold">{filteredManagers.length}</span>
        </div>
      </div>

      {/* Main Grid View */}
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
                      <span className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 block">Staff Account</span>
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

      {/* Modal Dialog for password change */}
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
