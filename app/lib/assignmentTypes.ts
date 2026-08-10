// Type sederhana untuk tabel fondasi Sistem Penugasan Guru (Tahap 9B):
// periode_akademik, penugasan_hafalan, wali_kelas_assignment. Tabel-tabel
// ini BELUM dipakai oleh UI/API manapun -- file ini murni mendokumentasikan
// bentuk baris sesuai skema migration
// supabase/migrations/20260810090000_add_penugasan_guru_foundation.sql,
// supaya siap dipakai saat UI/endpoint-nya dibangun di tahap berikutnya.
// Bukan pengganti model lama (profiles.jenis_kelas, santri.guru_id/
// guru_id_2, profiles.is_wali_kelas/wali_kelas_num/wali_kelas_jenis) --
// model lama tetap berjalan penuh selama masa transisi.

export type PeriodeAkademik = {
  id: string
  tahun_ajaran: string
  semester: 1 | 2
  tanggal_mulai: string
  tanggal_selesai: string
  is_aktif: boolean
  created_at: string
  updated_at: string
}

/** Penugasan Guru Hafalan per santri per periode (maks. 2 aktif per santri+periode). */
export type PenugasanHafalan = {
  id: string
  guru_id: string
  santri_id: string
  periode_id: string
  is_aktif: boolean
  created_at: string
  updated_at: string
}

/** Penugasan Wali Kelas per kelas per periode (maks. 1 aktif per kelas+periode). jenis_kelas memakai domain santri, bukan domain guru. */
export type WaliKelasAssignment = {
  id: string
  guru_id: string
  periode_id: string
  jenjang: 'ula' | 'wustha' | 'ulya'
  kelas_num: number
  jenis_kelas: 'banin' | 'banat' | 'tn_a' | 'tn_b'
  is_aktif: boolean
  created_at: string
  updated_at: string
}
