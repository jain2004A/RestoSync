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
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top minimal bar */}
      <header className="w-full border-b border-slate-800/80 px-6 py-3 flex items-center justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-600/30">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-100 tracking-tight">
              Quantromind <span className="text-indigo-400">Core</span>
            </span>
            <span className="ml-2 text-[10px] font-mono uppercase bg-indigo-950/80 text-indigo-400 border border-indigo-800/50 px-2 py-0.5 rounded">
              Internal Admin Console
            </span>
          </div>
        </div>

        <Link
          to="/"
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Site</span>
        </Link>
      </header>

      {/* Central Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-800/60 text-indigo-400 mb-3 shadow-inner">
              <ShieldAlert className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              SuperAdmin Authentication
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Elevated access portal for platform governance & SaaS infrastructure
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-700/40 text-[11px] text-amber-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Restricted Endpoint • Authorized Personnel Only</span>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSuperAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
                Administrator Identifier
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@quantromind.com"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-600 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
                Master Security Key / Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-xl pl-9 pr-10 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-600 font-medium font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition cursor-pointer mt-3"
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
          <p className="text-[11px] text-slate-500 text-center mt-6 border-t border-slate-800/80 pt-4 leading-relaxed">
            Access to this portal is monitored and audited. All login attempts are recorded for compliance and security forensics.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-[11px] text-slate-600 border-t border-slate-900 shrink-0">
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
