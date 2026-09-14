import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { syncUserPlanFromStripe } from "@/lib/stripeSync";

export default async function DashboardHub() {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  
  if (!isAuth) {
    // Render modern, clean Landing Page for unauthenticated users
    return (
      <main className="landing-wrapper" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: '2rem 1rem',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
      }}>
        <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', textAlign: 'center' }}>
          {/* Logo */}
          <div style={{ marginBottom: '2.5rem' }}>
            <img src="https://konsul.digital/images/Konsul-logo-general.png" alt="Kônsul Logo" style={{ height: '80px', width: 'auto' }} />
          </div>

          {/* Tagline */}
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '0.4rem 1.2rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
            Kônsul Suite Unificada
          </div>

          <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            La Suite de Herramientas Completa para Tu Negocio
          </h1>
          
          <p style={{ fontSize: '1.2rem', color: '#475569', maxWidth: '600px', margin: '0 auto 3rem auto', lineHeight: 1.6 }}>
            Accede a facturación electrónica inteligente, gestión de flujos de trabajo Kanban, captación de leads, análisis financiero de créditos y campañas de correo en una sola plataforma unificada.
          </p>

          {/* Suite Features Summary List */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '1.5rem', 
            marginBottom: '3rem',
            textAlign: 'left'
          }}>
            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#065f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              </div>
              <h4 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Kônsul Bills</h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>Facturación electrónica inteligente, control de gastos, reportes fiscales automáticos y conciliación asistida por IA.</p>
            </div>
            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
              </div>
              <h4 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Kônsul Process</h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>Diseño de plantillas de procesos, flujos operativos en tiempo real, Kanban y automatizaciones con IA.</p>
            </div>
            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#be185d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </div>
              <h4 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Kônsul Mailing</h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>Email Marketing masivo ultra-eficiente de alta escalabilidad, con enfoque en diseño emocional.</p>
            </div>
            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5b21b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <h4 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Kônsul Kredit</h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>Gestión avanzada de prospectos inmobiliarios integrada con cálculo automático de crédito hipotecario.</p>
            </div>
            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <h4 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Kônsul Reactivaleads</h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>Captación inteligente de clientes potenciales mediante embudos automatizados de email marketing.</p>
            </div>
            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1.5px solid #6366f1', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                </svg>
              </div>
              <h4 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Kônsul LeadsHUB 
                <span style={{ fontSize: '0.65rem', background: '#e0e7ff', color: '#4f46e5', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>Premium</span>
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>Plataforma premium de prospección automática, captación multicanal masiva y seguimiento de leads con IA.</p>
            </div>
          </div>

          {/* Unique CTA Button */}
          <div>
            <RegisterLink 
              postLoginRedirectURL="/pricing"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                padding: '1rem 2.5rem',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
            >
              Comenzar Registro Gratis →
            </RegisterLink>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '1rem' }}>
              ¿Ya tienes cuenta? <a href="/api/auth/login?post_login_redirect_url=/" style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>Inicia sesión aquí</a>
            </p>
          </div>
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

        {/* Reactivaleads Card */}
        <a href="https://reactivaleads.konsul.digital/api/auth/login?prompt=none" className="card card-reactivaleads">
          <div className="card-header-suite">
            <div className="card-suite-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <span className="card-badge-status">
              Conectado
            </span>
          </div>
          <div className="card-body">
            <h3>Kônsul Reactivaleads</h3>
            <p>Captación inteligente de clientes potenciales mediante embudos automatizados de email marketing y seguimiento multicanal.</p>
          </div>
          <div className="card-footer-suite">
            <div className="quick-links">
              <span className="quick-link-btn">Campañas</span>
              <span className="quick-link-btn">Leads</span>
              <span className="quick-link-btn">Embudos</span>
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
