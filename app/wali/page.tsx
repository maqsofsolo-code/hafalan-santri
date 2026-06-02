'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function WaliDashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [waliProfile, setWaliProfile] = useState(null)
  const [santriList, setSantriList] = useState<any[]>([])
  const [selectedSantri, setSelectedSantri] = useState(null)
  const [riwayatSetoran, setRiwayatSetoran] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWaliData()
  }, [])

  const fetchWaliData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'wali') { window.location.href = '/'; return }
    setWaliProfile(profile)

    const { data: santri } = await supabase
      .from('santri')
      .select('*, guru:guru_id(nama)')
      .eq('wali_id', user.id)

    setSantriList(santri || [])

    if (santri && santri.length > 0) {
      setSelectedSantri(santri[0])
      fetchRiwayat(santri[0].id)
    }

    setLoading(false)
  }

  const fetchRiwayat = async (santriId) => {
    const { data } = await supabase
      .from('setoran')
      .select('*')
      .eq('santri_id', santriId)
      .order('tanggal', { ascending: false })
      .limit(30)
    setRiwayatSetoran(data || [])
  }

  const handlePilihSantri = (santri) => {
    setSelectedSantri(santri)
    fetchRiwayat(santri.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // Hitung statistik
  const totalSetoran = riwayatSetoran.length
  const totalLancar = riwayatSetoran.filter(s => s.status === 'lancar').length
  const totalRosib = riwayatSetoran.filter(s => s.status === 'rosib').length
  const setoranBaru = riwayatSetoran.filter(s => s.jenis === 'baru').length
  const setoranLama = riwayatSetoran.filter(s => s.jenis === 'lama').length

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
          <p className="text-green-300 text-sm">
            {waliProfile?.nama || 'Wali Santri'}
          </p>
        </div>

        {/* Pilih Santri jika lebih dari 1 */}
        {santriList.length > 1 && (
          <div className="p-4 border-b border-green-700">
            <p className="text-green-300 text-xs mb-2">Pilih Santri:</p>
            {santriList.map(s => (
              <button
                key={s.id}
                onClick={() => handlePilihSantri(s)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition ${
                  selectedSantri?.id === s.id
                    ? 'bg-green-600 font-semibold'
                    : 'hover:bg-green-700'
                }`}
              >
                🧒 {s.nama}
              </button>
            ))}
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', label: '📊 Ringkasan' },
            { id: 'riwayat', label: '📋 Riwayat Setoran' },
            { id: 'grafik', label: '📈 Perkembangan' },
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
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 w-full">

        {/* Tidak ada santri */}
        {santriList.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🧒</div>
            <h2 className="text-xl font-semibold text-gray-600">
              Belum ada data santri
            </h2>
            <p className="text-gray-400 mt-2">
              Hubungi admin untuk menghubungkan akun dengan data santri
            </p>
          </div>
        )}

        {selectedSantri && (
          <>
            {/* Header Santri */}
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl">🧒</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedSantri.nama}
                  </h2>
                  <p className="text-gray-500">
                    Guru: {selectedSantri.guru?.nama || '-'}
                  </p>
                  <p className="text-green-700 font-semibold">
                    Total Hafalan: {selectedSantri.total_hafalan_juz || 0} Juz
                  </p>
                </div>
              </div>
            </div>

            {/* Dashboard/Ringkasan */}
            {activeMenu === 'dashboard' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Ringkasan 30 Setoran Terakhir
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white rounded-2xl p-5 shadow text-center">
                    <div className="text-3xl mb-1">📝</div>
                    <div className="text-3xl font-bold text-green-700">{totalSetoran}</div>
                    <div className="text-gray-500 text-sm">Total Setoran</div>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow text-center">
                    <div className="text-3xl mb-1">✅</div>
                    <div className="text-3xl font-bold text-green-700">{totalLancar}</div>
                    <div className="text-gray-500 text-sm">Lancar</div>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow text-center">
                    <div className="text-3xl mb-1">🔁</div>
                    <div className="text-3xl font-bold text-red-500">{totalRosib}</div>
                    <div className="text-gray-500 text-sm">Rosib</div>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow text-center">
                    <div className="text-3xl mb-1">📖</div>
                    <div className="text-3xl font-bold text-blue-600">{setoranBaru}</div>
                    <div className="text-gray-500 text-sm">Hafalan Baru</div>
                  </div>
                </div>

                {/* Setoran Terakhir */}
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Setoran Terbaru
                </h3>
                <div className="bg-white rounded-2xl shadow overflow-hidden">
                  {riwayatSetoran.slice(0, 5).map((item, i) => (
                    <div key={item.id} className={`px-6 py-4 border-b last:border-0 ${
                      i % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {item.surah} ayat {item.ayat_mulai}-{item.ayat_selesai}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {item.tanggal} •{' '}
                            {item.jenis === 'baru' ? '📖 Hafalan Baru' : '🔄 Murojaah'}
                          </div>
                          {item.catatan && (
                            <div className="text-sm text-blue-600 mt-1">
                              💬 {item.catatan}
                            </div>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.status === 'lancar'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {item.status === 'lancar' ? '✅ Lancar' : '🔁 Rosib'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {riwayatSetoran.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      Belum ada riwayat setoran
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Riwayat Lengkap */}
            {activeMenu === 'riwayat' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Riwayat Setoran Lengkap
                </h3>
                <div className="bg-white rounded-2xl shadow overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-green-700 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left">Tanggal</th>
                        <th className="px-4 py-3 text-left">Jenis</th>
                        <th className="px-4 py-3 text-left">Surah & Ayat</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Catatan Guru</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riwayatSetoran.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-gray-400">
                            Belum ada riwayat setoran
                          </td>
                        </tr>
                      )}
                      {riwayatSetoran.map((item, i) => (
                        <tr key={item.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="px-4 py-3 text-sm">{item.tanggal}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.jenis === 'baru'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {item.jenis === 'baru' ? '📖 Baru' : '🔄 Lama'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {item.surah} {item.ayat_mulai}-{item.ayat_selesai}
                          </td>
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

            {/* Grafik Perkembangan */}
            {activeMenu === 'grafik' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  📈 Perkembangan Hafalan
                </h3>

                {/* Progress Bar Hafalan */}
                <div className="bg-white rounded-2xl shadow p-6 mb-6">
                  <h4 className="font-semibold text-gray-700 mb-4">
                    Progress Menuju 30 Juz
                  </h4>
                  <div className="mb-2 flex justify-between text-sm text-gray-600">
                    <span>{selectedSantri.total_hafalan_juz || 0} Juz</span>
                    <span>30 Juz</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className="bg-green-500 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all"
                      style={{
                        width: `${Math.min(
                          ((selectedSantri.total_hafalan_juz || 0) / 30) * 100, 100
                        )}%`,
                        minWidth: '2rem'
                      }}
                    >
                      {Math.round(((selectedSantri.total_hafalan_juz || 0) / 30) * 100)}%
                    </div>
                  </div>
                </div>

                {/* Statistik Mingguan */}
                <div className="bg-white rounded-2xl shadow p-6">
                  <h4 className="font-semibold text-gray-700 mb-4">
                    Statistik Setoran
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Tingkat Kelancaran</span>
                        <span className="font-semibold text-green-700">
                          {totalSetoran > 0
                            ? Math.round((totalLancar / totalSetoran) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-green-500 h-3 rounded-full"
                          style={{
                            width: `${totalSetoran > 0
                              ? Math.round((totalLancar / totalSetoran) * 100)
                              : 0}%`
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Hafalan Baru vs Murojaah</span>
                        <span className="font-semibold text-blue-700">
                          {setoranBaru} Baru / {setoranLama} Murojaah
                        </span>
                      </div>
                      <div className="w-full bg-purple-200 rounded-full h-3">
                        <div
                          className="bg-blue-500 h-3 rounded-full"
                          style={{
                            width: `${totalSetoran > 0
                              ? Math.round((setoranBaru / totalSetoran) * 100)
                              : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}