import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { userId, endpoint } = await request.json()
    if (!userId || !endpoint) {
      return NextResponse.json({ terdaftar: false })
    }
    const { data } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .maybeSingle()

    return NextResponse.json({ terdaftar: !!data })
  } catch {
    return NextResponse.json({ terdaftar: false })
  }
}