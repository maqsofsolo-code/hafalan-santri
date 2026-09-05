'use client'
import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { NilaiRapotForm, PeriodeRapot, RapotNilaiApiRow, RapotRekapRow, Santri } from '../types'

// Rapot Digital versi Admin: CRUD Periode, Input Nilai (semua santri
// termasuk alumni, dengan "kelas saat periode" / kelas_snapshot), Rekap
// Kelas (kelas_snapshot dulu, fallback ke kelas santri sekarang -- BEDA dari
// Guru yang tidak butuh fallback ini karena Guru hanya melihat santri
// aktif), dan Download (per kelas / per santri / lengkap, lewat bukaLaporanHTML
// di useAdminData). Dipindah dari app/admin/page.tsx (Modularisasi Tahap
// 6A) TANPA mengubah business logic sama sekali -- Rapot Digital belum
// final, sengaja tidak diperbaiki/diredesain, hanya dipindah lokasinya.
//
// `rapotLoading` (state lama, dideklarasikan tapi tidak pernah dipakai di
// mana pun pada page.tsx asli -- diverifikasi lewat grep) dihapus di sini,
// sama seperti dead variable `today` yang dihapus pada Modularisasi Tahap
// 5A (Guru).
//
// loading/errorMsg/successMsg untuk form Periode TETAP dipegang bersama oleh
// useAdminEntityForm (state form bersama Guru/Wali/Santri/Kalender/Periode
// di halaman asli) -- diterima di sini lewat parameter, bukan dipegang
// sendiri, supaya perilaku "satu status pesan untuk semua form" tidak berubah.
// Field form Periode sendiri (formPeriodeNama dst) TIDAK dibagi dengan
// Guru/Wali/Santri/Kalender di kode asli (nama field berbeda), jadi dipegang
// langsung oleh hook ini, bukan oleh useAdminEntityForm.
import { fetchWithAuth } from '../../lib/authClient'

export function useAdminRapot(params: {
  setLoading: (v: boolean) => void
  setErrorMsg: (msg: string) => void
  setSuccessMsg: (msg: string) => void
}) {
  const { setLoading, setErrorMsg, setSuccessMsg } = params

  const [periodeList, setPeriodeList] = useState<PeriodeRapot[]>([])
  const [periodeAktif, setPeriodeAktif] = useState<PeriodeRapot | null>(null)
  const [periodeLoading, setPeriodeLoading] = useState(false)
  const [periodeError, setPeriodeError] = useState<string | null>(null)

  const [showFormPeriode, setShowFormPeriode] = useState(false)
  const [editPeriodeId, setEditPeriodeId] = useState<string | null>(null)
  const [formPeriodeNama, setFormPeriodeNama] = useState('')
  const [formPeriodeTahunAjaran, setFormPeriodeTahunAjaran] = useState('')
  const [formPeriodeSemester, setFormPeriodeSemester] = useState('genap')
  const [formPeriodeTanggal, setFormPeriodeTanggal] = useState('')
  const [formPeriodeAktif, setFormPeriodeAktif] = useState(false)
  const [rapotJenjang, setRapotJenjang] = useState('ula')
  const [rapotKelas, setRapotKelas] = useState('')
  const [rapotPeriodeId, setRapotPeriodeId] = useState('')
  const [rapotInputPeriodeId, setRapotInputPeriodeId] = useState('')
  const [rapotInputSantriList, setRapotInputSantriList] = useState<Santri[]>([])
  const [rapotInputSantri, setRapotInputSantri] = useState<Santri | null>(null)
  const [rapotInputSearch, setRapotInputSearch] = useState('')
  const [rapotNilai, setRapotNilai] = useState<NilaiRapotForm>({})
  const [rapotInputLoading, setRapotInputLoading] = useState(false)
  const [rapotInputMsg, setRapotInputMsg] = useState('')
  const [rapotExistingId, setRapotExistingId] = useState<string | null>(null)
  const [rapotKelasSnapshot, setRapotKelasSnapshot] = useState('')
  const [rapotJenjangSnapshot, setRapotJenjangSnapshot] = useState('ula')
  const [rapotActiveTab, setRapotActiveTab] = useState('periode')
  const [rapotDownloadSearch, setRapotDownloadSearch] = useState('')
  const [rapotDownloadSantri, setRapotDownloadSantri] = useState<Santri | null>(null)
  const [rapotDownloadKelas, setRapotDownloadKelas] = useState('')
  const [rapotDownloadJenjang, setRapotDownloadJenjang] = useState('ula')
  const [rapotRekapPeriodeId, setRapotRekapPeriodeId] = useState('')
  const [rapotRekapJenjang, setRapotRekapJenjang] = useState('ula')
  const [rapotRekapKelas, setRapotRekapKelas] = useState('')
  const [rapotRekapData, setRapotRekapData] = useState<RapotRekapRow[]>([])
  const [rapotRekapLoading, setRapotRekapLoading] = useState(false)

  const fetchPeriode = useCallback(async () => {
    setPeriodeLoading(true)
    setPeriodeError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setPeriodeError('Sesi login tidak valid. Silakan login kembali.')
        setPeriodeLoading(false)
        return
      }

      // 1. Ambil context resmi via secure /api/rapot-digital/context (fail-closed, 1-active-period rule)
      const contextRes = await fetchWithAuth('/api/rapot-digital/context', session.access_token)
      const contextData = await contextRes.json()

      if (!contextRes.ok) {
        setPeriodeError(contextData.error || 'Gagal memuat periode akademik aktif')
        setPeriodeAktif(null)
      } else if (contextData.periode) {
        const p = contextData.periode
        const activeMapped: PeriodeRapot = {
          ...p,
          id: p.id,
          nama: `${p.tahun_ajaran} Semester ${p.semester === 1 ? '1 (Ganjil)' : '2 (Genap)'}`,
          tahun_ajaran: p.tahun_ajaran,
          semester: p.semester,
          tanggal_rapot: p.tanggal_selesai || null,
          tanggal_mulai: p.tanggal_mulai,
          tanggal_selesai: p.tanggal_selesai,
          is_aktif: p.is_aktif,
          rapot_input_dibuka: p.rapot_input_dibuka,
          created_at: p.created_at || '',
          updated_at: p.updated_at || '',
        }
        setPeriodeAktif(activeMapped)
        setRapotInputPeriodeId(prev => prev || activeMapped.id)
      } else {
        setPeriodeAktif(null)
      }

      // 2. Ambil seluruh periode akademik untuk opsi dropdown (input/rekap/download)
      const { data: allData, error: allErr } = await supabase
        .from('periode_akademik')
        .select('*')
        .order('created_at', { ascending: false })

      if (allErr) {
        console.error('[useAdminRapot] Gagal memuat daftar periode_akademik:', allErr.message)
      } else if (allData) {
        const mapped: PeriodeRapot[] = allData.map(p => ({
          ...p,
          id: p.id,
          nama: `${p.tahun_ajaran} Semester ${p.semester === 1 ? '1 (Ganjil)' : '2 (Genap)'}`,
          tahun_ajaran: p.tahun_ajaran,
          semester: p.semester,
          tanggal_rapot: p.tanggal_selesai || null,
          tanggal_mulai: p.tanggal_mulai,
          tanggal_selesai: p.tanggal_selesai,
          is_aktif: p.is_aktif,
          rapot_input_dibuka: p.rapot_input_dibuka,
          created_at: p.created_at || '',
          updated_at: p.updated_at || '',
        }))
        setPeriodeList(mapped)
      }
    } catch (err: any) {
      setPeriodeError(err.message || 'Terjadi kesalahan sistem saat memuat periode akademik')
      setPeriodeAktif(null)
    } finally {
      setPeriodeLoading(false)
    }
  }, [])

  const resetFormPeriode = () => {
    setFormPeriodeNama(''); setFormPeriodeTahunAjaran(''); setFormPeriodeSemester('genap')
    setFormPeriodeTanggal(''); setFormPeriodeAktif(false); setEditPeriodeId(null)
  }

  // ===== TOGGLE WINDOW INPUT RAPOT (ADMIN CONTROL) =====
  const handleToggleWindow = async (targetPeriodeId: string, currentStatus: boolean) => {
    setLoading(true); setErrorMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setErrorMsg('Sesi login tidak valid')
        setLoading(false)
        return
      }
      const res = await fetchWithAuth('/api/rapot-digital/toggle-window', session.access_token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periode_id: targetPeriodeId, rapot_input_dibuka: !currentStatus }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal mengubah status jendela input')
      } else {
        setSuccessMsg(`Status input nilai berhasil ${!currentStatus ? 'dibuka' : 'ditutup'}!`)
        fetchPeriode()
      }
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Klik tab utama Rapot Digital (Periode/Input/Rekap/Download) -- selalu
  // fetch ulang periode, dan untuk tab download/rekap, muat daftar santri
  // sekali saja kalau belum ada. Persis logic inline JSX asli.
  const handleSelectRapotTab = (tabId: string) => {
    setRapotActiveTab(tabId)
    fetchPeriode()
    if ((tabId === 'download' || tabId === 'rekap') && rapotInputSantriList.length === 0) fetchSantriUntukRapot('')
  }

  // ===== INPUT NILAI =====
  const fetchSantriUntukRapot = async (periodeId: string) => {
    // Admin bisa akses semua santri termasuk alumni
    const { data } = await supabase.from('santri')
      .select('*, guru:guru_id(nama)')
      .order('kelas_num').order('nama')
    setRapotInputSantriList(data || [])
    setRapotInputSantri(null)
    setRapotInputSearch('')
    setRapotNilai({})
    setRapotExistingId(null)
    setRapotKelasSnapshot('')
    setRapotJenjangSnapshot('ula')
    setRapotInputMsg('')
  }

  const fetchNilaiRapotAdmin = async (santriId: string, periodeId: string, kelasSnapshot?: string) => {
    let query = supabase.from('nilai_rapot')
      .select('*').eq('santri_id', santriId).eq('periode_id', periodeId)
    if (kelasSnapshot) query = query.eq('kelas_snapshot', parseInt(kelasSnapshot))
    const { data } = await query.maybeSingle()
    if (data) {
      setRapotExistingId(data.id)
      setRapotNilai({
        kelancaran: data.kelancaran || '',
        tajwid: data.tajwid || '',
        keterangan_hafalan: data.keterangan_hafalan || '',
        aqidah: data.aqidah || '',
        akhlak: data.akhlak || '',
        fiqh: data.fiqh || '',
        bhs_arab: data.bhs_arab || '',
        siroh: data.siroh || '',
        khoth: data.khoth || '',
        bhs_indonesia: data.bhs_indonesia || '',
        berhitung: data.berhitung || '',
        ipa: data.ipa || '',
        ips: data.ips || '',
        akhlak_kepribadian: data.akhlak_kepribadian || 'B',
        kebersihan: data.kebersihan || 'B',
        ketertiban: data.ketertiban || 'B',
        ekskul_renang: data.ekskul_renang || '',
        ekskul_beladiri: data.ekskul_beladiri || '',
        hadir_sakit: data.hadir_sakit ?? 0,
        hadir_izin: data.hadir_izin ?? 0,
        hadir_alpha: data.hadir_alpha ?? 0,
        catatan: data.catatan || '',
      })
    } else {
      setRapotExistingId(null)
      setRapotNilai({
        kelancaran: '', tajwid: '', keterangan_hafalan: '',
        aqidah: '', akhlak: '', fiqh: '', bhs_arab: '', siroh: '', khoth: '',
        bhs_indonesia: '', berhitung: '', ipa: '', ips: '',
        akhlak_kepribadian: 'B', kebersihan: 'B', ketertiban: 'B',
        ekskul_renang: '', ekskul_beladiri: '',
        hadir_sakit: 0, hadir_izin: 0, hadir_alpha: 0, catatan: '',
      })
    }
  }

  const handleSelectRapotInputPeriode = (periodeId: string) => {
    setRapotInputPeriodeId(periodeId)
    setRapotInputSantri(null)
    setRapotInputSearch('')
    setRapotNilai({})
    setRapotExistingId(null)
    setRapotKelasSnapshot('')
    setRapotJenjangSnapshot('ula')
    setRapotInputMsg('')
    if (periodeId) fetchSantriUntukRapot(periodeId)
  }

  const handlePilihRapotInputSantri = (s: Santri) => {
    setRapotInputSantri(s)
    setRapotInputSearch(s.nama)
    setRapotKelasSnapshot(s.kelas_num?.toString() || '')
    setRapotJenjangSnapshot(s.jenjang || 'ula')
    fetchNilaiRapotAdmin(s.id, rapotInputPeriodeId, s.kelas_num?.toString())
  }

  const handleBatalkanRapotInputSantri = () => {
    setRapotInputSantri(null); setRapotInputSearch('')
    setRapotNilai({}); setRapotExistingId(null)
    setRapotKelasSnapshot(''); setRapotJenjangSnapshot('ula')
    setRapotInputMsg('')
  }

  const handleGantiRapotJenjangSnapshot = (jenjang: string) => {
    setRapotJenjangSnapshot(jenjang); setRapotKelasSnapshot('')
  }

  const handleGantiRapotKelasSnapshot = (kelas: string) => {
    setRapotKelasSnapshot(kelas)
    if (kelas && rapotInputSantri) fetchNilaiRapotAdmin(rapotInputSantri.id, rapotInputPeriodeId, kelas)
  }

  const handleSimpanRapotAdmin = async () => {
    if (!rapotInputSantri || !rapotInputPeriodeId) return
    setRapotInputLoading(true); setRapotInputMsg('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setRapotInputMsg('Sesi login tidak valid')
        setRapotInputLoading(false)
        return
      }

      const payload = {
        santri_id: rapotInputSantri.id,
        periode_id: rapotInputPeriodeId,
        nilai: rapotNilai,
      }

      const res = await fetchWithAuth('/api/rapot-digital/nilai', session.access_token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const resData = await res.json()
      if (!res.ok) {
        setRapotInputMsg('Gagal: ' + (resData.error || 'Gagal menyimpan nilai rapot'))
        setRapotInputLoading(false)
        return
      }

      setRapotInputMsg('✓ Nilai rapot berhasil disimpan!')
      setRapotExistingId(resData.nilai?.id || null)
      fetchNilaiRapotAdmin(rapotInputSantri.id, rapotInputPeriodeId, rapotKelasSnapshot)
    } catch (err: any) {
      setRapotInputMsg('Gagal: ' + err.message)
    } finally {
      setRapotInputLoading(false)
    }
  }

  // ===== REKAP KELAS =====
  const handleGantiRapotRekapPeriode = (periodeId: string) => {
    setRapotRekapPeriodeId(periodeId); setRapotRekapData([])
  }

  const handleGantiRapotRekapJenjang = (jenjang: string) => {
    setRapotRekapJenjang(jenjang); setRapotRekapKelas(''); setRapotRekapData([])
  }

  const handleGantiRapotRekapKelas = (kelas: string) => {
    setRapotRekapKelas(kelas); setRapotRekapData([])
  }

  const fetchRekapKelas = async () => {
    if (!rapotRekapPeriodeId || !rapotRekapKelas) return
    setRapotRekapLoading(true)
    setRapotRekapData([])

    // Ambil nilai berdasarkan kelas_snapshot dulu
    const { data: nilaiSnapshot } = await supabase
      .from('nilai_rapot')
      .select('*, santri:santri_id(nama, kelas_num, jenjang, status)')
      .eq('periode_id', rapotRekapPeriodeId)
      .eq('kelas_snapshot', parseInt(rapotRekapKelas))

    let nilaiList: RapotNilaiApiRow[] = nilaiSnapshot || []

    // Jika tidak ada kelas_snapshot, fallback ke kelas santri saat ini
    if (nilaiList.length === 0) {
      const { data: santriKelas } = await supabase
        .from('santri').select('id')
        .eq('jenjang', rapotRekapJenjang)
        .eq('kelas_num', parseInt(rapotRekapKelas))
      const ids = (santriKelas || []).map((s) => s.id)
      if (ids.length > 0) {
        const { data: nilaiFallback } = await supabase
          .from('nilai_rapot')
          .select('*, santri:santri_id(nama, kelas_num, jenjang, status)')
          .eq('periode_id', rapotRekapPeriodeId)
          .in('santri_id', ids)
        nilaiList = nilaiFallback || []
      }
    }

    // Hitung rata-rata per santri
    const hitungRata = (n: RapotNilaiApiRow) => {
      const d = [n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].filter((v) => v != null && v > 0)
      const u = [n.bhs_indonesia, n.berhitung, n.ipa, n.ips].filter((v) => v != null && v > 0)
      if (d.length === 0 && u.length === 0) return 0
      const rd = d.length > 0 ? d.reduce((a: number, b: number) => a + b, 0) / d.length : 0
      const ru = u.length > 0 ? u.reduce((a: number, b: number) => a + b, 0) / u.length : 0
      if (d.length === 0) return ru
      if (u.length === 0) return rd
      return (rd + ru) / 2
    }

    // Tambah rata-rata dan urutkan
    const withRata = nilaiList.map((n) => ({
      ...n,
      rata_diiniyyah: (() => {
        const d = [n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].filter((v) => v != null && v > 0)
        return d.length > 0 ? d.reduce((a: number, b: number) => a + b, 0) / d.length : null
      })(),
      rata_umum: (() => {
        const u = [n.bhs_indonesia, n.berhitung, n.ipa, n.ips].filter((v) => v != null && v > 0)
        return u.length > 0 ? u.reduce((a: number, b: number) => a + b, 0) / u.length : null
      })(),
      rata_akhir: hitungRata(n)
    })).sort((a, b) => b.rata_akhir - a.rata_akhir)

    // Tambah peringkat
    const withPeringkat = withRata.map((n, i) => ({ ...n, peringkat: i + 1 }))

    setRapotRekapData(withPeringkat)
    setRapotRekapLoading(false)
  }

  // ===== DOWNLOAD =====
  const handlePilihRapotDownloadSantri = (s: Santri) => {
    setRapotDownloadSantri(s)
    setRapotDownloadSearch(s.nama)
    setRapotDownloadKelas(s.kelas_num?.toString() || '')
    setRapotDownloadJenjang(s.jenjang || 'ula')
  }

  const handleBatalkanRapotDownloadSantri = () => {
    setRapotDownloadSantri(null); setRapotDownloadSearch('')
  }

  const handleGantiRapotDownloadJenjang = (jenjang: string) => {
    setRapotDownloadJenjang(jenjang); setRapotDownloadKelas('')
  }

  return {
    periodeList, periodeAktif, periodeLoading, periodeError,
    showFormPeriode, setShowFormPeriode, editPeriodeId,
    formPeriodeNama, setFormPeriodeNama, formPeriodeTahunAjaran, setFormPeriodeTahunAjaran,
    formPeriodeSemester, setFormPeriodeSemester, formPeriodeTanggal, setFormPeriodeTanggal,
    formPeriodeAktif, setFormPeriodeAktif,
    rapotJenjang, setRapotJenjang, rapotKelas, setRapotKelas, rapotPeriodeId, setRapotPeriodeId,
    rapotInputPeriodeId, rapotInputSantriList, rapotInputSantri, rapotInputSearch, setRapotInputSearch,
    rapotNilai, setRapotNilai, rapotInputLoading, rapotInputMsg, rapotExistingId,
    rapotKelasSnapshot, rapotJenjangSnapshot, rapotActiveTab,
    rapotDownloadSearch, setRapotDownloadSearch, rapotDownloadSantri, rapotDownloadKelas, setRapotDownloadKelas, rapotDownloadJenjang,
    rapotRekapPeriodeId, rapotRekapJenjang, rapotRekapKelas, rapotRekapData, rapotRekapLoading,
    fetchPeriode, resetFormPeriode,
    handleToggleWindow,
    handleSelectRapotTab,
    handleSelectRapotInputPeriode, handlePilihRapotInputSantri, handleBatalkanRapotInputSantri,
    handleGantiRapotJenjangSnapshot, handleGantiRapotKelasSnapshot, handleSimpanRapotAdmin,
    handleGantiRapotRekapPeriode, handleGantiRapotRekapJenjang, handleGantiRapotRekapKelas, fetchRekapKelas,
    handlePilihRapotDownloadSantri, handleBatalkanRapotDownloadSantri, handleGantiRapotDownloadJenjang,
  }
}
