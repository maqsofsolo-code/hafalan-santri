import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../../lib/serverAuth'
import {
  getCakupanSegment,
  hitungRingkasanJuz,
  compareNilaiTerbaru,
  nilaiRapor,
  type MasterSegment,
  type SantriScope,
} from '../../../lib/adminNilaiUjian'
import { buildRaportHifzhWorkbook, type SantriRaport } from '../../../lib/raportHifzhExcel'
import { getWIBDate } from '../../../lib/dateWib'

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

type JenisKelasWali = 'banin' | 'banat' | 'tn'

function jenisKelasUntukWaliKelas(jenisKelas: string | null | undefined): JenisKelasWali | null {
  if (jenisKelas === 'banin') return 'banin'
  if (jenisKelas === 'banat') return 'banat'
  if (jenisKelas === 'tn_a' || jenisKelas === 'tn_b' || jenisKelas === 'tn') return 'tn'
  return null
}

// Wali kelas dicari dari profiles.is_wali_kelas + wali_kelas_num + wali_kelas_jenis -- BUKAN dari
// santri.guru_id/guru_id_2 (Pentasmi'/Guru Musami', peran berbeda). Tidak ada dimensi periode pada
// is_wali_kelas saat ini, jadi ini selalu assignment TERKINI -- keterbatasan model data yang ada.
async function cariNamaWaliKelas(
  adminClient: ReturnType<typeof createServiceRoleClient>,
  kelasNum: number | null | undefined,
  jenisKelasSantri: string | null | undefined,
): Promise<string> {
  const jenisWali = jenisKelasUntukWaliKelas(jenisKelasSantri)
  if (!kelasNum || !jenisWali) return 'Belum ditentukan'

  const { data, error } = await adminClient
    .from('profiles')
    .select('nama')
    .eq('role', 'guru')
    .eq('is_wali_kelas', true)
    .eq('wali_kelas_num', kelasNum)
    .eq('wali_kelas_jenis', jenisWali)

  if (error) {
    console.error(`[nilai-ujian-excel] Gagal memuat wali kelas untuk kelas ${kelasNum} ${jenisWali}:`, error.message)
    return 'Belum ditentukan'
  }
  if (!data || data.length === 0) return 'Belum ditentukan'
  if (data.length > 1) {
    console.warn(`[nilai-ujian-excel] Data wali kelas ganda untuk kelas ${kelasNum} ${jenisWali}: ${data.map(g => g.nama).join(', ')}`)
    return 'Data wali kelas ganda'
  }
  return data[0].nama?.trim() || 'Belum ditentukan'
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
  const kelas = Number(kelasText)

  if (!periode) return responseError('Periode wajib dipilih', 400)
  // Raport Hifzh resmi selalu mewakili satu periode kalender yang jelas tipenya (mid_semester atau
  // semester) -- "Tanpa Periode Kalender" hanya untuk audit data historis di layar rekap, bukan
  // untuk dicetak sebagai raport resmi.
  if (periode === 'tanpa-periode') return responseError('Raport Hifzh resmi tidak dapat diunduh untuk data Tanpa Periode Kalender', 400)
  if (!JENJANG_VALID.has(jenjang as Jenjang)) return responseError('Jenjang wajib dipilih', 400)
  if (!Number.isInteger(kelas) || kelas < 1) return responseError('Kelas wajib dipilih', 400)
  if (!KELOMPOK_VALID.has(kelompok as Kelompok)) return responseError('Kelompok wajib dipilih', 400)

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

  // Wali kelas: satu nama untuk seluruh dokumen kelas ini (kelas+kelompok yang dipilih admin),
  // dicari sekali saja -- bukan per santri, dan bukan dari santri.guru_id/guru_id_2 (Pentasmi').
  const waliKelasNama = await cariNamaWaliKelas(adminClient, kelas, kelompokFinal)
  const tanggalIndonesia = getWIBDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  const santriRaportList: SantriRaport[] = santriList.map(santri => {
    const cakupan = getCakupanSegment(santri, masterSegments)
    const nilaiPerSegmen = nilaiTerbaruPerSantri.get(santri.id) || new Map<string, number>()
    const juzList = cakupan.lengkap ? hitungRingkasanJuz(cakupan, masterSegments, nilaiPerSegmen) : []

    const juzNilai = new Map<number, number | null>()
    juzList.forEach(j => {
      juzNilai.set(j.juz, j.status === 'selesai' ? nilaiRapor(j.rata) : null)
    })

    // Tajwid: skala 0.0-10.0 dikonversi ke skala rapor (50-100) memakai nilaiRapor() yang SAMA
    // dengan Kelancaran (Rule L -- tidak boleh ada skala kedua). Juz yang Tajwid-nya belum diisi
    // TETAP null (bukan 0) -- kolom T pada Excel dibiarkan kosong untuk juz tsb.
    const tajwidSantri = tajwidPerSantri.get(santri.id) || new Map<number, number>()
    const juzTajwid = new Map<number, number | null>()
    juzList.forEach(j => {
      const nilaiTajwid = tajwidSantri.get(j.juz)
      juzTajwid.set(j.juz, typeof nilaiTajwid === 'number' ? nilaiRapor(nilaiTajwid) : null)
    })

    return {
      id: santri.id,
      nama: santri.nama,
      nisn: santri.nisn,
      kelasNum: santri.kelas_num,
      jenjang: santri.jenjang,
      jenisKelas: santri.jenis_kelas,
      juzNilai,
      juzTajwid,
    }
  })

  let buffer: Buffer
  try {
    buffer = await buildRaportHifzhWorkbook({
      santriList: santriRaportList,
      periodeLabel,
      semesterLabel,
      waliKelasNama,
      tanggalIndonesia,
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
