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
      { 
        name: 'Documento Creado (Factura/Cotización)', 
        description: 'Se dispara al crearse una factura, cotización o gasto en Bills.', 
        outputs: [
          'ID de Factura / Documento',
          'Tipo de Documento',
          'Nombre del Cliente', 
          'Email del Cliente', 
          'Teléfono del Cliente',
          'RUC / Cédula del Cliente',
          'Dirección del Cliente',
          'Monto Total', 
          'Moneda',
          'Concepto de Venta', 
          'Estado de Factura',
          'Fecha de Creación',
          'Fecha de Vencimiento',
          'Notas del Documento',
          'Documento Adjunto (URL / PDF)',
          'Enlace de Factura en Bills'
        ] 
      },
      { 
        name: 'Estado de Factura Actualizado', 
        description: 'Se dispara cuando una factura cambia a Pagada, Aceptada o Incobrable.', 
        outputs: [
          'ID de Factura / Documento',
          'Tipo de Documento',
          'Nombre del Cliente', 
          'Email del Cliente', 
          'Teléfono del Cliente',
          'RUC / Cédula del Cliente',
          'Monto Total', 
          'Moneda',
          'Concepto de Venta', 
          'Nuevo Estado', 
          'Fecha de Creación',
          'Fecha de Actualización',
          'Documento Adjunto (URL / PDF)',
          'Enlace de Factura en Bills'
        ] 
      },
      { 
        name: 'Nuevo Cliente o Prospecto', 
        description: 'Se dispara al crear un nuevo cliente o prospecto.', 
        outputs: [
          'ID del Cliente',
          'Nombre del Cliente', 
          'Email del Cliente', 
          'Teléfono', 
          'RUC / Cédula',
          'Dirección',
          'Notas',
          'Fecha de Creación'
        ] 
      },
      { 
        name: 'Factura vencida sin pago', 
        description: 'Se dispara cuando una factura vence y su estado es Enviada o Seguimiento.', 
        outputs: [
          'ID de Factura / Documento',
          'Nombre del Cliente', 
          'Email del Cliente', 
          'Teléfono del Cliente',
          'Monto Total', 
          'Concepto de Venta', 
          'Fecha de Vencimiento',
          'Documento Adjunto (URL / PDF)',
          'Enlace de Factura en Bills'
        ] 
      },
      { 
        name: 'Factura marcada Incobrable', 
        description: 'Se dispara al clasificar una factura como incobrable.', 
        outputs: [
          'ID de Factura / Documento',
          'Nombre del Cliente', 
          'Email del Cliente', 
          'Monto Total', 
          'Concepto de Venta',
          'Documento Adjunto (URL / PDF)'
        ] 
      },
      { 
        name: 'Factura marcada como Abonada (Pago Parcial)', 
        description: 'Se dispara al recibir un abono parcial en una factura.', 
        outputs: [
          'ID de Factura / Documento',
          'Nombre del Cliente', 
          'Email del Cliente', 
          'Monto Total', 
          'Monto Abonado', 
          'Saldo Pendiente',
          'Concepto de Venta',
          'Documento Adjunto (URL / PDF)'
        ] 
      },
      { 
        name: 'Ciclo de Factura Recurrente vencido', 
        description: 'Se dispara antes de vencer el ciclo de una factura recurrente.', 
        outputs: [
          'ID de Factura / Documento',
          'Nombre del Cliente', 
          'Email del Cliente', 
          'Monto Total', 
          'Concepto de Venta',
          'Documento Adjunto (URL / PDF)'
        ] 
      },
      { 
        name: 'Cotización sin respuesta', 
        description: 'Se dispara si una cotización no recibe respuesta tras N días.', 
        outputs: [
          'ID de Cotización',
          'Nombre del Cliente', 
          'Email del Cliente', 
          'Monto Total', 
          'Concepto de Venta',
          'Documento Adjunto (URL / PDF)',
          'Enlace de Factura en Bills'
        ] 
      },
      { 
        name: 'Cotización Rechazada', 
        description: 'Se dispara al rechazarse una cotización.', 
        outputs: [
          'ID de Cotización',
          'Nombre del Cliente', 
          'Email del Cliente', 
          'Monto Total', 
          'Concepto de Venta',
          'Documento Adjunto (URL / PDF)'
        ] 
      },
      { 
        name: 'Cotización con probabilidad de cierre alta', 
        description: 'Se dispara si la probabilidad de cierre supera el 80%.', 
        outputs: [
          'ID de Cotización',
          'Nombre del Cliente', 
          'Email del Cliente', 
          'Monto Total', 
          'Concepto de Venta', 
          'Probabilidad',
          'Documento Adjunto (URL / PDF)',
          'Enlace de Factura en Bills'
        ] 
      },
      { 
        name: 'Prospecto convertido a Cliente (primer Invoice pagado)', 
        description: 'Se dispara al pagarse la primera factura de un prospecto.', 
        outputs: [
          'ID de Factura / Documento',
          'Nombre del Cliente', 
          'Email del Cliente', 
          'Monto Total',
          'Documento Adjunto (URL / PDF)'
        ] 
      },
      { 
        name: 'Cliente alcanza VIP', 
        description: 'Se dispara si un cliente supera $5,000 o 10 documentos.', 
        outputs: [
          'ID del Cliente',
          'Nombre del Cliente', 
          'Email del Cliente', 
          'Total Facturado', 
          'Cantidad Documentos'
        ] 
      },
      { 
        name: 'Vencimiento fiscal próximo', 
        description: 'Se dispara al aproximarse un vencimiento fiscal (DGI, Renta, SIPE, etc.).', 
        outputs: [
          'Impuesto', 
          'Monto Estimado', 
          'Fecha Límite'
        ] 
      },
      { 
        name: 'Gasto registrado en categoría específica', 
        description: 'Se dispara al registrar un gasto en categorías específicas.', 
        outputs: [
          'ID de Gasto',
          'Concepto de Gasto', 
          'Categoría', 
          'Monto Total',
          'Documento Adjunto (URL / PDF)'
        ] 
      }
    ],
    actions: [
      { 
        name: 'Crear Factura o Cotización', 
        description: 'POST /api/v1/invoices - Genera factura o cotización.', 
        fields: ['Nombre del Cliente', 'Email del Cliente', 'Monto Total', 'Concepto de Venta', 'Notas'] 
      },
      { 
        name: 'Actualizar Estado de Factura', 
        description: 'PUT /api/v1/invoices - Cambia estado de factura.', 
        fields: ['ID de Factura', 'Nuevo Estado'] 
      },
      { 
        name: 'Crear o Actualizar Cliente', 
        description: 'POST /api/v1/clients - Registra un prospecto.', 
        fields: ['Nombre del Cliente', 'Email del Cliente', 'Teléfono', 'RUC / Cédula', 'Notas'] 
      },
      { 
        name: 'Añadir etiqueta a un cliente', 
        description: 'Segmenta clientes con etiquetas.', 
        fields: ['Email del Cliente', 'Etiquetas'] 
      },
      { 
        name: 'Añadir nota interna a un cliente', 
        description: 'Registra una nota interna en la ficha del cliente.', 
        fields: ['Email del Cliente', 'Notas'] 
      },
      { 
        name: 'Enviar recordatorio de pago al cliente (vía email)', 
        description: 'Envía correo de cobranza de factura vencida.', 
        fields: ['ID de Factura'] 
      }
    ]
  },
  process: {
    name: 'Kônsul Process',
    code: 'process',
    triggers: [
      { 
        name: 'Nueva Tarea / Tarjeta', 
        description: 'Se dispara al crear una tarjeta en un tablero.', 
        outputs: [
          'ID de Tarea',
          'Título de Tarea', 
          'Descripción', 
          'Tablero',
          'Columna Actual',
          'Miembro Asignado',
          'Email de Miembro',
          'Documento Adjunto (URL)',
          'Fecha Límite'
        ] 
      },
      { 
        name: 'Estado de Tarea Cambiado', 
        description: 'Se dispara al mover una tarjeta de columna.', 
        outputs: [
          'ID de Tarea',
          'Título de Tarea', 
          'Columna Actual',
          'Columna Anterior',
          'Documento Adjunto (URL)'
        ] 
      }
    ],
    actions: [
      { 
        name: 'Crear Tarjeta / Tarea', 
        description: 'Crea una tarea en un tablero y columna específica.', 
        fields: [
          'Título de Tarea', 
          'Descripción', 
          'Documento Adjunto (URL)',
          'Email de Miembro',
          'Fecha Límite'
        ] 
      },
      { 
        name: 'Mover Tarjeta', 
        description: 'Desplaza una tarjeta a otra columna.', 
        fields: ['ID de Tarea', 'Columna Destino'] 
      },
      { 
        name: 'Asignar Miembro', 
        description: 'Asigna una tarea a un correo de miembro.', 
        fields: ['ID de Tarea', 'Email de Miembro'] 
      }
    ]
  },
  reactivaleads: {
    name: 'Kônsul LeadsHUB',
    code: 'reactivaleads',
    triggers: [
      { 
        name: 'Nuevo Lead Registrado (Chat / Form)', 
        description: 'Se dispara al capturar un nuevo prospecto o contacto desde WhatsApp, formulario o chat web.', 
        outputs: [
          'ID del Lead',
          'Nombre del Lead', 
          'Email del Lead', 
          'Teléfono del Lead',
          'Origen / Canal',
          'Estado de Embudo',
          'Puntaje de Scoring',
          'Etiquetas del Lead',
          'Resumen de IA',
          'Notas / Mensaje',
          'Fecha de Registro'
        ] 
      },
      { 
        name: 'Estado de Prospecto Cambiado (Embudo Kanban)', 
        description: 'Se dispara cuando un prospecto se mueve a una nueva columna del embudo comercial (ej. Calificado, Cotización, Ganado).', 
        outputs: [
          'ID del Lead',
          'Nombre del Lead', 
          'Email del Lead', 
          'Teléfono del Lead',
          'Nuevo Estado de Embudo',
          'Estado Anterior',
          'Puntaje de Scoring',
          'Asesor Asignado',
          'Resumen de IA',
          'Fecha de Actualización'
        ] 
      },
      { 
        name: 'Cita o Reunión Agendada', 
        description: 'Se dispara cuando el agente de IA o un asesor agenda una cita en el calendario.', 
        outputs: [
          'ID de Cita',
          'Título de Cita',
          'Nombre del Lead',
          'Email del Lead',
          'Teléfono del Lead',
          'Fecha y Hora de Inicio',
          'Fecha y Hora de Fin',
          'Enlace de Reunión / Ubicación',
          'Categoría de Cita'
        ] 
      },
      { 
        name: 'Conversación Transferida a Humano (Handoff)', 
        description: 'Se dispara cuando el agente de IA transfiere la conversación a un asesor humano o el cliente solicita ayuda.', 
        outputs: [
          'ID de Conversación',
          'Nombre del Lead',
          'Email del Lead',
          'Teléfono del Lead',
          'Canal (WhatsApp / Instagram / Web)',
          'Motivo de Transferencia',
          'Asesor Asignado',
          'Último Mensaje del Cliente'
        ] 
      },
      { 
        name: 'Intención Comercial Detectada por IA', 
        description: 'Se dispara cuando el agente clasifica que el lead tiene alta intención de compra o solicita cotización.', 
        outputs: [
          'ID del Lead',
          'Nombre del Lead',
          'Email del Lead',
          'Teléfono del Lead',
          'Servicio o Producto de Interés',
          'Presupuesto Mencionado',
          'Nivel de Urgencia',
          'Resumen de Necesidad'
        ] 
      }
    ],
    actions: [
      { 
        name: 'Crear o Actualizar Lead en CRM', 
        description: 'Inserta o sincroniza los datos de un prospecto en el CRM central de LeadsHUB.', 
        fields: ['Nombre del Lead', 'Email del Lead', 'Teléfono del Lead', 'Estado de Embudo', 'Etiquetas (separadas por coma)', 'Notas / Historial', 'Puntaje de Scoring'] 
      },
      { 
        name: 'Enviar Mensaje Proactivo (WhatsApp / Canal)', 
        description: 'Envía un mensaje personalizado al cliente por WhatsApp o su canal activo mediante el agente de IA.', 
        fields: ['Teléfono del Lead', 'Mensaje a Enviar', 'Documento Adjunto (URL / PDF)', 'Nombre del Lead'] 
      },
      { 
        name: 'Mover Lead de Estado de Embudo', 
        description: 'Actualiza la etapa o columna del pipeline Kanban para el prospecto.', 
        fields: ['Teléfono o Email del Lead', 'Nuevo Estado de Embudo', 'Nota de Cambio de Estado'] 
      },
      { 
        name: 'Añadir Etiquetas a Lead', 
        description: 'Asigna etiquetas de segmentación al contacto en el CRM (ej. Facturado, VIP).', 
        fields: ['Teléfono o Email del Lead', 'Etiquetas a Añadir'] 
      },
      { 
        name: 'Agendar Cita en Calendario', 
        description: 'Crea un evento o reunión agendada vinculada al contacto y al agente.', 
        fields: ['Teléfono o Email del Lead', 'Título de Cita', 'Fecha y Hora de Inicio', 'Duración en Minutos', 'Enlace de Reunión / Ubicación'] 
      },
      { 
        name: 'Registrar Nota en Bitácora del Lead', 
        description: 'Agrega una nota en la línea de tiempo de actividades del contacto en LeadsHUB.', 
        fields: ['Teléfono o Email del Lead', 'Contenido de la Nota / Actividad'] 
      },
      { 
        name: 'Asignar Asesor a Conversación', 
        description: 'Asigna el contacto y su chat a un asesor humano específico del equipo.', 
        fields: ['Teléfono o Email del Lead', 'Email o Nombre del Asesor'] 
      }
    ]
  },
  kredit: {
    name: 'Kônsul Kredit',
    code: 'kredit',
    triggers: [
      { 
        name: 'Nueva Solicitud de Crédito', 
        description: 'Se dispara cuando un cliente solicita financiación.', 
        outputs: [
          'ID de Solicitud',
          'Nombre del Cliente', 
          'Email del Cliente',
          'Teléfono del Cliente',
          'RUC / Cédula',
          'Monto Solicitado', 
          'Plazo en Meses',
          'Fecha de Solicitud'
        ] 
      },
      { 
        name: 'Evaluación de Riesgo Completada', 
        description: 'Se dispara al terminar el análisis crediticio.', 
        outputs: [
          'ID de Solicitud',
          'Nombre del Cliente', 
          'Email del Cliente',
          'Puntaje de Riesgo', 
          'Monto Aprobado',
          'Reporte / Dictamen Crediticio (URL)',
          'Estado de Evaluación'
        ] 
      }
    ],
    actions: [
      { 
        name: 'Iniciar Análisis de Riesgo', 
        description: 'Dispara el motor de evaluación para un cliente.', 
        fields: ['Nombre del Cliente', 'Email del Cliente', 'Teléfono', 'Monto Solicitado'] 
      },
      { 
        name: 'Aprobar Pre-Crédito', 
        description: 'Pre-aprueba la solicitud de crédito del cliente.', 
        fields: ['ID de Solicitud', 'Monto Aprobado'] 
      }
    ]
  },
  mailing: {
    name: 'Kônsul Mailing',
    code: 'mailing',
    triggers: [
      { 
        name: 'Nuevo Suscriptor', 
        description: 'Se dispara al unirse a una lista de correos.', 
        outputs: [
          'ID del Suscriptor',
          'Email del Suscriptor', 
          'Nombre del Suscriptor',
          'Lista / Segmento',
          'Fecha de Registro'
        ] 
      },
      { 
        name: 'Enlace de Correo Abierto / Clicked', 
        description: 'Se dispara cuando interactúan con un enlace.', 
        outputs: [
          'Email del Suscriptor', 
          'Nombre del Suscriptor',
          'Nombre de Campaña',
          'Enlace Abierto (URL)',
          'Fecha de Clic'
        ] 
      }
    ],
    actions: [
      { 
        name: 'Enviar Correo Transaccional', 
        description: 'Envía un email directo usando una plantilla.', 
        fields: ['Email Destinatario', 'Asunto del Correo', 'Cuerpo del Correo', 'Documento Adjunto (URL)'] 
      },
      { 
        name: 'Añadir a Lista de Envío', 
        description: 'Suscribe a un usuario a una campaña o newsletter.', 
        fields: ['Email del Suscriptor', 'Nombre del Suscriptor', 'Lista'] 
      }
    ]
  }
};

// Aliasing leadshub to reactivaleads for complete backwards/forwards compatibility
ALL_APPS.leadshub = {
  ...ALL_APPS.reactivaleads,
  code: 'leadshub',
  name: 'Kônsul LeadsHUB'
};

export const APP_NAMES_MAP: Record<string, string> = {
  bills: 'Kônsul Bills',
  process: 'Kônsul Process',
  leadshub: 'Kônsul LeadsHUB',
  reactivaleads: 'Kônsul LeadsHUB',
  kredit: 'Kônsul Kredit',
  mailing: 'Kônsul Mailing'
};

