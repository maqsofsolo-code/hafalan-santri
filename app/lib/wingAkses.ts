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

// ============================================================
// Tahap 9L -- validasi kandidat Guru Hafalan (CREATE santri & Import
// Excel). Ditaruh di file yang sama (bukan file baru yang meng-import
// bisaAksesJenisKelas dari sini) supaya tidak ada relative import
// antar-file lib -- Node native TS-stripping (dipakai scripts/verify-*.mjs)
// mewajibkan ekstensi eksplisit utk relative import, sedangkan tsconfig
// project ("moduleResolution": "bundler", tanpa allowImportingTsExtensions)
// justru MENOLAK ekstensi ".ts" eksplisit di import produksi -- taruh di
// file sendiri menghindari konflik itu sekaligus, bukan workaround.
export type ProfilGuruRingkas = { id: string, role: string | null, jenis_kelas: string | null }

export type StatusValidasiGuru =
  | 'VALID'
  | 'GURU_TIDAK_DITEMUKAN'
  | 'BUKAN_ROLE_GURU'
  | 'LINTAS_WING'

export type HasilValidasiGuru = {
  guruId: string
  status: StatusValidasiGuru
}

/**
 * Validasi SATU kandidat guru terhadap jenis_kelas santri target, TANPA
 * DB. `profil` adalah hasil lookup profiles.id/role/jenis_kelas yang
 * SUDAH dilakukan pemanggil (server) -- fungsi ini murni logic keputusan,
 * bukan fetcher.
 */
export function validasiKandidatGuru(
  guruId: string,
  profil: ProfilGuruRingkas | undefined,
  santriJenisKelas: string | null | undefined,
): HasilValidasiGuru {
  if (!profil) return { guruId, status: 'GURU_TIDAK_DITEMUKAN' }
  if (profil.role !== 'guru') return { guruId, status: 'BUKAN_ROLE_GURU' }
  if (!bisaAksesJenisKelas(profil.jenis_kelas, santriJenisKelas)) return { guruId, status: 'LINTAS_WING' }
  return { guruId, status: 'VALID' }
}

/**
 * Validasi slot Guru 1 & Guru 2 sekaligus (dipakai CREATE santri).
 * `guruId`/`guruId2` boleh kosong (opsional). Kalau keduanya terisi dan
 * SAMA PERSIS -> ditolak lebih dulu (duplikat), sebelum validasi wing
 * per slot -- sesuai aturan "tidak boleh guru yang sama dua kali".
 */
export type HasilValidasiDuaSlot = {
  duplikat: boolean
  slot1: HasilValidasiGuru | null
  slot2: HasilValidasiGuru | null
}

export function validasiDuaSlotGuru(
  guruId: string | null | undefined,
  guruId2: string | null | undefined,
  profilMap: Map<string, ProfilGuruRingkas>,
  santriJenisKelas: string | null | undefined,
): HasilValidasiDuaSlot {
  const g1 = guruId && guruId.trim() ? guruId.trim() : null
  const g2 = guruId2 && guruId2.trim() ? guruId2.trim() : null

  if (g1 && g2 && g1 === g2) {
    return { duplikat: true, slot1: null, slot2: null }
  }

  return {
    duplikat: false,
    slot1: g1 ? validasiKandidatGuru(g1, profilMap.get(g1), santriJenisKelas) : null,
    slot2: g2 ? validasiKandidatGuru(g2, profilMap.get(g2), santriJenisKelas) : null,
  }
}
