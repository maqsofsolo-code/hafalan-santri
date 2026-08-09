// Fungsi murni (tanpa state/fetch) yang dipakai halaman Kepsek -- dipisah
// dari app/kepsek/page.tsx pada Modularisasi Tahap 7A. Logic TIDAK diubah
// dari implementasi lama, hanya dipindah dan closure atas state diganti jadi
// parameter eksplisit (pola sama seperti app/admin/utils.ts).
import type { Santri, SetoranRow, NilaiUjianRow } from './types'

export function getKelasOptions(jenjang: string): number[] {
  if (jenjang === 'ula') return [1, 2, 3, 4, 5, 6]
  if (jenjang === 'wustha') return [7, 8, 9]
  if (jenjang === 'ulya') return [10, 11, 12]
  return []
}

export function jenjangLabel(j: string): string {
  if (j === 'ula') return 'Ula'
  if (j === 'wustha') return 'Wustha'
  if (j === 'ulya') return 'Ulya'
  return j
}

/** Filter santri untuk tab Ranking (jenis kelas + level kelas/jenjang/global). */
export function filterSantriRanking<T extends { jenis_kelas?: unknown, jenjang?: unknown, kelas_num?: unknown }>(
  list: T[],
  filters: { filterJenisKelas: string, rankingLevel: string, filterJenjang: string, filterKelas: string }
): T[] {
  return list.filter(s => {
    if (filters.filterJenisKelas !== 'semua') {
      if (filters.filterJenisKelas === 'tn') {
        if (s.jenis_kelas !== 'tn_a' && s.jenis_kelas !== 'tn_b') return false
      } else {
        if (s.jenis_kelas !== filters.filterJenisKelas) return false
      }
    }
    if (filters.rankingLevel === 'kelas') {
      if (filters.filterJenjang !== 'semua' && s.jenjang !== filters.filterJenjang) return false
      if (filters.filterKelas !== 'semua' && s.kelas_num?.toString() !== filters.filterKelas) return false
    } else if (filters.rankingLevel === 'jenjang') {
      if (filters.filterJenjang !== 'semua' && s.jenjang !== filters.filterJenjang) return false
    }
    return true
  })
}

/** Kategori status setoran satu santri pada tanggal yang dipilih (monitoring). */
export function kategoriSetoranSantri(setoranTanggalDipilih: SetoranRow[], santriId: string): string {
  const entries = setoranTanggalDipilih.filter(s => s.santri_id === santriId)
  if (entries.length === 0) return 'belum_diinput'
  if (entries.some(e => e.status_kehadiran === 'hadir')) return 'sudah_setor'
  if (entries.some(e => e.status_kehadiran === 'hadir_tidak_setor')) return 'hadir_tidak_setor'
  if (entries.some(e => e.status_kehadiran === 'sakit')) return 'sakit'
  if (entries.some(e => e.status_kehadiran === 'izin')) return 'izin'
  if (entries.some(e => e.status_kehadiran === 'alpha')) return 'alpha'
  return 'belum_diinput'
}

export type SantriMonitoring = Santri & { kategoriSetor: string }

/** Santri untuk tab Monitoring Harian: filter jenjang/kelas/nama + kategori setoran per santri. */
export function filterSantriMonitoring(
  santriList: Santri[],
  setoranTanggalDipilih: SetoranRow[],
  filters: { filterMonitoringJenjang: string, filterMonitoringKelas: string, searchMonitoring: string }
): SantriMonitoring[] {
  return santriList.filter(s => {
    if (filters.filterMonitoringJenjang !== 'semua' && s.jenjang !== filters.filterMonitoringJenjang) return false
    if (filters.filterMonitoringKelas !== 'semua' && s.kelas_num?.toString() !== filters.filterMonitoringKelas) return false
    if (filters.searchMonitoring && !s.nama?.toLowerCase().includes(filters.searchMonitoring.toLowerCase())) return false
    return true
  }).map(s => ({ ...s, kategoriSetor: kategoriSetoranSantri(setoranTanggalDipilih, s.id) }))
}

export type MurojaahResult = Santri & {
  targetHalaman: number
  targetLembar: number
  totalHalamanSetor: number
  totalLembarSetor: number
  persentase: number
  sudahMurojaah: boolean
  statusLabel: string
  statusColor: string
  statusBg: string
}

/** Hasil monitor murojaah per santri pada tanggal yang dipilih, diurutkan dari yang paling perlu perhatian. */
export function hitungMonitorMurojaah(
  santriList: Santri[],
  setoranMurojaahTanggal: SetoranRow[],
  filters: { filterMurojaahJenjang: string, filterMurojaahKelas: string, searchMurojaah: string }
): MurojaahResult[] {
  return santriList
    .filter(s => {
      if ((s.total_hafalan_juz || 0) <= 0) return false
      if (filters.filterMurojaahJenjang !== 'semua' && s.jenjang !== filters.filterMurojaahJenjang) return false
      if (filters.filterMurojaahKelas !== 'semua' && s.kelas_num?.toString() !== filters.filterMurojaahKelas) return false
      if (filters.searchMurojaah && !s.nama?.toLowerCase().includes(filters.searchMurojaah.toLowerCase())) return false
      return true
    })
    .map(santri => {
      const targetHalaman = santri.total_hafalan_juz || 0
      const targetLembar = targetHalaman / 2
      const setoranSantri = setoranMurojaahTanggal.filter(s => s.santri_id === santri.id)
      const totalHalamanSetor = setoranSantri.reduce((sum, s) => sum + (s.jumlah_halaman_murojaah || 0), 0)
      const totalLembarSetor = totalHalamanSetor / 2
      const sudahMurojaah = setoranSantri.length > 0
      const persentase = targetHalaman > 0 ? Math.round((totalHalamanSetor / targetHalaman) * 100) : 0
      let statusLabel = 'Belum Murojaah'; let statusColor = 'text-gray-500'; let statusBg = 'bg-gray-100'
      if (sudahMurojaah) {
        if (persentase >= 80) { statusLabel = 'Sesuai Target'; statusColor = 'text-green-700'; statusBg = 'bg-green-100' }
        else if (persentase >= 50) { statusLabel = 'Kurang Sedikit'; statusColor = 'text-yellow-700'; statusBg = 'bg-yellow-100' }
        else { statusLabel = 'Jauh dari Target'; statusColor = 'text-red-700'; statusBg = 'bg-red-100' }
      }
      return { ...santri, targetHalaman, targetLembar, totalHalamanSetor, totalLembarSetor, persentase, sudahMurojaah, statusLabel, statusColor, statusBg }
    }).sort((a, b) => a.persentase - b.persentase)
}

export type RekapNilaiKelas = { total: number, count: number, kelas: string, jenjang: string, rata: number }

/** Rata-rata nilai ujian per kelas, diurutkan dari rata-rata tertinggi. */
export function hitungRekapNilaiPerKelas(nilaiUjianList: NilaiUjianRow[]): RekapNilaiKelas[] {
  const map: Record<string, { total: number, count: number, kelas: string, jenjang: string }> = {}
  nilaiUjianList.forEach(n => {
    if (!n.santri) return
    const key = `${n.santri.kelas_num}-${n.santri.jenjang}`
    if (!map[key]) map[key] = { total: 0, count: 0, kelas: n.santri.kelas || '-', jenjang: n.santri.jenjang || '' }
    map[key].total += n.nilai_akhir || 0
    map[key].count += 1
  })
  return Object.values(map).map(v => ({ ...v, rata: Math.round((v.total / v.count) * 10) / 10 })).sort((a, b) => b.rata - a.rata)
}
