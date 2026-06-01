import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const jadwal = searchParams.get('jadwal')
  const secret = searchParams.get('secret')

  // Keamanan: cek secret key
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!jadwal || !['baru', 'lama'].includes(jadwal)) {
    return NextResponse.json({ error: 'Parameter jadwal tidak valid' }, { status: 400 })
  }

  // Panggil API notifikasi
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/send-notif`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jenis_jadwal: jadwal })
  })

  const result = await response.json()
  return NextResponse.json(result)
}