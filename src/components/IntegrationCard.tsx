'use client';

import { useState } from 'react';
import { testIntegration, toggleIntegration, saveServiceKey } from '../app/automatizaciones/actions';

interface AppItem {
  code: string;
  name: string;
  description: string;
  color: string;
  bgLight: string;
  icon: React.ReactNode;
  keyPrefix: string;
}

interface IntegrationCardProps {
  app: AppItem;
  initialIsActive: boolean;
  initialServiceKey: string;
}

export default function IntegrationCard({
  app,
  initialIsActive,
  initialServiceKey,
}: IntegrationCardProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [serviceKey, setServiceKey] = useState(initialServiceKey);
  const [inputKey, setInputKey] = useState(initialServiceKey);
  const [showPassword, setShowPassword] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testLog, setTestLog] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async () => {
    try {
      await toggleIntegration(app.code, isActive);
      setIsActive(!isActive);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const trimmedKey = inputKey.trim();
    try {
      await saveServiceKey(app.code, trimmedKey);
      setServiceKey(trimmedKey);
      setInputKey(trimmedKey);
      if (trimmedKey) {
        setIsActive(true);
      } else {
        setIsActive(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const keyToTest = inputKey.trim();
    if (!keyToTest) return;
    setTestStatus('loading');
    setTestLog(['Iniciando prueba de interoperabilidad...', 'Verificando formato de Service Key...']);
    
    // Simulate steps in UI logs
    setTimeout(async () => {
      try {
        const result = await testIntegration(app.code, keyToTest);
        
        if (result.success) {
          setTestLog(prev => [
            ...prev,
            `Prefijo '${app.keyPrefix}' válido.`,
            `Conectando a endpoint del servicio (${app.name})...`,
            ...result.logs,
            `Prueba completada con éxito. Lectura/Escritura al 100%.`
          ]);
          setTestStatus('success');
        } else {
          setTestLog(prev => [
            ...prev,
            `Error: ${result.message}`
          ]);
          setTestStatus('error');
        }
      } catch (err) {
        setTestLog(prev => [...prev, 'Error de red inesperado al conectar con la API de la app.']);
        setTestStatus('error');
      }
    }, 800);
  };

  return (
    <div className="card-premium integration-card">
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
          <button 
            type="button" 
            onClick={handleToggle}
            className={`switch-toggle ${isActive ? 'active' : ''}`}
          >
            <div className="switch-handle"></div>
          </button>
        )}
      </div>

      <div className="integration-card-body">
        <form onSubmit={handleSave}>
          <div className="input-group-full">
            <label>SERVICE KEY ({app.keyPrefix}...)</label>
            <div className="input-with-icon">
              <div className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder={`Ej: ${app.keyPrefix}xxxxxxxx`} 
                autoComplete="new-password"
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="10" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          </div>
          <div className="integration-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            {inputKey && (
              <button 
                type="button" 
                onClick={handleTestConnection}
                className="btn-test-connection"
                style={{
                  background: 'transparent',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Probar Conexión
              </button>
            )}
            <button type="submit" className="btn-save-key" disabled={isSaving}>
              {isSaving ? 'Guardando...' : serviceKey ? 'Actualizar Clave' : 'Conectar Aplicación'}
            </button>
          </div>
        </form>


        {/* Console/Test Logs Display */}
        {testStatus !== 'idle' && (
          <div className={`test-results-log ${testStatus}`} style={{
            marginTop: '1.25rem',
            padding: '1rem',
            borderRadius: '12px',
            background: testStatus === 'success' ? '#f0fdf4' : testStatus === 'error' ? '#fef2f2' : '#f8fafc',
            border: `1px solid ${testStatus === 'success' ? '#bbf7d0' : testStatus === 'error' ? '#fecaca' : '#e2e8f0'}`,
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            color: testStatus === 'success' ? '#166534' : testStatus === 'error' ? '#991b1b' : '#475569'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              <span>RESULTADOS DEL TEST:</span>
              <span>
                {testStatus === 'loading' && '⌛ Probando...'}
                {testStatus === 'success' && '✅ Éxito'}
                {testStatus === 'error' && '❌ Falló'}
              </span>
            </div>
            <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {testLog.map((log, idx) => (
                <div key={idx}>&gt; {log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
