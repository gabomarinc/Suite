'use client';

import { useState } from 'react';
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { sendSupportRequest } from '@/app/actions/support';
import { konsulToast } from '@/components/KonsulDialog';

interface SidebarProps {
  user: {
    given_name: string | null;
    family_name: string | null;
    email: string | null;
    picture: string | null;
  } | null;
  isLocked?: boolean;
}

export default function Sidebar({ user, isLocked = false }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  // Support Modal State
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportCategory, setSupportCategory] = useState('Consulta General');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportEmail, setSupportEmail] = useState(user?.email || '');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setIsSubmittingSupport(true);
    try {
      await sendSupportRequest({
        email: supportEmail || user?.email || '',
        category: supportCategory,
        message: supportMessage.trim()
      });
      setSupportSuccess(true);
    } catch (err) {
      console.error('Error enviando soporte:', err);
      konsulToast.error('No se pudo enviar la solicitud de ayuda. Por favor inténtalo de nuevo.', 'Error de Soporte');
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const closeSupportModal = () => {
    setIsSupportOpen(false);
    setSupportSuccess(false);
    setSupportMessage('');
  };

  // Navigation Items by section
  const generalItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="2"></rect>
          <rect x="14" y="3" width="7" height="7" rx="2"></rect>
          <rect x="14" y="14" width="7" height="7" rx="2"></rect>
          <rect x="3" y="14" width="7" height="7" rx="2"></rect>
        </svg>
      )
    }
  ];

  const appItems = [
    {
      name: 'Bills (Facturas)',
      href: 'https://bills.konsul.digital/api/auth/login?prompt=none',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
      isExternal: true
    },
    {
      name: 'Process (Flujos)',
      href: 'https://process.konsul.digital/api/auth/login?prompt=none',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      ),
      isExternal: true
    },
    {
      name: 'Reactivaleads (Leads)',
      href: 'https://reactivaleads.konsul.digital/api/auth/login?prompt=none',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      isExternal: true
    },
    {
      name: 'Kredit (Crédito)',
      href: 'https://kredit.konsul.digital/api/auth/login?prompt=none',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2"></rect>
          <line x1="2" y1="10" x2="22" y2="10"></line>
        </svg>
      ),
      isExternal: true
    },
    {
      name: 'Mailing (Correos)',
      href: 'https://mailing.konsul.digital/api/auth/login?prompt=none',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
      ),
      isExternal: true
    }
  ];

  const platformItems = [
    {
      name: 'Automatizaciones',
      href: '/automatizaciones',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
          <line x1="6" y1="6" x2="6.01" y2="6"></line>
          <line x1="6" y1="18" x2="6.01" y2="18"></line>
          <path d="M20 6h-8a2 2 0 0 0-2 2v8"></path>
        </svg>
      )
    },
    {
      name: 'Ajustes',
      href: '/ajustes',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      )
    }
  ];

  const renderNavGroup = (items: typeof appItems, title?: string) => (
    <>
      {title && !isCollapsed && <div className="sidebar-section-title">{title}</div>}
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href === '/' && pathname === '/dashboard');
        
        if (isLocked) {
          return (
            <div 
              key={item.name} 
              className="nav-item disabled"
              style={{ 
                opacity: 0.5, 
                cursor: 'not-allowed', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: isCollapsed ? 'center' : 'space-between', 
                width: '100%',
                userSelect: 'none'
              }}
              title={isCollapsed ? `${item.name} (Adquiere un plan para desbloquear)` : "Adquiere un plan para desbloquear"}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? '0' : '10px' }}>
                <span className="nav-icon">{item.icon}</span>
                {!isCollapsed && <span className="nav-text">{item.name}</span>}
              </div>
              {!isCollapsed && (
                <span style={{ fontSize: '11px', opacity: 0.7 }}>🔒</span>
              )}
            </div>
          );
        }

        if (item.isExternal) {
          return (
            <a 
              key={item.name} 
              href={item.href} 
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={isCollapsed ? item.name : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && <span className="nav-text">{item.name}</span>}
              {!isCollapsed && (item as any).badge && (
                <span className="nav-badge-nuevo">{(item as any).badge}</span>
              )}
            </a>
          );
        }

        return (
          <Link 
            key={item.name} 
            href={item.href} 
            className={`nav-item ${isActive ? 'active' : ''}`}
            title={isCollapsed ? item.name : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            {!isCollapsed && <span className="nav-text">{item.name}</span>}
            {!isCollapsed && (item as any).badge && (
              <span className="nav-badge-nuevo">{(item as any).badge}</span>
            )}
          </Link>
        );
      })}
    </>
  );

  const initialLetter = user?.given_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'K';

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      
      {/* Collapse Toggle Button */}
      <button 
        className="sidebar-toggle" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? "Expandir menú" : "Ocultar menú"}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {isCollapsed ? (
            <polyline points="9 18 15 12 9 6"></polyline>
          ) : (
            <polyline points="15 18 9 12 15 6"></polyline>
          )}
        </svg>
      </button>

      {/* Logo Section */}
      <div className="sidebar-logo">
        {isCollapsed ? (
          <img src="https://konsul.digital/images/logo-app-konsul.png" alt="Kônsul Logo" className="logo-small" style={{ height: '30px', width: 'auto' }} />
        ) : (
          <img src="https://konsul.digital/images/Konsul-logo-general.png" alt="Kônsul Logo" className="logo-large" style={{ height: '40px', width: 'auto' }} />
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {renderNavGroup(generalItems as any, 'Visión General')}
        {renderNavGroup(appItems, 'Herramientas Suite')}
        {renderNavGroup(platformItems as any, 'Plataforma & Flujos')}
      </nav>

      {/* Footer / Help & Profile */}
      <div className="sidebar-footer">
        {!isCollapsed && (
          <div className="sidebar-help-card">
            <div className="help-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              <span>Centro de Ayuda</span>
            </div>
            <button 
              type="button" 
              onClick={() => setIsSupportOpen(true)} 
              className="help-btn"
              style={{ cursor: 'pointer', textAlign: 'center', width: '100%', border: 'none' }}
            >
              Soporte Kônsul
            </button>
          </div>
        )}

        <Link 
          href="/ajustes" 
          className="user-profile"
          title={isCollapsed ? `${user?.given_name || 'Kônsul'} (Autónomo)` : undefined}
        >
          <div className="user-avatar-circle">
            {initialLetter}
          </div>
          {!isCollapsed && (
            <div className="user-info">
              <span className="user-name">{user?.given_name || user?.email?.split('@')[0] || 'Kônsul'}</span>
              <span className="user-role-badge">Workspace Activo</span>
            </div>
          )}
        </Link>
        
        <LogoutLink className="logout-btn" title={isCollapsed ? "Salir" : undefined}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          {!isCollapsed && <span className="logout-text">Cerrar Sesión</span>}
        </LogoutLink>
      </div>

      {/* Support Request Modal */}
      {isSupportOpen && (
        <div className="support-modal-overlay" onClick={closeSupportModal}>
          <div className="support-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="support-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className="support-modal-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>Soporte Kônsul</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>¿En qué podemos ayudarte hoy?</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={closeSupportModal} 
                className="support-modal-close"
                aria-label="Cerrar modal"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {supportSuccess ? (
              <div className="support-modal-success">
                <div className="support-success-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00a884" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h4 style={{ margin: '0.5rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>¡Solicitud enviada con éxito!</h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  Hemos recibido tu mensaje. Nuestro equipo de soporte Kônsul se pondrá en contacto contigo a <strong>{supportEmail || user?.email}</strong> a la mayor brevedad posible.
                </p>
                <button type="button" onClick={closeSupportModal} className="btn-brand-teal" style={{ width: '100%', justifyContent: 'center' }}>
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendSupport} className="support-modal-form">
                <div className="input-group-full" style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Tu Correo Electrónico
                  </label>
                  <input 
                    type="email" 
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    required
                    placeholder="tu@correo.com"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      border: '1.5px solid var(--border-color)',
                      background: '#ffffff',
                      color: 'var(--text-heading)',
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div className="input-group-full" style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Motivo o Área de Consulta
                  </label>
                  <select
                    value={supportCategory}
                    onChange={(e) => setSupportCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      border: '1.5px solid var(--border-color)',
                      background: '#ffffff',
                      color: 'var(--text-heading)',
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="Consulta General">Consulta General</option>
                    <option value="Automatizaciones & Conexiones">Automatizaciones & Conexiones</option>
                    <option value="Problema con Kônsul Bills">Problema con Kônsul Bills</option>
                    <option value="Problema con Kônsul Process">Problema con Kônsul Process</option>
                    <option value="Problema con Kônsul Mailing">Problema con Kônsul Mailing</option>
                    <option value="Facturación, Pagos y Planes">Facturación, Pagos y Planes</option>
                    <option value="Solicitud de Nueva Función">Solicitud de Nueva Función</option>
                  </select>
                </div>

                <div className="input-group-full" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Describe detalladamente tu consulta
                  </label>
                  <textarea
                    rows={4}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Explícanos lo que sucede o en qué podemos asistirte..."
                    required
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      border: '1.5px solid var(--border-color)',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    onClick={closeSupportModal}
                    className="btn-step-cancel"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmittingSupport}
                    className="btn-brand-teal"
                    style={{ minWidth: '140px', justifyContent: 'center' }}
                  >
                    {isSubmittingSupport ? (
                      <>
                        <svg className="spin-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        <span>Enviar Solicitud</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </aside>
  );
}
