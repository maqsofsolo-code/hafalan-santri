// Satu-satunya definisi mapping "wing" (profiles.jenis_kelas Guru -> jenis_kelas
// Santri yang boleh diakses) yang dipakai bersama oleh lebih dari satu route API
// server-side. Dipindah dari app/api/setoran/route.ts (URGENT FIX akses Nilai
// Ujian) supaya app/api/nilai-ujian/route.ts bisa reuse fungsi yang sama persis,
// bukan menyalin ulang mapping-nya.
//
// Mapping ini SENGAJA bukan equality murni -- ini adalah keputusan bisnis final
// (OPSI A) yang harus tetap identik dengan public.current_user_can_access_jenis_kelas()
// di supabase/migrations/20260808220000_secure_santri_setoran_rls.sql. Jangan
// ubah salah satu tanpa mengubah yang lain.
export function bisaAksesJenisKelas(guruJenisKelas: unknown, targetJenisKelas: unknown): boolean {
  if (typeof targetJenisKelas !== 'string' || !targetJenisKelas) return false
  if (guruJenisKelas === 'banin') return targetJenisKelas === 'banin'
  if (guruJenisKelas === 'banat') return targetJenisKelas === 'banat' || targetJenisKelas === 'tn_a' || targetJenisKelas === 'tn_b'
  if (guruJenisKelas === 'tn') return targetJenisKelas === 'tn_a' || targetJenisKelas === 'tn_b'
  return false
}

const SEMUA_JENIS_KELAS_SANTRI = ['banin', 'banat', 'tn_a', 'tn_b'] as const

/** Daftar jenis_kelas Santri yang boleh diakses guru dengan wing tertentu -- diturunkan dari bisaAksesJenisKelas() supaya tidak pernah menyimpang dari predikat di atas. Dipakai untuk query `.in('jenis_kelas', ...)`. */
export function jenisKelasWingList(guruJenisKelas: unknown): string[] {
  return SEMUA_JENIS_KELAS_SANTRI.filter(target => bisaAksesJenisKelas(guruJenisKelas, target))
}
