// Helper nilai ujian untuk Admin: cakupan segmen per santri (checkpoint-based) dan konversi skala rapor.
// Logika cakupan segmen sengaja disalin dari app/api/nilai-ujian/route.ts (bukan di-import) supaya
// perubahan pada endpoint Guru tidak pernah bergantung pada perubahan endpoint Admin, atau sebaliknya.

export type SantriScope = {
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

export type MasterSegment = {
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

export type SegmenTersediaInfo = {
  parsial: boolean
  akhirSurahNomor: number
  akhirAyat: number
}

export type CakupanSegment = {
  lengkap: boolean
  segmentIds: string[]
  segmenTersedia: Record<string, SegmenTersediaInfo>
  jumlahSegmenPerJuz: Record<string, number>
}

// Posisi checkpoint dibandingkan satu titik batas (surah, ayat) pada jalur hafalan An-Nas -> Al-Baqarah.
// Nomor surah lebih besar = belum sampai (lebih awal di perjalanan); nomor lebih kecil = sudah lewat.
export function posisiRelatif(nomorCheckpoint: number, ayatCheckpoint: number, nomorBatas: number, ayatBatas: number) {
  if (nomorCheckpoint > nomorBatas) return -1
  if (nomorCheckpoint < nomorBatas) return 1
  if (ayatCheckpoint < ayatBatas) return -1
  if (ayatCheckpoint > ayatBatas) return 1
  return 0
}

export function getCakupanSegment(santri: SantriScope, masterSegments: MasterSegment[]): CakupanSegment {
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
      const key = String(segment.juz)
      jumlahSegmenPerJuz[key] = (jumlahSegmenPerJuz[key] || 0) + 1
    } else {
      // Checkpoint santri belum mencapai akhir segmen ini (parsial / di tengah segmen).
      // Sesuai Final Rule (Phase C): segmen parsial BUKAN required segment penuh dan tidak masuk
      // kewajiban ujian santri. Loop berhenti di sini karena segmen ini dan setelahnya belum tuntas dihafal.
      break
    }
  }

  return {
    lengkap: true,
    segmentIds: Object.keys(segmenTersedia),
    segmenTersedia,
    jumlahSegmenPerJuz,
  }
}

/**
 * Phase C Final Spec (docs/RAPORT_HIFZH_PHASE_C_FINAL_IMPLEMENTATION_SPEC.md):
 * Pemisahan domain:
 * 1. Raw Exam Scoring: nilai mentah guru 0.0-10.0 (Kelancaran normal 5.0-10.0).
 * 2. Ranking Calculation: mengonsumsi nilai raw murni (0-10) tanpa cap Raport.
 * 3. Raport Scoring: cap maksimum 9.0 (skala 90) dilakukan per komponen sebelum average.
 */

// Konversi nilai akhir ke skala rapor (0-90).
// Sesuai Section 6 & 18: cap 9.0 diaplikasikan khusus untuk Raport Hifzh.
// Nilai incomplete 0 adalah special penalty dan tidak melewati mapper ini.
export function nilaiRapor(nilaiAkhir: number | null | undefined): number | null {
  if (nilaiAkhir === null || nilaiAkhir === undefined) return null
  const raw = typeof nilaiAkhir === 'number' ? nilaiAkhir : Number(nilaiAkhir)
  if (!Number.isFinite(raw)) return null
  if (raw <= 0) return 0
  return Math.round(Math.min(9.0, raw) * 10)
}

export function compareNilaiTerbaru<T extends { tanggal: string | null, created_at: string | null, id: string }>(a: T, b: T) {
  const tanggal = (b.tanggal || '').localeCompare(a.tanggal || '')
  if (tanggal !== 0) return tanggal
  const createdAt = (b.created_at || '').localeCompare(a.created_at || '')
  if (createdAt !== 0) return createdAt
  return b.id.localeCompare(a.id)
}

export type StatusJuz = 'belum_dimulai' | 'belum_selesai' | 'selesai'

export type RingkasanJuz = {
  juz: number
  target: number
  dinilai: number
  rata: number | null // Raw average (0-10) untuk audit dan ranking murni
  rataRaport?: number | null // Component-capped (min(raw, 9.0)) average untuk Raport Hifzh
  status: StatusJuz
  segmentIds: string[]
}

// Menghitung ringkasan per juz dari nilai terbaru per segmen (Map keyed by segmentId -> nilai_akhir terbaru).
// Sesuai Final Rule:
// - target = jumlah REQUIRED segment pada juz tersebut.
// - effective score setiap required segment: ada nilai -> nilai asli, belum diuji -> 0.
// - rata / rataRaport membagi SELURUH target required segment (missing = 0).
// - Untuk rataRaport: cap Raport min(raw, 9.0) tetap PER COMPONENT sebelum average.
// - Non-required segment tidak masuk denominator dan tidak diberi 0.
// - Status: selesai jika semua required segment dinilai; belum_selesai jika ada missing; belum_dimulai jika 0 dinilai.
export function hitungRingkasanJuz(
  cakupan: CakupanSegment,
  masterSegments: MasterSegment[],
  nilaiTerbaruPerSegmen: Map<string, number>
): RingkasanJuz[] {
  return Object.entries(cakupan.jumlahSegmenPerJuz).map(([juzText, target]) => {
    const juz = Number(juzText)
    const segmentIds = masterSegments.filter(s => s.juz === juz && cakupan.segmentIds.includes(s.id)).map(s => s.id)

    let dinilaiCount = 0
    let sumRaw = 0
    let sumRaport = 0

    for (const id of segmentIds) {
      const val = nilaiTerbaruPerSegmen.get(id)
      if (typeof val === 'number') {
        dinilaiCount += 1
        sumRaw += val
        sumRaport += Math.min(9.0, val)
      } else {
        sumRaw += 0
        sumRaport += 0
      }
    }

    const rata = target > 0 ? (sumRaw / target) : null
    const rataRaport = target > 0 ? (sumRaport / target) : null
    const status: StatusJuz = dinilaiCount === 0 ? 'belum_dimulai' : dinilaiCount >= target ? 'selesai' : 'belum_selesai'

    return { juz, target, dinilai: dinilaiCount, rata, rataRaport, status, segmentIds }
  }).sort((a, b) => b.juz - a.juz)
}

export type StatusUjianSantri = 'SELESAI' | 'TIDAK_SELESAI'

export function hitungStatusUjian(ringkasanJuz: RingkasanJuz[]): StatusUjianSantri {
  if (ringkasanJuz.length === 0) return 'SELESAI'
  const allSelesai = ringkasanJuz.every(j => j.status === 'selesai')
  return allSelesai ? 'SELESAI' : 'TIDAK_SELESAI'
}

// Menentukan apakah suatu juz adalah Full Juz standar dalam master_segment_ujian (Section 10)
export function isFullJuzMaster(juz: number, targetSegments: number, masterSegments: MasterSegment[]): boolean {
  const totalInMaster = masterSegments.filter(s => s.juz === juz).length
  return targetSegments >= totalInMaster
}

// Nilai Ujian Keseluruhan:
// Semua REQUIRED juz dengan scope > 0 berkontribusi menggunakan nilai rata-rata juz hasil formula di atas.
// Juz incomplete (status belum_selesai) TIDAK lagi dibuang atau dinolkan keseluruhan; nilai rata-rata proporsionalnya
// tetap berkontribusi ke total nilai.
//
// Aturan 0 Segment Dinilai:
// - Jika santri memiliki kewajiban ujian (ringkasanJuz.length > 0) tetapi belum memiliki satu pun segmen yang dinilai:
//   - Untuk hasil FINAL (options?.isFinal === true): nilai = 0 (status TIDAK_SELESAI).
//   - Untuk hasil PROVISIONAL (sebelum final / default): return null (masuk belumAdaHasil selama masa ujian).
//
// Pemisahan domain:
// - Default (options?.forRaport === false): menggunakan `j.rata` (raw average murni untuk ranking).
// - Raport (options?.forRaport === true): menggunakan `j.rataRaport` (component-capped 9.0).
export function hitungNilaiUjianKeseluruhan(
  ringkasanJuz: RingkasanJuz[],
  options?: { isFinal?: boolean; forRaport?: boolean }
): number | null {
  if (ringkasanJuz.length === 0) return null
  const totalDinilai = ringkasanJuz.reduce((sum, j) => sum + j.dinilai, 0)
  if (totalDinilai === 0) {
    return options?.isFinal ? 0 : null
  }
  const total = ringkasanJuz.reduce((sum, j) => {
    const nilai = options?.forRaport ? (j.rataRaport ?? 0) : (j.rata ?? 0)
    return sum + (Number.isFinite(nilai) ? nilai : 0)
  }, 0)
  const totalRequired = ringkasanJuz.length
  return Math.round((total / totalRequired) * 10) / 10
}

export type ExamScopeSource = 'SNAPSHOT' | 'REKONSTRUKSI'
export type ExamScopeStatus = 'LOCKED' | 'TRANSISI_GASAL' | 'CAKUPAN_BELUM_DIKUNCI'

export type ResolvedSantriExamScopeResult<T extends SantriScope> = {
  status: ExamScopeStatus
  scopes: (T & { scopeSource: ExamScopeSource })[]
}

/**
 * Resolusi cakupan hafalan awal ujian santri (Phase C - Final Rule):
 *
 * SEMESTER GASAL 2026/2027 (Masa Transisi):
 * 1. Gunakan snapshot jika ada di tabel `santri_hafalan_exam_snapshot`.
 * 2. Jika snapshot belum ada, gunakan rekonstruksi historis cutoff 2026-08-01 dari setoran santri.
 *
 * FUTURE EXAM (Periode Ujian Lain / Masa Depan):
 * 1. Gunakan snapshot jika ada di tabel `santri_hafalan_exam_snapshot`.
 * 2. Jika snapshot belum ada: status = CAKUPAN_BELUM_DIKUNCI.
 *    JANGAN fallback ke posisi live/current!
 *    Posisi current hanya boleh digunakan saat Admin melakukan aksi "Kunci Cakupan Ujian" untuk MEMBUAT snapshot.
 */
export async function resolveSantriExamScopes<T extends SantriScope>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: any,
  santriList: T[],
  kalenderId: string,
  tanggalMulaiKalender?: string | null
): Promise<ResolvedSantriExamScopeResult<T>> {
  if (santriList.length === 0) {
    return { status: 'LOCKED', scopes: [] }
  }

  const isGasal2026 = kalenderId === '1c9739bc-7924-4d8c-9b2b-75020eb914ea' || tanggalMulaiKalender === '2026-08-01'
  const santriIds = santriList.map(s => s.id)
  const snapshotMap = new Map<string, { surah_terakhir_nomor: number | null, ayat_terakhir: number | null, total_hafalan_juz: number | null }>()

  // 1. Cek tabel snapshot
  try {
    const { data: snapshotRows, error } = await supabaseClient
      .from('santri_hafalan_exam_snapshot')
      .select('santri_id, surah_terakhir_nomor, ayat_terakhir, total_hafalan_juz')
      .eq('kalender_id', kalenderId)
      .in('santri_id', santriIds)

    if (!error && snapshotRows && snapshotRows.length > 0) {
      type SnapshotRow = { santri_id: string, surah_terakhir_nomor: number | null, ayat_terakhir: number | null, total_hafalan_juz: number | null }
      ;(snapshotRows as SnapshotRow[]).forEach(row => {
        snapshotMap.set(row.santri_id, {
          surah_terakhir_nomor: row.surah_terakhir_nomor,
          ayat_terakhir: row.ayat_terakhir,
          total_hafalan_juz: row.total_hafalan_juz !== null ? Number(row.total_hafalan_juz) : null,
        })
      })
    }
  } catch {
    // Tabel migrasi belum di-apply di DB
  }

  // Jika seluruh santri sudah memiliki snapshot: status = LOCKED
  const allHaveSnapshot = santriList.every(s => snapshotMap.has(s.id))
  if (allHaveSnapshot) {
    const scopes = santriList.map(s => {
      const snap = snapshotMap.get(s.id)!
      return {
        ...s,
        surah_terakhir_nomor: snap.surah_terakhir_nomor,
        ayat_terakhir: snap.ayat_terakhir,
        total_hafalan_juz: snap.total_hafalan_juz,
        scopeSource: 'SNAPSHOT' as const,
      }
    })
    return { status: 'LOCKED', scopes }
  }

  // Jika FUTURE EXAM dan belum memiliki snapshot:
  // JANGAN fallback ke live/current!
  if (!isGasal2026) {
    return { status: 'CAKUPAN_BELUM_DIKUNCI', scopes: [] }
  }

  // TRANSISI SEMESTER GASAL 2026/2027:
  // Rekonstruksi santri yang belum memiliki snapshot dari data setoran sebelum 1 Agustus 2026
  const rekonMap = new Map<string, { surah_terakhir_nomor: number | null, ayat_terakhir: number | null, total_hafalan_juz: number | null }>()
  const santriButuhRekon = santriList.filter(s => !snapshotMap.has(s.id))

  if (santriButuhRekon.length > 0) {
    const rekonIds = santriButuhRekon.map(s => s.id)
    try {
      const { data: augSetoran, error: augError } = await supabaseClient
        .from('setoran')
        .select('santri_id, penambahan_juz, tanggal, created_at, surah_mulai_nomor, surah_selesai_nomor, ayat_mulai, ayat_selesai')
        .in('santri_id', rekonIds)
        .eq('jenis', 'baru')
        .eq('status', 'lancar')
        .gte('tanggal', '2026-08-01')
        .order('tanggal', { ascending: true })
        .order('created_at', { ascending: true })

      if (!augError && augSetoran && augSetoran.length > 0) {
        type SetoranAug = {
          santri_id: string
          penambahan_juz: unknown
          surah_mulai_nomor: number | null
          ayat_mulai: number | null
        }
        const augBySantri = new Map<string, SetoranAug[]>()
        ;(augSetoran as SetoranAug[]).forEach(s => {
          if (!augBySantri.has(s.santri_id)) augBySantri.set(s.santri_id, [])
          augBySantri.get(s.santri_id)!.push(s)
        })

        santriButuhRekon.forEach(s => {
          const augs = augBySantri.get(s.id)
          if (augs && augs.length > 0) {
            const augTambah = augs.reduce((sum, a) => sum + (Number(a.penambahan_juz) || 0), 0)
            const finalJuz = Math.max(0, Math.round(((s.total_hafalan_juz || 0) - augTambah) * 100) / 100)
            const firstAug = augs[0]
            const finalSurah = firstAug.surah_mulai_nomor ?? s.surah_terakhir_nomor
            const finalAyat = firstAug.ayat_mulai ?? s.ayat_terakhir

            rekonMap.set(s.id, {
              surah_terakhir_nomor: finalSurah,
              ayat_terakhir: finalAyat,
              total_hafalan_juz: finalJuz,
            })
          }
        })
      }
    } catch {
      // Rekonstruksi error
    }
  }

  const scopes = santriList.map(s => {
    const snap = snapshotMap.get(s.id)
    if (snap) {
      return {
        ...s,
        surah_terakhir_nomor: snap.surah_terakhir_nomor,
        ayat_terakhir: snap.ayat_terakhir,
        total_hafalan_juz: snap.total_hafalan_juz,
        scopeSource: 'SNAPSHOT' as const,
      }
    }
    const rec = rekonMap.get(s.id)
    if (rec) {
      return {
        ...s,
        surah_terakhir_nomor: rec.surah_terakhir_nomor ?? s.surah_terakhir_nomor,
        ayat_terakhir: rec.ayat_terakhir ?? s.ayat_terakhir,
        total_hafalan_juz: rec.total_hafalan_juz !== null ? rec.total_hafalan_juz : s.total_hafalan_juz,
        scopeSource: 'REKONSTRUKSI' as const,
      }
    }
    return {
      ...s,
      scopeSource: 'REKONSTRUKSI' as const,
    }
  })

  return { status: 'TRANSISI_GASAL', scopes }
}

// Validasi input Nilai Tajwid: skala 0.0-10.0, dibulatkan ke maksimal 1 angka desimal (sama seperti
// pembulatan nilai_akhir segmen). Return null jika tidak valid (bukan angka, di luar rentang, dsb).
export function validasiNilaiTajwid(value: unknown): number | null {
  const nilai = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(nilai) || nilai < 0 || nilai > 10) return null
  return Math.round(nilai * 10) / 10
}
