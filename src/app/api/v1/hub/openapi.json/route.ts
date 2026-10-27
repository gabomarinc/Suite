import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin || 'https://suite.konsul.digital';

  const openApiDoc = {
    openapi: "3.1.0",
    info: {
      title: "Kônsul Suite API Gateway — Hub LeadsHUB",
      description: "API unificada para que agentes de IA externos (como GrokBot) consulten e interactúen con Kônsul LeadsHUB mediante una sola API Key de Suite.",
      version: "1.0.0"
    },
    servers: [
      {
        url: origin,
        description: "Servidor Kônsul Suite"
      }
    ],
    security: [
      {
        ApiKeyAuth: []
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "API Key de Kônsul Suite (comienza con ks_live_)"
        }
      }
    },
    paths: {
      "/api/v1/hub/leadshub/contacts": {
        get: {
          operationId: "searchContacts",
          summary: "Buscar y listar contactos / leads en LeadsHUB",
          description: "Consulta los contactos del CRM. Permite filtrar por nombre, email, teléfono o estado de embudo.",
          parameters: [
            {
              name: "search",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Texto a buscar en nombre, email o teléfono"
            },
            {
              name: "status",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Filtrar por estado de embudo (ej: Nuevo, Calificado, Ganado)"
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", default: 20 },
              description: "Cantidad máxima de resultados"
            }
          ],
          responses: {
            "200": {
              description: "Lista de contactos encontrados",
              content: {
                "application/json": {}
              }
            }
          }
        },
        post: {
          operationId: "createOrUpdateContact",
          summary: "Crear o actualizar un lead en LeadsHUB",
          description: "Registra un nuevo contacto en el CRM o actualiza sus notas y estado.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", description: "Nombre completo del lead" },
                    phone: { type: "string", description: "Número de teléfono / WhatsApp (con código de país, ej: +507...)" },
                    email: { type: "string", description: "Correo electrónico del contacto" },
                    company: { type: "string", description: "Nombre de la empresa" },
                    prospectStatus: { type: "string", description: "Estado en el embudo (ej: Calificado)" },
                    notes: { type: "string", description: "Notas adicionales o resumen de conversación" },
                    tags: { type: "array", items: { type: "string" }, description: "Etiquetas asociadas" }
                  }
                }
              }
            }
          },
          responses: {
            "200": { description: "Lead guardado exitosamente" }
          }
        }
      },
      "/api/v1/hub/leadshub/calendar/events": {
        get: {
          operationId: "getCalendarEvents",
          summary: "Consultar citas y reuniones agendadas",
          description: "Lista los eventos y citas programadas con leads en el calendario de LeadsHUB.",
          parameters: [
            {
              name: "date",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Fecha en formato YYYY-MM-DD"
            }
          ],
          responses: {
            "200": { description: "Citas encontradas" }
          }
        }
      },
      "/api/v1/hub/leadshub/messages/send": {
        post: {
          operationId: "sendProactiveMessage",
          summary: "Enviar mensaje de WhatsApp o canal al lead",
          description: "Envía un mensaje proactivo a través del canal conectado en LeadsHUB.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["to", "message"],
                  properties: {
                    to: { type: "string", description: "Teléfono del destinatario con código de país" },
                    message: { type: "string", description: "Texto del mensaje a enviar" },
                    mediaUrl: { type: "string", description: "URL de archivo o imagen adjunta (opcional)" }
                  }
                }
              }
            }
          },
          responses: {
            "200": { description: "Mensaje encolado / enviado" }
          }
        }
      }
    }
  };

  return NextResponse.json(openApiDoc, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    }
  });
}
