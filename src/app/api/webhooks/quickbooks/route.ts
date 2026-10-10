import { NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  getEntity,
  mapEntityToTriggerData,
  QBO_PROVIDER,
  getInternalWebhookSecret,
} from '@/lib/quickbooks';
import { POST as runAutomationTrigger } from '@/app/api/v1/automations/trigger/route';

/**
 * Webhook de QuickBooks Online (Intuit) — conexión de TERCERO.
 *
 * Intuit exige responder 200 en < 3s, por eso validamos la firma, respondemos de inmediato
 * y procesamos los eventos después con `after()`. Los payloads solo traen el ID de la entidad,
 * así que se consulta la entidad completa vía API antes de disparar las automatizaciones.
 *
 * Configurar en Intuit Developer → Webhooks:
 *   URL: https://<tu-dominio>/api/webhooks/quickbooks
 *   Entidades: Customer, Invoice, Payment, Estimate (operación Create)
 */
const SUPPORTED: Record<string, string[]> = {
  Customer: ['Create'],
  Invoice: ['Create'],
  Payment: ['Create'],
  Estimate: ['Create'],
};

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('intuit-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const events = parseWebhookPayload(payload).filter(e => SUPPORTED[e.entity]?.includes(e.operation));

  after(async () => {
    for (const ev of events) {
      try {
        const connections = await prisma.thirdPartyConnection.findMany({
          where: { provider: QBO_PROVIDER, externalAccountId: ev.realmId, status: 'CONNECTED' },
        });

        for (const conn of connections) {
          try {
            const entity = await getEntity(conn.userId, ev.entity, ev.entityId);
            if (!entity) continue;
            const mapped = mapEntityToTriggerData(ev.entity, entity, conn.environment);
            if (!mapped) continue;

            await runAutomationTrigger(
              new Request('http://internal/api/v1/automations/trigger', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-source-app': QBO_PROVIDER,
                  'x-konsul-internal': getInternalWebhookSecret(),
                  'x-konsul-trace-id': `qbo_${ev.realmId}_${ev.entity}_${ev.entityId}`,
                },
                body: JSON.stringify({
                  appCode: QBO_PROVIDER,
                  triggerName: mapped.triggerName,
                  userId: conn.userId,
                  data: mapped.data,
                }),
              })
            );
          } catch (err) {
            console.error(`[QuickBooks Webhook] Error procesando ${ev.entity}#${ev.entityId} para usuario ${conn.userId}:`, err);
          }
        }
      } catch (err) {
        console.error('[QuickBooks Webhook] Error general:', err);
      }
    }
  });

  return NextResponse.json({ received: true, events: events.length });
}
