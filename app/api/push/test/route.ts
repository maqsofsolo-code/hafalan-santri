import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { kirimPushKeUser } from '../../../lib/sendPush'

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

  if (profileError || profile?.role !== 'wali') {
    return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 })
  }

  try {
    const hasil = await kirimPushKeUser(userData.user.id, {
      title: '🔔 Test Notifikasi Daarus Salaf',
      body: 'Alhamdulillah! Notifikasi berhasil aktif. Anda akan menerima laporan hafalan ananda di sini.',
      url: '/wali',
    })

    return NextResponse.json({
      message: `Test selesai. Terkirim: ${hasil.terkirim}, Gagal: ${hasil.gagal}`,
    })
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
