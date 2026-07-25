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
      { name: 'Nuevo Cliente o Prospecto', description: 'Se dispara al crear un nuevo cliente o prospecto.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Teléfono', 'Fecha de Creación'] },
      // New triggers from analysis
      { name: 'Factura vencida sin pago', description: 'Se dispara cuando una factura vence y su estado es Enviada o Seguimiento.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Monto Total', 'Concepto de Venta', 'Fecha de Vencimiento'] },
      { name: 'Factura marcada Incobrable', description: 'Se dispara al clasificar una factura como incobrable.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Monto Total', 'Concepto de Venta'] },
      { name: 'Factura marcada como Abonada (Pago Parcial)', description: 'Se dispara al recibir un abono parcial en una factura.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Monto Total', 'Monto Abonado', 'Concepto de Venta'] },
      { name: 'Ciclo de Factura Recurrente vencido', description: 'Se dispara antes de vencer el ciclo de una factura recurrente.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Monto Total', 'Concepto de Venta'] },
      { name: 'Cotización sin respuesta', description: 'Se dispara si una cotización no recibe respuesta tras N días.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Monto Total', 'Concepto de Venta'] },
      { name: 'Cotización Rechazada', description: 'Se dispara al rechazarse una cotización.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Monto Total', 'Concepto de Venta'] },
      { name: 'Cotización con probabilidad de cierre alta', description: 'Se dispara si la probabilidad de cierre supera el 80%.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Monto Total', 'Concepto de Venta', 'Probabilidad'] },
      { name: 'Prospecto convertido a Cliente (primer Invoice pagado)', description: 'Se dispara al pagarse la primera factura de un prospecto.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Monto Total'] },
      { name: 'Cliente alcanza VIP', description: 'Se dispara si un cliente supera $5,000 o 10 documentos.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Total Facturado', 'Cantidad Documentos'] },
      { name: 'Cliente sin actividad por X días', description: 'Se dispara si un cliente no registra actividad.', outputs: ['Nombre del Cliente', 'Email del Cliente', 'Días de Inactividad'] },
      { name: 'Vencimiento fiscal próximo', description: 'Se dispara al aproximarse un vencimiento fiscal (DGI, Renta, SIPE, etc.).', outputs: ['Impuesto', 'Monto Estimado', 'Fecha Límite'] },
      { name: 'Gasto registrado en categoría específica', description: 'Se dispara al registrar un gasto en categorías específicas.', outputs: ['Concepto de Gasto', 'Categoría', 'Monto Total'] }
    ],
    actions: [
      { name: 'Crear Factura o Cotización', description: 'POST /api/v1/invoices - Genera factura o cotización.', fields: ['Nombre del Cliente', 'Email del Cliente', 'Monto Total', 'Concepto de Venta'] },
      { name: 'Actualizar Estado de Factura', description: 'PUT /api/v1/invoices - Cambia estado de factura.', fields: ['ID de Factura', 'Nuevo Estado'] },
      { name: 'Crear o Actualizar Cliente', description: 'POST /api/v1/clients - Registra un prospecto.', fields: ['Nombre del Cliente', 'Email del Cliente', 'Teléfono', 'Notas'] },
      { name: 'Añadir etiqueta a un cliente', description: 'Segmenta clientes con etiquetas.', fields: ['Email del Cliente', 'Etiquetas'] },
      { name: 'Añadir nota interna a un cliente', description: 'Registra una nota interna en la ficha del cliente.', fields: ['Email del Cliente', 'Notas'] },
      { name: 'Enviar recordatorio de pago al cliente (vía email)', description: 'Envía correo de cobranza de factura vencida.', fields: ['ID de Factura'] }
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
