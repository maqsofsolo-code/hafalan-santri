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

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'kepsek') { window.location.href = '/'; return }

    const today = new Date().toISOString().split('T')[0]

    // Fetch semua data
    const [
      { data: santri },
      { data: guru },
      { data: setoran }
    ] = await Promise.all([
      supabase.from('santri').select('*, guru:guru_id(nama)'),
      supabase.from('profiles').select('*').eq('role', 'guru'),
      supabase.from('setoran').select('*, santri:santri_id(nama)').eq('tanggal', today)
    ])

    setSantriList(santri || [])
    setGuruList(guru || [])
    setSetoranHariIni(setoran || [])

    // Ranking hafalan terbanyak
    const sortedHafalan = [...(santri || [])].sort(
      (a, b) => (b.total_hafalan_juz || 0) - (a.total_hafalan_juz || 0)
    )
    setRankingHafalan(sortedHafalan)

    // Ranking konsistensi (hitung jumlah setoran per santri)
    const { data: allSetoran } = await supabase
      .from('setoran')
      .select('santri_id, tanggal, santri_nama:santri_id(nama)')

    const konsistensiMap: Record<string, {nama: string, total: number}> = {}
    ;(allSetoran || []).forEach(s => {
      if (!konsistensiMap[s.santri_id]) {
        konsistensiMap[s.santri_id] = {
          nama: (s as any).santri_nama?.nama,
          total: 0
        }
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

  const today = new Date().toISOString().split('T')[0]

  // Santri yang sudah setor hari ini
  const santriSudahSetor = [...new Set(setoranHariIni.map(s => s.santri_id))]

  // Santri yang belum setor hari ini
  const santriBelumSetor = santriList.filter(
    s => !santriSudahSetor.includes(s.id)
  )

  // Guru yang sudah input hari ini
  const guruSudahInput = [...new Set(setoranHariIni.map(s => s.guru_id))]

  // Guru yang belum input hari ini
  const guruBelumInput = guruList.filter(
    g => !guruSudahInput.includes(g.id)
  )

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

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Tombol Hamburger untuk HP */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-40 md:hidden bg-green-800 text-white p-2 rounded-lg shadow-lg"
      >
        ☰
      </button>
      {/* Overlay gelap ketika sidebar terbuka di HP */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-green-800 text-white flex flex-col transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-6 border-b border-green-700">
          <div className="text-2xl mb-1">🕌</div>
          <h1 className="font-bold text-lg">Hafalan Santri</h1>
          <p className="text-green-300 text-sm">Panel Kepala Sekolah</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'monitoring', label: '👁 Monitoring Harian' },
            { id: 'ranking', label: '🏆 Ranking Santri' },
            { id: 'laporan', label: '📋 Laporan Setoran' },
          ].map(menu => (
            <button
              key={menu.id}
              onClick={() => setActiveMenu(menu.id)}
              className={`w-full text-left px-4 py-2 rounded-lg transition ${
                activeMenu === menu.id
                  ? 'bg-green-600 font-semibold'
                  : 'hover:bg-green-700'
              }`}
            >
              {menu.label}
            </button>
          ))}
        </nav>
        <div className="p-4">
          <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm">
            🚪 Logout
          </button>
          <button onClick={() => setSidebarOpen(false)} className="w-full mt-2 bg-green-700 hover:bg-green-600 text-white py-2 rounded-lg text-sm md:hidden">
            ✕ Tutup Menu
          </button>
        </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 w-full">

        {/* Dashboard */}
        {activeMenu === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Dashboard Kepala Sekolah
            </h2>
            <p className="text-gray-500 mb-6">
              📅 {new Date().toLocaleDateString('id-ID', {
                weekday: 'long', year: 'numeric',
                month: 'long', day: 'numeric'
              })}
            </p>

            {/* Kartu Statistik */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-2xl p-5 shadow text-center">
                <div className="text-3xl mb-1">🧒</div>
                <div className="text-3xl font-bold text-green-700">{santriList.length}</div>
                <div className="text-gray-500 text-sm">Total Santri</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow text-center">
                <div className="text-3xl mb-1">👨‍🏫</div>
                <div className="text-3xl font-bold text-green-700">{guruList.length}</div>
                <div className="text-gray-500 text-sm">Total Guru</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow text-center">
                <div className="text-3xl mb-1">✅</div>
                <div className="text-3xl font-bold text-green-700">
                  {santriSudahSetor.length}
                </div>
                <div className="text-gray-500 text-sm">Sudah Setor Hari Ini</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow text-center">
                <div className="text-3xl mb-1">❌</div>
                <div className="text-3xl font-bold text-red-500">
                  {santriBelumSetor.length}
                </div>
                <div className="text-gray-500 text-sm">Belum Setor Hari Ini</div>
              </div>
            </div>

            {/* Kehadiran Guru Hari Ini */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow p-6">
                <h3 className="font-semibold text-lg mb-4">
                  ✅ Guru Aktif Hari Ini ({guruSudahInput.length})
                </h3>
                {guruSudahInput.length === 0 && (
                  <p className="text-gray-400 text-sm">Belum ada guru yang input</p>
                )}
                {guruList
                  .filter(g => guruSudahInput.includes(g.id))
                  .map(g => (
                    <div key={g.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                      <span className="text-green-500">✅</span>
                      <span>{g.nama}</span>
                    </div>
                  ))}
              </div>
              <div className="bg-white rounded-2xl shadow p-6">
                <h3 className="font-semibold text-lg mb-4">
                  ❌ Guru Tidak Hadir ({guruBelumInput.length})
                </h3>
                {guruBelumInput.length === 0 && (
                  <p className="text-gray-400 text-sm">Semua guru sudah aktif!</p>
                )}
                {guruBelumInput.map(g => (
                  <div key={g.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                    <span className="text-red-500">❌</span>
                    <span>{g.nama}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Monitoring Harian */}
        {activeMenu === 'monitoring' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Monitoring Harian
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow p-6">
                <h3 className="font-semibold text-lg mb-4 text-green-700">
                  ✅ Sudah Setor ({santriSudahSetor.length})
                </h3>
                {santriList
                  .filter(s => santriSudahSetor.includes(s.id))
                  .map(s => (
                    <div key={s.id} className="py-2 border-b last:border-0">
                      <div className="font-medium">{s.nama}</div>
                      <div className="text-sm text-gray-500">
                        Guru: {s.guru?.nama || '-'}
                      </div>
                    </div>
                  ))}
                {santriSudahSetor.length === 0 && (
                  <p className="text-gray-400 text-sm">Belum ada santri yang setor</p>
                )}
              </div>
              <div className="bg-white rounded-2xl shadow p-6">
                <h3 className="font-semibold text-lg mb-4 text-red-600">
                  ❌ Belum Setor ({santriBelumSetor.length})
                </h3>
                {santriBelumSetor.map(s => (
                  <div key={s.id} className="py-2 border-b last:border-0">
                    <div className="font-medium">{s.nama}</div>
                    <div className="text-sm text-gray-500">
                      Guru: {s.guru?.nama || '-'}
                    </div>
                  </div>
                ))}
                {santriBelumSetor.length === 0 && (
                  <p className="text-gray-400 text-sm">Semua santri sudah setor! 🎉</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ranking */}
        {activeMenu === 'ranking' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              🏆 Ranking Santri
            </h2>
            <div className="grid grid-cols-2 gap-6">

              {/* Ranking Total Hafalan */}
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="bg-green-700 text-white px-6 py-4">
                  <h3 className="font-semibold text-lg">📖 Ranking Total Hafalan</h3>
                  <p className="text-green-200 text-sm">Berdasarkan jumlah juz</p>
                </div>
                <div className="p-4">
                  {rankingHafalan.map((santri, i) => (
                    <div key={santri.id} className="flex items-center gap-3 py-3 border-b last:border-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        i === 0 ? 'bg-yellow-400 text-white' :
                        i === 1 ? 'bg-gray-300 text-white' :
                        i === 2 ? 'bg-orange-400 text-white' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{santri.nama}</div>
                        <div className="text-sm text-gray-500">
                          {santri.total_hafalan_juz || 0} Juz
                        </div>
                      </div>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min(((santri.total_hafalan_juz || 0) / 30) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {rankingHafalan.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>
                  )}
                </div>
              </div>

              {/* Ranking Konsistensi */}
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="bg-blue-700 text-white px-6 py-4">
                  <h3 className="font-semibold text-lg">🔥 Ranking Konsistensi</h3>
                  <p className="text-blue-200 text-sm">Berdasarkan total setoran</p>
                </div>
                <div className="p-4">
                  {rankingKonsistensi.map((santri, i) => (
                    <div key={santri.id} className="flex items-center gap-3 py-3 border-b last:border-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        i === 0 ? 'bg-yellow-400 text-white' :
                        i === 1 ? 'bg-gray-300 text-white' :
                        i === 2 ? 'bg-orange-400 text-white' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{santri.nama}</div>
                        <div className="text-sm text-gray-500">
                          {santri.total} kali setoran
                        </div>
                      </div>
                    </div>
                  ))}
                  {rankingKonsistensi.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Laporan Setoran */}
        {activeMenu === 'laporan' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              📋 Laporan Setoran Hari Ini
            </h2>
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-green-700 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Santri</th>
                    <th className="px-4 py-3 text-left">Jenis</th>
                    <th className="px-4 py-3 text-left">Surah</th>
                    <th className="px-4 py-3 text-left">Ayat</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {setoranHariIni.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">
                        Belum ada setoran hari ini
                      </td>
                    </tr>
                  )}
                  {setoranHariIni.map((item, i) => (
                    <tr key={item.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3">{item.santri?.nama}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.jenis === 'baru'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {item.jenis === 'baru' ? '📖 Baru' : '🔄 Lama'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.surah}</td>
                      <td className="px-4 py-3">{item.ayat_mulai} - {item.ayat_selesai}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === 'lancar'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {item.status === 'lancar' ? '✅ Lancar' : '🔁 Rosib'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.catatan || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}