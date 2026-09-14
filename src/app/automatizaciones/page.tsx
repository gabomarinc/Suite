import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
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

  // Get user automation rules from DB
  const dbRules = await prisma.automationRule.findMany({
    where: { userId: kindeUser.id },
    orderBy: { createdAt: 'desc' }
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
      keyPrefix: 'kb_live_ o kb_svc_'
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
      keyPrefix: 'kp_live_ o kp_svc_'
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
      keyPrefix: 'lh_live_ o lh_svc_'
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
      keyPrefix: 'kk_live_ o kk_svc_'
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
      keyPrefix: 'km_live_ o km_svc_'
    }
  ];

  return (
    <main className="main-content integrations-hub-wrapper">
      
      {/* Dark Obsidian Hero Banner (Image 4 & 5 style) */}
      <div className="dark-hero-card">
        <div>
          <div className="hero-tag-pill">
            <div className="hero-tag-icon-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </div>
            <span>Ecosistema & Flujos Multi-App</span>
          </div>
          <h1>Kônsul Connect</h1>
          <p>Conecta las micro-SaaS de la suite de manera plug-and-play usando triggers y acciones unificadas.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link 
            href="/automatizaciones/logs" 
            className="btn-brand-teal"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Ver Historial (Logs)
          </Link>
        </div>
      </div>

      {/* Visual Connection Hub Node Map - Dark Obsidian with Glowing Matrix Dots (Image 2 style) */}
      <div className="visual-hub-card-dark">
        <div className="visual-hub-top-pill">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span>✦ Núcleo Central Suite & {apps.length} Apps Enlazadas</span>
        </div>

        <div className="visual-hub-container">
          {/* SVG Connection Lines Overlay */}
          <svg className="connections-svg" viewBox="0 0 520 380" style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}>
            {apps.map((app, index) => {
              const intData = activeIntegrationsMap.get(app.code);
              const isActive = intData?.isActive || false;
              
              // Calculate radial coordinates
              const angle = (index * 2 * Math.PI) / apps.length;
              const radius = 155;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              
              return (
                <line
                  key={app.code}
                  x1={260}
                  y1={190}
                  x2={260 + x}
                  y2={190 + y}
                  className={`connection-line-path-dark ${isActive ? 'active' : ''}`}
                />
              );
            })}
          </svg>

          {/* Central Suite Core */}
          <div className="central-node-dark">
            <div className="node-glow-dark"></div>
            <img src="https://konsul.digital/images/logo-app-konsul.png" alt="Kônsul Suite" />
            <span>Kônsul Suite</span>
          </div>

          {/* Satellite App Nodes matching Image 2 */}
          {apps.map((app, index) => {
            const intData = activeIntegrationsMap.get(app.code);
            const isActive = intData?.isActive || false;
            const hasKey = !!intData?.serviceKey;
            const appRuleCount = dbRules.filter(r => r.sourceApp === app.code || r.targetApp === app.code).length;
            
            // Calculate radial coordinates
            const angle = (index * 2 * Math.PI) / apps.length;
            const radius = 155;
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
                <div className={`satellite-node-dark ${isActive ? 'active' : ''}`}>
                  {isActive && (
                    <div className="node-counter-badge">
                      {appRuleCount > 0 ? appRuleCount : '✓'}
                    </div>
                  )}
                  <div className="node-icon" style={{ color: isActive ? '#ffffff' : app.color }}>
                    {app.icon}
                  </div>
                </div>
                <div className="satellite-label-dark">
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

      {/* Section Header for Apps List */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', marginBottom: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-heading)' }}>
            Herramientas & Flujos Disponibles
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Haz clic en <strong>Automatizar</strong> para desplegar las reglas activas o crear una nueva conexión.
          </p>
        </div>
      </div>

      {/* Integration Apps List Rows (Image 3 style) */}
      <div className="integrations-list-container">
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
              initialRules={dbRules}
            />
          );
        })}
      </div>

    </main>
  );
}
