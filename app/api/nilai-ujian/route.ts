import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type NilaiUjianBody = Record<string, unknown> & {
  santri_id?: unknown
  segment_ujian_id?: unknown
  jumlah_tegur?: unknown
  jumlah_tahu_ayat?: unknown
  jumlah_lupa?: unknown
  catatan?: unknown
}

type SantriScope = {
  id: string
  nama: string
  kelas: string | null
  kelas_num: number | null
  jenjang: string | null
  jenis_kelas: string | null
  total_hafalan_juz: number | null
  surah_terakhir_nomor: number | null
  ayat_terakhir: number | null
}

type MasterSegment = {
  id: string
  juz: number
  segmen: number
  urutan_global: number
  halaman_awal: number
  halaman_akhir: number
  jumlah_halaman: number
  surah_awal_nomor: number
  ayat_awal: number
  surah_akhir_nomor: number
  ayat_akhir: number
  is_aktif: boolean
  surah_awal?: { nomor: number, nama_latin: string } | null
  surah_akhir?: { nomor: number, nama_latin: string } | null
}

type CakupanSegment = {
  lengkap: boolean
  segmentIds: string[]
  jumlahSegmenPerJuz: Record<string, number>
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

function createServiceClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

type ServiceClient = ReturnType<typeof createServiceClient>

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

  const serviceClient = createServiceClient(config.url, config.serviceRoleKey)

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

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function checkpointSudahMencapai(santri: SantriScope, segment: MasterSegment) {
  const nomor = Number(santri.surah_terakhir_nomor)
  const ayat = Number(santri.ayat_terakhir)
  return nomor < segment.surah_akhir_nomor
    || (nomor === segment.surah_akhir_nomor && ayat >= segment.ayat_akhir)
}

function getCakupanSegment(santri: SantriScope, masterSegments: MasterSegment[]): CakupanSegment {
  const totalHafalan = Number(santri.total_hafalan_juz)
  const nomorCheckpoint = Number(santri.surah_terakhir_nomor)
  const ayatCheckpoint = Number(santri.ayat_terakhir)
  const dataKonkret = Number.isFinite(totalHafalan)
    && totalHafalan > 0
    && totalHafalan <= 31
    && Number.isInteger(nomorCheckpoint)
    && nomorCheckpoint >= 2
    && nomorCheckpoint <= 114
    && Number.isInteger(ayatCheckpoint)
    && ayatCheckpoint > 0

  if (!dataKonkret) {
    return { lengkap: false, segmentIds: [], jumlahSegmenPerJuz: {} }
  }

  const urut = [...masterSegments].sort((a, b) => a.urutan_global - b.urutan_global)
  const batasHalaman = Math.floor((totalHafalan * 20) + 0.000001)
  let halamanTerpakai = 0
  let jumlahDariTotal = 0

  for (const segment of urut) {
    if (halamanTerpakai + segment.jumlah_halaman > batasHalaman) break
    halamanTerpakai += segment.jumlah_halaman
    jumlahDariTotal += 1
  }

  let jumlahDariCheckpoint = 0
  for (const segment of urut) {
    if (!checkpointSudahMencapai(santri, segment)) break
    jumlahDariCheckpoint += 1
  }

  const jumlahTersedia = Math.min(jumlahDariTotal, jumlahDariCheckpoint)
  const tersedia = urut.slice(0, jumlahTersedia)
  const jumlahSegmenPerJuz: Record<string, number> = {}
  tersedia.forEach(segment => {
    const key = String(segment.juz)
    jumlahSegmenPerJuz[key] = (jumlahSegmenPerJuz[key] || 0) + 1
  })

  return {
    lengkap: true,
    segmentIds: tersedia.map(segment => segment.id),
    jumlahSegmenPerJuz,
  }
}

async function getMasterSegments(serviceClient: ServiceClient) {
  return serviceClient
    .from('master_segment_ujian')
    .select(`
      id,
      juz,
      segmen,
      urutan_global,
      halaman_awal,
      halaman_akhir,
      jumlah_halaman,
      surah_awal_nomor,
      ayat_awal,
      surah_akhir_nomor,
      ayat_akhir,
      is_aktif,
      surah_awal:surah!master_segment_ujian_surah_awal_nomor_fkey(nomor, nama_latin),
      surah_akhir:surah!master_segment_ujian_surah_akhir_nomor_fkey(nomor, nama_latin)
    `)
    .eq('is_aktif', true)
    .order('urutan_global', { ascending: true })
}

export async function GET(request: Request) {
  const auth = await authorizeGuru(request)
  if ('response' in auth) return auth.response

  const { userId, serviceClient } = auth
  const { data: santriData, error: santriError } = await serviceClient
    .from('santri')
    .select('id, nama, kelas, kelas_num, jenjang, jenis_kelas, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
    .eq('status', 'aktif')
    .or(`guru_id.eq.${userId},guru_id_2.eq.${userId}`)

  if (santriError) {
    return responseError('Gagal memuat cakupan santri', 500)
  }

  const santri = (santriData || []) as SantriScope[]
  const santriIds = santri.map(item => item.id)
  const { data: masterData, error: masterError } = await getMasterSegments(serviceClient)

  if (masterError) {
    return responseError('Gagal memuat master segmen ujian', 500)
  }

  const masterSegments = (masterData || []) as unknown as MasterSegment[]
  if (masterSegments.length !== 151) {
    return responseError('Master segmen ujian belum lengkap', 500)
  }

  const url = new URL(request.url)
  const santriId = url.searchParams.get('santri_id')
  if (santriId !== null) {
    if (!isUuid(santriId)) return responseError('Data santri tidak valid', 400)
    const santriDipilih = santri.find(item => item.id === santriId)
    if (!santriDipilih) return responseError('Santri bukan tanggung jawab guru', 403)

    const cakupan = getCakupanSegment(santriDipilih, masterSegments)
    if (!cakupan.lengkap) {
      return responseError('Data total hafalan santri belum lengkap. Silakan hubungi Admin.', 422)
    }

    const segmentTersedia = masterSegments.filter(segment => cakupan.segmentIds.includes(segment.id))
    const { data: nilaiTerakhirData, error: nilaiTerakhirError } = cakupan.segmentIds.length > 0
      ? await serviceClient
          .from('nilai_ujian')
          .select('id, segment_ujian_id, nilai_akhir, tanggal, created_at')
          .eq('santri_id', santriId)
          .in('segment_ujian_id', cakupan.segmentIds)
          .order('tanggal', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
      : { data: [], error: null }

    if (nilaiTerakhirError) {
      return responseError('Gagal memuat nilai segmen santri', 500)
    }

    const nilaiTerakhir = new Map<string, unknown>()
    ;(nilaiTerakhirData || []).forEach(item => {
      if (item.segment_ujian_id && !nilaiTerakhir.has(item.segment_ujian_id)) {
        nilaiTerakhir.set(item.segment_ujian_id, item)
      }
    })

    return NextResponse.json({
      success: true,
      santri: santriDipilih,
      data: segmentTersedia.map(segment => ({
        ...segment,
        nilai_terakhir: nilaiTerakhir.get(segment.id) || null,
      })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (santriIds.length === 0) {
    return NextResponse.json({ success: true, data: [], cakupanSantri: {} }, {
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
        segment_ujian_id,
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
        santri:santri_id(id, nama, kelas, kelas_num, jenjang, jenis_kelas, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir),
        guru:guru_id(id, nama),
        surah_mulai:surah_mulai_nomor(nomor, nama_latin),
        surah_selesai:surah_selesai_nomor(nomor, nama_latin),
        kalender:kalender_id(id, nama, tipe, tanggal_mulai, tanggal_selesai),
        segment:segment_ujian_id(id, juz, segmen, urutan_global, halaman_awal, halaman_akhir, jumlah_halaman)
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

  const cakupanSantri = Object.fromEntries(santri.map(item => [
    item.id,
    getCakupanSegment(item, masterSegments),
  ]))

  return NextResponse.json({ success: true, data: nilaiUjian, cakupanSantri }, {
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
  const segmentId = body.segment_ujian_id
  const jumlahTegur = toNonNegativeInteger(body.jumlah_tegur)
  const jumlahTahuAyat = toNonNegativeInteger(body.jumlah_tahu_ayat)
  const jumlahLupa = toNonNegativeInteger(body.jumlah_lupa)

  if (
    !isUuid(santriId)
    || !isUuid(segmentId)
    || jumlahTegur === null
    || jumlahTahuAyat === null
    || jumlahLupa === null
  ) {
    return responseError('Data nilai ujian tidak valid', 400)
  }

  const catatan = typeof body.catatan === 'string' && body.catatan.trim()
    ? body.catatan.trim().slice(0, 2000)
    : null
  const { userId, serviceClient } = auth
  const { data: santriData, error: santriError } = await serviceClient
    .from('santri')
    .select('id, nama, kelas, kelas_num, jenjang, jenis_kelas, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
    .eq('id', santriId)
    .eq('status', 'aktif')
    .or(`guru_id.eq.${userId},guru_id_2.eq.${userId}`)
    .maybeSingle()

  if (santriError) {
    return responseError('Gagal memverifikasi data santri', 500)
  }
  if (!santriData) {
    return responseError('Santri bukan tanggung jawab guru', 403)
  }

  const { data: masterData, error: masterError } = await getMasterSegments(serviceClient)
  if (masterError) return responseError('Gagal memuat master segmen ujian', 500)
  const masterSegments = (masterData || []) as unknown as MasterSegment[]
  if (masterSegments.length !== 151) return responseError('Master segmen ujian belum lengkap', 500)

  const segment = masterSegments.find(item => item.id === segmentId && item.is_aktif)
  if (!segment) return responseError('Segmen ujian tidak valid atau tidak aktif', 400)

  const cakupan = getCakupanSegment(santriData as SantriScope, masterSegments)
  if (!cakupan.lengkap) {
    return responseError('Data total hafalan santri belum lengkap. Silakan hubungi Admin.', 422)
  }
  if (!cakupan.segmentIds.includes(segment.id)) {
    return responseError('Segmen ujian melampaui hafalan santri', 403)
  }

  const nilaiSebelumBatas = 10 - (jumlahTegur * 0.1) - (jumlahTahuAyat * 0.1) - jumlahLupa
  const nilaiAkhir = Math.max(5, Math.round(nilaiSebelumBatas * 10) / 10)
  const tanggal = getTanggalWIB()
  const { data: kalenderData, error: kalenderError } = await serviceClient
    .from('kalender_akademik')
    .select('id, tipe')
    .in('tipe', ['mid_semester', 'semester'])
    .lte('tanggal_mulai', tanggal)
    .gte('tanggal_selesai', tanggal)
    .order('tanggal_mulai', { ascending: false })
    .limit(1)

  if (kalenderError) return responseError('Gagal memverifikasi periode ujian', 500)
  const kalender = kalenderData?.[0] || null
  const tipe = kalender?.tipe === 'semester' ? 'semester' : 'mid_semester'

  const { data: nilaiBaru, error: insertError } = await serviceClient
    .from('nilai_ujian')
    .insert({
      santri_id: santriId,
      guru_id: userId,
      kalender_id: kalender?.id || null,
      segment_ujian_id: segment.id,
      tipe,
      tanggal,
      surah_mulai_nomor: segment.surah_awal_nomor,
      surah_selesai_nomor: segment.surah_akhir_nomor,
      ayat_mulai: segment.ayat_awal,
      ayat_selesai: segment.ayat_akhir,
      jumlah_tegur: jumlahTegur,
      jumlah_tahu_ayat: jumlahTahuAyat,
      jumlah_lupa: jumlahLupa,
      nilai_akhir: nilaiAkhir,
      catatan,
    })
    .select('id, segment_ujian_id, nilai_akhir, tanggal, created_at')
    .single()

  if (insertError) {
    return responseError('Gagal menyimpan nilai ujian', 500)
  }

  return NextResponse.json({ success: true, nilai_akhir: nilaiAkhir, tanggal, data: nilaiBaru })
}
