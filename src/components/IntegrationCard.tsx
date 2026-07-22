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

interface SavedAutomation {
  id: string;
  type: 'trigger' | 'action';
  name: string;
  details: string;
  isActive: boolean;
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

  // Automation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'triggers' | 'actions'>('triggers');
  const [selectedTriggerIdx, setSelectedTriggerIdx] = useState(0);
  const [selectedActionIdx, setSelectedActionIdx] = useState(0);
  const [fieldInputs, setFieldInputs] = useState<Record<string, string>>({});
  
  // Simulated Saved Automations list
  const [automations, setAutomations] = useState<SavedAutomation[]>([
    {
      id: 'auto-1',
      type: 'trigger',
      name: app.code === 'bills' ? 'Factura Cobrada / Pagada' : app.code === 'reactivaleads' ? 'Nuevo Lead Registrado' : 'Evento de Integración',
      details: 'Sincronizando flujos automáticos con Kônsul Suite',
      isActive: true
    }
  ]);

  // App automation possibilities
  const appConfigs: Record<string, {
    triggers: { name: string; description: string }[];
    actions: { name: string; description: string; fields: string[] }[];
  }> = {
    bills: {
      triggers: [
        { name: 'Documento Creado (Factura/Cotización)', description: 'Consulta periódica a GET /api/v1/invoices para nuevos documentos.' },
        { name: 'Estado de Factura Actualizado', description: 'Se dispara cuando una factura cambia a Pagada, Aceptada, etc.' },
        { name: 'Nuevo Cliente o Prospecto', description: 'Consulta periódica a GET /api/v1/clients para nuevos registros.' },
        { name: 'Métricas Financieras Cambiadas', description: 'Monitoreo de métricas consolidadas en GET /api/v1/summary.' }
      ],
      actions: [
        { name: 'Crear Factura o Cotización', description: 'POST /api/v1/invoices - Genera documento (ideal para Agentes IA).', fields: ['clientName', 'clientEmail', 'total (Monto)', 'concept', 'type (Invoice/Quote)', 'status', 'currency'] },
        { name: 'Actualizar Estado de Factura', description: 'PUT /api/v1/invoices - Marca una factura como Pagada, Aceptada o Incobrable.', fields: ['id (ID de Factura)', 'status'] },
        { name: 'Crear o Actualizar Cliente', description: 'POST /api/v1/clients - Registra automáticamente un cliente o prospecto.', fields: ['name', 'email', 'phone', 'status', 'tags', 'notes'] },
        { name: 'Agregar Ítem al Catálogo', description: 'POST /api/v1/catalog - Agrega o actualiza un servicio.', fields: ['Nombre del Producto/Servicio', 'Precio', 'Impuesto (%)'] }
      ]
    },
    process: {
      triggers: [
        { name: 'Nueva Tarea / Tarjeta', description: 'Se dispara cuando se crea una tarjeta en cualquier tablero.' },
        { name: 'Estado de Tarea Cambiado', description: 'Se dispara cuando una tarjeta se mueve de columna (ej: a Completado).' }
      ],
      actions: [
        { name: 'Crear Tarjeta / Tarea', description: 'Crea una tarjeta en un tablero y columna específica.', fields: ['ID Tablero', 'Nombre de Columna', 'Título Tarea', 'Descripción'] },
        { name: 'Mover Tarjeta', description: 'Desplaza una tarjeta existente a otra columna.', fields: ['ID Tarjeta', 'Columna Destino'] },
        { name: 'Asignar Miembro', description: 'Asigna la tarea a un usuario del equipo.', fields: ['ID Tarjeta', 'Email Asignado'] }
      ]
    },
    reactivaleads: {
      triggers: [
        { name: 'Nuevo Lead Registrado', description: 'Se dispara al capturar un lead desde algún formulario/embudo.' },
        { name: 'Lead Calificado', description: 'Se dispara cuando un lead alcanza un score de calificación mínimo.' }
      ],
      actions: [
        { name: 'Crear o Importar Lead', description: 'Inserta un nuevo prospecto en la base de datos central.', fields: ['Nombre Lead', 'Email', 'Teléfono', 'Origen/Campaña'] },
        { name: 'Asignar Agente', description: 'Asigna el prospecto a un asesor de ventas.', fields: ['ID Lead', 'Email Agente'] }
      ]
    },
    kredit: {
      triggers: [
        { name: 'Nueva Solicitud de Crédito', description: 'Se dispara cuando un cliente solicita financiación.' },
        { name: 'Evaluación de Riesgo Completada', description: 'Se dispara al terminar el análisis de score crediticio.' }
      ],
      actions: [
        { name: 'Iniciar Análisis de Riesgo', description: 'Dispara el motor de evaluación para un cliente.', fields: ['ID Cliente', 'Monto Solicitado', 'Plazo (Meses)'] },
        { name: 'Aprobar Pre-Crédito', description: 'Pre-aprueba la solicitud de crédito del cliente.', fields: ['ID Solicitud', 'Límite Sugerido'] }
      ]
    },
    mailing: {
      triggers: [
        { name: 'Nuevo Suscriptor', description: 'Se dispara cuando alguien se une a una lista de correos.' },
        { name: 'Enlace de Correo Abierto / Clicked', description: 'Se dispara cuando un destinatario interactúa con un enlace.' }
      ],
      actions: [
        { name: 'Enviar Correo Transaccional', description: 'Envía un email directo usando una plantilla.', fields: ['Email Destinatario', 'Plantilla ID', 'Variables JSON (Estructura)'] },
        { name: 'Añadir a Lista de Envío', description: 'Suscribe a un usuario a una campaña o newsletter.', fields: ['Email', 'Nombre', 'ID Lista'] }
      ]
    }
  };

  const currentConfig = appConfigs[app.code] || { triggers: [], actions: [] };

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

  const handleAddAutomation = (e: React.FormEvent) => {
    e.preventDefault();
    let newAuto: SavedAutomation;

    if (activeTab === 'triggers') {
      const trigger = currentConfig.triggers[selectedTriggerIdx];
      newAuto = {
        id: `auto-${Date.now()}`,
        type: 'trigger',
        name: trigger.name,
        details: 'Disparador registrado: Webhook activo listo para lectura.',
        isActive: true
      };
    } else {
      const action = currentConfig.actions[selectedActionIdx];
      const filledDetails = Object.entries(fieldInputs)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      
      newAuto = {
        id: `auto-${Date.now()}`,
        type: 'action',
        name: action.name,
        details: filledDetails ? `Parámetros: ${filledDetails}` : 'Acción registrada para ejecución en lote.',
        isActive: true
      };
    }

    setAutomations([...automations, newAuto]);
    setFieldInputs({});
    alert('¡Automatización creada con éxito!');
  };

  const handleDeleteAutomation = (id: string) => {
    setAutomations(automations.filter(item => item.id !== id));
  };

  const toggleAutomationActive = (id: string) => {
    setAutomations(automations.map(item => 
      item.id === id ? { ...item, isActive: !item.isActive } : item
    ));
  };

  const isConnectionVerified = serviceKey && (testStatus === 'success' || isActive);

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
            {inputKey && testStatus !== 'success' && (
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
            maxWidth: '650px',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
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
                    Automatizar con {app.name}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                    Configura disparadores de lectura y acciones de escritura automáticos
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
              {/* Tab Selector */}
              <div style={{
                display: 'flex',
                background: '#f1f5f9',
                padding: '0.25rem',
                borderRadius: '8px',
                gap: '0.25rem'
              }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('triggers')}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: activeTab === 'triggers' ? '#ffffff' : 'transparent',
                    color: activeTab === 'triggers' ? app.color : '#64748b',
                    boxShadow: activeTab === 'triggers' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  ⚡ Lectura / Triggers
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('actions')}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: activeTab === 'actions' ? '#ffffff' : 'transparent',
                    color: activeTab === 'actions' ? app.color : '#64748b',
                    boxShadow: activeTab === 'actions' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  ✍️ Escritura / Acciones
                </button>
              </div>

              {/* Form Configurator */}
              <form onSubmit={handleAddAutomation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group-full">
                  <label style={{ color: '#0f172a', fontWeight: 600 }}>
                    {activeTab === 'triggers' ? 'Seleccionar Disparador (Cuando pase esto):' : 'Seleccionar Acción (Hacer esto automáticamente):'}
                  </label>
                  <select
                    value={activeTab === 'triggers' ? selectedTriggerIdx : selectedActionIdx}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (activeTab === 'triggers') {
                        setSelectedTriggerIdx(val);
                      } else {
                        setSelectedActionIdx(val);
                      }
                      setFieldInputs({});
                    }}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      marginTop: '0.4rem',
                      outline: 'none',
                      fontSize: '0.85rem'
                    }}
                  >
                    {activeTab === 'triggers' 
                      ? currentConfig.triggers.map((item, idx) => (
                          <option key={idx} value={idx}>{item.name}</option>
                        ))
                      : currentConfig.actions.map((item, idx) => (
                          <option key={idx} value={idx}>{item.name}</option>
                        ))
                    }
                  </select>
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                    {activeTab === 'triggers'
                      ? currentConfig.triggers[selectedTriggerIdx]?.description
                      : currentConfig.actions[selectedActionIdx]?.description
                    }
                  </p>
                </div>

                {/* Dynamic Parameter Fields */}
                {activeTab === 'actions' && currentConfig.actions[selectedActionIdx]?.fields.length > 0 && (
                  <div style={{
                    background: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <strong style={{ fontSize: '0.8rem', color: '#334155' }}>Campos a mapear en {app.name}:</strong>
                    {currentConfig.actions[selectedActionIdx].fields.map((field) => (
                      <div key={field} className="input-group-full" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{field}</span>
                        <input
                          type="text"
                          required
                          value={fieldInputs[field] || ''}
                          onChange={(e) => setFieldInputs({ ...fieldInputs, [field]: e.target.value })}
                          placeholder={`Ingresa o vincula un campo para ${field}`}
                          style={{
                            padding: '0.5rem',
                            fontSize: '0.8rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    background: app.color,
                    color: 'white',
                    border: 'none',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    alignSelf: 'flex-start'
                  }}
                >
                  {activeTab === 'triggers' ? '+ Activar Webhook Disparador' : '+ Crear Nueva Acción'}
                </button>
              </form>

              {/* Active Rules List */}
              <div style={{
                marginTop: '0.5rem',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '1rem'
              }}>
                <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>
                  Flujos de Automatización Activos ({automations.length})
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {automations.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                      No tienes reglas activas todavía.
                    </div>
                  ) : (
                    automations.map((item) => (
                      <div key={item.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              background: item.type === 'trigger' ? '#eff6ff' : '#ecfdf5',
                              color: item.type === 'trigger' ? '#1e40af' : '#065f46'
                            }}>
                              {item.type === 'trigger' ? 'LECTURA' : 'ESCRITURA'}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>
                              {item.name}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {item.details}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => toggleAutomationActive(item.id)}
                            className={`switch-toggle ${item.isActive ? 'active' : ''}`}
                            style={{ transform: 'scale(0.8)' }}
                          >
                            <div className="switch-handle"></div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAutomation(item.id)}
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
                    ))
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
