import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useAuthStore, getHomeRouteForRole } from '../store/authStore';
import type { AuthResponse } from '../types';
import {
  Lock,
  User,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import heroImg from '../assets/hero-illustration.png';
import { MustChangePasswordModal } from '../components/modals/MustChangePasswordModal';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setAuthData, isAuthenticated, user } = useAuthStore();

  const [loginMode, setLoginMode] = useState<'password' | 'pin'>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // If already authenticated and not requiring password reset, redirect to role workspace
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      if (user.mustChangePassword) {
        setShowPasswordModal(true);
      } else {
        const homeRoute = getHomeRouteForRole(user.role);
        navigate(homeRoute, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const cleanIdentifier = identifier.trim();

    try {
      let response;
      if (loginMode === 'password') {
        response = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/login', {
          identifier: cleanIdentifier,
          password,
        });
      } else {
        // PIN login for POS terminals
        const savedOutlet = localStorage.getItem('quantrobill_active_outlet');
        let outletId: string | undefined;
        if (savedOutlet) {
          try {
            outletId = JSON.parse(savedOutlet)?.id;
          } catch {
            outletId = undefined;
          }
        }

        response = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/pin-login', {
          pin: pin.trim(),
          outletId,
        });
      }

      if (response.data?.success && response.data.data) {
        const authData = response.data.data;
        setAuthData(authData);

        if (authData.mustChangePassword || authData.user?.mustChangePassword) {
          setShowPasswordModal(true);
          return;
        }

        const targetRoute = getHomeRouteForRole(authData.user.role);
        navigate(targetRoute, { replace: true });
        return;
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please verify your credentials.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-[#faf7ee] text-slate-900 flex flex-col justify-between font-sans overflow-y-auto lg:overflow-hidden">
      {/* Top Header - Compact Brand Bar (Warm Cream & Royal Blue) */}
      <header className="w-full bg-[#fdfbf7]/95 backdrop-blur-md border-b border-[#eedfc8] px-6 py-2.5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 font-black text-lg">
              Q
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900 tracking-tight">
                  Quantromind <span className="text-blue-600 font-black">POS</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Sparkles className="w-2.5 h-2.5" /> Restaurant Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Professional Restaurant Operating System & Billing Hub
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500 hidden md:inline">New restaurant or cafe?</span>
          <Link
            to="/register"
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-sm shadow-blue-500/20 flex items-center gap-1.5"
          >
            <span>Register Restaurant</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Split Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-center">
        <div className="w-full bg-white border border-[#eedfc8] rounded-2xl shadow-xl shadow-amber-900/5 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
          {/* Left Column: Login Form */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="border-b border-amber-100 pb-4 mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    Portal Access
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Welcome to QuantroBill POS
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Sign in to access your billing counter, kitchen orders, inventory, and restaurant workspace.
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="flex rounded-xl bg-[#fbf7ee] p-1 mb-5 border border-[#eedfc8]">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('password');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    loginMode === 'password'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Email & Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('pin');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    loginMode === 'pin'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Quick Staff PIN</span>
                </button>
              </div>

              {/* Error Message Banner */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {/* Form Content */}
              <form onSubmit={handleLogin} className="space-y-4">
                {loginMode === 'password' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                        Email Address or Username <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="e.g. owner@bistro.com or cashier1"
                          className="w-full bg-[#fbf7ee] border border-[#eedfc8] text-slate-900 text-sm rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-400 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Password <span className="text-rose-500">*</span>
                        </label>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your account password"
                          className="w-full bg-[#fbf7ee] border border-[#eedfc8] text-slate-900 text-sm rounded-xl pl-9 pr-10 py-2.5 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-400 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 text-center">
                      Enter 4-Digit Staff PIN
                    </label>
                    <div className="relative max-w-xs mx-auto">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="••••"
                        className="w-full bg-[#fbf7ee] border border-[#eedfc8] text-slate-900 text-xl tracking-widest text-center rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all font-bold"
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 text-center mt-2 font-medium">
                      Fast-access login for active outlet floor registers and kitchen stewards.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In & Open Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Register Restaurant CTA Banner */}
              <div className="mt-5 p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-blue-500/10 border border-[#eedfc8] rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">Need a POS for your restaurant?</p>
                  <p className="text-[11px] text-slate-500">Get 15 days free access with full features.</p>
                </div>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition shadow-sm shadow-blue-500/20"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Bottom Form Note */}
            <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Multi-tenant data partitioning enabled</span>
              </div>
              <span className="text-[11px] text-slate-400">v2.4 Secure Portal</span>
            </div>
          </div>

          {/* Right Column: Visual Branding Panel */}
          <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#fbf8f1] via-[#faf5ea] to-blue-50/40 border-l border-[#eedfc8] p-6 flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  Q
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Quantromind</h3>
                  <p className="text-[11px] text-blue-600 font-semibold">Restaurant Management Cloud</p>
                </div>
              </div>

              <div className="mt-4 mb-4">
                <img
                  src={heroImg}
                  alt="Quantromind POS Illustration"
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
                <span>Under 2-second fast billing & thermal KOT</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Interactive floor & table management</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Kitchen Display (KDS) & Captain app</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Bank-grade security & multi-branch isolation</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer Note (identical to Register page) */}
      <footer className="py-2 text-center text-[11px] text-slate-500 shrink-0">
        Quantromind POS • Enterprise Restaurant Management System • Need support? Contact{' '}
        <span className="text-blue-600 font-semibold">support@quantromind.com</span>
      </footer>

      <MustChangePasswordModal
        isOpen={showPasswordModal}
        onSuccess={() => {
          setShowPasswordModal(false);
          const currentUser = useAuthStore.getState().user;
          if (currentUser?.role) {
            navigate(getHomeRouteForRole(currentUser.role), { replace: true });
          }
        }}
      />
    </div>
  );
};
