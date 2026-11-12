import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Receipt,
  Utensils,
  Users,
  Monitor,
  Shield,
  Phone,
  Package,
  HeartHandshake,
  Coffee,
  Pizza,
  IceCream,
  Beer,
  Store,
  ChefHat,
  Croissant,
  UtensilsCrossed,
  QrCode,
  Sparkles,
  Zap,
  Clock,
  Send,
  Loader2,
} from 'lucide-react';

import heroImg from '../../assets/hero-illustration.png';
import featureBilling from '../../assets/feature-billing.png';
import featureReceipt from '../../assets/feature-receipt.png';
import featureMenu from '../../assets/feature-menu.png';
import featureAnalytics from '../../assets/feature-analytics.png';

import { apiClient } from '../../services/api';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';
import { DemoEnquiryModal } from '../components/DemoEnquiryModal';
import type { PublicPlan, EnquiryFormData, SubmissionStatus } from '../types';
import '../styles/public.css';

export const LandingPage: React.FC = () => {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [selectedPlanForDemo, setSelectedPlanForDemo] = useState<string | undefined>();

  // In-page demo enquiry form state
  const [inPageForm, setInPageForm] = useState<EnquiryFormData>({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    city: '',
    outletsCount: '1',
    message: 'Requesting a live personalized demo of RestoSync POS.',
    interestedProduct: 'RestoSync Restaurant OS',
    formType: 'Landing Page Form',
  });
  const [inPageStatus, setInPageStatus] = useState<SubmissionStatus>('idle');
  const [inPageError, setInPageError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await apiClient.get('/public/plans');
        if (isMounted) {
          const list = res.data?.data || res.data || [];
          setPlans(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        console.warn('Could not fetch plans from API, falling back to curated tiers', e);
        if (isMounted) {
          setPlans([
            {
              name: 'Starter Outlet',
              description: 'Ideal for single-counter cafes, quick service, and food trucks.',
              priceMonthly: 799,
              interval: 'month',
              isPopular: false,
              features: [
                'Under 2-second fast billing register',
                'Offline order preservation during internet drops',
                'Dynamic UPI QR code on thermal receipts',
                'Kitchen KOT printing & SMS alerts',
                'Excel menu bulk import template',
              ],
            },
            {
              name: 'Growth Restaurant',
              description: 'Complete operating system for dine-in restaurants and cafes.',
              priceMonthly: 1499,
              interval: 'month',
              isPopular: true,
              features: [
                'Everything in Starter Outlet, plus:',
                'Interactive Table floor layout with split & merge',
                'Kitchen Display System (KDS) bump bar screen',
                'Handheld Waiter Mobile App for phone ordering',
                'Recipe raw inventory depletion & low-stock alerts',
                'Custom receipt branding (Logo, FSSAI, Taglines)',
              ],
            },
            {
              name: 'Multi-Outlet Pro',
              description: 'Centralized control for multi-branch chains and franchises.',
              priceMonthly: 2999,
              interval: 'month',
              isPopular: false,
              features: [
                'Everything in Growth Restaurant, plus:',
                'Up to 5 outlets under one central dashboard',
                'Central master menu with branch price overrides',
                'Inter-branch stock transfers & ingredient tracking',
                'Owner mobile dashboard with live consolidated metrics',
                'Priority 24/7 WhatsApp & phone support',
              ],
            },
          ]);
        }
      } finally {
        if (isMounted) setLoadingPlans(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const openDemoWithPlan = (planName?: string) => {
    setSelectedPlanForDemo(planName);
    setIsDemoModalOpen(true);
  };

  const handleInPageChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    let { name, value } = e.target;
    if (name === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setInPageForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleInPageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInPageError(null);

    if (!inPageForm.name.trim()) {
      setInPageError('Please enter your full name.');
      return;
    }
    if (!inPageForm.email.trim()) {
      setInPageError('Please enter your email address.');
      return;
    }
    const cleanPhone = inPageForm.phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setInPageError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setInPageStatus('loading');
    try {
      await apiClient.post('/public/enquiries', inPageForm);
      setInPageStatus('success');
      setInPageForm({
        name: '',
        email: '',
        phone: '',
        businessName: '',
        city: '',
        outletsCount: '1',
        message: 'Requesting a live personalized demo of RestoSync POS.',
        interestedProduct: 'RestoSync Restaurant OS',
        formType: 'Landing Page Form',
      });
      setTimeout(() => setInPageStatus('idle'), 5000);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.title || (typeof err.response?.data === 'string' ? err.response.data : null) || 'Failed to submit enquiry. Please try again.';
      setInPageError(msg);
      setInPageStatus('idle');
    }
  };

  // 4 Feature deep-dives matching reference
  const showcaseFeatures = [
    {
      img: featureBilling,
      tag: 'LIGHTNING FAST POS & OFFLINE ORDER PROTECTION',
      title: 'Superfast Billing & Order Management',
      desc: 'Punch customer orders in under 2 seconds. The system auto-saves ongoing orders locally—so if your internet drops during peak hours, you never lose your cart. Includes interactive floor tables (T1-T50), 1-click split & merge, and instant KOT sending to the kitchen.',
      highlights: [
        'Punch bills in under 2 seconds with high-speed keyboard shortcuts',
        'Offline order preservation during sudden WiFi drops',
        'Interactive Table map with 1-click bill split & merge',
        '1-Click Kitchen Order Ticket (KOT) thermal printing',
      ],
      reverse: false,
    },
    {
      img: featureReceipt,
      tag: 'CUSTOM RECEIPTS & ONLINE UPI PAYMENTS',
      title: 'Full Custom Branding & Dynamic UPI QR Pay',
      desc: 'Fully customize thermal receipts with your Cafe Name, Branding Logo, Full Address, Phone Number, FSSAI License, and Tagline / Motto. Print dynamic UPI QR codes directly on bills for instant cashless payments with live receipt mockup preview!',
      highlights: [
        'Dynamic UPI QR code on every customer bill for instant payment',
        'Custom Cafe Name, Logo & Header Icons on thermal paper',
        'Full Store Address, Contact Phone & GSTIN/FSSAI details',
        'Real-time receipt preview mockup directly inside Settings',
      ],
      reverse: true,
    },
    {
      img: featureMenu,
      tag: 'SMART MENU MANAGER & EXCEL IMPORT',
      title: 'Effortless Menu Management & Bulk Excel Upload',
      desc: 'Organize your food & beverage items with custom categories, instant price updates, and quick search. Toggle items available or out-of-stock in real-time, or upload your entire menu in seconds using our 1-click Excel import template.',
      highlights: [
        '1-Click Bulk Excel Menu Import & Template Download',
        'Instant Available / Out-of-Stock (86) toggle across all counters',
        'Category-based organization (Coffee, Burgers, Combos, Desserts)',
        'Real-time menu synchronization across all billing counters and waiter phones',
      ],
      reverse: false,
    },
    {
      img: featureAnalytics,
      tag: 'REAL-TIME CLOUD ANALYTICS & INVENTORY',
      title: 'Multi-Outlet Sales Reports & Raw Stock Depletion',
      desc: 'Monitor real-time sales, payment split (Cash vs UPI vs Card), hourly order spikes, and inventory raw stock depletion from anywhere on your smartphone or laptop. Automated day-end Cashier Z-Reports keep your cash drawer accurate.',
      highlights: [
        'Live owner analytics accessible from smartphone or laptop',
        'Raw material inventory deduction per dish sold',
        'Automated cashier closing & day-end Z-Report reconciliation',
        'Multi-outlet franchise reporting under one centralized login',
      ],
      reverse: true,
    },
  ];

  const smartServices = [
    {
      icon: Receipt,
      title: 'Order Protection',
      desc: 'Ongoing orders save locally in browser storage. Never lose cart items if the internet drops.',
    },
    {
      icon: Users,
      title: 'Table Splitting',
      desc: 'Easily manage 2+ separate customer groups sharing the same table without messy calculations.',
    },
    {
      icon: Package,
      title: 'Parcel & Takeaway',
      desc: 'Dedicated fast checkout interface for walk-in takeaway, parcel packing, and online aggregators.',
    },
    {
      icon: ChefHat,
      title: 'Live Kitchen KDS',
      desc: 'Send orders directly to kitchen screens with 1-click KOT generation and audio chimes.',
    },
    {
      icon: QrCode,
      title: 'Dynamic UPI QR Pay',
      desc: 'Dynamically generate and print UPI QR codes on bills for instant scan-and-pay cashless settlements.',
    },
    {
      icon: HeartHandshake,
      title: 'Custom Receipts',
      desc: 'Personalize thermal bills with your Logo, FSSAI license, tax breakdown, and custom footer motto.',
    },
  ];

  const businessTypes = [
    { icon: UtensilsCrossed, title: 'Fine Dine' },
    { icon: Utensils, title: 'QSR' },
    { icon: Coffee, title: 'Cafe' },
    { icon: Store, title: 'Food Court' },
    { icon: ChefHat, title: 'Cloud Kitchen' },
    { icon: IceCream, title: 'Desserts & Shakes' },
    { icon: Croissant, title: 'Bakery' },
    { icon: Beer, title: 'Bar & Brewery' },
    { icon: Pizza, title: 'Pizzeria' },
    { icon: Monitor, title: 'Multi-Outlet Chain' },
  ];

  return (
    <div className="pp-wrapper">
      {/* 1. TOP NAVIGATION */}
      <PublicNavbar onOpenDemo={() => openDemoWithPlan()} />

      {/* 2. HERO SECTION */}
      <section className="pp-hero">
        <div className="pp-hero-inner">
          <div>
            <div className="pp-hero-badge">
              <span className="pp-hero-badge-dot"></span>
              <span>Next-Gen Restaurant OS • .NET 8 & SignalR Live</span>
            </div>
            <h1 className="pp-hero-title">
              The complete POS software for <span className="pp-highlight">modern cafes</span> & food businesses!
            </h1>
            <p className="pp-hero-desc">
              Streamline all your cafe and restaurant operations seamlessly—from 2-second billing and offline order protection to KDS kitchen dispatch and UPI QR settlements—so you can focus on delighting customers.
            </p>

            <div className="pp-hero-ctas">
              <Link
                to="/register"
                className="pp-btn-primary"
                style={{
                  padding: '14px 28px',
                  fontSize: '1.05rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                }}
              >
                <Sparkles size={18} />
                <span>Register Restaurant (Free Trial)</span>
              </Link>

              <button
                onClick={() => openDemoWithPlan()}
                className="pp-btn-outline"
                style={{ padding: '14px 22px', fontSize: '1rem' }}
              >
                <span>Take A Free Demo</span>
              </button>

              <a
                href="/downloads/RestoSync-POS-Setup.exe"
                download="RestoSync-POS-Setup.exe"
                className="pp-btn-desktop"
                title="Download Windows Desktop App for thermal printing and cash drawer"
              >
                <Monitor size={18} />
                <span>Download Desktop App</span>
                <span className="pp-exe-badge">.EXE</span>
              </a>
            </div>

            <div className="pp-hero-perks">
              <div className="pp-hero-perk">
                <CheckCircle2 size={16} /> <span>14-Day Free Trial</span>
              </div>
              <div className="pp-hero-perk">
                <CheckCircle2 size={16} /> <span>Zero Setup Fee</span>
              </div>
              <div className="pp-hero-perk">
                <CheckCircle2 size={16} /> <span>Works Offline & Online</span>
              </div>
            </div>
          </div>

          <div className="pp-hero-visual">
            <div className="pp-hero-img-wrap">
              <img
                src={heroImg}
                alt="RestoSync POS billing interface and restaurant team"
                className="pp-hero-img"
              />
              <div className="pp-floating-stat-pill">
                <div className="pp-floating-icon">⚡</div>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--pp-dark)' }}>
                    Live SignalR Sync
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--pp-muted)' }}>
                    Waiter order reflects instantly on KDS & POS
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TRUST STATS BAR */}
      <section className="pp-trust-bar">
        <div className="pp-trust-inner">
          <h2 className="pp-trust-heading">
            Trusted by <strong>500+</strong> cafes, QSRs & fine-dine venues nationwide
          </h2>
          <div className="pp-stats-grid">
            <div className="pp-stat-box">
              <span className="pp-stat-num">500+</span>
              <span className="pp-stat-label">Active Venues</span>
            </div>
            <div className="pp-stat-box">
              <span className="pp-stat-num">2M+</span>
              <span className="pp-stat-label">Orders Processed</span>
            </div>
            <div className="pp-stat-box">
              <span className="pp-stat-num">99.9%</span>
              <span className="pp-stat-label">Cloud Uptime</span>
            </div>
            <div className="pp-stat-box">
              <span className="pp-stat-num">&lt;2s</span>
              <span className="pp-stat-label">Avg Bill Punch Time</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ABOUT RESTOSYNC & THREE CORE PILLARS */}
      <section className="pp-types-section" style={{ background: '#ffffff' }}>
        <div className="pp-section-header">
          <span className="pp-section-tag">ABOUT RESTOSYNC</span>
          <h2 className="pp-section-title">Empowering Food Businesses with Next-Gen Technology</h2>
          <p className="pp-section-sub">
            At RestoSync (built by Quantromind), we believe running a cafe or restaurant shouldn't be held back by clunky, slow legacy software. We built a billing system so intuitive that your cashier can master it in 2 minutes, yet robust enough for your busiest Saturday night rush.
          </p>
        </div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div style={{ padding: '28px', background: 'var(--pp-bg-alt)', borderRadius: '16px', border: '1px solid var(--pp-light-border)' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ffffff', color: 'var(--pp-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid var(--pp-light-border)' }}>
              <Zap size={22} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', color: 'var(--pp-dark)' }}>Built for Speed</h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--pp-muted)', lineHeight: '1.6' }}>
              Every button, shortcut, and screen is engineered for minimum clicks. Punch orders 3x faster than legacy POS setups.
            </p>
          </div>

          <div style={{ padding: '28px', background: 'var(--pp-bg-alt)', borderRadius: '16px', border: '1px solid var(--pp-light-border)' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ffffff', color: 'var(--pp-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid var(--pp-light-border)' }}>
              <Shield size={22} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', color: 'var(--pp-dark)' }}>100% Reliable Offline</h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--pp-muted)', lineHeight: '1.6' }}>
              Local caching architecture ensures your business never halts. Even if your internet cable snaps, billing keeps flowing.
            </p>
          </div>

          <div style={{ padding: '28px', background: 'var(--pp-bg-alt)', borderRadius: '16px', border: '1px solid var(--pp-light-border)' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ffffff', color: 'var(--pp-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid var(--pp-light-border)' }}>
              <Users size={22} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', color: 'var(--pp-dark)' }}>Zero Training Required</h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--pp-muted)', lineHeight: '1.6' }}>
              A clean, modern light-mode interface that new staff and waiters understand completely on their very first day of work.
            </p>
          </div>
        </div>
      </section>

      {/* 5. SERVICES WE PROVIDE (6 SMART FEATURES) */}
      <section id="features" className="pp-smart-section">
        <div className="pp-section-header">
          <span className="pp-section-tag">SERVICES WE PROVIDE</span>
          <h2 className="pp-section-title">Everything You Need to Run & Scale</h2>
          <p className="pp-section-sub">
            An all-in-one ecosystem connecting cash counters, kitchen bump bars, table maps, and management analytics.
          </p>
        </div>

        <div className="pp-smart-grid">
          {smartServices.map((service, index) => (
            <div key={index} className="pp-smart-card">
              <div className="pp-smart-icon">
                <service.icon size={24} />
              </div>
              <h3>{service.title}</h3>
              <p>{service.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. BUSINESS TYPES */}
      <section id="solutions" className="pp-types-section">
        <div className="pp-section-header">
          <span className="pp-section-tag">TAILORED FOR FOOD BUSINESSES</span>
          <h2 className="pp-section-title">Built for Every Format & Concept</h2>
          <p className="pp-section-sub">
            Whether you operate a fast-paced coffee shop or an expansive multi-outlet dining chain.
          </p>
        </div>

        <div className="pp-biz-grid">
          {businessTypes.map((biz, i) => (
            <div key={i} className="pp-biz-card">
              <div className="pp-biz-icon">
                <biz.icon size={26} strokeWidth={1.75} />
              </div>
              <span className="pp-biz-name">{biz.title}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 7. SHOWCASE DEEP-DIVES (ALTERNATING CARDS) */}
      <section className="pp-showcases-section">
        {showcaseFeatures.map((feat, index) => (
          <div
            key={index}
            className={`pp-showcase-row ${feat.reverse ? 'reverse' : ''}`}
          >
            <div className="pp-showcase-visual">
              <div className="pp-showcase-img-border"></div>
              <img
                src={feat.img}
                alt={feat.title}
                className="pp-showcase-img"
              />
            </div>

            <div className="pp-showcase-content">
              <span className="pp-section-tag">{feat.tag}</span>
              <h2>{feat.title}</h2>
              <p>{feat.desc}</p>

              <ul className="pp-highlights-list">
                {feat.highlights.map((item, hi) => (
                  <li key={hi} className="pp-highlight-item">
                    <CheckCircle2 size={18} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => openDemoWithPlan(feat.title)}
                className="pp-btn-primary"
                style={{ padding: '12px 24px' }}
              >
                <span>Request Live Demo</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* 8. PRICING PLANS */}
      <section id="pricing" className="pp-pricing-section">
        <div className="pp-section-header">
          <span className="pp-section-tag">TRANSPARENT PRICING</span>
          <h2 className="pp-section-title">Simple, Honest Plans for Every Stage</h2>
          <p className="pp-section-sub">
            All plans include live updates, offline protection, and unlimited menu items. No hidden installation fees.
          </p>
        </div>

        <div className="pp-pricing-grid">
          {loadingPlans ? (
            [1, 2, 3, 4].map((n) => (
              <div key={n} className="pp-plan-card" style={{ opacity: 0.6 }}>
                <div style={{ height: '24px', background: '#e2e8f0', borderRadius: '6px', width: '50%', marginBottom: '14px' }}></div>
                <div style={{ height: '40px', background: '#e2e8f0', borderRadius: '6px', width: '70%', marginBottom: '20px' }}></div>
                <div style={{ height: '14px', background: '#e2e8f0', borderRadius: '4px', width: '90%', marginBottom: '10px' }}></div>
                <div style={{ height: '14px', background: '#e2e8f0', borderRadius: '4px', width: '80%', marginBottom: '10px' }}></div>
              </div>
            ))
          ) : plans.length > 0 ? (
            plans.map((plan, idx) => {
              const price = plan.priceMonthly ?? plan.price ?? 0;
              const featuresList: string[] = Array.isArray(plan.features)
                ? plan.features
                : typeof plan.features === 'object' && plan.features !== null
                ? Object.keys(plan.features).filter((k) => (plan.features as any)[k])
                : [];

              return (
                <div
                  key={plan.id || plan._id || idx}
                  className={`pp-plan-card ${plan.isPopular ? 'popular' : ''}`}
                >
                  {plan.isPopular && <div className="pp-plan-badge">MOST POPULAR</div>}
                  <h3 className="pp-plan-name">{plan.name}</h3>
                  <p className="pp-plan-desc">{plan.description}</p>

                  <div className="pp-plan-price-wrap">
                    <span className="pp-plan-currency">₹</span>
                    <span className="pp-plan-amt">{price.toLocaleString('en-IN')}</span>
                    <span className="pp-plan-interval">/month</span>
                  </div>

                  <ul className="pp-plan-features">
                    {featuresList.map((feat, fidx) => (
                      <li key={fidx} className="pp-plan-feature">
                        <CheckCircle2 size={16} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                    <Link
                      to="/register"
                      className={plan.isPopular ? 'pp-btn-primary' : 'pp-btn-outline'}
                      style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
                    >
                      <span>Get Started with {plan.name}</span>
                      <ArrowRight size={15} />
                    </Link>
                    <button
                      onClick={() => openDemoWithPlan(plan.name)}
                      className="pp-btn-text"
                      style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', padding: '6px' }}
                    >
                      <span>Or Book A Free Demo</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Custom plans available upon request. Click below to discuss your setup.
            </div>
          )}
        </div>
      </section>

      {/* 9. INTEGRATED DEMO & BILLING ENQUIRY SECTION */}
      <section className="pp-enquiry-section">
        <div className="pp-enquiry-box">
          <div className="pp-enquiry-info">
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f87171' }}>
                SCHEDULE A DEMO
              </span>
              <h3>See How RestoSync Elevates Your Business</h3>
              <p>
                Our restaurant technology consultants will walk you through live order punching, thermal receipt generation, kitchen KDS, and table management tailored to your specific menu.
              </p>

              <div className="pp-enquiry-contacts">
                <div className="pp-contact-row">
                  <div className="pp-contact-icon">
                    <Phone size={18} />
                  </div>
                  <div className="pp-contact-meta">
                    <small>Direct Phone Support</small>
                    <span>+91 7020243759</span>
                  </div>
                </div>

                <div className="pp-contact-row">
                  <div className="pp-contact-icon">
                    <Clock size={18} />
                  </div>
                  <div className="pp-contact-meta">
                    <small>Avg. Callback Time</small>
                    <span>Within 2 Hours</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginTop: '24px' }}>
              📍 Wakad, Pune, Maharashtra 411057
            </div>
          </div>

          <div className="pp-enquiry-form-wrap">
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--pp-dark)', marginBottom: '6px' }}>
              Book Your Free Demo
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--pp-muted)', marginBottom: '20px' }}>
              Fill in your contact details below and our team will get in touch immediately.
            </p>

            {inPageStatus === 'success' ? (
              <div className="pp-success-card">
                <div className="pp-success-icon">
                  <CheckCircle2 size={36} />
                </div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--pp-dark)' }}>
                  Enquiry Submitted Successfully!
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--pp-muted)', margin: 0 }}>
                  Thank you! Our restaurant specialist will reach out to you within 2 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleInPageSubmit} className="pp-enquiry-form">
                {inPageError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
                    {inPageError}
                  </div>
                )}

                <div className="pp-form-row-2">
                  <div className="pp-form-group">
                    <label>Your Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={inPageForm.name}
                      onChange={handleInPageChange}
                      placeholder="e.g. Amit Patil"
                      required
                    />
                  </div>
                  <div className="pp-form-group">
                    <label>Mobile Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={inPageForm.phone}
                      onChange={handleInPageChange}
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
                      value={inPageForm.email}
                      onChange={handleInPageChange}
                      placeholder="amit@cafe.com"
                      required
                    />
                  </div>
                  <div className="pp-form-group">
                    <label>Cafe / Restaurant Name</label>
                    <input
                      type="text"
                      name="businessName"
                      value={inPageForm.businessName}
                      onChange={handleInPageChange}
                      placeholder="e.g. Royal Chai & Cafe"
                    />
                  </div>
                </div>

                <div className="pp-form-row-2">
                  <div className="pp-form-group">
                    <label>City</label>
                    <input
                      type="text"
                      name="city"
                      value={inPageForm.city}
                      onChange={handleInPageChange}
                      placeholder="e.g. Pune, Mumbai"
                    />
                  </div>
                  <div className="pp-form-group">
                    <label>Outlets Count</label>
                    <select name="outletsCount" value={inPageForm.outletsCount} onChange={handleInPageChange}>
                      <option value="1">1 Single Outlet</option>
                      <option value="2-5">2 to 5 Outlets</option>
                      <option value="6-15">6 to 15 Outlets</option>
                      <option value="15+">15+ Franchise Chain</option>
                    </select>
                  </div>
                </div>

                <div className="pp-form-group">
                  <label>Message / Specific Needs</label>
                  <textarea
                    name="message"
                    value={inPageForm.message}
                    onChange={handleInPageChange}
                    rows={2}
                    placeholder="Tell us what you'd like to see (e.g. Thermal bill setup, KDS bump bar, Waiter phone app)..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={inPageStatus === 'loading'}
                  className="pp-btn-primary"
                  style={{ width: '100%', padding: '13px' }}
                >
                  {inPageStatus === 'loading' ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Submitting Your Enquiry...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Book Free Demo Now</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 10. FINAL CTA BANNER */}
      <section className="pp-cta-section">
        <div className="pp-cta-inner">
          <h2>Ready to Upgrade Your Restaurant Billing?</h2>
          <p>
            Join hundreds of forward-thinking food businesses that boosted order speed, prevented leakages, and eliminated cashier downtime with RestoSync.
          </p>
          <div className="pp-cta-btns">
            <Link
              to="/register"
              className="pp-btn-primary"
              style={{
                padding: '14px 32px',
                fontSize: '1.05rem',
                background: '#ffffff',
                color: 'var(--pp-red)',
                borderColor: '#ffffff',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 800,
              }}
            >
              <span>Register Restaurant (Free Trial)</span>
              <ArrowRight size={18} />
            </Link>
            <button
              onClick={() => openDemoWithPlan()}
              className="pp-btn-outline"
              style={{ padding: '14px 28px', fontSize: '1.05rem', background: 'transparent', color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              <Sparkles size={18} />
              <span>Schedule Live Demo</span>
            </button>
            <a
              href="/downloads/RestoSync-POS-Setup.exe"
              download="RestoSync-POS-Setup.exe"
              className="pp-btn-desktop"
              style={{ padding: '14px 24px', fontSize: '1rem', color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              <Monitor size={18} />
              <span>Download Desktop (.EXE)</span>
            </a>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Shield size={14} /> 100% Free 14-Day Trial • No Credit Card Required • Setup in 10 Minutes
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <PublicFooter />

      {/* 12. DEMO ENQUIRY MODAL */}
      <DemoEnquiryModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        preselectedPlan={selectedPlanForDemo}
      />
    </div>
  );
};
