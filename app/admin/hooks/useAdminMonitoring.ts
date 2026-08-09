'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchWithAuth } from '../../lib/authClient'
import { getTanggalWIB } from '../../lib/dateWib'
import { cocokKelompokMonitoring } from '../utils'
import type { Guru, Santri, SetoranHariIni } from '../types'

// Monitoring harian (sudah/belum setor, guru hadir/absen) + download laporan
// monitoring Rosib/Belum Diinput. Dipindah dari app/admin/page.tsx
// (Modularisasi Tahap 6A) TANPA mengubah perhitungan sama sekali.
export function useAdminMonitoring(santriList: Santri[], guruList: Guru[], setoranHariIni: SetoranHariIni[]) {
  const [monitoringDownloadTanggal, setMonitoringDownloadTanggal] = useState(getTanggalWIB())
  const [monitoringDownloadJenjang, setMonitoringDownloadJenjang] = useState('')
  const [monitoringDownloadKelas, setMonitoringDownloadKelas] = useState('')
  const [monitoringDownloadKelompok, setMonitoringDownloadKelompok] = useState('')
  const [monitoringDownloadLoading, setMonitoringDownloadLoading] = useState('')
  const [monitoringDownloadMsg, setMonitoringDownloadMsg] = useState('')

  const santriSudahSetorIds = [...new Set(setoranHariIni.filter((s) => s.status_kehadiran === 'hadir').map((s) => s.santri_id))]
  const santriSudahSetor = santriList.filter(s => santriSudahSetorIds.includes(s.id))
  const santriBelumSetor = santriList.filter(s => !santriSudahSetorIds.includes(s.id))
  const guruSudahInput = [...new Set(setoranHariIni.map(s => s.guru_id))]
  const guruBelumInput = guruList.filter(g => !guruSudahInput.includes(g.id))

  const monitoringKelasOptions = monitoringDownloadJenjang
    ? [...new Set(santriList
      .filter(santri => santri.jenjang === monitoringDownloadJenjang)
      .map(santri => Number(santri.kelas_num))
      .filter(kelas => Number.isInteger(kelas) && kelas > 0)
    )].sort((a, b) => a - b)
    : []
  const monitoringKelompokOptions = [
    { value: 'banin', label: 'Banin' },
    { value: 'banat', label: 'Banat' },
    { value: 'tn', label: 'TN' },
  ].filter(option => santriList.some(santri =>
    santri.jenjang === monitoringDownloadJenjang
    && Number(santri.kelas_num) === Number(monitoringDownloadKelas)
    && cocokKelompokMonitoring(santri, option.value)
  ))
  const monitoringDownloadFilterLengkap = Boolean(
    monitoringDownloadTanggal && monitoringDownloadJenjang && monitoringDownloadKelas && monitoringDownloadKelompok
  )

  const handleDownloadMonitoring = async (jenisLaporan: 'rosib' | 'belum-diinput') => {
    if (!monitoringDownloadTanggal || !monitoringDownloadJenjang || !monitoringDownloadKelas || !monitoringDownloadKelompok) {
      setMonitoringDownloadMsg('Lengkapi tanggal, jenjang, kelas, dan kelompok terlebih dahulu.')
      return
    }

    setMonitoringDownloadLoading(jenisLaporan)
    setMonitoringDownloadMsg('')
    let objectUrl: string | null = null
    let link: HTMLAnchorElement | null = null

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        setMonitoringDownloadMsg('Sesi login sudah berakhir. Silakan login kembali.')
        return
      }

      const params = new URLSearchParams({
        jenis: jenisLaporan,
        tanggal: monitoringDownloadTanggal,
        jenjang: monitoringDownloadJenjang,
        kelas: monitoringDownloadKelas,
        kelompok: monitoringDownloadKelompok,
      })
      const response = await fetchWithAuth(`/api/monitoring-setoran-excel?${params}`, session.access_token)

      if (!response.ok) {
        if (response.status === 401) {
          setMonitoringDownloadMsg('Sesi login tidak valid atau sudah berakhir. Silakan login kembali.')
          return
        }
        if (response.status === 403) {
          setMonitoringDownloadMsg('Akses laporan monitoring hanya tersedia untuk admin.')
          return
        }

        let message = 'Gagal menyiapkan laporan monitoring.'
        try {
          const errorData = await response.json()
          if (typeof errorData?.error === 'string') message = errorData.error
        } catch {
          // Gunakan pesan aman jika response server bukan JSON.
        }
        setMonitoringDownloadMsg(message)
        return
      }

      const contentDisposition = response.headers.get('Content-Disposition')
      const encodedFilename = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
      const regularFilename = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1]
      let filename = regularFilename || `monitoring-${jenisLaporan}-${monitoringDownloadTanggal}.xlsx`
      if (encodedFilename) {
        try { filename = decodeURIComponent(encodedFilename) } catch { filename = encodedFilename }
      }

      const blob = await response.blob()
      objectUrl = URL.createObjectURL(blob)
      link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      setMonitoringDownloadMsg('Laporan berhasil diunduh.')
    } catch (error: unknown) {
      setMonitoringDownloadMsg(error instanceof Error ? error.message : 'Gagal mengunduh laporan monitoring.')
    } finally {
      if (link?.isConnected) link.remove()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setMonitoringDownloadLoading('')
    }
  }

  return {
    monitoringDownloadTanggal, setMonitoringDownloadTanggal,
    monitoringDownloadJenjang, setMonitoringDownloadJenjang,
    monitoringDownloadKelas, setMonitoringDownloadKelas,
    monitoringDownloadKelompok, setMonitoringDownloadKelompok,
    monitoringDownloadLoading, monitoringDownloadMsg, setMonitoringDownloadMsg,
    santriSudahSetor, santriBelumSetor, guruSudahInput, guruBelumInput,
    monitoringKelasOptions, monitoringKelompokOptions, monitoringDownloadFilterLengkap,
    handleDownloadMonitoring,
  }
}
