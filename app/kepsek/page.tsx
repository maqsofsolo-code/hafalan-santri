'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Image from 'next/image'

export default function KepsekDashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [santriList, setSantriList] = useState<any[]>([])
  const [guruList, setGuruList] = useState<any[]>([])
  const [setoranHariIni, setSetoranHariIni] = useState<any[]>([])
  const [rankingKonsistensi, setRankingKonsistensi] = useState<any[]>([])
  const [rankingHafalan, setRankingHafalan] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { fetchAllData() }, [])

  const fetchAllData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profile?.role !== 'kepsek') { window.location.href = '/'; return }

    const today = new Date().toISOString().split('T')[0]
    const [{ data: santri }, { data: guru }, { data: setoran }] = await Promise.all([
      supabase.from('santri').select('*, guru:guru_id(nama)'),
      supabase.from('profiles').select('*').eq('role', 'guru'),
      supabase.from('setoran').select('*, santri:santri_id(nama)').eq('tanggal', today)
    ])

    setSantriList(santri || [])
    setGuruList(guru || [])
    setSetoranHariIni(setoran || [])

    const sortedHafalan = [...(santri || [])].sort((a, b) => (b.total_hafalan_juz || 0) - (a.total_hafalan_juz || 0))
    setRankingHafalan(sortedHafalan)

    const { data: allSetoran } = await supabase
      .from('setoran').select('santri_id, tanggal, santri_nama:santri_id(nama)')

    const konsistensiMap: Record<string, {nama: string, total: number}> = {}
    ;(allSetoran || []).forEach(s => {
      if (!konsistensiMap[s.santri_id]) {
        konsistensiMap[s.santri_id] = { nama: (s as any).santri_nama?.nama, total: 0 }
      }
      konsistensiMap[s.santri_id].total++
    })

    const sortedKonsistensi = Object.entries(konsistensiMap)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.total - a.total)

    setRankingKonsistensi(sortedKonsistensi)
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

  const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

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
              <div className="text-white font-semibold text-sm">Kepala Sekolah</div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map(menu => (
              <button key={menu.id}
                onClick={() => { setActiveMenu(menu.id); setSidebarOpen(false) }}
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

          {/* DASHBOARD */}
          {activeMenu === 'dashboard' && (
            <div>
              {/* Banner */}
              <div className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 bg-white" />
                <div className="absolute -bottom-10 -right-4 w-48 h-48 rounded-full opacity-10 bg-white" />
                <div className="absolute top-4 right-20 w-8 h-8 rounded-full opacity-20 bg-white" />
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

              {/* Statistik 4 Kartu */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Total Santri', count: santriList.length, color: 'from-blue-500 to-blue-700', sub: 'Santri terdaftar' },
                  { label: 'Total Guru', count: guruList.length, color: 'from-emerald-500 to-emerald-700', sub: 'Guru musami\'' },
                  { label: 'Sudah Setor', count: santriSudahSetor.length, color: 'from-green-500 to-green-700', sub: 'Hari ini' },
                  { label: 'Belum Setor', count: santriBelumSetor.length, color: 'from-red-500 to-red-700', sub: 'Hari ini' },
                ].map((item, i) => (
                  <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow-lg text-white relative overflow-hidden`}>
                    <div className="absolute -bottom-2 -right-2 text-5xl opacity-10 font-bold">◆</div>
                    <div className="text-3xl font-bold">{item.count}</div>
                    <div className="text-white font-semibold text-xs mt-1">{item.label}</div>
                    <div className="text-white text-opacity-70 text-xs">{item.sub}</div>
                  </div>
                ))}
              </div>

              {/* Progress Kehadiran */}
              <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-3">Kehadiran Guru Hari Ini</h3>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-gray-600">{guruSudahInput.length} dari {guruList.length} guru hadir</span>
                  <span className="font-bold text-blue-700">
                    {guruList.length > 0 ? Math.round((guruSudahInput.length / guruList.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div className="h-3 rounded-full transition-all"
                    style={{
                      width: `${guruList.length > 0 ? (guruSudahInput.length / guruList.length) * 100 : 0}%`,
                      background: 'linear-gradient(135deg, #1a3a5c, #2563a8)'
                    }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-green-700 mb-2">Hadir ({guruSudahInput.length})</p>
                    {guruSudahInput.length === 0 && <p className="text-gray-400 text-xs">Belum ada</p>}
                    {guruList.filter(g => guruSudahInput.includes(g.id)).map(g => (
                      <div key={g.id} className="flex items-center gap-2 py-1.5 border-b last:border-0">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {g.nama?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700">{g.nama}</span>
                        <span className="ml-auto text-green-500 text-xs font-medium">Hadir</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-600 mb-2">Tidak Hadir ({guruBelumInput.length})</p>
                    {guruBelumInput.length === 0 && <p className="text-gray-400 text-xs">Semua guru hadir!</p>}
                    {guruBelumInput.map(g => (
                      <div key={g.id} className="flex items-center gap-2 py-1.5 border-b last:border-0">
                        <div className="w-6 h-6 rounded-full bg-red-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {g.nama?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700">{g.nama}</span>
                        <span className="ml-auto text-red-400 text-xs font-medium">Absen</span>
                      </div>
                    ))}
                  </div>
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
                  <h2 className="text-white font-bold text-xl">Monitoring Harian</h2>
                  <p className="text-blue-200 text-sm mt-1">📅 {tanggal}</p>
                </div>
              </div>

              {/* Progress Setoran */}
              <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Progress Setoran Hari Ini</span>
                  <span className="text-sm font-bold" style={{ color: '#2563a8' }}>
                    {santriList.length > 0 ? Math.round((santriSudahSetor.length / santriList.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-1">
                  <div className="h-4 rounded-full transition-all flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      width: `${santriList.length > 0 ? (santriSudahSetor.length / santriList.length) * 100 : 0}%`,
                      background: 'linear-gradient(135deg, #166534, #16a34a)',
                      minWidth: santriSudahSetor.length > 0 ? '2rem' : '0'
                    }}>
                    {santriSudahSetor.length > 0 ? santriSudahSetor.length : ''}
                  </div>
                </div>
                <p className="text-xs text-gray-400">{santriSudahSetor.length} sudah setor dari {santriList.length} santri</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sudah Setor */}
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                    <span className="text-white font-semibold text-sm">Sudah Setor</span>
                    <span className="bg-white bg-opacity-30 text-white text-xs px-2 py-0.5 rounded-full font-bold ml-auto">
                      {santriSudahSetor.length}
                    </span>
                  </div>
                  <div className="p-3">
                    {santriList.filter(s => santriSudahSetor.includes(s.id)).map(s => (
                      <div key={s.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                          {s.nama?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-800">{s.nama}</div>
                          <div className="text-xs text-gray-400">Guru: {s.guru?.nama || '-'}</div>
                        </div>
                        <span className="ml-auto text-green-500 text-xs font-semibold">✓ Setor</span>
                      </div>
                    ))}
                    {santriSudahSetor.length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-4">Belum ada yang setor</p>
                    )}
                  </div>
                </div>

                {/* Belum Setor */}
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-700">
                    <span className="text-white font-semibold text-sm">Belum Setor</span>
                    <span className="bg-white bg-opacity-30 text-white text-xs px-2 py-0.5 rounded-full font-bold ml-auto">
                      {santriBelumSetor.length}
                    </span>
                  </div>
                  <div className="p-3">
                    {santriBelumSetor.map(s => (
                      <div key={s.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-gradient-to-br from-red-400 to-red-600">
                          {s.nama?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-800">{s.nama}</div>
                          <div className="text-xs text-gray-400">Guru: {s.guru?.nama || '-'}</div>
                        </div>
                        <span className="ml-auto text-red-400 text-xs font-semibold">Belum</span>
                      </div>
                    ))}
                    {santriBelumSetor.length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-4">Semua santri sudah setor!</p>
                    )}
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
                  <h2 className="text-white font-bold text-xl">Ranking Santri</h2>
                  <p className="text-blue-200 text-sm mt-1">Peringkat berdasarkan hafalan & konsistensi</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Ranking Hafalan */}
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4"
                    style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                    <h3 className="text-white font-bold">Ranking Total Hafalan</h3>
                    <p className="text-green-200 text-xs mt-0.5">Berdasarkan jumlah juz yang dihafal</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {rankingHafalan.slice(0, 10).map((santri, i) => (
                      <div key={santri.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-gray-50' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          i === 0 ? 'bg-yellow-400 text-white' :
                          i === 1 ? 'bg-gray-300 text-white' :
                          i === 2 ? 'bg-orange-400 text-white' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-800 truncate">{santri.nama}</div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div className="h-1.5 rounded-full"
                              style={{
                                width: `${Math.min(((santri.total_hafalan_juz || 0) / 30) * 100, 100)}%`,
                                background: 'linear-gradient(135deg, #166534, #16a34a)'
                              }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-sm text-green-700">{santri.total_hafalan_juz || 0}</div>
                          <div className="text-xs text-gray-400">Juz</div>
                        </div>
                      </div>
                    ))}
                    {rankingHafalan.length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>
                    )}
                  </div>
                </div>

                {/* Ranking Konsistensi */}
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4"
                    style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                    <h3 className="text-white font-bold">Ranking Konsistensi</h3>
                    <p className="text-blue-200 text-xs mt-0.5">Berdasarkan total setoran</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {rankingKonsistensi.slice(0, 10).map((santri, i) => (
                      <div key={santri.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-gray-50' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          i === 0 ? 'bg-yellow-400 text-white' :
                          i === 1 ? 'bg-gray-300 text-white' :
                          i === 2 ? 'bg-orange-400 text-white' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-800 truncate">{santri.nama}</div>
                          <div className="text-xs text-gray-400">{santri.total} kali setoran</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-sm" style={{ color: '#2563a8' }}>{santri.total}</div>
                          <div className="text-xs text-gray-400">Setoran</div>
                        </div>
                      </div>
                    ))}
                    {rankingKonsistensi.length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LAPORAN */}
          {activeMenu === 'laporan' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="text-white font-bold text-xl">Laporan Setoran</h2>
                  <p className="text-blue-200 text-sm mt-1">📅 {tanggal}</p>
                  <p className="text-blue-100 text-xs mt-1">{setoranHariIni.length} setoran hari ini</p>
                </div>
              </div>

              <div className="space-y-3">
                {setoranHariIni.length === 0 && (
                  <div className="bg-white rounded-2xl p-10 text-center shadow border border-gray-100">
                    <div className="text-5xl mb-3">◌</div>
                    <p className="text-gray-400">Belum ada setoran hari ini</p>
                  </div>
                )}
                {setoranHariIni.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                          {item.santri?.nama?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-gray-800">{item.santri?.nama}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                              {item.jenis === 'baru' ? 'Hafalan Baru' : 'Murojaah'}
                            </span>
                          </div>
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
                        Catatan: {item.catatan}
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