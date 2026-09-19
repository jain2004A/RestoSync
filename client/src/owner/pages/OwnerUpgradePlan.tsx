import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  Printer,
  ArrowRight,
  ShieldCheck,
  Check,
  Loader2,
  Receipt,
  X,
  ArrowLeft,
} from 'lucide-react';

import { apiClient } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { openRazorpayModal } from '../../utils/razorpay';
import type { Plan } from '../../types';

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

export const OwnerUpgradePlan: React.FC = () => {
  const navigate = useNavigate();
  const { tenant, updateTenant } = useAuthStore();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'Yearly' | 'Monthly'>('Yearly');
  const [upgradingPlanCode, setUpgradingPlanCode] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Post-payment invoice modal state
  const [activeInvoice, setActiveInvoice] = useState<SubscriptionInvoiceData | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoiceData[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Fetch available plans
  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get<{ success: boolean; data: Plan[] }>('/public/plans');
        if (res.data?.success && Array.isArray(res.data.data)) {
          const availablePlans = res.data.data.filter((p) => !p.isTrial && p.isActive);
          setPlans(availablePlans);
        }
      } catch (err) {
        console.error('Failed to load plans', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
    fetchMyInvoices();
  }, []);

  const fetchMyInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: SubscriptionInvoiceData[] }>('/payments/my-invoices');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setInvoices(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load past invoices', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const currentPlanName = tenant?.planName || tenant?.subscriptionPlan || '15-Day Free Trial';

  const handleUpgrade = async (plan: Plan) => {
    setUpgradingPlanCode(plan.code);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Create Razorpay order on backend
      const res = await apiClient.post<{
        success: boolean;
        data: {
          orderId: string;
          amount: number;
          amountInPaise: number;
          currency: string;
          keyId: string;
        };
        user?: {
          name?: string;
          email?: string;
          phone?: string;
        };
      }>('/payments/create-order', {
        purpose: 'SubscriptionUpgrade',
        planCode: plan.code,
        planId: plan.id,
        billingCycle,
      });

      if (!res.data?.success || !res.data.data?.orderId) {
        throw new Error('Failed to create payment order. Please try again.');
      }

      const orderData = res.data.data;
      const prefillUser = res.data.user;

      // 2. Open Razorpay Checkout Modal
      await openRazorpayModal({
        key: orderData.keyId,
        amount: orderData.amountInPaise,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'QuantroBill POS',
        description: `Upgrade to ${plan.name} Tier (${billingCycle})`,
        prefill: {
          name: prefillUser?.name || tenant?.businessName || '',
          email: prefillUser?.email || '',
          contact: prefillUser?.phone || '',
        },
        theme: {
          color: '#2563eb', // Clean Royal Blue
        },
        handler: async (paymentResponse) => {
          try {
            // 3. Verify payment signature on backend
            const verifyRes = await apiClient.post<{
              success: boolean;
              message: string;
              invoice?: SubscriptionInvoiceData;
              invoiceNumber?: string;
              tenant?: any;
            }>('/payments/verify-payment', {
              orderId: paymentResponse.razorpay_order_id,
              paymentId: paymentResponse.razorpay_payment_id,
              signature: paymentResponse.razorpay_signature,
              purpose: 'SubscriptionUpgrade',
              planCode: plan.code,
              planId: plan.id,
              billingCycle,
            });

            if (verifyRes.data?.success) {
              if (verifyRes.data.tenant) {
                updateTenant(verifyRes.data.tenant);
              }
              setSuccessMessage(
                `🎉 Payment successful! You are now upgraded to ${plan.name}. Invoice #${verifyRes.data.invoiceNumber || ''} is ready.`
              );

              if (verifyRes.data.invoice) {
                setActiveInvoice(verifyRes.data.invoice);
              }
              fetchMyInvoices();
            } else {
              setErrorMessage(verifyRes.data?.message || 'Payment verification failed.');
            }
          } catch (verifyErr: any) {
            setErrorMessage(verifyErr.response?.data?.message || 'Payment verification error.');
          } finally {
            setUpgradingPlanCode(null);
          }
        },
        onDismiss: () => {
          setUpgradingPlanCode(null);
        },
      });
    } catch (err: any) {
      console.error('Upgrade error:', err);
      setErrorMessage(
        err.response?.data?.message ||
        err.message ||
        'Could not initiate Razorpay checkout. Please check your connection.'
      );
      setUpgradingPlanCode(null);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 font-sans text-slate-900 pb-12">
      {/* Top Header Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/owner/dashboard')}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Subscription Plans & Billing
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Current: {currentPlanName}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Expand your restaurant branches, unlock recipe inventory, connect aggregators, and power your POS with official Razorpay online payment.
          </p>
        </div>

        {/* Annual / Monthly Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setBillingCycle('Yearly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              billingCycle === 'Yearly'
                ? 'bg-white text-blue-700 shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Annual Billing</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              SAVE 20%
            </span>
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('Monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              billingCycle === 'Monthly'
                ? 'bg-white text-blue-700 shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Billing
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          {activeInvoice && (
            <button
              onClick={() => {}}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition shrink-0 cursor-pointer"
            >
              View Receipt Below
            </button>
          )}
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <X className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-rose-700 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Plans Full-Width Grid (Light Theme) */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-semibold">Loading available subscription plans...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((p) => {
            const isCurrent = tenant?.planCode === p.code || tenant?.subscriptionPlan === p.name;
            const isPopular = p.isPopular;
            const isHardware = p.includesHardware;
            const isUpgrading = upgradingPlanCode === p.code;

            const displayPrice = billingCycle === 'Yearly'
              ? (p.priceYearly > 0 ? p.priceYearly : p.priceMonthly * 10)
              : p.priceMonthly;

            return (
              <div
                key={p.code}
                className={`bg-white rounded-2xl p-6 border transition-all duration-200 flex flex-col justify-between relative shadow-xs hover:shadow-md ${
                  isCurrent
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10'
                    : isPopular
                    ? 'border-indigo-300 ring-1 ring-indigo-300'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-extrabold text-base text-slate-900 tracking-tight">
                      {p.name}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                        ACTIVE PLAN
                      </span>
                    )}
                    {!isCurrent && isHardware && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Printer className="w-3 h-3" /> HARDWARE
                      </span>
                    )}
                    {!isCurrent && !isHardware && isPopular && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                        MOST POPULAR
                      </span>
                    )}
                  </div>

                  {/* Pricing */}
                  <div className="mb-4 pb-4 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">
                        ₹{displayPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        /{billingCycle === 'Yearly' ? 'year' : 'month'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed min-h-[36px]">
                      {p.description}
                    </p>
                  </div>

                  {/* Hardware Bundle notice if applicable */}
                  {isHardware && p.hardwareDetails && (
                    <div className="mb-4 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                      <Printer className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Included Hardware:</span>
                        <span>{p.hardwareDetails}</span>
                      </div>
                    </div>
                  )}

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 text-xs text-slate-600 mb-6">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-slate-800">
                        Up to {p.maxOutlets} Outlet{p.maxOutlets > 1 ? 's' : ''} & {p.maxStaffUsers} Staff
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check
                        className={`w-4 h-4 shrink-0 ${
                          p.features?.enableRecipeInventory ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                      <span className={p.features?.enableRecipeInventory ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}>
                        Recipe & Raw Stock Inventory
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check
                        className={`w-4 h-4 shrink-0 ${
                          p.features?.enableAggregators ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                      <span className={p.features?.enableAggregators ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}>
                        Swiggy / Zomato Integration
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-slate-800 font-medium">
                        Kitchen Display System (KDS) & Waiter App
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-slate-800 font-medium">
                        KhataBook Customer Credit Ledger
                      </span>
                    </div>
                  </div>
                </div>

                {/* Upgrade Button */}
                <button
                  type="button"
                  disabled={isCurrent || isUpgrading}
                  onClick={() => handleUpgrade(p)}
                  className={`w-full py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                      : isPopular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25'
                      : 'bg-slate-900 hover:bg-black text-white shadow-xs'
                  }`}
                >
                  {isCurrent ? (
                    <span>Current Active Plan</span>
                  ) : isUpgrading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening Razorpay...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay & Upgrade via Razorpay</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* POST-PAYMENT INVOICE / RECEIPT MODAL */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative text-slate-900 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setActiveInvoice(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Subscription Tax Invoice</h3>
                <p className="text-xs text-slate-500">Official GST Payment Receipt • QuantroBill POS</p>
              </div>
            </div>

            {/* Invoice Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Invoice Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{activeInvoice.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Payment Date</span>
                <span className="font-bold text-slate-900">
                  {new Date(activeInvoice.paidAt || activeInvoice.createdAt).toLocaleDateString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Payment Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> PAID
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Gateway Ref</span>
                <span className="font-mono text-[11px] text-slate-700 block truncate" title={activeInvoice.transactionRef}>
                  {activeInvoice.transactionRef || 'Razorpay Online'}
                </span>
              </div>
            </div>

            {/* Tenant / Bill To Info */}
            <div className="py-4 border-b border-slate-100 text-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 font-medium block">Billed To Restaurant:</span>
                <span className="font-bold text-slate-900 text-sm block">{activeInvoice.tenantName || tenant?.businessName}</span>
                <span className="text-slate-500 block">{(tenant as any)?.ownerEmail || ''} • {(tenant as any)?.ownerPhone || ''}</span>
                {(tenant as any)?.gstin && <span className="text-slate-500 block font-mono">GSTIN: {(tenant as any).gstin}</span>}
              </div>
              <div className="sm:text-right">
                <span className="text-slate-400 font-medium block">Service Provider:</span>
                <span className="font-bold text-slate-900 block">Quantromind Technologies Pvt. Ltd.</span>
                <span className="text-slate-500 block">SaaS POS Cloud Subscriptions</span>
                <span className="text-slate-500 block">support@quantromind.com</span>
              </div>
            </div>

            {/* Line Items Table */}
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
                      QuantroBill {activeInvoice.planName} Tier
                      <span className="text-[11px] text-slate-400 block">Complete multi-terminal restaurant OS</span>
                    </td>
                    <td className="py-3">{activeInvoice.billingCycle}</td>
                    <td className="py-3 text-right font-mono">₹{activeInvoice.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 text-right font-mono">₹{activeInvoice.taxAmount.toLocaleString('en-IN')}</td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900">
                      ₹{activeInvoice.totalAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 font-bold text-slate-900">
                    <td colSpan={4} className="py-3 text-right text-xs">Total Amount Paid (INR):</td>
                    <td className="py-3 text-right font-mono text-base text-blue-700 font-black">
                      ₹{activeInvoice.totalAmount.toLocaleString('en-IN')}
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
                  onClick={handlePrintInvoice}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => setActiveInvoice(null)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAST SUBSCRIPTION INVOICES & BILLING HISTORY */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Past Invoices & Payment History</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {invoices.length} {invoices.length === 1 ? 'Invoice' : 'Invoices'}
          </span>
        </div>

        {loadingInvoices ? (
          <div className="py-8 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <p className="text-xs">Loading billing history...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">No payment invoices yet</p>
            <p className="text-[11px] text-slate-400">
              When you upgrade or renew your plan via Razorpay, your tax invoices will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Plan & Cycle</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Method & Ref</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{inv.planName}</span>
                      <span className="text-[10px] text-slate-400 block">{inv.billingCycle}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(inv.paidAt || inv.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800">{inv.paymentMethod || 'Razorpay'}</span>
                      {inv.transactionRef && (
                        <span className="text-[10px] text-slate-400 block font-mono truncate max-w-[140px]" title={inv.transactionRef}>
                          {inv.transactionRef}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                      ₹{inv.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setActiveInvoice(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs transition cursor-pointer"
                        title="View & Print Invoice"
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

      {/* Enterprise Support Banner at Bottom */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">Need Custom Multi-Branch Enterprise Setup?</h4>
            <p className="text-xs text-slate-500">
              For 10+ outlets, custom ERP integrations, hardware leasing, or corporate GST billing, our priority team is here.
            </p>
          </div>
        </div>
        <a
          href="https://wa.me/919876543210?text=I%20need%20custom%20billing%20support%20for%20my%20restaurant%20chain"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition shrink-0 cursor-pointer"
        >
          <span>Contact Enterprise Support</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
