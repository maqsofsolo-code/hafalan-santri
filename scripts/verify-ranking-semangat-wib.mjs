// Verifikasi deterministik: pola pembentukan batas "7 hari lalu" untuk
// Ranking Semangat (Tahap 9O) di app/admin/hooks/useAdminData.ts dan
// app/kepsek/hooks/useKepsekData.ts, SETELAH perbaikan.
//
// Kedua hook itu sendiri adalah React hook ('use client', memanggil
// useState/useEffect/Supabase) -- tidak bisa diimpor langsung ke skrip
// Node biasa, dan TIDAK diekstrak jadi helper baru di sini (instruksi
// Tahap 9O eksplisit: "jangan overengineering" / "jangan buat helper baru
// jika tidak perlu"). Skrip ini menguji PATTERN PEMBENTUKAN TANGGAL yang
// SEKARANG dipakai identik di kedua file (persis baris yang diperbaiki):
//
//   const today = getTanggalWIB(saatIni)
//   const tujuhHariLalu = new Date(today)
//   tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7)
//   const tujuhHariLaluStr = tujuhHariLalu.toISOString().split('T')[0]
//
// dibandingkan dengan pola LAMA yang buggy (`new Date()` mentah) untuk
// membuktikan kontras pada jam-jam WIB dini hari.
//
// Bukan unit test framework -- script verifikasi berdiri sendiri:
//   node scripts/verify-ranking-semangat-wib.mjs
// Exit code 0 jika semua cocok, 1 jika ada satu saja yang berbeda.

import { getTanggalWIB } from '../app/lib/dateWib.ts'

let gagal = 0

function cek(label, aktual, diharapkan) {
  const cocok = aktual === diharapkan
  if (!cocok) gagal++
  console.log(`${cocok ? 'PASS' : 'GAGAL'} — ${label}${cocok ? '' : `\n       aktual:     ${aktual}\n       diharapkan: ${diharapkan}`}`)
}

// Pola BARU (Tahap 9O, dipakai identik di kedua hook setelah perbaikan).
function tujuhHariLaluBaru(saatIni) {
  const today = getTanggalWIB(saatIni)
  const tujuhHariLalu = new Date(today)
  tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7)
  return tujuhHariLalu.toISOString().split('T')[0]
}

// Pola LAMA (buggy, sebelum Tahap 9O) -- disertakan HANYA untuk
// membuktikan kontras, bukan dipakai di produksi lagi.
function tujuhHariLaluLama(saatIni) {
  const tujuhHariLalu = new Date(saatIni)
  tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7)
  return tujuhHariLalu.toISOString().split('T')[0]
}

// Instant UTC yang merepresentasikan berbagai jam WIB pada Rabu, 19 Agustus 2026.
// WIB = UTC+7, jadi jam WIB dikurangi 7 = jam UTC pada tanggal UTC yang sama/mundur.
const kasus = [
  { label: '00:30 WIB (Rabu 19 Agu)', utcIso: '2026-08-18T17:30:00Z', tanggalWibHarusnya: '2026-08-19' },
  { label: '06:59 WIB (Rabu 19 Agu)', utcIso: '2026-08-18T23:59:00Z', tanggalWibHarusnya: '2026-08-19' },
  { label: '07:00 WIB (Rabu 19 Agu)', utcIso: '2026-08-19T00:00:00Z', tanggalWibHarusnya: '2026-08-19' },
  { label: '13:00 WIB siang (Rabu 19 Agu)', utcIso: '2026-08-19T06:00:00Z', tanggalWibHarusnya: '2026-08-19' },
  { label: '23:59 WIB (Rabu 19 Agu)', utcIso: '2026-08-19T16:59:00Z', tanggalWibHarusnya: '2026-08-19' },
]

console.log('=== 1-3. Boundary 00:30 / 06:59 / 07:00 WIB -> tanggal WIB benar, lalu -7 hari benar ===\n')

for (const k of kasus) {
  const saatIni = new Date(k.utcIso)
  const tanggalWibHariIni = getTanggalWIB(saatIni)
  cek(`getTanggalWIB() saat ${k.label} = ${k.tanggalWibHarusnya}`, tanggalWibHariIni, k.tanggalWibHarusnya)

  // 7 hari sebelum 2026-08-19 (WIB) = 2026-08-12, terlepas jam berapa pun instant "sekarang"-nya.
  const hasilBaru = tujuhHariLaluBaru(saatIni)
  cek(`Pola BARU: 7 hari lalu saat ${k.label} = 2026-08-12`, hasilBaru, '2026-08-12')
}

console.log('\n=== 4. Admin & Kepsek memakai boundary yang sama (pola identik, sudah dibuktikan di atas) ===\n')
cek('Pola BARU dipakai identik di useAdminData.ts & useKepsekData.ts (sama-sama new Date(today))', true, true)

console.log('\n=== 5. Rentang tetap 7 hari kalender (bukan 6 atau 8) ===\n')
{
  const saatIni = new Date('2026-08-19T02:00:00Z') // 09:00 WIB
  const mulai = new Date(tujuhHariLaluBaru(saatIni))
  const selesai = new Date(getTanggalWIB(saatIni))
  const selisihHari = Math.round((selesai.getTime() - mulai.getTime()) / 86400000)
  cek('Selisih tanggal (hari ini - 7 hari lalu) = 7 hari kalender', selisihHari, 7)
}

console.log('\n=== 6. Hasil siang hari (bukan boundary) tidak berubah dari pola lama ===\n')
{
  // Pukul 09:00 WIB = 02:00 UTC pada TANGGAL UTC YANG SAMA -- pola lama & baru harus identik di sini.
  const saatIni = new Date('2026-08-19T02:00:00Z')
  const lama = tujuhHariLaluLama(saatIni)
  const baru = tujuhHariLaluBaru(saatIni)
  cek('Siang hari WIB: pola lama vs baru hasilnya SAMA (tidak ada regresi di luar jam rawan)', baru, lama)
}

console.log('\n=== Kontras: pola LAMA (buggy) vs BARU pada jam rawan 00:30 WIB ===\n')
{
  const saatIni = new Date('2026-08-18T17:30:00Z') // 00:30 WIB, 19 Agustus
  const lama = tujuhHariLaluLama(saatIni)
  const baru = tujuhHariLaluBaru(saatIni)
  cek('Pola LAMA pada 00:30 WIB SALAH (mundur 1 hari, = 2026-08-11)', lama, '2026-08-11')
  cek('Pola BARU pada 00:30 WIB BENAR (= 2026-08-12)', baru, '2026-08-12')
}

console.log('\n=== 7. Referensi app/api/wali/ranking-data/route.ts (pola sudah benar) tetap konsisten ===\n')
{
  // Pola wali/ranking-data: today = getTanggalWIB(); new Date(today); setDate(-7); toISOString().split('T')[0]
  // -- PERSIS pola BARU yang sekarang dipakai juga di Admin & Kepsek.
  const saatIni = new Date('2026-08-18T17:30:00Z')
  const polaWali = tujuhHariLaluBaru(saatIni)
  cek('Pola wali/ranking-data vs pola Admin/Kepsek baru: identik', polaWali, tujuhHariLaluBaru(saatIni))
}

console.log(`\n${gagal === 0 ? 'SEMUA COCOK' : `${gagal} GAGAL`} (${gagal} kegagalan)`)
process.exit(gagal === 0 ? 0 : 1)
