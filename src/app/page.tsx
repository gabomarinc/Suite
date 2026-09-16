import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { syncUserPlanFromStripe } from "@/lib/stripeSync";

export default async function DashboardHub() {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  
  if (!isAuth) {
    // Render modern, unified Landing Page matching Kônsul Brand & chatbot-landing
    return (
      <main className="landing-page-root">
        <div className="landing-grid-overlay" />
        
        <div className="landing-container">
          {/* Floating Pill Navigation Bar */}
          <header className="landing-navbar-pill">
            <a href="https://konsul.digital" className="landing-nav-logo" title="Kônsul Digital">
              <img 
                src="/konsul-logo-white.png" 
                alt="Kônsul Logo" 
                style={{ height: '36px', width: 'auto', display: 'block' }} 
              />
            </a>
            
            <div className="landing-nav-actions">
              <a href="/api/auth/login?post_login_redirect_url=/" className="landing-login-btn">
                Iniciar Sesión
              </a>
              <RegisterLink postLoginRedirectURL="/pricing" className="landing-register-btn">
                Comenzar Gratis
              </RegisterLink>
            </div>
          </header>

          {/* Hero Section */}
          <div className="landing-hero">
            <div className="landing-pill-badge">
              <span className="landing-pill-dot" />
              KÔNSUL SUITE UNIFICADA
            </div>

            <h1 className="landing-hero-title">
              La Suite de Herramientas Completa <br />
              <span className="landing-hero-title-accent">para Tu Negocio</span>
            </h1>
            
            <p className="landing-hero-desc">
              Accede a facturación electrónica inteligente, gestión de flujos de trabajo Kanban, captación de leads, análisis financiero de créditos y campañas de correo en una sola plataforma unificada.
            </p>
          </div>

          {/* 6 Ecosystem Micro-SaaS Cards Grid */}
          <div className="landing-cards-grid">
            {/* 1. Bills */}
            <div className="landing-card">
              <div className="landing-card-icon-box" style={{ background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.25)', color: '#34d399' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <h4 className="landing-card-title">Kônsul Bills</h4>
              <p className="landing-card-desc">Facturación electrónica inteligente, control de gastos, reportes fiscales automáticos y conciliación asistida por IA.</p>
            </div>

            {/* 2. Process */}
            <div className="landing-card">
              <div className="landing-card-icon-box" style={{ background: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.25)', color: '#7dd3fc' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h4 className="landing-card-title">Kônsul Process</h4>
              <p className="landing-card-desc">Diseño de plantillas de procesos, flujos operativos en tiempo real, Kanban y automatizaciones con IA.</p>
            </div>

            {/* 3. Mailing */}
            <div className="landing-card">
              <div className="landing-card-icon-box" style={{ background: 'rgba(244, 114, 182, 0.12)', borderColor: 'rgba(244, 114, 182, 0.25)', color: '#f472b6' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h4 className="landing-card-title">Kônsul Mailing</h4>
              <p className="landing-card-desc">Email Marketing masivo ultra-eficiente de alta escalabilidad, con enfoque en diseño emocional.</p>
            </div>

            {/* 4. Kredit */}
            <div className="landing-card">
              <div className="landing-card-icon-box" style={{ background: 'rgba(192, 132, 252, 0.12)', borderColor: 'rgba(192, 132, 252, 0.25)', color: '#c084fc' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h4 className="landing-card-title">Kônsul Kredit</h4>
              <p className="landing-card-desc">Gestión avanzada de prospectos inmobiliarios integrada con cálculo automático de crédito hipotecario.</p>
            </div>

            {/* 5. Reactivaleads */}
            <div className="landing-card">
              <div className="landing-card-icon-box" style={{ background: 'rgba(251, 146, 60, 0.12)', borderColor: 'rgba(251, 146, 60, 0.25)', color: '#fb923c' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h4 className="landing-card-title">Kônsul Reactivaleads</h4>
              <p className="landing-card-desc">Captación inteligente de clientes potenciales mediante embudos automatizados de email marketing.</p>
            </div>

            {/* 6. LeadsHUB */}
            <div className="landing-card highlight">
              <span className="landing-card-badge">PREMIUM</span>
              <div className="landing-card-icon-box" style={{ background: 'rgba(125, 211, 252, 0.15)', borderColor: 'rgba(125, 211, 252, 0.3)', color: '#7dd3fc' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                </svg>
              </div>
              <h4 className="landing-card-title">Kônsul LeadsHUB</h4>
              <p className="landing-card-desc">Plataforma premium de prospección automática, captación multicanal masiva y seguimiento de leads con IA.</p>
            </div>
          </div>

          {/* Call to Action Banner */}
          <div className="landing-cta-box">
            <RegisterLink postLoginRedirectURL="/pricing" className="landing-main-cta-btn">
              <span>Comenzar Ahora Gratis</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </RegisterLink>
            
            <p className="landing-cta-subtext">
              ¿Ya tienes cuenta?{' '}
              <a href="/api/auth/login?post_login_redirect_url=/" className="landing-cta-sublink">
                Inicia sesión aquí
              </a>
            </p>
          </div>

          {/* Footer */}
          <footer className="landing-footer">
            <p>© 2026 Kônsul Digital. Automatización & IA para empresas.</p>
          </footer>
        </div>
      </main>
    );
  }

  const user = await getUser();
  let dbUser = null;

  if (user && user.id) {
    try {
      const email = user.email || '';
      // 1. Try finding by Kinde ID
      dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      
      if (!dbUser && email) {
        // 2. Not found by Kinde ID, check if exists by email (legacy imported user)
        dbUser = await prisma.user.findUnique({ where: { email } });
        
        if (dbUser) {
          // 3. Pair legacy user: Update their ID from temp to Kinde ID
          await prisma.user.update({
            where: { email },
            data: { id: user.id }
          });
        }
      }

      // 4. Upsert with the Kinde ID to ensure data is fresh
      dbUser = await prisma.user.upsert({
        where: { id: user.id },
        update: {
          firstName: user.given_name,
          lastName: user.family_name,
        },
        create: {
          id: user.id,
          email: email,
          firstName: user.given_name,
          lastName: user.family_name,
        }
      });

      // 5. If user plan is free, attempt self-healing sync with Stripe directly
      if (!dbUser.plan || dbUser.plan === 'free') {
        const syncedUser = await syncUserPlanFromStripe({ id: user.id, email });
        if (syncedUser) {
          dbUser = syncedUser;
        }
      }
    } catch (e) {
      console.error("Failed to sync user to database:", e);
    }
  }

  if (!dbUser || !dbUser.plan || dbUser.plan === 'free') {
    redirect('/pricing');
  }

  const plan = dbUser.plan;
  const hasLeadsHub = plan === 'basic_leads' || plan === 'pro_leads';

  // Current Date logic
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
  const currentDate = new Date().toLocaleDateString('es-ES', dateOptions).toUpperCase();

  const planDisplayName = plan === 'pro_leads' 
    ? 'Pro LeadsHUB' 
    : plan === 'basic_leads' 
    ? 'Basic LeadsHUB' 
    : plan === 'pro' 
    ? 'Pro Suite' 
    : 'Basic Suite';

  return (
    <main className="main-content">
      
      {/* Topbar matching Image 2 */}
      <div className="dashboard-topbar">
        <div className="topbar-left">
          <div className="workspace-badge-selector">
            <span>Mi Workspace</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div className="topbar-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Buscar app o función..." />
          </div>
        </div>

        <div className="topbar-right">
          <div className="credits-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            <span>ESTADO: <strong>{planDisplayName}</strong></span>
          </div>
          <div className="date-filter-pill">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>{currentDate}</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
          Panel Principal
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Información estratégica de tus herramientas unificadas y acceso directo a cada aplicación.
        </p>
      </div>

      {/* Stat Metric Cards (Image 2 style) */}
      <div className="metrics-grid-4">
        <div className="stat-card-clean">
          <div className="stat-card-header">
            <div className="stat-icon-circle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <span className="stat-trend-pill">~ 100%</span>
          </div>
          <div>
            <div className="stat-value-large">5</div>
            <div className="stat-label-sub">Herramientas Conectadas</div>
          </div>
        </div>

        <div className="stat-card-clean">
          <div className="stat-card-header">
            <div className="stat-icon-circle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <span className="stat-trend-pill">✓ Activo</span>
          </div>
          <div>
            <div className="stat-value-large">SSO</div>
            <div className="stat-label-sub">Sesión Central Kinde</div>
          </div>
        </div>

        <div className="stat-card-clean">
          <div className="stat-card-header">
            <div className="stat-icon-circle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <span className="stat-trend-pill">✓ Ilimitado</span>
          </div>
          <div>
            <div className="stat-value-large">{hasLeadsHub ? 'Pro' : 'Activo'}</div>
            <div className="stat-label-sub">Nivel de Acceso Suite</div>
          </div>
        </div>

        <div className="stat-card-clean">
          <div className="stat-card-header">
            <div className="stat-icon-circle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
            </div>
            <span className="stat-trend-pill">100%</span>
          </div>
          <div>
            <div className="stat-value-large">Operativo</div>
            <div className="stat-label-sub">Estado del Sistema</div>
          </div>
        </div>
      </div>

      {/* Section Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)' }}>
          Aplicaciones de la Suite
        </h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Haz clic para abrir sin volver a iniciar sesión
        </span>
      </div>

      {/* App Cards Grid */}
      <div className="dashboard-grid">
        
        {/* Bills Card */}
        <a href="https://bills.konsul.digital/api/auth/login?prompt=none" className="card card-bills">
          <div className="card-header-suite">
            <div className="card-suite-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            </div>
            <span className="card-badge-status">
              Conectado
            </span>
          </div>
          <div className="card-body">
            <h3>Kônsul Bills</h3>
            <p>Facturación electrónica inteligente, control y conciliación de gastos e ingresos, reportes fiscales automáticos y conciliación asistida por IA.</p>
          </div>
          <div className="card-footer-suite">
            <div className="quick-links">
              <span className="quick-link-btn">Facturas</span>
              <span className="quick-link-btn">Gastos</span>
              <span className="quick-link-btn">Reportes</span>
            </div>
            <div className="arrow-suite-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </div>
          </div>
        </a>

        {/* Process Card */}
        <a href="https://process.konsul.digital/api/auth/login?prompt=none" className="card card-process">
          <div className="card-header-suite">
            <div className="card-suite-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            </div>
            <span className="card-badge-status">
              Conectado
            </span>
          </div>
          <div className="card-body">
            <h3>Kônsul Process</h3>
            <p>Diseño de plantillas de procesos, flujos operativos con seguimiento en tiempo real, gestión de proyectos estilo Kanban y automatización con IA.</p>
          </div>
          <div className="card-footer-suite">
            <div className="quick-links">
              <span className="quick-link-btn">Tableros</span>
              <span className="quick-link-btn">Flujos</span>
              <span className="quick-link-btn">Kanban</span>
            </div>
            <div className="arrow-suite-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </div>
          </div>
        </a>

        {/* LeadsHUB Card */}
        <a href="https://reactivaleads.konsul.digital/api/auth/login?prompt=none" className="card card-reactivaleads">
          <div className="card-header-suite">
            <div className="card-suite-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="9" y1="10" x2="15" y2="10"></line></svg>
            </div>
            <span className="card-badge-status">
              Conectado
            </span>
          </div>
          <div className="card-body">
            <h3>Kônsul LeadsHUB</h3>
            <p>Agentes de IA autónomos, mensajería omnicanal por WhatsApp e Instagram, y gestión de embudos CRM.</p>
          </div>
          <div className="card-footer-suite">
            <div className="quick-links">
              <span className="quick-link-btn">Agentes IA</span>
              <span className="quick-link-btn">CRM Leads</span>
              <span className="quick-link-btn">WhatsApp</span>
            </div>
            <div className="arrow-suite-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </div>
          </div>
        </a>

        {/* Kredit Card */}
        <a href="https://kredit.konsul.digital/api/auth/login?prompt=none" className="card card-kredit">
          <div className="card-header-suite">
            <div className="card-suite-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <span className="card-badge-status">
              Conectado
            </span>
          </div>
          <div className="card-body">
            <h3>Kônsul Kredit</h3>
            <p>Gestión avanzada de prospectos inmobiliarios integrada con cálculo automático de crédito hipotecario y evaluación de riesgo.</p>
          </div>
          <div className="card-footer-suite">
            <div className="quick-links">
              <span className="quick-link-btn">Solicitudes</span>
              <span className="quick-link-btn">Riesgo</span>
              <span className="quick-link-btn">Créditos</span>
            </div>
            <div className="arrow-suite-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </div>
          </div>
        </a>

        {/* Mailing Card */}
        <a href="https://mailing.konsul.digital/api/auth/login?prompt=none" className="card card-mailing">
          <div className="card-header-suite">
            <div className="card-suite-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </div>
            <span className="card-badge-status">
              Conectado
            </span>
          </div>
          <div className="card-body">
            <h3>Kônsul Mailing</h3>
            <p>Email Marketing masivo ultra-eficiente de alta escalabilidad, con enfoque en diseño emocional y entregabilidad verificada.</p>
          </div>
          <div className="card-footer-suite">
            <div className="quick-links">
              <span className="quick-link-btn">Correos</span>
              <span className="quick-link-btn">Audiencias</span>
              <span className="quick-link-btn">Plantillas</span>
            </div>
            <div className="arrow-suite-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </div>
          </div>
        </a>

      </div>
    </main>
  );
}
