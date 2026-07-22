'use client';

import { useState } from 'react';
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface SidebarProps {
  user: {
    given_name: string | null;
    family_name: string | null;
    email: string | null;
    picture: string | null;
  } | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  // Navigation Items
  const navItems = [
    {
      name: 'Inicio',
      href: '/',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      )
    },
    {
      name: 'Bills (Facturas)',
      href: 'https://bills.konsul.digital/api/auth/login?prompt=none',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      ),
      isExternal: true
    },
    {
      name: 'Reactivaleads (Leads)',
      href: 'https://reactivaleads.konsul.digital/api/auth/login?prompt=none',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
      ),
      isExternal: true
    },
    {
      name: 'Automatizaciones',
      href: '/automatizaciones',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      )
    }
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      
      {/* Collapse Toggle Button */}
      <button 
        className="sidebar-toggle" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? "Expandir menú" : "Ocultar menú"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
          <img src="https://konsul.digital/images/logo-app-konsul.png" alt="Kônsul Logo" className="logo-small" style={{ height: '32px', width: 'auto' }} />
        ) : (
          <img src="https://konsul.digital/images/Konsul-logo-general.png" alt="Kônsul Logo" className="logo-large" style={{ height: '44px', width: 'auto' }} />
        )}
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/' && pathname === '/dashboard');
          
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
            </Link>
          );
        })}
      </nav>

      {/* Footer / Profile */}
      <div className="sidebar-footer">
        <Link 
          href="/ajustes" 
          className="user-profile"
          title={isCollapsed ? `${user?.given_name || 'Kônsul'} (Autónomo)` : undefined}
        >
          <div className="user-avatar-circle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          {!isCollapsed && (
            <div className="user-info">
              <span className="user-name">{user?.given_name || 'Kônsul'}</span>
              <span className="user-role">Autónomo</span>
            </div>
          )}
        </Link>
        
        <LogoutLink className="logout-btn" title={isCollapsed ? "Salir" : undefined}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          {!isCollapsed && <span className="logout-text">Salir</span>}
        </LogoutLink>
      </div>

    </aside>
  );
}
