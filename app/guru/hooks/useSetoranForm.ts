'use client'
import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getTanggalWIB } from '../../lib/dateWib'
import { fetchWithAuth } from '../../lib/authClient'
import { hitungPenambahanJuz, filterSantriGuruPengganti } from '../utils'
import type { Santri, Surah, GuruProfile, SetoranLite } from '../types'

const PESAN_SERVER_WUSTHA = 'Santri masih memiliki tanggungan hafalan lama. Setorkan hafalan lama hingga Najih terlebih dahulu.'

type SantriPilihan = {
  id: string
  nama: string
  jenjang?: string
}

// State + handler form Input Setoran (pilih santri, jenis, status kehadiran,
// hafalan baru/murojaah, kunci Wustha, duplicate-check, submit ke
// /api/setoran). Dipindah dari app/guru/page.tsx (Modularisasi Tahap 5A)
// TANPA mengubah business rule/urutan validasi/isi payload sama sekali.
//
// errorMsg/successMsg TETAP dipegang oleh page.tsx (dipakai bersama oleh
// Riwayat/Edit Setoran juga, persis seperti sebelumnya) -- hook ini hanya
// menerima setter-nya, bukan memilikinya sendiri.
export function useSetoranForm(params: {
  santriList: Santri[]
  allSantriList: Santri[]
  surahList: Surah[]
  guruProfile: GuruProfile | null
  setErrorMsg: (msg: string) => void
  refetch: () => void
}) {
  const { santriList, allSantriList, surahList, guruProfile, setErrorMsg, refetch } = params

  const submitSetoranLockRef = useRef(false)
  const [loading, setLoading] = useState(false)
  const [showPopupSukses, setShowPopupSukses] = useState(false)
  const [popupSuksesMsg, setPopupSuksesMsg] = useState('')
  const [searchSantri, setSearchSantri] = useState('')
  const [guruPengganti, setGuruPengganti] = useState(false)
  const [setoranLamaHariIni, setSetoranLamaHariIni] = useState<SetoranLite | null>(null)
  const [wusthaHafalanBaruTerkunci, setWusthaHafalanBaruTerkunci] = useState(false)
  const [wusthaKunciLoading, setWusthaKunciLoading] = useState(false)
  const [showPopupKunciWustha, setShowPopupKunciWustha] = useState(false)

  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null)
  const [jenis, setJenis] = useState('baru')
  const [statusKehadiran, setStatusKehadiran] = useState('hadir')
  const [surahBaru, setSurahBaru] = useState('')
  const [ayatMulaiBaru, setAyatMulaiBaru] = useState('')
  const [ayatSelesaiBaru, setAyatSelesaiBaru] = useState('')
  const [surahMulai, setSurahMulai] = useState('')
  const [ayatMulaiMurojaah, setAyatMulaiMurojaah] = useState('1')
  const [surahSelesai, setSurahSelesai] = useState('')
  const [ayatSelesaiMurojaah, setAyatSelesaiMurojaah] = useState('')
  const [searchSurahBaru, setSearchSurahBaru] = useState('')
  const [searchSurahMulai, setSearchSurahMulai] = useState('')
  const [searchSurahSelesai, setSearchSurahSelesai] = useState('')
  const [status, setStatus] = useState('lancar')
  const [catatan, setCatatan] = useState('')

  const tampilPopupSukses = (msg: string) => {
    setPopupSuksesMsg(msg)
    setShowPopupSukses(true)
    setTimeout(() => setShowPopupSukses(false), 3000)
  }

  const cekSetoranLamaHariIni = async (santriId: string) => {
    const today = getTanggalWIB()
    const { data } = await supabase
      .from('setoran')
      .select('*')
      .eq('santri_id', santriId)
      .eq('tanggal', today)
      .eq('jenis', 'lama')
      .eq('status_kehadiran', 'hadir')
      .order('created_at', { ascending: false })
      .limit(1)
    setSetoranLamaHariIni(data?.[0] || null)
  }

  const cekKunciHafalanBaruWustha = async (santriId: string) => {
    setWusthaKunciLoading(true)
    const { data, error } = await supabase
      .from('setoran')
      .select('id, status, tanggal, created_at')
      .eq('santri_id', santriId)
      .eq('jenis', 'lama')
      .eq('status_kehadiran', 'hadir')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)

    setWusthaKunciLoading(false)
    if (error) {
      setWusthaHafalanBaruTerkunci(true)
      setErrorMsg('Gagal memeriksa status hafalan lama. Silakan coba lagi.')
      return null
    }

    const terkunci = data?.[0]?.status === 'rosib'
    setWusthaHafalanBaruTerkunci(terkunci)
    if (terkunci) setShowPopupKunciWustha(true)
    return terkunci
  }

  const handlePilihSantri = async (santri: SantriPilihan) => {
    setSelectedSantri(santri)
    setSearchSantri(santri.nama)
    setSetoranLamaHariIni(null)
    setWusthaHafalanBaruTerkunci(false)
    setWusthaKunciLoading(false)
    setShowPopupKunciWustha(false)
    setErrorMsg('')

    if (santri.jenjang === 'ulya') {
      setJenis('lama')
      return
    }

    if (santri.jenjang === 'ula') {
      setJenis('baru')
      await cekSetoranLamaHariIni(santri.id)
      return
    }

    if (santri.jenjang === 'wustha') {
      setJenis('lama')
      const terkunci = await cekKunciHafalanBaruWustha(santri.id)
      if (terkunci === false) setJenis('baru')
      return
    }

    setJenis('baru')
  }

  const handleSurahSelesaiChange = (nomor: string) => {
    setSurahSelesai(nomor)
    if (nomor) {
      const surah = surahList.find(s => s.nomor === parseInt(nomor))
      if (surah) setAyatSelesaiMurojaah(String(surah.jumlah_ayat))
    }
  }

  // Reset status kunci Wustha + pilihan santri saat ini -- dipakai di dua
  // tempat pada JSX asli (toggle Guru Pengganti, dan tombol "×" batal pilih
  // santri), disatukan di sini persis sama isinya.
  const resetStatusKuncidanPilihanSantri = () => {
    setSelectedSantri(null)
    setSearchSantri('')
    setSetoranLamaHariIni(null)
    setWusthaHafalanBaruTerkunci(false)
    setWusthaKunciLoading(false)
    setShowPopupKunciWustha(false)
  }

  const handleToggleGuruPengganti = () => {
    setGuruPengganti(!guruPengganti)
    resetStatusKuncidanPilihanSantri()
  }

  const handleBatalkanPilihSantri = () => {
    resetStatusKuncidanPilihanSantri()
  }

  const resetForm = () => {
    setSelectedSantri(null); setJenis('baru'); setStatus('lancar')
    setSurahBaru(''); setAyatMulaiBaru(''); setAyatSelesaiBaru('')
    setSurahMulai(''); setAyatMulaiMurojaah('1'); setSurahSelesai(''); setAyatSelesaiMurojaah('')
    setSearchSurahBaru(''); setSearchSurahMulai(''); setSearchSurahSelesai('')
    setCatatan(''); setStatusKehadiran('hadir'); setSearchSantri(''); setGuruPengganti(false)
    setSetoranLamaHariIni(null)
    setWusthaHafalanBaruTerkunci(false); setWusthaKunciLoading(false); setShowPopupKunciWustha(false)
  }

  const handleInputSetoran = async () => {
    if (submitSetoranLockRef.current) return
    if (!selectedSantri) { setErrorMsg('Pilih santri dulu!'); return }
    if (selectedSantri.jenjang === 'wustha' && jenis === 'baru' && (wusthaHafalanBaruTerkunci || wusthaKunciLoading)) {
      setErrorMsg(wusthaKunciLoading ? 'Status hafalan lama masih diperiksa. Silakan tunggu.' : PESAN_SERVER_WUSTHA)
      return
    }
    submitSetoranLockRef.current = true

    try {
      if (statusKehadiran !== 'hadir') {
      setLoading(true); setErrorMsg('')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('setoran').insert({
        santri_id: selectedSantri.id, guru_id: user.id,
        jenis: 'baru', status: 'lancar', status_kehadiran: statusKehadiran,
        tanggal: getTanggalWIB(),
        guru_pengganti: guruPengganti, perlu_ulang: false, catatan
      })
      if (error) { setErrorMsg('Gagal: ' + error.message); setLoading(false); return }
      tampilPopupSukses(`✓ Kehadiran ${selectedSantri.nama} berhasil disimpan!`)
      resetForm(); setLoading(false)
      return
      }

    setLoading(true); setErrorMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const tanggalSetoran = getTanggalWIB()

    const { data: setoranSudahAda, error: cekDuplikasiError } = await supabase
      .from('setoran')
      .select('id')
      .eq('santri_id', selectedSantri.id)
      .eq('tanggal', tanggalSetoran)
      .eq('jenis', jenis)
      .eq('status_kehadiran', 'hadir')
      .limit(1)

    if (cekDuplikasiError) {
      setErrorMsg('Gagal memeriksa setoran hari ini. Silakan coba lagi.')
      return
    }

    if (setoranSudahAda && setoranSudahAda.length > 0) {
      setErrorMsg(jenis === 'lama'
        ? 'Setoran lama santri ini sudah diinput hari ini. Jika jenis setoran sebelumnya keliru, silakan edit data yang sudah ada.'
        : 'Hafalan baru santri ini sudah diinput hari ini. Jika jenis setoran sebelumnya keliru, silakan edit data yang sudah ada.')
      return
    }

    if (jenis === 'baru' && selectedSantri.jenjang === 'ula') {
      const { data: setoranLama, error: cekSetoranLamaError } = await supabase
        .from('setoran')
        .select('id, status')
        .eq('santri_id', selectedSantri.id)
        .eq('tanggal', tanggalSetoran)
        .eq('jenis', 'lama')
        .eq('status_kehadiran', 'hadir')
        .order('created_at', { ascending: false })
        .limit(1)

      if (cekSetoranLamaError) {
        setErrorMsg('Gagal memeriksa setoran lama hari ini. Silakan coba lagi.')
        return
      }

      const setoranLamaTerbaru = setoranLama?.[0] || null
      setSetoranLamaHariIni(setoranLamaTerbaru)
      if (!setoranLamaTerbaru) {
        setErrorMsg('Santri Ula wajib setor Murojaah terlebih dahulu!')
        return
      }
      if (setoranLamaTerbaru.status !== 'lancar') {
        setErrorMsg('Murojaah rosib — Hafalan Baru tidak boleh disetorkan hari ini!')
        return
      }
    }

    if (jenis === 'baru' && (!surahBaru || !ayatMulaiBaru || !ayatSelesaiBaru)) { setErrorMsg('Lengkapi data hafalan baru!'); return }
    if (jenis === 'lama' && (!surahMulai || !surahSelesai)) { setErrorMsg('Lengkapi data murojaah!'); return }

    let penambahanJuz = 0
    let insertData: Record<string, unknown> = {
      santri_id: selectedSantri.id, guru_id: user.id,
      jenis, status, catatan, status_kehadiran: 'hadir',
      perlu_ulang: status === 'rosib',
      tanggal: tanggalSetoran,
      guru_pengganti: guruPengganti
    }
    if (jenis === 'baru') {
      const surahNomor = parseInt(surahBaru)
      const ayatMulaiNum = parseInt(ayatMulaiBaru)
      const ayatSelesaiNum = parseInt(ayatSelesaiBaru)

      // Hitung penambahan dengan cek overlap
      const surahTerakhir = selectedSantri.surah_terakhir_nomor
      const ayatTerakhir = selectedSantri.ayat_terakhir || 0

      if (status === 'rosib') {
        // Rosib: tidak ada penambahan sama sekali
        penambahanJuz = 0
      } else if (!surahTerakhir) {
        // Belum ada hafalan sama sekali, hitung penuh
        penambahanJuz = hitungPenambahanJuz(surahList, surahNomor, ayatMulaiNum, ayatSelesaiNum)
      } else if (surahNomor > surahTerakhir) {
        // Mundur ke surah lebih besar (arah salah), tidak tambah
        penambahanJuz = 0
      } else if (surahNomor === surahTerakhir) {
        // Surah sama, cek ayatnya
        if (ayatSelesaiNum <= ayatTerakhir) {
          // Ayat yang diinput sudah dimiliki semua, tidak tambah
          penambahanJuz = 0
        } else {
          // Hanya hitung dari ayat baru saja (setelah ayat terakhir)
          penambahanJuz = hitungPenambahanJuz(surahList, surahNomor, ayatTerakhir + 1, ayatSelesaiNum)
        }
      } else {
        // Surah lebih kecil (maju), hitung penuh
        penambahanJuz = hitungPenambahanJuz(surahList, surahNomor, ayatMulaiNum, ayatSelesaiNum)
      }

      insertData = {
        ...insertData,
        surah_mulai_nomor: surahNomor, surah_selesai_nomor: surahNomor,
        surah: surahList.find(s => s.nomor === surahNomor)?.nama_latin || '',
        ayat_mulai: ayatMulaiNum, ayat_selesai: ayatSelesaiNum,
        ayat_mulai_baru: ayatMulaiNum, ayat_selesai_baru: ayatSelesaiNum,
        penambahan_juz: penambahanJuz
      }
    } else {
      const nomorKecil = Math.min(parseInt(surahMulai), parseInt(surahSelesai))
      const nomorBesar = Math.max(parseInt(surahMulai), parseInt(surahSelesai))
      const sKecil = surahList.find(s => s.nomor === nomorKecil)
      const sBesar = surahList.find(s => s.nomor === nomorBesar)
      const halamanMurojaah = (sKecil && sBesar) ? sBesar.halaman_selesai - sKecil.halaman_mulai + 1 : 0
      insertData = {
        ...insertData,
        surah_mulai_nomor: parseInt(surahMulai), surah_selesai_nomor: parseInt(surahSelesai),
        surah: surahList.find(s => s.nomor === parseInt(surahMulai))?.nama_latin || '',
        ayat_mulai: parseInt(ayatMulaiMurojaah), ayat_selesai: parseInt(ayatSelesaiMurojaah),
        jumlah_halaman_murojaah: halamanMurojaah
      }
    }
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.access_token) {
      setErrorMsg('Sesi login tidak valid atau sudah berakhir. Silakan login kembali.')
      return
    }

    const response = await fetchWithAuth('/api/setoran', session.access_token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(insertData),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (result.code === 'WUSTHA_MUROJAAH_ROSIB') {
        setWusthaHafalanBaruTerkunci(true)
        setJenis('lama')
        setShowPopupKunciWustha(true)
      }
      if (response.status === 401) {
        setErrorMsg('Sesi login tidak valid atau sudah berakhir. Silakan login kembali.')
      } else if (response.status === 403) {
        setErrorMsg('Akses ditolak. Hanya guru yang dapat menyimpan setoran.')
      } else {
        setErrorMsg(result.error || 'Gagal menyimpan setoran. Silakan coba lagi.')
      }
      return
    }
    // Update posisi hafalan (total_hafalan_juz/surah_terakhir_nomor/ayat_terakhir)
    // untuk jenis 'baru' sekarang dieksekusi server-side oleh /api/setoran
    // (service-role, setelah role+jenis_kelas guru diverifikasi) -- bukan lagi
    // direct UPDATE public.santri dari browser. Algoritma penentuan progress
    // tidak berubah, hanya lokasi eksekusinya. refetch() di bawah me-refresh
    // selectedSantri/santriList dengan posisi terbaru dari server.

    // Refresh cek setoran lama jika baru saja input lama
    if (jenis === 'lama' && selectedSantri?.jenjang === 'ula') {
      await cekSetoranLamaHariIni(selectedSantri.id)
    }
    const pertahankanSantriWustha = jenis === 'lama' && selectedSantri?.jenjang === 'wustha'
      ? selectedSantri
      : null
    const pertahankanModeGuruPengganti = guruPengganti
    tampilPopupSukses('✓ Setoran berhasil disimpan!')
    resetForm(); setLoading(false)
    if (pertahankanSantriWustha) {
      const terkunci = status === 'rosib'
      setSelectedSantri(pertahankanSantriWustha)
      setSearchSantri(pertahankanSantriWustha.nama)
      setGuruPengganti(pertahankanModeGuruPengganti)
      setWusthaHafalanBaruTerkunci(terkunci)
      setJenis(terkunci ? 'lama' : 'baru')
    }
    refetch()
    } finally {
      submitSetoranLockRef.current = false
      setLoading(false)
    }
  }

  const santriTampil = guruPengganti
    ? filterSantriGuruPengganti(allSantriList, searchSantri, guruProfile?.jenis_kelas)
    : santriList.filter(s => s.nama.toLowerCase().includes(searchSantri.toLowerCase()))

  const ulaBlokHafalanBaru = selectedSantri?.jenjang === 'ula' && (
    !setoranLamaHariIni || setoranLamaHariIni.status === 'rosib'
  )
  const wusthaBlokHafalanBaru = selectedSantri?.jenjang === 'wustha' && (
    wusthaHafalanBaruTerkunci || wusthaKunciLoading
  )
  const hafalanBaruDisabled = ulaBlokHafalanBaru || wusthaBlokHafalanBaru || selectedSantri?.jenjang === 'ulya'

  return {
    loading, showPopupSukses, popupSuksesMsg,
    searchSantri, setSearchSantri,
    guruPengganti, setGuruPengganti,
    setoranLamaHariIni, wusthaHafalanBaruTerkunci, wusthaKunciLoading,
    showPopupKunciWustha, setShowPopupKunciWustha,
    selectedSantri, setSelectedSantri,
    jenis, setJenis,
    statusKehadiran, setStatusKehadiran,
    surahBaru, setSurahBaru, ayatMulaiBaru, setAyatMulaiBaru, ayatSelesaiBaru, setAyatSelesaiBaru,
    surahMulai, setSurahMulai, ayatMulaiMurojaah, setAyatMulaiMurojaah,
    surahSelesai, setSurahSelesai, ayatSelesaiMurojaah, setAyatSelesaiMurojaah,
    searchSurahBaru, setSearchSurahBaru, searchSurahMulai, setSearchSurahMulai, searchSurahSelesai, setSearchSurahSelesai,
    status, setStatus, catatan, setCatatan,
    santriTampil, hafalanBaruDisabled, ulaBlokHafalanBaru, wusthaBlokHafalanBaru,
    handlePilihSantri, handleSurahSelesaiChange, handleInputSetoran, resetForm,
    handleToggleGuruPengganti, handleBatalkanPilihSantri,
  }
}
