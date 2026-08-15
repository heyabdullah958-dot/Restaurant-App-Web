import React, { useState, useEffect } from 'react';
import { useAdmin } from '../AdminContext';
import { fetchRiders, createRider, updateRider, deleteRider } from '../services/api';
import { Bike, Plus, Search, MessageSquare, Trash2, Edit2, Loader2 } from 'lucide-react';

interface Rider {
  id: number;
  branch: number;
  branch_name?: string;
  restaurant_id?: number;
  restaurant_name?: string;
  name: string;
  phone: string;
  vehicle_type: string;
  status: 'AVAILABLE' | 'ON_DELIVERY' | 'OFFLINE';
  is_active: boolean;
  created_at?: string;
}

export const RiderManagement: React.FC = () => {
  const { showToast, restaurants, user } = useAdmin();
  const isSuper = user?.role === 'super_admin' || user?.username === 'admin';
  const userBranchId = user?.branchId;
  const userRestId = user?.restaurantId;

  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingRider, setEditingRider] = useState<Rider | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicle_type: 'BIKE',
    branch: 0,
    status: 'AVAILABLE' as 'AVAILABLE' | 'ON_DELIVERY' | 'OFFLINE',
    is_active: true,
  });

  // Get available branches from restaurants, scoped strictly to user tenant
  const rawBranches = (Array.isArray(restaurants) ? restaurants : []).flatMap(r => 
    (r && Array.isArray(r.branches) ? r.branches : []).map(b => ({
      id: b.id,
      name: b.name,
      restaurant_id: r.id,
      restaurant_name: r.name
    }))
  );

  const allBranches = isSuper
    ? rawBranches
    : rawBranches.filter(b => (userBranchId ? b.id === userBranchId : (userRestId ? b.restaurant_id === userRestId : false)));

  const loadRiders = async (showLoadingSpinner: boolean = false) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const data = await fetchRiders();
      setRiders(Array.isArray(data) ? data : (data?.results || []));
    } catch (err: any) {
      showToast('Failed to load riders list: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRiders(true);
    const interval = setInterval(() => {
      loadRiders(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChangeOptimistic = async (rider: Rider, newStatus: 'AVAILABLE' | 'ON_DELIVERY' | 'OFFLINE') => {
    if (rider.status === newStatus) return;
    const previousRiders = [...riders];
    setRiders(prev => prev.map(r => r.id === rider.id ? { ...r, status: newStatus } : r));
    showToast(`Rider '${rider.name}' set to ${newStatus}`, 'info');

    try {
      await updateRider(rider.id, { status: newStatus });
    } catch (err: any) {
      setRiders(previousRiders);
      showToast('Failed to update status: ' + (err.message || 'Error'), 'error');
    }
  };

  const handleOpenAdd = () => {
    setEditingRider(null);
    const defaultBranchId = allBranches.length > 0 ? allBranches[0].id : (userBranchId || 0);
    setFormData({
      name: '',
      phone: '',
      vehicle_type: 'BIKE',
      branch: defaultBranchId,
      status: 'AVAILABLE',
      is_active: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (rider: Rider) => {
    setEditingRider(rider);
    setFormData({
      name: rider.name,
      phone: rider.phone,
      vehicle_type: rider.vehicle_type || 'BIKE',
      branch: rider.branch,
      status: rider.status,
      is_active: rider.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.name.trim() || !formData.phone.trim() || !formData.branch) {
      showToast('Please fill in rider name, phone, and select a branch.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRider) {
        await updateRider(editingRider.id, formData);
        showToast(`Rider '${formData.name}' updated successfully!`, 'success');
      } else {
        await createRider(formData);
        showToast(`Rider '${formData.name}' created successfully!`, 'success');
      }
      setShowModal(false);
      loadRiders();
    } catch (err: any) {
      showToast(err.message || 'Failed to save rider', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete rider '${name}'?`)) return;
    try {
      await deleteRider(id);
      showToast(`Rider '${name}' deleted.`, 'info');
      loadRiders();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete rider', 'error');
    }
  };

  const formatWhatsAppPhone = (phone: string) => {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('03') && clean.length === 11) {
      clean = '92' + clean.substring(1);
    }
    return clean;
  };

  const [brandFilter, setBrandFilter] = useState<string>('ALL');

  const safeRiders = Array.isArray(riders) ? riders : [];
  const filteredRiders = safeRiders.filter(r => {
    const matchesSearch = 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery) ||
      (r.branch_name && r.branch_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.restaurant_name && r.restaurant_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesBrand = brandFilter === 'ALL' || String(r.restaurant_id) === String(brandFilter) || (r.restaurant_name && r.restaurant_name.toLowerCase() === brandFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesBrand;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bike className="text-blue-500" />
            Branch Rider Fleet Management
            {isSuper && (
              <span className="text-[10px] uppercase font-black tracking-wider bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2.5 py-1 rounded-full flex items-center gap-1">
                ⚡ Global Fleet Scope (HQ Console)
              </span>
            )}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-slate-400">
            Manage delivery riders, vehicle types, live status, and contact options across branches.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all"
        >
          <Plus size={16} />
          Add New Rider
        </button>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-zinc-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Search rider by name, phone, branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-slate-950 border border-zinc-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {isSuper && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-slate-400">Brand:</span>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="bg-zinc-50 dark:bg-slate-950 border border-zinc-200 dark:border-slate-800 rounded-lg text-sm px-3 py-2 outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>All Brands</option>
                {restaurants.map((rest) => (
                  <option key={rest.id} value={rest.id} className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    {rest.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-slate-400">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-50 dark:bg-slate-950 border border-zinc-200 dark:border-slate-800 rounded-lg text-sm px-3 py-2 outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>All Statuses</option>
              <option value="AVAILABLE" className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>Available</option>
              <option value="ON_DELIVERY" className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>On Delivery</option>
              <option value="OFFLINE" className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Riders Table / List */}
      <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 dark:text-slate-400">Loading riders list...</div>
        ) : filteredRiders.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 dark:text-slate-400">
            No riders found. Click "Add New Rider" to register a rider for your branch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-slate-950 border-b border-zinc-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Rider Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Branch & Brand</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-slate-800">
                {filteredRiders.map((rider) => (
                  <tr key={rider.id} className="hover:bg-zinc-50/50 dark:hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-slate-100">
                      {rider.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-slate-300 font-mono text-xs">
                      {rider.phone}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        {rider.restaurant_name ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            🏪 {rider.restaurant_name}
                          </span>
                        ) : null}
                        <span className="text-xs font-medium text-zinc-700 dark:text-slate-300">
                          📍 {rider.branch_name || `Branch #${rider.branch}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs uppercase font-bold text-zinc-500 dark:text-slate-400">
                      {rider.vehicle_type}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={rider.status}
                        onChange={(e) => handleStatusChangeOptimistic(rider, e.target.value as any)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border outline-none cursor-pointer ${
                          rider.status === 'AVAILABLE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 dark:bg-emerald-950/40'
                            : rider.status === 'ON_DELIVERY'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 dark:bg-amber-950/40'
                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30 dark:bg-slate-800'
                        }`}
                      >
                        <option value="AVAILABLE" className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                          🟢 Available
                        </option>
                        <option value="ON_DELIVERY" className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                          🟡 On Delivery
                        </option>
                        <option value="OFFLINE" className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                          🔴 Offline
                        </option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {rider.is_active ? (
                        <span className="text-xs font-bold text-emerald-600">Active</span>
                      ) : (
                        <span className="text-xs font-bold text-rose-500">Disabled</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* WhatsApp button */}
                        <a
                          href={`https://wa.me/${formatWhatsAppPhone(rider.phone)}?text=Hello%20${encodeURIComponent(rider.name)},%20this%20is%20FoodSphere%20Management.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Contact via WhatsApp"
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                        >
                          <MessageSquare size={16} />
                        </a>
                        <button
                          onClick={() => handleOpenEdit(rider)}
                          title="Edit Rider"
                          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-slate-800 text-zinc-600 dark:text-slate-300 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(rider.id, rider.name)}
                          title="Delete Rider"
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-slate-100">
              {editingRider ? 'Edit Branch Rider' : 'Add New Branch Rider'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1">
                  Rider Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ali Raza"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-slate-950 border border-zinc-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 03001234567"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-slate-950 border border-zinc-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1">
                  Assigned Branch
                </label>
                {allBranches.length <= 1 || !isSuper ? (
                  <div className="w-full px-3 py-2 bg-zinc-100 dark:bg-slate-950 border border-zinc-200 dark:border-slate-800 rounded-lg text-sm font-bold text-zinc-800 dark:text-slate-200">
                    {allBranches.length > 0
                      ? `${allBranches[0].restaurant_name} — ${allBranches[0].name}`
                      : 'My Managed Branch'}
                  </div>
                ) : (
                  <select
                    required
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-slate-950 border border-zinc-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-blue-500"
                  >
                    <option value={0} disabled>Select Branch...</option>
                    {allBranches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.restaurant_name} — {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-slate-950 border border-zinc-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-blue-500"
                  >
                    <option value="BIKE">Motorcycle / Bike</option>
                    <option value="SCOOTER">Electric Scooter</option>
                    <option value="BICYCLE">Bicycle</option>
                    <option value="CAR">Car / Van</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-slate-950 border border-zinc-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-blue-500"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="ON_DELIVERY">On Delivery</option>
                    <option value="OFFLINE">Offline</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active_check"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active_check" className="text-xs font-semibold text-zinc-700 dark:text-slate-300 cursor-pointer">
                  Rider account is active for order assignments
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-slate-800 text-zinc-600 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting && <Loader2 className="animate-spin" size={14} />}
                  {isSubmitting
                    ? (editingRider ? 'Saving...' : 'Creating...')
                    : (editingRider ? 'Save Changes' : 'Create Rider')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
