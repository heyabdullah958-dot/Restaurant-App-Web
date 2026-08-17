import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap, Plus, Edit2, Trash2, CheckCircle2, XCircle, Loader2, UploadCloud,
  Info, RefreshCw, Link as LinkIcon, Search, Clock, Calendar, Store, Layers, Flame
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import {
  fetchFlashDeals,
  createFlashDeal,
  updateFlashDeal,
  deleteFlashDeal,
  fetchRestaurants,
  apiFetch
} from '../services/api';

const DAYS_OF_WEEK = [
  { key: 'MON', label: 'Mon' },
  { key: 'TUE', label: 'Tue' },
  { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' },
  { key: 'FRI', label: 'Fri' },
  { key: 'SAT', label: 'Sat' },
  { key: 'SUN', label: 'Sun' },
];

const TIME_OPTIONS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

const formatTimeLabel = (timeStr: string) => {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
};

export const FlashDealManagement: React.FC = () => {
  const { showToast } = useAdmin();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingDeal, setEditingDeal] = useState<any | null>(null);

  // Tenancy Data
  const [restaurantsList, setRestaurantsList] = useState<any[]>([]);
  const [brandCategories, setBrandCategories] = useState<any[]>([]);
  const [brandMenuItems, setBrandMenuItems] = useState<any[]>([]);
  const [loadingMenu, setLoadingMenu] = useState<boolean>(false);
  const [searchItemQuery, setSearchItemQuery] = useState<string>('');

  // Image Upload States
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);

  // Form Data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deal_type: 'percentage',
    discount_value: '25',
    max_discount: '',
    min_subtotal: '0',
    restaurant: null as number | null,
    branch: null as number | null,
    order_mode: 'ALL' as 'ALL' | 'DELIVERY' | 'DINE_IN',
    item_scope_type: 'ENTIRE_MENU' as 'ENTIRE_MENU' | 'CATEGORY' | 'SPECIFIC_ITEMS',
    categories: [] as number[],
    menu_items: [] as number[],
    timing_type: 'ONE_TIME' as 'ONE_TIME' | 'RECURRING_DAILY',
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    daily_start_time: '00:00',
    daily_end_time: '06:00',
    active_days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as string[],
    valid_from: '',
    valid_until: '',
    max_orders: 0,
    redemption_reset_frequency: 'DAILY' as 'DAILY' | 'LIFETIME',
    priority: 0,
    image: '',
    is_active: true,
  });

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [dealsData, restsData] = await Promise.all([
        fetchFlashDeals(),
        fetchRestaurants(),
      ]);
      setDeals(Array.isArray(dealsData) ? dealsData : (dealsData?.results || []));
      setRestaurantsList(Array.isArray(restsData) ? restsData : (restsData?.results || []));
    } catch (err: any) {
      showToast('Failed to load flash deals or restaurants data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch Menu Items & Categories when brand is selected
  useEffect(() => {
    if (formData.restaurant) {
      loadBrandMenu(formData.restaurant);
    } else {
      setBrandCategories([]);
      setBrandMenuItems([]);
    }
  }, [formData.restaurant]);

  const loadBrandMenu = async (brandId: number) => {
    setLoadingMenu(true);
    try {
      const data = await apiFetch<any>(`/api/restaurants/${brandId}/menu/`);
      const cats = data?.data || (Array.isArray(data) ? data : data?.results || []);
      setBrandCategories(cats);
      const items: any[] = [];
      cats.forEach((c: any) => {
        (c.items || []).forEach((item: any) => {
          items.push({ ...item, category_name: c.name });
        });
      });
      setBrandMenuItems(items);
    } catch (e) {
      setBrandCategories([]);
      setBrandMenuItems([]);
    } finally {
      setLoadingMenu(false);
    }
  };

  const selectedBrandObj = useMemo(() => {
    return restaurantsList.find(r => r.id === formData.restaurant);
  }, [restaurantsList, formData.restaurant]);

  const branchesForSelectedBrand = useMemo(() => {
    return selectedBrandObj?.branches || [];
  }, [selectedBrandObj]);

  const filteredMenuItems = useMemo(() => {
    if (!searchItemQuery.trim()) return brandMenuItems;
    const q = searchItemQuery.toLowerCase();
    return brandMenuItems.filter(
      item => item.name.toLowerCase().includes(q) || (item.category_name && item.category_name.toLowerCase().includes(q))
    );
  }, [brandMenuItems, searchItemQuery]);

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('File size exceeds 2MB limit.', 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('upload_preset', 'foodsphere_preset');

      const res = await fetch('https://api.cloudinary.com/v1_1/depa8gfnk/image/upload', {
        method: 'POST',
        body,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.secure_url) {
          setFormData(prev => ({ ...prev, image: data.secure_url }));
          showToast('Banner uploaded successfully!', 'success');
          setUploadingImage(false);
          return;
        }
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormData(prev => ({ ...prev, image: reader.result as string }));
          showToast('Image loaded successfully!', 'success');
        }
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadingImage(false);
      showToast('Failed to upload image.', 'error');
    }
  };

  const openAddModal = () => {
    setEditingDeal(null);
    setFormData({
      title: '',
      description: '',
      deal_type: 'percentage',
      discount_value: '25',
      max_discount: '',
      min_subtotal: '0',
      restaurant: null,
      branch: null,
      order_mode: 'ALL',
      item_scope_type: 'ENTIRE_MENU',
      categories: [],
      menu_items: [],
      timing_type: 'ONE_TIME',
      start_time: new Date().toISOString().slice(0, 16),
      end_time: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
      daily_start_time: '00:00',
      daily_end_time: '06:00',
      active_days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      valid_from: '',
      valid_until: '',
      max_orders: 0,
      redemption_reset_frequency: 'DAILY',
      priority: 0,
      image: '',
      is_active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (deal: any) => {
    setEditingDeal(deal);
    setFormData({
      title: deal.title || '',
      description: deal.description || '',
      deal_type: deal.deal_type || 'percentage',
      discount_value: String(deal.discount_value || '25'),
      max_discount: deal.max_discount ? String(deal.max_discount) : '',
      min_subtotal: deal.min_subtotal ? String(deal.min_subtotal) : '0',
      restaurant: deal.restaurant || null,
      branch: deal.branch || null,
      order_mode: deal.order_mode || 'ALL',
      item_scope_type: deal.item_scope_type || 'ENTIRE_MENU',
      categories: deal.categories || [],
      menu_items: deal.menu_items || [],
      timing_type: deal.timing_type || 'ONE_TIME',
      start_time: deal.start_time ? deal.start_time.slice(0, 16) : new Date().toISOString().slice(0, 16),
      end_time: deal.end_time ? deal.end_time.slice(0, 16) : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
      daily_start_time: deal.daily_start_time || '00:00',
      daily_end_time: deal.daily_end_time || '06:00',
      active_days: deal.active_days || ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      valid_from: deal.valid_from || '',
      valid_until: deal.valid_until || '',
      max_orders: deal.max_orders || 0,
      redemption_reset_frequency: deal.redemption_reset_frequency || 'DAILY',
      priority: deal.priority || 0,
      image: deal.image || '',
      is_active: deal.is_active ?? true,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.discount_value) {
      showToast('Title and discount value are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        deal_type: formData.deal_type,
        discount_value: parseFloat(formData.discount_value) || 0,
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        min_subtotal: formData.min_subtotal ? parseFloat(formData.min_subtotal) : 0,
        restaurant: formData.restaurant,
        branch: formData.branch,
        order_mode: formData.order_mode,
        item_scope_type: formData.item_scope_type,
        categories: formData.item_scope_type === 'CATEGORY' ? formData.categories : [],
        menu_items: formData.item_scope_type === 'SPECIFIC_ITEMS' ? formData.menu_items : [],
        timing_type: formData.timing_type,
        start_time: formData.timing_type === 'ONE_TIME' ? new Date(formData.start_time).toISOString() : null,
        end_time: formData.timing_type === 'ONE_TIME' ? new Date(formData.end_time).toISOString() : null,
        daily_start_time: formData.timing_type === 'RECURRING_DAILY' ? formData.daily_start_time : null,
        daily_end_time: formData.timing_type === 'RECURRING_DAILY' ? formData.daily_end_time : null,
        active_days: formData.timing_type === 'RECURRING_DAILY' ? formData.active_days : [],
        valid_from: formData.timing_type === 'RECURRING_DAILY' && formData.valid_from ? formData.valid_from : null,
        valid_until: formData.timing_type === 'RECURRING_DAILY' && formData.valid_until ? formData.valid_until : null,
        max_orders: parseInt(String(formData.max_orders), 10) || 0,
        redemption_reset_frequency: formData.redemption_reset_frequency,
        priority: parseInt(String(formData.priority), 10) || 0,
        image: formData.image,
        is_active: formData.is_active,
      };

      if (editingDeal) {
        await updateFlashDeal(editingDeal.id, payload);
        showToast('Flash deal updated successfully!', 'success');
      } else {
        await createFlashDeal(payload);
        showToast('Flash deal created successfully!', 'success');
      }
      setShowModal(false);
      loadInitialData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save flash deal.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this flash deal?')) return;
    try {
      await deleteFlashDeal(id);
      showToast('Flash deal deleted successfully.', 'success');
      setDeals(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      showToast('Failed to delete deal.', 'error');
    }
  };

  const handleToggleActive = async (deal: any) => {
    try {
      await updateFlashDeal(deal.id, { is_active: !deal.is_active });
      setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, is_active: !d.is_active } : d));
      showToast(`Deal '${deal.title}' ${!deal.is_active ? 'enabled' : 'disabled'}.`, 'success');
    } catch (e) {
      showToast('Failed to toggle deal status.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-7 h-7 text-rose-500 fill-rose-500" />
            Flash Deals & Recurring Specials
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure platform-wide, brand-specific, and recurring midnight specials with granular item scoping.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadInitialData}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold shadow-lg shadow-rose-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Create Flash Deal
          </button>
        </div>
      </div>

      {/* Deals Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-3" />
          <p>Loading Active Deals & Campaigns...</p>
        </div>
      ) : deals.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-200">No Flash Deals Active</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
            Create limited-time promotions, midnight burger specials, or brand discounts to boost order volume.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition"
          >
            + Create First Deal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deals.map(deal => {
            const isRecurring = deal.timing_type === 'RECURRING_DAILY';
            const redemptions = deal.current_redemptions ?? deal.orders_used ?? 0;
            const maxCap = deal.max_orders || 0;
            const percent = maxCap > 0 ? Math.min(100, Math.round((redemptions / maxCap) * 100)) : 0;

            return (
              <div
                key={deal.id}
                className={`bg-slate-900 border rounded-xl overflow-hidden transition flex flex-col justify-between ${
                  deal.is_active ? 'border-slate-800 shadow-md' : 'border-slate-800/50 opacity-60'
                }`}
              >
                <div>
                  {deal.image && (
                    <div className="h-36 w-full overflow-hidden relative">
                      <img src={deal.image} alt={deal.title} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 bg-rose-600 text-white font-extrabold text-xs px-2.5 py-1 rounded shadow">
                        {deal.discount_display_text || `${deal.discount_value}% OFF`}
                      </div>
                    </div>
                  )}

                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-100 text-base flex items-center gap-1.5">
                          {isRecurring ? '🌙' : '⚡'} {deal.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                          {deal.description || 'Exclusive promotional discount'}
                        </p>
                      </div>
                      {!deal.image && (
                        <span className="bg-rose-500/20 text-rose-400 font-extrabold text-xs px-2.5 py-1 rounded border border-rose-500/30 whitespace-nowrap">
                          {deal.discount_display_text || `${deal.discount_value}% OFF`}
                        </span>
                      )}
                    </div>

                    {/* Scope Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        🏪 {deal.restaurant_name || 'All Brands'}
                        {deal.branch_name ? ` · 📍 ${deal.branch_name}` : ''}
                      </span>
                      <span className="text-[11px] font-semibold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                        {deal.item_scope_type === 'SPECIFIC_ITEMS'
                          ? '🍔 Specific Items'
                          : deal.item_scope_type === 'CATEGORY'
                          ? '📂 Category'
                          : '🍽️ Entire Menu'}
                      </span>
                      {deal.order_mode && deal.order_mode !== 'ALL' && (
                        <span className="text-[11px] font-semibold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">
                          {deal.order_mode === 'DINE_IN' ? '🍽️ Dine-In Only' : '🛵 Delivery Only'}
                        </span>
                      )}
                    </div>

                    {/* Schedule Row */}
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      {isRecurring ? (
                        <div className="space-y-0.5">
                          <div className="text-amber-400 font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTimeLabel(deal.daily_start_time)} – {formatTimeLabel(deal.daily_end_time)}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Days: {(deal.active_days || []).join(', ')}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Date(deal.start_time).toLocaleDateString()} → {new Date(deal.end_time).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Redemption Cap Progress */}
                    {maxCap > 0 && (
                      <div className="space-y-1 bg-slate-950/40 p-2 rounded border border-slate-800">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>🔥 Redemptions: {redemptions} / {maxCap}</span>
                          <span>{deal.redemption_reset_frequency === 'DAILY' ? 'Daily Reset' : 'Lifetime Cap'}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="px-5 py-3 bg-slate-950/70 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleActive(deal)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded flex items-center gap-1 transition ${
                      deal.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {deal.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {deal.is_active ? 'Active' : 'Disabled'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(deal)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
                      title="Edit Scopes & Timing"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(deal.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition"
                      title="Delete Deal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6-Step Progressive Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-rose-500" />
                {editingDeal ? 'Edit Flash Deal Campaign' : 'Create Flash Deal Campaign'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* STEP 1: Deal Identity */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">1</span>
                  Deal Identity & Copy
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Campaign Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Midnight Smash Madness, Friday BBQ Hour"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Marketing Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g. 30% off on all Mighty Burgers between 12:00 AM - 6:00 AM"
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 2: Target Scope */}
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">2</span>
                  Target Tenancy & Mode Scope
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Brand Scope</label>
                    <select
                      value={formData.restaurant || ''}
                      onChange={e => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : null;
                        setFormData({ ...formData, restaurant: val, branch: null });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                    >
                      <option value="">🌐 All Brands (Global Platform Deal)</option>
                      {restaurantsList.map(r => (
                        <option key={r.id} value={r.id}>🏪 {r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Branch Scope</label>
                    <select
                      value={formData.branch || ''}
                      onChange={e => setFormData({ ...formData, branch: e.target.value ? parseInt(e.target.value, 10) : null })}
                      disabled={!formData.restaurant || branchesForSelectedBrand.length === 0}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500 disabled:opacity-40"
                    >
                      <option value="">📍 All Branches of Brand</option>
                      {branchesForSelectedBrand.map((b: any) => (
                        <option key={b.id} value={b.id}>📍 {b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Order Fulfillment Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'ALL', label: 'All Orders' },
                      { key: 'DELIVERY', label: '🛵 Delivery Only' },
                      { key: 'DINE_IN', label: '🍽️ Dine-In Only' },
                    ].map(mode => (
                      <button
                        type="button"
                        key={mode.key}
                        onClick={() => setFormData({ ...formData, order_mode: mode.key as any })}
                        className={`py-2 text-xs font-semibold rounded-lg border transition ${
                          formData.order_mode === mode.key
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* STEP 3: Item / Menu Scope */}
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">3</span>
                  Item & Category Scope
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'ENTIRE_MENU', label: 'Entire Menu' },
                    { key: 'CATEGORY', label: 'By Category' },
                    { key: 'SPECIFIC_ITEMS', label: 'Specific Items' },
                  ].map(scope => (
                    <button
                      type="button"
                      key={scope.key}
                      onClick={() => setFormData({ ...formData, item_scope_type: scope.key as any })}
                      className={`py-2 text-xs font-semibold rounded-lg border transition ${
                        formData.item_scope_type === scope.key
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {scope.label}
                    </button>
                  ))}
                </div>

                {formData.item_scope_type === 'CATEGORY' && (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                    <p className="text-xs text-slate-400">Select Applicable Categories:</p>
                    {loadingMenu ? (
                      <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                    ) : brandCategories.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">Select a brand above to load categories.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {brandCategories.map(c => {
                          const isSelected = formData.categories.includes(c.id);
                          return (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  categories: isSelected ? prev.categories.filter(id => id !== c.id) : [...prev.categories, c.id]
                                }));
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                                isSelected
                                  ? 'bg-rose-600 text-white border-rose-600'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {isSelected ? '✓ ' : ''}{c.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {formData.item_scope_type === 'SPECIFIC_ITEMS' && (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchItemQuery}
                        onChange={e => setSearchItemQuery(e.target.value)}
                        placeholder="Search dishes by name..."
                        className="bg-transparent text-xs text-slate-100 focus:outline-none w-full"
                      />
                    </div>

                    {loadingMenu ? (
                      <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                    ) : (
                      <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                        {filteredMenuItems.map(dish => {
                          const isSelected = formData.menu_items.includes(dish.id);
                          return (
                            <div
                              key={dish.id}
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  menu_items: isSelected ? prev.menu_items.filter(id => id !== dish.id) : [...prev.menu_items, dish.id]
                                }));
                              }}
                              className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer transition border ${
                                isSelected
                                  ? 'bg-rose-500/10 border-rose-500 text-slate-100'
                                  : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:bg-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="accent-rose-500 rounded"
                                />
                                <span className="font-semibold">{dish.name}</span>
                                <span className="text-[10px] text-slate-500">({dish.category_name})</span>
                              </div>
                              <span className="font-bold text-slate-200">Rs. {dish.price}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* STEP 4: Mechanics & Caps */}
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">4</span>
                  Deal Mechanics & Limits
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Deal Type</label>
                    <select
                      value={formData.deal_type}
                      onChange={e => setFormData({ ...formData, deal_type: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                    >
                      <option value="percentage">% Off</option>
                      <option value="flat">Flat Rs. Off</option>
                      <option value="bogo">Buy 1 Get 1</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      {formData.deal_type === 'percentage' ? 'Discount % *' : 'Discount Value (Rs.) *'}
                    </label>
                    <input
                      type="number"
                      value={formData.discount_value}
                      onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                      placeholder="25"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                      required
                    />
                  </div>
                  {formData.deal_type === 'percentage' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Max Cap (Rs.)</label>
                      <input
                        type="number"
                        value={formData.max_discount}
                        onChange={e => setFormData({ ...formData, max_discount: e.target.value })}
                        placeholder="e.g. 200"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Min Subtotal (Rs.)</label>
                    <input
                      type="number"
                      value={formData.min_subtotal}
                      onChange={e => setFormData({ ...formData, min_subtotal: e.target.value })}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Max Orders Cap (0 = ∞)</label>
                    <input
                      type="number"
                      value={formData.max_orders}
                      onChange={e => setFormData({ ...formData, max_orders: parseInt(e.target.value, 10) || 0 })}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Cap Reset Frequency</label>
                    <select
                      value={formData.redemption_reset_frequency}
                      onChange={e => setFormData({ ...formData, redemption_reset_frequency: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                    >
                      <option value="DAILY">🌙 Daily/Nightly Reset</option>
                      <option value="LIFETIME">♾️ Lifetime Total</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* STEP 5: Schedule & Recurrence */}
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">5</span>
                  Timing & Recurring Schedule
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, timing_type: 'ONE_TIME' })}
                    className={`py-2 text-xs font-semibold rounded-lg border transition ${
                      formData.timing_type === 'ONE_TIME'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    📅 One-Time Window
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, timing_type: 'RECURRING_DAILY' })}
                    className={`py-2 text-xs font-semibold rounded-lg border transition ${
                      formData.timing_type === 'RECURRING_DAILY'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    🌙 Recurring Daily Schedule
                  </button>
                </div>

                {formData.timing_type === 'ONE_TIME' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Start Date & Time</label>
                      <input
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">End Date & Time</label>
                      <input
                        type="datetime-local"
                        value={formData.end_time}
                        onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Daily Start Time</label>
                        <select
                          value={formData.daily_start_time}
                          onChange={e => setFormData({ ...formData, daily_start_time: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                        >
                          {TIME_OPTIONS.map(t => (
                            <option key={t} value={t}>{formatTimeLabel(t)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Daily End Time (Supports Midnight Rollover)</label>
                        <select
                          value={formData.daily_end_time}
                          onChange={e => setFormData({ ...formData, daily_end_time: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                        >
                          {TIME_OPTIONS.map(t => (
                            <option key={t} value={t}>{formatTimeLabel(t)}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-400">Active Days</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, active_days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] })}
                            className="text-[11px] text-rose-400 hover:underline"
                          >
                            Every Day
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, active_days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] })}
                            className="text-[11px] text-rose-400 hover:underline"
                          >
                            Weekdays
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, active_days: ['SAT', 'SUN'] })}
                            className="text-[11px] text-rose-400 hover:underline"
                          >
                            Weekends
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5">
                        {DAYS_OF_WEEK.map(d => {
                          const isDayActive = formData.active_days.includes(d.key);
                          return (
                            <button
                              type="button"
                              key={d.key}
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  active_days: isDayActive ? prev.active_days.filter(x => x !== d.key) : [...prev.active_days, d.key]
                                }));
                              }}
                              className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                                isDayActive
                                  ? 'bg-rose-600 text-white border-rose-600'
                                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 6: Live Preview Card */}
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">6</span>
                  Customer Live Preview
                </h4>
                <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="bg-rose-600 text-white font-extrabold text-xs px-2.5 py-1 rounded">
                      ⚡ {formData.deal_type === 'percentage' ? `${formData.discount_value || 0}% OFF` : `Flat Rs. ${formData.discount_value || 0} OFF`}
                    </span>
                    <span className="text-xs font-bold text-amber-400">
                      {formData.timing_type === 'RECURRING_DAILY' ? `🌙 Closes ${formatTimeLabel(formData.daily_end_time)}` : '⚡ Live Deal'}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-100 text-base">{formData.title || 'Campaign Title Preview'}</h3>
                  <p className="text-xs text-slate-400">
                    Sample Item: <span className="line-through text-slate-500">Rs. 850</span>{' '}
                    <span className="text-emerald-400 font-extrabold">
                      Rs. {Math.round(850 - (850 * (parseFloat(formData.discount_value) || 0)) / 100)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm font-semibold transition"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingDeal ? 'Update Flash Deal' : 'Publish Flash Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashDealManagement;
