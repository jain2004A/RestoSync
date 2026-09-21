import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Grid3X3,
  Utensils,
  BarChart2,
  FileText,
  DollarSign,
  Users,
  Package,
  Printer,
  UserCheck,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { clearAllAuthSessions } from '../../utils/authSession';

export const OwnerLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, tenant } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isTrial = Boolean(tenant?.isTrial);
  let trialDaysLeft = 0;
  if (isTrial && (tenant?.trialEndsAt || tenant?.subscriptionExpiresAt)) {
    const expires = new Date(tenant.trialEndsAt || tenant.subscriptionExpiresAt!).getTime();
    const now = Date.now();
    trialDaysLeft = Math.max(0, Math.ceil((expires - now) / (1000 * 60 * 60 * 24)));
  }

  const handleLogout = () => {
    clearAllAuthSessions();
    navigate('/login', { replace: true });
  };

  // Exactly matching the sidebar from Screenshot 2
  const navItems = [
    { label: 'Dashboard', path: '/owner/dashboard', icon: LayoutDashboard },
    { label: 'Tables & Floor', path: '/owner/tables', icon: Grid3X3, badge: 'Floor' },
    { label: 'Menu', path: '/owner/menu', icon: Utensils },
    { label: 'Sales', path: '/owner/sales', icon: BarChart2 },
    { label: 'Reports', path: '/owner/reports', icon: FileText },
    { label: 'Expenses', path: '/owner/expenses', icon: DollarSign },
    { label: 'Employee Login', path: '/owner/employees', icon: Users, badge: 'Staff' },
    { label: 'Inventory', path: '/owner/inventory', icon: Package, badge: 'Stock' },
    { label: 'Bill & Receipt', path: '/owner/receipt', icon: Printer },
    { label: 'Guest-visit customers', path: '/owner/customers', icon: UserCheck },
    { label: 'Credit Customers', path: '/owner/credit', icon: CreditCard },
    { label: 'Plan & Billing', path: '/owner/upgrade', icon: Sparkles, badge: 'Upgrade' },
    { label: 'Settings', path: '/owner/settings', icon: Settings },
  ];

  // Dynamic feature gating based on tenant's plan features
  const filteredNavItems = navItems.filter((item) => {
    if (item.path === '/owner/inventory') {
      return tenant?.features?.enableRecipeInventory !== false;
    }
    if (item.path === '/owner/credit') {
      return tenant?.features?.enableKhataBook !== false;
    }
    return true;
  });

  return (
    <div className="h-screen h-[100dvh] bg-[#faf7ee] flex flex-col overflow-hidden font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Bar (Clean Executive Warm Cream & Royal Blue Header) */}
      <header className="h-14 shrink-0 bg-[#fdfbf7]/95 backdrop-blur-md border-b border-[#eedfc8] sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1.5 rounded-md text-slate-700 hover:bg-[#f3ead7] cursor-pointer"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Restaurant Identity Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center tracking-wider shadow-xs uppercase">
              {(tenant?.businessName || tenant?.name || 'QB')
                .split(' ')
                .filter(Boolean)
                .map((w: string) => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 tracking-tight uppercase">
                  {tenant?.businessName || tenant?.name || 'Restaurant Portal'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                  Owner Portal
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Bar Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Trial / Subscription Status & Upgrade Button */}
          {isTrial ? (
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                trialDaysLeft > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}>
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>{trialDaysLeft > 0 ? `Free Trial: ${trialDaysLeft}d left` : 'Trial Expired'}</span>
              </span>
              <button
                onClick={() => navigate('/owner/upgrade')}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm shadow-blue-500/20 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upgrade Plan</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/owner/upgrade')}
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{tenant?.planName || 'Standard'} • Upgrade</span>
            </button>
          )}

          {/* Quick Switch to POS Billing Desk */}
          <button
            onClick={() => navigate('/billing')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition shadow-sm shadow-blue-500/20 cursor-pointer"
            title="Open Live POS Billing Desk"
          >
            <Store className="w-3.5 h-3.5 text-white" />
            <span>Launch POS Billing</span>
          </button>

          {/* Quick Switch to Tables Floor Matrix */}
          <button
            onClick={() => navigate('/tables')}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-[#f5edd9] hover:bg-[#eee3c8] active:bg-[#e4d7b8] border border-[#eedfc8] rounded-lg transition cursor-pointer"
            title="Open Live Floor Plan Matrix"
          >
            <Grid3X3 className="w-3.5 h-3.5 text-slate-700" />
            <span>Floor Matrix</span>
          </button>

          <div className="h-5 w-px bg-[#eedfc8] hidden sm:block" />

          {/* User Profile info */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-900">{user?.fullName || user?.username || 'Restaurant Owner'}</p>
              <p className="text-[10px] text-slate-500">{user?.email || 'owner@restaurant.com'}</p>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-[#eedfc8] rounded-lg transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Stable Fixed Executive Sidebar */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-20 w-60 shrink-0 bg-[#fbf7ee] border-r border-[#eedfc8] pt-14 md:pt-0 transform transition-transform duration-200 ease-in-out md:translate-x-0 flex flex-col justify-between overflow-hidden ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-3 space-y-1 overflow-y-auto flex-1">
            <div className="px-3 py-2 text-[10px] font-black text-amber-900/60 uppercase tracking-wider">
              Management Modules
            </div>

            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-bold'
                        : 'text-slate-700 hover:bg-[#f3ead7] hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isActive ? 'bg-white/20 text-white' : 'bg-[#eedfc8]/70 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Quick POS Terminal Shortcut in Sidebar */}
          <div className="p-3 border-t border-[#eedfc8] bg-[#f7f0df]/70 shrink-0">
            <button
              onClick={() => {
                setSidebarOpen(false);
                navigate('/billing');
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-blue-800 bg-blue-50/90 hover:bg-blue-100 border border-blue-200 transition cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4 text-blue-600" />
                <span>Launch POS Desk</span>
              </div>
              <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded">
                POS
              </span>
            </button>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-[#eedfc8] bg-[#f2e8d4]/80 text-center shrink-0">
            <p className="text-[11px] font-bold text-slate-800">QuantroBill POS SaaS</p>
            <p className="text-[10px] text-blue-700 font-bold">
              {tenant?.planName || 'Enterprise Tier'}
            </p>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-10 md:hidden"
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#faf7ee]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
