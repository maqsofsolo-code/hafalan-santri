'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
      .from('setoran')
      .select('santri_id, tanggal, santri_nama:santri_id(nama)')

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

  const medalColor = (i: number) => i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-300' : i === 2 ? 'bg-orange-400' : 'bg-gray-100'
  const medalText = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-4xl mb-4">🕌</div>
          <p className="text-gray-500">Memuat data...</p>
        </div>
      </div>
    )
  }

  const menuItems = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'monitoring', label: '👁 Monitoring' },
    { id: 'ranking', label: '🏆 Ranking' },
    { id: 'laporan', label: '📋 Laporan' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">

      {/* HEADER HP */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-green-800 text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xl">🕌</span>
          <span className="font-bold">Hafalan Santri</span>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="text-2xl">☰</button>
      </div>

      {/* OVERLAY */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex">
        {/* SIDEBAR */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-green-800 text-white flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:w-64
        `}>
          <div className="p-6 border-b border-green-700">
            <div className="text-2xl mb-1">🕌</div>
            <h1 className="font-bold text-lg">Hafalan Santri</h1>
            <p className="text-green-300 text-sm">Panel Kepala Sekolah</p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map(menu => (
              <button
                key={menu.id}
                onClick={() => { setActiveMenu(menu.id); setSidebarOpen(false) }}
                className={`w-full text-left px-4 py-3 rounded-lg transition text-base ${activeMenu === menu.id ? 'bg-green-600 font-semibold' : 'hover:bg-green-700'}`}
              >
                {menu.label}
              </button>
            ))}
          </nav>
          <div className="p-4 space-y-2">
            <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg text-sm font-semibold">🚪 Logout</button>
            <button onClick={() => setSidebarOpen(false)} className="w-full bg-green-700 hover:bg-green-600 text-white py-2 rounded-lg text-sm md:hidden">✕ Tutup Menu</button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0 min-w-0">

          {/* DASHBOARD */}
          {activeMenu === 'dashboard' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Dashboard Kepala Sekolah</h2>
              <p className="text-gray-500 text-sm mb-4">
                📅 {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              {/* Statistik */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: '🧒', count: santriList.length, label: 'Total Santri', color: 'text-green-700' },
                  { icon: '👨‍🏫', count: guruList.length, label: 'Total Guru', color: 'text-green-700' },
                  { icon: '✅', count: santriSudahSetor.length, label: 'Sudah Setor', color: 'text-green-700' },
                  { icon: '❌', count: santriBelumSetor.length, label: 'Belum Setor', color: 'text-red-500' },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow text-center">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
                    <div className="text-gray-500 text-xs">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Kehadiran Guru */}
              <div className="space-y-3 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
                <div className="bg-white rounded-2xl shadow p-4">
                  <h3 className="font-semibold mb-3">✅ Guru Aktif ({guruSudahInput.length})</h3>
                  {guruSudahInput.length === 0 && <p className="text-gray-400 text-sm">Belum ada guru yang input</p>}
                  {guruList.filter(g => guruSudahInput.includes(g.id)).map(g => (
                    <div key={g.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                      <span className="text-green-500">✅</span>
                      <span className="text-sm">{g.nama}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl shadow p-4">
                  <h3 className="font-semibold mb-3">❌ Guru Tidak Hadir ({guruBelumInput.length})</h3>
                  {guruBelumInput.length === 0 && <p className="text-gray-400 text-sm">Semua guru sudah aktif!</p>}
                  {guruBelumInput.map(g => (
                    <div key={g.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                      <span className="text-red-500">❌</span>
                      <span className="text-sm">{g.nama}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MONITORING */}
          {activeMenu === 'monitoring' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Monitoring Harian</h2>
              <div className="space-y-3 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
                <div className="bg-white rounded-2xl shadow p-4">
                  <h3 className="font-semibold mb-3 text-green-700">✅ Sudah Setor ({santriSudahSetor.length})</h3>
                  {santriList.filter(s => santriSudahSetor.includes(s.id)).map(s => (
                    <div key={s.id} className="py-2 border-b last:border-0">
                      <div className="font-medium text-sm">{s.nama}</div>
                      <div className="text-xs text-gray-500">Guru: {s.guru?.nama || '-'}</div>
                    </div>
                  ))}
                  {santriSudahSetor.length === 0 && <p className="text-gray-400 text-sm">Belum ada santri yang setor</p>}
                </div>
                <div className="bg-white rounded-2xl shadow p-4">
                  <h3 className="font-semibold mb-3 text-red-600">❌ Belum Setor ({santriBelumSetor.length})</h3>
                  {santriBelumSetor.map(s => (
                    <div key={s.id} className="py-2 border-b last:border-0">
                      <div className="font-medium text-sm">{s.nama}</div>
                      <div className="text-xs text-gray-500">Guru: {s.guru?.nama || '-'}</div>
                    </div>
                  ))}
                  {santriBelumSetor.length === 0 && <p className="text-gray-400 text-sm">Semua santri sudah setor! 🎉</p>}
                </div>
              </div>
            </div>
          )}

          {/* RANKING */}
          {activeMenu === 'ranking' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Ranking Santri</h2>
              <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">

                {/* Ranking Hafalan */}
                <div className="bg-white rounded-2xl shadow overflow-hidden">
                  <div className="bg-green-700 text-white px-4 py-3">
                    <h3 className="font-semibold">📖 Ranking Total Hafalan</h3>
                    <p className="text-green-200 text-xs">Berdasarkan jumlah juz</p>
                  </div>
                  <div className="p-3">
                    {rankingHafalan.map((santri, i) => (
                      <div key={santri.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${medalColor(i)} ${i < 3 ? 'text-white' : 'text-gray-600'}`}>
                          {medalText(i)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{santri.nama}</div>
                          <div className="text-xs text-gray-500">{santri.total_hafalan_juz || 0} Juz</div>
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(((santri.total_hafalan_juz || 0) / 30) * 100, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                    {rankingHafalan.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>}
                  </div>
                </div>

                {/* Ranking Konsistensi */}
                <div className="bg-white rounded-2xl shadow overflow-hidden">
                  <div className="bg-blue-700 text-white px-4 py-3">
                    <h3 className="font-semibold">🔥 Ranking Konsistensi</h3>
                    <p className="text-blue-200 text-xs">Berdasarkan total setoran</p>
                  </div>
                  <div className="p-3">
                    {rankingKonsistensi.map((santri, i) => (
                      <div key={santri.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${medalColor(i)} ${i < 3 ? 'text-white' : 'text-gray-600'}`}>
                          {medalText(i)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{santri.nama}</div>
                          <div className="text-xs text-gray-500">{santri.total} kali setoran</div>
                        </div>
                      </div>
                    ))}
                    {rankingKonsistensi.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LAPORAN */}
          {activeMenu === 'laporan' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Laporan Setoran Hari Ini</h2>
              <div className="space-y-3">
                {setoranHariIni.length === 0 && <p className="text-center py-8 text-gray-400">Belum ada setoran hari ini</p>}
                {setoranHariIni.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl shadow p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-sm">{item.santri?.nama}</div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.status === 'lancar' ? '✅ Lancar' : '🔁 Rosib'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className={`px-2 py-0.5 rounded-full text-xs mr-2 ${item.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {item.jenis === 'baru' ? '📖 Baru' : '🔄 Lama'}
                      </span>
                      {item.surah} ayat {item.ayat_mulai}-{item.ayat_selesai}
                    </div>
                    {item.catatan && <div className="text-xs text-gray-400 mt-1">💬 {item.catatan}</div>}
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