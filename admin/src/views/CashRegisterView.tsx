import React, { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../AdminContext';
import {
  fetchCashRegister,
  settleRiderCash,
  type CashRegisterData,
  type CashRegisterRider,
} from '../services/api';
import {
  Banknote,
  Wallet,
  Bike,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

export const CashRegisterView: React.FC = () => {
  const { user, selectedBrandId, restaurants, showToast } = useAdmin();
  const isSuper = user?.role === 'super_admin';

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<CashRegisterData | null>(null);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [settlingRider, setSettlingRider] = useState<CashRegisterRider | null>(null);
  const [settlementNotes, setSettlementNotes] = useState<string>('');
  const [submittingSettle, setSubmittingSettle] = useState<boolean>(false);

  // Active restaurant branches for filtering
  const activeRestaurant = restaurants.find((r) => r.id === selectedBrandId) || restaurants[0];
  const branches = activeRestaurant?.branches || [];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (isSuper) {
        if (selectedBrandId) params.restaurant_id = selectedBrandId;
        if (selectedBranchFilter !== 'all') params.branch_id = selectedBranchFilter;
      } else {
        if (user?.branchId) params.branch_id = user.branchId;
        else if (user?.restaurantId) params.restaurant_id = user.restaurantId;
      }
      const res = await fetchCashRegister(params);
      setData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load cash register data', 'error');
    } finally {
      setLoading(false);
    }
  }, [isSuper, selectedBrandId, selectedBranchFilter, user, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenSettleModal = (rider: CashRegisterRider) => {
    if (rider.unsettled_amount <= 0) {
      showToast(`No unsettled cash for ${rider.name}.`, 'info');
      return;
    }
    setSettlingRider(rider);
    setSettlementNotes('');
  };

  const handleConfirmSettle = async () => {
    if (!settlingRider) return;
    setSubmittingSettle(true);
    try {
      const payload: { rider_id?: number; order_ids?: number[]; notes?: string } = {
        notes: settlementNotes.trim() || `Cash handover from ${settlingRider.name}`,
      };
      if (settlingRider.id) {
        payload.rider_id = settlingRider.id;
      }
      if (settlingRider.unsettled_order_ids && settlingRider.unsettled_order_ids.length > 0) {
        payload.order_ids = settlingRider.unsettled_order_ids;
      }
      const res = await settleRiderCash(payload);
      showToast(res.message || `Successfully settled Rs. ${res.amount_settled}`, 'success');
      setSettlingRider(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to settle rider cash', 'error');
    } finally {
      setSubmittingSettle(false);
    }
  };

  const summary = data?.summary || {
    total_drawer_cash: 0,
    unsettled_rider_cash: 0,
    on_the_road_cash: 0,
    settled_orders_count: 0,
    unsettled_orders_count: 0,
    on_the_road_orders_count: 0,
  };

  const totalDeliveredCount = summary.settled_orders_count + summary.unsettled_orders_count;
  const settlementRate = totalDeliveredCount > 0
    ? Math.round((summary.settled_orders_count / totalDeliveredCount) * 100)
    : 100;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-sm">
              <Banknote size={22} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">
                Cash Register & Rider COD Settlement
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time physical drawer balance, unsettled rider wallets & audit settlement receipts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Branch filter if Super Admin */}
          {isSuper && branches.length > 0 && (
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl px-3 py-2 outline-none font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Operational Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} Branch
                </option>
              ))}
            </select>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 transition-all shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Physical Drawer Cash */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Drawer Cash
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Banknote size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            Rs. {summary.total_drawer_cash.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span>{summary.settled_orders_count} delivered orders verified & settled</span>
          </p>
        </div>

        {/* KPI 2: Unsettled in Rider Hands */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              In Rider Hands
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Wallet size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            Rs. {summary.unsettled_rider_cash.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <AlertCircle size={12} className="text-amber-500" />
            <span>{summary.unsettled_orders_count} delivered orders awaiting cash handover</span>
          </p>
        </div>

        {/* KPI 3: COD On The Road */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              On The Road
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Bike size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            Rs. {summary.on_the_road_cash.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Clock size={12} className="text-blue-500" />
            <span>{summary.on_the_road_orders_count} orders currently out for delivery</span>
          </p>
        </div>

        {/* KPI 4: Settlement Efficiency Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Settlement Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {settlementRate}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <ShieldCheck size={12} className="text-indigo-500" />
            <span>Total Delivered COD: {totalDeliveredCount}</span>
          </p>
        </div>
      </div>

      {/* Per-Rider COD Cash Wallet Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bike size={18} className="text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Branch Rider Cash Wallets
            </h2>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full">
              {data?.riders?.length || 0} Riders
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Delivered COD orders must be settled into the drawer upon rider return.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Rider Details</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Fleet Status</th>
                <th className="py-3 px-4">Unsettled Delivered</th>
                <th className="py-3 px-4">Cash On Road</th>
                <th className="py-3 px-4">Last Settled</th>
                <th className="py-3 px-4 text-right">Settlement Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && !data ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading cash wallets...</span>
                  </td>
                </tr>
              ) : !data?.riders || data.riders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No active riders found for this branch.
                  </td>
                </tr>
              ) : (
                data.riders.map((rider, rIdx) => {
                  const hasUnsettled = rider.unsettled_amount > 0;
                  const rowKey = rider.id ? `rider-${rider.id}` : `direct-${rIdx}`;
                  return (
                    <tr
                      key={rowKey}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {rider.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {rider.phone} · {rider.vehicle_type}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">
                          {rider.branch_name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {rider.restaurant_name}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rider.status === 'AVAILABLE'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : rider.status === 'ON_DELIVERY'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {rider.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div
                          className={`font-black text-sm ${
                            hasUnsettled
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          Rs. {rider.unsettled_amount.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {rider.unsettled_orders_count} orders awaiting turnover
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">
                          Rs. {rider.on_the_road_amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {rider.last_settled_at
                          ? new Date(rider.last_settled_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'No prior settlements'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenSettleModal(rider)}
                          disabled={!hasUnsettled}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            hasUnsettled
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 cursor-pointer active:scale-95'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <CheckCircle2 size={13} />
                          <span>
                            {hasUnsettled
                              ? `Settle Rs. ${rider.unsettled_amount.toLocaleString()}`
                              : 'Settled'}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settlement Audit Logs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Settlement Receipts & Audit Logs
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Immutable physical cash register handovers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Rider</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Settled By</th>
                <th className="py-3 px-4">Orders</th>
                <th className="py-3 px-4">Amount Handed In</th>
                <th className="py-3 px-4">Reconciliation Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!data?.recent_settlements || data.recent_settlements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No settlement records found yet.
                  </td>
                </tr>
              ) : (
                data.recent_settlements.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                      #{log.id}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(log.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {log.rider_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {log.branch_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {log.settled_by_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {log.order_ids.length} orders
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">
                      Rs. {Number(log.amount_settled).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 italic">
                      {log.notes || 'Routine EOD Handover'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation & Settlement Modal */}
      {settlingRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Banknote size={18} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Confirm Cash Handover
                </h3>
              </div>
              <button
                onClick={() => setSettlingRider(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-850 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Rider:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {settlingRider.name} ({settlingRider.phone})
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Branch Drawer:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {settlingRider.branch_name}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Delivered Orders:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {settlingRider.unsettled_orders_count} orders
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  Cash to Deposit:
                </span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  Rs. {settlingRider.unsettled_amount.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Settlement Notes (Optional)
              </label>
              <textarea
                value={settlementNotes}
                onChange={(e) => setSettlementNotes(e.target.value)}
                placeholder="e.g. Verified physically by Ali Manager. Notes on petty cash or discrepancy..."
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-emerald-500 text-slate-900 dark:text-white resize-none h-20"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSettlingRider(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSettle}
                disabled={submittingSettle}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submittingSettle ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                <span>Confirm & Deposit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
