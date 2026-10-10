/**
 * QuickBooks Online (Intuit) — Conexión de TERCERO.
 *
 * Este módulo es solo de servidor. Implementa:
 *  - Flujo OAuth 2.0 de Intuit (authorize → callback → tokens).
 *  - Almacenamiento cifrado (AES-256-GCM) de access/refresh tokens.
 *  - Refresco automático del access token (dura 1h). Intuit ROTA el refresh token
 *    en cada refresco, por lo que siempre se persiste el nuevo valor.
 *  - Helpers de la Accounting API v3 (Customer, Invoice, Estimate, Payment, Account, Item).
 *
 * Docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account
 *
 * Variables de entorno:
 *  QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET   (Intuit Developer → Keys & credentials)
 *  QUICKBOOKS_REDIRECT_URI                          (ej. https://suite.konsul.digital/api/integrations/quickbooks/callback)
 *  QUICKBOOKS_ENVIRONMENT                           ("sandbox" | "production", default "production")
 *  QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN                (Intuit Developer → Webhooks)
 *  QUICKBOOKS_TOKEN_ENCRYPTION_KEY                  (secreto largo aleatorio para cifrar tokens)
 */
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export const QBO_PROVIDER = 'quickbooks';
export const QBO_VENDOR = 'Intuit Inc.';
export const QBO_MINOR_VERSION = '75';

const AUTHORIZE_URL = 'https://appcenter.intuit.com/connect/oauth2';
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const REVOKE_URL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';
const SCOPES = 'com.intuit.quickbooks.accounting';

export type QboEnvironment = 'sandbox' | 'production';

export function getQboConfig() {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID || '';
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || '';
  const environment: QboEnvironment =
    (process.env.QUICKBOOKS_ENVIRONMENT || 'production').toLowerCase() === 'sandbox' ? 'sandbox' : 'production';
  const siteUrl = process.env.KINDE_SITE_URL || 'http://localhost:3000';
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || `${siteUrl.replace(/\/$/, '')}/api/integrations/quickbooks/callback`;
  return {
    clientId,
    clientSecret,
    environment,
    redirectUri,
    isConfigured: !!(clientId && clientSecret),
  };
}

export function getApiBaseUrl(environment: string) {
  return environment === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';
}

/* ------------------------------------------------------------------ */
/* Cifrado de tokens                                                    */
/* ------------------------------------------------------------------ */

function getEncryptionKey() {
  const secret = process.env.QUICKBOOKS_TOKEN_ENCRYPTION_KEY || process.env.KINDE_CLIENT_SECRET || 'konsul-dev-only-key';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptToken(value: string): string {
  if (!value.startsWith('enc:v1:')) return value;
  const [, , ivB64, tagB64, dataB64] = value.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

/* ------------------------------------------------------------------ */
/* OAuth 2.0                                                            */
/* ------------------------------------------------------------------ */

export function buildAuthorizeUrl(state: string) {
  const { clientId, redirectUri } = getQboConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

function basicAuthHeader() {
  const { clientId, clientSecret } = getQboConfig();
  return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // segundos (3600)
  x_refresh_token_expires_in: number; // segundos (~100 días)
  token_type: string;
}

async function requestTokens(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(body).toString(),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Intuit OAuth error (${res.status}): ${json.error_description || json.error || 'respuesta inválida'}`);
  }
  return json as TokenResponse;
}

export async function exchangeCodeForTokens(code: string) {
  const { redirectUri } = getQboConfig();
  return requestTokens({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
}

export async function revokeToken(token: string) {
  try {
    await fetch(REVOKE_URL, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });
  } catch (e) {
    console.warn('[QuickBooks] No se pudo revocar el token en Intuit:', e);
  }
}

/** Guarda (o reemplaza) la conexión de QuickBooks del usuario y marca la integración como activa. */
export async function saveConnection(params: {
  userId: string;
  realmId: string;
  tokens: TokenResponse;
  environment: string;
  companyName?: string | null;
}) {
  const now = Date.now();
  const data = {
    externalAccountId: params.realmId,
    environment: params.environment,
    companyName: params.companyName || null,
    accessToken: encryptToken(params.tokens.access_token),
    refreshToken: encryptToken(params.tokens.refresh_token),
    accessTokenExpiresAt: new Date(now + params.tokens.expires_in * 1000),
    refreshTokenExpiresAt: params.tokens.x_refresh_token_expires_in
      ? new Date(now + params.tokens.x_refresh_token_expires_in * 1000)
      : null,
    scopes: SCOPES,
    status: 'CONNECTED',
    lastError: null,
    lastSyncedAt: new Date(),
  };

  await prisma.thirdPartyConnection.upsert({
    where: { userId_provider: { userId: params.userId, provider: QBO_PROVIDER } },
    create: { userId: params.userId, provider: QBO_PROVIDER, ...data },
    update: data,
  });

  // Registro espejo en Integration para que el motor de automatizaciones y la UI lo traten como conectado.
  await prisma.integration.upsert({
    where: { userId_appCode: { userId: params.userId, appCode: QBO_PROVIDER } },
    create: { userId: params.userId, appCode: QBO_PROVIDER, serviceKey: `qbo_realm_${params.realmId}`, isActive: true },
    update: { serviceKey: `qbo_realm_${params.realmId}`, isActive: true },
  });
}

export async function getConnection(userId: string) {
  return prisma.thirdPartyConnection.findUnique({
    where: { userId_provider: { userId, provider: QBO_PROVIDER } },
  });
}

export async function deleteConnection(userId: string) {
  const conn = await getConnection(userId);
  if (conn) {
    try {
      await revokeToken(decryptToken(conn.refreshToken));
    } catch {}
    await prisma.thirdPartyConnection.delete({ where: { id: conn.id } });
  }
  await prisma.integration.upsert({
    where: { userId_appCode: { userId, appCode: QBO_PROVIDER } },
    create: { userId, appCode: QBO_PROVIDER, serviceKey: null, isActive: false },
    update: { serviceKey: null, isActive: false },
  });
}

/**
 * Devuelve un access token válido, refrescándolo si vence en menos de 5 minutos.
 * Lanza error si la conexión no existe o el refresh token caducó/revocado.
 */
export async function getValidAccessToken(userId: string) {
  const conn = await getConnection(userId);
  if (!conn) throw new Error('QuickBooks no está conectado para este usuario.');
  if (conn.status === 'REVOKED') throw new Error('La conexión con QuickBooks fue revocada. Vuelve a conectar tu cuenta.');

  const margin = 5 * 60 * 1000;
  if (conn.accessTokenExpiresAt.getTime() - margin > Date.now()) {
    return { accessToken: decryptToken(conn.accessToken), conn };
  }

  try {
    const tokens = await requestTokens({ grant_type: 'refresh_token', refresh_token: decryptToken(conn.refreshToken) });
    const now = Date.now();
    const updated = await prisma.thirdPartyConnection.update({
      where: { id: conn.id },
      data: {
        accessToken: encryptToken(tokens.access_token),
        refreshToken: encryptToken(tokens.refresh_token),
        accessTokenExpiresAt: new Date(now + tokens.expires_in * 1000),
        refreshTokenExpiresAt: tokens.x_refresh_token_expires_in
          ? new Date(now + tokens.x_refresh_token_expires_in * 1000)
          : conn.refreshTokenExpiresAt,
        status: 'CONNECTED',
        lastError: null,
      },
    });
    return { accessToken: tokens.access_token, conn: updated };
  } catch (err: any) {
    await prisma.thirdPartyConnection.update({
      where: { id: conn.id },
      data: { status: 'EXPIRED', lastError: err.message?.slice(0, 500) || 'Error al refrescar token' },
    });
    throw new Error('La sesión con QuickBooks expiró. Vuelve a conectar tu cuenta desde Conexiones de Terceros.');
  }
}

/* ------------------------------------------------------------------ */
/* Accounting API                                                       */
/* ------------------------------------------------------------------ */

export class QboApiError extends Error {
  status: number;
  details: any;
  constructor(message: string, status: number, details: any) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function extractFault(json: any): string {
  const err = json?.Fault?.Error?.[0];
  if (err) return [err.Message, err.Detail].filter(Boolean).join(' — ');
  return json?.message || json?.error || 'Error desconocido de QuickBooks';
}

/** Llamada autenticada a la Accounting API v3 de la compañía conectada. */
export async function qboRequest<T = any>(
  userId: string,
  method: 'GET' | 'POST',
  path: string,
  body?: any,
  extraParams?: Record<string, string>
): Promise<T> {
  const { accessToken, conn } = await getValidAccessToken(userId);
  const params = new URLSearchParams({ minorversion: QBO_MINOR_VERSION, ...(extraParams || {}) });
  const url = `${getApiBaseUrl(conn.environment)}/v3/company/${conn.externalAccountId}/${path.replace(/^\//, '')}${path.includes('?') ? '&' : '?'}${params.toString()}`;

  const doFetch = (token: string) =>
    fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });

  let res = await doFetch(accessToken);

  // Si Intuit invalida el token antes de tiempo, forzamos un refresco una sola vez.
  if (res.status === 401) {
    await prisma.thirdPartyConnection.update({ where: { id: conn.id }, data: { accessTokenExpiresAt: new Date(0) } });
    const retry = await getValidAccessToken(userId);
    res = await doFetch(retry.accessToken);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.Fault) {
    throw new QboApiError(extractFault(json), res.status, json);
  }
  prisma.thirdPartyConnection.update({ where: { id: conn.id }, data: { lastSyncedAt: new Date() } }).catch(() => {});
  return json as T;
}

/** Ejecuta una consulta SQL-like de QuickBooks (ej. "select * from Customer where ..."). */
export async function qboQuery<T = any>(userId: string, query: string): Promise<T[]> {
  const res = await qboRequest<any>(userId, 'GET', `query?query=${encodeURIComponent(query)}`);
  const qr = res?.QueryResponse || {};
  const key = Object.keys(qr).find(k => Array.isArray(qr[k]));
  return key ? (qr[key] as T[]) : [];
}

const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

export async function getCompanyInfo(userId: string) {
  const { conn } = await getValidAccessToken(userId);
  const res = await qboRequest<any>(userId, 'GET', `companyinfo/${conn.externalAccountId}`);
  return res?.CompanyInfo;
}

export async function getEntity(userId: string, entity: string, id: string) {
  const res = await qboRequest<any>(userId, 'GET', `${entity.toLowerCase()}/${id}`);
  const key = Object.keys(res || {}).find(k => k.toLowerCase() === entity.toLowerCase());
  return key ? res[key] : null;
}

/** Busca un cliente por email o nombre; si no existe lo crea. Si existe y hay datos nuevos, lo actualiza. */
export async function upsertCustomer(
  userId: string,
  input: { name: string; company?: string; email?: string; phone?: string; taxId?: string; address?: string; notes?: string }
) {
  const displayName = (input.name || input.company || input.email || 'Cliente Kônsul').trim().slice(0, 500);
  let existing: any = null;

  if (input.email) {
    const byEmail = await qboQuery(userId, `select * from Customer where PrimaryEmailAddr = '${esc(input.email)}'`).catch(() => []);
    existing = byEmail[0] || null;
  }
  if (!existing) {
    const byName = await qboQuery(userId, `select * from Customer where DisplayName = '${esc(displayName)}'`).catch(() => []);
    existing = byName[0] || null;
  }

  const payload: any = {
    DisplayName: displayName,
    ...(input.company ? { CompanyName: input.company } : {}),
    ...(input.email ? { PrimaryEmailAddr: { Address: input.email } } : {}),
    ...(input.phone ? { PrimaryPhone: { FreeFormNumber: input.phone } } : {}),
    ...(input.taxId ? { ResaleNum: input.taxId.slice(0, 15) } : {}),
    ...(input.address ? { BillAddr: { Line1: input.address.slice(0, 500) } } : {}),
    ...(input.notes ? { Notes: input.notes.slice(0, 2000) } : {}),
  };

  if (existing) {
    const res = await qboRequest<any>(userId, 'POST', 'customer', {
      ...payload,
      Id: existing.Id,
      SyncToken: existing.SyncToken,
      sparse: true,
    });
    return { customer: res.Customer, created: false };
  }
  const res = await qboRequest<any>(userId, 'POST', 'customer', payload);
  return { customer: res.Customer, created: true };
}

/** Devuelve un Item de servicio para las líneas de factura; si no hay ninguno, crea "Servicios Kônsul". */
export async function getOrCreateServiceItem(userId: string, preferredName?: string) {
  if (preferredName) {
    const byName = await qboQuery(userId, `select * from Item where Name = '${esc(preferredName)}'`).catch(() => []);
    if (byName[0]) return byName[0];
  }
  const services = await qboQuery(userId, `select * from Item where Type = 'Service' and Active = true maxresults 1`).catch(() => []);
  if (services[0]) return services[0];

  const income = await qboQuery(userId, `select * from Account where AccountType = 'Income' and Active = true maxresults 1`);
  if (!income[0]) throw new Error('No se encontró una cuenta de ingresos en QuickBooks para crear el producto/servicio.');
  const res = await qboRequest<any>(userId, 'POST', 'item', {
    Name: 'Servicios Kônsul',
    Type: 'Service',
    IncomeAccountRef: { value: income[0].Id },
  });
  return res.Item;
}

function buildSalesLine(amount: number, description: string, itemId: string) {
  return {
    DetailType: 'SalesItemLineDetail',
    Amount: Number(amount.toFixed(2)),
    Description: description.slice(0, 4000),
    SalesItemLineDetail: { ItemRef: { value: itemId }, Qty: 1, UnitPrice: Number(amount.toFixed(2)) },
  };
}

export async function createInvoice(
  userId: string,
  input: { customerName: string; company?: string; email?: string; amount: number; concept?: string; dueDate?: string; docNumber?: string; itemName?: string; memo?: string }
) {
  if (!input.amount || isNaN(input.amount) || input.amount <= 0) throw new Error('El monto de la factura debe ser mayor a 0.');
  const { customer } = await upsertCustomer(userId, { name: input.customerName, company: input.company, email: input.email });
  const item = await getOrCreateServiceItem(userId, input.itemName);
  const payload: any = {
    CustomerRef: { value: customer.Id },
    Line: [buildSalesLine(input.amount, input.concept || 'Servicios', item.Id)],
    ...(input.email ? { BillEmail: { Address: input.email } } : {}),
    ...(input.dueDate ? { DueDate: input.dueDate.slice(0, 10) } : {}),
    ...(input.docNumber ? { DocNumber: input.docNumber.slice(0, 21) } : {}),
    ...(input.memo ? { CustomerMemo: { value: input.memo.slice(0, 1000) } } : {}),
  };
  const res = await qboRequest<any>(userId, 'POST', 'invoice', payload);
  return res.Invoice;
}

export async function createEstimate(
  userId: string,
  input: { customerName: string; company?: string; email?: string; amount: number; concept?: string; expirationDate?: string }
) {
  if (!input.amount || isNaN(input.amount) || input.amount <= 0) throw new Error('El monto de la cotización debe ser mayor a 0.');
  const { customer } = await upsertCustomer(userId, { name: input.customerName, company: input.company, email: input.email });
  const item = await getOrCreateServiceItem(userId);
  const res = await qboRequest<any>(userId, 'POST', 'estimate', {
    CustomerRef: { value: customer.Id },
    Line: [buildSalesLine(input.amount, input.concept || 'Servicios', item.Id)],
    ...(input.email ? { BillEmail: { Address: input.email } } : {}),
    ...(input.expirationDate ? { ExpirationDate: input.expirationDate.slice(0, 10) } : {}),
  });
  return res.Estimate;
}

/** Registra un pago. Si se indica el número/ID de factura, se aplica contra esa factura. */
export async function createPayment(
  userId: string,
  input: { customerName?: string; email?: string; amount: number; invoiceRef?: string }
) {
  if (!input.amount || isNaN(input.amount) || input.amount <= 0) throw new Error('El monto del pago debe ser mayor a 0.');

  let invoice: any = null;
  if (input.invoiceRef) {
    const ref = esc(input.invoiceRef.trim());
    invoice = (await qboQuery(userId, `select * from Invoice where DocNumber = '${ref}'`).catch(() => []))[0]
      || (/^\d+$/.test(ref) ? (await qboQuery(userId, `select * from Invoice where Id = '${ref}'`).catch(() => []))[0] : null);
  }

  let customerId = invoice?.CustomerRef?.value;
  if (!customerId) {
    if (!input.customerName && !input.email) throw new Error('Se requiere la factura o el cliente para registrar el pago.');
    const { customer } = await upsertCustomer(userId, { name: input.customerName || input.email || '', email: input.email });
    customerId = customer.Id;
  }

  const payload: any = {
    CustomerRef: { value: customerId },
    TotalAmt: Number(input.amount.toFixed(2)),
    ...(invoice
      ? { Line: [{ Amount: Number(Math.min(input.amount, Number(invoice.Balance ?? input.amount)).toFixed(2)), LinkedTxn: [{ TxnId: invoice.Id, TxnType: 'Invoice' }] }] }
      : {}),
  };
  const res = await qboRequest<any>(userId, 'POST', 'payment', payload);
  return res.Payment;
}

export async function sendInvoiceEmail(userId: string, input: { invoiceRef: string; email?: string }) {
  const ref = esc(input.invoiceRef.trim());
  const invoice = (await qboQuery(userId, `select * from Invoice where DocNumber = '${ref}'`).catch(() => []))[0]
    || (/^\d+$/.test(ref) ? (await qboQuery(userId, `select * from Invoice where Id = '${ref}'`).catch(() => []))[0] : null);
  if (!invoice) throw new Error(`No se encontró la factura "${input.invoiceRef}" en QuickBooks.`);
  const res = await qboRequest<any>(
    userId,
    'POST',
    `invoice/${invoice.Id}/send`,
    undefined,
    input.email ? { sendTo: input.email } : undefined
  );
  return res.Invoice;
}

const VALID_ACCOUNT_TYPES = [
  'Bank', 'Other Current Asset', 'Fixed Asset', 'Other Asset', 'Accounts Receivable',
  'Equity', 'Expense', 'Other Expense', 'Cost of Goods Sold', 'Accounts Payable',
  'Credit Card', 'Long Term Liability', 'Other Current Liability', 'Income', 'Other Income',
];

/** Crea una cuenta contable (entidad Account). Si ya existe con ese nombre, la devuelve. */
export async function createAccount(userId: string, input: { name: string; accountType?: string; accountNumber?: string; description?: string }) {
  const name = input.name.trim().replace(/[:"]/g, '').slice(0, 100);
  if (!name) throw new Error('El nombre de la cuenta es obligatorio.');
  const existing = (await qboQuery(userId, `select * from Account where Name = '${esc(name)}'`).catch(() => []))[0];
  if (existing) return { account: existing, created: false };

  const type = VALID_ACCOUNT_TYPES.find(t => t.toLowerCase() === (input.accountType || '').trim().toLowerCase()) || 'Expense';
  const res = await qboRequest<any>(userId, 'POST', 'account', {
    Name: name,
    AccountType: type,
    ...(input.accountNumber ? { AcctNum: input.accountNumber.slice(0, 20) } : {}),
    ...(input.description ? { Description: input.description.slice(0, 100) } : {}),
  });
  return { account: res.Account, created: true };
}

/* ------------------------------------------------------------------ */
/* Webhooks                                                             */
/* ------------------------------------------------------------------ */

/** Verifica la firma `intuit-signature` (HMAC-SHA256 en base64 con el verifier token). */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const verifier = process.env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN || '';
  if (!verifier || !signature) return false;
  const expected = crypto.createHmac('sha256', verifier).update(rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Secreto interno (derivado) que autoriza al webhook a despachar triggers de QuickBooks al motor. */
export function getInternalWebhookSecret() {
  return crypto.createHmac('sha256', getEncryptionKey()).update('qbo-internal-dispatch').digest('hex');
}

export interface QboWebhookEvent {
  realmId: string;
  entity: string; // "Customer", "Invoice", "Payment", "Estimate"...
  entityId: string;
  operation: string; // "Create" | "Update" | "Delete" | ...
}

/** Normaliza tanto el formato CloudEvents (actual) como el legado `eventNotifications`. */
export function parseWebhookPayload(payload: any): QboWebhookEvent[] {
  const events: QboWebhookEvent[] = [];
  if (Array.isArray(payload)) {
    for (const ev of payload) {
      // type: "qbo.invoice.created.v1"
      const parts = String(ev?.type || '').split('.');
      if (parts.length < 3) continue;
      const entityRaw = parts[1];
      const opRaw = parts[2];
      events.push({
        realmId: String(ev.intuitaccountid || ''),
        entity: entityRaw.charAt(0).toUpperCase() + entityRaw.slice(1),
        entityId: String(ev.intuitentityid || ''),
        operation: opRaw === 'created' ? 'Create' : opRaw === 'updated' ? 'Update' : opRaw === 'deleted' ? 'Delete' : opRaw,
      });
    }
  } else if (payload?.eventNotifications) {
    for (const n of payload.eventNotifications) {
      for (const e of n?.dataChangeEvent?.entities || []) {
        events.push({ realmId: String(n.realmId), entity: e.name, entityId: String(e.id), operation: e.operation });
      }
    }
  }
  return events.filter(e => e.realmId && e.entityId);
}

/** Convierte una entidad de QuickBooks al formato de variables de los triggers de la Suite. */
export function mapEntityToTriggerData(entity: string, obj: any, environment: string): { triggerName: string; data: Record<string, string> } | null {
  const appBase = environment === 'sandbox' ? 'https://app.sandbox.qbo.intuit.com/app' : 'https://qbo.intuit.com/app';
  const s = (v: any) => (v === undefined || v === null ? '' : String(v));

  switch (entity) {
    case 'Customer':
      return {
        triggerName: 'Cliente Creado en QuickBooks',
        data: {
          'ID de Cliente QuickBooks': s(obj.Id),
          'Nombre del Cliente': s(obj.DisplayName),
          'Nombre de Empresa': s(obj.CompanyName),
          'Email del Cliente': s(obj.PrimaryEmailAddr?.Address),
          'Teléfono del Cliente': s(obj.PrimaryPhone?.FreeFormNumber),
          'Dirección': [obj.BillAddr?.Line1, obj.BillAddr?.City, obj.BillAddr?.Country].filter(Boolean).join(', '),
          'Saldo Pendiente': s(obj.Balance),
          'Fecha de Creación': s(obj.MetaData?.CreateTime),
          'Enlace en QuickBooks': `${appBase}/customerdetail?nameId=${s(obj.Id)}`,
        },
      };
    case 'Invoice':
      return {
        triggerName: 'Factura Creada en QuickBooks',
        data: {
          'ID de Factura QuickBooks': s(obj.Id),
          'Número de Factura': s(obj.DocNumber),
          'Nombre del Cliente': s(obj.CustomerRef?.name),
          'Email del Cliente': s(obj.BillEmail?.Address),
          'Monto Total': s(obj.TotalAmt),
          'Saldo Pendiente': s(obj.Balance),
          'Moneda': s(obj.CurrencyRef?.value),
          'Concepto de Venta': s(obj.Line?.find((l: any) => l.Description)?.Description),
          'Fecha de Factura': s(obj.TxnDate),
          'Fecha de Vencimiento': s(obj.DueDate),
          'Enlace en QuickBooks': `${appBase}/invoice?txnId=${s(obj.Id)}`,
        },
      };
    case 'Payment':
      return {
        triggerName: 'Pago Recibido en QuickBooks',
        data: {
          'ID de Pago QuickBooks': s(obj.Id),
          'Nombre del Cliente': s(obj.CustomerRef?.name),
          'Monto Pagado': s(obj.TotalAmt),
          'Moneda': s(obj.CurrencyRef?.value),
          'Fecha de Pago': s(obj.TxnDate),
          'Facturas Aplicadas (IDs)': (obj.Line || []).flatMap((l: any) => (l.LinkedTxn || []).filter((t: any) => t.TxnType === 'Invoice').map((t: any) => t.TxnId)).join(', '),
          'Enlace en QuickBooks': `${appBase}/recvpayment?txnId=${s(obj.Id)}`,
        },
      };
    case 'Estimate':
      return {
        triggerName: 'Cotización Creada en QuickBooks',
        data: {
          'ID de Cotización QuickBooks': s(obj.Id),
          'Número de Cotización': s(obj.DocNumber),
          'Nombre del Cliente': s(obj.CustomerRef?.name),
          'Email del Cliente': s(obj.BillEmail?.Address),
          'Monto Total': s(obj.TotalAmt),
          'Estado de Cotización': s(obj.TxnStatus),
          'Fecha de Vencimiento': s(obj.ExpirationDate),
          'Enlace en QuickBooks': `${appBase}/estimate?txnId=${s(obj.Id)}`,
        },
      };
    default:
      return null;
  }
}
