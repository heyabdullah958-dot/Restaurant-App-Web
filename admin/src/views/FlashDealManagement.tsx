import React, { useState, useEffect } from 'react';
import { Zap, Plus, Edit2, Trash2, CheckCircle2, XCircle, Loader2, UploadCloud, Info, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { fetchFlashDeals, createFlashDeal, updateFlashDeal, deleteFlashDeal } from '../services/api';

export const FlashDealManagement: React.FC = () => {
  const { showToast } = useAdmin();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingDeal, setEditingDeal] = useState<any | null>(null);
  
  // Image Upload States
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deal_type: 'percentage',
    discount_value: '',
    image: '',
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 16),
    is_active: true,
    is_dine_in_only: false,
  });

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // 1. Validate File Format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Invalid file format. Only JPG, PNG, and WEBP are supported.', 'error');
      return;
    }

    // 2. Validate File Size (Max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      showToast('File size exceeds 2MB limit. Please select a smaller image.', 'error');
      return;
    }

    setUploadingImage(true);

    try {
      // Attempt direct Cloudinary upload preset first
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
          showToast('Banner uploaded to Cloudinary successfully!', 'success');
          setUploadingImage(false);
          return;
        }
      }

      // Fallback: Read file as Data URL string if unsigned upload fails
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormData(prev => ({ ...prev, image: reader.result as string }));
          showToast('Banner image loaded successfully!', 'success');
        }
        setUploadingImage(false);
      };
      reader.onerror = () => {
        showToast('Failed to read image file.', 'error');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      // Fallback to FileReader
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormData(prev => ({ ...prev, image: reader.result as string }));
          showToast('Banner image loaded successfully!', 'success');
        }
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadDeals = async () => {
    setLoading(true);
    try {
      const data = await fetchFlashDeals();
      setDeals(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast('Failed to load flash deals.', 'error');
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeals();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDeal) {
        await updateFlashDeal(editingDeal.id, formData);
        showToast('Flash deal updated successfully!', 'success');
      } else {
        await createFlashDeal(formData);
        showToast('Flash deal created successfully!', 'success');
      }
      setShowModal(false);
      setEditingDeal(null);
      loadDeals();
    } catch (err: any) {
      showToast(err.message || 'Error saving flash deal', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this flash deal?')) return;
    try {
      await deleteFlashDeal(id);
      showToast('Flash deal deleted successfully!', 'success');
      loadDeals();
    } catch (err: any) {
      showToast(err.message || 'Error deleting flash deal', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="text-amber-500" /> Flash Deals Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create and schedule limited-time flash sales and combo deal banners.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingDeal(null);
            setFormData({
              title: '',
              description: '',
              deal_type: 'percentage',
              discount_value: '',
              image: '',
              start_time: new Date().toISOString().slice(0, 16),
              end_time: new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 16),
              is_active: true,
              is_dine_in_only: false,
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus size={18} /> Create Flash Deal
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading flash deals...</div>
      ) : deals.length === 0 ? (
        <div className="p-8 bg-white dark:bg-slate-800 rounded-xl text-center text-slate-500 border border-slate-200 dark:border-slate-700">
          No active flash deals. Click "Create Flash Deal" to add a new banner offer.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deals.map((deal) => (
            <div key={deal.id} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
              {deal.image ? (
                <img src={deal.image} alt={deal.title} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gradient-to-r from-amber-500 to-red-500 flex items-center justify-center text-white font-bold text-xl">
                  ⚡ {deal.title}
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{deal.title}</h3>
                    <div className="flex flex-col items-end gap-1">
                      {deal.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400 font-medium">
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                      {deal.is_dine_in_only && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 font-bold">
                          🍽️ Dine-In Only
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{deal.description || 'No description provided.'}</p>
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mb-1">
                    Offer: {deal.deal_type.toUpperCase()} ({deal.discount_value})
                  </div>
                  <div className="text-xs text-slate-400">
                    Ends: {new Date(deal.end_time).toLocaleString()}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => {
                      setEditingDeal(deal);
                      setFormData({
                        title: deal.title,
                        description: deal.description || '',
                        deal_type: deal.deal_type,
                        discount_value: deal.discount_value.toString(),
                        image: deal.image || '',
                        start_time: new Date(deal.start_time).toISOString().slice(0, 16),
                        end_time: new Date(deal.end_time).toISOString().slice(0, 16),
                        is_active: deal.is_active,
                        is_dine_in_only: !!deal.is_dine_in_only,
                      });
                      setShowModal(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600 transition"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(deal.id)}
                    className="p-1.5 text-slate-500 hover:text-red-600 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
              {editingDeal ? 'Edit Flash Deal' : 'Create Flash Deal'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Deal Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  placeholder="Midnight Craving 20% OFF"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Deal Type</label>
                  <select
                    value={formData.deal_type}
                    onChange={(e) => setFormData({ ...formData, deal_type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="percentage">% OFF</option>
                    <option value="flat">Flat Rs.</option>
                    <option value="bogo">Buy 1 Get 1</option>
                    <option value="combo">Combo Deal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Value</label>
                  <input
                    type="number"
                    required
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_dine_in_only"
                  checked={formData.is_dine_in_only}
                  onChange={(e) => setFormData({ ...formData, is_dine_in_only: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="is_dine_in_only" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  🍽️ Dine-In Exclusive Deal
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                  Deal Banner Image
                </label>

                {/* Recommended Resolution Guidelines Badge */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 mb-3 flex items-start gap-2 text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Recommended Specs:</span> 1200 x 600 px (2:1 aspect ratio) • Max size: 2MB (JPG, PNG, WEBP).
                  </div>
                </div>

                {/* File Dropzone or Preview Card */}
                {formData.image ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 group">
                    <img src={formData.image} alt="Deal Banner Preview" className="w-full h-36 object-cover" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 text-white text-[10px] font-bold tracking-wider uppercase border border-slate-700">
                      2:1 Aspect Ratio Preview
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-lg">
                        <RefreshCw size={14} /> Replace
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleImageUpload(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-lg"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleImageUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer relative ${
                      dragActive ? 'border-amber-500 bg-amber-500/10' : 'border-slate-300 dark:border-slate-700 hover:border-amber-500/50'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageUpload(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {uploadingImage ? (
                      <div className="flex flex-col items-center justify-center py-3">
                        <Loader2 size={24} className="animate-spin text-amber-500 mb-2" />
                        <span className="text-xs text-slate-400 font-medium">Uploading image banner...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2">
                        <UploadCloud size={28} className="text-amber-500 mb-1.5 text-center mx-auto" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Drag & drop banner image here, or <span className="text-amber-500 underline">browse</span>
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">Supports JPG, PNG, WEBP up to 2MB</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsible Manual URL Fallback Input */}
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-amber-500 flex items-center gap-1 transition"
                  >
                    <LinkIcon size={12} /> {showUrlInput ? 'Hide URL input' : 'Or paste image URL directly'}
                  </button>
                  {showUrlInput && (
                    <input
                      type="url"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full mt-1.5 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs outline-none focus:border-amber-500"
                      placeholder="https://res.cloudinary.com/..."
                    />
                  )}
                </div>
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
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-medium transition"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  <span>{saving ? 'Saving...' : 'Save Deal'}</span>
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
