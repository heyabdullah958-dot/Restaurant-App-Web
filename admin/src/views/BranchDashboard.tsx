import React, { useState } from 'react';
import { useAdmin } from '../AdminContext';
import { MOCK_BRAND_STATS } from '../mockData';
import { AnalyticsCharts } from '../components/AnalyticsCharts';
import { 
  ShoppingBag, 
  TrendingUp, 
  Clock, 
  Layers, 
  MapPin, 
  Phone,
  CheckCircle2,
  AlertCircle,
  Camera,
  Trash2,
  Eye,
  X
} from 'lucide-react';

export const BranchDashboard: React.FC = () => {
  const { selectedBrandId, restaurants, orders, setView, updateRestaurantBanner, removeRestaurantBanner } = useAdmin();
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const restaurant = restaurants.find((r) => r.id === selectedBrandId) || restaurants[0];
  
  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-400">No Restaurant Data Available</h2>
          <p className="text-sm text-slate-500 mt-2">Unable to load restaurant details. Please check your connection or API status.</p>
        </div>
      </div>
    );
  }

  const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
  const brandStats = MOCK_BRAND_STATS[restaurant.id] || { revenue: 0, orders: 0, aov: 0 };

  // Filter orders for this restaurant (robust casting)
  const brandOrders = orders.filter((o) => 
    Number(o.restaurant_id) === Number(restaurant.id) ||
    (o.restaurant_name && restaurant.name && 
     o.restaurant_name.toLowerCase().replace(/[^a-z0-9]/g, '') === restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
  );
  const pendingOrdersCount = brandOrders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;

  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'all'>('today');

  // Calculate live stats based on timeframe
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let filteredBrandOrders = brandOrders;
  if (timeframe === 'today') {
    filteredBrandOrders = brandOrders.filter((o) => new Date(o.created_at) >= startOfToday);
  } else if (timeframe === 'week') {
    filteredBrandOrders = brandOrders.filter((o) => new Date(o.created_at) >= startOfWeek);
  } else if (timeframe === 'month') {
    filteredBrandOrders = brandOrders.filter((o) => new Date(o.created_at) >= startOfMonth);
  }

  const liveRevenue = filteredBrandOrders.reduce((sum, o) => sum + o.total, 0);
  const liveOrdersCount = filteredBrandOrders.length;
  
  // All time aggregates for reference in subtitles
  const allTimeRevenue = brandOrders.reduce((sum, o) => sum + o.total, 0);
  const allTimeOrdersCount = brandOrders.length;

  // Mock scaling for demo mode
  const getMockStats = () => {
    switch (timeframe) {
      case 'today':
        return { revenue: brandStats.revenue * 0.1, orders: Math.max(1, Math.round(brandStats.orders * 0.1)) };
      case 'week':
        return { revenue: brandStats.revenue * 0.4, orders: Math.max(1, Math.round(brandStats.orders * 0.4)) };
      case 'month':
        return { revenue: brandStats.revenue * 0.9, orders: Math.max(1, Math.round(brandStats.orders * 0.9)) };
      default:
        return brandStats;
    }
  };

  const mockStats = getMockStats();
  const displayRevenue = isMock ? mockStats.revenue : liveRevenue;
  const displayOrdersCount = isMock ? mockStats.orders : liveOrdersCount;

  // Decide brand color
  const getBrandColor = () => {
    switch (restaurant.slug) {
      case 'seenbanao': return '#EA580C';
      case 'dineatblue': return '#0284C7';
      case 'jushhpk': return '#DC2626';
      case 'tandooristoppk': return '#B45309';
      case 'sandmelts': return '#059669';
      case 'birdmanfoodspk': return '#9333EA';
      case 'getafomo': return '#DB2777';
      default: return '#EA580C';
    }
  };

  const getBrandLightBg = () => {
    switch (restaurant.slug) {
      case 'seenbanao': return 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 border-orange-100 dark:border-orange-900/35';
      case 'dineatblue': return 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 border-sky-100 dark:border-sky-900/35';
      case 'jushhpk': return 'bg-red-50 dark:bg-red-950/20 text-red-600 border-red-100 dark:border-red-900/35';
      case 'tandooristoppk': return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-100 dark:border-amber-900/35';
      case 'sandmelts': return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/35';
      case 'birdmanfoodspk': return 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 border-purple-100 dark:border-purple-900/35';
      case 'getafomo': return 'bg-pink-50 dark:bg-pink-950/20 text-pink-600 border-pink-100 dark:border-pink-900/35';
      default: return 'bg-orange-50 text-orange-600 border-orange-100';
    }
  };

  const getSalesCardTitle = () => {
    switch (timeframe) {
      case 'today': return "Today's Brand Sales";
      case 'week': return "Weekly Sales (This Week)";
      case 'month': return "Monthly Sales (This Month)";
      case 'all': return "All-Time Brand Sales";
    }
  };

  const getSalesCardStatus = () => {
    if (isMock) {
      return `Total: ${displayOrdersCount} Orders (${timeframe.toUpperCase()})`;
    }
    const timeframeText = timeframe === 'today' ? 'today' : timeframe === 'week' ? 'this week' : timeframe === 'month' ? 'this month' : 'all-time';
    return `Total: ${displayOrdersCount} Orders ${timeframeText} (Rs. ${Math.round(allTimeRevenue).toLocaleString()} / ${allTimeOrdersCount} All-time)`;
  };

  const formatOrderTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();
    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Today, ${timeStr}`;
    }
    const dateStr = date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    return `${dateStr}, ${timeStr}`;
  };

  const stats = [
    {
      title: 'Pending Live Orders',
      value: pendingOrdersCount,
      icon: <ShoppingBag size={20} />,
      status: pendingOrdersCount > 0 ? 'Action Needed' : 'All Clear',
    },
    {
      title: getSalesCardTitle(),
      value: `Rs. ${displayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <TrendingUp size={20} />,
      status: getSalesCardStatus(),
    },
    {
      title: 'Avg Delivery Time',
      value: `${restaurant.delivery_time_min}-${restaurant.delivery_time_max} mins`,
      icon: <Clock size={20} />,
      status: `Fee: Rs. ${restaurant.delivery_fee}`,
    },
    {
      title: 'Overall rating score',
      value: `${restaurant.rating > 0 ? restaurant.rating.toFixed(1) : 'New'} / 5.0`,
      icon: <Layers size={20} />,
      status: `Min order: Rs. ${restaurant.min_order_amount}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Brand Header Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-premium bg-slate-900 border border-zinc-200/60 dark:border-slate-800 h-44">
        {restaurant.banner_url || restaurant.cover_url ? (
          <img
            src={restaurant.banner_url || restaurant.cover_url}
            alt={restaurant.name}
            className="w-full h-full object-cover opacity-60"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        {/* Green gradient fallback */}
        <div
          className={`absolute inset-0 ${
            restaurant.banner_url || restaurant.cover_url ? 'hidden' : 'flex'
          } items-center justify-center`}
          style={{
            background: 'linear-gradient(135deg, #064e3b, #022c22)',
          }}
        >
          <span className="text-4xl opacity-35">🍽️</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent" />

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
        
        {/* Banner Details Overlay */}
        <div className="absolute bottom-5 left-6 right-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="flex items-center gap-4">
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-lg bg-white"
            />
            <div>
              <h1 className="text-2xl font-extrabold text-white leading-none">{restaurant.name}</h1>
              <p className="text-sm text-slate-300 font-semibold mt-1">{restaurant.cuisine_type}</p>
              <div className="flex gap-4 text-xs text-slate-400 mt-2 font-medium">
                <span className="flex items-center gap-1"><MapPin size={12} /> {restaurant.city}</span>
                <span className="flex items-center gap-1"><Phone size={12} /> {restaurant.phone}</span>
              </div>
            </div>
          </div>
          
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border uppercase tracking-wider ${
            restaurant.is_active
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
          }`}>
            {restaurant.is_active ? 'Accepting Orders' : 'Branch Suspended'}
          </span>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-900 border border-zinc-205 dark:border-slate-800/80 p-4.5 rounded-2xl shadow-premium gap-3">
        <div className="flex items-center gap-2">
          <div className="text-xs font-black text-zinc-700 dark:text-slate-200 uppercase tracking-wider">
            Sales Performance Timeframe
          </div>
          <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Auto-Sync Active (15s)
          </span>
        </div>
        <div className="flex bg-zinc-100 dark:bg-slate-950 p-1 rounded-xl border border-zinc-200/30 dark:border-slate-800">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Weekly' },
            { id: 'month', label: 'Monthly' },
            { id: 'all', label: 'All-Time' }
          ].map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id as any)}
              className={`px-4.5 py-2 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider ${
                timeframe === tf.id
                  ? `bg-white dark:bg-slate-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/40 dark:border-slate-700/60`
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Local stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            className="bg-white dark:bg-slate-800 border border-zinc-200/50 dark:border-slate-700/60 p-6 rounded-2xl flex flex-col justify-between shadow-premium transition-all-300 hover:shadow-premium-hover"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-zinc-400 dark:text-slate-400 uppercase tracking-wider">{stat.title}</span>
                <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-1.5">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl border ${getBrandLightBg()}`}>{stat.icon}</div>
            </div>
            <div className="text-xs font-semibold text-zinc-500 dark:text-slate-400 mt-4 border-t border-zinc-100 dark:border-slate-700/40 pt-3 flex items-center gap-1">
              {stat.title === 'Pending Live Orders' && pendingOrdersCount > 0 ? (
                <AlertCircle size={12} className="text-orange-500 animate-pulse" />
              ) : stat.title === 'Pending Live Orders' ? (
                <CheckCircle2 size={12} className="text-emerald-500" />
              ) : null}
              {stat.status}
            </div>
          </div>
        ))}
      </div>

      {/* Analytics and Orders list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="md:col-span-2 bg-white dark:bg-slate-800 border border-zinc-200/50 dark:border-slate-700/60 p-6 rounded-2xl shadow-premium">
          <AnalyticsCharts brandSlug={restaurant.slug} brandColor={getBrandColor()} />
        </div>

        {/* Latest Activity / Quick Orders */}
        <div className="bg-white dark:bg-slate-800 border border-zinc-200/50 dark:border-slate-700/60 p-6 rounded-2xl shadow-premium flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">Recent Feed Activity</h3>
            <p className="text-xs text-zinc-400 dark:text-slate-400">Incoming actions at this branch</p>
            
            <div className="mt-5 space-y-4">
              {[...brandOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3).map((order) => (
                <div key={order.id} className="flex justify-between items-start text-xs border-b border-zinc-100 dark:border-slate-700/40 pb-3">
                  <div>
                    <span className="font-bold text-zinc-800 dark:text-slate-200">Order #{order.id}</span>
                    <span className="block text-zinc-500 dark:text-slate-400 text-[10px] mt-0.5">{order.user_or_guest}</span>
                    <span className="block font-medium text-zinc-400 dark:text-slate-500 text-[10px] mt-1">
                      {formatOrderTime(order.created_at)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-zinc-800 dark:text-slate-200 block">Rs. {order.total}</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide mt-1.5 border ${
                      order.status === 'delivered'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : order.status === 'out_for_delivery'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                        : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
                    }`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
              
              {brandOrders.length === 0 && (
                <div className="text-center py-8 text-zinc-400 dark:text-slate-500 font-medium">
                  No orders logged at this branch.
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={() => setView('order_management')}
            className="w-full mt-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-zinc-800 dark:text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs transition-all text-center block"
          >
            Open Live Kanban Board
          </button>
        </div>
      </div>

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
