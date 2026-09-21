import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import type { OwnerRegistrationLog } from '../../types';
import {
  Users,
  Search,
  Sparkles,
  Clock,
  Building2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Activity,
  UserCheck,
  ExternalLink
} from 'lucide-react';

interface OverviewStats {
  totalTenants: number;
  activeTenants: number;
  totalSelfRegistered: number;
  totalAdminOnboarded: number;
  totalTrialActive: number;
  totalTrialExpired: number;
  trialConversionRate: number;
  mrr: number;
  arr: number;
  planDistribution: Record<string, number>;
}

interface OwnerActivityItem {
  id: string;
  action: string;
  details: string;
  targetId?: string;
  targetType?: string;
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  timestamp: string;
}

export const OwnerActivityPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [logs, setLogs] = useState<OwnerRegistrationLog[]>([]);
  const [activities, setActivities] = useState<OwnerActivityItem[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'SelfRegistered' | 'AdminOnboarded'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Free' | 'Paid' | 'Pending' | 'Expired'>('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch registrations
  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize: 15,
        search: searchTerm.trim() || undefined,
        source: sourceFilter !== 'All' ? sourceFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
      };

      const res = await apiClient.get<{
        success: boolean;
        data: OwnerRegistrationLog[];
        pagination: { currentPage: number; totalPages: number; totalItems: number };
      }>('/superadmin/analytics/registrations', { params });

      if (res.data?.success) {
        setLogs(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalCount(res.data.pagination?.totalItems || 0);
      }
    } catch (err) {
      console.error('Failed to fetch registrations', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch overview stats
  const fetchOverview = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: OverviewStats }>(
        '/superadmin/analytics/overview'
      );
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch overview stats', err);
    }
  };

  // Fetch recent owner activity feed
  const fetchOwnerActivity = async () => {
    setLoadingActivity(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: OwnerActivityItem[] }>(
        '/superadmin/analytics/owner-activity?limit=25'
      );
      if (res.data?.success) {
        setActivities(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch activity feed', err);
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchOwnerActivity();
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [page, sourceFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRegistrations();
  };

  return (
    <div className="space-y-6 w-full font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#eedfc8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Owner Registrations & Activity Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Live Tracking
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time feed of new restaurant owners, plan selections, trial days, payments, and account activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchRegistrations();
              fetchOverview();
              fetchOwnerActivity();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#fbf7ee] hover:bg-[#f3ead7] border border-[#eedfc8] text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => navigate('/superadmin/tenants?action=new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Onboard Restaurant</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total & Self-Registered */}
        <div className="bg-white p-5 rounded-2xl border border-[#eedfc8] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Self-Registered Owners</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {stats?.totalSelfRegistered ?? 0}
            </p>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
              + {stats?.totalAdminOnboarded ?? 0} Admin Onboarded
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Active Trials */}
        <div className="bg-white p-5 rounded-2xl border border-[#eedfc8] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active 15-Day Trials</p>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {stats?.totalTrialActive ?? 0}
            </p>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {stats?.totalTrialExpired ?? 0} expired trials
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Conversion Rate */}
        <div className="bg-white p-5 rounded-2xl border border-[#eedfc8] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trial Conversion Rate</p>
            <p className="text-2xl font-black text-blue-600 mt-1">
              {stats?.trialConversionRate ?? 0}%
            </p>
            <span className="text-[10px] text-blue-500 font-semibold mt-1 block">Trial to Paid licenses</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: MRR */}
        <div className="bg-white p-5 rounded-2xl border border-[#eedfc8] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active SaaS MRR</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              ₹{(stats?.mrr ?? 0).toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-slate-500 mt-1 block">
              ARR: ₹{(stats?.arr ?? 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Layout: Left 2 cols for Registrations, Right 1 col for Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Owner Registrations Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#eedfc8] shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            {/* Table Header & Search Filter */}
            <div className="p-4 sm:p-5 border-b border-[#eedfc8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Owner Registrations ({totalCount})</span>
                </h2>
                <p className="text-[11px] text-slate-400">All registered restaurant owners and chosen plan tiers</p>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search owner, email, restaurant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-[#fbf7ee] border border-[#eedfc8] rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition w-48 sm:w-60"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Filter Pills */}
            <div className="px-5 py-2.5 bg-[#fbf7ee]/60 border-b border-[#eedfc8] flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Source:
              </span>
              {(['All', 'SelfRegistered', 'AdminOnboarded'] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => {
                    setSourceFilter(src);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    sourceFilter === src
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-[#fbf7ee] border border-[#eedfc8] text-slate-700 hover:bg-[#f3ead7]'
                  }`}
                >
                  {src === 'All' ? 'All Sources' : src === 'SelfRegistered' ? '🟢 Self-Registered' : '🔵 Admin-Onboarded'}
                </button>
              ))}

              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider ml-3 mr-1">
                Status:
              </span>
              {(['All', 'Free', 'Paid', 'Pending', 'Expired'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-[#fbf7ee] border border-[#eedfc8] text-slate-700 hover:bg-[#f3ead7]'
                  }`}
                >
                  {st === 'All' ? 'All Status' : st === 'Free' ? '🟡 Free Trial' : st === 'Paid' ? '🟢 Paid' : st === 'Pending' ? '🟠 Pending' : '🔴 Expired'}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#fbf7ee] border-b border-[#eedfc8] text-slate-600 uppercase tracking-wider font-semibold text-[10px]">
                    <th className="py-3 px-4">Owner & Restaurant</th>
                    <th className="py-3 px-4">Plan Selected</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Status / Trial</th>
                    <th className="py-3 px-4">Registered Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eedfc8]/60 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                        <span>Loading owner registrations...</span>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">No owner registrations found</p>
                        <p className="text-[11px] mt-1">Try adjusting your search terms or filters</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-amber-50/40 transition">
                        {/* Owner & Restaurant */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{log.businessName || 'Restaurant'}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span>{log.ownerName}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-400">{log.ownerEmail}</span>
                          </div>
                          {log.city && <span className="text-[10px] text-slate-400">📍 {log.city}</span>}
                        </td>

                        {/* Plan Selected */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {log.planName || log.planCode}
                            </span>
                            {log.isTrial && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                TRIAL
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {log.planPrice === 0 ? '₹0 (Free)' : `₹${log.planPrice.toLocaleString('en-IN')}`}
                          </p>
                        </td>

                        {/* Source */}
                        <td className="py-3 px-4">
                          {log.registrationSource === 'SelfRegistered' ? (
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

                        {/* Status & Trial */}
                        <td className="py-3 px-4">
                          {log.isTrial ? (
                            <div>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  (log.daysRemaining ?? 0) > 0
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {(log.daysRemaining ?? 0) > 0
                                  ? `🟡 ${log.daysRemaining} days left`
                                  : '🔴 Trial Expired'}
                              </span>
                            </div>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                log.paymentStatus === 'Paid'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : log.paymentStatus === 'Pending'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {log.paymentStatus === 'Paid' ? '🟢 Paid' : log.paymentStatus}
                            </span>
                          )}
                        </td>

                        {/* Registered Date */}
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {new Date(log.registeredAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                          <span className="block text-[10px] text-slate-400">
                            {new Date(log.registeredAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </td>

                        {/* Quick Actions */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => navigate(`/superadmin/tenants/${log.tenantId}`)}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Manage</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-[#eedfc8] flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages} ({totalCount} total registrations)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#eedfc8] bg-[#fbf7ee] text-slate-600 hover:bg-[#f3ead7] disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-[#eedfc8] bg-[#fbf7ee] text-slate-600 hover:bg-[#f3ead7] disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Recent Owner Activity Feed (Timeline) */}
        <div className="bg-white rounded-2xl border border-[#eedfc8] shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#eedfc8] mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Owner Activity Timeline</h2>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Real-time
              </span>
            </div>

            {loadingActivity ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-500 mb-2" />
                <p className="text-xs">Loading activity logs...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Activity className="w-6 h-6 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No recent activity</p>
                <p className="text-[10px] mt-0.5">Events appear as owners interact with the platform</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {activities.map((act) => (
                  <div key={act.id} className="relative pl-5 pb-3 border-l-2 border-[#eedfc8]/80 last:border-none">
                    <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-900">
                        {act.action}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(act.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {act.details}
                    </p>
                    {act.userEmail && (
                      <span className="text-[10px] text-slate-400 font-mono block mt-1">
                        By: {act.userEmail}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#eedfc8]">
            <button
              onClick={() => navigate('/superadmin/audit-logs')}
              className="w-full py-2 bg-[#fbf7ee] hover:bg-[#f3ead7] text-slate-700 rounded-xl text-xs font-bold transition border border-[#eedfc8] text-center cursor-pointer"
            >
              View Complete System Audit Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
