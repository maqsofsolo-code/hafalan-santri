// Type sederhana untuk shape data yang sudah diketahui dari pemakaian nyata
// di modul Guru (Modularisasi Tahap 5A -- cleanup regresi ESLint). Hanya
// dipakai untuk boundary state/hook/component yang BARU muncul akibat
// pemecahan app/guru/page.tsx; TIDAK dimaksudkan jadi type-system ketat
// untuk seluruh skema database. Field nullable ditulis nullable sesuai data
// aslinya (bukan dipaksa `|| 0`/dsb hanya supaya TypeScript diam).
import type { ProfileRow } from '../lib/authClient'

/** Baris profil guru (tabel profiles, role='guru') + kolom yang benar-benar dipakai di halaman Guru. */
export interface GuruProfile extends ProfileRow {
  nama?: string
  jenis_kelas?: string | null
  is_wali_kelas?: boolean | null
  wali_kelas_num?: number | null
  wali_kelas_jenis?: string | null
}

/** Baris santri (tabel santri) + relasi guru:guru_id(nama) yang di-embed sebagian query. */
export type Santri = {
  id: string
  nama: string
  kelas?: string | null
  kelas_num?: number | null
  jenis_kelas?: string | null
  jenjang?: string | null
  status?: string | null
  guru_id?: string | null
  guru_id_2?: string | null
  total_hafalan_juz?: number | null
  surah_terakhir_nomor?: number | null
  ayat_terakhir?: number | null
  guru?: { nama: string | null } | null
}

/** Baris surah (tabel surah). halaman_selesai memang nullable pada sebagian data -- lihat app/guru/utils.ts. */
export type Surah = {
  nomor: number
  nama_latin: string
  jumlah_ayat: number
  halaman_mulai: number
  halaman_selesai?: number | null
}

/** Baris kalender_akademik (dipakai untuk kalender aktif & kalender ujian aktif). */
export type KalenderAkademik = {
  id: string
  nama: string
  tipe: string
  tanggal_mulai?: string
  tanggal_selesai?: string
  semester?: number | null
}

/** Baris setoran versi ringkas (dipakai untuk cek Murojaah/kunci Wustha hari ini -- bukan riwayat lengkap). */
export type SetoranLite = {
  id: string
  status: string
  tanggal?: string
  created_at?: string
}

/** Baris setoran + relasi santri/surah_mulai/surah_selesai untuk tab Riwayat Setoran. */
export type SetoranRiwayat = {
  id: string
  santri?: { nama: string | null } | null
  surah_mulai?: { nama_latin: string | null } | null
  surah_selesai?: { nama_latin: string | null } | null
  surah?: string | null
  surah_mulai_nomor?: number | null
  surah_selesai_nomor?: number | null
  tanggal: string
  jenis: string
  status: string
  status_kehadiran: string
  ayat_mulai?: number | null
  ayat_selesai?: number | null
  catatan?: string | null
  guru_pengganti?: boolean | null
}

/** Periode akademik resmi (tabel periode_akademik). */
export type PeriodeAkademik = {
  id: string
  tahun_ajaran: string
  semester: number
  tanggal_mulai?: string
  tanggal_selesai?: string
  is_aktif: boolean
  rapot_input_dibuka: boolean
}

/** Legacy alias untuk kompatibilitas */
export type PeriodeRapot = PeriodeAkademik & {
  nama?: string
}

export type WaliKelasAssignmentItem = {
  id: string
  jenjang: string
  kelas_num: number
  jenis_kelas: string
  is_aktif: boolean
}

export type SantriRapotItem = {
  id: string
  nama: string
  nisn?: string | null
  kelas_num: number
  jenjang: string
  jenis_kelas: string
  status: string
  total_hafalan_juz?: number | null
  has_nilai: boolean
  nilai_id?: string | null
  nilai?: any
}

/** Form input nilai rapot -- field dinamis (angka sebagai string dari <input>, huruf A/B/C dari <select>). */
export type NilaiRapotForm = Record<string, string | number>

/** Satu baris nilai_rapot dari endpoint /api/guru/rapot-digital-rekap-kelas, sebelum rata-rata/peringkat dihitung. */
export type RapotNilaiApiRow = {
  id: string
  santri?: { nama: string | null } | null
  kelancaran?: number | null
  tajwid?: number | null
  aqidah?: number | null
  akhlak?: number | null
  fiqh?: number | null
  bhs_arab?: number | null
  siroh?: number | null
  khoth?: number | null
  bhs_indonesia?: number | null
  berhitung?: number | null
  ipa?: number | null
  ips?: number | null
}

/** RapotNilaiApiRow + rata-rata/peringkat yang dihitung di useRapotDigital.fetchRekapKelasByGuru. */
export type RapotRekapRow = RapotNilaiApiRow & {
  rata_diiniyyah: number | null
  rata_umum: number | null
  rata_akhir: number
  peringkat: number
}
