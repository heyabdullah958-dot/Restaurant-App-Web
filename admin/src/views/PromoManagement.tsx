import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, CheckCircle2, XCircle, Search, Building2, Store, ShieldCheck } from 'lucide-react';
import { fetchCoupons, createCoupon, updateCoupon, deleteCoupon, fetchRestaurantsList, fetchBranches } from '../services/api';

export const PromoManagement: React.FC = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_subtotal: '0',
    max_discount: '',
    target_scope: 'global', // 'global' | 'restaurant' | 'branch'
    restaurant: '',
    branch: '',
    valid_from: new Date().toISOString().slice(0, 16),
    valid_to: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
    usage_limit: '100',
    per_user_limit: '1',
    is_active: true,
  });

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [couponsData, restsData, branchesData] = await Promise.all([
        fetchCoupons(),
        fetchRestaurantsList().catch(() => []),
        fetchBranches().catch(() => []),
      ]);
      setCoupons(Array.isArray(couponsData) ? couponsData : []);
      setRestaurants(Array.isArray(restsData) ? restsData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
    } catch (err) {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        code: formData.code.trim().toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value) || 0,
        min_subtotal: parseFloat(formData.min_subtotal) || 0,
        max_discount: formData.discount_type === 'percentage' && formData.max_discount ? parseFloat(formData.max_discount) : null,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_to: new Date(formData.valid_to).toISOString(),
        usage_limit: parseInt(formData.usage_limit, 10) || 100,
        per_user_limit: parseInt(formData.per_user_limit, 10) || 1,
        is_active: formData.is_active,
        restaurant: formData.target_scope !== 'global' && formData.restaurant ? parseInt(formData.restaurant, 10) : null,
        branch: formData.target_scope === 'branch' && formData.branch ? parseInt(formData.branch, 10) : null,
      };

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, payload);
      } else {
        await createCoupon(payload);
      }
      setShowModal(false);
      setEditingCoupon(null);
      loadInitialData();
    } catch (err: any) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : (err.message || 'Error saving coupon');
      alert(`Save Failed: ${msg}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;
    try {
      await deleteCoupon(id);
      loadInitialData();
    } catch (err: any) {
      alert(err.message || 'Error deleting coupon');
    }
  };

  const handleScopeChange = (scope: string) => {
    setFormData((prev) => ({
      ...prev,
      target_scope: scope,
      restaurant: scope === 'global' ? '' : prev.restaurant,
      branch: scope === 'branch' ? prev.branch : '',
    }));
  };

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.restaurant_name && c.restaurant_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.branch_name && c.branch_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const availableBranchesForSelectedRest = branches.filter((b) => {
    if (!formData.restaurant) return true;
    return String(b.restaurant) === String(formData.restaurant) || String(b.restaurant_id) === String(formData.restaurant);
  });

  const resetForm = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      min_subtotal: '0',
      max_discount: '',
      target_scope: 'global',
      restaurant: restaurants.length > 0 ? String(restaurants[0].id) : '',
      branch: '',
      valid_from: new Date().toISOString().slice(0, 16),
      valid_to: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
      usage_limit: '100',
      per_user_limit: '1',
      is_active: true,
    });
  };

  const openEditModal = (coupon: any) => {
    setEditingCoupon(coupon);
    let scope = 'global';
    if (coupon.branch) {
      scope = 'branch';
    } else if (coupon.restaurant) {
      scope = 'restaurant';
    }

    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value ? coupon.discount_value.toString() : '',
      min_subtotal: coupon.min_subtotal ? coupon.min_subtotal.toString() : '0',
      max_discount: coupon.max_discount ? coupon.max_discount.toString() : '',
      target_scope: scope,
      restaurant: coupon.restaurant ? coupon.restaurant.toString() : '',
      branch: coupon.branch ? coupon.branch.toString() : '',
      valid_from: coupon.valid_from ? new Date(coupon.valid_from).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      valid_to: coupon.valid_to ? new Date(coupon.valid_to).toISOString().slice(0, 16) : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
      usage_limit: coupon.usage_limit ? coupon.usage_limit.toString() : '100',
      per_user_limit: coupon.per_user_limit ? coupon.per_user_limit.toString() : '1',
      is_active: coupon.is_active ?? true,
    });
    setShowModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="text-red-500" /> Enterprise Promo Engine
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create universal, tenant-scoped, and branch-specific promotional discount coupons with granular controls.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition shadow-sm"
        >
          <Plus size={18} /> Create Promo Code
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search by promo code, brand name, or branch..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white shadow-sm text-sm"
        />
      </div>

      {/* Promo List Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading promo engine rules...</div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No promo codes found. Click "Create Promo Code" to add one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Coupon Code</th>
                  <th className="p-4">Target Scope</th>
                  <th className="p-4">Discount Structure</th>
                  <th className="p-4">Min Subtotal</th>
                  <th className="p-4">Usage & Limits</th>
                  <th className="p-4">Validity Period</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-4 font-mono font-bold text-red-600 dark:text-red-400 text-base">
                      {coupon.code}
                    </td>
                    <td className="p-4">
                      {coupon.branch_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                          <Store size={12} /> {coupon.restaurant_name || 'Brand'} - {coupon.branch_name}
                        </span>
                      ) : coupon.restaurant_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          <Building2 size={12} /> {coupon.restaurant_name} (All Branches)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                          <ShieldCheck size={12} /> Global (All Restaurants)
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-900 dark:text-slate-100 font-medium">
                      {coupon.discount_type === 'percentage' ? (
                        <div>
                          <span>{coupon.discount_value}% Off</span>
                          {coupon.max_discount && (
                            <span className="block text-xs text-slate-400 font-normal">Cap: Rs. {coupon.max_discount}</span>
                          )}
                        </div>
                      ) : (
                        <span>Flat Rs. {coupon.discount_value} Off</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 text-sm">
                      Rs. {coupon.min_subtotal}
                    </td>
                    <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                      <div><span className="font-semibold">{coupon.times_used}</span> / {coupon.usage_limit || '∞'} used</div>
                      <div className="text-slate-400">Max {coupon.per_user_limit || 1}/user</div>
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      <div>{coupon.valid_from ? new Date(coupon.valid_from).toLocaleDateString() : 'Immediate'}</div>
                      <div>to {coupon.valid_to ? new Date(coupon.valid_to).toLocaleDateString() : 'No expiry'}</div>
                    </td>
                    <td className="p-4">
                      {coupon.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400">
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(coupon)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Edit Promo Code"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        className="p-1.5 text-slate-500 hover:text-red-600 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Delete Promo Code"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Promo Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto my-8">
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="text-red-500" /> {editingCoupon ? 'Edit Enterprise Promo Code' : 'Create Enterprise Promo Code'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              {/* Code & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold uppercase tracking-wider focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="e.g. GETFOMOS20"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Active
                    </span>
                  </label>
                </div>
              </div>

              {/* Granular Scope Selection */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-red-500" /> Target Campaign Scope
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleScopeChange('global')}
                    className={`p-2.5 text-xs font-semibold rounded-lg border transition text-center ${
                      formData.target_scope === 'global'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Global (All)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScopeChange('restaurant')}
                    className={`p-2.5 text-xs font-semibold rounded-lg border transition text-center ${
                      formData.target_scope === 'restaurant'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Specific Restaurant
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScopeChange('branch')}
                    className={`p-2.5 text-xs font-semibold rounded-lg border transition text-center ${
                      formData.target_scope === 'branch'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Specific Branch
                  </button>
                </div>

                {formData.target_scope !== 'global' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Select Restaurant Brand *</label>
                      <select
                        value={formData.restaurant}
                        onChange={(e) => setFormData({ ...formData, restaurant: e.target.value, branch: '' })}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      >
                        <option value="">-- Choose Brand --</option>
                        {restaurants.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    {formData.target_scope === 'branch' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Select Branch *</label>
                        <select
                          value={formData.branch}
                          onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                          className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        >
                          <option value="">-- Choose Branch --</option>
                          {availableBranchesForSelectedRest.map((b) => (
                            <option key={b.id} value={b.id}>{b.name} ({b.city || 'Branch'})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Discount Structure */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Discount Type</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Fixed Amount (Rs.)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Value ({formData.discount_type === 'percentage' ? '%' : 'Rs.'}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    placeholder={formData.discount_type === 'percentage' ? '20' : '200'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Max Cap (Rs.) {formData.discount_type === 'flat' && '(N/A)'}
                  </label>
                  <input
                    type="number"
                    disabled={formData.discount_type === 'flat'}
                    value={formData.max_discount}
                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:opacity-40"
                    placeholder="e.g. 300"
                  />
                </div>
              </div>

              {/* Subtotal & Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Min Subtotal (Rs.)</label>
                  <input
                    type="number"
                    value={formData.min_subtotal}
                    onChange={(e) => setFormData({ ...formData, min_subtotal: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Max Total Redemptions</label>
                  <input
                    type="number"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Per User Limit</label>
                  <input
                    type="number"
                    value={formData.per_user_limit}
                    onChange={(e) => setFormData({ ...formData, per_user_limit: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    placeholder="1"
                  />
                </div>
              </div>

              {/* Validity Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Expiry Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.valid_to}
                    onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition shadow-md"
                >
                  {editingCoupon ? 'Update Coupon' : 'Save Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoManagement;
