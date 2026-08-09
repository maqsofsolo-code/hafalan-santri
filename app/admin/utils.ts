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
