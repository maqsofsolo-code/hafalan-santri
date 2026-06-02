'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Image from 'next/image'

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

  const menuItems = [
    { id: 'dashboard', label: 'Ringkasan', icon: '◈' },
    { id: 'riwayat', label: 'Riwayat Setoran', icon: '◱' },
    { id: 'grafik', label: 'Perkembangan', icon: '◆' },
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
            <div className="text-blue-200 text-xs">{waliProfile?.nama || 'Wali Santri'}</div>
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
              <div className="text-white font-semibold text-sm">{waliProfile?.nama || 'Wali Santri'}</div>
              <div className="text-blue-300 text-xs">Wali Santri</div>
            </div>
          </div>

          {/* Pilih Santri jika lebih dari 1 */}
          {santriList.length > 1 && (
            <div className="px-4 py-3 border-b border-blue-700">
              <p className="text-blue-300 text-xs mb-2 font-medium">Pilih Santri:</p>
              {santriList.map(s => (
                <button key={s.id}
                  onClick={() => { handlePilihSantri(s); setSidebarOpen(false) }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm mb-1 transition flex items-center gap-2 ${
                    selectedSantri?.id === s.id
                      ? 'bg-white text-blue-900 font-bold shadow'
                      : 'text-blue-100 hover:bg-white hover:bg-opacity-10'
                  }`}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                    {s.nama?.charAt(0).toUpperCase()}
                  </div>
                  {s.nama}
                </button>
              ))}
            </div>
          )}

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

          {/* Tidak ada santri */}
          {santriList.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl text-gray-400">◌</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-600">Belum ada data santri</h2>
              <p className="text-gray-400 mt-2 text-sm">Hubungi admin untuk menghubungkan akun dengan data santri</p>
            </div>
          )}

          {selectedSantri && (
            <>
              {/* Header Santri */}
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 bg-white" />
                <div className="absolute -bottom-10 -right-4 w-40 h-40 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                      {selectedSantri.nama?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-white font-bold text-xl">{selectedSantri.nama}</h2>
                      <p className="text-blue-200 text-sm">Guru: {selectedSantri.guru?.nama || '-'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedSantri.kelas && (
                          <span className="bg-white bg-opacity-20 text-white text-xs px-2 py-0.5 rounded-full">
                            Kelas {selectedSantri.kelas}
                          </span>
                        )}
                        <span className="bg-white bg-opacity-20 text-white text-xs px-2 py-0.5 rounded-full">
                          {selectedSantri.total_hafalan_juz || 0} Juz
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Mini Progress */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-blue-200 mb-1">
                      <span>Progress menuju 30 Juz</span>
                      <span>{Math.round(((selectedSantri.total_hafalan_juz || 0) / 30) * 100)}%</span>
                    </div>
                    <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                      <div className="h-2 rounded-full bg-white transition-all"
                        style={{ width: `${Math.min(((selectedSantri.total_hafalan_juz || 0) / 30) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* RINGKASAN */}
              {activeMenu === 'dashboard' && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Ringkasan 30 Setoran Terakhir</h3>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { count: totalSetoran, label: 'Total Setoran', color: 'from-blue-500 to-blue-700' },
                      { count: totalLancar, label: 'Lancar', color: 'from-green-500 to-green-700' },
                      { count: totalRosib, label: 'Rosib', color: 'from-red-500 to-red-700' },
                      { count: setoranBaru, label: 'Hafalan Baru', color: 'from-purple-500 to-purple-700' },
                    ].map((item, i) => (
                      <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow-lg text-white relative overflow-hidden`}>
                        <div className="absolute -bottom-2 -right-2 text-4xl opacity-10 font-bold">◆</div>
                        <div className="text-3xl font-bold">{item.count}</div>
                        <div className="text-white text-opacity-80 text-xs mt-1">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mb-3">Setoran Terbaru</h3>
                  <div className="space-y-3">
                    {riwayatSetoran.slice(0, 5).map((item) => (
                      <div key={item.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-semibold text-sm text-gray-800">
                            {item.surah} ayat {item.ayat_mulai}–{item.ayat_selesai}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.status === 'lancar' ? 'Lancar' : 'Rosib'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${item.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {item.jenis === 'baru' ? 'Hafalan Baru' : 'Murojaah'}
                          </span>
                          <span className="text-xs text-gray-400">{item.tanggal}</span>
                        </div>
                        {item.catatan && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-600">
                            Catatan guru: {item.catatan}
                          </div>
                        )}
                      </div>
                    ))}
                    {riwayatSetoran.length === 0 && (
                      <div className="bg-white rounded-2xl p-10 text-center shadow border border-gray-100">
                        <div className="text-4xl mb-2 text-gray-300">◌</div>
                        <p className="text-gray-400 text-sm">Belum ada riwayat setoran</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* RIWAYAT LENGKAP */}
              {activeMenu === 'riwayat' && (
                <div>
                  <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                    <div className="relative z-10">
                      <h2 className="text-white font-bold text-xl">Riwayat Setoran</h2>
                      <p className="text-blue-200 text-sm mt-1">{riwayatSetoran.length} setoran tercatat</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {riwayatSetoran.length === 0 && (
                      <div className="bg-white rounded-2xl p-10 text-center shadow border border-gray-100">
                        <div className="text-4xl mb-2 text-gray-300">◌</div>
                        <p className="text-gray-400 text-sm">Belum ada riwayat setoran</p>
                      </div>
                    )}
                    {riwayatSetoran.map((item) => (
                      <div key={item.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                              {item.jenis === 'baru' ? 'Hafalan Baru' : 'Murojaah'}
                            </span>
                            <span className="text-xs text-gray-400">{item.tanggal}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.status === 'lancar' ? 'Lancar' : 'Rosib'}
                          </span>
                        </div>
                        <div className="font-semibold text-sm text-gray-800">
                          {item.surah} ayat {item.ayat_mulai}–{item.ayat_selesai}
                        </div>
                        {item.catatan && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-600">
                            Catatan guru: {item.catatan}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PERKEMBANGAN */}
              {activeMenu === 'grafik' && (
                <div>
                  <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #166534 0%, #16a34a 100%)' }}>
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                    <div className="relative z-10">
                      <h2 className="text-white font-bold text-xl">Perkembangan Hafalan</h2>
                      <p className="text-green-200 text-sm mt-1">{selectedSantri.nama}</p>
                    </div>
                  </div>

                  {/* Progress 30 Juz */}
                  <div className="bg-white rounded-2xl shadow p-5 mb-4 border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-4">Progress Menuju 30 Juz</h4>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Hafalan saat ini</span>
                      <span className="font-bold text-green-700">{selectedSantri.total_hafalan_juz || 0} / 30 Juz</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6 mb-2">
                      <div className="h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all"
                        style={{
                          width: `${Math.min(((selectedSantri.total_hafalan_juz || 0) / 30) * 100, 100)}%`,
                          background: 'linear-gradient(135deg, #166534, #16a34a)',
                          minWidth: (selectedSantri.total_hafalan_juz || 0) > 0 ? '3rem' : '0'
                        }}>
                        {Math.round(((selectedSantri.total_hafalan_juz || 0) / 30) * 100)}%
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      Sisa {(30 - (selectedSantri.total_hafalan_juz || 0)).toFixed(1)} Juz lagi untuk khatam 30 Juz
                    </p>
                  </div>

                  {/* Statistik Setoran */}
                  <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-4">Statistik Setoran</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Tingkat Kelancaran</span>
                          <span className="font-bold text-green-700">
                            {totalSetoran > 0 ? Math.round((totalLancar / totalSetoran) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div className="h-3 rounded-full transition-all"
                            style={{
                              width: `${totalSetoran > 0 ? Math.round((totalLancar / totalSetoran) * 100) : 0}%`,
                              background: 'linear-gradient(135deg, #166534, #16a34a)'
                            }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{totalLancar} lancar dari {totalSetoran} setoran</p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Hafalan Baru</span>
                          <span className="font-bold text-blue-700">
                            {totalSetoran > 0 ? Math.round((setoranBaru / totalSetoran) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div className="h-3 rounded-full transition-all"
                            style={{
                              width: `${totalSetoran > 0 ? Math.round((setoranBaru / totalSetoran) * 100) : 0}%`,
                              background: 'linear-gradient(135deg, #1a3a5c, #2563a8)'
                            }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{setoranBaru} hafalan baru, {setoranLama} murojaah</p>
                      </div>
                    </div>

                    {/* Ringkasan Angka */}
                    <div className="grid grid-cols-3 gap-3 mt-5">
                      {[
                        { count: totalSetoran, label: 'Total Setoran', color: 'text-blue-700' },
                        { count: totalLancar, label: 'Lancar', color: 'text-green-700' },
                        { count: totalRosib, label: 'Rosib', color: 'text-red-600' },
                      ].map((item, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                          <div className={`text-xl font-bold ${item.color}`}>{item.count}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
                        </div>
                      ))}
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