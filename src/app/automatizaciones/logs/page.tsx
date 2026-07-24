'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAutomationLogs } from '../actions';
import { ALL_APPS, APP_NAMES_MAP } from '@/lib/appsConfig';

interface AutomationLog {
  id: string;
  ruleId: string;
  sourceApp: string;
  targetApp: string;
  triggerName: string;
  actionName: string;
  status: string;
  errorDetails: string | null;
  payloadSent: any;
  responseRec: any;
  createdAt: Date;
}

export default function AutomationLogsPage() {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AutomationLog | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await getAutomationLogs();
        setLogs(data as unknown as AutomationLog[]);
      } catch (err) {
        console.error("Error loading logs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filterStatus === 'ALL') return true;
    return log.status === filterStatus;
  });

  return (
    <main className="main-content integrations-hub-wrapper">
      {/* Breadcrumbs & Header */}
      <div className="settings-header-container">
        <div className="settings-breadcrumbs">
          <Link href="/automatizaciones" style={{ color: '#64748b', textDecoration: 'none' }}>Inicio</Link>
          <span className="separator">/</span>
          <Link href="/automatizaciones" style={{ color: '#64748b', textDecoration: 'none' }}>Automatizaciones</Link>
          <span className="separator">/</span>
          <span className="active">Historial de Ejecuciones</span>
        </div>
        
        <div className="settings-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Historial de Ejecuciones</h2>
            <p className="header-subtitle">Monitorea y depura en tiempo real los flujos de comunicación entre tus micro-SaaS.</p>
          </div>
          <Link 
            href="/automatizaciones" 
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ← Volver a Conexiones
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card-premium" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Filtrar por Estado:</span>
          <button 
            onClick={() => setFilterStatus('ALL')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: filterStatus === 'ALL' ? '#3b82f6' : '#f1f5f9',
              color: filterStatus === 'ALL' ? '#ffffff' : '#475569'
            }}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilterStatus('SUCCESS')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: filterStatus === 'SUCCESS' ? '#10b981' : '#f1f5f9',
              color: filterStatus === 'SUCCESS' ? '#ffffff' : '#475569'
            }}
          >
            Éxito
          </button>
          <button 
            onClick={() => setFilterStatus('FAILED')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: filterStatus === 'FAILED' ? '#ef4444' : '#f1f5f9',
              color: filterStatus === 'FAILED' ? '#ffffff' : '#475569'
            }}
          >
            Error
          </button>
        </div>
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
          Mostrando los últimos {filteredLogs.length} registros
        </span>
      </div>

      {/* Logs Table */}
      <div className="card-premium" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            ⏳ Cargando historial de ejecuciones...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
            <h4 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>No hay registros de ejecución</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Las ejecuciones se registrarán aquí en cuanto tus triggers configurados se disparen.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '1rem 1.5rem' }}>Estado</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Fecha/Hora</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Origen</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Destino</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Detalle de Flujo</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody style={{ color: '#334155' }}>
                {filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {log.status === 'SUCCESS' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#ecfdf5', color: '#047857', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>
                          🟢 Éxito
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#fef2f2', color: '#b91c1c', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>
                          🔴 Fallido
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                      {APP_NAMES_MAP[log.sourceApp] || log.sourceApp}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                      {APP_NAMES_MAP[log.targetApp] || log.targetApp}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#0f172a' }}>{log.triggerName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>→ {log.actionName}</div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#475569',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Inspeccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Inspector Modal */}
      {selectedLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div className="card-premium" style={{
            width: '100%',
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
                  Detalle de Ejecución · {selectedLog.status === 'SUCCESS' ? '🟢 Éxito' : '🔴 Fallido'}
                </h4>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  ID: {selectedLog.id} · {new Date(selectedLog.createdAt).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Error Details */}
              {selectedLog.errorDetails && (
                <div style={{
                  padding: '0.75rem 1rem',
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '0.8rem',
                  fontWeight: 500
                }}>
                  <strong>Detalle del Error:</strong>
                  <div style={{ marginTop: '0.25rem', fontFamily: 'monospace' }}>{selectedLog.errorDetails}</div>
                </div>
              )}

              {/* Payload Sent */}
              <div>
                <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📥 Datos Enviados (Payload)
                </h5>
                <pre style={{
                  margin: 0,
                  padding: '1rem',
                  background: '#0f172a',
                  color: '#38bdf8',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                  fontFamily: 'monospace'
                }}>
                  {JSON.stringify(selectedLog.payloadSent, null, 2)}
                </pre>
              </div>

              {/* Response Received */}
              {selectedLog.responseRec && (
                <div>
                  <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📤 Respuesta de la API
                  </h5>
                  <pre style={{
                    margin: 0,
                    padding: '1rem',
                    background: '#0f172a',
                    color: '#34d399',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                    fontFamily: 'monospace'
                  }}>
                    {JSON.stringify(selectedLog.responseRec, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
