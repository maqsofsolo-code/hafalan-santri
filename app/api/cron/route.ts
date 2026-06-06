import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const jadwal = searchParams.get('jadwal')
  const secret = searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jadwalValid = [
    'reminder-guru-subuh',
    'reminder-guru-pagi',
    'reminder-guru-siang',
    'reminder-guru-sore',
    'notif-wali',
    'notif-naik-peringkat'
  ]

  if (!jadwal || !jadwalValid.includes(jadwal)) {
    return NextResponse.json({ error: 'Parameter jadwal tidak valid' }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hafalan-santri-qjf3.vercel.app'

  const response = await fetch(`${baseUrl}/api/send-notif`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jenis: jadwal })
  })

  const result = await response.json()
  return NextResponse.json(result)
}