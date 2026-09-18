import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, Send, Sparkles } from 'lucide-react';
import { apiClient } from '../../services/api';
import type { EnquiryFormData, SubmissionStatus } from '../types';

interface DemoEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPlan?: string;
}

export const DemoEnquiryModal: React.FC<DemoEnquiryModalProps> = ({
  isOpen,
  onClose,
  preselectedPlan,
}) => {
  const [form, setForm] = useState<EnquiryFormData>({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    city: '',
    outletsCount: '1',
    message: preselectedPlan ? `Inquiry regarding the ${preselectedPlan} plan.` : 'Requesting a live interactive demo for our cafe/restaurant.',
    interestedProduct: 'QuantroBill Restaurant OS',
    formType: 'Demo Modal',
  });

  const [status, setStatus] = useState<SubmissionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    if (name === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!form.name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!form.email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setErrorMsg('Please provide a valid email format.');
      return;
    }

    const phoneClean = form.phone.replace(/\D/g, '');
    if (phoneClean.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setStatus('loading');
    try {
      await apiClient.post('/public/enquiries', form);
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        onClose();
      }, 3500);
    } catch (err: any) {
      console.error('Enquiry submission error:', err);
      const msg = err.response?.data?.message || err.response?.data?.title || (typeof err.response?.data === 'string' ? err.response.data : null) || 'Failed to submit demo request. Please ensure the backend server is running and try again.';
      setErrorMsg(msg);
      setStatus('error');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            borderTopLeftRadius: '19px',
            borderTopRightRadius: '19px',
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <Sparkles size={14} /> Free 1-on-1 Personalized Demo
            </div>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.35rem', fontWeight: 800 }}>
              Experience QuantroBill in Action
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '28px' }}>
          {status === 'success' ? (
            <div className="pp-success-card">
              <div className="pp-success-icon">
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Demo Request Received!
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '380px', margin: 0 }}>
                Thank you, <strong>{form.name}</strong>! Our product specialist will call you at <strong>+91 {form.phone}</strong> shortly to schedule your personalized live demo.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errorMsg && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <div className="pp-form-row-2">
                <div className="pp-form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Rahul Sharma"
                    required
                  />
                </div>
                <div className="pp-form-group">
                  <label>Mobile Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="10-digit number"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div className="pp-form-row-2">
                <div className="pp-form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@business.com"
                    required
                  />
                </div>
                <div className="pp-form-group">
                  <label>Cafe / Restaurant Name</label>
                  <input
                    type="text"
                    name="businessName"
                    value={form.businessName}
                    onChange={handleChange}
                    placeholder="e.g. Cafe Mocha"
                  />
                </div>
              </div>

              <div className="pp-form-row-2">
                <div className="pp-form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="e.g. Pune, Mumbai, Delhi"
                  />
                </div>
                <div className="pp-form-group">
                  <label>Number of Outlets</label>
                  <select name="outletsCount" value={form.outletsCount} onChange={handleChange}>
                    <option value="1">1 Single Outlet</option>
                    <option value="2-5">2 to 5 Outlets</option>
                    <option value="6-15">6 to 15 Outlets</option>
                    <option value="15+">15+ Chain / Franchise</option>
                  </select>
                </div>
              </div>

              <div className="pp-form-group">
                <label>Requirements / Message</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us what you're looking for (e.g. POS hardware, KDS, thermal printer setup, menu migration)..."
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="pp-btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: '1.02rem', marginTop: '6px' }}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Booking Your Demo...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Confirm Free Demo Request</span>
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
                🔒 Zero spam. We value your privacy. Your information is 100% confidential.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
