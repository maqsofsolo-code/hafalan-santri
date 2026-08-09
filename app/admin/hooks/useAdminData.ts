'use client'
import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getTanggalWIB, getPeriodePekanTertutup } from '../../lib/dateWib'
import { hitungRankingTotalHafalan, hitungRankingKonsistensi, hitungRankingSemangat } from '../../lib/ranking'
import { fetchWithAuth } from '../../lib/authClient'
import type { Guru, Santri, Wali, Surah, KalenderAkademik, SetoranHariIni, SantriRanking } from '../types'

// Data inti dashboard Admin: guru/santri/wali/surah/kalender/setoran hari ini
// + 3 jenis ranking (Total Hafalan, Konsistensi, Semangat via app/lib/ranking.ts).
// Dipindah dari fetchData() di app/admin/page.tsx (Modularisasi Tahap 6A)
// TANPA mengubah logic sama sekali -- termasuk perhitungan hari aktif
// (hitungHariAktif/hitungHariAktifPekan) yang tetap jadi closure lokal di
// dalam fetchData persis seperti aslinya.
//
// Tools "Kelola Data" (download template, download semua data, import excel)
// dan bukaLaporanHTML (dipakai ulang oleh Ranking/Rapot Digital/Laporan
// Bulanan untuk membuka laporan HTML/PDF ber-autentikasi) juga dipindah ke
// sini karena sama-sama bagian dari domain "data inti + akses berkas
// ber-autentikasi", bukan domain tersendiri yang cukup besar untuk hook
// terpisah.
export function useAdminData() {
  const [guruList, setGuruList] = useState<Guru[]>([])
  const [santriList, setSantriList] = useState<Santri[]>([])
  const [waliList, setWaliList] = useState<Wali[]>([])
  const [surahList, setSurahList] = useState<Surah[]>([])
  const [setoranHariIni, setSetoranHariIni] = useState<SetoranHariIni[]>([])
  const [rankingHafalan, setRankingHafalan] = useState<SantriRanking[]>([])
  const [rankingKonsistensi, setRankingKonsistensi] = useState<SantriRanking[]>([])
  const [rankingSemangat, setRankingSemangat] = useState<SantriRanking[]>([])
  const [rankingPeriodeKonsistensi, setRankingPeriodeKonsistensi] = useState('')
  const [kalenderList, setKalenderList] = useState<KalenderAkademik[]>([])

  const fetchData = useCallback(async () => {
    const { data: guru } = await supabase.from('profiles').select('*').eq('role', 'guru').order('nama')
    const { data: santri } = await supabase.from('santri').select('*, guru:guru_id(nama), wali:wali_id(nama)').eq('status', 'aktif').order('nama')
    const { data: wali } = await supabase.from('profiles').select('*').eq('role', 'wali').order('nama')
    const { data: surah } = await supabase.from('surah').select('*').order('nomor', { ascending: false })
    const { data: kalender } = await supabase.from('kalender_akademik').select('*').order('tanggal_mulai', { ascending: true })
    const today = getTanggalWIB()
    const { data: setoran } = await supabase.from('setoran').select('*, santri:santri_id(nama)').eq('tanggal', today).order('created_at', { ascending: false })

    setGuruList(guru || [])
    setSantriList(santri || [])
    setWaliList(wali || [])
    setSurahList(surah || [])
    setKalenderList(kalender || [])
    setSetoranHariIni(setoran || [])

    // Ranking hafalan
    const sortedHafalan = hitungRankingTotalHafalan(santri || [])
    setRankingHafalan(sortedHafalan)

    // Ranking semangat tetap memakai rentang 7 hari yang berjalan
    const tujuhHariLalu = new Date()
    tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7)
    const tujuhHariLaluStr = tujuhHariLalu.toISOString().split('T')[0]
    const { data: setoran7Hari } = await supabase
      .from('setoran').select('santri_id, tanggal, jenis, penambahan_juz, status_kehadiran, status')
      .gte('tanggal', tujuhHariLaluStr).eq('status_kehadiran', 'hadir')

    // Ranking konsistensi memakai pekan Senin-Sabtu terakhir yang sudah ditutup
    const periodeKonsistensi = getPeriodePekanTertutup()
    setRankingPeriodeKonsistensi(periodeKonsistensi.labelPeriode)
    const { data: setoranPekanKonsistensi } = await supabase
      .from('setoran').select('santri_id, tanggal, jenis, penambahan_juz, status_kehadiran, status')
      .gte('tanggal', periodeKonsistensi.tanggalMulai)
      .lte('tanggal', periodeKonsistensi.tanggalSelesai)
      .eq('status_kehadiran', 'hadir')

    // Ambil semua libur akademik
    const { data: semuaLibur } = await supabase
      .from('kalender_akademik').select('*').eq('tipe', 'libur')
    const liburAkademik = semuaLibur || []

    // Hitung hari aktif (skip Jumat, Ahad, libur akademik)
    const hitungHariAktif = (mulai: string, selesai: string) => {
      const aktif: string[] = []
      const cur = new Date(mulai)
      const end = new Date(selesai)
      while (cur <= end) {
        const hari = cur.getDay()
        const tgl = cur.toISOString().split('T')[0]
        if (hari !== 0 && hari !== 5) {
          const isLibur = liburAkademik.some((l) =>
            tgl >= l.tanggal_mulai && tgl <= l.tanggal_selesai
          )
          if (!isLibur) aktif.push(tgl)
        }
        cur.setDate(cur.getDate() + 1)
      }
      return aktif
    }

    const hariAktif7Hari = hitungHariAktif(tujuhHariLaluStr, today)

    const hitungHariAktifPekan = (mulai: string, selesai: string) => {
      const aktif: string[] = []
      const cur = new Date(`${mulai}T00:00:00Z`)
      const end = new Date(`${selesai}T00:00:00Z`)
      while (cur <= end) {
        const hari = cur.getUTCDay()
        const tgl = cur.toISOString().split('T')[0]
        const isLibur = liburAkademik.some(l =>
          tgl >= l.tanggal_mulai && tgl <= l.tanggal_selesai
        )
        if (hari !== 0 && hari !== 5 && !isLibur) aktif.push(tgl)
        cur.setUTCDate(cur.getUTCDate() + 1)
      }
      return aktif
    }

    const hariAktifKonsistensi = hitungHariAktifPekan(
      periodeKonsistensi.tanggalMulai,
      periodeKonsistensi.tanggalSelesai
    )
    const hariAktifKonsistensiSet = new Set(hariAktifKonsistensi)
    const totalHariAktif = hariAktifKonsistensi.length
    // ===== RANKING KONSISTENSI =====
    const konsistensiList = hitungRankingKonsistensi(
      santri || [], setoranPekanKonsistensi || [], hariAktifKonsistensiSet, totalHariAktif
    ).map((s) => ({ ...s, periodeKonsistensi: periodeKonsistensi.labelPeriode }))
    setRankingKonsistensi(konsistensiList)

    // ===== RANKING SEMANGAT =====
    const semangatList = hitungRankingSemangat(santri || [], setoran7Hari || [], new Set(hariAktif7Hari))
    setRankingSemangat(semangatList)
  }, [])

  // ===== KELOLA DATA (dashboard) =====
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  const handleDownloadTemplate = () => { window.open('/api/download-template', '_blank') }

  const handleDownloadAllData = async (setErrorMsg: (msg: string) => void) => {
    setDownloadLoading(true)
    setErrorMsg('')
    let objectUrl: string | null = null
    let link: HTMLAnchorElement | null = null

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        setErrorMsg('Sesi login sudah berakhir. Silakan login kembali.')
        return
      }

      const response = await fetchWithAuth('/api/download-data', session.access_token)

      if (!response.ok) {
        if (response.status === 401) {
          setErrorMsg('Sesi login tidak valid atau sudah berakhir. Silakan login kembali.')
          return
        }
        if (response.status === 403) {
          setErrorMsg('Akses download seluruh data hanya tersedia untuk admin.')
          return
        }

        let message = 'Gagal menyiapkan file export.'
        try {
          const errorData = await response.json()
          if (typeof errorData?.error === 'string') message = errorData.error
        } catch {
          // Gunakan pesan fallback jika response server bukan JSON.
        }
        setErrorMsg(message)
        return
      }

      const contentDisposition = response.headers.get('Content-Disposition')
      const encodedFilename = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
      const regularFilename = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1]
      let filename = regularFilename || 'Data_Santri_Daarus_Salaf.xlsx'
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
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Gagal mengunduh seluruh data.')
    } finally {
      if (link?.isConnected) link.remove()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setDownloadLoading(false)
    }
  }

  // Laporan HTML print (rapot-pdf, laporan-peringkat-pdf, laporan-bulanan-pdf) sekarang butuh
  // autentikasi -- window.open()/<a href> polos tidak mengirim Authorization header, jadi
  // di-fetch dulu dengan Bearer token lalu hasilnya dibuka lewat Blob URL di tab baru.
  const bukaLaporanHTML = async (url: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      alert('Sesi login sudah berakhir. Silakan login kembali.')
      return
    }
    const response = await fetchWithAuth(url, session.access_token)
    if (!response.ok) {
      if (response.status === 401) { alert('Sesi login tidak valid atau sudah berakhir. Silakan login kembali.'); return }
      if (response.status === 403) { alert('Anda tidak memiliki akses untuk laporan ini.'); return }
      let message = 'Gagal menyiapkan laporan.'
      try {
        const errorData = await response.json()
        if (typeof errorData?.error === 'string') message = errorData.error
      } catch {
        // Gunakan pesan aman jika response server bukan JSON.
      }
      alert(message)
      return
    }
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    window.open(objectUrl, '_blank')
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setImportLoading(true); setImportMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      setImportMsg('Sesi login sudah berakhir. Silakan login kembali.'); setImportLoading(false); return
    }
    const formData = new FormData(); formData.append('file', file)
    const res = await fetchWithAuth('/api/import-excel', session.access_token, { method: 'POST', body: formData })
    const result = await res.json()
    setImportMsg(result.message || result.error); setImportLoading(false); fetchData()
  }

  return {
    guruList, santriList, waliList, surahList, kalenderList, setoranHariIni,
    rankingHafalan, rankingKonsistensi, rankingSemangat, rankingPeriodeKonsistensi,
    fetchData,
    downloadLoading, handleDownloadTemplate, handleDownloadAllData,
    bukaLaporanHTML,
    importLoading, importMsg, handleImportExcel,
  }
}
