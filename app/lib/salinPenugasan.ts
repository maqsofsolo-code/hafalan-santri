// Tahap 9H -- "Salin Penugasan dari Periode Sebelumnya". Menyalin baris
// AKTIF dari public.penugasan_hafalan & public.wali_kelas_assignment (model
// BARU Tahap 9B, BUKAN legacy santri.guru_id/guru_id_2 atau
// profiles.is_wali_kelas/wali_kelas_num/wali_kelas_jenis -- keduanya sama
// sekali tidak dibaca/ditulis di file ini) dari satu periode_akademik ke
// periode_akademik lain.
//
// PRINSIP UTAMA: "target manual selalu menang" -- assignment yang sudah ada
// di periode target (aktif ATAU tidak aktif -- baris tidak aktif adalah
// histori yang sengaja tidak diaktifkan kembali, lihat klasifikasi di bawah)
// TIDAK PERNAH ditimpa/digabung dengan data sumber.
//
// Fungsi klasifikasi (klasifikasikanSalinGuruHafalan/klasifikasikanSalinWaliKelas)
// SENGAJA murni (tidak menyentuh DB) supaya persis SATU implementasi rule
// yang dipakai baik oleh preview (GET) maupun eksekusi (POST) pada
// app/api/admin/salin-penugasan/route.ts -- preview dan eksekusi tidak
// pernah punya rule yang berbeda, dan fungsi ini bisa diuji langsung lewat
// scripts/verify-salin-penugasan.mjs tanpa koneksi database.

export type BarisHafalanSumber = { guru_id: string, santri_id: string }
export type BarisHafalanTarget = { guru_id: string, santri_id: string, is_aktif: boolean }
export type RencanaHafalan = 'AKAN_INSERT' | 'SUDAH_ADA_SAMA' | 'SKIP_TARGET_SUDAH_DIATUR' | 'KONFLIK_MAX_DUA'
export type BarisRencanaHafalan = BarisHafalanSumber & { rencana: RencanaHafalan }

export type BarisWaliSumber = { guru_id: string, jenjang: string, kelas_num: number, jenis_kelas: string }
export type BarisWaliTarget = BarisWaliSumber & { is_aktif: boolean }
export type RencanaWali = 'AKAN_INSERT' | 'SUDAH_ADA_SAMA' | 'SKIP_TARGET_KELAS_SUDAH_DIATUR'
export type BarisRencanaWali = BarisWaliSumber & { rencana: RencanaWali }

// Rule Guru Hafalan (Tahap 9H bagian E), diperiksa berurutan per baris sumber:
//   1. Pasangan guru_id+santri_id PERSIS sudah ada di target (aktif ATAU
//      tidak aktif) -> SUDAH_ADA_SAMA. Baris tidak aktif TIDAK PERNAH
//      diaktifkan kembali oleh fungsi ini (tidak ada UPDATE sama sekali di
//      seluruh alur salin -- hanya INSERT baris baru).
//   2. Santri target SUDAH punya assignment aktif lain (bukan pasangan yang
//      sama persis, sudah dicek di langkah 1) -> SKIP_TARGET_SUDAH_DIATUR,
//      TIDAK PEDULI berapa sisa slot (maks 2) yang secara teknis masih
//      kosong -- assignment manual/existing di target dianggap keputusan
//      final, tidak boleh dicampur dengan kandidat sumber lain.
//   3. Santri target belum punya assignment aktif SAMA SEKALI -> aman
//      disalin (AKAN_INSERT), dibatasi defensif maksimal 2 per santri
//      dalam SATU proses salin ini (KONFLIK_MAX_DUA untuk kandidat ke-3+ --
//      seharusnya tidak pernah terjadi karena sumber sendiri sudah dibatasi
//      trigger enforce_max_2_penugasan_hafalan_aktif yang sama, murni
//      pengaman tambahan di sisi aplikasi).
export function klasifikasikanSalinGuruHafalan(
  sumberAktif: BarisHafalanSumber[],
  targetSemua: BarisHafalanTarget[],
): BarisRencanaHafalan[] {
  const pasanganTargetSet = new Set(targetSemua.map(r => `${r.guru_id}|${r.santri_id}`))
  const santriAktifTargetSet = new Set(targetSemua.filter(r => r.is_aktif).map(r => r.santri_id))
  const jumlahAkanInsertPerSantri = new Map<string, number>()

  return sumberAktif.map(row => {
    const pasanganKey = `${row.guru_id}|${row.santri_id}`
    if (pasanganTargetSet.has(pasanganKey)) return { ...row, rencana: 'SUDAH_ADA_SAMA' as const }
    if (santriAktifTargetSet.has(row.santri_id)) return { ...row, rencana: 'SKIP_TARGET_SUDAH_DIATUR' as const }

    const sudahDihitung = jumlahAkanInsertPerSantri.get(row.santri_id) || 0
    if (sudahDihitung >= 2) return { ...row, rencana: 'KONFLIK_MAX_DUA' as const }
    jumlahAkanInsertPerSantri.set(row.santri_id, sudahDihitung + 1)
    return { ...row, rencana: 'AKAN_INSERT' as const }
  })
}

// Rule Wali Kelas (Tahap 9H bagian F), diperiksa berurutan per baris sumber.
// Identitas kelas = jenjang+kelas_num+jenis_kelas (BUKAN guru_id -- satu
// guru boleh menjadi wali lebih dari satu kelas, jadi TIDAK ADA pengecekan
// keunikan guru_id di fungsi ini sama sekali, sesuai keputusan final):
//   1. Pasangan guru_id+kelas PERSIS sudah ada di target (aktif atau tidak
//      aktif) -> SUDAH_ADA_SAMA, baris tidak aktif tidak pernah diaktifkan
//      kembali (sama seperti Guru Hafalan).
//   2. Kelas target SUDAH punya wali aktif LAIN -> SKIP_TARGET_KELAS_SUDAH_DIATUR.
//   3. Kelas target belum punya wali aktif sama sekali -> AKAN_INSERT.
export function klasifikasikanSalinWaliKelas(
  sumberAktif: BarisWaliSumber[],
  targetSemua: BarisWaliTarget[],
): BarisRencanaWali[] {
  const pasanganTargetSet = new Set(targetSemua.map(r => `${r.guru_id}|${r.jenjang}|${r.kelas_num}|${r.jenis_kelas}`))
  const kelasAktifTargetSet = new Set(targetSemua.filter(r => r.is_aktif).map(r => `${r.jenjang}|${r.kelas_num}|${r.jenis_kelas}`))

  return sumberAktif.map(row => {
    const pasanganKey = `${row.guru_id}|${row.jenjang}|${row.kelas_num}|${row.jenis_kelas}`
    const kelasKey = `${row.jenjang}|${row.kelas_num}|${row.jenis_kelas}`
    if (pasanganTargetSet.has(pasanganKey)) return { ...row, rencana: 'SUDAH_ADA_SAMA' as const }
    if (kelasAktifTargetSet.has(kelasKey)) return { ...row, rencana: 'SKIP_TARGET_KELAS_SUDAH_DIATUR' as const }
    return { ...row, rencana: 'AKAN_INSERT' as const }
  })
}

export type RingkasanHafalan = {
  aktifSumber: number
  akanDisalin: number
  sudahAdaSama: number
  targetSudahDiatur: number
  konflikMaxDua: number
}
export function ringkasanHafalan(rows: BarisRencanaHafalan[]): RingkasanHafalan {
  return {
    aktifSumber: rows.length,
    akanDisalin: rows.filter(r => r.rencana === 'AKAN_INSERT').length,
    sudahAdaSama: rows.filter(r => r.rencana === 'SUDAH_ADA_SAMA').length,
    targetSudahDiatur: rows.filter(r => r.rencana === 'SKIP_TARGET_SUDAH_DIATUR').length,
    konflikMaxDua: rows.filter(r => r.rencana === 'KONFLIK_MAX_DUA').length,
  }
}

export type RingkasanWali = {
  aktifSumber: number
  akanDisalin: number
  sudahAdaSama: number
  targetSudahTerisi: number
}
export function ringkasanWaliKelas(rows: BarisRencanaWali[]): RingkasanWali {
  return {
    aktifSumber: rows.length,
    akanDisalin: rows.filter(r => r.rencana === 'AKAN_INSERT').length,
    sudahAdaSama: rows.filter(r => r.rencana === 'SUDAH_ADA_SAMA').length,
    targetSudahTerisi: rows.filter(r => r.rencana === 'SKIP_TARGET_KELAS_SUDAH_DIATUR').length,
  }
}

// ============================================================
// I/O -- pembungkus tipis di atas fungsi murni di atas. Dipakai oleh
// app/api/admin/salin-penugasan/route.ts, baik GET (preview) maupun
// POST (eksekusi) -- SATU fungsi klasifikasi yang sama dipanggil di kedua
// mode, tidak ada rule terpisah untuk preview vs eksekusi.
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'

export async function ambilRencanaSalinPenugasan(
  adminClient: SupabaseClient,
  sourcePeriodeId: string,
  targetPeriodeId: string,
): Promise<{ error: string } | { guruHafalan: BarisRencanaHafalan[], waliKelas: BarisRencanaWali[] }> {
  const [sourceHafalanRes, targetHafalanRes, sourceWaliRes, targetWaliRes] = await Promise.all([
    adminClient.from('penugasan_hafalan').select('guru_id, santri_id').eq('periode_id', sourcePeriodeId).eq('is_aktif', true),
    adminClient.from('penugasan_hafalan').select('guru_id, santri_id, is_aktif').eq('periode_id', targetPeriodeId),
    adminClient.from('wali_kelas_assignment').select('guru_id, jenjang, kelas_num, jenis_kelas').eq('periode_id', sourcePeriodeId).eq('is_aktif', true),
    adminClient.from('wali_kelas_assignment').select('guru_id, jenjang, kelas_num, jenis_kelas, is_aktif').eq('periode_id', targetPeriodeId),
  ])
  if (sourceHafalanRes.error || targetHafalanRes.error || sourceWaliRes.error || targetWaliRes.error) {
    return { error: 'Gagal membaca data penugasan.' }
  }

  return {
    guruHafalan: klasifikasikanSalinGuruHafalan(
      (sourceHafalanRes.data || []) as BarisHafalanSumber[],
      (targetHafalanRes.data || []) as BarisHafalanTarget[],
    ),
    waliKelas: klasifikasikanSalinWaliKelas(
      (sourceWaliRes.data || []) as BarisWaliSumber[],
      (targetWaliRes.data || []) as BarisWaliTarget[],
    ),
  }
}

export type HasilEksekusiHafalan = { berhasil: number, sudahAdaSama: number, targetSudahDiatur: number, konflikMaxDua: number, gagalLain: number }
export type HasilEksekusiWali = { berhasil: number, sudahAdaSama: number, targetSudahTerisi: number, gagalLain: number }

// Eksekusi: HANYA baris berencana AKAN_INSERT yang benar-benar di-INSERT
// (satu per satu, mengikuti pola existing handleBulkAssignGuruHafalan di
// app/admin/hooks/useAdminPenugasanGuru.ts -- bukan pola baru). Baris
// kategori lain hanya dihitung ulang jadi angka hasil, tidak pernah
// menyentuh DB. TIDAK ADA UPDATE di mana pun dalam fungsi ini -- baris
// existing (aktif maupun tidak aktif) di target tidak pernah diubah.
// Gagal pada satu baris TIDAK menghentikan baris lain (partial-failure
// tolerant by design, lihat komentar arsitektur di route.ts) -- aman
// dijalankan ulang kapan pun karena hasil akhir idempotent (baris yang
// sudah berhasil di-copy sebelumnya otomatis menjadi SUDAH_ADA_SAMA pada
// pemanggilan berikutnya).
export async function eksekusiSalinPenugasan(
  adminClient: SupabaseClient,
  targetPeriodeId: string,
  guruHafalan: BarisRencanaHafalan[],
  waliKelas: BarisRencanaWali[],
): Promise<{ guruHafalan: HasilEksekusiHafalan, waliKelas: HasilEksekusiWali }> {
  const hasilHafalan: HasilEksekusiHafalan = { berhasil: 0, sudahAdaSama: 0, targetSudahDiatur: 0, konflikMaxDua: 0, gagalLain: 0 }
  for (const row of guruHafalan) {
    if (row.rencana === 'SUDAH_ADA_SAMA') { hasilHafalan.sudahAdaSama++; continue }
    if (row.rencana === 'SKIP_TARGET_SUDAH_DIATUR') { hasilHafalan.targetSudahDiatur++; continue }
    if (row.rencana === 'KONFLIK_MAX_DUA') { hasilHafalan.konflikMaxDua++; continue }

    const { error } = await adminClient.from('penugasan_hafalan').insert({
      guru_id: row.guru_id, santri_id: row.santri_id, periode_id: targetPeriodeId, is_aktif: true,
    })
    if (!error) { hasilHafalan.berhasil++; continue }
    if (error.message.includes('penugasan_hafalan_guru_santri_periode_key')) { hasilHafalan.sudahAdaSama++; continue }
    if (error.message.includes('sudah memiliki 2 Guru Hafalan aktif')) { hasilHafalan.konflikMaxDua++; continue }
    hasilHafalan.gagalLain++
  }

  const hasilWali: HasilEksekusiWali = { berhasil: 0, sudahAdaSama: 0, targetSudahTerisi: 0, gagalLain: 0 }
  for (const row of waliKelas) {
    if (row.rencana === 'SUDAH_ADA_SAMA') { hasilWali.sudahAdaSama++; continue }
    if (row.rencana === 'SKIP_TARGET_KELAS_SUDAH_DIATUR') { hasilWali.targetSudahTerisi++; continue }

    const { error } = await adminClient.from('wali_kelas_assignment').insert({
      guru_id: row.guru_id, periode_id: targetPeriodeId, jenjang: row.jenjang, kelas_num: row.kelas_num, jenis_kelas: row.jenis_kelas, is_aktif: true,
    })
    if (!error) { hasilWali.berhasil++; continue }
    if (error.message.includes('wali_kelas_assignment_satu_aktif_per_kelas')) { hasilWali.targetSudahTerisi++; continue }
    hasilWali.gagalLain++
  }

  return { guruHafalan: hasilHafalan, waliKelas: hasilWali }
}
