'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Image from 'next/image'

export default function GuruDashboard() {
  const [activeMenu, setActiveMenu] = useState('input')
  const [santriList, setSantriList] = useState<any[]>([])
  const [allSantriList, setAllSantriList] = useState<any[]>([])
  const [surahList, setSurahList] = useState<any[]>([])
  const [guruProfile, setGuruProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [showPopupSukses, setShowPopupSukses] = useState(false)
  const [popupSuksesMsg, setPopupSuksesMsg] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [riwayatList, setRiwayatList] = useState<any[]>([])
  const [editSetoran, setEditSetoran] = useState<any>(null)
  const [editStatus, setEditStatus] = useState('lancar')
  const [editCatatan, setEditCatatan] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [searchSantri, setSearchSantri] = useState('')
  const [guruPengganti, setGuruPengganti] = useState(false)
  const [kalenderAktif, setKalenderAktif] = useState<any>(null)
  const [setoranLamaHariIni, setSetoranLamaHariIni] = useState<any>(null)
// State rapot
  const [periodeAktif, setPeriodeAktif] = useState<any>(null)
  const [rapotSantriList, setRapotSantriList] = useState<any[]>([])
  const [selectedSantriRapot, setSelectedSantriRapot] = useState<any>(null)
  const [searchSantriRapot, setSearchSantriRapot] = useState('')
  const [nilaiRapot, setNilaiRapot] = useState<Record<string, any>>({})
  const [rapotLoading, setRapotLoading] = useState(false)
  const [rapotMsg, setRapotMsg] = useState('')
  const [existingRapotId, setExistingRapotId] = useState<any>(null)
  const [rapotActiveTab, setRapotActiveTab] = useState('input')
  const [rapotRekapData, setRapotRekapData] = useState<any[]>([])
  const [rapotRekapLoading, setRapotRekapLoading] = useState(false)
  const [rapotRekapKelas, setRapotRekapKelas] = useState('')

  // Absensi
  const [absenSubuh, setAbsenSubuh] = useState(false)
  const [absenPagi, setAbsenPagi] = useState(false)
  const [absenLoading, setAbsenLoading] = useState(false)
  const [showPopupAbsen, setShowPopupAbsen] = useState(false)
  const [sesiAbsen, setSesiAbsen] = useState<'subuh' | 'pagi'>('subuh')
  const [isBatalAbsen, setIsBatalAbsen] = useState(false)

  // Form setoran
  const [selectedSantri, setSelectedSantri] = useState<any>(null)
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

  // Form nilai ujian
  const [selectedSantriUjian, setSelectedSantriUjian] = useState<any>(null)
  const [searchSantriUjian, setSearchSantriUjian] = useState('')
  const [ujianSurahMulai, setUjianSurahMulai] = useState('')
  const [ujianAyatMulai, setUjianAyatMulai] = useState('1')
  const [ujianSurahSelesai, setUjianSurahSelesai] = useState('')
  const [ujianAyatSelesai, setUjianAyatSelesai] = useState('')
  const [ujianJumlahTegur, setUjianJumlahTegur] = useState('0')
  const [ujianJumlahTahuAyat, setUjianJumlahTahuAyat] = useState('0')
  const [ujianJumlahLupa, setUjianJumlahLupa] = useState('0')
  const [ujianCatatan, setUjianCatatan] = useState('')
  const [nilaiUjianList, setNilaiUjianList] = useState<any[]>([])

  useEffect(() => { fetchGuruData() }, [])

  const fetchGuruData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profile?.role !== 'guru') { window.location.href = '/'; return }
    setGuruProfile(profile)

    const { data: santri1 } = await supabase.from('santri')
      .select('*, guru:guru_id(nama)').eq('guru_id', user.id).eq('status', 'aktif')
    const { data: santri2 } = await supabase.from('santri')
      .select('*, guru:guru_id(nama)').eq('guru_id_2', user.id).eq('status', 'aktif')
    const gabunganSantri = [...(santri1 || [])]
    ;(santri2 || []).forEach((s: any) => {
      if (!gabunganSantri.find(x => x.id === s.id)) gabunganSantri.push(s)
    })
    setSantriList(gabunganSantri)

    const { data: semuaSantri } = await supabase.from('santri').select('*, guru:guru_id(nama)').eq('status', 'aktif')
    setAllSantriList(semuaSantri || [])

    const { data: surah } = await supabase.from('surah').select('*').order('nomor', { ascending: false })
    setSurahList(surah || [])

    const today = new Date().toISOString().split('T')[0]

    const { data: absensiList } = await supabase.from('absensi_guru').select('*').eq('guru_id', user.id).eq('tanggal', today)
    const absensiData = absensiList || []
    setAbsenSubuh(absensiData.some((a: any) => a.sesi === 'subuh'))
    setAbsenPagi(absensiData.some((a: any) => a.sesi === 'pagi'))

    const { data: kalender } = await supabase.from('kalender_akademik').select('*').lte('tanggal_mulai', today).gte('tanggal_selesai', today).maybeSingle()
    setKalenderAktif(kalender || null)
  }

  const fetchRiwayat = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('setoran')
      .select('*, santri:santri_id(nama), surah_mulai:surah_mulai_nomor(nama_latin), surah_selesai:surah_selesai_nomor(nama_latin)')
      .eq('guru_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setRiwayatList(data || [])
  }

  const fetchPeriodeAktif = async () => {
    const { data } = await supabase.from('periode_rapot').select('*').eq('is_aktif', true).maybeSingle()
    setPeriodeAktif(data || null)
    if (data) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: rapot1 } = await supabase.from('santri')
  .select('*').eq('guru_id', user.id).eq('jenjang', 'ula').eq('status', 'aktif').order('nama')
const { data: rapot2 } = await supabase.from('santri')
  .select('*').eq('guru_id_2', user.id).eq('jenjang', 'ula').eq('status', 'aktif').order('nama')
const allRapotSantri = [...(rapot1 || [])]
;(rapot2 || []).forEach((s: any) => {
  if (!allRapotSantri.find(x => x.id === s.id)) allRapotSantri.push(s)
})
setRapotSantriList(allRapotSantri)
    }
  }

  const fetchNilaiRapotSantri = async (santriId: string) => {
    if (!periodeAktif) return
    const { data } = await supabase.from('nilai_rapot')
      .select('*').eq('santri_id', santriId).eq('periode_id', periodeAktif.id).maybeSingle()
    if (data) {
      setExistingRapotId(data.id)
      setNilaiRapot({
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
        hadir_sakit: data.hadir_sakit || 0,
        hadir_izin: data.hadir_izin || 0,
        hadir_alpha: data.hadir_alpha || 0,
        catatan: data.catatan || '',
      })
    } else {
      setExistingRapotId(null)
      setNilaiRapot({
        kelancaran: '', tajwid: '', keterangan_hafalan: '',
        aqidah: '', akhlak: '', fiqh: '', bhs_arab: '', siroh: '', khoth: '',
        bhs_indonesia: '', berhitung: '', ipa: '', ips: '',
        akhlak_kepribadian: 'B', kebersihan: 'B', ketertiban: 'B',
        ekskul_renang: '', ekskul_beladiri: '',
        hadir_sakit: 0, hadir_izin: 0, hadir_alpha: 0, catatan: '',
      })
    }
  }

  const handleSimpanRapot = async () => {
    if (!selectedSantriRapot || !periodeAktif) return
    setRapotLoading(true); setRapotMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const dataRapot = {
      santri_id: selectedSantriRapot.id,
      periode_id: periodeAktif.id,
      guru_id: user.id,
      kelancaran: parseInt(nilaiRapot.kelancaran) || null,
      tajwid: parseInt(nilaiRapot.tajwid) || null,
      keterangan_hafalan: nilaiRapot.keterangan_hafalan || null,
      aqidah: parseInt(nilaiRapot.aqidah) || null,
      akhlak: parseInt(nilaiRapot.akhlak) || null,
      fiqh: parseInt(nilaiRapot.fiqh) || null,
      bhs_arab: parseInt(nilaiRapot.bhs_arab) || null,
      siroh: parseInt(nilaiRapot.siroh) || null,
      khoth: parseInt(nilaiRapot.khoth) || null,
      bhs_indonesia: parseInt(nilaiRapot.bhs_indonesia) || null,
      berhitung: parseInt(nilaiRapot.berhitung) || null,
      ipa: parseInt(nilaiRapot.ipa) || null,
      ips: parseInt(nilaiRapot.ips) || null,
      akhlak_kepribadian: nilaiRapot.akhlak_kepribadian,
      kebersihan: nilaiRapot.kebersihan,
      ketertiban: nilaiRapot.ketertiban,
      ekskul_renang: parseInt(nilaiRapot.ekskul_renang) || null,
      ekskul_beladiri: nilaiRapot.ekskul_beladiri || null,
      hadir_sakit: parseInt(nilaiRapot.hadir_sakit) || 0,
      hadir_izin: parseInt(nilaiRapot.hadir_izin) || 0,
      hadir_alpha: parseInt(nilaiRapot.hadir_alpha) || 0,
      catatan: nilaiRapot.catatan || null,
    }
    let error
    if (existingRapotId) {
      const res = await supabase.from('nilai_rapot').update(dataRapot).eq('id', existingRapotId)
      error = res.error
    } else {
      const res = await supabase.from('nilai_rapot').insert(dataRapot)
      error = res.error
    }
    if (error) { setRapotMsg('Gagal: ' + error.message); setRapotLoading(false); return }
    setRapotMsg('✓ Nilai rapot berhasil disimpan!')
    setRapotLoading(false)
    fetchNilaiRapotSantri(selectedSantriRapot.id)
  }

  const fetchRekapKelasByGuru = async (kelas: string) => {
    if (!periodeAktif || !kelas) return
    setRapotRekapLoading(true)
    setRapotRekapData([])
    const { data: nilaiSnapshot } = await supabase
      .from('nilai_rapot')
      .select('*, santri:santri_id(nama, kelas_num, jenjang, status)')
      .eq('periode_id', periodeAktif.id)
      .eq('kelas_snapshot', parseInt(kelas))
    let nilaiList = nilaiSnapshot || []
    if (nilaiList.length === 0) {
      const { data: santriKelas } = await supabase
        .from('santri').select('id')
        .eq('jenjang', 'ula')
        .eq('kelas_num', parseInt(kelas))
      const ids = (santriKelas || []).map((s: any) => s.id)
      if (ids.length > 0) {
        const { data: nilaiFallback } = await supabase
          .from('nilai_rapot')
          .select('*, santri:santri_id(nama, kelas_num, jenjang, status)')
          .eq('periode_id', periodeAktif.id)
          .in('santri_id', ids)
        nilaiList = nilaiFallback || []
      }
    }
    const hitungRata = (n: any) => {
      const d = [n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].filter((v: any) => v != null && v > 0)
      const u = [n.bhs_indonesia, n.berhitung, n.ipa, n.ips].filter((v: any) => v != null && v > 0)
      if (d.length === 0 && u.length === 0) return 0
      const rd = d.length > 0 ? d.reduce((a: number, b: number) => a + b, 0) / d.length : 0
      const ru = u.length > 0 ? u.reduce((a: number, b: number) => a + b, 0) / u.length : 0
      if (d.length === 0) return ru
      if (u.length === 0) return rd
      return (rd + ru) / 2
    }
    const withRata = nilaiList.map((n: any) => ({
      ...n,
      rata_diiniyyah: (() => {
        const d = [n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].filter((v: any) => v != null && v > 0)
        return d.length > 0 ? d.reduce((a: number, b: number) => a + b, 0) / d.length : null
      })(),
      rata_umum: (() => {
        const u = [n.bhs_indonesia, n.berhitung, n.ipa, n.ips].filter((v: any) => v != null && v > 0)
        return u.length > 0 ? u.reduce((a: number, b: number) => a + b, 0) / u.length : null
      })(),
      rata_akhir: hitungRata(n)
    })).sort((a: any, b: any) => b.rata_akhir - a.rata_akhir)
    const withPeringkat = withRata.map((n: any, i: number) => ({ ...n, peringkat: i + 1 }))
    setRapotRekapData(withPeringkat)
    setRapotRekapLoading(false)
  }
  const fetchNilaiUjian = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('nilai_ujian')
      .select('*, santri:santri_id(nama, kelas), surah_mulai:surah_mulai_nomor(nama_latin), surah_selesai:surah_selesai_nomor(nama_latin)')
      .eq('guru_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNilaiUjianList(data || [])
  }

  const cekSetoranLamaHariIni = async (santriId: string) => {
    const today = new Date().toISOString().split('T')[0]
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

  const handleSimpanEditSetoran = async () => {
    if (!editSetoran) return
    setEditLoading(true)
    const { error } = await supabase
      .from('setoran')
      .update({ status: editStatus, catatan: editCatatan, perlu_ulang: editStatus === 'rosib' })
      .eq('id', editSetoran.id)
    if (error) {
      setErrorMsg('Gagal edit: ' + error.message)
    } else {
      setSuccessMsg('Setoran berhasil diupdate!')
      setEditSetoran(null)
      fetchRiwayat()
      setTimeout(() => setSuccessMsg(''), 3000)
    }
    setEditLoading(false)
  }

  const today = new Date().toISOString().split('T')[0]
  const hariMinggu = new Date().getDay()
  const isLiburMingguan = hariMinggu === 0 || hariMinggu === 5
  const isLibur = isLiburMingguan || kalenderAktif?.tipe === 'libur'
  const isUjian = kalenderAktif && (kalenderAktif.tipe === 'mid_semester' || kalenderAktif.tipe === 'semester')

  const getSesiAktif = (): 'subuh' | 'pagi' | null => {
    const total = new Date().getHours() * 60 + new Date().getMinutes()
    if (total >= 240 && total <= 330) return 'subuh'
    if (total >= 480 && total <= 585) return 'pagi'
    return null
  }

  const handleKlikAbsen = (sesi: 'subuh' | 'pagi') => {
    setSesiAbsen(sesi)
    setIsBatalAbsen(sesi === 'subuh' ? absenSubuh : absenPagi)
    setShowPopupAbsen(true)
  }

  const handleKonfirmasiAbsen = async () => {
    setAbsenLoading(true)
    setShowPopupAbsen(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    if (isBatalAbsen) {
      await supabase.from('absensi_guru').delete().eq('guru_id', user.id).eq('tanggal', today).eq('sesi', sesiAbsen)
      if (sesiAbsen === 'subuh') setAbsenSubuh(false)
      else setAbsenPagi(false)
    } else {
      await supabase.from('absensi_guru').insert({ guru_id: user.id, tanggal: today, status: 'hadir', sesi: sesiAbsen })
      if (sesiAbsen === 'subuh') setAbsenSubuh(true)
      else setAbsenPagi(true)
    }
    setAbsenLoading(false)
  }

  const hitungPenambahanJuz = (surahNomor: number, ayatMulai: number, ayatSelesai: number) => {
    const surah = surahList.find(s => s.nomor === surahNomor)
    if (!surah) return 0
    const proporsi = (ayatSelesai - ayatMulai + 1) / surah.jumlah_ayat
    const halamanSurah = (surah.halaman_selesai || surah.halaman_mulai) - surah.halaman_mulai + 1
    return Math.max(0, (proporsi * halamanSurah) / 20)
  }

  const hitungTargetMurojaah = (santri: any) => {
    if (!santri?.total_hafalan_juz) return null
    const targetHalaman = santri.total_hafalan_juz
    const targetLembar = targetHalaman / 2
    return { targetHalaman: targetHalaman.toFixed(1), targetLembar: targetLembar.toFixed(2) }
  }

  const hitungTargetUjianSemester = (santri: any) => {
    if (!santri?.total_hafalan_juz) return null
    const targetJuz = santri.total_hafalan_juz / 10
    const targetHalaman = targetJuz * 20
    const targetLembar = targetHalaman / 2
    return { targetJuz: targetJuz.toFixed(3), targetHalaman: targetHalaman.toFixed(1), targetLembar: targetLembar.toFixed(2) }
  }

  const hitungNilaiUjian = () => {
    const tegur = parseInt(ujianJumlahTegur) || 0
    const tahuAyat = parseInt(ujianJumlahTahuAyat) || 0
    const lupa = parseInt(ujianJumlahLupa) || 0
    const nilai = 10 - (tegur * 0.1) - (tahuAyat * 0.1) - (lupa * 1)
    return Math.max(5, Math.round(nilai * 10) / 10)
  }

  const handleSurahSelesaiChange = (nomor: string) => {
    setSurahSelesai(nomor)
    if (nomor) {
      const surah = surahList.find(s => s.nomor === parseInt(nomor))
      if (surah) setAyatSelesaiMurojaah(String(surah.jumlah_ayat))
    }
  }

  const handleUjianSurahSelesaiChange = (nomor: string) => {
    setUjianSurahSelesai(nomor)
    if (nomor) {
      const surah = surahList.find(s => s.nomor === parseInt(nomor))
      if (surah) setUjianAyatSelesai(String(surah.jumlah_ayat))
    }
  }
const tampilPopupSukses = (msg: string) => {
    setPopupSuksesMsg(msg)
    setShowPopupSukses(true)
    setTimeout(() => setShowPopupSukses(false), 3000)
  }

  const handleInputSetoran = async () => {
    if (!selectedSantri) { setErrorMsg('Pilih santri dulu!'); return }
    if (statusKehadiran !== 'hadir') {
      setLoading(true); setErrorMsg('')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('setoran').insert({
        santri_id: selectedSantri.id, guru_id: user.id,
        jenis: 'baru', status: 'lancar', status_kehadiran: statusKehadiran,
        tanggal: new Date().toISOString().split('T')[0],
        guru_pengganti: guruPengganti, perlu_ulang: false, catatan
      })
      if (error) { setErrorMsg('Gagal: ' + error.message); setLoading(false); return }
      tampilPopupSukses(`✓ Kehadiran ${selectedSantri.nama} berhasil disimpan!`)
      resetForm(); setLoading(false)
      return
    }
    if (jenis === 'baru' && (!surahBaru || !ayatMulaiBaru || !ayatSelesaiBaru)) { setErrorMsg('Lengkapi data hafalan baru!'); return }
    if (jenis === 'lama' && (!surahMulai || !surahSelesai)) { setErrorMsg('Lengkapi data murojaah!'); return }

    setLoading(true); setErrorMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    let penambahanJuz = 0
    let insertData: any = {
      santri_id: selectedSantri.id, guru_id: user.id,
      jenis, status, catatan, status_kehadiran: 'hadir',
      perlu_ulang: status === 'rosib',
      tanggal: new Date().toISOString().split('T')[0],
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
        penambahanJuz = hitungPenambahanJuz(surahNomor, ayatMulaiNum, ayatSelesaiNum)
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
          penambahanJuz = hitungPenambahanJuz(surahNomor, ayatTerakhir + 1, ayatSelesaiNum)
        }
      } else {
        // Surah lebih kecil (maju), hitung penuh
        penambahanJuz = hitungPenambahanJuz(surahNomor, ayatMulaiNum, ayatSelesaiNum)
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
    const { error } = await supabase.from('setoran').insert(insertData)
    if (error) { setErrorMsg('Gagal: ' + error.message); setLoading(false); return }
    if (jenis === 'baru') {
      const surahNomor = parseInt(surahBaru)
      const ayatSelesaiNum = parseInt(ayatSelesaiBaru)
      const surahTerakhir = selectedSantri.surah_terakhir_nomor
      const ayatTerakhir = selectedSantri.ayat_terakhir || 0
      const totalHafalanSekarang = selectedSantri.total_hafalan_juz || 0

      if (status === 'lancar' && totalHafalanSekarang === 0 && !surahTerakhir) {
        // Data hafalan masih kosong — set data awal dari surah ini sampai An-Nas
        const surahIni = surahList.find(s => s.nomor === surahNomor)
        const surahAnNas = surahList.find(s => s.nomor === 114)
        let totalAwal = 0
        if (surahIni && surahAnNas) {
          const totalHalaman = surahAnNas.halaman_selesai - surahIni.halaman_mulai + 1
          totalAwal = Math.max(0, totalHalaman / 20)
        }
        await supabase.from('santri').update({
          total_hafalan_juz: totalAwal,
          surah_terakhir_nomor: surahNomor,
          ayat_terakhir: ayatSelesaiNum
        }).eq('id', selectedSantri.id)

      } else {
        // Data hafalan sudah ada — logika normal
        const adaKemajuan = status === 'lancar' && (
          !surahTerakhir ||
          surahNomor < surahTerakhir ||
          (surahNomor === surahTerakhir && ayatSelesaiNum > ayatTerakhir)
        )

        if (adaKemajuan) {
          const totalBaru = totalHafalanSekarang + penambahanJuz
          await supabase.from('santri').update({
            total_hafalan_juz: totalBaru,
            surah_terakhir_nomor: surahNomor,
            ayat_terakhir: ayatSelesaiNum
          }).eq('id', selectedSantri.id)
        }
      }
    }
    // Refresh cek setoran lama jika baru saja input lama
    if (jenis === 'lama' && selectedSantri?.jenjang === 'ula') {
      await cekSetoranLamaHariIni(selectedSantri.id)
    }
    tampilPopupSukses('✓ Setoran berhasil disimpan!')
    resetForm(); setLoading(false)
    fetchGuruData()
  }

  const handleInputNilaiUjian = async () => {
    if (!selectedSantriUjian) { setErrorMsg('Pilih santri dulu!'); return }
    if (!ujianSurahMulai || !ujianSurahSelesai) { setErrorMsg('Lengkapi surah yang diujikan!'); return }
    setLoading(true); setErrorMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const nilaiAkhir = hitungNilaiUjian()
    const { error } = await supabase.from('nilai_ujian').insert({
      santri_id: selectedSantriUjian.id, guru_id: user.id,
      kalender_id: kalenderAktif?.id || null,
      tipe: kalenderAktif?.tipe || 'mid_semester',
      tanggal: new Date().toISOString().split('T')[0],
      surah_mulai_nomor: parseInt(ujianSurahMulai),
      surah_selesai_nomor: parseInt(ujianSurahSelesai),
      ayat_mulai: parseInt(ujianAyatMulai),
      ayat_selesai: parseInt(ujianAyatSelesai),
      jumlah_tegur: parseInt(ujianJumlahTegur) || 0,
      jumlah_tahu_ayat: parseInt(ujianJumlahTahuAyat) || 0,
      jumlah_lupa: parseInt(ujianJumlahLupa) || 0,
      nilai_akhir: nilaiAkhir,
      catatan: ujianCatatan || null
    })
    if (error) { setErrorMsg('Gagal: ' + error.message); setLoading(false); return }
    setSuccessMsg(`Nilai ujian ${selectedSantriUjian.nama} berhasil disimpan! Nilai: ${nilaiAkhir}`)
    resetFormUjian(); setLoading(false)
    setTimeout(() => setSuccessMsg(''), 4000)
    fetchNilaiUjian()
  }

  const resetForm = () => {
    setSelectedSantri(null); setJenis('baru'); setStatus('lancar')
    setSurahBaru(''); setAyatMulaiBaru(''); setAyatSelesaiBaru('')
    setSurahMulai(''); setAyatMulaiMurojaah('1'); setSurahSelesai(''); setAyatSelesaiMurojaah('')
    setSearchSurahBaru(''); setSearchSurahMulai(''); setSearchSurahSelesai('')
    setCatatan(''); setStatusKehadiran('hadir'); setSearchSantri(''); setGuruPengganti(false)
    setSetoranLamaHariIni(null)
  }

  const resetFormUjian = () => {
    setSelectedSantriUjian(null); setSearchSantriUjian('')
    setUjianSurahMulai(''); setUjianAyatMulai('1')
    setUjianSurahSelesai(''); setUjianAyatSelesai('')
    setUjianJumlahTegur('0'); setUjianJumlahTahuAyat('0'); setUjianJumlahLupa('0')
    setUjianCatatan('')
  }

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const sesiAktif = getSesiAktif()
  const santriTampil = guruPengganti
    ? allSantriList.filter(s => {
        if (!s.nama.toLowerCase().includes(searchSantri.toLowerCase())) return false
        // Filter berdasarkan jenis_kelas guru yang login
        const guruJenis = guruProfile?.jenis_kelas
        if (!guruJenis) return true // jika belum diset, tampilkan semua
        if (guruJenis === 'banin') return s.jenis_kelas === 'banin'
        if (guruJenis === 'banat') return s.jenis_kelas === 'banat' || s.jenis_kelas === 'tn_a' || s.jenis_kelas === 'tn_b'
        if (guruJenis === 'tn') return s.jenis_kelas === 'tn_a' || s.jenis_kelas === 'tn_b'
        return true
      })
    : santriList.filter(s => s.nama.toLowerCase().includes(searchSantri.toLowerCase()))
  const santriTampilUjian = allSantriList.filter(s => s.nama.toLowerCase().includes(searchSantriUjian.toLowerCase()))
  const targetMurojaah = selectedSantri ? hitungTargetMurojaah(selectedSantri) : null
  const getSaranMurojaah = () => surahList.find(s => s.nomor === selectedSantri?.surah_terakhir_nomor)

  // Jadwal setoran per jenjang
  const getJadwalJenjang = (jenjang: string) => {
    if (jenjang === 'ula') return { baru: '08.00 - 09.00', lama: '09.00 - 10.00', adaLama: true }
    if (jenjang === 'wustha') return { baru: '04.30', lama: '08.00 - 09.45', adaLama: true }
    if (jenjang === 'ulya') return { baru: '-', lama: '04.30', adaLama: true }
    return { baru: '-', lama: '-', adaLama: true }
  }

  const ulaBlokHafalanBaru = selectedSantri?.jenjang === 'ula' && (
    !setoranLamaHariIni || setoranLamaHariIni.status === 'rosib'
  )

  const menuItems = [
    { id: 'input', label: 'Input Setoran', icon: '✎' },
    { id: 'ujian', label: 'Input Nilai Ujian', icon: '📝' },
    { id: 'rapot', label: 'Input Nilai Rapot', icon: '📋' },
    { id: 'riwayat', label: 'Riwayat Setoran', icon: '◱' },
    { id: 'santri', label: 'Santri Saya', icon: '◎' },
  ]
  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

  const TombolAbsen = ({ mode }: { mode: 'mobile' | 'sidebar' }) => {
    if (mode === 'mobile') {
      return (
        <div className="flex items-center gap-1.5">
          <button onClick={() => handleKlikAbsen('subuh')} disabled={absenLoading}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border-2 transition shadow-sm ${absenSubuh ? 'bg-green-500 border-green-400 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
            <span>{absenSubuh ? '✓' : '○'}</span><span>Subuh</span>
          </button>
          <button onClick={() => handleKlikAbsen('pagi')} disabled={absenLoading}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border-2 transition shadow-sm ${absenPagi ? 'bg-green-500 border-green-400 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
            <span>{absenPagi ? '✓' : '○'}</span><span>Pagi</span>
          </button>
        </div>
      )
    }
    return (
      <div className="mt-3 space-y-2">
        <p className="text-blue-300 text-xs font-medium mb-1">Absensi Kehadiran:</p>
        <button onClick={() => handleKlikAbsen('subuh')} disabled={absenLoading}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-between px-3 border ${absenSubuh ? 'bg-green-500 border-green-400 text-white' : 'bg-white bg-opacity-10 border-white border-opacity-20 text-white hover:bg-opacity-20'}`}>
          <div className="text-left">
            <div>{absenSubuh ? '✓ Sudah Absen Subuh' : 'Klik untuk Absen Subuh'}</div>
            <div className={`text-xs ${absenSubuh ? 'text-green-100' : 'text-blue-300'}`}>Sesi 04.00 — 05.30</div>
          </div>
          <span className="text-lg">{absenSubuh ? '✓' : '+'}</span>
        </button>
        <button onClick={() => handleKlikAbsen('pagi')} disabled={absenLoading}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-between px-3 border ${absenPagi ? 'bg-green-500 border-green-400 text-white' : 'bg-white bg-opacity-10 border-white border-opacity-20 text-white hover:bg-opacity-20'}`}>
          <div className="text-left">
            <div>{absenPagi ? '✓ Sudah Absen Pagi' : 'Klik untuk Absen Pagi'}</div>
            <div className={`text-xs ${absenPagi ? 'text-green-100' : 'text-blue-300'}`}>Sesi 08.00 — 09.45</div>
          </div>
          <span className="text-lg">{absenPagi ? '✓' : '+'}</span>
        </button>
        {sesiAktif && <div className="text-center text-xs text-green-300 font-medium">Sesi {sesiAktif === 'subuh' ? 'Subuh' : 'Pagi'} sedang berlangsung</div>}
        {!sesiAktif && <div className="text-center text-xs text-blue-300">Di luar jam sesi — absen tetap bisa dilakukan</div>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

{/* POPUP SUKSES SETORAN */}
      {showPopupSukses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl px-6 py-5 max-w-sm w-full pointer-events-auto border-2 border-green-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">✓</span>
              </div>
              <div>
                <div className="font-bold text-gray-800 text-base">Berhasil!</div>
                <div className="text-green-700 text-sm mt-0.5">{popupSuksesMsg}</div>
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-1.5 bg-green-500 rounded-full"
                style={{ animation: 'shrink 3s linear forwards' }} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      {/* POPUP KONFIRMASI ABSEN */}
      {showPopupAbsen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: isBatalAbsen ? '#fee2e2' : 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                <span className="text-2xl text-white">{isBatalAbsen ? '↩' : '✓'}</span>
              </div>
              <h3 className="font-bold text-gray-800 text-lg">{isBatalAbsen ? 'Batalkan Absensi?' : 'Konfirmasi Absensi'}</h3>
              <p className="text-gray-500 text-sm mt-1">
                {isBatalAbsen ? `Batalkan absensi sesi ${sesiAbsen === 'subuh' ? 'Subuh' : 'Pagi'}?` : `Konfirmasi absen hadir sesi ${sesiAbsen === 'subuh' ? 'Subuh' : 'Pagi'}`}
              </p>
              <div className="mt-3 p-3 bg-gray-50 rounded-xl text-left text-sm space-y-1">
                <div>Nama: <span className="font-semibold">{guruProfile?.nama}</span></div>
                <div>Sesi: <span className="font-semibold">{sesiAbsen === 'subuh' ? 'Subuh (04.00 - 05.30)' : 'Pagi (08.00 - 09.45)'}</span></div>
                <div>Tanggal: <span className="font-semibold">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPopupAbsen(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm">Batal</button>
              <button onClick={handleKonfirmasiAbsen} className="flex-1 text-white py-3 rounded-xl font-semibold text-sm"
                style={{ background: isBatalAbsen ? '#dc2626' : 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                {isBatalAbsen ? 'Ya, Batalkan' : 'Ya, Absen Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER MOBILE */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 text-white px-3 py-2.5 flex items-center justify-between shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-full p-0.5 w-9 h-9 flex items-center justify-center shadow flex-shrink-0">
            <Image src="/logo.png" alt="Logo" width={30} height={30} className="object-contain" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm leading-tight">Daarus Salaf</div>
            <div className="text-blue-200 text-xs truncate">{guruProfile?.nama || 'Guru'}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <TombolAbsen mode="mobile" />
          <button onClick={() => setSidebarOpen(true)} className="text-white text-2xl p-1">☰</button>
        </div>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex">
        {/* SIDEBAR */}
        <div className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:w-64`}
          style={{ background: 'linear-gradient(180deg, #1a3a5c 0%, #1e4080 100%)' }}>
          <div className="p-5 border-b border-blue-700">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full p-1 shadow-md flex-shrink-0 w-14 h-14 flex items-center justify-center">
                <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Pondok Pesantren</div>
                <div className="text-white font-bold text-base">Daarus Salaf</div>
                <div className="text-blue-300 text-xs">Sukoharjo</div>
              </div>
            </div>
            <div className="mt-3 bg-blue-800 bg-opacity-60 rounded-xl px-3 py-2 border border-blue-600">
              <div className="text-blue-300 text-xs">Masuk sebagai</div>
              <div className="text-white font-semibold text-sm">{guruProfile?.nama || 'Guru'}</div>
              <div className="text-blue-300 text-xs">
                Guru Musami'
                {guruProfile?.is_wali_kelas && (
                  <span className="ml-1 bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full text-xs font-bold">
                    Wali Kelas {guruProfile.wali_kelas_num} {guruProfile.wali_kelas_jenis === 'banin' ? 'Banin' : guruProfile.wali_kelas_jenis === 'banat' ? 'Banat' : 'TN'}
                  </span>
                )}
              </div>
            </div>
            <TombolAbsen mode="sidebar" />
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map(menu => (
              <button key={menu.id}
                onClick={() => {
                  setActiveMenu(menu.id); setSuccessMsg(''); setSidebarOpen(false)
                  if (menu.id === 'riwayat') fetchRiwayat()
                  if (menu.id === 'ujian') fetchNilaiUjian()
                  if (menu.id === 'rapot') fetchPeriodeAktif()
                }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium flex items-center gap-3 ${activeMenu === menu.id ? 'bg-white text-blue-900 shadow-md font-bold' : 'text-blue-100 hover:bg-white hover:bg-opacity-10'}`}>
                <span className="text-lg">{menu.icon}</span>{menu.label}
                {menu.id === 'ujian' && isUjian && (
                  <span className="ml-auto text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">Aktif</span>
                )}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-blue-700">
            <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-semibold">Keluar</button>
            <button onClick={() => setSidebarOpen(false)} className="w-full text-blue-300 py-2 rounded-xl text-xs md:hidden mt-1">✕ Tutup</button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0 min-w-0">

          {/* INPUT SETORAN */}
          {activeMenu === 'input' && (
            <div>
              <div className="rounded-2xl p-5 mb-4 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="absolute -bottom-8 right-10 w-32 h-32 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-white font-bold text-xl">Input Setoran</h2>
                      <p className="text-blue-200 text-sm mt-1">{tanggal}</p>
                      <p className="text-blue-100 text-xs mt-1">{santriList.length} santri dalam kelompok</p>
                    </div>
                    <div className="hidden md:flex flex-col gap-1.5">
                      <button onClick={() => handleKlikAbsen('subuh')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold text-center transition ${absenSubuh ? 'bg-green-500 text-white' : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'}`}>
                        {absenSubuh ? '✓ Absen Subuh' : 'Klik — Absen Subuh'}
                      </button>
                      <button onClick={() => handleKlikAbsen('pagi')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold text-center transition ${absenPagi ? 'bg-green-500 text-white' : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'}`}>
                        {absenPagi ? '✓ Absen Pagi' : 'Klik — Absen Pagi'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {isLibur && (
                <div className="mb-4 p-4 rounded-2xl border-2 border-orange-300 bg-orange-50 flex items-center gap-3">
                  <span className="text-2xl">🏖</span>
                  <div>
                    <div className="font-bold text-orange-800 text-sm">
                      {isLiburMingguan ? (hariMinggu === 0 ? 'Hari ini Ahad — Libur Mingguan' : 'Hari ini Jumat — Libur Mingguan') : kalenderAktif?.nama}
                    </div>
                    <div className="text-orange-600 text-xs">Tidak ada setoran hari ini</div>
                  </div>
                </div>
              )}

              {isUjian && (
                <div className="mb-4 p-4 rounded-2xl border-2 border-red-300 bg-red-50 flex items-center gap-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <div className="font-bold text-red-800 text-sm">{kalenderAktif?.nama}</div>
                    <div className="text-red-600 text-xs">
                      {kalenderAktif?.tipe === 'semester' ? 'Target ujian: 1/10 dari total hafalan. Gunakan menu Input Nilai Ujian.' : 'Periode ujian mid semester aktif. Gunakan menu Input Nilai Ujian.'}
                    </div>
                  </div>
                </div>
              )}

              {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {successMsg}</div>}

              <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                {/* Toggle Guru Pengganti */}
                <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div onClick={() => { setGuruPengganti(!guruPengganti); setSelectedSantri(null); setSearchSantri(''); setSetoranLamaHariIni(null) }}
                      className={`w-12 h-6 rounded-full transition-all flex-shrink-0 ${guruPengganti ? 'bg-blue-600' : 'bg-gray-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-all ${guruPengganti ? 'ml-6' : 'ml-0.5'}`} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-700">Mode Guru Pengganti</div>
                      <div className="text-xs text-gray-400">Aktifkan untuk simak santri kelompok lain</div>
                    </div>
                  </label>
                </div>

                {/* Pilih Santri */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pilih Santri {guruPengganti && <span className="text-blue-500 text-xs">(mode pengganti)</span>}
                  </label>
                  <input type="text" value={searchSantri} onChange={e => setSearchSantri(e.target.value)}
                    placeholder="🔍 Cari nama santri..." className={inputClass + ' mb-2'} />
                  {!selectedSantri && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                      {santriTampil.length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">Tidak ditemukan</div>
                      )}
                      {santriTampil.map(s => (
                        <button key={s.id} onClick={() => {
                          setSelectedSantri(s)
                          setSearchSantri(s.nama)
                          setSetoranLamaHariIni(null)
                          setJenis(s.jenjang === 'ulya' ? 'lama' : 'baru')
                          if (s.jenjang === 'ula') cekSetoranLamaHariIni(s.id)
                        }}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b last:border-0 text-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{s.nama}</span>
                              {s.kelas && <span className="text-gray-400 text-xs ml-2">{s.kelas}</span>}
                              {guruPengganti && <span className="text-blue-400 text-xs ml-2">({s.guru?.nama || '-'})</span>}
                            </div>
                            {s.jenjang && (
                              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${s.jenjang === 'ula' ? 'bg-green-100 text-green-700' : s.jenjang === 'wustha' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                {s.jenjang}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedSantri && (
                    <div className="mt-2 p-3 rounded-xl border bg-blue-50 border-blue-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-800">{selectedSantri.nama}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Total: <span className="font-semibold text-blue-700">{selectedSantri.total_hafalan_juz?.toFixed(2) || 0} Juz</span>
                            {selectedSantri.jenjang && (
                              <span className="ml-2 bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-xs font-semibold capitalize">{selectedSantri.jenjang}</span>
                            )}
                          </div>
                          {targetMurojaah && !isUjian && (
                            <div className="text-xs text-green-600 mt-0.5">
                              Target Murojaah: <span className="font-semibold">{targetMurojaah.targetHalaman} hal/hari</span>
                              <span className="text-gray-400 ml-1">(≈ {targetMurojaah.targetLembar} lembar)</span>
                            </div>
                          )}
                          {isUjian && kalenderAktif?.tipe === 'semester' && selectedSantri.total_hafalan_juz > 0 && (() => {
                            const t = hitungTargetUjianSemester(selectedSantri)
                            return t ? (
                              <div className="text-xs text-red-600 mt-0.5 font-semibold">
                                Target Ujian Semester: {t.targetHalaman} hal (≈ {t.targetLembar} lembar)
                              </div>
                            ) : null
                          })()}
                          {guruPengganti && <div className="text-xs text-orange-500 mt-0.5">Guru tetap: {selectedSantri.guru?.nama || '-'}</div>}
                        </div>
                        <button onClick={() => { setSelectedSantri(null); setSearchSantri(''); setSetoranLamaHariIni(null) }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                      </div>

                      {/* Info jadwal per jenjang */}
                      {selectedSantri.jenjang && (
                        <div className="mt-2 p-2 bg-white rounded-xl border border-blue-100">
                          <p className="text-xs font-semibold text-blue-700 mb-1">Jadwal Setoran {selectedSantri.jenjang.charAt(0).toUpperCase() + selectedSantri.jenjang.slice(1)}:</p>
                          <div className="flex gap-3 flex-wrap">
                            <span className="text-xs text-gray-600">Hafalan Baru: <span className="font-semibold text-blue-700">{getJadwalJenjang(selectedSantri.jenjang).baru}</span></span>
                            {getJadwalJenjang(selectedSantri.jenjang).adaLama && (
                              <span className="text-xs text-gray-600">Murojaah: <span className="font-semibold text-purple-700">{getJadwalJenjang(selectedSantri.jenjang).lama}</span></span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Kehadiran */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status Kehadiran Santri</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[
                      { value: 'hadir', label: 'Hadir', color: 'border-green-500 bg-green-50 text-green-700' },
                      { value: 'sakit', label: 'Sakit', color: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
                      { value: 'izin', label: 'Izin', color: 'border-blue-500 bg-blue-50 text-blue-700' },
                    ].map(s => (
                      <button key={s.value} onClick={() => setStatusKehadiran(s.value)}
                        className={`py-2.5 rounded-xl text-xs font-bold border-2 transition ${statusKehadiran === s.value ? s.color : 'border-gray-200 bg-white text-gray-500'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setStatusKehadiran('alpha')}
                      className={`py-2.5 rounded-xl text-xs font-bold border-2 transition ${statusKehadiran === 'alpha' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                      Alpha
                    </button>
                    <button onClick={() => setStatusKehadiran('hadir_tidak_setor')}
                      className={`py-2.5 rounded-xl text-xs font-bold border-2 transition ${statusKehadiran === 'hadir_tidak_setor' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                      Hadir, Tdk Setor
                    </button>
                  </div>
                </div>

                {statusKehadiran === 'hadir' && (
                  <>
                    {/* Jenis Setoran */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Jenis Setoran</label>

                      {/* Peringatan khusus Ula */}
                      {selectedSantri?.jenjang === 'ula' && (
                        <div className="mb-3 p-3 rounded-xl border-2 border-yellow-300 bg-yellow-50">
                          <p className="text-xs font-bold text-yellow-800 mb-1">Ketentuan Jenjang Ula:</p>
                          <p className="text-xs text-yellow-700">Santri wajib setor <strong>Murojaah</strong> terlebih dahulu dan dinyatakan <strong>Lancar</strong> sebelum boleh setor Hafalan Baru.</p>
                          {setoranLamaHariIni && (
                            <div className={`mt-2 p-2 rounded-lg text-xs font-semibold ${setoranLamaHariIni.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {setoranLamaHariIni.status === 'lancar'
                                ? '✓ Murojaah hari ini: Lancar — Boleh setor hafalan baru'
                                : '✗ Murojaah hari ini: Rosib — Hafalan baru tidak boleh disetorkan'}
                            </div>
                          )}
                          {!setoranLamaHariIni && (
                            <div className="mt-2 p-2 rounded-lg text-xs bg-gray-100 text-gray-600">
                              Belum ada setoran murojaah hari ini — setor murojaah terlebih dahulu
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            if (selectedSantri?.jenjang === 'ulya') {
                              setErrorMsg('Santri Ulya tidak menyetorkan hafalan baru — hafalan baru bersifat mandiri!')
                              return
                            }
                            if (selectedSantri?.jenjang === 'ula') {
                              if (!setoranLamaHariIni) {
                                setErrorMsg('Santri Ula wajib setor Murojaah terlebih dahulu!')
                                return
                              }
                              if (setoranLamaHariIni.status === 'rosib') {
                                setErrorMsg('Murojaah rosib — Hafalan Baru tidak boleh disetorkan hari ini!')
                                return
                              }
                            }
                            setJenis('baru')
                            setErrorMsg('')
                          }}
                          className={`p-4 rounded-xl border-2 transition text-left ${jenis === 'baru' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${ulaBlokHafalanBaru || selectedSantri?.jenjang === 'ulya' ? 'opacity-40 cursor-not-allowed' : ''}`}>
          <div className="text-sm font-bold text-gray-800">Hafalan Baru</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {selectedSantri?.jenjang === 'ulya' ? 'Mandiri (tidak disetorkan)' : selectedSantri?.jenjang === 'ula' ? 'Setelah murojaah lancar' : 'Tambah hafalan baru'}
          </div>
                        </button>
                        <button
                          onClick={() => { setJenis('lama'); setErrorMsg('') }}
                          disabled={false}
          className={`p-4 rounded-xl border-2 transition text-left ${jenis === 'lama' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
          <div className="text-sm font-bold text-gray-800">Murojaah</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {selectedSantri?.jenjang === 'ula' ? 'Wajib setor dulu' : 'Mengulang hafalan lama'}
          </div>
                        </button>
                      </div>
                    </div>

                    {jenis === 'baru' && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Detail Hafalan Baru</label>
                        <input type="text" value={searchSurahBaru} onChange={e => setSearchSurahBaru(e.target.value)}
                          placeholder="🔍 Cari surah..." className={inputClass + ' mb-2'} />
                        {!surahBaru && (
                          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto mb-3">
                            {surahList
                              .filter(s => !searchSurahBaru || s.nama_latin.toLowerCase().includes(searchSurahBaru.toLowerCase()) || String(s.nomor).includes(searchSurahBaru))
                              .map(s => (
                                <button key={s.nomor} onClick={() => { setSurahBaru(String(s.nomor)); setAyatMulaiBaru('1') }}
                                  className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-0 text-sm">
                                  <span className="font-medium">{s.nama_latin}</span>
                                  <span className="text-gray-400 text-xs ml-2">{s.nomor} • {s.jumlah_ayat} ayat</span>
                                </button>
                              ))}
                          </div>
                        )}
                        {surahBaru && (
                          <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl mb-3">
                            <span className="text-sm font-semibold text-blue-700">
                              {surahList.find(s => s.nomor === parseInt(surahBaru))?.nama_latin}
                              <span className="text-gray-400 font-normal ml-2 text-xs">
                                ({surahList.find(s => s.nomor === parseInt(surahBaru))?.jumlah_ayat} ayat)
                              </span>
                            </span>
                            <button onClick={() => { setSurahBaru(''); setSearchSurahBaru(''); setAyatMulaiBaru(''); setAyatSelesaiBaru('') }} className="text-gray-400 text-lg">×</button>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Ayat Mulai</label>
                            <input type="number" value={ayatMulaiBaru} onChange={e => setAyatMulaiBaru(e.target.value)} placeholder="1" className={inputClass} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Ayat Selesai</label>
                            <input type="number" value={ayatSelesaiBaru} onChange={e => setAyatSelesaiBaru(e.target.value)} placeholder="5" className={inputClass} />
                          </div>
                        </div>
                        {surahBaru && ayatMulaiBaru && ayatSelesaiBaru && (() => {
          const sNomor = parseInt(surahBaru)
          const aMulai = parseInt(ayatMulaiBaru)
          const aSelesai = parseInt(ayatSelesaiBaru)
          const sTerakhir = selectedSantri?.surah_terakhir_nomor
          const aTerakhir = selectedSantri?.ayat_terakhir || 0
          let preview = 0
          if (status === 'rosib') {
            preview = 0
          } else if (!sTerakhir) {
            preview = hitungPenambahanJuz(sNomor, aMulai, aSelesai)
          } else if (sNomor > sTerakhir) {
            preview = 0
          } else if (sNomor === sTerakhir) {
            preview = aSelesai > aTerakhir ? hitungPenambahanJuz(sNomor, aTerakhir + 1, aSelesai) : 0
          } else {
            preview = hitungPenambahanJuz(sNomor, aMulai, aSelesai)
          }
          return (
            <div className={`mt-2 text-xs font-medium ${preview > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
              {preview > 0 ? `+ ${preview.toFixed(4)} Juz` : '± 0 Juz (tidak ada penambahan)'}
            </div>
          )
        })()}
                      </div>
                    )}

                    {jenis === 'lama' && (
                      <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Detail Murojaah</label>
                        {targetMurojaah && (
                          <div className="mb-3 p-3 bg-white rounded-xl border border-purple-200">
                            <p className="text-xs font-semibold text-purple-700 mb-1">Target Murojaah Hari Ini:</p>
                            <p className="text-xs text-gray-600">
                              ± <span className="font-bold text-purple-700">{targetMurojaah.targetHalaman} halaman</span>
                              <span className="text-gray-400 ml-1">(≈ {targetMurojaah.targetLembar} lembar)</span>
                            </p>
                            {getSaranMurojaah() && (
                              <p className="text-xs text-gray-500 mt-1">Posisi terakhir: <span className="font-semibold">{getSaranMurojaah()?.nama_latin}</span></p>
                            )}
                          </div>
                        )}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Dari Surah</label>
                            <input type="text" value={searchSurahMulai} onChange={e => setSearchSurahMulai(e.target.value)}
                              placeholder="🔍 Cari surah mulai..." className={inputClass + ' mb-1'} />
                            {!surahMulai && (
                              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto mb-1">
                                {surahList
                                  .filter(s => !searchSurahMulai || s.nama_latin.toLowerCase().includes(searchSurahMulai.toLowerCase()) || String(s.nomor).includes(searchSurahMulai))
                                  .map(s => (
                                    <button key={s.nomor} onClick={() => { setSurahMulai(String(s.nomor)); setAyatMulaiMurojaah('1') }}
                                      className="w-full text-left px-3 py-2 hover:bg-purple-50 border-b last:border-0 text-sm">
                                      <span className="font-medium">{s.nama_latin}</span>
                                      <span className="text-gray-400 text-xs ml-2">{s.nomor}</span>
                                    </button>
                                  ))}
                              </div>
                            )}
                            {surahMulai && (
                              <div className="flex items-center justify-between px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl mb-1">
                                <span className="text-sm font-semibold text-purple-700">
                                  {surahList.find(s => s.nomor === parseInt(surahMulai))?.nama_latin}
                                </span>
                                <button onClick={() => { setSurahMulai(''); setSearchSurahMulai('') }} className="text-gray-400 text-lg">×</button>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Ayat Mulai</label>
                            <input type="number" value={ayatMulaiMurojaah} onChange={e => setAyatMulaiMurojaah(e.target.value)} placeholder="1" className={inputClass} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Surah Selesai</label>
                            <input type="text" value={searchSurahSelesai} onChange={e => setSearchSurahSelesai(e.target.value)}
                              placeholder="🔍 Cari surah selesai..." className={inputClass + ' mb-1'} />
                            {!surahSelesai && (
                              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                                {surahList
                                  .filter(s => !searchSurahSelesai || s.nama_latin.toLowerCase().includes(searchSurahSelesai.toLowerCase()) || String(s.nomor).includes(searchSurahSelesai))
                                  .map(s => (
                                    <button key={s.nomor} onClick={() => handleSurahSelesaiChange(String(s.nomor))}
                                      className="w-full text-left px-3 py-2 hover:bg-purple-50 border-b last:border-0 text-sm">
                                      <span className="font-medium">{s.nama_latin}</span>
                                      <span className="text-gray-400 text-xs ml-2">{s.nomor}</span>
                                    </button>
                                  ))}
                              </div>
                            )}
                            {surahSelesai && (
                              <div className="flex items-center justify-between px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl">
                                <span className="text-sm font-semibold text-purple-700">
                                  {surahList.find(s => s.nomor === parseInt(surahSelesai))?.nama_latin}
                                </span>
                                <button onClick={() => { setSurahSelesai(''); setSearchSurahSelesai('') }} className="text-gray-400 text-lg">×</button>
                              </div>
                            )}
                          </div>
                          {surahSelesai && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Ayat Selesai</label>
                              <input type="number" value={ayatSelesaiMurojaah} onChange={e => setAyatSelesaiMurojaah(e.target.value)} className={inputClass} />
                            </div>
                          )}
                        </div>
                        {surahMulai && surahSelesai && (
                          <div className="mt-2 p-2 bg-white rounded-lg text-xs text-purple-600">
                            {surahList.find(s => s.nomor === parseInt(surahMulai))?.nama_latin} → {surahList.find(s => s.nomor === parseInt(surahSelesai))?.nama_latin}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Status Hafalan</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setStatus('lancar')}
                          className={`p-4 rounded-xl border-2 transition ${status === 'lancar' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                          <div className="text-sm font-bold text-gray-800">Lancar</div>
                          <div className="text-xs text-gray-400">Hafalan baik</div>
                        </button>
                        <button onClick={() => setStatus('rosib')}
                          className={`p-4 rounded-xl border-2 transition ${status === 'rosib' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                          <div className="text-sm font-bold text-gray-800">Rosib</div>
                          <div className="text-xs text-gray-400">Perlu diulang</div>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan (Opsional)</label>
                  <textarea value={catatan} onChange={e => setCatatan(e.target.value)}
                    placeholder={statusKehadiran === 'hadir_tidak_setor' ? 'Alasan tidak setor (opsional)...' : statusKehadiran !== 'hadir' ? 'Keterangan tambahan...' : 'Catatan untuk wali santri...'}
                    rows={2} className={inputClass} />
                </div>

                {errorMsg && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">{errorMsg}</div>}

                <button onClick={handleInputSetoran} disabled={loading || !selectedSantri}
                  className="w-full text-white py-4 rounded-xl font-bold transition disabled:opacity-50 text-base shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                  {loading ? 'Menyimpan...' : statusKehadiran === 'hadir_tidak_setor' ? 'Simpan Status' : statusKehadiran !== 'hadir' ? 'Simpan Ketidakhadiran' : 'Simpan Setoran'}
                </button>
              </div>
            </div>
          )}

          {/* INPUT NILAI UJIAN */}
          {activeMenu === 'ujian' && (
            <div>
              <div className="rounded-2xl p-5 mb-4 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Input Nilai Ujian</h2>
                  <p className="text-orange-200 text-sm mt-1">{tanggal}</p>
                  {kalenderAktif ? (
                    <div className="mt-2 bg-white bg-opacity-20 rounded-xl px-3 py-2 inline-block">
                      <p className="text-white text-xs font-semibold">{kalenderAktif.nama}</p>
                      <p className="text-orange-200 text-xs">{kalenderAktif.tipe === 'semester' ? 'Target: 1/10 dari total hafalan' : 'Ujian hafalan mid semester'}</p>
                    </div>
                  ) : (
                    <div className="mt-2 bg-white bg-opacity-20 rounded-xl px-3 py-2 inline-block">
                      <p className="text-orange-100 text-xs">Tidak ada jadwal ujian aktif hari ini</p>
                      <p className="text-orange-200 text-xs">Input nilai tetap bisa dilakukan</p>
                    </div>
                  )}
                </div>
              </div>

              {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {successMsg}</div>}

              <div className="bg-white rounded-2xl shadow p-5 border border-gray-100 mb-5">
                <h3 className="font-bold text-gray-800 mb-4">Form Input Nilai Ujian</h3>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Santri</label>
                  <input type="text" value={searchSantriUjian} onChange={e => setSearchSantriUjian(e.target.value)}
                    placeholder="Cari nama santri..." className={inputClass + ' mb-2'} />
                  {searchSantriUjian && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                      {santriTampilUjian.map(s => (
                        <button key={s.id} onClick={() => { setSelectedSantriUjian(s); setSearchSantriUjian(s.nama) }}
                          className="w-full text-left px-4 py-2.5 hover:bg-orange-50 border-b last:border-0 text-sm">
                          <span className="font-medium">{s.nama}</span>
                          {s.kelas && <span className="text-gray-400 text-xs ml-2">{s.kelas}</span>}
                        </button>
                      ))}
                      {santriTampilUjian.length === 0 && <div className="px-4 py-3 text-sm text-gray-400">Tidak ditemukan</div>}
                    </div>
                  )}
                  {selectedSantriUjian && (
                    <div className="mt-2 p-3 rounded-xl border bg-orange-50 border-orange-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-800">{selectedSantriUjian.nama}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Total Hafalan: <span className="font-semibold text-orange-700">{selectedSantriUjian.total_hafalan_juz?.toFixed(2) || 0} Juz</span></div>
                          {kalenderAktif?.tipe === 'semester' && selectedSantriUjian.total_hafalan_juz > 0 && (() => {
                            const t = hitungTargetUjianSemester(selectedSantriUjian)
                            return t ? <div className="text-xs text-red-600 mt-0.5 font-semibold">Target Ujian: {t.targetHalaman} hal (≈ {t.targetLembar} lembar)</div> : null
                          })()}
                        </div>
                        <button onClick={() => { setSelectedSantriUjian(null); setSearchSantriUjian('') }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Surah yang Diujikan</label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Dari Surah</label>
                        <select value={ujianSurahMulai} onChange={e => { setUjianSurahMulai(e.target.value); setUjianAyatMulai('1') }} className={inputClass}>
                          <option value="">-- Pilih --</option>
                          {surahList.map(s => <option key={s.nomor} value={s.nomor}>{s.nomor}. {s.nama_latin}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Ayat Mulai</label>
                        <input type="number" value={ujianAyatMulai} onChange={e => setUjianAyatMulai(e.target.value)} placeholder="1" className={inputClass} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Sampai Surah</label>
                        <select value={ujianSurahSelesai} onChange={e => handleUjianSurahSelesaiChange(e.target.value)} className={inputClass}>
                          <option value="">-- Pilih --</option>
                          {surahList.map(s => <option key={s.nomor} value={s.nomor}>{s.nomor}. {s.nama_latin}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Ayat Selesai</label>
                        <input type="number" value={ujianAyatSelesai} onChange={e => setUjianAyatSelesai(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Input Kesalahan</label>
                  <div className="space-y-3">
                    {[
                      { label: 'Ditegur (tanpa dibenarkan)', sub: 'Setiap 1 kali = -0.1 poin', val: ujianJumlahTegur, set: setUjianJumlahTegur, color: 'orange' },
                      { label: 'Diberi tahu ayat sebelumnya', sub: 'Setiap 1 kali = -0.1 poin', val: ujianJumlahTahuAyat, set: setUjianJumlahTahuAyat, color: 'orange' },
                      { label: 'Lupa & diberi tahu', sub: 'Setiap 1 kali = -1.0 poin', val: ujianJumlahLupa, set: setUjianJumlahLupa, color: 'red' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                        <div>
                          <div className="text-sm font-semibold text-gray-700">{item.label}</div>
                          <div className="text-xs text-gray-400">{item.sub}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => item.set(String(Math.max(0, parseInt(item.val) - 1)))}
                            className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center hover:bg-gray-200">−</button>
                          <span className="w-10 text-center font-bold text-lg text-gray-800">{item.val}</span>
                          <button onClick={() => item.set(String(parseInt(item.val) + 1))}
                            className={`w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center ${item.color === 'red' ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 rounded-xl border-2 border-orange-300"
                    style={{ background: hitungNilaiUjian() >= 8 ? '#f0fdf4' : hitungNilaiUjian() >= 6 ? '#fffbeb' : '#fef2f2' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">Nilai Akhir:</span>
                      <span className={`text-3xl font-bold ${hitungNilaiUjian() >= 8 ? 'text-green-600' : hitungNilaiUjian() >= 6 ? 'text-yellow-600' : 'text-red-600'}`}>{hitungNilaiUjian()}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      10 − ({ujianJumlahTegur}×0.1) − ({ujianJumlahTahuAyat}×0.1) − ({ujianJumlahLupa}×1) = {hitungNilaiUjian()}
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan (Opsional)</label>
                  <textarea value={ujianCatatan} onChange={e => setUjianCatatan(e.target.value)}
                    placeholder="Catatan tambahan untuk nilai ujian ini..." rows={2} className={inputClass} />
                </div>

                {errorMsg && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">{errorMsg}</div>}

                <button onClick={handleInputNilaiUjian} disabled={loading || !selectedSantriUjian}
                  className="w-full text-white py-4 rounded-xl font-bold transition disabled:opacity-50 text-base shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>
                  {loading ? 'Menyimpan...' : `Simpan Nilai Ujian (${hitungNilaiUjian()})`}
                </button>
              </div>

              {nilaiUjianList.length > 0 && (
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>
                    <h3 className="text-white font-bold">Riwayat Nilai Ujian</h3>
                    <p className="text-orange-200 text-xs mt-0.5">{nilaiUjianList.length} nilai tercatat</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {nilaiUjianList.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>
                            {item.santri?.nama?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-gray-800">{item.santri?.nama}</div>
                            <div className="text-xs text-gray-400">{item.surah_mulai?.nama_latin} → {item.surah_selesai?.nama_latin} • {item.tanggal}</div>
                            <div className="text-xs text-gray-400">Tegur: {item.jumlah_tegur} | Tahu Ayat: {item.jumlah_tahu_ayat} | Lupa: {item.jumlah_lupa}</div>
                          </div>
                        </div>
                        <div className={`text-2xl font-bold ${item.nilai_akhir >= 8 ? 'text-green-600' : item.nilai_akhir >= 6 ? 'text-yellow-600' : 'text-red-600'}`}>{item.nilai_akhir}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

{/* INPUT NILAI RAPOT */}
          {activeMenu === 'rapot' && (
            <div>
              <div className="rounded-2xl p-5 mb-4 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Input Nilai Rapot</h2>
                  <p className="text-blue-200 text-sm mt-1">Jenjang Ula</p>
                  {periodeAktif
                    ? <div className="mt-2 bg-white bg-opacity-20 rounded-xl px-3 py-1.5 inline-block">
                        <p className="text-white text-xs font-semibold">{periodeAktif.nama}</p>
                        <p className="text-blue-200 text-xs">{periodeAktif.tahun_ajaran}</p>
                      </div>
                    : <p className="text-blue-300 text-xs mt-1">Belum ada periode aktif</p>
                  }
                </div>
              </div>

              {/* Tab */}
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'input', label: 'Input Nilai' },
                  { id: 'rekap', label: 'Rekap Kelas' },
                ].map(tab => (
                  <button key={tab.id}
                    onClick={() => setRapotActiveTab(tab.id)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition border-2 ${rapotActiveTab === tab.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {!periodeAktif && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-5 text-center mb-4">
                  <p className="text-yellow-800 font-semibold">Belum ada periode rapot aktif</p>
                  <p className="text-yellow-600 text-sm mt-1">Minta admin untuk mengaktifkan periode rapot</p>
                  <button onClick={fetchPeriodeAktif} className="mt-3 px-4 py-2 bg-yellow-400 text-white rounded-xl text-sm font-semibold">Cek Ulang</button>
                </div>
              )}

              {/* TAB INPUT NILAI */}
              {rapotActiveTab === 'input' && periodeAktif && (
                <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                  {/* Pilih Santri */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Santri</label>
                    <input type="text" value={searchSantriRapot} onChange={e => setSearchSantriRapot(e.target.value)}
                      placeholder="Cari nama santri..." className={inputClass + ' mb-2'} />
                    {searchSantriRapot && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                        {rapotSantriList.filter(s => s.nama.toLowerCase().includes(searchSantriRapot.toLowerCase())).map(s => (
                          <button key={s.id} onClick={() => {
                            setSelectedSantriRapot(s); setSearchSantriRapot(s.nama)
                            fetchNilaiRapotSantri(s.id)
                          }} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b last:border-0 text-sm">
                            <span className="font-medium">{s.nama}</span>
                            {s.kelas && <span className="text-gray-400 text-xs ml-2">{s.kelas}</span>}
                          </button>
                        ))}
                        {rapotSantriList.filter(s => s.nama.toLowerCase().includes(searchSantriRapot.toLowerCase())).length === 0 &&
                          <div className="px-4 py-3 text-sm text-gray-400">Tidak ditemukan</div>}
                      </div>
                    )}
                    {selectedSantriRapot && (
                      <div className="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-200 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-gray-800">{selectedSantriRapot.nama}</div>
                          <div className="text-xs text-gray-500">{selectedSantriRapot.kelas} • {selectedSantriRapot.total_hafalan_juz?.toFixed(2)} Juz</div>
                          {existingRapotId && <div className="text-xs text-green-600 mt-0.5">✓ Data rapot sudah ada — akan diupdate</div>}
                        </div>
                        <button onClick={() => { setSelectedSantriRapot(null); setSearchSantriRapot(''); setNilaiRapot({}) }} className="text-gray-400 text-xl">×</button>
                      </div>
                    )}
                  </div>

                  {selectedSantriRapot && (
                    <>
                      <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-200">
                        <p className="text-sm font-bold text-gray-700 mb-3">A. Hifzhul Qur'an</p>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Kelancaran (60-95)</label>
                            <input type="number" min="60" max="95" value={nilaiRapot.kelancaran || ''}
                              onChange={e => setNilaiRapot({...nilaiRapot, kelancaran: e.target.value})}
                              placeholder="misal: 85" className={inputClass} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Tajwid (60-95)</label>
                            <input type="number" min="60" max="95" value={nilaiRapot.tajwid || ''}
                              onChange={e => setNilaiRapot({...nilaiRapot, tajwid: e.target.value})}
                              placeholder="misal: 80" className={inputClass} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Keterangan Hafalan</label>
                          <input type="text" value={nilaiRapot.keterangan_hafalan || ''}
                            onChange={e => setNilaiRapot({...nilaiRapot, keterangan_hafalan: e.target.value})}
                            placeholder="misal: 3,5 juz dari An-Nas hingga Al-Qomar" className={inputClass} />
                        </div>
                      </div>
                      <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <p className="text-sm font-bold text-gray-700 mb-3">B. Materi Diiniyyah</p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { key: 'aqidah', label: 'Aqidah' },
                            { key: 'akhlak', label: 'Akhlak/Adab' },
                            { key: 'fiqh', label: 'Fiqh' },
                            { key: 'bhs_arab', label: 'Bahasa Arab' },
                            { key: 'siroh', label: 'Siroh' },
                            { key: 'khoth', label: 'Khoth' },
                          ].map(m => (
                            <div key={m.key}>
                              <label className="block text-xs text-gray-500 mb-1">{m.label}</label>
                              <input type="number" min="60" max="95" value={nilaiRapot[m.key] || ''}
                                onChange={e => setNilaiRapot({...nilaiRapot, [m.key]: e.target.value})}
                                placeholder="60-95" className={inputClass} />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                        <p className="text-sm font-bold text-gray-700 mb-3">C. Materi Umum</p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { key: 'bhs_indonesia', label: 'Bahasa Indonesia' },
                            { key: 'berhitung', label: 'Berhitung' },
                            { key: 'ipa', label: 'IPA' },
                            { key: 'ips', label: 'IPS' },
                          ].map(m => (
                            <div key={m.key}>
                              <label className="block text-xs text-gray-500 mb-1">{m.label}</label>
                              <input type="number" min="60" max="95" value={nilaiRapot[m.key] || ''}
                                onChange={e => setNilaiRapot({...nilaiRapot, [m.key]: e.target.value})}
                                placeholder="60-95" className={inputClass} />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mb-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                        <p className="text-sm font-bold text-gray-700 mb-3">Kepribadian</p>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { key: 'akhlak_kepribadian', label: 'Akhlak' },
                            { key: 'kebersihan', label: 'Kebersihan' },
                            { key: 'ketertiban', label: 'Ketertiban' },
                          ].map(m => (
                            <div key={m.key}>
                              <label className="block text-xs text-gray-500 mb-1">{m.label}</label>
                              <select value={nilaiRapot[m.key] || 'B'}
                                onChange={e => setNilaiRapot({...nilaiRapot, [m.key]: e.target.value})}
                                className={inputClass}>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mb-4 p-4 bg-red-50 rounded-xl border border-red-200">
                        <p className="text-sm font-bold text-gray-700 mb-3">Ketidakhadiran</p>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { key: 'hadir_sakit', label: 'Sakit' },
                            { key: 'hadir_izin', label: 'Izin' },
                            { key: 'hadir_alpha', label: 'Tanpa Izin' },
                          ].map(m => (
                            <div key={m.key}>
                              <label className="block text-xs text-gray-500 mb-1">{m.label}</label>
                              <input type="number" min="0" value={nilaiRapot[m.key] ?? 0}
                                onChange={e => setNilaiRapot({...nilaiRapot, [m.key]: e.target.value})}
                                className={inputClass} />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mb-4 p-4 bg-teal-50 rounded-xl border border-teal-200">
                        <p className="text-sm font-bold text-gray-700 mb-3">Ekstrakurikuler</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Renang (jumlah pertemuan)</label>
                            <input type="number" min="0" value={nilaiRapot.ekskul_renang || ''}
                              onChange={e => setNilaiRapot({...nilaiRapot, ekskul_renang: e.target.value})}
                              placeholder="misal: 8" className={inputClass} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Beladiri</label>
                            <input type="text" value={nilaiRapot.ekskul_beladiri || ''}
                              onChange={e => setNilaiRapot({...nilaiRapot, ekskul_beladiri: e.target.value})}
                              placeholder="keterangan" className={inputClass} />
                          </div>
                        </div>
                      </div>
                      <div className="mb-5">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan Guru</label>
                        <textarea value={nilaiRapot.catatan || ''}
                          onChange={e => setNilaiRapot({...nilaiRapot, catatan: e.target.value})}
                          placeholder="misal: Alhamdulillah terus semangat belajar..." rows={2} className={inputClass} />
                      </div>
                      {rapotMsg && (
                        <div className={`p-3 rounded-xl mb-4 text-sm ${rapotMsg.startsWith('✓') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                          {rapotMsg}
                        </div>
                      )}
                      <button onClick={handleSimpanRapot} disabled={rapotLoading}
                        className="w-full text-white py-4 rounded-xl font-bold text-base shadow-lg disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                        {rapotLoading ? 'Menyimpan...' : existingRapotId ? '✓ Update Nilai Rapot' : '✓ Simpan Nilai Rapot'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* TAB REKAP KELAS */}
              {rapotActiveTab === 'rekap' && periodeAktif && (
                <div>
                  <div className="bg-white rounded-2xl shadow p-5 mb-4 border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Rekap Nilai Kelas</h3>
                    <div className="mb-4">
                      <label className="block text-xs text-gray-500 mb-1">Pilih Kelas</label>
                      <select value={rapotRekapKelas}
                        onChange={e => {
                          setRapotRekapKelas(e.target.value)
                          setRapotRekapData([])
                        }}
                        className={inputClass}>
                        <option value="">-- Pilih Kelas --</option>
                        {[1,2,3,4,5,6].map(k => (
                          <option key={k} value={k}>Kelas {k} Ula</option>
                        ))}
                      </select>
                    </div>
                    <button onClick={() => fetchRekapKelasByGuru(rapotRekapKelas)}
                      disabled={!rapotRekapKelas || rapotRekapLoading}
                      className="w-full text-white py-3 rounded-xl font-bold text-sm shadow disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                      {rapotRekapLoading ? 'Memuat...' : '🔍 Tampilkan Rekap Nilai'}
                    </button>
                  </div>

                  {rapotRekapData.length > 0 && (
                    <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                      <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                        <h3 className="text-white font-bold">Rekap Kelas {rapotRekapKelas} Ula</h3>
                        <p className="text-blue-200 text-xs mt-0.5">{rapotRekapData.length} santri • {periodeAktif.nama}</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table style={{ minWidth: '900px', width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                          <thead>
                            <tr style={{ background: '#f0f4ff' }}>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', width: '35px' }}>No</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', minWidth: '130px' }}>Nama Santri</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Klancaran</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Tajwid</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Aqidah</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Akhlak</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Fiqh</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Bhs Arab</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Siroh</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Khoth</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe' }}>Rata D</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Bhs Ind</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Hitung</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>IPA</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>IPS</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe' }}>Rata U</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: '#fef3c7', fontWeight: 'bold' }}>Rata Akhir</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: '#fef3c7', fontWeight: 'bold' }}>Peringkat</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rapotRekapData.map((n: any, i: number) => {
                              const isComplete = n.rata_akhir > 0
                              return (
                                <tr key={n.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{i + 1}</td>
                                  <td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>
                                    <div style={{ fontWeight: '600' }}>{n.santri?.nama || '-'}</div>
                                  </td>
                                  {[n.kelancaran, n.tajwid].map((v: any, idx: number) => (
                                    <td key={idx} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', color: v ? '#1e3a8a' : '#ccc' }}>{v ?? '-'}</td>
                                  ))}
                                  {[n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].map((v: any, idx: number) => (
                                    <td key={idx} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', color: v ? (v < 60 ? '#dc2626' : '#166534') : '#ccc' }}>{v ?? '-'}</td>
                                  ))}
                                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe', fontWeight: 'bold', color: '#1e3a8a' }}>
                                    {n.rata_diiniyyah ? n.rata_diiniyyah.toFixed(1) : '-'}
                                  </td>
                                  {[n.bhs_indonesia, n.berhitung, n.ipa, n.ips].map((v: any, idx: number) => (
                                    <td key={idx} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', color: v ? (v < 60 ? '#dc2626' : '#166534') : '#ccc' }}>{v ?? '-'}</td>
                                  ))}
                                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe', fontWeight: 'bold', color: '#1e3a8a' }}>
                                    {n.rata_umum ? n.rata_umum.toFixed(1) : '-'}
                                  </td>
                                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#fef9c3', fontWeight: 'bold', fontSize: '12px', color: isComplete ? '#92400e' : '#ccc' }}>
                                    {n.rata_akhir ? n.rata_akhir.toFixed(1) : '-'}
                                  </td>
                                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#fef9c3' }}>
                                    {isComplete ? (
                                      <span style={{
                                        background: n.peringkat === 1 ? '#fbbf24' : n.peringkat === 2 ? '#9ca3af' : n.peringkat === 3 ? '#f97316' : '#e5e7eb',
                                        color: n.peringkat <= 3 ? 'white' : '#374151',
                                        padding: '2px 8px', borderRadius: '999px', fontWeight: 'bold', fontSize: '11px'
                                      }}>{n.peringkat}</span>
                                    ) : '-'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-gray-400">Nilai merah = di bawah 60 • Peringkat dari Rata-rata Akhir (Diiniyyah + Umum) / 2</p>
                      </div>
                    </div>
                  )}

                  {rapotRekapData.length === 0 && !rapotRekapLoading && rapotRekapKelas && (
                    <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow border border-gray-100">
                      Belum ada data nilai untuk kelas ini
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* RIWAYAT */}
          {activeMenu === 'riwayat' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Riwayat Setoran</h2>
                  <p className="text-blue-200 text-sm mt-1">{riwayatList.length} setoran tercatat</p>
                </div>
              </div>
              <div className="space-y-3">
                {riwayatList.length === 0 && (
                  <div className="bg-white rounded-2xl p-10 text-center shadow border border-gray-100">
                    <p className="text-gray-400">Belum ada riwayat setoran</p>
                  </div>
                )}
                {riwayatList.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                          {item.santri?.nama?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{item.santri?.nama}</div>
                          <div className="text-xs text-gray-400">{item.tanggal}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.status_kehadiran !== 'hadir' ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status_kehadiran === 'sakit' ? 'bg-yellow-100 text-yellow-700' : item.status_kehadiran === 'izin' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                            {item.status_kehadiran?.toUpperCase()}
                          </span>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.status === 'lancar' ? 'Lancar' : 'Rosib'}
                          </span>
                        )}
                        {item.status_kehadiran === 'hadir' && (
                          <button onClick={() => { setEditSetoran(item); setEditStatus(item.status); setEditCatatan(item.catatan || '') }}
                            className="text-blue-500 text-xs px-2 py-1 rounded-lg hover:bg-blue-50 border border-blue-200">
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                    {item.status_kehadiran === 'hadir' && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {item.jenis === 'baru' ? 'Hafalan Baru' : 'Murojaah'}
                        </span>
                        <span className="text-xs text-gray-600">
                          {item.surah_mulai?.nama_latin || item.surah}
                          {item.surah_selesai && item.surah_mulai_nomor !== item.surah_selesai_nomor && <> → {item.surah_selesai?.nama_latin}</>}
                          {' '}ayat {item.ayat_mulai}–{item.ayat_selesai}
                        </span>
                        {item.guru_pengganti && <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">Pengganti</span>}
                      </div>
                    )}
                    {item.catatan && <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-600">{item.catatan}</div>}
                    {editSetoran?.id === item.id && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Edit Setoran:</p>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <button onClick={() => setEditStatus('lancar')}
                            className={`py-2 rounded-xl text-xs font-bold border-2 transition ${editStatus === 'lancar' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                            ✓ Lancar
                          </button>
                          <button onClick={() => setEditStatus('rosib')}
                            className={`py-2 rounded-xl text-xs font-bold border-2 transition ${editStatus === 'rosib' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                            ✗ Rosib
                          </button>
                        </div>
                        <textarea value={editCatatan} onChange={e => setEditCatatan(e.target.value)}
                          placeholder="Catatan..." rows={2}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2" />
                        <div className="flex gap-2">
                          <button onClick={handleSimpanEditSetoran} disabled={editLoading}
                            className="flex-1 text-white py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                            {editLoading ? 'Menyimpan...' : 'Simpan'}
                          </button>
                          <button onClick={() => setEditSetoran(null)}
                            className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-xs font-semibold">
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SANTRI SAYA */}
          {activeMenu === 'santri' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #166534 0%, #16a34a 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Santri Saya</h2>
                  <p className="text-green-200 text-sm mt-1">{santriList.length} santri dalam kelompok</p>
                </div>
              </div>

              {/* Peringkat Per Kelas */}
              {(() => {
                // Kelompokkan santri berdasarkan kelas + jenis_kelas
                const kelasMap: Record<string, any[]> = {}
                santriList.forEach(s => {
                  const key = `${s.kelas_num}-${s.jenis_kelas}`
                  if (!kelasMap[key]) kelasMap[key] = []
                  kelasMap[key].push(s)
                })

                // Hitung peringkat per kelompok kelas
                const santriDenganPeringkat: Record<string, number> = {}
                Object.values(kelasMap).forEach(kelompok => {
                  const sorted = [...kelompok].sort((a, b) => (b.total_hafalan_juz || 0) - (a.total_hafalan_juz || 0))
                  sorted.forEach((s, i) => { santriDenganPeringkat[s.id] = i + 1 })
                })

                // Total per kelas untuk label "dari X santri"
                // Kita ambil dari allSantriList agar total akurat
                const totalPerKelas: Record<string, number> = {}
                allSantriList.filter(s => s.status === 'aktif').forEach(s => {
                  const key = `${s.kelas_num}-${s.jenis_kelas}`
                  totalPerKelas[key] = (totalPerKelas[key] || 0) + 1
                })

                return (
                  <div className="space-y-3">
                    {santriList.length === 0 && (
                      <div className="bg-white rounded-2xl p-10 text-center shadow border border-gray-100">
                        <p className="text-gray-400">Belum ada santri</p>
                      </div>
                    )}
                    {santriList.map(santri => {
                      const target = hitungTargetMurojaah(santri)
                      const jadwal = getJadwalJenjang(santri.jenjang)
                      const peringkat = santriDenganPeringkat[santri.id]
                      const totalKelas = totalPerKelas[`${santri.kelas_num}-${santri.jenis_kelas}`] || kelasMap[`${santri.kelas_num}-${santri.jenis_kelas}`]?.length || 1

                      return (
                        <div key={santri.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                              {santri.nama?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold">{santri.nama}</div>
                                {/* Badge Peringkat */}
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0
                                  ${peringkat === 1 ? 'bg-yellow-400 text-white' : peringkat === 2 ? 'bg-gray-300 text-white' : peringkat === 3 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                  <span>{peringkat === 1 ? '🥇' : peringkat === 2 ? '🥈' : peringkat === 3 ? '🥉' : `#${peringkat}`}</span>
                                  <span>dari {totalKelas}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {santri.kelas && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{santri.kelas}</span>}
                                <span className="text-xs text-gray-500">{santri.total_hafalan_juz?.toFixed(2) || 0} Juz</span>
                                {santri.guru_id_2 && (
                                  <span className="text-xs text-orange-500">+ Guru Kedua</span>
                                )}
                              </div>
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                  <span>Progress 30 Juz</span>
                                  <span>{Math.round(((santri.total_hafalan_juz || 0) / 30) * 100)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div className="h-2 rounded-full"
                                    style={{ width: `${Math.min(((santri.total_hafalan_juz || 0) / 30) * 100, 100)}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
                                </div>
                              </div>
                              {target && (
                                <div className="mt-1 text-xs text-purple-600">
                                  Target murojaah: <span className="font-semibold">{target.targetHalaman} hal/hari</span>
                                  <span className="text-gray-400 ml-1">(≈ {target.targetLembar} lembar)</span>
                                </div>
                              )}
                              <div className="mt-1 text-xs text-gray-400">
                                Baru: <span className="font-semibold text-blue-600">{jadwal.baru}</span>
                                {jadwal.adaLama && <> • Murojaah: <span className="font-semibold text-purple-600">{jadwal.lama}</span></>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}