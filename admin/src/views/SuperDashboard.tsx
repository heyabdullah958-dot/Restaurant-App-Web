import React from 'react';
import { useAdmin } from '../AdminContext';
import { AnalyticsCharts } from '../components/AnalyticsCharts';
import { DollarSign, Store, ClipboardCheck, Percent, Star, ArrowUpRight } from 'lucide-react';

export const SuperDashboard: React.FC = () => {
  const { restaurants, orders, setSelectedBrand, setView } = useAdmin();

  // Calculate live statistics
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Metrics data
  const stats = [
    {
      title: 'Gross Platform Sales',
      value: `Rs. ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <DollarSign className="text-blue-500" size={20} />,
      bgColor: 'bg-blue-500/10',
      change: 'Real-time sales summary',
    },
    {
      title: 'Active Restaurant Brands',
      value: `${restaurants.filter(r => r.is_active).length} / ${restaurants.length}`,
      icon: <Store className="text-emerald-500" size={20} />,
      bgColor: 'bg-emerald-500/10',
      change: `${restaurants.filter(r => !r.is_active).length} disabled or pending`,
    },
    {
      title: 'Total Platform Orders',
      value: totalOrders.toLocaleString(),
      icon: <ClipboardCheck className="text-violet-500" size={20} />,
      bgColor: 'bg-violet-500/10',
      change: 'All-time order count',
    },
    {
      title: 'Avg Order Value (AOV)',
      value: `Rs. ${Math.round(averageOrderValue)}`,
      icon: <Percent className="text-amber-500" size={20} />,
      bgColor: 'bg-amber-500/10',
      change: 'Calculated average basket',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">HQ Command Center</h1>
          <p className="text-sm text-slate-400">Multi-tenant network health and consolidated sales aggregates</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {stats.map((stat, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.title}</span>
                <h3 className="text-2xl font-extrabold text-white mt-1.5">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>{stat.icon}</div>
            </div>
            <div className="text-xs font-medium text-slate-500 mt-4 border-t border-slate-700/30 pt-3">
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl shadow-sm">
          <AnalyticsCharts />
        </div>
      </div>

      {/* Brand Tenant Grid */}
      <div className="bg-slate-800 border border-slate-700/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-700/60 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white text-base">Active Tenant Performance</h3>
            <p className="text-xs text-slate-400">Real-time stats per onboarded restaurant brand</p>
          </div>
          <button 
            onClick={() => setView('tenant_management')}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            Manage Registry <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-700/40 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Brand Name</th>
                <th className="py-4 px-6">Cuisine & City</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Revenue</th>
                <th className="py-4 px-6 text-right">Total Orders</th>
                <th className="py-4 px-6 text-right">AOV</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40 text-sm text-slate-300">
              {restaurants.map((restaurant) => {
                const tenantOrders = orders.filter(o => o.restaurant_id === restaurant.id);
                const tenantRevenue = tenantOrders.reduce((sum, o) => sum + o.total, 0);
                const tenantAOV = tenantOrders.length > 0 ? tenantRevenue / tenantOrders.length : 0;
                
                return (
                  <tr key={restaurant.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={restaurant.logo_url}
                          alt={restaurant.name}
                          className="w-9 h-9 rounded-lg object-cover border border-slate-700"
                        />
                        <div>
                          <span className="font-bold text-white block">{restaurant.name}</span>
                          <span className="flex items-center gap-1 text-xs text-amber-500 font-medium mt-0.5">
                            <Star size={12} fill="currentColor" /> {restaurant.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className="block font-semibold text-slate-200">{restaurant.cuisine_type}</span>
                      <span className="text-xs text-slate-500">{restaurant.city}</span>
                    </td>
                    <td className="py-4.5 px-6 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                          restaurant.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {restaurant.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-right font-bold text-white">
                      Rs. {tenantRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4.5 px-6 text-right font-semibold">
                      {tenantOrders.length.toLocaleString()}
                    </td>
                    <td className="py-4.5 px-6 text-right font-semibold">
                      Rs. {Math.round(tenantAOV)}
                    </td>
                    <td className="py-4.5 px-6 text-center">
                      <button
                        onClick={() => {
                          setSelectedBrand(restaurant.id);
                          setView('branch_dashboard');
                        }}
                        className="text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white py-1.5 px-3 rounded-lg border border-slate-600 hover:border-slate-500 transition-all"
                      >
                        Enter Workspace
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
