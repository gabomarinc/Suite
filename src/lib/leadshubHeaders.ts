/**
 * Helper estándar para estructurar encabezados HTTP en todas las llamadas de Kônsul Suite a la API de LeadsHub.
 * Cumple con la especificación de identificación de origen de LeadsHub.
 */

export interface LeadsHubOriginOptions {
  /** Qué parte de la Suite hace la llamada: automation, ai-agent, manual, sync */
  source: 'automation' | 'ai-agent' | 'manual' | 'sync';
  /** Id de la automatización, regla, flujo o agente */
  sourceId?: string | null;
  /** Nombre legible de la automatización o acción */
  sourceName?: string | null;
  /** Correo de la persona que lo disparó (si fue una persona). Vacío si fue automático. */
  actorEmail?: string | null;
  /** Un id único por operación, el mismo guardado en logs para cruzar sistemas */
  requestId?: string | null;
}

export const KONSUL_SUITE_USER_AGENT = 'KonsulSuite/1.4.0';

/**
 * Codifica valores para encabezados HTTP evitando errores por caracteres no-ASCII (tildes, eñes, etc.)
 */
function encodeSafeHeaderValue(val: string): string {
  const trimmed = val.trim();
  // Si contiene únicamente caracteres ASCII imprimibles (32 a 126), enviarlo directo
  if (/^[\x20-\x7E]*$/.test(trimmed)) {
    return trimmed;
  }
  // Si contiene acentos, eñes o caracteres especiales, codificar en UTF-8 seguro
  return encodeURIComponent(trimmed);
}

/**
 * Construye el objeto final de encabezados para llamadas a LeadsHub.
 */
export function buildLeadsHubHeaders(
  baseHeaders: Record<string, string | undefined | null> = {},
  origin?: LeadsHubOriginOptions
): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': KONSUL_SUITE_USER_AGENT
  };

  // Copiar baseHeaders limpios
  for (const [key, value] of Object.entries(baseHeaders)) {
    if (value !== undefined && value !== null && value !== '') {
      headers[key] = value;
    }
  }

  // Encabezados de trazabilidad e identificación de origen
  if (origin?.source) {
    headers['X-Konsul-Source'] = origin.source;
  }

  if (origin?.sourceId) {
    headers['X-Konsul-Source-Id'] = origin.sourceId.trim();
  }

  if (origin?.sourceName) {
    headers['X-Konsul-Source-Name'] = encodeSafeHeaderValue(origin.sourceName);
  }

  // Correo de la persona física que disparó la acción (vacío/omitido si fue automático)
  if (origin?.actorEmail && origin.actorEmail.trim() !== '') {
    headers['X-Konsul-Actor-Email'] = origin.actorEmail.trim();
  }

  // ID único de operación para cruzar logs entre Suite y LeadsHub
  if (origin?.requestId) {
    headers['X-Request-Id'] = origin.requestId.trim();
  }

  return headers;
}
