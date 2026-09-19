import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';
import {
  Video,
  Search,
  Clock,
  Phone,
  Mail,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  Edit3,
  MapPin,
  Store,
} from 'lucide-react';

export interface DemoEnquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  city?: string;
  outletsCount?: string;
  message: string;
  interestedProduct: string;
  formType: string;
  status: 'New' | 'Contacted' | 'Demo Scheduled' | 'Converted' | 'Closed' | string;
  demoLink?: string;
  scheduledAt?: string;
  notes?: string;
  assignedTo?: string;
  createdAt: string;
}

interface SummaryCounts {
  total: number;
  newCount: number;
  contactedCount: number;
  scheduledCount: number;
  convertedCount: number;
  closedCount: number;
}

export const DemoEnquiriesPage: React.FC = () => {
  const [enquiries, setEnquiries] = useState<DemoEnquiry[]>([]);
  const [summary, setSummary] = useState<SummaryCounts>({
    total: 0,
    newCount: 0,
    contactedCount: 0,
    scheduledCount: 0,
    convertedCount: 0,
    closedCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal State
  const [selectedEnquiry, setSelectedEnquiry] = useState<DemoEnquiry | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [modalDemoLink, setModalDemoLink] = useState('');
  const [modalScheduledAt, setModalScheduledAt] = useState('');
  const [modalStatus, setModalStatus] = useState('New');
  const [modalNotes, setModalNotes] = useState('');
  const [modalAssignedTo, setModalAssignedTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize: 10,
        search: search.trim() || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
      };

      const res = await apiClient.get<{
        success: boolean;
        data: DemoEnquiry[];
        summary: SummaryCounts;
        pagination: { currentPage: number; totalPages: number; totalItems: number };
      }>('/superadmin/enquiries', { params });

      if (res.data?.success) {
        setEnquiries(res.data.data || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalItems(res.data.pagination.totalItems || 0);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch demo enquiries', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEnquiries();
  };

  const handleOpenEdit = (enquiry: DemoEnquiry) => {
    setSelectedEnquiry(enquiry);
    setModalDemoLink(enquiry.demoLink || '');
    setModalScheduledAt(
      enquiry.scheduledAt ? new Date(enquiry.scheduledAt).toISOString().slice(0, 16) : ''
    );
    setModalStatus(enquiry.status || 'New');
    setModalNotes(enquiry.notes || '');
    setModalAssignedTo(enquiry.assignedTo || '');
    setEditModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry) return;
    setSaving(true);
    setFeedbackMsg(null);

    try {
      const payload: any = {
        status: modalStatus,
        demoLink: modalDemoLink,
        notes: modalNotes,
        assignedTo: modalAssignedTo,
        scheduledAt: modalScheduledAt ? new Date(modalScheduledAt).toISOString() : null,
        clearScheduledAt: !modalScheduledAt,
      };

      const res = await apiClient.put<{ success: boolean; message: string; data: DemoEnquiry }>(
        `/superadmin/enquiries/${selectedEnquiry.id}`,
        payload
      );

      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Demo session updated successfully!' });
        setTimeout(() => {
          setEditModalOpen(false);
          setFeedbackMsg(null);
          fetchEnquiries();
        }, 800);
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update enquiry.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this demo enquiry?')) return;
    try {
      await apiClient.delete(`/superadmin/enquiries/${id}`);
      fetchEnquiries();
    } catch (err) {
      alert('Failed to delete enquiry');
    }
  };

  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            New Lead
          </span>
        );
      case 'Contacted':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Contacted
          </span>
        );
      case 'Demo Scheduled':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
            <Video className="w-3 h-3 text-purple-600" />
            Demo Scheduled
          </span>
        );
      case 'Converted':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Converted
          </span>
        );
      case 'Closed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Closed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-3 font-sans">
      {/* Header Bar - Full Width & Space Optimized */}
      <div className="bg-white border border-slate-200/80 rounded-xl px-4 py-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Demo Enquiries & Session Links
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              SaaS Pipeline
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Prospect demo requests from landing pages • Assign meeting links (Google Meet, Zoom, Live Demo) & track pipeline conversions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/demo.html"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Interactive Demo Screen"
          >
            <span>🌐</span>
            <span>Live Demo Portal</span>
            <ExternalLink className="w-3 h-3 text-indigo-500" />
          </a>
          <button
            onClick={() => fetchEnquiries()}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards - Full Width & Space Optimized */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Inquiries</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{summary.total}</p>
            <span className="text-[10px] text-slate-400">All-time public requests</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Leads</p>
            <p className="text-xl font-black text-amber-600 mt-0.5">{summary.newCount}</p>
            <span className="text-[10px] text-slate-400">Pending initial contact</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Demo Scheduled</p>
            <p className="text-xl font-black text-purple-700 mt-0.5">{summary.scheduledCount}</p>
            <span className="text-[10px] text-slate-400">Active demo meetings</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Video className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Converted</p>
            <p className="text-xl font-black text-emerald-700 mt-0.5">{summary.convertedCount}</p>
            <span className="text-[10px] text-slate-400">Signed up as restaurant</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar - Full Width & Space Optimized */}
      <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, business, city, phone..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
          />
        </form>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['All', 'New', 'Contacted', 'Demo Scheduled', 'Converted', 'Closed'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/70'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Enquiries List - Full Width */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs overflow-hidden w-full">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs font-medium">Loading demo inquiries...</span>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Video className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">No Demo Enquiries Found</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Public inquiries submitted via the website and contact forms will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3.5 w-[22%]">Prospect & Restaurant</th>
                  <th className="py-2.5 px-3.5 w-[18%]">Contact Info</th>
                  <th className="py-2.5 px-3.5 w-[25%]">Enquiry Details</th>
                  <th className="py-2.5 px-3.5 w-[12%]">Status</th>
                  <th className="py-2.5 px-3.5 w-[15%]">Demo Session Link</th>
                  <th className="py-2.5 px-3.5 w-[8%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {enquiries.map((item) => {
                  const cleanPhone = item.phone?.replace(/\D/g, '') || '';
                  const waNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      {/* Prospect & Restaurant */}
                      <td className="py-2.5 px-3.5">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">{item.name}</div>
                        <div className="flex items-center gap-1.5 text-slate-600 text-xs mt-0.5">
                          <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium truncate">{item.businessName || 'Business not specified'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {item.city && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />
                              {item.city}
                            </span>
                          )}
                          {item.outletsCount && <span>• {item.outletsCount} Outlet(s)</span>}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-2.5 px-3.5 space-y-1">
                        {item.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a
                              href={`tel:${item.phone}`}
                              className="text-slate-800 font-semibold hover:text-blue-600"
                            >
                              {item.phone}
                            </a>
                            {cleanPhone.length >= 10 && (
                              <a
                                href={`https://wa.me/${waNumber}?text=Hi%20${encodeURIComponent(
                                  item.name
                                )},%20greetings%20from%20QuantroBill%20POS!%20Regarding%20your%20demo%20inquiry...`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 ml-1 shrink-0"
                                title="Chat on WhatsApp"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        )}
                        {item.email && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a
                              href={`mailto:${item.email}`}
                              className="hover:text-blue-600 truncate max-w-[180px]"
                            >
                              {item.email}
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Enquiry Message */}
                      <td className="py-2.5 px-3.5">
                        <div className="text-[10px] font-semibold text-blue-700 bg-blue-50/70 border border-blue-100 rounded px-1.5 py-0.5 inline-block mb-1">
                          {item.interestedProduct || 'QuantroBill POS'}
                        </div>
                        <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                          {item.message || 'No additional message provided.'}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Submitted: {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Demo Session Link */}
                      <td className="py-2.5 px-3.5">
                        {item.demoLink ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <a
                                href={item.demoLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md transition truncate max-w-[160px]"
                              >
                                <Video className="w-3 h-3 shrink-0" />
                                <span className="truncate">Open Demo</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                              <button
                                onClick={() => handleCopyLink(item.demoLink!, item.id)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                                title="Copy Link"
                              >
                                {copiedId === item.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>

                            {item.scheduledAt && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-600 font-medium">
                                <Clock className="w-3 h-3 text-purple-600" />
                                <span>
                                  {new Date(item.scheduledAt).toLocaleString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 transition cursor-pointer"
                          >
                            <Video className="w-3 h-3 text-slate-500" />
                            <span>+ Set Link</span>
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 transition cursor-pointer font-semibold text-xs flex items-center gap-1"
                            title="Edit Demo & Status"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Manage</span>
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Enquiry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing Page {page} of {totalPages} ({totalItems} total leads)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit / Schedule Demo Modal */}
      {editModalOpen && selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Manage Demo Session</h3>
                  <p className="text-xs text-slate-500">Prospect: {selectedEnquiry.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4 text-xs">
              {feedbackMsg && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${
                    feedbackMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{feedbackMsg.text}</span>
                </div>
              )}

              {/* Status Selector */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pipeline Status
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs font-semibold focus:bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="New">New Lead</option>
                  <option value="Contacted">Contacted / Initial Call Done</option>
                  <option value="Demo Scheduled">Demo Scheduled</option>
                  <option value="Converted">Converted (Subscribed to Plan)</option>
                  <option value="Closed">Closed / Not Interested</option>
                </select>
              </div>

              {/* Demo Session Link */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Demo Meeting Link (Google Meet, Zoom, Live Interactive Demo)
                </label>
                <input
                  type="url"
                  value={modalDemoLink}
                  onChange={(e) => setModalDemoLink(e.target.value)}
                  placeholder="https://meet.google.com/xyz-abc or https://quantrobill.com/demo.html"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
                />
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] text-slate-400">Quick link templates:</span>
                  <button
                    type="button"
                    onClick={() => setModalDemoLink('/demo.html')}
                    className="text-[11px] text-indigo-600 hover:underline cursor-pointer"
                  >
                    Interactive Demo
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setModalDemoLink('https://meet.google.com/new')}
                    className="text-[11px] text-indigo-600 hover:underline cursor-pointer"
                  >
                    Google Meet
                  </button>
                </div>
              </div>

              {/* Scheduled Date & Time */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Scheduled Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={modalScheduledAt}
                  onChange={(e) => setModalScheduledAt(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sales / Demo Notes
                </label>
                <textarea
                  rows={3}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. Interested in KDS & Waiter app. Requested evening 5 PM slot."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              {/* Assigned Staff */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assigned Team Member
                </label>
                <input
                  type="text"
                  value={modalAssignedTo}
                  onChange={(e) => setModalAssignedTo(e.target.value)}
                  placeholder="e.g. Sales Executive 1 / SuperAdmin"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? 'Saving...' : 'Save & Update Demo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
