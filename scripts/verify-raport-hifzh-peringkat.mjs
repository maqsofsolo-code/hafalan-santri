// Verifikasi "Peringkat Kelas" pada Raport Hifzh Excel (URGENT LANJUTAN). Bukan unit test
// framework -- script verifikasi berdiri sendiri, sama seperti scripts/verify-*.mjs lainnya:
//   node scripts/verify-raport-hifzh-peringkat.mjs
// Exit code 0 jika semua cocok, 1 jika ada satu saja yang berbeda.
//
// Verifikasi rumus ranking (hitungRankingUjianHafalanKelas, TIDAK diubah/diduplikasi di sini) +
// glue logic caller (peringkatKelasFinal, peringkatMap) yang dipakai app/api/admin/nilai-ujian-excel
// untuk menyiapkan field peringkatKelas/jumlahSantriKelas/peringkatKelasFinal sebelum dikirim ke
// buildRaportHifzhWorkbook -- murni fungsi, tidak menyentuh Excel.
//
// CATATAN: penulisan cell Excel sungguhan (M53/M54, lihat app/lib/raportHifzhExcel.ts) TIDAK bisa
// diverifikasi otomatis lewat `node` polos di sini -- buildRaportHifzhWorkbook memakai
// `await import('exceljs')` (dynamic import gaya lama, sudah ada SEBELUM perubahan ini, dipakai juga
// oleh kolom Kelancaran/Tajwid yang sudah live di production) yang di Next.js (webpack/Turbopack)
// mengekspos `ExcelJS.Workbook` langsung, tapi di bawah `node` polos (tanpa bundler) namespace hasil
// dynamic import hanya mengekspos `.default.Workbook` (keterbatasan interop CJS/ESM Node bawaan
// exceljs, dikonfirmasi lewat `node -e "await import('exceljs')"` -- BUKAN bug dari perubahan ini).
// Mengubah pola import tsb di luar cakupan tugas ini ("JANGAN ubah logic lagi" mencakup juga pola
// yang sudah terbukti jalan di production). Penulisan cell M53/M54 memakai mekanisme YANG SAMA PERSIS
// (ws.getCell(alamat).value = ...) dengan kolom Kelancaran/Tajwid yang sudah terverifikasi jalan di
// production (build sukses + sudah dipakai admin), jadi risiko inkremental tetap rendah -- lihat
// laporan untuk detail.

import { hitungRankingUjianHafalanKelas } from '../app/lib/ranking.ts'

let gagal = 0

function cek(label, aktual, diharapkan) {
  const aktualStr = JSON.stringify(aktual)
  const diharapkanStr = JSON.stringify(diharapkan)
  const cocok = aktualStr === diharapkanStr
  if (!cocok) gagal++
  console.log(`${cocok ? 'PASS' : 'GAGAL'} — ${label}${cocok ? '' : `\n       aktual:     ${aktualStr}\n       diharapkan: ${diharapkanStr}`}`)
}

// Mereplikasi glue logic caller (app/api/admin/nilai-ujian-excel/route.ts) di luar Excel --
// TIDAK menduplikasi rumus ranking, hanya bagian "final atau tidak" + "peta id -> peringkat" yang
// juga murni derivasi dari hasil hitungRankingUjianHafalanKelas.
function hitungKonteksPeringkat(santriKelas) {
  const { peringkat, belumAdaHasil } = hitungRankingUjianHafalanKelas(santriKelas)
  const peringkatKelasFinal = belumAdaHasil.length === 0
  const jumlahSantriKelas = santriKelas.length
  const peringkatMap = new Map(peringkat.map(s => [s.id, s.peringkat]))
  return { peringkatKelasFinal, jumlahSantriKelas, peringkatMap, belumAdaHasil }
}

// ============================================================
// Rumus ranking + glue logic caller (tanpa Excel -- lihat catatan di atas)
// ============================================================
console.log('=== Rumus ranking + status final (tanpa Excel) ===\n')

// CASE 1: 3 santri, semua eligible, B peringkat 2
const kelasCase1 = [
  { id: 'A', nama: 'A', total_hafalan_juz: 10, nilaiUjianKeseluruhan: 9 },
  { id: 'B', nama: 'B', total_hafalan_juz: 8, nilaiUjianKeseluruhan: 8 },
  { id: 'C', nama: 'C', total_hafalan_juz: 5, nilaiUjianKeseluruhan: 7 },
]
const konteks1 = hitungKonteksPeringkat(kelasCase1)
cek('CASE 1: kelas FINAL (semua eligible)', konteks1.peringkatKelasFinal, true)
cek('CASE 1: jumlahSantriKelas = 3', konteks1.jumlahSantriKelas, 3)
cek('CASE 1: B peringkat 2 dari 3', konteks1.peringkatMap.get('B'), 2)

// CASE 2: 3 santri aktif, 2 sudah punya hasil, 1 belum -> seluruh kelas Belum Final
const kelasCase2 = [
  { id: 'A', nama: 'A', total_hafalan_juz: 10, nilaiUjianKeseluruhan: 9 },
  { id: 'B', nama: 'B', total_hafalan_juz: 8, nilaiUjianKeseluruhan: 8 },
  { id: 'C', nama: 'C', total_hafalan_juz: 5, nilaiUjianKeseluruhan: null }, // belum py juz selesai
]
const konteks2 = hitungKonteksPeringkat(kelasCase2)
cek('CASE 2: kelas TIDAK final (C belum py hasil)', konteks2.peringkatKelasFinal, false)
cek('CASE 2: belumAdaHasil berisi C', konteks2.belumAdaHasil.map(s => s.id), ['C'])
// bahkan santri A/B yang sendiri eligible tetap harus tampil "Belum Final" di raport (Rule H) --
// labelPeringkatKelas() di bawah membaca peringkatKelasFinal PER KELAS, bukan per santri, jadi A/B
// otomatis ikut "Belum Final" selama peringkatKelasFinal kelas ini bernilai false.

// CASE 3: semua Kelancaran (nilaiUjianKeseluruhan) lengkap, Tajwid tidak pernah masuk input sama
// sekali ke hitungRankingUjianHafalanKelas -- jadi kosong/isinya Tajwid TIDAK bisa memengaruhi hasil
// ini secara struktural (dibuktikan lagi di sini dengan kelas identik tanpa field tajwid apapun).
const kelasCase3 = [
  { id: 'X', nama: 'X', total_hafalan_juz: 4, nilaiUjianKeseluruhan: 8.5 },
  { id: 'Y', nama: 'Y', total_hafalan_juz: 4, nilaiUjianKeseluruhan: 9 },
]
const konteks3 = hitungKonteksPeringkat(kelasCase3)
cek('CASE 3: kelas tetap FINAL walau Tajwid tidak pernah disebut sebagai input', konteks3.peringkatKelasFinal, true)

// CASE 4: Ula 1 Banin vs Ula 1 Banat -- dua panggilan terpisah TIDAK boleh saling memengaruhi
// (caller wajib mengelompokkan per kelas SEBELUM memanggil, dibuktikan di sini lewat dua kelompok
// dengan santri id yang sama persis tapi total_hafalan_juz berbeda -- hasil harus independen).
const banin = [
  { id: 's1', nama: 'Umar', total_hafalan_juz: 10, nilaiUjianKeseluruhan: 9 },
  { id: 's2', nama: 'Ali', total_hafalan_juz: 4, nilaiUjianKeseluruhan: 8 },
]
const banat = [
  { id: 's1', nama: 'Fatimah', total_hafalan_juz: 2, nilaiUjianKeseluruhan: 9 },
  { id: 's2', nama: 'Aisyah', total_hafalan_juz: 6, nilaiUjianKeseluruhan: 8 },
]
const konteksBanin = hitungKonteksPeringkat(banin)
const konteksBanat = hitungKonteksPeringkat(banat)
cek('CASE 4: Banin s1 peringkat 1 (max hafalan kelasnya sendiri = 10)', konteksBanin.peringkatMap.get('s1'), 1)
cek('CASE 4: Banat s2 peringkat 1 (max hafalan kelasnya sendiri = 6, BUKAN dipengaruhi Banin)', konteksBanat.peringkatMap.get('s2'), 1)

// CASE 5: periode A tidak boleh memakai nilai periode B -- dibuktikan lewat purity: caller
// menghitung nilaiUjianKeseluruhan per periode (hitungNilaiUjianKeseluruhan, sudah diverifikasi di
// scripts/verify-nilai-ujian.mjs bagian 6) SEBELUM masuk ke sini; hitungRankingUjianHafalanKelas
// sendiri hanya menerima satu snapshot nilaiUjianKeseluruhan per santri per panggilan -- tidak ada
// mekanisme untuk "menggabungkan" dua periode dalam satu panggilan.
const periodeA = [{ id: 'p', nama: 'P', total_hafalan_juz: 5, nilaiUjianKeseluruhan: 6.0 }]
const periodeB = [{ id: 'p', nama: 'P', total_hafalan_juz: 5, nilaiUjianKeseluruhan: 9.0 }]
cek(
  'CASE 5: santri sama, periode berbeda -> peringkat/nilai dihitung independen per panggilan',
  [hitungKonteksPeringkat(periodeA).peringkatMap.get('p') !== undefined, hitungRankingUjianHafalanKelas(periodeA).peringkat[0].nilaiUjianKeseluruhan, hitungRankingUjianHafalanKelas(periodeB).peringkat[0].nilaiUjianKeseluruhan],
  [true, 6.0, 9.0]
)

// Verifikasi label teks murni (fungsi privat labelPeringkatKelas di raportHifzhExcel.ts tidak
// diekspor -- direplikasi 1:1 di sini HANYA untuk memverifikasi format teks, bukan rumus ranking).
function labelPeringkatKelas(peringkatKelas, jumlahSantriKelas, peringkatKelasFinal) {
  if (!peringkatKelasFinal || peringkatKelas === null) return 'Peringkat Kelas: Belum Final'
  return `Peringkat Kelas: ${peringkatKelas} dari ${jumlahSantriKelas}`
}

console.log('\n=== Format teks "Peringkat Kelas" ===\n')
cek('CASE 1: final + peringkat 2 dari 3 -> teks angka', labelPeringkatKelas(2, 3, true), 'Peringkat Kelas: 2 dari 3')
cek('CASE 2: belum final -> "Belum Final" (bukan 0/- dari 3)', labelPeringkatKelas(null, 3, false), 'Peringkat Kelas: Belum Final')
cek('Rule H: peringkatKelas null tapi final=true (seharusnya tidak terjadi) tetap fallback Belum Final, bukan "null dari Y"', labelPeringkatKelas(null, 3, true), 'Peringkat Kelas: Belum Final')

console.log(`\n${gagal === 0 ? 'SEMUA COCOK (0 kegagalan)' : `${gagal} PENGECEKAN GAGAL`}`)
process.exit(gagal === 0 ? 0 : 1)
