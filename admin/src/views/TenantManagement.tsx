import React, { useState } from 'react';
import { useAdmin } from '../AdminContext';
import { Plus, X, Phone, MapPin, Clock, DollarSign, Sparkles, Trash2, Camera, Eye } from 'lucide-react';

export const TenantManagement: React.FC = () => {
  const { restaurants, onboardNewRestaurant, removeRestaurant, updateRestaurantBanner, removeRestaurantBanner } = useAdmin();
  const [showWizard, setShowWizard] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [city, setCity] = useState('Karachi');
  const [phone, setPhone] = useState('');
  const [opensAt, setOpensAt] = useState('11:00');
  const [closesAt, setClosesAt] = useState('23:00');
  const [deliveryFee, setDeliveryFee] = useState(100);
  const [minOrder, setMinOrder] = useState(500);

  const handleNameChange = (val: string) => {
    setName(val);
    // Auto-generate clean slug
    setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, ''));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || !cuisineType) return;

    onboardNewRestaurant({
      name,
      slug,
      cuisine_type: cuisineType,
      city,
      is_active: true,
      is_featured: false,
      delivery_fee: Number(deliveryFee),
      opens_at: opensAt,
      closes_at: closesAt,
      delivery_time_min: 25,
      delivery_time_max: 40,
      min_order_amount: Number(minOrder),
      phone,
    });

    // Reset Form
    setName('');
    setSlug('');
    setCuisineType('');
    setPhone('');
    setShowWizard(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Tenant Registry</h1>
          <p className="text-sm text-slate-400">Onboard and configure restaurant brands with zero database migrations</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
        >
          <Plus size={16} /> Onboard New Brand
        </button>
      </div>

      {/* Grid of Tenants */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {restaurants.map((restaurant) => (
          <div key={restaurant.id} className="bg-slate-800 border border-slate-700/60 rounded-2xl overflow-hidden shadow-md flex flex-col justify-between">
            {/* Cover Banner */}
            <div className="h-28 relative overflow-hidden">
              {restaurant.banner_url || restaurant.cover_url ? (
                <img
                  src={restaurant.banner_url || restaurant.cover_url}
                  alt={restaurant.name}
                  className="w-full h-full object-cover opacity-80"
                  onError={(e) => {
                    // If image fails to load, show gradient fallback
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              {/* Green gradient fallback — shows when no image or image fails */}
              <div
                className={`absolute inset-0 ${
                  restaurant.banner_url || restaurant.cover_url ? 'hidden' : 'flex'
                } items-center justify-center`}
                style={{
                  background: 'linear-gradient(135deg, #064e3b, #022c22)',
                }}
              >
                <span className="text-3xl opacity-35">🍽️</span>
              </div>
              
              {/* Online/Disabled badge */}
              <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border backdrop-blur-md ${
                restaurant.is_active
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/35'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/35'
              }`}>
                {restaurant.is_active ? 'Online' : 'Disabled'}
              </span>

              {/* Upload Banner Button */}
              <button
                type="button"
                onClick={() => document.getElementById(`banner-input-${restaurant.id}`)?.click()}
                className="absolute top-3 right-3 bg-slate-900/70 hover:bg-slate-900 backdrop-blur-md text-slate-200 hover:text-white p-2 rounded-xl transition-all z-20 border border-slate-700/50 shadow-lg flex items-center justify-center hover:scale-[1.04] active:scale-[0.98]"
                title="Upload Cover Banner"
              >
                <Camera size={14} />
              </button>

              {/* Remove Banner Button */}
              {restaurant.banner_url ? (
                <button
                  type="button"
                  onClick={() => removeRestaurantBanner(restaurant.id)}
                  className="absolute top-3 right-12 bg-rose-950/70 hover:bg-rose-900 backdrop-blur-md text-rose-300 hover:text-rose-200 p-2 rounded-xl transition-all z-20 border border-rose-500/30 shadow-lg flex items-center justify-center hover:scale-[1.04] active:scale-[0.98]"
                  title="Remove Cover Banner"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}

              {/* Preview Banner Button */}
              {restaurant.banner_url ? (
                <button
                  type="button"
                  onClick={() => setPreviewImage(restaurant.banner_url || null)}
                  className="absolute top-3 right-[84px] bg-slate-900/70 hover:bg-slate-900 backdrop-blur-md text-slate-200 hover:text-white p-2 rounded-xl transition-all z-20 border border-slate-700/50 shadow-lg flex items-center justify-center hover:scale-[1.04] active:scale-[0.98]"
                  title="Preview Cover Banner"
                >
                  <Eye size={14} />
                </button>
              ) : null}
              
              {/* Hidden file input */}
              <input
                type="file"
                id={`banner-input-${restaurant.id}`}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    updateRestaurantBanner(restaurant.id, file);
                  }
                }}
              />
            </div>

            {/* Content Details */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2.5">
                  {restaurant.logo_url ? (
                    <img
                      src={restaurant.logo_url}
                      alt={restaurant.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700 -mt-10 relative z-10 shadow-md bg-slate-900"
                      onError={(e) => {
                        // Replace broken img with initial letter fallback
                        const el = e.target as HTMLImageElement;
                        el.style.display = 'none';
                        el.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  {/* Letter avatar fallback */}
                  <div
                    className={`w-10 h-10 rounded-xl border border-slate-700 -mt-10 relative z-10 shadow-md flex items-center justify-center text-white font-black text-sm flex-shrink-0 ${
                      restaurant.logo_url ? 'hidden' : 'flex'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, hsl(${(restaurant.id * 47) % 360}, 60%, 35%), hsl(${(restaurant.id * 47 + 60) % 360}, 70%, 25%))`,
                    }}
                  >
                    {restaurant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base leading-tight">{restaurant.name}</h3>
                    <span className="text-xs text-slate-400 font-semibold">{restaurant.cuisine_type}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-400 mt-4 border-t border-slate-700/30 pt-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-slate-500" />
                    <span>{restaurant.city}, Pakistan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-slate-500" />
                    <span>{restaurant.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-slate-500" />
                    <span>{restaurant.opens_at} - {restaurant.closes_at}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign size={13} className="text-slate-500" />
                    <span>Min. Order: Rs. {restaurant.min_order_amount} · Delivery: Rs. {restaurant.delivery_fee}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-700/30 flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Slug: <code className="text-blue-400 bg-slate-900 px-1 py-0.5 rounded font-mono">{restaurant.slug}</code></span>
                  <span className="text-slate-500">Tenant ID: <code className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded font-mono">#{restaurant.id}</code></span>
                </div>
                <button
                  type="button"
                  onClick={() => removeRestaurant(restaurant.id)}
                  className="w-full flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/40 rounded-xl py-2 text-xs font-bold transition-all"
                >
                  <Trash2 size={13} /> Remove Brand
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Onboarding Sliding Modal Panel / Dialog */}
      {showWizard && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700/70 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
            <div className="p-6 border-b border-slate-700/60 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-blue-500" />
                <h3 className="font-extrabold text-white text-lg">Onboard Restaurant Brand</h3>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Brand Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Restaurant Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. BirdManFoodsPK"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                    required
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Slug (Read-Only)
                  </label>
                  <input
                    type="text"
                    value={slug}
                    disabled
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-500 font-mono outline-none cursor-not-allowed"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Cuisine Specialty */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Cuisine / Specialty
                  </label>
                  <input
                    type="text"
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
                    placeholder="e.g. Charcoal Grilled Chicken"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                    required
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Operating City
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="Karachi">Karachi</option>
                    <option value="Lahore">Lahore</option>
                    <option value="Islamabad">Islamabad</option>
                    <option value="Peshawar">Peshawar</option>
                    <option value="Rawalpindi">Rawalpindi</option>
                  </select>
                </div>
              </div>

              {/* Phone number */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +92 300 1234567"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Opens At */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={opensAt}
                    onChange={(e) => setOpensAt(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>

                {/* Closes At */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={closesAt}
                    onChange={(e) => setClosesAt(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Delivery Fee */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Delivery Fee (PKR)
                  </label>
                  <input
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-white outline-none focus:border-blue-500"
                    min={0}
                    required
                  />
                </div>

                {/* Min Order amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Min Order Amount (PKR)
                  </label>
                  <input
                    type="number"
                    value={minOrder}
                    onChange={(e) => setMinOrder(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-white outline-none focus:border-blue-500"
                    min={0}
                    required
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-700/60 mt-6">
                <button
                  type="button"
                  onClick={() => setShowWizard(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold py-2 px-4 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2 px-5 rounded-xl shadow-lg shadow-blue-500/10"
                >
                  Establish Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl w-full max-h-[85vh] bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-slate-950/60 hover:bg-slate-950 text-slate-300 hover:text-white p-2 rounded-xl border border-slate-700/50 transition-colors z-50 flex items-center justify-center hover:scale-[1.04] active:scale-[0.98]"
            >
              <X size={18} />
            </button>
            <img 
              src={previewImage} 
              alt="Banner Preview" 
              className="w-full h-auto max-h-[80vh] object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
