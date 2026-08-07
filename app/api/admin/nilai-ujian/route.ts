import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  getCakupanSegment,
  hitungRingkasanJuz,
  compareNilaiTerbaru,
  type MasterSegment,
  type SantriScope,
} from '../../../lib/adminNilaiUjian'

type Jenjang = 'ula' | 'wustha' | 'ulya'
type Kelompok = 'banin' | 'banat' | 'tn'

const JENJANG_VALID = new Set<Jenjang>(['ula', 'wustha', 'ulya'])
const KELOMPOK_VALID = new Set<Kelompok>(['banin', 'banat', 'tn'])

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

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

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

async function authorizeAdmin(request: Request) {
  const authorization = request.headers.get('authorization')
  const bearerMatch = authorization?.match(/^Bearer\s+(\S+)$/i)
  if (!bearerMatch) return { response: responseError('Sesi login tidak valid atau sudah berakhir. Silakan login kembali.', 401) }

  const accessToken = bearerMatch[1]
  const supabaseAuthenticated = createAuthenticatedClient(accessToken)
  const { data: userData, error: userError } = await supabaseAuthenticated.auth.getUser(accessToken)
  if (userError || !userData.user) return { response: responseError('Sesi login tidak valid atau sudah berakhir. Silakan login kembali.', 401) }

  const { data: profile, error: profileError } = await supabaseAuthenticated
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()
  // Bedakan "gagal memverifikasi" (masalah server/koneksi) dari "terverifikasi bukan admin" --
  // sebelumnya keduanya sama-sama dilaporkan sebagai 403 "Akses ditolak", yang menyesatkan admin
  // sungguhan saat penyebabnya sebenarnya galat sementara pada query profiles, bukan izin akses.
  if (profileError) return { response: responseError('Gagal memverifikasi akses. Coba lagi.', 500) }
  if (profile?.role !== 'admin') return { response: responseError('Akun ini tidak memiliki akses Admin.', 403) }

  return { userId: userData.user.id, adminClient: createAdminClient() }
}

async function getMasterSegments(adminClient: ReturnType<typeof createAdminClient>) {
  return adminClient
    .from('master_segment_ujian')
    .select(`
      id, juz, segmen, urutan_global, halaman_awal, halaman_akhir, jumlah_halaman,
      surah_awal_nomor, ayat_awal, surah_akhir_nomor, ayat_akhir, is_aktif,
      surah_awal:surah!master_segment_ujian_surah_awal_nomor_fkey(nomor, nama_latin),
      surah_akhir:surah!master_segment_ujian_surah_akhir_nomor_fkey(nomor, nama_latin)
    `)
    .eq('is_aktif', true)
    .order('urutan_global', { ascending: true })
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

export async function GET(request: Request) {
  const auth = await authorizeAdmin(request)
  if ('response' in auth) return auth.response
  const { adminClient } = auth

  const url = new URL(request.url)
  const santriId = url.searchParams.get('santri_id')

  const { data: masterData, error: masterError } = await getMasterSegments(adminClient)
  if (masterError) return responseError('Gagal memuat master segmen ujian', 500)
  const masterSegments = (masterData || []) as unknown as MasterSegment[]
  if (masterSegments.length !== 151) return responseError('Master segmen ujian belum lengkap', 500)

  // ===== Mode detail: satu santri (Tingkat 2 & 3) =====
  if (santriId !== null) {
    if (!isUuid(santriId)) return responseError('Data santri tidak valid', 400)

    const { data: santriData, error: santriError } = await adminClient
      .from('santri')
      .select('id, nama, kelas, kelas_num, jenjang, jenis_kelas, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
      .eq('id', santriId)
      .maybeSingle()
    if (santriError) return responseError('Gagal memuat data santri', 500)
    if (!santriData) return responseError('Santri tidak ditemukan', 404)

    // Periode di-scope sama seperti mode daftar (Tingkat 1) supaya nilai aktif dan status juz
    // pada drill-down tidak pernah mencampur periode lain, konsisten dengan filter yang dipakai
    // admin untuk sampai ke santri ini. Tipe tidak lagi diterima sebagai filter terpisah -- setiap
    // kalender_id sudah punya tepat satu tipe (lihat kolom kalender_akademik.tipe), jadi menyaring
    // berdasarkan kalender_id saja sudah cukup dan tidak mungkin menghasilkan kombinasi kontradiktif
    // seperti "Semester Genap" + "Mid Semester".
    const periodeDetail = url.searchParams.get('periode')
    let nilaiDetailQuery = adminClient
      .from('nilai_ujian')
      .select(`
        id, santri_id, guru_id, kalender_id, segment_ujian_id, tanggal, tipe,
        surah_mulai_nomor, surah_selesai_nomor, ayat_mulai, ayat_selesai,
        jumlah_tegur, jumlah_tahu_ayat, jumlah_lupa, nilai_akhir, catatan, created_at,
        guru:guru_id(id, nama),
        surah_mulai:surah_mulai_nomor(nomor, nama_latin),
        surah_selesai:surah_selesai_nomor(nomor, nama_latin),
        kalender:kalender_id(id, nama, tipe, tanggal_mulai, tanggal_selesai)
      `)
      .eq('santri_id', santriId)
    if (periodeDetail) {
      nilaiDetailQuery = periodeDetail === 'tanpa-periode'
        ? nilaiDetailQuery.is('kalender_id', null)
        : nilaiDetailQuery.eq('kalender_id', periodeDetail)
    }

    const { data: nilaiRows, error: nilaiError } = await nilaiDetailQuery
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })

    if (nilaiError) return responseError('Gagal memuat nilai ujian santri', 500)

    const masterSegmentMap = new Map(masterSegments.map(segment => [segment.id, segment]))
    const nilaiDenganSegmen = (nilaiRows || []).map(row => ({
      ...row,
      segment: row.segment_ujian_id ? masterSegmentMap.get(row.segment_ujian_id) || null : null,
    }))

    const cakupan = getCakupanSegment(santriData as SantriScope, masterSegments)

    return NextResponse.json({
      success: true,
      santri: santriData,
      data: nilaiDenganSegmen,
      cakupan,
      masterSegments,
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // ===== Mode daftar: Tingkat 1 (paginasi server-side) =====
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get('pageSize') || '20', 10) || 20))
  const periode = url.searchParams.get('periode') || 'semua'
  const jenjang = url.searchParams.get('jenjang') || 'semua'
  const kelasParam = url.searchParams.get('kelas') || 'semua'
  const kelompok = url.searchParams.get('kelompok') || 'semua'
  const search = (url.searchParams.get('search') || '').trim()

  if (jenjang !== 'semua' && !JENJANG_VALID.has(jenjang as Jenjang)) return responseError('Jenjang tidak valid', 400)
  if (kelompok !== 'semua' && !KELOMPOK_VALID.has(kelompok as Kelompok)) return responseError('Kelompok tidak valid', 400)

  let santriQuery = adminClient
    .from('santri')
    .select('id, nama, kelas, kelas_num, jenjang, jenis_kelas, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir', { count: 'exact' })
    .eq('status', 'aktif')
  if (jenjang !== 'semua') santriQuery = santriQuery.eq('jenjang', jenjang)
  if (kelasParam !== 'semua') {
    const kelasNum = Number(kelasParam)
    if (!Number.isInteger(kelasNum)) return responseError('Kelas tidak valid', 400)
    santriQuery = santriQuery.eq('kelas_num', kelasNum)
  }
  if (kelompok !== 'semua') {
    santriQuery = kelompok === 'tn'
      ? santriQuery.in('jenis_kelas', ['tn_a', 'tn_b'])
      : santriQuery.eq('jenis_kelas', kelompok)
  }
  if (search) santriQuery = santriQuery.ilike('nama', `%${search}%`)

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const { data: santriPage, error: santriError, count } = await santriQuery
    .order('nama', { ascending: true })
    .range(from, to)

  if (santriError) return responseError('Gagal memuat daftar santri', 500)

  const santriList = (santriPage || []) as SantriScope[]
  const santriIds = santriList.map(item => item.id)

  const nilaiTerbaruPerSantriSegmen = new Map<string, Map<string, number>>()
  if (santriIds.length > 0) {
    let nilaiQuery = adminClient
      .from('nilai_ujian')
      .select('id, santri_id, segment_ujian_id, tanggal, created_at, nilai_akhir, kalender_id, tipe')
      .in('santri_id', santriIds)
      .not('segment_ujian_id', 'is', null)
    // Tidak lagi menerima filter tipe terpisah -- satu kalender_id sudah selalu berkorespondensi
    // dengan tepat satu tipe ujian, jadi menyaring dari kalender_id saja sudah cukup.
    if (periode === 'tanpa-periode') nilaiQuery = nilaiQuery.is('kalender_id', null)
    else if (periode !== 'semua') nilaiQuery = nilaiQuery.eq('kalender_id', periode)

    const { data: nilaiRows, error: nilaiError } = await nilaiQuery
    if (nilaiError) return responseError('Gagal memuat nilai ujian', 500)

    type NilaiRow = { santri_id: string, segment_ujian_id: string, tanggal: string | null, created_at: string | null, id: string, nilai_akhir: number }
    const terbaruPerKey = new Map<string, NilaiRow>()
    ;[...(nilaiRows || []) as NilaiRow[]]
      .sort(compareNilaiTerbaru)
      .forEach(row => {
        const key = `${row.santri_id}|${row.segment_ujian_id}`
        if (!terbaruPerKey.has(key)) terbaruPerKey.set(key, row)
      })

    terbaruPerKey.forEach(row => {
      if (!nilaiTerbaruPerSantriSegmen.has(row.santri_id)) nilaiTerbaruPerSantriSegmen.set(row.santri_id, new Map())
      nilaiTerbaruPerSantriSegmen.get(row.santri_id)!.set(row.segment_ujian_id, Number(row.nilai_akhir))
    })
  }

  // Periode lama (mis. Mid Semester 1 2026/2027, sebelum sistem juz/segmen ada) hanya berisi nilai
  // "format lama" (segment_ujian_id NULL) yang tidak ikut dihitung ke progres juz di atas. Tanpa
  // penanda ini, santri yang sebenarnya sudah diuji akan salah tertampil sebagai "Belum ada nilai
  // ujian" hanya karena datanya berformat lama -- padahal tetap bisa dilihat lewat drill-down.
  const santriDenganFormatLama = new Set<string>()
  if (santriIds.length > 0) {
    let formatLamaQuery = adminClient
      .from('nilai_ujian')
      .select('santri_id')
      .in('santri_id', santriIds)
      .is('segment_ujian_id', null)
    if (periode === 'tanpa-periode') formatLamaQuery = formatLamaQuery.is('kalender_id', null)
    else if (periode !== 'semua') formatLamaQuery = formatLamaQuery.eq('kalender_id', periode)

    const { data: formatLamaRows, error: formatLamaError } = await formatLamaQuery
    if (formatLamaError) return responseError('Gagal memuat nilai ujian format lama', 500)
    ;(formatLamaRows || []).forEach(row => santriDenganFormatLama.add(row.santri_id))
  }

  const data = santriList.map(santri => {
    const cakupan = getCakupanSegment(santri, masterSegments)
    const nilaiPerSegmen = nilaiTerbaruPerSantriSegmen.get(santri.id) || new Map<string, number>()
    const juzList = cakupan.lengkap ? hitungRingkasanJuz(cakupan, masterSegments, nilaiPerSegmen) : []
    const juzDimulai = juzList.filter(j => j.status !== 'belum_dimulai').length
    const juzSelesai = juzList.filter(j => j.status === 'selesai').length
    const juzSelesaiRata = juzList.filter(j => j.status === 'selesai' && j.rata !== null)
    const rataUmum = juzSelesaiRata.length > 0
      ? juzSelesaiRata.reduce((sum, j) => sum + (j.rata || 0), 0) / juzSelesaiRata.length
      : null

    return {
      id: santri.id,
      nama: santri.nama,
      kelas: santri.kelas,
      kelas_num: santri.kelas_num,
      jenjang: santri.jenjang,
      jenis_kelas: santri.jenis_kelas,
      juzDimulai,
      juzSelesai,
      rataUmum,
      adaFormatLama: santriDenganFormatLama.has(santri.id),
    }
  })

  const { data: periodeData } = await adminClient
    .from('kalender_akademik')
    .select('id, nama, tipe')
    .in('tipe', ['mid_semester', 'semester'])
    .order('tanggal_mulai', { ascending: true })

  return NextResponse.json({
    success: true,
    data,
    total: count || 0,
    page,
    pageSize,
    periodeOptions: periodeData || [],
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(request: Request) {
  const auth = await authorizeAdmin(request)
  if ('response' in auth) return auth.response
  const { adminClient } = auth

  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return responseError('Data tidak valid', 400)
  }

  const id = body.id
  const jumlahTegur = toNonNegativeInteger(body.jumlah_tegur)
  const jumlahTahuAyat = toNonNegativeInteger(body.jumlah_tahu_ayat)
  const jumlahLupa = toNonNegativeInteger(body.jumlah_lupa)

  if (!isUuid(id) || jumlahTegur === null || jumlahTahuAyat === null || jumlahLupa === null) {
    return responseError('Data nilai ujian tidak valid', 400)
  }

  const catatan = typeof body.catatan === 'string' && body.catatan.trim()
    ? body.catatan.trim().slice(0, 2000)
    : null

  const { data: existing, error: existingError } = await adminClient
    .from('nilai_ujian')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (existingError) return responseError('Gagal memverifikasi nilai ujian', 500)
  if (!existing) return responseError('Nilai ujian tidak ditemukan', 404)

  const nilaiSebelumBatas = 10 - (jumlahTegur * 0.1) - (jumlahTahuAyat * 0.1) - jumlahLupa
  const nilaiAkhir = Math.min(10, Math.max(5, Math.round(nilaiSebelumBatas * 10) / 10))

  const { data: updated, error: updateError } = await adminClient
    .from('nilai_ujian')
    .update({
      jumlah_tegur: jumlahTegur,
      jumlah_tahu_ayat: jumlahTahuAyat,
      jumlah_lupa: jumlahLupa,
      catatan,
      nilai_akhir: nilaiAkhir,
    })
    .eq('id', id)
    .select('id, jumlah_tegur, jumlah_tahu_ayat, jumlah_lupa, catatan, nilai_akhir')
    .single()

  if (updateError) return responseError('Gagal menyimpan perubahan nilai', 500)

  return NextResponse.json({ success: true, data: updated })
}
