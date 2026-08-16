// Fungsi murni (tanpa state/fetch) yang dipakai bersama oleh beberapa bagian
// halaman Admin -- dipisah dari app/admin/page.tsx pada Modularisasi Tahap
// 6A. Logic TIDAK diubah dari implementasi lama, hanya dipindah dan
// dijadikan murni (closure atas surahList/state diganti jadi parameter
// eksplisit, persis pola app/guru/utils.ts).
import type { Santri, Surah } from './types'

/** Opsi nomor kelas per jenjang (dipakai filter, form santri, naik kelas, dsb). */
export function getKelasOptions(jenjang: string): number[] {
  if (jenjang === 'ula') return [1, 2, 3, 4, 5, 6]
  if (jenjang === 'wustha') return [7, 8, 9]
  if (jenjang === 'ulya') return [10, 11, 12]
  return []
}

export function jenjangLabel(j: string): string {
  if (j === 'ula') return 'Ula'
  if (j === 'wustha') return 'Wustha'
  if (j === 'ulya') return 'Ulya'
  return j
}

export function kelasLabel(kelasNum: number | null | undefined, jenjang: string | null | undefined, jenisKelas: string | null | undefined): string {
  if (!kelasNum || !jenjang) return '-'
  if (jenjang === 'ulya') {
    if (jenisKelas === 'tn_a') return `Kelas ${kelasNum}A TN`
    if (jenisKelas === 'tn_b') return `Kelas ${kelasNum}B TN`
    return `Kelas ${kelasNum}` // banin ulya
  }
  if (jenisKelas === 'banat') return `Kelas ${kelasNum} Banat`
  return `Kelas ${kelasNum} Banin` // default banin
}

export function tipeKalenderLabel(t: string): string {
  if (t === 'libur') return 'Libur'
  if (t === 'mid_semester') return 'Mid Semester'
  if (t === 'semester') return 'Ujian Semester'
  return t
}

export function tipeKalenderColor(t: string): string {
  if (t === 'libur') return 'bg-gray-100 text-gray-700'
  if (t === 'mid_semester') return 'bg-orange-100 text-orange-700'
  if (t === 'semester') return 'bg-red-100 text-red-700'
  return 'bg-blue-100 text-blue-700'
}

/** Cek santri cocok kelompok filter monitoring (tn = gabungan tn_a + tn_b). */
export function cocokKelompokMonitoring(santri: { jenis_kelas?: unknown }, kelompok: string): boolean {
  if (kelompok === 'tn') return santri.jenis_kelas === 'tn_a' || santri.jenis_kelas === 'tn_b'
  return santri.jenis_kelas === kelompok
}

/** Total juz dari rentang surahAwal..surahAkhir yang dipilih di form santri (hafalan awal/update). */
export function hitungTotalJuzAwal(surahList: Surah[], formSurahAwal: string, formSurahAkhir: string): number {
  if (!formSurahAwal || !formSurahAkhir) return 0
  const nomorKecil = Math.min(parseInt(formSurahAwal), parseInt(formSurahAkhir))
  const nomorBesar = Math.max(parseInt(formSurahAwal), parseInt(formSurahAkhir))
  const surahKecil = surahList.find(s => s.nomor === nomorKecil)
  const surahBesar = surahList.find(s => s.nomor === nomorBesar)
  if (!surahKecil || !surahBesar) return 0
  return Math.max(0, (surahBesar.halaman_selesai - surahKecil.halaman_mulai + 1) / 20)
}

/** Filter list santri berdasarkan filter Data Santri (jenjang/kelas/guru/jenis_kelas/nama). */
export function filterSantriList(santriList: Santri[], filters: {
  filterJenjang: string
  filterKelas: string
  filterGuruId: string
  filterJenisKelas: string
  searchSantri: string
}): Santri[] {
  return santriList.filter(s => {
    if (filters.filterJenjang !== 'semua' && s.jenjang !== filters.filterJenjang) return false
    if (filters.filterKelas !== 'semua' && s.kelas_num?.toString() !== filters.filterKelas) return false
    if (filters.filterGuruId !== 'semua' && s.guru_id !== filters.filterGuruId) return false
    if (filters.filterJenisKelas !== 'semua' && s.jenis_kelas !== filters.filterJenisKelas) return false
    if (filters.searchSantri && !s.nama?.toLowerCase().includes(filters.searchSantri.toLowerCase())) return false
    return true
  })
}

export type KelompokGuru = 'putra' | 'putri' | 'belum_terklasifikasi'

/**
 * Kelompok Putra/Putri GURU dari field profiles.jenis_kelas (Tahap 7C).
 * SAMA PERSIS dengan mapping akses existing yang sudah dipakai
 * app/guru/utils.ts (filterSantriGuruPengganti), app/api/setoran/route.ts
 * (bisaAksesJenisKelas), dan RLS
 * supabase/migrations/20260808220000_secure_santri_setoran_rls.sql
 * (current_user_can_access_jenis_kelas): banin->Putra, banat/tn->Putri.
 * Nilai lain/null -> belum_terklasifikasi, TIDAK ditebak dari nama guru.
 * Ini murni fungsi presentational/grouping -- tidak menyentuh access model.
 */
export function getKelompokGuru(jenisKelas: string | null | undefined): KelompokGuru {
  if (jenisKelas === 'banin') return 'putra'
  if (jenisKelas === 'banat' || jenisKelas === 'tn') return 'putri'
  return 'belum_terklasifikasi'
}

/** Label tampilan UI untuk jenis_kelas guru -- nilai DB (banin/banat/tn) TIDAK berubah, hanya label yang lebih mudah dibaca. */
export function labelJenisKelasGuru(jenisKelas: string | null | undefined): string {
  if (jenisKelas === 'banin') return 'Putra'
  if (jenisKelas === 'banat') return 'Putri'
  if (jenisKelas === 'tn') return 'Putri (TN)'
  return 'Belum Terklasifikasi'
}

// ===== Tahap 9D -- Penugasan Guru (UI Admin) =====
// Semua fungsi di bagian ini murni UX FILTERING untuk form assign Guru
// Hafalan/Wali Kelas -- BUKAN access model produksi (itu tetap
// app/lib/wingAkses.ts, dipakai Input Setoran & Nilai Ujian, TIDAK disentuh
// Tahap 9D). Database (constraint max-2, partial unique index) tetap jadi
// enforcement terakhir kalau admin memilih guru di luar rekomendasi filter
// ini -- lihat komentar di masing-masing hook.

/**
 * Guru mana yang cocok ditampilkan sebagai kandidat untuk jenis_kelas
 * (domain SANTRI: banin/banat/tn_a/tn_b) target -- dipakai baik untuk
 * dropdown assign Guru Hafalan (target = santri.jenis_kelas) maupun form
 * Wali Kelas (target = jenis_kelas yang dipilih di form). Mapping SENGAJA
 * berbeda dari wing akses produksi (yang membolehkan wing 'banat' mencakup
 * tn_a/tn_b sekaligus) -- ini murni rekomendasi kandidat sesuai instruksi
 * Tahap 9D, bukan aturan keamanan.
 */
export function cocokGuruUntukJenisKelasSantri(guruJenisKelas: string | null | undefined, jenisKelasTarget: string | null | undefined): boolean {
  if (!guruJenisKelas || !jenisKelasTarget) return false
  if (jenisKelasTarget === 'banin') return guruJenisKelas === 'banin'
  if (jenisKelasTarget === 'banat') return guruJenisKelas === 'banat'
  if (jenisKelasTarget === 'tn_a' || jenisKelasTarget === 'tn_b') return guruJenisKelas === 'banat' || guruJenisKelas === 'tn'
  return false
}

/**
 * Jenjang dihitung (bukan ditebak) dari kelas_num lama (profiles.wali_kelas_num)
 * memakai rentang yang sama dengan getKelasOptions() di atas -- dipakai
 * murni untuk panel referensi "Data Wali Kelas Lama" (Tahap 9D bagian L),
 * bukan untuk menulis data apa pun.
 */
export function jenjangDariKelasNumLama(kelasNum: number | null | undefined): string | null {
  if (kelasNum == null) return null
  if (kelasNum >= 1 && kelasNum <= 6) return 'ula'
  if (kelasNum >= 7 && kelasNum <= 9) return 'wustha'
  if (kelasNum >= 10 && kelasNum <= 12) return 'ulya'
  return null
}

/** Label jenis_kelas WALI KELAS LAMA (domain guru: banin/banat/tn) -- 'tn' sengaja diberi label ambigu eksplisit, bukan ditebak jadi tn_a/tn_b. */
export function labelJenisKelasWaliLama(jenisKelas: string | null | undefined): string {
  if (jenisKelas === 'banin') return 'Banin'
  if (jenisKelas === 'banat') return 'Banat'
  if (jenisKelas === 'tn') return 'TN — perlu ditentukan TN A/TN B'
  return '-'
}

/** Label jenis_kelas ASSIGNMENT BARU (domain santri: banin/banat/tn_a/tn_b) untuk tampilan wali_kelas_assignment. */
export function labelJenisKelasSantriUntukAssignment(jenisKelas: string | null | undefined): string {
  if (jenisKelas === 'banin') return 'Banin'
  if (jenisKelas === 'banat') return 'Banat'
  if (jenisKelas === 'tn_a') return 'TN A'
  if (jenisKelas === 'tn_b') return 'TN B'
  return '-'
}

/**
 * Angka tahun awal dari tahun_ajaran (mis. "2026/2027" -> 2026), dipakai
 * murni untuk membandingkan urutan kronologis periode_akademik (Tahap 9H,
 * default periode sumber pada fitur Salin Penugasan). null kalau format
 * tidak dikenali (tidak diawali 4 digit) -- SENGAJA tidak ditebak, supaya
 * periode dengan format tidak standar tidak pernah jadi default sumber
 * yang salah secara diam-diam.
 */
function tahunAjaranKeAngka(tahunAjaran: string): number | null {
  const cocok = tahunAjaran.match(/^(\d{4})/)
  return cocok ? parseInt(cocok[1], 10) : null
}

/**
 * Kandidat default periode SUMBER untuk fitur "Salin Penugasan dari Periode
 * Sebelumnya" (Tahap 9H): periode lain (bukan target) dengan urutan
 * kronologis (tahun_ajaran, semester) PALING DEKAT SEBELUM target. Admin
 * tetap bisa mengganti pilihan ini secara eksplisit -- ini murni default.
 * Mengembalikan '' (tidak ada default aman) kalau target tidak ditemukan,
 * tahun_ajaran target tidak bisa diparse, atau tidak ada kandidat periode
 * lain yang urutannya pasti sebelum target -- TIDAK PERNAH menebak.
 */
export function cariDefaultPeriodeSumber(
  periodeList: { id: string, tahun_ajaran: string, semester: number }[],
  targetId: string,
): string {
  const target = periodeList.find(p => p.id === targetId)
  if (!target) return ''
  const tahunTarget = tahunAjaranKeAngka(target.tahun_ajaran)
  if (tahunTarget === null) return ''

  let terbaik: { id: string, tahun: number, semester: number } | null = null
  for (const p of periodeList) {
    if (p.id === targetId) continue
    const tahun = tahunAjaranKeAngka(p.tahun_ajaran)
    if (tahun === null) continue
    const lebihAwalDariTarget = tahun < tahunTarget || (tahun === tahunTarget && p.semester < target.semester)
    if (!lebihAwalDariTarget) continue
    const lebihBaruDariTerbaikSaatIni = !terbaik
      || tahun > terbaik.tahun
      || (tahun === terbaik.tahun && p.semester > terbaik.semester)
    if (lebihBaruDariTerbaikSaatIni) terbaik = { id: p.id, tahun, semester: p.semester }
  }
  return terbaik?.id || ''
}
