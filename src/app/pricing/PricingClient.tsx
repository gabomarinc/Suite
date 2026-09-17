'use client';

import { useEffect, useState } from 'react';

interface PricingClientProps {
  isAuthenticated: boolean;
  currentPlan: string;
}

export default function PricingClient({ isAuthenticated, currentPlan }: PricingClientProps) {
  const [pricingCategory, setPricingCategory] = useState<'suite' | 'leads' | null>(null);
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
      // Clear URL params so it doesn't loop
      window.history.replaceState({}, '', window.location.pathname);
      
      let planName = 'basic';
      if (selectPlan === proPriceId) planName = 'pro';
      else if (selectPlan === basicLeadsPriceId) planName = 'basic_leads';
      else if (selectPlan === proLeadsPriceId) planName = 'pro_leads';
      
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
    <main className="landing-wrapper" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: '3rem 1.5rem',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
    }}>
      <div style={{ maxWidth: '1050px', width: '100%', margin: '0 auto' }}>
        
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="https://konsul.digital/images/Konsul-logo-general.png" alt="Kônsul Logo" style={{ height: '70px', width: 'auto' }} />
        </div>

        {/* Top Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '0.4rem 1.2rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Paso Obligatorio: Selecciona tu suscripción
          </div>
          <h1 style={{ fontSize: '2.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Estás a un paso de desbloquear todo el potencial de tu negocio
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#475569', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
            Elige uno de nuestros planes premium para activar la Suite y desbloquear todas las herramientas y el menú de navegación.
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', color: '#991b1b', padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'center', fontSize: '0.95rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Categories Selector */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          {/* Opción 1: Suite */}
          <div 
            onClick={() => setPricingCategory('suite')}
            style={{
              background: '#ffffff',
              border: pricingCategory === 'suite' ? '2.5px solid #6366f1' : '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '2rem',
              cursor: 'pointer',
              boxShadow: pricingCategory === 'suite' ? '0 12px 24px -4px rgba(99, 102, 241, 0.18)' : '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: pricingCategory === 'suite' ? 'translateY(-2px)' : 'none',
              textAlign: 'left',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: pricingCategory === 'suite' ? 'rgba(99, 102, 241, 0.12)' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: pricingCategory === 'suite' ? '#6366f1' : '#64748b'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Planes de la Suite</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              Acceso completo a la suite principal de herramientas unificadas (Bills, Process, Kredit, Mailing) excepto LeadsHUB.
            </p>
          </div>

          {/* Opción 2: Suite + LeadsHUB */}
          <div 
            onClick={() => setPricingCategory('leads')}
            style={{
              background: '#ffffff',
              border: pricingCategory === 'leads' ? '2.5px solid #6366f1' : '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '2rem',
              cursor: 'pointer',
              boxShadow: pricingCategory === 'leads' ? '0 12px 24px -4px rgba(99, 102, 241, 0.18)' : '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: pricingCategory === 'leads' ? 'translateY(-2px)' : 'none',
              textAlign: 'left',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: pricingCategory === 'leads' ? '#e0e7ff' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: pricingCategory === 'leads' ? '#4f46e5' : '#64748b'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Suite + LeadsHUB
                <span style={{ fontSize: '0.7rem', background: '#e0e7ff', color: '#4f46e5', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 800 }}>Premium</span>
              </h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              El paquete definitivo. Integra toda la Suite y desbloquea LeadsHUB para captar y automatizar leads con IA.
            </p>
          </div>
        </div>

        {/* Pricing Grid */}
        {pricingCategory && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
            
            {pricingCategory === 'suite' ? (
            <>
              {/* Plan Básico Suite */}
              <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                border: currentPlan === 'basic' ? '3px solid #10b981' : '1px solid #e2e8f0',
                padding: '2.5rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease',
              }}>
                {currentPlan === 'basic' && (
                  <span style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#10b981', color: '#ffffff', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                    Tu Plan Activo
                  </span>
                )}
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', marginBottom: '1.25rem' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Plan Básico Suite</h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 1.75rem 0', lineHeight: 1.5 }}>Ideal para pequeños empresarios y profesionales independientes.</p>
                
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2rem' }}>
                  <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>$55</span>
                  <span style={{ fontSize: '1rem', color: '#64748b', marginLeft: '0.35rem', fontWeight: 600 }}>/mes</span>
                </div>

                <button
                  onClick={() => handleSelectPlan(basicPriceId, "basic")}
                  disabled={loadingPlan !== null || currentPlan === 'basic'}
                  style={{
                    width: '100%',
                    padding: '0.95rem',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: (loadingPlan !== null || currentPlan === 'basic') ? 'not-allowed' : 'pointer',
                    background: currentPlan === 'basic' ? '#e2e8f0' : '#0f172a',
                    color: currentPlan === 'basic' ? '#64748b' : '#ffffff',
                    border: 'none',
                    transition: 'all 0.2s',
                    marginBottom: '2rem',
                    boxShadow: currentPlan === 'basic' ? 'none' : '0 4px 12px rgba(15, 23, 42, 0.15)'
                  }}
                >
                  {loadingPlan === 'basic' ? 'Cargando pasarela...' : currentPlan === 'basic' ? 'Suscrito' : 'Adquirir Plan Básico →'}
                </button>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.75rem', flexGrow: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '1rem' }}>
                    Incluye todas estas herramientas:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Apps:</b> Bills, Process, Mailing, Kredit, Reactivaleads <i>(LeadsHUB no incluido)</i></span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Mailing:</b> 25k envíos/mes, 2k contactos, 25 tokens IA</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Process:</b> 20 ejecuciones activas, 100 tokens IA</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Bills:</b> Facturación inteligente y 100 tokens IA</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Kredit & Reactivaleads:</b> 500 contactos y 2 campañas</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Plan Pro Suite */}
              <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                border: currentPlan === 'pro' ? '3px solid #6366f1' : '2px solid #6366f1',
                padding: '2.5rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 30px -8px rgba(99, 102, 241, 0.15)',
                transition: 'all 0.2s ease',
              }}>
                <span style={{ position: 'absolute', top: '-0.75rem', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff', padding: '0.3rem 1.2rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.35)' }}>
                  Recomendado
                </span>
                {currentPlan === 'pro' && (
                  <span style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#6366f1', color: '#ffffff', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                    Tu Plan Activo
                  </span>
                )}
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(79, 70, 229, 0.15) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', marginBottom: '1.25rem' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Plan Pro Suite</h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 1.75rem 0', lineHeight: 1.5 }}>Para empresas en crecimiento y flujos de automatización ilimitados.</p>
                
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2rem' }}>
                  <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>$95</span>
                  <span style={{ fontSize: '1rem', color: '#64748b', marginLeft: '0.35rem', fontWeight: 600 }}>/mes</span>
                </div>

                <button
                  onClick={() => handleSelectPlan(proPriceId, "pro")}
                  disabled={loadingPlan !== null || currentPlan === 'pro'}
                  style={{
                    width: '100%',
                    padding: '0.95rem',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: (loadingPlan !== null || currentPlan === 'pro') ? 'not-allowed' : 'pointer',
                    background: currentPlan === 'pro' ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: currentPlan === 'pro' ? '#64748b' : '#ffffff',
                    border: 'none',
                    transition: 'all 0.2s',
                    boxShadow: currentPlan === 'pro' ? 'none' : '0 6px 18px rgba(99, 102, 241, 0.35)',
                    marginBottom: '2rem'
                  }}
                >
                  {loadingPlan === 'pro' ? 'Cargando pasarela...' : currentPlan === 'pro' ? 'Suscrito' : 'Adquirir Plan Pro →'}
                </button>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.75rem', flexGrow: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6366f1', marginBottom: '1rem' }}>
                    Todo lo del plan básico, más:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#6366f1', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Apps:</b> Bills, Process, Mailing, Kredit, Reactivaleads</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#6366f1', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Mailing:</b> 100k envíos/mes, 20k contactos, 100 tokens IA</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#6366f1', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Process:</b> Ejecuciones Ilimitadas, 1,000 tokens IA</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#6366f1', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Bills:</b> Pagos digitales, SMTP propio, 1,000 tokens IA</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#6366f1', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Kredit & Reactivaleads:</b> Capacidad Ilimitada</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#6366f1', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Soporte prioritario:</b> 24/7 con atención preferencial</span>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Plan Básico Suite + LeadsHUB */}
              <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                border: currentPlan === 'basic_leads' ? '3px solid #10b981' : '1px solid #e2e8f0',
                padding: '2.5rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease',
              }}>
                {currentPlan === 'basic_leads' && (
                  <span style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#10b981', color: '#ffffff', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                    Tu Plan Activo
                  </span>
                )}
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', marginBottom: '1.25rem' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Básico Suite + LeadsHUB</h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 1.75rem 0', lineHeight: 1.5 }}>El primer paso para expandir tu negocio y captación multicanal de leads.</p>
                
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2rem' }}>
                  <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>$95</span>
                  <span style={{ fontSize: '1rem', color: '#64748b', marginLeft: '0.35rem', fontWeight: 600 }}>/mes</span>
                </div>

                <button
                  onClick={() => handleSelectPlan(basicLeadsPriceId, "basic_leads")}
                  disabled={loadingPlan !== null || currentPlan === 'basic_leads'}
                  style={{
                    width: '100%',
                    padding: '0.95rem',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: (loadingPlan !== null || currentPlan === 'basic_leads') ? 'not-allowed' : 'pointer',
                    background: currentPlan === 'basic_leads' ? '#e2e8f0' : '#0f172a',
                    color: currentPlan === 'basic_leads' ? '#64748b' : '#ffffff',
                    border: 'none',
                    transition: 'all 0.2s',
                    marginBottom: '2rem',
                    boxShadow: currentPlan === 'basic_leads' ? 'none' : '0 4px 12px rgba(15, 23, 42, 0.15)'
                  }}
                >
                  {loadingPlan === 'basic_leads' ? 'Cargando pasarela...' : currentPlan === 'basic_leads' ? 'Suscrito' : 'Adquirir Básico + Leads →'}
                </button>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.75rem', flexGrow: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '1rem' }}>
                    Incluye Suite completa y LeadsHUB:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Apps:</b> Toda la Suite + <b>LeadsHUB</b></span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>LeadsHUB:</b> Acceso completo, hasta 1,000 contactos</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Mailing:</b> 25k envíos/mes, 2k contactos</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Process:</b> 20 ejecuciones, <b>Bills:</b> Facturación</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Kredit:</b> 500 contactos, 10 propiedades</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Plan Pro Suite + LeadsHUB */}
              <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                border: currentPlan === 'pro_leads' ? '3px solid #6366f1' : '2px solid #6366f1',
                padding: '2.5rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 30px -8px rgba(99, 102, 241, 0.15)',
                transition: 'all 0.2s ease',
              }}>
                <span style={{ position: 'absolute', top: '-0.75rem', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff', padding: '0.3rem 1.2rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.35)' }}>
                  Recomendado
                </span>
                {currentPlan === 'pro_leads' && (
                  <span style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#6366f1', color: '#ffffff', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                    Tu Plan Activo
                  </span>
                )}
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(79, 70, 229, 0.15) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', marginBottom: '1.25rem' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Pro Suite + LeadsHUB</h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 1.75rem 0', lineHeight: 1.5 }}>Control absoluto de tu Suite con automatización y leads ilimitados.</p>
                
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2rem' }}>
                  <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>$195</span>
                  <span style={{ fontSize: '1rem', color: '#64748b', marginLeft: '0.35rem', fontWeight: 600 }}>/mes</span>
                </div>

                <button
                  onClick={() => handleSelectPlan(proLeadsPriceId, "pro_leads")}
                  disabled={loadingPlan !== null || currentPlan === 'pro_leads'}
                  style={{
                    width: '100%',
                    padding: '0.95rem',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: (loadingPlan !== null || currentPlan === 'pro_leads') ? 'not-allowed' : 'pointer',
                    background: currentPlan === 'pro_leads' ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: currentPlan === 'pro_leads' ? '#64748b' : '#ffffff',
                    border: 'none',
                    transition: 'all 0.2s',
                    boxShadow: currentPlan === 'pro_leads' ? 'none' : '0 6px 18px rgba(99, 102, 241, 0.35)',
                    marginBottom: '2rem'
                  }}
                >
                  {loadingPlan === 'pro_leads' ? 'Cargando pasarela...' : currentPlan === 'pro_leads' ? 'Suscrito' : 'Adquirir Pro + Leads →'}
                </button>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.75rem', flexGrow: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6366f1', marginBottom: '1rem' }}>
                    Poder ilimitado y LeadsHUB Premium:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#6366f1', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Apps:</b> Toda la Suite + <b>LeadsHUB</b></span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#6366f1', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>LeadsHUB:</b> Contactos y leads Ilimitados</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#6366f1', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Mailing:</b> 100k envíos, 20k contactos, 100 IA</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#6366f1', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Process:</b> Ejecuciones Ilimitadas, 1000 IA</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.4 }}>
                      <span style={{ color: '#6366f1', fontWeight: 800, fontSize: '1rem' }}>✓</span> <span><b>Bills & Kredit:</b> Funciones Pro Ilimitadas</span>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}

          </div>
        )}

        {/* Bottom Actions */}
        <div style={{ textAlign: 'center' }}>
          {hasPaidPlan ? (
            <a href="/" style={{ fontSize: '0.9rem', color: '#4f46e5', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              ← Volver al Dashboard Principal
            </a>
          ) : isAuthenticated ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                ¿Ya has adquirido un plan y no se visualiza?
              </p>
              <button
                onClick={handleSync}
                disabled={syncing}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: syncing ? 'wait' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {syncing ? 'Verificando con Stripe...' : '🔄 Sincronizar / Verificar suscripción'}
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              ¿Ya tienes cuenta? <a href="/api/auth/login" style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>Inicia sesión aquí</a>
            </p>
          )}
        </div>

      </div>
    </main>
  );
}
