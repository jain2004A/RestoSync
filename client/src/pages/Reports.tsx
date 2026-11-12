import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2,
  TrendingUp,
  Download,
  ArrowLeft,
  PieChart,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { usePosSyncStore } from '../store/posSyncStore';
import { useAuthStore } from '../store/authStore';

interface DailySale {
  date: string;
  revenue: number;
  count: number;
}

interface ChannelSale {
  channel: string;
  revenue: number;
  count: number;
  percentage: number;
}

interface TopItem {
  name: string;
  qty: number;
  revenue: number;
}

interface ReportData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCgst: number;
  totalSgst: number;
  revenueChangePercent: number;
  dailySales: DailySale[];
  channelSales: ChannelSale[];
  topItems: TopItem[];
  aggregatorCut: number;
  aggregatorRevenue: number;
}

const CHANNEL_COLORS: Record<string, string> = {
  'Dine In (Restaurant)': '#dc2626',
  'Zomato (Online)': '#cb202d',
  'Swiggy (Online)': '#fc8019',
  'Takeaway / Pick Up': '#10b981',
  'Delivery (Direct)': '#6366f1',
  'Other': '#94a3b8',
};

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { tenant } = useAuthStore();
  const sales = usePosSyncStore((state) => state.sales);
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days'>('7days');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daysMap = { today: 1, '7days': 7, '30days': 30 };

  // Fetch report data from backend API
  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<{ success: boolean; data: ReportData }>(
          `/reports/sales-summary?days=${daysMap[timeRange]}`
        );
        if (res.data?.success && res.data.data) {
          setReportData(res.data.data);
        }
      } catch (err: any) {
        console.warn('Reports API unavailable, falling back to local data:', err?.message);
        setError('api_fallback');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [timeRange]);

  // Hybrid fallback: compute from local posSyncStore if API failed
  const localFallback = useMemo((): ReportData | null => {
    if (error !== 'api_fallback' || sales.length === 0) return null;

    const now = new Date();
    const days = daysMap[timeRange];
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (days === 1 ? 0 : days));
    startDate.setHours(0, 0, 0, 0);

    const filtered = sales.filter((s) => {
      const ts = s.timestamp || '';
      if (ts.toLowerCase().startsWith('today')) return true;
      // Simple date parsing from posSyncStore timestamp format
      return true; // include all local sales for the fallback
    });

    const totalRevenue = filtered.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalOrders = filtered.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalCgst = filtered.reduce((acc, s) => acc + (s.taxAmount || 0) / 2, 0);
    const totalSgst = totalCgst;

    // Channel breakdown from local data
    const channelMap = new Map<string, { revenue: number; count: number }>();
    filtered.forEach((s) => {
      const ch = s.orderType === 'Dine In' ? 'Dine In (Restaurant)'
        : s.orderType === 'Take Away' || s.orderType === 'Parcel' ? 'Takeaway / Pick Up'
        : s.orderType === 'Delivery' ? 'Delivery (Direct)'
        : 'Other';
      const cur = channelMap.get(ch) || { revenue: 0, count: 0 };
      cur.revenue += s.totalAmount;
      cur.count += 1;
      channelMap.set(ch, cur);
    });
    const channelSales = Array.from(channelMap.entries()).map(([channel, data]) => ({
      channel,
      ...data,
      percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    // Top items from local data
    const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
    filtered.forEach((s) => {
      (s.items || []).forEach((it: any) => {
        const name = it.name || 'Item';
        const qty = it.quantity || 1;
        const price = (it.unitPrice || 0) * qty;
        const cur = itemMap.get(name) || { name, qty: 0, revenue: 0 };
        cur.qty += qty;
        cur.revenue += price;
        itemMap.set(name, cur);
      });
    });
    const topItems = Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 10);

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalCgst,
      totalSgst,
      revenueChangePercent: 0,
      dailySales: [{ date: 'Today', revenue: totalRevenue, count: totalOrders }],
      channelSales,
      topItems,
      aggregatorCut: 0,
      aggregatorRevenue: 0,
    };
  }, [error, sales, timeRange]);

  const data = reportData || localFallback;

  const maxDailySale = data ? Math.max(...data.dailySales.map((d) => d.revenue), 1) : 1;

  const handleExportCsv = () => {
    if (!data) return;
    const rows = [
      ['Metric', 'Value'],
      ['Gross Sales Revenue', `₹${data.totalRevenue.toLocaleString('en-IN')}`],
      ['Total Orders', data.totalOrders.toString()],
      ['Average Order Value', `₹${data.averageOrderValue.toFixed(2)}`],
      ['CGST', `₹${data.totalCgst.toFixed(2)}`],
      ['SGST', `₹${data.totalSgst.toFixed(2)}`],
      ['Aggregator Cut', `₹${data.aggregatorCut.toFixed(2)}`],
      [''],
      ['Date/Time', 'Revenue', 'Orders'],
      ...data.dailySales.map((d) => [d.date, d.revenue.toString(), d.count.toString()]),
      [''],
      ['Channel', 'Revenue', 'Orders', 'Percentage'],
      ...data.channelSales.map((c) => [c.channel, c.revenue.toString(), c.count.toString(), `${c.percentage}%`]),
      [''],
      ['Item', 'Qty Sold', 'Revenue'],
      ...data.topItems.map((i) => [i.name, i.qty.toString(), i.revenue.toString()]),
    ];
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const storeName = tenant?.name || 'RestoSync';
    link.download = `${storeName}_Sales_Report_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const trendLabel = timeRange === 'today' ? 'Hourly Performance' : timeRange === '7days' ? '7 Days Performance' : '30 Days Performance';

  return (
    <div className="flex-1 bg-[#f8fafc] overflow-y-auto p-4 sm:p-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 mb-6 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-red-100 text-red-600">
              <BarChart2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Reports & Sales Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Revenue Performance, GST Tax Liability & Channel Breakdown
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex rounded-lg bg-slate-200 p-1 text-xs font-bold">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1 rounded-md transition-all ${
                timeRange === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeRange('7days')}
              className={`px-3 py-1 rounded-md transition-all ${
                timeRange === '7days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeRange('30days')}
              className={`px-3 py-1 rounded-md transition-all ${
                timeRange === '30days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              30 Days
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={!data}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-3.5 py-2 rounded-lg text-xs flex items-center space-x-1.5 touch-btn shadow-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => navigate('/billing')}
            className="flex items-center space-x-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 touch-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>POS</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-red-600" />
          <span className="ml-2 text-sm text-slate-600 font-semibold">Loading report data...</span>
        </div>
      )}

      {/* No Data State */}
      {!loading && !data && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart2 className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-600">No Sales Data Available</h3>
          <p className="text-xs text-slate-400 mt-1">Start billing to see your reports here.</p>
        </div>
      )}

      {/* Data Loaded */}
      {!loading && data && (
        <>
          {/* Overview Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Gross Sales Revenue</span>
              <p className="text-2xl font-black text-slate-900 mt-1">₹{data.totalRevenue.toLocaleString('en-IN')}</p>
              {data.revenueChangePercent !== 0 && (
                <p className={`text-[11px] font-bold mt-0.5 ${data.revenueChangePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {data.revenueChangePercent >= 0 ? '+' : ''}{data.revenueChangePercent}% vs previous period
                </p>
              )}
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Total Orders Fulfilled</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{data.totalOrders}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Avg: ₹{data.averageOrderValue.toFixed(2)} / order</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">CGST + SGST Collected</span>
              <p className="text-2xl font-black text-slate-900 mt-1">₹{(data.totalCgst + data.totalSgst).toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">CGST: ₹{data.totalCgst.toFixed(2)} | SGST: ₹{data.totalSgst.toFixed(2)}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Online Aggregator Cut</span>
              <p className="text-2xl font-black text-amber-600 mt-1">₹{data.aggregatorCut.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {data.aggregatorRevenue > 0 ? 'Zomato/Swiggy commission ~18%' : 'No aggregator orders'}
              </p>
            </div>
          </div>

          {/* Charts & Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Daily Revenue Bar Chart */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-red-600" />
                  <span>{timeRange === 'today' ? 'Hourly' : 'Daily'} Revenue Trend (₹)</span>
                </h3>
                <span className="text-xs text-slate-500">{trendLabel}</span>
              </div>

              {data.dailySales.length > 0 ? (
                <div className="h-48 flex items-end justify-between gap-2 pt-4 border-b border-slate-100 overflow-x-auto">
                  {data.dailySales.map((day) => {
                    const heightPercent = Math.round((day.revenue / maxDailySale) * 100);
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group min-w-[28px]">
                        <span className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          ₹{day.revenue.toLocaleString('en-IN')}
                        </span>
                        <div
                          style={{ height: `${Math.max(heightPercent, 2)}%` }}
                          className="w-full max-w-[40px] bg-gradient-to-t from-red-600 to-rose-400 rounded-t-md transition-all group-hover:from-red-700 group-hover:to-rose-500"
                        />
                        <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">{day.date}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                  No sales data for this period
                </div>
              )}
            </div>

            {/* Channel Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                <PieChart className="w-4 h-4 text-red-600" />
                <span>Sales by Channel</span>
              </h3>

              {data.channelSales.length > 0 ? (
                <div className="space-y-3 pt-2">
                  {data.channelSales.map((ch) => (
                    <div key={ch.channel} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">{ch.channel}</span>
                        <span className="text-slate-900 font-bold">₹{ch.revenue.toLocaleString('en-IN')} ({ch.percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${ch.percentage}%`, backgroundColor: CHANNEL_COLORS[ch.channel] || '#94a3b8' }}
                          className="h-full rounded-full transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No channel data available
                </div>
              )}
            </div>
          </div>

          {/* Top Selling Items */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-800">
              Top Selling Dishes & Beverages
            </div>
            {data.topItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Dish / Beverage Name</th>
                      <th className="px-4 py-3 text-center">Units Sold</th>
                      <th className="px-4 py-3 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {data.topItems.map((item, idx) => (
                      <tr key={item.name} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-bold text-slate-900 flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-[10px] font-black">
                            {idx + 1}
                          </span>
                          <span>{item.name}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{item.qty} pcs</td>
                        <td className="px-4 py-3 font-black text-slate-900 text-right">₹{item.revenue.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No item sales data for this period. Start billing to see top-selling items.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
