import type { createServiceRoleClient } from './serverAuth'
import {
  getCakupanSegment,
  hitungRingkasanJuz,
  resolveSantriExamScopes,
  compareNilaiTerbaru,
  nilaiRapor,
  isFullJuzMaster,
  type MasterSegment,
  type SantriScope,
} from './adminNilaiUjian'

export type NilaiHifzhFinalSantri = {
  kelancaran: number | null
  tajwid: number | null
  keterangan_hafalan: string | null
}

type ServiceClient = ReturnType<typeof createServiceRoleClient>

type PeriodeAkademikRingkas = {
  id: string
  tahun_ajaran: string
  semester: 1 | 2 | number
  tanggal_mulai: string
  tanggal_selesai: string
}

/**
 * Mengambil nilai final Hifzh (Kelancaran, Tajwid, dan Jumlah Hafalan snapshot)
 * untuk daftar santri berdasarkan periode akademik yang cocok.
 *
 * MEREUSE LOGIKA RESMI RAPORT HIFZH:
 * 1. Menemukan kalender_akademik tipe 'semester' untuk semester yang bersesuaian.
 * 2. Mengambil cakupan resmi via `resolveSantriExamScopes` sehingga `total_hafalan_juz`
 *    berasal dari snapshot historis ujian (TIDAK terpengaruh penambahan hafalan di masa depan).
 * 3. Menghitung rata-rata kelancaran dan tajwid proporsional skala 0-90 persis seperti Raport Hifzh.
 */
export async function muatNilaiHifzhFinalKelas<T extends SantriScope>(
  serviceClient: ServiceClient,
  santriList: T[],
  periodeAkademik: PeriodeAkademikRingkas
): Promise<Map<string, NilaiHifzhFinalSantri>> {
  const hasil = new Map<string, NilaiHifzhFinalSantri>()

  // Default fallback jika ujian belum ada atau santri belum dinilai
  santriList.forEach(s => {
    const defaultJuz = s.total_hafalan_juz ? `${s.total_hafalan_juz} Juz` : '-'
    hasil.set(s.id, {
      kelancaran: null,
      tajwid: null,
      keterangan_hafalan: defaultJuz,
    })
  })

  if (santriList.length === 0) return hasil

  // 1. Cari kalender ujian semester yang cocok
  const { data: kalenderRows, error: kalenderError } = await serviceClient
    .from('kalender_akademik')
    .select('id, nama, tipe, semester, tanggal_mulai, tanggal_selesai')
    .eq('tipe', 'semester')
    .eq('semester', periodeAkademik.semester)
    .order('tanggal_mulai', { ascending: false })

  if (kalenderError || !kalenderRows || kalenderRows.length === 0) {
    return hasil
  }

  // Pilih kalender semester yang namanya cocok dengan tahun ajaran atau yang tanggalnya beririsan
  const tahunMulaiStr = periodeAkademik.tahun_ajaran.split('/')[0]
  const kalenderCocok = kalenderRows.find(k => k.nama.includes(tahunMulaiStr) || k.nama.includes(periodeAkademik.tahun_ajaran))
    || kalenderRows[0]

  const kalenderId = kalenderCocok.id
  const tipeUjian = kalenderCocok.tipe

  // 2. Ambil master segmen
  const { data: masterData, error: masterError } = await serviceClient
    .from('master_segment_ujian')
    .select('id, juz, segmen, urutan_global, halaman_awal, halaman_akhir, jumlah_halaman, surah_awal_nomor, ayat_awal, surah_akhir_nomor, ayat_akhir, is_aktif')
    .eq('is_aktif', true)
    .order('urutan_global', { ascending: true })

  if (masterError || !masterData || masterData.length === 0) {
    return hasil
  }
  const masterSegments = masterData as unknown as MasterSegment[]

  // 3. Resolusi cakupan & snapshot historis
  const santriIds = santriList.map(s => s.id)
  const scopeResult = await resolveSantriExamScopes(
    serviceClient,
    santriList,
    kalenderId,
    kalenderCocok.tanggal_mulai
  )
  const resolvedList = scopeResult.status !== 'CAKUPAN_BELUM_DIKUNCI' ? scopeResult.scopes : santriList

  // 4. Query nilai kelancaran (nilai_ujian)
  const { data: nilaiRows } = await serviceClient
    .from('nilai_ujian')
    .select('id, santri_id, segment_ujian_id, tanggal, created_at, nilai_akhir')
    .in('santri_id', santriIds)
    .not('segment_ujian_id', 'is', null)
    .eq('tipe', tipeUjian)
    .eq('kalender_id', kalenderId)

  type NilaiRow = { santri_id: string, segment_ujian_id: string, tanggal: string | null, created_at: string | null, id: string, nilai_akhir: number }
  const terbaruPerKey = new Map<string, NilaiRow>()
  ;[...((nilaiRows || []) as NilaiRow[])]
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

  // 5. Query nilai tajwid (nilai_tajwid_juz)
  const { data: tajwidRows } = await serviceClient
    .from('nilai_tajwid_juz')
    .select('santri_id, juz, nilai')
    .in('santri_id', santriIds)
    .eq('kalender_id', kalenderId)

  const tajwidPerSantri = new Map<string, Map<number, number>>()
  ;(tajwidRows || []).forEach((row: any) => {
    if (!tajwidPerSantri.has(row.santri_id)) tajwidPerSantri.set(row.santri_id, new Map())
    tajwidPerSantri.get(row.santri_id)!.set(row.juz, Number(row.nilai))
  })

  // 6. Hitung final per santri
  resolvedList.forEach(santri => {
    const cakupan = getCakupanSegment(santri, masterSegments)
    const nilaiPerSegmen = nilaiTerbaruPerSantri.get(santri.id) || new Map<string, number>()
    const tajwidSantri = tajwidPerSantri.get(santri.id) || new Map<number, number>()

    const juzList = (cakupan.lengkap || nilaiPerSegmen.size > 0)
      ? hitungRingkasanJuz(cakupan, masterSegments, nilaiPerSegmen)
      : []

    const juzNilaiValues: number[] = []
    const juzTajwidValues: number[] = []

    juzList.forEach(j => {
      const isFull = isFullJuzMaster(j.juz, j.target, masterSegments)
      const kVal = nilaiRapor(j.rataRaport)
      if (typeof kVal === 'number') {
        juzNilaiValues.push(kVal)
      }

      const nilaiTajwid = tajwidSantri.get(j.juz)
      if (typeof nilaiTajwid === 'number') {
        const tVal = nilaiRapor(nilaiTajwid)
        if (typeof tVal === 'number') juzTajwidValues.push(tVal)
      } else if (isFull) {
        juzTajwidValues.push(0)
      }
    })

    const kelancaran = juzNilaiValues.length > 0
      ? Math.round((juzNilaiValues.reduce((a, b) => a + b, 0) / juzNilaiValues.length) * 10) / 10
      : null

    const tajwid = juzTajwidValues.length > 0
      ? Math.round((juzTajwidValues.reduce((a, b) => a + b, 0) / juzTajwidValues.length) * 10) / 10
      : null

    // Keterangan hafalan historis snapshot
    const totalJuzSnap = santri.total_hafalan_juz
    const keterangan_hafalan = totalJuzSnap ? `${totalJuzSnap} Juz` : '-'

    hasil.set(santri.id, {
      kelancaran,
      tajwid,
      keterangan_hafalan,
    })
  })

  return hasil
}
