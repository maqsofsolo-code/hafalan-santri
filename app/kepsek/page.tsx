'use client'
import { useState, useEffect } from 'react'
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
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeRanking, setActiveRanking] = useState('konsistensi')
  const [filterJenjang, setFilterJenjang] = useState('semua')
  const [filterKelas, setFilterKelas] = useState('semua')

  useEffect(() => { fetchAllData() }, [])

  const fetchAllData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profile?.role !== 'kepsek') { window.location.href = '/'; return }

    const today = new Date().toISOString().split('T')[0]

    // Hitung tanggal 7 hari lalu
    const tujuhHariLalu = new Date()
    tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7)
    const tujuhHariLaluStr = tujuhHariLalu.toISOString().split('T')[0]

    const [{ data: santri }, { data: guru }, { data: setoran }, { data: absensi }] = await Promise.all([
      supabase.from('santri').select('*, guru:guru_id(nama)'),
      supabase.from('profiles').select('*').eq('role', 'guru'),
      supabase.from('setoran').select('*, santri:santri_id(nama)').eq('tanggal', today),
      supabase.from('absensi_guru').select('*, guru:guru_id(nama)').eq('tanggal', today)
    ])

    setSantriList(santri || [])
    setGuruList(guru || [])
    setSetoranHariIni(setoran || [])
    setAbsensiGuru(absensi || [])

    // Ranking hafalan total
    const sortedHafalan = [...(santri || [])].sort((a, b) => (b.total_hafalan_juz || 0) - (a.total_hafalan_juz || 0))
    setRankingHafalan(sortedHafalan)

    // Ambil setoran 7 hari terakhir
    const { data: setoran7Hari } = await supabase
      .from('setoran')
      .select('santri_id, tanggal, jenis, penambahan_juz, status_kehadiran')
      .gte('tanggal', tujuhHariLaluStr)
      .eq('status_kehadiran', 'hadir')

    // ===== RANKING KONSISTENSI (% hari setor dari 7 hari) =====
    const konsistensiMap: Record<string, { hariSetor: Set<string> }> = {}
    ;(setoran7Hari || []).forEach(s => {
      if (!konsistensiMap[s.santri_id]) {
        konsistensiMap[s.santri_id] = { hariSetor: new Set() }
      }
      konsistensiMap[s.santri_id].hariSetor.add(s.tanggal)
    })

    const konsistensiList = (santri || []).map(s => {
      const data = konsistensiMap[s.id]
      const hariSetor = data?.hariSetor.size || 0
      const persentase = Math.round((hariSetor / 7) * 100)
      return {
        ...s,
        hariSetor,
        persentaseKonsistensi: persentase
      }
    }).sort((a, b) => b.hariSetor - a.hariSetor)
    setRankingKonsistensi(konsistensiList)

    // ===== RANKING SEMANGAT HAFALAN BARU (total halaman ditambah 7 hari) =====
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const santriSudahSetor = [...new Set(setoranHariIni.map(s => s.santri_id))]
  const santriBelumSetor = santriList.filter(s => !santriSudahSetor.includes(s.id))
  const guruSudahInput = [...new Set(setoranHariIni.map(s => s.guru_id))]
  const guruBelumInput = guruList.filter(g => !guruSudahInput.includes(g.id))

  // Absensi per sesi
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

  // Filter ranking berdasarkan jenjang & kelas
  const filterSantri = (list: any[]) => list.filter(s => {
    if (filterJenjang !== 'semua' && s.jenjang !== filterJenjang) return false
    if (filterKelas !== 'semua' && s.kelas_num?.toString() !== filterKelas) return false
    return true
  })

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '◈' },
    { id: 'monitoring', label: 'Monitoring Harian', icon: '◉' },
    { id: 'ranking', label: 'Ranking Santri', icon: '✦' },
    { id: 'laporan', label: 'Laporan Setoran', icon: '◱' },
  ]

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

          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map(menu => (
              <button key={menu.id}
                onClick={() => { setActiveMenu(menu.id); setSidebarOpen(false) }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium flex items-center gap-3 ${
                  activeMenu === menu.id ? 'bg-white text-blue-900 shadow-md font-bold' : 'text-blue-100 hover:bg-white hover:bg-opacity-10'
                }`}>
                <span className="text-lg">{menu.icon}</span>{menu.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-blue-700">
            <button onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-semibold">
              Keluar
            </button>
            <button onClick={() => setSidebarOpen(false)}
              className="w-full text-blue-300 py-2 rounded-xl text-xs md:hidden mt-1">
              ✕ Tutup
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0 min-w-0">

          {/* DASHBOARD */}
          {activeMenu === 'dashboard' && (
            <div>
              <div className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden shadow-lg"
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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

              {/* Absensi Guru per Sesi */}
              <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4">Absensi Guru Hari Ini</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sesi Subuh */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 flex items-center justify-between"
                      style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                      <div>
                        <span className="text-white font-semibold text-sm">Sesi Subuh</span>
                        <span className="text-blue-200 text-xs ml-2">04.00 - 05.30</span>
                      </div>
                      <span className="bg-white bg-opacity-20 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                        {guruAbsenSubuh.length}/{guruList.length}
                      </span>
                    </div>
                    <div className="p-3 space-y-1">
                      {guruList.map(g => (
                        <div key={g.id} className="flex items-center gap-2 py-1.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${guruAbsenSubuh.includes(g.id) ? 'bg-green-500' : 'bg-red-400'}`}>
                            {g.nama?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-700 flex-1">{g.nama}</span>
                          <span className={`text-xs font-semibold ${guruAbsenSubuh.includes(g.id) ? 'text-green-500' : 'text-red-400'}`}>
                            {guruAbsenSubuh.includes(g.id) ? '✓ Hadir' : 'Absen'}
                          </span>
                        </div>
                      ))}
                      {guruList.length === 0 && <p className="text-gray-400 text-xs text-center py-2">Belum ada guru</p>}
                    </div>
                  </div>

                  {/* Sesi Pagi */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 flex items-center justify-between"
                      style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                      <div>
                        <span className="text-white font-semibold text-sm">Sesi Pagi</span>
                        <span className="text-green-200 text-xs ml-2">08.00 - 09.45</span>
                      </div>
                      <span className="bg-white bg-opacity-20 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                        {guruAbsenPagi.length}/{guruList.length}
                      </span>
                    </div>
                    <div className="p-3 space-y-1">
                      {guruList.map(g => (
                        <div key={g.id} className="flex items-center gap-2 py-1.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${guruAbsenPagi.includes(g.id) ? 'bg-green-500' : 'bg-red-400'}`}>
                            {g.nama?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-700 flex-1">{g.nama}</span>
                          <span className={`text-xs font-semibold ${guruAbsenPagi.includes(g.id) ? 'text-green-500' : 'text-red-400'}`}>
                            {guruAbsenPagi.includes(g.id) ? '✓ Hadir' : 'Absen'}
                          </span>
                        </div>
                      ))}
                      {guruList.length === 0 && <p className="text-gray-400 text-xs text-center py-2">Belum ada guru</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Setoran */}
              <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Progress Setoran Hari Ini</span>
                  <span className="text-sm font-bold" style={{ color: '#2563a8' }}>
                    {santriList.length > 0 ? Math.round((santriSudahSetor.length / santriList.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-1">
                  <div className="h-4 rounded-full"
                    style={{
                      width: `${santriList.length > 0 ? (santriSudahSetor.length / santriList.length) * 100 : 0}%`,
                      background: 'linear-gradient(135deg, #166534, #16a34a)'
                    }} />
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
                  <h2 className="font-bold text-xl">Monitoring Harian</h2>
                  <p className="text-blue-200 text-sm mt-1">📅 {tanggal}</p>
                </div>
              </div>

              {/* Statistik */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Sudah Setor', count: santriSudahSetor.length, color: 'from-green-500 to-green-700' },
                  { label: 'Belum Setor', count: santriBelumSetor.length, color: 'from-red-500 to-red-700' },
                  { label: 'Hadir Subuh', count: guruAbsenSubuh.length, color: 'from-blue-500 to-blue-700' },
                  { label: 'Hadir Pagi', count: guruAbsenPagi.length, color: 'from-purple-500 to-purple-700' },
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
                    {santriList.length > 0 ? Math.round((santriSudahSetor.length / santriList.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div className="h-4 rounded-full"
                    style={{
                      width: `${santriList.length > 0 ? (santriSudahSetor.length / santriList.length) * 100 : 0}%`,
                      background: 'linear-gradient(135deg, #166534, #16a34a)'
                    }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{santriSudahSetor.length} dari {santriList.length} santri</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                    <h3 className="text-white font-semibold text-sm">Sudah Setor ({santriSudahSetor.length})</h3>
                  </div>
                  <div className="p-3">
                    {santriList.filter(s => santriSudahSetor.includes(s.id)).map(s => (
                      <div key={s.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                          {s.nama?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{s.nama}</div>
                          <div className="text-xs text-gray-400">Guru: {s.guru?.nama || '-'}</div>
                        </div>
                        <span className="ml-auto text-green-500 text-xs font-semibold">✓</span>
                      </div>
                    ))}
                    {santriSudahSetor.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada</p>}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-700">
                    <h3 className="text-white font-semibold text-sm">Belum Setor ({santriBelumSetor.length})</h3>
                  </div>
                  <div className="p-3">
                    {santriBelumSetor.map(s => (
                      <div key={s.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-red-400">
                          {s.nama?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{s.nama}</div>
                          <div className="text-xs text-gray-400">Guru: {s.guru?.nama || '-'}</div>
                        </div>
                        <span className="ml-auto text-red-400 text-xs font-semibold">Belum</span>
                      </div>
                    ))}
                    {santriBelumSetor.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Semua sudah setor!</p>}
                  </div>
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

              {/* Filter Jenjang & Kelas */}
              <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Filter Jenjang</label>
                    <select value={filterJenjang} onChange={e => { setFilterJenjang(e.target.value); setFilterKelas('semua') }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="semua">Semua Jenjang</option>
                      <option value="ula">Ula</option>
                      <option value="wustha">Wustha</option>
                      <option value="ulya">Ulya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Filter Kelas</label>
                    <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="semua">Semua Kelas</option>
                      {getKelasOptions(filterJenjang).map(k => (
                        <option key={k} value={k}>Kelas {k}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {filterJenjang !== 'semua' ? `Jenjang ${jenjangLabel(filterJenjang)}` : 'Semua Jenjang'}
                  {filterKelas !== 'semua' ? ` • Kelas ${filterKelas}` : ''}
                  {' • '}{filterSantri(rankingHafalan).length} santri
                </p>
              </div>

              {/* Tab Jenis Ranking */}
              <div className="flex gap-2 mb-5 overflow-x-auto">
                {[
                  { id: 'konsistensi', label: 'Konsistensi Setor', sub: '7 hari terakhir' },
                  { id: 'semangat', label: 'Semangat Hafalan', sub: '7 hari terakhir' },
                  { id: 'total', label: 'Total Hafalan', sub: 'Keseluruhan' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveRanking(tab.id)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition border-2 ${
                      activeRanking === tab.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}>
                    <div>{tab.label}</div>
                    <div className="text-xs font-normal opacity-70">{tab.sub}</div>
                  </button>
                ))}
              </div>

              {/* Ranking Konsistensi */}
              {activeRanking === 'konsistensi' && (
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                    <h3 className="text-white font-bold">Peringkat Konsistensi Setoran</h3>
                    <p className="text-blue-200 text-xs mt-0.5">Dihitung dari % hari setor dalam 7 hari terakhir</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {filterSantri(rankingKonsistensi).map((santri, i) => (
                      <div key={santri.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-gray-50' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          i === 0 ? 'bg-yellow-400 text-white' :
                          i === 1 ? 'bg-gray-300 text-white' :
                          i === 2 ? 'bg-orange-400 text-white' :
                          'bg-gray-100 text-gray-500'
                        }`}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-800">{santri.nama}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {santri.jenjang && (
                              <span className="text-xs text-gray-400">Kelas {santri.kelas_num} {jenjangLabel(santri.jenjang)}</span>
                            )}
                            <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}</span>
                          </div>
                          {/* Progress bar konsistensi */}
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                            <div className="h-1.5 rounded-full"
                              style={{
                                width: `${santri.persentaseKonsistensi}%`,
                                background: santri.persentaseKonsistensi >= 80 ? 'linear-gradient(135deg, #166534, #16a34a)' :
                                  santri.persentaseKonsistensi >= 50 ? 'linear-gradient(135deg, #d97706, #f59e0b)' :
                                  'linear-gradient(135deg, #dc2626, #ef4444)'
                              }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`font-bold text-sm ${
                            santri.persentaseKonsistensi >= 80 ? 'text-green-600' :
                            santri.persentaseKonsistensi >= 50 ? 'text-yellow-600' : 'text-red-500'
                          }`}>{santri.persentaseKonsistensi}%</div>
                          <div className="text-xs text-gray-400">{santri.hariSetor}/7 hari</div>
                        </div>
                      </div>
                    ))}
                    {filterSantri(rankingKonsistensi).length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>
                    )}
                  </div>
                </div>
              )}

              {/* Ranking Semangat */}
              {activeRanking === 'semangat' && (
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
                    <h3 className="text-white font-bold">Peringkat Semangat Hafalan Baru</h3>
                    <p className="text-purple-200 text-xs mt-0.5">Total hafalan baru yang ditambah dalam 7 hari terakhir</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {filterSantri(rankingSemangat).map((santri, i) => {
                      const maxHalaman = filterSantri(rankingSemangat)[0]?.tambahHalaman7Hari || 1
                      return (
                        <div key={santri.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-gray-50' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                            i === 0 ? 'bg-yellow-400 text-white' :
                            i === 1 ? 'bg-gray-300 text-white' :
                            i === 2 ? 'bg-orange-400 text-white' :
                            'bg-gray-100 text-gray-500'
                          }`}>{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-gray-800">{santri.nama}</div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {santri.jenjang && (
                                <span className="text-xs text-gray-400">Kelas {santri.kelas_num} {jenjangLabel(santri.jenjang)}</span>
                              )}
                              <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                              <div className="h-1.5 rounded-full bg-purple-500"
                                style={{ width: `${Math.min((santri.tambahHalaman7Hari / maxHalaman) * 100, 100)}%` }} />
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-sm text-purple-600">
                              {santri.tambahHalaman7Hari.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-400">halaman</div>
                          </div>
                        </div>
                      )
                    })}
                    {filterSantri(rankingSemangat).length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>
                    )}
                  </div>
                </div>
              )}

              {/* Ranking Total Hafalan */}
              {activeRanking === 'total' && (
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                    <h3 className="text-white font-bold">Peringkat Total Hafalan</h3>
                    <p className="text-green-200 text-xs mt-0.5">Diurutkan dari jumlah juz terbanyak</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {filterSantri(rankingHafalan).map((santri, i) => (
                      <div key={santri.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-gray-50' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          i === 0 ? 'bg-yellow-400 text-white' :
                          i === 1 ? 'bg-gray-300 text-white' :
                          i === 2 ? 'bg-orange-400 text-white' :
                          'bg-gray-100 text-gray-500'
                        }`}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-800">{santri.nama}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {santri.jenjang && (
                              <span className="text-xs text-gray-400">Kelas {santri.kelas_num} {jenjangLabel(santri.jenjang)}</span>
                            )}
                            <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div className="h-1.5 rounded-full"
                              style={{
                                width: `${Math.min(((santri.total_hafalan_juz || 0) / 30) * 100, 100)}%`,
                                background: 'linear-gradient(135deg, #166534, #16a34a)'
                              }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-sm text-green-700">{santri.total_hafalan_juz?.toFixed(2) || 0}</div>
                          <div className="text-xs text-gray-400">Juz</div>
                        </div>
                      </div>
                    ))}
                    {filterSantri(rankingHafalan).length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>
                    )}
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
                    <div className="ml-11 text-sm text-gray-600">
                      {item.surah} ayat {item.ayat_mulai}–{item.ayat_selesai}
                    </div>
                    {item.catatan && (
                      <div className="ml-11 mt-1 p-2 bg-blue-50 rounded-lg text-xs text-blue-600">
                        {item.catatan}
                      </div>
                    )}
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