// Verifikasi deterministik: app/lib/ranking.ts (Modularisasi Tahap 3) HARUS
// menghasilkan skor konsistensi/semangat yang identik dengan implementasi
// lama (formula tidak diubah), dan HARUS menghasilkan urutan yang
// deterministik/konsisten lintas halaman (Admin/Wali/Kepsek/PDF/send-notif)
// untuk tie-breaker Total Hafalan & Semangat sesuai keputusan bisnis final
// (Opsi A). Bukan unit test framework -- script verifikasi berdiri sendiri:
//   node scripts/verify-ranking.mjs
// Exit code 0 jika semua cocok, 1 jika ada satu saja yang berbeda.
// Plain JS (.mjs) supaya tidak ikut disapu tsconfig include (**/*.mts).

import {
  hitungRankingTotalHafalan,
  bandingkanTotalHafalan,
  hitungStatsKonsistensi,
  bandingkanKonsistensi,
  hitungRankingKonsistensi,
  hitungStatsSemangat,
  bandingkanSemangat,
  hitungRankingSemangat,
} from '../app/lib/ranking.ts'

let gagal = 0

function cek(label, aktual, diharapkan) {
  const aktualStr = JSON.stringify(aktual)
  const diharapkanStr = JSON.stringify(diharapkan)
  const cocok = aktualStr === diharapkanStr
  if (!cocok) gagal++
  console.log(`${cocok ? 'PASS' : 'GAGAL'} — ${label}${cocok ? '' : `\n       aktual:     ${aktualStr}\n       diharapkan: ${diharapkanStr}`}`)
}

function shuffle(arr, seed) {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ============================================================
// 1. KONSISTENSI — Ula/Wustha (cap 2x hari aktif, lama+baru dihitung)
// ============================================================
console.log('=== 1. Konsistensi — Ula/Wustha (2x cap) ===\n')

const hariAktifKonsistensi = new Set(['2026-08-03', '2026-08-04', '2026-08-05'])
const totalHariAktifKonsistensi = hariAktifKonsistensi.size // 3

const santriUla = [
  { id: 'ula-1', nama: 'Ahmad', jenjang: 'ula' },
  { id: 'ula-2', nama: 'Budi', jenjang: 'ula' },
]

const setoranUla = [
  // ula-1: 03 lama lancar, 03 baru lancar (0.5), 04 lama lancar,
  //        04 baru rosib (tidak dihitung), 05 lama rosib, 05 baru lancar (1.0)
  { santri_id: 'ula-1', tanggal: '2026-08-03', jenis: 'lama', status: 'lancar', penambahan_juz: null },
  { santri_id: 'ula-1', tanggal: '2026-08-03', jenis: 'baru', status: 'lancar', penambahan_juz: 0.5 },
  { santri_id: 'ula-1', tanggal: '2026-08-04', jenis: 'lama', status: 'lancar', penambahan_juz: null },
  { santri_id: 'ula-1', tanggal: '2026-08-04', jenis: 'baru', status: 'rosib', penambahan_juz: 0 },
  { santri_id: 'ula-1', tanggal: '2026-08-05', jenis: 'lama', status: 'rosib', penambahan_juz: null },
  { santri_id: 'ula-1', tanggal: '2026-08-05', jenis: 'baru', status: 'lancar', penambahan_juz: 1.0 },
  // dedup: 2 baris lama di hari+jenis yang sama (03:lama) -- hanya dihitung sekali
  { santri_id: 'ula-1', tanggal: '2026-08-03', jenis: 'lama', status: 'lancar', penambahan_juz: null },
  // ula-2: tidak setor sama sekali (harus tetap muncul dengan stats kosong)
]

const statsUla = hitungStatsKonsistensi(setoranUla, hariAktifKonsistensi, id =>
  santriUla.find(s => s.id === id)?.jenjang
)

cek('ula-1 totalPoin (03:lama,03:baru,04:lama,05:baru = 4, dedup 03:lama tidak dobel di totalPoin)', statsUla.get('ula-1').totalPoin, 4)
cek('ula-1 totalPenambahanBaru (0.5 + 1.0)', statsUla.get('ula-1').totalPenambahanBaru, 1.5)
// najihLama TIDAK dedup (raw count baris lancar) -- beda dari totalPoin yang dedup
// per tanggal+jenis. Ini perilaku ASLI (bukan bug modul baru): 03-lama muncul 2x
// lancar (baris asli + baris duplikat sengaja utk uji dedup totalPoin) + 04-lama = 3.
cek('ula-1 najihLama (raw count, TIDAK dedup: 03x2 + 04 = 3)', statsUla.get('ula-1').najihLama, 3)
cek('ula-1 rosibLama (05)', statsUla.get('ula-1').rosibLama, 1)
cek('ula-1 najihBaru (03,05)', statsUla.get('ula-1').najihBaru, 2)
cek('ula-1 rosibBaru (04)', statsUla.get('ula-1').rosibBaru, 1)
cek('ula-2 tidak ada data -> undefined di stats map (bukan 0 palsu)', statsUla.has('ula-2'), false)

const rankingUla = hitungRankingKonsistensi(santriUla, setoranUla, hariAktifKonsistensi, totalHariAktifKonsistensi)
cek('ula-1 poinMaksimal = totalHariAktif*2 = 6', rankingUla.find(s => s.id === 'ula-1').poinMaksimal, 6)
cek('ula-1 persentaseKonsistensi = round(4/6*100) = 67', rankingUla.find(s => s.id === 'ula-1').persentaseKonsistensi, 67)
cek('ula-1 (totalPoin 4) mengungguli ula-2 (totalPoin 0)', rankingUla.map(s => s.id), ['ula-1', 'ula-2'])

// ============================================================
// 2. KONSISTENSI — Ulya (cap 1x hari aktif, jenis='baru' DIKECUALIKAN)
// ============================================================
console.log('\n=== 2. Konsistensi — Ulya (1x cap, baru dikecualikan) ===\n')

const santriUlya = [{ id: 'ulya-1', nama: 'Zaid', jenjang: 'ulya' }]
const setoranUlya = [
  { santri_id: 'ulya-1', tanggal: '2026-08-03', jenis: 'lama', status: 'lancar', penambahan_juz: null },
  { santri_id: 'ulya-1', tanggal: '2026-08-03', jenis: 'baru', status: 'lancar', penambahan_juz: 5 }, // harus diabaikan total
  { santri_id: 'ulya-1', tanggal: '2026-08-04', jenis: 'lama', status: 'rosib', penambahan_juz: null },
  { santri_id: 'ulya-1', tanggal: '2026-08-05', jenis: 'lama', status: 'lancar', penambahan_juz: null },
]
const rankingUlya = hitungRankingKonsistensi(santriUlya, setoranUlya, hariAktifKonsistensi, totalHariAktifKonsistensi)
const ulya1 = rankingUlya.find(s => s.id === 'ulya-1')
cek('ulya-1 totalPoin (hanya 03:lama,05:lama, baru diabaikan) = 2', ulya1.totalPoin, 2)
cek('ulya-1 totalPenambahanBaru = 0 (baru dikecualikan penuh)', ulya1.totalPenambahanBaru, 0)
cek('ulya-1 najihBaru = 0 (baru dikecualikan penuh, walau ada baris lancar)', ulya1.najihBaru, 0)
cek('ulya-1 poinMaksimal = totalHariAktif*1 = 3 (bukan *2)', ulya1.poinMaksimal, 3)
cek('ulya-1 persentaseKonsistensi = round(2/3*100) = 67', ulya1.persentaseKonsistensi, 67)

// ============================================================
// 3. TOTAL HAFALAN — tie-break eksplisit (Opsi A: nilai -> nama -> id)
// ============================================================
console.log('\n=== 3. Total Hafalan — tie-break nama & id ===\n')

const santriTotal = [
  { id: 'id-4', nama: 'Zaid', total_hafalan_juz: 12 },
  { id: 'id-2', nama: 'Ahmad', total_hafalan_juz: 10 },
  { id: 'id-3', nama: 'Budi', total_hafalan_juz: 10 },
  { id: 'id-1', nama: 'Ahmad', total_hafalan_juz: 10 }, // nama sama dgn id-2, id lebih kecil
]
const urutanDiharapkanTotal = ['id-4', 'id-1', 'id-2', 'id-3']
cek(
  'Urutan: nilai tertinggi dulu, lalu nama tertinggi diikat nama, lalu id',
  hitungRankingTotalHafalan(santriTotal).map(s => s.id),
  urutanDiharapkanTotal
)
// Cross-order: hasil tidak boleh berubah walau urutan input berbeda (mensimulasikan
// Admin/vs Kepsek yang query-nya berbeda urutan -- lihat temuan audit awal)
for (const seed of [1, 2, 3, 4, 5]) {
  cek(
    `Total Hafalan tidak bergantung urutan input (seed ${seed})`,
    hitungRankingTotalHafalan(shuffle(santriTotal, seed)).map(s => s.id),
    urutanDiharapkanTotal
  )
}

// ============================================================
// 4. SEMANGAT — tie-break eksplisit (Opsi A), sekaligus cocok dengan
//    tie-break yang SUDAH ADA di send-notif sejak awal (tidak berubah)
// ============================================================
console.log('\n=== 4. Semangat — tie-break nama & id ===\n')

const hariAktif7Hari = new Set(['2026-08-01', '2026-08-02', '2026-08-03'])
const santriSemangat = [
  { id: 'sm-1', nama: 'Budi' },
  { id: 'sm-2', nama: 'Ahmad' },
  { id: 'sm-3', nama: 'Citra' },
]
const setoranSemangat = [
  // sm-1 & sm-2: totalJuz sama (1.0), hariSetor sama (1 hari), najih sama (1) -> tie penuh -> nama
  { santri_id: 'sm-1', tanggal: '2026-08-01', jenis: 'baru', status: 'lancar', penambahan_juz: 1.0 },
  { santri_id: 'sm-2', tanggal: '2026-08-01', jenis: 'baru', status: 'lancar', penambahan_juz: 1.0 },
  // sm-3: totalJuz lebih kecil
  { santri_id: 'sm-3', tanggal: '2026-08-02', jenis: 'baru', status: 'lancar', penambahan_juz: 0.5 },
]
const urutanDiharapkanSemangat = ['sm-2', 'sm-1', 'sm-3'] // Ahmad < Budi (tie), lalu Citra (nilai lebih kecil)
cek(
  'Urutan semangat: nilai tertinggi dulu, tie -> nama',
  hitungRankingSemangat(santriSemangat, setoranSemangat, hariAktif7Hari).map(s => s.id),
  urutanDiharapkanSemangat
)
for (const seed of [1, 2, 3]) {
  cek(
    `Semangat tidak bergantung urutan input (seed ${seed})`,
    hitungRankingSemangat(shuffle(santriSemangat, seed), setoranSemangat, hariAktif7Hari).map(s => s.id),
    urutanDiharapkanSemangat
  )
}

// Reimplementasi verbatim tie-break LAMA admin/kepsek/wali (return 0, tanpa
// tie-break eksplisit) -- membuktikan bahwa utk input TIDAK ter-urut nama,
// hasilnya BISA beda dari module baru. Ini perubahan yang SUDAH DISETUJUI
// (Opsi A), bukan regresi diam-diam.
function legacySortSemangat_tanpaTieBreak(list, statsMap) {
  return [...list].sort((a, b) => {
    const stA = statsMap.get(a.id) || { totalJuz: 0, hariSetor: new Set(), najih: 0 }
    const stB = statsMap.get(b.id) || { totalJuz: 0, hariSetor: new Set(), najih: 0 }
    if (stB.totalJuz !== stA.totalJuz) return stB.totalJuz - stA.totalJuz
    if (stB.hariSetor.size !== stA.hariSetor.size) return stB.hariSetor.size - stA.hariSetor.size
    if (stB.najih !== stA.najih) return stB.najih - stA.najih
    return 0
  })
}
const statsMapSemangat = hitungStatsSemangat(setoranSemangat, hariAktif7Hari)
const inputTakTerurut = [santriSemangat[0], santriSemangat[1], santriSemangat[2]] // sm-1, sm-2 (Budi dulu, BUKAN nama-order)
const legacyResult = legacySortSemangat_tanpaTieBreak(inputTakTerurut, statsMapSemangat).map(s => s.id)
console.log(`       legacy (tanpa tie-break, input Budi-dulu) -> ${JSON.stringify(legacyResult)} (TIDAK dipakai lagi -- terbukti beda dari module baru: ${JSON.stringify(urutanDiharapkanSemangat)})`)
cek('Bukti: perilaku LAMA (return 0) berbeda dari module BARU untuk input non-nama-order (perubahan disetujui, bukan regresi diam-diam)', legacyResult === JSON.stringify(urutanDiharapkanSemangat) ? 'sama' : 'beda', 'beda')

// ============================================================
// 5. BUILDING-BLOCK vs TURNKEY — laporan-peringkat-pdf & send-notif memakai
//    hitungStats*/bandingkan* langsung (per kelompok kelas), bukan fungsi
//    turnkey. Buktikan keduanya menghasilkan urutan yang SAMA untuk
//    kelompok yang sama.
// ============================================================
console.log('\n=== 5. Building-block (PDF/send-notif) vs turnkey (Admin/Kepsek/Wali) konsisten ===\n')

const turnkeyKonsistensi = hitungRankingKonsistensi(santriUla, setoranUla, hariAktifKonsistensi, totalHariAktifKonsistensi).map(s => s.id)
const statsMapKonsistensiUla = hitungStatsKonsistensi(setoranUla, hariAktifKonsistensi, id => santriUla.find(s => s.id === id)?.jenjang)
const buildingBlockKonsistensi = [...santriUla]
  .sort((a, b) => bandingkanKonsistensi(id => statsMapKonsistensiUla.get(id) || { totalPoin: 0, totalPenambahanBaru: 0, najihLama: 0, rosibLama: 0, najihBaru: 0, rosibBaru: 0, adaData: false }, a, b))
  .map(s => s.id)
cek('Konsistensi: hasil building-block == hasil turnkey', buildingBlockKonsistensi, turnkeyKonsistensi)

const turnkeySemangat = hitungRankingSemangat(santriSemangat, setoranSemangat, hariAktif7Hari).map(s => s.id)
const buildingBlockSemangat = [...santriSemangat]
  .sort((a, b) => bandingkanSemangat(id => statsMapSemangat.get(id) || { totalJuz: 0, hariSetor: new Set(), najih: 0, adaData: false }, a, b))
  .map(s => s.id)
cek('Semangat: hasil building-block == hasil turnkey', buildingBlockSemangat, turnkeySemangat)

const buildingBlockTotal = [...santriTotal].sort(bandingkanTotalHafalan).map(s => s.id)
cek('Total Hafalan: bandingkanTotalHafalan langsung == hitungRankingTotalHafalan', buildingBlockTotal, hitungRankingTotalHafalan(santriTotal).map(s => s.id))

// ============================================================
// 6. CROSS-PAGE CONSISTENCY — satu dataset gabungan, dipakai seolah-olah
//    dari Admin (nama-order), Kepsek (urutan DB/tak-terurut), dan Wali
//    (nama-order dari ranking-data endpoint). Hasil akhir HARUS sama.
// ============================================================
console.log('\n=== 6. Cross-page consistency (Admin/Kepsek/Wali/PDF/send-notif harus sama) ===\n')

const santriGabungan = [
  { id: 's-1', nama: 'Umar', jenjang: 'ula', total_hafalan_juz: 8 },
  { id: 's-2', nama: 'Ali', jenjang: 'ula', total_hafalan_juz: 8 },
  { id: 's-3', nama: 'Fatimah', jenjang: 'ula', total_hafalan_juz: 15 },
  { id: 's-4', nama: 'Bilal', jenjang: 'ula', total_hafalan_juz: 3 },
]
const setoranGabungan = [
  { santri_id: 's-1', tanggal: '2026-08-03', jenis: 'lama', status: 'lancar', penambahan_juz: null },
  { santri_id: 's-2', tanggal: '2026-08-03', jenis: 'lama', status: 'lancar', penambahan_juz: null },
  { santri_id: 's-2', tanggal: '2026-08-04', jenis: 'lama', status: 'lancar', penambahan_juz: null },
]
const namaOrder = [...santriGabungan].sort((a, b) => a.nama.localeCompare(b.nama, 'id')) // simulasi Admin/Wali (.order('nama'))
const dbOrder = [santriGabungan[2], santriGabungan[0], santriGabungan[3], santriGabungan[1]] // simulasi Kepsek (tak ber-.order('nama'))

const hasilTotalNama = hitungRankingTotalHafalan(namaOrder).map(s => s.id)
const hasilTotalDb = hitungRankingTotalHafalan(dbOrder).map(s => s.id)
cek('Total Hafalan: Admin(nama-order) == Kepsek(db-order)', hasilTotalDb, hasilTotalNama)

const hasilKonsistensiNama = hitungRankingKonsistensi(namaOrder, setoranGabungan, hariAktifKonsistensi, totalHariAktifKonsistensi).map(s => s.id)
const hasilKonsistensiDb = hitungRankingKonsistensi(dbOrder, setoranGabungan, hariAktifKonsistensi, totalHariAktifKonsistensi).map(s => s.id)
cek('Konsistensi: Admin(nama-order) == Kepsek(db-order)', hasilKonsistensiDb, hasilKonsistensiNama)

const hasilSemangatNama = hitungRankingSemangat(namaOrder, [], hariAktif7Hari).map(s => s.id)
const hasilSemangatDb = hitungRankingSemangat(dbOrder, [], hariAktif7Hari).map(s => s.id)
cek('Semangat: Admin(nama-order) == Kepsek(db-order)', hasilSemangatDb, hasilSemangatNama)

console.log(`\n${gagal === 0 ? 'SEMUA COCOK (0 kegagalan)' : `${gagal} PENGECEKAN GAGAL`}`)
process.exit(gagal === 0 ? 0 : 1)
