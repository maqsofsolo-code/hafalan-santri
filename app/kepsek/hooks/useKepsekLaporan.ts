'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getTanggalWIB } from '../../lib/dateWib'
import { fetchWithAuth } from '../../lib/authClient'

// Tab "Laporan Bulanan" -- dipindah dari app/kepsek/page.tsx (Modularisasi
// Tahap 7A) TANPA mengubah logic. Laporan bulanan butuh autentikasi -- PDF
// dibuka lewat Blob URL di tab baru, Excel diunduh langsung (persis kode asli).
export function useKepsekLaporan() {
  const [laporanBulan, setLaporanBulan] = useState('')
  const [laporanJenjang, setLaporanJenjang] = useState('semua')
  const [laporanKelas, setLaporanKelas] = useState('semua')
  const [laporanSantriId, setLaporanSantriId] = useState('semua')
  const [laporanLoading, setLaporanLoading] = useState('')

  useEffect(() => {
    setLaporanBulan(getTanggalWIB().slice(0, 7))
  }, [])

  const handleDownloadLaporan = async (format: 'excel' | 'pdf') => {
    setLaporanLoading(format)
    const params = new URLSearchParams({
      bulan: laporanBulan,
      jenjang: laporanJenjang,
      kelas: laporanKelas,
      santri_id: laporanSantriId,
    })
    const url = format === 'excel'
      ? `/api/laporan-bulanan-excel?${params}`
      : `/api/laporan-bulanan-pdf?${params}`

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      alert('Sesi login sudah berakhir. Silakan login kembali.')
      setLaporanLoading('')
      return
    }
    const response = await fetchWithAuth(url, session.access_token)
    if (!response.ok) {
      if (response.status === 401) alert('Sesi login tidak valid atau sudah berakhir. Silakan login kembali.')
      else if (response.status === 403) alert('Anda tidak memiliki akses untuk laporan ini.')
      else alert('Gagal menyiapkan laporan.')
      setLaporanLoading('')
      return
    }

    if (format === 'pdf') {
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      window.open(objectUrl, '_blank')
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
      setLaporanLoading('')
      return
    }

    const contentDisposition = response.headers.get('Content-Disposition')
    const filename = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1] || `laporan-bulanan-${laporanBulan}.xlsx`
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
    setTimeout(() => setLaporanLoading(''), 1000)
  }

  return {
    laporanBulan, setLaporanBulan, laporanJenjang, setLaporanJenjang,
    laporanKelas, setLaporanKelas, laporanSantriId, setLaporanSantriId,
    laporanLoading, handleDownloadLaporan,
  }
}
