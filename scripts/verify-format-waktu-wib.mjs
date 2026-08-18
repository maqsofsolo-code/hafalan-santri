// Verifikasi deterministik: app/lib/dateWib.ts formatWaktuWIB() (Tahap 9N)
// -- perbaikan bug produksi "input Nilai Ujian jam 08:00 WIB tampil jadi
// 01:xx di Rekap Admin". Akar masalah: timestamp DB yang sampai ke client
// TANPA penanda zona eksplisit (tanpa akhiran Z/offset) ditafsirkan
// `new Date()` sebagai waktu LOKAL runtime, bukan UTC -- formatWaktuWIB
// memaksa string semacam itu dibaca sebagai UTC lebih dulu sebelum
// dikonversi ke WIB. Format jam pakai titik ("08.30", bukan "08:30") --
// itu konvensi ICU locale id-ID bawaan `toLocaleString`, SAMA PERSIS
// dengan output formatWaktu() lama yang digantikan (bukan regresi
// tampilan). Bukan unit test framework -- script verifikasi berdiri
// sendiri:
//   node scripts/verify-format-waktu-wib.mjs
// Exit code 0 jika semua cocok, 1 jika ada satu saja yang berbeda.

import { formatWaktuWIB } from '../app/lib/dateWib.ts'

let gagal = 0

function cek(label, aktual, diharapkan) {
  const cocok = aktual === diharapkan
  if (!cocok) gagal++
  console.log(`${cocok ? 'PASS' : 'GAGAL'} — ${label}${cocok ? '' : `\n       aktual:     "${aktual}"\n       diharapkan: "${diharapkan}"`}`)
}

console.log('=== Kasus BUG (Tahap 9N): timestamp TANPA penanda zona -- harus tetap dibaca sbg UTC ===\n')

// 1. timestamp UTC 01:00 (tanpa Z) -> tampil 08:00 WIB
cek('"2026-08-19T01:00:00" (tanpa Z) -> 08.00 WIB',
  formatWaktuWIB('2026-08-19T01:00:00'),
  '19 Agu 2026, 08.00 WIB')

// 2. timestamp UTC 01:30 (tanpa Z) -> tampil 08:30 WIB -- angka persis dari laporan owner
cek('"2026-08-19T01:30:00" (tanpa Z) -> 08.30 WIB (persis kasus production yang dilaporkan)',
  formatWaktuWIB('2026-08-19T01:30:00'),
  '19 Agu 2026, 08.30 WIB')

// Varian spasi (bukan "T") -- kemungkinan format lain dari DB/serialisasi.
cek('"2026-08-19 01:30:00" (spasi, tanpa Z) -> 08.30 WIB',
  formatWaktuWIB('2026-08-19 01:30:00'),
  '19 Agu 2026, 08.30 WIB')

// 3. Lewat tengah malam WIB: 17:30 UTC hari SEBELUMNYA -> 00:30 WIB hari BERIKUTNYA
cek('"2026-08-18T17:30:00" (tanpa Z) -> lewat tengah malam, jadi 19 Agu 00.30 WIB',
  formatWaktuWIB('2026-08-18T17:30:00'),
  '19 Agu 2026, 00.30 WIB')

console.log('\n=== Kasus AMAN (sudah pernah benar): timestamp DENGAN penanda zona eksplisit -- TIDAK boleh berubah perilaku ===\n')

cek('"2026-08-19T01:30:00Z" (dengan Z) -> tetap 08.30 WIB',
  formatWaktuWIB('2026-08-19T01:30:00Z'),
  '19 Agu 2026, 08.30 WIB')

cek('"2026-08-19T01:30:00+00:00" (offset eksplisit) -> tetap 08.30 WIB',
  formatWaktuWIB('2026-08-19T01:30:00+00:00'),
  '19 Agu 2026, 08.30 WIB')

cek('"2026-08-19T08:30:00+07:00" (sudah WIB dgn offset) -> tetap 08.30 WIB',
  formatWaktuWIB('2026-08-19T08:30:00+07:00'),
  '19 Agu 2026, 08.30 WIB')

console.log('\n=== Kasus tepi ===\n')

cek('null -> "-"', formatWaktuWIB(null), '-')
cek('undefined -> "-"', formatWaktuWIB(undefined), '-')
cek('"" -> "-"', formatWaktuWIB(''), '-')
cek('string tidak valid -> dikembalikan apa adanya', formatWaktuWIB('bukan-tanggal'), 'bukan-tanggal')

console.log(`\n${gagal === 0 ? 'SEMUA COCOK' : `${gagal} GAGAL`} (${gagal} kegagalan)`)
process.exit(gagal === 0 ? 0 : 1)
