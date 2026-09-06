'use client'
import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchWithAuth } from '../../lib/authClient'
import type { PeriodeAkademik, WaliKelasAssignmentItem, SantriRapotItem, NilaiRapotForm, RapotNilaiApiRow, RapotRekapRow } from '../types'
import {
  ALL_POSSIBLE_MAPEL_KEYS,
  getActiveSubjects,
  isRapotConfigAvailable,
  type JenjangKey,
} from '../../lib/rapotDigital'

export function useRapotDigital() {
  const [periodeAktif, setPeriodeAktif] = useState<PeriodeAkademik | null>(null)
  const [assignments, setAssignments] = useState<WaliKelasAssignmentItem[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<WaliKelasAssignmentItem | null>(null)
  const [santriList, setSantriList] = useState<SantriRapotItem[]>([])
  const [santriListLoading, setSantriListLoading] = useState(false)
  const [selectedSantri, setSelectedSantri] = useState<SantriRapotItem | null>(null)
  const [searchSantri, setSearchSantri] = useState('')
  const [nilaiRapot, setNilaiRapot] = useState<NilaiRapotForm>({})
  const [existingRapotId, setExistingRapotId] = useState<string | null>(null)
  const [rapotLoading, setRapotLoading] = useState(false)
  const [rapotMsg, setRapotMsg] = useState('')
  const [contextError, setContextError] = useState<string | null>(null)
  const [contextLoading, setContextLoading] = useState(false)

  const [rapotActiveTab, setRapotActiveTab] = useState<'input' | 'rekap'>('input')
  const [rapotRekapData, setRapotRekapData] = useState<RapotRekapRow[]>([])
  const [rapotRekapLoading, setRapotRekapLoading] = useState(false)
  const [rapotRekapKelas, setRapotRekapKelas] = useState('')

  // 1. Muat konteks Rapot Digital (periode aktif & penugasan wali kelas user)
  const fetchPeriodeAktif = useCallback(async () => {
    setContextLoading(true)
    setContextError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setContextError('Sesi tidak ditemukan. Silakan login kembali.')
        setContextLoading(false)
        return
      }

      const res = await fetchWithAuth('/api/rapot-digital/context', session.access_token)
      const result = await res.json()

      if (!res.ok) {
        setContextError(result.error || 'Gagal memuat konteks rapot')
        setPeriodeAktif(null)
        setAssignments([])
        setSelectedAssignment(null)
        setSantriList([])
        setContextLoading(false)
        return
      }

      const p: PeriodeAkademik = result.periode
      const assignList: WaliKelasAssignmentItem[] = result.assignments || []

      setPeriodeAktif(p)
      setAssignments(assignList)

      // Jika input dibuka dan hanya memegang 1 kelas, langsung pilih kelas tersebut
      if (assignList.length === 1) {
        setSelectedAssignment(assignList[0])
        if (p.rapot_input_dibuka) {
          fetchSantriListForAssignment(assignList[0], p.id, session.access_token)
        }
      } else {
        setSelectedAssignment(null)
        setSantriList([])
      }
    } catch (err: any) {
      setContextError(err.message || 'Terjadi kesalahan sistem saat memuat konteks rapot')
    } finally {
      setContextLoading(false)
    }
  }, [])

  // 2. Muat daftar seluruh santri aktif pada kelas yang dipilih
  const fetchSantriListForAssignment = async (
    assignment: WaliKelasAssignmentItem,
    periodeId: string,
    token?: string
  ) => {
    setSantriListLoading(true)
    setSelectedSantri(null)
    setSearchSantri('')
    setNilaiRapot({})
    setExistingRapotId(null)
    setRapotMsg('')

    try {
      let accessToken = token
      if (!accessToken) {
        const { data: { session } } = await supabase.auth.getSession()
        accessToken = session?.access_token
      }
      if (!accessToken) return

      const url = `/api/rapot-digital/santri-list?periode_id=${encodeURIComponent(periodeId)}&kelas_num=${assignment.kelas_num}&jenis_kelas=${encodeURIComponent(assignment.jenis_kelas)}&jenjang=${encodeURIComponent(assignment.jenjang)}`
      const res = await fetchWithAuth(url, accessToken)
      const data = await res.json()

      if (res.ok) {
        setSantriList(data.santriList || [])
      } else {
        setRapotMsg('Gagal memuat daftar santri: ' + (data.error || 'Terjadi kesalahan'))
      }
    } catch (err: any) {
      setRapotMsg('Gagal memuat daftar santri: ' + err.message)
    } finally {
      setSantriListLoading(false)
    }
  }

  // Pilih kelas / assignment
  const handleSelectAssignment = (assign: WaliKelasAssignmentItem) => {
    setSelectedAssignment(assign)
    if (periodeAktif && periodeAktif.rapot_input_dibuka) {
      fetchSantriListForAssignment(assign, periodeAktif.id)
    }
  }

  // Pilih santri dari daftar untuk input/edit nilai
  const handleSelectSantri = (s: SantriRapotItem) => {
    setSelectedSantri(s)
    setSearchSantri(s.nama)
    setRapotMsg('')

    // Absensi & Hifzh otomatis
    const autoSakit = s.nilai?.hadir_sakit ?? (s as any).absensi_otomatis?.hadir_sakit ?? 0
    const autoIzin = s.nilai?.hadir_izin ?? (s as any).absensi_otomatis?.hadir_izin ?? 0
    const autoAlpha = s.nilai?.hadir_alpha ?? (s as any).absensi_otomatis?.hadir_alpha ?? 0

    const activeSubs = getActiveSubjects(s.jenjang as JenjangKey, s.kelas_num)
    const activeKeys = activeSubs.map(sub => sub.id)

    if (s.nilai) {
      setExistingRapotId(s.nilai.id)
      const formVal: NilaiRapotForm = {
        akhlak_kepribadian: s.nilai.akhlak_kepribadian || 'B',
        kebersihan: s.nilai.kebersihan || 'B',
        ketertiban: s.nilai.ketertiban || 'B',
        ekskul_renang: s.nilai.ekskul_renang ?? '',
        ekskul_beladiri: s.nilai.ekskul_beladiri || '',
        hadir_sakit: autoSakit,
        hadir_izin: autoIzin,
        hadir_alpha: autoAlpha,
        catatan: s.nilai.catatan || '',
      }
      for (const k of ALL_POSSIBLE_MAPEL_KEYS) {
        if (activeKeys.includes(k)) {
          formVal[k] = s.nilai[k] ?? ''
        }
      }
      setNilaiRapot(formVal)
    } else {
      setExistingRapotId(null)
      const formVal: NilaiRapotForm = {
        akhlak_kepribadian: 'B',
        kebersihan: 'B',
        ketertiban: 'B',
        ekskul_renang: '',
        ekskul_beladiri: '',
        hadir_sakit: autoSakit,
        hadir_izin: autoIzin,
        hadir_alpha: autoAlpha,
        catatan: '',
      }
      for (const k of activeKeys) {
        formVal[k] = ''
      }
      setNilaiRapot(formVal)
    }
  }

  const handleBatalSantri = () => {
    setSelectedSantri(null)
    setSearchSantri('')
    setNilaiRapot({})
    setExistingRapotId(null)
    setRapotMsg('')
  }

  // Simpan nilai melalui Route Handler server
  const handleSimpanRapot = async () => {
    if (!selectedSantri || !periodeAktif || !selectedAssignment) return
    if (!periodeAktif.rapot_input_dibuka) {
      setRapotMsg('Gagal: Input nilai rapot sedang ditutup oleh Admin.')
      return
    }
    if (!isRapotConfigAvailable(selectedAssignment.jenjang, selectedAssignment.kelas_num)) {
      setRapotMsg('Daftar mata pelajaran jenjang ini belum dikonfigurasi.')
      return
    }

    setRapotLoading(true)
    setRapotMsg('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setRapotMsg('Sesi tidak ditemukan. Silakan login kembali.')
        setRapotLoading(false)
        return
      }

      const payload = {
        santri_id: selectedSantri.id,
        periode_id: periodeAktif.id,
        nilai: nilaiRapot,
      }

      const res = await fetchWithAuth('/api/rapot-digital/nilai', session.access_token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const resData = await res.json()

      if (!res.ok) {
        setRapotMsg('Gagal: ' + (resData.error || 'Terjadi kesalahan saat menyimpan nilai'))
        setRapotLoading(false)
        return
      }

      setRapotMsg('✓ Nilai rapot berhasil disimpan!')
      setExistingRapotId(resData.nilai?.id || null)

      // Refresh data santri agar badge langsung berubah menjadi "Sudah Input"
      await fetchSantriListForAssignment(selectedAssignment, periodeAktif.id, session.access_token)
    } catch (err: any) {
      setRapotMsg('Gagal: ' + err.message)
    } finally {
      setRapotLoading(false)
    }
  }

  // Rekap kelas (hanya kelas penugasan guru)
  const fetchRekapKelasByGuru = async (kelas: string) => {
    if (!periodeAktif || !kelas) return
    setRapotRekapLoading(true)
    setRapotRekapData([])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setRapotRekapLoading(false)
        return
      }

      const resRekap = await fetchWithAuth(
        `/api/guru/rapot-digital-rekap-kelas?periode_id=${encodeURIComponent(periodeAktif.id)}&kelas_num=${parseInt(kelas, 10)}`,
        session.access_token
      )

      if (resRekap.ok) {
        const hasilRekap = await resRekap.json().catch(() => null)
        const nilaiList: RapotNilaiApiRow[] = hasilRekap?.nilaiList || []

        // Gunakan shared helper hitungRankingRapotKelas (competition ranking 1, 2, 2, 4 + cap 50-95)
        const santriItems = nilaiList.map(n => ({
          id: n.id,
          nama: n.santri?.nama || '-',
        }))
        const nilaiMap = new Map(nilaiList.map(n => [n.id, n]))
        const assign = assignments.find(a => a.kelas_num.toString() === kelas)
        const targetJenjang = assign?.jenjang || (Number(kelas) <= 6 ? 'ula' : Number(kelas) <= 9 ? 'wustha' : 'ulya')
        const rankingRes = (await import('../../lib/rapotDigital')).hitungRankingRapotKelas(
          santriItems,
          nilaiMap,
          targetJenjang as JenjangKey,
          Number(kelas)
        )

        const withPeringkat: RapotRekapRow[] = rankingRes.hasilList.map(item => {
          const original = nilaiMap.get(item.id)!
          return {
            ...original,
            rata_diiniyyah: item.rataDiniyyah,
            rata_umum: item.rataUmum,
            rata_akhir: item.rataAkhir,
            peringkat: item.peringkat,
            lengkap: item.lengkap,
          }
        })
        setRapotRekapData(withPeringkat)
      } else {
        const err = await resRekap.json().catch(() => ({}))
        alert(err.error || 'Gagal memuat rekap kelas')
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setRapotRekapLoading(false)
    }
  }

  // Download Excel Rapot Satu Kelas
  const [downloadExcelLoading, setDownloadExcelLoading] = useState(false)
  const downloadExcelKelas = async (assignment: WaliKelasAssignmentItem) => {
    if (!periodeAktif) return
    setDownloadExcelLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('Sesi login tidak ditemukan. Silakan login kembali.')
        return
      }

      const url = `/api/rapot-digital/kelas-excel?periode_id=${encodeURIComponent(periodeAktif.id)}&kelas_num=${assignment.kelas_num}&jenis_kelas=${encodeURIComponent(assignment.jenis_kelas)}&jenjang=${encodeURIComponent(assignment.jenjang)}`
      const res = await fetchWithAuth(url, session.access_token)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        alert('Gagal mengunduh Excel: ' + (errData.error || 'Terjadi kesalahan'))
        return
      }

      const blob = await res.blob()
      const disposition = res.headers.get('content-disposition')
      let filename = `Rapot-Kelas-${assignment.kelas_num}.xlsx`
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) filename = match[1]
      }

      const objectUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch (err: any) {
      alert('Gagal mengunduh Excel: ' + err.message)
    } finally {
      setDownloadExcelLoading(false)
    }
  }

  return {
    periodeAktif,
    assignments,
    selectedAssignment,
    santriList,
    santriListLoading,
    selectedSantri,
    searchSantri,
    setSearchSantri,
    nilaiRapot,
    setNilaiRapot,
    existingRapotId,
    rapotLoading,
    rapotMsg,
    contextError,
    contextLoading,
    rapotActiveTab,
    setRapotActiveTab,
    rapotRekapData,
    rapotRekapLoading,
    rapotRekapKelas,
    downloadExcelLoading,
    downloadExcelKelas,
    fetchPeriodeAktif,
    handleSelectAssignment,
    handleSelectSantri,
    handleBatalSantri,
    handleSimpanRapot,
    handleGantiKelasRekap: (kelas: string) => { setRapotRekapKelas(kelas); setRapotRekapData([]) },
    fetchRekapKelasByGuru,
  }
}
