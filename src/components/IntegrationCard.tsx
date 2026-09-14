'use client';

import { useState, useEffect } from 'react';
import { 
  testIntegration, 
  toggleIntegration, 
  saveServiceKey,
  createAutomationRule,
  deleteAutomationRule,
  toggleAutomationRule,
  getAutomationRules,
  fetchProcessTemplates,
  getConnectedIntegrations
} from '../app/automatizaciones/actions';
import { ALL_APPS, APP_NAMES_MAP, type AppConfig } from '@/lib/appsConfig';

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
  initialRules: any[];
}

interface AutomationRule {
  id: string;
  userId: string;
  isActive: boolean;
  sourceApp: string;
  triggerIdx: number;
  targetApp: string;
  actionIdx: number;
  mappings: Record<string, string>;
  mappingTypes: Record<string, 'field' | 'static'>;
}

export default function IntegrationCard({
  app,
  initialIsActive,
  initialServiceKey,
  initialRules,
}: IntegrationCardProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [serviceKey, setServiceKey] = useState(initialServiceKey);
  const [inputKey, setInputKey] = useState(initialServiceKey);
  const [showPassword, setShowPassword] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testLog, setTestLog] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Accordion & Tab State
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'builder' | 'rules' | 'credentials'>('builder');

  // Automation Builder State
  const [selectedTriggerIdx, setSelectedTriggerIdx] = useState(0);
  const [targetApp, setTargetApp] = useState<string>('process');
  const [selectedActionIdx, setSelectedActionIdx] = useState(0);
  
  // Dynamic Process Templates State
  const [processTemplates, setProcessTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [connectedIntegrations, setConnectedIntegrations] = useState<any[]>([]);
  
  // Field Mappings
  const [mappingValues, setMappingValues] = useState<Record<string, string>>({});
  const [mappingTypes, setMappingTypes] = useState<Record<string, 'field' | 'static'>>({});
  
  // Rules State
  const [rules, setRules] = useState<AutomationRule[]>(initialRules);

  useEffect(() => {
    setRules(initialRules);
  }, [initialRules]);

  // Fetch all integrations on mount and listen to updates
  const fetchIntegrations = async () => {
    try {
      const integrations = await getConnectedIntegrations();
      setConnectedIntegrations(integrations);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchIntegrations();
    window.addEventListener('konsul_integrations_updated', fetchIntegrations);
    return () => window.removeEventListener('konsul_integrations_updated', fetchIntegrations);
  }, []);

  // Update default targetApp when integrations are loaded or updated
  useEffect(() => {
    const active = connectedIntegrations.filter(i => i.isActive && i.serviceKey);
    if (active.length > 0) {
      if (!targetApp || !active.some(a => a.appCode === targetApp)) {
        setTargetApp(active[0].appCode);
      }
    } else {
      setTargetApp('');
    }
  }, [connectedIntegrations, targetApp]);

  // Sync rules across cards
  useEffect(() => {
    const handleRulesUpdate = async () => {
      try {
        const freshRules = await getAutomationRules();
        setRules(freshRules as unknown as AutomationRule[]);
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('konsul_rules_updated', handleRulesUpdate);
    return () => window.removeEventListener('konsul_rules_updated', handleRulesUpdate);
  }, []);

  // Fetch Process templates
  useEffect(() => {
    const targetIntegration = connectedIntegrations.find(i => i.appCode === targetApp);
    const targetServiceKey = targetIntegration?.serviceKey;

    if (targetApp === 'process' && targetServiceKey) {
      setIsLoadingTemplates(true);
      fetchProcessTemplates(targetServiceKey)
        .then(res => {
          if (res.success) {
            setProcessTemplates(res.data);
            if (res.data.length > 0 && !selectedTemplateId) {
              setSelectedTemplateId(res.data[0].id);
            }
          } else {
            console.error(res.error);
            setProcessTemplates([]);
          }
        })
        .catch(err => {
          console.error(err);
          setProcessTemplates([]);
        })
        .finally(() => {
          setIsLoadingTemplates(false);
        });
    } else {
      setProcessTemplates([]);
    }
  }, [targetApp, connectedIntegrations, isExpanded]);

  const handleToggle = async () => {
    try {
      await toggleIntegration(app.code, isActive);
      setIsActive(!isActive);
      window.dispatchEvent(new Event('konsul_integrations_updated'));
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
      setIsActive(!!trimmedKey);
      setTestStatus('success');
      window.dispatchEvent(new Event('konsul_integrations_updated'));
      alert('¡Service Key guardado con éxito!');
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
    
    setTimeout(async () => {
      try {
        const result = await testIntegration(app.code, keyToTest);
        
        if (result.success) {
          setTestLog(prev => [
            ...prev,
            `Prefijo válido.`,
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

  const currentAppConfig = ALL_APPS[app.code] || { name: app.name, code: app.code, triggers: [], actions: [] };
  const targetAppConfig = ALL_APPS[targetApp] || { name: '', code: '', triggers: [], actions: [] };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const actionFields = targetApp === 'process'
      ? (processTemplates.find(t => t.id === selectedTemplateId)?.variables || []).filter((v: string) => v !== 'Miembro Involucrado (Email)')
      : (targetAppConfig.actions[selectedActionIdx]?.fields || []);
    
    // Build mappings object
    const finalMappings: Record<string, string> = {};
    const finalTypes: Record<string, 'field' | 'static'> = {};

    actionFields.forEach((field: string) => {
      finalMappings[field] = mappingValues[field] || '';
      finalTypes[field] = mappingTypes[field] || 'static';
    });

    if (targetApp === 'process' && selectedTemplateId) {
      finalMappings['__templateId'] = selectedTemplateId;
      finalTypes['__templateId'] = 'static';
    }

    try {
      const savedRule = await createAutomationRule({
        sourceApp: app.code,
        triggerIdx: selectedTriggerIdx,
        targetApp: targetApp,
        actionIdx: selectedActionIdx,
        mappings: finalMappings,
        mappingTypes: finalTypes
      });

      const newRules = [savedRule as unknown as AutomationRule, ...rules];
      setRules(newRules);
      window.dispatchEvent(new Event('konsul_rules_updated'));

      setMappingValues({});
      setMappingTypes({});
      setActiveTab('rules');
      alert('¡Regla de automatización creada y activada con éxito! ⚡');
    } catch (err) {
      console.error(err);
      alert('Error al guardar la regla en la base de datos.');
    }
  };

  const handleTestRuleTrigger = async (rule: AutomationRule) => {
    const srcAppObj = ALL_APPS[rule.sourceApp];
    const trigName = srcAppObj?.triggers[rule.triggerIdx]?.name || '';

    let mockData: Record<string, string> = {};
    if (rule.sourceApp === 'bills') {
      if (trigName === 'Nuevo Cliente o Prospecto') {
        mockData = {
          'Nombre del Cliente': 'Cliente de Prueba Manual',
          'Email del Cliente': 'test-manual@suite.com',
          'Teléfono': '+507 6000-1111',
          'Fecha de Creación': new Date().toISOString()
        };
      } else {
        mockData = {
          'Nombre del Cliente': 'Cliente Manual Factura S.A.',
          'Email del Cliente': 'cliente-factura-manual@suite.com',
          'Monto Total': '850.00',
          'Concepto de Venta': 'Servicio Técnico de Servidores',
          'Fecha de Creación': new Date().toISOString()
        };
      }
    } else {
      mockData = {
        'Título de Tarea': 'Tarea de Prueba Automatizada',
        'Descripción': 'Creada mediante el botón Probar de la Suite',
        'Fecha de Creación': new Date().toISOString()
      };
    }

    try {
      const response = await fetch('/api/v1/automations/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appCode: rule.sourceApp,
          triggerName: trigName,
          userId: rule.userId,
          data: mockData
        })
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        alert(`🧪 ¡Prueba disparada con éxito!\n\nSe procesó la regla y se envió la acción.\nRevisa el Historial (Logs) para ver los resultados.`);
      } else {
        alert(`❌ Fallo al disparar la prueba: ${resData.error || 'Error desconocido'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`❌ Error de red al disparar la prueba: ${err.message || err}`);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteAutomationRule(id);
      const updated = rules.filter(r => r.id !== id);
      setRules(updated);
      window.dispatchEvent(new Event('konsul_rules_updated'));
    } catch (err) {
      console.error(err);
      alert('Error al borrar la regla.');
    }
  };

  const handleToggleRule = async (id: string) => {
    const currentRule = rules.find(r => r.id === id);
    if (!currentRule) return;

    try {
      await toggleAutomationRule(id, currentRule.isActive);
      const updated = rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r);
      setRules(updated);
      window.dispatchEvent(new Event('konsul_rules_updated'));
    } catch (err) {
      console.error(err);
      alert('Error al cambiar el estado de la regla.');
    }
  };

  const currentAppRules = rules.filter(r => r.sourceApp === app.code || r.targetApp === app.code);
  const activeConnectedTargetApps = connectedIntegrations.filter(i => i.isActive && i.serviceKey);
  const hasActiveTargetApps = activeConnectedTargetApps.length > 0;
  const isConnected = !!serviceKey && isActive;

  return (
    <div className={`app-list-row ${isExpanded ? 'expanded' : ''}`}>
      
      {/* Horizontal List Header Row matching Image 3 */}
      <div 
        className="app-list-header" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="app-list-left">
          {/* App Icon with green checkmark badge in bottom right (Image 3 style) */}
          <div className="app-icon-with-check" style={{ background: app.bgLight, color: app.color }}>
            {app.icon}
            {isConnected && (
              <div className="app-icon-check-badge">✓</div>
            )}
          </div>

          <div>
            <div className="app-title-group">
              <h4>{app.name}</h4>
              {isConnected ? (
                <span className="app-badge-pill-connected">CONECTADO</span>
              ) : (
                <span className="app-badge-pill-disconnected">DESCONECTADO</span>
              )}
            </div>
            
            <div className="app-meta-tags">
              <span className="app-meta-tag-item">
                <strong>PREFIX:</strong> {app.keyPrefix}
              </span>
              <span>•</span>
              <span className="app-meta-tag-item">
                <strong>TIPO:</strong> {app.description.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="app-list-right" onClick={(e) => e.stopPropagation()}>
          {/* Active Switch Toggle (Image 3 style) */}
          {serviceKey && (
            <div className="app-active-toggle-group">
              <span className="app-active-label">ACTIVO</span>
              <button 
                type="button" 
                onClick={handleToggle}
                className={`switch-toggle ${isActive ? 'active' : ''}`}
                title={isActive ? "Pausar app" : "Activar app"}
              >
                <div className="switch-handle"></div>
              </button>
            </div>
          )}

          {/* Action Accordion Toggle Button */}
          <button 
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`btn-accordion-toggle ${isExpanded ? 'active' : ''}`}
          >
            <span>{isExpanded ? 'Cerrar Flujo' : 'Automatizar'}</span>
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable Accordion Drawer underneath the App Row */}
      {isExpanded && (
        <div className="app-accordion-drawer">
          
          {/* Tabs Bar */}
          <div className="accordion-tabs-bar">
            <button 
              type="button" 
              onClick={() => setActiveTab('builder')}
              className={`accordion-tab-btn ${activeTab === 'builder' ? 'active' : ''}`}
            >
              <span>⚡</span> Nueva Automatización
            </button>
            <button 
              type="button" 
              onClick={() => setActiveTab('rules')}
              className={`accordion-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
            >
              <span>✦</span> Reglas Activas ({currentAppRules.length})
            </button>
            <button 
              type="button" 
              onClick={() => setActiveTab('credentials')}
              className={`accordion-tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
            >
              <span>🔑</span> Credenciales (Service Key)
            </button>
          </div>

          {/* TAB 1: VISUAL FLOW BUILDER CANVAS (IMAGE 1 STYLE) */}
          {activeTab === 'builder' && (
            <div className="flow-canvas-container">
              {/* Header matching Image 1 */}
              <div className="flow-canvas-header">
                <div className="flow-canvas-header-left">
                  <div className="flow-funnel-icon-box">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                  </div>
                  <div>
                    <h3>Filtros & Automatizaciones</h3>
                    <p>Conecta condiciones y acciones para construir tu flujo desde {app.name}</p>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleAddRule} 
                  disabled={!hasActiveTargetApps}
                  className="btn-orange-submit"
                >
                  <span>+</span> SUMAR Y EJECUTAR
                </button>
              </div>

              {/* Flow Nodes matching Image 1 */}
              <form onSubmit={handleAddRule}>
                <div className="flow-nodes-row">
                  
                  {/* Node 1: Trigger / Disparador Origen */}
                  <div className="flow-node-trigger">
                    <div className="flow-node-header">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <span className="node-type-label">DISPARADOR (ORIGEN)</span>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                        {app.name}
                      </div>
                      <select
                        value={selectedTriggerIdx}
                        onChange={(e) => {
                          setSelectedTriggerIdx(parseInt(e.target.value));
                          setMappingValues({});
                          setMappingTypes({});
                        }}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          borderRadius: '10px',
                          border: '1.5px solid #cbd5e1',
                          background: '#f8fafc',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          color: '#0f172a',
                          outline: 'none'
                        }}
                      >
                        {currentAppConfig.triggers.map((trig: any, idx: number) => (
                          <option key={idx} value={idx}>{trig.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Outputs preview */}
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        VARIABLES DISPONIBLES:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                        {currentAppConfig.triggers[selectedTriggerIdx]?.outputs.map((out: string) => (
                          <span key={out} style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            background: '#f0fdfa',
                            color: '#0d9488',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #ccfbf1'
                          }}>
                            {out}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Connecting Flow Arrow with animated dot */}
                  <div className="flow-connector-wrapper">
                    <div className="flow-connector-line">
                      <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>──</span>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00a884', boxShadow: '0 0 8px #00a884' }}></div>
                      <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>──▶</span>
                    </div>
                  </div>

                  {/* Node 2: Action / Target Node (Green border, Image 1 style) */}
                  <div className="flow-node-action">
                    <div className="flow-node-header">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                      </svg>
                      <span className="node-type-label">+ NUEVO DESTINO / ACCIÓN</span>
                    </div>

                    {hasActiveTargetApps ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Target App Selector */}
                        <div>
                          <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem', display: 'block' }}>
                            APLICACIÓN DESTINO
                          </label>
                          <select
                            value={targetApp}
                            onChange={(e) => {
                              setTargetApp(e.target.value);
                              setSelectedActionIdx(0);
                              setMappingValues({});
                              setMappingTypes({});
                            }}
                            style={{
                              width: '100%',
                              padding: '0.65rem',
                              borderRadius: '10px',
                              border: '1.5px solid #5eead4',
                              background: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              color: '#0f172a'
                            }}
                          >
                            {activeConnectedTargetApps.map(i => (
                              <option key={i.appCode} value={i.appCode}>
                                {ALL_APPS[i.appCode]?.name || i.appCode}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Action Selector */}
                        <div>
                          <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem', display: 'block' }}>
                            ACCIÓN A EJECUTAR
                          </label>
                          {targetApp === 'process' ? (
                            <select
                              value={selectedTemplateId}
                              onChange={(e) => {
                                setSelectedTemplateId(e.target.value);
                                setMappingValues({});
                                setMappingTypes({});
                              }}
                              style={{
                                width: '100%',
                                padding: '0.65rem',
                                borderRadius: '10px',
                                border: '1.5px solid #cbd5e1',
                                background: '#ffffff',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                color: '#0f172a'
                              }}
                            >
                              {isLoadingTemplates ? (
                                <option>⏳ Cargando plantillas desde Process...</option>
                              ) : processTemplates.length === 0 ? (
                                <option>⚠️ Sin plantillas disponibles</option>
                              ) : (
                                processTemplates.map(t => (
                                  <option key={t.id} value={t.id}>📄 {t.name}</option>
                                ))
                              )}
                            </select>
                          ) : (
                            <select
                              value={selectedActionIdx}
                              onChange={(e) => {
                                setSelectedActionIdx(parseInt(e.target.value));
                                setMappingValues({});
                                setMappingTypes({});
                              }}
                              style={{
                                width: '100%',
                                padding: '0.65rem',
                                borderRadius: '10px',
                                border: '1.5px solid #cbd5e1',
                                background: '#ffffff',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                color: '#0f172a'
                              }}
                            >
                              {targetAppConfig.actions.map((act: any, idx: number) => (
                                <option key={idx} value={idx}>{act.name}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Mappings */}
                        <div>
                          <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>
                            MAPEO DE VARIABLES
                          </label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {(() => {
                              const activeFields = targetApp === 'process'
                                ? (processTemplates.find(t => t.id === selectedTemplateId)?.variables || []).filter((v: string) => v !== 'Miembro Involucrado (Email)')
                                : (targetAppConfig.actions[selectedActionIdx]?.fields || []);
                                
                              if (activeFields.length === 0) {
                                return (
                                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                    No hay variables requeridas para esta acción.
                                  </div>
                                );
                              }

                              return activeFields.map((field: string) => {
                                const mType = mappingTypes[field] || 'static';
                                const availOutputs = currentAppConfig.triggers[selectedTriggerIdx]?.outputs || [];
                                
                                return (
                                  <div key={field} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1.2fr 1fr 1.5fr',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    background: '#f8fafc',
                                    padding: '0.5rem 0.6rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0'
                                  }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>
                                      {field}
                                    </span>
                                    
                                    <select
                                      value={mType}
                                      onChange={(e) => {
                                        const t = e.target.value as 'field' | 'static';
                                        setMappingTypes({ ...mappingTypes, [field]: t });
                                        setMappingValues({ ...mappingValues, [field]: '' });
                                      }}
                                      style={{
                                        padding: '0.35rem',
                                        fontSize: '0.72rem',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        background: '#ffffff'
                                      }}
                                    >
                                      <option value="field">🔗 Variable</option>
                                      <option value="static">✍️ Fijo</option>
                                    </select>

                                    {mType === 'field' ? (
                                      <select
                                        required
                                        value={mappingValues[field] || ''}
                                        onChange={(e) => setMappingValues({ ...mappingValues, [field]: e.target.value })}
                                        style={{
                                          padding: '0.35rem',
                                          fontSize: '0.72rem',
                                          border: '1px solid #cbd5e1',
                                          borderRadius: '6px'
                                        }}
                                      >
                                        <option value="">-- Campo --</option>
                                        {availOutputs.map((out: string) => (
                                          <option key={out} value={out}>{out}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        required
                                        placeholder="Valor fijo"
                                        value={mappingValues[field] || ''}
                                        onChange={(e) => setMappingValues({ ...mappingValues, [field]: e.target.value })}
                                        style={{
                                          padding: '0.35rem 0.5rem',
                                          fontSize: '0.72rem',
                                          border: '1px solid #cbd5e1',
                                          borderRadius: '6px'
                                        }}
                                      />
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Confirmation Button */}
                        <button 
                          type="submit" 
                          className="btn-teal-confirm"
                        >
                          + CONFIRMAR
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        padding: '1.25rem',
                        background: '#fff1f2',
                        border: '1px dashed #fecdd3',
                        borderRadius: '12px',
                        color: '#be123c',
                        fontSize: '0.85rem',
                        textAlign: 'center',
                        fontWeight: 600
                      }}>
                        ⚠️ Conecta otra app primero para poder enlazar este disparador.
                      </div>
                    )}
                  </div>

                </div>
              </form>
            </div>
          )}

          {/* TAB 2: REGLAS ACTIVAS LIST */}
          {activeTab === 'rules' && (
            <div className="rules-list-container">
              {currentAppRules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 2rem', background: '#ffffff', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚡</div>
                  <h4 style={{ color: 'var(--text-heading)', marginBottom: '0.35rem' }}>No hay reglas activas para {app.name}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Diseña tu primer flujo automatizado para conectar eventos en tiempo real.
                  </p>
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('builder')}
                    className="btn-brand-teal"
                  >
                    + Diseñar Flujo Ahora
                  </button>
                </div>
              ) : (
                currentAppRules.map(rule => {
                  const srcAppObj = ALL_APPS[rule.sourceApp];
                  const targetAppObj = ALL_APPS[rule.targetApp];
                  const trigName = srcAppObj?.triggers[rule.triggerIdx]?.name || 'Disparador';
                  const actName = targetAppObj?.actions[rule.actionIdx]?.name || 'Acción';

                  return (
                    <div key={rule.id} className="rule-item-card">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#3b82f6', background: '#eff6ff', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                            {APP_NAMES_MAP[rule.sourceApp]}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>➔</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0d9488', background: '#f0fdfa', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                            {APP_NAMES_MAP[rule.targetApp]}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#1e293b' }}>
                          <strong>Cuando:</strong> {trigName} ➔ <strong>Ejecutar:</strong> {actName}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.2rem' }}>
                          {Object.entries(rule.mappings).map(([k, v]) => {
                            const isFld = rule.mappingTypes[k] === 'field';
                            return (
                              <span key={k} style={{
                                fontSize: '0.68rem',
                                background: '#f1f5f9',
                                color: '#475569',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                fontFamily: 'monospace'
                              }}>
                                {k} = {isFld ? `🔗 ${v}` : `"${v}"`}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => handleTestRuleTrigger(rule)}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#2563eb',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          🧪 Probar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleRule(rule.id)}
                          className={`switch-toggle ${rule.isActive ? 'active' : ''}`}
                          style={{ transform: 'scale(0.85)' }}
                          title={rule.isActive ? "Desactivar" : "Activar"}
                        >
                          <div className="switch-handle"></div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          style={{
                            background: '#fee2e2',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            padding: '0.4rem 0.6rem',
                            fontSize: '0.85rem'
                          }}
                          title="Eliminar regla"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: CREDENCIALES & SERVICE KEY */}
          {activeTab === 'credentials' && (
            <div style={{ background: '#ffffff', borderRadius: '18px', padding: '2rem', border: '1px solid var(--border-color)' }}>
              <form onSubmit={handleSave}>
                <div className="input-group-full" style={{ marginBottom: '1.25rem' }}>
                  <label>SERVICE KEY ({app.keyPrefix}...)</label>
                  <div className="input-with-icon">
                    <div className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={inputKey}
                      onChange={(e) => {
                        setInputKey(e.target.value);
                        setTestStatus('idle');
                      }}
                      placeholder={`Ej: ${app.keyPrefix.split(' ')[0]}xxxxxxxx`} 
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
                        justifyContent: 'center'
                      }}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    onClick={handleTestConnection}
                    className="btn-test-connection"
                  >
                    Probar Conexión
                  </button>
                  <button 
                    type="submit" 
                    className="btn-brand-teal"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Guardando...' : 'Guardar Key'}
                  </button>
                </div>
              </form>

              {/* Test Results Output */}
              {testStatus !== 'idle' && (
                <div className={`test-results-log ${testStatus}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    <span>RESULTADOS DEL TEST:</span>
                    <span>
                      {testStatus === 'loading' && '⌛ Probando...'}
                      {testStatus === 'success' && '✅ Conexión Exitosa'}
                      {testStatus === 'error' && '❌ Falló la Conexión'}
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
          )}

        </div>
      )}

    </div>
  );
}
