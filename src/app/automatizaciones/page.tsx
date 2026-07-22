import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toggleIntegration, saveServiceKey } from "./actions";

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
            const radius = 170; // px
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
                {/* Visual Connection Line */}
                <div 
                  className="connection-line"
                  style={{
                    width: `${radius}px`,
                    transform: `rotate(${angle + Math.PI}deg)`,
                    transformOrigin: 'right center'
                  }}
                >
                  <div className="pulse-signal"></div>
                </div>

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
            <div key={app.code} className="card-premium integration-card">
              <div className="integration-card-header">
                <div className="integration-app-info">
                  <div className="app-icon-wrapper" style={{ background: app.bgLight, color: app.color }}>
                    {app.icon}
                  </div>
                  <div>
                    <h4>{app.name}</h4>
                    <p className="app-desc">{app.description}</p>
                  </div>
                </div>

                {/* Quick Toggle Status */}
                {serviceKey && (
                  <form action={async () => {
                    'use server';
                    await toggleIntegration(app.code, isActive);
                  }}>
                    <button type="submit" className={`switch-toggle ${isActive ? 'active' : ''}`}>
                      <div className="switch-handle"></div>
                    </button>
                  </form>
                )}
              </div>

              <div className="integration-card-body">
                <form action={async (formData: FormData) => {
                  'use server';
                  const key = formData.get('serviceKey') as string;
                  await saveServiceKey(app.code, key);
                }}>
                  <div className="input-group-full">
                    <label>SERVICE KEY ({app.keyPrefix}...)</label>
                    <div className="input-with-icon">
                      <div className="input-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      </div>
                      <input 
                        type="password" 
                        name="serviceKey" 
                        defaultValue={serviceKey}
                        placeholder={`Ej: ${app.keyPrefix}xxxxxxxx`} 
                      />
                    </div>
                  </div>
                  <div className="integration-actions">
                    <button type="submit" className="btn-save-key">
                      {serviceKey ? 'Actualizar Clave' : 'Conectar Aplicación'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })}
      </div>

    </main>
  );
}
