import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
    return NextResponse.json({ terdaftar: false }, { status: 401 })
  }

  const accessToken = bearerMatch[1]
  const supabaseAuthenticated = createAuthenticatedClient(accessToken)
  const { data: userData, error: userError } = await supabaseAuthenticated.auth.getUser(accessToken)
  if (userError || !userData.user) {
    return NextResponse.json({ terdaftar: false }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabaseAuthenticated
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError || (profile?.role !== 'guru' && profile?.role !== 'wali')) {
    return NextResponse.json({ terdaftar: false }, { status: 403 })
  }

  try {
    const { endpoint } = await request.json() as { endpoint?: string }
    if (typeof endpoint !== 'string' || !endpoint) {
      return NextResponse.json({ terdaftar: false })
    }

    const supabaseAdmin = createAdminClient()
    const { data } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('endpoint', endpoint)
      .maybeSingle()

    return NextResponse.json({ terdaftar: !!data })
  } catch {
    return NextResponse.json({ terdaftar: false })
  }
}
