import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Star, Phone, Mail, Calendar,
  ShoppingBag, Award, Edit3, CheckCircle, X, RefreshCw
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { fetchCustomers, updateCustomerLoyalty, type ApiCustomer } from '../services/api';

interface LoyaltyEditModal {
  customer: ApiCustomer;
  newPoints: number;
  reason: string;
}

export const CustomerManagement: React.FC = () => {
  const { showToast } = useAdmin();
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState<LoyaltyEditModal | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCustomers = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomers(q);
      setCustomers(data.results);
      setTotalCount(data.count);
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
      showToast('Failed to load customers from API', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers(search || undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const openEditModal = (customer: ApiCustomer) => {
    setEditModal({ customer, newPoints: customer.loyalty_points, reason: '' });
  };

  const handleLoyaltySave = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      const result = await updateCustomerLoyalty(
        editModal.customer.id,
        editModal.newPoints,
        editModal.reason || 'Admin manual adjustment'
      );
      showToast(`Loyalty updated for ${editModal.customer.username}: ${result.old_points} → ${result.new_points} pts ✅`, 'success');
      setCustomers(prev => prev.map(c =>
        c.id === editModal.customer.id ? { ...c, loyalty_points: result.new_points } : c
      ));
      setEditModal(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update loyalty', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-PK', {
      timeZone: 'Asia/Karachi',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <Users className="text-violet-400" size={28} />
            Customer Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {totalCount.toLocaleString()} registered customers · Manage loyalty points
          </p>
        </div>
        <button
          onClick={() => loadCustomers(search || undefined)}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold py-2 px-4 rounded-xl transition-all text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          id="customer-search"
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by username, email or phone..."
          className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 transition"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-slate-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Customer Table */}
      {!loading && (
        <>
          {customers.length === 0 ? (
            <div className="text-center py-16">
              <Users size={48} className="text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">
                {search ? `No customers matching "${search}"` : 'No customers found'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map(customer => (
                <div
                  key={customer.id}
                  className="bg-slate-800/60 border border-slate-700 hover:border-violet-500/40 rounded-2xl p-4 transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Avatar + Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                        {customer.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-sm truncate">{customer.username}</h3>
                          {customer.is_guest && (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20">
                              GUEST
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          {customer.email && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Mail size={10} />
                              {customer.email}
                            </span>
                          )}
                          {customer.phone && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Phone size={10} />
                              {customer.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-violet-400">
                          <Star size={14} />
                          <span className="font-bold text-white">{customer.loyalty_points.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">Points</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-blue-400">
                          <ShoppingBag size={14} />
                          <span className="font-bold text-white">{customer.total_orders}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">Orders</p>
                      </div>
                      <div className="text-center hidden md:block">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Calendar size={14} />
                          <span className="text-xs text-slate-300">{formatDate(customer.date_joined)}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">Joined</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      id={`edit-loyalty-${customer.id}`}
                      onClick={() => openEditModal(customer)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-violet-400 transition-colors group-hover:opacity-100 opacity-60 flex-shrink-0"
                    >
                      <Edit3 size={14} />
                      Edit Points
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Loyalty Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
                  <Award className="text-violet-400" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white">Edit Loyalty Points</h3>
                  <p className="text-xs text-slate-500">@{editModal.customer.username}</p>
                </div>
              </div>
              <button
                onClick={() => setEditModal(null)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Current Points Display */}
              <div className="bg-slate-800 rounded-xl p-4 flex justify-between items-center">
                <span className="text-sm text-slate-400">Current Points</span>
                <span className="text-2xl font-extrabold text-white">
                  {editModal.customer.loyalty_points.toLocaleString()}
                </span>
              </div>

              {/* New Points Input */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  New Points Value
                </label>
                <input
                  id="loyalty-points-input"
                  type="number"
                  min="0"
                  value={editModal.newPoints}
                  onChange={e => setEditModal(m => m ? { ...m, newPoints: Math.max(0, parseInt(e.target.value) || 0) } : null)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-violet-500 transition"
                />
                {editModal.newPoints !== editModal.customer.loyalty_points && (
                  <p className={`text-xs mt-1.5 font-semibold ${editModal.newPoints > editModal.customer.loyalty_points ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {editModal.newPoints > editModal.customer.loyalty_points ? '▲' : '▼'} {Math.abs(editModal.newPoints - editModal.customer.loyalty_points)} points
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Compensation for delayed order"
                  value={editModal.reason}
                  onChange={e => setEditModal(m => m ? { ...m, reason: e.target.value } : null)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 transition"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditModal(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  id="loyalty-save-btn"
                  onClick={handleLoyaltySave}
                  disabled={saving || editModal.newPoints === editModal.customer.loyalty_points}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold transition-all text-sm disabled:cursor-not-allowed"
                >
                  <CheckCircle size={14} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
