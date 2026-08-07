'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

type StatusJuz = 'belum_dimulai' | 'belum_selesai' | 'selesai'

type SantriRingkas = {
  id: string
  nama: string
  kelas: string | null
  kelas_num: number | null
  jenjang: string | null
  jenis_kelas: string | null
  juzDimulai: number
  juzSelesai: number
  rataUmum: number | null
}

type PeriodeOption = { id: string, nama: string, tipe: string | null }

type NilaiUjianRow = {
  id: string
  santri_id: string | null
  guru_id: string | null
  kalender_id: string | null
  segment_ujian_id: string | null
  tanggal: string | null
  tipe: string | null
  surah_mulai_nomor: number | null
  surah_selesai_nomor: number | null
  ayat_mulai: number | null
  ayat_selesai: number | null
  jumlah_tegur: number | null
  jumlah_tahu_ayat: number | null
  jumlah_lupa: number | null
  nilai_akhir: number | null
  catatan: string | null
  created_at: string | null
  guru: { id: string, nama: string } | null
  surah_mulai: { nomor: number, nama_latin: string } | null
  surah_selesai: { nomor: number, nama_latin: string } | null
  segment: {
    id: string
    juz: number
    segmen: number
    urutan_global: number
    halaman_awal: number
    halaman_akhir: number
    jumlah_halaman: number
  } | null
}

type MasterSegmentLite = {
  id: string
  juz: number
  segmen: number
  urutan_global: number
  halaman_awal: number
  halaman_akhir: number
  jumlah_halaman: number
  surah_awal_nomor: number
  ayat_awal: number
  surah_akhir_nomor: number
  ayat_akhir: number
  surah_awal: { nomor: number, nama_latin: string } | null
  surah_akhir: { nomor: number, nama_latin: string } | null
}

type SegmenTersediaInfo = { parsial: boolean, akhirSurahNomor: number, akhirAyat: number }
type Cakupan = {
  lengkap: boolean
  segmentIds: string[]
  segmenTersedia: Record<string, SegmenTersediaInfo>
  jumlahSegmenPerJuz: Record<string, number>
}

type SantriDetail = {
  id: string
  nama: string
  kelas: string | null
  kelas_num: number | null
  jenjang: string | null
  jenis_kelas: string | null
}

const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300'

function getKelasOptions(jenjang: string) {
  if (jenjang === 'ula') return [1, 2, 3, 4, 5, 6]
  if (jenjang === 'wustha') return [7, 8, 9]
  if (jenjang === 'ulya') return [10, 11, 12]
  return []
}

function labelKelompok(value: string | null | undefined) {
  if (value === 'banin') return 'Banin'
  if (value === 'banat') return 'Banat'
  if (value === 'tn_a' || value === 'tn_b') return 'TN'
  return value || '-'
}

function labelJenjang(value: string | null | undefined) {
  if (value === 'ula') return 'Ula'
  if (value === 'wustha') return 'Wustha'
  if (value === 'ulya') return 'Ulya'
  return value || '-'
}

function labelKelas(item: { kelas?: string | null, kelas_num?: number | null, jenis_kelas?: string | null }) {
  if (item.kelas) return item.kelas
  const kelas = item.kelas_num ? `Kelas ${item.kelas_num}` : 'Kelas -'
  return `${kelas} ${labelKelompok(item.jenis_kelas)}`
}

function labelTipe(value: string | null | undefined) {
  if (value === 'mid_semester') return 'Mid Semester'
  if (value === 'semester') return 'Semester'
  return value ? value.replaceAll('_', ' ') : '-'
}

function formatTanggal(value: string | null | undefined) {
  if (!value) return '-'
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Date(year, month - 1, day).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatWaktu(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB'
}

function nilaiAman(value: number | null | undefined) {
  const nilai = Number(value)
  return Number.isFinite(nilai) ? nilai : 0
}

function formatNilai(value: number | null | undefined) {
  return nilaiAman(value).toFixed(1).replace('.', ',')
}

function nilaiRapor(value: number | null | undefined) {
  const nilai = nilaiAman(value)
  return Math.min(100, Math.max(50, Math.round(nilai * 10)))
}

function compareNilaiTerbaru(a: NilaiUjianRow, b: NilaiUjianRow) {
  const tanggal = (b.tanggal || '').localeCompare(a.tanggal || '')
  if (tanggal !== 0) return tanggal
  const createdAt = (b.created_at || '').localeCompare(a.created_at || '')
  if (createdAt !== 0) return createdAt
  return b.id.localeCompare(a.id)
}

function StatusBadge({ status }: { status: StatusJuz }) {
  const config: Record<StatusJuz, { label: string, className: string }> = {
    selesai: { label: 'Selesai', className: 'bg-green-100 text-green-700' },
    belum_selesai: { label: 'Belum Selesai', className: 'bg-yellow-100 text-yellow-700' },
    belum_dimulai: { label: 'Belum Dimulai', className: 'bg-gray-100 text-gray-500' },
  }
  const { label, className } = config[status]
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${className}`}>{label}</span>
}

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

export default function AdminRekapNilaiUjian() {
  // Satu-satunya kelompok filter (dipakai bersama untuk daftar/rekap maupun download) --
  // sebelumnya ada dua state independen (dl* untuk download, filter* untuk daftar) yang terlihat
  // identik tapi tidak saling terhubung, sumber kebingungan admin.
  const [filterPeriode, setFilterPeriode] = useState('')
  const [filterTipe, setFilterTipe] = useState('')
  const [filterJenjang, setFilterJenjang] = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const [filterKelompok, setFilterKelompok] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const filterLengkap = Boolean(filterPeriode && filterTipe && filterJenjang && filterKelas && filterKelompok)

  const [santriList, setSantriList] = useState<SantriRingkas[]>([])
  const [total, setTotal] = useState(0)
  const [periodeOptions, setPeriodeOptions] = useState<PeriodeOption[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [errorList, setErrorList] = useState('')

  // Drill-down
  const [selectedSantriId, setSelectedSantriId] = useState<string | null>(null)
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null)
  const [detailSantri, setDetailSantri] = useState<SantriDetail | null>(null)
  const [detailData, setDetailData] = useState<NilaiUjianRow[]>([])
  const [detailCakupan, setDetailCakupan] = useState<Cakupan | null>(null)
  const [masterSegments, setMasterSegments] = useState<MasterSegmentLite[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [errorDetail, setErrorDetail] = useState('')
  const [showFormatLama, setShowFormatLama] = useState(false)
  const [riwayatSegmentId, setRiwayatSegmentId] = useState<string | null>(null)

  // Edit
  const [editRecord, setEditRecord] = useState<NilaiUjianRow | null>(null)
  const [editTegur, setEditTegur] = useState('0')
  const [editTahuAyat, setEditTahuAyat] = useState('0')
  const [editLupa, setEditLupa] = useState('0')
  const [editCatatan, setEditCatatan] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [errorEdit, setErrorEdit] = useState('')

  const [downloading, setDownloading] = useState(false)
  const [errorDownload, setErrorDownload] = useState('')

  const [refreshTick, setRefreshTick] = useState(0)

  // Periode ditampilkan sejak awal (sebelum filter lain lengkap) supaya admin bisa memulai alur
  // "Pilih Periode -> Jenjang -> Kelas -> Kelompok" dari dropdown pertama.
  useEffect(() => {
    let dibatalkan = false
    async function muatPeriode() {
      const { data } = await supabase
        .from('kalender_akademik')
        .select('id, nama, tipe')
        .in('tipe', ['mid_semester', 'semester'])
        .order('tanggal_mulai', { ascending: false })
      if (!dibatalkan) setPeriodeOptions(data || [])
    }
    muatPeriode()
    return () => { dibatalkan = true }
  }, [])

  // Logika fetch didefinisikan dan dipanggil sepenuhnya di dalam effect (bukan lewat referensi
  // useCallback yang juga dipakai di tempat lain) supaya tidak terdeteksi sebagai "setState
  // sinkron dalam effect" oleh react-hooks/set-state-in-effect. Tombol "Muat Ulang" memicu fetch
  // baru lewat penambah refreshTick, bukan memanggil fungsi fetch secara langsung. Daftar santri
  // sengaja tidak pernah di-fetch sebelum kelima filter lengkap (jangan tampilkan seluruh santri
  // pondok sebelum filter dipilih).
  useEffect(() => {
    let dibatalkan = false
    async function muatDaftar() {
      if (!filterLengkap) {
        setSantriList([])
        setTotal(0)
        setErrorList('')
        return
      }
      setLoadingList(true)
      setErrorList('')
      try {
        const accessToken = await getAccessToken()
        if (!accessToken) throw new Error('Sesi login sudah berakhir. Silakan login kembali.')
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          periode: filterPeriode,
          tipe: filterTipe,
          jenjang: filterJenjang,
          kelas: filterKelas,
          kelompok: filterKelompok,
          search,
        })
        const response = await fetch(`/api/admin/nilai-ujian?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (response.status === 401) throw new Error('Sesi login tidak valid atau sudah berakhir.')
          if (response.status === 403) throw new Error('Akses ditolak. Hanya admin yang dapat membuka rekap ini.')
          throw new Error(result.error || 'Gagal memuat daftar santri.')
        }
        if (dibatalkan) return
        setSantriList(Array.isArray(result.data) ? result.data : [])
        setTotal(typeof result.total === 'number' ? result.total : 0)
      } catch (error) {
        if (!dibatalkan) setErrorList(error instanceof Error ? error.message : 'Gagal memuat daftar santri.')
      } finally {
        if (!dibatalkan) setLoadingList(false)
      }
    }
    muatDaftar()
    return () => { dibatalkan = true }
  }, [filterLengkap, page, filterPeriode, filterTipe, filterJenjang, filterKelas, filterKelompok, search, refreshTick])

  const muatUlangDaftar = () => setRefreshTick(tick => tick + 1)

  const fetchDetail = useCallback(async (santriId: string) => {
    setLoadingDetail(true)
    setErrorDetail('')
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Sesi login sudah berakhir. Silakan login kembali.')
      const params = new URLSearchParams({ santri_id: santriId, periode: filterPeriode, tipe: filterTipe })
      const response = await fetch(`/api/admin/nilai-ujian?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Gagal memuat detail santri.')
      }
      setDetailSantri(result.santri || null)
      setDetailData(Array.isArray(result.data) ? result.data : [])
      setDetailCakupan(result.cakupan || null)
      setMasterSegments(Array.isArray(result.masterSegments) ? result.masterSegments : [])
    } catch (error) {
      setErrorDetail(error instanceof Error ? error.message : 'Gagal memuat detail santri.')
    } finally {
      setLoadingDetail(false)
    }
  }, [filterPeriode, filterTipe])

  const pilihSantri = (id: string) => {
    setSelectedSantriId(id)
    setSelectedJuz(null)
    setShowFormatLama(false)
    setRiwayatSegmentId(null)
    fetchDetail(id)
  }

  const kembaliKeDaftar = () => {
    setSelectedSantriId(null)
    setSelectedJuz(null)
    setDetailSantri(null)
    setDetailData([])
    setDetailCakupan(null)
  }

  const masterSegmentMap = useMemo(() => new Map(masterSegments.map(s => [s.id, s])), [masterSegments])
  const surahNamaMap = useMemo(() => {
    const map = new Map<number, string>()
    masterSegments.forEach(seg => {
      if (seg.surah_awal) map.set(seg.surah_awal.nomor, seg.surah_awal.nama_latin)
      if (seg.surah_akhir) map.set(seg.surah_akhir.nomor, seg.surah_akhir.nama_latin)
    })
    return map
  }, [masterSegments])
  const namaSurahNomor = (nomor: number) => surahNamaMap.get(nomor) || `Surah ${nomor}`

  const nilaiTerbaruPerSegmen = useMemo(() => {
    const map = new Map<string, NilaiUjianRow>()
    ;[...detailData]
      .filter(item => item.segment_ujian_id && item.segment)
      .sort(compareNilaiTerbaru)
      .forEach(item => {
        if (!map.has(item.segment_ujian_id as string)) map.set(item.segment_ujian_id as string, item)
      })
    return map
  }, [detailData])

  const percobaanCount = useMemo(() => {
    const map = new Map<string, number>()
    detailData.forEach(item => {
      if (!item.segment_ujian_id) return
      map.set(item.segment_ujian_id, (map.get(item.segment_ujian_id) || 0) + 1)
    })
    return map
  }, [detailData])

  const formatLamaList = useMemo(
    () => detailData.filter(item => !item.segment_ujian_id).sort(compareNilaiTerbaru),
    [detailData]
  )

  const juzList = useMemo(() => {
    if (!detailCakupan || !detailCakupan.lengkap) return []
    return Object.entries(detailCakupan.jumlahSegmenPerJuz).map(([juzText, target]) => {
      const juz = Number(juzText)
      const segmentIds = masterSegments.filter(s => s.juz === juz && detailCakupan.segmentIds.includes(s.id)).map(s => s.id)
      const nilaiJuz = segmentIds
        .map(id => nilaiTerbaruPerSegmen.get(id))
        .filter((item): item is NilaiUjianRow => Boolean(item))
      const rata = nilaiJuz.length > 0 ? nilaiJuz.reduce((sum, item) => sum + nilaiAman(item.nilai_akhir), 0) / nilaiJuz.length : null
      const status: StatusJuz = nilaiJuz.length === 0 ? 'belum_dimulai' : nilaiJuz.length >= target ? 'selesai' : 'belum_selesai'
      return { juz, target, dinilai: nilaiJuz.length, rata, status, segmentIds }
    }).sort((a, b) => b.juz - a.juz)
  }, [detailCakupan, masterSegments, nilaiTerbaruPerSegmen])

  const selectedJuzInfo = juzList.find(j => j.juz === selectedJuz) || null

  const segmenDetailList = useMemo(() => {
    if (!selectedJuzInfo || !detailCakupan) return []
    return selectedJuzInfo.segmentIds.map(segId => {
      const master = masterSegmentMap.get(segId)
      if (!master) return null
      const info = detailCakupan.segmenTersedia?.[segId]
      const parsial = info?.parsial || false
      const akhirSurahNomor = parsial && info ? info.akhirSurahNomor : master.surah_akhir_nomor
      const akhirAyat = parsial && info ? info.akhirAyat : master.ayat_akhir
      return {
        segmentId: segId,
        segmen: master.segmen,
        surahAwalNomor: master.surah_awal_nomor,
        ayatAwal: master.ayat_awal,
        surahAkhirNomor: akhirSurahNomor,
        ayatAkhir: akhirAyat,
        parsial,
        nilaiAktif: nilaiTerbaruPerSegmen.get(segId) || null,
        jumlahPercobaan: percobaanCount.get(segId) || 0,
      }
    }).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => a.segmen - b.segmen)
  }, [selectedJuzInfo, detailCakupan, masterSegmentMap, nilaiTerbaruPerSegmen, percobaanCount])

  const riwayatList = useMemo(() => {
    if (!riwayatSegmentId) return []
    return detailData.filter(item => item.segment_ujian_id === riwayatSegmentId).sort(compareNilaiTerbaru)
  }, [detailData, riwayatSegmentId])
  const riwayatSegmenInfo = segmenDetailList.find(s => s.segmentId === riwayatSegmentId) || null

  const bukaEdit = (record: NilaiUjianRow) => {
    setEditRecord(record)
    setEditTegur(String(record.jumlah_tegur ?? 0))
    setEditTahuAyat(String(record.jumlah_tahu_ayat ?? 0))
    setEditLupa(String(record.jumlah_lupa ?? 0))
    setEditCatatan(record.catatan || '')
    setErrorEdit('')
  }

  const previewNilaiEdit = useMemo(() => {
    const tegur = Number.parseInt(editTegur, 10) || 0
    const tahuAyat = Number.parseInt(editTahuAyat, 10) || 0
    const lupa = Number.parseInt(editLupa, 10) || 0
    const nilai = 10 - (tegur * 0.1) - (tahuAyat * 0.1) - lupa
    return Math.min(10, Math.max(5, Math.round(nilai * 10) / 10))
  }, [editTegur, editTahuAyat, editLupa])

  const simpanEdit = async () => {
    if (!editRecord) return
    setSavingEdit(true)
    setErrorEdit('')
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Sesi login sudah berakhir. Silakan login kembali.')
      const response = await fetch('/api/admin/nilai-ujian', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          id: editRecord.id,
          jumlah_tegur: Number.parseInt(editTegur, 10) || 0,
          jumlah_tahu_ayat: Number.parseInt(editTahuAyat, 10) || 0,
          jumlah_lupa: Number.parseInt(editLupa, 10) || 0,
          catatan: editCatatan || null,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Gagal menyimpan perubahan nilai.')

      setDetailData(current => current.map(item => item.id === editRecord.id
        ? { ...item, jumlah_tegur: result.data.jumlah_tegur, jumlah_tahu_ayat: result.data.jumlah_tahu_ayat, jumlah_lupa: result.data.jumlah_lupa, catatan: result.data.catatan, nilai_akhir: result.data.nilai_akhir }
        : item))
      setEditRecord(null)
    } catch (error) {
      setErrorEdit(error instanceof Error ? error.message : 'Gagal menyimpan perubahan nilai.')
    } finally {
      setSavingEdit(false)
    }
  }

  const downloadRaport = async () => {
    if (!filterLengkap || downloading) return
    setDownloading(true)
    setErrorDownload('')
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Sesi login sudah berakhir. Silakan login kembali.')
      const params = new URLSearchParams({ periode: filterPeriode, tipe: filterTipe, jenjang: filterJenjang, kelas: filterKelas, kelompok: filterKelompok })
      const response = await fetch(`/api/admin/nilai-ujian-excel?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'Gagal mengunduh raport.')
      }
      const blob = await response.blob()
      const disposition = response.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match ? match[1] : 'raport-hifzh.xlsx'
      const urlObject = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = urlObject
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(urlObject)
    } catch (error) {
      setErrorDownload(error instanceof Error ? error.message : 'Gagal mengunduh raport.')
    } finally {
      setDownloading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Rekap Nilai Ujian</h2>
          <p className="text-blue-200 text-sm mt-1">Santri → Juz → Detail Segmen</p>
        </div>
      </div>

      {/* Satu-satunya kelompok filter, dipakai bersama oleh rekap dan download */}
      <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-1">Rekap Nilai Ujian</h3>
        <p className="text-xs text-gray-500 mb-3">Pilih periode, tipe ujian, jenjang, kelas, dan kelompok untuk melihat rekap sekaligus mengunduh Raport Hifzh.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Periode</label>
            <select value={filterPeriode} onChange={e => { setFilterPeriode(e.target.value); setPage(1) }} className={inputClass}>
              <option value="">-- Pilih --</option>
              {periodeOptions.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipe Ujian</label>
            <select value={filterTipe} onChange={e => { setFilterTipe(e.target.value); setPage(1) }} className={inputClass}>
              <option value="">-- Pilih --</option>
              <option value="mid_semester">Mid Semester</option>
              <option value="semester">Semester</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
            <select value={filterJenjang} onChange={e => { setFilterJenjang(e.target.value); setFilterKelas(''); setPage(1) }} className={inputClass}>
              <option value="">-- Pilih --</option>
              <option value="ula">Ula</option>
              <option value="wustha">Wustha</option>
              <option value="ulya">Ulya</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kelas</label>
            <select value={filterKelas} onChange={e => { setFilterKelas(e.target.value); setPage(1) }} className={inputClass} disabled={!filterJenjang}>
              <option value="">-- Pilih --</option>
              {getKelasOptions(filterJenjang).map(k => <option key={k} value={k}>Kelas {k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kelompok</label>
            <select value={filterKelompok} onChange={e => { setFilterKelompok(e.target.value); setPage(1) }} className={inputClass}>
              <option value="">-- Pilih --</option>
              <option value="banin">Banin</option>
              <option value="banat">Banat</option>
              <option value="tn">TN</option>
            </select>
          </div>
        </div>

        {filterLengkap && (
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">Cari Santri</label>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Cari nama santri..." className={inputClass} />
          </div>
        )}

        {errorDownload && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm">{errorDownload}</div>}
        {filterLengkap && (
          <button type="button" onClick={downloadRaport} disabled={downloading}
            className="w-full mt-4 py-3.5 rounded-xl text-white font-bold disabled:opacity-40 shadow"
            style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
            {downloading ? 'Menyiapkan file...' : '📥 Download Raport Hifzh'}
          </button>
        )}
      </div>

      {selectedSantriId === null && (
        <>
          {!filterLengkap ? (
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-10 text-center text-gray-400 text-sm">
              Pilih periode, jenjang, kelas, dan kelompok untuk melihat rekap nilai.
            </div>
          ) : (
          <>
          <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500">{total} santri ditemukan</p>
            <button type="button" onClick={muatUlangDaftar} disabled={loadingList} className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold disabled:opacity-50">{loadingList ? 'Memuat...' : 'Muat Ulang'}</button>
          </div>

          {errorList && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{errorList}</div>}

          {loadingList && santriList.length === 0 ? (
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-10 text-center text-gray-400">Memuat daftar santri...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {santriList.map(santri => (
                <button key={santri.id} type="button" onClick={() => pilihSantri(santri.id)}
                  className="text-left bg-white rounded-2xl shadow border border-gray-100 p-4 hover:border-blue-300 hover:shadow-md transition">
                  <div className="font-bold text-gray-800">{santri.nama}</div>
                  <div className="text-xs text-gray-500">{labelJenjang(santri.jenjang)} · {labelKelas(santri)}</div>
                  <div className="mt-2 flex gap-4 text-sm">
                    <div><span className="font-bold text-blue-700">{santri.juzDimulai}</span> <span className="text-gray-400 text-xs">juz dimulai</span></div>
                    <div><span className="font-bold text-green-700">{santri.juzSelesai}</span> <span className="text-gray-400 text-xs">juz selesai</span></div>
                  </div>
                  {santri.rataUmum !== null && (
                    <div className="mt-1 text-xs text-gray-500">Rata-rata: <span className="font-semibold text-gray-700">{formatNilai(santri.rataUmum)} / {nilaiRapor(santri.rataUmum)}</span></div>
                  )}
                  <div className="mt-2 text-xs font-semibold text-blue-700">Lihat Rekap →</div>
                </button>
              ))}
              {santriList.length === 0 && <div className="col-span-full bg-white rounded-2xl shadow border border-gray-100 p-10 text-center text-gray-400 text-sm">Tidak ada santri sesuai filter.</div>}
            </div>
          )}

          {total > pageSize && (
            <div className="flex justify-center items-center gap-3 mt-5">
              <button type="button" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold disabled:opacity-30">‹ Sebelumnya</button>
              <span className="text-sm text-gray-500">Halaman {page} dari {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold disabled:opacity-30">Berikutnya ›</button>
            </div>
          )}
          </>
          )}
        </>
      )}

      {selectedSantriId !== null && selectedJuz === null && (
        <>
          <button type="button" onClick={kembaliKeDaftar} className="text-sm text-blue-700 font-semibold mb-3">← Kembali ke Daftar Santri</button>

          {loadingDetail ? (
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-10 text-center text-gray-400">Memuat detail santri...</div>
          ) : errorDetail ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{errorDetail}</div>
          ) : detailSantri ? (
            <>
              <div className="bg-white rounded-2xl shadow border border-gray-100 p-4 mb-5">
                <div className="font-bold text-lg text-gray-800">{detailSantri.nama}</div>
                <div className="text-xs text-gray-500">{labelJenjang(detailSantri.jenjang)} · {labelKelas(detailSantri)}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                {juzList.map(item => (
                  <button key={item.juz} type="button" onClick={() => setSelectedJuz(item.juz)}
                    className="text-left bg-white rounded-2xl shadow border border-gray-100 p-4 hover:border-blue-300 hover:shadow-md transition">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-bold text-gray-800">Juz {item.juz}</div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{item.dinilai} dari {item.target} segmen selesai</div>
                    {item.rata !== null && (
                      <div className={`mt-2 text-lg font-bold ${item.status === 'selesai' ? 'text-green-700' : 'text-blue-700'}`}>
                        {formatNilai(item.rata)} / {nilaiRapor(item.rata)}
                      </div>
                    )}
                  </button>
                ))}
                {juzList.length === 0 && (
                  <div className="col-span-full bg-white rounded-2xl shadow border border-gray-100 p-8 text-center text-gray-400 text-sm">Belum ada juz yang dapat diuji untuk santri ini.</div>
                )}
              </div>

              {formatLamaList.length > 0 && (
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <button type="button" onClick={() => setShowFormatLama(v => !v)} className="w-full flex justify-between items-center p-4 text-left">
                    <span className="font-semibold text-gray-700 text-sm">Riwayat Nilai Format Lama ({formatLamaList.length})</span>
                    <span className="text-gray-400">{showFormatLama ? '▾' : '▸'}</span>
                  </button>
                  {showFormatLama && (
                    <div className="border-t border-gray-100 p-4 space-y-2">
                      {formatLamaList.map(item => (
                        <div key={item.id} className="p-3 bg-gray-50 rounded-xl text-sm">
                          <div className="flex justify-between gap-2">
                            <span className="font-semibold text-gray-700">{formatTanggal(item.tanggal)} · {labelTipe(item.tipe)}</span>
                            <span className="font-bold text-blue-700 flex-shrink-0">{formatNilai(item.nilai_akhir)}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 break-words">{item.surah_mulai?.nama_latin || '-'} ayat {item.ayat_mulai ?? '-'} → {item.surah_selesai?.nama_latin || '-'} ayat {item.ayat_selesai ?? '-'}</div>
                          <div className="text-xs text-gray-400 mt-0.5">Guru: {item.guru?.nama || '-'}</div>
                          <button type="button" onClick={() => bukaEdit(item)} className="mt-2 text-xs font-semibold px-3 py-1 rounded-lg bg-blue-100 text-blue-700">Edit</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </>
      )}

      {selectedSantriId !== null && selectedJuz !== null && (
        <>
          <button type="button" onClick={() => setSelectedJuz(null)} className="text-sm text-blue-700 font-semibold mb-3">← Kembali ke Daftar Juz</button>
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-4 mb-5 flex justify-between items-center gap-3">
            <div className="min-w-0">
              <div className="font-bold text-lg text-gray-800">Juz {selectedJuz}</div>
              <div className="text-xs text-gray-500 truncate">{detailSantri?.nama}</div>
            </div>
            {selectedJuzInfo && <StatusBadge status={selectedJuzInfo.status} />}
          </div>

          <div className="space-y-3">
            {segmenDetailList.map(seg => (
              <div key={seg.segmentId} className="bg-white rounded-2xl shadow border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-800 flex items-center gap-2 flex-wrap">
                      Segmen {seg.segmen}
                      {seg.parsial && <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">Parsial</span>}
                    </div>
                    <div className="text-sm text-gray-600 mt-1 break-words">
                      {namaSurahNomor(seg.surahAwalNomor)} ayat {seg.ayatAwal} → {namaSurahNomor(seg.surahAkhirNomor)} ayat {seg.ayatAkhir}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {seg.nilaiAktif ? (
                      <div className="text-xl font-bold text-green-700">{formatNilai(seg.nilaiAktif.nilai_akhir)} / {nilaiRapor(seg.nilaiAktif.nilai_akhir)}</div>
                    ) : (
                      <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">Belum dinilai</div>
                    )}
                  </div>
                </div>
                {seg.nilaiAktif && (
                  <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                    <span>Tanggal: {formatTanggal(seg.nilaiAktif.tanggal)}</span>
                    <span>Guru: {seg.nilaiAktif.guru?.nama || '-'}</span>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {seg.jumlahPercobaan > 0 && (
                    <button type="button" onClick={() => setRiwayatSegmentId(seg.segmentId)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700">
                      Detail Riwayat ({seg.jumlahPercobaan})
                    </button>
                  )}
                  {seg.nilaiAktif && (
                    <button type="button" onClick={() => bukaEdit(seg.nilaiAktif as NilaiUjianRow)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700">
                      Edit Nilai
                    </button>
                  )}
                </div>
              </div>
            ))}
            {segmenDetailList.length === 0 && (
              <div className="bg-white rounded-2xl shadow border border-gray-100 p-8 text-center text-gray-400 text-sm">Belum ada segmen untuk juz ini.</div>
            )}
          </div>
        </>
      )}

      {riwayatSegmentId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setRiwayatSegmentId(null)}>
          <div className="bg-white w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 px-5 py-4 flex justify-between items-center text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
              <div>
                <h3 className="font-bold text-lg">Riwayat Percobaan</h3>
                <p className="text-blue-200 text-xs">{riwayatSegmenInfo ? `Segmen ${riwayatSegmenInfo.segmen}` : ''}</p>
              </div>
              <button type="button" onClick={() => setRiwayatSegmentId(null)} className="text-2xl leading-none" aria-label="Tutup riwayat">×</button>
            </div>
            <div className="p-5 space-y-3">
              {riwayatList.map((item, index) => (
                <div key={item.id} className={`p-3 rounded-xl text-sm ${index === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-gray-700">{formatTanggal(item.tanggal)}{index === 0 && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold align-middle">Nilai Aktif</span>}</span>
                    <span className="font-bold text-blue-700 flex-shrink-0">{formatNilai(item.nilai_akhir)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Guru: {item.guru?.nama || '-'} · {formatWaktu(item.created_at)}</div>
                  <div className="text-xs text-gray-500 mt-1">Tegur: {item.jumlah_tegur ?? 0} · Diberi tahu: {item.jumlah_tahu_ayat ?? 0} · Lupa: {item.jumlah_lupa ?? 0}</div>
                  {item.catatan && <div className="text-xs text-gray-500 mt-1 italic break-words">&quot;{item.catatan}&quot;</div>}
                  <button type="button" onClick={() => bukaEdit(item)} className="mt-2 text-xs font-semibold px-3 py-1 rounded-lg bg-blue-100 text-blue-700">Edit</button>
                </div>
              ))}
              {riwayatList.length === 0 && <div className="text-center text-gray-400 text-sm py-6">Belum ada percobaan.</div>}
            </div>
          </div>
        </div>
      )}

      {editRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setEditRecord(null)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-800 mb-1">Edit Nilai Ujian</h3>
            <p className="text-xs text-gray-500 mb-4">Tanggal, guru, santri, dan cakupan surah/ayat tidak dapat diubah.</p>
            <div className="space-y-2">
              {[
                { label: 'Jumlah teguran', value: editTegur, setter: setEditTegur },
                { label: 'Diberi tahu ayat sebelumnya', value: editTahuAyat, setter: setEditTahuAyat },
                { label: 'Jumlah lupa', value: editLupa, setter: setEditLupa },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-sm font-semibold text-gray-700">{item.label}</div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button type="button" onClick={() => item.setter(String(Math.max(0, (Number.parseInt(item.value, 10) || 0) - 1)))} className="w-8 h-8 rounded-lg bg-gray-200 font-bold">−</button>
                    <span className="w-8 text-center font-bold">{item.value}</span>
                    <button type="button" onClick={() => item.setter(String((Number.parseInt(item.value, 10) || 0) + 1))} className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-xl border-2 border-blue-200 flex justify-between items-center">
              <div className="text-sm font-semibold text-gray-700">Nilai baru</div>
              <div className="text-2xl font-bold text-blue-700">{previewNilaiEdit.toFixed(1)} / {nilaiRapor(previewNilaiEdit)}</div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Catatan</label>
              <textarea value={editCatatan} onChange={e => setEditCatatan(e.target.value)} rows={2} maxLength={2000} className={inputClass} />
            </div>
            {errorEdit && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm">{errorEdit}</div>}
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setEditRecord(null)} className="flex-1 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700">Batal</button>
              <button type="button" onClick={simpanEdit} disabled={savingEdit}
                className="flex-1 py-3 rounded-xl font-semibold text-white shadow disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
