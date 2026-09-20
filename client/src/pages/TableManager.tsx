import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid3X3,
  Plus,
  Users,
  CheckCircle2,
  ArrowLeft,
  Eye,
  Printer,
  Receipt,
  X,
  Clock,
  ExternalLink,
  Trash2,
  Check,
  GitMerge,
  ArrowRightLeft,
  DollarSign,
  Activity,
  Armchair,
  Flame,
  UtensilsCrossed,
} from 'lucide-react';
import type { OrderItem } from '../types';
import { BillPrintModal } from '../components/modals/BillPrintModal';
import { TableMergeModal } from '../components/modals/TableMergeModal';
import { TableShiftModal } from '../components/modals/TableShiftModal';
import { useReceiptSettingsStore } from '../store/receiptSettingsStore';
import { useTableStore, type TableData } from '../store/tableStore';
import { useAuthStore, isWaiterOnly, canVoidBills } from '../store/authStore';
import { useDraftCartStore } from '../store/draftCartStore';

export const TableManager: React.FC = () => {
  const navigate = useNavigate();
  const rs = useReceiptSettingsStore();
  const currencySymbol = rs.currencySymbol || '₹';

  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || 'Cashier';
  const isWaiter = isWaiterOnly(userRole);
  const canAddTable = userRole === 'Owner' || userRole === 'Manager';
  const canVoidTable = canVoidBills(userRole);

  const { tables, vacateTable, createTable, getSections, markTableServed } = useTableStore();
  const drafts = useDraftCartStore((state) => state.drafts);

  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showReadyOrdersModal, setShowReadyOrdersModal] = useState<boolean>(false);
  const [newTableNumber, setNewTableNumber] = useState<string>('');
  const [newSection, setNewSection] = useState<string>('Main Hall');
  const [newCapacity, setNewCapacity] = useState<number>(4);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals for Table Bill Actions
  const [selectedTableForBill, setSelectedTableForBill] = useState<TableData | null>(null);
  const [selectedTableForPrint, setSelectedTableForPrint] = useState<TableData | null>(null);

  // Table Operations: Merge & Shift
  const [showMergeModal, setShowMergeModal] = useState<boolean>(false);
  const [mergeSourceTable, setMergeSourceTable] = useState<string | undefined>(undefined);
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);
  const [shiftSourceTable, setShiftSourceTable] = useState<string | undefined>(undefined);

  const dynamicSections: string[] = useMemo(() => {
    const list = getSections();
    return ['All', ...list];
  }, [getSections, tables]);

  const filteredTables = tables.filter(
    (t) => selectedSection === 'All' || t.section === selectedSection
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to compute subtotal and tax amounts for a table
  const getTableBillData = (table: TableData) => {
    const items: OrderItem[] = (table.items && table.items.length > 0) ? table.items : [
      {
        menuItemId: `m-${table.id}`,
        name: `Dine-In Order (${table.tableNumber})`,
        quantity: 1,
        unitPrice: table.orderTotal || 0,
        totalPrice: table.orderTotal || 0,
        isVeg: true,
      },
    ];

    const grandTotal = table.orderTotal || items.reduce((acc, i) => acc + i.totalPrice, 0);
    // Standard 5% GST (2.5% CGST + 2.5% SGST)
    const subTotal = Number((grandTotal / 1.05).toFixed(2));
    const totalTax = Number((grandTotal - subTotal).toFixed(2));
    const cgst = Number((totalTax / 2).toFixed(2));
    const sgst = Number((totalTax / 2).toFixed(2));
    const billNumber = table.billNumber || `BILL-${table.tableNumber.replace(/\D/g, '') || '101'}`;
    const kotNumber = table.kotNumber || `KOT-${table.tableNumber.replace(/\D/g, '') || '201'}`;

    return {
      items,
      subTotal,
      cgst,
      sgst,
      grandTotal,
      billNumber,
      kotNumber,
    };
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) return;

    const res = await createTable({
      tableNumber: newTableNumber.trim().toUpperCase(),
      section: newSection,
      capacity: Number(newCapacity),
    });

    if (res.success) {
      setNewTableNumber('');
      setShowAddModal(false);
      showToast(`Table ${newTableNumber.trim().toUpperCase()} added successfully!`);
    } else {
      showToast(res.message || 'Failed to add table.');
    }
  };

  const handleTableClick = (table: TableData) => {
    if (table.isOccupied) {
      setSelectedTableForBill(table);
    } else {
      navigate(`/billing?table=${table.tableNumber}`);
    }
  };

  const handleVacateTable = (tableNumber: string) => {
    vacateTable(tableNumber);
    setSelectedTableForBill(null);
    showToast(`Table ${tableNumber} has been vacated and marked Vacant!`);
  };

  // Food Ready Orders (Kitchen bump tracking)
  const readyTables = useMemo(() => tables.filter((t) => t.foodReady), [tables]);
  const readyCount = readyTables.length;

  const handleServeTable = async (tableNum: string, orderId?: string) => {
    const success = await markTableServed(tableNum, orderId);
    if (success) {
      showToast(`🍽️ Order for Table ${tableNum} marked as Served!`);
    } else {
      showToast(`⚠️ Failed to mark Table ${tableNum} as served.`);
    }
  };

  // Compute Metrics for KPI Cards (Reference CRM Style)
  const occupiedCount = tables.filter((t) => t.isOccupied).length;
  const vacantCount = tables.length - occupiedCount;
  const totalActiveSales = tables.reduce((acc, t) => acc + (t.orderTotal || 0), 0);
  const totalSeats = tables.reduce((acc, t) => acc + (t.capacity || 0), 0);

  return (
    <div className="flex-1 bg-[#f8fafc] overflow-y-auto p-4 sm:p-6 select-none relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl z-50 text-xs font-semibold flex items-center space-x-2 border border-slate-700 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 mb-5 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Grid3X3 className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Table & Dine-In Floor Plan
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time floor occupancy, KOT tracking, and table shifting • Click any table to open or view bill
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* View Ready Orders Button (If any) */}
          {readyCount > 0 && (
            <button
              onClick={() => setShowReadyOrdersModal(true)}
              className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black px-3.5 py-2 rounded-lg text-xs flex items-center space-x-1.5 touch-btn shadow-md animate-pulse cursor-pointer"
            >
              <Flame className="w-4 h-4" />
              <span>Ready Food ({readyCount})</span>
            </button>
          )}

          <button
            onClick={() => {
              setMergeSourceTable(undefined);
              setShowMergeModal(true);
            }}
            className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 touch-btn shadow-2xs transition"
            title="Combine 2 Tables into One"
          >
            <GitMerge className="w-4 h-4 text-amber-600" />
            <span>Merge Tables</span>
          </button>

          <button
            onClick={() => {
              const firstOccupied = tables.find((t) => t.isOccupied);
              if (firstOccupied) {
                setShiftSourceTable(firstOccupied.tableNumber);
                setShowShiftModal(true);
              } else {
                showToast('No tables are currently occupied to shift.');
              }
            }}
            className="bg-sky-50 hover:bg-sky-100 text-blue-700 border border-sky-200 font-bold px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 touch-btn shadow-2xs transition"
            title="Shift Table Order to Vacant Table"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-600" />
            <span>Shift Table</span>
          </button>

          {canAddTable && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold px-3.5 py-2 rounded-lg text-xs flex items-center space-x-1.5 touch-btn shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Table</span>
            </button>
          )}
          <button
            onClick={() => navigate('/billing')}
            className="flex items-center space-x-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 touch-btn shadow-2xs transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>POS Billing</span>
          </button>
        </div>
      </div>

      {/* Ready Orders Alert Banner (High-priority real-time alert for Waiters) */}
      {readyCount > 0 && (
        <div className="mb-5 bg-linear-to-r from-rose-500 via-amber-500 to-rose-600 text-white rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner">
              🔥
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm uppercase tracking-wide">Food Ready in Kitchen!</span>
                <span className="bg-white text-rose-600 font-extrabold text-xs px-2 py-0.5 rounded-full shadow-xs">
                  {readyCount} {readyCount === 1 ? 'Table' : 'Tables'}
                </span>
              </div>
              <p className="text-xs text-white/90 font-medium mt-0.5">
                Kitchen chef has finished preparing dishes for: <strong>{readyTables.map((t) => t.tableNumber).join(', ')}</strong>. Pick up and serve to guests.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowReadyOrdersModal(true)}
            className="bg-white text-rose-700 hover:bg-rose-50 active:bg-rose-100 font-black text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center space-x-1.5 transition touch-btn cursor-pointer"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>View & Serve Food</span>
          </button>
        </div>
      )}

      {/* 4 Executive KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Total Active Sales for Cashier/Owner, or Ready to Serve for Waiter */}
        {!isWaiter ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Table Sales</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">₹{totalActiveSales}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">From {occupiedCount} running bills</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        ) : (
          <div
            onClick={() => readyCount > 0 && setShowReadyOrdersModal(true)}
            className={`bg-white border rounded-2xl p-4 shadow-2xs flex items-center justify-between transition cursor-pointer ${
              readyCount > 0
                ? 'border-rose-300 ring-2 ring-rose-400/40 hover:border-rose-400 bg-rose-50/40'
                : 'border-slate-200'
            }`}
          >
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ready to Serve</div>
              <div className="text-2xl font-black text-rose-600 mt-1">{readyCount} Tables</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                {readyCount > 0 ? '🔥 Tap to view & serve' : 'All food served to tables'}
              </div>
            </div>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                readyCount > 0 ? 'bg-rose-100 text-rose-600 animate-bounce' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Flame className="w-5 h-5" />
            </div>
          </div>
        )}

        {/* Card 2: Occupied Tables (Royal Blue Accent) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Occupied Tables</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{occupiedCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">In Dining Rooms</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Vacant Tables (Amber Accent) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vacant Tables</div>
            <div className="text-2xl font-black text-amber-500 mt-1">{vacantCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Ready for guests</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Armchair className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total Seating Capacity (Purple Accent) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Floor Capacity</div>
            <div className="text-2xl font-black text-purple-600 mt-1">{totalSeats}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Across {tables.length} tables</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Dynamic Section Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {dynamicSections.map((sec) => (
          <button
            key={sec}
            onClick={() => setSelectedSection(sec)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition touch-btn ${
              selectedSection === sec
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Visual Tables Floor Grid (Clean Blue Occupied State, Amber Draft State, Emerald Vacant State) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredTables.map((table) => {
          const tKey = `TABLE:${table.tableNumber.trim().toUpperCase()}`;
          const draft = drafts[tKey];
          const hasDraft = Boolean(draft && draft.items && draft.items.length > 0);
          const draftItemCount = draft?.items?.reduce((s, i) => s + i.quantity, 0) || 0;
          const draftTotal = draft?.items?.reduce((s, i) => s + i.totalPrice, 0) || 0;

          return (
            <div
              key={table.id}
              onClick={() => handleTableClick(table)}
              className={`rounded-2xl p-4 border transition-all cursor-pointer shadow-2xs hover:shadow-md touch-btn flex flex-col justify-between h-40 group ${
                table.foodReady
                  ? 'bg-rose-50/95 border-rose-300 ring-2 ring-rose-400/50 shadow-md text-rose-950'
                  : table.isOccupied
                  ? 'bg-blue-50/90 border-blue-200 text-blue-950 hover:border-blue-400'
                  : hasDraft
                  ? 'bg-amber-50/80 border-amber-300 hover:border-amber-400 text-amber-950'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-black tracking-tight">{table.tableNumber}</h3>
                    <p className="text-[11px] opacity-70 font-medium">{table.section}</p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {table.foodReady ? (
                      <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-xs animate-pulse">
                        <span>🔥 Ready</span>
                      </span>
                    ) : table.isOccupied && table.servedAt ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 border border-emerald-200">
                        <Check className="w-2.5 h-2.5" />
                        <span>Served</span>
                      </span>
                    ) : (
                      <span
                        className={`w-3 h-3 rounded-full ${
                          table.isOccupied
                            ? 'bg-blue-600 animate-pulse'
                            : hasDraft
                            ? 'bg-amber-500 ring-2 ring-amber-200'
                            : 'bg-emerald-500'
                        }`}
                        title={
                          table.isOccupied
                            ? 'Occupied (Tap to View Bill/Menu)'
                            : hasDraft
                            ? `Draft Active (${draftItemCount} items - Tap to Resume)`
                            : 'Vacant (Tap to Order)'
                        }
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1 text-xs opacity-80 mt-2 font-medium">
                  <Users className="w-3.5 h-3.5" />
                  <span>{table.capacity} Seats</span>
                </div>
              </div>

              {/* Bottom State Pill */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                {table.foodReady ? (
                  <>
                    <div>
                      <span className="text-xs font-black text-rose-700">
                        {currencySymbol}{table.orderTotal || 0}
                      </span>
                      <span className="text-[10px] text-rose-600 font-bold block">🔥 Food Ready</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        title="Mark as Served to Table"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await handleServeTable(table.tableNumber, table.orderId);
                        }}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-black flex items-center space-x-1 shadow-xs transition touch-btn cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Serve</span>
                      </button>
                      <button
                        type="button"
                        title="View Bill Details"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTableForBill(table);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 shadow-2xs transition touch-btn cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                ) : table.isOccupied ? (
                  <>
                    <div>
                      <span className="text-xs font-black text-blue-800">
                        {currencySymbol}{table.orderTotal || 0}
                      </span>
                      <span className="text-[10px] text-blue-600 font-semibold block">
                        {table.servedAt ? `Served • ${table.servedAt}` : 'Running KOT'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        title="View Bill Details"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTableForBill(table);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 shadow-2xs transition touch-btn"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {!isWaiter && (
                        <button
                          type="button"
                          title="Print Bill"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTableForPrint(table);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition touch-btn"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canVoidTable && (
                        <button
                          type="button"
                          title="Empty / Vacate Table"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVacateTable(table.tableNumber);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 shadow-2xs transition touch-btn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </>
                ) : hasDraft ? (
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <span className="text-xs font-black text-amber-900">
                        {currencySymbol}{draftTotal}
                      </span>
                      <span className="text-[10px] text-amber-700 font-semibold block">
                        Draft ({draftItemCount} items)
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-950 px-2 py-0.5 rounded shadow-2xs">
                        Resume
                      </span>
                      <button
                        type="button"
                        title="Clear Draft"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Clear draft for Table ${table.tableNumber}?`)) {
                            useDraftCartStore.getState().clearDraft(tKey);
                            showToast(`Draft cleared for Table ${table.tableNumber}.`);
                          }
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-rose-50 text-rose-600 border border-amber-200 shadow-2xs transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="text-emerald-600 flex items-center text-[11px] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Vacant (Tap to Order)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show Current Bill & Ordered Menu Modal */}
      {selectedTableForBill && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 text-slate-900 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                  <Receipt className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-black text-base tracking-tight text-slate-900">
                      Table {selectedTableForBill.tableNumber}
                    </h2>
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Occupied
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedTableForBill.section} • {selectedTableForBill.capacity} Seats
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTableForBill(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors touch-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Meta Row */}
            <div className="bg-slate-100/70 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700">
              <div>
                <span className="text-slate-500">Bill No:</span>{' '}
                <strong className="text-slate-900">
                  {getTableBillData(selectedTableForBill).billNumber}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">KOT:</span>{' '}
                <strong className="text-slate-900">
                  {getTableBillData(selectedTableForBill).kotNumber}
                </strong>
              </div>
              <div className="flex items-center space-x-1 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{selectedTableForBill.orderTime || 'Active'}</span>
              </div>
            </div>

            {/* Ordered Items List (Menu Items of this Table) */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {/* Ready / Serving Status Notice */}
              {selectedTableForBill.foodReady ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between animate-pulse">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xl">🔥</span>
                    <div>
                      <span className="text-xs font-black text-rose-900 block">Food Ready in Kitchen!</span>
                      <span className="text-[11px] text-rose-700">Dishes are ready to be picked up and served.</span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await handleServeTable(selectedTableForBill.tableNumber, selectedTableForBill.orderId);
                      setSelectedTableForBill(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 shadow-xs touch-btn shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Serve</span>
                  </button>
                </div>
              ) : selectedTableForBill.servedAt ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Food Served</strong> to table at {selectedTableForBill.servedAt}</span>
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ordered Menu Items ({getTableBillData(selectedTableForBill).items.length})
                </h4>
                <span className="text-[11px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Running KOT
                </span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                {getTableBillData(selectedTableForBill).items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white flex items-center justify-between hover:bg-slate-50 text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          item.isVeg
                            ? 'bg-emerald-500 ring-2 ring-emerald-100'
                            : 'bg-rose-500 ring-2 ring-rose-100'
                        }`}
                        title={item.isVeg ? 'Veg' : 'Non-Veg'}
                      />
                      <div>
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {currencySymbol}{item.unitPrice} × {item.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">
                      {currencySymbol}{item.totalPrice}
                    </span>
                  </div>
                ))}
              </div>

              {/* Tax & Totals Calculation Box */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Item Subtotal</span>
                  <span>
                    {currencySymbol}
                    {getTableBillData(selectedTableForBill).subTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (2.5%)</span>
                  <span>
                    {currencySymbol}
                    {getTableBillData(selectedTableForBill).cgst.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (2.5%)</span>
                  <span>
                    {currencySymbol}
                    {getTableBillData(selectedTableForBill).sgst.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Current Grand Total</span>
                  <span className="text-blue-700 text-base">
                    {currencySymbol}
                    {getTableBillData(selectedTableForBill).grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center gap-2">
              {selectedTableForBill.foodReady && (
                <button
                  onClick={async () => {
                    await handleServeTable(selectedTableForBill.tableNumber, selectedTableForBill.orderId);
                    setSelectedTableForBill(null);
                  }}
                  className="flex-1 min-w-[120px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm touch-btn transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark as Served</span>
                </button>
              )}

              {!isWaiter && (
                <button
                  onClick={() => {
                    const t = selectedTableForBill;
                    setSelectedTableForBill(null);
                    setSelectedTableForPrint(t);
                  }}
                  className="flex-1 min-w-[100px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm touch-btn transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Bill</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShiftSourceTable(selectedTableForBill.tableNumber);
                  setSelectedTableForBill(null);
                  setShowShiftModal(true);
                }}
                className="bg-sky-50 hover:bg-sky-100 text-blue-700 border border-sky-200 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 touch-btn transition"
                title="Shift to Another Table"
              >
                <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                <span>Shift</span>
              </button>

              <button
                onClick={() => {
                  setMergeSourceTable(selectedTableForBill.tableNumber);
                  setSelectedTableForBill(null);
                  setShowMergeModal(true);
                }}
                className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 touch-btn transition"
                title="Merge Table"
              >
                <GitMerge className="w-4 h-4 text-amber-600" />
                <span>Merge</span>
              </button>

              <button
                onClick={() => {
                  navigate(`/billing?table=${selectedTableForBill.tableNumber}`);
                }}
                className="flex-1 min-w-[100px] bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm touch-btn transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{isWaiter ? 'Punch Items / KOT' : 'Open in POS'}</span>
              </button>

              {canVoidTable && (
                <button
                  onClick={() => handleVacateTable(selectedTableForBill.tableNumber)}
                  className="bg-white hover:bg-rose-50 text-rose-600 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 touch-btn border border-rose-200 transition"
                  title="Table Empty Karein / Vacant Banayein"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Empty</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add New Table Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden p-6 animate-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900">Add New Dining Table</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Table Number / Identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. T-13, VIP-1, P-4"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-bold uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Floor Section
                </label>
                <select
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold"
                >
                  {dynamicSections.filter((s: string) => s !== 'All').map((sec: string) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Seating Capacity (Pax)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-bold"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Print Receipt Modal */}
      {selectedTableForPrint && (
        <BillPrintModal
          isOpen={!!selectedTableForPrint}
          onClose={() => setSelectedTableForPrint(null)}
          orderType="DineIn"
          items={getTableBillData(selectedTableForPrint).items}
          subTotal={getTableBillData(selectedTableForPrint).subTotal}
          cgst={getTableBillData(selectedTableForPrint).cgst}
          sgst={getTableBillData(selectedTableForPrint).sgst}
          grandTotal={getTableBillData(selectedTableForPrint).grandTotal}
          tableNumber={selectedTableForPrint.tableNumber}
          paymentMode="NotPaid"
        />
      )}

      {/* Table Merge Modal */}
      {showMergeModal && (
        <TableMergeModal
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          initialSourceTableNumber={mergeSourceTable}
          onMergeSuccess={(targetTable) => {
            showToast(`Tables merged into Table ${targetTable}!`);
          }}
        />
      )}

      {/* Table Shift Modal */}
      {showShiftModal && (
        <TableShiftModal
          isOpen={showShiftModal}
          onClose={() => setShowShiftModal(false)}
          sourceTableNumber={shiftSourceTable || ''}
          onShiftSuccess={(newTable) => {
            showToast(`Order shifted to Table ${newTable}!`);
          }}
        />
      )}

      {/* Ready Orders Modal (Live kitchen pickup list for Waiters) */}
      {showReadyOrdersModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-rose-500 to-amber-500 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-lg">
                  🔥
                </span>
                <div>
                  <h2 className="font-black text-base tracking-tight text-white">
                    Kitchen Ready Orders ({readyCount})
                  </h2>
                  <p className="text-xs text-white/90">
                    Dishes prepared by kitchen chefs • Ready to be served to tables
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReadyOrdersModal(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors touch-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ready List */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
              {readyTables.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-4xl block mb-2">🍽️</span>
                  <p className="text-sm font-bold text-slate-700">No Food Waiting in Kitchen</p>
                  <p className="text-xs text-slate-500 mt-1">
                    All prepared orders have been served to guests.
                  </p>
                </div>
              ) : (
                readyTables.map((rt) => {
                  const billData = getTableBillData(rt);
                  return (
                    <div
                      key={rt.id}
                      className="bg-white rounded-xl border border-rose-200 p-4 shadow-xs space-y-3 hover:border-rose-300 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-base text-slate-900">
                              Table {rt.tableNumber}
                            </span>
                            <span className="bg-rose-100 text-rose-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-rose-200">
                              🔥 Food Ready
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            {rt.section} • {billData.kotNumber} • {rt.orderTime || 'Active'}
                          </p>
                        </div>

                        <button
                          onClick={async () => {
                            await handleServeTable(rt.tableNumber, rt.orderId);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm touch-btn transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark Served</span>
                        </button>
                      </div>

                      {/* Items */}
                      <div className="divide-y divide-slate-100 bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-xs">
                        {billData.items.map((it, idx) => (
                          <div key={idx} className="py-1.5 flex items-center justify-between first:pt-0 last:pb-0">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  it.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              <span className="font-bold text-slate-800">{it.name}</span>
                              {it.itemNote && (
                                <span className="text-[10px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded">
                                  {it.itemNote}
                                </span>
                              )}
                            </div>
                            <span className="font-black text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              × {it.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {readyCount} table(s) pending serving
              </span>
              <button
                onClick={() => setShowReadyOrdersModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs touch-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
