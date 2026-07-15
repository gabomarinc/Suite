import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { prisma } from "@/lib/prisma";

export default async function DashboardHub() {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  
  if (!isAuth) {
    return (
      <main className="landing-container">
        <h1>Konsul Central Hub</h1>
        <p>Tu panel unificado para acceder a todas las aplicaciones MicroSaaS de Kônsul. Inicia sesión una vez para acceder a todo.</p>
        <LoginLink className="btn-primary">Iniciar Sesión</LoginLink>
      </main>
    );
  }

  const user = await getUser();

  if (user && user.id) {
    try {
      const email = user.email || '';
      // 1. Try finding by Kinde ID
      let dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      
      if (!dbUser && email) {
        // 2. Not found by Kinde ID, check if exists by email (legacy imported user)
        dbUser = await prisma.user.findUnique({ where: { email } });
        
        if (dbUser) {
          // 3. Pair legacy user: Update their ID from temp to Kinde ID
          // In Postgres we can update the primary key if there are no strict foreign key conflicts
          await prisma.user.update({
            where: { email },
            data: { id: user.id }
          });
        }
      }

      // 4. Upsert with the Kinde ID to ensure data is fresh
      await prisma.user.upsert({
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
    } catch (e) {
      console.error("Failed to sync user to database:", e);
    }
  }

  // Current Date logic
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  const currentDate = new Date().toLocaleDateString('es-ES', dateOptions).toUpperCase();

  return (
    <main className="main-content">
      <header className="header">
        <div className="date-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          {currentDate}
        </div>
        <h1>Hola, {user?.given_name || 'Kônsul'} 👋</h1>
        <p>Hoy es un buen día para hacer crecer tu negocio.</p>
      </header>

      <div className="dashboard-grid">
        {/* Dark Card */}
        <div className="card card-dark">
          <div className="card-header">
            <div className="icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
            </div>
            <div className="badge-green">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
              En Camino
            </div>
          </div>
          <h3>Facturado este mes</h3>
          <div className="amount">$0</div>
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
            <div className="progress-labels">
              <span>$0</span>
              <span>Meta: $5000</span>
            </div>
          </div>
        </div>

        {/* Green Card */}
        <a href="https://saas1.konsul.com/api/auth/login?prompt=none" className="card card-green">
          <div className="add-btn">+</div>
          <h3>Crear Nuevo</h3>
          <p>Factura, Cotización o Gasto.<br/>La IA te ayuda.</p>
          <div className="arrow-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
          </div>
        </a>

        {/* White Card */}
        <div className="card card-white">
          <h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ESTADO
          </h3>
          <div className="tabs">
            <div className="tab active">Facturas</div>
            <div className="tab">Cotizaciones</div>
          </div>
          <div className="state-list">
            <div className="state-item">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Borradores
              </span>
              <span>0</span>
            </div>
            <div className="state-item blue">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                Enviadas
              </span>
              <span className="count">0</span>
            </div>
            <div className="state-item">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                Vistas
              </span>
              <span>2</span>
            </div>
            <div className="state-item purple">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Parciales
              </span>
              <span className="count">1</span>
            </div>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <div className="section-header">
          <h2>Actividad Reciente</h2>
          <a href="#">Ver todo el historial</a>
        </div>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-info">
              <div className="activity-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div className="activity-details">
                <h4>Expresso changuinola</h4>
                <p>11/6/2026 • Cotización</p>
              </div>
            </div>
            <div className="activity-meta">
              <span className="activity-amount">$475</span>
              <span className="badge-gray">Creada</span>
              <button className="btn-action">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
