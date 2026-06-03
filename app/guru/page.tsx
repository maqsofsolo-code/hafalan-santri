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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [riwayatList, setRiwayatList] = useState<any[]>([])
  const [sudahAbsen, setSudahAbsen] = useState(false)
  const [absenLoading, setAbsenLoading] = useState(false)
  const [searchSantri, setSearchSantri] = useState('')
  const [guruPengganti, setGuruPengganti] = useState(false)

  // Form states
  const [selectedSantri, setSelectedSantri] = useState<any>(null)
  const [jenis, setJenis] = useState('baru')
  const [statusKehadiran, setStatusKehadiran] = useState('hadir')

  // Hafalan Baru
  const [surahBaru, setSurahBaru] = useState('')
  const [ayatMulaiBaru, setAyatMulaiBaru] = useState('')
  const [ayatSelesaiBaru, setAyatSelesaiBaru] = useState('')

  // Murojaah
  const [surahMulai, setSurahMulai] = useState('')
  const [ayatMulaiMurojaah, setAyatMulaiMurojaah] = useState('1')
  const [surahSelesai, setSurahSelesai] = useState('')
  const [ayatSelesaiMurojaah, setAyatSelesaiMurojaah] = useState('')

  const [status, setStatus] = useState('lancar')
  const [catatan, setCatatan] = useState('')

  useEffect(() => { fetchGuruData() }, [])

  const fetchGuruData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profile?.role !== 'guru') { window.location.href = '/'; return }
    setGuruProfile(profile)

    // Santri kelompok sendiri
    const { data: santri } = await supabase
      .from('santri').select('*, guru:guru_id(nama)')
      .eq('guru_id', user.id)
    setSantriList(santri || [])

    // Semua santri (untuk guru pengganti)
    const { data: allSantri } = await supabase
      .from('santri').select('*, guru:guru_id(nama)')
    setAllSantriList(allSantri || [])

    // Data surah
    const { data: surah } = await supabase
      .from('surah').select('*').order('nomor', { ascending: false })
    setSurahList(surah || [])

    // Cek absensi hari ini
    const today = new Date().toISOString().split('T')[0]
    const { data: absensi } = await supabase
      .from('absensi_guru')
      .select('*')
      .eq('guru_id', user.id)
      .eq('tanggal', today)
      .single()
    setSudahAbsen(!!absensi)
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

  const handleToggleAbsen = async () => {
    setAbsenLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]

    if (sudahAbsen) {
      // Batalkan absensi
      await supabase.from('absensi_guru')
        .delete()
        .eq('guru_id', user.id)
        .eq('tanggal', today)
      setSudahAbsen(false)
    } else {
      // Absen hadir
      await supabase.from('absensi_guru')
        .insert({ guru_id: user.id, tanggal: today, status: 'hadir' })
      setSudahAbsen(true)
    }
    setAbsenLoading(false)
  }

  // Hitung penambahan juz dari hafalan baru
  const hitungPenambahanJuz = (surahNomor: number, ayatMulai: number, ayatSelesai: number) => {
    const surah = surahList.find(s => s.nomor === surahNomor)
    if (!surah) return 0

    // Hitung proporsi ayat dari total ayat surah
    const totalAyatSurah = surah.jumlah_ayat
    const ayatDiSetor = ayatSelesai - ayatMulai + 1
    const proporsi = ayatDiSetor / totalAyatSurah

    // Hitung halaman surah ini
    const halamanSurah = surah.halaman_selesai - surah.halaman_mulai + 1

    // Halaman yang ditambahkan
    const halamanDitambah = proporsi * halamanSurah
    return Math.max(0, halamanDitambah / 20)
  }

  // Hitung target murojaah hari ini
  const hitungTargetMurojaah = (santri: any) => {
    if (!santri?.total_hafalan_juz) return null
    const targetJuz = santri.total_hafalan_juz / 20
    const targetHalaman = targetJuz * 20 // 1 juz = 20 halaman
    return { targetJuz: targetJuz.toFixed(3), targetHalaman: targetHalaman.toFixed(1) }
  }

  // Auto-isi ayat selesai berdasarkan surah yang dipilih
  const handleSurahSelesaiChange = (nomor: string) => {
    setSurahSelesai(nomor)
    if (nomor) {
      const surah = surahList.find(s => s.nomor === parseInt(nomor))
      if (surah) setAyatSelesaiMurojaah(String(surah.jumlah_ayat))
    }
  }

  const handleInputSetoran = async () => {
    if (!selectedSantri) { setErrorMsg('Pilih santri dulu!'); return }

    if (statusKehadiran !== 'hadir') {
      // Santri tidak hadir — simpan status kehadiran saja
      setLoading(true); setErrorMsg('')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('setoran').insert({
        santri_id: selectedSantri.id,
        guru_id: user.id,
        jenis: 'baru',
        status: 'tidak_hadir',
        status_kehadiran: statusKehadiran,
        tanggal: new Date().toISOString().split('T')[0],
        guru_pengganti: guruPengganti,
        perlu_ulang: false
      })
      if (error) { setErrorMsg('Gagal: ' + error.message); setLoading(false); return }
      setSuccessMsg(`Data kehadiran ${selectedSantri.nama} berhasil disimpan!`)
      resetForm(); setLoading(false)
      setTimeout(() => setSuccessMsg(''), 3000)
      return
    }

    // Validasi setoran hadir
    if (jenis === 'baru') {
      if (!surahBaru || !ayatMulaiBaru || !ayatSelesaiBaru) {
        setErrorMsg('Lengkapi data hafalan baru!'); return
      }
    } else {
      if (!surahMulai || !surahSelesai) {
        setErrorMsg('Lengkapi data murojaah!'); return
      }
    }

    setLoading(true); setErrorMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let penambahanJuz = 0
    let insertData: any = {
      santri_id: selectedSantri.id,
      guru_id: user.id,
      jenis,
      status,
      catatan,
      status_kehadiran: 'hadir',
      perlu_ulang: status === 'rosib',
      tanggal: new Date().toISOString().split('T')[0],
      guru_pengganti: guruPengganti
    }

    if (jenis === 'baru') {
      const surahNomor = parseInt(surahBaru)
      const ayatMulaiNum = parseInt(ayatMulaiBaru)
      const ayatSelesaiNum = parseInt(ayatSelesaiBaru)
      penambahanJuz = hitungPenambahanJuz(surahNomor, ayatMulaiNum, ayatSelesaiNum)

      insertData = {
        ...insertData,
        surah_mulai_nomor: surahNomor,
        surah_selesai_nomor: surahNomor,
        surah: surahList.find(s => s.nomor === surahNomor)?.nama_latin || '',
        ayat_mulai: ayatMulaiNum,
        ayat_selesai: ayatSelesaiNum,
        ayat_mulai_baru: ayatMulaiNum,
        ayat_selesai_baru: ayatSelesaiNum,
        penambahan_juz: penambahanJuz
      }
    } else {
      insertData = {
        ...insertData,
        surah_mulai_nomor: parseInt(surahMulai),
        surah_selesai_nomor: parseInt(surahSelesai),
        surah: surahList.find(s => s.nomor === parseInt(surahMulai))?.nama_latin || '',
        ayat_mulai: parseInt(ayatMulaiMurojaah),
        ayat_selesai: parseInt(ayatSelesaiMurojaah)
      }
    }

    const { error } = await supabase.from('setoran').insert(insertData)
    if (error) { setErrorMsg('Gagal: ' + error.message); setLoading(false); return }

    // Update total hafalan jika hafalan baru
    if (jenis === 'baru' && penambahanJuz > 0) {
      const totalBaru = (selectedSantri.total_hafalan_juz || 0) + penambahanJuz
      await supabase.from('santri')
        .update({
          total_hafalan_juz: totalBaru,
          surah_terakhir_nomor: parseInt(surahBaru),
          ayat_terakhir: parseInt(ayatSelesaiBaru)
        })
        .eq('id', selectedSantri.id)
    }

    setSuccessMsg('Setoran berhasil disimpan!')
    resetForm(); setLoading(false)
    setTimeout(() => setSuccessMsg(''), 3000)
    fetchGuruData()
  }

  const resetForm = () => {
    setSelectedSantri(null); setJenis('baru'); setStatus('lancar')
    setSurahBaru(''); setAyatMulaiBaru(''); setAyatSelesaiBaru('')
    setSurahMulai(''); setAyatMulaiMurojaah('1'); setSurahSelesai(''); setAyatSelesaiMurojaah('')
    setCatatan(''); setStatusKehadiran('hadir'); setSearchSantri(''); setGuruPengganti(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const menuItems = [
    { id: 'input', label: 'Input Setoran', icon: '✎' },
    { id: 'riwayat', label: 'Riwayat Setoran', icon: '◱' },
    { id: 'santri', label: 'Santri Saya', icon: '◎' },
  ]

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

  // Filter santri berdasarkan search
  const santriTampil = guruPengganti
    ? allSantriList.filter(s => s.nama.toLowerCase().includes(searchSantri.toLowerCase()))
    : santriList.filter(s => s.nama.toLowerCase().includes(searchSantri.toLowerCase()))

  const targetMurojaah = selectedSantri ? hitungTargetMurojaah(selectedSantri) : null

  // Surah yang disarankan untuk murojaah hari ini
  const getSaranMurojaah = () => {
    if (!selectedSantri?.surah_terakhir_nomor) return null
    const surahTerakhir = surahList.find(s => s.nomor === selectedSantri.surah_terakhir_nomor)
    return surahTerakhir
  }

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
            <div className="text-blue-200 text-xs">{guruProfile?.nama || 'Guru'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Tombol Absen */}
          <button
            onClick={handleToggleAbsen}
            disabled={absenLoading}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow ${
              sudahAbsen
                ? 'bg-green-500 text-white'
                : 'bg-white bg-opacity-20 text-white border border-white border-opacity-40'
            }`}>
            {absenLoading ? '...' : sudahAbsen ? '✓ Hadir' : 'Absen'}
          </button>
          <button onClick={() => setSidebarOpen(true)} className="text-2xl p-1">☰</button>
        </div>
      </div>

      {/* OVERLAY */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex">
        {/* SIDEBAR */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-72 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:w-64
        `} style={{ background: 'linear-gradient(180deg, #1a3a5c 0%, #1e4080 100%)' }}>

          <div className="p-5 border-b border-blue-700">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full p-1 shadow-md flex-shrink-0 w-14 h-14 flex items-center justify-center">
                <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain" />
              </div>
              <div>
                <div className="text-white font-bold text-sm leading-tight">Pondok Pesantren</div>
                <div className="text-white font-bold text-base leading-tight">Daarus Salaf</div>
                <div className="text-blue-300 text-xs">Sukoharjo</div>
              </div>
            </div>
            <div className="mt-3 bg-blue-800 bg-opacity-60 rounded-xl px-3 py-2 border border-blue-600">
              <div className="text-blue-300 text-xs">Masuk sebagai</div>
              <div className="text-white font-semibold text-sm">{guruProfile?.nama || 'Guru'}</div>
              <div className="text-blue-300 text-xs">Guru Musami'</div>
            </div>
            {/* Absen Desktop */}
            <button
              onClick={handleToggleAbsen}
              disabled={absenLoading}
              className={`w-full mt-3 py-2.5 rounded-xl text-sm font-bold transition ${
                sudahAbsen
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white border border-white border-opacity-30'
              }`}>
              {absenLoading ? 'Memproses...' : sudahAbsen ? '✓ Sudah Absen Hadir' : 'Klik untuk Absen Hadir'}
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map(menu => (
              <button key={menu.id}
                onClick={() => {
                  setActiveMenu(menu.id)
                  setSuccessMsg('')
                  setSidebarOpen(false)
                  if (menu.id === 'riwayat') fetchRiwayat()
                }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium flex items-center gap-3 ${
                  activeMenu === menu.id
                    ? 'bg-white text-blue-900 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-white hover:bg-opacity-10'
                }`}>
                <span className="text-lg">{menu.icon}</span>
                {menu.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-blue-700">
            <button onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-semibold transition">
              Keluar
            </button>
            <button onClick={() => setSidebarOpen(false)}
              className="w-full text-blue-300 py-2 rounded-xl text-xs md:hidden hover:text-white mt-1">
              ✕ Tutup Menu
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0 min-w-0">

          {/* INPUT SETORAN */}
          {activeMenu === 'input' && (
            <div>
              {/* Banner */}
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="absolute -bottom-8 right-10 w-32 h-32 rounded-full opacity-10 bg-white" />
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <h2 className="text-white font-bold text-xl">Input Setoran</h2>
                    <p className="text-blue-200 text-sm mt-1">📅 {tanggal}</p>
                    <p className="text-blue-100 text-xs mt-1">{santriList.length} santri dalam kelompok</p>
                  </div>
                  {/* Status Absen Desktop */}
                  <div className="hidden md:block">
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${sudahAbsen ? 'bg-green-500 text-white' : 'bg-white bg-opacity-20 text-white'}`}>
                      {sudahAbsen ? '✓ Sudah Absen' : 'Belum Absen'}
                    </div>
                  </div>
                </div>
              </div>

              {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                  <span className="text-lg">✓</span> {successMsg}
                </div>
              )}

              <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">

                {/* Toggle Guru Pengganti */}
                <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => { setGuruPengganti(!guruPengganti); setSelectedSantri(null); setSearchSantri('') }}
                      className={`w-12 h-6 rounded-full transition-all ${guruPengganti ? 'bg-blue-600' : 'bg-gray-300'}`}>
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
                    Pilih Santri {guruPengganti && <span className="text-blue-500 text-xs">(semua santri)</span>}
                  </label>
                  <input
                    type="text"
                    value={searchSantri}
                    onChange={e => setSearchSantri(e.target.value)}
                    placeholder="Cari nama santri..."
                    className={inputClass + ' mb-2'}
                  />
                  {searchSantri && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                      {santriTampil.map(s => (
                        <button key={s.id}
                          onClick={() => { setSelectedSantri(s); setSearchSantri(s.nama) }}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b last:border-0 text-sm">
                          <span className="font-medium">{s.nama}</span>
                          {s.kelas && <span className="text-gray-400 text-xs ml-2">Kelas {s.kelas}</span>}
                          {guruPengganti && <span className="text-blue-400 text-xs ml-2">({s.guru?.nama || '-'})</span>}
                        </button>
                      ))}
                      {santriTampil.length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-400">Santri tidak ditemukan</div>
                      )}
                    </div>
                  )}

                  {/* Info santri terpilih */}
                  {selectedSantri && (
                    <div className="mt-2 p-3 rounded-xl border"
                      style={{ background: 'linear-gradient(135deg, #f0f7ff, #e8f4ff)', borderColor: '#bfdbfe' }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-800">{selectedSantri.nama}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Total Hafalan: <span className="font-semibold text-blue-700">{selectedSantri.total_hafalan_juz?.toFixed(2) || 0} Juz</span>
                          </div>
                          {targetMurojaah && (
                            <div className="text-xs text-green-600 mt-0.5">
                              Target Murojaah: <span className="font-semibold">{targetMurojaah.targetHalaman} halaman/hari</span>
                            </div>
                          )}
                          {guruPengganti && (
                            <div className="text-xs text-orange-500 mt-0.5">
                              Guru tetap: {selectedSantri.guru?.nama || '-'}
                            </div>
                          )}
                        </div>
                        <button onClick={() => { setSelectedSantri(null); setSearchSantri('') }}
                          className="text-gray-400 hover:text-gray-600 text-lg">×</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Kehadiran Santri */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status Kehadiran Santri</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'hadir', label: 'Hadir', color: 'border-green-500 bg-green-50 text-green-700' },
                      { value: 'sakit', label: 'Sakit', color: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
                      { value: 'izin', label: 'Izin', color: 'border-blue-500 bg-blue-50 text-blue-700' },
                      { value: 'alpha', label: 'Alpha', color: 'border-red-500 bg-red-50 text-red-700' },
                    ].map(s => (
                      <button key={s.value}
                        onClick={() => setStatusKehadiran(s.value)}
                        className={`py-2.5 rounded-xl text-xs font-bold border-2 transition ${
                          statusKehadiran === s.value ? s.color : 'border-gray-200 bg-white text-gray-500'
                        }`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Setoran (hanya jika hadir) */}
                {statusKehadiran === 'hadir' && (
                  <>
                    {/* Jenis Hafalan */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Jenis Setoran</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setJenis('baru')}
                          className={`p-4 rounded-xl border-2 transition text-left ${jenis === 'baru' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="text-sm font-bold text-gray-800">Hafalan Baru</div>
                          <div className="text-xs text-gray-400 mt-0.5">Tambah hafalan baru</div>
                        </button>
                        <button onClick={() => setJenis('lama')}
                          className={`p-4 rounded-xl border-2 transition text-left ${jenis === 'lama' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="text-sm font-bold text-gray-800">Murojaah</div>
                          <div className="text-xs text-gray-400 mt-0.5">Mengulang hafalan lama</div>
                        </button>
                      </div>
                    </div>

                    {/* FORM HAFALAN BARU */}
                    {jenis === 'baru' && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Detail Hafalan Baru</label>
                        <select value={surahBaru} onChange={e => { setSurahBaru(e.target.value); setAyatMulaiBaru('1') }} className={inputClass + ' mb-3'}>
                          <option value="">-- Pilih Surah --</option>
                          {surahList.map(s => (
                            <option key={s.nomor} value={s.nomor}>
                              {s.nomor}. {s.nama_latin} ({s.jumlah_ayat} ayat)
                            </option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Ayat Mulai</label>
                            <input type="number" value={ayatMulaiBaru} onChange={e => setAyatMulaiBaru(e.target.value)}
                              placeholder="1" className={inputClass} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Ayat Selesai</label>
                            <input type="number" value={ayatSelesaiBaru} onChange={e => setAyatSelesaiBaru(e.target.value)}
                              placeholder="5" className={inputClass} />
                          </div>
                        </div>
                        {surahBaru && ayatMulaiBaru && ayatSelesaiBaru && (
                          <div className="mt-2 text-xs text-blue-600 font-medium">
                            + {hitungPenambahanJuz(parseInt(surahBaru), parseInt(ayatMulaiBaru), parseInt(ayatSelesaiBaru)).toFixed(4)} Juz akan ditambahkan
                          </div>
                        )}
                      </div>
                    )}

                    {/* FORM MUROJAAH */}
                    {jenis === 'lama' && (
                      <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Detail Murojaah</label>

                        {/* Saran target */}
                        {targetMurojaah && (
                          <div className="mb-3 p-3 bg-white rounded-xl border border-purple-200">
                            <p className="text-xs font-semibold text-purple-700 mb-1">Target Murojaah Hari Ini:</p>
                            <p className="text-xs text-gray-600">
                              ± <span className="font-bold text-purple-700">{targetMurojaah.targetHalaman} halaman</span>
                              {' '}({targetMurojaah.targetJuz} Juz)
                            </p>
                            {getSaranMurojaah() && (
                              <p className="text-xs text-gray-500 mt-1">
                                Posisi terakhir: <span className="font-semibold">{getSaranMurojaah()?.nama_latin}</span>
                              </p>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Dari Surah</label>
                            <select value={surahMulai} onChange={e => { setSurahMulai(e.target.value); setAyatMulaiMurojaah('1') }} className={inputClass}>
                              <option value="">-- Pilih Surah Mulai --</option>
                              {surahList.map(s => (
                                <option key={s.nomor} value={s.nomor}>
                                  {s.nomor}. {s.nama_latin}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Ayat Mulai</label>
                              <input type="number" value={ayatMulaiMurojaah} onChange={e => setAyatMulaiMurojaah(e.target.value)}
                                placeholder="1" className={inputClass} />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Surah Selesai</label>
                              <select value={surahSelesai} onChange={e => handleSurahSelesaiChange(e.target.value)} className={inputClass}>
                                <option value="">-- Pilih --</option>
                                {surahList.map(s => (
                                  <option key={s.nomor} value={s.nomor}>
                                    {s.nomor}. {s.nama_latin}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {surahSelesai && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Ayat Selesai</label>
                              <input type="number" value={ayatSelesaiMurojaah} onChange={e => setAyatSelesaiMurojaah(e.target.value)}
                                className={inputClass} />
                            </div>
                          )}
                        </div>

                        {surahMulai && surahSelesai && (
                          <div className="mt-2 p-2 bg-white rounded-lg text-xs text-purple-600">
                            Murojaah dari <span className="font-bold">{surahList.find(s => s.nomor === parseInt(surahMulai))?.nama_latin}</span>
                            {' '}sampai <span className="font-bold">{surahList.find(s => s.nomor === parseInt(surahSelesai))?.nama_latin}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status Hafalan */}
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

                {/* Catatan */}
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Catatan {statusKehadiran !== 'hadir' ? '(Opsional)' : '(Opsional)'}
                  </label>
                  <textarea value={catatan} onChange={e => setCatatan(e.target.value)}
                    placeholder={statusKehadiran !== 'hadir'
                      ? 'Keterangan tambahan kehadiran...'
                      : 'Catatan untuk wali santri...'}
                    rows={2} className={inputClass} />
                </div>

                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">
                    {errorMsg}
                  </div>
                )}

                <button onClick={handleInputSetoran} disabled={loading || !selectedSantri}
                  className="w-full text-white py-4 rounded-xl font-bold transition disabled:opacity-50 text-base shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                  {loading ? 'Menyimpan...' : statusKehadiran !== 'hadir' ? 'Simpan Ketidakhadiran' : 'Simpan Setoran'}
                </button>
              </div>
            </div>
          )}

          {/* RIWAYAT */}
          {activeMenu === 'riwayat' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="text-white font-bold text-xl">Riwayat Setoran</h2>
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
                          <div className="font-semibold text-sm text-gray-800">{item.santri?.nama}</div>
                          <div className="text-xs text-gray-400">{item.tanggal}</div>
                        </div>
                      </div>
                      {item.status_kehadiran !== 'hadir' ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          item.status_kehadiran === 'sakit' ? 'bg-yellow-100 text-yellow-700' :
                          item.status_kehadiran === 'izin' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {item.status_kehadiran?.toUpperCase()}
                        </span>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.status === 'lancar' ? 'Lancar' : 'Rosib'}
                        </span>
                      )}
                    </div>
                    {item.status_kehadiran === 'hadir' && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {item.jenis === 'baru' ? 'Hafalan Baru' : 'Murojaah'}
                        </span>
                        <span className="text-xs text-gray-600">
                          {item.surah_mulai?.nama_latin || item.surah}
                          {item.surah_selesai && item.surah_mulai_nomor !== item.surah_selesai_nomor && (
                            <> → {item.surah_selesai?.nama_latin}</>
                          )}
                          {' '}ayat {item.ayat_mulai}–{item.ayat_selesai}
                        </span>
                        {item.guru_pengganti && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">Pengganti</span>
                        )}
                      </div>
                    )}
                    {item.catatan && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-600">
                        {item.catatan}
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
                  <h2 className="text-white font-bold text-xl">Santri Saya</h2>
                  <p className="text-green-200 text-sm mt-1">{santriList.length} santri dalam kelompok</p>
                </div>
              </div>
              <div className="space-y-3">
                {santriList.length === 0 && (
                  <div className="bg-white rounded-2xl p-10 text-center shadow border border-gray-100">
                    <p className="text-gray-400">Belum ada santri</p>
                  </div>
                )}
                {santriList.map(santri => {
                  const target = hitungTargetMurojaah(santri)
                  return (
                    <div key={santri.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                          {santri.nama?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">{santri.nama}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {santri.kelas && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">Kelas {santri.kelas}</span>
                            )}
                            <span className="text-xs text-gray-500">{santri.total_hafalan_juz?.toFixed(2) || 0} Juz</span>
                          </div>
                          {/* Progress */}
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Progress 30 Juz</span>
                              <span>{Math.round(((santri.total_hafalan_juz || 0) / 30) * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="h-2 rounded-full"
                                style={{
                                  width: `${Math.min(((santri.total_hafalan_juz || 0) / 30) * 100, 100)}%`,
                                  background: 'linear-gradient(135deg, #166534, #16a34a)'
                                }} />
                            </div>
                          </div>
                          {target && (
                            <div className="mt-1 text-xs text-purple-600">
                              Target murojaah: <span className="font-semibold">{target.targetHalaman} hal/hari</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}