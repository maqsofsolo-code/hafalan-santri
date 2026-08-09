'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getTanggalWIB } from '../../lib/dateWib'
import { requireProfile } from '../../lib/authClient'
import type { WaliProfile, Santri } from '../types'

// Profile Wali + daftar anak (santri) + anak yang sedang dipilih -- dipindah
// dari app/wali/page.tsx (Modularisasi Tahap 8A) TANPA mengubah query/logic.
//
// Hook ini butuh fetchRiwayat/fetchLaporanHariIni/fetchDataKelas dari
// useWaliRiwayat/useWaliLaporanHarian/useWaliRanking (dipanggil dari
// fetchWaliData & handlePilihSantri persis seperti kode asli) -- diterima
// lewat parameter, bukan dipindah ke sini, karena riwayat/laporan/ranking
// masing-masing domain terpisah (pola sama seperti useKepsekData/
// useAdminData menerima dependency lewat parameter).
export function useWaliData(
  fetchRiwayat: (santriId: string) => Promise<void>,
  setTanggalLaporan: (v: string) => void,
  fetchLaporanHariIni: (santriId: string, tgl?: string) => Promise<void>,
  fetchDataKelas: (santri: Santri) => Promise<void>,
) {
  const [waliProfile, setWaliProfile] = useState<WaliProfile | null>(null)
  const [santriList, setSantriList] = useState<Santri[]>([])
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchWaliData() }, [])

  const fetchWaliData = async () => {
    const profile = await requireProfile('wali')
    if (!profile) return
    setWaliProfile(profile)

    const { data: santri } = await supabase
      .from('santri').select('*, guru:guru_id(nama)').eq('wali_id', profile.id)
    setSantriList(santri || [])

    if (santri && santri.length > 0) {
      const s = santri[0]
      setSelectedSantri(s)
      fetchRiwayat(s.id)
      fetchLaporanHariIni(s.id)
      if (s.kelas_num && s.jenjang) {
        await fetchDataKelas(s)
      }
    }
    setLoading(false)
  }

  const handlePilihSantri = async (santri: Santri) => {
    setSelectedSantri(santri)
    const today = getTanggalWIB()
    setTanggalLaporan(today)
    fetchRiwayat(santri.id)
    fetchLaporanHariIni(santri.id, today)
    await fetchDataKelas(santri)
  }

  return { waliProfile, santriList, selectedSantri, loading, handlePilihSantri }
}
