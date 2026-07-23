import React, { useMemo, useState } from 'react';
import { useAdmin } from '../AdminContext';
import type { Order, OrderStatus } from '../types';
import { 
  ArrowRight, 
  MapPin, 
  Phone, 
  MessageSquare,
  CheckCircle,
  Clock,
  User,
  ShoppingBag,
  DollarSign,
  RotateCw,
  Store
} from 'lucide-react';

export const OrderManagement: React.FC = () => {
  const { selectedBrandId, restaurants, orders, updateOrderStatus, refreshOrders, setSelectedBrand } = useAdmin();
  const [filterBrandId, setFilterBrandId] = useState<number | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Retrieve current restaurant
  const restaurant = restaurants.find((r) => r.id === selectedBrandId) || restaurants[0];

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshOrders();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Filter orders belonging to selected brand or all launch brands
  const brandOrders = useMemo(() => {
    if (filterBrandId === 'all') {
      return orders;
    }
    const targetRest = restaurants.find((r) => r.id === Number(filterBrandId));
    if (!targetRest) return orders;

    return orders.filter((o) => 
      Number(o.restaurant_id) === Number(targetRest.id) ||
      (o.restaurant_name && targetRest.name && 
       o.restaurant_name.toLowerCase().replace(/[^a-z0-9]/g, '') === targetRest.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
    );
  }, [orders, filterBrandId, restaurants]);

  const formatOrderTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();

    // Use Intl.DateTimeFormat to force timezone calculation under Asia/Karachi (PKT)
    const optionsDate: Intl.DateTimeFormatOptions = { 
      timeZone: 'Asia/Karachi', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    };
    
    const fmt = new Intl.DateTimeFormat('en-US', optionsDate);
    const dateStrKarachi = fmt.format(date);
    const nowStrKarachi = fmt.format(now);
    const isToday = dateStrKarachi === nowStrKarachi;

    const timeStr = date.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    if (isToday) {
      return `Today, ${timeStr}`;
    } else {
      const datePart = date.toLocaleDateString('en-US', {
        timeZone: 'Asia/Karachi',
        day: '2-digit',
        month: 'short'
      });
      return `${datePart}, ${timeStr}`;
    }
  };

  if (!restaurant && restaurants.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-400">No Restaurant Data Available</h2>
          <p className="text-sm text-slate-500 mt-2">Unable to load orders. Please check your connection or API status.</p>
        </div>
      </div>
    );
  }

  // Group orders by status with dynamic accent mappings
  const columns: { 
    title: string; 
    status: OrderStatus; 
    color: string; 
    border: string; 
    accent: string; 
    icon: React.ReactNode 
  }[] = [
    { 
      title: 'Pending', 
      status: 'pending', 
      color: 'text-rose-400', 
      border: 'border-l-rose-500',
      accent: 'bg-rose-500/10 text-rose-400 border-rose-500/20', 
      icon: <Clock size={15} className="text-rose-400 animate-pulse" /> 
    },
    { 
      title: 'Received', 
      status: 'received', 
      color: 'text-indigo-400', 
      border: 'border-l-indigo-500',
      accent: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', 
      icon: <CheckCircle size={15} /> 
    },
    { 
      title: 'Preparing', 
      status: 'preparing', 
      color: 'text-amber-400', 
      border: 'border-l-amber-500',
      accent: 'bg-amber-500/10 text-amber-400 border-amber-500/20', 
      icon: <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-amber-400 border-t-transparent" /> 
    },
    { 
      title: 'Out For Delivery', 
      status: 'out_for_delivery', 
      color: 'text-sky-400', 
      border: 'border-l-sky-500',
      accent: 'bg-sky-500/10 text-sky-400 border-sky-500/20', 
      icon: <ArrowRight size={15} className="animate-pulse" /> 
    },
    { 
      title: 'Delivered', 
      status: 'delivered', 
      color: 'text-emerald-400', 
      border: 'border-l-emerald-500',
      accent: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', 
      icon: <CheckCircle size={15} /> 
    },
  ];

  // Trigger WhatsApp dispatch pre-filled message directly to rider +92 300 0000000
  const triggerRiderWhatsApp = (order: Order) => {
    const name = order.guest_name || order.user_or_guest;
    const phone = order.guest_phone || 'N/A';
    const address = order.delivery_address;
    const locationLink = `https://maps.google.com/?q=${encodeURIComponent(address)}`;

    const message = 
      `Rider Bhai, ye order deliver karna hai:\n` +
      `Restaurant: ${order.restaurant_name}\n` +
      `Order ID: #${order.id}\n` +
      `Naam: ${name}\n` +
      `Phone: ${phone}\n` +
      `Address: ${address}\n` +
      `Location Link: ${locationLink}`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/923000000000?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Scrollbar Injection */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.1);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.25);
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            Live Order Board
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </h1>
          <p className="text-sm text-slate-400">Track and dispatch orders, manage status transitions, and sync riders in real time</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Brand Filter Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs">
            <Store size={14} className="text-blue-400" />
            <span className="text-slate-400 font-medium">Filter:</span>
            <select
              value={filterBrandId}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                setFilterBrandId(val);
                if (val !== 'all') {
                  setSelectedBrand(val);
                }
              }}
              className="bg-slate-950 border border-slate-700 text-white font-bold rounded px-2 py-1 outline-none text-xs cursor-pointer focus:border-blue-500"
            >
              <option value="all">🌟 All Brands ({orders.length} orders)</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RotateCw size={13} className={isRefreshing ? 'animate-spin text-blue-400' : 'text-slate-400'} />
            {isRefreshing ? 'Syncing...' : 'Sync Live Orders'}
          </button>
        </div>
      </div>

      {/* Kanban Board Columns Grid */}
      <div className="flex flex-col lg:flex-row gap-5 items-start overflow-x-auto pb-4 custom-scrollbar">
        {columns.map((col) => {
          const colOrders = brandOrders
            .filter((o) => o.status === col.status)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          return (
            <div 
              key={col.status} 
              className="w-full lg:w-[320px] lg:min-w-[300px] flex-shrink-0 bg-slate-900/30 border border-slate-800/60 rounded-2xl p-4 flex flex-col max-h-[82vh] overflow-hidden backdrop-blur-md shadow-inner transition-all duration-300 hover:border-slate-800"
            >
              {/* Column Header */}
              <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-slate-800/60">
                <span className={`font-black text-xs uppercase tracking-wider ${col.color} flex items-center gap-2`}>
                  {col.icon} {col.title}
                </span>
                <span className={`font-black px-2.5 py-0.5 rounded-full text-xs border ${col.accent}`}>
                  {colOrders.length}
                </span>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 space-y-3.5 overflow-y-auto pr-1 custom-scrollbar">
                {colOrders.map((order) => {
                  
                  return (
                    <div 
                      key={order.id} 
                      className={`bg-slate-950/40 border border-slate-900 hover:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between group hover:-translate-y-0.5 transition-all duration-300 border-l-4 ${col.border} ${
                        col.status === 'pending' ? 'shadow-rose-500/5 hover:shadow-rose-500/10 hover:border-rose-900' : ''
                      }`}
                    >
                      <div>
                        {/* Order ID, Brand Badge & Time */}
                        <div className="flex flex-wrap justify-between items-center gap-1.5 mb-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-200 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                              <ShoppingBag size={11} className="text-slate-400" />
                              #{order.id}
                            </span>
                            {order.restaurant_name && (
                              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md">
                                {order.restaurant_name}
                              </span>
                            )}
                          </div>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold bg-slate-900/40 px-2 py-0.5 rounded border border-slate-900/20">
                            <Clock size={10} className="text-slate-500" />
                            {formatOrderTime(order.created_at)}
                          </span>
                        </div>

                        {/* Customer Info */}
                        <div className="space-y-1.5 mb-3.5 bg-slate-950/20 p-2.5 rounded-lg border border-slate-900/10">
                          <span className="block font-black text-xs text-slate-100 flex items-center gap-1">
                            <User size={11} className="text-slate-500" />
                            {order.guest_name || order.user_or_guest}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                            <Phone size={10} className="text-slate-500" />
                            <span>{order.guest_phone || 'N/A'}</span>
                          </div>
                          <div className="flex items-start gap-1.5 text-[11px] text-slate-400 leading-relaxed">
                            <MapPin size={10} className="mt-0.5 flex-shrink-0 text-slate-500" />
                            <span className="line-clamp-none break-words">{order.delivery_address}</span>
                          </div>
                          {order.branch_name && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                📍 {order.branch_name} Branch
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Items summary list */}
                        <div className="border-t border-slate-900 pt-3 mb-3.5 space-y-1.5">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-[11px] text-slate-300">
                              <span className="flex-1 pr-2 break-words">
                                <strong className="text-blue-400 mr-1.5">{item.quantity}x</strong>
                                {item.menu_item_name}
                              </span>
                              <span className="font-semibold text-slate-400 ml-2 whitespace-nowrap">Rs.{item.total_price}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pricing, Payment & Actions */}
                      <div className="border-t border-slate-900 pt-3">
                        <div className="flex justify-between items-center mb-3.5 bg-slate-900/20 px-2 py-1.5 rounded-lg">
                          <span className="text-[11px] uppercase font-black text-slate-400 flex items-center gap-0.5">
                            <DollarSign size={10} className="text-slate-500" />
                            {order.payment_method}
                          </span>
                          <span className="font-extrabold text-sm text-emerald-400">Rs. {order.total}</span>
                        </div>

                        {/* Kanban Action buttons & Status Dropdown */}
                        <div className="space-y-2">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'received')}
                              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-450 text-white font-black py-2.5 rounded-lg text-xs transition-all shadow-md active:scale-[0.98] animate-pulse"
                            >
                              <CheckCircle size={13} /> Accept Order
                            </button>
                          )}

                          {order.status !== 'pending' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <div className="w-full relative group/select">
                              <select 
                                value={order.status}
                                onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                                className="w-full appearance-none bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-bold py-2 pl-3 pr-8 rounded-lg text-[11px] transition-all cursor-pointer text-center outline-none select-none"
                              >
                                <option value="received">Received</option>
                                <option value="preparing">Preparing</option>
                                <option value="out_for_delivery">Out For Delivery</option>
                                <option value="delivered">Delivered</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400 group-hover/select:text-white transition-colors">
                                <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                                </svg>
                              </div>
                            </div>
                          )}
                          
                          {/* Rider dispatch via WhatsApp (Triggerable for all active order states except pending) */}
                          {order.status !== 'pending' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => triggerRiderWhatsApp(order)}
                              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white font-black py-2 rounded-lg text-[11px] transition-all shadow-md active:scale-[0.98]"
                            >
                              <MessageSquare size={11} /> WhatsApp Rider
                            </button>
                          )}

                          {order.status === 'delivered' && (
                            <div className="flex items-center justify-center gap-1.5 text-[11px] font-black text-emerald-400 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                              <CheckCircle size={12} /> COMPLETED
                            </div>
                          )}

                          {order.status === 'cancelled' && (
                            <div className="flex items-center justify-center gap-1.5 text-[11px] font-black text-rose-400 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                              CANCELLED
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colOrders.length === 0 && (
                  <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                    No active orders
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
