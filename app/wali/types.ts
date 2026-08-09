// Tipe data untuk halaman Wali -- dipisah dari app/wali/page.tsx pada
// Modularisasi Tahap 8A. Field nullable/optional dibiarkan nullable/optional
// (project pakai strict:false, jadi tidak perlu fallback baru demi typing).
// Hanya menipekan shape yang benar-benar dipakai di halaman ini.
import type { ProfileRow } from '../lib/authClient'

export type WaliProfile = ProfileRow & {
  nama?: string
}

/** Baris santri (tabel santri, scoped wali_id = wali login) + relasi guru:guru_id(nama). */
export type Santri = {
  id: string
  nama: string
  kelas?: string | null
  kelas_num?: number | null
  jenjang?: string | null
  jenis_kelas?: string | null
  total_hafalan_juz?: number | null
  guru?: { nama?: string } | null
}

/** Baris setoran (riwayat & laporan hari ini) -- Wali read-only, hanya milik anak sendiri (RLS). */
export type SetoranRow = {
  id: string
  santri_id?: string
  tanggal: string
  jenis: string
  status: string | null
  status_kehadiran: string | null
  surah?: string | null
  ayat_mulai?: number | null
  ayat_selesai?: number | null
  catatan?: string | null
  created_at?: string
}

/**
 * Satu baris santri sekelas dari GET /api/wali/ranking-data (santriKelas) --
 * proyeksi kolom terbatas sengaja (Security Fix Tahap 4 bagian G), endpoint
 * TIDAK diubah di Tahap 8A ini.
 */
export type SantriKelasRanking = {
  id: string
  nama: string
  total_hafalan_juz?: number | null
  kelas_num?: number | null
  jenjang?: string | null
  jenis_kelas?: string | null
}

/** Baris setoran sekelas (setoran7Hari/setoranPekanKonsistensi) dari endpoint yang sama. */
export type SetoranKelasRow = {
  santri_id: string
  tanggal: string
  jenis: string
  penambahan_juz: unknown
  status_kehadiran: string | null
  status: string | null
}

/** Baris kalender_akademik (tipe='libur') dipakai fetchDataKelas untuk hitung hari aktif. */
export type KalenderAkademik = {
  tanggal_mulai: string
  tanggal_selesai: string
}
