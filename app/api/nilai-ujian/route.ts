import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../lib/serverAuth'
import { getTanggalWIB } from '../../lib/dateWib'
import { bisaAksesJenisKelas, jenisKelasWingList } from '../../lib/wingAkses'
import { hitungNilaiUjianKeseluruhan, hitungRingkasanJuz, validasiNilaiTajwid } from '../../lib/adminNilaiUjian'

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

type ServiceClient = ReturnType<typeof createServiceRoleClient>

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
  const auth = await authorize(request, ['guru'])
  if ('response' in auth) return auth.response

  const userId = auth.userId
  const serviceClient = createServiceRoleClient()

  // URGENT FIX: akses Nilai Ujian tidak lagi ditentukan oleh santri.guru_id/
  // guru_id_2 (assignment perorangan) -- santri sering berpindah guru/musami'
  // di lapangan, sehingga assignment tersimpan tidak selalu sama dengan guru
  // yang benar-benar menguji. Sekarang memakai WING (profiles.jenis_kelas guru
  // vs santri.jenis_kelas), mapping identik dengan app/api/setoran/route.ts dan
  // RLS current_user_can_access_jenis_kelas -- lihat app/lib/wingAkses.ts.
  // guru_id/guru_id_2 TETAP dipakai, tapi hanya untuk prioritas UI "Santri
  // Saya" (dihitung di client, lihat app/guru/page.tsx), bukan lagi gate akses.
  const { data: callerProfile, error: callerProfileError } = await serviceClient
    .from('profiles')
    .select('jenis_kelas')
    .eq('id', userId)
    .maybeSingle()

  if (callerProfileError) {
    return responseError('Gagal memverifikasi akses', 500)
  }

  const wingList = jenisKelasWingList(callerProfile?.jenis_kelas)
  let santri: SantriScope[] = []
  if (wingList.length > 0) {
    const { data: santriWingData, error: santriError } = await serviceClient
      .from('santri')
      .select('id, nama, kelas, kelas_num, jenjang, jenis_kelas, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
      .eq('status', 'aktif')
      .in('jenis_kelas', wingList)

    if (santriError) {
      return responseError('Gagal memuat cakupan santri', 500)
    }
    santri = (santriWingData || []) as SantriScope[]
  }

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
    if (!santriDipilih) return responseError('Santri ini bukan bagian dari kelas yang Anda tangani', 403)

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

    // Ringkasan Nilai Kelancaran per juz + Nilai Ujian Keseluruhan, dihitung dari helper canonical
    // (app/lib/adminNilaiUjian.ts) memakai nilai yang SUDAH discope ke kalenderAktif.id di atas --
    // supaya klien (InputNilaiUjianSegment) tidak perlu menghitung ulang sendiri dari data lintas
    // periode, dan supaya gating Nilai Tajwid (di bawah + PUT) memakai satu sumber kebenaran yang
    // sama dengan tampilan Nilai Kelancaran.
    const nilaiTerbaruPerSegmenNum = new Map<string, number>()
    nilaiTerakhir.forEach((row, segId) => {
      const nilai = Number((row as { nilai_akhir?: number }).nilai_akhir)
      if (Number.isFinite(nilai)) nilaiTerbaruPerSegmenNum.set(segId, nilai)
    })
    const ringkasanJuz = hitungRingkasanJuz(cakupan, masterSegments, nilaiTerbaruPerSegmenNum)
    const nilaiUjianKeseluruhan = hitungNilaiUjianKeseluruhan(ringkasanJuz)

    // Nilai Tajwid santri ini, discope ke periode ujian aktif yang sama persis dengan Nilai
    // Kelancaran di atas (Rule D -- tidak boleh ada pembacaan Tajwid tanpa scope kalender_id).
    const { data: tajwidRows, error: tajwidError } = await serviceClient
      .from('nilai_tajwid_juz')
      .select('juz, nilai, guru_id, updated_at')
      .eq('santri_id', santriId)
      .eq('kalender_id', kalenderAktif.id)
    if (tajwidError) return responseError('Gagal memuat nilai tajwid', 500)

    const tajwidMap: Record<number, { nilai: number, guru_id: string, updated_at: string }> = {}
    ;(tajwidRows || []).forEach(row => {
      tajwidMap[row.juz] = { nilai: Number(row.nilai), guru_id: row.guru_id, updated_at: row.updated_at }
    })
    // Juz yang seluruh segmennya sudah selesai dinilai pada periode aktif ini tapi belum punya
    // Nilai Tajwid -- termasuk data lama (juz selesai sebelum fitur Tajwid ada). Dipakai UI untuk
    // banner peringatan (Rule D/H) di bagian atas area input santri ini.
    const juzBelumTajwid = ringkasanJuz
      .filter(j => j.status === 'selesai' && !(j.juz in tajwidMap))
      .map(j => j.juz)
      .sort((a, b) => b - a)

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
      ringkasanJuz,
      nilaiUjianKeseluruhan,
      tajwid: tajwidMap,
      juzBelumTajwid,
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

  // Nilai Tajwid seluruh wing, TIDAK difilter kalender_id di sini (sama seperti nilai_ujian di atas)
  // -- klien (RekapNilaiUjianGuru) WAJIB menyaring per kalender_id yang eksplisit dipilih sebelum
  // menghitung ringkasan apa pun (Rule D). Setiap baris membawa kalender_id sendiri sehingga
  // penyaringan itu selalu mungkin dilakukan di sisi klien tanpa request tambahan.
  const { data: tajwidRows, error: tajwidError } = await serviceClient
    .from('nilai_tajwid_juz')
    .select('id, santri_id, juz, kalender_id, nilai, guru_id, updated_at')
    .in('santri_id', santriIds)

  if (tajwidError) {
    return responseError('Gagal memuat nilai tajwid', 500)
  }

  return NextResponse.json({
    success: true,
    data: nilaiUjianDenganSegmen,
    cakupanSantri,
    // Master segmen disertakan sekali di sini supaya rekap bisa menyusun tampilan
    // bertingkat (santri -> juz -> segmen), termasuk segmen yang belum pernah dinilai,
    // tanpa perlu request tambahan per santri.
    masterSegments,
    tajwidList: tajwidRows || [],
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: Request) {
  const auth = await authorize(request, ['guru'])
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
  const userId = auth.userId
  const serviceClient = createServiceRoleClient()

  // URGENT FIX: otorisasi target santri memakai WING (profiles.jenis_kelas
  // guru vs santri.jenis_kelas), bukan lagi santri.guru_id/guru_id_2 -- lihat
  // catatan lengkap di GET di atas dan app/lib/wingAkses.ts.
  const { data: callerProfile, error: callerProfileError } = await serviceClient
    .from('profiles')
    .select('jenis_kelas')
    .eq('id', userId)
    .maybeSingle()

  if (callerProfileError) {
    return responseError('Gagal memverifikasi akses', 500)
  }

  const { data: santriData, error: santriError } = await serviceClient
    .from('santri')
    .select('id, nama, kelas, kelas_num, jenjang, jenis_kelas, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
    .eq('id', santriId)
    .eq('status', 'aktif')
    .maybeSingle()

  if (santriError) {
    return responseError('Gagal memverifikasi data santri', 500)
  }
  if (!santriData || !bisaAksesJenisKelas(callerProfile?.jenis_kelas, santriData.jenis_kelas)) {
    return responseError('Santri ini bukan bagian dari kelas yang Anda tangani', 403)
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
  // Phase B: nilai resmi maksimum 9.5
  const nilaiAkhir = Math.min(9.5, Math.max(5, Math.round(nilaiSebelumBatas * 10) / 10))
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

type TajwidBody = Record<string, unknown> & {
  santri_id?: unknown
  juz?: unknown
  nilai?: unknown
}

// Simpan/edit Nilai Tajwid (satu nilai per santri+juz+kalender_id -- upsert, BUKAN append-only
// seperti nilai_ujian per-segmen). Otorisasi & wing check identik dengan POST di atas. Tajwid
// SELALU disimpan terhadap periode ujian aktif HARI INI (sama seperti Kelancaran per segmen) --
// guru tidak memilih periode sendiri, supaya tidak mungkin Tajwid tersimpan ke periode yang salah.
export async function PUT(request: Request) {
  const auth = await authorize(request, ['guru'])
  if ('response' in auth) return auth.response

  let body: TajwidBody
  try {
    body = await request.json() as TajwidBody
  } catch {
    return responseError('Data nilai tajwid tidak valid', 400)
  }

  const santriId = body.santri_id
  const juz = toNonNegativeInteger(body.juz)
  const nilai = validasiNilaiTajwid(body.nilai)

  if (!isUuid(santriId) || juz === null || juz < 1 || juz > 30 || nilai === null) {
    return responseError('Data nilai tajwid tidak valid', 400)
  }

  const userId = auth.userId
  const serviceClient = createServiceRoleClient()

  // URGENT FIX yang sama seperti GET/POST di atas: otorisasi target santri memakai WING
  // (profiles.jenis_kelas guru vs santri.jenis_kelas), bukan guru_id/guru_id_2.
  const { data: callerProfile, error: callerProfileError } = await serviceClient
    .from('profiles')
    .select('jenis_kelas')
    .eq('id', userId)
    .maybeSingle()

  if (callerProfileError) {
    return responseError('Gagal memverifikasi akses', 500)
  }

  const { data: santriData, error: santriError } = await serviceClient
    .from('santri')
    .select('id, nama, kelas, kelas_num, jenjang, jenis_kelas, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
    .eq('id', santriId)
    .eq('status', 'aktif')
    .maybeSingle()

  if (santriError) {
    return responseError('Gagal memverifikasi data santri', 500)
  }
  if (!santriData || !bisaAksesJenisKelas(callerProfile?.jenis_kelas, santriData.jenis_kelas)) {
    return responseError('Santri ini bukan bagian dari kelas yang Anda tangani', 403)
  }

  const { data: masterData, error: masterError } = await getMasterSegments(serviceClient)
  if (masterError) return responseError('Gagal memuat master segmen ujian', 500)
  const masterSegments = (masterData || []) as unknown as MasterSegment[]
  if (masterSegments.length !== 151) return responseError('Master segmen ujian belum lengkap', 500)

  const cakupan = getCakupanSegment(santriData as SantriScope, masterSegments)
  if (!cakupan.lengkap) {
    return responseError('Data posisi hafalan santri (surah/ayat terakhir) belum lengkap. Silakan hubungi Admin.', 422)
  }
  if (!(String(juz) in cakupan.jumlahSegmenPerJuz)) {
    return responseError('Juz ini belum dapat diujikan untuk santri ini', 400)
  }

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

  // Gating (Rule B/C): Tajwid hanya boleh diisi/diedit setelah SELURUH segmen juz ini selesai
  // dinilai PADA PERIODE AKTIF ini -- reuse hitungRingkasanJuz (canonical, app/lib/adminNilaiUjian)
  // memakai nilai yang di-fetch hanya untuk segmen juz ini (cukup untuk menentukan status juz ini
  // saja, tidak perlu memuat nilai seluruh juz santri).
  const segmentIdsJuz = masterSegments.filter(s => s.juz === juz && cakupan.segmentIds.includes(s.id)).map(s => s.id)
  const { data: nilaiJuzRows, error: nilaiJuzError } = segmentIdsJuz.length > 0
    ? await serviceClient
        .from('nilai_ujian')
        .select('segment_ujian_id, nilai_akhir, tanggal, created_at, id')
        .eq('santri_id', santriId)
        .eq('kalender_id', kalenderAktif.id)
        .in('segment_ujian_id', segmentIdsJuz)
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
    : { data: [], error: null }

  if (nilaiJuzError) {
    return responseError('Gagal memverifikasi status segmen juz', 500)
  }

  const nilaiTerbaruPerSegmenJuz = new Map<string, number>()
  ;(nilaiJuzRows || []).forEach(row => {
    if (row.segment_ujian_id && !nilaiTerbaruPerSegmenJuz.has(row.segment_ujian_id)) {
      const nilaiSegmen = Number(row.nilai_akhir)
      if (Number.isFinite(nilaiSegmen)) nilaiTerbaruPerSegmenJuz.set(row.segment_ujian_id, nilaiSegmen)
    }
  })

  const ringkasanJuz = hitungRingkasanJuz(cakupan, masterSegments, nilaiTerbaruPerSegmenJuz)
  const ringkasanJuzTarget = ringkasanJuz.find(item => item.juz === juz)
  if (!ringkasanJuzTarget || ringkasanJuzTarget.status !== 'selesai') {
    return responseError('Nilai Tajwid hanya dapat diisi setelah seluruh segmen juz ini selesai dinilai', 422)
  }

  const { data: tajwidBaru, error: upsertError } = await serviceClient
    .from('nilai_tajwid_juz')
    .upsert({
      santri_id: santriId,
      juz,
      kalender_id: kalenderAktif.id,
      nilai,
      guru_id: userId,
    }, { onConflict: 'santri_id,juz,kalender_id' })
    .select('id, juz, nilai, guru_id, updated_at')
    .single()

  if (upsertError) {
    return responseError('Gagal menyimpan nilai tajwid', 500)
  }

  return NextResponse.json({ success: true, data: tajwidBaru })
}
