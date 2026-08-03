import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type NilaiUjianBody = Record<string, unknown> & {
  santri_id?: unknown
  kalender_id?: unknown
  tipe?: unknown
  surah_mulai_nomor?: unknown
  surah_selesai_nomor?: unknown
  ayat_mulai?: unknown
  ayat_selesai?: unknown
  jumlah_tegur?: unknown
  jumlah_tahu_ayat?: unknown
  jumlah_lupa?: unknown
  catatan?: unknown
}

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey || !serviceRoleKey) return null
  return { url, anonKey, serviceRoleKey }
}

async function authorizeGuru(request: Request) {
  const authorization = request.headers.get('authorization')
  const bearerMatch = authorization?.match(/^Bearer\s+(\S+)$/i)

  if (!bearerMatch) {
    return { response: responseError('Sesi login tidak valid atau sudah berakhir', 401) }
  }

  const config = getSupabaseConfig()
  if (!config) {
    return { response: responseError('Konfigurasi server tidak lengkap', 500) }
  }

  const accessToken = bearerMatch[1]
  const authenticatedClient = createClient(config.url, config.anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await authenticatedClient.auth.getUser(accessToken)
  if (userError || !userData.user) {
    return { response: responseError('Sesi login tidak valid atau sudah berakhir', 401) }
  }

  const { data: profile, error: profileError } = await authenticatedClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'guru') {
    return { response: responseError('Akses ditolak', 403) }
  }

  const serviceClient = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return { userId: userData.user.id, serviceClient }
}

function getTanggalWIB() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function toNonNegativeInteger(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(numberValue) || numberValue < 0) return null
  return numberValue
}

function toPositiveInteger(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(numberValue) || numberValue < 1) return null
  return numberValue
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(request: Request) {
  const auth = await authorizeGuru(request)
  if ('response' in auth) return auth.response

  const { userId, serviceClient } = auth
  const { data: santri, error: santriError } = await serviceClient
    .from('santri')
    .select('id')
    .eq('status', 'aktif')
    .or(`guru_id.eq.${userId},guru_id_2.eq.${userId}`)

  if (santriError) {
    return responseError('Gagal memuat cakupan santri', 500)
  }

  const santriIds = (santri || []).map(item => item.id)
  if (santriIds.length === 0) {
    return NextResponse.json({ success: true, data: [] }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const pageSize = 500
  let offset = 0
  const nilaiUjian: unknown[] = []

  while (true) {
    const { data, error } = await serviceClient
      .from('nilai_ujian')
      .select(`
        id,
        santri_id,
        guru_id,
        kalender_id,
        tanggal,
        tipe,
        surah_mulai_nomor,
        surah_selesai_nomor,
        ayat_mulai,
        ayat_selesai,
        jumlah_tegur,
        jumlah_tahu_ayat,
        jumlah_lupa,
        nilai_akhir,
        catatan,
        created_at,
        santri:santri_id(id, nama, kelas, kelas_num, jenjang, jenis_kelas),
        guru:guru_id(id, nama),
        surah_mulai:surah_mulai_nomor(nomor, nama_latin),
        surah_selesai:surah_selesai_nomor(nomor, nama_latin),
        kalender:kalender_id(id, nama, tipe, tanggal_mulai, tanggal_selesai)
      `)
      .in('santri_id', santriIds)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) {
      return responseError('Gagal memuat rekap nilai ujian', 500)
    }

    nilaiUjian.push(...(data || []))
    if (!data || data.length < pageSize) break
    offset += pageSize
  }

  return NextResponse.json({ success: true, data: nilaiUjian }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: Request) {
  const auth = await authorizeGuru(request)
  if ('response' in auth) return auth.response

  let body: NilaiUjianBody
  try {
    body = await request.json() as NilaiUjianBody
  } catch {
    return responseError('Data nilai ujian tidak valid', 400)
  }

  const santriId = body.santri_id
  const surahMulai = toPositiveInteger(body.surah_mulai_nomor)
  const surahSelesai = toPositiveInteger(body.surah_selesai_nomor)
  const ayatMulai = toPositiveInteger(body.ayat_mulai)
  const ayatSelesai = toPositiveInteger(body.ayat_selesai)
  const jumlahTegur = toNonNegativeInteger(body.jumlah_tegur)
  const jumlahTahuAyat = toNonNegativeInteger(body.jumlah_tahu_ayat)
  const jumlahLupa = toNonNegativeInteger(body.jumlah_lupa)

  if (
    !isUuid(santriId)
    || surahMulai === null || surahMulai > 114
    || surahSelesai === null || surahSelesai > 114
    || ayatMulai === null || ayatSelesai === null
    || jumlahTegur === null || jumlahTahuAyat === null || jumlahLupa === null
  ) {
    return responseError('Data nilai ujian tidak valid', 400)
  }

  if (body.kalender_id !== null && body.kalender_id !== undefined && !isUuid(body.kalender_id)) {
    return responseError('Periode ujian tidak valid', 400)
  }

  const tipe = typeof body.tipe === 'string' && body.tipe.trim()
    ? body.tipe.trim().slice(0, 100)
    : 'mid_semester'
  const catatan = typeof body.catatan === 'string' && body.catatan.trim()
    ? body.catatan.trim().slice(0, 2000)
    : null

  const { userId, serviceClient } = auth
  const { data: santri, error: santriError } = await serviceClient
    .from('santri')
    .select('id')
    .eq('id', santriId)
    .eq('status', 'aktif')
    .or(`guru_id.eq.${userId},guru_id_2.eq.${userId}`)
    .maybeSingle()

  if (santriError) {
    return responseError('Gagal memverifikasi data santri', 500)
  }
  if (!santri) {
    return responseError('Santri bukan tanggung jawab guru', 403)
  }

  const nilaiSebelumBatas = 10 - (jumlahTegur * 0.1) - (jumlahTahuAyat * 0.1) - jumlahLupa
  const nilaiAkhir = Math.max(5, Math.round(nilaiSebelumBatas * 10) / 10)
  const tanggal = getTanggalWIB()

  const { error: insertError } = await serviceClient.from('nilai_ujian').insert({
    santri_id: santriId,
    guru_id: userId,
    kalender_id: body.kalender_id || null,
    tipe,
    tanggal,
    surah_mulai_nomor: surahMulai,
    surah_selesai_nomor: surahSelesai,
    ayat_mulai: ayatMulai,
    ayat_selesai: ayatSelesai,
    jumlah_tegur: jumlahTegur,
    jumlah_tahu_ayat: jumlahTahuAyat,
    jumlah_lupa: jumlahLupa,
    nilai_akhir: nilaiAkhir,
    catatan,
  })

  if (insertError) {
    return responseError('Gagal menyimpan nilai ujian', 500)
  }

  return NextResponse.json({ success: true, nilai_akhir: nilaiAkhir, tanggal })
}
