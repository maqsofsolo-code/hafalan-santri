'use client'
import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getTanggalWIB } from '../../lib/dateWib'
import { hitungMonitorMurojaah, getKelompokSantri } from '../utils'
import type { Santri, SetoranRow } from '../types'

// Tab "Monitor Murojaah" -- dipindah dari app/kepsek/page.tsx (Modularisasi
// Tahap 7A) TANPA mengubah logic. `setoranMurojaahTanggal` dan setternya
// diterima dari useKepsekData (bukan dimiliki hook ini) karena nilai
// awalnya diisi bersamaan dengan fetch hari-ini di sana.
export function useKepsekMurojaah(
  santriList: Santri[],
  setoranMurojaahTanggal: SetoranRow[],
  setSetoranMurojaahTanggal: (v: SetoranRow[]) => void,
) {
  const [searchMurojaah, setSearchMurojaah] = useState('')
  const [filterMurojaahJenjang, setFilterMurojaahJenjang] = useState('semua')
  const [filterMurojaahKelas, setFilterMurojaahKelas] = useState('semua')
  const [murojaahTanggal, setMurojaahTanggal] = useState(getTanggalWIB())
  const [loadingMurojaah, setLoadingMurojaah] = useState(false)
  // Semua | Banin | Banat -- Koreksi Tahap 7B, diterapkan SETELAH rumus
  // target/persentase/status dihitung (hitungMonitorMurojaah), sebelum
  // dikelompokkan per kelas. Rumus murojaah itu sendiri tidak disentuh.
  const [filterKelompokSantri, setFilterKelompokSantri] = useState<'semua' | 'banin' | 'banat'>('semua')

  const fetchMurojaahTanggal = useCallback(async (tgl: string) => {
    setLoadingMurojaah(true)
    const { data } = await supabase
      .from('setoran')
      .select('*, santri:santri_id(nama, total_hafalan_juz, kelas, kelas_num, jenjang, guru:guru_id(nama))')
      .eq('tanggal', tgl).eq('jenis', 'lama').eq('status_kehadiran', 'hadir')
    setSetoranMurojaahTanggal(data || [])
    setLoadingMurojaah(false)
  }, [setSetoranMurojaahTanggal])

  const handleUbahTanggalMurojaah = (tgl: string) => {
    setMurojaahTanggal(tgl)
    fetchMurojaahTanggal(tgl)
  }

  const hasilMonitorMurojaahDasar = hitungMonitorMurojaah(santriList, setoranMurojaahTanggal, {
    filterMurojaahJenjang, filterMurojaahKelas, searchMurojaah,
  })
  const hasilMonitorMurojaah = filterKelompokSantri === 'semua'
    ? hasilMonitorMurojaahDasar
    : hasilMonitorMurojaahDasar.filter(s => getKelompokSantri(s.jenis_kelas) === filterKelompokSantri)

  return {
    searchMurojaah, setSearchMurojaah, filterMurojaahJenjang, setFilterMurojaahJenjang,
    filterMurojaahKelas, setFilterMurojaahKelas, murojaahTanggal, loadingMurojaah,
    filterKelompokSantri, setFilterKelompokSantri,
    handleUbahTanggalMurojaah, hasilMonitorMurojaah,
  }
}
