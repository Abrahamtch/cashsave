import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Cash Save — Push Subscription API
 *
 * POST: Save a new push subscription for the authenticated user
 * DELETE: Remove a push subscription by endpoint
 */

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Get user from Supabase auth cookie/token
async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  // Try to get auth from cookie header
  const cookieHeader = request.headers.get('cookie') || '';
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { cookie: cookieHeader },
    },
  });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

// ─── POST: Save Push Subscription ───────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const subscription = body.subscription;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid push subscription payload.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      // Fallback: accept but don't persist (local-only mode)
      return NextResponse.json({ success: true, mode: 'local_only' });
    }

    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated.' },
        { status: 401 }
      );
    }

    // Upsert subscription (unique by user_id + endpoint)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          keys_p256dh: subscription.keys.p256dh,
          keys_auth: subscription.keys.auth,
        },
        { onConflict: 'user_id,endpoint' }
      );

    if (error) {
      console.error('[Push Subscribe] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save subscription.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Push Subscribe] Server error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}

// ─── DELETE: Remove Push Subscription ───────────────────────────
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const endpoint = body.endpoint;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: true, mode: 'local_only' });
    }

    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated.' },
        { status: 401 }
      );
    }

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Push Unsubscribe] Server error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}
