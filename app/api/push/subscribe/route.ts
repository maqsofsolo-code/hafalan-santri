import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { userId, role, subscription } = await request.json()

    if (!userId || !role || !subscription?.endpoint) {
      return NextResponse.json({ message: 'Data tidak lengkap' }, { status: 400 })
    }

    // Simpan / update subscription (upsert berdasarkan user_id + endpoint)
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        role: role,
        subscription: subscription,
        endpoint: subscription.endpoint,
      }, { onConflict: 'user_id,endpoint' })

    if (error) {
      return NextResponse.json({ message: 'Gagal simpan: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Subscription tersimpan' })
  } catch (err: any) {
    return NextResponse.json({ message: 'Error: ' + err.message }, { status: 500 })
  }
}