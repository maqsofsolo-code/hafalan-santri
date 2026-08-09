// Satu sumber untuk seluruh kebutuhan tanggal/waktu WIB (Asia/Jakarta) yang
// sebelumnya diimplementasikan ulang di banyak file (lihat Modularisasi
// Tahap 2). Setiap fungsi di sini menghasilkan output yang IDENTIK dengan
// implementasi lama yang digantikannya -- diverifikasi via script boundary
// test terpisah, bukan diubah/didesain ulang. Jangan ubah rule pekan
// (Senin-Sabtu, cutoff Sabtu 17:00 WIB) di sini tanpa keputusan bisnis
// eksplisit -- ini bukan tempat untuk business logic ranking/scoring,
// hanya penentuan tanggal/periode.

const ZONA_WIB = 'Asia/Jakarta'

/**
 * Instant `saatIni` dibungkus jadi Date yang local-getter-nya
 * (getFullYear/getMonth/getDate/getHours/getDay dst) merepresentasikan
 * wall-clock WIB, terlepas dari timezone runtime yang menjalankannya.
 */
export function getWIBDate(saatIni: Date = new Date()): Date {
  return new Date(saatIni.toLocaleString('en-US', { timeZone: ZONA_WIB }))
}

/** Tanggal hari ini (atau `saatIni`) di WIB, format YYYY-MM-DD. */
export function getTanggalWIB(saatIni: Date = new Date()): string {
  const wib = getWIBDate(saatIni)
  const y = wib.getFullYear()
  const m = String(wib.getMonth() + 1).padStart(2, '0')
  const d = String(wib.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Hari dalam minggu di WIB (0=Ahad..6=Sabtu), sama semantik dengan Date.getDay(). */
export function getHariWIB(saatIni: Date = new Date()): number {
  return getWIBDate(saatIni).getDay()
}

/**
 * Format Date (hasil konstruksi via Date.UTC, dipakai untuk merepresentasikan
 * tanggal kalender WIB sebagai UTC-tengah-malam) jadi string YYYY-MM-DD.
 * Bukan untuk memformat instant sembarang -- hanya untuk hasil perhitungan
 * periode di bawah.
 */
export function formatTanggalUTC(date: Date): string {
  const tahun = date.getUTCFullYear()
  const bulan = String(date.getUTCMonth() + 1).padStart(2, '0')
  const tanggal = String(date.getUTCDate()).padStart(2, '0')
  return `${tahun}-${bulan}-${tanggal}`
}

export type PeriodePekanTertutup = {
  tanggalMulai: string
  tanggalSelesai: string
  labelPeriode: string
}

/**
 * Periode pekan (Senin-Sabtu) TERTUTUP terbaru. Rule FINAL (jangan ubah
 * tanpa keputusan bisnis eksplisit):
 *   - Ahad, atau Sabtu jam 17:00 WIB ke atas -> pekan Senin-Sabtu yang baru
 *     saja lewat dianggap tertutup, itu yang dipakai.
 *   - Senin..Jumat, atau Sabtu sebelum jam 17:00 WIB -> pekan berjalan
 *     belum tertutup, pakai pekan sebelumnya.
 */
export function getPeriodePekanTertutup(saatIni: Date = new Date()): PeriodePekanTertutup {
  const bagianWIB = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA_WIB,
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
  let labelPeriode: string

  if (mulaiBulan === selesaiBulan && mulaiTahun === selesaiTahun) {
    labelPeriode = `${mulaiTanggal}–${selesaiTanggal} ${namaBulan[selesaiBulan]} ${selesaiTahun}`
  } else if (mulaiTahun === selesaiTahun) {
    labelPeriode = `${mulaiTanggal} ${namaBulan[mulaiBulan]}–${selesaiTanggal} ${namaBulan[selesaiBulan]} ${selesaiTahun}`
  } else {
    labelPeriode = `${mulaiTanggal} ${namaBulan[mulaiBulan]} ${mulaiTahun}–${selesaiTanggal} ${namaBulan[selesaiBulan]} ${selesaiTahun}`
  }

  return {
    tanggalMulai: formatTanggalUTC(tanggalMulaiDate),
    tanggalSelesai: formatTanggalUTC(tanggalSelesaiDate),
    labelPeriode,
  }
}

/**
 * Parse string tanggal DB (YYYY-MM-DD) jadi Date lokal TANPA shift timezone
 * (mis. parse '2026-08-09' tidak boleh bergeser jadi 8 Agustus di zona
 * UTC-negatif, karena dipakai lewat konstruktor Date(y,m,d) lokal, bukan
 * parse string yang ditafsirkan UTC). Null jika format tidak valid.
 */
export function parseTanggalDbAman(value: string): Date | null {
  const [tahun, bulan, tanggal] = value.split('-').map(Number)
  if (!tahun || !bulan || !tanggal) return null
  return new Date(tahun, bulan - 1, tanggal)
}

/**
 * Format tanggal DB (YYYY-MM-DD) jadi tampilan Indonesia pendek, mis.
 * "09 Agu 2026". Sama persis dengan `formatTanggal()` yang sebelumnya
 * diduplikasi verbatim di AdminRekapNilaiUjian.tsx dan RekapNilaiUjianGuru.tsx.
 */
export function formatTanggalPendekID(value: string | null | undefined): string {
  if (!value) return '-'
  const tanggal = parseTanggalDbAman(value)
  if (!tanggal) return value
  return tanggal.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
