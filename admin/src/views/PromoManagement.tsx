import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, CheckCircle2, XCircle, Search } from 'lucide-react';
import { fetchCoupons, createCoupon, updateCoupon, deleteCoupon } from '../services/api';

export const PromoManagement: React.FC = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
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
    valid_from: new Date().toISOString().slice(0, 16),
    valid_to: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
    usage_limit: '100',
    is_active: true,
  });

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const data = await fetchCoupons();
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load coupons, using fallback empty state:', err);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, formData);
      } else {
        await createCoupon(formData);
      }
      setShowModal(false);
      setEditingCoupon(null);
      loadCoupons();
    } catch (err: any) {
      alert(err.message || 'Error saving coupon');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;
    try {
      await deleteCoupon(id);
      loadCoupons();
    } catch (err: any) {
      alert(err.message || 'Error deleting coupon');
    }
  };

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="text-red-500" /> Promo Code Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create, update, and manage promotional discount coupons for GetFood platform.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCoupon(null);
            setFormData({
              code: '',
              discount_type: 'percentage',
              discount_value: '',
              min_subtotal: '0',
              max_discount: '',
              valid_from: new Date().toISOString().slice(0, 16),
              valid_to: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
              usage_limit: '100',
              is_active: true,
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus size={18} /> Add Promo Code
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search promo codes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading promo codes...</div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No promo codes found. Click "Add Promo Code" to create one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Code</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Min Subtotal</th>
                  <th className="p-4">Validity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="p-4 font-mono font-bold text-red-600 dark:text-red-400">{coupon.code}</td>
                    <td className="p-4 text-slate-800 dark:text-slate-200">
                      {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `Rs. ${coupon.discount_value}`}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">Rs. {coupon.min_subtotal}</td>
                    <td className="p-4 text-xs text-slate-500">
                      {new Date(coupon.valid_from).toLocaleDateString()} - {new Date(coupon.valid_to).toLocaleDateString()}
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
                        onClick={() => {
                          setEditingCoupon(coupon);
                          setFormData({
                            code: coupon.code,
                            discount_type: coupon.discount_type,
                            discount_value: coupon.discount_value.toString(),
                            min_subtotal: coupon.min_subtotal.toString(),
                            max_discount: coupon.max_discount ? coupon.max_discount.toString() : '',
                            valid_from: new Date(coupon.valid_from).toISOString().slice(0, 16),
                            valid_to: new Date(coupon.valid_to).toISOString().slice(0, 16),
                            usage_limit: coupon.usage_limit.toString(),
                            is_active: coupon.is_active,
                          });
                          setShowModal(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 transition"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        className="p-1.5 text-slate-500 hover:text-red-600 transition"
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
              {editingCoupon ? 'Edit Promo Code' : 'Create Promo Code'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  placeholder="e.g. GETFOOD50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Discount Type</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (Rs.)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    placeholder="20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Min Subtotal (Rs.)</label>
                <input
                  type="number"
                  value={formData.min_subtotal}
                  onChange={(e) => setFormData({ ...formData, min_subtotal: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Active immediately
                </label>
              </div>
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
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                >
                  Save Coupon
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
