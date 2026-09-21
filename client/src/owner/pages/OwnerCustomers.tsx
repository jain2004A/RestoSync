import React, { useState, useMemo } from 'react';
import {
  Plus,
  X,
  Check,
  Award,
} from 'lucide-react';
import type { CreditCustomer } from '../types';

export const OwnerCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');

  const totalCustomers = customers.length;
  const totalLifetimeSales = useMemo(
    () => customers.reduce((acc, c) => acc + c.totalSpent, 0),
    [customers]
  );
  const avgSpendPerCustomer = (totalLifetimeSales / (totalCustomers || 1)).toFixed(0);

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
    );
  }, [customers, searchQuery]);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    const newCust: CreditCustomer = {
      id: `c-${Date.now()}`,
      name: formName,
      phone: formPhone,
      totalVisits: 1,
      totalSpent: 0,
      outstandingCreditDue: 0,
      lastOrderDate: 'Today',
      status: 'Clear',
    };

    setCustomers((prev) => [newCust, ...prev]);
    setShowAddModal(false);
    setFormName('');
    setFormPhone('');
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans text-slate-900">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-[#eedfc8] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Guest-Visit Customers</h1>
          <p className="text-[11px] text-slate-500">
            Diner profiles, visit frequencies, average order spend, and VIP loyalty records.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-blue-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Guest Profile</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Highlight Card: Rich Royal Blue & Navy Gradient */}
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white p-4 rounded-xl shadow-md border border-blue-800/40">
          <p className="text-[10px] uppercase font-black tracking-wider text-blue-200">Registered Guests</p>
          <p className="text-xl font-black mt-1 text-white">{totalCustomers}</p>
          <p className="text-[10px] text-amber-300 font-semibold mt-0.5">Active diners directory</p>
        </div>

        <div className="bg-white border border-[#eedfc8] p-4 rounded-xl shadow-2xs">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Lifetime Spend</p>
          <p className="text-xl font-black text-slate-900 mt-1">₹{totalLifetimeSales.toLocaleString('en-IN')}.00</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Accumulated dining revenue</p>
        </div>

        <div className="bg-white border border-[#eedfc8] p-4 rounded-xl shadow-2xs">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Average Spend Per Guest</p>
          <p className="text-xl font-black text-slate-900 mt-1">₹{Number(avgSpendPerCustomer).toLocaleString('en-IN')}.00</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Across all repeat visits</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-xl border border-[#eedfc8] shadow-2xs">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customer by name or phone number..."
          className="w-full px-3 py-1.5 bg-[#fbf7ee] border border-[#eedfc8] rounded text-xs focus:outline-none focus:border-blue-600"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-[#eedfc8] shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#fbf7ee] border-b border-[#eedfc8] text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4">Guest Name</th>
              <th className="py-2.5 px-4">Contact Phone</th>
              <th className="py-2.5 px-4 text-center">Total Visits</th>
              <th className="py-2.5 px-4 text-right">Lifetime Spent (₹)</th>
              <th className="py-2.5 px-4 text-right">Avg / Visit (₹)</th>
              <th className="py-2.5 px-4">Last Dining Visit</th>
              <th className="py-2.5 px-4 text-center">Tier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100/60">
            {filteredCustomers.map((c) => {
              const avg = (c.totalSpent / (c.totalVisits || 1)).toFixed(0);
              const tier = c.totalVisits >= 15 ? 'VIP Gold' : c.totalVisits >= 6 ? 'Silver' : 'Regular';

              return (
                <tr key={c.id} className="hover:bg-amber-50/40 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{c.phone}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">{c.totalVisits}</td>
                  <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                    ₹{c.totalSpent.toLocaleString('en-IN')}.00
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">
                    ₹{Number(avg).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">{c.lastOrderDate}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        tier === 'VIP Gold'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : tier === 'Silver'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300/60'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Award className="w-3 h-3" />
                      <span>{tier}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                  No guest customer records yet. Customers will appear here as orders are placed.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full border border-[#eedfc8] shadow-xl overflow-hidden animate-in fade-in">
            <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider">New Guest Registration</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">Guest Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">Phone Number (10-Digit) *</label>
                <input
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded cursor-pointer shadow-sm shadow-blue-500/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Register Guest</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
