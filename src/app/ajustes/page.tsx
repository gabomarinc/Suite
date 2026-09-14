import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateUserProfile } from "./actions";
import ManageSubscriptionButton from "./ManageSubscriptionButton";

export default async function AjustesPage() {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  
  if (!isAuth) {
    redirect("/api/auth/login");
  }

  const kindeUser = await getUser();
  
  if (!kindeUser || !kindeUser.id) {
    redirect("/api/auth/login");
  }

  // Get user from DB
  let dbUser = await prisma.user.findUnique({
    where: { id: kindeUser.id }
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        id: kindeUser.id,
        email: kindeUser.email || "",
        firstName: kindeUser.given_name || "",
        lastName: kindeUser.family_name || "",
        role: "USER",
        plan: "free"
      }
    });
  }

  const roleDisplay = dbUser.role === 'ADMIN' ? 'MANAGER' : 'PRO MEMBER';

  return (
    <main className="main-content">
      
      {/* Dark Obsidian Hero Banner (Image 1 style) */}
      <div className="dark-hero-card">
        <div>
          <div className="hero-tag-pill">
            <div className="hero-tag-icon-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            </div>
            <span>Configuraciones Avanzadas</span>
          </div>
          <h1>Ajustes del Sistema</h1>
          <p>Personaliza tu experiencia y gestiona la seguridad de tu entorno.</p>
        </div>

        <div className="hero-right-badge">
          <div className="badge-label">ID de Workspace</div>
          <div className="badge-value">{dbUser.id}</div>
        </div>
      </div>

      <div className="settings-grid">
        
        {/* Left Side: Workspace & Profile Forms */}
        <div className="settings-main-col">
          
          {/* Card 1: Preferencias del Workspace */}
          <form action={updateUserProfile} id="settings-form" className="card-premium">
            <div className="card-premium-header">
              <div className="card-icon-badge">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              </div>
              <div>
                <h3>Preferencias del Workspace</h3>
                <p>Define la identidad y ubicación de tu entorno.</p>
              </div>
            </div>
            
            <div className="card-premium-body">
              <div className="input-row-half">
                <div className="input-group-half">
                  <label>NOMBRE DEL WORKSPACE</label>
                  <div className="input-with-icon">
                    <div className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                    </div>
                    <input 
                      type="text" 
                      name="companyName" 
                      defaultValue={dbUser.companyName || "Konsul Workspace"} 
                      placeholder="Konsul Workspace" 
                    />
                  </div>
                </div>

                <div className="input-group-half">
                  <label>ZONA HORARIA</label>
                  <div className="input-with-icon">
                    <div className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <input 
                      type="text" 
                      defaultValue="🇵🇦 América/Panamá (UTC-5)" 
                      readOnly 
                      style={{ cursor: 'default' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '-0.5rem', lineHeight: 1.4 }}>
                Se usa para sincronizar y mostrar horarios en tus herramientas de la Suite, sin importar dónde esté cada usuario.
              </div>

              <div className="input-row-half" style={{ marginTop: '0.5rem' }}>
                <div className="input-group-half">
                  <label>NOMBRE</label>
                  <div className="input-with-icon">
                    <div className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                    <input type="text" name="firstName" defaultValue={dbUser.firstName || ""} placeholder="Nombre" />
                  </div>
                </div>
                
                <div className="input-group-half">
                  <label>APELLIDO</label>
                  <div className="input-with-icon">
                    <div className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                    <input type="text" name="lastName" defaultValue={dbUser.lastName || ""} placeholder="Apellido" />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="submit" className="btn-dark-primary" style={{ width: 'auto' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  Guardar Cambios
                </button>
              </div>
            </div>
          </form>

          {/* Card 2: Seguridad de la Cuenta */}
          <div className="card-premium">
            <div className="card-premium-header">
              <div className="card-icon-badge">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
              <div>
                <h3>Seguridad de la Cuenta</h3>
                <p>Gestiona tus credenciales y acceso al sistema central.</p>
              </div>
            </div>

            <div className="card-premium-body">
              <div className="input-group-full">
                <label>EMAIL REGISTRADO</label>
                <div className="input-with-icon disabled">
                  <div className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  </div>
                  <input type="email" value={dbUser.email} disabled />
                  <span className="badge-bloqueado">BLOQUEADO</span>
                </div>
              </div>

              <div className="input-group-full">
                <label>GESTIÓN DE AUTENTICACIÓN SSO</label>
                <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                  Tu acceso se autentica de forma segura y centralizada mediante Kinde SSO para todas las aplicaciones de la Suite.
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Sistema Activo & Zona de Peligro (Image 1 style) */}
        <div className="settings-sidebar-col">
          
          {/* Card 1: Sistema Activo */}
          <div className="card-dark-status">
            <div className="card-dark-status-header">
              <div className="green-dot-pulse"></div>
              <span>Sistema Activo</span>
            </div>

            <div className="dark-status-rows">
              <div className="dark-status-row">
                <span className="row-label">Tu Rol</span>
                <span className="badge-role-teal">{roleDisplay}</span>
              </div>

              <div className="dark-status-row">
                <span className="row-label">Versión del Core</span>
                <span className="row-val-mono">v2.4.0-internal</span>
              </div>

              <div className="dark-status-row">
                <span className="row-label">Seguridad SSL</span>
                <span className="badge-ssl-green">ACTIVO</span>
              </div>

              <div className="dark-status-row">
                <span className="row-label">Plan Suite</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00c49f' }}>
                  {dbUser.plan?.toUpperCase() || 'PRO'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Zona de Peligro / Suscripción */}
          <div className="card-danger-zone">
            <div className="danger-header">
              <div className="danger-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </div>
              <div>
                <h4>Zona de Peligro</h4>
                <p>Gestión de suscripción activa y facturación en Stripe.</p>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              {dbUser.stripeCustomerId ? (
                <ManageSubscriptionButton />
              ) : (
                <a href="/pricing" className="btn-danger-outline">
                  Gestionar Suscripción
                </a>
              )}
            </div>
          </div>

        </div>
        
      </div>

    </main>
  );
}
