import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Package,
  CreditCard,
  Sliders,
  Receipt,
  ShieldCheck,
  Users,
  Megaphone,
  Tag,
  BarChart3,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Search,
  Bell,
  HelpCircle,
  Video,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { clearAllAuthSessions } from '../../utils/authSession';

export const SuperAdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const handleLogout = () => {
    clearAllAuthSessions();
    navigate('/login', { replace: true });
  };

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    // Navigate to tenant search or global search destination
    navigate(`/superadmin/tenants?search=${encodeURIComponent(globalSearch.trim())}`);
  };

  const navItems = [
    { label: 'Overview', path: '/superadmin/dashboard', icon: LayoutDashboard },
    { label: 'Demo Enquiries', path: '/superadmin/enquiries', icon: Video },
    { label: 'Restaurants', path: '/superadmin/tenants', icon: Building2 },
    { label: 'Registered Owners', path: '/superadmin/owner-activity', icon: UserCheck },
    { label: 'Plans Catalog', path: '/superadmin/plans-catalog', icon: Package },
    { label: 'Tenant Plans', path: '/superadmin/subscriptions', icon: CreditCard },
    { label: 'Feature Toggles', path: '/superadmin/features', icon: Sliders },
    { label: 'Billing & Invoices', path: '/superadmin/billing', icon: Receipt },
    { label: 'Audit Trail', path: '/superadmin/audit-logs', icon: ShieldCheck },
    { label: 'Admin Team', path: '/superadmin/team', icon: Users },
    { label: 'Announcements', path: '/superadmin/announcements', icon: Megaphone },
    { label: 'Coupons', path: '/superadmin/coupons', icon: Tag },
    { label: 'Analytics', path: '/superadmin/analytics', icon: BarChart3 },
    { label: 'System Health', path: '/superadmin/system-health', icon: Activity },
    { label: 'Settings', path: '/superadmin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#faf7ee] flex flex-col font-sans text-slate-800 antialiased">
      {/* 1. TOP HEADER BAR */}
      <header className="bg-[#fdfbf7]/95 backdrop-blur-md border-b border-[#eedfc8] sticky top-0 z-40 px-2 sm:px-4 h-16 flex items-center justify-between gap-4 shadow-xs">
        {/* Left: Brand + Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-[#f3ead7] transition focus:outline-hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            onClick={() => navigate('/superadmin/dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base tracking-tight">RestoSync</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100/70 text-amber-900 border border-amber-300/60 uppercase tracking-wider">
                  SuperAdmin
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden sm:block font-medium">Enterprise Platform Control</p>
            </div>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <form
          onSubmit={handleGlobalSearchSubmit}
          className="hidden md:flex items-center flex-1 max-w-md mx-4"
        >
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search tenants, invoices, audit logs..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#fbf7ee] hover:bg-white focus:bg-white border border-[#eedfc8] rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
            />
          </div>
        </form>

        {/* Right: Actions, Notification, Profile, Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a
            href="/demo.html"
            target="_blank"
            rel="noreferrer"
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200 shadow-2xs"
            title="Interactive Demo"
          >
            <span>🌐</span>
            <span>Demo Portal</span>
            <ExternalLink className="w-3 h-3 text-blue-500" />
          </a>

          {/* Notification Bell */}
          <button
            onClick={() => navigate('/superadmin/announcements')}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-[#f3ead7] rounded-lg transition cursor-pointer"
            title="Platform Announcements & Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
          </button>

          {/* Quick Help */}
          <button
            onClick={() => navigate('/superadmin/system-health')}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-[#f3ead7] rounded-lg transition cursor-pointer"
            title="System Diagnostics"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <div className="h-6 w-px bg-[#eedfc8] mx-1 hidden sm:block"></div>

          {/* Admin User Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {user?.fullName || user?.username || 'SuperAdmin'}
              </p>
              <p className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]">
                {user?.email || 'admin@quantromind.com'}
              </p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer border border-rose-200 shadow-2xs ml-1"
            title="Sign Out of SuperAdmin"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* 2. HORIZONTAL SUB-NAV ROW (Matching Reference Screenshot Top Tabs) */}
      <nav className="bg-[#fdfbf7]/90 backdrop-blur-xs border-b border-[#eedfc8] px-2 sm:px-4 sticky top-16 z-30 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/superadmin/dashboard' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-700 hover:bg-[#f3ead7] hover:text-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* 3. MOBILE SLIDE-OUT DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-[#fdfbf7] border-r border-[#eedfc8] shadow-xl flex flex-col justify-between z-50">
            <div>
              <div className="h-16 px-6 border-b border-[#eedfc8] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="font-extrabold text-slate-900 text-base">RestoSync</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-[#f3ead7]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path !== '/superadmin/dashboard' && location.pathname.startsWith(item.path));
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs font-bold'
                          : 'text-slate-700 hover:bg-[#f3ead7] hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </NavLink>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-[#eedfc8] bg-[#fbf7ee] text-center">
              <p className="text-xs font-bold text-slate-700">RestoSync SaaS v2.0</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Isolated Security Boundary</p>
            </div>
          </aside>
        </div>
      )}

      {/* 4. MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 w-full px-2 sm:px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
};
