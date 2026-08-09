// Fungsi murni (tanpa state/fetch) yang dipakai halaman Wali -- dipisah dari
// app/wali/page.tsx pada Modularisasi Tahap 8A. Logic TIDAK diubah dari
// implementasi lama, hanya dipindah (pola sama seperti app/kepsek/utils.ts).
import { hitungRankingTotalHafalan } from '../lib/ranking'
import type { SetoranRow, SantriKelasRanking } from './types'

export function getStatusKehadiranInfo(status: string): { label: string, color: string } {
  if (status === 'sakit') return { label: 'Tidak Hadir — Sakit', color: 'bg-yellow-100 text-yellow-700' }
  if (status === 'izin') return { label: 'Tidak Hadir — Izin', color: 'bg-blue-100 text-blue-700' }
  if (status === 'alpha') return { label: 'Tidak Hadir — Alpha', color: 'bg-red-100 text-red-700' }
  if (status === 'hadir_tidak_setor') return { label: 'Hadir, Tidak Setor', color: 'bg-orange-100 text-orange-700' }
  return { label: status, color: 'bg-gray-100 text-gray-700' }
}

export type LaporanHariIniRingkasan = {
  adaEntry: boolean
  adaHadir: boolean
  adaHadirTidakSetor: boolean
  entryTidakHadir: SetoranRow | undefined
  hafalanBaruHariIni: SetoranRow | undefined
  murojaahHariIni: SetoranRow | undefined
  catatanHariIni: string[]
  statusBadge: { label: string, color: string }
  pesanOtomatis: string
  pesanWarna: string
}

/**
 * Ringkas entri setoran hari (tanggal) yang dipilih di kartu "Laporan Hari
 * Ini" -- status badge + pesan otomatis untuk Wali. Dipindah verbatim dari
 * app/wali/page.tsx, murni fungsi dari entriesHariIni + isLiburHariIni.
 */
export function ringkasLaporanHariIni(entriesHariIni: SetoranRow[], isLiburHariIni: boolean): LaporanHariIniRingkasan {
  const adaEntry = entriesHariIni.length > 0
  const adaHadir = entriesHariIni.some(e => e.status_kehadiran === 'hadir')
  const adaHadirTidakSetor = entriesHariIni.some(e => e.status_kehadiran === 'hadir_tidak_setor')
  const entryTidakHadir = entriesHariIni.find(e => ['sakit', 'izin', 'alpha'].includes(e.status_kehadiran || ''))
  const hafalanBaruHariIni = entriesHariIni.find(e => e.jenis === 'baru' && e.status_kehadiran === 'hadir')
  const murojaahHariIni = entriesHariIni.find(e => e.jenis === 'lama' && e.status_kehadiran === 'hadir')
  const catatanHariIni = entriesHariIni.filter(e => e.catatan && e.catatan.trim() !== '').map(e => e.catatan as string)

  let statusBadge = { label: 'Belum Diinput', color: 'bg-gray-100 text-gray-600' }
  if (!adaEntry) {
    statusBadge = { label: isLiburHariIni ? 'Libur' : 'Belum Diinput', color: 'bg-gray-100 text-gray-600' }
  } else if (adaHadir) {
    statusBadge = { label: 'Hadir', color: 'bg-green-100 text-green-700' }
  } else if (adaHadirTidakSetor) {
    statusBadge = { label: 'Hadir, Tidak Setor', color: 'bg-orange-100 text-orange-700' }
  } else if (entryTidakHadir) {
    const a = entryTidakHadir.status_kehadiran
    statusBadge = {
      label: a === 'sakit' ? 'Sakit' : a === 'izin' ? 'Izin' : 'Tidak Hadir (Alpha)',
      color: a === 'sakit' ? 'bg-yellow-100 text-yellow-700' : a === 'izin' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
    }
  }

  let pesanOtomatis = ''
  let pesanWarna = 'bg-blue-50 text-blue-700 border-blue-200'
  if (isLiburHariIni && !adaEntry) {
    pesanOtomatis = 'Hari ini libur, tidak ada kegiatan setoran.'
    pesanWarna = 'bg-gray-50 text-gray-600 border-gray-200'
  } else if (!adaEntry) {
    pesanOtomatis = 'Belum ada laporan untuk hari ini. Data akan muncul setelah ustadz/ustadzah menyelesaikan input setoran.'
    pesanWarna = 'bg-gray-50 text-gray-600 border-gray-200'
  } else if (entryTidakHadir && !adaHadir && !adaHadirTidakSetor) {
    const alasan = entryTidakHadir.status_kehadiran
    if (alasan === 'sakit') { pesanOtomatis = 'Ananda tercatat sakit hari ini. Semoga Allah segera memberikan kesembuhan. Mohon istirahat yang cukup.'; pesanWarna = 'bg-yellow-50 text-yellow-700 border-yellow-200' }
    else if (alasan === 'izin') { pesanOtomatis = 'Ananda tercatat izin hari ini sehingga tidak mengikuti setoran.'; pesanWarna = 'bg-blue-50 text-blue-700 border-blue-200' }
    else { pesanOtomatis = 'Ananda tercatat tidak hadir (alpha) hari ini tanpa keterangan. Mohon perhatian dan tindak lanjut dari Bapak/Ibu.'; pesanWarna = 'bg-red-50 text-red-700 border-red-200' }
  } else if (adaHadirTidakSetor && !adaHadir) {
    pesanOtomatis = 'Ananda hadir hari ini namun belum menyetorkan hafalan. Mohon dukungan Bapak/Ibu untuk memotivasi ananda agar lebih semangat menyetorkan hafalannya.'
    pesanWarna = 'bg-orange-50 text-orange-700 border-orange-200'
  } else if (adaHadir) {
    const adaRosib = entriesHariIni.some(e => e.status_kehadiran === 'hadir' && e.status === 'rosib')
    const adaNajih = entriesHariIni.some(e => e.status_kehadiran === 'hadir' && e.status === 'lancar')
    if (adaRosib && adaNajih) { pesanOtomatis = 'Alhamdulillah ananda telah menyetorkan hafalan hari ini. Sebagian sudah lancar, sebagian masih perlu diperbaiki. Mohon dukungan muroja\'ah di rumah.'; pesanWarna = 'bg-blue-50 text-blue-700 border-blue-200' }
    else if (adaRosib) { pesanOtomatis = 'Ananda telah berusaha menyetorkan hafalan hari ini, namun masih perlu perbaikan (rosib). Mohon bantu ananda muroja\'ah di rumah.'; pesanWarna = 'bg-yellow-50 text-yellow-700 border-yellow-200' }
    else { pesanOtomatis = 'Alhamdulillah, ananda menyetorkan hafalan dengan lancar hari ini. Semoga Allah memudahkan hafalannya. Mohon tetap dijaga dengan muroja\'ah di rumah.'; pesanWarna = 'bg-green-50 text-green-700 border-green-200' }
  }

  return { adaEntry, adaHadir, adaHadirTidakSetor, entryTidakHadir, hafalanBaruHariIni, murojaahHariIni, catatanHariIni, statusBadge, pesanOtomatis, pesanWarna }
}

/** Peringkat Total Hafalan santri dalam allSantriKelas -- WAJIB pakai hitungRankingTotalHafalan (app/lib/ranking.ts), tidak duplikasi formula. */
export function hitungPeringkatHafalan(allSantriKelas: SantriKelasRanking[], santriId: string): { peringkat: number, total: number } | null {
  if (allSantriKelas.length === 0) return null
  const sorted = hitungRankingTotalHafalan(allSantriKelas)
  const peringkat = sorted.findIndex(s => s.id === santriId) + 1
  return { peringkat, total: allSantriKelas.length }
}
