// Verifikasi deterministik: app/lib/salinPenugasan.ts (Tahap 9H, fitur
// "Salin Penugasan dari Periode Sebelumnya") HARUS menegakkan "target
// manual selalu menang" -- assignment yang sudah ada di periode target
// (aktif ATAU tidak aktif) tidak pernah ditimpa/digabung dengan data
// sumber, dan batas maks-2 Guru Hafalan / 1 Wali Kelas per kelas tetap
// terjaga di sisi aplikasi (di atas trigger/index database).
// Bukan unit test framework -- script verifikasi berdiri sendiri:
//   node scripts/verify-salin-penugasan.mjs
// Exit code 0 jika semua cocok, 1 jika ada satu saja yang berbeda.

import {
  klasifikasikanSalinGuruHafalan,
  klasifikasikanSalinWaliKelas,
  ringkasanHafalan,
  ringkasanWaliKelas,
} from '../app/lib/salinPenugasan.ts'

let gagal = 0

function cek(label, aktual, diharapkan) {
  const aktualStr = JSON.stringify(aktual)
  const diharapkanStr = JSON.stringify(diharapkan)
  const cocok = aktualStr === diharapkanStr
  if (!cocok) gagal++
  console.log(`${cocok ? 'PASS' : 'GAGAL'} — ${label}${cocok ? '' : `\n       aktual:     ${aktualStr}\n       diharapkan: ${diharapkanStr}`}`)
}

// ============================================================
// GURU HAFALAN
// ============================================================
console.log('=== GURU HAFALAN ===\n')

// 2. Target kosong -> seluruh assignment sumber yang valid tercopy.
{
  const sumber = [{ guru_id: 'G1', santri_id: 'S1' }]
  const target = []
  const hasil = klasifikasikanSalinGuruHafalan(sumber, target)
  cek('Target kosong -> AKAN_INSERT', hasil, [{ guru_id: 'G1', santri_id: 'S1', rencana: 'AKAN_INSERT' }])
}

// 5. Target exact Guru Hafalan pair sudah ada (aktif) -> skip (SUDAH_ADA_SAMA).
{
  const sumber = [{ guru_id: 'G1', santri_id: 'S1' }]
  const target = [{ guru_id: 'G1', santri_id: 'S1', is_aktif: true }]
  const hasil = klasifikasikanSalinGuruHafalan(sumber, target)
  cek('Exact pair sudah aktif di target -> SUDAH_ADA_SAMA', hasil, [{ guru_id: 'G1', santri_id: 'S1', rencana: 'SUDAH_ADA_SAMA' }])
}

// 6. Inactive pair target -> tidak diaktifkan kembali (tetap SUDAH_ADA_SAMA,
// bukan AKAN_INSERT -- fungsi ini tidak pernah menghasilkan UPDATE).
{
  const sumber = [{ guru_id: 'G1', santri_id: 'S1' }]
  const target = [{ guru_id: 'G1', santri_id: 'S1', is_aktif: false }]
  const hasil = klasifikasikanSalinGuruHafalan(sumber, target)
  cek('Exact pair tidak aktif di target -> SUDAH_ADA_SAMA (bukan diaktifkan)', hasil, [{ guru_id: 'G1', santri_id: 'S1', rencana: 'SUDAH_ADA_SAMA' }])
}

// 4. Target sudah punya Guru Hafalan manual (guru BEDA) untuk santri
// tertentu -> tidak ditimpa/tidak dicampur guru sumber berbeda.
{
  const sumber = [{ guru_id: 'G1', santri_id: 'S1' }] // sumber: G1 untuk S1
  const target = [{ guru_id: 'G2', santri_id: 'S1', is_aktif: true }] // target: manual sudah pakai G2
  const hasil = klasifikasikanSalinGuruHafalan(sumber, target)
  cek('Target sudah diatur manual guru beda -> SKIP_TARGET_SUDAH_DIATUR (walau slot ke-2 masih kosong)',
    hasil, [{ guru_id: 'G1', santri_id: 'S1', rencana: 'SKIP_TARGET_SUDAH_DIATUR' }])
}

// 7. Maks 2 Guru Hafalan tetap terjaga -- 2 kandidat sumber untuk 1 santri,
// target kosong -> KEDUANYA tercopy (persis 2, bukan lebih bukan kurang).
{
  const sumber = [
    { guru_id: 'G1', santri_id: 'S1' },
    { guru_id: 'G2', santri_id: 'S1' },
  ]
  const target = []
  const hasil = klasifikasikanSalinGuruHafalan(sumber, target)
  cek('2 kandidat sumber, target kosong -> keduanya AKAN_INSERT', hasil, [
    { guru_id: 'G1', santri_id: 'S1', rencana: 'AKAN_INSERT' },
    { guru_id: 'G2', santri_id: 'S1', rencana: 'AKAN_INSERT' },
  ])
}

// Defensif: kandidat ke-3 untuk santri yang sama (seharusnya mustahil dari
// sumber nyata karena trigger DB sendiri membatasi maks 2 aktif, murni
// pengaman tambahan aplikasi) -> KONFLIK_MAX_DUA, bukan ikut ter-insert.
{
  const sumber = [
    { guru_id: 'G1', santri_id: 'S1' },
    { guru_id: 'G2', santri_id: 'S1' },
    { guru_id: 'G3', santri_id: 'S1' },
  ]
  const target = []
  const hasil = klasifikasikanSalinGuruHafalan(sumber, target)
  cek('3 kandidat sumber untuk 1 santri (anomali) -> ke-3 KONFLIK_MAX_DUA', hasil, [
    { guru_id: 'G1', santri_id: 'S1', rencana: 'AKAN_INSERT' },
    { guru_id: 'G2', santri_id: 'S1', rencana: 'AKAN_INSERT' },
    { guru_id: 'G3', santri_id: 'S1', rencana: 'KONFLIK_MAX_DUA' },
  ])
}

// Ringkasan (dipakai preview modal) -- gabungan berbagai kategori.
{
  const sumber = [
    { guru_id: 'G1', santri_id: 'S1' }, // AKAN_INSERT
    { guru_id: 'G2', santri_id: 'S2' }, // SUDAH_ADA_SAMA
    { guru_id: 'G3', santri_id: 'S3' }, // SKIP_TARGET_SUDAH_DIATUR
  ]
  const target = [
    { guru_id: 'G2', santri_id: 'S2', is_aktif: true },
    { guru_id: 'G9', santri_id: 'S3', is_aktif: true },
  ]
  const hasil = ringkasanHafalan(klasifikasikanSalinGuruHafalan(sumber, target))
  cek('Ringkasan Guru Hafalan campuran', hasil, {
    aktifSumber: 3, akanDisalin: 1, sudahAdaSama: 1, targetSudahDiatur: 1, konflikMaxDua: 0,
  })
}

// Tidak ada filter wing/kelompok sama sekali (Banat/TN boleh ikut tercopy
// apa adanya kalau memang ada di sumber -- rule G Tahap 9H).
{
  const sumber = [{ guru_id: 'G-banat', santri_id: 'S-tn-b' }]
  const target = []
  const hasil = klasifikasikanSalinGuruHafalan(sumber, target)
  cek('Tidak ada validasi wing di fungsi copy -> tetap AKAN_INSERT apa adanya',
    hasil, [{ guru_id: 'G-banat', santri_id: 'S-tn-b', rencana: 'AKAN_INSERT' }])
}

// ============================================================
// WALI KELAS
// ============================================================
console.log('\n=== WALI KELAS ===\n')

// Target kosong -> AKAN_INSERT.
{
  const sumber = [{ guru_id: 'G1', jenjang: 'ula', kelas_num: 1, jenis_kelas: 'banin' }]
  const target = []
  const hasil = klasifikasikanSalinWaliKelas(sumber, target)
  cek('Kelas target kosong -> AKAN_INSERT', hasil, [{ guru_id: 'G1', jenjang: 'ula', kelas_num: 1, jenis_kelas: 'banin', rencana: 'AKAN_INSERT' }])
}

// Idempotency: exact pair sudah aktif di target -> SUDAH_ADA_SAMA.
{
  const sumber = [{ guru_id: 'G1', jenjang: 'ula', kelas_num: 1, jenis_kelas: 'banin' }]
  const target = [{ guru_id: 'G1', jenjang: 'ula', kelas_num: 1, jenis_kelas: 'banin', is_aktif: true }]
  const hasil = klasifikasikanSalinWaliKelas(sumber, target)
  cek('Exact pair sudah aktif di target -> SUDAH_ADA_SAMA', hasil, [{ guru_id: 'G1', jenjang: 'ula', kelas_num: 1, jenis_kelas: 'banin', rencana: 'SUDAH_ADA_SAMA' }])
}

// Inactive pair target -> tidak diaktifkan kembali.
{
  const sumber = [{ guru_id: 'G1', jenjang: 'ula', kelas_num: 1, jenis_kelas: 'banin' }]
  const target = [{ guru_id: 'G1', jenjang: 'ula', kelas_num: 1, jenis_kelas: 'banin', is_aktif: false }]
  const hasil = klasifikasikanSalinWaliKelas(sumber, target)
  cek('Exact pair tidak aktif di target -> SUDAH_ADA_SAMA (bukan diaktifkan)', hasil, [{ guru_id: 'G1', jenjang: 'ula', kelas_num: 1, jenis_kelas: 'banin', rencana: 'SUDAH_ADA_SAMA' }])
}

// 8. Target kelas Wali sudah punya guru berbeda -> target dipertahankan.
{
  const sumber = [{ guru_id: 'G1', jenjang: 'ula', kelas_num: 1, jenis_kelas: 'banin' }]
  const target = [{ guru_id: 'G2', jenjang: 'ula', kelas_num: 1, jenis_kelas: 'banin', is_aktif: true }]
  const hasil = klasifikasikanSalinWaliKelas(sumber, target)
  cek('Kelas target sudah terisi guru beda -> SKIP_TARGET_KELAS_SUDAH_DIATUR', hasil, [{ guru_id: 'G1', jenjang: 'ula', kelas_num: 1, jenis_kelas: 'banin', rencana: 'SKIP_TARGET_KELAS_SUDAH_DIATUR' }])
}

// 9. Satu guru boleh memegang >1 Wali Kelas -> tetap valid, tidak ada
// pengecekan keunikan guru_id lintas kelas.
{
  const sumber = [
    { guru_id: 'G1', jenjang: 'ula', kelas_num: 1, jenis_kelas: 'banin' },
    { guru_id: 'G1', jenjang: 'ula', kelas_num: 2, jenis_kelas: 'banin' },
  ]
  const target = []
  const hasil = klasifikasikanSalinWaliKelas(sumber, target)
  cek('Satu guru, 2 kelas berbeda -> keduanya AKAN_INSERT (tidak ada unique guru_id)', hasil, [
    { guru_id: 'G1', jenjang: 'ula', kelas_num: 1, jenis_kelas: 'banin', rencana: 'AKAN_INSERT' },
    { guru_id: 'G1', jenjang: 'ula', kelas_num: 2, jenis_kelas: 'banin', rencana: 'AKAN_INSERT' },
  ])
}

// 13. Banat/TN assignment baru dapat dicopy bila memang ada di sumber.
{
  const sumber = [{ guru_id: 'G1', jenjang: 'ulya', kelas_num: 10, jenis_kelas: 'tn_b' }]
  const target = []
  const hasil = klasifikasikanSalinWaliKelas(sumber, target)
  cek('Kelas TN_B ikut tercopy apa adanya (tidak ada filter wing)', hasil, [{ guru_id: 'G1', jenjang: 'ulya', kelas_num: 10, jenis_kelas: 'tn_b', rencana: 'AKAN_INSERT' }])
}

// Ringkasan (dipakai preview modal).
{
  const sumber = [
    { guru_id: 'G1', jenjang: 'ula', kelas_num: 1, jenis_kelas: 'banin' }, // AKAN_INSERT
    { guru_id: 'G2', jenjang: 'ula', kelas_num: 2, jenis_kelas: 'banin' }, // SUDAH_ADA_SAMA
    { guru_id: 'G3', jenjang: 'ula', kelas_num: 3, jenis_kelas: 'banin' }, // SKIP_TARGET_KELAS_SUDAH_DIATUR
  ]
  const target = [
    { guru_id: 'G2', jenjang: 'ula', kelas_num: 2, jenis_kelas: 'banin', is_aktif: true },
    { guru_id: 'G9', jenjang: 'ula', kelas_num: 3, jenis_kelas: 'banin', is_aktif: true },
  ]
  const hasil = ringkasanWaliKelas(klasifikasikanSalinWaliKelas(sumber, target))
  cek('Ringkasan Wali Kelas campuran', hasil, {
    aktifSumber: 3, akanDisalin: 1, sudahAdaSama: 1, targetSudahTerisi: 1,
  })
}

console.log(`\n${gagal === 0 ? 'SEMUA COCOK' : `${gagal} GAGAL`} (${gagal} kegagalan)`)
process.exit(gagal === 0 ? 0 : 1)
