// Fungsi murni (tanpa state/fetch) yang dipakai halaman Kepsek -- dipisah
// dari app/kepsek/page.tsx pada Modularisasi Tahap 7A. Logic TIDAK diubah
// dari implementasi lama, hanya dipindah dan closure atas state diganti jadi
// parameter eksplisit (pola sama seperti app/admin/utils.ts).
//
// Helper di bawah `kategoriSetoranSantri`/`filterSantriMonitoring`/
// `hitungMonitorMurojaah` (groupBelumDiinputByGuru, buildClipboardBelumDiinput,
// ringkasAbsensiGuru, groupMurojaahByKelas) ditambahkan pada Tahap 7B --
// SEMUANYA murni presentational (pengelompokan/format teks dari hasil
// kategorisasi yang SUDAH ADA), tidak mengubah rumus kategori/target apa pun.
import type { Santri, Guru, SetoranRow, NilaiUjianRow } from './types'

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

// ============================================================
// DASHBOARD ACTION BOARD (Modularisasi Tahap 7B) -- helper presentational
// murni, dipakai DashboardSection/MonitoringSection/MurojaahSection.
// ============================================================

export type KelompokSantri = 'banin' | 'banat' | 'belum_terklasifikasi'
export type KelompokGuru = 'putra' | 'putri' | 'belum_terklasifikasi'

/**
 * Kelompok Banin/Banat SANTRI dari field jenis_kelas existing (Koreksi
 * Tahap 7B). tn_a/tn_b (Ulya putri) masuk Banat -- SAMA dengan mapping
 * `filterKelompok==='tn'` di app/admin/utils.ts::cocokKelompokMonitoring dan
 * app/guru/utils.ts::filterSantriGuruPengganti. Nilai null/tidak dikenal
 * TIDAK ditebak -- masuk 'belum_terklasifikasi'.
 */
export function getKelompokSantri(jenisKelas: string | null | undefined): KelompokSantri {
  if (jenisKelas === 'banin') return 'banin'
  if (jenisKelas === 'banat' || jenisKelas === 'tn_a' || jenisKelas === 'tn_b') return 'banat'
  return 'belum_terklasifikasi'
}

/**
 * Kelompok Putra/Putri GURU dari field jenis_kelas profile guru -- BEDA
 * domain dari getKelompokSantri (jangan dicampur). Guru pakai 'tn' TANPA
 * akhiran _a/_b (bukan 'tn_a'/'tn_b' seperti santri) -- dikonfirmasi dari
 * app/guru/utils.ts::filterSantriGuruPengganti, app/api/setoran/route.ts
 * (bisaAksesJenisKelas), dan RLS
 * supabase/migrations/20260808220000_secure_santri_setoran_rls.sql
 * (current_user_can_access_jenis_kelas): guru jenis_kelas 'banin'->akses
 * santri banin, 'banat'->akses banat+tn_a+tn_b, 'tn'->akses tn_a+tn_b saja.
 * Form Tambah/Edit Guru di Admin (GuruSection.tsx) saat ini hanya punya opsi
 * 'banin'/'banat' (belum ada opsi 'tn' di UI), tapi 'tn' tetap nilai valid
 * yang mungkin ada di data. Nilai lain/null -> 'belum_terklasifikasi'
 * (TIDAK ditebak masuk Putra/Putri).
 */
export function getKelompokGuru(jenisKelas: string | null | undefined): KelompokGuru {
  if (jenisKelas === 'banin') return 'putra'
  if (jenisKelas === 'banat' || jenisKelas === 'tn') return 'putri'
  return 'belum_terklasifikasi'
}

export type GuruBelumDiinputGroup = {
  guruId: string
  guruNama: string
  kelasRingkas: string
  santriList: Santri[]
}

/**
 * Kelompokkan santri berkategori 'belum_diinput' per Guru (guru_id), untuk
 * tampilan "Belum Diinput Guru" di Dashboard. Santri tanpa guru_id/nama guru
 * dikelompokkan sebagai "Belum Ada Guru" dan ditaruh di akhir daftar.
 */
export function groupBelumDiinputByGuru(santriBelumDiinput: Santri[]): GuruBelumDiinputGroup[] {
  const map = new Map<string, GuruBelumDiinputGroup>()
  santriBelumDiinput.forEach(s => {
    const guruId = s.guru_id || '__tanpa_guru__'
    const guruNama = s.guru?.nama || 'Belum Ada Guru'
    if (!map.has(guruId)) map.set(guruId, { guruId, guruNama, kelasRingkas: '', santriList: [] })
    map.get(guruId)!.santriList.push(s)
  })
  const groups = Array.from(map.values()).map(g => ({
    ...g,
    kelasRingkas: [...new Set(g.santriList.map(s => s.kelas || '-'))].join(', '),
  }))
  return groups.sort((a, b) => {
    if (a.guruId === '__tanpa_guru__') return 1
    if (b.guruId === '__tanpa_guru__') return -1
    return a.guruNama.localeCompare(b.guruNama, 'id')
  })
}

/**
 * Susun teks siap-salin (Clipboard) daftar Belum Diinput per Guru, untuk
 * dikirim manual ke grup WA pondok oleh Kepsek. `judul` baris pertama (mis.
 * "MONITORING SETORAN BANIN") ditentukan caller supaya bisa dibedakan per
 * kelompok (Koreksi Tahap 7B). Tidak ada pengiriman otomatis -- murni format
 * string.
 */
export function buildClipboardBelumDiinput(judul: string, groups: GuruBelumDiinputGroup[], tanggalLabel: string): string {
  const baris: string[] = [judul, tanggalLabel, '', 'Belum diinput:', '']
  groups.forEach(g => {
    baris.push(`${g.guruNama} — ${g.santriList.length} santri`)
    if (g.kelasRingkas) baris.push(g.kelasRingkas)
    g.santriList.forEach(s => baris.push(`- ${s.nama}`))
    baris.push('')
  })
  baris.push('Mohon segera melengkapi input setoran hari ini.')
  return baris.join('\n')
}

export type AbsensiSesiRingkas = { hadir: number, belumAbsen: Guru[] }

/** Ringkasan absensi guru 1 sesi: jumlah hadir + daftar guru yang BELUM absen. */
export function ringkasAbsensiGuru(guruList: Guru[], guruIdHadirSesi: string[]): AbsensiSesiRingkas {
  return {
    hadir: guruIdHadirSesi.length,
    belumAbsen: guruList.filter(g => !guruIdHadirSesi.includes(g.id)),
  }
}

/**
 * Susun teks siap-salin (Clipboard) daftar Guru yang belum absen (per
 * kelompok Putra/Putri), untuk dikirim manual ke grup terkait (Koreksi
 * Tahap 7B). `labelKelompok` dipakai pada kalimat "Semua X sudah
 * melengkapi absensi." (mis. "Guru Putra").
 */
export function buildClipboardAbsensiGuru(
  judul: string,
  labelKelompok: string,
  tanggalLabel: string,
  belumAbsenSubuh: Guru[],
  belumAbsenPagi: Guru[],
): string {
  if (belumAbsenSubuh.length === 0 && belumAbsenPagi.length === 0) {
    return [judul, tanggalLabel, '', `Semua ${labelKelompok} sudah melengkapi absensi.`].join('\n')
  }
  const baris: string[] = [judul, tanggalLabel, '']
  if (belumAbsenSubuh.length > 0) {
    baris.push('Belum Absen Subuh:')
    belumAbsenSubuh.forEach(g => baris.push(`- ${g.nama}`))
    baris.push('')
  }
  if (belumAbsenPagi.length > 0) {
    baris.push('Belum Absen Pagi:')
    belumAbsenPagi.forEach(g => baris.push(`- ${g.nama}`))
    baris.push('')
  }
  baris.push('Mohon segera melengkapi absensi hari ini.')
  return baris.join('\n')
}

export type MurojaahKelasGroup = {
  kelasLabel: string
  jenjang: string
  santriList: MurojaahResult[]
  sesuaiTarget: number
  kurang: number
  belumMurojaah: number
}

/**
 * Kelompokkan hasil monitor murojaah per kelas, diurutkan dari kelas dengan
 * jumlah "kurang + belum murojaah" terbanyak (paling perlu perhatian dulu).
 */
export function groupMurojaahByKelas(hasilMonitorMurojaah: MurojaahResult[]): MurojaahKelasGroup[] {
  const map = new Map<string, MurojaahKelasGroup>()
  hasilMonitorMurojaah.forEach(s => {
    const key = s.kelas || '-'
    if (!map.has(key)) map.set(key, { kelasLabel: key, jenjang: s.jenjang || '', santriList: [], sesuaiTarget: 0, kurang: 0, belumMurojaah: 0 })
    const grup = map.get(key)!
    grup.santriList.push(s)
    if (!s.sudahMurojaah) grup.belumMurojaah++
    else if (s.persentase >= 80) grup.sesuaiTarget++
    else grup.kurang++
  })
  return Array.from(map.values()).sort((a, b) => (b.belumMurojaah + b.kurang) - (a.belumMurojaah + a.kurang))
}
