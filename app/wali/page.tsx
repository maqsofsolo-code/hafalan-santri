'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function WaliDashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [waliProfile, setWaliProfile] = useState<any>(null)
  const [santriList, setSantriList] = useState<any[]>([])
  const [selectedSantri, setSelectedSantri] = useState<any>(null)
  const [riwayatSetoran, setRiwayatSetoran] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { fetchWaliData() }, [])

  const fetchWaliData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profile?.role !== 'wali') { window.location.href = '/'; return }
    setWaliProfile(profile)
    const { data: santri } = await supabase.from('santri').select('*, guru:guru_id(nama)').eq('wali_id', user.id)
    setSantriList(santri || [])
    if (santri && santri.length > 0) {
      setSelectedSantri(santri[0])
      fetchRiwayat(santri[0].id)
    }
    setLoading(false)
  }

  const fetchRiwayat = async (santriId: any) => {
    const { data } = await supabase
      .from('setoran').select('*').eq('santri_id', santriId)
      .order('tanggal', { ascending: false }).limit(30)
    setRiwayatSetoran(data || [])
  }

  const handlePilihSantri = (santri: any) => {
    setSelectedSantri(santri)
    fetchRiwayat(santri.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

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
    <div className="min-h-screen bg-gray-100">

      {/* HEADER HP */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-green-800 text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xl">🕌</span>
          <span className="font-bold">{waliProfile?.nama || 'Wali Santri'}</span>
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
            <p className="text-green-300 text-sm">{waliProfile?.nama || 'Wali Santri'}</p>
          </div>

          {/* Pilih Santri jika lebih dari 1 */}
          {santriList.length > 1 && (
            <div className="p-4 border-b border-green-700">
              <p className="text-green-300 text-xs mb-2">Pilih Santri:</p>
              {santriList.map(s => (
                <button key={s.id} onClick={() => { handlePilihSantri(s); setSidebarOpen(false) }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition ${selectedSantri?.id === s.id ? 'bg-green-600 font-semibold' : 'hover:bg-green-700'}`}>
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
              <button key={menu.id}
                onClick={() => { setActiveMenu(menu.id); setSidebarOpen(false) }}
                className={`w-full text-left px-4 py-3 rounded-lg transition text-base ${activeMenu === menu.id ? 'bg-green-600 font-semibold' : 'hover:bg-green-700'}`}>
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

          {/* Tidak ada santri */}
          {santriList.length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🧒</div>
              <h2 className="text-xl font-semibold text-gray-600">Belum ada data santri</h2>
              <p className="text-gray-400 mt-2">Hubungi admin untuk menghubungkan akun dengan data santri</p>
            </div>
          )}

          {selectedSantri && (
            <>
              {/* Header Santri */}
              <div className="bg-white rounded-2xl shadow p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">🧒</div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">{selectedSantri.nama}</h2>
                    <p className="text-gray-500 text-sm">Guru: {selectedSantri.guru?.nama || '-'}</p>
                    <p className="text-green-700 font-semibold text-sm">
                      Total Hafalan: {selectedSantri.total_hafalan_juz || 0} Juz
                    </p>
                  </div>
                </div>
              </div>

              {/* RINGKASAN */}
              {activeMenu === 'dashboard' && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Ringkasan 30 Setoran Terakhir</h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { icon: '📝', count: totalSetoran, label: 'Total Setoran', color: 'text-green-700' },
                      { icon: '✅', count: totalLancar, label: 'Lancar', color: 'text-green-700' },
                      { icon: '🔁', count: totalRosib, label: 'Rosib', color: 'text-red-500' },
                      { icon: '📖', count: setoranBaru, label: 'Hafalan Baru', color: 'text-blue-600' },
                    ].map((item, i) => (
                      <div key={i} className="bg-white rounded-2xl p-4 shadow text-center">
                        <div className="text-2xl mb-1">{item.icon}</div>
                        <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
                        <div className="text-gray-500 text-xs">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mb-3">Setoran Terbaru</h3>
                  <div className="space-y-2">
                    {riwayatSetoran.slice(0, 5).map((item) => (
                      <div key={item.id} className="bg-white rounded-xl shadow p-4">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-medium text-sm">{item.surah} ayat {item.ayat_mulai}-{item.ayat_selesai}</div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.status === 'lancar' ? '✅ Lancar' : '🔁 Rosib'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.tanggal} • {item.jenis === 'baru' ? '📖 Hafalan Baru' : '🔄 Murojaah'}
                        </div>
                        {item.catatan && <div className="text-xs text-blue-600 mt-1">💬 {item.catatan}</div>}
                      </div>
                    ))}
                    {riwayatSetoran.length === 0 && (
                      <div className="text-center py-8 text-gray-400">Belum ada riwayat setoran</div>
                    )}
                  </div>
                </div>
              )}

              {/* RIWAYAT LENGKAP */}
              {activeMenu === 'riwayat' && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Riwayat Setoran Lengkap</h3>
                  <div className="space-y-2">
                    {riwayatSetoran.length === 0 && <p className="text-center py-8 text-gray-400">Belum ada riwayat setoran</p>}
                    {riwayatSetoran.map((item) => (
                      <div key={item.id} className="bg-white rounded-xl shadow p-4">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <span className={`px-2 py-0.5 rounded-full text-xs mr-2 ${item.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                              {item.jenis === 'baru' ? '📖 Baru' : '🔄 Lama'}
                            </span>
                            <span className="text-xs text-gray-400">{item.tanggal}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.status === 'lancar' ? '✅ Lancar' : '🔁 Rosib'}
                          </span>
                        </div>
                        <div className="font-medium text-sm">{item.surah} ayat {item.ayat_mulai}-{item.ayat_selesai}</div>
                        {item.catatan && <div className="text-xs text-gray-400 mt-1">💬 {item.catatan}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GRAFIK PERKEMBANGAN */}
              {activeMenu === 'grafik' && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Perkembangan Hafalan</h3>

                  {/* Progress Bar */}
                  <div className="bg-white rounded-2xl shadow p-4 mb-4">
                    <h4 className="font-semibold text-gray-700 mb-3">Progress Menuju 30 Juz</h4>
                    <div className="mb-2 flex justify-between text-sm text-gray-600">
                      <span>{selectedSantri.total_hafalan_juz || 0} Juz</span>
                      <span>30 Juz</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div
                        className="bg-green-500 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{
                          width: `${Math.min(((selectedSantri.total_hafalan_juz || 0) / 30) * 100, 100)}%`,
                          minWidth: '2rem'
                        }}
                      >
                        {Math.round(((selectedSantri.total_hafalan_juz || 0) / 30) * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* Statistik */}
                  <div className="bg-white rounded-2xl shadow p-4">
                    <h4 className="font-semibold text-gray-700 mb-4">Statistik Setoran</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Tingkat Kelancaran</span>
                          <span className="font-semibold text-green-700">
                            {totalSetoran > 0 ? Math.round((totalLancar / totalSetoran) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div className="bg-green-500 h-3 rounded-full"
                            style={{ width: `${totalSetoran > 0 ? Math.round((totalLancar / totalSetoran) * 100) : 0}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Hafalan Baru vs Murojaah</span>
                          <span className="font-semibold text-blue-700">{setoranBaru} Baru / {setoranLama} Murojaah</span>
                        </div>
                        <div className="w-full bg-purple-200 rounded-full h-3">
                          <div className="bg-blue-500 h-3 rounded-full"
                            style={{ width: `${totalSetoran > 0 ? Math.round((setoranBaru / totalSetoran) * 100) : 0}%` }} />
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
    </div>
  )
}