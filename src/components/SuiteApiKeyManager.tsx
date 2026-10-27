'use client';

import { useState } from 'react';
import { handleRegenerateSuiteApiKey } from '@/app/ajustes/actions';

interface SuiteApiKeyManagerProps {
  initialApiKey: string;
  isLeadshubConnected: boolean;
}

export default function SuiteApiKeyManager({
  initialApiKey,
  isLeadshubConnected
}: SuiteApiKeyManagerProps) {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!confirm('¿Estás seguro de que deseas regenerar tu API Key de Suite? La clave actual dejará de funcionar en GrokBot y otras herramientas externas.')) {
      return;
    }
    setIsRegenerating(true);
    try {
      const res = await handleRegenerateSuiteApiKey();
      if (res.success && res.apiKey) {
        setApiKey(res.apiKey);
      }
    } catch (err: any) {
      alert(err.message || 'Error al regenerar clave');
    } finally {
      setIsRegenerating(false);
    }
  };

  const grokSystemPrompt = `Eres un asistente inteligente conectado a Kônsul Suite. Tienes acceso a consultar los leads y chats de LeadsHUB en tiempo real mediante su API Gateway.

Para consultar prospectos o clientes:
- Endpoint: GET https://suite.konsul.digital/api/v1/hub/leadshub/contacts?search={termino}
- Header requerido: x-api-key: ${apiKey}

Para consultar citas o calendario:
- Endpoint: GET https://suite.konsul.digital/api/v1/hub/leadshub/calendar/events
- Header requerido: x-api-key: ${apiKey}

Cuando el usuario te pregunte por un cliente, consulta el endpoint y responde con información actualizada de su estado, empresa, teléfono y notas.`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(grokSystemPrompt);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  return (
    <div className="card-premium" style={{ border: '1px solid #00c49f33' }}>
      <div className="card-premium-header">
        <div className="card-icon-badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <h3 style={{ margin: 0 }}>Kônsul Connect — API Key Maestra (Grok / Bots)</h3>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '12px',
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0'
            }}>
              API GATEWAY
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            Usa esta clave en GrokBot para consultar LeadsHUB y otras apps de tu Suite sin configurar llaves individuales.
          </p>
        </div>
      </div>

      <div className="card-premium-body">
        {/* Connection Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 0.85rem',
          borderRadius: '8px',
          background: isLeadshubConnected ? '#f0fdf4' : '#fffbeb',
          border: isLeadshubConnected ? '1px solid #bbf7d0' : '1px solid #fef08a',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isLeadshubConnected ? '#16a34a' : '#d97706',
              boxShadow: isLeadshubConnected ? '0 0 8px #16a34a' : 'none'
            }}></span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isLeadshubConnected ? '#15803d' : '#b45309' }}>
              {isLeadshubConnected 
                ? 'LeadsHUB Conectado en Suite: GrokBot tiene acceso habilitado.'
                : 'LeadsHUB no está conectado en tu Suite aún.'}
            </span>
          </div>

          {!isLeadshubConnected && (
            <a 
              href="/automatizaciones" 
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#2563eb',
                textDecoration: 'none'
              }}
            >
              Conectar en Automatizaciones →
            </a>
          )}
        </div>

        {/* API Key Box */}
        <div className="input-group-full">
          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>SUITE API KEY (MAESTRA)</span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Prefijo: ks_live_</span>
          </label>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
              fontFamily: 'monospace',
              fontSize: '0.88rem',
              color: '#0f172a'
            }}>
              <span style={{ flex: 1, userSelect: 'all', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {showKey ? apiKey : `${apiKey.substring(0, 10)}••••••••••••••••••••••••`}
              </span>

              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginLeft: '0.5rem'
                }}
              >
                {showKey ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="btn-dark-primary"
              style={{
                width: 'auto',
                padding: '0.55rem 1rem',
                fontSize: '0.82rem',
                background: copied ? '#059669' : undefined
              }}
            >
              {copied ? '✓ ¡Copiado!' : 'Copiar'}
            </button>

            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              style={{
                padding: '0.55rem 0.85rem',
                fontSize: '0.82rem',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                color: '#64748b',
                cursor: 'pointer'
              }}
              title="Regenerar clave de Suite"
            >
              {isRegenerating ? '⏳' : '🔄'}
            </button>
          </div>
        </div>

        {/* Accordion Guide */}
        <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            style={{
              background: 'none',
              border: 'none',
              color: '#0d9488',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: 0
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showGuide ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            {showGuide ? 'Ocultar guía de configuración para Grok / Agentes' : 'Ver datos para configurar en Grok / Custom GPTs'}
          </button>

          {showGuide && (
            <div style={{
              marginTop: '0.75rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.85rem',
              fontSize: '0.8rem',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div>
                <strong style={{ color: '#0f172a' }}>1. Base URL del Gateway:</strong>
                <div style={{ fontFamily: 'monospace', background: '#ffffff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', marginTop: '3px' }}>
                  https://suite.konsul.digital/api/v1/hub/leadshub
                </div>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>2. Header de Autenticación:</strong>
                <div style={{ fontFamily: 'monospace', background: '#ffffff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', marginTop: '3px' }}>
                  x-api-key: {apiKey}
                </div>
              </div>

              <div>
                <strong style={{ color: '#0f172a' }}>3. Especificación OpenAPI (para Custom Actions / Tools):</strong>
                <div style={{ fontFamily: 'monospace', background: '#ffffff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', marginTop: '3px' }}>
                  https://suite.konsul.digital/api/v1/hub/openapi.json
                </div>
              </div>

              <div style={{ marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ color: '#0f172a' }}>4. Prompt sugerido para el System Prompt de Grok:</strong>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0d9488',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {copiedDoc ? '✓ ¡Prompt Copiado!' : 'Copiar Prompt'}
                  </button>
                </div>
                <pre style={{
                  background: '#0f172a',
                  color: '#f8fafc',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  margin: 0
                }}>
                  {grokSystemPrompt}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
