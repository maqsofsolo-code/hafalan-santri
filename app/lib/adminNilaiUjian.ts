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

/**
 * Phase B (RAPORT_HIFZH_FINAL_EXAM_POLICY.md):
 * Nilai resmi ujian hafalan maksimum 9.5 (skala 10) atau 95 (skala 100).
 * Data mentah historis di DB tidak diubah, tetapi seluruh perhitungan resmi
 * mengonsumsi nilai efektif: effectiveExamScore = min(raw, 9.5).
 */
export function effectiveExamScore(raw: number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const nilai = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(nilai)) return null
  return Math.min(9.5, nilai)
}

// nilai_akhir aplikasi berskala 5,0-9,5 (resmi). Nilai rapor berskala 50-95 (effective x 10).
export function nilaiRapor(nilaiAkhir: number | null | undefined): number | null {
  const effective = effectiveExamScore(nilaiAkhir)
  if (effective === null) return null
  return Math.min(95, Math.max(50, Math.round(effective * 10)))
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
  rata: number | null
  status: StatusJuz
  segmentIds: string[]
}

// Menghitung ringkasan per juz dari nilai terbaru per segmen (Map keyed by segmentId -> nilai_akhir terbaru).
// Segmen dinormalisasi ke effectiveExamScore SEBELUM dirata-ratakan (Phase B).
export function hitungRingkasanJuz(cakupan: CakupanSegment, masterSegments: MasterSegment[], nilaiTerbaruPerSegmen: Map<string, number>): RingkasanJuz[] {
  return Object.entries(cakupan.jumlahSegmenPerJuz).map(([juzText, target]) => {
    const juz = Number(juzText)
    const segmentIds = masterSegments.filter(s => s.juz === juz && cakupan.segmentIds.includes(s.id)).map(s => s.id)
    const nilaiJuz = segmentIds
      .map(id => nilaiTerbaruPerSegmen.get(id))
      .filter((nilai): nilai is number => typeof nilai === 'number')
      .map(nilai => effectiveExamScore(nilai))
      .filter((nilai): nilai is number => typeof nilai === 'number')
    const rata = nilaiJuz.length > 0 ? nilaiJuz.reduce((sum, nilai) => sum + nilai, 0) / nilaiJuz.length : null
    const status: StatusJuz = nilaiJuz.length === 0 ? 'belum_dimulai' : nilaiJuz.length >= target ? 'selesai' : 'belum_selesai'
    return { juz, target, dinilai: nilaiJuz.length, rata, status, segmentIds }
  }).sort((a, b) => b.juz - a.juz)
}

// Nilai Ujian Keseluruhan = rata-rata Nilai Kelancaran (RingkasanJuz.rata) HANYA untuk juz
// berstatus 'selesai', dalam SATU kalender/periode ujian (caller wajib membangun `ringkasanJuz`
// dari nilai yang sudah discope ke satu kalender_id -- fungsi ini murni agregasi, tidak melakukan
// scoping periode sendiri). Tajwid TIDAK pernah ikut di sini (keputusan bisnis final). null jika
// belum ada satu juz pun yang selesai.
export function hitungNilaiUjianKeseluruhan(ringkasanJuz: RingkasanJuz[]): number | null {
  const juzSelesai = ringkasanJuz.filter((j): j is RingkasanJuz & { rata: number } => j.status === 'selesai' && j.rata !== null)
  if (juzSelesai.length === 0) return null
  const total = juzSelesai.reduce((sum, j) => sum + j.rata, 0)
  return Math.round((total / juzSelesai.length) * 10) / 10
}

// Validasi input Nilai Tajwid: skala 0.0-9.5, dibulatkan ke maksimal 1 angka desimal (sama seperti
// pembulatan nilai_akhir segmen). Return null jika tidak valid (bukan angka, di luar rentang, dsb).
export function validasiNilaiTajwid(value: unknown): number | null {
  const nilai = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(nilai) || nilai < 0 || nilai > 9.5) return null
  return Math.round(nilai * 10) / 10
}
