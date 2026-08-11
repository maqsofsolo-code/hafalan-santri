// Type sederhana untuk shape data yang dipakai nyata di modul Admin
// (Modularisasi Tahap 6A). Sama seperti app/guru/types.ts: hanya boundary
// state/hook/component yang butuh tipe konkret, bukan type-system ketat
// untuk seluruh skema database. Field nullable ditulis nullable sesuai data
// aslinya, tidak dipaksa non-null demi TypeScript.
import type { ProfileRow } from '../lib/authClient'
import type { PenugasanHafalan, WaliKelasAssignment } from '../lib/assignmentTypes'

/** Baris profil guru (tabel profiles, role='guru') + kolom yang dipakai halaman Admin. */
export interface Guru extends ProfileRow {
  nama?: string
  no_wa?: string | null
  jenis_kelas?: string | null
  is_wali_kelas?: boolean | null
  wali_kelas_num?: number | null
  wali_kelas_jenis?: string | null
}

/** Baris profil wali (tabel profiles, role='wali'). */
export interface Wali extends ProfileRow {
  nama?: string
  no_wa?: string | null
}

/** Baris santri (tabel santri) + relasi guru:guru_id(nama) & wali:wali_id(nama) yang di-embed sebagian query. */
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
  wali_id?: string | null
  total_hafalan_juz?: number | null
  surah_terakhir_nomor?: number | null
  ayat_terakhir?: number | null
  nik?: string | null
  nisn?: string | null
  tempat_lahir?: string | null
  tanggal_lahir?: string | null
  alamat?: string | null
  tahun_lulus?: string | null
  keterangan_keluar?: string | null
  guru?: { nama: string | null } | null
  wali?: { nama: string | null } | null
}

/** Baris surah (tabel surah). */
export type Surah = {
  nomor: number
  nama_latin: string
  jumlah_ayat: number
  halaman_mulai: number
  halaman_selesai?: number | null
}

/** Baris kalender_akademik. */
export type KalenderAkademik = {
  id: string
  nama: string
  tipe: string
  semester?: number | null
  tanggal_mulai: string
  tanggal_selesai: string
  keterangan?: string | null
}

/** Baris setoran hari ini (dashboard) + relasi santri:santri_id(nama). */
export type SetoranHariIni = {
  id: string
  santri_id?: string
  guru_id?: string
  santri?: { nama: string | null } | null
  surah?: string | null
  ayat_mulai?: number | null
  ayat_selesai?: number | null
  status?: string | null
  status_kehadiran?: string | null
  jenis?: string | null
}

/** Periode rapot (tabel periode_rapot). */
export type PeriodeRapot = {
  id: string
  nama: string
  tahun_ajaran: string
  semester: string
  tanggal_rapot?: string | null
  is_aktif: boolean
}

/** Form input nilai rapot -- field dinamis (angka sebagai string dari <input>, huruf A/B/C dari <select>). */
export type NilaiRapotForm = Record<string, string | number>

/** Satu baris nilai_rapot rekap kelas admin, sebelum rata-rata/peringkat dihitung -- termasuk status santri (aktif/alumni/keluar), khusus Admin (Guru tidak melihat alumni). */
export type RapotNilaiApiRow = {
  id: string
  santri?: { nama: string | null, kelas_num: number | null, jenjang: string | null, status: string | null } | null
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

/** RapotNilaiApiRow + rata-rata/peringkat yang dihitung di useAdminRapot.fetchRekapKelas. */
export type RapotRekapRow = RapotNilaiApiRow & {
  rata_diiniyyah: number | null
  rata_umum: number | null
  rata_akhir: number
  peringkat: number
}

/** Payload ke /api/create-user (tambah/update/hapus akun guru & wali). */
export type CreateUserRequest = {
  email?: string
  password?: string
  nama?: string
  role?: 'guru' | 'wali'
  no_wa?: string
  userId?: string
  isUpdate?: boolean
  isDelete?: boolean
}

export type CreateUserResponse = {
  success?: boolean
  error?: string
  user?: unknown
}

/** Ranking hasil hitungRankingTotalHafalan/Konsistensi/Semangat (app/lib/ranking.ts) -- longgar karena field turnkey berbeda per jenis ranking. */
export type SantriRanking = Santri & {
  total_hafalan_juz?: number | null
  najihLama?: number
  rosibLama?: number
  najihBaru?: number
  rosibBaru?: number
  totalPoin?: number
  poinMaksimal?: number
  persentaseKonsistensi?: number
  tambahHalaman7Hari?: number
  periodeKonsistensi?: string
}

export type SantriKelompokMonitoring = {
  jenjang?: unknown
  jenis_kelas?: unknown
}

// ===== Tahap 9D -- Penugasan Guru (fondasi tabel dari Tahap 9B) =====
// Type dasar (PeriodeAkademik/PenugasanHafalan/WaliKelasAssignment) hidup di
// app/lib/assignmentTypes.ts (dibuat Tahap 9B, dipakai lintas modul kalau
// perlu) -- di sini hanya diperluas dengan relasi guru:guru_id(nama) yang
// di-embed lewat query Admin, supaya tidak duplikasi field dasar.
export type { PeriodeAkademik } from '../lib/assignmentTypes'

/** Baris penugasan_hafalan + relasi guru:guru_id(nama) yang di-embed query Admin. */
export type PenugasanHafalanRow = PenugasanHafalan & {
  guru?: { nama: string | null } | null
}

/** Baris wali_kelas_assignment + relasi guru:guru_id(nama) yang di-embed query Admin. */
export type WaliKelasAssignmentRow = WaliKelasAssignment & {
  guru?: { nama: string | null } | null
}
