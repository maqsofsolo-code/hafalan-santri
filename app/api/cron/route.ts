import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

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

  const jadwalValid = [
    'reminder-guru-subuh',
    'reminder-guru-pagi',
    'reminder-guru-siang',
    'reminder-guru-sore',
    'notif-wali',
    'notif-wali-push',
    'notif-naik-peringkat',
    'notif-wali-kelas',
    'reminder-guru-push-subuh',
    'reminder-guru-push-pagi',
    'reminder-guru-push-siang',
    'reminder-guru-push-sore',
  ]

  if (!jadwal || !jadwalValid.includes(jadwal)) {
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
