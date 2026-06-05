'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Image from 'next/image'

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [guruList, setGuruList] = useState<any[]>([])
  const [santriList, setSantriList] = useState<any[]>([])
  const [waliList, setWaliList] = useState<any[]>([])
  const [surahList, setSurahList] = useState<any[]>([])
  const [setoranHariIni, setSetoranHariIni] = useState<any[]>([])
  const [rankingHafalan, setRankingHafalan] = useState<any[]>([])
  const [rankingKonsistensi, setRankingKonsistensi] = useState<any[]>([])
  const [rankingSemangat, setRankingSemangat] = useState<any[]>([])
  const [kalenderList, setKalenderList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('')
  const [editSantriId, setEditSantriId] = useState<any>(null)
  const [editGuruId, setEditGuruId] = useState<any>(null)
  const [editWaliId, setEditWaliId] = useState<any>(null)
  const [editKalenderId, setEditKalenderId] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeRanking, setActiveRanking] = useState('total')
  const [downloadLoading, setDownloadLoading] = useState(false)

  // Form states
  const [formNama, setFormNama] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formNoWa, setFormNoWa] = useState('')
  const [formGuruId, setFormGuruId] = useState('')
  const [formWaliId, setFormWaliId] = useState('')
  const [formJenjang, setFormJenjang] = useState('')
  const [formKelasNum, setFormKelasNum] = useState('')
  const [formSurahAwal, setFormSurahAwal] = useState('')
  const [formAyatAwal, setFormAyatAwal] = useState('1')
  const [formSurahAkhir, setFormSurahAkhir] = useState('')
  const [formAyatAkhir, setFormAyatAkhir] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Form data lengkap santri
  const [formNik, setFormNik] = useState('')
  const [formNisn, setFormNisn] = useState('')
  const [formTempatLahir, setFormTempatLahir] = useState('')
  const [formTanggalLahir, setFormTanggalLahir] = useState('')
  const [formAlamat, setFormAlamat] = useState('')

  // Form kalender
  const [formKalNama, setFormKalNama] = useState('')
  const [formKalTipe, setFormKalTipe] = useState('libur')
  const [formKalSemester, setFormKalSemester] = useState('1')
  const [formKalMulai, setFormKalMulai] = useState('')
  const [formKalSelesai, setFormKalSelesai] = useState('')
  const [formKalKeterangan, setFormKalKeterangan] = useState('')

  // Filter states
  const [filterJenjang, setFilterJenjang] = useState('semua')
  const [filterKelas, setFilterKelas] = useState('semua')
  const [filterGuruId, setFilterGuruId] = useState('semua')
  const [searchSantri, setSearchSantri] = useState('')
  const [searchGuru, setSearchGuru] = useState('')
  const [searchWali, setSearchWali] = useState('')

  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: guru } = await supabase.from('profiles').select('*').eq('role', 'guru').order('nama')
    const { data: santri } = await supabase.from('santri').select('*, guru:guru_id(nama), wali:wali_id(nama)').order('nama')
    const { data: wali } = await supabase.from('profiles').select('*').eq('role', 'wali').order('nama')
    const { data: surah } = await supabase.from('surah').select('*').order('nomor', { ascending: false })
    const { data: kalender } = await supabase.from('kalender_akademik').select('*').order('tanggal_mulai', { ascending: true })
    const today = new Date().toISOString().split('T')[0]
    const { data: setoran } = await supabase.from('setoran').select('*, santri:santri_id(nama)').eq('tanggal', today).order('created_at', { ascending: false })

    setGuruList(guru || [])
    setSantriList(santri || [])
    setWaliList(wali || [])
    setSurahList(surah || [])
    setKalenderList(kalender || [])
    setSetoranHariIni(setoran || [])

    // Ranking hafalan
    const sortedHafalan = [...(santri || [])].sort((a, b) => (b.total_hafalan_juz || 0) - (a.total_hafalan_juz || 0))
    setRankingHafalan(sortedHafalan)

    // Ranking konsistensi & semangat (7 hari)
    const tujuhHariLalu = new Date()
    tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7)
    const tujuhHariLaluStr = tujuhHariLalu.toISOString().split('T')[0]
    const { data: setoran7Hari } = await supabase
      .from('setoran').select('santri_id, tanggal, jenis, penambahan_juz, status_kehadiran')
      .gte('tanggal', tujuhHariLaluStr).eq('status_kehadiran', 'hadir')

    const konsistensiMap: Record<string, Set<string>> = {}
    ;(setoran7Hari || []).forEach(s => {
      if (!konsistensiMap[s.santri_id]) konsistensiMap[s.santri_id] = new Set()
      konsistensiMap[s.santri_id].add(s.tanggal)
    })
    const konsistensiList = (santri || []).map(s => ({
      ...s,
      hariSetor: konsistensiMap[s.id]?.size || 0,
      persentaseKonsistensi: Math.round(((konsistensiMap[s.id]?.size || 0) / 7) * 100)
    })).sort((a, b) => b.hariSetor - a.hariSetor)
    setRankingKonsistensi(konsistensiList)

    const semangatMap: Record<string, number> = {}
    ;(setoran7Hari || []).filter(s => s.jenis === 'baru').forEach(s => {
      semangatMap[s.santri_id] = (semangatMap[s.santri_id] || 0) + (s.penambahan_juz || 0)
    })
    const semangatList = (santri || []).map(s => ({
      ...s,
      tambahJuz7Hari: semangatMap[s.id] || 0,
      tambahHalaman7Hari: (semangatMap[s.id] || 0) * 20
    })).sort((a, b) => b.tambahJuz7Hari - a.tambahJuz7Hari)
    setRankingSemangat(semangatList)
  }

  const hitungTotalJuzAwal = () => {
    if (!formSurahAwal || !formSurahAkhir) return 0
    const nomorKecil = Math.min(parseInt(formSurahAwal), parseInt(formSurahAkhir))
    const nomorBesar = Math.max(parseInt(formSurahAwal), parseInt(formSurahAkhir))
    const surahKecil = surahList.find(s => s.nomor === nomorKecil)
    const surahBesar = surahList.find(s => s.nomor === nomorBesar)
    if (!surahKecil || !surahBesar) return 0
    return Math.max(0, (surahBesar.halaman_selesai - surahKecil.halaman_mulai + 1) / 20)
  }

  // Status hari ini
  const today = new Date().toISOString().split('T')[0]
  const hariMinggu = new Date().getDay()
  const isLiburMingguan = hariMinggu === 0 || hariMinggu === 5
  const kalenderAktif = kalenderList.find(k => today >= k.tanggal_mulai && today <= k.tanggal_selesai)
  const isLiburAkademik = isLiburMingguan || kalenderAktif?.tipe === 'libur'
  const isUjian = kalenderAktif && (kalenderAktif.tipe === 'mid_semester' || kalenderAktif.tipe === 'semester')

  // ===== KALENDER =====
  const handleTambahKalender = async () => {
    setLoading(true); setErrorMsg('')
    if (!formKalNama || !formKalMulai || !formKalSelesai) { setErrorMsg('Nama, tanggal mulai dan selesai wajib diisi!'); setLoading(false); return }
    const { error } = await supabase.from('kalender_akademik').insert({
      nama: formKalNama, tipe: formKalTipe,
      semester: formKalTipe !== 'libur' ? parseInt(formKalSemester) : null,
      tanggal_mulai: formKalMulai, tanggal_selesai: formKalSelesai, keterangan: formKalKeterangan || null
    })
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    setSuccessMsg('Kalender berhasil ditambahkan!')
    setShowForm(false); resetForm(); fetchData(); setLoading(false)
  }

  const handleEditKalender = (kal: any) => {
    setEditKalenderId(kal.id); setFormKalNama(kal.nama); setFormKalTipe(kal.tipe)
    setFormKalSemester(kal.semester?.toString() || '1'); setFormKalMulai(kal.tanggal_mulai)
    setFormKalSelesai(kal.tanggal_selesai); setFormKalKeterangan(kal.keterangan || '')
    setShowForm(true); setFormType('kalender')
  }

  const handleUpdateKalender = async () => {
    setLoading(true); setErrorMsg('')
    const { error } = await supabase.from('kalender_akademik').update({
      nama: formKalNama, tipe: formKalTipe,
      semester: formKalTipe !== 'libur' ? parseInt(formKalSemester) : null,
      tanggal_mulai: formKalMulai, tanggal_selesai: formKalSelesai, keterangan: formKalKeterangan || null
    }).eq('id', editKalenderId)
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    setSuccessMsg('Kalender berhasil diupdate!')
    setShowForm(false); setEditKalenderId(null); resetForm(); fetchData(); setLoading(false)
  }

  const handleHapusKalender = async (id: any) => {
    if (!confirm('Yakin hapus jadwal ini?')) return
    await supabase.from('kalender_akademik').delete().eq('id', id); fetchData()
  }

  // ===== GURU =====
  const handleTambahGuru = async () => {
    setLoading(true); setErrorMsg('')
    const res = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formEmail, password: formPassword, nama: formNama, role: 'guru', no_wa: formNoWa }) })
    const result = await res.json()
    if (result.error) { setErrorMsg(result.error); setLoading(false); return }
    setSuccessMsg('Guru berhasil ditambahkan!'); setShowForm(false); resetForm(); fetchData(); setLoading(false)
  }

  const handleEditGuru = (guru: any) => {
    setEditGuruId(guru.id); setFormNama(guru.nama); setFormNoWa(guru.no_wa || '')
    setFormEmail(''); setFormPassword(''); setShowPassword(false); setShowForm(true); setFormType('guru')
  }

  const handleUpdateGuru = async () => {
    setLoading(true); setErrorMsg('')
    const { error } = await supabase.from('profiles').update({ nama: formNama, no_wa: formNoWa || null }).eq('id', editGuruId)
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    if (formEmail || formPassword) {
      const res = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isUpdate: true, userId: editGuruId, email: formEmail || undefined, password: formPassword || undefined }) })
      const result = await res.json()
      if (result.error) { setErrorMsg(result.error); setLoading(false); return }
    }
    setSuccessMsg('Data guru berhasil diupdate!'); setShowForm(false); setEditGuruId(null); resetForm(); fetchData(); setLoading(false)
  }

  // ===== WALI =====
  const handleTambahWali = async () => {
    setLoading(true); setErrorMsg('')
    const res = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formEmail, password: formPassword, nama: formNama, role: 'wali', no_wa: formNoWa }) })
    const result = await res.json()
    if (result.error) { setErrorMsg(result.error); setLoading(false); return }
    setSuccessMsg('Wali berhasil ditambahkan!'); setShowForm(false); resetForm(); fetchData(); setLoading(false)
  }

  const handleEditWali = (wali: any) => {
    setEditWaliId(wali.id); setFormNama(wali.nama); setFormNoWa(wali.no_wa || '')
    setFormEmail(''); setFormPassword(''); setShowPassword(false); setShowForm(true); setFormType('wali')
  }

  const handleUpdateWali = async () => {
    setLoading(true); setErrorMsg('')
    const { error } = await supabase.from('profiles').update({ nama: formNama, no_wa: formNoWa || null }).eq('id', editWaliId)
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    if (formEmail || formPassword) {
      const res = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isUpdate: true, userId: editWaliId, email: formEmail || undefined, password: formPassword || undefined }) })
      const result = await res.json()
      if (result.error) { setErrorMsg(result.error); setLoading(false); return }
    }
    setSuccessMsg('Data wali berhasil diupdate!'); setShowForm(false); setEditWaliId(null); resetForm(); fetchData(); setLoading(false)
  }

  // ===== SANTRI =====
  const handleTambahSantri = async () => {
    setLoading(true); setErrorMsg('')
    if (!formNama || !formJenjang || !formKelasNum) { setErrorMsg('Nama, jenjang dan kelas wajib diisi!'); setLoading(false); return }
    const { error } = await supabase.from('santri').insert({
      nama: formNama, jenjang: formJenjang, kelas_num: parseInt(formKelasNum),
      kelas: `Kelas ${formKelasNum} ${jenjangLabel(formJenjang)}`,
      guru_id: formGuruId || null, wali_id: formWaliId || null,
      total_hafalan_juz: hitungTotalJuzAwal(),
      surah_terakhir_nomor: formSurahAkhir ? parseInt(formSurahAkhir) : null,
      ayat_terakhir: formAyatAkhir ? parseInt(formAyatAkhir) : null,
      nik: formNik || null, nisn: formNisn || null,
      tempat_lahir: formTempatLahir || null,
      tanggal_lahir: formTanggalLahir || null,
      alamat: formAlamat || null,
    })
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    setSuccessMsg('Santri berhasil ditambahkan!'); setShowForm(false); resetForm(); fetchData(); setLoading(false)
  }

  const handleEditSantri = (santri: any) => {
    setEditSantriId(santri.id); setFormNama(santri.nama)
    setFormJenjang(santri.jenjang || ''); setFormKelasNum(santri.kelas_num?.toString() || '')
    setFormGuruId(santri.guru_id || ''); setFormWaliId(santri.wali_id || '')
    setFormSurahAwal(''); setFormAyatAwal('1')
    setFormSurahAkhir(santri.surah_terakhir_nomor?.toString() || '')
    setFormAyatAkhir(santri.ayat_terakhir?.toString() || '')
    setFormNik(santri.nik || ''); setFormNisn(santri.nisn || '')
    setFormTempatLahir(santri.tempat_lahir || '')
    setFormTanggalLahir(santri.tanggal_lahir || '')
    setFormAlamat(santri.alamat || '')
    setShowForm(true); setFormType('santri')
  }

  const handleUpdateSantri = async () => {
    setLoading(true); setErrorMsg('')
    let updateData: any = {
      nama: formNama, jenjang: formJenjang, kelas_num: parseInt(formKelasNum),
      kelas: `Kelas ${formKelasNum} ${jenjangLabel(formJenjang)}`,
      guru_id: formGuruId || null, wali_id: formWaliId || null,
      nik: formNik || null, nisn: formNisn || null,
      tempat_lahir: formTempatLahir || null,
      tanggal_lahir: formTanggalLahir || null,
      alamat: formAlamat || null,
    }
    if (formSurahAwal && formSurahAkhir) {
      updateData = { ...updateData, total_hafalan_juz: hitungTotalJuzAwal(), surah_terakhir_nomor: parseInt(formSurahAkhir), ayat_terakhir: formAyatAkhir ? parseInt(formAyatAkhir) : null }
    } else if (formSurahAkhir && !formSurahAwal) {
      updateData = { ...updateData, surah_terakhir_nomor: parseInt(formSurahAkhir), ayat_terakhir: formAyatAkhir ? parseInt(formAyatAkhir) : null }
    }
    const { error } = await supabase.from('santri').update(updateData).eq('id', editSantriId)
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    setSuccessMsg('Santri berhasil diupdate!'); setShowForm(false); setEditSantriId(null); resetForm(); fetchData(); setLoading(false)
  }

  const handleHapusGuru = async (id: any) => {
    if (!confirm('Yakin hapus guru ini?')) return
    const res = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isDelete: true, userId: id }) })
    const result = await res.json()
    if (result.error) { alert('Gagal hapus: ' + result.error); return }
    setSuccessMsg('Guru berhasil dihapus!'); fetchData()
  }

  const handleHapusWali = async (id: any) => {
    if (!confirm('Yakin hapus wali ini?')) return
    const res = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isDelete: true, userId: id }) })
    const result = await res.json()
    if (result.error) { alert('Gagal hapus: ' + result.error); return }
    setSuccessMsg('Wali berhasil dihapus!'); fetchData()
  }

  const handleHapusSantri = async (id: any) => {
    if (!confirm('Yakin hapus santri ini?')) return
    await supabase.from('santri').delete().eq('id', id); fetchData()
  }

  const handleDownloadTemplate = () => { window.open('/api/download-template', '_blank') }
  const handleDownloadAllData = async () => {
    setDownloadLoading(true)
    window.open('/api/download-data', '_blank')
    setTimeout(() => setDownloadLoading(false), 2000)
  }

  const handleImportExcel = async (e: any) => {
    const file = e.target.files[0]; if (!file) return
    setImportLoading(true); setImportMsg('')
    const formData = new FormData(); formData.append('file', file)
    const res = await fetch('/api/import-excel', { method: 'POST', body: formData })
    const result = await res.json()
    setImportMsg(result.message); setImportLoading(false); fetchData()
  }

  const resetForm = () => {
    setFormNama(''); setFormEmail(''); setFormPassword(''); setFormNoWa('')
    setFormGuruId(''); setFormWaliId(''); setFormJenjang(''); setFormKelasNum('')
    setFormSurahAwal(''); setFormAyatAwal('1'); setFormSurahAkhir(''); setFormAyatAkhir('')
    setFormNik(''); setFormNisn(''); setFormTempatLahir(''); setFormTanggalLahir(''); setFormAlamat('')
    setShowPassword(false)
    setFormKalNama(''); setFormKalTipe('libur'); setFormKalSemester('1')
    setFormKalMulai(''); setFormKalSelesai(''); setFormKalKeterangan('')
    setEditSantriId(null); setEditGuruId(null); setEditWaliId(null); setEditKalenderId(null)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const santriSudahSetor = [...new Set(setoranHariIni.map(s => s.santri_id))]
  const santriBelumSetor = santriList.filter(s => !santriSudahSetor.includes(s.id))
  const guruSudahInput = [...new Set(setoranHariIni.map(s => s.guru_id))]
  const guruBelumInput = guruList.filter(g => !guruSudahInput.includes(g.id))

  const getKelasOptions = (jenjang: string) => {
    if (jenjang === 'ula') return [1,2,3,4,5,6]
    if (jenjang === 'wustha') return [7,8,9]
    if (jenjang === 'ulya') return [10,11,12]
    return []
  }

  const jenjangLabel = (j: string) => {
    if (j === 'ula') return 'Ula'
    if (j === 'wustha') return 'Wustha'
    if (j === 'ulya') return 'Ulya'
    return j
  }

  const tipeKalenderLabel = (t: string) => {
    if (t === 'libur') return 'Libur'
    if (t === 'mid_semester') return 'Mid Semester'
    if (t === 'semester') return 'Ujian Semester'
    return t
  }

  const tipeKalenderColor = (t: string) => {
    if (t === 'libur') return 'bg-gray-100 text-gray-700'
    if (t === 'mid_semester') return 'bg-orange-100 text-orange-700'
    if (t === 'semester') return 'bg-red-100 text-red-700'
    return 'bg-blue-100 text-blue-700'
  }

  // Filter santri
  const santriFiltered = santriList.filter(s => {
    if (filterJenjang !== 'semua' && s.jenjang !== filterJenjang) return false
    if (filterKelas !== 'semua' && s.kelas_num?.toString() !== filterKelas) return false
    if (filterGuruId !== 'semua' && s.guru_id !== filterGuruId) return false
    if (searchSantri && !s.nama?.toLowerCase().includes(searchSantri.toLowerCase())) return false
    return true
  })

  const guruFiltered = guruList.filter(g =>
    !searchGuru || g.nama?.toLowerCase().includes(searchGuru.toLowerCase()) || g.no_wa?.includes(searchGuru)
  )

  const waliFiltered = waliList.filter(w =>
    !searchWali || w.nama?.toLowerCase().includes(searchWali.toLowerCase()) || w.no_wa?.includes(searchWali)
  )

  // Filter ranking
  const filterRankingList = (list: any[]) => list.filter(s => {
    if (filterJenjang !== 'semua' && s.jenjang !== filterJenjang) return false
    if (filterKelas !== 'semua' && s.kelas_num?.toString() !== filterKelas) return false
    return true
  })

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '◈' },
    { id: 'monitoring', label: 'Monitoring', icon: '◉' },
    { id: 'kalender', label: 'Kalender Akademik', icon: '📅' },
    { id: 'guru', label: 'Data Guru', icon: '▤' },
    { id: 'santri', label: 'Data Santri', icon: '◎' },
    { id: 'wali', label: 'Data Wali', icon: '◍' },
    { id: 'ranking', label: 'Ranking Santri', icon: '✦' },
  ]

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
  const btnPrimary = "text-white px-6 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shadow transition"

  const FormEmailPassword = ({ isEdit }: { isEdit: boolean }) => (
    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
      <p className="text-xs font-semibold text-yellow-800 mb-3">
        {isEdit ? '✏️ Ubah Email / Password (kosongkan jika tidak ingin diubah)' : '🔐 Akun Login'}
      </p>
      <div className="space-y-2">
        <input placeholder="Email" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className={inputClass} />
        <div className="relative">
          <input placeholder={isEdit ? "Password baru (kosongkan jika tidak diubah)" : "Password"}
            type={showPassword ? 'text' : 'password'} value={formPassword} onChange={e => setFormPassword(e.target.value)}
            className={inputClass + ' pr-12'} />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-gray-400 text-sm px-1">{showPassword ? '🙈' : '👁'}</button>
        </div>
        {showPassword && formPassword && (
          <div className="p-2 bg-white rounded-lg border border-yellow-200">
            <p className="text-xs text-gray-500">Password: <span className="font-bold text-gray-800">{formPassword}</span></p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER MOBILE */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 text-white px-4 py-3 flex items-center justify-between shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-full p-0.5 w-9 h-9 flex items-center justify-center shadow">
            <Image src="/logo.png" alt="Logo" width={30} height={30} className="object-contain" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">Daarus Salaf</div>
            <div className="text-blue-200 text-xs">Administrator</div>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="text-2xl p-1">☰</button>
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
              <div className="text-white font-semibold text-sm">Administrator</div>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map(menu => (
              <button key={menu.id}
                onClick={() => { setActiveMenu(menu.id); setShowForm(false); setSuccessMsg(''); setSidebarOpen(false) }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium flex items-center gap-3 ${activeMenu === menu.id ? 'bg-white text-blue-900 shadow-md font-bold' : 'text-blue-100 hover:bg-white hover:bg-opacity-10'}`}>
                <span>{menu.icon}</span>{menu.label}
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

          {/* DASHBOARD */}
          {activeMenu === 'dashboard' && (
            <div>
              <div className="rounded-2xl p-6 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 bg-white" />
                <div className="absolute -bottom-10 -right-4 w-48 h-48 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-white bg-opacity-20 rounded-xl p-2">
                      <Image src="/logo.png" alt="Logo" width={36} height={36} className="object-contain" />
                    </div>
                    <div>
                      <p className="text-blue-200 text-sm">Selamat datang,</p>
                      <h2 className="text-white font-bold text-xl">Administrator</h2>
                    </div>
                  </div>
                  <p className="text-blue-200 text-sm mt-2">📅 {tanggal}</p>
                  <p className="text-blue-100 text-xs mt-1">Pondok Pesantren Daarus Salaf Sukoharjo</p>
                </div>
              </div>

              {isLiburAkademik && (
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
                    <div className="text-red-600 text-xs">{kalenderAktif?.tipe === 'mid_semester' ? 'Mode Ujian Mid Semester' : 'Mode Ujian Semester'} aktif</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Total Guru', count: guruList.length, color: 'from-blue-500 to-blue-700', sub: 'Guru musami\'' },
                  { label: 'Total Santri', count: santriList.length, color: 'from-emerald-500 to-emerald-700', sub: 'Terdaftar' },
                  { label: 'Total Wali', count: waliList.length, color: 'from-purple-500 to-purple-700', sub: 'Terdaftar' },
                ].map((item, i) => (
                  <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow-lg text-white relative overflow-hidden`}>
                    <div className="absolute -bottom-3 -right-3 text-6xl opacity-10">◆</div>
                    <div className="text-3xl font-bold">{item.count}</div>
                    <div className="font-semibold text-sm mt-1">{item.label}</div>
                    <div className="text-white text-opacity-70 text-xs">{item.sub}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>✦</div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">Setoran Hari Ini</h3>
                      <p className="text-gray-400 text-xs">{setoranHariIni.length} setoran</p>
                    </div>
                  </div>
                  {setoranHariIni.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                          {item.santri?.nama?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{item.santri?.nama}</div>
                          <div className="text-xs text-gray-400">{item.surah} {item.ayat_mulai}-{item.ayat_selesai}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.status === 'lancar' ? 'Lancar' : 'Rosib'}
                      </span>
                    </div>
                  ))}
                  {setoranHariIni.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada setoran</p>}
                </div>

                <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>⊞</div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">Kelola Data</h3>
                      <p className="text-gray-400 text-xs">Import & Export data santri</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button onClick={handleDownloadTemplate}
                      className="w-full text-white px-4 py-3 rounded-xl font-semibold text-sm shadow"
                      style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                      ⬇ Download Template Import
                    </button>
                    <label className="w-full text-white px-4 py-3 rounded-xl font-semibold text-sm text-center cursor-pointer shadow flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                      {importLoading ? 'Mengimport...' : '⬆ Upload File Excel'}
                      <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" disabled={importLoading} />
                    </label>
                    <button onClick={handleDownloadAllData} disabled={downloadLoading}
                      className="w-full text-white px-4 py-3 rounded-xl font-semibold text-sm shadow"
                      style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>
                      {downloadLoading ? 'Menyiapkan...' : '📥 Download Semua Data'}
                    </button>
                  </div>
                  {importMsg && <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs">✓ {importMsg}</div>}
                </div>
              </div>
            </div>
          )}

          {/* MONITORING */}
          {activeMenu === 'monitoring' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Monitoring Harian</h2>
                  <p className="text-blue-200 text-sm mt-1">📅 {tanggal}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Sudah Setor', count: santriSudahSetor.length, color: 'from-green-500 to-green-700', sub: 'Santri' },
                  { label: 'Belum Setor', count: santriBelumSetor.length, color: 'from-red-500 to-red-700', sub: 'Santri' },
                  { label: 'Guru Hadir', count: guruSudahInput.length, color: 'from-blue-500 to-blue-700', sub: 'Dari ' + guruList.length },
                  { label: 'Guru Absen', count: guruBelumInput.length, color: 'from-orange-500 to-orange-700', sub: 'Tidak input' },
                ].map((item, i) => (
                  <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow-lg text-white relative overflow-hidden`}>
                    <div className="absolute -bottom-2 -right-2 text-5xl opacity-10">◆</div>
                    <div className="text-3xl font-bold">{item.count}</div>
                    <div className="font-semibold text-xs mt-1">{item.label}</div>
                    <div className="text-white text-opacity-70 text-xs">{item.sub}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Progress Setoran</span>
                  <span className="text-sm font-bold" style={{ color: '#2563a8' }}>
                    {santriList.length > 0 ? Math.round((santriSudahSetor.length / santriList.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div className="h-4 rounded-full" style={{ width: `${santriList.length > 0 ? (santriSudahSetor.length / santriList.length) * 100 : 0}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{santriSudahSetor.length} dari {santriList.length} santri</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                    <h3 className="text-white font-semibold text-sm">Guru Hadir ({guruSudahInput.length})</h3>
                  </div>
                  <div className="p-3">
                    {guruList.filter(g => guruSudahInput.includes(g.id)).map(g => (
                      <div key={g.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                        <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">{g.nama?.charAt(0).toUpperCase()}</div>
                        <span className="text-sm">{g.nama}</span>
                        <span className="ml-auto text-green-500 text-xs">Hadir</span>
                      </div>
                    ))}
                    {guruSudahInput.length === 0 && <p className="text-gray-400 text-sm text-center py-3">Belum ada</p>}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-700">
                    <h3 className="text-white font-semibold text-sm">Guru Absen ({guruBelumInput.length})</h3>
                  </div>
                  <div className="p-3">
                    {guruBelumInput.map(g => (
                      <div key={g.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                        <div className="w-7 h-7 rounded-full bg-red-400 flex items-center justify-center text-white text-xs font-bold">{g.nama?.charAt(0).toUpperCase()}</div>
                        <span className="text-sm">{g.nama}</span>
                        <span className="ml-auto text-red-400 text-xs">Absen</span>
                      </div>
                    ))}
                    {guruBelumInput.length === 0 && <p className="text-gray-400 text-sm text-center py-3">Semua hadir!</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KALENDER AKADEMIK */}
          {activeMenu === 'kalender' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Kalender Akademik</h2>
                  <p className="text-teal-100 text-sm mt-1">Kelola jadwal libur dan ujian</p>
                  <p className="text-teal-200 text-xs mt-0.5">Jumat & Ahad = libur otomatis</p>
                </div>
              </div>
              {(isLiburMingguan || kalenderAktif) && (
                <div className={`mb-5 p-4 rounded-2xl border-2 flex items-center gap-3 ${isUjian ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'}`}>
                  <span className="text-2xl">{isUjian ? '📝' : '🏖'}</span>
                  <div>
                    <div className={`font-bold text-sm ${isUjian ? 'text-red-800' : 'text-orange-800'}`}>
                      Status: {isLiburMingguan ? (hariMinggu === 0 ? 'Ahad — Libur' : 'Jumat — Libur') : kalenderAktif?.nama}
                    </div>
                    <div className={`text-xs mt-0.5 ${isUjian ? 'text-red-600' : 'text-orange-600'}`}>{isUjian ? 'Mode ujian aktif' : 'Hari libur'}</div>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">Jadwal Akademik 2026/2027</h3>
                <button onClick={() => { resetForm(); setShowForm(true); setFormType('kalender') }}
                  className={btnPrimary} style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}>+ Tambah Jadwal</button>
              </div>
              {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {successMsg}</div>}
              {showForm && formType === 'kalender' && (
                <div className="bg-white p-5 rounded-2xl shadow-md mb-5 border border-gray-100">
                  <h3 className="font-bold text-base mb-4">{editKalenderId ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</h3>
                  <div className="space-y-3">
                    <input placeholder="Nama Jadwal" value={formKalNama} onChange={e => setFormKalNama(e.target.value)} className={inputClass} />
                    <select value={formKalTipe} onChange={e => setFormKalTipe(e.target.value)} className={inputClass}>
                      <option value="libur">Libur</option>
                      <option value="mid_semester">Ujian Mid Semester</option>
                      <option value="semester">Ujian Akhir Semester</option>
                    </select>
                    {formKalTipe !== 'libur' && (
                      <select value={formKalSemester} onChange={e => setFormKalSemester(e.target.value)} className={inputClass}>
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                      </select>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tanggal Mulai</label>
                        <input type="date" value={formKalMulai} onChange={e => setFormKalMulai(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tanggal Selesai</label>
                        <input type="date" value={formKalSelesai} onChange={e => setFormKalSelesai(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                    <textarea placeholder="Keterangan (opsional)" value={formKalKeterangan}
                      onChange={e => setFormKalKeterangan(e.target.value)} rows={2} className={inputClass} />
                  </div>
                  {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={editKalenderId ? handleUpdateKalender : handleTambahKalender} disabled={loading}
                      className={btnPrimary} style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}>
                      {loading ? 'Menyimpan...' : editKalenderId ? 'Update' : 'Simpan'}
                    </button>
                    <button onClick={() => { setShowForm(false); resetForm() }} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {kalenderList.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Belum ada jadwal</div>}
                {kalenderList.map((kal) => {
                  const isAktif = today >= kal.tanggal_mulai && today <= kal.tanggal_selesai
                  const isLewat = today > kal.tanggal_selesai
                  return (
                    <div key={kal.id} className={`bg-white rounded-xl shadow p-4 border-2 ${isAktif ? 'border-teal-400 bg-teal-50' : isLewat ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl mt-0.5">{kal.tipe === 'libur' ? '🏖' : kal.tipe === 'mid_semester' ? '📋' : '📝'}</div>
                          <div>
                            <div className="font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                              {kal.nama}
                              {isAktif && <span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full">Aktif</span>}
                              {isLewat && <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full">Selesai</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipeKalenderColor(kal.tipe)}`}>{tipeKalenderLabel(kal.tipe)}</span>
                              {kal.semester && <span className="text-xs text-gray-400">Semester {kal.semester}</span>}
                              <span className="text-xs text-gray-400">
                                {new Date(kal.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {new Date(kal.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            {kal.keterangan && <p className="text-xs text-gray-400 mt-0.5">{kal.keterangan}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleEditKalender(kal)} className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</button>
                          <button onClick={() => handleHapusKalender(kal.id)} className="text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-5 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">📌 Aturan Libur Otomatis:</p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-400"></div><span className="text-xs text-gray-600">Jumat = libur mingguan</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-400"></div><span className="text-xs text-gray-600">Ahad = libur mingguan</span></div>
                </div>
              </div>
            </div>
          )}

          {/* DATA GURU */}
          {activeMenu === 'guru' && (
            <div>
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Data Guru</h2>
                  <p className="text-gray-400 text-xs">{guruList.length} guru terdaftar</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); setFormType('guru') }}
                  className={btnPrimary} style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>+ Tambah Guru</button>
              </div>

              {/* Search Guru */}
              <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
                <input type="text" value={searchGuru} onChange={e => setSearchGuru(e.target.value)}
                  placeholder="🔍 Cari nama atau no. WA guru..." className={inputClass} />
                <p className="text-xs text-gray-400 mt-2">Menampilkan {guruFiltered.length} dari {guruList.length} guru</p>
              </div>

              {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {successMsg}</div>}
              {showForm && formType === 'guru' && (
                <div className="bg-white p-5 rounded-2xl shadow-md mb-5 border border-gray-100">
                  <h3 className="font-bold text-base mb-4">{editGuruId ? 'Edit Data Guru' : 'Tambah Guru Baru'}</h3>
                  <div className="space-y-3">
                    <input placeholder="Nama Guru" value={formNama} onChange={e => setFormNama(e.target.value)} className={inputClass} />
                    <input placeholder="No WhatsApp" value={formNoWa} onChange={e => setFormNoWa(e.target.value)} className={inputClass} />
                    <FormEmailPassword isEdit={!!editGuruId} />
                  </div>
                  {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={editGuruId ? handleUpdateGuru : handleTambahGuru} disabled={loading}
                      className={btnPrimary} style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                      {loading ? 'Menyimpan...' : editGuruId ? 'Update' : 'Simpan'}
                    </button>
                    <button onClick={() => { setShowForm(false); resetForm() }} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {guruFiltered.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Tidak ada data guru</div>}
                {guruFiltered.map((guru) => {
                  const jumlahSantri = santriList.filter(s => s.guru_id === guru.id).length
                  return (
                    <div key={guru.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                            {guru.nama?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">{guru.nama}</div>
                            <div className="text-xs text-gray-400">{guru.no_wa || 'No WA belum diisi'}</div>
                            <div className="text-xs text-blue-500 mt-0.5">{jumlahSantri} santri</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditGuru(guru)} className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</button>
                          <button onClick={() => handleHapusGuru(guru.id)} className="text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* DATA SANTRI */}
          {activeMenu === 'santri' && (
            <div>
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Data Santri</h2>
                  <p className="text-gray-400 text-xs">{santriList.length} santri terdaftar</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); setFormType('santri') }}
                  className={btnPrimary} style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>+ Tambah Santri</button>
              </div>

              {/* Filter Santri */}
              <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
                    <select value={filterJenjang} onChange={e => { setFilterJenjang(e.target.value); setFilterKelas('semua') }} className={inputClass}>
                      <option value="semua">Semua</option>
                      <option value="ula">Ula</option>
                      <option value="wustha">Wustha</option>
                      <option value="ulya">Ulya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Kelas</label>
                    <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className={inputClass}>
                      <option value="semua">Semua</option>
                      {getKelasOptions(filterJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Guru</label>
                    <select value={filterGuruId} onChange={e => setFilterGuruId(e.target.value)} className={inputClass}>
                      <option value="semua">Semua Guru</option>
                      {guruList.map(g => (<option key={g.id} value={g.id}>{g.nama}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cari Nama</label>
                    <input type="text" value={searchSantri} onChange={e => setSearchSantri(e.target.value)}
                      placeholder="Cari santri..." className={inputClass} />
                  </div>
                </div>
                <p className="text-xs text-gray-400">Menampilkan <span className="font-semibold text-gray-600">{santriFiltered.length}</span> dari {santriList.length} santri</p>
              </div>

              {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {successMsg}</div>}

              {showForm && formType === 'santri' && (
                <div className="bg-white p-5 rounded-2xl shadow-md mb-5 border border-gray-100">
                  <h3 className="font-bold text-base mb-4">{editSantriId ? 'Edit Data Santri' : 'Tambah Santri Baru'}</h3>
                  <div className="space-y-3">
                    <input placeholder="Nama Santri *" value={formNama} onChange={e => setFormNama(e.target.value)} className={inputClass} />

                    <div className="grid grid-cols-2 gap-3">
                      <select value={formJenjang} onChange={e => { setFormJenjang(e.target.value); setFormKelasNum('') }} className={inputClass}>
                        <option value="">-- Jenjang *</option>
                        <option value="ula">Ula</option>
                        <option value="wustha">Wustha</option>
                        <option value="ulya">Ulya</option>
                      </select>
                      {formJenjang ? (
                        <select value={formKelasNum} onChange={e => setFormKelasNum(e.target.value)} className={inputClass}>
                          <option value="">-- Kelas *</option>
                          {getKelasOptions(formJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
                        </select>
                      ) : <div className={inputClass + ' text-gray-400 flex items-center'}>Pilih jenjang dulu</div>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <select value={formGuruId} onChange={e => setFormGuruId(e.target.value)} className={inputClass}>
                        <option value="">-- Pilih Guru</option>
                        {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                      </select>
                      <select value={formWaliId} onChange={e => setFormWaliId(e.target.value)} className={inputClass}>
                        <option value="">-- Pilih Wali</option>
                        {waliList.map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
                      </select>
                    </div>

                    {/* Data Identitas */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-3">📋 Data Identitas (Opsional)</p>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="NIK" value={formNik} onChange={e => setFormNik(e.target.value)} className={inputClass} />
                          <input placeholder="No. Induk / NISN" value={formNisn} onChange={e => setFormNisn(e.target.value)} className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="Tempat Lahir" value={formTempatLahir} onChange={e => setFormTempatLahir(e.target.value)} className={inputClass} />
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Tanggal Lahir</label>
                            <input type="date" value={formTanggalLahir} onChange={e => setFormTanggalLahir(e.target.value)} className={inputClass} />
                          </div>
                        </div>
                        <textarea placeholder="Alamat lengkap" value={formAlamat} onChange={e => setFormAlamat(e.target.value)} rows={2} className={inputClass} />
                      </div>
                    </div>

                    {/* Data Hafalan */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        {editSantriId ? 'Update Data Hafalan' : 'Hafalan Awal Santri'}
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        {editSantriId ? 'Kosongkan jika tidak ingin mengubah.' : 'Dari surah mana sampai surah mana yang sudah dihafal'}
                      </p>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select value={formSurahAwal} onChange={e => setFormSurahAwal(e.target.value)} className={inputClass}>
                            <option value="">Surah Awal</option>
                            {surahList.map(s => <option key={s.nomor} value={s.nomor}>{s.nomor}. {s.nama_latin}</option>)}
                          </select>
                          <input type="number" placeholder="Ayat mulai" value={formAyatAwal} onChange={e => setFormAyatAwal(e.target.value)} className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select value={formSurahAkhir} onChange={e => {
                            setFormSurahAkhir(e.target.value)
                            const s = surahList.find(s => s.nomor === parseInt(e.target.value))
                            if (s) setFormAyatAkhir(String(s.jumlah_ayat))
                          }} className={inputClass}>
                            <option value="">Surah Akhir</option>
                            {surahList.map(s => <option key={s.nomor} value={s.nomor}>{s.nomor}. {s.nama_latin}</option>)}
                          </select>
                          <input type="number" placeholder="Ayat selesai" value={formAyatAkhir} onChange={e => setFormAyatAkhir(e.target.value)} className={inputClass} />
                        </div>
                      </div>
                      {formSurahAwal && formSurahAkhir && (
                        <div className="mt-2 p-2 bg-white rounded-lg text-xs text-blue-700 font-semibold">
                          Total hafalan: ≈ {hitungTotalJuzAwal().toFixed(2)} Juz
                        </div>
                      )}
                      {editSantriId && !formSurahAwal && !formSurahAkhir && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-500">Hafalan tidak akan diubah</div>
                      )}
                    </div>
                  </div>
                  {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={editSantriId ? handleUpdateSantri : handleTambahSantri} disabled={loading}
                      className={btnPrimary} style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                      {loading ? 'Menyimpan...' : editSantriId ? 'Update' : 'Simpan'}
                    </button>
                    <button onClick={() => { setShowForm(false); resetForm() }} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {santriFiltered.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Tidak ada santri ditemukan</div>}
                {santriFiltered.map((santri) => (
                  <div key={santri.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                          {santri.nama?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold">{santri.nama}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {santri.jenjang && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                                Kelas {santri.kelas_num} {jenjangLabel(santri.jenjang)}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">{santri.total_hafalan_juz?.toFixed(2) || 0} Juz</span>
                            <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}</span>
                            {santri.nisn && <span className="text-xs text-gray-400">NIS: {santri.nisn}</span>}
                          </div>
                          {(santri.tempat_lahir || santri.tanggal_lahir) && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {santri.tempat_lahir}{santri.tanggal_lahir && `, ${new Date(santri.tanggal_lahir).toLocaleDateString('id-ID')}`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditSantri(santri)} className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</button>
                        <button onClick={() => handleHapusSantri(santri.id)} className="text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DATA WALI */}
          {activeMenu === 'wali' && (
            <div>
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Data Wali</h2>
                  <p className="text-gray-400 text-xs">{waliList.length} wali terdaftar</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); setFormType('wali') }}
                  className={btnPrimary} style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>+ Tambah Wali</button>
              </div>

              {/* Search Wali */}
              <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
                <input type="text" value={searchWali} onChange={e => setSearchWali(e.target.value)}
                  placeholder="🔍 Cari nama atau no. WA wali..." className={inputClass} />
                <p className="text-xs text-gray-400 mt-2">Menampilkan {waliFiltered.length} dari {waliList.length} wali</p>
              </div>

              {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {successMsg}</div>}
              {showForm && formType === 'wali' && (
                <div className="bg-white p-5 rounded-2xl shadow-md mb-5 border border-gray-100">
                  <h3 className="font-bold text-base mb-4">{editWaliId ? 'Edit Data Wali' : 'Tambah Wali Baru'}</h3>
                  <div className="space-y-3">
                    <input placeholder="Nama Wali" value={formNama} onChange={e => setFormNama(e.target.value)} className={inputClass} />
                    <input placeholder="No WhatsApp" value={formNoWa} onChange={e => setFormNoWa(e.target.value)} className={inputClass} />
                    <FormEmailPassword isEdit={!!editWaliId} />
                  </div>
                  {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={editWaliId ? handleUpdateWali : handleTambahWali} disabled={loading}
                      className={btnPrimary} style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
                      {loading ? 'Menyimpan...' : editWaliId ? 'Update' : 'Simpan'}
                    </button>
                    <button onClick={() => { setShowForm(false); resetForm() }} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {waliFiltered.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Tidak ada wali ditemukan</div>}
                {waliFiltered.map((wali) => {
                  const santriWali = santriList.filter(s => s.wali_id === wali.id)
                  return (
                    <div key={wali.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
                            {wali.nama?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">{wali.nama}</div>
                            <div className="text-xs text-gray-400">{wali.no_wa || 'No WA belum diisi'}</div>
                            {santriWali.length > 0 && (
                              <div className="text-xs text-purple-500 mt-0.5">
                                Wali dari: {santriWali.map(s => s.nama).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditWali(wali)} className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</button>
                          <button onClick={() => handleHapusWali(wali.id)} className="text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* RANKING */}
          {activeMenu === 'ranking' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Peringkat Santri</h2>
                  <p className="text-blue-200 text-sm mt-1">3 jenis peringkat tersedia</p>
                </div>
              </div>

              {/* Filter */}
              <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Filter Jenjang</label>
                    <select value={filterJenjang} onChange={e => { setFilterJenjang(e.target.value); setFilterKelas('semua') }} className={inputClass}>
                      <option value="semua">Semua Jenjang</option>
                      <option value="ula">Ula</option>
                      <option value="wustha">Wustha</option>
                      <option value="ulya">Ulya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Filter Kelas</label>
                    <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className={inputClass}>
                      <option value="semua">Semua Kelas</option>
                      {getKelasOptions(filterJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {filterJenjang !== 'semua' ? `Jenjang ${jenjangLabel(filterJenjang)}` : 'Semua Jenjang'}
                  {filterKelas !== 'semua' ? ` • Kelas ${filterKelas}` : ''} • {filterRankingList(rankingHafalan).length} santri
                </p>
              </div>

              {/* Tab */}
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {[
                  { id: 'total', label: 'Total Hafalan', sub: 'Keseluruhan' },
                  { id: 'konsistensi', label: 'Konsistensi Setor', sub: '7 hari terakhir' },
                  { id: 'semangat', label: 'Semangat Hafalan', sub: '7 hari terakhir' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveRanking(tab.id)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition border-2 ${activeRanking === tab.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                    <div>{tab.label}</div>
                    <div className="text-xs font-normal opacity-70">{tab.sub}</div>
                  </button>
                ))}
              </div>

              {/* Ranking Total Hafalan */}
              {activeRanking === 'total' && (
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                    <h3 className="text-white font-bold">Peringkat Total Hafalan</h3>
                    <p className="text-green-200 text-xs mt-0.5">Diurutkan dari jumlah juz terbanyak</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {filterRankingList(rankingHafalan).map((santri, i) => (
                      <div key={santri.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-gray-50' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-800">{santri.nama}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {santri.jenjang && <span className="text-xs text-gray-400">Kelas {santri.kelas_num} {jenjangLabel(santri.jenjang)}</span>}
                            <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(((santri.total_hafalan_juz || 0) / 30) * 100, 100)}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-sm text-green-700">{santri.total_hafalan_juz?.toFixed(2) || 0}</div>
                          <div className="text-xs text-gray-400">Juz</div>
                        </div>
                      </div>
                    ))}
                    {filterRankingList(rankingHafalan).length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>}
                  </div>
                </div>
              )}

              {/* Ranking Konsistensi */}
              {activeRanking === 'konsistensi' && (
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                    <h3 className="text-white font-bold">Peringkat Konsistensi Setoran</h3>
                    <p className="text-blue-200 text-xs mt-0.5">% hari setor dalam 7 hari terakhir</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {filterRankingList(rankingKonsistensi).map((santri, i) => (
                      <div key={santri.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-gray-50' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-800">{santri.nama}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {santri.jenjang && <span className="text-xs text-gray-400">Kelas {santri.kelas_num} {jenjangLabel(santri.jenjang)}</span>}
                            <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${santri.persentaseKonsistensi}%`, background: santri.persentaseKonsistensi >= 80 ? 'linear-gradient(135deg, #166534, #16a34a)' : santri.persentaseKonsistensi >= 50 ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #dc2626, #ef4444)' }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`font-bold text-sm ${santri.persentaseKonsistensi >= 80 ? 'text-green-600' : santri.persentaseKonsistensi >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{santri.persentaseKonsistensi}%</div>
                          <div className="text-xs text-gray-400">{santri.hariSetor}/7 hari</div>
                        </div>
                      </div>
                    ))}
                    {filterRankingList(rankingKonsistensi).length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>}
                  </div>
                </div>
              )}

              {/* Ranking Semangat */}
              {activeRanking === 'semangat' && (
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
                    <h3 className="text-white font-bold">Peringkat Semangat Hafalan Baru</h3>
                    <p className="text-purple-200 text-xs mt-0.5">Total hafalan baru 7 hari terakhir</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {filterRankingList(rankingSemangat).map((santri, i) => {
                      const maxHalaman = filterRankingList(rankingSemangat)[0]?.tambahHalaman7Hari || 1
                      return (
                        <div key={santri.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-gray-50' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-gray-800">{santri.nama}</div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {santri.jenjang && <span className="text-xs text-gray-400">Kelas {santri.kelas_num} {jenjangLabel(santri.jenjang)}</span>}
                              <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                              <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${Math.min((santri.tambahHalaman7Hari / maxHalaman) * 100, 100)}%` }} />
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-sm text-purple-600">{santri.tambahHalaman7Hari.toFixed(1)}</div>
                            <div className="text-xs text-gray-400">hal ({(santri.tambahHalaman7Hari / 2).toFixed(1)} lembar)</div>
                          </div>
                        </div>
                      )
                    })}
                    {filterRankingList(rankingSemangat).length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}