'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getTanggalWIB } from '../../lib/dateWib'
import type { SetoranRow } from '../types'

// Kartu "Laporan Hari Ini" (bisa navigasi mundur/maju tanggal) -- dipindah
// dari app/wali/page.tsx (Modularisasi Tahap 8A) TANPA mengubah query/logic.
// `handleGantiTanggalLaporan` menerima `santriId` sebagai parameter (bukan
// dari selectedSantri langsung) karena selectedSantri dimiliki useWaliData,
// bukan hook ini -- pola sama seperti param eksplisit di hooks Kepsek.
export function useWaliLaporanHarian() {
  const [laporanHariIni, setLaporanHariIni] = useState<SetoranRow[]>([])
  const [tanggalLaporan, setTanggalLaporan] = useState(getTanggalWIB())

  const fetchLaporanHariIni = async (santriId: string, tgl?: string) => {
    const tanggal = tgl || getTanggalWIB()
    const { data } = await supabase
      .from('setoran').select('*').eq('santri_id', santriId).eq('tanggal', tanggal)
      .order('created_at', { ascending: true })
    setLaporanHariIni(data || [])
  }

  const handleGantiTanggalLaporan = (arah: number, santriId: string | undefined) => {
    if (!santriId) return
    const tgl = new Date(tanggalLaporan)
    tgl.setDate(tgl.getDate() + arah)
    const today = getTanggalWIB()
    const tglStr = `${tgl.getFullYear()}-${String(tgl.getMonth() + 1).padStart(2, '0')}-${String(tgl.getDate()).padStart(2, '0')}`
    // Jangan boleh maju melebihi hari ini
    if (tglStr > today) return
    setTanggalLaporan(tglStr)
    fetchLaporanHariIni(santriId, tglStr)
  }

  return { laporanHariIni, tanggalLaporan, setTanggalLaporan, fetchLaporanHariIni, handleGantiTanggalLaporan }
}
