import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let vapidConfigured = false
function konfigurasiVapid() {
  if (vapidConfigured) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@ponpesdaarussalaf.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  vapidConfigured = true
}

type PushPayload = { title: string; body: string; url?: string; tag?: string }

// Kirim ke satu user (semua device-nya)
export async function kirimPushKeUser(userId: string, payload: PushPayload) {
  konfigurasiVapid()
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions').select('*').eq('user_id', userId)

  if (!subs || subs.length === 0) return { terkirim: 0, gagal: 0 }
  return await kirimKeSubscriptions(subs, payload)
}

// Kirim ke semua user dengan role tertentu
export async function kirimPushKeRole(role: string, payload: PushPayload) {
  konfigurasiVapid()
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions').select('*').eq('role', role)

  if (!subs || subs.length === 0) return { terkirim: 0, gagal: 0 }
  return await kirimKeSubscriptions(subs, payload)
}

// Helper internal: kirim ke daftar subscription
async function kirimKeSubscriptions(subs: any[], payload: PushPayload) {
  let terkirim = 0
  let gagal = 0

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub.subscription, JSON.stringify(payload))
      terkirim++
    } catch (err: any) {
      gagal++
      // Kalau subscription sudah kadaluarsa (410/404), hapus dari database
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return { terkirim, gagal }
}