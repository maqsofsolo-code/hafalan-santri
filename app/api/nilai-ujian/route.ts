import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getTanggalWIB } from '../../lib/dateWib'

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

type SegmenTersediaInfo = {
  parsial: boolean
  akhirSurahNomor: number
  akhirAyat: number
}

type CakupanSegment = {
  lengkap: boolean
  segmentIds: string[]
  segmenTersedia: Record<string, SegmenTersediaInfo>
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

// getTanggalWIB dipindah ke app/lib/dateWib.ts (Modularisasi Tahap 2,
// diimpor di atas) -- hasilnya diverifikasi identik dengan implementasi
// lama via scripts/verify-date-wib.mts.

function toNonNegativeInteger(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(numberValue) || numberValue < 0) return null
  return numberValue
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

// Posisi checkpoint dibandingkan satu titik batas (surah, ayat) pada jalur hafalan An-Nas -> Al-Baqarah.
// Nomor surah lebih besar = belum sampai (lebih awal di perjalanan); nomor lebih kecil = sudah lewat.
function posisiRelatif(nomorCheckpoint: number, ayatCheckpoint: number, nomorBatas: number, ayatBatas: number) {
  if (nomorCheckpoint > nomorBatas) return -1
  if (nomorCheckpoint < nomorBatas) return 1
  if (ayatCheckpoint < ayatBatas) return -1
  if (ayatCheckpoint > ayatBatas) return 1
  return 0
}

function getCakupanSegment(santri: SantriScope, masterSegments: MasterSegment[]): CakupanSegment {
  const nomorCheckpoint = Number(santri.surah_terakhir_nomor)
  const ayatCheckpoint = Number(santri.ayat_terakhir)
  const dataKonkret = Number.isInteger(nomorCheckpoint)
    && nomorCheckpoint >= 2
    && nomorCheckpoint <= 114
    && Number.isInteger(ayatCheckpoint)
    && ayatCheckpoint > 0

  if (!dataKonkret) {
    return { lengkap: false, segmentIds: [], segmenTersedia: {}, jumlahSegmenPerJuz: {} }
  }

  // Segmen membentuk satu rantai berurutan (urutan_global) tanpa celah, jadi begitu satu segmen
  // sudah tuntas terlewati, segmen berikutnya otomatis sudah "dimulai" -- tidak perlu gerbang awal
  // terpisah. Berhenti pada segmen pertama yang belum tuntas (itulah batas parsial checkpoint).
  const urut = [...masterSegments].sort((a, b) => a.urutan_global - b.urutan_global)
  const segmenTersedia: Record<string, SegmenTersediaInfo> = {}
  const jumlahSegmenPerJuz: Record<string, number> = {}

  for (const segment of urut) {
    const posisiAkhir = posisiRelatif(nomorCheckpoint, ayatCheckpoint, segment.surah_akhir_nomor, segment.ayat_akhir)
    const parsial = posisiAkhir < 0

    if (!parsial) {
      segmenTersedia[segment.id] = { parsial: false, akhirSurahNomor: segment.surah_akhir_nomor, akhirAyat: segment.ayat_akhir }
    } else if (nomorCheckpoint > segment.surah_awal_nomor) {
      // Beberapa halaman mushaf memuat lebih dari satu surah pendek sehingga batas akhir segmen
      // sebelumnya dan batas awal segmen ini tidak persis bersambung di level ayat. Checkpoint
      // masih di surah yang lebih awal dari surah_awal_nomor segmen ini (celah tersebut) -- pakai
      // batas awal segmen sebagai titik akhir parsial supaya rentang tidak pernah tampil terbalik.
      segmenTersedia[segment.id] = { parsial: true, akhirSurahNomor: segment.surah_awal_nomor, akhirAyat: segment.ayat_awal }
    } else {
      // Checkpoint sudah benar-benar berada di dalam surah awal segmen ini (baik masih di
      // pertengahannya maupun sudah lewat) -- pakai posisi checkpoint apa adanya.
      segmenTersedia[segment.id] = { parsial: true, akhirSurahNomor: nomorCheckpoint, akhirAyat: ayatCheckpoint }
    }

    const key = String(segment.juz)
    jumlahSegmenPerJuz[key] = (jumlahSegmenPerJuz[key] || 0) + 1

    if (parsial) break // segmen ini adalah batas terjauh hafalan santri; segmen berikutnya belum boleh tampil
  }

  return {
    lengkap: true,
    segmentIds: Object.keys(segmenTersedia),
    segmenTersedia,
    jumlahSegmenPerJuz,
  }
}

type KalenderUjianAktif = { id: string, nama: string, tipe: 'mid_semester' | 'semester', semester: number | null }

// Satu sumber kebenaran untuk "periode ujian aktif hari ini", dipakai baik saat guru membaca
// segmen (supaya status sudah/belum dinilai tidak tercampur lintas periode) maupun saat menyimpan
// nilai baru (supaya tidak ada lagi kalender_id NULL atau periode ganda yang dipilih diam-diam).
async function getKalenderUjianAktif(serviceClient: ServiceClient, tanggal: string) {
  const { data, error } = await serviceClient
    .from('kalender_akademik')
    .select('id, nama, tipe, semester')
    .in('tipe', ['mid_semester', 'semester'])
    .lte('tanggal_mulai', tanggal)
    .gte('tanggal_selesai', tanggal)

  if (error) return { error: true as const }
  const rows = (data || []) as KalenderUjianAktif[]
  if (rows.length > 1) return { ganda: true as const }
  return { kalender: rows[0] || null }
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
      return responseError('Data posisi hafalan santri (surah/ayat terakhir) belum lengkap. Silakan hubungi Admin.', 422)
    }

    const tanggalHariIni = getTanggalWIB()
    const kalenderResult = await getKalenderUjianAktif(serviceClient, tanggalHariIni)
    if ('error' in kalenderResult) return responseError('Gagal memverifikasi periode ujian', 500)
    if ('ganda' in kalenderResult) {
      return responseError('Terdapat lebih dari satu periode ujian aktif. Silakan hubungi Admin.', 409)
    }
    const kalenderAktif = kalenderResult.kalender
    if (!kalenderAktif) {
      return responseError('Tidak ada periode ujian hafalan yang aktif hari ini. Silakan hubungi Admin.', 422)
    }

    const segmentTersedia = masterSegments.filter(segment => cakupan.segmentIds.includes(segment.id))
    // Nilai terbaru per segmen wajib di-scope ke kalender_id periode aktif -- tanpa ini, nilai dari
    // periode lain (mis. Semester Gasal) bisa terlihat seolah menjadi nilai aktif periode ini
    // (mis. Mid Semester Gasal) hanya karena lebih baru.
    const { data: nilaiTerakhirData, error: nilaiTerakhirError } = cakupan.segmentIds.length > 0
      ? await serviceClient
          .from('nilai_ujian')
          .select('id, segment_ujian_id, nilai_akhir, tanggal, created_at')
          .eq('santri_id', santriId)
          .eq('kalender_id', kalenderAktif.id)
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

    const adaSegmenParsial = segmentTersedia.some(segment => cakupan.segmenTersedia[segment.id]?.parsial)
    const surahMap = new Map<number, string>()
    if (adaSegmenParsial) {
      const { data: surahData, error: surahError } = await serviceClient.from('surah').select('nomor, nama_latin')
      if (surahError) return responseError('Gagal memuat data surah', 500)
      ;(surahData || []).forEach(item => surahMap.set(item.nomor, item.nama_latin))
    }

    return NextResponse.json({
      success: true,
      santri: santriDipilih,
      kalender: kalenderAktif,
      data: segmentTersedia.map(segment => {
        const info = cakupan.segmenTersedia[segment.id]
        const parsial = info?.parsial || false
        const surahAkhirNomor = parsial ? info.akhirSurahNomor : segment.surah_akhir_nomor
        const ayatAkhir = parsial ? info.akhirAyat : segment.ayat_akhir
        return {
          ...segment,
          parsial,
          surah_akhir_nomor: surahAkhirNomor,
          ayat_akhir: ayatAkhir,
          surah_akhir: parsial
            ? { nomor: surahAkhirNomor, nama_latin: surahMap.get(surahAkhirNomor) || segment.surah_akhir?.nama_latin || '' }
            : segment.surah_akhir,
          nilai_terakhir: nilaiTerakhir.get(segment.id) || null,
        }
      }),
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

  // Segmen ditempelkan manual dari masterSegments (bukan lewat embed PostgREST) supaya
  // baris nilai lama (segment_ujian_id NULL) tidak pernah ikut tersaring oleh join relasi ini.
  const masterSegmentMap = new Map(masterSegments.map(segment => [segment.id, segment]))
  const nilaiUjianDenganSegmen = nilaiUjian.map(item => {
    const row = item as { segment_ujian_id?: string | null }
    return {
      ...row,
      segment: row.segment_ujian_id ? masterSegmentMap.get(row.segment_ujian_id) || null : null,
    }
  })

  const cakupanSantri = Object.fromEntries(santri.map(item => [
    item.id,
    getCakupanSegment(item, masterSegments),
  ]))

  return NextResponse.json({
    success: true,
    data: nilaiUjianDenganSegmen,
    cakupanSantri,
    // Master segmen disertakan sekali di sini supaya rekap bisa menyusun tampilan
    // bertingkat (santri -> juz -> segmen), termasuk segmen yang belum pernah dinilai,
    // tanpa perlu request tambahan per santri.
    masterSegments,
  }, {
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
    return responseError('Data posisi hafalan santri (surah/ayat terakhir) belum lengkap. Silakan hubungi Admin.', 422)
  }
  if (!cakupan.segmentIds.includes(segment.id)) {
    return responseError('Segmen ujian melampaui hafalan santri', 403)
  }

  const segmenInfo = cakupan.segmenTersedia[segment.id]
  const surahSelesaiNomor = segmenInfo?.parsial ? segmenInfo.akhirSurahNomor : segment.surah_akhir_nomor
  const ayatSelesai = segmenInfo?.parsial ? segmenInfo.akhirAyat : segment.ayat_akhir

  const nilaiSebelumBatas = 10 - (jumlahTegur * 0.1) - (jumlahTahuAyat * 0.1) - jumlahLupa
  const nilaiAkhir = Math.max(5, Math.round(nilaiSebelumBatas * 10) / 10)
  const tanggal = getTanggalWIB()
  const kalenderResult = await getKalenderUjianAktif(serviceClient, tanggal)
  if ('error' in kalenderResult) return responseError('Gagal memverifikasi periode ujian', 500)
  if ('ganda' in kalenderResult) {
    return responseError('Terdapat lebih dari satu periode ujian aktif. Silakan hubungi Admin.', 409)
  }
  const kalenderAktif = kalenderResult.kalender
  if (!kalenderAktif) {
    return responseError('Tidak ada periode ujian hafalan yang aktif hari ini. Silakan hubungi Admin.', 422)
  }
  const tipe = kalenderAktif.tipe === 'semester' ? 'semester' : 'mid_semester'

  const { data: nilaiBaru, error: insertError } = await serviceClient
    .from('nilai_ujian')
    .insert({
      santri_id: santriId,
      guru_id: userId,
      kalender_id: kalenderAktif.id,
      segment_ujian_id: segment.id,
      tipe,
      tanggal,
      surah_mulai_nomor: segment.surah_awal_nomor,
      surah_selesai_nomor: surahSelesaiNomor,
      ayat_mulai: segment.ayat_awal,
      ayat_selesai: ayatSelesai,
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
