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
      setError(err.message || "Ocurrió un error al iniciar la pasarela de pago.");
      setLoadingPlan(null);
    }
  };

  const hasPaidPlan = ['basic', 'pro', 'basic_leads', 'pro_leads'].includes(currentPlan);

  return (
    <main className="landing-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
        
        {/* Top Header */}
        <div style={{ textTransform: 'none', textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '0.4rem 1.2rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            🔒 Paso Obligatorio: Selecciona tu suscripción
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Estás a un paso de desbloquear todo el potencial de tu negocio
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
            Elige uno de nuestros planes premium para activar la Suite y desbloquear todas las herramientas y el menú de navegación.
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Categories Selector */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          {/* Opción 1: Suite */}
          <div 
            onClick={() => setPricingCategory('suite')}
            style={{
              background: '#ffffff',
              border: pricingCategory === 'suite' ? '2.5px solid #6366f1' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              cursor: 'pointer',
              boxShadow: pricingCategory === 'suite' ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
              transition: 'all 0.2s',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: pricingCategory === 'suite' ? '#6366f1' : '#64748b' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Planes de la Suite</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              Acceso completo a la suite principal de herramientas unificadas (Bills, Process, Kredit, Mailing) excepto LeadsHUB.
            </p>
          </div>

          {/* Opción 2: Suite + LeadsHUB */}
          <div 
            onClick={() => setPricingCategory('leads')}
            style={{
              background: '#ffffff',
              border: pricingCategory === 'leads' ? '2.5px solid #6366f1' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              cursor: 'pointer',
              boxShadow: pricingCategory === 'leads' ? '0 10px 15px -3px rgba(99, 102, 241, 0.1)' : 'none',
              transition: 'all 0.2s',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: pricingCategory === 'leads' ? '#6366f1' : '#64748b' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                </svg>
              </span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Planes Suite + LeadsHUB</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              El paquete definitivo. Integra toda la Suite y desbloquea LeadsHUB para captar y automatizar leads.
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
                borderRadius: '16px',
                border: currentPlan === 'basic' ? '3px solid #10b981' : '1px solid #e2e8f0',
                padding: '2.5rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
              }}>
                {currentPlan === 'basic' && (
                  <span style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#10b981', color: '#ffffff', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                    Tu Plan Activo
                  </span>
                )}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', margin: '0 0 0.5rem 0' }}>Plan Básico Suite</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.5rem 0' }}>Ideal para pequeños empresarios y profesionales independientes.</p>
                
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>$55</span>
                  <span style={{ fontSize: '1rem', color: '#64748b', marginLeft: '0.25rem' }}>/mes</span>
                </div>

                <button
                  onClick={() => handleSelectPlan(basicPriceId, "basic")}
                  disabled={loadingPlan !== null || currentPlan === 'basic'}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: (loadingPlan !== null || currentPlan === 'basic') ? 'not-allowed' : 'pointer',
                    background: currentPlan === 'basic' ? '#e2e8f0' : '#0f172a',
                    color: currentPlan === 'basic' ? '#64748b' : '#ffffff',
                    border: 'none',
                    transition: 'all 0.2s',
                    marginBottom: '2rem'
                  }}
                >
                  {loadingPlan === 'basic' ? 'Cargando pasarela...' : currentPlan === 'basic' ? 'Suscrito' : 'Adquirir Plan Básico'}
                </button>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', flexGrow: 1 }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> <b>Apps Incluidas:</b> Bills, Process, Mailing, Kredit, Reactivaleads <i>(LeadsHUB no incluido)</i>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> <b>Mailing:</b> 25k envíos/mes, 2k contactos, 25 tokens IA
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> <b>Process:</b> 20 ejecuciones activas, 100 tokens IA
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> <b>Bills:</b> Reportes financieros y 100 tokens IA
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> <b>Kredit:</b> 500 contactos, 10 propiedades
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> <b>Reactivaleads:</b> 2k contactos, 2 campañas
                    </li>
                  </ul>
                </div>
              </div>

              {/* Plan Pro Suite */}
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: currentPlan === 'pro' ? '3px solid #6366f1' : '2px solid #6366f1',
                padding: '2.5rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(99, 102, 241, 0.1)',
              }}>
                <span style={{ position: 'absolute', top: '-0.75rem', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: '#ffffff', padding: '0.25rem 1rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Recomendado
                </span>
                {currentPlan === 'pro' && (
                  <span style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#6366f1', color: '#ffffff', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                    Tu Plan Activo
                  </span>
                )}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', margin: '0 0 0.5rem 0' }}>Plan Pro Suite</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.5rem 0' }}>Para empresas en crecimiento y flujos de automatización ilimitados.</p>
                
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>$95</span>
                  <span style={{ fontSize: '1rem', color: '#64748b', marginLeft: '0.25rem' }}>/mes</span>
                </div>

                <button
                  onClick={() => handleSelectPlan(proPriceId, "pro")}
                  disabled={loadingPlan !== null || currentPlan === 'pro'}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: (loadingPlan !== null || currentPlan === 'pro') ? 'not-allowed' : 'pointer',
                    background: currentPlan === 'pro' ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: currentPlan === 'pro' ? '#64748b' : '#ffffff',
                    border: 'none',
                    transition: 'all 0.2s',
                    boxShadow: currentPlan === 'pro' ? 'none' : '0 4px 14px rgba(99, 102, 241, 0.4)',
                    marginBottom: '2rem'
                  }}
                >
                  {loadingPlan === 'pro' ? 'Cargando pasarela...' : currentPlan === 'pro' ? 'Suscrito' : 'Adquirir Plan Pro'}
                </button>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', flexGrow: 1 }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> <b>Apps Incluidas:</b> Bills, Process, Mailing, Kredit, Reactivaleads <i>(LeadsHUB no incluido)</i>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> <b>Mailing:</b> 100k envíos/mes, 20k contactos, 100 tokens IA
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> <b>Process:</b> Ejecuciones Ilimitadas, 1000 tokens IA
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> <b>Bills:</b> Pagos digitales, SMTP propio, 1000 tokens IA
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> <b>Kredit y Reactivaleads:</b> Todo Ilimitado
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> Soporte prioritario 24/7
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
                borderRadius: '16px',
                border: currentPlan === 'basic_leads' ? '3px solid #10b981' : '1px solid #e2e8f0',
                padding: '2.5rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
              }}>
                {currentPlan === 'basic_leads' && (
                  <span style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#10b981', color: '#ffffff', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                    Tu Plan Activo
                  </span>
                )}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', margin: '0 0 0.5rem 0' }}>Básico Suite + LeadsHUB</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.5rem 0' }}>El primer paso para expandir tu negocio y captación de leads.</p>
                
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>$95</span>
                  <span style={{ fontSize: '1rem', color: '#64748b', marginLeft: '0.25rem' }}>/mes</span>
                </div>

                <button
                  onClick={() => handleSelectPlan(basicLeadsPriceId, "basic_leads")}
                  disabled={loadingPlan !== null || currentPlan === 'basic_leads'}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: (loadingPlan !== null || currentPlan === 'basic_leads') ? 'not-allowed' : 'pointer',
                    background: currentPlan === 'basic_leads' ? '#e2e8f0' : '#0f172a',
                    color: currentPlan === 'basic_leads' ? '#64748b' : '#ffffff',
                    border: 'none',
                    transition: 'all 0.2s',
                    marginBottom: '2rem'
                  }}
                >
                  {loadingPlan === 'basic_leads' ? 'Cargando pasarela...' : currentPlan === 'basic_leads' ? 'Suscrito' : 'Adquirir Plan Básico + Leads'}
                </button>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', flexGrow: 1 }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> <b>Apps Incluidas:</b> Todas las de la Suite + <b>LeadsHUB</b>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> <b>LeadsHUB:</b> Acceso completo, hasta 1,000 contactos
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> <b>Mailing:</b> 25k envíos/mes, 2k contactos
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> <b>Process:</b> 20 ejecuciones, <b>Bills:</b> Reportes
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> <b>Kredit:</b> 500 contactos, 10 propiedades
                    </li>
                  </ul>
                </div>
              </div>

              {/* Plan Pro Suite + LeadsHUB */}
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: currentPlan === 'pro_leads' ? '3px solid #6366f1' : '2px solid #6366f1',
                padding: '2.5rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(99, 102, 241, 0.1)',
              }}>
                <span style={{ position: 'absolute', top: '-0.75rem', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: '#ffffff', padding: '0.25rem 1rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Recomendado
                </span>
                {currentPlan === 'pro_leads' && (
                  <span style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#6366f1', color: '#ffffff', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                    Tu Plan Activo
                  </span>
                )}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', margin: '0 0 0.5rem 0' }}>Pro Suite + LeadsHUB</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.5rem 0' }}>Control absoluto de tu Suite con automatización y leads ilimitados.</p>
                
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>$195</span>
                  <span style={{ fontSize: '1rem', color: '#64748b', marginLeft: '0.25rem' }}>/mes</span>
                </div>

                <button
                  onClick={() => handleSelectPlan(proLeadsPriceId, "pro_leads")}
                  disabled={loadingPlan !== null || currentPlan === 'pro_leads'}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: (loadingPlan !== null || currentPlan === 'pro_leads') ? 'not-allowed' : 'pointer',
                    background: currentPlan === 'pro_leads' ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: currentPlan === 'pro_leads' ? '#64748b' : '#ffffff',
                    border: 'none',
                    transition: 'all 0.2s',
                    boxShadow: currentPlan === 'pro_leads' ? 'none' : '0 4px 14px rgba(99, 102, 241, 0.4)',
                    marginBottom: '2rem'
                  }}
                >
                  {loadingPlan === 'pro_leads' ? 'Cargando pasarela...' : currentPlan === 'pro_leads' ? 'Suscrito' : 'Adquirir Plan Pro + Leads'}
                </button>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', flexGrow: 1 }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> <b>Apps Incluidas:</b> Todas las de la Suite + <b>LeadsHUB</b>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> <b>LeadsHUB:</b> Contactos y leads Ilimitados
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> <b>Mailing:</b> 100k envíos, 20k contactos, 100 IA
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> <b>Process:</b> Ejecuciones Ilimitadas, 1000 IA
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> <b>Bills y Kredit:</b> Funciones Pro Ilimitadas
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
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              ¿Ya has adquirido un plan y no se visualiza? Recarga la página o contacta con soporte.
            </p>
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
