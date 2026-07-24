export interface AppConfig {
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

export const ALL_APPS: Record<string, AppConfig> = {
  bills: {
    name: 'Kônsul Bills',
    code: 'bills',
    triggers: [
      { name: 'Documento Creado (Factura/Cotización)', description: 'Se dispara al crearse una factura o cotización en Bills.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Monto Total', 'Concepto de Venta', 'Fecha de Creación'] },
      { name: 'Estado de Factura Actualizado', description: 'Se dispara cuando una factura cambia a Pagada, Aceptada o Incobrable.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Monto Total', 'Concepto de Venta', 'Nuevo Estado', 'Fecha de Creación'] },
      { name: 'Nuevo Cliente o Prospecto', description: 'Se dispara al crear un nuevo cliente o prospecto.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Teléfono', 'Fecha de Creación'] }
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

export const APP_NAMES_MAP: Record<string, string> = {
  bills: 'Kônsul Bills',
  process: 'Kônsul Process',
  reactivaleads: 'Kônsul Reactivaleads',
  kredit: 'Kônsul Kredit',
  mailing: 'Kônsul Mailing'
};
