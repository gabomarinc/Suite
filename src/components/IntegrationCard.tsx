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
  getConnectedIntegrations,
  connectAppOneClick,
  disconnectApp,
  fetchRealTriggerData
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
  userEmail?: string;
  userName?: string;
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
  userEmail = '',
  userName = '',
}: IntegrationCardProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [serviceKey, setServiceKey] = useState(initialServiceKey);
  const [inputKey, setInputKey] = useState(initialServiceKey);
  const [showPassword, setShowPassword] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testLog, setTestLog] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 1-Click SSO & Dev Mode States
  const [isConnectingSso, setIsConnectingSso] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDevMode, setShowDevMode] = useState(false);

  // Accordion & Tab State
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'builder' | 'rules' | 'credentials'>('builder');

  // Progressive Step-by-Step Flow Wizard State (1: Trigger, 2: Target & Action, 3: Mapping)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Automation Builder State - Default to process, bills, or mailing
  const defaultTarget = app.code === 'process' ? 'bills' : app.code === 'bills' ? 'process' : 'mailing';
  const [selectedTriggerIdx, setSelectedTriggerIdx] = useState(0);
  const [targetApp, setTargetApp] = useState<string>(defaultTarget);
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
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);

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

  // Ensure targetApp is valid
  useEffect(() => {
    if (!targetApp) {
      setTargetApp(defaultTarget);
    }
  }, [targetApp, defaultTarget]);

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
          if (res.success && res.data && res.data.length > 0) {
            setProcessTemplates(res.data);
            if (!selectedTemplateId) {
              setSelectedTemplateId(res.data[0].id);
            }
          } else {
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
  }, [targetApp, connectedIntegrations, isExpanded, selectedTemplateId]);

  const handleToggle = async () => {
    try {
      await toggleIntegration(app.code, isActive);
      setIsActive(!isActive);
      window.dispatchEvent(new Event('konsul_integrations_updated'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleConnectSso = async () => {
    setIsConnectingSso(true);
    setTestStatus('loading');
    setTestLog([
      `Iniciando protocolo Kônsul SSO...`,
      `Identificando usuario Kinde (${userEmail || 'sesión activa'})...`,
      `Vinculando ${app.name} al ecosistema Kônsul...`
    ]);
    try {
      const res = await connectAppOneClick(app.code);
      if (res.success) {
        setServiceKey(res.serviceKey);
        setInputKey(res.serviceKey);
        setIsActive(true);
        setTestStatus('success');
        setTestLog(prev => [
          ...prev,
          `Identidad verificada exitosamente.`,
          `Cuenta y espacio de trabajo aprovisionados.`,
          `¡${app.name} conectada y activa en la Suite!`
        ]);
        window.dispatchEvent(new Event('konsul_integrations_updated'));
      }
    } catch (err) {
      console.error('Error al conectar con Kônsul SSO:', err);
      setTestStatus('error');
      setTestLog(prev => [...prev, 'Error de red o autenticación al sincronizar con SSO.']);
    } finally {
      setIsConnectingSso(false);
    }
  };

  const handleDisconnectSso = async () => {
    if (!confirm(`¿Estás seguro de que deseas desconectar ${app.name}?`)) return;
    setIsDisconnecting(true);
    try {
      const res = await disconnectApp(app.code);
      if (res.success) {
        setServiceKey('');
        setInputKey('');
        setIsActive(false);
        setTestStatus('idle');
        setTestLog([]);
        window.dispatchEvent(new Event('konsul_integrations_updated'));
      }
    } catch (err) {
      console.error('Error al desconectar:', err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Reset and exit builder flow completely
  const handleCancelBuilder = () => {
    setCurrentStep(1);
    setMappingValues({});
    setMappingTypes({});
    setSelectedTriggerIdx(0);
    setSelectedActionIdx(0);
    setActiveTab('rules');
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
      alert('Service Key guardado con éxito.');
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
            'Prefijo válido.',
            `Conectando a endpoint del servicio (${app.name})...`,
            ...result.logs,
            'Prueba completada con éxito. Lectura/Escritura al 100%.'
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
    const isProcessWithTemplates = targetApp === 'process' && processTemplates.length > 0;
    const actionFields = isProcessWithTemplates
      ? (processTemplates.find(t => t.id === selectedTemplateId)?.variables || []).filter((v: string) => v !== 'Miembro Involucrado (Email)')
      : (targetAppConfig.actions[selectedActionIdx]?.fields || []);
    
    // Build mappings object
    const finalMappings: Record<string, string> = {};
    const finalTypes: Record<string, 'field' | 'static'> = {};

    actionFields.forEach((field: string) => {
      finalMappings[field] = mappingValues[field] || '';
      finalTypes[field] = mappingTypes[field] || 'static';
    });

    if (isProcessWithTemplates && selectedTemplateId) {
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
      setCurrentStep(1);
      setActiveTab('rules');
      alert('Regla de automatización creada y activada con éxito.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar la regla en la base de datos.');
    }
  };

  const handleTestRuleTrigger = async (rule: AutomationRule) => {
    const srcAppObj = ALL_APPS[rule.sourceApp];
    const trigName = srcAppObj?.triggers[rule.triggerIdx]?.name || '';
    const targetAppName = ALL_APPS[rule.targetApp]?.name || rule.targetApp;

    setTestingRuleId(rule.id);

    try {
      // 1. Obtener datos reales de la base de datos de la app origen según el disparador
      const realRes = await fetchRealTriggerData(rule.sourceApp, rule.triggerIdx, trigName);
      const triggerData = realRes.data || {};

      // 2. Disparar el motor de automatizaciones con los datos reales
      const response = await fetch('/api/v1/automations/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appCode: rule.sourceApp,
          triggerName: trigName,
          userId: rule.userId,
          data: triggerData
        })
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        // Formatear las variables mapeadas con sus valores reales aplicados
        const mappings = (rule.mappings as Record<string, string>) || {};
        const mappingTypes = (rule.mappingTypes as Record<string, 'field' | 'static'>) || {};

        const appliedLines = Object.entries(mappings)
          .filter(([k]) => k !== '__templateId')
          .map(([targetField, sourceField]) => {
            const isField = (mappingTypes[targetField] || 'field') === 'field';
            const value = isField ? ((triggerData as any)[sourceField] || `[${sourceField}]`) : sourceField;
            return `• ${targetField}: "${value}"`;
          });

        const alertMessage = 
          `✅ Regla de Automatización Probada con Éxito\n\n` +
          `🔍 ${realRes.summary}\n` +
          `⚡ Disparador: ${trigName}\n` +
          `🎯 App Destino: ${targetAppName}\n\n` +
          `Variables reales aplicadas a la acción:\n` +
          (appliedLines.length > 0 ? appliedLines.join('\n') : '• Ejecución estándar sin variables') +
          `\n\nRevisa el Historial (Logs) para ver la confirmación devuelta por ${targetAppName}.`;

        alert(alertMessage);
        window.dispatchEvent(new Event('konsul_rules_updated'));
      } else {
        alert(`Fallo al ejecutar la prueba: ${resData.error || 'Error desconocido'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error al ejecutar prueba con datos reales: ${err.message || err}`);
    } finally {
      setTestingRuleId(null);
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

  const currentAppRules = rules.filter(r => 
    r.sourceApp === app.code || 
    r.targetApp === app.code ||
    (app.code === 'leadshub' && (r.sourceApp === 'reactivaleads' || r.targetApp === 'reactivaleads')) ||
    (app.code === 'reactivaleads' && (r.sourceApp === 'leadshub' || r.targetApp === 'leadshub'))
  );
  const isConnected = !!serviceKey && isActive;

  // Destination apps: Bills, Process, and Mailing are ALWAYS available as targets for all apps
  const DESTINATION_ORDER = ['bills', 'process', 'mailing', 'leadshub', 'kredit'];
  const availableTargetApps = DESTINATION_ORDER
    .map(code => ALL_APPS[code])
    .filter(Boolean);

  const targetIntegration = connectedIntegrations.find(i => i.appCode === targetApp);
  const isTargetIntegrated = !!(targetIntegration?.isActive && targetIntegration?.serviceKey);

  // Selected trigger metadata
  const currentTrigger = currentAppConfig.triggers[selectedTriggerIdx] || { name: 'Disparador', outputs: [] };
  
  // Selected action metadata
  const currentTargetAppName = ALL_APPS[targetApp]?.name || targetApp;
  const isProcessWithTemplates = targetApp === 'process' && processTemplates.length > 0;
  const currentActionName = isProcessWithTemplates
    ? (processTemplates.find(t => t.id === selectedTemplateId)?.name || 'Plantilla de Proceso')
    : (targetAppConfig.actions[selectedActionIdx]?.name || 'Acción');

  return (
    <div className={`app-list-row ${isExpanded ? 'expanded' : ''}`}>
      
      {/* Horizontal List Header Row */}
      <div 
        className="app-list-header" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="app-list-left">
          {/* App Icon: Uniform Kônsul green for all apps in the list */}
          <div className="app-icon-with-check" style={{ background: '#f0fdfa', color: '#00a884' }}>
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
                <strong>AUTENTICACIÓN:</strong> {serviceKey?.startsWith('konsul_sso_') ? 'KÔNSUL SSO (1 CLIC)' : isConnected ? 'SERVICE KEY' : 'KÔNSUL SSO'}
              </span>
              <span>•</span>
              <span className="app-meta-tag-item">
                <strong>TIPO:</strong> {app.description.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="app-list-right" onClick={(e) => e.stopPropagation()}>
          {/* Quick 1-Click Connect Button on List Row */}
          {!isConnected && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleConnectSso();
              }}
              disabled={isConnectingSso}
              className="btn-quick-connect"
              title={`Vincular ${app.name} con un solo clic`}
            >
              {isConnectingSso ? (
                <>
                  <svg className="spin-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                  <span>Vinculando...</span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                  <span>Vincular en 1 Clic</span>
                </>
              )}
            </button>
          )}

          {/* Active Switch Toggle */}
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
          
          {/* Tabs Bar with clean universal SVG icons */}
          <div className="accordion-tabs-bar">
            <button 
              type="button" 
              onClick={() => setActiveTab('builder')}
              className={`accordion-tab-btn ${activeTab === 'builder' ? 'active' : ''}`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              <span>Nueva Automatización</span>
            </button>

            <button 
              type="button" 
              onClick={() => setActiveTab('rules')}
              className={`accordion-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              <span>Reglas Activas ({currentAppRules.length})</span>
            </button>

            <button 
              type="button" 
              onClick={() => setActiveTab('credentials')}
              className={`accordion-tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span>Conexión & Credenciales</span>
            </button>
          </div>

          {/* TAB 1: PROGRESSIVE STEP-BY-STEP FLOW BUILDER */}
          {activeTab === 'builder' && (
            <div className="flow-canvas-container">
              
              {/* Stepper Navigation Indicator with Limpiar y Salir Button */}
              <div className="flow-stepper-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, overflowX: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className={`flow-step-nav-item ${currentStep === 1 ? 'active' : 'completed'}`}
                  >
                    <div className="flow-step-nav-num">
                      {currentStep > 1 ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ) : '1'}
                    </div>
                    <span>1. Disparador</span>
                  </button>

                  <div className={`flow-step-nav-divider ${currentStep > 1 ? 'active' : ''}`}></div>

                  <button
                    type="button"
                    onClick={() => currentStep > 2 && setCurrentStep(2)}
                    className={`flow-step-nav-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}
                    disabled={currentStep < 2}
                    style={{ cursor: currentStep >= 2 ? 'pointer' : 'default', opacity: currentStep < 2 ? 0.6 : 1 }}
                  >
                    <div className="flow-step-nav-num">
                      {currentStep > 2 ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ) : '2'}
                    </div>
                    <span>2. Destino y Acción</span>
                  </button>

                  <div className={`flow-step-nav-divider ${currentStep > 2 ? 'active' : ''}`}></div>

                  <div 
                    className={`flow-step-nav-item ${currentStep === 3 ? 'active' : ''}`}
                    style={{ opacity: currentStep < 3 ? 0.6 : 1 }}
                  >
                    <div className="flow-step-nav-num">3</div>
                    <span>3. Mapeo de Variables</span>
                  </div>
                </div>

                {/* Reset & Exit Button */}
                <button
                  type="button"
                  onClick={handleCancelBuilder}
                  className="btn-flow-cancel"
                  title="Limpiar y salir del flujo"
                  style={{ marginLeft: '1rem', flexShrink: 0 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Limpiar y Salir</span>
                </button>
              </div>

              {/* Wizard Steps Container */}
              <form onSubmit={handleAddRule} className="flow-wizard-container">
                
                {/* ─── PASO 1: DISPARADOR (ORIGEN) ─── */}
                {currentStep > 1 ? (
                  /* Collapsed Step 1 Summary Card */
                  <div className="flow-step-collapsed">
                    <div className="flow-step-collapsed-info">
                      <div className="flow-step-check-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div>
                        <div className="flow-step-collapsed-title">
                          Paso 1: Disparador — {currentTrigger.name}
                        </div>
                        <div className="flow-step-collapsed-meta">
                          {app.name} • {currentTrigger.outputs.length} variables de base de datos disponibles
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="flow-step-edit-btn"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      <span>Editar</span>
                    </button>
                  </div>
                ) : (
                  /* Active Step 1 Configuration Card */
                  <div className="flow-step-active">
                    <div className="flow-step-header">
                      <span className="flow-step-badge">Paso 1</span>
                      <div>
                        <div className="flow-step-title">Disparador de Origen ({app.name})</div>
                        <div className="flow-step-desc">Selecciona qué evento en {app.name} iniciará esta automatización.</div>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>
                        EVENTO DISPARADOR
                      </label>
                      <select
                        value={selectedTriggerIdx}
                        onChange={(e) => {
                          setSelectedTriggerIdx(parseInt(e.target.value));
                          setMappingValues({});
                          setMappingTypes({});
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          background: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: '#0f172a',
                          outline: 'none'
                        }}
                      >
                        {currentAppConfig.triggers.map((trig: any, idx: number) => (
                          <option key={idx} value={idx}>{trig.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Outputs Preview */}
                    <div style={{ marginTop: '1.25rem' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        VARIABLES DISPONIBLES DE BASE DE DATOS ({currentTrigger.outputs.length}):
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                        {currentTrigger.outputs.map((out: string) => (
                          <span key={out} style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            background: '#f0fdfa',
                            color: '#0d9488',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            border: '1px solid #ccfbf1',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
                            {out}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="step-actions-row">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="btn-step-next"
                      >
                        <span>Continuar al Paso 2 (Destino)</span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelBuilder}
                        className="btn-step-cancel"
                      >
                        Cancelar y Salir
                      </button>
                    </div>
                  </div>
                )}


                {/* ─── PASO 2: DESTINO Y ACCIÓN ─── */}
                {currentStep >= 2 && (
                  currentStep > 2 ? (
                    /* Collapsed Step 2 Summary Card */
                    <div className="flow-step-collapsed">
                      <div className="flow-step-collapsed-info">
                        <div className="flow-step-check-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                        <div>
                          <div className="flow-step-collapsed-title">
                            Paso 2: Destino — {currentTargetAppName}
                          </div>
                          <div className="flow-step-collapsed-meta">
                            Acción: {currentActionName}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="flow-step-edit-btn"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span>Editar</span>
                      </button>
                    </div>
                  ) : (
                    /* Active Step 2 Configuration Card */
                    <div className="flow-step-active">
                      <div className="flow-step-header">
                        <span className="flow-step-badge">Paso 2</span>
                        <div>
                          <div className="flow-step-title">Aplicación Destino y Acción</div>
                          <div className="flow-step-desc">Elige dónde y qué acción se ejecutará cuando se dispare este evento.</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Target App Selector: Bills, Process, and Mailing are always available */}
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>
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
                              padding: '0.75rem 1rem',
                              borderRadius: '12px',
                              border: '1.5px solid #cbd5e1',
                              background: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              color: '#0f172a'
                            }}
                          >
                            {availableTargetApps.map(target => {
                              const isTargetConnected = connectedIntegrations.some(i => i.appCode === target.code && i.isActive && i.serviceKey);
                              return (
                                <option key={target.code} value={target.code}>
                                  {target.name} {isTargetConnected ? '✓' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Action Selector */}
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>
                            ACCIÓN A EJECUTAR EN {currentTargetAppName.toUpperCase()}
                          </label>
                          {targetApp === 'process' && processTemplates.length > 0 ? (
                            <select
                              value={selectedTemplateId}
                              onChange={(e) => {
                                setSelectedTemplateId(e.target.value);
                                setMappingValues({});
                                setMappingTypes({});
                              }}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                border: '1.5px solid #cbd5e1',
                                background: '#ffffff',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                color: '#0f172a'
                              }}
                            >
                              {isLoadingTemplates ? (
                                <option>Cargando plantillas de tableros desde Process...</option>
                              ) : (
                                processTemplates.map(t => (
                                  <option key={t.id} value={t.id}>Plantilla: {t.name}</option>
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
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                border: '1.5px solid #cbd5e1',
                                background: '#ffffff',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                color: '#0f172a'
                              }}
                            >
                              {targetAppConfig.actions.map((act: any, idx: number) => (
                                <option key={idx} value={idx}>{act.name}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Soft Connection Notice */}
                        {!isTargetIntegrated && (
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#0d9488',
                            background: '#f0fdfa',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '10px',
                            border: '1px solid #ccfbf1',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            <span>Puedes configurar esta regla ahora mismo. Recuerda guardar el Service Key de <strong>{currentTargetAppName}</strong> en la pestaña Credenciales para que opere en vivo.</span>
                          </div>
                        )}

                        <div className="step-actions-row">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(3)}
                            className="btn-step-next"
                          >
                            <span>Continuar al Paso 3 (Variables)</span>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelBuilder}
                            className="btn-step-cancel"
                          >
                            Cancelar y Salir
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}


                {/* ─── PASO 3: MAPEO DE VARIABLES ─── */}
                {currentStep === 3 && (
                  <div className="flow-step-active">
                    <div className="flow-step-header">
                      <span className="flow-step-badge">Paso 3</span>
                      <div>
                        <div className="flow-step-title">Mapeo de Variables</div>
                        <div className="flow-step-desc">
                          Conecta cada campo de <strong>{currentActionName}</strong> con variables de <strong>{app.name}</strong> o define valores fijos.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {(() => {
                        const isProcessWithTemplates = targetApp === 'process' && processTemplates.length > 0;
                        const activeFields = isProcessWithTemplates
                          ? (processTemplates.find(t => t.id === selectedTemplateId)?.variables || []).filter((v: string) => v !== 'Miembro Involucrado (Email)')
                          : (targetAppConfig.actions[selectedActionIdx]?.fields || []);
                          
                        if (activeFields.length === 0) {
                          return (
                            <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              Esta acción no requiere parámetros adicionales obligatorios.
                            </div>
                          );
                        }

                        return activeFields.map((field: string) => {
                          const mType = mappingTypes[field] || 'field';
                          const availOutputs = currentTrigger.outputs || [];
                          
                          return (
                            <div key={field} style={{
                              display: 'grid',
                              gridTemplateColumns: '1.2fr 1fr 1.6fr',
                              alignItems: 'center',
                              gap: '0.6rem',
                              background: '#f8fafc',
                              padding: '0.65rem 0.85rem',
                              borderRadius: '10px',
                              border: '1px solid #e2e8f0'
                            }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
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
                                  padding: '0.45rem 0.6rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '8px',
                                  background: '#ffffff',
                                  color: '#334155'
                                }}
                              >
                                <option value="field">Variable Dinámica</option>
                                <option value="static">Valor Fijo</option>
                              </select>

                              {mType === 'field' ? (
                                <select
                                  required
                                  value={mappingValues[field] || ''}
                                  onChange={(e) => setMappingValues({ ...mappingValues, [field]: e.target.value })}
                                  style={{
                                    padding: '0.45rem 0.6rem',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    background: '#ffffff'
                                  }}
                                >
                                  <option value="">-- Seleccionar Variable --</option>
                                  {availOutputs.map((out: string) => (
                                    <option key={out} value={out}>{out}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  required
                                  placeholder="Escribe el valor fijo"
                                  value={mappingValues[field] || ''}
                                  onChange={(e) => setMappingValues({ ...mappingValues, [field]: e.target.value })}
                                  style={{
                                    padding: '0.45rem 0.6rem',
                                    fontSize: '0.78rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    background: '#ffffff'
                                  }}
                                />
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>

                    <div className="step-actions-row">
                      <button 
                        type="submit" 
                        className="btn-step-next"
                        style={{ 
                          flex: 1,
                          background: 'linear-gradient(135deg, #00a884 0%, #0d9488 100%)',
                          padding: '0.85rem',
                          fontSize: '0.9rem',
                          boxShadow: '0 4px 15px rgba(0, 168, 132, 0.3)'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Guardar y Activar Automatización</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelBuilder}
                        className="btn-step-cancel"
                      >
                        Cancelar y Salir
                      </button>
                    </div>
                  </div>
                )}

              </form>
            </div>
          )}

          {/* TAB 2: REGLAS ACTIVAS LIST */}
          {activeTab === 'rules' && (
            <div className="rules-list-container">
              {currentAppRules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 2rem', background: '#ffffff', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f0fdfa', color: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                  </div>
                  <h4 style={{ color: 'var(--text-heading)', marginBottom: '0.35rem' }}>No hay reglas activas para {app.name}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Diseña tu primer flujo automatizado para conectar eventos en tiempo real.
                  </p>
                  <button 
                    type="button" 
                    onClick={() => {
                      setActiveTab('builder');
                      setCurrentStep(1);
                    }}
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

                        {/* Mappings preview without __templateId and with clean icons */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                          {Object.entries(rule.mappings)
                            .filter(([k]) => k !== '__templateId')
                            .map(([k, v]) => {
                              const isFld = rule.mappingTypes[k] === 'field';
                              return (
                                <span key={k} style={{
                                  fontSize: '0.72rem',
                                  background: '#f8fafc',
                                  color: '#334155',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '6px',
                                  fontFamily: 'monospace',
                                  border: '1px solid #e2e8f0',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem'
                                }}>
                                  <strong>{k}</strong> = {isFld ? (
                                    <span style={{ color: '#0d9488', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                      {v}
                                    </span>
                                  ) : (
                                    `"${v}"`
                                  )}
                                </span>
                              );
                            })}
                        </div>
                      </div>

                      {/* Rule Item Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleTestRuleTrigger(rule)}
                          className="btn-rule-test"
                          disabled={testingRuleId === rule.id}
                          title="Disparar prueba con datos reales"
                          style={{
                            opacity: testingRuleId === rule.id ? 0.7 : 1,
                            cursor: testingRuleId === rule.id ? 'wait' : 'pointer'
                          }}
                        >
                          {testingRuleId === rule.id ? (
                            <>
                              <svg style={{ animation: 'spin 1s linear infinite' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"></circle>
                              </svg>
                              <span>Consultando...</span>
                            </>
                          ) : (
                            <>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                              </svg>
                              <span>Probar</span>
                            </>
                          )}
                        </button>

                        {/* Dedicated clean small toggle without broken scale */}
                        <button
                          type="button"
                          onClick={() => handleToggleRule(rule.id)}
                          className={`switch-toggle-sm ${rule.isActive ? 'active' : ''}`}
                          title={rule.isActive ? "Desactivar regla" : "Activar regla"}
                        >
                          <div className="switch-handle"></div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="btn-rule-delete"
                          title="Eliminar regla"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: CONEXIÓN & CREDENCIALES */}
          {activeTab === 'credentials' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* PRIMARY 1-CLICK KÔNSUL SSO CONNECTION CARD */}
              <div className={`sso-connect-card ${isConnected ? 'connected' : ''}`}>
                <div className="sso-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: isConnected ? '#dcfce7' : '#f1f5f9',
                      color: isConnected ? '#15803d' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Autenticación Unificada
                      </div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        Kônsul SSO (1 Clic)
                      </h3>
                    </div>
                  </div>

                  {isConnected ? (
                    <span className="sso-badge-pill connected">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"></circle></svg>
                      <span>VINCULADO Y ACTIVO</span>
                    </span>
                  ) : (
                    <span className="sso-badge-pill disconnected">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"></circle></svg>
                      <span>NO VINCULADO</span>
                    </span>
                  )}
                </div>

                <div className="sso-card-body">
                  <p>
                    {isConnected 
                      ? `${app.name} está conectada y sincronizada con tu cuenta. Las automatizaciones pueden intercambiar datos en tiempo real de forma instantánea.`
                      : `Conecta ${app.name} con un solo clic. El ecosistema aprovisiona y sincroniza tu cuenta automáticamente con tu sesión de Kônsul sin requerir tokens ni configuraciones complejas.`}
                  </p>

                  <div className="sso-account-info-box">
                    <div className="sso-account-item">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <div className="sso-account-details">
                        <span className="sso-account-label">Cuenta Kônsul Activa</span>
                        <span className="sso-account-email">{userEmail || 'somos@konsul.digital'}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                      Protocolo Kônsul Connect v1
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {isConnected ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setInputKey(serviceKey);
                            handleTestConnection();
                          }}
                          className="btn-test-connection"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                          <span>Probar Conexión</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDisconnectSso}
                          disabled={isDisconnecting}
                          className="btn-sso-disconnect"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                          <span>{isDisconnecting ? 'Desconectando...' : 'Desconectar App'}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectSso}
                        disabled={isConnectingSso}
                        className="btn-sso-connect"
                      >
                        {isConnectingSso ? (
                          <>
                            <svg className="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                            <span>Vinculando mediante SSO...</span>
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                            <span>Vincular {app.name} en 1 Clic</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SECONDARY DEVELOPER ACCORDION (MANUAL SERVICE KEY) */}
              <div className="dev-mode-accordion">
                <button
                  type="button"
                  onClick={() => setShowDevMode(!showDevMode)}
                  className="dev-mode-toggle-bar"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                    <span>Opciones avanzadas para desarrolladores (Service Key manual)</span>
                  </div>
                  <svg 
                    width="14" 
                    height="14" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ transform: showDevMode ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                {showDevMode && (
                  <div className="dev-mode-content">
                    <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.5 }}>
                      Si estás probando una instancia local o una clave dedicada de servicio externa, puedes ingresar manualmente una Service Key con prefijo <code>{app.keyPrefix}</code>.
                    </p>

                    <form onSubmit={handleSave}>
                      <div className="input-group-full" style={{ marginBottom: '1.25rem' }}>
                        <label>SERVICE KEY MANUAL ({app.keyPrefix}...)</label>
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
                            title={showPassword ? "Ocultar" : "Mostrar"}
                          >
                            {showPassword ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                              </svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            )}
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
                          {isSaving ? 'Guardando...' : 'Guardar Key Manual'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* TEST RESULTS LOG OUTPUT */}
              {testStatus !== 'idle' && (
                <div className={`test-results-log ${testStatus}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    <span>RESULTADOS DEL TEST:</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      {testStatus === 'loading' && (
                        <>
                          <svg className="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                          <span>Probando...</span>
                        </>
                      )}
                      {testStatus === 'success' && (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          <span>Conexión Exitosa</span>
                        </>
                      )}
                      {testStatus === 'error' && (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          <span>Falló la Conexión</span>
                        </>
                      )}
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
