import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useAuthStore, getHomeRouteForRole } from '../store/authStore';
import type { AuthResponse, Plan, BusinessType } from '../types';
import {
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Store,
  ChefHat,
  UtensilsCrossed,
  Coffee,
  Beer,
  Printer,
  AlertCircle,
  Loader2,
  Check,
  ShieldCheck,
  Sparkles,
  Zap
} from 'lucide-react';
import heroImg from '../assets/hero-illustration.png';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { setAuthData, isAuthenticated, user } = useAuthStore();

  // If already logged in, redirect
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(getHomeRouteForRole(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 1: Restaurant Details
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('Restaurant');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [gstin, setGstin] = useState('');

  // Step 2: Owner Account
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 3: Plans
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('free-trial');
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Fetch active plans from backend
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await apiClient.get<{ success: boolean; data: Plan[] }>('/public/plans');
        let fetchedList: Plan[] = [];
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          fetchedList = [...res.data.data];
        }

        // Always ensure the 15-Day Free Trial plan is present
        const hasTrial = fetchedList.some((p) => p.isTrial || p.code === 'free-trial');
        if (!hasTrial) {
          fetchedList.unshift({
            id: 'free-trial',
            name: '15-Day Free Trial',
            code: 'free-trial',
            description: 'Full access to POS billing, KOT printing, and table management for 15 days.',
            priceMonthly: 0,
            priceYearly: 0,
            billingCycle: 'Trial',
            durationDays: 15,
            includesHardware: false,
            isTrial: true,
            maxOutlets: 1,
            maxStaffUsers: 2,
            trialDays: 15,
            features: {
              enableKds: true,
              enableWaiterApp: true,
              enableAggregators: false,
              enableRecipeInventory: false,
              enableKhataBook: true
            },
            isPopular: true,
            isActive: true,
            displayOrder: 0
          });
        }

        // Ensure 15-Day Free Trial is always sorted first
        fetchedList.sort((a, b) => {
          if (a.isTrial || a.code === 'free-trial') return -1;
          if (b.isTrial || b.code === 'free-trial') return 1;
          return (a.displayOrder || 0) - (b.displayOrder || 0);
        });

        setPlans(fetchedList);
        setSelectedPlanCode('free-trial');
      } catch (err) {
        console.warn('Could not fetch plans from API, using defaults', err);
        setPlans([
          {
            id: 'free-trial',
            name: '15-Day Free Trial',
            code: 'free-trial',
            description: 'Full access to POS billing, KOT printing, and table management for 15 days.',
            priceMonthly: 0,
            priceYearly: 0,
            billingCycle: 'Trial',
            durationDays: 15,
            includesHardware: false,
            isTrial: true,
            maxOutlets: 1,
            maxStaffUsers: 2,
            trialDays: 15,
            features: {
              enableKds: true,
              enableWaiterApp: true,
              enableAggregators: false,
              enableRecipeInventory: false,
              enableKhataBook: true
            },
            isPopular: true,
            isActive: true,
            displayOrder: 0
          },
          {
            id: 'starter',
            name: 'Starter Annual',
            code: 'starter',
            description: 'Essential billing, fast registers, and cloud sync for single outlets.',
            priceMonthly: 999,
            priceYearly: 9990,
            billingCycle: 'Yearly',
            durationDays: 365,
            includesHardware: false,
            isTrial: false,
            maxOutlets: 1,
            maxStaffUsers: 5,
            trialDays: 14,
            features: {
              enableKds: false,
              enableWaiterApp: false,
              enableAggregators: false,
              enableRecipeInventory: true,
              enableKhataBook: true
            },
            isPopular: false,
            isActive: true,
            displayOrder: 1
          },
          {
            id: 'growth',
            name: 'Growth Dine-In',
            code: 'growth',
            description: 'Full restaurant OS with floor layout, KDS, inventory & aggregators.',
            priceMonthly: 2499,
            priceYearly: 24990,
            billingCycle: 'Yearly',
            durationDays: 365,
            includesHardware: false,
            isTrial: false,
            maxOutlets: 3,
            maxStaffUsers: 15,
            trialDays: 14,
            features: {
              enableKds: true,
              enableWaiterApp: true,
              enableAggregators: true,
              enableRecipeInventory: true,
              enableKhataBook: true
            },
            isPopular: false,
            isActive: true,
            displayOrder: 2
          },
          {
            id: 'hardware',
            name: 'Renewal + Hardware',
            code: 'renewal-hardware',
            description: 'Growth plan bundled with high-speed 80mm thermal USB/LAN receipt printer.',
            priceMonthly: 3499,
            priceYearly: 34990,
            billingCycle: 'Yearly',
            durationDays: 365,
            includesHardware: true,
            hardwareDetails: '80mm Thermal Receipt Printer + Metal Stand + USB Cable',
            isTrial: false,
            maxOutlets: 3,
            maxStaffUsers: 15,
            trialDays: 14,
            features: {
              enableKds: true,
              enableWaiterApp: true,
              enableAggregators: true,
              enableRecipeInventory: true,
              enableKhataBook: true
            },
            isPopular: false,
            isActive: true,
            displayOrder: 3
          }
        ]);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const businessTypes: { type: BusinessType; label: string; icon: React.ReactNode }[] = [
    { type: 'Restaurant', label: 'Dine-In', icon: <UtensilsCrossed className="w-3.5 h-3.5" /> },
    { type: 'Cafe', label: 'Cafe & Bakery', icon: <Coffee className="w-3.5 h-3.5" /> },
    { type: 'QSR', label: 'QSR / Fast Food', icon: <Store className="w-3.5 h-3.5" /> },
    { type: 'CloudKitchen', label: 'Cloud Kitchen', icon: <ChefHat className="w-3.5 h-3.5" /> },
    { type: 'Bar', label: 'Bar & Brewery', icon: <Beer className="w-3.5 h-3.5" /> }
  ];

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (step === 1) {
      if (!businessName.trim()) {
        setErrorMessage('Restaurant / Business name is required.');
        return;
      }
      if (!city.trim() || !state.trim()) {
        setErrorMessage('City and State are required.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!ownerName.trim()) {
        setErrorMessage('Owner full name is required.');
        return;
      }
      if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
        setErrorMessage('Please provide a valid email address.');
        return;
      }
      if (!ownerPhone.trim() || ownerPhone.trim().length < 10) {
        setErrorMessage('Please provide a valid 10-digit mobile number.');
        return;
      }
      if (!password || password.length < 8) {
        setErrorMessage('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
      setStep(3);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const payload = {
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPhone: ownerPhone.trim(),
        password,
        businessType,
        city: city.trim(),
        state: state.trim(),
        gstin: gstin.trim() ? gstin.trim().toUpperCase() : undefined,
        planCode: selectedPlanCode
      };

      const res = await apiClient.post<{ success: boolean; data: AuthResponse; message?: string }>(
        '/auth/register',
        payload
      );

      if (res.data?.success && res.data.data) {
        setAuthData(res.data.data);
        const home = getHomeRouteForRole(res.data.data.user.role);
        navigate(home, { replace: true });
        return;
      } else {
        setErrorMessage(res.data?.message || 'Registration failed. Please check your details.');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to register restaurant. Please check your details or try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find((p) => p.code === selectedPlanCode) || plans[0];

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-[#faf7ee] text-slate-900 flex flex-col justify-between font-sans overflow-y-auto lg:overflow-hidden">
      {/* Top Header - Compact Brand Bar */}
      <header className="w-full bg-[#fdfbf7]/95 backdrop-blur-md border-b border-[#eedfc8] px-6 py-2.5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm font-black text-lg">
            R
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-slate-900 tracking-tight">
                RestoSync <span className="text-blue-600 font-black">POS</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100/70 text-amber-900 border border-amber-300/60">
                <Sparkles className="w-2.5 h-2.5" /> 15-Day Free Trial
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Professional Restaurant Operating System & Billing Hub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500 hidden md:inline">Already registered?</span>
          <Link
            to="/login"
            className="px-3.5 py-1.5 rounded-lg border border-[#eedfc8] bg-[#fbf7ee] text-slate-800 font-semibold hover:bg-[#f3ead7] transition shadow-xs"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Full-Width Split Container (No scroll on desktop) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-center">
        <div className="w-full bg-white border border-[#eedfc8] rounded-2xl shadow-xl shadow-amber-900/5 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
          {/* Left Column: Multi-Step Registration Form */}
          <div className="lg:col-span-7 p-5 sm:p-7 flex flex-col justify-between">
            <div>
              {/* Step Wizard Tracker */}
              <div className="flex items-center justify-between border-b border-[#eedfc8]/80 pb-3 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {step === 1 && 'Restaurant Details'}
                    {step === 2 && 'Owner Account Credentials'}
                    {step === 3 && 'Choose Subscription Plan'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {step === 1 && 'Basic information to configure your restaurant partition'}
                    {step === 2 && 'Admin login credentials to access the Owner Portal & POS'}
                    {step === 3 && 'Start instantly with our 15-day free trial. Upgrade anytime'}
                  </p>
                </div>

                {/* Step Badges */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      step > 1
                        ? 'bg-emerald-600 text-white'
                        : step === 1
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-[#fbf7ee] border border-[#eedfc8] text-slate-400'
                    }`}
                  >
                    {step > 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
                  </div>
                  <div className={`w-4 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-[#eedfc8]'}`} />
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      step > 2
                        ? 'bg-emerald-600 text-white'
                        : step === 2
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-[#fbf7ee] border border-[#eedfc8] text-slate-400'
                    }`}
                  >
                    {step > 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '2'}
                  </div>
                  <div className={`w-4 h-0.5 ${step >= 3 ? 'bg-blue-600' : 'bg-[#eedfc8]'}`} />
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      step === 3
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-[#fbf7ee] border border-[#eedfc8] text-slate-400'
                    }`}
                  >
                    3
                  </div>
                </div>
              </div>

              {/* Error Message Banner */}
              {errorMessage && (
                <div className="mb-3.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {/* STEP 1: RESTAURANT DETAILS */}
              {step === 1 && (
                <form onSubmit={handleNextStep} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                      Restaurant / Business Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Spice Route Bistro, Cafe Blossom"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full bg-[#fbf7ee] border border-[#eedfc8] text-slate-900 text-xs sm:text-sm rounded-lg pl-9 pr-3 py-2 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                      Business Format / Type <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {businessTypes.map((item) => {
                        const isSelected = businessType === item.type;
                        return (
                          <button
                            type="button"
                            key={item.type}
                            onClick={() => setBusinessType(item.type)}
                            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 p-2 rounded-lg border text-[11px] font-semibold transition cursor-pointer text-center ${
                              isSelected
                                ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs'
                                : 'bg-[#fbf7ee] border-[#eedfc8] text-slate-700 hover:bg-[#f3ead7]'
                            }`}
                          >
                            <span className={isSelected ? 'text-blue-600' : 'text-slate-500'}>
                              {item.icon}
                            </span>
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        City <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Pune, Mumbai"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-[#fbf7ee] border border-[#eedfc8] text-slate-900 text-xs sm:text-sm rounded-lg px-3 py-2 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        State <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Maharashtra"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full bg-[#fbf7ee] border border-[#eedfc8] text-slate-900 text-xs sm:text-sm rounded-lg px-3 py-2 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        GSTIN Number
                      </label>
                      <span className="text-[10px] text-slate-400">Optional</span>
                    </div>
                    <input
                      type="text"
                      placeholder="22AAAAA0000A1Z5"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      className="w-full bg-[#fbf7ee] border border-[#eedfc8] text-slate-900 text-xs sm:text-sm rounded-lg px-3 py-2 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 font-medium uppercase"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                    >
                      <span>Continue to Owner Details</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: OWNER ACCOUNT CREDENTIALS */}
              {step === 2 && (
                <form onSubmit={handleNextStep} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                      Owner Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rajesh Patil"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="w-full bg-[#fbf7ee] border border-[#eedfc8] text-slate-900 text-xs sm:text-sm rounded-lg pl-9 pr-3 py-2 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        Email Address (Login ID) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          placeholder="owner@restaurant.com"
                          value={ownerEmail}
                          onChange={(e) => setOwnerEmail(e.target.value)}
                          className="w-full bg-[#fbf7ee] border border-[#eedfc8] text-slate-900 text-xs sm:text-sm rounded-lg pl-9 pr-3 py-2 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        Mobile Phone <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          placeholder="9876543210"
                          value={ownerPhone}
                          onChange={(e) => setOwnerPhone(e.target.value)}
                          className="w-full bg-[#fbf7ee] border border-[#eedfc8] text-slate-900 text-xs sm:text-sm rounded-lg pl-9 pr-3 py-2 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        Password <span className="text-rose-500">*</span> (min 8 chars)
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="At least 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-[#fbf7ee] border border-[#eedfc8] text-slate-900 text-xs sm:text-sm rounded-lg pl-9 pr-9 py-2 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Repeat password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-[#fbf7ee] border border-[#eedfc8] text-slate-900 text-xs sm:text-sm rounded-lg pl-9 pr-3 py-2 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 rounded-lg border border-[#eedfc8] bg-[#fbf7ee] hover:bg-[#f3ead7] text-slate-800 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
                    >
                      <span>Select Subscription Plan</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: PLAN SELECTION & SUBMISSION */}
              {step === 3 && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  {loadingPlans ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <p className="text-xs font-medium">Loading subscription plans...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[290px] overflow-y-auto pr-1">
                      {plans.map((p) => {
                        const isSelected = selectedPlanCode === p.code;
                        return (
                          <div
                            key={p.code}
                            onClick={() => setSelectedPlanCode(p.code)}
                            className={`cursor-pointer rounded-xl p-3 border transition-all duration-150 flex flex-col justify-between ${
                              isSelected
                                ? 'bg-blue-50/60 border-2 border-blue-600 shadow-xs ring-1 ring-blue-600/20'
                                : 'bg-[#fbf7ee] border-[#eedfc8] hover:border-amber-300 hover:bg-[#fdfaf2]'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                                  {p.isTrial && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      FREE TRIAL
                                    </span>
                                  )}
                                  {p.includesHardware && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-0.5">
                                      <Printer className="w-2.5 h-2.5" /> HARDWARE
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                                    isSelected
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-[#eedfc8] bg-white'
                                  }`}
                                >
                                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                              </div>

                              <div className="mb-1">
                                {p.isTrial ? (
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-emerald-700">₹0</span>
                                    <span className="text-[11px] text-slate-500 font-medium">for 15 days</span>
                                  </div>
                                ) : (
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-black text-slate-900">
                                      ₹{p.priceYearly ? p.priceYearly.toLocaleString('en-IN') : (p.priceMonthly * 12).toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-medium">/year</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-[#eedfc8]/60 space-y-1 text-[11px] text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="truncate">Up to {p.maxOutlets} Outlet & {p.maxStaffUsers} Staff</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="truncate">Fast POS Billing, KOT & Table Layout</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Selected Plan Summary Line */}
                  {selectedPlan && (
                    <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/90 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900">Selected: {selectedPlan.name}</span>
                          <span className="text-slate-500 ml-1.5">
                            {selectedPlan.isTrial ? '• Full 15-day access, zero payment today' : '• Full annual license'}
                          </span>
                        </div>
                      </div>
                      <span className="font-black text-emerald-700 text-xs sm:text-sm">
                        {selectedPlan.isTrial ? '₹0 Free' : `₹${(selectedPlan.priceYearly || selectedPlan.priceMonthly * 12).toLocaleString('en-IN')}`}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setStep(2)}
                      className="px-4 py-2 rounded-lg border border-[#eedfc8] bg-[#fbf7ee] hover:bg-[#f3ead7] text-slate-800 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating Restaurant POS Account...</span>
                        </>
                      ) : (
                        <>
                          <span>Complete Registration & Launch POS</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Bottom Form Note */}
            <p className="text-[11px] text-slate-400 mt-4 border-t border-[#eedfc8]/80 pt-2 text-center sm:text-left">
              By registering, you agree to RestoSync POS Terms of Service. Enterprise tenant isolation guaranteed.
            </p>
          </div>

          {/* Right Column: Visual Branding Panel (Warm cream & blue palette) */}
          <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#fbf8f1] via-[#faf5ea] to-blue-50/40 border-l border-[#eedfc8] p-6 flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  R
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">RestoSync</h3>
                  <p className="text-[11px] text-blue-600 font-semibold">Restaurant Management Cloud</p>
                </div>
              </div>

              <div className="mt-4 mb-4">
                <img
                  src={heroImg}
                  alt="RestoSync POS Illustration"
                  className="w-full max-h-48 object-contain mx-auto drop-shadow-sm"
                />
              </div>

              <h4 className="text-base font-bold text-slate-900 leading-snug">
                Power your restaurant with modern digital billing & POS.
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Everything you need to streamline order taking, kitchen display systems, and real-time inventory management.
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t border-[#eedfc8] text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>15-Day Free Trial with all essential features</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Under 2-second fast billing & thermal KOT</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Interactive floor & table management</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Bank-grade security & multi-branch isolation</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer Note */}
      <footer className="py-2 text-center text-[11px] text-slate-500 shrink-0">
        RestoSync POS • Enterprise Restaurant Management System • Need support? Contact{' '}
        <span className="text-blue-600 font-semibold">support@quantromind.com</span>
      </footer>
    </div>
  );
};
