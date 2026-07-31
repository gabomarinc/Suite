'use client';

import { useState } from 'react';
import { RegisterLink, PortalLink } from "@kinde-oss/kinde-auth-nextjs/components";

interface PricingClientProps {
  isAuthenticated: boolean;
  currentPlan: string;
}

const PLAN_BASIC_ID = "basic";
const PLAN_PRO_ID = "pro";

export default function PricingClient({ isAuthenticated, currentPlan }: PricingClientProps) {
  const hasPaidPlan = currentPlan === 'basic' || currentPlan === 'pro';

  return (
    <main className="landing-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
        
        {/* Top Header */}
        <div style={{ textTransform: 'none', textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            Planes Kônsul Suite
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Desbloquea el potencial de tu negocio
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
            Adquiere una de nuestras suscripciones premium para conectar tu facturación y automatizar tus procesos.
          </p>
        </div>

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

          <div style={{ marginBottom: '2rem' }}>
            {!isAuthenticated ? (
              <RegisterLink
                authUrlParams={{ plan_id: PLAN_BASIC_ID }}
                postLoginRedirectURL="/pricing"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  transition: 'all 0.2s',
                }}
              >
                Adquirir Plan Básico
              </RegisterLink>
            ) : currentPlan === 'basic' ? (
              <button
                disabled
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'not-allowed',
                  background: '#e2e8f0',
                  color: '#64748b',
                  border: 'none',
                  transition: 'all 0.2s',
                }}
              >
                Suscrito
              </button>
            ) : (
              <PortalLink
                style={{
                  display: 'block',
                  textAlign: 'center',
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  transition: 'all 0.2s',
                }}
              >
                Adquirir Plan Básico
              </PortalLink>
            )}
          </div>

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

          <div style={{ marginBottom: '2rem' }}>
            {!isAuthenticated ? (
              <RegisterLink
                authUrlParams={{ plan_id: PLAN_PRO_ID }}
                postLoginRedirectURL="/pricing"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  border: 'none',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                }}
              >
                Adquirir Plan Pro
              </RegisterLink>
            ) : currentPlan === 'pro' ? (
              <button
                disabled
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'not-allowed',
                  background: '#e2e8f0',
                  color: '#64748b',
                  border: 'none',
                  transition: 'all 0.2s',
                  boxShadow: 'none',
                }}
              >
                Suscrito
              </button>
            ) : (
              <PortalLink
                style={{
                  display: 'block',
                  textAlign: 'center',
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  border: 'none',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                }}
              >
                Adquirir Plan Pro
              </PortalLink>
            )}
          </div>

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
