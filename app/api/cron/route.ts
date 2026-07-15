import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

const JENIS_WHATSAPP = new Set([
  'reminder-guru-subuh',
  'reminder-guru-pagi',
  'reminder-guru-siang',
  'reminder-guru-sore',
  'notif-wali',
  'notif-naik-peringkat',
  'notif-wali-kelas',
])

const JENIS_PUSH = new Set([
  'notif-wali-push',
  'reminder-guru-push-subuh',
  'reminder-guru-push-pagi',
  'reminder-guru-push-siang',
  'reminder-guru-push-sore',
])

function whatsappAktif() {
  return process.env.WHATSAPP_ENABLED === 'true'
}

function getJenisWhatsappDiizinkan() {
  const konfigurasi = process.env.WHATSAPP_ALLOWED_TYPES
  const jenisDikonfigurasi = konfigurasi === undefined
    ? ['notif-wali']
    : konfigurasi.split(',').map(jenis => jenis.trim()).filter(Boolean)

  return new Set<string>(jenisDikonfigurasi.filter(jenis => jenis === 'notif-wali'))
}

function logPenolakan(jenis: string, kanal: 'whatsapp' | 'push' | 'tidak-dikenal', alasan: string) {
  console.warn('Request notifikasi ditolak', {
    jenis,
    kanal,
    alasan,
    timestamp: new Date().toISOString(),
  })
}

function secretSama(secretDiterima: string, secretDiharapkan: string) {
  const hashDiterima = createHash('sha256').update(secretDiterima).digest()
  const hashDiharapkan = createHash('sha256').update(secretDiharapkan).digest()
  return timingSafeEqual(hashDiterima, hashDiharapkan)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const jadwal = searchParams.get('jadwal')
  const secret = searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'Konfigurasi server tidak tersedia' }, { status: 500 })
  }

  if (!secret || !secretSama(secret, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!jadwal) {
    return NextResponse.json({ error: 'Parameter jadwal tidak valid' }, { status: 400 })
  }

  if (JENIS_WHATSAPP.has(jadwal)) {
    if (!getJenisWhatsappDiizinkan().has(jadwal)) {
      logPenolakan(jadwal, 'whatsapp', 'jenis tidak diizinkan')
      return NextResponse.json(
        { success: false, error: 'Jenis notifikasi WhatsApp tidak diizinkan' },
        { status: 403 }
      )
    }

    if (!whatsappAktif()) {
      logPenolakan(jadwal, 'whatsapp', 'kanal dinonaktifkan')
      return NextResponse.json(
        { success: false, error: 'Kanal WhatsApp sedang dinonaktifkan' },
        { status: 503 }
      )
    }
  } else if (!JENIS_PUSH.has(jadwal)) {
    logPenolakan(jadwal, 'tidak-dikenal', 'jenis tidak valid')
    return NextResponse.json({ error: 'Parameter jadwal tidak valid' }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hafalan-santri-qjf3.vercel.app'

  const response = await fetch(`${baseUrl}/api/send-notif`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({ jenis: jadwal })
  })

  const result = await response.json()
  return NextResponse.json(result)
}
