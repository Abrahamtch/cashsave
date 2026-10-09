/**
 * Client SasPay — encaissement Mobile Money & Carte bancaire
 * Documentation : https://docs.saspay.me (spécification OpenAPI = source de vérité)
 *
 * ⚠️ SERVEUR UNIQUEMENT : la clé secrète (sk_test_… / sk_live_…) ne doit jamais
 * être importée côté client, loggée ou commitée.
 */
import crypto from 'crypto';

const SASPAY_BASE_URL = 'https://api.saspay.me/api/v1';
const WEBHOOK_TOLERANCE_SECONDS = 300;

export class SasPayError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'SasPayError';
    this.status = status;
    this.code = code;
  }
}

function getSecretKey(): string {
  const key = process.env.SASPAY_SECRET_KEY;
  if (!key || !key.startsWith('sk_')) {
    throw new SasPayError('SASPAY_SECRET_KEY non configurée.', 500, 'missing_api_key');
  }
  return key;
}

/** Appel générique à l'API SasPay, qui renvoie toujours `{ success, data | error, code }`. */
async function saspayRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${SASPAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getSecretKey()}`,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload || payload.success === false) {
    const err = payload?.error;
    const message =
      (err && typeof err.message === 'string' && err.message) ||
      (err && typeof err === 'object' ? JSON.stringify(err) : null) ||
      `Erreur SasPay (HTTP ${response.status})`;
    throw new SasPayError(message, response.status, err?.code);
  }

  // Les réponses utiles sont enveloppées dans `data`.
  return (payload.data ?? payload) as T;
}

// ─── Checkout hébergé ───────────────────────────────────────────

export interface CreateCheckoutParams {
  amount: number; // en FCFA, entier
  description: string;
  customerEmail: string;
  customerName: string;
  returnUrl: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutSession {
  id: string;
  slug: string;
  checkout_url: string;
  status: string;
}

/**
 * POST /checkout-sessions/ — page de paiement hébergée par SasPay où le client
 * choisit son moyen de paiement (Mobile Money ou carte bancaire).
 */
export async function createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession> {
  return saspayRequest<CheckoutSession>('/checkout-sessions/', {
    method: 'POST',
    body: JSON.stringify({
      amount: params.amount.toFixed(2), // montants = chaînes décimales, jamais de flottants
      currency: 'XOF',
      description: params.description,
      customer_email: params.customerEmail,
      customer_name: params.customerName,
      return_url: params.returnUrl,
      metadata: params.metadata ?? {},
    }),
  });
}

export interface CheckoutSessionStatus {
  id: string;
  slug: string;
  status: string; // ex. PENDING | PAID
  transaction_id: string | null;
  transaction_status: string | null; // PENDING | SUCCESS | FAILED
  transaction_reference: string | null;
}

/**
 * GET /checkout-sessions/{id}/status/ — revérifie toujours l'état réel côté
 * gateway avant de répondre.
 */
export async function getCheckoutSessionStatus(sessionId: string): Promise<CheckoutSessionStatus> {
  return saspayRequest<CheckoutSessionStatus>(
    `/checkout-sessions/${encodeURIComponent(sessionId)}/status/`,
    { method: 'GET' }
  );
}

// ─── Webhooks ───────────────────────────────────────────────────

/**
 * Vérifie la signature d'un webhook SasPay :
 *  1. horodatage à moins de 5 minutes ;
 *  2. HMAC-SHA256(`${timestamp}.${rawBody}`) comparé en temps constant.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null
): boolean {
  const secret = process.env.SASPAY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader || !timestampHeader) return false;

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > WEBHOOK_TOLERANCE_SECONDS) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestampHeader}.${rawBody}`)
    .digest('hex');

  const a = Buffer.from(signatureHeader.trim().toLowerCase());
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
