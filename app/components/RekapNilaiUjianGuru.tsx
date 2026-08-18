'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatTanggalPendekID as formatTanggal, formatWaktuWIB as formatWaktu } from '../lib/dateWib'
import { hitungNilaiUjianKeseluruhan } from '../lib/adminNilaiUjian'

export type TajwidRow = {
  id: string
  santri_id: string
  juz: number
  kalender_id: string
  nilai: number
  guru_id: string
  updated_at: string
}

export type NilaiUjianGuru = {
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
  santri: {
    id: string
    nama: string
    kelas: string | null
    kelas_num: number | null
    jenjang: string | null
    jenis_kelas: string | null
    total_hafalan_juz: number | null
    surah_terakhir_nomor: number | null
    ayat_terakhir: number | null
  } | null
  guru: { id: string, nama: string } | null
  surah_mulai: { nomor: number, nama_latin: string } | null
  surah_selesai: { nomor: number, nama_latin: string } | null
  kalender: {
    id: string
    nama: string
    tipe: string | null
    tanggal_mulai: string | null
    tanggal_selesai: string | null
  } | null
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

export type MasterSegmentLite = {
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

export type CakupanSantriMap = Record<string, {
  lengkap: boolean
  segmentIds: string[]
  segmenTersedia: Record<string, { parsial: boolean, akhirSurahNomor: number, akhirAyat: number }>
  jumlahSegmenPerJuz: Record<string, number>
}>

type SantriRingkas = {
  id: string
  nama: string
  kelas?: string | null
  kelas_num?: number | null
  jenis_kelas?: string | null
  jenjang?: string | null
}

type Props = {
  data: NilaiUjianGuru[]
  cakupanSantri: CakupanSantriMap
  masterSegments: MasterSegmentLite[]
  tajwidList: TajwidRow[]
  santriList: SantriRingkas[]
  loading: boolean
  error: string
  onRefresh: () => void
  kalenderAktifId: string | null
}

type StatusJuz = 'belum_dimulai' | 'belum_selesai' | 'selesai'

const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300'

function labelKelompok(value: string | null | undefined) {
  if (value === 'banin') return 'Banin'
  if (value === 'banat') return 'Banat'
  if (value === 'tn_a') return 'TN A'
  if (value === 'tn_b') return 'TN B'
  return value || '-'
}

function kelasKeySantri(santri: SantriRingkas) {
  return [santri.jenjang || '', santri.kelas_num || '', santri.jenis_kelas || ''].join('|')
}

function labelKelasSantri(santri: SantriRingkas) {
  if (santri.kelas) return santri.kelas
  const kelas = santri.kelas_num ? `Kelas ${santri.kelas_num}` : 'Kelas -'
  return `${kelas} ${labelKelompok(santri.jenis_kelas)}`
}

// formatTanggal dipindah ke app/lib/dateWib.ts sebagai formatTanggalPendekID
// (Modularisasi Tahap 2, diimpor di atas dengan alias supaya call site tidak
// berubah) -- hasilnya diverifikasi identik dengan implementasi lama.
//
// formatWaktu dipindah ke app/lib/dateWib.ts sebagai formatWaktuWIB (Tahap
// 9N -- perbaikan bug produksi "jam input tampil UTC bukan WIB": versi
// lokal lama ini rentan salah kalau timestamp dari DB tidak menyertakan
// penanda zona eksplisit, lihat komentar formatWaktuWIB/pastikanUtc di
// dateWib.ts untuk detail akar masalahnya).

function labelTipe(value: string | null | undefined) {
  if (value === 'mid_semester') return 'Mid Semester'
  if (value === 'semester') return 'Semester'
  return value ? value.replaceAll('_', ' ') : '-'
}

function namaSurahLama(item: NilaiUjianGuru, posisi: 'mulai' | 'selesai') {
  const relasi = posisi === 'mulai' ? item.surah_mulai : item.surah_selesai
  const nomor = posisi === 'mulai' ? item.surah_mulai_nomor : item.surah_selesai_nomor
  return relasi?.nama_latin || (nomor ? `Surah ${nomor}` : '-')
}

function nilaiAman(value: number | null | undefined) {
  const nilai = Number(value)
  return Number.isFinite(nilai) ? nilai : 0
}

function formatNilai(value: number | null | undefined) {
  return nilaiAman(value).toFixed(1).replace('.', ',')
}

function compareNilaiTerbaru(a: NilaiUjianGuru, b: NilaiUjianGuru) {
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

export default function RekapNilaiUjianGuru({ data, cakupanSantri, masterSegments, tajwidList, santriList, loading, error, onRefresh, kalenderAktifId }: Props) {
  const [filterKelas, setFilterKelas] = useState('semua')
  const [pencarianSantri, setPencarianSantri] = useState('')
  const [filterPeriode, setFilterPeriode] = useState('semua')
  const [filterTipe, setFilterTipe] = useState('semua')
  const appliedDefaultPeriode = useRef(false)
  const [showFilterLanjutan, setShowFilterLanjutan] = useState(false)
  const [filterGuru, setFilterGuru] = useState('semua')
  const [filterJuzAdv, setFilterJuzAdv] = useState('semua')
  const [filterSegmenAdv, setFilterSegmenAdv] = useState('semua')

  const [selectedSantriId, setSelectedSantriId] = useState<string | null>(null)
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null)
  const [showFormatLama, setShowFormatLama] = useState(false)
  const [riwayatSegmentId, setRiwayatSegmentId] = useState<string | null>(null)

  const surahNamaMap = useMemo(() => {
    const map = new Map<number, string>()
    masterSegments.forEach(seg => {
      if (seg.surah_awal) map.set(seg.surah_awal.nomor, seg.surah_awal.nama_latin)
      if (seg.surah_akhir) map.set(seg.surah_akhir.nomor, seg.surah_akhir.nama_latin)
    })
    return map
  }, [masterSegments])

  const namaSurahNomor = (nomor: number) => surahNamaMap.get(nomor) || `Surah ${nomor}`

  const periodeOptions = useMemo(() => {
    const options = new Map<string, string>()
    data.forEach(item => options.set(item.kalender_id || 'tanpa-periode', item.kalender?.nama || 'Tanpa Periode Kalender'))
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1], 'id'))
  }, [data])

  const tipeOptions = useMemo(() => [...new Set(data.map(item => item.tipe).filter((value): value is string => Boolean(value)))]
    .sort((a, b) => a.localeCompare(b, 'id')), [data])

  // Periode kalender_id yang paling baru (berdasarkan tanggal nilai) di antara data yang sudah
  // ada -- dipakai sebagai default rekap read-only ketika hari ini tidak sedang ada periode aktif.
  const periodeTerbaruId = useMemo(() => {
    const denganKalender = data.filter(item => item.kalender_id)
    if (denganKalender.length === 0) return null
    return [...denganKalender].sort(compareNilaiTerbaru)[0].kalender_id
  }, [data])

  // Default periode rekap: periode ujian aktif hari ini, atau periode terbaru yang sudah punya
  // nilai jika sedang tidak ada periode aktif. Guru tetap bebas mengganti dropdown setelahnya --
  // efek ini hanya diterapkan sekali saat salah satu sumber default pertama kali tersedia, supaya
  // pilihan manual guru tidak pernah ditimpa ulang.
  useEffect(() => {
    // setState dipanggil lewat fungsi async bertingkat (bukan langsung di badan efek) supaya
    // tidak terdeteksi sebagai "setState sinkron dalam efek" oleh react-hooks/set-state-in-effect
    // -- pola yang sama dipakai di AdminRekapNilaiUjian.tsx.
    async function terapkanDefaultPeriode() {
      if (appliedDefaultPeriode.current) return
      if (kalenderAktifId) {
        setFilterPeriode(kalenderAktifId)
        appliedDefaultPeriode.current = true
      } else if (periodeTerbaruId) {
        setFilterPeriode(periodeTerbaruId)
        appliedDefaultPeriode.current = true
      }
    }
    terapkanDefaultPeriode()
  }, [kalenderAktifId, periodeTerbaruId])

  const guruOptions = useMemo(() => {
    const options = new Map<string, string>()
    data.forEach(item => { if (item.guru?.id) options.set(item.guru.id, item.guru.nama) })
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1], 'id'))
  }, [data])

  const juzOptions = useMemo(() => [...new Set(masterSegments.map(s => s.juz))].sort((a, b) => b - a), [masterSegments])
  const segmenOptions = useMemo(() => [...new Set(masterSegments.map(s => s.segmen))].sort((a, b) => a - b), [masterSegments])

  const kelasOptions = useMemo(() => {
    const options = new Map<string, string>()
    santriList.forEach(santri => options.set(kelasKeySantri(santri), labelKelasSantri(santri)))
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1], 'id', { numeric: true }))
  }, [santriList])

  const filteredData = useMemo(() => data.filter(item => {
    const periodeKey = item.kalender_id || 'tanpa-periode'
    if (filterPeriode !== 'semua' && periodeKey !== filterPeriode) return false
    if (filterTipe !== 'semua' && item.tipe !== filterTipe) return false
    if (filterGuru !== 'semua' && item.guru_id !== filterGuru) return false
    if (filterJuzAdv !== 'semua' && item.segment?.juz !== Number(filterJuzAdv)) return false
    if (filterSegmenAdv !== 'semua' && item.segment?.segmen !== Number(filterSegmenAdv)) return false
    return true
  }), [data, filterPeriode, filterTipe, filterGuru, filterJuzAdv, filterSegmenAdv])

  const nilaiTerbaruPerSegmen = useMemo(() => {
    const map = new Map<string, NilaiUjianGuru>()
    ;[...filteredData]
      .filter(item => item.santri_id && item.segment_ujian_id && item.segment)
      .sort(compareNilaiTerbaru)
      .forEach(item => {
        const key = `${item.santri_id}|${item.segment_ujian_id}`
        if (!map.has(key)) map.set(key, item)
      })
    return map
  }, [filteredData])

  const percobaanCount = useMemo(() => {
    const map = new Map<string, number>()
    filteredData.forEach(item => {
      if (!item.santri_id || !item.segment_ujian_id) return
      const key = `${item.santri_id}|${item.segment_ujian_id}`
      map.set(key, (map.get(key) || 0) + 1)
    })
    return map
  }, [filteredData])

  const masterSegmentMap = useMemo(() => new Map(masterSegments.map(segment => [segment.id, segment])), [masterSegments])

  // Tajwid HANYA dicocokkan pada kalender_id yang eksplisit dipilih (filterPeriode) -- saat
  // filterPeriode bernilai 'semua' atau 'tanpa-periode' (bukan uuid kalender sungguhan), filter ini
  // otomatis kosong (Tajwid tidak pernah punya kalender_id NULL, jadi tidak pernah cocok dengan
  // "tanpa-periode"). Dipakai bersama gating `periodeTerpilih` di bawah supaya Tajwid juga tidak
  // pernah tercampur lintas periode (Rule D).
  const tajwidPerSantriJuz = useMemo(() => {
    const map = new Map<string, number>()
    tajwidList
      .filter(row => row.kalender_id === filterPeriode)
      .forEach(row => map.set(`${row.santri_id}|${row.juz}`, Number(row.nilai)))
    return map
  }, [tajwidList, filterPeriode])

  // Nilai Kelancaran per juz, Nilai Tajwid per juz, dan Nilai Ujian Keseluruhan HANYA dihitung saat
  // satu periode eksplisit dipilih (filterPeriode !== 'semua') -- memilih "Semua Periode" murni
  // untuk menelusuri riwayat mentah per percobaan, BUKAN untuk ringkasan/rata-rata (Rule D: jangan
  // lagi menghitung rangkuman dari kumpulan nilai lintas periode).
  const periodeTerpilih = filterPeriode !== 'semua'

  const santriRingkasan = useMemo(() => {
    return santriList
      .filter(santri => filterKelas === 'semua' || kelasKeySantri(santri) === filterKelas)
      .filter(santri => {
        const keyword = pencarianSantri.trim().toLocaleLowerCase('id')
        return !keyword || santri.nama.toLocaleLowerCase('id').includes(keyword)
      })
      .map(santri => {
        const cakupan = cakupanSantri[santri.id]
        const jumlahSegmenPerJuz = cakupan?.lengkap && periodeTerpilih ? cakupan.jumlahSegmenPerJuz : {}
        const juzList = Object.entries(jumlahSegmenPerJuz).map(([juzText, target]) => {
          const juz = Number(juzText)
          const segmentIds = masterSegments.filter(s => s.juz === juz && cakupan.segmentIds.includes(s.id)).map(s => s.id)
          const nilaiJuz = segmentIds
            .map(id => nilaiTerbaruPerSegmen.get(`${santri.id}|${id}`))
            .filter((item): item is NilaiUjianGuru => Boolean(item))
          const rata = nilaiJuz.length > 0 ? nilaiJuz.reduce((sum, item) => sum + nilaiAman(item.nilai_akhir), 0) / nilaiJuz.length : null
          const status: StatusJuz = nilaiJuz.length === 0 ? 'belum_dimulai' : nilaiJuz.length >= target ? 'selesai' : 'belum_selesai'
          const tajwid = tajwidPerSantriJuz.get(`${santri.id}|${juz}`) ?? null
          return { juz, target, dinilai: nilaiJuz.length, rata, status, segmentIds, tajwid }
        }).sort((a, b) => b.juz - a.juz)

        const juzDimulai = juzList.filter(j => j.status !== 'belum_dimulai').length
        const juzSelesai = juzList.filter(j => j.status === 'selesai').length
        // Nilai Ujian Keseluruhan = rata-rata Nilai Kelancaran HANYA juz 'selesai' (Rule F) --
        // helper canonical dari app/lib/adminNilaiUjian.ts, bukan rata-rata seluruh segmen langsung.
        const nilaiUjianKeseluruhan = periodeTerpilih ? hitungNilaiUjianKeseluruhan(juzList) : null
        const formatLama = filteredData
          .filter(item => item.santri_id === santri.id && !item.segment_ujian_id)
          .sort(compareNilaiTerbaru)

        return { santri, juzList, juzDimulai, juzSelesai, nilaiUjianKeseluruhan, formatLama }
      })
      .sort((a, b) => a.santri.nama.localeCompare(b.santri.nama, 'id'))
  }, [santriList, filterKelas, pencarianSantri, cakupanSantri, masterSegments, nilaiTerbaruPerSegmen, filteredData, tajwidPerSantriJuz, periodeTerpilih])

  const selectedSantriRingkasan = useMemo(
    () => santriRingkasan.find(item => item.santri.id === selectedSantriId) || null,
    [santriRingkasan, selectedSantriId]
  )

  const selectedJuzInfo = useMemo(() => {
    if (!selectedSantriRingkasan || selectedJuz === null) return null
    return selectedSantriRingkasan.juzList.find(item => item.juz === selectedJuz) || null
  }, [selectedSantriRingkasan, selectedJuz])

  const segmenDetailList = useMemo(() => {
    if (!selectedSantriRingkasan || !selectedJuzInfo) return []
    const cakupan = cakupanSantri[selectedSantriRingkasan.santri.id]
    return selectedJuzInfo.segmentIds
      .map(segId => {
        const master = masterSegmentMap.get(segId)
        if (!master) return null
        const info = cakupan?.segmenTersedia?.[segId]
        const parsial = info?.parsial || false
        const akhirSurahNomor = parsial && info ? info.akhirSurahNomor : master.surah_akhir_nomor
        const akhirAyat = parsial && info ? info.akhirAyat : master.ayat_akhir
        const key = `${selectedSantriRingkasan.santri.id}|${segId}`
        return {
          segmentId: segId,
          segmen: master.segmen,
          surahAwalNomor: master.surah_awal_nomor,
          ayatAwal: master.ayat_awal,
          surahAkhirNomor: akhirSurahNomor,
          ayatAkhir: akhirAyat,
          parsial,
          nilaiAktif: nilaiTerbaruPerSegmen.get(key) || null,
          jumlahPercobaan: percobaanCount.get(key) || 0,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.segmen - b.segmen)
  }, [selectedSantriRingkasan, selectedJuzInfo, cakupanSantri, masterSegmentMap, nilaiTerbaruPerSegmen, percobaanCount])

  const riwayatList = useMemo(() => {
    if (!riwayatSegmentId || !selectedSantriRingkasan) return []
    return data
      .filter(item => item.santri_id === selectedSantriRingkasan.santri.id && item.segment_ujian_id === riwayatSegmentId)
      .sort(compareNilaiTerbaru)
  }, [data, riwayatSegmentId, selectedSantriRingkasan])

  const riwayatSegmenInfo = segmenDetailList.find(item => item.segmentId === riwayatSegmentId) || null

  const pilihSantri = (santriId: string) => {
    setSelectedSantriId(santriId)
    setSelectedJuz(null)
    setShowFormatLama(false)
    setRiwayatSegmentId(null)
  }

  const kembaliKeDaftarSantri = () => {
    setSelectedSantriId(null)
    setSelectedJuz(null)
    setShowFormatLama(false)
    setRiwayatSegmentId(null)
  }

  const resetFilter = () => {
    setFilterKelas('semua')
    setPencarianSantri('')
    setFilterPeriode('semua')
    setFilterTipe('semua')
    setFilterGuru('semua')
    setFilterJuzAdv('semua')
    setFilterSegmenAdv('semua')
  }

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Rekap Nilai Ujian</h2>
          <p className="text-orange-200 text-sm mt-1">Santri → Juz → Detail Segmen</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

      {selectedSantriId === null && (
        <>
          <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Kelas</label>
                <select value={filterKelas} onChange={event => setFilterKelas(event.target.value)} className={inputClass}>
                  <option value="semua">Semua Kelas</option>
                  {kelasOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cari Santri</label>
                <input value={pencarianSantri} onChange={event => setPencarianSantri(event.target.value)}
                  placeholder="Cari nama santri..." className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Periode</label>
                <select value={filterPeriode} onChange={event => setFilterPeriode(event.target.value)} className={inputClass}>
                  <option value="semua">Semua Periode</option>
                  {periodeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipe Ujian</label>
                <select value={filterTipe} onChange={event => setFilterTipe(event.target.value)} className={inputClass}>
                  <option value="semua">Semua Tipe</option>
                  {tipeOptions.map(value => <option key={value} value={value}>{labelTipe(value)}</option>)}
                </select>
              </div>
            </div>

            <button type="button" onClick={() => setShowFilterLanjutan(value => !value)}
              className="mt-3 text-xs font-semibold text-orange-700">
              {showFilterLanjutan ? '▾' : '▸'} Filter Lanjutan
            </button>

            {showFilterLanjutan && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Guru Penginput</label>
                  <select value={filterGuru} onChange={event => setFilterGuru(event.target.value)} className={inputClass}>
                    <option value="semua">Semua Guru</option>
                    {guruOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Juz</label>
                  <select value={filterJuzAdv} onChange={event => setFilterJuzAdv(event.target.value)} className={inputClass}>
                    <option value="semua">Semua Juz</option>
                    {juzOptions.map(value => <option key={value} value={value}>Juz {value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Segmen</label>
                  <select value={filterSegmenAdv} onChange={event => setFilterSegmenAdv(event.target.value)} className={inputClass}>
                    <option value="semua">Semua Segmen</option>
                    {segmenOptions.map(value => <option key={value} value={value}>Segmen {value}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
              <p className="text-xs text-gray-500">{santriRingkasan.length} santri ditampilkan</p>
              <div className="flex gap-2">
                <button type="button" onClick={resetFilter} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold">Reset Filter</button>
                <button type="button" onClick={onRefresh} disabled={loading} className="px-3 py-2 rounded-lg bg-orange-100 text-orange-700 text-xs font-semibold disabled:opacity-50">{loading ? 'Memuat...' : 'Muat Ulang'}</button>
              </div>
            </div>
          </div>

          {!periodeTerpilih && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl mb-4 text-sm">
              Pilih satu Periode untuk melihat ringkasan Nilai Kelancaran, Nilai Tajwid, dan Nilai Ujian Keseluruhan per juz. &quot;Semua Periode&quot; hanya untuk menelusuri riwayat mentah per percobaan.
            </div>
          )}

          {loading && data.length === 0 ? (
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-10 text-center text-gray-400">Memuat rekap nilai ujian...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {santriRingkasan.map(({ santri, juzDimulai, juzSelesai, nilaiUjianKeseluruhan }) => (
                <button key={santri.id} type="button" onClick={() => pilihSantri(santri.id)}
                  className="text-left bg-white rounded-2xl shadow border border-gray-100 p-4 hover:border-orange-300 hover:shadow-md transition">
                  <div className="font-bold text-gray-800">{santri.nama}</div>
                  <div className="text-xs text-gray-500">{labelKelasSantri(santri)}</div>
                  {periodeTerpilih && (
                    <div className="mt-2 flex gap-4 text-sm">
                      <div><span className="font-bold text-orange-700">{juzDimulai}</span> <span className="text-gray-400 text-xs">juz dimulai</span></div>
                      <div><span className="font-bold text-green-700">{juzSelesai}</span> <span className="text-gray-400 text-xs">juz selesai</span></div>
                    </div>
                  )}
                  {nilaiUjianKeseluruhan !== null && (
                    <div className="mt-1 text-xs text-gray-500">Nilai Ujian Keseluruhan: <span className="font-semibold text-gray-700">{formatNilai(nilaiUjianKeseluruhan)}</span></div>
                  )}
                </button>
              ))}
              {santriRingkasan.length === 0 && (
                <div className="col-span-full bg-white rounded-2xl shadow border border-gray-100 p-10 text-center text-gray-400 text-sm">Tidak ada santri sesuai filter.</div>
              )}
            </div>
          )}
        </>
      )}

      {selectedSantriRingkasan && selectedJuz === null && (
        <>
          <button type="button" onClick={kembaliKeDaftarSantri} className="text-sm text-orange-700 font-semibold mb-3">← Kembali ke Daftar Santri</button>
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-4 mb-5">
            <div className="font-bold text-lg text-gray-800">{selectedSantriRingkasan.santri.nama}</div>
            <div className="text-xs text-gray-500">{labelKelasSantri(selectedSantriRingkasan.santri)}</div>
            {selectedSantriRingkasan.nilaiUjianKeseluruhan !== null && (
              <div className="mt-1 text-sm text-gray-600">Nilai Ujian Keseluruhan: <span className="font-bold text-orange-700">{formatNilai(selectedSantriRingkasan.nilaiUjianKeseluruhan)}</span></div>
            )}
          </div>

          {!periodeTerpilih && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl mb-4 text-sm">
              Pilih satu Periode untuk melihat ringkasan per juz.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            {selectedSantriRingkasan.juzList.map(item => (
              <button key={item.juz} type="button" onClick={() => setSelectedJuz(item.juz)}
                className="text-left bg-white rounded-2xl shadow border border-gray-100 p-4 hover:border-orange-300 hover:shadow-md transition">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-bold text-gray-800">Juz {item.juz}</div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="text-xs text-gray-500 mt-1">{item.dinilai} dari {item.target} segmen selesai</div>
                {item.rata !== null && (
                  <div className={`mt-2 text-lg font-bold ${item.status === 'selesai' ? 'text-green-700' : 'text-blue-700'}`}>
                    Nilai Kelancaran: {formatNilai(item.rata)}
                  </div>
                )}
                <div className="mt-1 text-xs text-gray-500">
                  Nilai Tajwid: <span className="font-semibold text-gray-700">{item.tajwid !== null ? formatNilai(item.tajwid) : '-'}</span>
                </div>
              </button>
            ))}
            {selectedSantriRingkasan.juzList.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl shadow border border-gray-100 p-8 text-center text-gray-400 text-sm">Belum ada juz yang dapat diuji untuk santri ini.</div>
            )}
          </div>

          {selectedSantriRingkasan.formatLama.length > 0 && (
            <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
              <button type="button" onClick={() => setShowFormatLama(value => !value)}
                className="w-full flex justify-between items-center p-4 text-left">
                <span className="font-semibold text-gray-700 text-sm">Riwayat Nilai Format Lama ({selectedSantriRingkasan.formatLama.length})</span>
                <span className="text-gray-400">{showFormatLama ? '▾' : '▸'}</span>
              </button>
              {showFormatLama && (
                <div className="border-t border-gray-100 p-4 space-y-2">
                  {selectedSantriRingkasan.formatLama.map(item => (
                    <div key={item.id} className="p-3 bg-gray-50 rounded-xl text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold text-gray-700">{formatTanggal(item.tanggal)} · {labelTipe(item.tipe)}</span>
                        <span className="font-bold text-orange-700 flex-shrink-0">{formatNilai(item.nilai_akhir)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 break-words">{namaSurahLama(item, 'mulai')} ayat {item.ayat_mulai ?? '-'} → {namaSurahLama(item, 'selesai')} ayat {item.ayat_selesai ?? '-'}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Guru: {item.guru?.nama || '-'}</div>
                      {item.catatan && <div className="text-xs text-gray-500 mt-1 italic break-words">&quot;{item.catatan}&quot;</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selectedSantriRingkasan && selectedJuz !== null && (
        <>
          <button type="button" onClick={() => setSelectedJuz(null)} className="text-sm text-orange-700 font-semibold mb-3">← Kembali ke Daftar Juz</button>
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-4 mb-5 flex justify-between items-center gap-3">
            <div className="min-w-0">
              <div className="font-bold text-lg text-gray-800">Juz {selectedJuz}</div>
              <div className="text-xs text-gray-500 truncate">{selectedSantriRingkasan.santri.nama}</div>
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
                      <div className="text-xl font-bold text-green-700">{formatNilai(seg.nilaiAktif.nilai_akhir)}</div>
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
                {seg.jumlahPercobaan > 0 && (
                  <button type="button" onClick={() => setRiwayatSegmentId(seg.segmentId)}
                    className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700">
                    Detail Riwayat ({seg.jumlahPercobaan} percobaan)
                  </button>
                )}
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
          <div className="bg-white w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="sticky top-0 px-5 py-4 flex justify-between items-center text-white" style={{ background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)' }}>
              <div>
                <h3 className="font-bold text-lg">Riwayat Percobaan</h3>
                <p className="text-orange-200 text-xs">{riwayatSegmenInfo ? `Segmen ${riwayatSegmenInfo.segmen}` : ''}</p>
              </div>
              <button type="button" onClick={() => setRiwayatSegmentId(null)} className="text-2xl leading-none" aria-label="Tutup riwayat">×</button>
            </div>
            <div className="p-5 space-y-3">
              {riwayatList.map((item, index) => (
                <div key={item.id} className={`p-3 rounded-xl text-sm ${index === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-gray-700">{formatTanggal(item.tanggal)}{index === 0 && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold align-middle">Nilai Aktif</span>}</span>
                    <span className="font-bold text-orange-700 flex-shrink-0">{formatNilai(item.nilai_akhir)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Guru: {item.guru?.nama || '-'} · {formatWaktu(item.created_at)}</div>
                  <div className="text-xs text-gray-500 mt-1">Tegur: {item.jumlah_tegur ?? 0} · Diberi tahu: {item.jumlah_tahu_ayat ?? 0} · Lupa: {item.jumlah_lupa ?? 0}</div>
                  {item.catatan && <div className="text-xs text-gray-500 mt-1 italic break-words">&quot;{item.catatan}&quot;</div>}
                </div>
              ))}
              {riwayatList.length === 0 && <div className="text-center text-gray-400 text-sm py-6">Belum ada percobaan.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
