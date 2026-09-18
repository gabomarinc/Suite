'use client';

import { useEffect, useState } from 'react';
import { LogoutLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";

interface PricingClientProps {
  isAuthenticated: boolean;
  currentPlan: string;
}

export default function PricingClient({ isAuthenticated, currentPlan }: PricingClientProps) {
  // Default to 'leads' (Suite + LeadsHUB) as requested
  const [pricingCategory, setPricingCategory] = useState<'leads' | 'suite'>('leads');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const basicPriceId = 'price_1TyDhcGAJ3j5QtJb91sVUk09';
  const proPriceId = 'price_1TyDi1GAJ3j5QtJbNVlb59aE';
  
  const basicLeadsPriceId = 'price_1TzyIYGAJ3j5QtJbEUFRIQjO';
  const proLeadsPriceId = 'price_1TzacAGAJ3j5QtJbnhlCtAoz';

  // Handle immediate checkout redirect if returning from registration
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectPlan = params.get('select_plan');
    if (selectPlan && isAuthenticated) {
      window.history.replaceState({}, '', window.location.pathname);
      
      let planName = 'basic_leads';
      if (selectPlan === proLeadsPriceId) {
        planName = 'pro_leads';
        setPricingCategory('leads');
      } else if (selectPlan === basicLeadsPriceId) {
        planName = 'basic_leads';
        setPricingCategory('leads');
      } else if (selectPlan === proPriceId) {
        planName = 'pro';
        setPricingCategory('suite');
      } else if (selectPlan === basicPriceId) {
        planName = 'basic';
        setPricingCategory('suite');
      }
      
      handleSelectPlan(selectPlan, planName);
    }
  }, [isAuthenticated]);

  const handleSelectPlan = async (priceId: string, planName: string) => {
    if (!priceId) {
      setError("No se pudo cargar el identificador de precio de Stripe. Por favor recarga e intenta de nuevo.");
      return;
    }

    setLoadingPlan(planName);
    setError(null);

    if (!isAuthenticated) {
      const redirectUrl = `${window.location.origin}/pricing?select_plan=${priceId}`;
      window.location.href = `/api/auth/register?post_login_redirect_url=${encodeURIComponent(redirectUrl)}`;
      return;
    }

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No se pudo generar la URL de Stripe Checkout");
      }
    } catch (err: any) {
      console.error("Stripe checkout error:", err);
      setError(err?.message || "Ocurrió un error al conectar con Stripe.");
      setLoadingPlan(null);
    }
  };

  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        window.location.href = '/';
      } else {
        setError(data.message || 'No se encontró una suscripción activa en Stripe.');
      }
    } catch (err: any) {
      setError('Error al intentar sincronizar la suscripción.');
    } finally {
      setSyncing(false);
    }
  };

  const hasPaidPlan = ['basic', 'pro', 'basic_leads', 'pro_leads'].includes(currentPlan);

  return (
    <main className="pricing-page-root">
      <div className="landing-grid-overlay" />

      <div className="pricing-container">
        
        {/* Floating Header Pill */}
        <header className="landing-navbar-pill" style={{ marginBottom: '2.5rem' }}>
          <a href="https://konsul.digital" className="landing-nav-logo" title="Kônsul Digital">
            <img 
              src="/konsul-logo-white.png" 
              alt="Kônsul Logo" 
              style={{ height: '36px', width: 'auto', display: 'block' }} 
            />
          </a>
          
          <div className="landing-nav-actions">
            {isAuthenticated ? (
              <LogoutLink className="landing-login-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Cerrar Sesión</span>
              </LogoutLink>
            ) : (
              <>
                <a href="/api/auth/login?post_login_redirect_url=/pricing" className="landing-login-btn">
                  Iniciar Sesión
                </a>
                <RegisterLink postLoginRedirectURL="/pricing" className="landing-register-btn">
                  Registrarse
                </RegisterLink>
              </>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <div className="landing-hero" style={{ marginBottom: '2.5rem' }}>
          <div className="landing-pill-badge">
            <span className="landing-pill-dot" />
            PASO OBLIGATORIO: SELECCIONA TU SUSCRIPCIÓN
          </div>

          <h1 className="landing-hero-title" style={{ fontSize: 'clamp(2.1rem, 4.5vw, 3.25rem)' }}>
            Desbloquea el Potencial Completo <br />
            <span className="landing-hero-title-accent">de Tu Ecosistema Empresarial</span>
          </h1>
          
          <p className="landing-hero-desc">
            Elige uno de nuestros planes para activar la Suite y desbloquear todas las herramientas, automatizaciones ilimitadas y el menú central de navegación.
          </p>
        </div>

        {/* Error Notification Alert */}
        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.12)', 
            border: '1px solid rgba(239, 68, 68, 0.35)', 
            color: '#fca5a5', 
            padding: '1rem 1.75rem', 
            borderRadius: '16px', 
            marginBottom: '2.5rem', 
            textAlign: 'center', 
            fontSize: '0.92rem', 
            maxWidth: '750px',
            width: '100%',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Categories Selector */}
        <div className="pricing-categories-grid">
          
          {/* Opción 1: Suite + LeadsHUB (DEFAULT - GREEN/TEAL) */}
          <div 
            onClick={() => setPricingCategory('leads')}
            className={`pricing-category-card ${pricingCategory === 'leads' ? 'active-leads' : ''}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: pricingCategory === 'leads' ? 'rgba(39, 190, 165, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: pricingCategory === 'leads' ? '1px solid rgba(39, 190, 165, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: pricingCategory === 'leads' ? '#2dd4bf' : '#94a3b8'
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  Suite + LeadsHUB
                  <span style={{ fontSize: '0.65rem', background: 'rgba(39, 190, 165, 0.15)', color: '#2dd4bf', border: '1px solid rgba(39, 190, 165, 0.35)', padding: '0.12rem 0.5rem', borderRadius: '9999px', fontWeight: 800 }}>PREMIUM</span>
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#2dd4bf', fontWeight: 700 }}>Desde $95/mes</span>
              </div>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              El ecosistema definitivo. Toda la Suite más la plataforma de prospección automática y agentes IA LeadsHUB.
            </p>
          </div>

          {/* Opción 2: Planes de la Suite (BLUE/SKY) */}
          <div 
            onClick={() => setPricingCategory('suite')}
            className={`pricing-category-card ${pricingCategory === 'suite' ? 'active-suite' : ''}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: pricingCategory === 'suite' ? 'rgba(2, 132, 199, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: pricingCategory === 'suite' ? '1px solid rgba(2, 132, 199, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: pricingCategory === 'suite' ? '#38bdf8' : '#94a3b8'
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>Planes de la Suite</h3>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>Desde $55/mes</span>
              </div>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              Acceso completo a las herramientas unificadas: Bills, Process, Kredit, Mailing y Automatizaciones.
            </p>
          </div>

        </div>

        {/* Pricing Plan Cards (White Background with Dark Text) */}
        <div className="pricing-cards-grid">
          
          {pricingCategory === 'leads' ? (
            <>
              {/* 1. Plan Básico Suite + LeadsHUB */}
              <div className="pricing-plan-card">
                {currentPlan === 'basic_leads' && (
                  <span className="pricing-plan-active-badge">
                    Tu Plan Activo
                  </span>
                )}
                <div className="pricing-card-icon-box" style={{ background: 'rgba(39, 190, 165, 0.1)', color: '#0d9488' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                  </svg>
                </div>
                <h3 className="pricing-card-title">Básico Suite + LeadsHUB</h3>
                <p className="pricing-card-desc">Ideal para PYMES que inician a automatizar sus ventas, atención y prospección con IA.</p>
                
                <div className="pricing-price-wrapper">
                  <span className="pricing-price-amount">$95</span>
                  <span className="pricing-price-period">/mes</span>
                </div>

                <button
                  onClick={() => handleSelectPlan(basicLeadsPriceId, "basic_leads")}
                  disabled={loadingPlan !== null || currentPlan === 'basic_leads'}
                  className="pricing-btn-dark"
                  style={{ opacity: currentPlan === 'basic_leads' ? 0.6 : 1 }}
                >
                  {loadingPlan === 'basic_leads' ? (
                    <>
                      <span className="spin-icon">⏳</span> Cargando pasarela...
                    </>
                  ) : currentPlan === 'basic_leads' ? (
                    'Plan Suscrito'
                  ) : (
                    <>
                      <span>Adquirir Básico + Leads</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>

                <div className="pricing-features-section">
                  <div className="pricing-features-header" style={{ color: '#0f766e' }}>
                    Capacidad LeadsHUB & Suite Incluida:
                  </div>
                  <ul className="pricing-feature-list">
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-green">✓</span>
                      <span><strong>2,500 mensajes/mes</strong> con Agentes IA en piloto automático</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-green">✓</span>
                      <span><strong>3 Agentes IA especializados</strong> entrenados con tu catálogo</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-green">✓</span>
                      <span><strong>6 Usuarios de equipo</strong> con roles y bandeja compartida</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-green">✓</span>
                      <span><strong>WhatsApp Business API Oficial (Meta)</strong>, Instagram, FB y Web</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-green">✓</span>
                      <span><strong>Agendamiento en Google Calendar</strong> y CRM Pipeline en vivo</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-green">✓</span>
                      <span><strong>Toda la Suite:</strong> Bills, Process, Mailing (25k), Kredit & Reactivaleads</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 2. Plan Pro Suite + LeadsHUB (RECOMMENDED - GREEN/TEAL GLOW) */}
              <div className="pricing-plan-card pro-card-leads">
                <span className="pricing-plan-top-badge badge-green">
                  RECOMENDADO
                </span>
                {currentPlan === 'pro_leads' && (
                  <span className="pricing-plan-active-badge">
                    Tu Plan Activo
                  </span>
                )}
                <div className="pricing-card-icon-box" style={{ background: 'rgba(39, 190, 165, 0.15)', color: '#0d9488' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <h3 className="pricing-card-title">Pro Suite + LeadsHUB</h3>
                <p className="pricing-card-desc">Para empresas consolidadas con alto volumen de prospectos y escala masiva.</p>
                
                <div className="pricing-price-wrapper">
                  <span className="pricing-price-amount">$195</span>
                  <span className="pricing-price-period">/mes</span>
                </div>

                <button
                  onClick={() => handleSelectPlan(proLeadsPriceId, "pro_leads")}
                  disabled={loadingPlan !== null || currentPlan === 'pro_leads'}
                  className="pricing-btn-primary-green"
                  style={{ opacity: currentPlan === 'pro_leads' ? 0.6 : 1 }}
                >
                  {loadingPlan === 'pro_leads' ? (
                    <>
                      <span className="spin-icon">⏳</span> Cargando pasarela...
                    </>
                  ) : currentPlan === 'pro_leads' ? (
                    'Plan Suscrito'
                  ) : (
                    <>
                      <span>Adquirir Pro + Leads</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>

                <div className="pricing-features-section">
                  <div className="pricing-features-header" style={{ color: '#0d9488' }}>
                    Poder Ilimitado & LeadsHUB Premium:
                  </div>
                  <ul className="pricing-feature-list">
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-green">✓</span>
                      <span><strong>7,500 mensajes/mes</strong> con Agentes IA en piloto automático</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-green">✓</span>
                      <span><strong>6 Agentes IA especializados</strong> para diferentes departamentos</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-green">✓</span>
                      <span><strong>12 Usuarios de equipo</strong> con roles y bandeja multicanal</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-green">✓</span>
                      <span><strong>WhatsApp Business API Oficial (Meta)</strong>, Instagram, FB y Web</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-green">✓</span>
                      <span><strong>Campañas masivas oficiales</strong> por WhatsApp y cobros en línea</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-green">✓</span>
                      <span><strong>Suite Ilimitada:</strong> Process ilimitado, Mailing (100k), Bills Pro, Kredit</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-green">✓</span>
                      <span><strong>Soporte prioritario 24/7</strong> con atención preferencial</span>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 3. Plan Básico Suite (BLUE THEME) */}
              <div className="pricing-plan-card">
                {currentPlan === 'basic' && (
                  <span className="pricing-plan-active-badge">
                    Tu Plan Activo
                  </span>
                )}
                <div className="pricing-card-icon-box" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <h3 className="pricing-card-title">Plan Básico Suite</h3>
                <p className="pricing-card-desc">Ideal para profesionales y pequeños negocios que buscan optimizar su operación.</p>
                
                <div className="pricing-price-wrapper">
                  <span className="pricing-price-amount">$55</span>
                  <span className="pricing-price-period">/mes</span>
                </div>

                <button
                  onClick={() => handleSelectPlan(basicPriceId, "basic")}
                  disabled={loadingPlan !== null || currentPlan === 'basic'}
                  className="pricing-btn-dark"
                  style={{ opacity: currentPlan === 'basic' ? 0.6 : 1 }}
                >
                  {loadingPlan === 'basic' ? (
                    <>
                      <span className="spin-icon">⏳</span> Cargando pasarela...
                    </>
                  ) : currentPlan === 'basic' ? (
                    'Plan Suscrito'
                  ) : (
                    <>
                      <span>Adquirir Plan Básico</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>

                <div className="pricing-features-section">
                  <div className="pricing-features-header" style={{ color: '#0284c7' }}>
                    Incluye todas estas herramientas:
                  </div>
                  <ul className="pricing-feature-list">
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-blue">✓</span>
                      <span><strong>Apps:</strong> Bills, Process, Mailing, Kredit, Reactivaleads</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-blue">✓</span>
                      <span><strong>Mailing:</strong> 25k envíos/mes, 2k contactos, 25 tokens IA</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-blue">✓</span>
                      <span><strong>Process:</strong> 20 ejecuciones activas, 100 tokens IA</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-blue">✓</span>
                      <span><strong>Bills:</strong> Facturación inteligente y 100 tokens IA</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-blue">✓</span>
                      <span><strong>Kredit & Reactivaleads:</strong> 500 contactos y 2 campañas</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 4. Plan Pro Suite (BLUE THEME - RECOMMENDED) */}
              <div className="pricing-plan-card pro-card-suite">
                <span className="pricing-plan-top-badge badge-blue">
                  RECOMENDADO
                </span>
                {currentPlan === 'pro' && (
                  <span className="pricing-plan-active-badge">
                    Tu Plan Activo
                  </span>
                )}
                <div className="pricing-card-icon-box" style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <h3 className="pricing-card-title">Plan Pro Suite</h3>
                <p className="pricing-card-desc">Para empresas consolidadas que requieren flujos de automatización ilimitados.</p>
                
                <div className="pricing-price-wrapper">
                  <span className="pricing-price-amount">$95</span>
                  <span className="pricing-price-period">/mes</span>
                </div>

                <button
                  onClick={() => handleSelectPlan(proPriceId, "pro")}
                  disabled={loadingPlan !== null || currentPlan === 'pro'}
                  className="pricing-btn-primary-blue"
                  style={{ opacity: currentPlan === 'pro' ? 0.6 : 1 }}
                >
                  {loadingPlan === 'pro' ? (
                    <>
                      <span className="spin-icon">⏳</span> Cargando pasarela...
                    </>
                  ) : currentPlan === 'pro' ? (
                    'Plan Suscrito'
                  ) : (
                    <>
                      <span>Adquirir Plan Pro</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>

                <div className="pricing-features-section">
                  <div className="pricing-features-header" style={{ color: '#0284c7' }}>
                    Todo lo del plan básico, más:
                  </div>
                  <ul className="pricing-feature-list">
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-blue">✓</span>
                      <span><strong>Apps:</strong> Bills, Process, Mailing, Kredit, Reactivaleads</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-blue">✓</span>
                      <span><strong>Mailing:</strong> 100k envíos/mes, 20k contactos, 100 tokens IA</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-blue">✓</span>
                      <span><strong>Process:</strong> Ejecuciones Ilimitadas, 1,000 tokens IA</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-blue">✓</span>
                      <span><strong>Bills:</strong> Pagos digitales, SMTP propio, 1,000 tokens IA</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-blue">✓</span>
                      <span><strong>Kredit & Reactivaleads:</strong> Capacidad Ilimitada</span>
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-feature-check check-blue">✓</span>
                      <span><strong>Soporte prioritario:</strong> 24/7 con atención preferencial</span>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Bottom Actions & Stripe Verification */}
        <div style={{ textAlign: 'center', width: '100%', marginBottom: '3rem' }}>
          {hasPaidPlan ? (
            <a href="/" className="landing-cta-sublink" style={{ fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              ← Volver al Dashboard Principal
            </a>
          ) : isAuthenticated ? (
            <div className="pricing-sync-container">
              <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0 }}>
                ¿Ya has adquirido un plan y no se visualiza automáticamente?
              </p>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="pricing-sync-btn"
              >
                {syncing ? (
                  <>
                    <span className="spin-icon">🔄</span>
                    <span>Verificando con Stripe...</span>
                  </>
                ) : (
                  <>
                    <span>🔄 Sincronizar / Verificar suscripción</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
              ¿Ya tienes cuenta?{' '}
              <a href="/api/auth/login?post_login_redirect_url=/pricing" className="landing-cta-sublink">
                Inicia sesión aquí
              </a>
            </p>
          )}
        </div>

        {/* Footer */}
        <footer className="landing-footer">
          <p>© 2026 Kônsul Digital. Automatización & IA para empresas.</p>
        </footer>

      </div>
    </main>
  );
}
