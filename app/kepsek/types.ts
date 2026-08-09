// Tipe data untuk halaman Kepsek -- dipisah dari app/kepsek/page.tsx pada
// Modularisasi Tahap 7A. Field nullable/optional dibiarkan nullable/optional
// (project pakai strict:false, jadi tidak perlu fallback baru demi typing).
// Hanya menipekan shape yang benar-benar dipakai di halaman ini.
import type { ProfileRow } from '../lib/authClient'

export type Guru = ProfileRow & {
  nama?: string
}

export type Santri = {
  id: string
  nama: string
  kelas?: string | null
  kelas_num?: number | null
  jenjang?: string | null
  jenis_kelas?: string | null
  total_hafalan_juz?: number | null
  guru_id?: string | null
  guru?: { nama?: string } | null
}

export type KalenderAkademik = {
  id: string
  nama: string
  tipe: string
  tanggal_mulai: string
  tanggal_selesai: string
}

export type SetoranRow = {
  id: string
  santri_id: string
  tanggal: string
  jenis: string
  status: string | null
  status_kehadiran: string | null
  penambahan_juz?: unknown
  jumlah_halaman_murojaah?: number | null
  santri?: {
    nama?: string
    total_hafalan_juz?: number | null
    kelas?: string | null
    kelas_num?: number | null
    jenjang?: string | null
    guru?: { nama?: string } | null
  } | null
}

export type AbsensiGuru = {
  id: string
  guru_id: string
  tanggal: string
  sesi: string
  guru?: { nama?: string } | null
}

export type NilaiUjianRow = {
  id: string
  santri_id: string
  guru_id: string
  tanggal: string
  nilai_akhir: number | null
  jumlah_tegur?: number | null
  jumlah_tahu_ayat?: number | null
  jumlah_lupa?: number | null
  catatan?: string | null
  santri?: { nama?: string; kelas?: string | null; kelas_num?: number | null; jenjang?: string | null } | null
  guru?: { nama?: string } | null
  surah_mulai?: { nama_latin?: string } | null
  surah_selesai?: { nama_latin?: string } | null
}
