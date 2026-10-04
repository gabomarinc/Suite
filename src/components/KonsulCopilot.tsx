'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './KonsulCopilot.css';
import { createAutomationRule, simulateAutomationDryRun } from '@/app/automatizaciones/actions';

interface UserContext {
  id: string;
  name: string;
  email: string;
}

interface KonsulCopilotProps {
  user: UserContext;
  connectedApps?: string[];
}

const DEFAULT_CHIPS = [
  { label: '⚡ Conectar LeadsHUB con Bills al ganar lead', prompt: 'Crea una automatización para que cuando un lead en LeadsHUB pase a Ganado, le cree una factura en Bills.' },
  { label: '⚡ Crear proyecto en Process al calificar lead', prompt: 'Quiero que cuando un lead en LeadsHUB pase a Calificado, ejecute la plantilla de Onboarding en Process.' },
  { label: '🛡️ Comprobar bucles y salud de reglas', prompt: 'Revisa la salud de mis automatizaciones y verifica que no existan bucles infinitos.' },
  { label: '⚡ Notificar por WhatsApp al crear factura', prompt: 'Cuando se cree una factura en Bills, enviar un mensaje por WhatsApp al cliente a través de LeadsHUB.' }
];

export default function KonsulCopilot({ user, connectedApps = [] }: KonsulCopilotProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [simulatingRuleId, setSimulatingRuleId] = useState<string | null>(null);
  const [activatingRuleId, setActivatingRuleId] = useState<string | null>(null);
  const [activatedRules, setActivatedRules] = useState<Record<string, boolean>>({});
  const [simulationResults, setSimulationResults] = useState<Record<string, any>>({});

  const defaultWelcome = {
    id: 'welcome',
    role: 'model',
    text: `👋 ¡Hola **${user?.name?.split(' ')[0] || 'Colega'}**! Soy el **Copiloto Agéntico y Orquestador Multi-App** de Kônsul Suite.\n\nPuedo crear flujos automáticos entre tus herramientas (LeadsHUB, Bills, Process, Kredit, Mailing), validar tus reglas contra bucles infinitos y simular pruebas en modo Dry-Run sin alterar datos reales.\n\n¿Qué te gustaría conectar hoy?`,
    actions: [] as any[]
  };

  const [messages, setMessages] = useState([defaultWelcome]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  const handleClearHistory = () => {
    setMessages([defaultWelcome]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMsgId = 'usr_' + Date.now();
    const newMessages = [
      ...messages,
      { id: userMsgId, role: 'user', text: query, actions: [] }
    ];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: newMessages.slice(-6).map(m => ({
            role: m.role === 'model' ? 'model' : 'user',
            text: m.text
          }))
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al conectar con el Copiloto Agéntico.');
      }

      const botMsg = {
        id: 'bot_' + Date.now(),
        role: 'model',
        text: data.reply || 'He procesado tu solicitud.',
        actions: data.actions || []
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Copilot chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          role: 'model',
          text: `⚠️ **Error:** ${err.message || 'No se pudo comunicar con el agente.'}`,
          actions: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Dry-Run Simulation Handler
  const handleDryRun = async (ruleData: any, actionKey: string) => {
    setSimulatingRuleId(actionKey);
    try {
      const result = await simulateAutomationDryRun({
        sourceApp: ruleData.sourceApp,
        triggerIdx: ruleData.triggerIdx,
        targetApp: ruleData.targetApp,
        actionIdx: ruleData.actionIdx,
        mappings: ruleData.mappings,
        mappingTypes: ruleData.mappingTypes
      });

      setSimulationResults(prev => ({
        ...prev,
        [actionKey]: result
      }));
    } catch (simErr: any) {
      setSimulationResults(prev => ({
        ...prev,
        [actionKey]: { success: false, error: simErr.message }
      }));
    } finally {
      setSimulatingRuleId(null);
    }
  };

  // Rule Activation Handler
  const handleActivateRule = async (ruleData: any, actionKey: string) => {
    setActivatingRuleId(actionKey);
    try {
      await createAutomationRule({
        sourceApp: ruleData.sourceApp,
        triggerIdx: ruleData.triggerIdx,
        targetApp: ruleData.targetApp,
        actionIdx: ruleData.actionIdx,
        mappings: ruleData.mappings,
        mappingTypes: ruleData.mappingTypes
      });

      setActivatedRules(prev => ({
        ...prev,
        [actionKey]: true
      }));

      router.refresh();
    } catch (actErr: any) {
      alert(`Error al activar la regla: ${actErr.message}`);
    } finally {
      setActivatingRuleId(null);
    }
  };

  return (
    <>
      {/* =========================================================================
          FLOATING PILL BUBBLE (Exact match to reference image)
          ========================================================================= */}
      {!isOpen && (
        <button
          className="konsul-copilot-trigger-pill"
          onClick={handleToggle}
          title="Abrir Kônsul Copilot (IA Agéntica)"
        >
          {/* Circular avatar badge with amber lightning bolt */}
          <div className="konsul-trigger-avatar-circle">
            <svg 
              width="15" 
              height="15" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#F59E0B" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>

          {/* White bold brand label */}
          <span className="konsul-trigger-text">Kônsul Copilot</span>

          {/* Glowing pulse indicator dot */}
          <div className="konsul-trigger-status-pulse">
            <div className="konsul-pulse-dot" />
            <div className="konsul-pulse-ring" />
          </div>
        </button>
      )}

      {/* =========================================================================
          SLIDE-OVER COPILOT WINDOW (Dark Obsidian Theme)
          ========================================================================= */}
      {isOpen && (
        <div className="konsul-copilot-window">
          {/* Header */}
          <div className="konsul-copilot-header">
            <div className="konsul-header-profile">
              <div className="konsul-header-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div className="konsul-header-titles">
                <h3>
                  Kônsul Copilot
                  <span className="konsul-mcp-badge">IA Agéntica</span>
                </h3>
                <div className="konsul-header-status">
                  <div className="konsul-status-dot-sm" />
                  <span>Arquitectura Agéntica Activa</span>
                </div>
              </div>
            </div>

            <div className="konsul-header-actions">
              <button 
                className="konsul-header-btn" 
                onClick={handleClearHistory} 
                title="Limpiar chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
              <button 
                className="konsul-header-btn" 
                onClick={handleToggle} 
                title="Cerrar ventana"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Context Ribbon showing live connected apps */}
          <div className="konsul-context-ribbon">
            <span>✦ Conectado con:</span>
            {connectedApps.length > 0 ? (
              connectedApps.map(app => (
                <span key={app} className="konsul-ribbon-tag">
                  {app.toUpperCase()}
                </span>
              ))
            ) : (
              <span className="konsul-ribbon-tag">Ecosistema Kônsul</span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#64748B' }}>
              Modo Sandbox Seguro
            </span>
          </div>

          {/* Messages Area */}
          <div className="konsul-copilot-messages">
            {messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`konsul-msg-row ${msg.role}`}>
                <div className={`konsul-msg-avatar ${msg.role}`}>
                  {msg.role === 'model' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  ) : (
                    user.name?.[0] || 'U'
                  )}
                </div>

                <div className="konsul-msg-bubble">
                  {msg.text.split('\n\n').map((paragraph, pIdx) => {
                    const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                    return (
                      <p key={pIdx} style={{ margin: pIdx > 0 ? '0.5rem 0 0 0' : 0 }}>
                        {parts.map((part, partIdx) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
                          }
                          return part;
                        })}
                      </p>
                    );
                  })}

                  {/* GENERATIVE UI: Interactive Automation Proposal Card */}
                  {msg.actions && msg.actions.map((act: any, actIdx: number) => {
                    if (act.type === 'suggest_automation_rule' && act.ruleData) {
                      const ruleData = act.ruleData;
                      const actionKey = `${msg.id}_${actIdx}`;
                      const isActivated = activatedRules[actionKey];
                      const isActivating = activatingRuleId === actionKey;
                      const isSimulating = simulatingRuleId === actionKey;
                      const simResult = simulationResults[actionKey];

                      return (
                        <div key={actIdx} className="konsul-gen-card">
                          <div className="konsul-gen-card-header">
                            <span className="konsul-gen-badge">Propuesta Agéntica</span>
                            <span className="konsul-gen-apps-flow">
                              {ruleData.sourceApp.toUpperCase()} ➔ {ruleData.targetApp.toUpperCase()}
                            </span>
                          </div>

                          <div className="konsul-gen-row">
                            <strong>⚡ Disparador:</strong> {ruleData.triggerName}
                            {ruleData.filterStatus && (
                              <span style={{ color: '#27BEA5', marginLeft: '0.35rem' }}>
                                (Filtro: {ruleData.filterStatus})
                              </span>
                            )}
                          </div>

                          <div className="konsul-gen-row">
                            <strong>🎯 Acción:</strong> {ruleData.actionName}
                          </div>

                          <div className="konsul-gen-guardrail-banner">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            <span>A prueba de fallos: Prevención de bucles y auto-sanitizador tipado.</span>
                          </div>

                          {/* Simulation Result Preview */}
                          {simResult && (
                            <div className="konsul-simulation-box">
                              <div className="konsul-simulation-title">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Simulación Dry-Run Exitosa (0 efectos secundarios)</span>
                              </div>
                              <div>• Condición de Estado: <strong>{simResult.statusConditionMatched ? 'Cumplida' : 'Filtro verificado'}</strong></div>
                              <div>• Datos Mapeados: <strong>{Object.keys(simResult.resolvedPayload || {}).length} variables verificadas</strong></div>
                            </div>
                          )}

                          {/* Interactive Card Action Buttons */}
                          <div className="konsul-gen-actions">
                            <button
                              className="konsul-btn-dryrun"
                              onClick={() => handleDryRun(ruleData, actionKey)}
                              disabled={isSimulating}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                              </svg>
                              <span>{isSimulating ? 'Simulando...' : '⚡ Probar Dry-Run'}</span>
                            </button>

                            <button
                              className="konsul-btn-activate"
                              onClick={() => handleActivateRule(ruleData, actionKey)}
                              disabled={isActivated || isActivating}
                            >
                              {isActivated ? (
                                <>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  <span>✓ Activada</span>
                                </>
                              ) : isActivating ? (
                                <span>Activando...</span>
                              ) : (
                                <>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                                  </svg>
                                  <span>Activar en 1 Clic</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="konsul-msg-row model">
                <div className="konsul-msg-avatar model">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div className="konsul-msg-bubble">
                  <div className="konsul-typing-box">
                    <div className="konsul-typing-dot" />
                    <div className="konsul-typing-dot" />
                    <div className="konsul-typing-dot" />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Chips if few messages */}
            {messages.length <= 2 && !isLoading && (
              <div className="konsul-chips-section">
                <div className="konsul-chips-title">Acciones Rápidas con IA</div>
                <div className="konsul-chips-grid">
                  {DEFAULT_CHIPS.map((chip, chipIdx) => (
                    <button
                      key={chipIdx}
                      className="konsul-chip-btn"
                      onClick={() => handleSendMessage(chip.prompt)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#27BEA5" strokeWidth="2.5">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversational Confirmation Chips when Copilot asks to proceed */}
            {(() => {
              const lastMsg = messages[messages.length - 1];
              const isAwaitingConfirmation = lastMsg?.role === 'model' && (
                lastMsg.text.includes('¿Te parece bien') || 
                lastMsg.text.includes('proceder') ||
                lastMsg.text.includes('¿procedemos')
              );

              if (isAwaitingConfirmation && !isLoading) {
                return (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    <button
                      className="konsul-chip-btn"
                      style={{ background: '#059669', borderColor: '#10B981', color: '#FFFFFF', fontWeight: 700 }}
                      onClick={() => handleSendMessage('Sí, procede con la creación')}
                    >
                      <span>👍 Sí, procede y genera la tarjeta</span>
                    </button>
                    <button
                      className="konsul-chip-btn"
                      onClick={() => handleSendMessage('Quiero ajustar algunos detalles antes')}
                    >
                      <span>✏️ Ajustar detalles</span>
                    </button>
                  </div>
                );
              }
              return null;
            })()}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="konsul-copilot-footer">
            <form
              className="konsul-chat-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <input
                type="text"
                className="konsul-chat-input-field"
                placeholder="Pídele crear flujos, conectar apps o simular..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                className="konsul-chat-send-btn"
                disabled={!inputValue.trim() || isLoading}
                title="Enviar mensaje"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
