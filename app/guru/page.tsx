'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function GuruDashboard() {
  const [activeMenu, setActiveMenu] = useState('input')
  const [santriList, setSantriList] = useState<any[]>([])
  const [guruProfile, setGuruProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [riwayatList, setRiwayatList] = useState<any[]>([])

  const [selectedSantri, setSelectedSantri] = useState('')
  const [jenis, setJenis] = useState('baru')
  const [surah, setSurah] = useState('')
  const [ayatMulai, setAyatMulai] = useState('')
  const [ayatSelesai, setAyatSelesai] = useState('')
  const [status, setStatus] = useState('lancar')
  const [catatan, setCatatan] = useState('')
  const [totalHafalan, setTotalHafalan] = useState('')

  useEffect(() => { fetchGuruData() }, [])

  const fetchGuruData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profile?.role !== 'guru') { window.location.href = '/'; return }
    setGuruProfile(profile)
    const { data: santri } = await supabase.from('santri').select('*').eq('guru_id', user.id)
    setSantriList(santri || [])
  }

  const fetchRiwayat = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('setoran')
      .select('*, santri:santri_id(nama)')
      .eq('guru_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setRiwayatList(data || [])
  }

  const handleInputSetoran = async () => {
    if (!selectedSantri || !surah || !ayatMulai || !ayatSelesai) {
      setErrorMsg('Mohon lengkapi semua field!')
      return
    }
    setLoading(true)
    setErrorMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const isRosib = status === 'rosib'
    const { error } = await supabase.from('setoran').insert({
      santri_id: selectedSantri,
      guru_id: user.id,
      jenis, surah,
      ayat_mulai: parseInt(ayatMulai),
      ayat_selesai: parseInt(ayatSelesai),
      status, catatan,
      perlu_ulang: isRosib,
      tanggal: new Date().toISOString().split('T')[0]
    })
    if (error) { setErrorMsg('Gagal menyimpan: ' + error.message); setLoading(false); return }
    if (jenis === 'baru' && totalHafalan) {
      await supabase.from('santri').update({ total_hafalan_juz: parseFloat(totalHafalan) }).eq('id', selectedSantri)
    }
    setSuccessMsg('Setoran berhasil disimpan! ✅')
    resetForm()
    setLoading(false)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const resetForm = () => {
    setSelectedSantri(''); setJenis('baru'); setSurah('')
    setAyatMulai(''); setAyatSelesai(''); setStatus('lancar')
    setCatatan(''); setTotalHafalan('')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* HEADER HP */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-green-800 text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xl">🕌</span>
          <span className="font-bold">{guruProfile?.nama || 'Guru'}</span>
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
            <p className="text-green-300 text-sm">{guruProfile?.nama || 'Guru'}</p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {[
              { id: 'input', label: '📝 Input Setoran' },
              { id: 'riwayat', label: '📋 Riwayat Setoran' },
              { id: 'santri', label: '🧒 Santri Saya' },
            ].map(menu => (
              <button
                key={menu.id}
                onClick={() => {
                  setActiveMenu(menu.id)
                  setSuccessMsg('')
                  setSidebarOpen(false)
                  if (menu.id === 'riwayat') fetchRiwayat()
                }}
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

          {/* INPUT SETORAN */}
          {activeMenu === 'input' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Input Setoran Hafalan</h2>
              {successMsg && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {successMsg}
                </div>
              )}
              <div className="bg-white rounded-2xl shadow p-4 md:p-6">

                {/* Pilih Santri */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Santri</label>
                  <select value={selectedSantri} onChange={e => setSelectedSantri(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400">
                    <option value="">-- Pilih Santri --</option>
                    {santriList.map(s => <option key={s.id} value={s.id}>{s.nama} {s.kelas ? `(${s.kelas})` : ''}</option>)}
                  </select>
                </div>

                {/* Jenis Hafalan */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Hafalan</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border-2 ${jenis === 'baru' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      <input type="radio" value="baru" checked={jenis === 'baru'} onChange={() => setJenis('baru')} className="accent-green-600" />
                      <span className="text-sm font-medium">📖 Hafalan Baru</span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border-2 ${jenis === 'lama' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      <input type="radio" value="lama" checked={jenis === 'lama'} onChange={() => setJenis('lama')} className="accent-green-600" />
                      <span className="text-sm font-medium">🔄 Murojaah</span>
                    </label>
                  </div>
                </div>

                {/* Surah & Ayat */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Surah</label>
                  <input type="text" value={surah} onChange={e => setSurah(e.target.value)}
                    placeholder="Contoh: Al-Baqarah"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 mb-3" />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ayat Mulai</label>
                      <input type="number" value={ayatMulai} onChange={e => setAyatMulai(e.target.value)}
                        placeholder="1"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ayat Selesai</label>
                      <input type="number" value={ayatSelesai} onChange={e => setAyatSelesai(e.target.value)}
                        placeholder="5"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status Hafalan</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border-2 ${status === 'lancar' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      <input type="radio" value="lancar" checked={status === 'lancar'} onChange={() => setStatus('lancar')} className="accent-green-600" />
                      <span className="text-sm font-medium">✅ Lancar</span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border-2 ${status === 'rosib' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                      <input type="radio" value="rosib" checked={status === 'rosib'} onChange={() => setStatus('rosib')} className="accent-red-600" />
                      <span className="text-sm font-medium">🔁 Rosib</span>
                    </label>
                  </div>
                </div>

                {/* Total Hafalan */}
                {jenis === 'baru' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Update Total Hafalan (Juz)</label>
                    <input type="number" step="0.1" value={totalHafalan} onChange={e => setTotalHafalan(e.target.value)}
                      placeholder="Contoh: 3.5"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
                    <p className="text-xs text-gray-400 mt-1">Isi jika total hafalan santri bertambah hari ini</p>
                  </div>
                )}

                {/* Catatan */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
                  <textarea value={catatan} onChange={e => setCatatan(e.target.value)}
                    placeholder="Contoh: Tajwid perlu diperbaiki di ayat 3"
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>

                {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}

                <button onClick={handleInputSetoran} disabled={loading}
                  className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 transition disabled:opacity-50 text-base">
                  {loading ? 'Menyimpan...' : '💾 Simpan Setoran'}
                </button>
              </div>
            </div>
          )}

          {/* RIWAYAT SETORAN */}
          {activeMenu === 'riwayat' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Riwayat Setoran</h2>
              <div className="space-y-3">
                {riwayatList.length === 0 && <p className="text-center py-8 text-gray-400">Belum ada riwayat setoran</p>}
                {riwayatList.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl shadow p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-semibold">{item.santri?.nama}</span>
                        <span className="text-gray-400 text-xs ml-2">{item.tanggal}</span>
                      </div>
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
                    {item.catatan && <div className="text-xs text-blue-600 mt-1">💬 {item.catatan}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SANTRI SAYA */}
          {activeMenu === 'santri' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Daftar Santri Saya</h2>
              <div className="space-y-3">
                {santriList.length === 0 && <p className="text-gray-400">Belum ada santri di kelompok ini</p>}
                {santriList.map(santri => (
                  <div key={santri.id} className="bg-white rounded-xl shadow p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">🧒</div>
                      <div className="flex-1">
                        <div className="font-semibold">{santri.nama}</div>
                        <div className="text-sm text-gray-500">
                          {santri.kelas && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs mr-2">{santri.kelas}</span>}
                          Total: {santri.total_hafalan_juz || 0} Juz
                        </div>
                        <div className="text-sm text-green-700 font-medium mt-1">
                          Target Murojaah: {santri.total_hafalan_juz ? (santri.total_hafalan_juz / 20).toFixed(2) : 0} Juz/hari
                        </div>
                      </div>
                    </div>
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