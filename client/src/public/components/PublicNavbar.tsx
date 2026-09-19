import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, LayoutDashboard } from 'lucide-react';
import logoImg from '../../assets/favicon.png';
import { useAuthStore } from '../../store/authStore';
import { getHomeRouteForRole } from '../../types/roles';

interface PublicNavbarProps {
  onOpenDemo?: () => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ onOpenDemo }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDemoClick = () => {
    setMobileOpen(false);
    if (onOpenDemo) {
      onOpenDemo();
    } else {
      navigate('/demo');
    }
  };

  const dashboardRoute = user ? getHomeRouteForRole(user.role) : '/billing';

  return (
    <>
      <nav className={`pp-nav ${isScrolled ? 'scrolled' : ''}`}>
        <div className="pp-nav-inner">
          <Link to="/" className="pp-brand">
            <img src={logoImg} alt="QuantroBill Logo" className="pp-brand-logo" />
            <span className="pp-brand-title">
              Quantro<span>Bill</span>
            </span>
          </Link>

          <div className="pp-nav-links">
            <a href="/#features" className="pp-nav-link">Features</a>
            <a href="/#solutions" className="pp-nav-link">Solutions</a>
            <a href="/#pricing" className="pp-nav-link">Pricing</a>
            <Link to="/contact" className="pp-nav-link">Contact & Demo</Link>
          </div>

          <div className="pp-nav-actions">
            {isAuthenticated ? (
              <Link
                to={dashboardRoute}
                className="pp-btn-outline"
                style={{ borderColor: '#10b981', color: '#047857', gap: '6px' }}
              >
                <LayoutDashboard size={16} />
                <span>Go to App ({user?.username || 'Active'})</span>
              </Link>
            ) : (
              <>
                <Link to="/login" className="pp-btn-text">
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="pp-btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.9rem', textDecoration: 'none' }}
                >
                  <span>Register Free</span>
                </Link>
              </>
            )}

            <button onClick={handleDemoClick} className="pp-btn-outline" style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
              <span>Book Demo</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <button
            className="pp-hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="pp-mobile-drawer">
            <a href="/#features" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="/#solutions" onClick={() => setMobileOpen(false)}>Solutions</a>
            <a href="/#pricing" onClick={() => setMobileOpen(false)}>Pricing</a>
            <Link to="/contact" onClick={() => setMobileOpen(false)}>Contact Us</Link>
            {isAuthenticated ? (
              <Link to={dashboardRoute} onClick={() => setMobileOpen(false)}>
                Return to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    background: 'var(--pp-red)',
                    color: '#ffffff',
                    fontWeight: 700,
                    borderRadius: '8px',
                    padding: '10px 14px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    marginTop: '4px'
                  }}
                >
                  Register Restaurant (Free Trial)
                </Link>
              </>
            )}
            <button
              onClick={handleDemoClick}
              className="pp-btn-outline"
              style={{ width: '100%', marginTop: '8px' }}
            >
              Book A Free Demo
            </button>
          </div>
        )}
      </nav>
    </>
  );
};
