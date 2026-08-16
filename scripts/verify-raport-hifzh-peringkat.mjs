// Verifikasi "Peringkat Kelas"/"Peringkat Sementara" pada Raport Hifzh Excel (URGENT LANJUTAN --
// koreksi eligibility/display). Bukan unit test framework -- script verifikasi berdiri sendiri,
// sama seperti scripts/verify-*.mjs lainnya:
//   node scripts/verify-raport-hifzh-peringkat.mjs
// Exit code 0 jika semua cocok, 1 jika ada satu saja yang berbeda.
//
// Verifikasi rumus ranking (hitungRankingUjianHafalanKelas, TIDAK diubah/diduplikasi di sini) +
// glue logic caller (app/api/admin/nilai-ujian-excel/route.ts) yang menyiapkan
// peringkatKelas/jumlahSantriEligible/jumlahBelumAdaHasil sebelum dikirim ke
// buildRaportHifzhWorkbook -- murni fungsi, tidak menyentuh Excel.
//
// CATATAN: penulisan cell Excel sungguhan (M53/M54/M57, lihat app/lib/raportHifzhExcel.ts) TIDAK
// bisa diverifikasi otomatis lewat `node` polos di sini -- buildRaportHifzhWorkbook memakai
// `await import('exceljs')` (dynamic import gaya lama, sudah ada SEBELUM perubahan ini, dipakai juga
// oleh kolom Kelancaran/Tajwid yang sudah live di production) yang di Next.js (webpack/Turbopack)
// mengekspos `ExcelJS.Workbook` langsung, tapi di bawah `node` polos (tanpa bundler) namespace hasil
// dynamic import hanya mengekspos `.default.Workbook` (keterbatasan interop CJS/ESM Node bawaan
// exceljs, dikonfirmasi lewat `node -e "await import('exceljs')"` -- BUKAN bug dari perubahan ini).
// Mengubah pola import tsb di luar cakupan tugas ini. Penulisan cell M53/M54/M57 memakai mekanisme
// YANG SAMA PERSIS (ws.getCell(alamat).value = ...) dengan kolom Kelancaran/Tajwid yang sudah
// terverifikasi jalan di production, jadi risiko inkremental tetap rendah.

import { hitungRankingUjianHafalanKelas } from '../app/lib/ranking.ts'

let gagal = 0

function cek(label, aktual, diharapkan) {
  const aktualStr = JSON.stringify(aktual)
  const diharapkanStr = JSON.stringify(diharapkan)
  const cocok = aktualStr === diharapkanStr
  if (!cocok) gagal++
  console.log(`${cocok ? 'PASS' : 'GAGAL'} — ${label}${cocok ? '' : `\n       aktual:     ${aktualStr}\n       diharapkan: ${diharapkanStr}`}`)
}

// Mereplikasi glue logic caller (app/api/admin/nilai-ujian-excel/route.ts) di luar Excel -- TIDAK
// menduplikasi rumus ranking, hanya derivasi murni dari hasil hitungRankingUjianHafalanKelas.
// Denominator ("Y") SELALU peringkat.length (santri eligible), TIDAK PERNAH santriKelas.length.
function hitungKonteksPeringkat(santriKelas) {
  const { peringkat, belumAdaHasil } = hitungRankingUjianHafalanKelas(santriKelas)
  const jumlahSantriEligible = peringkat.length
  const jumlahBelumAdaHasil = belumAdaHasil.length
  const peringkatMap = new Map(peringkat.map(s => [s.id, s.peringkat]))
  return { jumlahSantriEligible, jumlahBelumAdaHasil, peringkatMap, belumAdaHasil }
}

// Replika 1:1 infoPeringkatKelas() di raportHifzhExcel.ts (fungsi privat, tidak diekspor) --
// HANYA untuk memverifikasi format teks, bukan rumus ranking.
function infoPeringkatKelas(peringkatKelas, jumlahSantriEligible, jumlahBelumAdaHasil) {
  if (peringkatKelas === null) return { label: 'Peringkat Kelas: Belum Ada Hasil', keterangan: null }
  if (jumlahBelumAdaHasil > 0) {
    return {
      label: `Peringkat Sementara: ${peringkatKelas} dari ${jumlahSantriEligible}`,
      keterangan: `Masih ada ${jumlahBelumAdaHasil} santri yang belum menyelesaikan ujian.`,
    }
  }
  return { label: `Peringkat Kelas: ${peringkatKelas} dari ${jumlahSantriEligible}`, keterangan: null }
}

// ============================================================
// Rumus ranking + glue logic caller (tanpa Excel -- lihat catatan di atas)
// ============================================================
console.log('=== Rumus ranking + status sementara/final (tanpa Excel) ===\n')

// CASE 1: 3 santri, semua eligible, B peringkat 2 -> final, Y = 3 (semua eligible)
const kelasCase1 = [
  { id: 'A', nama: 'A', total_hafalan_juz: 10, nilaiUjianKeseluruhan: 9 },
  { id: 'B', nama: 'B', total_hafalan_juz: 8, nilaiUjianKeseluruhan: 8 },
  { id: 'C', nama: 'C', total_hafalan_juz: 5, nilaiUjianKeseluruhan: 7 },
]
const konteks1 = hitungKonteksPeringkat(kelasCase1)
cek('CASE 1: jumlahBelumAdaHasil = 0 (final)', konteks1.jumlahBelumAdaHasil, 0)
cek('CASE 1: jumlahSantriEligible = 3', konteks1.jumlahSantriEligible, 3)
cek('CASE 1: B peringkat 2 dari 3', konteks1.peringkatMap.get('B'), 2)
cek('CASE 1 (label): B -> "Peringkat Kelas: 2 dari 3" (final, tanpa keterangan)',
  infoPeringkatKelas(2, 3, 0), { label: 'Peringkat Kelas: 2 dari 3', keterangan: null })

// CASE 2: 3 santri aktif, 2 sudah punya hasil, 1 belum -> ranking A/B TETAP tampil (Sementara),
// Y = 2 (HANYA santri eligible, C tidak masuk denominator sama sekali -- Rule B "PENTING")
const kelasCase2 = [
  { id: 'A', nama: 'A', total_hafalan_juz: 10, nilaiUjianKeseluruhan: 9 },
  { id: 'B', nama: 'B', total_hafalan_juz: 8, nilaiUjianKeseluruhan: 8 },
  { id: 'C', nama: 'C', total_hafalan_juz: 5, nilaiUjianKeseluruhan: null }, // belum py juz selesai
]
const konteks2 = hitungKonteksPeringkat(kelasCase2)
cek('CASE 2: jumlahBelumAdaHasil = 1 (C)', konteks2.jumlahBelumAdaHasil, 1)
cek('CASE 2: jumlahSantriEligible = 2 (HANYA A & B, C TIDAK masuk denominator)', konteks2.jumlahSantriEligible, 2)
cek('CASE 2: belumAdaHasil berisi C', konteks2.belumAdaHasil.map(s => s.id), ['C'])
cek('CASE 2: A & B tetap masuk peringkat (rank tidak menunggu C)', [konteks2.peringkatMap.has('A'), konteks2.peringkatMap.has('B')], [true, true])
cek('CASE 2 (label): A (peringkat 1) -> "Peringkat Sementara: 1 dari 2" (BUKAN "dari 3")',
  infoPeringkatKelas(konteks2.peringkatMap.get('A'), konteks2.jumlahSantriEligible, konteks2.jumlahBelumAdaHasil),
  { label: 'Peringkat Sementara: 1 dari 2', keterangan: 'Masih ada 1 santri yang belum menyelesaikan ujian.' })
cek('CASE 2 (label): C (belum eligible) -> "Peringkat Kelas: Belum Ada Hasil"',
  infoPeringkatKelas(null, konteks2.jumlahSantriEligible, konteks2.jumlahBelumAdaHasil),
  { label: 'Peringkat Kelas: Belum Ada Hasil', keterangan: null })

// CASE 3: semua Kelancaran (nilaiUjianKeseluruhan) lengkap, Tajwid tidak pernah masuk input sama
// sekali ke hitungRankingUjianHafalanKelas -- jadi kosong/isinya Tajwid TIDAK bisa memengaruhi hasil
// ini secara struktural (dibuktikan lagi di sini dengan kelas identik tanpa field tajwid apapun).
const kelasCase3 = [
  { id: 'X', nama: 'X', total_hafalan_juz: 4, nilaiUjianKeseluruhan: 8.5 },
  { id: 'Y', nama: 'Y', total_hafalan_juz: 4, nilaiUjianKeseluruhan: 9 },
]
const konteks3 = hitungKonteksPeringkat(kelasCase3)
cek('CASE 3: jumlahBelumAdaHasil = 0 walau Tajwid tidak pernah disebut sebagai input', konteks3.jumlahBelumAdaHasil, 0)

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

// ============================================================
// Skenario Rule H persis: 20 santri aktif, 15 eligible, 5 belum
// ============================================================
console.log('\n=== Skenario 20 santri (15 eligible, 5 belum) ===\n')

const kelas20 = [
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `e${i + 1}`, nama: `Eligible${i + 1}`,
    total_hafalan_juz: 20 - i, // urutan hafalan menurun supaya peringkat deterministik & berbeda-beda
    nilaiUjianKeseluruhan: 9 - i * 0.1,
  })),
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `b${i + 1}`, nama: `BelumHasil${i + 1}`,
    total_hafalan_juz: 3, nilaiUjianKeseluruhan: null,
  })),
]
const konteks20 = hitungKonteksPeringkat(kelas20)
cek('20 santri: jumlahSantriEligible = 15', konteks20.jumlahSantriEligible, 15)
cek('20 santri: jumlahBelumAdaHasil = 5', konteks20.jumlahBelumAdaHasil, 5)
cek('20 santri: e3 (nilai tertinggi ke-3) peringkat 3 dari 15', konteks20.peringkatMap.get('e3'), 3)

const infoE3Sementara = infoPeringkatKelas(konteks20.peringkatMap.get('e3'), konteks20.jumlahSantriEligible, konteks20.jumlahBelumAdaHasil)
cek('20 santri: raport e3 -> "Peringkat Sementara: 3 dari 15" (BUKAN "3 dari 20")', infoE3Sementara.label, 'Peringkat Sementara: 3 dari 15')

// Setelah seluruh 20 santri eligible -> "Peringkat Kelas: 3 dari 20" (final)
const kelas20SemuaEligible = kelas20.map(s => s.nilaiUjianKeseluruhan === null ? { ...s, nilaiUjianKeseluruhan: 5 } : s)
const konteks20Final = hitungKonteksPeringkat(kelas20SemuaEligible)
cek('20 santri (semua eligible): jumlahBelumAdaHasil = 0', konteks20Final.jumlahBelumAdaHasil, 0)
cek('20 santri (semua eligible): jumlahSantriEligible = 20', konteks20Final.jumlahSantriEligible, 20)
cek('20 santri (semua eligible): e3 tetap peringkat 3 (nilai lebih tinggi dari seluruh santri baru)', konteks20Final.peringkatMap.get('e3'), 3)
const infoE3Final = infoPeringkatKelas(konteks20Final.peringkatMap.get('e3'), konteks20Final.jumlahSantriEligible, konteks20Final.jumlahBelumAdaHasil)
cek('20 santri (semua eligible): raport e3 -> "Peringkat Kelas: 3 dari 20"', infoE3Final.label, 'Peringkat Kelas: 3 dari 20')

// Santri yang masih belum eligible (mis. kalau salah satu dari 5 tetap belum py hasil) tidak pernah
// diberi ranking palsu.
const infoBelumHasil = infoPeringkatKelas(null, konteks20.jumlahSantriEligible, konteks20.jumlahBelumAdaHasil)
cek('20 santri: santri belum eligible -> "Peringkat Kelas: Belum Ada Hasil" (bukan angka palsu)', infoBelumHasil.label, 'Peringkat Kelas: Belum Ada Hasil')

console.log(`\n${gagal === 0 ? 'SEMUA COCOK (0 kegagalan)' : `${gagal} PENGECEKAN GAGAL`}`)
process.exit(gagal === 0 ? 0 : 1)
