import React, { useMemo } from 'react';
import { useAdmin } from '../AdminContext';
import type { Order, OrderStatus } from '../types';
import { 
  ArrowRight, 
  MapPin, 
  Phone, 
  MessageSquare,
  CheckCircle,
  Clock
} from 'lucide-react';

export const OrderManagement: React.FC = () => {
  const { selectedBrandId, restaurants, orders, updateOrderStatus } = useAdmin();

  // Retrieve current restaurant
  const restaurant = restaurants.find((r) => r.id === selectedBrandId) || restaurants[0];

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-400">No Restaurant Data Available</h2>
          <p className="text-sm text-slate-500 mt-2">Unable to load orders. Please check your connection or API status.</p>
        </div>
      </div>
    );
  }

  // Filter orders belonging to this brand
  const brandOrders = useMemo(() => {
    return orders.filter((o) => o.restaurant_id === restaurant.id);
  }, [orders, restaurant]);

  // Group orders by status
  const columns: { title: string; status: OrderStatus; color: string; bg: string }[] = [
    { title: 'Pending', status: 'pending', color: 'text-zinc-500 dark:text-zinc-400', bg: 'bg-zinc-50/80 dark:bg-zinc-950/10 border-zinc-200/50 dark:border-zinc-900/20' },
    { title: 'Received', status: 'received', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30' },
    { title: 'Preparing', status: 'preparing', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-900/30' },
    { title: 'Out For Delivery', status: 'out_for_delivery', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-900/30' },
    { title: 'Delivered', status: 'delivered', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30' },
    { title: 'Cancelled', status: 'cancelled', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-200/30 dark:border-rose-900/20' },
  ];

  // Trigger WhatsApp dispatch pre-filled message directly to rider +92 309 0349090
  const triggerRiderWhatsApp = (order: Order) => {
    const name = order.guest_name || order.user_or_guest;
    const phone = order.guest_phone || 'N/A';
    const address = order.delivery_address;
    const locationLink = `https://maps.google.com/?q=${encodeURIComponent(address)}`;

    const message = 
      `Rider Bhai, ye order deliver karna hai:\n` +
      `Restaurant: ${restaurant.name}\n` +
      `Order ID: #${order.id}\n` +
      `Naam: ${name}\n` +
      `Phone: ${phone}\n` +
      `Address: ${address}\n` +
      `Location Link: ${locationLink}`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/923090349090?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    if (current === 'pending') return 'received';
    if (current === 'received') return 'preparing';
    if (current === 'preparing') return 'out_for_delivery';
    if (current === 'out_for_delivery') return 'delivered';
    return null;
  };

  const getActionLabel = (current: OrderStatus): string => {
    if (current === 'pending') return 'Confirm Order';
    if (current === 'received') return 'Accept & Prepare';
    if (current === 'preparing') return 'Mark Ready & Dispatch';
    if (current === 'out_for_delivery') return 'Complete Delivery';
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Live Order board</h1>
          <p className="text-sm text-zinc-500 dark:text-slate-400">Manage incoming orders, trigger rider WhatsApp dispatches, and track statuses</p>
        </div>
      </div>

      {/* Kanban Board Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
        {columns.map((col) => {
          const colOrders = brandOrders.filter((o) => o.status === col.status);
          
          return (
            <div 
              key={col.status} 
              className={`rounded-2xl border p-4 flex flex-col max-h-[80vh] overflow-hidden ${col.bg}`}
            >
              {/* Column Header */}
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-200/40 dark:border-slate-800/40">
                <span className={`font-extrabold text-sm ${col.color}`}>{col.title}</span>
                <span className="bg-zinc-200 dark:bg-slate-800 text-zinc-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full text-xs">
                  {colOrders.length}
                </span>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {colOrders.map((order) => {
                  const nextStatus = getNextStatus(order.status);
                  
                  return (
                    <div 
                      key={order.id} 
                      className="bg-white dark:bg-slate-800 border border-zinc-200/60 dark:border-slate-700/50 p-4.5 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-premium transition-all duration-200"
                    >
                      <div>
                        {/* Order ID & Time */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-extrabold text-xs text-zinc-800 dark:text-slate-200 bg-zinc-100 dark:bg-slate-700/60 px-2 py-0.5 rounded">
                            #{order.id}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                            <Clock size={10} />
                            {new Date(order.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Customer Info */}
                        <div className="space-y-1 mb-3">
                          <span className="block font-bold text-xs text-zinc-900 dark:text-white leading-tight">
                            {order.guest_name || order.user_or_guest}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-slate-400">
                            <Phone size={10} />
                            <span>{order.guest_phone || 'N/A'}</span>
                          </div>
                          <div className="flex items-start gap-1 text-[10px] text-zinc-500 dark:text-slate-400 leading-normal">
                            <MapPin size={10} className="mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{order.delivery_address}</span>
                          </div>
                        </div>

                        {/* Items summary list */}
                        <div className="border-t border-zinc-100 dark:border-slate-700/50 pt-2.5 mb-3 space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] text-zinc-600 dark:text-slate-300">
                              <span><strong className="text-zinc-800 dark:text-slate-200">{item.quantity}x</strong> {item.menu_item_name}</span>
                              <span className="font-medium">Rs. {item.total_price}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pricing, Payment & Actions */}
                      <div className="border-t border-zinc-100 dark:border-slate-700/50 pt-3">
                        <div className="flex justify-between items-center text-xs mb-3.5">
                          <span className="font-bold text-zinc-900 dark:text-white">Rs. {order.total}</span>
                          <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-slate-500">
                            {order.payment_method}
                          </span>
                        </div>

                        {/* Kanban Action buttons */}
                        <div className="space-y-2">
                          {nextStatus && (
                            <button
                              onClick={() => updateOrderStatus(order.id, nextStatus)}
                              className="w-full flex items-center justify-center gap-1 bg-zinc-900 hover:bg-zinc-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-2 rounded-lg text-[11px] transition-all"
                            >
                              {getActionLabel(order.status)} <ArrowRight size={12} />
                            </button>
                          )}
                          
                          {/* Rider dispatch via WhatsApp (Triggerable for all active order states) */}
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => triggerRiderWhatsApp(order)}
                              className="w-full flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-2 rounded-lg text-[11px] transition-all shadow-sm"
                            >
                              <MessageSquare size={12} /> WhatsApp Rider
                            </button>
                          )}

                          {order.status === 'delivered' && (
                            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 py-1.5">
                              <CheckCircle size={13} /> Completed
                            </div>
                          )}

                          {order.status === 'cancelled' && (
                            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 py-1.5">
                              Cancelled
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colOrders.length === 0 && (
                  <div className="text-center py-10 border border-dashed border-zinc-200 dark:border-slate-700 rounded-xl text-xs text-zinc-400 dark:text-slate-500 font-medium">
                    No orders
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
