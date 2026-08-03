'use client'

import { useMemo, useState } from 'react'

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

export type CakupanSantriMap = Record<string, {
  lengkap: boolean
  segmentIds: string[]
  jumlahSegmenPerJuz: Record<string, number>
}>

type Props = {
  data: NilaiUjianGuru[]
  cakupanSantri: CakupanSantriMap
  santriList: Array<{
    id: string
    nama: string
    kelas?: string | null
    kelas_num?: number | null
    jenis_kelas?: string | null
  }>
  loading: boolean
  error: string
  onRefresh: () => void
}

const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300'

function labelJenjang(value: string | null | undefined) {
  if (value === 'ula') return 'Ula'
  if (value === 'wustha') return 'Wustha'
  if (value === 'ulya') return 'Ulya'
  return value || '-'
}

function labelKelompok(value: string | null | undefined) {
  if (value === 'banin') return 'Banin'
  if (value === 'banat') return 'Banat'
  if (value === 'tn_a') return 'TN A'
  if (value === 'tn_b') return 'TN B'
  return value || '-'
}

function labelKelas(item: NilaiUjianGuru) {
  if (item.santri?.kelas) return item.santri.kelas
  const kelas = item.santri?.kelas_num ? `Kelas ${item.santri.kelas_num}` : 'Kelas -'
  return `${kelas} ${labelKelompok(item.santri?.jenis_kelas)}`
}

function labelKelasSantri(santri: Props['santriList'][number]) {
  if (santri.kelas) return santri.kelas
  const kelas = santri.kelas_num ? `Kelas ${santri.kelas_num}` : 'Kelas -'
  return `${kelas} ${labelKelompok(santri.jenis_kelas)}`
}

function kelasKey(item: NilaiUjianGuru) {
  return [item.santri?.jenjang || '', item.santri?.kelas_num || '', item.santri?.jenis_kelas || ''].join('|')
}

function formatTanggal(value: string | null | undefined) {
  if (!value) return '-'
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Date(year, month - 1, day).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatWaktu(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WIB'
}

function labelTipe(value: string | null | undefined) {
  if (value === 'mid_semester') return 'Mid Semester'
  if (value === 'semester') return 'Semester'
  return value ? value.replaceAll('_', ' ') : '-'
}

function namaSurah(item: NilaiUjianGuru, posisi: 'mulai' | 'selesai') {
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

function DetailRow({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-gray-100 last:border-0 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-semibold text-gray-800 break-words">{value}</div>
    </div>
  )
}

export default function RekapNilaiUjianGuru({ data, cakupanSantri, santriList, loading, error, onRefresh }: Props) {
  const [filterPeriode, setFilterPeriode] = useState('semua')
  const [filterTipe, setFilterTipe] = useState('semua')
  const [filterKelas, setFilterKelas] = useState('semua')
  const [filterSantri, setFilterSantri] = useState('semua')
  const [filterGuru, setFilterGuru] = useState('semua')
  const [filterJuz, setFilterJuz] = useState('semua')
  const [filterSegmen, setFilterSegmen] = useState('semua')
  const [filterFormat, setFilterFormat] = useState('semua')
  const [pencarian, setPencarian] = useState('')
  const [detail, setDetail] = useState<NilaiUjianGuru | null>(null)

  const periodeOptions = useMemo(() => {
    const options = new Map<string, string>()
    data.forEach(item => options.set(item.kalender_id || 'tanpa-periode', item.kalender?.nama || 'Tanpa Periode Kalender'))
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1], 'id'))
  }, [data])

  const tipeOptions = useMemo(() => [...new Set(data.map(item => item.tipe).filter((value): value is string => Boolean(value)))]
    .sort((a, b) => a.localeCompare(b, 'id')), [data])

  const kelasOptions = useMemo(() => {
    const options = new Map<string, string>()
    data.forEach(item => options.set(kelasKey(item), labelKelas(item)))
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1], 'id', { numeric: true }))
  }, [data])

  const santriOptions = useMemo(() => {
    const options = new Map<string, string>()
    data.forEach(item => { if (item.santri?.id) options.set(item.santri.id, item.santri.nama) })
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1], 'id'))
  }, [data])

  const guruOptions = useMemo(() => {
    const options = new Map<string, string>()
    data.forEach(item => { if (item.guru?.id) options.set(item.guru.id, item.guru.nama) })
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1], 'id'))
  }, [data])

  const juzOptions = useMemo(() => [...new Set(data.map(item => item.segment?.juz).filter((value): value is number => Number.isInteger(value)))]
    .sort((a, b) => b - a), [data])
  const segmenOptions = useMemo(() => [...new Set(data.map(item => item.segment?.segmen).filter((value): value is number => Number.isInteger(value)))]
    .sort((a, b) => a - b), [data])

  const hasil = useMemo(() => {
    const keyword = pencarian.trim().toLocaleLowerCase('id')
    return data.filter(item => {
      const periodeKey = item.kalender_id || 'tanpa-periode'
      if (filterPeriode !== 'semua' && periodeKey !== filterPeriode) return false
      if (filterTipe !== 'semua' && item.tipe !== filterTipe) return false
      if (filterKelas !== 'semua' && kelasKey(item) !== filterKelas) return false
      if (filterSantri !== 'semua' && item.santri_id !== filterSantri) return false
      if (filterGuru !== 'semua' && item.guru_id !== filterGuru) return false
      if (filterJuz !== 'semua' && item.segment?.juz !== Number(filterJuz)) return false
      if (filterSegmen !== 'semua' && item.segment?.segmen !== Number(filterSegmen)) return false
      if (filterFormat === 'lama' && item.segment_ujian_id) return false
      if (filterFormat === 'segmentasi' && !item.segment_ujian_id) return false
      if (keyword) {
        const teks = `${item.santri?.nama || ''} ${item.guru?.nama || ''} ${labelKelas(item)} ${item.segment?.juz || ''} ${item.segment?.segmen || ''}`.toLocaleLowerCase('id')
        if (!teks.includes(keyword)) return false
      }
      return true
    })
  }, [data, filterPeriode, filterTipe, filterKelas, filterSantri, filterGuru, filterJuz, filterSegmen, filterFormat, pencarian])

  const ringkasanJuz = useMemo(() => {
    const terbaru = new Map<string, NilaiUjianGuru>()
    data.filter(item => item.santri_id && item.segment_ujian_id && item.segment)
      .sort(compareNilaiTerbaru)
      .forEach(item => {
        const key = `${item.santri_id}|${item.segment_ujian_id}`
        if (!terbaru.has(key)) terbaru.set(key, item)
      })

    return santriList.flatMap(santri => {
      const santriId = santri.id
      const cakupan = cakupanSantri[santriId]
      if (!cakupan?.lengkap) return []
      return Object.entries(cakupan.jumlahSegmenPerJuz)
        .map(([juzText, target]) => {
          const juz = Number(juzText)
          const nilai = [...terbaru.values()].filter(item => item.santri_id === santriId && item.segment?.juz === juz)
          const rata = nilai.length > 0 ? nilai.reduce((total, item) => total + nilaiAman(item.nilai_akhir), 0) / nilai.length : null
          return { santriId, nama: santri.nama, juz, target, dinilai: nilai.length, rata, kelas: labelKelasSantri(santri) }
        })
        .sort((a, b) => b.juz - a.juz)
    })
  }, [data, cakupanSantri, santriList])

  const resetFilter = () => {
    setFilterPeriode('semua')
    setFilterTipe('semua')
    setFilterKelas('semua')
    setFilterSantri('semua')
    setFilterGuru('semua')
    setFilterJuz('semua')
    setFilterSegmen('semua')
    setFilterFormat('semua')
    setPencarian('')
  }

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Rekap Nilai Ujian</h2>
          <p className="text-orange-200 text-sm mt-1">Histori seluruh percobaan dan nilai aktif per segmen</p>
        </div>
      </div>

      {ringkasanJuz.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3">Ringkasan Nilai per Juz</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
            {ringkasanJuz.map(item => (
              <div key={`${item.santriId}-${item.juz}`} className="rounded-xl border border-orange-100 bg-orange-50/50 p-3">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-800 truncate">{item.nama}</div>
                    <div className="text-xs text-gray-500">{item.kelas} · Juz {item.juz}</div>
                  </div>
                  <div className="text-xl font-bold text-orange-700">{item.rata === null ? '–' : formatNilai(item.rata)}</div>
                </div>
                <div className="mt-2 text-xs font-semibold text-gray-600">
                  {item.dinilai === 0 ? 'Belum dimulai' : item.dinilai >= item.target ? `${item.target}/${item.target} selesai` : `${item.dinilai}/${item.target} segmen`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div><label className="block text-xs text-gray-500 mb-1">Periode</label><select value={filterPeriode} onChange={event => setFilterPeriode(event.target.value)} className={inputClass}><option value="semua">Semua Periode</option>{periodeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Tipe Ujian</label><select value={filterTipe} onChange={event => setFilterTipe(event.target.value)} className={inputClass}><option value="semua">Semua Tipe</option>{tipeOptions.map(value => <option key={value} value={value}>{labelTipe(value)}</option>)}</select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Kelas</label><select value={filterKelas} onChange={event => setFilterKelas(event.target.value)} className={inputClass}><option value="semua">Semua Kelas yang Diakses</option>{kelasOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Santri</label><select value={filterSantri} onChange={event => setFilterSantri(event.target.value)} className={inputClass}><option value="semua">Semua Santri</option>{santriOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Guru Penginput</label><select value={filterGuru} onChange={event => setFilterGuru(event.target.value)} className={inputClass}><option value="semua">Semua Guru pada Hasil</option>{guruOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Juz</label><select value={filterJuz} onChange={event => setFilterJuz(event.target.value)} className={inputClass}><option value="semua">Semua Juz</option>{juzOptions.map(value => <option key={value} value={value}>Juz {value}</option>)}</select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Segmen</label><select value={filterSegmen} onChange={event => setFilterSegmen(event.target.value)} className={inputClass}><option value="semua">Semua Segmen</option>{segmenOptions.map(value => <option key={value} value={value}>Segmen {value}</option>)}</select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Format</label><select value={filterFormat} onChange={event => setFilterFormat(event.target.value)} className={inputClass}><option value="semua">Semua Format</option><option value="segmentasi">Segmentasi</option><option value="lama">Format Lama</option></select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Pencarian</label><input value={pencarian} onChange={event => setPencarian(event.target.value)} placeholder="Cari santri, guru, kelas, juz..." className={inputClass} /></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
          <p className="text-xs text-gray-500">{hasil.length} dari {data.length} percobaan ditampilkan</p>
          <div className="flex gap-2">
            <button type="button" onClick={resetFilter} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold">Reset Filter</button>
            <button type="button" onClick={onRefresh} disabled={loading} className="px-3 py-2 rounded-lg bg-orange-100 text-orange-700 text-xs font-semibold disabled:opacity-50">{loading ? 'Memuat...' : 'Muat Ulang'}</button>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

      {loading && data.length === 0 ? (
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-10 text-center text-gray-400">Memuat rekap nilai ujian...</div>
      ) : hasil.length === 0 ? (
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-10 text-center text-gray-400">Belum ada nilai yang sesuai filter.</div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1380px] text-sm">
                <thead className="bg-orange-50 text-orange-900"><tr>{['Nama Santri', 'Kelas', 'Guru Penginput', 'Tanggal', 'Format', 'Juz / Segmen', 'Rentang Surah dan Ayat', 'Teguran', 'Diberi Tahu', 'Lupa', 'Nilai', 'Aksi'].map(label => <th key={label} className="px-3 py-3 text-left font-semibold whitespace-nowrap">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {hasil.map(item => (
                    <tr key={item.id} className="hover:bg-orange-50/40">
                      <td className="px-3 py-3 font-semibold text-gray-800">{item.santri?.nama || '-'}</td>
                      <td className="px-3 py-3 text-gray-600">{labelKelas(item)}</td>
                      <td className="px-3 py-3 text-gray-600">{item.guru?.nama || '-'}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatTanggal(item.tanggal)}</td>
                      <td className="px-3 py-3">{item.segment ? <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Segmentasi</span> : <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">Format Lama</span>}</td>
                      <td className="px-3 py-3 font-semibold text-gray-700">{item.segment ? `Juz ${item.segment.juz} · Segmen ${item.segment.segmen}` : '-'}</td>
                      <td className="px-3 py-3 text-gray-600">{namaSurah(item, 'mulai')} ayat {item.ayat_mulai ?? '-'} → {namaSurah(item, 'selesai')} ayat {item.ayat_selesai ?? '-'}</td>
                      <td className="px-3 py-3 text-center">{item.jumlah_tegur ?? 0}</td><td className="px-3 py-3 text-center">{item.jumlah_tahu_ayat ?? 0}</td><td className="px-3 py-3 text-center">{item.jumlah_lupa ?? 0}</td>
                      <td className="px-3 py-3 font-bold text-orange-700">{formatNilai(item.nilai_akhir)}</td>
                      <td className="px-3 py-3"><button type="button" onClick={() => setDetail(item)} className="px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 text-xs font-semibold hover:bg-orange-200">Detail</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {hasil.map(item => (
              <div key={item.id} className="bg-white rounded-2xl shadow border border-gray-100 p-4 overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="font-bold text-gray-800 break-words">{item.santri?.nama || '-'}</div><div className="text-xs text-gray-500 mt-0.5">{labelKelas(item)}</div><div className="text-xs text-gray-500">Guru: {item.guru?.nama || '-'}</div></div>
                  <div className="text-2xl font-bold text-orange-700 flex-shrink-0">{formatNilai(item.nilai_akhir)}</div>
                </div>
                <div className="mt-3 text-sm text-gray-600 space-y-1">
                  <div className="flex flex-wrap gap-2 items-center"><span>{formatTanggal(item.tanggal)}</span>{item.segment ? <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Juz {item.segment.juz} · Segmen {item.segment.segmen}</span> : <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">Format Lama</span>}</div>
                  <div className="break-words">{namaSurah(item, 'mulai')} ayat {item.ayat_mulai ?? '-'} → {namaSurah(item, 'selesai')} ayat {item.ayat_selesai ?? '-'}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500"><span>Tegur: {item.jumlah_tegur ?? 0}</span><span>Diberi tahu: {item.jumlah_tahu_ayat ?? 0}</span><span>Lupa: {item.jumlah_lupa ?? 0}</span></div>
                </div>
                <button type="button" onClick={() => setDetail(item)} className="w-full mt-3 px-3 py-2 rounded-xl bg-orange-100 text-orange-700 text-sm font-semibold">Detail</button>
              </div>
            ))}
          </div>
        </>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setDetail(null)}>
          <div className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="sticky top-0 px-5 py-4 flex justify-between items-center text-white" style={{ background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)' }}>
              <div><h3 className="font-bold text-lg">Detail Nilai Ujian</h3><p className="text-orange-200 text-xs">Histori percobaan tersimpan read-only</p></div>
              <button type="button" onClick={() => setDetail(null)} className="text-2xl leading-none" aria-label="Tutup detail">×</button>
            </div>
            <div className="p-5">
              <DetailRow label="Nama Santri" value={detail.santri?.nama || '-'} /><DetailRow label="Jenjang" value={labelJenjang(detail.santri?.jenjang)} /><DetailRow label="Kelas" value={labelKelas(detail)} /><DetailRow label="Guru Penginput" value={detail.guru?.nama || '-'} /><DetailRow label="Tanggal" value={formatTanggal(detail.tanggal)} /><DetailRow label="Kalender" value={detail.kalender?.nama || 'Tanpa Periode Kalender'} /><DetailRow label="Tipe Ujian" value={labelTipe(detail.tipe)} />
              <DetailRow label="Format" value={detail.segment ? 'Segmentasi' : 'Format Lama'} />
              {detail.segment && <><DetailRow label="Juz" value={detail.segment.juz} /><DetailRow label="Segmen" value={detail.segment.segmen} /><DetailRow label="Halaman" value={`${detail.segment.halaman_awal}–${detail.segment.halaman_akhir}`} /></>}
              <DetailRow label="Rentang" value={`${namaSurah(detail, 'mulai')} ayat ${detail.ayat_mulai ?? '-'} → ${namaSurah(detail, 'selesai')} ayat ${detail.ayat_selesai ?? '-'}`} /><DetailRow label="Jumlah Teguran" value={detail.jumlah_tegur ?? 0} /><DetailRow label="Diberi Tahu" value={detail.jumlah_tahu_ayat ?? 0} /><DetailRow label="Jumlah Lupa" value={detail.jumlah_lupa ?? 0} /><DetailRow label="Nilai Akhir" value={formatNilai(detail.nilai_akhir)} /><DetailRow label="Catatan" value={detail.catatan || '-'} /><DetailRow label="Waktu Input" value={formatWaktu(detail.created_at)} />
              <div className="mt-5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm">Jika terdapat kesalahan input, silakan hubungi Admin.</div>
              <button type="button" onClick={() => setDetail(null)} className="w-full mt-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
