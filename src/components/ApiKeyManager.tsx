'use client';

import { useState } from 'react';
import { generateSuiteApiKey, revokeSuiteApiKey } from '../app/ajustes/actions';

interface ApiKeyItem {
  id: string;
  name: string;
  keyValue: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

interface ApiKeyManagerProps {
  initialKeys: ApiKeyItem[];
}

export default function ApiKeyManager({ initialKeys }: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKeyItem[]>(initialKeys);
  const [newKeyName, setNewKeyName] = useState('');
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setIsGenerating(true);
    try {
      await generateSuiteApiKey(newKeyName);
      setNewKeyName('');
      // Window reload is a simple way to refresh the server component state,
      // but since we want to be reactive, we can trigger a reload or let Next.js refresh the page.
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas revocar esta API Key? Las aplicaciones que la usen perderán acceso de inmediato.')) {
      return;
    }
    try {
      await revokeSuiteApiKey(id);
      setKeys(prev => prev.filter(k => k.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleShowKey = (id: string) => {
    setShowKeyMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (id: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="card-premium" style={{ marginTop: '2rem' }}>
      <div className="card-premium-header">
        <div className="card-icon-badge badge-green" style={{ background: '#e0f2fe', color: '#0369a1' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h3>API Keys de la Suite (Kônsul Connect)</h3>
      </div>

      <div className="card-premium-body">
        <p className="subscription-notice" style={{ marginBottom: '1.5rem' }}>
          Genera API Keys de la Suite para que las otras micro-SaaS (Bills, Process, etc.) puedan conectarse y comunicarse de vuelta con este panel central de forma segura.
        </p>

        {/* Generate Key Form */}
        <form onSubmit={handleGenerate} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-end' }}>
          <div className="input-group-full" style={{ flex: 1 }}>
            <label>NOMBRE DE LA INTEGRACIÓN</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Ej: Conexión con KônsulBills"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: '0.95rem',
                fontWeight: 500,
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isGenerating || !newKeyName.trim()}
            className="btn-save-changes"
            style={{
              padding: '0.85rem 1.5rem',
              borderRadius: '14px',
              height: '48px',
              whiteSpace: 'nowrap'
            }}
          >
            {isGenerating ? 'Generando...' : 'Generar Clave'}
          </button>
        </form>

        {/* API Keys List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {keys.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.9rem' }}>
              No has generado ninguna API Key todavía.
            </div>
          ) : (
            keys.map(key => {
              const isRevealed = !!showKeyMap[key.id];
              const displayVal = isRevealed 
                ? key.keyValue 
                : `${key.keyValue.substring(0, 12)}................................`;

              return (
                <div key={key.id} style={{
                  padding: '1.25rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{key.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '1rem' }}>
                        Creada el {new Date(key.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevoke(key.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Revocar Clave
                    </button>
                  </div>

                  <div className="input-with-icon" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <code style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#1e293b' }}>
                      {displayVal}
                    </code>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => toggleShowKey(key.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem' }}
                      >
                        {isRevealed ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(key.id, key.keyValue)}
                        style={{
                          background: '#f1f5f9',
                          border: 'none',
                          cursor: 'pointer',
                          color: copiedId === key.id ? '#059669' : '#475569',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          transition: 'all 0.2s'
                        }}
                      >
                        {copiedId === key.id ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
