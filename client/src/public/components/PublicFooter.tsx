import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import logoImg from '../../assets/favicon.png';

export const PublicFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="pp-footer">
      <div className="pp-footer-inner">
        <div className="pp-footer-grid">
          {/* Column 1: Brand & Bio */}
          <div className="pp-footer-col">
            <div className="pp-brand" style={{ marginBottom: '14px' }}>
              <img src={logoImg} alt="RestoSync" className="pp-brand-logo" />
              <span className="pp-brand-title">
                Resto<span>Sync</span>
              </span>
            </div>
            <p style={{ color: 'var(--pp-muted)', fontSize: '0.92rem', lineHeight: '1.65', marginBottom: '20px' }}>
              The high-speed restaurant operating system & cloud POS built for modern cafes, QSRs, bars, and multi-outlet chains.
            </p>
            <div className="pp-social-links">
              <a
                href="https://www.facebook.com/people/QuantroMind/61577390753722/"
                target="_blank"
                rel="noopener noreferrer"
                className="pp-social-btn"
                aria-label="Facebook"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/quantromind?igsh=MTNibTMxamh4dGZoNw%3D%3D"
                target="_blank"
                rel="noopener noreferrer"
                className="pp-social-btn"
                aria-label="Instagram"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/quantromind-pvt-ltd/"
                target="_blank"
                rel="noopener noreferrer"
                className="pp-social-btn"
                aria-label="LinkedIn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Platform Capabilities */}
          <div className="pp-footer-col">
            <h4>Products</h4>
            <ul className="pp-footer-links">
              <li><a href="/#features" className="pp-footer-link">Fast Cashier Billing</a></li>
              <li><a href="/#features" className="pp-footer-link">Table Floor Management</a></li>
              <li><a href="/#features" className="pp-footer-link">Kitchen Display (KDS)</a></li>
              <li><a href="/#features" className="pp-footer-link">Handheld Waiter App</a></li>
              <li><a href="/#features" className="pp-footer-link">Dynamic UPI QR Codes</a></li>
              <li><a href="/#features" className="pp-footer-link">Thermal Receipt Designer</a></li>
            </ul>
          </div>

          {/* Column 3: Solutions & Portals */}
          <div className="pp-footer-col">
            <h4>Solutions</h4>
            <ul className="pp-footer-links">
              <li><a href="/#solutions" className="pp-footer-link">Cafes & Bakeries</a></li>
              <li><a href="/#solutions" className="pp-footer-link">QSR & Food Courts</a></li>
              <li><a href="/#solutions" className="pp-footer-link">Cloud Kitchens</a></li>
              <li><a href="/#solutions" className="pp-footer-link">Multi-Branch Franchises</a></li>
              <li><a href="/#pricing" className="pp-footer-link">Subscription Plans</a></li>
              <li><Link to="/login" className="pp-footer-link">Staff & Owner Login</Link></li>
            </ul>
          </div>

          {/* Column 4: Contact & Office */}
          <div className="pp-footer-col">
            <h4>Get in Touch</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', color: 'var(--pp-muted)' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <MapPin size={18} style={{ color: 'var(--pp-red)', flexShrink: 0, marginTop: '2px' }} />
                <span>Floor No. 201, Arnav Heights, Wakad, Pimpri-Chinchwad, Pune, MH 411057</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Phone size={18} style={{ color: 'var(--pp-red)', flexShrink: 0 }} />
                <a href="tel:+917020243759" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                  +91 7020243759
                </a>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Mail size={18} style={{ color: 'var(--pp-red)', flexShrink: 0 }} />
                <a href="mailto:quantromind@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>
                  quantromind@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="pp-footer-bottom">
          <div>
            © {currentYear} <strong>Quantromind Pvt Ltd</strong>. All rights reserved. RestoSync™ is an enterprise trademark.
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link to="/contact" className="pp-footer-link">Book Demo</Link>
            <a href="/#pricing" className="pp-footer-link">Pricing</a>
            <Link to="/login" className="pp-footer-link">Portal Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
