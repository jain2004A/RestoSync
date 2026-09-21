import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Store,
  CreditCard,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { initialTenants } from '../services/mockTenantData';
import type { Tenant } from '../types';
import { apiClient } from '../../services/api';
import type { OwnerRegistrationLog } from '../../types';

interface OverviewStats {
  summary?: {
    totalTenants?: number;
    activeTenants?: number;
    suspendedTenants?: number;
    totalSelfRegistered?: number;
    totalAdminOnboarded?: number;
    totalTrialActive?: number;
    totalTrialExpired?: number;
    totalPaidTenants?: number;
    trialConversionRate?: number;
    totalCollectedRevenue?: number;
    mrr?: number;
    arr?: number;
    churnRate?: string;
  };
  totalTenants?: number;
  activeTenants?: number;
  totalOutlets?: number;
  totalSelfRegistered?: number;
  totalAdminOnboarded?: number;
  totalTrialActive?: number;
  totalTrialExpired?: number;
  trialConversionRate?: number;
  mrr?: number;
  arr?: number;
  planDistribution?: any;
}

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [recentRegistrations, setRecentRegistrations] = useState<OwnerRegistrationLog[]>([]);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Fetch live tenants and stats from backend
  const loadData = async () => {
    try {
      const [tenantsRes, statsRes, regRes] = await Promise.allSettled([
        apiClient.get<{ success: boolean; data: any[] }>('/tenants'),
        apiClient.get<{ success: boolean; data: OverviewStats }>('/superadmin/analytics/overview'),
        apiClient.get<{ success: boolean; data: OwnerRegistrationLog[] }>('/superadmin/analytics/registrations?pageSize=5')
      ]);

      if (tenantsRes.status === 'fulfilled' && tenantsRes.value.data?.success && Array.isArray(tenantsRes.value.data.data)) {
        const backendTenants: Tenant[] = tenantsRes.value.data.data.map((bt: any) => ({
          id: bt.id,
          businessName: bt.businessName,
          legalName: bt.legalName || bt.businessName,
          restaurantType: bt.businessType === 1 ? 'Cafe' : 'FineDine',
          ownerName: bt.ownerEmail?.split('@')[0] || 'Owner',
          ownerEmail: bt.ownerEmail,
          ownerPhone: bt.ownerPhone || '9876543210',
          city: bt.city || 'Pune',
          state: bt.state || 'Maharashtra',
          gstin: bt.gstin || '',
          plan: bt.planName || (bt.subscriptionPlan === 3 ? 'Enterprise' : bt.subscriptionPlan === 2 ? 'Professional' : 'Starter'),
          status: bt.isActive ? (bt.isTrial ? 'Trial' : 'Active') : 'Suspended',
          maxOutlets: bt.maxOutlets || 3,
          outlets: bt.outlets || [],
          joinedAt: new Date(bt.createdAt || Date.now()).toISOString().split('T')[0],
          subscriptionExpiresAt: new Date(bt.subscriptionExpiresAt || Date.now() + 365 * 86400000)
            .toISOString()
            .split('T')[0],
          features: bt.features || {
            enableKds: true,
            enableWaiterApp: true,
            enableAggregators: true,
            enableRecipeInventory: true,
            enableKhataBook: false,
          },
        }));
        setTenants(backendTenants);
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.data?.success) {
        setOverviewStats(statsRes.value.data.data);
      }

      if (regRes.status === 'fulfilled' && regRes.value.data?.success) {
        setRecentRegistrations(regRes.value.data.data || []);
      }
    } catch (err) {
      console.debug('Dashboard data load error:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (tenantId: string, currentStatus: string) => {
    const newActive = currentStatus !== 'Active';
    try {
      await apiClient.patch(`/tenants/${tenantId}/status`, { isActive: newActive });
      setTenants((prev) =>
        prev.map((t) => (t.id === tenantId ? { ...t, status: newActive ? 'Active' : 'Suspended' } : t))
      );
      setStatusMessage(`Tenant status changed to ${newActive ? 'Active' : 'Suspended'}`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      // Local optimistic update fallback
      setTenants((prev) =>
        prev.map((t) => (t.id === tenantId ? { ...t, status: newActive ? 'Active' : 'Suspended' } : t))
      );
      setStatusMessage(`Status updated locally to ${newActive ? 'Active' : 'Suspended'}`);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // Metrics
  // Metrics
  const summary = (overviewStats as any)?.summary;
  const totalTenants = summary?.totalTenants ?? overviewStats?.totalTenants ?? tenants.length;
  const activeTenants = summary?.activeTenants ?? overviewStats?.activeTenants ?? tenants.filter((t) => t.status === 'Active').length;
  const totalOutlets = overviewStats?.totalOutlets ?? tenants.reduce((acc, t) => acc + (t.outlets?.length || 1), 0);
  const trialActive = summary?.totalTrialActive ?? overviewStats?.totalTrialActive ?? tenants.filter((t) => t.status === 'Trial').length;

  const calculatedArr = summary?.arr ?? overviewStats?.arr ?? (activeTenants * 24000);
  const calculatedMrr = summary?.mrr ?? overviewStats?.mrr ?? Math.round(calculatedArr / 12);
  const totalSelfRegistered = summary?.totalSelfRegistered ?? overviewStats?.totalSelfRegistered ?? 0;
  const trialConversionRate = summary?.trialConversionRate ?? overviewStats?.trialConversionRate ?? 0;

  return (
    <div className="space-y-6 w-full font-sans">
      {statusMessage && (
        <div className="fixed top-20 right-6 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl z-50 text-xs font-semibold flex items-center space-x-2 border border-slate-700 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/90 via-amber-50/30 to-white p-5 rounded-2xl border border-[#eedfc8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              SaaS Operations Headquarters
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Live Network
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-tenant monitoring across all onboarded restaurants, branches, and active subscriptions.
          </p>
        </div>

        <button
          onClick={() => navigate('/superadmin/tenants?action=new')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Onboard New Restaurant</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tenants */}
        <div className="bg-white p-5 rounded-2xl border border-[#eedfc8] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Restaurants</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalTenants}</p>
            <span className="inline-flex items-center text-[10px] text-emerald-600 font-semibold mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              {activeTenants} active across network
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Active Outlets */}
        <div className="bg-white p-5 rounded-2xl border border-[#eedfc8] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Branch Outlets</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalOutlets}</p>
            <span className="text-[10px] text-slate-500 mt-1 block">Connected POS nodes</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Platform MRR & ARR */}
        <div className="bg-white p-5 rounded-2xl border border-[#eedfc8] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Annual SaaS ARR</p>
            <p className="text-2xl font-black text-slate-900 mt-1">₹{calculatedArr.toLocaleString('en-IN')}</p>
            <span className="text-[10px] text-blue-600 font-semibold mt-1 block">
              MRR: ~₹{calculatedMrr.toLocaleString('en-IN')}/mo
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Trials & Self-Registered */}
        <div className="bg-white p-5 rounded-2xl border border-[#eedfc8] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Self-Registered & Trials</p>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {totalSelfRegistered}
            </p>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {trialActive} active trials ({trialConversionRate}% conv.)
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* NEW SECTION: Recent Owner Registrations Feed */}
      {recentRegistrations.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#eedfc8] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#eedfc8]/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Recent Owner Registrations & Plan Choices</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Self-Service
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Newly registered restaurant owners, selected subscription tiers & trial status</p>
            </div>
            <button
              onClick={() => navigate('/superadmin/owner-activity')}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
            >
              <span>View Full Activity Feed</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#fbf7ee] border-b border-[#eedfc8] text-slate-600 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">Restaurant & Owner</th>
                  <th className="py-3 px-4">Plan Selected</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Trial / Payment</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eedfc8]/60 text-slate-700">
                {recentRegistrations.slice(0, 5).map((reg) => (
                  <tr key={reg.id} className="hover:bg-amber-50/40 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{reg.businessName}</p>
                      <p className="text-[10px] text-slate-400">
                        {reg.ownerName} • <span className="font-mono">{reg.ownerEmail}</span>
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {reg.planName || reg.planCode}
                        </span>
                        {reg.isTrial && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            TRIAL
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {reg.planPrice === 0 ? '₹0 Free' : `₹${reg.planPrice.toLocaleString('en-IN')}`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {reg.registrationSource === 'SelfRegistered' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Self-Registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          Admin-Onboarded
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {reg.isTrial ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            (reg.daysRemaining ?? 0) > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {(reg.daysRemaining ?? 0) > 0
                            ? `🟡 ${reg.daysRemaining} days left`
                            : '🔴 Expired'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          🟢 Paid
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(reg.registeredAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/superadmin/tenants/${reg.tenantId}`)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plan Breakdown & Recent Onboarding Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Tenants List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#eedfc8] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#eedfc8]/80 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recently Onboarded Restaurants</h2>
              <p className="text-[11px] text-slate-400">Latest restaurants operating on QuantroBill SaaS</p>
            </div>
            <button
              onClick={() => navigate('/superadmin/tenants')}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
            >
              <span>View All Tenants</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#fbf7ee] border-b border-[#eedfc8] text-slate-600 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">Restaurant</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Outlets</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eedfc8]/60 text-slate-700">
                {tenants.slice(0, 5).map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-amber-50/40 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{tenant.businessName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{tenant.ownerEmail}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{tenant.city}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">{tenant.outlets?.length || 1}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tenant.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : tenant.status === 'Trial'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {tenant.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(tenant.id, tenant.status)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                          tenant.status === 'Active'
                            ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {tenant.status === 'Active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Dynamic Subscription Plan Breakdown */}
        <div className="bg-white rounded-2xl border border-[#eedfc8] shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#eedfc8]/80">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Subscription Tier Distribution</h2>
            </div>

            <div className="space-y-4">
              {(() => {
                const pd = overviewStats?.planDistribution;
                if (Array.isArray(pd) && pd.length > 0) {
                  return pd.map((item: any, idx: number) => {
                    const planName = item.plan || item.Plan || `Plan ${idx + 1}`;
                    const count = item.count ?? item.Count ?? 0;
                    const share = item.share ?? item.Share ?? (totalTenants ? Math.round((count / totalTenants) * 100) : 0);
                    return (
                      <div key={planName}>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-700">{planName}</span>
                          <span className="text-slate-900 font-bold">{count} ({share}%)</span>
                        </div>
                        <div className="w-full bg-[#f0e6d2] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(share, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                } else if (pd && typeof pd === 'object' && Object.keys(pd).length > 0) {
                  return Object.entries(pd).map(([planName, countVal]: [string, any]) => {
                    const count = typeof countVal === 'number' ? countVal : (countVal?.count ?? 0);
                    const pct = totalTenants ? Math.round((count / totalTenants) * 100) : 0;
                    return (
                      <div key={planName}>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-700">{planName}</span>
                          <span className="text-slate-900 font-bold">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-[#f0e6d2] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                } else {
                  return (
                    <>
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-700">Starter Annual</span>
                          <span className="text-slate-900 font-bold">{tenants.filter(t => t.plan?.includes('Starter')).length} restaurants</span>
                        </div>
                        <div className="w-full bg-[#f0e6d2] h-2 rounded-full overflow-hidden">
                          <div className="bg-sky-500 h-full rounded-full" style={{ width: '40%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-700">Growth / Hardware</span>
                          <span className="text-slate-900 font-bold">{tenants.filter(t => t.plan?.includes('Growth') || t.plan?.includes('Hardware')).length} restaurants</span>
                        </div>
                        <div className="w-full bg-[#f0e6d2] h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: '35%' }} />
                        </div>
                      </div>
                    </>
                  );
                }
              })()}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#eedfc8]/80 space-y-2">
            <button
              onClick={() => navigate('/superadmin/owner-activity')}
              className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition cursor-pointer border border-emerald-200 text-center"
            >
              View Owner Registrations & Payments Feed
            </button>
            <button
              onClick={() => navigate('/superadmin/subscriptions')}
              className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold transition cursor-pointer border border-blue-200 text-center"
            >
              Configure Subscription Plans & Pricing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
