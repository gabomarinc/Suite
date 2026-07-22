import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import IntegrationCard from "@/components/IntegrationCard";


export default async function AutomatizacionesPage() {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  
  if (!isAuth) {
    redirect("/api/auth/login");
  }

  const kindeUser = await getUser();
  if (!kindeUser || !kindeUser.id) {
    redirect("/api/auth/login");
  }

  // Get user integrations
  const dbIntegrations = await prisma.integration.findMany({
    where: { userId: kindeUser.id }
  });

  const activeIntegrationsMap = new Map(
    dbIntegrations.map(item => [item.appCode, item])
  );

  const apps = [
    {
      code: 'bills',
      name: 'Kônsul Bills',
      description: 'Facturación y finanzas',
      color: '#10b981',
      bgLight: '#e6fcf5',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
      ),
      keyPrefix: 'kb_svc_'
    },
    {
      code: 'process',
      name: 'Kônsul Process',
      description: 'Tableros y flujos',
      color: '#3b82f6',
      bgLight: '#eff6ff',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
      ),
      keyPrefix: 'kp_svc_'
    },
    {
      code: 'reactivaleads',
      name: 'Kônsul Reactivaleads',
      description: 'Clientes y leads',
      color: '#f97316',
      bgLight: '#fff7ed',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
      ),
      keyPrefix: 'lh_svc_'
    },
    {
      code: 'kredit',
      name: 'Kônsul Kredit',
      description: 'Crédito y riesgo',
      color: '#8b5cf6',
      bgLight: '#faf5ff',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
      ),
      keyPrefix: 'kk_svc_'
    },
    {
      code: 'mailing',
      name: 'Kônsul Mailing',
      description: 'Correos masivos',
      color: '#ec4899',
      bgLight: '#fdf2f8',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
      ),
      keyPrefix: 'km_svc_'
    }
  ];

  return (
    <main className="main-content integrations-hub-wrapper">
      
      {/* Breadcrumbs & Header */}
      <div className="settings-header-container">
        <div className="settings-breadcrumbs">
          <span>Inicio</span>
          <span className="separator">/</span>
          <span className="active">Automatizaciones</span>
        </div>
        
        <div className="settings-title-section">
          <div>
            <h2>Kônsul Connect</h2>
            <p className="header-subtitle">Conecta las micro-SaaS del ecosistema de manera plug-and-play usando keys de servicio.</p>
          </div>
        </div>
      </div>

      {/* Visual Connection Hub Node Map */}
      <div className="card-premium visual-hub-card">
        <div className="visual-hub-container">
          {/* SVG Connection Lines Overlay */}
          <svg className="connections-svg" viewBox="0 0 500 400" style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}>
            {apps.map((app, index) => {
              const intData = activeIntegrationsMap.get(app.code);
              const isActive = intData?.isActive || false;
              
              // Calculate radial coordinates identical to satellite translation
              const angle = (index * 2 * Math.PI) / apps.length;
              const radius = 160; // slightly shorter for node center matching
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              
              return (
                <line
                  key={app.code}
                  x1={250} // Centered in the 500px wide container
                  y1={200} // Centered in the 400px high container
                  x2={250 + x}
                  y2={200 + y}
                  className={`connection-line-path ${isActive ? 'active' : ''}`}
                />
              );
            })}
          </svg>

          <div className="central-node">
            <div className="node-glow"></div>
            <img src="https://konsul.digital/images/logo-app-konsul.png" alt="Kônsul Suite" />
            <span>Kônsul Suite</span>
          </div>

          {apps.map((app, index) => {
            const intData = activeIntegrationsMap.get(app.code);
            const isActive = intData?.isActive || false;
            const hasKey = !!intData?.serviceKey;
            
            // Calculate radial coordinates
            const angle = (index * 2 * Math.PI) / apps.length;
            const radius = 160; // px
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <div 
                key={app.code} 
                className={`satellite-node-wrapper ${isActive ? 'active' : ''} ${hasKey ? 'configured' : ''}`}
                style={{
                  transform: `translate(${x}px, ${y}px)`
                }}
              >
                <div className="satellite-node" style={{ borderColor: app.color, background: app.bgLight }}>
                  <div className="node-icon" style={{ color: app.color }}>{app.icon}</div>
                </div>
                <div className="satellite-label">
                  <strong>{app.name}</strong>
                  <span className="status-indicator">
                    {isActive ? 'Conectado' : hasKey ? 'Pausado' : 'Desconectado'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="integrations-grid">
        {apps.map(app => {
          const intData = activeIntegrationsMap.get(app.code);
          const isActive = intData?.isActive || false;
          const serviceKey = intData?.serviceKey || '';

          return (
            <IntegrationCard
              key={app.code}
              app={app}
              initialIsActive={isActive}
              initialServiceKey={serviceKey}
            />
          );
        })}
      </div>

    </main>
  );
}
