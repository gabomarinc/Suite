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
  fetchProcessTemplates
} from '../app/automatizaciones/actions';

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
  isActive: boolean;
  sourceApp: string;      // Origen (e.g. 'bills')
  triggerIdx: number;     // Index del trigger en sourceApp
  targetApp: string;      // Destino (e.g. 'mailing')
  actionIdx: number;      // Index de la acción en targetApp
  mappings: Record<string, string>; // Mapeo de campos. Clave: campo de acción destino, Valor: campo de trigger origen o valor manual
  mappingTypes: Record<string, 'field' | 'static'>; // Tipo de mapeo: 'field' (vinculado a variable) o 'static' (texto manual)
}

interface AppConfig {
  name: string;
  code: string;
  triggers: {
    name: string;
    description: string;
    outputs: string[];
  }[];
  actions: {
    name: string;
    description: string;
    fields: string[];
  }[];
}

const ALL_APPS: Record<string, AppConfig> = {
  bills: {
    name: 'Kônsul Bills',
    code: 'bills',
    triggers: [
      { name: 'Documento Creado (Factura/Cotización)', description: 'Se dispara al crearse una factura o cotización en Bills.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Monto Total', 'Concepto de Venta'] },
      { name: 'Estado de Factura Actualizado', description: 'Se dispara cuando una factura cambia a Pagada, Aceptada o Incobrable.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Monto Total', 'Concepto de Venta', 'Nuevo Estado'] },
      { name: 'Nuevo Cliente o Prospecto', description: 'Se dispara al crear un nuevo cliente o prospecto.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Teléfono'] }
    ],
    actions: [
      { name: 'Crear Factura o Cotización', description: 'POST /api/v1/invoices - Genera factura o cotización.', fields: ['Nombre del Cliente', 'Email del Cliente', 'Monto Total', 'Concepto de Venta'] },
      { name: 'Actualizar Estado de Factura', description: 'PUT /api/v1/invoices - Cambia estado de factura.', fields: ['Nuevo Estado'] },
      { name: 'Crear o Actualizar Cliente', description: 'POST /api/v1/clients - Registra un prospecto.', fields: ['Nombre del Cliente', 'Email del Cliente', 'Teléfono', 'Notas'] }
    ]
  },
  process: {
    name: 'Kônsul Process',
    code: 'process',
    triggers: [
      { name: 'Nueva Tarea / Tarjeta', description: 'Se dispara al crear una tarjeta en un tablero.', outputs: ['Título de Tarea', 'Descripción', 'Miembro Asignado'] },
      { name: 'Estado de Tarea Cambiado', description: 'Se dispara al mover una tarjeta de columna.', outputs: ['Título de Tarea', 'Columna Actual'] }
    ],
    actions: [
      { name: 'Crear Tarjeta / Tarea', description: 'Crea una tarea en un tablero y columna específica.', fields: ['Título de Tarea', 'Descripción'] },
      { name: 'Mover Tarjeta', description: 'Desplaza una tarjeta a otra columna.', fields: ['Columna Destino'] },
      { name: 'Asignar Miembro', description: 'Asigna una tarea a un correo de miembro.', fields: ['Email de Miembro'] }
    ]
  },
  reactivaleads: {
    name: 'Kônsul Reactivaleads',
    code: 'reactivaleads',
    triggers: [
      { name: 'Nuevo Lead Registrado', description: 'Se dispara al capturar un lead de formulario o chat.', outputs: ['Nombre del Lead', 'Email del Lead', 'Teléfono del Lead'] },
      { name: 'Lead Calificado', description: 'Se dispara al alcanzar un score crediticio o comercial mínimo.', outputs: ['Nombre del Lead', 'Email del Lead', 'Puntaje de Scoring'] }
    ],
    actions: [
      { name: 'Crear o Importar Lead', description: 'Inserta un nuevo prospecto en la base de datos central.', fields: ['Nombre del Lead', 'Email del Lead', 'Teléfono del Lead'] },
      { name: 'Asignar Agente', description: 'Asigna un prospecto a un asesor.', fields: ['Email del Asesor/Agente'] }
    ]
  },
  kredit: {
    name: 'Kônsul Kredit',
    code: 'kredit',
    triggers: [
      { name: 'Nueva Solicitud de Crédito', description: 'Se dispara cuando un cliente solicita financiación.', outputs: ['Nombre del Cliente', 'Monto Solicitado', 'Email del Cliente'] },
      { name: 'Evaluación de Riesgo Completada', description: 'Se dispara al terminar el análisis crediticio.', outputs: ['Nombre del Cliente', 'Puntaje de Riesgo', 'Monto Aprobado'] }
    ],
    actions: [
      { name: 'Iniciar Análisis de Riesgo', description: 'Dispara el motor de evaluación para un cliente.', fields: ['Nombre del Cliente', 'Monto Solicitado', 'Email del Cliente'] },
      { name: 'Aprobar Pre-Crédito', description: 'Pre-aprueba la solicitud de crédito del cliente.', fields: ['Monto Aprobado'] }
    ]
  },
  mailing: {
    name: 'Kônsul Mailing',
    code: 'mailing',
    triggers: [
      { name: 'Nuevo Suscriptor', description: 'Se dispara al unirse a una lista de correos.', outputs: ['Email del Suscriptor', 'Nombre del Suscriptor'] },
      { name: 'Enlace de Correo Abierto / Clicked', description: 'Se dispara cuando interactúan con un enlace.', outputs: ['Email del Suscriptor', 'Nombre de Campaña'] }
    ],
    actions: [
      { name: 'Enviar Correo Transaccional', description: 'Envía un email directo usando una plantilla.', fields: ['Email Destinatario', 'Asunto del Correo', 'Cuerpo del Correo'] },
      { name: 'Añadir a Lista de Envío', description: 'Suscribe a un usuario a una campaña o newsletter.', fields: ['Email del Suscriptor', 'Nombre del Suscriptor'] }
    ]
  }
};

const APP_NAMES_MAP: Record<string, string> = {
  bills: 'Kônsul Bills',
  process: 'Kônsul Process',
  reactivaleads: 'Kônsul Reactivaleads',
  kredit: 'Kônsul Kredit',
  mailing: 'Kônsul Mailing'
};

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

  // Automation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTriggerIdx, setSelectedTriggerIdx] = useState(0);
  const [targetApp, setTargetApp] = useState<string>('process');
  const [selectedActionIdx, setSelectedActionIdx] = useState(0);
  
  // Dynamic Process Templates State
  const [processTemplates, setProcessTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  // Mapeos de campos del formulario
  const [mappingValues, setMappingValues] = useState<Record<string, string>>({});
  const [mappingTypes, setMappingTypes] = useState<Record<string, 'field' | 'static'>>({});
  
  // Lista de reglas de automatización globales (vienen de la BD)
  const [rules, setRules] = useState<AutomationRule[]>(initialRules);

  useEffect(() => {
    setRules(initialRules);
  }, [initialRules]);

  // Listener to keep cards in sync using Server Actions
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

  // Fetch Process templates when targetApp is set to 'process'
  useEffect(() => {
    if (targetApp === 'process' && serviceKey) {
      setIsLoadingTemplates(true);
      fetchProcessTemplates(serviceKey)
        .then(res => {
          if (res.success) {
            setProcessTemplates(res.data);
            if (res.data.length > 0 && !selectedTemplateId) {
              setSelectedTemplateId(res.data[0].id);
            }
          } else {
            console.error(res.error);
          }
        })
        .finally(() => {
          setIsLoadingTemplates(false);
        });
    }
  }, [targetApp, serviceKey, isModalOpen]);


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
      setIsActive(!!trimmedKey);
      setTestStatus('success'); // default verified status once saved
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
      ? (processTemplates.find(t => t.id === selectedTemplateId)?.variables || [])
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

      // Update client state & notify other cards
      const newRules = [savedRule as unknown as AutomationRule, ...rules];
      setRules(newRules);
      window.dispatchEvent(new Event('konsul_rules_updated'));

      // Clear mappings state
      setMappingValues({});
      setMappingTypes({});
      alert('¡Regla de automatización conectada y guardada en BD con éxito! ⚡');
    } catch (err) {
      console.error(err);
      alert('Error al guardar la regla en la base de datos.');
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
      alert('Error al borrar la regla de la base de datos.');
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

  // Hide the test connection button once connection is successfully configured & validated
  const showTestButton = inputKey !== '' && (inputKey !== serviceKey || testStatus === 'loading' || testStatus === 'error');
  const isConnectionVerified = serviceKey !== '' && (testStatus === 'success' || isActive);

  // Filter rules relevant to this current app card (either as origin or destination)
  const currentAppRules = rules.filter(r => r.sourceApp === app.code || r.targetApp === app.code);

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
            {showTestButton && (
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
            
            {/* Automate Button: Shown only when connection key is active & verified */}
            {isConnectionVerified && (
              <button 
                type="button" 
                onClick={() => setIsModalOpen(true)}
                className="btn-automate"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
                }}
              >
                Automatizar
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

      {/* AUTOMATION BUILDER MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="modal-content card-premium" style={{
            width: '100%',
            maxWidth: '680px',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div className="modal-header" style={{
              padding: '1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: `linear-gradient(135deg, ${app.bgLight} 0%, #ffffff 100%)`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ color: app.color, background: 'white', padding: '0.5rem', borderRadius: '8px', display: 'flex', border: '1px solid #f1f5f9' }}>
                  {app.icon}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>
                    Kônsul Connect Builder: {app.name}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                    Conecta eventos de esta aplicación con acciones automatizadas de tu ecosistema
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  lineHeight: '1'
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="modal-body" style={{
              padding: '1.5rem',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              
              {/* Form Rule Configuration */}
              <form onSubmit={handleAddRule} style={{
                background: '#f8fafc',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}>
                <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🔗</span> Nueva Regla de Automatización
                </h5>

                {/* Paso 1: Origen */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    1. DISPARADOR (ORIGEN)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      readOnly 
                      value={app.name} 
                      style={{
                        padding: '0.55rem',
                        fontSize: '0.85rem',
                        background: '#e2e8f0',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontWeight: 600,
                        color: '#475569'
                      }}
                    />
                    <select
                      value={selectedTriggerIdx}
                      onChange={(e) => {
                        setSelectedTriggerIdx(parseInt(e.target.value));
                        setMappingValues({});
                        setMappingTypes({});
                      }}
                      style={{
                        padding: '0.55rem',
                        fontSize: '0.85rem',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px'
                      }}
                    >
                      {currentAppConfig.triggers.map((trig, idx) => (
                        <option key={idx} value={idx}>{trig.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Outputs preview */}
                  <div style={{ marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      💡 Campo(s) disponibles para mapear: 
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.25rem' }}>
                      {currentAppConfig.triggers[selectedTriggerIdx]?.outputs.map(out => (
                        <span key={out} style={{
                          fontSize: '0.65rem',
                          background: `${app.bgLight}`,
                          color: `${app.color}`,
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          border: `1px solid ${app.bgLight}`,
                          fontFamily: 'monospace'
                        }}>
                          {out}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Paso 2: Destino */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    2. ACCIÓN (DESTINO)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem' }}>
                    <select
                      value={targetApp}
                      onChange={(e) => {
                        setTargetApp(e.target.value);
                        setSelectedActionIdx(0);
                        setMappingValues({});
                        setMappingTypes({});
                      }}
                      style={{
                        padding: '0.55rem',
                        fontSize: '0.85rem',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontWeight: 600
                      }}
                    >
                      {Object.keys(ALL_APPS).map(code => (
                        <option key={code} value={code}>{ALL_APPS[code].name}</option>
                      ))}
                    </select>
                    {targetApp === 'process' ? (
                      <select
                        disabled
                        style={{
                          padding: '0.55rem',
                          fontSize: '0.85rem',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          color: '#475569'
                        }}
                      >
                        <option>Ejecutar Plantilla de Proceso</option>
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
                          padding: '0.55rem',
                          fontSize: '0.85rem',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px'
                        }}
                      >
                        {targetAppConfig.actions.map((act, idx) => (
                          <option key={idx} value={idx}>{act.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {targetApp === 'process' && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => {
                          setSelectedTemplateId(e.target.value);
                          setMappingValues({});
                          setMappingTypes({});
                        }}
                        disabled={isLoadingTemplates || processTemplates.length === 0}
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          fontSize: '0.85rem',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontWeight: 600,
                          color: '#0f172a'
                        }}
                      >
                        {isLoadingTemplates ? (
                          <option value="">⏳ Cargando plantillas desde Process...</option>
                        ) : processTemplates.length === 0 ? (
                          <option value="">⚠️ No hay plantillas (Revisa tu Service Key de Process)</option>
                        ) : (
                          processTemplates.map(t => (
                            <option key={t.id} value={t.id}>📄 {t.name}</option>
                          ))
                        )}
                      </select>
                      {processTemplates.find(t => t.id === selectedTemplateId)?.description && (
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                          {processTemplates.find(t => t.id === selectedTemplateId)?.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Paso 3: Mapeo de Variables Inteligente */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    3. CORRELACIÓN & MAPEO DE CAMPOS (INTELLIGENT MAPPER)
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
                    {(() => {
                      const activeFields = targetApp === 'process'
                        ? (processTemplates.find(t => t.id === selectedTemplateId)?.variables || [])
                        : (targetAppConfig.actions[selectedActionIdx]?.fields || []);
                        
                      if (activeFields.length === 0 && targetApp === 'process') {
                        return <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>No hay variables requeridas para esta plantilla.</div>;
                      }

                      return activeFields.map((field: string) => {
                      const mType = mappingTypes[field] || 'static';
                      const availOutputs = currentAppConfig.triggers[selectedTriggerIdx]?.outputs || [];
                      
                      return (
                        <div key={field} style={{
                          display: 'grid',
                          gridTemplateColumns: '1.5fr 1.5fr 2fr',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: '#ffffff',
                          padding: '0.6rem',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' }}>
                            👉 {field}
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
                              fontSize: '0.75rem',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              background: '#f8fafc'
                            }}
                          >
                            <option value="field">🔗 Enlazar Variable</option>
                            <option value="static">✍️ Texto Fijo</option>
                          </select>

                          {mType === 'field' ? (
                            <select
                              required
                              value={mappingValues[field] || ''}
                              onChange={(e) => setMappingValues({ ...mappingValues, [field]: e.target.value })}
                              style={{
                                padding: '0.35rem',
                                fontSize: '0.75rem',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px'
                              }}
                            >
                              <option value="">-- Seleccionar Campo --</option>
                              {availOutputs.map(out => (
                                <option key={out} value={out}>{out}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              required
                              placeholder="Escribe un valor fijo"
                              value={mappingValues[field] || ''}
                              onChange={(e) => setMappingValues({ ...mappingValues, [field]: e.target.value })}
                              style={{
                                padding: '0.35rem 0.5rem',
                                fontSize: '0.75rem',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px'
                              }}
                            />
                          )}
                        </div>
                      );
                    })})()}
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    background: app.color,
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                    boxShadow: `0 4px 10px rgba(0, 0, 0, 0.05)`
                  }}
                >
                  ⚡ Guardar Conexión
                </button>
              </form>

              {/* Active Rules List */}
              <div style={{
                marginTop: '0.5rem',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '1rem'
              }}>
                <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>
                  Flujos de Conexión Activos para {app.name}
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {currentAppRules.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                      No tienes reglas creadas para esta app. Configura una nueva arriba 👆
                    </div>
                  ) : (
                    currentAppRules.map((rule) => {
                      const srcAppObj = ALL_APPS[rule.sourceApp];
                      const targetAppObj = ALL_APPS[rule.targetApp];
                      const trigName = srcAppObj?.triggers[rule.triggerIdx]?.name || 'Disparador';
                      const actName = targetAppObj?.actions[rule.actionIdx]?.name || 'Acción';
                      
                      return (
                        <div key={rule.id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6' }}>
                                {APP_NAMES_MAP[rule.sourceApp]}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>➔</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
                                {APP_NAMES_MAP[rule.targetApp]}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                              <strong>Si:</strong> {trigName} <strong>➔ Hacer:</strong> {actName}
                            </div>
                            {/* Mappings description */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.15rem' }}>
                              {Object.entries(rule.mappings).map(([k, v]) => {
                                const isFld = rule.mappingTypes[k] === 'field';
                                return (
                                  <span key={k} style={{
                                    fontSize: '0.6rem',
                                    background: '#e2e8f0',
                                    color: '#475569',
                                    padding: '0.1rem 0.3rem',
                                    borderRadius: '3px',
                                    fontFamily: 'monospace'
                                  }}>
                                    {k} = {isFld ? `🔗 ${v}` : `"${v}"`}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleRule(rule.id)}
                              className={`switch-toggle ${rule.isActive ? 'active' : ''}`}
                              style={{ transform: 'scale(0.8)' }}
                            >
                              <div className="switch-handle"></div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                padding: '0.2rem'
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem'
            }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-test-connection"
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
