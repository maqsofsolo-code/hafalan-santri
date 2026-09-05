import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../../lib/serverAuth'
import {
  getCakupanSegment,
  hitungRingkasanJuz,
  hitungNilaiUjianKeseluruhan,
  hitungStatusUjian,
  resolveSantriExamScopes,
  compareNilaiTerbaru,
  nilaiRapor,
  isFullJuzMaster,
  type MasterSegment,
  type SantriScope,
} from '../../../lib/adminNilaiUjian'
import { hitungRankingUjianHafalanKelas, type SantriUjianRankingInput } from '../../../lib/ranking'
import { buildRaportHifzhWorkbook, type SantriRaport, type TandaTanganGambar } from '../../../lib/raportHifzhExcel'
import { getWIBDate } from '../../../lib/dateWib'
import { BUCKET_TANDA_TANGAN_GURU } from '../../../lib/tandaTanganGuru'

type Jenjang = 'ula' | 'wustha' | 'ulya'
type Kelompok = 'banin' | 'banat' | 'tn'

const JENJANG_VALID = new Set<Jenjang>(['ula', 'wustha', 'ulya'])
const KELOMPOK_VALID = new Set<Kelompok>(['banin', 'banat', 'tn'])

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function labelFilterKelompok(kelompok: Kelompok) {
  if (kelompok === 'banin') return 'Banin'
  if (kelompok === 'banat') return 'Banat'
  return 'TN'
}

function labelTipe(tipe: string) {
  if (tipe === 'mid_semester') return 'mid-semester'
  if (tipe === 'semester') return 'semester'
  return tipe
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'raport'
}

// getWIBDate dipindah ke app/lib/dateWib.ts (Modularisasi Tahap 2, diimpor
// di atas) -- hasilnya diverifikasi identik dengan implementasi lama via
// scripts/verify-date-wib.mts.

// Tahap 9P -- Wali Kelas SEKARANG dicari dari wali_kelas_assignment (source of truth resmi, Tahap
// 9B) berdasarkan periode_akademik yang dipilih Admin secara EKSPLISIT (parameter periode_akademik,
// lihat Bagian G laporan Tahap 9P -- kalender_akademik yang menentukan periode UJIAN tidak punya
// mapping ke periode_akademik, jadi TIDAK bisa dipakai untuk menebak periode assignment). Legacy
// profiles.is_wali_kelas/wali_kelas_num/wali_kelas_jenis TIDAK disentuh lagi di sini.
//
// DIHITUNG PER JENIS_KELAS SANTRI (bukan sekali untuk seluruh dokumen) karena kelompok "TN" pada
// layar ini membundel dua kelas fisik (jenis_kelas tn_a & tn_b) yang menurut wali_kelas_assignment
// (domain SANTRI) bisa punya Wali Kelas BERBEDA -- lihat SantriRaport.waliKelasNama.
type WaliKelasInfo = { nama: string, tandaTanganPath: string | null }

async function muatPetaWaliKelas(
  adminClient: ReturnType<typeof createServiceRoleClient>,
  periodeAkademikId: string,
  jenjang: Jenjang,
  kelasNum: number,
  jenisKelasRelevan: string[],
): Promise<Map<string, WaliKelasInfo>> {
  const { data, error } = await adminClient
    .from('wali_kelas_assignment')
    .select('jenis_kelas, guru:guru_id(nama, tanda_tangan_path)')
    .eq('periode_id', periodeAkademikId)
    .eq('jenjang', jenjang)
    .eq('kelas_num', kelasNum)
    .eq('is_aktif', true)
    .in('jenis_kelas', jenisKelasRelevan)

  const peta = new Map<string, WaliKelasInfo>()
  if (error) {
    console.error(`[nilai-ujian-excel] Gagal memuat wali_kelas_assignment untuk periode ${periodeAkademikId} kelas ${kelasNum}:`, error.message)
    return peta
  }
  // Partial unique index wali_kelas_assignment_satu_aktif_per_kelas (periode_id, jenjang, kelas_num,
  // jenis_kelas WHERE is_aktif=true) menjamin maksimal 1 baris per jenis_kelas di sini -- tidak ada
  // kasus "lebih dari satu" yang perlu ditangani, beda dari lookup legacy sebelumnya.
  type BarisWaliKelas = { jenis_kelas: string, guru: { nama: string | null, tanda_tangan_path: string | null } | null }
  ;((data as unknown as BarisWaliKelas[]) || []).forEach(row => {
    const guru = row.guru
    if (!guru) return
    peta.set(row.jenis_kelas, { nama: guru.nama?.trim() || 'Belum ditentukan', tandaTanganPath: guru.tanda_tangan_path || null })
  })
  return peta
}

// Download 1x per path unik (guru yang menjadi wali >1 kelas dalam dokumen yang sama -- kasus TN
// dengan guru sama di tn_a & tn_b -- tidak men-download file yang sama berulang). Kegagalan download
// (mis. file storage hilang) TIDAK menggagalkan generate raport (Rule H) -- diperlakukan sama seperti
// guru tanpa tanda tangan sama sekali.
async function muatBufferTandaTangan(
  adminClient: ReturnType<typeof createServiceRoleClient>,
  pathList: string[],
): Promise<Map<string, TandaTanganGambar>> {
  const hasil = new Map<string, TandaTanganGambar>()
  const pathUnik = [...new Set(pathList)]
  await Promise.all(pathUnik.map(async path => {
    const extension = path.toLowerCase().endsWith('.png') ? 'png' : path.toLowerCase().endsWith('.jpeg') || path.toLowerCase().endsWith('.jpg') ? 'jpeg' : null
    if (!extension) return
    const { data, error } = await adminClient.storage.from(BUCKET_TANDA_TANGAN_GURU).download(path)
    if (error || !data) {
      console.error(`[nilai-ujian-excel] Gagal memuat file tanda tangan ${path}:`, error?.message)
      return
    }
    const buffer = Buffer.from(await data.arrayBuffer())
    hasil.set(path, { buffer, extension })
  }))
  return hasil
}

export async function GET(request: Request) {
  const auth = await authorize(request, ['admin'])
  if (auth.response) return auth.response
  const adminClient = createServiceRoleClient()

  const url = new URL(request.url)
  const periode = url.searchParams.get('periode') || ''
  const jenjang = url.searchParams.get('jenjang') || ''
  const kelasText = url.searchParams.get('kelas') || ''
  const kelompok = url.searchParams.get('kelompok') || ''
  const periodeAkademik = url.searchParams.get('periode_akademik') || ''
  const kelas = Number(kelasText)

  if (!periode) return responseError('Periode wajib dipilih', 400)
  // Raport Hifzh resmi selalu mewakili satu periode kalender yang jelas tipenya (mid_semester atau
  // semester) -- "Tanpa Periode Kalender" hanya untuk audit data historis di layar rekap, bukan
  // untuk dicetak sebagai raport resmi.
  if (periode === 'tanpa-periode') return responseError('Raport Hifzh resmi tidak dapat diunduh untuk data Tanpa Periode Kalender', 400)
  if (!JENJANG_VALID.has(jenjang as Jenjang)) return responseError('Jenjang wajib dipilih', 400)
  if (!Number.isInteger(kelas) || kelas < 1) return responseError('Kelas wajib dipilih', 400)
  if (!KELOMPOK_VALID.has(kelompok as Kelompok)) return responseError('Kelompok wajib dipilih', 400)
  // Tahap 9P -- Periode Akademik WAJIB dipilih eksplisit oleh Admin (selector terpisah dari Periode
  // ujian di atas), dipakai HANYA untuk menentukan Wali Kelas dari wali_kelas_assignment. TIDAK
  // diturunkan/ditebak dari `periode` (kalender_akademik) -- kedua entitas itu independen, lihat
  // Bagian G laporan Tahap 9P.
  if (!periodeAkademik) return responseError('Periode Akademik (untuk Wali Kelas) wajib dipilih', 400)

  const jenjangFinal = jenjang as Jenjang
  const kelompokFinal = kelompok as Kelompok

  // Tipe ujian tidak lagi diterima dari frontend -- diturunkan di server dari kalender_akademik
  // yang dipilih, supaya tidak mungkin lagi terjadi kombinasi kontradiktif seperti "Semester Genap"
  // dipasangkan dengan tipe "Mid Semester".
  const { data: kalender, error: kalenderError } = await adminClient
    .from('kalender_akademik')
    .select('id, nama, tipe, tanggal_mulai, semester')
    .eq('id', periode)
    .maybeSingle()
  if (kalenderError) return responseError('Gagal memuat data periode', 500)
  if (!kalender) return responseError('Periode tidak ditemukan', 404)
  if (kalender.tipe !== 'mid_semester' && kalender.tipe !== 'semester') {
    return responseError('Periode ini bukan periode ujian (mid semester/semester)', 400)
  }
  const periodeInfo = kalender
  const tipe = kalender.tipe

  let santriQuery = adminClient
    .from('santri')
    .select('id, nama, kelas, kelas_num, jenjang, jenis_kelas, nisn, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
    .eq('status', 'aktif')
    .eq('jenjang', jenjangFinal)
    .eq('kelas_num', kelas)
  santriQuery = kelompokFinal === 'tn'
    ? santriQuery.in('jenis_kelas', ['tn_a', 'tn_b'])
    : santriQuery.eq('jenis_kelas', kelompokFinal)

  const { data: santriData, error: santriError } = await santriQuery.order('nama', { ascending: true })
  if (santriError) return responseError('Gagal memuat data santri', 500)

  const santriList = (santriData || []) as (SantriScope & { nisn: string | null })[]
  if (santriList.length === 0) {
    return responseError('Tidak ada santri aktif pada kombinasi jenjang, kelas, dan kelompok ini', 404)
  }

  const { data: masterData, error: masterError } = await adminClient
    .from('master_segment_ujian')
    .select('id, juz, segmen, urutan_global, halaman_awal, halaman_akhir, jumlah_halaman, surah_awal_nomor, ayat_awal, surah_akhir_nomor, ayat_akhir, is_aktif')
    .eq('is_aktif', true)
    .order('urutan_global', { ascending: true })
  if (masterError) return responseError('Gagal memuat master segmen ujian', 500)
  const masterSegments = (masterData || []) as unknown as MasterSegment[]
  if (masterSegments.length !== 151) return responseError('Master segmen ujian belum lengkap', 500)

  const santriIds = santriList.map(item => item.id)
  const nilaiQuery = adminClient
    .from('nilai_ujian')
    .select('id, santri_id, segment_ujian_id, tanggal, created_at, nilai_akhir')
    .in('santri_id', santriIds)
    .not('segment_ujian_id', 'is', null)
    .eq('tipe', tipe)
    .eq('kalender_id', periode)

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

  const nilaiTerbaruPerSantri = new Map<string, Map<string, number>>()
  terbaruPerKey.forEach(row => {
    if (!nilaiTerbaruPerSantri.has(row.santri_id)) nilaiTerbaruPerSantri.set(row.santri_id, new Map())
    nilaiTerbaruPerSantri.get(row.santri_id)!.set(row.segment_ujian_id, Number(row.nilai_akhir))
  })

  // Nilai Tajwid, discope ke periode (kalender_id) yang sama persis dengan Kelancaran di atas.
  const { data: tajwidRows, error: tajwidError } = await adminClient
    .from('nilai_tajwid_juz')
    .select('santri_id, juz, nilai')
    .in('santri_id', santriIds)
    .eq('kalender_id', periode)
  if (tajwidError) return responseError('Gagal memuat nilai tajwid', 500)

  const tajwidPerSantri = new Map<string, Map<number, number>>()
  ;(tajwidRows || []).forEach(row => {
    if (!tajwidPerSantri.has(row.santri_id)) tajwidPerSantri.set(row.santri_id, new Map())
    tajwidPerSantri.get(row.santri_id)!.set(row.juz, Number(row.nilai))
  })

  // Label periode dan semester berasal dari data kalender itu sendiri -- bukan tebakan dari bulan
  // tanggal_mulai (heuristik lama bisa salah, mis. kalender "Semester Genap" yang tanggal_mulai-nya
  // jatuh di bulan Juli-Desember akan salah dilabeli GANJIL).
  const tahunMulai = periodeInfo?.tanggal_mulai ? Number(periodeInfo.tanggal_mulai.slice(0, 4)) : new Date().getFullYear()
  const bulanMulai = periodeInfo?.tanggal_mulai ? Number(periodeInfo.tanggal_mulai.slice(5, 7)) : new Date().getMonth() + 1
  const tahunAjaranAwal = bulanMulai >= 7 ? tahunMulai : tahunMulai - 1
  const tahunAjaranFallback = `${tahunAjaranAwal}/${tahunAjaranAwal + 1}`
  const periodeLabel = periodeInfo?.nama?.trim() || tahunAjaranFallback
  const semesterLabel = periodeInfo?.semester === 1 ? 'GASAL' : periodeInfo?.semester === 2 ? 'GENAP' : '-'

  // Wali Kelas (Tahap 9P): satu query untuk seluruh jenis_kelas relevan pada kelompok yang dipilih
  // admin -- 1 baris untuk banin/banat, sampai 2 baris (tn_a + tn_b, berpotensi guru BERBEDA) untuk
  // kelompok TN. Diambil dari wali_kelas_assignment + periode_akademik eksplisit (BUKAN
  // is_wali_kelas/wali_kelas_num/wali_kelas_jenis legacy, BUKAN ditebak dari `periode` kalender_akademik).
  const jenisKelasRelevan = kelompokFinal === 'tn' ? ['tn_a', 'tn_b'] : [kelompokFinal]
  const petaWaliKelas = await muatPetaWaliKelas(adminClient, periodeAkademik, jenjangFinal, kelas, jenisKelasRelevan)
  const bufferTandaTanganPerPath = await muatBufferTandaTangan(
    adminClient,
    [...petaWaliKelas.values()].map(info => info.tandaTanganPath).filter((p): p is string => Boolean(p))
  )
  const tanggalIndonesia = getWIBDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  // Tahap 1: Resolusi cakupan awal ujian santri (Phase C: snapshot / rekonstruksi Gasal / fallback).
  // Hitung Kelancaran/Tajwid per juz + Nilai Ujian Keseluruhan (skala 0-10, denominator seluruh required juz).
  // Juz incomplete bernilai 0 (khusus, tidak difloor ke 50).
  const scopeResult = await resolveSantriExamScopes(adminClient, santriList, periode, periodeInfo?.tanggal_mulai)
  if (scopeResult.status === 'CAKUPAN_BELUM_DIKUNCI') {
    return responseError('Cakupan ujian untuk periode ini belum dikunci oleh Admin.', 422)
  }
  const resolvedSantriList = scopeResult.scopes
  const santriKomputasi = resolvedSantriList.map(santri => {
    const cakupan = getCakupanSegment(santri, masterSegments)
    const nilaiPerSegmen = nilaiTerbaruPerSantri.get(santri.id) || new Map<string, number>()
    const juzList = (cakupan.lengkap || nilaiPerSegmen.size > 0) ? hitungRingkasanJuz(cakupan, masterSegments, nilaiPerSegmen) : []
    const statusUjian = hitungStatusUjian(juzList)

    const juzNilai = new Map<number, number | null>()
    const juzTajwid = new Map<number, number | null>()
    const juzIncomplete = new Set<number>()

    const tajwidSantri = tajwidPerSantri.get(santri.id) || new Map<number, number>()

    juzList.forEach(j => {
      const isFull = isFullJuzMaster(j.juz, j.target, masterSegments)
      // Gunakan nilai rata-rata Rapot yang sudah dihitung secara proporsional (e.g. Idris Juz 27 = 31)
      juzNilai.set(j.juz, nilaiRapor(j.rataRaport))
      const nilaiTajwid = tajwidSantri.get(j.juz)
      if (typeof nilaiTajwid === 'number') {
        juzTajwid.set(j.juz, nilaiRapor(nilaiTajwid))
      } else if (isFull) {
        juzTajwid.set(j.juz, 0)
      } else {
        juzTajwid.set(j.juz, null)
      }
      if (j.status !== 'selesai') {
        juzIncomplete.add(j.juz)
      }
    })

    return {
      santri,
      cakupan,
      nilaiPerSegmen,
      juzNilai,
      juzTajwid,
      juzIncomplete,
      statusUjian,
      nilaiUjianKeseluruhan: hitungNilaiUjianKeseluruhan(juzList, { isFinal: true }),
    }
  })

  // Tahap 2: Peringkat Kelas dihitung SEKALI untuk seluruh kelas (Rule G -- hindari N+1), reuse
  // hitungRankingUjianHafalanKelas() dari app/lib/ranking.ts apa adanya (rumus & tie-breaker TIDAK
  // diubah/diduplikasi di sini). Class scope = jenjang+kelas_num+jenis_kelas (santriQuery di atas)
  // + kalender_id (periode, sudah discope sejak nilaiQuery/tajwidPerSantri) -- identik dengan scope
  // /api/ranking-ujian-hafalan. santriList di sini SUDAH seluruh santri aktif kelas ini (bukan
  // subset), jadi MAX(total_hafalan_juz) dan status FINAL otomatis benar (Rule C/D/E).
  const santriRankingInput: SantriUjianRankingInput[] = santriKomputasi.map(({ santri, nilaiUjianKeseluruhan }) => ({
    id: santri.id,
    nama: santri.nama,
    total_hafalan_juz: santri.total_hafalan_juz,
    nilaiUjianKeseluruhan,
  }))
  const { peringkat, belumAdaHasil } = hitungRankingUjianHafalanKelas(santriRankingInput)
  // Denominator Raport Hifzh ("Y") SELALU jumlah santri yang SUDAH eligible (peringkat.length),
  // BUKAN total santri kelas -- santri belumAdaHasil tidak pernah masuk penyebut, baik saat
  // ranking masih sementara maupun sudah final (Rule B "PENTING"). Saat seluruh santri sudah
  // eligible, peringkat.length otomatis sama dengan jumlah santri kelas -- tidak perlu field
  // terpisah untuk itu. Status Sementara/Final murni derivasi dari jumlahBelumAdaHasil > 0.
  const jumlahSantriEligible = peringkat.length
  const jumlahBelumAdaHasilKelas = belumAdaHasil.length
  const peringkatMap = new Map<string, number>(peringkat.map(s => [s.id, s.peringkat]))

  const santriRaportList: SantriRaport[] = santriKomputasi.map(({ santri, cakupan, nilaiPerSegmen, juzNilai, juzTajwid, juzIncomplete, statusUjian }) => {
    // Per-santri (bukan per-dokumen): jenis_kelas SANTRI ('banin'/'banat'/'tn_a'/'tn_b') dicocokkan
    // langsung ke jenis_kelas wali_kelas_assignment -- lihat catatan SantriRaport.waliKelasNama.
    const waliInfo = petaWaliKelas.get(santri.jenis_kelas || '')
    const tandaTangan = waliInfo?.tandaTanganPath ? bufferTandaTanganPerPath.get(waliInfo.tandaTanganPath) ?? null : null
    return {
      id: santri.id,
      nama: santri.nama,
      nisn: santri.nisn,
      kelasNum: santri.kelas_num,
      jenjang: santri.jenjang,
      jenisKelas: santri.jenis_kelas,
      juzNilai,
      juzTajwid,
      juzIncomplete,
      statusUjian,
      peringkatKelas: peringkatMap.get(santri.id) ?? null,
      jumlahSantriEligible,
      jumlahBelumAdaHasil: jumlahBelumAdaHasilKelas,
      waliKelasNama: waliInfo?.nama || 'Belum ditentukan',
      tandaTangan,
      segmentIdsWajib: new Set<string>(cakupan.segmentIds),
      nilaiPerSegmen,
    }
  })

  let buffer: Buffer
  try {
    buffer = await buildRaportHifzhWorkbook({
      santriList: santriRaportList,
      periodeLabel,
      semesterLabel,
      tanggalIndonesia,
      masterSegments,
    })
  } catch {
    return responseError('Gagal membentuk file raport dari template', 500)
  }

  const kelasLabel = santriList[0]?.kelas || `Kelas ${kelas}`
  const filename = `raport-hifzh-${slugify(kelasLabel)}-${slugify(labelFilterKelompok(kelompokFinal))}-${labelTipe(tipe)}-${tahunAjaranAwal}.xlsx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
