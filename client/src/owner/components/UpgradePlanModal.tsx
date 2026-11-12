import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Plan } from '../../types';
import {
  X,
  Sparkles,
  CheckCircle2,
  Printer,
  ArrowRight,
  ShieldCheck,
  Check,
  Loader2,
  PhoneCall
} from 'lucide-react';

import { openRazorpayModal } from '../../utils/razorpay';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({ isOpen, onClose }) => {
  const { tenant, updateTenant } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('');
  const [upgrading, setUpgrading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchPlans = async () => {
      setLoading(true);
      setSuccessMessage(null);
      setErrorMessage(null);
      try {
        const res = await apiClient.get<{ success: boolean; data: Plan[] }>('/public/plans');
        if (res.data?.success && Array.isArray(res.data.data)) {
          // Filter out trial plans when looking to upgrade
          const availablePlans = res.data.data.filter((p) => !p.isTrial && p.isActive);
          setPlans(availablePlans);
          if (availablePlans.length > 0) {
            setSelectedPlanCode(availablePlans[0].code);
          }
        }
      } catch (err) {
        console.error('Failed to load plans for upgrade modal', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPlanName = tenant?.planName || tenant?.subscriptionPlan || '15-Day Free Trial';

  const handleRequestUpgrade = async (plan: Plan) => {
    setUpgrading(true);
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
        billingCycle: 'Yearly',
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
        name: 'RestoSync POS',
        description: `Upgrade to ${plan.name} Tier`,
        prefill: {
          name: prefillUser?.name || tenant?.businessName || '',
          email: prefillUser?.email || '',
          contact: prefillUser?.phone || '',
        },
        theme: {
          color: '#10b981', // Emerald green theme matching modal
        },
        handler: async (paymentResponse) => {
          try {
            // 3. Verify payment signature on backend
            const verifyRes = await apiClient.post<{
              success: boolean;
              message: string;
              invoiceNumber?: string;
              tenant?: any;
            }>('/payments/verify-payment', {
              orderId: paymentResponse.razorpay_order_id,
              paymentId: paymentResponse.razorpay_payment_id,
              signature: paymentResponse.razorpay_signature,
              purpose: 'SubscriptionUpgrade',
              planCode: plan.code,
              planId: plan.id,
              billingCycle: 'Yearly',
            });

            if (verifyRes.data?.success) {
              if (verifyRes.data.tenant) {
                updateTenant(verifyRes.data.tenant);
              }
              setSuccessMessage(
                `🎉 Payment successful! You are now subscribed to ${plan.name}. Invoice #${verifyRes.data.invoiceNumber || ''} has been generated.`
              );
            } else {
              setErrorMessage(verifyRes.data?.message || 'Payment verification failed.');
            }
          } catch (verifyErr: any) {
            setErrorMessage(verifyErr.response?.data?.message || 'Payment verification error.');
          } finally {
            setUpgrading(false);
          }
        },
        onDismiss: () => {
          setUpgrading(false);
        },
      });
    } catch (err: any) {
      console.error('Upgrade initiation error:', err);
      setErrorMessage(
        err.response?.data?.message ||
        err.message ||
        'Could not initiate Razorpay checkout. Please verify your internet or contact support.'
      );
      setUpgrading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Unlock Multi-Branch & Premium Features
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Upgrade Your RestoSync Subscription
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl mx-auto">
            Currently on <strong className="text-emerald-400">{currentPlanName}</strong>. Choose a plan to expand your restaurant branches, unlock recipe inventory, and connect online food aggregators.
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <X className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Plans Grid */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs font-semibold">Loading available subscription plans...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {plans.map((p) => {
              const isSelected = selectedPlanCode === p.code;
              const isCurrent = tenant?.planCode === p.code;

              return (
                <div
                  key={p.code}
                  onClick={() => setSelectedPlanCode(p.code)}
                  className={`rounded-2xl p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                    isSelected
                      ? 'bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Header with name and badges */}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-white text-base">{p.name}</h3>
                      {p.includesHardware && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                          <Printer className="w-3 h-3" /> HARDWARE
                        </span>
                      )}
                      {p.isPopular && !p.includesHardware && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          POPULAR
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="mb-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">
                          ₹{p.priceYearly ? p.priceYearly.toLocaleString('en-IN') : (p.priceMonthly * 12).toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-slate-400">/year</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{p.description}</p>
                    </div>

                    {/* Hardware notice if present */}
                    {p.includesHardware && p.hardwareDetails && (
                      <div className="mb-3 p-2 rounded-lg bg-blue-950/40 border border-blue-800/40 text-[10px] text-blue-300 flex items-center gap-1.5">
                        <Printer className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Includes: {p.hardwareDetails}</span>
                      </div>
                    )}

                    {/* Features list */}
                    <div className="space-y-1.5 pt-3 border-t border-slate-800/80 text-xs text-slate-300 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Up to {p.maxOutlets} Outlet{p.maxOutlets > 1 ? 's' : ''} & {p.maxStaffUsers} Staff</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check
                          className={`w-3.5 h-3.5 shrink-0 ${
                            p.features?.enableRecipeInventory ? 'text-emerald-400' : 'text-slate-600'
                          }`}
                        />
                        <span className={p.features?.enableRecipeInventory ? 'text-slate-200' : 'text-slate-500'}>
                          Recipe & Raw Stock Inventory
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check
                          className={`w-3.5 h-3.5 shrink-0 ${
                            p.features?.enableAggregators ? 'text-emerald-400' : 'text-slate-600'
                          }`}
                        />
                        <span className={p.features?.enableAggregators ? 'text-slate-200' : 'text-slate-500'}>
                          Swiggy / Zomato Integration
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>KDS, Waiter App & Khata Book</span>
                      </div>
                    </div>
                  </div>

                  {/* Button */}
                  <button
                    disabled={isCurrent || upgrading}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRequestUpgrade(p);
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isCurrent
                        ? 'bg-slate-800 text-slate-500 cursor-default'
                        : isSelected
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    {isCurrent ? (
                      <span>Current Active Plan</span>
                    ) : upgrading && isSelected ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Opening Razorpay Checkout...</span>
                      </>
                    ) : (
                      <>
                        <span>Pay & Upgrade via Razorpay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Support Notice */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-slate-400">
              Need custom multi-chain enterprise configuration, GST input invoices, or hardware setup?
            </p>
          </div>
          <a
            href="https://wa.me/919876543210?text=I%20need%20custom%20billing%20support%20for%20my%20restaurant"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Contact Priority Support</span>
          </a>
        </div>
      </div>
    </div>
  );
};
