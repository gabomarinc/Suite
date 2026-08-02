'use client';

import { useEffect, useState } from 'react';

interface PricingClientProps {
  isAuthenticated: boolean;
  currentPlan: string;
}

export default function PricingClient({ isAuthenticated, currentPlan }: PricingClientProps) {
  const basicPriceId = 'price_1TyDhcGAJ3j5QtJb91sVUk09';
  const proPriceId = 'price_1TyDi1GAJ3j5QtJbNVlb59aE';
  
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle immediate checkout redirect if returning from registration
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectPlan = params.get('select_plan');
    if (selectPlan && isAuthenticated && (basicPriceId || proPriceId)) {
      // Clear URL params so it doesn't loop
      window.history.replaceState({}, '', window.location.pathname);
      
      const planName = selectPlan === basicPriceId ? 'basic' : 'pro';
      handleSelectPlan(selectPlan, planName);
    }
  }, [basicPriceId, proPriceId, isAuthenticated]);

  const handleSelectPlan = async (priceId: string, planName: string) => {
    if (!priceId) {
      setError("No se pudo cargar el identificador de precio de Stripe. Por favor recarga e intenta de nuevo.");
      return;
    }

    setLoadingPlan(planName);
    setError(null);

    if (!isAuthenticated) {
      // If not logged in, redirect to Kinde registration and return here with selection
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

  const hasPaidPlan = currentPlan === 'basic' || currentPlan === 'pro';

  return (
    <main className="landing-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
        
        {/* Top Header */}
        <div style={{ textTransform: 'none', textAlign: 'center', marginBottom: '3rem' }}>
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

        {/* Pricing Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          
          {/* Plan Básico */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: currentPlan === 'basic' ? '3px solid #10b981' : '1px solid #e2e8f0',
            padding: '2.5rem',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            transition: 'transform 0.2s',
          }}>
            {currentPlan === 'basic' && (
              <span style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#10b981', color: '#ffffff', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                Tu Plan Activo
              </span>
            )}
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', margin: '0 0 0.5rem 0' }}>Plan Básico</h3>
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
                  <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> Acceso completo a Kônsul Bills
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> Acceso completo a Kônsul Process
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> Hasta 3 Tableros Kanban de procesos
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> Reportes financieros y fiscales estándar
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> Límites estándar de consumo de IA y SES
                </li>
              </ul>
            </div>
          </div>

          {/* Plan Pro */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: currentPlan === 'pro' ? '3px solid #6366f1' : '2px solid #6366f1',
            padding: '2.5rem',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(99, 102, 241, 0.1), 0 10px 10px -5px rgba(99, 102, 241, 0.04)',
            transition: 'transform 0.2s',
          }}>
            <span style={{ position: 'absolute', top: '-0.75rem', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: '#ffffff', padding: '0.25rem 1rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recomendado
            </span>
            
            {currentPlan === 'pro' && (
              <span style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#6366f1', color: '#ffffff', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                Tu Plan Activo
              </span>
            )}
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', margin: '0 0 0.5rem 0' }}>Plan Pro</h3>
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
                  <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> **Ilimitado** en Bills y Process
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                  <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> Tableros Kanban ilimitados
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                  <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> Automatizaciones de flujo cruzado ilimitadas
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                  <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> Soporte prioritario 24/7
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                  <span style={{ color: '#6366f1', fontWeight: 700 }}>✓</span> Acceso ilimitado *( fair use en IA/SES )*
                </li>
              </ul>
            </div>
          </div>

        </div>

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
