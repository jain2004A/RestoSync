import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  Save,
  CheckCircle2,
  ShieldAlert,
  Calculator,
  Building2,
  Users,
  Clock,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { plansApi } from '../services/plansApi';
import type { PlanTier } from '../types';

// Sleek iOS/Tailwind Toggle Switch Component
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  color?: 'blue' | 'emerald' | 'purple' | 'amber';
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  color = 'blue',
  disabled = false,
}) => {
  const colorClasses = {
    blue: 'bg-blue-600',
    emerald: 'bg-emerald-600',
    purple: 'bg-purple-600',
    amber: 'bg-amber-600',
  };

  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-start justify-between gap-4 p-3.5 rounded-xl border transition cursor-pointer select-none ${
        checked
          ? 'bg-blue-50/40 border-blue-200'
          : 'bg-white border-[#eedfc8] hover:bg-[#fbf7ee]'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <div className="flex-1">
        {label && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">{label}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase ${
                checked
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-[#fbf7ee] text-slate-500 border border-[#eedfc8]'
              }`}
            >
              {checked ? 'Active' : 'Off'}
            </span>
          </div>
        )}
        {description && (
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>

      <div
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
          checked ? colorClasses[color] : 'bg-slate-300'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  );
};

export const PlanEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== 'new');
  const navigate = useNavigate();

  const [formData, setFormData] = useState<Partial<PlanTier> & { syncToTenants?: boolean }>({
    name: '',
    code: '',
    description: '',
    priceMonthly: 1999,
    priceYearly: 19990,
    billingCycle: 'Yearly',
    durationDays: 365,
    includesHardware: false,
    hardwareDetails: '',
    isTrial: false,
    maxOutlets: 2,
    maxStaffUsers: 8,
    trialDays: 14,
    features: {
      enableKds: true,
      enableWaiterApp: true,
      enableAggregators: true,
      enableRecipeInventory: true,
      enableKhataBook: false,
      enableDynamicQr: true,
      enableTableFloor: true,
    },
    isPopular: false,
    isActive: true,
    displayOrder: 1,
    syncToTenants: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      plansApi
        .getPlanById(id)
        .then((res) => {
          if (res.success && res.data) {
            setFormData({
              ...res.data,
              syncToTenants: true,
            });
          } else {
            setError('Plan tier not found.');
          }
        })
        .catch((err) => {
          setError(err.response?.data?.message || 'Failed to load plan details.');
        })
        .finally(() => setLoading(false));
    }
  }, [isEditing, id]);

  const handleFeatureToggle = (featureKey: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [featureKey]: checked,
      } as any,
    }));
  };

  const handleAutoCalculateYearly = () => {
    const monthly = formData.priceMonthly || 0;
    // 10x monthly (~17% discount for annual commitment)
    const yearly = monthly * 10;
    setFormData((prev) => ({ ...prev, priceYearly: yearly }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setError('Plan name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEditing && id) {
        const res = await plansApi.updatePlan(id, formData);
        setSuccessMessage(res.message || 'Plan tier updated and changes applied.');
      } else {
        const res = await plansApi.createPlan(formData);
        setSuccessMessage(res.message || 'New plan tier created in catalog.');
      }
      setTimeout(() => {
        navigate('/superadmin/plans-catalog');
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error saving plan configuration.');
    } finally {
      setSaving(false);
    }
  };

  // Savings calculation
  const monthlyTotalAnnual = (formData.priceMonthly || 0) * 12;
  const annualPrice = formData.priceYearly || 0;
  const annualSavings = monthlyTotalAnnual - annualPrice;
  const savingsPct =
    monthlyTotalAnnual > 0 && annualSavings > 0
      ? Math.round((annualSavings / monthlyTotalAnnual) * 100)
      : 0;

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-semibold">Loading plan configuration...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/superadmin/plans-catalog')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Plans Catalog</span>
        </button>

        {isEditing && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#fbf7ee] text-slate-700 border border-[#eedfc8]">
            Plan ID: <code className="font-mono">{id}</code>
          </span>
        )}
      </div>

      <PageHeader
        title={isEditing ? `Edit Plan: ${formData.name}` : 'Create New Subscription Plan'}
        subtitle="Set pricing, branch quotas, user limits, and toggle feature entitlements with live tenant application."
        icon={Package}
      />

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Basic Information */}
        <div className="bg-white rounded-2xl border border-[#eedfc8] p-5 sm:p-6 shadow-xs">
          <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">1</span>
            <span>Plan Identification</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Plan Tier Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Starter Outlet, Growth Dine-In, Multi-Branch Pro"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-[#fbf7ee] border border-[#eedfc8] rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Unique Slug / Code Key
              </label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. starter, growth (auto-generated if left empty)"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-[#fbf7ee] border border-[#eedfc8] rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden font-mono text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Marketing Description & Value Proposition
              </label>
              <textarea
                rows={2}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief summary of who this plan is tailored for (e.g. ideal for high-volume cafes and dine-in restaurants)..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-[#fbf7ee] border border-[#eedfc8] rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden font-medium text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pricing & Billing */}
        <div className="bg-white rounded-2xl border border-[#eedfc8] p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">2</span>
              <span>Pricing Model (INR ₹)</span>
            </h2>
            <button
              type="button"
              onClick={handleAutoCalculateYearly}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-lg transition cursor-pointer"
              title="Set Annual = 10x Monthly (~17% discount)"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Auto-Calculate Annual (10x Monthly)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Monthly Price (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.priceMonthly ?? 0}
                  onChange={(e) => setFormData({ ...formData, priceMonthly: Number(e.target.value) })}
                  className="w-full pl-7 pr-3 py-2 text-xs sm:text-sm bg-[#fbf7ee] border border-[#eedfc8] rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Annual Price (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.priceYearly ?? 0}
                  onChange={(e) => setFormData({ ...formData, priceYearly: Number(e.target.value) })}
                  className="w-full pl-7 pr-3 py-2 text-xs sm:text-sm bg-[#fbf7ee] border border-[#eedfc8] rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Billing Cycle
              </label>
              <select
                value={formData.billingCycle || 'Yearly'}
                onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-[#fbf7ee] border border-[#eedfc8] rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden font-medium text-slate-900"
              >
                <option value="Trial">Trial (15 Days)</option>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly (Annual)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Plan Validity (Days)
              </label>
              <input
                type="number"
                min="1"
                value={formData.durationDays ?? 365}
                onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-[#fbf7ee] border border-[#eedfc8] rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden font-medium text-slate-900"
                placeholder="15 for trial, 365 for annual"
              />
            </div>
          </div>

          {/* Annual Savings Badge */}
          {savingsPct > 0 && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
              <span className="font-semibold">
                ✨ Annual Plan Discount: Customers save ₹{annualSavings.toLocaleString('en-IN')}/year ({savingsPct}% OFF) compared to monthly billing.
              </span>
              <span className="font-black text-emerald-700">Recommended</span>
            </div>
          )}

          {/* Pricing Toggles (Trial & Hardware) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-[#eedfc8]">
            <ToggleSwitch
              checked={formData.isTrial || false}
              onChange={(checked) => setFormData({ ...formData, isTrial: checked })}
              label="Free Trial Plan (₹0 for 15 Days)"
              description="Users can test POS with zero payment upfront. Automatically flagged as trial in registration."
              color="amber"
            />

            <ToggleSwitch
              checked={formData.includesHardware || false}
              onChange={(checked) => setFormData({ ...formData, includesHardware: checked })}
              label="Includes Hardware Bundle"
              description="Bundle includes thermal receipt printer, stand, or POS terminal accessory."
              color="purple"
            />
          </div>

          {formData.includesHardware && (
            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Hardware Specifications / Bundled Devices
              </label>
              <input
                type="text"
                value={formData.hardwareDetails || ''}
                onChange={(e) => setFormData({ ...formData, hardwareDetails: e.target.value })}
                placeholder="e.g. 80mm Thermal USB/LAN Receipt Printer + Metal Cash Drawer"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-[#fbf7ee] border border-[#eedfc8] rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden font-medium text-slate-900"
              />
            </div>
          )}
        </div>

        {/* Section 3: Limits & Quotas */}
        <div className="bg-white rounded-2xl border border-[#eedfc8] p-5 sm:p-6 shadow-xs">
          <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">3</span>
            <span>Branch & User Quotas</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Max Branches / Outlets
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="1"
                  value={formData.maxOutlets ?? 1}
                  onChange={(e) => setFormData({ ...formData, maxOutlets: Number(e.target.value) })}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#fbf7ee] border border-[#eedfc8] rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Max Staff User Logins
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="1"
                  value={formData.maxStaffUsers ?? 5}
                  onChange={(e) => setFormData({ ...formData, maxStaffUsers: Number(e.target.value) })}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#fbf7ee] border border-[#eedfc8] rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Free Trial Duration (Days)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  value={formData.trialDays ?? 14}
                  onChange={(e) => setFormData({ ...formData, trialDays: Number(e.target.value) })}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#fbf7ee] border border-[#eedfc8] rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden font-bold text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Feature Entitlements with Toggle Switches */}
        <div className="bg-white rounded-2xl border border-[#eedfc8] p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">4</span>
              <span>Feature Entitlements (Interactive Toggles)</span>
            </h2>
            <span className="text-[11px] text-slate-400">Click any card to toggle feature on/off</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                id: 'enableKds',
                label: 'Kitchen Display System (KDS)',
                desc: 'Live cook screen with realtime order preparation states and bump bar sync.',
                color: 'blue' as const,
              },
              {
                id: 'enableWaiterApp',
                label: 'Waiter / Captain Mobile App',
                desc: 'Handheld table-side phone ordering, instant KOT creation, and table transfers.',
                color: 'blue' as const,
              },
              {
                id: 'enableAggregators',
                label: 'Online Aggregators (Swiggy / Zomato)',
                desc: 'Direct auto-accept and live menu sync with Zomato and Swiggy partner APIs.',
                color: 'purple' as const,
              },
              {
                id: 'enableRecipeInventory',
                label: 'Recipe & Raw Ingredient Inventory',
                desc: 'Realtime stock deduction per dish prepared, wastage logs, and low-stock alerts.',
                color: 'emerald' as const,
              },
              {
                id: 'enableKhataBook',
                label: 'KhataBook / Customer Credit Ledger',
                desc: 'Post-pay customer ledger, credit balance tracking, and periodic settlements.',
                color: 'amber' as const,
              },
              {
                id: 'enableDynamicQr',
                label: 'Dynamic UPI QR Code on Receipts',
                desc: 'Generates on-the-fly QR code for exact bill amount directly on 80mm thermal receipts.',
                color: 'emerald' as const,
              },
              {
                id: 'enableTableFloor',
                label: 'Interactive Floor & Table Layout',
                desc: 'Visual table layout with split bill, merge tables, and live occupied status.',
                color: 'blue' as const,
              },
            ].map((feat) => {
              const checked = Boolean(formData.features?.[feat.id]);
              return (
                <ToggleSwitch
                  key={feat.id}
                  checked={checked}
                  onChange={(c) => handleFeatureToggle(feat.id, c)}
                  label={feat.label}
                  description={feat.desc}
                  color={feat.color}
                />
              );
            })}
          </div>
        </div>

        {/* Section 5: Catalog Visibility & Live Tenant Sync */}
        <div className="bg-white rounded-2xl border border-[#eedfc8] p-5 sm:p-6 shadow-xs">
          <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">5</span>
            <span>Catalog Visibility & Live Tenant Application</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ToggleSwitch
              checked={formData.isActive ?? true}
              onChange={(checked) => setFormData({ ...formData, isActive: checked })}
              label="Active in Catalog"
              description="Available for new restaurant signups and upgrade selectors."
              color="emerald"
            />

            <ToggleSwitch
              checked={formData.isPopular ?? false}
              onChange={(checked) => setFormData({ ...formData, isPopular: checked })}
              label="Mark as Popular"
              description="Displays 'Most Popular' badge on landing page pricing cards."
              color="amber"
            />

            <ToggleSwitch
              checked={formData.syncToTenants ?? true}
              onChange={(checked) => setFormData({ ...formData, syncToTenants: checked })}
              label="Sync to Existing Restaurants"
              description="Instantly apply updated features and quotas to all restaurants currently on this plan."
              color="blue"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/superadmin/plans-catalog')}
            className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-[#fbf7ee] hover:bg-[#f3ead7] border border-[#eedfc8] rounded-xl shadow-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md shadow-blue-600/25 transition disabled:opacity-60 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : isEditing ? 'Save & Apply Plan Changes' : 'Create Plan Tier'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
