import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Clock, CheckCircle2, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { apiClient } from '../../services/api';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';
import type { EnquiryFormData, SubmissionStatus } from '../types';
import '../styles/public.css';

export const ContactUs: React.FC = () => {
  const [form, setForm] = useState<EnquiryFormData>({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    city: '',
    outletsCount: '1',
    message: '',
    interestedProduct: 'RestoSync Restaurant OS',
    formType: 'Contact Page Form',
  });

  const [status, setStatus] = useState<SubmissionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
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

    const cleanPhone = form.phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setStatus('loading');
    try {
      await apiClient.post('/public/enquiries', form);
      setStatus('success');
      setForm({
        name: '',
        email: '',
        phone: '',
        businessName: '',
        city: '',
        outletsCount: '1',
        message: '',
        interestedProduct: 'RestoSync Restaurant OS',
        formType: 'Contact Page Form',
      });
      setTimeout(() => setStatus('idle'), 6000);
    } catch (err: any) {
      console.error('Contact enquiry error:', err);
      const msg = err.response?.data?.message || err.response?.data?.title || (typeof err.response?.data === 'string' ? err.response.data : null) || 'Failed to submit enquiry. Please try again.';
      setErrorMsg(msg);
      setStatus('idle');
    }
  };

  return (
    <div className="pp-wrapper">
      <PublicNavbar />

      {/* Hero Banner */}
      <section
        style={{
          padding: '140px 24px 60px',
          background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
          textAlign: 'center',
          borderBottom: '1px solid var(--pp-light-border)',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="pp-section-tag">GET IN TOUCH & BOOK A DEMO</div>
          <h1
            style={{
              fontSize: 'clamp(2.4rem, 4vw, 3.4rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--pp-dark)',
              margin: '12px 0 16px',
            }}
          >
            We’d love to show you <span style={{ color: 'var(--pp-red)' }}>RestoSync</span>
          </h1>
          <p style={{ fontSize: '1.12rem', color: 'var(--pp-muted)', lineHeight: '1.6' }}>
            Have questions about billing features, multi-outlet setups, thermal printer integrations, or pricing? Our team of restaurant tech consultants is here to help.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <main style={{ maxWidth: '1200px', margin: '60px auto 90px', padding: '0 24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.3fr',
            gap: '40px',
            background: '#ffffff',
            border: '1px solid var(--pp-light-border)',
            borderRadius: '24px',
            boxShadow: 'var(--pp-shadow-md)',
            overflow: 'hidden',
          }}
        >
          {/* Left Info Panel */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              padding: '48px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#f87171',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                }}
              >
                <Sparkles size={16} /> Direct Contact Channels
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '24px' }}>
                Contact Information
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '36px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                    }}
                  >
                    <Mail size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
                      Email Us
                    </div>
                    <a
                      href="mailto:quantromind@gmail.com"
                      style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 700, fontSize: '1.05rem' }}
                    >
                      quantromind@gmail.com
                    </a>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                    }}
                  >
                    <Phone size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
                      Call or WhatsApp
                    </div>
                    <a
                      href="tel:+917020243759"
                      style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 700, fontSize: '1.05rem' }}
                    >
                      +91 7020243759
                    </a>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                    }}
                  >
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
                      Headquarters
                    </div>
                    <p style={{ margin: 0, color: '#ffffff', fontSize: '0.95rem', lineHeight: '1.5' }}>
                      Floor No. 201, Arnav Heights, Wakad,<br />
                      Pimpri-Chinchwad, Pune, MH 411057
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.06)',
                padding: '18px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
                  FAST RESPONSE SLA
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
                  We typically reply within 2 hours during business days.
                </div>
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div style={{ padding: '48px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--pp-dark)', marginBottom: '8px' }}>
              Send Us an Inquiry
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--pp-muted)', marginBottom: '28px' }}>
              Tell us about your restaurant, cafe, or food business to arrange your customized live software demonstration.
            </p>

            {status === 'success' ? (
              <div className="pp-success-card">
                <div className="pp-success-icon">
                  <CheckCircle2 size={40} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: 'var(--pp-dark)' }}>
                  Message Sent Successfully!
                </h3>
                <p style={{ color: 'var(--pp-muted)', fontSize: '1rem', maxWidth: '420px', margin: 0 }}>
                  Thank you for reaching out! Our dedicated specialist has received your inquiry and will contact you promptly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {errorMsg && (
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
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
                      placeholder="e.g. Vikram Mehta"
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
                      placeholder="10-digit mobile"
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
                      placeholder="vikram@restaurant.com"
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
                      placeholder="e.g. Spice Route Kitchen"
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
                      placeholder="e.g. Pune, Mumbai, Bengaluru"
                    />
                  </div>
                  <div className="pp-form-group">
                    <label>Number of Outlets</label>
                    <select name="outletsCount" value={form.outletsCount} onChange={handleChange}>
                      <option value="1">1 Single Outlet</option>
                      <option value="2-5">2 to 5 Outlets</option>
                      <option value="6-15">6 to 15 Outlets</option>
                      <option value="15+">15+ Franchise Chain</option>
                    </select>
                  </div>
                </div>

                <div className="pp-form-group">
                  <label>Message / Inquiries *</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Tell us what you'd like to discuss or see in your live demo..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="pp-btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '1.02rem', marginTop: '8px' }}
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Submitting Inquiry...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Submit Inquiry & Request Demo</span>
                    </>
                  )}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.82rem', color: '#94a3b8' }}>
                  <ShieldCheck size={16} style={{ color: '#10b981' }} />
                  <span>100% Confidential. No third-party sales calls or spam.</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
