import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCw,
  ArrowLeft,
  MessageSquare,
  Truck,
  UserCheck,
  Eye,
  FileText,
  PlusCircle,
  X,
  Loader2,
  Search,
  Receipt,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLangStore } from '../store/langStore';
import { usePosSyncStore } from '../store/posSyncStore';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../services/api';

interface OnlineOrder {
  id: string;
  orderId: string;
  externalOrderId?: string;
  aggregator: 'Zomato' | 'Swiggy' | 'Direct';
  customerName: string;
  customerPhone?: string;
  placedTime: string;
  billNo: string;
  otp: string;
  instructions?: string;
  total: number;
  paymentMode: string;
  status: string;
  items: { name: string; quantity: number; unitPrice: number; totalPrice: number }[];
  riderName?: string;
  riderPhone?: string;
  tableNumber?: string;
  orderType?: string;
  cashierName?: string;
}

export const OnlineOrders: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLangStore();
  const strings = t();
  const { tenant } = useAuthStore();
  const sales = usePosSyncStore((state) => state.sales);

  const [selectedAggregator, setSelectedAggregator] = useState<'All' | 'Zomato' | 'Swiggy'>('All');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'amount'>('latest');
  const [searchOrderNo, setSearchOrderNo] = useState('');
  const [activeTab, setActiveTab] = useState<'History' | 'Online'>('History');

  // API loaded orders
  const [apiOrders, setApiOrders] = useState<OnlineOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Modals
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OnlineOrder | null>(null);
  const [selectedOrderForRider, setSelectedOrderForRider] = useState<OnlineOrder | null>(null);
  const [riderInputName, setRiderInputName] = useState('');
  const [riderInputPhone, setRiderInputPhone] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const storeName = tenant?.name || 'RestoSync POS';

  // Fetch orders from backend
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: any[] }>('/orders?limit=100');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const mapped: OnlineOrder[] = res.data.data.map((o: any) => {
          const placedDate = o.placedAt ? new Date(o.placedAt) : new Date(o.createdAt || Date.now());
          const isToday = placedDate.toDateString() === new Date().toDateString();
          const timeStr = placedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          const dateStr = placedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

          let aggr: 'Zomato' | 'Swiggy' | 'Direct' = 'Direct';
          if (o.aggregatorSource === 1 || o.aggregatorSource === 'Zomato') aggr = 'Zomato';
          else if (o.aggregatorSource === 2 || o.aggregatorSource === 'Swiggy') aggr = 'Swiggy';

          let statusStr = 'Pending';
          if (o.status === 5 || o.status === 'Delivered') statusStr = 'Delivered';
          else if (o.status === 4 || o.status === 'Dispatched') statusStr = 'Dispatched';
          else if (o.status === 3 || o.status === 'FoodReady') statusStr = 'FoodReady';
          else if (o.status === 2 || o.status === 'KotCreated') statusStr = 'KotCreated';
          else if (o.status === 6 || o.status === 'Cancelled') statusStr = 'Cancelled';

          let orderTypeStr = 'Dine In';
          if (o.orderType === 2 || o.orderType === 'Delivery') orderTypeStr = 'Delivery';
          else if (o.orderType === 3 || o.orderType === 'PickUp') orderTypeStr = 'Pick Up';
          else if (o.orderType === 4 || o.orderType === 'TakeAway') orderTypeStr = 'Take Away';
          else if (o.orderType === 5 || o.orderType === 'Parcel') orderTypeStr = 'Parcel';

          let payMode = 'Cash';
          if (o.payments?.length > 0) {
            const pm = o.payments[0]?.mode;
            if (pm === 2 || pm === 'Card') payMode = 'Card';
            else if (pm === 3 || pm === 'UPI') payMode = 'UPI';
            else if (pm === 4 || pm === 'Online') payMode = 'Online';
          }

          return {
            id: o.id,
            orderId: o.externalOrderId || o.id,
            externalOrderId: o.externalOrderId,
            aggregator: aggr,
            customerName: o.customerName || '',
            customerPhone: o.customerPhone || '',
            placedTime: isToday ? `Today, ${timeStr}` : `${dateStr}, ${timeStr}`,
            billNo: o.billNumber || '',
            otp: o.otp || '',
            instructions: o.deliveryInstructions || o.orderNotes || '',
            total: o.totalAmount || 0,
            paymentMode: payMode,
            status: statusStr,
            items: (o.items || []).map((it: any) => ({
              name: it.name,
              quantity: it.quantity || 1,
              unitPrice: it.unitPrice || 0,
              totalPrice: it.totalPrice || 0,
            })),
            riderName: o.riderDetails?.riderName || '',
            riderPhone: o.riderDetails?.riderPhone || '',
            tableNumber: o.tableNumber || '',
            orderType: orderTypeStr,
            cashierName: o.billerName || '',
          };
        });
        setApiOrders(mapped);
      }
    } catch (err: any) {
      console.warn('Failed to fetch orders:', err?.message);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    usePosSyncStore.getState().fetchInitialData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Merge API orders with local posSyncStore sales for the "History" tab
  const allHistoryOrders = useMemo((): OnlineOrder[] => {
    const mergedMap = new Map<string, OnlineOrder>();

    // Add API orders first
    apiOrders.forEach((o) => mergedMap.set(o.billNo || o.id, o));

    // Overlay local sales that aren't already present
    sales.forEach((s) => {
      const key = s.billNo || s.id;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, {
          id: s.id,
          orderId: s.id,
          aggregator: 'Direct',
          customerName: '',
          customerPhone: s.customerPhone || '',
          placedTime: s.timestamp || 'Unknown',
          billNo: s.billNo,
          otp: '',
          instructions: '',
          total: s.totalAmount,
          paymentMode: s.paymentMode || 'Cash',
          status: 'Delivered',
          items: (s.items || []).map((it: any) => ({
            name: it.name,
            quantity: it.quantity || 1,
            unitPrice: it.unitPrice || 0,
            totalPrice: it.totalPrice || (it.unitPrice * (it.quantity || 1)) || 0,
          })),
          tableNumber: s.tableOrToken || '',
          orderType: s.orderType || 'Dine In',
          cashierName: s.cashierName || '',
        });
      }
    });

    return Array.from(mergedMap.values());
  }, [apiOrders, sales]);

  // Online aggregator orders only
  const onlineOrders = useMemo(() => {
    return apiOrders.filter((o) => o.aggregator === 'Zomato' || o.aggregator === 'Swiggy');
  }, [apiOrders]);

  // Filtered list based on active tab
  const displayOrders = useMemo(() => {
    const source = activeTab === 'Online' ? onlineOrders : allHistoryOrders;

    return source.filter((order) => {
      if (activeTab === 'Online' && selectedAggregator !== 'All' && order.aggregator !== selectedAggregator) {
        return false;
      }
      if (searchOrderNo.trim()) {
        const q = searchOrderNo.trim().toLowerCase();
        if (
          !order.orderId.toLowerCase().includes(q) &&
          !order.billNo.toLowerCase().includes(q) &&
          !(order.tableNumber || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'amount') return b.total - a.total;
      // Default: latest first (reverse alphabetical on placedTime works for "Today, HH:MM" and "dd MMM, HH:MM")
      return 0;
    });
  }, [activeTab, onlineOrders, allHistoryOrders, selectedAggregator, searchOrderNo, sortBy]);

  // Simulate online order via backend API
  const handleSimulateNewOrder = async () => {
    try {
      const isSwiggy = Math.random() > 0.5;
      const res = await apiClient.post<{ success: boolean; data: any }>(
        `/orders/simulate-online?aggregator=${isSwiggy ? 'Swiggy' : 'Zomato'}`
      );
      if (res.data?.success) {
        showToast(`🔔 New ${isSwiggy ? 'Swiggy' : 'Zomato'} order received!`);
        fetchOrders(); // Refresh
      }
    } catch (err: any) {
      showToast('⚠️ Failed to simulate order. Backend may be offline.');
    }
  };

  // Update order status via backend
  const handleUpdateStatus = async (orderId: string, newStatus: number, label: string) => {
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: newStatus });
      showToast(`✅ Order marked as ${label}`);
      fetchOrders();
    } catch (err: any) {
      showToast(`⚠️ Failed to update status: ${err?.message}`);
    }
  };

  // Mark Food Ready for all pending online orders
  const handleMarkFoodReadyAll = async () => {
    const pendingOnline = onlineOrders.filter((o) => o.status === 'Pending' || o.status === 'KotCreated');
    for (const o of pendingOnline) {
      await handleUpdateStatus(o.id, 3, 'Food Ready');
    }
    if (pendingOnline.length === 0) {
      showToast('No pending orders to mark as Food Ready.');
    }
  };

  const handleUpdateRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForRider || !riderInputName.trim()) return;

    try {
      await apiClient.patch(`/orders/${selectedOrderForRider.id}/status`, {
        status: 4, // Dispatched
        riderDetails: {
          riderName: riderInputName.trim(),
          riderPhone: riderInputPhone.trim(),
        },
      });
      showToast(`✅ Assigned Rider ${riderInputName} & dispatched order.`);
      setSelectedOrderForRider(null);
      setRiderInputName('');
      setRiderInputPhone('');
      fetchOrders();
    } catch (err: any) {
      showToast(`⚠️ Failed to update rider: ${err?.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      Pending: { bg: 'bg-sky-100', text: 'text-sky-700', label: '⏳ Pending' },
      KotCreated: { bg: 'bg-blue-100', text: 'text-blue-700', label: '📋 KOT Created' },
      FoodReady: { bg: 'bg-teal-100', text: 'text-teal-700', label: '✅ Food Ready' },
      Dispatched: { bg: 'bg-amber-100', text: 'text-amber-700', label: '🚴 Dispatched' },
      Delivered: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '✅ Delivered' },
      Cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Cancelled' },
    };
    const s = map[status] || { bg: 'bg-slate-100', text: 'text-slate-600', label: status };
    return <span className={`${s.bg} ${s.text} px-2 py-0.5 rounded font-bold text-[11px]`}>{s.label}</span>;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc] overflow-y-auto select-none p-3 sm:p-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-14 right-6 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-2xl z-50 text-xs font-semibold flex items-center space-x-2 border border-slate-700 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Controls */}
      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 mb-3 shadow-xs">
        {/* Tabs */}
        <div className="flex items-center space-x-6 text-sm font-bold">
          <button
            onClick={() => setActiveTab('History')}
            className={`pb-1 transition-all ${
              activeTab === 'History'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Orders & History
          </button>
          <button
            onClick={() => setActiveTab('Online')}
            className={`pb-1 transition-all ${
              activeTab === 'Online'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Online Orders ({onlineOrders.length})
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {activeTab === 'Online' && (
            <button
              onClick={handleSimulateNewOrder}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md font-bold text-xs flex items-center space-x-1.5 touch-btn shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{strings.simulateOrder}</span>
            </button>
          )}

          <button
            onClick={() => {
              fetchOrders();
              showToast('Refreshed orders from database.');
            }}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 touch-btn"
          >
            <RotateCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/billing')}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 touch-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Aggregator Channel Buttons (Online Tab Only) */}
      {activeTab === 'Online' && (
        <div className="flex items-center space-x-3 mb-3">
          <button
            onClick={() => setSelectedAggregator('All')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
              selectedAggregator === 'All'
                ? 'bg-slate-100 border-slate-400 text-slate-900 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>All ({onlineOrders.length})</span>
          </button>
          <button
            onClick={() => setSelectedAggregator('Zomato')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
              selectedAggregator === 'Zomato'
                ? 'bg-red-50 border-red-300 text-red-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="w-4 h-4 rounded bg-red-600 text-white flex items-center justify-center font-black text-[9px]">Z</div>
            <span>Zomato ({onlineOrders.filter((o) => o.aggregator === 'Zomato').length})</span>
          </button>
          <button
            onClick={() => setSelectedAggregator('Swiggy')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
              selectedAggregator === 'Swiggy'
                ? 'bg-orange-50 border-orange-300 text-orange-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="w-4 h-4 rounded bg-[#fc8019] text-white flex items-center justify-center font-black text-[9px]">S</div>
            <span>Swiggy ({onlineOrders.filter((o) => o.aggregator === 'Swiggy').length})</span>
          </button>
        </div>
      )}

      {/* Pipeline Legend & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 mb-3 shadow-xs text-xs">
        {activeTab === 'Online' ? (
          <div className="flex flex-wrap items-center gap-3 font-semibold text-slate-600">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]"></span>
              <span>Pending</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]"></span>
              <span>Cancelled</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#14b8a6]"></span>
              <span>Food Is Ready</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
              <span>Dispatched</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]"></span>
              <span>Delivered</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-600 font-semibold">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Showing {displayOrders.length} order{displayOrders.length !== 1 ? 's' : ''} from your store</span>
          </div>
        )}

        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-slate-500 font-medium">Sort By</span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-slate-50 focus:outline-none"
          >
            <option value="latest">Latest Date</option>
            <option value="oldest">Oldest Date</option>
            <option value="amount">Amount</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search bill / order no..."
              value={searchOrderNo}
              onChange={(e) => setSearchOrderNo(e.target.value)}
              className="border border-slate-300 rounded pl-7 pr-2.5 py-1 text-xs w-44 focus:outline-none focus:border-red-500 bg-slate-50"
            />
          </div>

          {activeTab === 'Online' && (
            <button
              onClick={handleMarkFoodReadyAll}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded text-xs touch-btn shadow-xs"
            >
              Food Ready
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loadingOrders && displayOrders.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-red-600" />
          <span className="ml-2 text-sm text-slate-600 font-semibold">Loading orders...</span>
        </div>
      )}

      {/* Empty State */}
      {!loadingOrders && displayOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-slate-200">
          {activeTab === 'Online' ? (
            <>
              <Receipt className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-600">No Online Orders Yet</h3>
              <p className="text-xs text-slate-400 mt-1">Online aggregator orders from Zomato & Swiggy will appear here.</p>
              <button
                onClick={handleSimulateNewOrder}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs"
              >
                Simulate Online Order
              </button>
            </>
          ) : (
            <>
              <FileText className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-600">No Orders Found</h3>
              <p className="text-xs text-slate-400 mt-1">Start billing to see your order history here.</p>
              <button
                onClick={() => navigate('/billing')}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs"
              >
                Go to POS Billing
              </button>
            </>
          )}
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-3">
        {displayOrders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4"
          >
            {/* Left Order Metadata */}
            <div className="flex items-start space-x-3">
              {activeTab === 'Online' && order.aggregator !== 'Direct' ? (
                <div
                  className={`w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                    order.aggregator === 'Zomato' ? 'bg-red-600' : 'bg-orange-500'
                  }`}
                >
                  {order.aggregator.toLowerCase()}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900">
                    {activeTab === 'Online' && order.externalOrderId ? order.externalOrderId : order.billNo || order.orderId}
                  </span>
                  {activeTab === 'Online' && (
                    <span className="text-xs text-slate-500">
                      {order.aggregator} | {storeName}
                    </span>
                  )}
                  {activeTab === 'History' && order.orderType && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      order.orderType === 'Dine In' ? 'bg-blue-50 text-blue-700' :
                      order.orderType === 'Delivery' ? 'bg-orange-50 text-orange-700' :
                      'bg-emerald-50 text-emerald-700'
                    }`}>
                      {order.orderType}
                    </span>
                  )}
                  {getStatusBadge(order.status)}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{order.placedTime}</span>
                  </span>
                  {order.tableNumber && (
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono font-bold">
                      {order.tableNumber}
                    </span>
                  )}
                  {order.customerName && (
                    <span className="font-bold text-slate-800">Customer: {order.customerName}</span>
                  )}
                  {order.billNo && (
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono font-bold">
                      Bill: {order.billNo}
                    </span>
                  )}
                  {order.otp && (
                    <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold">
                      OTP: {order.otp}
                    </span>
                  )}
                  {order.cashierName && (
                    <span className="text-slate-500">Cashier: {order.cashierName}</span>
                  )}
                  {order.paymentMode && (
                    <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                      order.paymentMode === 'Cash' ? 'bg-emerald-50 text-emerald-700' :
                      order.paymentMode === 'UPI' ? 'bg-violet-50 text-violet-700' :
                      order.paymentMode === 'Card' ? 'bg-blue-50 text-blue-700' :
                      'bg-orange-50 text-orange-700'
                    }`}>
                      {order.paymentMode}
                    </span>
                  )}
                  {order.items.length > 0 && (
                    <span className="text-slate-500">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                  )}
                  {order.instructions && (
                    <span className="text-red-600 flex items-center space-x-1 font-semibold">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{order.instructions}</span>
                    </span>
                  )}
                  {order.riderName && (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                      Rider: {order.riderName} ({order.riderPhone})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Total */}
            <div className="flex xl:flex-col items-center xl:items-end justify-between xl:justify-center border-t xl:border-t-0 pt-2 xl:pt-0 border-slate-100">
              <span className="text-[11px] text-slate-400 uppercase">Total (₹)</span>
              <span className="text-lg font-black text-slate-900">₹{order.total.toFixed(2)}</span>
            </div>

            {/* Right Action Buttons */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <button
                onClick={() => setSelectedOrderDetails(order)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-bold text-xs flex items-center justify-center space-x-1.5 touch-btn shadow-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Details</span>
              </button>

              {activeTab === 'Online' && order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                <>
                  {(order.status === 'Pending' || order.status === 'KotCreated') && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 3, 'Food Ready')}
                      className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md font-bold text-xs flex items-center justify-center space-x-1.5 touch-btn shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Food Ready</span>
                    </button>
                  )}

                  {order.status === 'FoodReady' && (
                    <button
                      onClick={() => {
                        setSelectedOrderForRider(order);
                        setRiderInputName(order.riderName || '');
                        setRiderInputPhone(order.riderPhone || '');
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md font-bold text-xs flex items-center justify-center space-x-1.5 touch-btn shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign Rider</span>
                    </button>
                  )}

                  {order.status === 'Dispatched' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 5, 'Delivered')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-bold text-xs flex items-center justify-center space-x-1.5 touch-btn shadow-xs"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Mark Delivered</span>
                    </button>
                  )}
                </>
              )}

              {activeTab === 'Online' && (
                <button
                  onClick={() => alert(`Connecting to ${order.aggregator} Rider Chat Support...`)}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-md font-bold text-xs flex items-center justify-center space-x-1.5 touch-btn shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat Support</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View Details Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedOrderDetails.aggregator !== 'Direct'
                    ? `${selectedOrderDetails.aggregator} Order #${selectedOrderDetails.externalOrderId || selectedOrderDetails.orderId}`
                    : `Order ${selectedOrderDetails.billNo || selectedOrderDetails.orderId}`}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedOrderDetails.billNo && `Bill: ${selectedOrderDetails.billNo}`}
                  {selectedOrderDetails.otp && ` • OTP: ${selectedOrderDetails.otp}`}
                  {selectedOrderDetails.orderType && ` • ${selectedOrderDetails.orderType}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {(selectedOrderDetails.customerName || selectedOrderDetails.customerPhone) && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="font-bold text-slate-800">Customer Details:</p>
                  <p className="text-slate-600">
                    {selectedOrderDetails.customerName || 'Walk-in'} ({selectedOrderDetails.customerPhone || 'N/A'})
                  </p>
                  {selectedOrderDetails.instructions && (
                    <p className="text-red-600 font-semibold mt-1">Note: {selectedOrderDetails.instructions}</p>
                  )}
                </div>
              )}

              <div className="border rounded-lg p-3 space-y-1">
                <p className="font-bold text-slate-800 mb-1">Ordered Items:</p>
                {selectedOrderDetails.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between py-0.5 border-b border-dashed border-slate-100">
                    <span>{it.name} × {it.quantity}</span>
                    <span className="font-bold">₹{it.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-black text-sm pt-2 text-slate-900">
                  <span>Grand Total:</span>
                  <span>₹{selectedOrderDetails.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{selectedOrderDetails.placedTime}</span>
                <span>{getStatusBadge(selectedOrderDetails.status)}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedOrderDetails(null)}
              className="w-full bg-slate-900 text-white font-bold py-2 rounded-lg text-xs touch-btn"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Update Rider Modal */}
      {selectedOrderForRider && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Update Rider & Dispatch</h3>
            <form onSubmit={handleUpdateRider} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Delivery Rider Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patil"
                  value={riderInputName}
                  onChange={(e) => setRiderInputName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rider Mobile Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9822114455"
                  value={riderInputPhone}
                  onChange={(e) => setRiderInputPhone(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg touch-btn shadow-xs"
                >
                  Save & Dispatch
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForRider(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-lg touch-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
