'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

export interface AlertOptions {
  title: string;
  message: string;
  type?: ToastType;
  details?: string[];
  buttonText?: string;
}

interface DialogContextValue {
  showToast: (options: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  showAlert: (options: AlertOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

// Global event listeners for non-hook invocations
type DialogEventDetail = 
  | { kind: 'toast'; payload: Omit<ToastItem, 'id'> }
  | { kind: 'confirm'; payload: ConfirmOptions; resolve: (val: boolean) => void }
  | { kind: 'alert'; payload: AlertOptions; resolve: () => void };

const DIALOG_EVENT = 'konsul_dialog_event';

export const konsulToast = {
  success: (message: string, title?: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DIALOG_EVENT, {
        detail: { kind: 'toast', payload: { type: 'success', message, title, duration } }
      }));
    }
  },
  error: (message: string, title?: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DIALOG_EVENT, {
        detail: { kind: 'toast', payload: { type: 'error', message, title, duration } }
      }));
    }
  },
  warning: (message: string, title?: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DIALOG_EVENT, {
        detail: { kind: 'toast', payload: { type: 'warning', message, title, duration } }
      }));
    }
  },
  info: (message: string, title?: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DIALOG_EVENT, {
        detail: { kind: 'toast', payload: { type: 'info', message, title, duration } }
      }));
    }
  }
};

export function konsulConfirm(options: ConfirmOptions): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent(DIALOG_EVENT, {
      detail: { kind: 'confirm', payload: options, resolve }
    }));
  });
}

export function konsulAlert(options: AlertOptions): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent(DIALOG_EVENT, {
      detail: { kind: 'alert', payload: options, resolve }
    }));
  });
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    options: AlertOptions;
    resolve: () => void;
  } | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((opts: Omit<ToastItem, 'id'>) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    const item: ToastItem = { ...opts, id };
    setToasts((prev) => [...prev, item]);
    return id;
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        options,
        resolve
      });
    });
  }, []);

  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertModal({
        isOpen: true,
        options,
        resolve
      });
    });
  }, []);

  // Listen for global custom events
  useEffect(() => {
    const handleDialogEvent = (e: Event) => {
      const customEvent = e as CustomEvent<DialogEventDetail>;
      const detail = customEvent.detail;
      if (!detail) return;

      if (detail.kind === 'toast') {
        showToast(detail.payload);
      } else if (detail.kind === 'confirm') {
        setConfirmModal({
          isOpen: true,
          options: detail.payload,
          resolve: detail.resolve
        });
      } else if (detail.kind === 'alert') {
        setAlertModal({
          isOpen: true,
          options: detail.payload,
          resolve: detail.resolve
        });
      }
    };

    window.addEventListener(DIALOG_EVENT, handleDialogEvent);

    // Override browser native alert to trigger beautiful in-app alert
    const originalAlert = window.alert;
    window.alert = (msg?: any) => {
      const text = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
      // If it contains multiline check / test summary
      if (text && (text.includes('\n') || text.length > 80)) {
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
        showAlert({
          title: lines[0]?.startsWith('✅') || lines[0]?.startsWith('🔍') || lines[0]?.startsWith('⚠️') 
            ? lines[0] 
            : 'Información de la Suite',
          message: lines.length > 1 ? lines.slice(1).join('\n') : text,
          type: text.includes('Error') || text.includes('Fallo') ? 'error' : text.includes('✅') ? 'success' : 'info'
        });
      } else {
        showToast({
          type: (text || '').toLowerCase().includes('error') ? 'error' : (text || '').toLowerCase().includes('éxito') || (text || '').toLowerCase().includes('exitos') ? 'success' : 'info',
          message: text || ''
        });
      }
    };

    return () => {
      window.removeEventListener(DIALOG_EVENT, handleDialogEvent);
      window.alert = originalAlert;
    };
  }, [showToast, showAlert]);

  const handleConfirmClose = (result: boolean) => {
    if (confirmModal) {
      confirmModal.resolve(result);
      setConfirmModal(null);
    }
  };

  const handleAlertClose = () => {
    if (alertModal) {
      alertModal.resolve();
      setAlertModal(null);
    }
  };

  return (
    <DialogContext.Provider value={{ showToast, dismissToast, showConfirm, showAlert }}>
      {children}

      {/* TOAST NOTIFICATION STACK */}
      <div 
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          maxWidth: '420px',
          width: 'calc(100% - 2.5rem)',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmModal && confirmModal.isOpen && (
        <div 
          className="konsul-dialog-overlay"
          onClick={() => handleConfirmClose(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 20, 38, 0.68)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '1.25rem',
            animation: 'fadeIn 0.18s ease-out'
          }}
        >
          <div 
            className="konsul-dialog-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 60px -15px rgba(11, 20, 38, 0.28)',
              width: '100%',
              maxWidth: '460px',
              padding: '1.75rem',
              animation: 'scaleUp 0.18s ease-out',
              position: 'relative'
            }}
          >
            {/* Header Icon */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div 
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: confirmModal.options.variant === 'danger' ? '#fef2f2' : confirmModal.options.variant === 'warning' ? '#fffbeb' : '#f0fdfa',
                  color: confirmModal.options.variant === 'danger' ? '#ef4444' : confirmModal.options.variant === 'warning' ? '#d97706' : '#00a884',
                  border: `1.5px solid ${confirmModal.options.variant === 'danger' ? '#fee2e2' : confirmModal.options.variant === 'warning' ? '#fef3c7' : '#ccfbf1'}`
                }}
              >
                {confirmModal.options.variant === 'danger' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                ) : confirmModal.options.variant === 'warning' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.4rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s'
                }}
                aria-label="Cerrar modal"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Title & Description */}
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {confirmModal.options.title}
            </h3>
            <p style={{ margin: '0 0 1.75rem 0', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.55 }}>
              {confirmModal.options.message}
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {confirmModal.options.cancelText || 'Cancelar'}
              </button>

              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                style={{
                  padding: '0.65rem 1.4rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: confirmModal.options.variant === 'danger' ? '#ef4444' : '#00a884',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: confirmModal.options.variant === 'danger' ? '0 4px 14px rgba(239, 68, 68, 0.3)' : '0 4px 14px rgba(0, 168, 132, 0.3)',
                  transition: 'all 0.15s'
                }}
              >
                {confirmModal.options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RICH ALERT / SUMMARY MODAL */}
      {alertModal && alertModal.isOpen && (
        <div 
          className="konsul-dialog-overlay"
          onClick={handleAlertClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 20, 38, 0.68)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '1.25rem',
            animation: 'fadeIn 0.18s ease-out'
          }}
        >
          <div 
            className="konsul-dialog-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 60px -15px rgba(11, 20, 38, 0.28)',
              width: '100%',
              maxWidth: '520px',
              padding: '1.75rem',
              animation: 'scaleUp 0.18s ease-out',
              position: 'relative',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div 
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: alertModal.options.type === 'error' ? '#fef2f2' : alertModal.options.type === 'warning' ? '#fffbeb' : '#f0fdfa',
                    color: alertModal.options.type === 'error' ? '#ef4444' : alertModal.options.type === 'warning' ? '#d97706' : '#00a884',
                    border: `1.5px solid ${alertModal.options.type === 'error' ? '#fee2e2' : alertModal.options.type === 'warning' ? '#fef3c7' : '#ccfbf1'}`
                  }}
                >
                  {alertModal.options.type === 'error' ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  ) : alertModal.options.type === 'warning' ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    {alertModal.options.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAlertClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.4rem',
                  borderRadius: '8px'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Body */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#475569', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {alertModal.options.message}
              </p>

              {alertModal.options.details && alertModal.options.details.length > 0 && (
                <div 
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    marginBottom: '1rem'
                  }}
                >
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Detalles:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {alertModal.options.details.map((detail, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.84rem', color: '#1e293b' }}>
                        <span style={{ color: '#00a884', fontWeight: 700 }}>•</span>
                        <span style={{ wordBreak: 'break-word' }}>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleAlertClose}
                style={{
                  padding: '0.65rem 1.75rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: alertModal.options.type === 'error' ? '#ef4444' : '#00a884',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: alertModal.options.type === 'error' ? '0 4px 14px rgba(239, 68, 68, 0.3)' : '0 4px 14px rgba(0, 168, 132, 0.3)'
                }}
              >
                {alertModal.options.buttonText || 'Entendido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    // Return fallback helpers that trigger the global window events
    return {
      showToast: (opts: Omit<ToastItem, 'id'>) => {
        konsulToast[opts.type || 'info'](opts.message, opts.title, opts.duration);
        return '';
      },
      dismissToast: () => {},
      showConfirm: konsulConfirm,
      showAlert: konsulAlert
    };
  }
  return context;
}

// Subcomponent: Toast card with timed auto-dismissal
function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const duration = toast.duration || 4500;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, onDismiss]);

  const typeStyles = {
    success: {
      bg: '#ffffff',
      border: '1.5px solid #ccfbf1',
      iconBg: '#f0fdfa',
      iconColor: '#00a884',
      barColor: '#00a884'
    },
    error: {
      bg: '#ffffff',
      border: '1.5px solid #fee2e2',
      iconBg: '#fef2f2',
      iconColor: '#ef4444',
      barColor: '#ef4444'
    },
    warning: {
      bg: '#ffffff',
      border: '1.5px solid #fef3c7',
      iconBg: '#fffbeb',
      iconColor: '#d97706',
      barColor: '#d97706'
    },
    info: {
      bg: '#ffffff',
      border: '1.5px solid #e0f2fe',
      iconBg: '#f0f9ff',
      iconColor: '#0284c7',
      barColor: '#0284c7'
    }
  }[toast.type || 'info'];

  return (
    <div
      style={{
        pointerEvents: 'auto',
        backgroundColor: typeStyles.bg,
        borderRadius: '14px',
        border: typeStyles.border,
        boxShadow: '0 12px 30px -6px rgba(15, 23, 42, 0.12), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        position: 'relative',
        overflow: 'hidden',
        animation: 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      {/* Icon Badge */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '10px',
          backgroundColor: typeStyles.iconBg,
          color: typeStyles.iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px'
        }}
      >
        {toast.type === 'success' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )}
        {toast.type === 'error' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        )}
        {toast.type === 'warning' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        )}
        {toast.type === 'info' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        )}
      </div>

      {/* Text Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <h5 style={{ margin: '0 0 2px 0', fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
            {toast.title}
          </h5>
        )}
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.45, wordBreak: 'break-word' }}>
          {toast.message}
        </p>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          flexShrink: 0
        }}
        aria-label="Cerrar notificación"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {/* Progress line */}
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: `${typeStyles.barColor}22`
        }}
      >
        <div 
          style={{
            height: '100%',
            backgroundColor: typeStyles.barColor,
            animation: `toastProgress ${duration}ms linear forwards`
          }}
        />
      </div>
    </div>
  );
}
