import { NextRequest, NextResponse } from 'next/server';

/**
 * Cash Save — WhatsApp Webhook API Route
 *
 * GET: Handles Meta Webhook Verification challenge
 * POST: Handles incoming WhatsApp status updates and user responses
 */

// ─── GET: Meta Webhook Verification ─────────────────────────────
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'cashsave_whatsapp_verify_token_2026';

  console.log('[WhatsApp Webhook] Verification attempt:', { mode, token, challenge });

  // Check if mode and token are correct
  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[WhatsApp Webhook] Verification successful!');
    // Respond with the challenge string from Meta
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[WhatsApp Webhook] Verification failed! Token mismatch.');
  return new NextResponse('Forbidden', { status: 403 });
}

// ─── POST: Incoming Messages & Status Updates ───────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[WhatsApp Webhook] Event received:', JSON.stringify(body, null, 2));

    // Acknowledge receipt immediately to Meta with 200 OK
    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing POST:', error);
    return NextResponse.json({ status: 'error' }, { status: 200 }); // Always 200 to Meta to avoid retries
  }
}
