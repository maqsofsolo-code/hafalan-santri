// Satu sumber untuk logic tiga jenis ranking (Total Hafalan, Konsistensi,
// Semangat) yang sebelumnya diimplementasikan ulang di app/admin/page.tsx,
// app/kepsek/page.tsx, app/wali/page.tsx, app/api/laporan-peringkat-pdf/route.ts,
// dan app/api/send-notif/route.ts (Modularisasi Tahap 3).
//
// Formula skor TIDAK diubah dari implementasi lama.
//
// KEPUTUSAN BISNIS FINAL (tie-breaker, jangan ubah tanpa keputusan baru):
// - Total Hafalan & Semangat: sebelumnya TIDAK punya tie-breaker eksplisit
//   di sebagian caller (admin/kepsek/wali mengandalkan urutan input /
//   stable sort, berbeda-beda antar halaman -- lihat laporan audit
//   Modularisasi Tahap 3). Sekarang SELALU eksplisit: nilai utama desc,
//   lalu nama asc ('id' locale), lalu id asc. Ini SAMA dengan tie-breaker
//   yang sudah dipakai laporan-peringkat-pdf (total) dan send-notif
//   (semangat) sejak awal -- jadi kedua endpoint itu TIDAK berubah
//   perilakunya, sementara admin/kepsek/wali sekarang jadi deterministik
//   (tidak lagi bergantung urutan query santri).
// - Konsistensi: TIDAK berubah -- tie-breakernya (totalPoin -> totalPenambahanBaru
//   jika bukan Ulya -> nama -> id) sudah eksplisit dan identik di semua
//   caller sejak awal.
//
// Modul ini murni fungsi domain: tidak melakukan query Supabase, tidak
// menyentuh React state, tidak membangun UI/PDF. Caller bertanggung jawab
// mengambil data (santri, setoran, hari aktif) lalu memanggil fungsi di sini.

export type SantriRankingInput = {
  id: string
  nama: string
  jenjang?: string | null
}

export type SetoranRankingInput = {
  santri_id: string
  tanggal: string
  jenis: string
  penambahan_juz: unknown
  status: string | null
}

function normalisasiPenambahan(value: unknown): number {
  const angka = Number(value)
  return Number.isFinite(angka) ? angka : 0
}

function bandingkanNamaId(a: SantriRankingInput, b: SantriRankingInput): number {
  return (a.nama || '').localeCompare(b.nama || '', 'id') || String(a.id).localeCompare(String(b.id))
}

// ============================================================
// TOTAL HAFALAN
// ============================================================

export type SantriTotalHafalan = SantriRankingInput & {
  total_hafalan_juz?: number | null
}

export function bandingkanTotalHafalan(a: SantriTotalHafalan, b: SantriTotalHafalan): number {
  const selisih = (b.total_hafalan_juz || 0) - (a.total_hafalan_juz || 0)
  if (selisih !== 0) return selisih
  return bandingkanNamaId(a, b)
}

export function hitungRankingTotalHafalan<T extends SantriTotalHafalan>(santriList: T[]): T[] {
  return [...santriList].sort(bandingkanTotalHafalan)
}

// ============================================================
// KONSISTENSI
// ============================================================

export type StatsKonsistensi = {
  totalPoin: number
  totalPenambahanBaru: number
  najihLama: number
  rosibLama: number
  najihBaru: number
  rosibBaru: number
  /** true jika santri punya minimal satu baris setoran yang lolos filter hari-aktif + jenjang (dipakai send-notif untuk validitas notifikasi, bukan bagian formula ranking). */
  adaData: boolean
}

function statsKonsistensiKosong(): StatsKonsistensi {
  return {
    totalPoin: 0,
    totalPenambahanBaru: 0,
    najihLama: 0,
    rosibLama: 0,
    najihBaru: 0,
    rosibBaru: 0,
    adaData: false,
  }
}

type KombinasiKonsistensi = {
  jenis: 'lama' | 'baru'
  adaLancar: boolean
  penambahanBaruMaks: number
}

/**
 * Hitung stats konsistensi per santri dari daftar setoran. Asumsi: caller
 * sudah memfilter status_kehadiran='hadir' di level query (sama seperti
 * semua caller existing). Dedup per tanggal+jenis (>1 setoran di hari &
 * jenis yang sama hanya dihitung sekali), jenjang 'ulya' mengecualikan
 * jenis='baru' sepenuhnya dari perhitungan poin.
 */
export function hitungStatsKonsistensi(
  setoranList: SetoranRankingInput[],
  hariAktifSet: Set<string>,
  getJenjang: (santriId: string) => string | null | undefined
): Map<string, StatsKonsistensi> {
  const statsMap = new Map<string, StatsKonsistensi>()
  const kombinasiMap = new Map<string, Map<string, KombinasiKonsistensi>>()

  setoranList.forEach(s => {
    if (s.jenis !== 'lama' && s.jenis !== 'baru') return
    if (!statsMap.has(s.santri_id)) statsMap.set(s.santri_id, statsKonsistensiKosong())
    const stats = statsMap.get(s.santri_id)!

    if (!hariAktifSet.has(s.tanggal)) return
    if (getJenjang(s.santri_id) === 'ulya' && s.jenis === 'baru') return

    stats.adaData = true
    const jenis = s.jenis as 'lama' | 'baru'
    if (!kombinasiMap.has(s.santri_id)) kombinasiMap.set(s.santri_id, new Map())
    const kombinasiSantri = kombinasiMap.get(s.santri_id)!
    const kunciKombinasi = `${s.tanggal}:${jenis}`
    const kombinasi = kombinasiSantri.get(kunciKombinasi) || {
      jenis,
      adaLancar: false,
      penambahanBaruMaks: 0,
    }

    if (s.status === 'lancar') {
      kombinasi.adaLancar = true
      if (jenis === 'lama') stats.najihLama++
      if (jenis === 'baru') stats.najihBaru++
    }
    if (s.status === 'rosib') {
      if (jenis === 'lama') stats.rosibLama++
      if (jenis === 'baru') stats.rosibBaru++
    }
    if (jenis === 'baru' && s.status === 'lancar') {
      kombinasi.penambahanBaruMaks = Math.max(kombinasi.penambahanBaruMaks, normalisasiPenambahan(s.penambahan_juz))
    }
    kombinasiSantri.set(kunciKombinasi, kombinasi)
  })

  kombinasiMap.forEach((kombinasiSantri, santriId) => {
    const stats = statsMap.get(santriId)
    if (!stats) return
    kombinasiSantri.forEach(kombinasi => {
      if (!kombinasi.adaLancar) return
      stats.totalPoin++
      if (kombinasi.jenis === 'baru') stats.totalPenambahanBaru += kombinasi.penambahanBaruMaks
    })
  })

  return statsMap
}

export function bandingkanKonsistensi(
  getStats: (santriId: string) => StatsKonsistensi,
  a: SantriRankingInput,
  b: SantriRankingInput
): number {
  const statsA = getStats(a.id)
  const statsB = getStats(b.id)
  const aUlya = a.jenjang === 'ulya'
  const bUlya = b.jenjang === 'ulya'
  if (statsB.totalPoin !== statsA.totalPoin) return statsB.totalPoin - statsA.totalPoin
  if (!aUlya && !bUlya && statsB.totalPenambahanBaru !== statsA.totalPenambahanBaru) {
    return statsB.totalPenambahanBaru - statsA.totalPenambahanBaru
  }
  return bandingkanNamaId(a, b)
}

export type SantriKonsistensiHasil<T> = T & {
  totalPoin: number
  poinMaksimal: number
  totalPenambahanBaru: number
  najihLama: number
  rosibLama: number
  najihBaru: number
  rosibBaru: number
  totalHariAktif: number
  persentaseKonsistensi: number
}

/**
 * Fungsi turnkey untuk caller yang menghitung SATU daftar ranking langsung
 * dari daftar santri (dipakai admin/kepsek/wali). Untuk caller yang perlu
 * mengelompokkan per kelas sebelum sort (laporan-peringkat-pdf, send-notif),
 * pakai hitungStatsKonsistensi() + bandingkanKonsistensi() langsung.
 */
export function hitungRankingKonsistensi<T extends SantriRankingInput>(
  santriList: T[],
  setoranList: SetoranRankingInput[],
  hariAktifSet: Set<string>,
  totalHariAktif: number
): SantriKonsistensiHasil<T>[] {
  const jenjangMap = new Map(santriList.map(s => [s.id, s.jenjang]))
  const statsMap = hitungStatsKonsistensi(setoranList, hariAktifSet, id => jenjangMap.get(id))
  const kosong = statsKonsistensiKosong()

  const hasil = santriList.map(s => {
    const st = statsMap.get(s.id) || kosong
    const isUlya = s.jenjang === 'ulya'
    const poinMaksimal = isUlya ? totalHariAktif : totalHariAktif * 2
    const persentaseKonsistensi = poinMaksimal > 0 ? Math.round((st.totalPoin / poinMaksimal) * 100) : 0
    return {
      ...s,
      totalPoin: st.totalPoin,
      poinMaksimal,
      totalPenambahanBaru: st.totalPenambahanBaru,
      najihLama: st.najihLama,
      rosibLama: st.rosibLama,
      najihBaru: st.najihBaru,
      rosibBaru: st.rosibBaru,
      totalHariAktif,
      persentaseKonsistensi,
    }
  })

  return hasil.sort((a, b) => bandingkanKonsistensi(id => statsMap.get(id) || kosong, a, b))
}

// ============================================================
// SEMANGAT
// ============================================================

export type StatsSemangat = {
  totalJuz: number
  hariSetor: Set<string>
  najih: number
  /** true jika santri punya minimal satu baris setoran jenis='baru' (dipakai send-notif untuk validitas notifikasi, bukan bagian formula ranking). */
  adaData: boolean
}

function statsSemangatKosong(): StatsSemangat {
  return { totalJuz: 0, hariSetor: new Set(), najih: 0, adaData: false }
}

/**
 * Hitung stats semangat per santri dari daftar setoran (rolling window,
 * biasanya 7 hari terakhir -- rentang ditentukan caller lewat setoranList).
 * Asumsi: caller sudah memfilter status_kehadiran='hadir' di level query.
 */
export function hitungStatsSemangat(
  setoranList: SetoranRankingInput[],
  hariAktifSet: Set<string>
): Map<string, StatsSemangat> {
  const statsMap = new Map<string, StatsSemangat>()

  setoranList.forEach(s => {
    if (s.jenis !== 'baru') return
    if (!statsMap.has(s.santri_id)) statsMap.set(s.santri_id, statsSemangatKosong())
    const stats = statsMap.get(s.santri_id)!
    stats.adaData = true
    stats.totalJuz += normalisasiPenambahan(s.penambahan_juz)
    if (hariAktifSet.has(s.tanggal)) stats.hariSetor.add(s.tanggal)
    if (s.status === 'lancar') stats.najih++
  })

  return statsMap
}

export function bandingkanSemangat(
  getStats: (santriId: string) => StatsSemangat,
  a: SantriRankingInput,
  b: SantriRankingInput
): number {
  const statsA = getStats(a.id)
  const statsB = getStats(b.id)
  if (statsB.totalJuz !== statsA.totalJuz) return statsB.totalJuz - statsA.totalJuz
  if (statsB.hariSetor.size !== statsA.hariSetor.size) return statsB.hariSetor.size - statsA.hariSetor.size
  if (statsB.najih !== statsA.najih) return statsB.najih - statsA.najih
  return bandingkanNamaId(a, b)
}

export type SantriSemangatHasil<T> = T & {
  tambahJuz7Hari: number
  tambahHalaman7Hari: number
  hariSetorBaru7Hari: number
  najihBaru7Hari: number
}

/**
 * Fungsi turnkey untuk caller yang menghitung SATU daftar ranking langsung
 * dari daftar santri (dipakai admin/kepsek/wali). Untuk caller yang perlu
 * mengelompokkan per kelas sebelum sort (laporan-peringkat-pdf, send-notif),
 * pakai hitungStatsSemangat() + bandingkanSemangat() langsung.
 */
export function hitungRankingSemangat<T extends SantriRankingInput>(
  santriList: T[],
  setoranList: SetoranRankingInput[],
  hariAktifSet: Set<string>
): SantriSemangatHasil<T>[] {
  const statsMap = hitungStatsSemangat(setoranList, hariAktifSet)
  const kosong = statsSemangatKosong()

  const hasil = santriList.map(s => {
    const st = statsMap.get(s.id) || kosong
    return {
      ...s,
      tambahJuz7Hari: st.totalJuz,
      tambahHalaman7Hari: st.totalJuz * 20,
      hariSetorBaru7Hari: st.hariSetor.size,
      najihBaru7Hari: st.najih,
    }
  })

  return hasil.sort((a, b) => bandingkanSemangat(id => statsMap.get(id) || kosong, a, b))
}

// ============================================================
// UJIAN HAFALAN (Peringkat Ujian Hafalan per kelas)
// ============================================================
//
// KEPUTUSAN BISNIS FINAL (jangan ubah tanpa keputusan baru):
// - Nilai Hafalan = (total_hafalan_juz santri / MAX(total_hafalan_juz) dalam kelas yang sama) x 10.
//   total_hafalan_juz dipakai APA ADANYA (desimal, TIDAK di-floor/round sebelum rumus). MAX dihitung
//   dari SELURUH santri di kelas ini (termasuk yang belum punya hasil ujian) -- pembagi ini murni
//   soal jumlah hafalan kelas, terlepas dari kesiapan ujian.
// - Nilai Peringkat = (Nilai Ujian Keseluruhan x 4 + Nilai Hafalan) / 5 (ujian 80%, hafalan 20%).
// - Tajwid TIDAK ikut formula ini sama sekali, dan tidak pernah jadi bagian tipe input di sini.
// - Eligibility: santri hanya masuk hasil `peringkat` (dan diberi nomor peringkat) jika sudah
//   punya Nilai Ujian Keseluruhan (artinya minimal satu juz berstatus 'selesai' pada periode ujian
//   yang dipilih -- lihat hitungNilaiUjianKeseluruhan di app/lib/adminNilaiUjian.ts). Santri tanpa
//   itu TIDAK diberi skor 0 palsu -- dikembalikan terpisah lewat `belumAdaHasil`, caller wajib
//   menampilkannya sebagai "Belum memiliki juz ujian selesai", bukan dicampur ke urutan ranking.
// - Tie-breaker (urutan wajib, jangan diubah tanpa keputusan baru): nilai_peringkat desc ->
//   nilai_ujian_keseluruhan desc -> total_hafalan_juz desc -> nama asc -> id asc.
//
// Modul ini murni fungsi domain (sama seperti bagian ranking.ts lainnya): tidak query Supabase.
// Caller (API route) bertanggung jawab: (1) mengambil Nilai Ujian Keseluruhan per santri yang
// SUDAH discope ke satu kalender_id/periode ujian (tidak boleh campur periode), dan (2) mengelompokkan
// santri per identitas kelas (jenjang + kelas_num + jenis_kelas) SEBELUM memanggil fungsi di sini --
// fungsi ini hanya memproses SATU kelompok kelas per panggilan.

export type SantriUjianRankingInput = SantriRankingInput & {
  total_hafalan_juz?: number | null
  /** Nilai Ujian Keseluruhan santri ini pada periode yang dipilih; null jika belum ada juz 'selesai'. */
  nilaiUjianKeseluruhan: number | null
}

export type SantriUjianRankingHasil<T> = T & {
  nilaiUjianKeseluruhan: number
  nilaiHafalan: number
  nilaiPeringkat: number
  peringkat: number
}

function bandingkanPeringkatUjian(
  a: { nilaiPeringkat: number, nilaiUjianKeseluruhan: number, total_hafalan_juz?: number | null } & SantriRankingInput,
  b: { nilaiPeringkat: number, nilaiUjianKeseluruhan: number, total_hafalan_juz?: number | null } & SantriRankingInput
): number {
  if (b.nilaiPeringkat !== a.nilaiPeringkat) return b.nilaiPeringkat - a.nilaiPeringkat
  if (b.nilaiUjianKeseluruhan !== a.nilaiUjianKeseluruhan) return b.nilaiUjianKeseluruhan - a.nilaiUjianKeseluruhan
  const hafalanA = a.total_hafalan_juz || 0
  const hafalanB = b.total_hafalan_juz || 0
  if (hafalanB !== hafalanA) return hafalanB - hafalanA
  return bandingkanNamaId(a, b)
}

/**
 * Hitung Peringkat Ujian Hafalan untuk SATU kelompok kelas (jenjang+kelas_num+jenis_kelas sama,
 * satu periode ujian yang sama). Return terpisah: `peringkat` (santri dengan Nilai Ujian Keseluruhan,
 * terurut + diberi nomor peringkat) dan `belumAdaHasil` (santri di kelas ini yang belum punya satu
 * juz pun berstatus selesai pada periode ini -- TIDAK diberi skor/peringkat palsu).
 */
export function hitungRankingUjianHafalanKelas<T extends SantriUjianRankingInput>(santriKelas: T[]): {
  peringkat: SantriUjianRankingHasil<T>[]
  belumAdaHasil: T[]
} {
  const maxHafalan = Math.max(0, ...santriKelas.map(s => s.total_hafalan_juz || 0))

  const eligible = santriKelas.filter(s => s.nilaiUjianKeseluruhan !== null)
  const belumAdaHasil = santriKelas.filter(s => s.nilaiUjianKeseluruhan === null)

  const dihitung = eligible.map(s => {
    const nilaiHafalan = maxHafalan > 0 ? Math.round(((s.total_hafalan_juz || 0) / maxHafalan) * 10 * 10) / 10 : 0
    const nilaiUjianKeseluruhan = s.nilaiUjianKeseluruhan as number
    const nilaiPeringkat = Math.round(((nilaiUjianKeseluruhan * 4 + nilaiHafalan) / 5) * 10) / 10
    return { ...s, nilaiUjianKeseluruhan, nilaiHafalan, nilaiPeringkat }
  })

  dihitung.sort(bandingkanPeringkatUjian)

  const peringkat = dihitung.map((s, index) => ({ ...s, peringkat: index + 1 }))

  return { peringkat, belumAdaHasil }
}
