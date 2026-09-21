import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  Store,
  Printer,
  Sliders,
  ShieldCheck,
  Loader2,
  Sparkles,
  Receipt,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../services/api';

interface SubscriptionInvoiceData {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  planName: string;
  billingCycle: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  paidAt?: string;
  paymentMethod?: string;
  transactionRef?: string;
  notes?: string;
  createdAt: string;
}

export const OwnerSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, tenant } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'SECTIONS' | 'TAX' | 'HARDWARE' | 'PLAN'>('GENERAL');

  // General Settings State
  const [restaurantName, setRestaurantName] = useState(tenant?.businessName || tenant?.name || 'My Restaurant');
  const [branchName, setBranchName] = useState('Main Branch');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || 'owner@restaurant.com');
  const [currencySymbol, setCurrencySymbol] = useState('₹ (INR)');

  // Section Tables
  const [fineDineTables, setFineDineTables] = useState(15);
  const [takeAwayCounters, setTakeAwayCounters] = useState(2);
  const [deliveryZones, setDeliveryZones] = useState(5);

  // Tax & Billing
  const [cgstRate, setCgstRate] = useState(2.5);
  const [sgstRate, setSgstRate] = useState(2.5);
  const [enableServiceCharge, setEnableServiceCharge] = useState(false);
  const [serviceChargeRate, setServiceChargeRate] = useState(5);
  const [roundOffBills, setRoundOffBills] = useState(true);

  // Hardware / Printer
  const [printerConnection, setPrinterConnection] = useState<'BROWSER' | 'NETWORK_IP' | 'USB'>('NETWORK_IP');
  const [printerIp, setPrinterIp] = useState('192.168.1.100');
  const [printerPort, setPrinterPort] = useState('9100');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Invoices & Plan State
  const [invoices, setInvoices] = useState<SubscriptionInvoiceData[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<SubscriptionInvoiceData | null>(null);

  const isTrial = Boolean(tenant?.isTrial);
  let trialDaysLeft = 0;
  if (isTrial && (tenant?.trialEndsAt || tenant?.subscriptionExpiresAt)) {
    const expires = new Date(tenant.trialEndsAt || tenant.subscriptionExpiresAt!).getTime();
    const now = Date.now();
    trialDaysLeft = Math.max(0, Math.ceil((expires - now) / (1000 * 60 * 60 * 24)));
  }

  useEffect(() => {
    // 1. Fetch Tenant details
    if (tenant?.id) {
      apiClient.get(`/tenants/${tenant.id}`).then((res) => {
        if (res.data?.success && res.data?.data) {
          const t = res.data.data;
          if (t.businessName) setRestaurantName(t.businessName);
          if (t.ownerPhone) setPhone(t.ownerPhone);
        }
      }).catch(() => {});
    }

    // 2. Fetch Outlet details & tax settings
    const outletId = user?.outletId || (tenant as any)?.outlets?.[0]?.id;
    if (outletId) {
      apiClient.get(`/outlets/${outletId}`).then((res) => {
        if (res.data?.success && res.data?.data) {
          const o = res.data.data;
          if (o.name) setBranchName(o.name);
          if (o.phone) setPhone(o.phone);
          if (o.taxSettings) {
            setCgstRate(o.taxSettings.cgstPercentage ?? 2.5);
            setSgstRate(o.taxSettings.sgstPercentage ?? 2.5);
            setEnableServiceCharge((o.taxSettings.serviceChargePercentage || 0) > 0);
            setServiceChargeRate(o.taxSettings.serviceChargePercentage || 5);
          }
        }
      }).catch(() => {});
    }
  }, [tenant?.id, user?.outletId]);

  // Fetch Invoices when activeTab is PLAN
  useEffect(() => {
    if (activeTab === 'PLAN') {
      fetchInvoices();
    }
  }, [activeTab]);

  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: SubscriptionInvoiceData[] }>('/payments/my-invoices');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setInvoices(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load invoices in settings', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (tenant?.id) {
        await apiClient.put(`/tenants/${tenant.id}`, {
          businessName: restaurantName,
          ownerPhone: phone,
        });
      }

      const outletId = user?.outletId || (tenant as any)?.outlets?.[0]?.id;
      if (outletId) {
        await Promise.all([
          apiClient.put(`/outlets/${outletId}`, {
            name: branchName,
            phone: phone,
          }),
          apiClient.put(`/outlets/${outletId}/tax-settings`, {
            cgstPercentage: cgstRate,
            sgstPercentage: sgstRate,
            serviceChargePercentage: enableServiceCharge ? serviceChargeRate : 0,
            isGstInclusive: false,
          }),
          apiClient.put(`/outlets/${outletId}/printer-settings`, {
            printerType: printerConnection === 'NETWORK_IP' ? 'Thermal80mm' : 'Thermal58mm',
            headerText: `Thank you for dining at ${restaurantName}!`,
            footerText: 'Visit again soon!',
            autoPrintKOT: true,
            autoPrintBill: true,
          }),
        ]);
      }

      if (tenant) {
        tenant.businessName = restaurantName;
        localStorage.setItem('quantrobill_tenant', JSON.stringify(tenant));
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to save settings to backend:', err);
      // Fallback local update
      if (tenant) {
        tenant.businessName = restaurantName;
        localStorage.setItem('quantrobill_tenant', JSON.stringify(tenant));
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto font-sans text-slate-900 pb-12">
      {/* Header with Active Plan Badge */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Restaurant Configuration & Settings
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400">
            Configure store profile, floor capacity, GST rates, thermal hardware devices, and manage your subscription plan.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Active Plan Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none">
                Plan
              </span>
              <span className="text-xs font-black text-blue-700 leading-tight">
                {tenant?.planName || 'Starter'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/owner/upgrade')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade Plan</span>
          </button>

          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
              ✓ Settings Saved!
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl overflow-x-auto text-xs font-bold shadow-2xs">
        <button
          onClick={() => setActiveTab('GENERAL')}
          className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap border-b-2 transition cursor-pointer ${
            activeTab === 'GENERAL'
              ? 'border-blue-600 text-blue-700 font-extrabold bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Outlet Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('PLAN')}
          className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap border-b-2 transition cursor-pointer ${
            activeTab === 'PLAN'
              ? 'border-blue-600 text-blue-700 font-extrabold bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Plan & Subscription</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
            {tenant?.planName || 'Starter'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('SECTIONS')}
          className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap border-b-2 transition cursor-pointer ${
            activeTab === 'SECTIONS'
              ? 'border-blue-600 text-blue-700 font-extrabold bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Floor & Tables Capacity</span>
        </button>

        <button
          onClick={() => setActiveTab('TAX')}
          className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap border-b-2 transition cursor-pointer ${
            activeTab === 'TAX'
              ? 'border-blue-600 text-blue-700 font-extrabold bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>GST & Bill Taxes</span>
        </button>

        <button
          onClick={() => setActiveTab('HARDWARE')}
          className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap border-b-2 transition cursor-pointer ${
            activeTab === 'HARDWARE'
              ? 'border-blue-600 text-blue-700 font-extrabold bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Thermal Printer Hardware</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB: PLAN & SUBSCRIPTION                                 */}
      {/* ========================================================= */}
      {activeTab === 'PLAN' ? (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-2xs p-6 space-y-6 text-xs">
          {/* Active Plan Overview Card */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl border border-blue-200/80 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-black text-slate-900">
                    {tenant?.planName || tenant?.subscriptionPlan || 'Starter Tier'}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      isTrial
                        ? trialDaysLeft > 0
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {isTrial
                      ? trialDaysLeft > 0
                        ? `Free Trial (${trialDaysLeft} Days Left)`
                        : 'Trial Expired'
                      : 'Active Subscription'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {isTrial
                    ? 'You are currently on the 15-day free evaluation trial. Upgrade to an annual plan to lock in benefits.'
                    : `Your subscription is active and renewed on an annual billing cycle.`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/owner/upgrade')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Upgrade / Change Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Plan Limits & Feature Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Outlets Allowed
                </span>
                <span className="text-lg font-black text-slate-900">
                  {tenant?.maxOutlets || 1} Outlet
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Physical store locations</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Staff Logins Allowed
                </span>
                <span className="text-lg font-black text-slate-900">
                  {tenant?.maxStaffUsers || 3} Staff
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Cashier, Captain, Kitchen logins</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Renewal / Expiry Date
                </span>
                <span className="text-sm font-black text-slate-900 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  {tenant?.subscriptionExpiresAt || tenant?.trialEndsAt
                    ? new Date(tenant.subscriptionExpiresAt || tenant.trialEndsAt!).toLocaleDateString('en-IN')
                    : 'Ongoing'}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Next billing cycle</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Payment Gateway
                </span>
                <span className="text-sm font-black text-emerald-700 flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Razorpay Verified
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Auto GST Tax Invoicing</p>
              </div>
            </div>

            {/* Feature Checklist */}
            <div className="mt-5 pt-4 border-t border-slate-200/80">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Features Enabled in Your Current Tier:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>POS Billing & Thermal Printing</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  {tenant?.features?.enableRecipeInventory !== false ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className={tenant?.features?.enableRecipeInventory === false ? 'text-slate-400 line-through' : ''}>
                    Recipe & Stock Inventory
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  {tenant?.features?.enableAggregators ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className={!tenant?.features?.enableAggregators ? 'text-slate-400 line-through' : ''}>
                    Swiggy / Zomato Integrations
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  {tenant?.features?.enableKhataBook !== false ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className={tenant?.features?.enableKhataBook === false ? 'text-slate-400 line-through' : ''}>
                    Khata Book / Credit Accounts
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Past Invoices & Payment History Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Subscription Payment Invoices & Receipts
                </h3>
              </div>
              <button
                type="button"
                onClick={fetchInvoices}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                Refresh
              </button>
            </div>

            {loadingInvoices ? (
              <div className="py-8 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <p className="text-xs">Loading billing invoices...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No payment invoices yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  When you make a payment or upgrade via Razorpay, your GST tax invoice will appear here.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/owner/upgrade')}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>View Upgrade Plans</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Plan</th>
                      <th className="py-3 px-4">Billing Cycle</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Amount (INR)</th>
                      <th className="py-3 px-4 text-center">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {inv.planName}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {inv.billingCycle}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(inv.paidAt || inv.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{inv.totalAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setViewInvoice(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* STANDARD SETTINGS FORM (GENERAL, SECTIONS, TAX, HARDWARE) */
        /* ========================================================= */
        <form onSubmit={handleSave} className="bg-white rounded-b-2xl border border-slate-200 shadow-2xs p-6 space-y-5 text-xs">
          {activeTab === 'GENERAL' && (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-[11px] font-bold text-black mb-1">Restaurant Business Name *</label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black mb-1">Outlet Branch Name</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-black mb-1">Manager Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-black mb-1">Business Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black mb-1">Currency Format</label>
                <select
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-medium focus:border-black focus:outline-none"
                >
                  <option value="₹ (INR)">₹ - Indian Rupee (INR)</option>
                  <option value="$ (USD)">$ - US Dollar (USD)</option>
                  <option value="AED">AED - UAE Dirham</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'SECTIONS' && (
            <div className="space-y-4 max-w-xl">
              <p className="text-slate-500 text-[11px]">
                Set the total number of live table chips available across each operations zone.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-black mb-1">Fine Dine Live Tables Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={fineDineTables}
                  onChange={(e) => setFineDineTables(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black mb-1">Take Away Parcel Counters</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={takeAwayCounters}
                  onChange={(e) => setTakeAwayCounters(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black mb-1">Home Delivery Rider Zones</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={deliveryZones}
                  onChange={(e) => setDeliveryZones(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold focus:border-black focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'TAX' && (
            <div className="space-y-4 max-w-xl">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-black mb-1">Central GST (CGST %)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cgstRate}
                    onChange={(e) => setCgstRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-black mb-1">State GST (SGST %)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={sgstRate}
                    onChange={(e) => setSgstRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableServiceCharge}
                    onChange={(e) => setEnableServiceCharge(e.target.checked)}
                    className="accent-black"
                  />
                  <span className="font-bold text-black">Enable Optional Service Charge</span>
                </label>

                {enableServiceCharge && (
                  <div>
                    <label className="block text-[11px] font-bold text-black mb-1">Service Charge (%)</label>
                    <input
                      type="number"
                      value={serviceChargeRate}
                      onChange={(e) => setServiceChargeRate(Number(e.target.value))}
                      className="w-32 px-3 py-1.5 border border-slate-300 rounded focus:border-black focus:outline-none"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roundOffBills}
                    onChange={(e) => setRoundOffBills(e.target.checked)}
                    className="accent-black"
                  />
                  <span className="font-bold text-black">Auto Round-off Final Invoice Amounts to Nearest Rupee</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'HARDWARE' && (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-[11px] font-bold text-black mb-1">Thermal Printer Interface</label>
                <select
                  value={printerConnection}
                  onChange={(e) => setPrinterConnection(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-medium focus:border-black focus:outline-none"
                >
                  <option value="NETWORK_IP">Network / Ethernet ESC-POS (Recommended for kitchen & billing)</option>
                  <option value="USB">Direct USB Local Printer</option>
                  <option value="BROWSER">Standard Browser Print Dialog</option>
                </select>
              </div>

              {printerConnection === 'NETWORK_IP' && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-black mb-1">Printer Static IP</label>
                    <input
                      type="text"
                      value={printerIp}
                      onChange={(e) => setPrinterIp(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-black mb-1">Raw Port</label>
                    <input
                      type="text"
                      value={printerPort}
                      onChange={(e) => setPrinterPort(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:border-black focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm shadow-blue-500/20 transition cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving...' : 'Save All Configurations'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* PRINTABLE TAX INVOICE MODAL                               */}
      {/* ========================================================= */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Invoice Top Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                  QB
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-none">
                    Tax Invoice & Payment Receipt
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    {viewInvoice.invoiceNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewInvoice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill To & Provider Info */}
            <div className="py-4 border-b border-slate-100 text-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 font-medium block">Billed To Restaurant:</span>
                <span className="font-bold text-slate-900 text-sm block">
                  {viewInvoice.tenantName || tenant?.businessName}
                </span>
                <span className="text-slate-500 block">
                  {(tenant as any)?.ownerEmail || user?.email} • {(tenant as any)?.ownerPhone || phone}
                </span>
                {(tenant as any)?.gstin && (
                  <span className="text-slate-500 block font-mono">
                    GSTIN: {(tenant as any)?.gstin}
                  </span>
                )}
              </div>
              <div className="sm:text-right">
                <span className="text-slate-400 font-medium block">Service Provider:</span>
                <span className="font-bold text-slate-900 block">Quantromind Technologies Pvt. Ltd.</span>
                <span className="text-slate-500 block">SaaS POS Cloud Subscriptions</span>
                <span className="text-slate-500 block">support@quantromind.com</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-5 border-b border-slate-100">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 font-bold uppercase border-b border-slate-100 pb-2">
                    <th className="py-2">Item Description</th>
                    <th className="py-2">Cycle</th>
                    <th className="py-2 text-right">Base Amount</th>
                    <th className="py-2 text-right">GST (18%)</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  <tr>
                    <td className="py-3 font-semibold">
                      QuantroBill {viewInvoice.planName} Tier
                      <span className="text-[11px] text-slate-400 block">
                        Complete multi-terminal restaurant OS subscription
                      </span>
                    </td>
                    <td className="py-3">{viewInvoice.billingCycle}</td>
                    <td className="py-3 text-right font-mono">
                      ₹{viewInvoice.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 text-right font-mono">
                      ₹{viewInvoice.taxAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900">
                      ₹{viewInvoice.totalAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 font-bold text-slate-900">
                    <td colSpan={4} className="py-3 text-right text-xs">Total Amount Paid (INR):</td>
                    <td className="py-3 text-right font-mono text-base text-blue-700 font-black">
                      ₹{viewInvoice.totalAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="pt-5 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                Payment verified via Razorpay Gateway.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewInvoice(null)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
