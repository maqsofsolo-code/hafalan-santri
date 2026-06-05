'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Image from 'next/image'

export default function KepsekDashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [santriList, setSantriList] = useState<any[]>([])
  const [guruList, setGuruList] = useState<any[]>([])
  const [setoranHariIni, setSetoranHariIni] = useState<any[]>([])
  const [rankingHafalan, setRankingHafalan] = useState<any[]>([])
  const [rankingKonsistensi, setRankingKonsistensi] = useState<any[]>([])
  const [rankingSemangat, setRankingSemangat] = useState<any[]>([])
  const [absensiGuru, setAbsensiGuru] = useState<any[]>([])
  const [setoranMurojaahHariIni, setSetoranMurojaahHariIni] = useState<any[]>([])
  const [kalenderAktif, setKalenderAktif] = useState<any>(null)
  const [nilaiUjianList, setNilaiUjianList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeRanking, setActiveRanking] = useState('konsistensi')

  // Filter ranking
  const [filterJenjang, setFilterJenjang] = useState('semua')
  const [filterKelas, setFilterKelas] = useState('semua')

  // Filter ujian
  const [filterUjianJenjang, setFilterUjianJenjang] = useState('semua')
  const [filterUjianKelas, setFilterUjianKelas] = useState('semua')

  // Filter & search monitoring
  const [monitoringTanggal, setMonitoringTanggal] = useState(new Date().toISOString().split('T')[0])
  const [searchMonitoring, setSearchMonitoring] = useState('')
  const [filterMonitoringJenjang, setFilterMonitoringJenjang] = useState('semua')
  const [filterMonitoringKelas, setFilterMonitoringKelas] = useState('semua')
  const [setoranTanggalDipilih, setSetoranTanggalDipilih] = useState<any[]>([])
  const [absensiTanggalDipilih, setAbsensiTanggalDipilih] = useState<any[]>([])
  const [loadingMonitoring, setLoadingMonitoring] = useState(false)

  // Filter murojaah
  const [searchMurojaah, setSearchMurojaah] = useState('')
  const [filterMurojaahJenjang, setFilterMurojaahJenjang] = useState('semua')
  const [filterMurojaahKelas, setFilterMurojaahKelas] = useState('semua')
  const [murojaahTanggal, setMurojaahTanggal] = useState(new Date().toISOString().split('T')[0])
  const [setoranMurojaahTanggal, setSetoranMurojaahTanggal] = useState<any[]>([])
  const [loadingMurojaah, setLoadingMurojaah] = useState(false)

  useEffect(() => { fetchAllData() }, [])

  const fetchAllData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profile?.role !== 'kepsek') { window.location.href = '/'; return }

    const today = new Date().toISOString().split('T')[0]
    const tujuhHariLalu = new Date()
    tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7)
    const tujuhHariLaluStr = tujuhHariLalu.toISOString().split('T')[0]

    const [{ data: santri }, { data: guru }, { data: setoran }, { data: absensi }] = await Promise.all([
      supabase.from('santri').select('*, guru:guru_id(nama)'),
      supabase.from('profiles').select('*').eq('role', 'guru'),
      supabase.from('setoran').select('*, santri:santri_id(nama, kelas, kelas_num, jenjang)').eq('tanggal', today),
      supabase.from('absensi_guru').select('*, guru:guru_id(nama)').eq('tanggal', today)
    ])

    setSantriList(santri || [])
    setGuruList(guru || [])
    setSetoranHariIni(setoran || [])
    setAbsensiGuru(absensi || [])
    setSetoranTanggalDipilih(setoran || [])
    setAbsensiTanggalDipilih(absensi || [])

    const { data: kalender } = await supabase.from('kalender_akademik').select('*').lte('tanggal_mulai', today).gte('tanggal_selesai', today).single()
    setKalenderAktif(kalender || null)

    const { data: nilaiUjian } = await supabase
      .from('nilai_ujian')
      .select('*, santri:santri_id(nama, kelas, kelas_num, jenjang), guru:guru_id(nama), surah_mulai:surah_mulai_nomor(nama_latin), surah_selesai:surah_selesai_nomor(nama_latin)')
      .order('created_at', { ascending: false })
    setNilaiUjianList(nilaiUjian || [])

    const sortedHafalan = [...(santri || [])].sort((a, b) => (b.total_hafalan_juz || 0) - (a.total_hafalan_juz || 0))
    setRankingHafalan(sortedHafalan)

    // Setoran murojaah hari ini
    const { data: murojaahHariIni } = await supabase
      .from('setoran')
      .select('*, santri:santri_id(nama, total_hafalan_juz, kelas, kelas_num, jenjang, guru:guru_id(nama))')
      .eq('tanggal', today).eq('jenis', 'lama').eq('status_kehadiran', 'hadir')
    setSetoranMurojaahHariIni(murojaahHariIni || [])
    setSetoranMurojaahTanggal(murojaahHariIni || [])

    const { data: setoran7Hari } = await supabase
      .from('setoran')
      .select('santri_id, tanggal, jenis, penambahan_juz, status_kehadiran')
      .gte('tanggal', tujuhHariLaluStr).eq('status_kehadiran', 'hadir')

    const konsistensiMap: Record<string, { hariSetor: Set<string> }> = {}
    ;(setoran7Hari || []).forEach(s => {
      if (!konsistensiMap[s.santri_id]) konsistensiMap[s.santri_id] = { hariSetor: new Set() }
      konsistensiMap[s.santri_id].hariSetor.add(s.tanggal)
    })
    const konsistensiList = (santri || []).map(s => ({
      ...s,
      hariSetor: konsistensiMap[s.id]?.hariSetor.size || 0,
      persentaseKonsistensi: Math.round(((konsistensiMap[s.id]?.hariSetor.size || 0) / 7) * 100)
    })).sort((a, b) => b.hariSetor - a.hariSetor)
    setRankingKonsistensi(konsistensiList)

    const semangatMap: Record<string, { totalJuz: number }> = {}
    ;(setoran7Hari || []).filter(s => s.jenis === 'baru').forEach(s => {
      if (!semangatMap[s.santri_id]) semangatMap[s.santri_id] = { totalJuz: 0 }
      semangatMap[s.santri_id].totalJuz += (s.penambahan_juz || 0)
    })
    const semangatList = (santri || []).map(s => ({
      ...s,
      tambahJuz7Hari: semangatMap[s.id]?.totalJuz || 0,
      tambahHalaman7Hari: (semangatMap[s.id]?.totalJuz || 0) * 20
    })).sort((a, b) => b.tambahJuz7Hari - a.tambahJuz7Hari)
    setRankingSemangat(semangatList)

    setLoading(false)
  }

  // Fetch data monitoring berdasarkan tanggal
  const fetchMonitoringTanggal = useCallback(async (tgl: string) => {
    setLoadingMonitoring(true)
    const [{ data: setoran }, { data: absensi }] = await Promise.all([
      supabase.from('setoran').select('*, santri:santri_id(nama, kelas, kelas_num, jenjang, guru:guru_id(nama))').eq('tanggal', tgl),
      supabase.from('absensi_guru').select('*, guru:guru_id(nama)').eq('tanggal', tgl)
    ])
    setSetoranTanggalDipilih(setoran || [])
    setAbsensiTanggalDipilih(absensi || [])
    setLoadingMonitoring(false)
  }, [])

  // Fetch data murojaah berdasarkan tanggal
  const fetchMurojaahTanggal = useCallback(async (tgl: string) => {
    setLoadingMurojaah(true)
    const { data } = await supabase
      .from('setoran')
      .select('*, santri:santri_id(nama, total_hafalan_juz, kelas, kelas_num, jenjang, guru:guru_id(nama))')
      .eq('tanggal', tgl).eq('jenis', 'lama').eq('status_kehadiran', 'hadir')
    setSetoranMurojaahTanggal(data || [])
    setLoadingMurojaah(false)
  }, [])

  const handleUbahTanggalMonitoring = (tgl: string) => {
    setMonitoringTanggal(tgl)
    fetchMonitoringTanggal(tgl)
  }

  const handleUbahTanggalMurojaah = (tgl: string) => {
    setMurojaahTanggal(tgl)
    fetchMurojaahTanggal(tgl)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const today = new Date().toISOString().split('T')[0]
  const hariMinggu = new Date().getDay()
  const isLiburMingguan = hariMinggu === 0 || hariMinggu === 5
  const isLibur = isLiburMingguan || kalenderAktif?.tipe === 'libur'
  const isUjian = kalenderAktif && (kalenderAktif.tipe === 'mid_semester' || kalenderAktif.tipe === 'semester')

  const santriSudahSetor = [...new Set(setoranHariIni.map(s => s.santri_id))]
  const santriBelumSetor = santriList.filter(s => !santriSudahSetor.includes(s.id))
  const guruAbsenSubuh = absensiGuru.filter(a => a.sesi === 'subuh').map(a => a.guru_id)
  const guruAbsenPagi = absensiGuru.filter(a => a.sesi === 'pagi').map(a => a.guru_id)

  const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

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

  const filterSantri = (list: any[]) => list.filter(s => {
    if (filterJenjang !== 'semua' && s.jenjang !== filterJenjang) return false
    if (filterKelas !== 'semua' && s.kelas_num?.toString() !== filterKelas) return false
    return true
  })

  const nilaiUjianFiltered = nilaiUjianList.filter(n => {
    if (filterUjianJenjang !== 'semua' && n.santri?.jenjang !== filterUjianJenjang) return false
    if (filterUjianKelas !== 'semua' && n.santri?.kelas_num?.toString() !== filterUjianKelas) return false
    return true
  })

  const rekapNilaiPerKelas = () => {
    const map: Record<string, { total: number, count: number, kelas: string, jenjang: string }> = {}
    nilaiUjianList.forEach(n => {
      if (!n.santri) return
      const key = `${n.santri.kelas_num}-${n.santri.jenjang}`
      if (!map[key]) map[key] = { total: 0, count: 0, kelas: n.santri.kelas || '-', jenjang: n.santri.jenjang || '' }
      map[key].total += n.nilai_akhir || 0
      map[key].count += 1
    })
    return Object.values(map).map(v => ({ ...v, rata: Math.round((v.total / v.count) * 10) / 10 })).sort((a, b) => b.rata - a.rata)
  }

  // Data monitoring berdasarkan tanggal yang dipilih
  const santriSudahSetorTanggal = [...new Set(setoranTanggalDipilih.map(s => s.santri_id))]
  const guruAbsenSubuhTanggal = absensiTanggalDipilih.filter(a => a.sesi === 'subuh').map(a => a.guru_id)
  const guruAbsenPagiTanggal = absensiTanggalDipilih.filter(a => a.sesi === 'pagi').map(a => a.guru_id)

  // Filter santri untuk monitoring
  const santriMonitoringFiltered = santriList.filter(s => {
    if (filterMonitoringJenjang !== 'semua' && s.jenjang !== filterMonitoringJenjang) return false
    if (filterMonitoringKelas !== 'semua' && s.kelas_num?.toString() !== filterMonitoringKelas) return false
    if (searchMonitoring && !s.nama?.toLowerCase().includes(searchMonitoring.toLowerCase())) return false
    return true
  })

  const santriSudahSetorFiltered = santriMonitoringFiltered.filter(s => santriSudahSetorTanggal.includes(s.id))
  const santriBelumSetorFiltered = santriMonitoringFiltered.filter(s => !santriSudahSetorTanggal.includes(s.id))

  // Hitung monitor murojaah dari tanggal yang dipilih
  const hasilMonitorMurojaah = santriList
    .filter(s => {
      if (s.total_hafalan_juz <= 0) return false
      if (filterMurojaahJenjang !== 'semua' && s.jenjang !== filterMurojaahJenjang) return false
      if (filterMurojaahKelas !== 'semua' && s.kelas_num?.toString() !== filterMurojaahKelas) return false
      if (searchMurojaah && !s.nama?.toLowerCase().includes(searchMurojaah.toLowerCase())) return false
      return true
    })
    .map(santri => {
      const targetHalaman = santri.total_hafalan_juz
      const targetLembar = targetHalaman / 2
      const setoranSantri = setoranMurojaahTanggal.filter(s => s.santri_id === santri.id)
      const totalHalamanSetor = setoranSantri.reduce((sum: number, s: any) => sum + (s.jumlah_halaman_murojaah || 0), 0)
      const totalLembarSetor = totalHalamanSetor / 2
      const sudahMurojaah = setoranSantri.length > 0
      const persentase = targetHalaman > 0 ? Math.round((totalHalamanSetor / targetHalaman) * 100) : 0
      let statusLabel = 'Belum Murojaah'; let statusColor = 'text-gray-500'; let statusBg = 'bg-gray-100'
      if (sudahMurojaah) {
        if (persentase >= 80) { statusLabel = 'Sesuai Target'; statusColor = 'text-green-700'; statusBg = 'bg-green-100' }
        else if (persentase >= 50) { statusLabel = 'Kurang Sedikit'; statusColor = 'text-yellow-700'; statusBg = 'bg-yellow-100' }
        else { statusLabel = 'Jauh dari Target'; statusColor = 'text-red-700'; statusBg = 'bg-red-100' }
      }
      return { ...santri, targetHalaman, targetLembar, totalHalamanSetor, totalLembarSetor, persentase, sudahMurojaah, statusLabel, statusColor, statusBg }
    }).sort((a, b) => a.persentase - b.persentase)

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '◈' },
    { id: 'monitoring', label: 'Monitoring Harian', icon: '◉' },
    { id: 'murojaah', label: 'Monitor Murojaah', icon: '◎' },
    { id: 'ujian', label: 'Rekap Nilai Ujian', icon: '📝' },
    { id: 'ranking', label: 'Ranking Santri', icon: '✦' },
    { id: 'laporan', label: 'Laporan Setoran', icon: '◱' },
  ]

  const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="text-center text-white">
          <div className="w-16 h-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center mx-auto mb-4">
            <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain" />
          </div>
          <p className="text-blue-200">Memuat data...</p>
        </div>
      </div>
    )
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
            <div className="text-blue-200 text-xs">Kepala Sekolah</div>
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
              <div className="text-white font-semibold text-sm">Kepala Sekolah</div>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map(menu => (
              <button key={menu.id}
                onClick={() => { setActiveMenu(menu.id); setSidebarOpen(false) }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium flex items-center gap-3 ${activeMenu === menu.id ? 'bg-white text-blue-900 shadow-md font-bold' : 'text-blue-100 hover:bg-white hover:bg-opacity-10'}`}>
                <span className="text-lg">{menu.icon}</span>{menu.label}
                {menu.id === 'ujian' && isUjian && <span className="ml-auto text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">Aktif</span>}
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
                      <h2 className="text-white font-bold text-xl">Kepala Sekolah</h2>
                    </div>
                  </div>
                  <p className="text-blue-200 text-sm mt-2">📅 {tanggal}</p>
                  <p className="text-blue-100 text-xs mt-1">Pondok Pesantren Daarus Salaf Sukoharjo</p>
                </div>
              </div>

              {isLibur && (
                <div className="mb-5 p-4 rounded-2xl border-2 border-orange-300 bg-orange-50 flex items-center gap-3">
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
                <div className="mb-5 p-4 rounded-2xl border-2 border-red-300 bg-red-50 flex items-center gap-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <div className="font-bold text-red-800 text-sm">{kalenderAktif?.nama}</div>
                    <div className="text-red-600 text-xs">{kalenderAktif?.tipe === 'semester' ? 'Ujian akhir semester' : 'Ujian mid semester aktif'}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Total Santri', count: santriList.length, color: 'from-blue-500 to-blue-700', sub: 'Terdaftar' },
                  { label: 'Total Guru', count: guruList.length, color: 'from-emerald-500 to-emerald-700', sub: 'Guru musami\'' },
                  { label: 'Sudah Setor', count: santriSudahSetor.length, color: 'from-green-500 to-green-700', sub: 'Hari ini' },
                  { label: 'Belum Setor', count: santriBelumSetor.length, color: 'from-red-500 to-red-700', sub: 'Hari ini' },
                ].map((item, i) => (
                  <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow-lg text-white relative overflow-hidden`}>
                    <div className="absolute -bottom-2 -right-2 text-5xl opacity-10">◆</div>
                    <div className="text-3xl font-bold">{item.count}</div>
                    <div className="font-semibold text-xs mt-1">{item.label}</div>
                    <div className="text-white text-opacity-70 text-xs">{item.sub}</div>
                  </div>
                ))}
              </div>

              {/* Absensi Guru */}
              <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4">Absensi Guru Hari Ini</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Sesi Subuh', jam: '04.00 - 05.30', list: guruAbsenSubuh, bg: 'linear-gradient(135deg, #1a3a5c, #2563a8)', textColor: 'text-blue-200' },
                    { label: 'Sesi Pagi', jam: '08.00 - 09.45', list: guruAbsenPagi, bg: 'linear-gradient(135deg, #166534, #16a34a)', textColor: 'text-green-200' },
                  ].map((sesi, si) => (
                    <div key={si} className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: sesi.bg }}>
                        <div>
                          <span className="text-white font-semibold text-sm">{sesi.label}</span>
                          <span className={`${sesi.textColor} text-xs ml-2`}>{sesi.jam}</span>
                        </div>
                        <span className="bg-white bg-opacity-20 text-white text-xs px-2 py-0.5 rounded-full font-bold">{sesi.list.length}/{guruList.length}</span>
                      </div>
                      <div className="p-3 space-y-1">
                        {guruList.map(g => (
                          <div key={g.id} className="flex items-center gap-2 py-1.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${sesi.list.includes(g.id) ? 'bg-green-500' : 'bg-red-400'}`}>
                              {g.nama?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-700 flex-1">{g.nama}</span>
                            <span className={`text-xs font-semibold ${sesi.list.includes(g.id) ? 'text-green-500' : 'text-red-400'}`}>
                              {sesi.list.includes(g.id) ? '✓ Hadir' : 'Absen'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Progress Setoran Hari Ini</span>
                  <span className="text-sm font-bold" style={{ color: '#2563a8' }}>
                    {santriList.length > 0 ? Math.round((santriSudahSetor.length / santriList.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-1">
                  <div className="h-4 rounded-full" style={{ width: `${santriList.length > 0 ? (santriSudahSetor.length / santriList.length) * 100 : 0}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
                </div>
                <p className="text-xs text-gray-400">{santriSudahSetor.length} dari {santriList.length} santri sudah setor</p>
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
                  <h2 className="font-bold text-xl">Monitoring Setoran</h2>
                  <p className="text-blue-200 text-sm mt-1">Lihat data per tanggal</p>
                </div>
              </div>

              {/* Filter & Tanggal */}
              <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">📅 Tanggal</label>
                    <input type="date" value={monitoringTanggal}
                      onChange={e => handleUbahTanggalMonitoring(e.target.value)}
                      max={today} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
                    <select value={filterMonitoringJenjang} onChange={e => { setFilterMonitoringJenjang(e.target.value); setFilterMonitoringKelas('semua') }} className={inputClass}>
                      <option value="semua">Semua</option>
                      <option value="ula">Ula</option>
                      <option value="wustha">Wustha</option>
                      <option value="ulya">Ulya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Kelas</label>
                    <select value={filterMonitoringKelas} onChange={e => setFilterMonitoringKelas(e.target.value)} className={inputClass}>
                      <option value="semua">Semua</option>
                      {getKelasOptions(filterMonitoringJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cari Santri</label>
                    <input type="text" value={searchMonitoring} onChange={e => setSearchMonitoring(e.target.value)}
                      placeholder="Nama santri..." className={inputClass} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Tanggal: <span className="font-semibold text-gray-600">{new Date(monitoringTanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </p>
                  {loadingMonitoring && <span className="text-xs text-blue-500">Memuat...</span>}
                </div>
              </div>

              {/* Statistik tanggal dipilih */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Sudah Setor', count: santriSudahSetorFiltered.length, color: 'from-green-500 to-green-700' },
                  { label: 'Belum Setor', count: santriBelumSetorFiltered.length, color: 'from-red-500 to-red-700' },
                  { label: 'Hadir Subuh', count: guruAbsenSubuhTanggal.length, color: 'from-blue-500 to-blue-700' },
                  { label: 'Hadir Pagi', count: guruAbsenPagiTanggal.length, color: 'from-purple-500 to-purple-700' },
                ].map((item, i) => (
                  <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow-lg text-white relative overflow-hidden`}>
                    <div className="absolute -bottom-2 -right-2 text-5xl opacity-10">◆</div>
                    <div className="text-3xl font-bold">{item.count}</div>
                    <div className="font-semibold text-xs mt-1">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Progress Setoran</span>
                  <span className="text-sm font-bold" style={{ color: '#2563a8' }}>
                    {santriMonitoringFiltered.length > 0 ? Math.round((santriSudahSetorFiltered.length / santriMonitoringFiltered.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div className="h-4 rounded-full" style={{ width: `${santriMonitoringFiltered.length > 0 ? (santriSudahSetorFiltered.length / santriMonitoringFiltered.length) * 100 : 0}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{santriSudahSetorFiltered.length} dari {santriMonitoringFiltered.length} santri</p>
              </div>

              {/* Absensi Guru tanggal dipilih */}
              <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">Absensi Guru</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Subuh', list: guruAbsenSubuhTanggal, color: 'bg-blue-500' },
                    { label: 'Pagi', list: guruAbsenPagiTanggal, color: 'bg-green-500' },
                  ].map((sesi, si) => (
                    <div key={si} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-600">Sesi {sesi.label}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{sesi.list.length}/{guruList.length}</span>
                      </div>
                      {guruList.map(g => (
                        <div key={g.id} className="flex items-center gap-1.5 py-1">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sesi.list.includes(g.id) ? 'bg-green-500' : 'bg-red-400'}`} />
                          <span className="text-xs text-gray-600 flex-1 truncate">{g.nama}</span>
                          <span className={`text-xs font-semibold ${sesi.list.includes(g.id) ? 'text-green-500' : 'text-red-400'}`}>
                            {sesi.list.includes(g.id) ? '✓' : '✗'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Daftar Santri */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                    <h3 className="text-white font-semibold text-sm">Sudah Setor ({santriSudahSetorFiltered.length})</h3>
                  </div>
                  <div className="p-3 max-h-80 overflow-y-auto">
                    {santriSudahSetorFiltered.map(s => {
                      const setoran = setoranTanggalDipilih.filter(x => x.santri_id === s.id)
                      return (
                        <div key={s.id} className="py-2 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                              {s.nama?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{s.nama}</div>
                              <div className="text-xs text-gray-400">{s.kelas || '-'} • {s.guru?.nama || '-'}</div>
                            </div>
                            <span className="text-green-500 text-xs font-semibold flex-shrink-0">✓ {setoran.length}x</span>
                          </div>
                          {setoran.map(st => (
                            <div key={st.id} className="ml-10 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${st.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                {st.jenis === 'baru' ? 'Baru' : 'Murojaah'} — {st.status === 'lancar' ? '✓ Lancar' : '✗ Rosib'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                    {santriSudahSetorFiltered.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada</p>}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-700">
                    <h3 className="text-white font-semibold text-sm">Belum Setor ({santriBelumSetorFiltered.length})</h3>
                  </div>
                  <div className="p-3 max-h-80 overflow-y-auto">
                    {santriBelumSetorFiltered.map(s => (
                      <div key={s.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-red-400">
                          {s.nama?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{s.nama}</div>
                          <div className="text-xs text-gray-400">{s.kelas || '-'} • {s.guru?.nama || '-'}</div>
                        </div>
                        <span className="text-red-400 text-xs font-semibold flex-shrink-0">Belum</span>
                      </div>
                    ))}
                    {santriBelumSetorFiltered.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Semua sudah setor!</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MONITOR MUROJAAH */}
          {activeMenu === 'murojaah' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #6b21a8 0%, #9333ea 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Monitor Murojaah</h2>
                  <p className="text-purple-200 text-sm mt-1">Pantau kesesuaian target murojaah</p>
                </div>
              </div>

              {/* Filter & Tanggal Murojaah */}
              <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">📅 Tanggal</label>
                    <input type="date" value={murojaahTanggal}
                      onChange={e => handleUbahTanggalMurojaah(e.target.value)}
                      max={today} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
                    <select value={filterMurojaahJenjang} onChange={e => { setFilterMurojaahJenjang(e.target.value); setFilterMurojaahKelas('semua') }} className={inputClass}>
                      <option value="semua">Semua</option>
                      <option value="ula">Ula</option>
                      <option value="wustha">Wustha</option>
                      <option value="ulya">Ulya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Kelas</label>
                    <select value={filterMurojaahKelas} onChange={e => setFilterMurojaahKelas(e.target.value)} className={inputClass}>
                      <option value="semua">Semua</option>
                      {getKelasOptions(filterMurojaahJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cari Santri</label>
                    <input type="text" value={searchMurojaah} onChange={e => setSearchMurojaah(e.target.value)}
                      placeholder="Nama santri..." className={inputClass} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Tanggal: <span className="font-semibold text-gray-600">{new Date(murojaahTanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </p>
                  {loadingMurojaah && <span className="text-xs text-purple-500">Memuat...</span>}
                </div>
              </div>

              {/* Statistik */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Sesuai Target', count: hasilMonitorMurojaah.filter(s => s.persentase >= 80).length, color: 'from-green-500 to-green-700' },
                  { label: 'Kurang', count: hasilMonitorMurojaah.filter(s => s.sudahMurojaah && s.persentase < 80).length, color: 'from-yellow-500 to-yellow-700' },
                  { label: 'Belum Murojaah', count: hasilMonitorMurojaah.filter(s => !s.sudahMurojaah).length, color: 'from-gray-400 to-gray-600' },
                ].map((item, i) => (
                  <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow text-white relative overflow-hidden`}>
                    <div className="absolute -bottom-2 -right-2 text-5xl opacity-10">◆</div>
                    <div className="text-2xl font-bold">{item.count}</div>
                    <div className="font-semibold text-xs mt-1">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Detail */}
              <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
                  <h3 className="text-white font-bold">Detail Murojaah Per Santri</h3>
                  <p className="text-purple-200 text-xs mt-0.5">Diurutkan dari yang paling perlu perhatian</p>
                </div>
                <div className="p-4 space-y-3">
                  {hasilMonitorMurojaah.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Tidak ada data santri</p>}
                  {hasilMonitorMurojaah.map((santri) => (
                    <div key={santri.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
                            {santri.nama?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-gray-800">{santri.nama}</div>
                            <div className="text-xs text-gray-400">{santri.kelas || '-'} • Guru: {santri.guru?.nama || '-'}</div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${santri.statusBg} ${santri.statusColor}`}>{santri.statusLabel}</span>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Target: <span className="font-semibold">{santri.targetHalaman.toFixed(1)} hal</span> <span className="text-gray-400">(≈ {santri.targetLembar.toFixed(1)} lembar)</span></span>
                          <span className="font-bold" style={{ color: '#9333ea' }}>{santri.persentase}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(santri.persentase, 100)}%`,
                              background: santri.persentase >= 80 ? 'linear-gradient(135deg, #166534, #16a34a)' : santri.persentase >= 50 ? 'linear-gradient(135deg, #d97706, #f59e0b)' : santri.persentase > 0 ? 'linear-gradient(135deg, #dc2626, #ef4444)' : '#e5e7eb'
                            }} />
                        </div>
                        {santri.sudahMurojaah && (
                          <div className="text-xs text-gray-400 mt-1">
                            Disetor: <span className="font-semibold text-gray-600">{santri.totalHalamanSetor.toFixed(1)} hal</span>
                            <span className="ml-1">(≈ {santri.totalLembarSetor.toFixed(1)} lembar)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* REKAP NILAI UJIAN */}
          {activeMenu === 'ujian' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Rekap Nilai Ujian</h2>
                  <p className="text-orange-200 text-sm mt-1">{nilaiUjianList.length} nilai tercatat</p>
                  {isUjian && <p className="text-orange-100 text-xs mt-0.5">{kalenderAktif?.nama} sedang berlangsung</p>}
                </div>
              </div>

              {rekapNilaiPerKelas().length > 0 && (
                <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-3">Rata-rata Nilai per Kelas</h3>
                  <div className="space-y-2">
                    {rekapNilaiPerKelas().map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-gray-800">{item.kelas}</div>
                          <div className="text-xs text-gray-400">{item.count} santri sudah diuji</div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div className="h-1.5 rounded-full" style={{ width: `${(item.rata / 10) * 100}%`, background: item.rata >= 8 ? 'linear-gradient(135deg, #166534, #16a34a)' : item.rata >= 6 ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #dc2626, #ef4444)' }} />
                          </div>
                        </div>
                        <div className={`text-xl font-bold flex-shrink-0 ${item.rata >= 8 ? 'text-green-600' : item.rata >= 6 ? 'text-yellow-600' : 'text-red-600'}`}>{item.rata}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Filter Jenjang</label>
                    <select value={filterUjianJenjang} onChange={e => { setFilterUjianJenjang(e.target.value); setFilterUjianKelas('semua') }} className={inputClass}>
                      <option value="semua">Semua Jenjang</option>
                      <option value="ula">Ula</option>
                      <option value="wustha">Wustha</option>
                      <option value="ulya">Ulya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Filter Kelas</label>
                    <select value={filterUjianKelas} onChange={e => setFilterUjianKelas(e.target.value)} className={inputClass}>
                      <option value="semua">Semua Kelas</option>
                      {getKelasOptions(filterUjianJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">{nilaiUjianFiltered.length} nilai ditampilkan</p>
              </div>

              <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>
                  <h3 className="text-white font-bold">Detail Nilai Per Santri</h3>
                  <p className="text-orange-200 text-xs mt-0.5">Diurutkan dari terbaru</p>
                </div>
                <div className="p-4 space-y-3">
                  {nilaiUjianFiltered.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data nilai ujian</p>}
                  {nilaiUjianFiltered.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>
                            {item.santri?.nama?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-gray-800">{item.santri?.nama}</div>
                            <div className="text-xs text-gray-400">{item.santri?.kelas || '-'} • Guru: {item.guru?.nama || '-'}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{item.surah_mulai?.nama_latin} → {item.surah_selesai?.nama_latin} • {item.tanggal}</div>
                          </div>
                        </div>
                        <div className={`text-2xl font-bold flex-shrink-0 ${item.nilai_akhir >= 8 ? 'text-green-600' : item.nilai_akhir >= 6 ? 'text-yellow-600' : 'text-red-600'}`}>{item.nilai_akhir}</div>
                      </div>
                      <div className="mt-2 flex gap-3 text-xs text-gray-400">
                        <span>Tegur: <span className="font-semibold text-gray-600">{item.jumlah_tegur}</span></span>
                        <span>Tahu Ayat: <span className="font-semibold text-gray-600">{item.jumlah_tahu_ayat}</span></span>
                        <span>Lupa: <span className="font-semibold text-gray-600">{item.jumlah_lupa}</span></span>
                      </div>
                      {item.catatan && <div className="mt-1 p-2 bg-orange-50 rounded-lg text-xs text-orange-700">{item.catatan}</div>}
                    </div>
                  ))}
                </div>
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
                  {filterKelas !== 'semua' ? ` • Kelas ${filterKelas}` : ''} • {filterSantri(rankingHafalan).length} santri
                </p>
              </div>
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {[
                  { id: 'konsistensi', label: 'Konsistensi Setor', sub: '7 hari terakhir' },
                  { id: 'semangat', label: 'Semangat Hafalan', sub: '7 hari terakhir' },
                  { id: 'total', label: 'Total Hafalan', sub: 'Keseluruhan' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveRanking(tab.id)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition border-2 ${activeRanking === tab.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                    <div>{tab.label}</div>
                    <div className="text-xs font-normal opacity-70">{tab.sub}</div>
                  </button>
                ))}
              </div>

              {activeRanking === 'konsistensi' && (
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                    <h3 className="text-white font-bold">Peringkat Konsistensi Setoran</h3>
                    <p className="text-blue-200 text-xs mt-0.5">% hari setor dalam 7 hari terakhir</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {filterSantri(rankingKonsistensi).map((santri, i) => (
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
                    {filterSantri(rankingKonsistensi).length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>}
                  </div>
                </div>
              )}

              {activeRanking === 'semangat' && (
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
                    <h3 className="text-white font-bold">Peringkat Semangat Hafalan Baru</h3>
                    <p className="text-purple-200 text-xs mt-0.5">Total hafalan baru 7 hari terakhir</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {filterSantri(rankingSemangat).map((santri, i) => {
                      const maxHalaman = filterSantri(rankingSemangat)[0]?.tambahHalaman7Hari || 1
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
                    {filterSantri(rankingSemangat).length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>}
                  </div>
                </div>
              )}

              {activeRanking === 'total' && (
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                    <h3 className="text-white font-bold">Peringkat Total Hafalan</h3>
                    <p className="text-green-200 text-xs mt-0.5">Diurutkan dari jumlah juz terbanyak</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {filterSantri(rankingHafalan).map((santri, i) => (
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
                    {filterSantri(rankingHafalan).length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LAPORAN */}
          {activeMenu === 'laporan' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Laporan Setoran</h2>
                  <p className="text-blue-200 text-sm mt-1">📅 {tanggal}</p>
                  <p className="text-blue-100 text-xs mt-1">{setoranHariIni.length} setoran hari ini</p>
                </div>
              </div>
              <div className="space-y-3">
                {setoranHariIni.length === 0 && (
                  <div className="bg-white rounded-2xl p-10 text-center shadow border border-gray-100">
                    <p className="text-gray-400">Belum ada setoran hari ini</p>
                  </div>
                )}
                {setoranHariIni.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                          {item.santri?.nama?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{item.santri?.nama}</div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {item.jenis === 'baru' ? 'Hafalan Baru' : 'Murojaah'}
                          </span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.status === 'lancar' ? 'Lancar' : 'Rosib'}
                      </span>
                    </div>
                    <div className="ml-11 text-sm text-gray-600">{item.surah} ayat {item.ayat_mulai}–{item.ayat_selesai}</div>
                    {item.catatan && <div className="ml-11 mt-1 p-2 bg-blue-50 rounded-lg text-xs text-blue-600">{item.catatan}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}