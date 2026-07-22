import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type SetoranBody = Record<string, unknown> & {
  santri_id?: unknown
  jenis?: unknown
  status?: unknown
  status_kehadiran?: unknown
  tanggal?: unknown
  guru_pengganti?: unknown
}

const FIELD_SETORAN_DIIZINKAN = [
  'santri_id',
  'jenis',
  'status',
  'catatan',
  'status_kehadiran',
  'tanggal',
  'guru_pengganti',
  'surah_mulai_nomor',
  'surah_selesai_nomor',
  'surah',
  'ayat_mulai',
  'ayat_selesai',
  'ayat_mulai_baru',
  'ayat_selesai_baru',
  'penambahan_juz',
  'jumlah_halaman_murojaah',
] as const

const PESAN_WUSTHA_TERKUNCI = 'Santri masih memiliki tanggungan hafalan lama. Setorkan hafalan lama hingga Najih terlebih dahulu.'

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
    return NextResponse.json({ error: 'Sesi login tidak valid atau sudah berakhir' }, { status: 401 })
  }

  const accessToken = bearerMatch[1]
  const supabaseAuthenticated = createAuthenticatedClient(accessToken)
  const { data: userData, error: userError } = await supabaseAuthenticated.auth.getUser(accessToken)

  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Sesi login tidak valid atau sudah berakhir' }, { status: 401 })
  }

  const { data: callerProfile, error: callerProfileError } = await supabaseAuthenticated
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (callerProfileError || callerProfile?.role !== 'guru') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  let body: SetoranBody
  try {
    body = await request.json() as SetoranBody
  } catch {
    return NextResponse.json({ error: 'Data setoran tidak valid' }, { status: 400 })
  }

  const { santri_id: santriId, jenis, status, status_kehadiran: statusKehadiran, tanggal } = body
  if (
    typeof santriId !== 'string' || !santriId ||
    (jenis !== 'lama' && jenis !== 'baru') ||
    (status !== 'lancar' && status !== 'rosib') ||
    statusKehadiran !== 'hadir' ||
    typeof tanggal !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)
  ) {
    return NextResponse.json({ error: 'Data setoran tidak valid' }, { status: 400 })
  }

  const { data: santri, error: santriError } = await supabaseAuthenticated
    .from('santri')
    .select('id, jenjang')
    .eq('id', santriId)
    .maybeSingle()

  if (santriError) {
    return NextResponse.json({ error: 'Gagal memverifikasi data santri' }, { status: 500 })
  }
  if (!santri) {
    return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 })
  }

  const { data: setoranSudahAda, error: cekDuplikasiError } = await supabaseAuthenticated
    .from('setoran')
    .select('id')
    .eq('santri_id', santriId)
    .eq('tanggal', tanggal)
    .eq('jenis', jenis)
    .eq('status_kehadiran', 'hadir')
    .limit(1)

  if (cekDuplikasiError) {
    return NextResponse.json({ error: 'Gagal memeriksa setoran hari ini' }, { status: 500 })
  }
  if (setoranSudahAda && setoranSudahAda.length > 0) {
    return NextResponse.json({
      error: jenis === 'lama'
        ? 'Setoran lama santri ini sudah diinput hari ini. Jika jenis setoran sebelumnya keliru, silakan edit data yang sudah ada.'
        : 'Hafalan baru santri ini sudah diinput hari ini. Jika jenis setoran sebelumnya keliru, silakan edit data yang sudah ada.',
    }, { status: 409 })
  }

  if (santri.jenjang === 'wustha' && jenis === 'baru') {
    const { data: setoranLama, error: setoranLamaError } = await supabaseAuthenticated
      .from('setoran')
      .select('id, status, tanggal, created_at')
      .eq('santri_id', santriId)
      .eq('jenis', 'lama')
      .eq('status_kehadiran', 'hadir')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)

    if (setoranLamaError) {
      return NextResponse.json({ error: 'Gagal memeriksa status hafalan lama' }, { status: 500 })
    }
    if (setoranLama?.[0]?.status === 'rosib') {
      return NextResponse.json(
        { error: PESAN_WUSTHA_TERKUNCI, code: 'WUSTHA_MUROJAAH_ROSIB' },
        { status: 409 }
      )
    }
  }

  const insertData: Record<string, unknown> = {}
  FIELD_SETORAN_DIIZINKAN.forEach(field => {
    if (body[field] !== undefined) insertData[field] = body[field]
  })
  insertData.guru_id = userData.user.id
  insertData.perlu_ulang = status === 'rosib'
  insertData.guru_pengganti = body.guru_pengganti === true

  const { error: insertError } = await supabaseAuthenticated
    .from('setoran')
    .insert(insertData)

  if (insertError) {
    return NextResponse.json({ error: 'Gagal menyimpan setoran' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
