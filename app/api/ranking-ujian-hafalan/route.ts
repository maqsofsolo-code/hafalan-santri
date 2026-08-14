import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../lib/serverAuth'
import {
  getCakupanSegment,
  hitungRingkasanJuz,
  hitungNilaiUjianKeseluruhan,
  type MasterSegment,
  type SantriScope,
} from '../../lib/adminNilaiUjian'
import { hitungRankingUjianHafalanKelas, type SantriUjianRankingInput } from '../../lib/ranking'

// Peringkat Ujian Hafalan per kelas (Rule J-K dari spesifikasi bisnis) -- ranking BARU, terpisah
// dari Total Hafalan/Konsistensi/Semangat (app/lib/ranking.ts, TIDAK diubah oleh endpoint ini).
// Diturunkan dari nilai_ujian + nilai_tajwid_juz (Tajwid dimuat TIDAK dipakai formula, hanya untuk
// konteks), sehingga endpoint ini SENGAJA hanya untuk admin & kepsek -- Wali tidak boleh mengakses
// nilai_ujian mentah sama sekali (keputusan bisnis final, lihat migration RLS nilai_ujian).

type Jenjang = 'ula' | 'wustha' | 'ulya'
type Kelompok = 'banin' | 'banat' | 'tn'

const JENJANG_VALID = new Set<Jenjang>(['ula', 'wustha', 'ulya'])
const KELOMPOK_VALID = new Set<Kelompok>(['banin', 'banat', 'tn'])

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: Request) {
  const auth = await authorize(request, ['admin', 'kepsek'])
  if ('response' in auth) return auth.response
  const serviceClient = createServiceRoleClient()

  const url = new URL(request.url)
  const periode = url.searchParams.get('periode') || ''
  const jenjang = url.searchParams.get('jenjang') || ''
  const kelasText = url.searchParams.get('kelas') || ''
  const kelompok = url.searchParams.get('kelompok') || ''
  const kelas = Number(kelasText)

  if (!periode || periode === 'tanpa-periode') {
    return responseError('Periode ujian wajib dipilih', 400)
  }
  if (!JENJANG_VALID.has(jenjang as Jenjang)) return responseError('Jenjang wajib dipilih', 400)
  if (!Number.isInteger(kelas) || kelas < 1) return responseError('Kelas wajib dipilih', 400)
  if (!KELOMPOK_VALID.has(kelompok as Kelompok)) return responseError('Kelompok wajib dipilih', 400)

  const jenjangFinal = jenjang as Jenjang
  const kelompokFinal = kelompok as Kelompok

  const { data: kalender, error: kalenderError } = await serviceClient
    .from('kalender_akademik')
    .select('id, nama, tipe')
    .eq('id', periode)
    .maybeSingle()
  if (kalenderError) return responseError('Gagal memuat data periode', 500)
  if (!kalender) return responseError('Periode tidak ditemukan', 404)
  if (kalender.tipe !== 'mid_semester' && kalender.tipe !== 'semester') {
    return responseError('Periode ini bukan periode ujian (mid semester/semester)', 400)
  }

  // Identitas kelas untuk ranking: jenjang + kelas_num + jenis_kelas (Rule I/J -- Ula 1 Banin
  // BERBEDA dari Ula 1 Banat, sama seperti definisi kelas yang sudah dipakai di seluruh aplikasi).
  let santriQuery = serviceClient
    .from('santri')
    .select('id, nama, kelas, kelas_num, jenjang, jenis_kelas, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
    .eq('status', 'aktif')
    .eq('jenjang', jenjangFinal)
    .eq('kelas_num', kelas)
  santriQuery = kelompokFinal === 'tn'
    ? santriQuery.in('jenis_kelas', ['tn_a', 'tn_b'])
    : santriQuery.eq('jenis_kelas', kelompokFinal)

  const { data: santriData, error: santriError } = await santriQuery.order('nama', { ascending: true })
  if (santriError) return responseError('Gagal memuat data santri', 500)
  const santriList = (santriData || []) as SantriScope[]

  if (santriList.length === 0) {
    return NextResponse.json({
      success: true,
      kalender,
      peringkat: [],
      belumAdaHasil: [],
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const { data: masterData, error: masterError } = await serviceClient
    .from('master_segment_ujian')
    .select('id, juz, segmen, urutan_global, halaman_awal, halaman_akhir, jumlah_halaman, surah_awal_nomor, ayat_awal, surah_akhir_nomor, ayat_akhir, is_aktif')
    .eq('is_aktif', true)
    .order('urutan_global', { ascending: true })
  if (masterError) return responseError('Gagal memuat master segmen ujian', 500)
  const masterSegments = (masterData || []) as unknown as MasterSegment[]
  if (masterSegments.length !== 151) return responseError('Master segmen ujian belum lengkap', 500)

  const santriIds = santriList.map(item => item.id)
  const { data: nilaiRows, error: nilaiError } = await serviceClient
    .from('nilai_ujian')
    .select('santri_id, segment_ujian_id, tanggal, created_at, id, nilai_akhir')
    .in('santri_id', santriIds)
    .not('segment_ujian_id', 'is', null)
    .eq('kalender_id', periode)
  if (nilaiError) return responseError('Gagal memuat nilai ujian', 500)

  type NilaiRow = { santri_id: string, segment_ujian_id: string, tanggal: string | null, created_at: string | null, id: string, nilai_akhir: number }
  const compareNilaiTerbaru = (a: NilaiRow, b: NilaiRow) => {
    const tanggal = (b.tanggal || '').localeCompare(a.tanggal || '')
    if (tanggal !== 0) return tanggal
    const createdAt = (b.created_at || '').localeCompare(a.created_at || '')
    if (createdAt !== 0) return createdAt
    return b.id.localeCompare(a.id)
  }
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

  // Nilai Ujian Keseluruhan per santri, SUDAH discope ke satu kalender_id (periode) di atas --
  // Tajwid TIDAK ikut sama sekali (Rule G/H).
  const santriRanking: SantriUjianRankingInput[] = santriList.map(santri => {
    const cakupan = getCakupanSegment(santri, masterSegments)
    const nilaiPerSegmen = nilaiTerbaruPerSantri.get(santri.id) || new Map<string, number>()
    const ringkasanJuz = cakupan.lengkap ? hitungRingkasanJuz(cakupan, masterSegments, nilaiPerSegmen) : []
    return {
      id: santri.id,
      nama: santri.nama,
      total_hafalan_juz: santri.total_hafalan_juz,
      nilaiUjianKeseluruhan: hitungNilaiUjianKeseluruhan(ringkasanJuz),
    }
  })

  const { peringkat, belumAdaHasil } = hitungRankingUjianHafalanKelas(santriRanking)

  return NextResponse.json({
    success: true,
    kalender,
    kelas: { jenjang: jenjangFinal, kelas_num: kelas, kelompok: kelompokFinal },
    peringkat,
    belumAdaHasil,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
