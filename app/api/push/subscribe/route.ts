import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type PushRole = 'guru' | 'wali'

type PushSubscriptionPayload = {
  endpoint?: string
  keys?: {
    p256dh?: string
    auth?: string
  }
}

function createAuthenticatedClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
}

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization')
  const bearerMatch = authorization?.match(/^Bearer\s+(\S+)$/i)
  if (!bearerMatch) {
    return NextResponse.json({ message: 'Session tidak valid atau sudah berakhir' }, { status: 401 })
  }

  const accessToken = bearerMatch[1]
  const supabaseAuthenticated = createAuthenticatedClient(accessToken)
  const { data: userData, error: userError } = await supabaseAuthenticated.auth.getUser(accessToken)
  if (userError || !userData.user) {
    return NextResponse.json({ message: 'Session tidak valid atau sudah berakhir' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabaseAuthenticated
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError || (profile?.role !== 'guru' && profile?.role !== 'wali')) {
    return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 })
  }

  try {
    const { subscription } = await request.json() as { subscription?: PushSubscriptionPayload }

    if (
      typeof subscription?.endpoint !== 'string' ||
      typeof subscription.keys?.p256dh !== 'string' ||
      typeof subscription.keys.auth !== 'string'
    ) {
      return NextResponse.json({ message: 'Data tidak lengkap' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Simpan / update subscription (upsert berdasarkan user_id + endpoint)
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: userData.user.id,
        role: profile.role as PushRole,
        subscription: subscription,
        endpoint: subscription.endpoint,
      }, { onConflict: 'user_id,endpoint' })

    if (error) {
      return NextResponse.json({ message: 'Gagal menyimpan subscription' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Subscription tersimpan' })
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
