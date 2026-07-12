// Helper untuk push notification
import { supabase } from './supabase'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function daftarkanNotifikasi(userId: string, role: string): Promise<{ ok: boolean; message: string }> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { ok: false, message: 'Perangkat/browser ini tidak mendukung notifikasi.' }
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      return { ok: false, message: 'Konfigurasi notifikasi belum lengkap (VAPID key).' }
    }

    // Minta izin notifikasi
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { ok: false, message: 'Izin notifikasi ditolak. Aktifkan lewat pengaturan browser.' }
    }

    // Daftarkan service worker
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    // Buat subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    // Kirim ke server untuk disimpan
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.access_token) {
      return { ok: false, message: 'Session tidak tersedia atau sudah berakhir. Silakan login kembali.' }
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, role, subscription }),
    })

    if (res.status === 401) {
      return { ok: false, message: 'Session tidak valid atau sudah berakhir. Silakan login kembali.' }
    }
    if (res.status === 403) {
      return { ok: false, message: 'Akses notifikasi ditolak.' }
    }
    if (!res.ok) {
      return { ok: false, message: 'Gagal menyimpan notifikasi ke server.' }
    }

    return { ok: true, message: 'Notifikasi berhasil diaktifkan!' }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown'
    return { ok: false, message: 'Terjadi kesalahan: ' + message }
  }
}

export async function cekStatusNotifikasi(userId?: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (Notification.permission !== 'granted') return false
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return false
    const sub = await registration.pushManager.getSubscription()
    if (!sub) return false

    // Kalau tidak ada userId, cukup cek ada langganan di browser
    if (!userId) return true

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.access_token) return false

    // Cek ke database: apakah user INI sudah terdaftar dengan endpoint ini
    const res = await fetch('/api/push/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, endpoint: sub.endpoint }),
    })
    const data = await res.json()
    return !!data.terdaftar
  } catch {
    return false
  }
}
