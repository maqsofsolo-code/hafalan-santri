'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchWithAuth } from '../../lib/authClient'

// Laporan Bulanan (rekap setoran per santri, download Excel/PDF). Dipindah
// dari app/admin/page.tsx (Modularisasi Tahap 6A) TANPA mengubah endpoint
// atau isi laporan sama sekali. `bukaLaporanHTML` (dari useAdminData) dipakai
// untuk membuka versi PDF-nya, persis seperti sebelumnya.
export function useAdminLaporan(bukaLaporanHTML: (url: string) => Promise<void>) {
  const [laporanBulan, setLaporanBulan] = useState('')

  useEffect(() => {
    setLaporanBulan(new Date().toISOString().slice(0, 7))
  }, [])

  const [laporanJenjang, setLaporanJenjang] = useState('semua')
  const [laporanKelas, setLaporanKelas] = useState('semua')
  const [laporanSantriId, setLaporanSantriId] = useState('semua')
  const [laporanLoading, setLaporanLoading] = useState('')

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

    if (format === 'pdf') {
      await bukaLaporanHTML(url)
      setLaporanLoading('')
      return
    }

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
