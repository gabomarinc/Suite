import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateUserProfile } from "./actions";

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
    // If not found, create a basic record just in case
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

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h2>Ajustes de Cuenta</h2>
          <p className="header-subtitle">Administra tu perfil personal y la configuración de tu empresa</p>
        </div>
      </header>

      <div className="settings-container" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', marginTop: '2rem' }}>
        
        {/* Perfil Form */}
        <section className="card card-white">
          <div className="card-body">
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>Información Personal</h3>
            
            <form action={updateUserProfile} className="settings-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="email" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>Correo Electrónico (Solo Lectura)</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  value={dbUser.email} 
                  disabled 
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#f8fafc', color: 'var(--text-muted)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="firstName" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>Nombre</label>
                  <input 
                    type="text" 
                    id="firstName" 
                    name="firstName" 
                    defaultValue={dbUser.firstName || ""} 
                    placeholder="Tu nombre"
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="lastName" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>Apellido</label>
                  <input 
                    type="text" 
                    id="lastName" 
                    name="lastName" 
                    defaultValue={dbUser.lastName || ""} 
                    placeholder="Tu apellido"
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="companyName" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>Nombre de la Empresa</label>
                <input 
                  type="text" 
                  id="companyName" 
                  name="companyName" 
                  defaultValue={dbUser.companyName || ""} 
                  placeholder="Ej. Mi Agencia LLC"
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'var(--accent-blue)', color: 'white' }}>
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Suscripcion Info */}
        <section className="card card-white" style={{ height: 'fit-content' }}>
          <div className="card-body">
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              Suscripción
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Plan Actual</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem', background: dbUser.plan === 'free' ? '#f1f5f9' : '#dcfce7', color: dbUser.plan === 'free' ? 'var(--text-muted)' : '#166534', borderRadius: '100px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                  {dbUser.plan || "Free"}
                </div>
              </div>

              {dbUser.stripeCustomerId && (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>ID de Cliente (Stripe)</p>
                  <p style={{ fontSize: '0.9rem', fontFamily: 'monospace', background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', wordBreak: 'break-all' }}>{dbUser.stripeCustomerId}</p>
                </div>
              )}

              {dbUser.stripeSubscriptionId && (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>ID de Suscripción</p>
                  <p style={{ fontSize: '0.9rem', fontFamily: 'monospace', background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', wordBreak: 'break-all' }}>{dbUser.stripeSubscriptionId}</p>
                </div>
              )}

              <div style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Para gestionar tus métodos de pago y facturas, visita el portal de facturación en Kônsul Bills.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
