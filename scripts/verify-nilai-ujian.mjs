// Verifikasi deterministik untuk fitur Nilai Tajwid + Rangkuman Ujian + Peringkat Ujian Hafalan
// (URGENT IMPLEMENTATION, lihat audit sebelumnya). Bukan unit test framework -- script verifikasi
// berdiri sendiri, sama seperti scripts/verify-ranking.mjs:
//   node scripts/verify-nilai-ujian.mjs
// Exit code 0 jika semua cocok, 1 jika ada satu saja yang berbeda.

import { hitungNilaiUjianKeseluruhan, validasiNilaiTajwid } from '../app/lib/adminNilaiUjian.ts'
import { hitungRankingUjianHafalanKelas } from '../app/lib/ranking.ts'

let gagal = 0

function cek(label, aktual, diharapkan) {
  const aktualStr = JSON.stringify(aktual)
  const diharapkanStr = JSON.stringify(diharapkan)
  const cocok = aktualStr === diharapkanStr
  if (!cocok) gagal++
  console.log(`${cocok ? 'PASS' : 'GAGAL'} — ${label}${cocok ? '' : `\n       aktual:     ${aktualStr}\n       diharapkan: ${diharapkanStr}`}`)
}

// ============================================================
// 1. hitungNilaiUjianKeseluruhan -- hanya juz 'selesai' yang dirata-rata
// ============================================================
console.log('=== 1. hitungNilaiUjianKeseluruhan ===\n')

cek(
  'Rule F contoh: Juz 30=9.2, 29=8.8, 28=9.0 (semua selesai) -> 9.0',
  hitungNilaiUjianKeseluruhan([
    { juz: 30, target: 6, dinilai: 6, rata: 9.2, status: 'selesai', segmentIds: [] },
    { juz: 29, target: 5, dinilai: 5, rata: 8.8, status: 'selesai', segmentIds: [] },
    { juz: 28, target: 5, dinilai: 5, rata: 9.0, status: 'selesai', segmentIds: [] },
  ]),
  9.0
)

cek(
  'Juz belum_selesai/belum_dimulai TIDAK ikut dirata-rata',
  hitungNilaiUjianKeseluruhan([
    { juz: 30, target: 6, dinilai: 6, rata: 9.2, status: 'selesai', segmentIds: [] },
    { juz: 29, target: 5, dinilai: 3, rata: 7.0, status: 'belum_selesai', segmentIds: [] },
    { juz: 28, target: 5, dinilai: 0, rata: null, status: 'belum_dimulai', segmentIds: [] },
  ]),
  9.2
)

cek(
  'Tidak ada juz selesai sama sekali -> null (bukan 0 palsu)',
  hitungNilaiUjianKeseluruhan([
    { juz: 30, target: 6, dinilai: 3, rata: 7.0, status: 'belum_selesai', segmentIds: [] },
  ]),
  null
)

cek(
  'List kosong -> null',
  hitungNilaiUjianKeseluruhan([]),
  null
)

// ============================================================
// 2. validasiNilaiTajwid -- skala 0.0-10.0, maksimal 1 desimal
// ============================================================
console.log('\n=== 2. validasiNilaiTajwid ===\n')

cek('8.5 valid -> 8.5', validasiNilaiTajwid(8.5), 8.5)
cek('0 valid (batas bawah) -> 0', validasiNilaiTajwid(0), 0)
cek('10 valid (batas atas) -> 10', validasiNilaiTajwid(10), 10)
cek('8.55 dibulatkan ke 1 desimal -> 8.6', validasiNilaiTajwid(8.55), 8.6)
cek('-0.1 di luar rentang -> null', validasiNilaiTajwid(-0.1), null)
cek('10.1 di luar rentang -> null', validasiNilaiTajwid(10.1), null)
cek('string bukan angka -> null', validasiNilaiTajwid('abc'), null)
cek('string angka valid "7.5" -> 7.5', validasiNilaiTajwid('7.5'), 7.5)

// ============================================================
// 3. hitungRankingUjianHafalanKelas -- skenario dari spesifikasi bisnis (Rule P)
// ============================================================
console.log('\n=== 3. hitungRankingUjianHafalanKelas ===\n')

// Skenario 1-3 dari spesifikasi: satu kelas berisi A, B, C.
const kelasABC = [
  { id: 'a', nama: 'A', total_hafalan_juz: 1, nilaiUjianKeseluruhan: 9 },
  { id: 'b', nama: 'B', total_hafalan_juz: 5, nilaiUjianKeseluruhan: 8.5 },
  { id: 'c', nama: 'C', total_hafalan_juz: 10, nilaiUjianKeseluruhan: 8 },
]
const hasilABC = hitungRankingUjianHafalanKelas(kelasABC)

cek('A: Nilai Hafalan = (1/10)*10 = 1', hasilABC.peringkat.find(s => s.id === 'a').nilaiHafalan, 1)
cek('A: Nilai Peringkat = (9*4+1)/5 = 7.4', hasilABC.peringkat.find(s => s.id === 'a').nilaiPeringkat, 7.4)
cek('B: Nilai Hafalan = (5/10)*10 = 5', hasilABC.peringkat.find(s => s.id === 'b').nilaiHafalan, 5)
cek('B: Nilai Peringkat = (8.5*4+5)/5 = 7.8', hasilABC.peringkat.find(s => s.id === 'b').nilaiPeringkat, 7.8)
cek('C: Nilai Hafalan = (10/10)*10 = 10', hasilABC.peringkat.find(s => s.id === 'c').nilaiHafalan, 10)
cek('C: Nilai Peringkat = (8*4+10)/5 = 8.4', hasilABC.peringkat.find(s => s.id === 'c').nilaiPeringkat, 8.4)
cek('Urutan peringkat: C (8.4) > B (7.8) > A (7.4)', hasilABC.peringkat.map(s => s.id), ['c', 'b', 'a'])
cek('Nomor peringkat berurutan 1,2,3', hasilABC.peringkat.map(s => s.peringkat), [1, 2, 3])
cek('belumAdaHasil kosong (semua eligible)', hasilABC.belumAdaHasil, [])

// 4. Tajwid TIDAK ikut ranking -- fungsi bahkan tidak menerima field tajwid di tipe input,
// jadi menambahkan properti tajwid pada objek input (walau lewat) tidak mengubah hasil sama sekali.
console.log('\n=== 4. Tajwid tidak ikut ranking ===\n')
const kelasDenganTajwidPalsu = kelasABC.map(s => ({ ...s, tajwidSeharusnyaDiabaikan: 999 }))
const hasilDenganTajwid = hitungRankingUjianHafalanKelas(kelasDenganTajwidPalsu)
cek(
  'Menambahkan field tajwid pada input tidak mengubah nilaiPeringkat/urutan',
  hasilDenganTajwid.peringkat.map(s => ({ id: s.id, nilaiPeringkat: s.nilaiPeringkat })),
  hasilABC.peringkat.map(s => ({ id: s.id, nilaiPeringkat: s.nilaiPeringkat }))
)

// 5. total_hafalan_juz pecahan dipakai apa adanya (TIDAK di-floor/round sebelum rumus)
console.log('\n=== 5. total_hafalan_juz pecahan dipakai apa adanya ===\n')
const kelasPecahan = [
  { id: 'p1', nama: 'Umar', total_hafalan_juz: 2.75, nilaiUjianKeseluruhan: 8 },
  { id: 'p2', nama: 'Ali', total_hafalan_juz: 7.25, nilaiUjianKeseluruhan: 8 },
]
const hasilPecahan = hitungRankingUjianHafalanKelas(kelasPecahan)
// max = 7.25 (BUKAN di-floor jadi 7). Nilai Hafalan p2 = (7.25/7.25)*10 = 10, p1 = (2.75/7.25)*10 = 3.793... -> 3.8
cek('p2 (max) Nilai Hafalan = 10 (memakai 7.25 apa adanya, bukan floor 7)', hasilPecahan.peringkat.find(s => s.id === 'p2').nilaiHafalan, 10)
cek('p1 Nilai Hafalan = round((2.75/7.25)*10, 1 desimal) = 3.8', hasilPecahan.peringkat.find(s => s.id === 'p1').nilaiHafalan, 3.8)

// 5b. MAX(total_hafalan_juz) kelas WAJIB dihitung dari SELURUH santri aktif di kelas (termasuk
// yang belum eligible ranking / belum py juz ujian selesai) -- BUKAN hanya dari santri yang masuk
// daftar `peringkat`. Skenario persis dari spesifikasi: A=10 juz (belum selesai ujian), B=8 juz
// (sudah selesai), C=5 juz (sudah selesai). MAX kelas harus tetap 10 (milik A), walau A sendiri
// dikeluarkan dari `peringkat` karena belum py hasil ujian.
console.log('\n=== 5b. MAX kelas dihitung dari SELURUH santri, termasuk yang belum eligible ===\n')
const kelasABC_denominator = [
  { id: 'A', nama: 'A', total_hafalan_juz: 10, nilaiUjianKeseluruhan: null }, // belum py juz selesai
  { id: 'B', nama: 'B', total_hafalan_juz: 8, nilaiUjianKeseluruhan: 9 },
  { id: 'C', nama: 'C', total_hafalan_juz: 5, nilaiUjianKeseluruhan: 8.5 },
]
const hasilABC_denominator = hitungRankingUjianHafalanKelas(kelasABC_denominator)
cek('A tidak masuk peringkat (belum py juz ujian selesai)', hasilABC_denominator.peringkat.map(s => s.id).includes('A'), false)
cek('A masuk belumAdaHasil', hasilABC_denominator.belumAdaHasil.map(s => s.id), ['A'])
cek('B: Nilai Hafalan = 8/10*10 = 8 (denominator TETAP 10 milik A, bukan MAX(8,5)=8 dari santri eligible saja)', hasilABC_denominator.peringkat.find(s => s.id === 'B').nilaiHafalan, 8)
cek('C: Nilai Hafalan = 5/10*10 = 5', hasilABC_denominator.peringkat.find(s => s.id === 'C').nilaiHafalan, 5)

// 6. Periode A tidak boleh tercampur periode B -- didemonstrasikan lewat purity fungsi: caller
// WAJIB menyediakan nilaiUjianKeseluruhan yang sudah discope satu kalender_id (dihitung lewat
// hitungNilaiUjianKeseluruhan dari ringkasanJuz yang sudah difilter periode di caller, lihat
// app/api/ranking-ujian-hafalan/route.ts). Fungsi ranking sendiri TIDAK melakukan query/scoping
// periode apapun -- ia murni memproses apa yang diberikan, jadi tidak mungkin mencampur periode
// selama caller disiplin (dibuktikan di bagian 1 di atas: hitungNilaiUjianKeseluruhan hanya
// menerima SATU array ringkasanJuz, tidak pernah menerima/menggabungkan lebih dari satu periode).
console.log('\n=== 6. Isolasi periode (purity, lihat catatan kode) ===\n')
cek(
  'Dua panggilan hitungNilaiUjianKeseluruhan dgn data periode berbeda tidak saling memengaruhi',
  [
    hitungNilaiUjianKeseluruhan([{ juz: 1, target: 5, dinilai: 5, rata: 6.0, status: 'selesai', segmentIds: [] }]),
    hitungNilaiUjianKeseluruhan([{ juz: 1, target: 5, dinilai: 5, rata: 9.0, status: 'selesai', segmentIds: [] }]),
  ],
  [6.0, 9.0]
)

// 7. Santri tanpa juz selesai tidak mendapat ranking palsu (nilaiUjianKeseluruhan null -> masuk
// belumAdaHasil, TIDAK diberi skor 0 dan TIDAK ikut diberi nomor peringkat).
console.log('\n=== 7. Santri tanpa juz selesai TIDAK mendapat ranking palsu ===\n')
const kelasCampuran = [
  { id: 'x1', nama: 'Zaid', total_hafalan_juz: 10, nilaiUjianKeseluruhan: 9 },
  { id: 'x2', nama: 'Umar', total_hafalan_juz: 3, nilaiUjianKeseluruhan: null },
]
const hasilCampuran = hitungRankingUjianHafalanKelas(kelasCampuran)
cek('Hanya x1 yang masuk peringkat', hasilCampuran.peringkat.map(s => s.id), ['x1'])
cek('x2 masuk belumAdaHasil, bukan peringkat dengan skor 0', hasilCampuran.belumAdaHasil.map(s => s.id), ['x2'])
cek('x1 tetap dapat peringkat 1 (bukan 2, karena x2 dikeluarkan dari daftar terurut)', hasilCampuran.peringkat[0].peringkat, 1)

// ============================================================
// 8. Tie-breaker: nilai_peringkat desc -> nilai_ujian_keseluruhan desc -> total_hafalan_juz desc
//    -> nama asc -> id asc
// ============================================================
console.log('\n=== 8. Tie-breaker 5 tingkat ===\n')

const tieEksplisit = [
  { id: 'z', nama: 'Sama', total_hafalan_juz: 5, nilaiUjianKeseluruhan: 8 },
  { id: 'a', nama: 'Sama', total_hafalan_juz: 5, nilaiUjianKeseluruhan: 8 },
]
const hasilTie = hitungRankingUjianHafalanKelas(tieEksplisit)
// max hafalan kelas = 5 (keduanya sama) -> nilaiHafalan = (5/5)*10 = 10 untuk keduanya ->
// nilaiPeringkat = (8*4+10)/5 = 8.4 untuk keduanya.
cek('nilaiPeringkat identik untuk keduanya (prasyarat uji tie-break id)', hasilTie.peringkat.map(s => s.nilaiPeringkat), [8.4, 8.4])
cek('Tie penuh (peringkat, ujian, hafalan, nama semua sama) -> id asc: a sebelum z', hasilTie.peringkat.map(s => s.id), ['a', 'z'])

const tieNama = [
  { id: 'id-2', nama: 'Zaid', total_hafalan_juz: 5, nilaiUjianKeseluruhan: 8 },
  { id: 'id-1', nama: 'Ahmad', total_hafalan_juz: 5, nilaiUjianKeseluruhan: 8 },
]
cek('Tie peringkat+ujian+hafalan -> nama asc: Ahmad sebelum Zaid', hitungRankingUjianHafalanKelas(tieNama).peringkat.map(s => s.id), ['id-1', 'id-2'])

const tieUjianSamaHafalanBeda = [
  { id: 'hf-3', nama: 'Sama', total_hafalan_juz: 3, nilaiUjianKeseluruhan: 8 }, // di kelas max=9: hafalan=(3/9)*10=3.3, peringkat=(8*4+3.3)/5=7.06->7.1
  { id: 'hf-9', nama: 'Sama', total_hafalan_juz: 9, nilaiUjianKeseluruhan: 6.475 }, // hafalan=10, peringkat=(6.475*4+10)/5=7.18->7.2
]
const hasilUjianHafalanBeda = hitungRankingUjianHafalanKelas(tieUjianSamaHafalanBeda)
cek('nilaiUjianKeseluruhan berbeda tapi nilaiPeringkat sengaja dibuat dekat -- urut oleh nilaiPeringkat, bukan hafalan (bukan tie sungguhan)', hasilUjianHafalanBeda.peringkat.map(s => s.id), ['hf-9', 'hf-3'])

// Tie sungguhan pada nilaiPeringkat DAN nilaiUjianKeseluruhan, hafalan berbeda -> hafalan desc menang
const tieHafalanSungguhan = [
  { id: 'hs-rendah', nama: 'Sama', total_hafalan_juz: 2, nilaiUjianKeseluruhan: 8 },
  { id: 'hs-tinggi', nama: 'Sama', total_hafalan_juz: 6, nilaiUjianKeseluruhan: 8 },
]
// max=6. hs-rendah: hafalan=(2/6)*10=3.3, peringkat=(8*4+3.3)/5=7.06->7.1
// hs-tinggi: hafalan=(6/6)*10=10, peringkat=(8*4+10)/5=8.4
// (nilaiUjianKeseluruhan sama, nilaiPeringkat berbeda karena nilaiHafalan beda -- cukup untuk
// membuktikan santri dgn hafalan lebih banyak mendapat peringkat lebih baik pada nilai ujian yg sama)
const hasilHafalanSungguhan = hitungRankingUjianHafalanKelas(tieHafalanSungguhan)
cek('Nilai Ujian Keseluruhan sama -> hafalan lebih banyak (hs-tinggi) mendapat peringkat lebih baik', hasilHafalanSungguhan.peringkat.map(s => s.id), ['hs-tinggi', 'hs-rendah'])

// ============================================================
// 9. KOREKSI ELIGIBILITY/DISPLAY (audit lanjutan) -- ranking TIDAK boleh menunggu seluruh kelas
// selesai ujian. Skenario persis dari laporan: kelas 3 santri, A & B minimal 1 juz selesai, C belum
// sama sekali -> A & B tetap tampil di `peringkat` (dengan status tampilan "Peringkat Sementara"
// di sisi konsumen -- BELUM ada UI yang mengonsumsi ranking ini di codebase, lihat laporan audit),
// C masuk `belumAdaHasil` TANPA skor 0 palsu. Ini murni re-konfirmasi: hitungRankingUjianHafalanKelas
// TIDAK PERNAH punya gate "semua santri kelas harus selesai" -- perilaku ini sudah benar sejak
// awal (lihat juga bagian 7 di atas), test ini hanya mengunci skenario PERSIS sesuai kata-kata
// laporan supaya regresi di masa depan langsung ketahuan.
// ============================================================
console.log('\n=== 9. Koreksi eligibility/display -- ranking tidak menunggu seluruh kelas selesai ===\n')

const kelasABC_eligibility = [
  { id: 'A', nama: 'A', total_hafalan_juz: 10, nilaiUjianKeseluruhan: 8.5 }, // minimal 1 juz selesai
  { id: 'B', nama: 'B', total_hafalan_juz: 6, nilaiUjianKeseluruhan: 9.0 },  // minimal 1 juz selesai
  { id: 'C', nama: 'C', total_hafalan_juz: 4, nilaiUjianKeseluruhan: null }, // belum py juz selesai
]
const hasilEligibility = hitungRankingUjianHafalanKelas(kelasABC_eligibility)

cek('A & B masuk peringkat (urutan tidak menunggu C)', hasilEligibility.peringkat.map(s => s.id).sort(), ['A', 'B'])
cek('C TIDAK masuk peringkat', hasilEligibility.peringkat.some(s => s.id === 'C'), false)
cek('C masuk belumAdaHasil', hasilEligibility.belumAdaHasil.map(s => s.id), ['C'])
cek('C tidak diberi skor/peringkat apa pun (bukan objek {peringkat, nilaiPeringkat, ...})', 'nilaiPeringkat' in hasilEligibility.belumAdaHasil[0], false)

// Status tampilan yang direplikasi di sini HANYA untuk verifikasi semantik teks (Rule "STATUS
// RANKING") -- bukan fungsi produksi, karena belum ada UI yang mengonsumsi endpoint ranking ini.
function statusPeringkatKelas(belumAdaHasilCount) {
  return belumAdaHasilCount > 0 ? 'Peringkat Sementara' : 'Peringkat Ujian Hafalan'
}
cek('Status = "Peringkat Sementara" selama belumAdaHasil.length > 0', statusPeringkatKelas(hasilEligibility.belumAdaHasil.length), 'Peringkat Sementara')

// Jika seluruh santri sudah eligible (belumAdaHasil kosong) -> status berubah, TANPA warning.
const kelasSemuaEligible = [
  { id: 'A', nama: 'A', total_hafalan_juz: 10, nilaiUjianKeseluruhan: 8.5 },
  { id: 'B', nama: 'B', total_hafalan_juz: 6, nilaiUjianKeseluruhan: 9.0 },
]
const hasilSemuaEligible = hitungRankingUjianHafalanKelas(kelasSemuaEligible)
cek('Seluruh santri eligible -> belumAdaHasil kosong', hasilSemuaEligible.belumAdaHasil, [])
cek('Status = "Peringkat Ujian Hafalan" (tanpa warning) saat belumAdaHasil kosong', statusPeringkatKelas(hasilSemuaEligible.belumAdaHasil.length), 'Peringkat Ujian Hafalan')

console.log(`\n${gagal === 0 ? 'SEMUA COCOK (0 kegagalan)' : `${gagal} PENGECEKAN GAGAL`}`)
process.exit(gagal === 0 ? 0 : 1)
