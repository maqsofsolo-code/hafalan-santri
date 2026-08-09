// Verifikasi deterministik: hasil app/lib/dateWib.ts (module baru, Modularisasi
// Tahap 2) HARUS identik dengan implementasi lama yang digantikannya, untuk
// seluruh titik boundary yang relevan (rule pekan Senin-Sabtu, cutoff Sabtu
// 17:00 WIB, dan batas tengah malam UTC/WIB). Bukan unit test framework --
// script verifikasi berdiri sendiri, dijalankan manual via:
//   node scripts/verify-date-wib.mjs
// Exit code 0 jika semua cocok, 1 jika ada satu saja yang berbeda.
// Plain JS (.mjs, bukan .mts) supaya tidak ikut disapu tsconfig include
// (**/*.mts) -- Node ESM sendiri butuh ekstensi eksplisit saat resolve
// './app/lib/dateWib.ts', yang tidak diizinkan tsc tanpa
// allowImportingTsExtensions.

import {
  getTanggalWIB,
  getHariWIB,
  getPeriodePekanTertutup,
} from '../app/lib/dateWib.ts'

let gagal = 0

function cek(label, aktual, diharapkan) {
  const aktualStr = JSON.stringify(aktual)
  const diharapkanStr = JSON.stringify(diharapkan)
  const cocok = aktualStr === diharapkanStr
  if (!cocok) gagal++
  console.log(`${cocok ? 'PASS' : 'GAGAL'} — ${label}${cocok ? '' : `\n       aktual:     ${aktualStr}\n       diharapkan: ${diharapkanStr}`}`)
}

// ============================================================
// 1. LEGACY TECHNIQUE 1 (toLocaleString round-trip) -- verbatim dari
//    app/guru/page.tsx / app/wali/page.tsx / app/admin/page.tsx / send-notif
// ============================================================
function legacyGetTanggalWIB_teknik1(saatIni = new Date()) {
  const now = new Date(saatIni.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function legacyGetHariWIB_teknik1(saatIni = new Date()) {
  return new Date(saatIni.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })).getDay()
}

// ============================================================
// 2. LEGACY TECHNIQUE 3 (Intl.DateTimeFormat.formatToParts, en-US) --
//    verbatim dari app/api/nilai-ujian/route.ts
// ============================================================
function legacyGetTanggalWIB_teknik3(saatIni = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(saatIni)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

// ============================================================
// 3. LEGACY TECHNIQUE 2 (Intl.DateTimeFormat.formatToParts, en-CA) --
//    verbatim dari app/api/monitoring-setoran-excel/route.ts
// ============================================================
function legacyGetTanggalWIB_teknik2(saatIni = new Date()) {
  const bagian = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(saatIni)
  const nilai = Object.fromEntries(bagian.filter(item => item.type !== 'literal').map(item => [item.type, item.value]))
  return `${nilai.year}-${nilai.month}-${nilai.day}`
}

// ============================================================
// 4. LEGACY getPeriodePekanTertutup -- verbatim dari app/admin/page.tsx
//    (identik dengan kepsek/page.tsx, laporan-peringkat-pdf/route.ts, dan
//    app/api/wali/ranking-data/route.ts sebelum migrasi)
// ============================================================
function legacyFormatTanggalUTC(date) {
  const tahun = date.getUTCFullYear()
  const bulan = String(date.getUTCMonth() + 1).padStart(2, '0')
  const tanggal = String(date.getUTCDate()).padStart(2, '0')
  return `${tahun}-${bulan}-${tanggal}`
}
function legacyGetPeriodePekanTertutup(saatIni = new Date()) {
  const bagianWIB = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(saatIni)
  const nilaiBagian = Object.fromEntries(
    bagianWIB.filter(bagian => bagian.type !== 'literal').map(bagian => [bagian.type, bagian.value])
  )
  const tahun = Number(nilaiBagian.year)
  const bulan = Number(nilaiBagian.month)
  const tanggal = Number(nilaiBagian.day)
  const jam = Number(nilaiBagian.hour)
  const tanggalWIB = new Date(Date.UTC(tahun, bulan - 1, tanggal))
  const nomorHari = tanggalWIB.getUTCDay()
  const jarakDariSenin = (nomorHari + 6) % 7
  const seninPekanBerjalan = new Date(tanggalWIB)
  seninPekanBerjalan.setUTCDate(seninPekanBerjalan.getUTCDate() - jarakDariSenin)

  const sabtuSudahDitutup = nomorHari === 6 && jam >= 17
  const gunakanPekanBerjalan = nomorHari === 0 || sabtuSudahDitutup
  const tanggalMulaiDate = new Date(seninPekanBerjalan)
  if (!gunakanPekanBerjalan) {
    tanggalMulaiDate.setUTCDate(tanggalMulaiDate.getUTCDate() - 7)
  }
  const tanggalSelesaiDate = new Date(tanggalMulaiDate)
  tanggalSelesaiDate.setUTCDate(tanggalSelesaiDate.getUTCDate() + 5)

  const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  const mulaiTanggal = tanggalMulaiDate.getUTCDate()
  const selesaiTanggal = tanggalSelesaiDate.getUTCDate()
  const mulaiBulan = tanggalMulaiDate.getUTCMonth()
  const selesaiBulan = tanggalSelesaiDate.getUTCMonth()
  const mulaiTahun = tanggalMulaiDate.getUTCFullYear()
  const selesaiTahun = tanggalSelesaiDate.getUTCFullYear()
  let labelPeriode

  if (mulaiBulan === selesaiBulan && mulaiTahun === selesaiTahun) {
    labelPeriode = `${mulaiTanggal}–${selesaiTanggal} ${namaBulan[selesaiBulan]} ${selesaiTahun}`
  } else if (mulaiTahun === selesaiTahun) {
    labelPeriode = `${mulaiTanggal} ${namaBulan[mulaiBulan]}–${selesaiTanggal} ${namaBulan[selesaiBulan]} ${selesaiTahun}`
  } else {
    labelPeriode = `${mulaiTanggal} ${namaBulan[mulaiBulan]} ${mulaiTahun}–${selesaiTanggal} ${namaBulan[selesaiBulan]} ${selesaiTahun}`
  }

  return {
    tanggalMulai: legacyFormatTanggalUTC(tanggalMulaiDate),
    tanggalSelesai: legacyFormatTanggalUTC(tanggalSelesaiDate),
    labelPeriode,
  }
}

// ============================================================
// Konstruksi instant UTC untuk tiap skenario WIB. Nama hari WIB diambil
// otomatis via Intl (bukan diasumsikan manual) supaya label di bawah selalu
// benar terlepas dari tanggal kalender yang dipilih.
// ============================================================
function namaHariWIB(d) {
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' }).format(d)
}
function jamWIB(d) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
}

// Anchor: Senin 2026-08-10 (WIB) jam 10:00 WIB = 2026-08-10T03:00:00Z
const senin1000 = new Date('2026-08-10T03:00:00Z')
const jumat1000 = new Date(senin1000.getTime() + 4 * 86400000) // +4 hari -> Jumat
const sabtu1659 = new Date(senin1000.getTime() + 5 * 86400000 + (16 * 3600 + 59 * 60 - 10 * 3600) * 1000) // Sabtu 16:59 WIB
const sabtu1700 = new Date(senin1000.getTime() + 5 * 86400000 + (17 * 3600 - 10 * 3600) * 1000) // Sabtu 17:00 WIB
const sabtu1800 = new Date(senin1000.getTime() + 5 * 86400000 + (18 * 3600 - 10 * 3600) * 1000) // Sabtu 18:00 WIB
const ahad1000 = new Date(senin1000.getTime() + 6 * 86400000) // Ahad
const boundaryTengahMalam = new Date('2026-08-09T17:30:00Z') // 2026-08-10 00:30 WIB

const kasus = [
  { label: 'Senin', instant: senin1000 },
  { label: 'Jumat', instant: jumat1000 },
  { label: 'Sabtu 16:59 WIB', instant: sabtu1659 },
  { label: 'Sabtu 17:00 WIB', instant: sabtu1700 },
  { label: 'Sabtu 18:00 WIB', instant: sabtu1800 },
  { label: 'Ahad', instant: ahad1000 },
]

console.log('=== Verifikasi hari/tanggal WIB (nama hari via Intl, bukan asumsi manual) ===\n')
for (const { label, instant } of kasus) {
  console.log(`--- ${label} (WIB: ${namaHariWIB(instant)} ${jamWIB(instant)}) ---`)
  cek(`getTanggalWIB() vs legacy teknik-1 [${label}]`, getTanggalWIB(instant), legacyGetTanggalWIB_teknik1(instant))
  cek(`getTanggalWIB() vs legacy teknik-2 (en-CA) [${label}]`, getTanggalWIB(instant), legacyGetTanggalWIB_teknik2(instant))
  cek(`getTanggalWIB() vs legacy teknik-3 (en-US parts) [${label}]`, getTanggalWIB(instant), legacyGetTanggalWIB_teknik3(instant))
  cek(`getHariWIB() vs legacy teknik-1 [${label}]`, getHariWIB(instant), legacyGetHariWIB_teknik1(instant))
  cek(`getPeriodePekanTertutup() vs legacy [${label}]`, getPeriodePekanTertutup(instant), legacyGetPeriodePekanTertutup(instant))
}

console.log(`\n--- Boundary tengah malam UTC (00:30 WIB, ${namaHariWIB(boundaryTengahMalam)} ${jamWIB(boundaryTengahMalam)}) ---`)
cek('getTanggalWIB() tidak bergeser ke hari sebelumnya (00:30 WIB)', getTanggalWIB(boundaryTengahMalam), legacyGetTanggalWIB_teknik1(boundaryTengahMalam))
console.log(`       getTanggalWIB(00:30 WIB) = ${getTanggalWIB(boundaryTengahMalam)} (harus tanggal WIB-nya, bukan tanggal UTC ${boundaryTengahMalam.toISOString().slice(0, 10)})`)

// ============================================================
// KEPSEK: sebelum perbaikan, app/kepsek/page.tsx memakai
// `new Date().toISOString().split('T')[0]` (UTC murni, TIDAK WIB-aware)
// untuk "hari ini" -- berbeda dari getTanggalWIB() yang dipakai file lain.
// Sekarang kepsek juga memakai getTanggalWIB(). Kasus ini membuktikan:
// pada 00:30 WIB, teknik lama kepsek akan salah (masih tanggal UTC
// kemarin), sedangkan getTanggalWIB() yang sekarang dipakai sudah benar.
// ============================================================
function legacyKepsekToday_nonWIB(saatIni) {
  return saatIni.toISOString().split('T')[0]
}
console.log(`\n--- Kepsek "hari ini" pada 00:30 WIB (setelah perbaikan divergensi) ---`)
const kepsekTodaySekarang = getTanggalWIB(boundaryTengahMalam)
const kepsekTodayLegacyNonWIB = legacyKepsekToday_nonWIB(boundaryTengahMalam)
console.log(`       getTanggalWIB(00:30 WIB)            = ${kepsekTodaySekarang}  (dipakai kepsek sekarang)`)
console.log(`       legacy toISOString() non-WIB (lama)  = ${kepsekTodayLegacyNonWIB}  (TIDAK dipakai lagi -- masih tanggal UTC kemarin)`)
cek('Kepsek "hari ini" 00:30 WIB harus tanggal WIB, BUKAN tanggal UTC sebelumnya (teknik lama)', kepsekTodaySekarang === kepsekTodayLegacyNonWIB, false)

console.log('\n=== Rule pekan: verifikasi arah cutoff Sabtu 17:00 ===')
const periodeSabtu1659 = getPeriodePekanTertutup(sabtu1659)
const periodeSabtu1700 = getPeriodePekanTertutup(sabtu1700)
console.log(`Sabtu 16:59 WIB -> periode tertutup: ${periodeSabtu1659.tanggalMulai} s/d ${periodeSabtu1659.tanggalSelesai} (${periodeSabtu1659.labelPeriode})`)
console.log(`Sabtu 17:00 WIB -> periode tertutup: ${periodeSabtu1700.tanggalMulai} s/d ${periodeSabtu1700.tanggalSelesai} (${periodeSabtu1700.labelPeriode})`)
cek('Sabtu 16:59 WIB dan Sabtu 17:00 WIB harus periode BERBEDA (cutoff nyata)', periodeSabtu1659.tanggalSelesai === periodeSabtu1700.tanggalSelesai, false)

console.log(`\n${gagal === 0 ? `SEMUA COCOK (0 kegagalan dari ${kasus.length} skenario × 5 pengecekan + boundary tengah malam + verifikasi cutoff)` : `${gagal} PENGECEKAN GAGAL`}`)
process.exit(gagal === 0 ? 0 : 1)
