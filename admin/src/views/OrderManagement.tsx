import React, { useMemo, useState, useEffect } from 'react';
import { useAdmin } from '../AdminContext';
import type { Order, OrderStatus } from '../types';
import { fetchRiders, assignRiderToOrder } from '../services/api';
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
  Store,
  Bike,
  Edit3
} from 'lucide-react';

export const OrderManagement: React.FC = () => {
  const { user, selectedBrandId, restaurants, orders, updateOrderStatus, refreshOrders, setSelectedBrand, showToast } = useAdmin();
  const [filterBrandId, setFilterBrandId] = useState<number | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mainViewTab, setMainViewTab] = useState<'active' | 'delivered' | 'cancelled' | 'all'>('active');
  const [riders, setRiders] = useState<any[]>([]);

  useEffect(() => {
    fetchRiders().then(res => setRiders(res || [])).catch(() => {});
  }, []);

  // Cancellation Modal state & safeguards
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  // Rider Assignment Modal state
  const [assignRiderModalOrder, setAssignRiderModalOrder] = useState<Order | null>(null);
  const [selectedRiderIdForModal, setSelectedRiderIdForModal] = useState<number | null>(null);
  const [autoOpenWhatsAppAfterAssign, setAutoOpenWhatsAppAfterAssign] = useState<boolean>(false);

  const confirmCancellation = () => {
    if (!cancelReason.trim()) {
      setCancelError('Please enter a valid cancellation reason for audit logging.');
      return;
    }
    if (cancelModalOrder) {
      updateOrderStatus(cancelModalOrder.id, 'cancelled', cancelReason.trim());
      setCancelModalOrder(null);
      setCancelReason('');
    }
  };

  // Helper to open rider assignment modal with available riders filtered for this order's branch
  const openRiderAssignmentModal = (order: Order, autoWhatsApp: boolean = false) => {
    const targetBranchId = order.branch_id || user?.branchId;
    const available = riders.filter((r: any) => {
      const isAvail = r.status === 'AVAILABLE' && r.is_active !== false;
      const matchesBranch = !targetBranchId || Number(r.branch) === Number(targetBranchId);
      return isAvail && matchesBranch;
    });
    setAssignRiderModalOrder(order);
    setSelectedRiderIdForModal(available.length > 0 ? available[0].id : null);
    setAutoOpenWhatsAppAfterAssign(autoWhatsApp);
  };

  const handleModalAssignRider = async () => {
    if (!assignRiderModalOrder) return;
    if (!selectedRiderIdForModal) {
      showToast('Please select an available delivery rider first.', 'error');
      return;
    }
    try {
      const res: any = await assignRiderToOrder(assignRiderModalOrder.id, selectedRiderIdForModal);
      showToast('Rider assigned & order dispatched!', 'success');
      fetchRiders().then(r => setRiders(r || [])).catch(() => {});
      await refreshOrders();

      if (autoOpenWhatsAppAfterAssign) {
        const assignedRiderObj = riders.find(r => r.id === selectedRiderIdForModal);
        const updatedOrder = {
          ...assignRiderModalOrder,
          status: 'out_for_delivery' as OrderStatus,
          rider: assignedRiderObj || res?.data?.rider,
          rider_id: selectedRiderIdForModal
        };
        triggerRiderWhatsApp(updatedOrder);
      }
      setAssignRiderModalOrder(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to assign rider', 'error');
    }
  };

  const exportCSV = (orderList: Order[]) => {
    const headers = ['Order ID', 'Date', 'Customer', 'Phone', 'Address', 'Status', 'Total', 'Payment'];
    const rows = orderList.map(o => [
      `#${o.id}`,
      new Date(o.created_at).toLocaleString(),
      `"${o.guest_name || 'Guest'}"`,
      `"${o.guest_phone || ''}"`,
      `"${(o.delivery_address || '').replace(/"/g, '""')}"`,
      o.status,
      o.total,
      o.payment_method
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReceipt = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    const itemsHtml = (order.items || []).map((i: any) => `
      <tr>
        <td style="padding: 4px 0;">${i.quantity || 1}x ${i.name || i.menu_item_name || 'Item'}</td>
        <td style="text-align: right; padding: 4px 0;">Rs. ${i.price || 0}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt #${order.id}</title>
          <style>
            body { font-family: monospace; width: 280px; margin: 0 auto; padding: 10px; font-size: 12px; }
            h2 { text-align: center; margin: 5px 0; font-size: 16px; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            .total { font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body>
          <h2>GetFood Receipt</h2>
          <div style="text-align: center;">Order #${order.id}</div>
          <div style="text-align: center; font-size: 10px;">${new Date(order.created_at).toLocaleString()}</div>
          <div class="divider"></div>
          <div>Customer: ${order.guest_name}</div>
          <div>Phone: ${order.guest_phone}</div>
          <div>Address: ${order.delivery_address}</div>
          <div class="divider"></div>
          <table>${itemsHtml}</table>
          <div class="divider"></div>
          <table>
            <tr class="total">
              <td>Total</td>
              <td style="text-align: right;">Rs. ${order.total}</td>
            </tr>
          </table>
          <div class="divider"></div>
          <div style="text-align: center; font-size: 10px; margin-top: 10px;">Thank you for ordering with GetFood!</div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isSuper = user?.role === 'super_admin';
  const managerRestId = isSuper ? selectedBrandId : (user?.restaurantId || selectedBrandId);
  const restaurant = restaurants.find((r) => r.id === managerRestId) || restaurants.find((r) => user?.username?.toLowerCase().includes(r.slug)) || restaurants[0];

  // Derive human-readable branch label from username (e.g. manager_tandooristoppk_lake_city → "Lake City")
  const branchLabel = (() => {
    if (!user?.username) return null;
    // Find slug match in restaurants to know where brand name ends
    const matchedSlug = restaurants.find((r) => user.username!.toLowerCase().includes(r.slug));
    if (!matchedSlug) return null;
    const afterSlug = user.username.toLowerCase().replace('manager_', '').replace(matchedSlug.slug, '').replace(/^_/, '');
    if (!afterSlug) return null;
    return afterSlug.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  })();

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshOrders();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Filter orders belonging to selected brand or all launch brands
  const brandOrders = useMemo(() => {
    if (isSuper) {
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
    }

    // Branch/Brand Manager Mode
    const targetRest = restaurant;
    if (!targetRest) return orders;

    let restFiltered = orders.filter((o) => 
      Number(o.restaurant_id) === Number(targetRest.id) ||
      (o.restaurant_name && targetRest.name && 
       o.restaurant_name.toLowerCase().replace(/[^a-z0-9]/g, '') === targetRest.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
    );

    // Specific Branch filtering
    if (user?.branchId) {
      const branchMatch = restFiltered.filter((o) => Number(o.branch_id) === Number(user.branchId));
      if (branchMatch.length > 0) return branchMatch;
    }

    // Keyword branch matching fallback
    const uname = (user?.username || '').toLowerCase();
    if (uname.includes('lake_city')) {
      const match = restFiltered.filter((o) => (o.branch_name || '').toLowerCase().includes('lake city'));
      if (match.length > 0) return match;
    } else if (uname.includes('johar_town')) {
      const match = restFiltered.filter((o) => (o.branch_name || '').toLowerCase().includes('johar town'));
      if (match.length > 0) return match;
    } else if (uname.includes('baghbanpura') || uname.includes('gt_road')) {
      const match = restFiltered.filter((o) => (o.branch_name || '').toLowerCase().includes('baghbanpura') || (o.branch_name || '').toLowerCase().includes('gt road'));
      if (match.length > 0) return match;
    } else if (uname.includes('dha_phase_1') || uname.includes('dha_1')) {
      const match = restFiltered.filter((o) => (o.branch_name || '').toLowerCase().includes('dha phase 1') || (o.branch_name || '').toLowerCase().includes('dha'));
      if (match.length > 0) return match;
    } else if (uname.includes('gulberg_iii') || uname.includes('gulberg_3')) {
      const match = restFiltered.filter((o) => (o.branch_name || '').toLowerCase().includes('gulberg'));
      if (match.length > 0) return match;
    }
    let finalOrders = restFiltered;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      finalOrders = finalOrders.filter(o => 
        o.id.toString().includes(term) ||
        (o.guest_name || '').toLowerCase().includes(term) ||
        (o.guest_phone || '').includes(term) ||
        (o.delivery_address || '').toLowerCase().includes(term)
      );
    }

    return finalOrders;
  }, [orders, filterBrandId, restaurants, isSuper, restaurant, user, searchTerm]);

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
  ];

  // Trigger WhatsApp dispatch pre-filled message directly to assigned rider
  const triggerRiderWhatsApp = (order: any) => {
    const riderObj = order.rider || riders.find(r => r.id === (order.rider_id || order.rider?.id));
    if (!riderObj || !riderObj.phone) {
      showToast(`Please assign an available rider to Order #${order.id} first.`, 'info');
      openRiderAssignmentModal(order, true);
      return;
    }

    let targetPhone = riderObj.phone.replace(/[^0-9]/g, '');
    if (targetPhone.startsWith('03') && targetPhone.length === 11) {
      targetPhone = '92' + targetPhone.substring(1);
    }

    const name = order.guest_name || order.user_or_guest || 'Customer';
    const phone = order.guest_phone || 'N/A';
    const address = order.delivery_address || 'N/A';

    // Construct Google Maps link: use GPS coordinates if available, otherwise address search link
    const hasCoords = order.delivery_lat != null && order.delivery_lng != null;
    const locationLink = hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${order.delivery_lat},${order.delivery_lng}`
      : `https://maps.google.com/?q=${encodeURIComponent(address)}`;

    const itemsList = (order.items || []).map((i: any) => `• ${i.quantity || 1}x ${i.menu_item_name || i.name || 'Item'}`).join('\n');

    const message = 
      `🛵 *FOODSPHERE DISPATCH ORDER #${order.id}*\n\n` +
      `*Assigned Rider:* ${riderObj.name} (${riderObj.phone})\n` +
      `*Restaurant:* ${order.restaurant_name || ''}\n` +
      `*Branch:* ${order.branch_name || 'Main'} Branch\n\n` +
      `*Customer Name:* ${name}\n` +
      `*Customer Phone:* ${phone}\n` +
      `*Delivery Address:* ${address}\n` +
      `*Google Maps Location:* ${locationLink}\n\n` +
      `*Items Ordered:*\n${itemsList}\n\n` +
      `*Total Collection:* Rs. ${order.total} (${(order.payment_method || 'COD').toUpperCase()})\n\n` +
      `Please pick up from kitchen and deliver promptly!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const [selectedColumnFilter, setSelectedColumnFilter] = useState<OrderStatus | 'all'>('all');

  const boardContainerRef = React.useRef<HTMLDivElement>(null);

  const handleStatusChange = (order: Order, newStatus: OrderStatus) => {
    if (newStatus === 'cancelled') {
      if (order.status === 'delivered' && user?.role !== 'super_admin') {
        showToast('Only Super Admin can cancel an order that has already been delivered.', 'error');
        return;
      }
      setCancelModalOrder(order);
      setCancelReason('');
      setCancelError('');
      return;
    }

    // Intercept 'out_for_delivery' transition: if no rider assigned, show Rider Assignment Modal
    const hasRider = (order as any).rider || (order as any).rider_id;
    if (newStatus === 'out_for_delivery' && !hasRider) {
      openRiderAssignmentModal(order, false);
      return;
    }

    updateOrderStatus(order.id, newStatus);
    
    // Auto-scroll board to the target column if viewing all columns
    if (selectedColumnFilter === 'all') {
      setTimeout(() => {
        const targetCol = document.getElementById(`column-${newStatus}`);
        if (targetCol && boardContainerRef.current) {
          targetCol.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 100);
    }
  };

  const filteredColumns = useMemo(() => {
    if (selectedColumnFilter === 'all') return columns;
    return columns.filter((c) => c.status === selectedColumnFilter);
  }, [columns, selectedColumnFilter]);

  return (
    <div className="space-y-6">
      {/* Dynamic Scrollbar Injection */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.4);
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
          {/* Brand Filter Selector (Super Admin) or Branch Badge (Manager) */}
          {isSuper ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs">
              <Store size={14} className="text-blue-400" />
              <span className="text-slate-400 font-medium">Brand:</span>
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
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs font-bold text-slate-100 shadow-sm">
              <Store size={14} className="text-orange-400" />
              <span>{restaurant?.name}</span>
              {branchLabel && (
                <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                  📍 {branchLabel}
                </span>
              )}
            </div>
          )}

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search #ID, name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500 w-44"
          />

          {/* Export CSV Button */}
          <button
            onClick={() => exportCSV(brandOrders)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition-all"
          >
            Export CSV
          </button>

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

      {/* Sub-Tab Order Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setMainViewTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              mainViewTab === 'active'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>⚡ Active Orders Board</span>
            <span className="bg-slate-950/60 px-2 py-0.5 rounded-full text-[10px] font-mono text-blue-300">
              {brandOrders.filter(o => ['received', 'preparing', 'out_for_delivery'].includes(o.status)).length}
            </span>
          </button>

          <button
            onClick={() => setMainViewTab('delivered')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              mainViewTab === 'delivered'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>📦 Delivered Archive</span>
            <span className="bg-slate-950/60 px-2 py-0.5 rounded-full text-[10px] font-mono text-emerald-300">
              {brandOrders.filter(o => o.status === 'delivered').length}
            </span>
          </button>

          <button
            onClick={() => setMainViewTab('cancelled')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              mainViewTab === 'cancelled'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>🛑 Cancelled Audit Log</span>
            <span className="bg-slate-950/60 px-2 py-0.5 rounded-full text-[10px] font-mono text-rose-300">
              {brandOrders.filter(o => o.status === 'cancelled').length}
            </span>
          </button>

          <button
            onClick={() => setMainViewTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              mainViewTab === 'all'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>📊 All Orders History</span>
            <span className="bg-slate-950/60 px-2 py-0.5 rounded-full text-[10px] font-mono text-purple-300">
              {brandOrders.length}
            </span>
          </button>
        </div>

        {/* Quick Column Filter within Active view */}
        {mainViewTab === 'active' && (
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedColumnFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                selectedColumnFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All 3 Columns
            </button>
            {columns.map((c) => (
              <button
                key={c.status}
                onClick={() => setSelectedColumnFilter(c.status)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedColumnFilter === c.status ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VIEW TAB 1: ACTIVE KANBAN BOARD */}
      {mainViewTab === 'active' && (
        <div 
          ref={boardContainerRef}
          className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start overflow-x-auto pb-4 custom-scrollbar"
        >
          {filteredColumns.map((col) => {
            const colOrders = brandOrders
              .filter((o) => o.status === col.status)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            return (
              <div 
                key={col.status} 
                id={`column-${col.status}`}
                className="w-full bg-slate-900/40 border border-slate-800/70 rounded-2xl p-4 flex flex-col max-h-[82vh] overflow-hidden backdrop-blur-md shadow-inner transition-all duration-300 hover:border-slate-700"
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
                        className={`bg-slate-950/60 border border-slate-900 hover:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between group hover:-translate-y-0.5 transition-all duration-300 border-l-4 ${col.border}`}
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
                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold bg-slate-900/40 px-2 py-0.5 rounded border border-slate-900/20">
                                <Clock size={10} className="text-slate-500" />
                                {formatOrderTime(order.created_at)}
                              </span>
                            </div>
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
                            
                            {/* Rider Assignment Control */}
                            <div className="mt-2 pt-2 border-t border-slate-900/60">
                              {order.rider ? (
                                <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-sky-400 truncate">
                                    <Bike size={14} className="flex-shrink-0" />
                                    <span className="truncate">🚴 Rider: {order.rider.name}</span>
                                    {order.rider.phone && <span className="text-[10px] text-slate-400 font-mono">({order.rider.phone})</span>}
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => setAssignRiderModalOrder(order)}
                                      title="Reassign / Change Rider"
                                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded flex items-center gap-1 transition-colors"
                                    >
                                      <Edit3 size={11} />
                                    </button>
                                    <button
                                      onClick={() => triggerRiderWhatsApp(order)}
                                      title="Send WhatsApp Dispatch to Rider"
                                      className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-extrabold rounded flex items-center gap-1 transition-colors"
                                    >
                                      <MessageSquare size={11} /> WhatsApp
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 truncate">
                                    <Bike size={12} className="flex-shrink-0" />
                                    <span className="truncate">Unassigned</span>
                                  </div>
                                  <button
                                    onClick={() => setAssignRiderModalOrder(order)}
                                    className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-[10px] font-extrabold rounded-md border border-sky-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    + Assign Rider
                                  </button>
                                </div>
                              )}
                            </div>
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

                          {/* Kanban Action buttons */}
                          <div className="space-y-2">
                            {order.status === 'received' && (
                              <button
                                onClick={() => handleStatusChange(order, 'preparing')}
                                className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-450 hover:to-orange-450 text-slate-950 font-black py-2 rounded-lg text-xs transition-all shadow-md active:scale-[0.98]"
                              >
                                🍳 Start Preparing →
                              </button>
                            )}

                            {order.status === 'preparing' && (
                              <button
                                onClick={() => handleStatusChange(order, 'out_for_delivery')}
                                className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black py-2 rounded-lg text-xs transition-all shadow-md active:scale-[0.98]"
                              >
                                🛵 Dispatch Out For Delivery →
                              </button>
                            )}

                            {order.status === 'out_for_delivery' && (
                              <button
                                onClick={() => handleStatusChange(order, 'delivered')}
                                className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black py-2 rounded-lg text-xs transition-all shadow-md active:scale-[0.98]"
                              >
                                <CheckCircle size={13} /> Mark Delivered ✅
                              </button>
                            )}

                            {/* Quick Jump Status Dropdown */}
                            <div className="w-full relative group/select flex gap-2 items-center">
                              <select 
                                value={order.status}
                                onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus)}
                                className="w-full appearance-none bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold py-1.5 pl-3 pr-8 rounded-lg text-[10px] transition-all cursor-pointer text-center outline-none select-none"
                              >
                                <option value="received" className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>Received</option>
                                <option value="preparing" className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>Preparing</option>
                                <option value="out_for_delivery" className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>Out For Delivery</option>
                                <option value="delivered" className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>Delivered</option>
                                <option value="cancelled" className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>❌ Cancel Order</option>
                              </select>
                            </div>

                            {/* Rider dispatch via WhatsApp & Print Receipt */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => triggerRiderWhatsApp(order)}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-400 font-extrabold py-1.5 rounded-lg text-[10px] transition-all shadow-sm active:scale-[0.98]"
                              >
                                <MessageSquare size={11} /> WhatsApp Rider
                              </button>
                              <button
                                onClick={() => handlePrintReceipt(order)}
                                className="px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold py-1.5 rounded-lg text-[10px] transition-all"
                              >
                                🖨️ Print
                              </button>
                            </div>
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
      )}

      {/* VIEW TAB 2: DELIVERED ARCHIVE */}
      {mainViewTab === 'delivered' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <CheckCircle size={16} /> Delivered Orders Archive ({brandOrders.filter(o => o.status === 'delivered').length})
            </h2>
            <span className="text-xs text-slate-400">Completed order records</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {brandOrders.filter(o => o.status === 'delivered').map(order => (
              <div key={order.id} className="bg-slate-950/60 border border-emerald-900/40 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-extrabold text-xs text-slate-200">#{order.id} {order.restaurant_name && `(${order.restaurant_name})`}</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">DELIVERED</span>
                </div>
                <div className="text-xs space-y-1 text-slate-300">
                  <p><strong>Customer:</strong> {order.guest_name || order.user_or_guest} ({order.guest_phone || 'N/A'})</p>
                  <p><strong>Address:</strong> {order.delivery_address}</p>
                  <p><strong>Total:</strong> Rs. {order.total} ({order.payment_method.toUpperCase()})</p>
                  {order.rider && <p className="text-sky-400"><strong>Rider:</strong> {order.rider.name} ({order.rider.phone})</p>}
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  {isSuper && (
                    <button
                      onClick={() => handleStatusChange(order, 'cancelled')}
                      className="text-[10px] font-bold text-rose-400 hover:underline"
                    >
                      ⚠️ Refund Order
                    </button>
                  )}
                  <button
                    onClick={() => handlePrintReceipt(order)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded"
                  >
                    🖨️ Print
                  </button>
                </div>
              </div>
            ))}

            {brandOrders.filter(o => o.status === 'delivered').length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-slate-500 font-bold border border-dashed border-slate-800 rounded-xl">
                No delivered orders found in archive.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW TAB 3: CANCELLED LOG */}
      {mainViewTab === 'cancelled' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h2 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              🛑 Cancelled Orders Audit Log ({brandOrders.filter(o => o.status === 'cancelled').length})
            </h2>
            <span className="text-xs text-slate-400">Audit logs with cancellation reasons</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {brandOrders.filter(o => o.status === 'cancelled').map(order => (
              <div key={order.id} className="bg-slate-950/60 border border-rose-900/40 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-extrabold text-xs text-slate-200">#{order.id} {order.restaurant_name && `(${order.restaurant_name})`}</span>
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">CANCELLED</span>
                </div>
                <div className="text-xs space-y-1 text-slate-300">
                  <p><strong>Customer:</strong> {order.guest_name || order.user_or_guest} ({order.guest_phone || 'N/A'})</p>
                  <p><strong>Total Amount:</strong> Rs. {order.total}</p>
                  <div className="p-2 bg-rose-950/30 border border-rose-900/30 rounded text-[11px] text-rose-300 italic">
                    "{order.cancellation_reason || 'No reason specified'}"
                  </div>
                </div>
              </div>
            ))}

            {brandOrders.filter(o => o.status === 'cancelled').length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-slate-500 font-bold border border-dashed border-slate-800 rounded-xl">
                No cancelled orders found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW TAB 4: ALL HISTORY TABLE */}
      {mainViewTab === 'all' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 border-b border-slate-800 font-bold uppercase text-slate-400">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Brand & Branch</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Rider</th>
                  <th className="p-3">Total</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {brandOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-white">#{o.id}</td>
                    <td className="p-3">{o.restaurant_name} ({o.branch_name || 'Main'})</td>
                    <td className="p-3">{o.guest_name || o.user_or_guest} ({o.guest_phone || ''})</td>
                    <td className="p-3 font-mono font-bold uppercase text-sky-400">{o.status}</td>
                    <td className="p-3">{o.rider ? o.rider.name : 'Unassigned'}</td>
                    <td className="p-3 font-bold text-emerald-400">Rs. {o.total}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => handlePrintReceipt(o)} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold">🖨️ Print</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancellation Reason Requirement Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span className="text-rose-500">🛑</span> Cancel Order #{cancelModalOrder.id}
              </h3>
              <button
                onClick={() => setCancelModalOrder(null)}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300">
              <strong>Mandatory Audit Requirement:</strong> Enter the reason for cancelling this order (e.g. "Customer requested cancellation", "Out of stock item"). This reason will be logged with your Manager ID.
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-extrabold text-slate-400 mb-1.5">
                Cancellation Reason *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  if (cancelError) setCancelError('');
                }}
                placeholder="Type cancellation reason here..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 text-white rounded-xl p-3 text-xs outline-none min-h-[90px]"
              />
              {cancelError && (
                <p className="text-rose-400 text-[11px] mt-1 font-bold">{cancelError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={confirmCancellation}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black rounded-xl text-xs transition-all shadow-lg active:scale-95"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rider Assignment Requirement Modal */}
      {assignRiderModalOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Bike className="text-sky-400" size={16} /> Assign Rider to Order #{assignRiderModalOrder.id}
              </h3>
              <button
                onClick={() => setAssignRiderModalOrder(null)}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 text-xs text-sky-300">
              Select a delivery rider from your outlet list to assign to this order. The order status will update to <strong>Out for Delivery</strong> and rider status will change to <strong>ON_DELIVERY</strong>.
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-extrabold text-slate-400 mb-1.5">
                Select Available Delivery Rider *
              </label>
              {(() => {
                const targetBranchId = assignRiderModalOrder.branch_id || user?.branchId;
                const availableRiders = riders.filter((r: any) => {
                  const isAvail = r.status === 'AVAILABLE' && r.is_active !== false;
                  const matchesBranch = !targetBranchId || Number(r.branch) === Number(targetBranchId);
                  return isAvail && matchesBranch;
                });

                if (availableRiders.length === 0) {
                  return (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                      <p className="font-bold text-amber-400">No AVAILABLE riders found for your branch.</p>
                      <p className="text-[11px] text-slate-500">Riders marked as OFFLINE or ON_DELIVERY are filtered out. Ensure you have an available rider in Rider Management.</p>
                    </div>
                  );
                }

                return (
                  <select
                    value={selectedRiderIdForModal || ''}
                    onChange={(e) => setSelectedRiderIdForModal(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-bold rounded-xl p-3 text-xs outline-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>-- Choose Rider --</option>
                    {availableRiders.map((r: any) => (
                      <option key={r.id} value={r.id} className="bg-slate-900 text-slate-100 font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                        {r.name} ({r.phone}) — [AVAILABLE]
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setAssignRiderModalOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleModalAssignRider}
                disabled={!selectedRiderIdForModal}
                className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white font-black rounded-xl text-xs transition-all shadow-lg active:scale-95 flex items-center gap-1.5"
              >
                <Bike size={14} /> Assign & Dispatch →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

