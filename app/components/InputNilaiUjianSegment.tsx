'use client'

import { useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { validasiNilaiTajwid } from '../lib/adminNilaiUjian'

type TajwidInfo = {
  nilai: number
  guru_id: string
  updated_at: string
}

type SantriUjian = {
  id: string
  nama: string
  kelas?: string | null
  kelas_num?: number | null
  jenjang?: string | null
  jenis_kelas?: string | null
  total_hafalan_juz?: number | null
}

type NilaiTerakhir = {
  id: string
  segment_ujian_id: string
  nilai_akhir: number
  tanggal: string
  created_at: string
}

type SegmentUjian = {
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
  nilai_terakhir: NilaiTerakhir | null
  parsial?: boolean
}

type Props = {
  // "Santri Saya" (guru_id/guru_id_2) -- prioritas tampilan urutan atas.
  // guru_id/guru_id_2 TIDAK LAGI authorization gate Nilai Ujian (URGENT FIX),
  // tapi tetap dipakai untuk membedakan prioritas UI ini.
  santriSaya: SantriUjian[]
  // Santri aktif lain dalam wing (jenis_kelas) yang sama, di luar Santri Saya
  // -- server (app/api/nilai-ujian) tetap memvalidasi ulang wing ini secara
  // independen, daftar di sini murni untuk kenyamanan pencarian.
  santriLain: SantriUjian[]
}

const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300'

function nilaiSementara(tegur: string, tahuAyat: string, lupa: string) {
  const jumlahTegur = Number.parseInt(tegur, 10) || 0
  const jumlahTahuAyat = Number.parseInt(tahuAyat, 10) || 0
  const jumlahLupa = Number.parseInt(lupa, 10) || 0
  const nilai = 10 - (jumlahTegur * 0.1) - (jumlahTahuAyat * 0.1) - jumlahLupa
  // Phase C: nilai maksimum resmi 10.0
  return Math.min(10, Math.max(5, Math.round(nilai * 10) / 10))
}

function namaSurah(segment: SegmentUjian, posisi: 'awal' | 'akhir') {
  const relasi = posisi === 'awal' ? segment.surah_awal : segment.surah_akhir
  const nomor = posisi === 'awal' ? segment.surah_awal_nomor : segment.surah_akhir_nomor
  return relasi?.nama_latin || `Surah ${nomor}`
}

function kelasSantri(santri: SantriUjian) {
  if (santri.kelas) return santri.kelas
  const kelompok = santri.jenis_kelas ? ` ${santri.jenis_kelas.toUpperCase()}` : ''
  return santri.kelas_num ? `Kelas ${santri.kelas_num}${kelompok}` : '-'
}

type StatusJuz = 'belum_dimulai' | 'belum_selesai' | 'selesai'

function StatusJuzBadge({ status }: { status: StatusJuz }) {
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

export default function InputNilaiUjianSegment({ santriSaya, santriLain }: Props) {
  const [selectedSantri, setSelectedSantri] = useState<SantriUjian | null>(null)
  const [searchSantri, setSearchSantri] = useState('')
  const [segments, setSegments] = useState<SegmentUjian[]>([])
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null)
  const [expandedSegmentId, setExpandedSegmentId] = useState<string | null>(null)
  const [jumlahTegur, setJumlahTegur] = useState('0')
  const [jumlahTahuAyat, setJumlahTahuAyat] = useState('0')
  const [jumlahLupa, setJumlahLupa] = useState('0')
  const [catatan, setCatatan] = useState('')
  const [loadingSegments, setLoadingSegments] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmUjiUlang, setConfirmUjiUlang] = useState<SegmentUjian | null>(null)
  const submitLockRef = useRef(false)

  // Nilai Tajwid: satu nilai per juz (bukan per segmen), dimuat sekaligus saat santri dipilih
  // (lihat GET /api/nilai-ujian?santri_id=... yang sekarang menyertakan `tajwid` + `juzBelumTajwid`).
  const [tajwidMap, setTajwidMap] = useState<Record<number, TajwidInfo>>({})
  const [juzBelumTajwid, setJuzBelumTajwid] = useState<number[]>([])
  const [tajwidJuzTerakhir, setTajwidJuzTerakhir] = useState<number | null>(null)
  const [tajwidInputValue, setTajwidInputValue] = useState('')
  const [savingTajwid, setSavingTajwid] = useState(false)
  const [tajwidError, setTajwidError] = useState('')
  const [tajwidSuccess, setTajwidSuccess] = useState('')
  // Popup setelah segmen terakhir suatu juz baru saja selesai (Rule G) -- guru boleh menutupnya
  // ("Nanti") tanpa mengisi, juz tetap dianggap selesai dari sisi Kelancaran.
  const [showTajwidModal, setShowTajwidModal] = useState<number | null>(null)
  const [modalTajwidInputValue, setModalTajwidInputValue] = useState('')
  const [savingModalTajwid, setSavingModalTajwid] = useState(false)
  const [modalTajwidError, setModalTajwidError] = useState('')

  const idSantriSaya = useMemo(() => new Set(santriSaya.map(santri => santri.id)), [santriSaya])

  // Santri Saya diprioritaskan di urutan atas (baik saat kosong maupun saat
  // dicari); santri lain dalam wing yang sama menyusul di bawahnya.
  const santriTampil = useMemo(() => {
    const keyword = searchSantri.trim().toLocaleLowerCase('id')
    if (!keyword) return santriSaya
    const cocokSaya = santriSaya.filter(santri => santri.nama.toLocaleLowerCase('id').includes(keyword))
    const cocokLain = santriLain.filter(santri => santri.nama.toLocaleLowerCase('id').includes(keyword))
    return [...cocokSaya, ...cocokLain]
  }, [santriSaya, santriLain, searchSantri])

  const daftarJuz = useMemo(() => {
    return [...new Set(segments.map(segment => segment.juz))].sort((a, b) => b - a)
  }, [segments])

  const indexJuz = selectedJuz === null ? -1 : daftarJuz.indexOf(selectedJuz)
  const segmentsJuz = segments.filter(segment => segment.juz === selectedJuz)
  const nilaiPreview = nilaiSementara(jumlahTegur, jumlahTahuAyat, jumlahLupa)

  const ringkasanJuzAktif = useMemo(() => {
    if (segmentsJuz.length === 0) return null
    const dinilai = segmentsJuz.filter(segment => segment.nilai_terakhir).length
    const target = segmentsJuz.length
    const rata = dinilai > 0
      ? segmentsJuz
          .filter(segment => segment.nilai_terakhir)
          .reduce((sum, segment) => sum + Number(segment.nilai_terakhir?.nilai_akhir || 0), 0) / dinilai
      : null
    const status: StatusJuz = dinilai === 0 ? 'belum_dimulai' : dinilai >= target ? 'selesai' : 'belum_selesai'
    return { target, dinilai, rata, status }
  }, [segmentsJuz])

  // Sinkronkan input Nilai Tajwid dengan nilai existing setiap kali juz aktif berganti (pola
  // "adjust state during render", bukan useEffect -- lihat dokumentasi React tentang derived state).
  if (selectedJuz !== tajwidJuzTerakhir) {
    setTajwidJuzTerakhir(selectedJuz)
    setTajwidInputValue(selectedJuz !== null && tajwidMap[selectedJuz] ? String(tajwidMap[selectedJuz].nilai) : '')
    setTajwidError('')
    setTajwidSuccess('')
  }

  const resetInput = () => {
    setExpandedSegmentId(null)
    setJumlahTegur('0')
    setJumlahTahuAyat('0')
    setJumlahLupa('0')
    setCatatan('')
  }

  const pilihSantri = async (santri: SantriUjian) => {
    setSelectedSantri(santri)
    setSearchSantri(santri.nama)
    setSegments([])
    setSelectedJuz(null)
    setTajwidMap({})
    setJuzBelumTajwid([])
    resetInput()
    setError('')
    setSuccess('')
    setLoadingSegments(true)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Sesi login sudah berakhir. Silakan login kembali.')
      const response = await fetch(`/api/nilai-ujian?santri_id=${encodeURIComponent(santri.id)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 401) throw new Error('Sesi login tidak valid atau sudah berakhir.')
        if (response.status === 403) throw new Error('Santri bukan tanggung jawab Anda atau akses ditolak.')
        throw new Error(result.error || 'Gagal memuat segmen ujian.')
      }

      const daftar = Array.isArray(result.data) ? result.data as SegmentUjian[] : []
      setSegments(daftar)
      const juzPertama = [...new Set(daftar.map(segment => segment.juz))].sort((a, b) => b - a)[0]
      setSelectedJuz(juzPertama ?? null)
      setTajwidMap(result.tajwid && typeof result.tajwid === 'object' ? result.tajwid : {})
      setJuzBelumTajwid(Array.isArray(result.juzBelumTajwid) ? result.juzBelumTajwid : [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat segmen ujian.')
    } finally {
      setLoadingSegments(false)
    }
  }

  const bukaSegment = (segmentId: string) => {
    if (expandedSegmentId === segmentId) {
      resetInput()
      return
    }
    setExpandedSegmentId(segmentId)
    setJumlahTegur('0')
    setJumlahTahuAyat('0')
    setJumlahLupa('0')
    setCatatan('')
    setError('')
    setSuccess('')
  }

  const simpanNilai = async (segment: SegmentUjian) => {
    if (!selectedSantri || submitLockRef.current) return
    submitLockRef.current = true
    setSaving(true)
    setError('')
    setSuccess('')

    // Ditangkap SEBELUM request supaya bisa mendeteksi transisi belum-selesai -> selesai akibat
    // save ini secara spesifik (Rule G) -- bukan setiap kali segmen pada juz yang SUDAH selesai
    // diuji ulang.
    const segmenBelumDinilaiSebelumnya = !segment.nilai_terakhir
    const dinilaiSebelum = segmentsJuz.filter(item => item.nilai_terakhir).length
    const targetSebelum = segmentsJuz.length

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Sesi login sudah berakhir. Silakan login kembali.')
      const response = await fetch('/api/nilai-ujian', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          santri_id: selectedSantri.id,
          segment_ujian_id: segment.id,
          jumlah_tegur: Number.parseInt(jumlahTegur, 10) || 0,
          jumlah_tahu_ayat: Number.parseInt(jumlahTahuAyat, 10) || 0,
          jumlah_lupa: Number.parseInt(jumlahLupa, 10) || 0,
          catatan: catatan || null,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 401) throw new Error('Sesi login tidak valid atau sudah berakhir.')
        if (response.status === 403) throw new Error(result.error || 'Akses penyimpanan nilai ditolak.')
        throw new Error(result.error || 'Gagal menyimpan nilai ujian.')
      }

      setSegments(current => current.map(item => item.id === segment.id
        ? { ...item, nilai_terakhir: result.data || { ...item.nilai_terakhir, nilai_akhir: result.nilai_akhir } }
        : item))
      setSuccess(`Nilai Juz ${segment.juz} Segmen ${segment.segmen} berhasil disimpan: ${result.nilai_akhir}`)
      resetInput()

      const barusSelesai = segmenBelumDinilaiSebelumnya && targetSebelum > 0 && (dinilaiSebelum + 1) >= targetSebelum
      if (barusSelesai) {
        setModalTajwidInputValue(tajwidMap[segment.juz] ? String(tajwidMap[segment.juz].nilai) : '')
        setModalTajwidError('')
        setShowTajwidModal(segment.juz)
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Gagal menyimpan nilai ujian.')
    } finally {
      submitLockRef.current = false
      setSaving(false)
    }
  }

  const ubahHitungan = (value: string, setter: (value: string) => void, delta: number) => {
    setter(String(Math.max(0, (Number.parseInt(value, 10) || 0) + delta)))
  }

  const handleSimpanClick = (segment: SegmentUjian) => {
    if (segment.nilai_terakhir) {
      setConfirmUjiUlang(segment)
      return
    }
    simpanNilai(segment)
  }

  const lanjutkanUjiUlang = () => {
    if (!confirmUjiUlang) return
    const segment = confirmUjiUlang
    setConfirmUjiUlang(null)
    simpanNilai(segment)
  }

  // Simpan/edit Nilai Tajwid (satu nilai per juz, upsert -- PUT /api/nilai-ujian). Dipakai baik dari
  // blok ringkasan juz maupun dari popup setelah segmen terakhir (Rule F/G) -- keduanya menyimpan ke
  // juz + periode ujian aktif yang sama, hanya berbeda sumber input dan indikator loading/error.
  const simpanTajwid = async (juz: number, nilaiInput: string, sumber: 'blok' | 'modal') => {
    const setSaving = sumber === 'modal' ? setSavingModalTajwid : setSavingTajwid
    const setErr = sumber === 'modal' ? setModalTajwidError : setTajwidError
    if (!selectedSantri) return

    const nilai = validasiNilaiTajwid(nilaiInput.replace(',', '.'))
    if (nilai === null) {
      setErr('Nilai Tajwid harus berupa angka 0,0-9,5.')
      return
    }

    setSaving(true)
    setErr('')
    if (sumber === 'blok') setTajwidSuccess('')

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Sesi login sudah berakhir. Silakan login kembali.')
      const response = await fetch('/api/nilai-ujian', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ santri_id: selectedSantri.id, juz, nilai }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 401) throw new Error('Sesi login tidak valid atau sudah berakhir.')
        if (response.status === 403) throw new Error(result.error || 'Akses penyimpanan nilai Tajwid ditolak.')
        throw new Error(result.error || 'Gagal menyimpan nilai Tajwid.')
      }

      setTajwidMap(current => ({ ...current, [juz]: result.data }))
      setJuzBelumTajwid(current => current.filter(item => item !== juz))
      if (sumber === 'blok') {
        setTajwidSuccess(`Nilai Tajwid Juz ${juz} berhasil disimpan: ${nilai.toFixed(1)}`)
      } else {
        setShowTajwidModal(null)
      }
    } catch (saveError) {
      setErr(saveError instanceof Error ? saveError.message : 'Gagal menyimpan nilai Tajwid.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-4 sm:p-5 border border-gray-100 mb-5">
      <h3 className="font-bold text-gray-800 mb-4">Pilih Santri dan Segmen Ujian</h3>
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Santri</label>
        {!searchSantri && (
          <p className="text-xs text-gray-400 mb-2">
            {santriSaya.length > 0 ? 'Santri Saya' : 'Belum ada Santri Saya -- cari santri lain di kolom di bawah'}
          </p>
        )}
        <input type="text" value={searchSantri} onChange={event => {
          setSearchSantri(event.target.value)
          if (selectedSantri && event.target.value !== selectedSantri.nama) {
            setSelectedSantri(null)
            setSegments([])
            setSelectedJuz(null)
            setTajwidMap({})
            setJuzBelumTajwid([])
            resetInput()
          }
        }} placeholder="Cari nama santri, termasuk santri lain..." className={`${inputClass} mb-2`} />
        {searchSantri !== selectedSantri?.nama && (
          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            {santriTampil.map(santri => (
              <button key={santri.id} type="button" onClick={() => pilihSantri(santri)}
                className="w-full text-left px-4 py-2.5 hover:bg-orange-50 border-b last:border-0 text-sm">
                <span className="font-medium">{santri.nama}</span>
                <span className="text-gray-400 text-xs ml-2">{kelasSantri(santri)}</span>
                {!idSantriSaya.has(santri.id) && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Santri Lain</span>
                )}
              </button>
            ))}
            {santriTampil.length === 0 && <div className="px-4 py-3 text-sm text-gray-400">Tidak ditemukan</div>}
          </div>
        )}
      </div>

      {selectedSantri && (
        <div className="mb-5 p-3 sm:p-4 rounded-xl border bg-orange-50 border-orange-200">
          <div className="flex justify-between gap-3">
            <div>
              <div className="font-bold text-gray-800">{selectedSantri.nama}</div>
              <div className="text-xs text-gray-500 mt-0.5">{kelasSantri(selectedSantri)}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total Hafalan: <span className="font-semibold text-orange-700">{Number(selectedSantri.total_hafalan_juz || 0).toFixed(2)} Juz</span></div>
            </div>
            <button type="button" onClick={() => {
              setSelectedSantri(null)
              setSearchSantri('')
              setSegments([])
              setSelectedJuz(null)
              setTajwidMap({})
              setJuzBelumTajwid([])
              resetInput()
              setError('')
            }} className="text-gray-400 hover:text-gray-600 text-xl" aria-label="Batalkan pilihan santri">×</button>
          </div>
        </div>
      )}

      {selectedSantri && juzBelumTajwid.length > 0 && (
        <div className="mb-5 p-4 rounded-xl border border-yellow-200 bg-yellow-50">
          <p className="text-sm font-semibold text-yellow-800">
            {juzBelumTajwid.length} juz sudah selesai diuji tetapi Nilai Tajwid belum diisi.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {juzBelumTajwid.map(juz => (
              <button key={juz} type="button" onClick={() => setSelectedJuz(juz)}
                className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                Juz {juz}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {success}</div>}

      {loadingSegments ? (
        <div className="py-10 text-center text-gray-400">Memuat segmen sesuai hafalan santri...</div>
      ) : selectedSantri && segments.length === 0 && !error ? (
        <div className="py-8 px-4 text-center rounded-xl bg-gray-50 text-gray-500 text-sm">Belum ada segmen penuh yang dapat diujikan.</div>
      ) : segments.length > 0 && selectedJuz !== null ? (
        <div>
          <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <button type="button" disabled={indexJuz <= 0} onClick={() => setSelectedJuz(daftarJuz[indexJuz - 1])}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 font-bold text-orange-700 disabled:opacity-30" aria-label="Juz sebelumnya">‹</button>
            <div className="text-center min-w-0">
              <div className="text-xs text-gray-500">Juz yang dapat diujikan</div>
              <div className="text-xl font-bold text-orange-800">Juz {selectedJuz}</div>
              <div className="text-xs text-gray-400">{indexJuz + 1} dari {daftarJuz.length} juz tersedia</div>
            </div>
            <button type="button" disabled={indexJuz < 0 || indexJuz >= daftarJuz.length - 1} onClick={() => setSelectedJuz(daftarJuz[indexJuz + 1])}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 font-bold text-orange-700 disabled:opacity-30" aria-label="Juz berikutnya">›</button>
          </div>

          {ringkasanJuzAktif && (
            <div className="mb-4 p-4 rounded-2xl border border-orange-100 bg-orange-50/50">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-gray-800">Juz {selectedJuz}</div>
                  <div className="text-sm text-gray-600 mt-0.5">{ringkasanJuzAktif.dinilai} dari {ringkasanJuzAktif.target} segmen selesai</div>
                </div>
                <StatusJuzBadge status={ringkasanJuzAktif.status} />
              </div>
              {ringkasanJuzAktif.rata !== null && (
                <div className={`mt-2 text-2xl font-bold ${ringkasanJuzAktif.status === 'selesai' ? 'text-green-700' : 'text-blue-700'}`}>
                  Nilai Kelancaran: {ringkasanJuzAktif.rata.toFixed(1)}
                </div>
              )}
            </div>
          )}

          {ringkasanJuzAktif && selectedJuz !== null && (
            <div className="mb-4 p-4 rounded-2xl border border-gray-200 bg-white">
              <div className="text-sm font-semibold text-gray-700 mb-2">Nilai Tajwid</div>
              {ringkasanJuzAktif.status !== 'selesai' ? (
                <p className="text-xs text-gray-400">Nilai Tajwid dapat diisi setelah seluruh segmen selesai.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <input type="text" inputMode="decimal" value={tajwidInputValue}
                      onChange={event => setTajwidInputValue(event.target.value)}
                      placeholder="0.0 - 10.0" className={inputClass} />
                    <button type="button" disabled={savingTajwid}
                      onClick={() => simpanTajwid(selectedJuz, tajwidInputValue, 'blok')}
                      className="flex-shrink-0 px-4 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50 shadow"
                      style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>
                      {savingTajwid ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                  {tajwidMap[selectedJuz] && (
                    <p className="text-xs text-gray-400 mt-1.5">Nilai Tajwid tersimpan: {tajwidMap[selectedJuz].nilai.toFixed(1)} -- boleh diedit di atas.</p>
                  )}
                  {tajwidError && <p className="text-xs text-red-600 mt-1.5">{tajwidError}</p>}
                  {tajwidSuccess && <p className="text-xs text-green-600 mt-1.5">✓ {tajwidSuccess}</p>}
                </>
              )}
            </div>
          )}

          <div className="space-y-3">
            {segmentsJuz.map(segment => {
              const expanded = expandedSegmentId === segment.id
              return (
                <div key={segment.id} className={`rounded-2xl border overflow-hidden ${expanded ? 'border-orange-300 shadow-md' : 'border-gray-200'}`}>
                  <button type="button" onClick={() => bukaSegment(segment.id)} className="w-full p-4 text-left hover:bg-orange-50/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-gray-800 flex items-center gap-2">
                          Segmen {segment.segmen}
                          {segment.parsial && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">Parsial</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 break-words">
                          {namaSurah(segment, 'awal')} ayat {segment.ayat_awal} → {namaSurah(segment, 'akhir')} ayat {segment.ayat_akhir}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{segment.jumlah_halaman} halaman · halaman {segment.halaman_awal}–{segment.halaman_akhir}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {segment.nilai_terakhir ? (
                          <>
                            <div className="text-lg font-bold text-green-700">{Number(segment.nilai_terakhir.nilai_akhir).toFixed(1)}</div>
                            <div className="text-[11px] text-green-600">Nilai terakhir</div>
                            <div className="mt-1 text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Sudah dinilai</div>
                            <div className="mt-1 text-[10px] font-semibold text-orange-600">Uji Ulang Segmen</div>
                          </>
                        ) : (
                          <div className="text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-500">Belum dinilai</div>
                        )}
                      </div>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-orange-200 p-4 bg-orange-50/40">
                      <div className="text-sm font-semibold text-gray-700 mb-3">Input Kesalahan</div>
                      <div className="space-y-2">
                        {[
                          { label: 'Jumlah teguran', sub: 'Setiap 1 kali = -0,1', value: jumlahTegur, setter: setJumlahTegur },
                          { label: 'Diberi tahu ayat sebelumnya', sub: 'Setiap 1 kali = -0,1', value: jumlahTahuAyat, setter: setJumlahTahuAyat },
                          { label: 'Jumlah lupa', sub: 'Setiap 1 kali = -1,0', value: jumlahLupa, setter: setJumlahLupa },
                        ].map(item => (
                          <div key={item.label} className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-gray-200">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-700">{item.label}</div>
                              <div className="text-xs text-gray-400">{item.sub}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button type="button" onClick={() => ubahHitungan(item.value, item.setter, -1)} className="w-8 h-8 rounded-lg bg-gray-100 font-bold">−</button>
                              <span className="w-8 text-center font-bold">{item.value}</span>
                              <button type="button" onClick={() => ubahHitungan(item.value, item.setter, 1)} className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 font-bold">+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 p-3 bg-white rounded-xl border-2 border-orange-200 flex justify-between items-center">
                        <div>
                          <div className="text-sm font-semibold text-gray-700">Nilai sementara</div>
                          <div className="text-xs text-gray-400">Minimum nilai 5,0</div>
                        </div>
                        <div className="text-3xl font-bold text-orange-700">{nilaiPreview.toFixed(1)}</div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Catatan (Opsional)</label>
                        <textarea value={catatan} onChange={event => setCatatan(event.target.value)} rows={2} maxLength={2000}
                          placeholder="Catatan tambahan untuk nilai segmen ini..." className={inputClass} />
                      </div>
                      <button type="button" onClick={() => handleSimpanClick(segment)} disabled={saving}
                        className="w-full mt-4 py-3.5 rounded-xl text-white font-bold disabled:opacity-50 shadow"
                        style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>
                        {saving
                          ? 'Menyimpan...'
                          : segment.nilai_terakhir
                            ? `Uji Ulang Segmen (${nilaiPreview.toFixed(1)})`
                            : `Simpan Nilai Segmen (${nilaiPreview.toFixed(1)})`}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {confirmUjiUlang && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setConfirmUjiUlang(null)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl p-5" onClick={event => event.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Uji Ulang Segmen?</h3>
            <p className="text-sm text-gray-600 mb-5">
              Segmen ini sudah pernah dinilai dengan nilai{' '}
              <span className="font-bold text-orange-700">{Number(confirmUjiUlang.nilai_terakhir?.nilai_akhir || 0).toFixed(1)}</span>.
              Nilai baru akan menjadi nilai aktif, sedangkan nilai sebelumnya tetap tersimpan sebagai riwayat.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmUjiUlang(null)}
                className="flex-1 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700">Batal</button>
              <button type="button" onClick={lanjutkanUjiUlang}
                className="flex-1 py-3 rounded-xl font-semibold text-white shadow"
                style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>Lanjut Uji Ulang</button>
            </div>
          </div>
        </div>
      )}

      {showTajwidModal !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowTajwidModal(null)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl p-5" onClick={event => event.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Juz {showTajwidModal} telah selesai dinilai.</h3>
            <p className="text-sm text-gray-600 mb-4">Silakan lengkapi Nilai Tajwid.</p>
            <input type="text" inputMode="decimal" value={modalTajwidInputValue}
              onChange={event => setModalTajwidInputValue(event.target.value)}
              placeholder="0.0 - 10.0" className={`${inputClass} mb-2`} />
            {modalTajwidError && <p className="text-xs text-red-600 mb-2">{modalTajwidError}</p>}
            <div className="flex gap-3 mt-3">
              <button type="button" onClick={() => setShowTajwidModal(null)}
                className="flex-1 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700">Nanti</button>
              <button type="button" disabled={savingModalTajwid}
                onClick={() => simpanTajwid(showTajwidModal, modalTajwidInputValue, 'modal')}
                className="flex-1 py-3 rounded-xl font-semibold text-white shadow disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>
                {savingModalTajwid ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
