import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateUserProfile } from "./actions";
import ApiKeyManager from "@/components/ApiKeyManager";


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

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: kindeUser.id },
    orderBy: { createdAt: 'desc' }
  });


  return (
    <main className="dashboard settings-page-wrapper">
      
      {/* Breadcrumbs & Header */}
      <div className="settings-header-container">
        <div className="settings-breadcrumbs">
          <span>Inicio</span>
          <span className="separator">/</span>
          <span className="active">Configuración</span>
        </div>
        
        <div className="settings-title-section">
          <div>
            <h2>Tu Espacio de Trabajo</h2>
            <p className="header-subtitle">Personaliza tu perfil de la suite y administra tu suscripción activa.</p>
          </div>
          
          {/* Submit button linked to the form */}
          <button type="submit" form="settings-form" className="btn-save-changes">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Guardar Cambios
          </button>
        </div>
      </div>

      <div className="settings-grid">
        
        {/* Left Side: Form */}
        <div className="settings-main-col">
          <form action={updateUserProfile} id="settings-form" className="card-premium">
            <div className="card-premium-header">
              <div className="card-icon-badge badge-green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <h3>El Rostro de tu Negocio</h3>
            </div>
            
            <div className="card-premium-body">
              <div className="input-group-full">
                <label>CORREO ELECTRÓNICO (SOLO LECTURA)</label>
                <div className="input-with-icon disabled">
                  <div className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  </div>
                  <input type="email" value={dbUser.email} disabled />
                </div>
              </div>

              <div className="input-row-half">
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

              <div className="input-group-full">
                <label>NOMBRE DE LA EMPRESA</label>
                <div className="input-with-icon">
                  <div className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                  </div>
                  <input type="text" name="companyName" defaultValue={dbUser.companyName || ""} placeholder="Nombre de la Empresa" />
                </div>
              </div>
            </div>
          </form>
          <ApiKeyManager initialKeys={apiKeys} />
        </div>


        {/* Right Side: Subscription */}
        <div className="settings-sidebar-col">
          
          <div className="card-premium">
            <div className="card-premium-header">
              <div className="card-icon-badge badge-red">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              </div>
              <h3>Suscripción</h3>
            </div>
            
            <div className="card-premium-body">
              <div className="subscription-status-row">
                <span className="status-label">PLAN ACTUAL</span>
                <span className={`status-badge ${dbUser.plan === 'free' ? 'free' : 'pro'}`}>
                  {dbUser.plan || "Free"}
                </span>
              </div>

              {dbUser.stripeCustomerId && (
                <div className="stripe-id-box">
                  <span className="status-label">ID DE CLIENTE (STRIPE)</span>
                  <code>{dbUser.stripeCustomerId}</code>
                </div>
              )}

              {dbUser.stripeSubscriptionId && (
                <div className="stripe-id-box">
                  <span className="status-label">ID DE SUSCRIPCIÓN</span>
                  <code>{dbUser.stripeSubscriptionId}</code>
                </div>
              )}

              <p className="subscription-notice">
                Para gestionar tus métodos de pago, facturas o cancelar tu plan actual, visita el portal de facturación en Kônsul Bills.
              </p>
            </div>
          </div>
          
        </div>
        
      </div>

    </main>
  );
}
