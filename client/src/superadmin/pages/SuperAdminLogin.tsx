import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { useAuthStore, getHomeRouteForRole } from '../../store/authStore';
import { UserRole } from '../../types/roles';
import type { AuthResponse } from '../../types';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Server,
  ArrowLeft,
} from 'lucide-react';
import { MustChangePasswordModal } from '../../components/modals/MustChangePasswordModal';

export const SuperAdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { setAuthData, isAuthenticated, user } = useAuthStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // If already authenticated as SuperAdmin, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      if (user.role === UserRole.SuperAdmin) {
        if (user.mustChangePassword) {
          setShowPasswordModal(true);
        } else {
          navigate('/superadmin/dashboard', { replace: true });
        }
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      if (response.data?.success && response.data.data) {
        const authData = response.data.data;
        setAuthData(authData);

        if (authData.mustChangePassword || authData.user?.mustChangePassword) {
          setShowPasswordModal(true);
          return;
        }

        if (authData.user.role === UserRole.SuperAdmin) {
          navigate('/superadmin/dashboard', { replace: true });
        } else {
          // If non-superadmin logged in here, route them to their designated workspace
          const home = getHomeRouteForRole(authData.user.role);
          navigate(home, { replace: true });
        }
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Authentication failed. Invalid administrator credentials.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7ee] text-slate-900 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top minimal bar */}
      <header className="w-full bg-[#fdfbf7]/95 backdrop-blur-md border-b border-[#eedfc8] px-6 py-2.5 flex items-center justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900 tracking-tight">
                Quantromind <span className="text-blue-600 font-black">Core</span>
              </span>
              <span className="text-[10px] font-bold uppercase bg-amber-100/70 text-amber-900 border border-amber-300/60 px-2 py-0.5 rounded-full">
                Internal Admin Console
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Platform Governance & Security Boundary</p>
          </div>
        </div>

        <Link
          to="/"
          className="px-3 py-1.5 rounded-lg border border-[#eedfc8] bg-[#fbf7ee] text-slate-800 font-semibold hover:bg-[#f3ead7] transition shadow-xs text-xs flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Site</span>
        </Link>
      </header>

      {/* Central Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md bg-white border border-[#eedfc8] rounded-2xl shadow-xl shadow-amber-900/5 p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 mb-3 shadow-xs">
              <ShieldAlert className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              SuperAdmin Authentication
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Elevated access portal for platform governance & SaaS infrastructure
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300/80 text-[11px] text-amber-900 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Restricted Endpoint • Authorized Personnel Only</span>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSuperAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Administrator Identifier
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@quantromind.com"
                  className="w-full bg-[#fbf7ee] border border-[#eedfc8] text-slate-900 text-sm rounded-xl pl-9 pr-3 py-2.5 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Master Security Key / Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#fbf7ee] border border-[#eedfc8] text-slate-900 text-sm rounded-xl pl-9 pr-10 py-2.5 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition placeholder:text-slate-400 font-medium font-mono"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 transition cursor-pointer mt-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Authenticate & Enter Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security notice */}
          <p className="text-[11px] text-slate-400 text-center mt-6 border-t border-[#eedfc8]/80 pt-4 leading-relaxed">
            Access to this portal is monitored and audited. All login attempts are recorded for compliance and security forensics.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-[11px] text-slate-500 border-t border-[#eedfc8]/80 shrink-0">
        Quantromind Cloud Core • Multi-Tenant Platform Engine • Confidential
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
