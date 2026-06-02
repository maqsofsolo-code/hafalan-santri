'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Image from 'next/image'

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
      .from('setoran').select('*, santri:santri_id(nama)')
      .eq('guru_id', user.id)
      .order('created_at', { ascending: false }).limit(50)
    setRiwayatList(data || [])
  }

  const handleInputSetoran = async () => {
    if (!selectedSantri || !surah || !ayatMulai || !ayatSelesai) {
      setErrorMsg('Mohon lengkapi semua field!'); return
    }
    setLoading(true); setErrorMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('setoran').insert({
      santri_id: selectedSantri, guru_id: user.id,
      jenis, surah,
      ayat_mulai: parseInt(ayatMulai),
      ayat_selesai: parseInt(ayatSelesai),
      status, catatan,
      perlu_ulang: status === 'rosib',
      tanggal: new Date().toISOString().split('T')[0]
    })
    if (error) { setErrorMsg('Gagal menyimpan: ' + error.message); setLoading(false); return }
    if (jenis === 'baru' && totalHafalan) {
      await supabase.from('santri').update({ total_hafalan_juz: parseFloat(totalHafalan) }).eq('id', selectedSantri)
    }
    setSuccessMsg('Setoran berhasil disimpan!')
    resetForm(); setLoading(false)
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

  const today = new Date()
  const tanggal = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const menuItems = [
    { id: 'input', label: 'Input Setoran', icon: '✎' },
    { id: 'riwayat', label: 'Riwayat Setoran', icon: '◱' },
    { id: 'santri', label: 'Santri Saya', icon: '◎' },
  ]

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

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
              <div className="text-white font-semibold text-sm">{guruProfile?.nama || 'Guru'}</div>
              <div className="text-blue-300 text-xs">Guru Musami'</div>
            </div>
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
                <div className="relative z-10">
                  <h2 className="text-white font-bold text-xl">Input Setoran Hafalan</h2>
                  <p className="text-blue-200 text-sm mt-1">📅 {tanggal}</p>
                  <p className="text-blue-100 text-xs mt-1">{santriList.length} santri dalam kelompok Anda</p>
                </div>
              </div>

              {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                  <span className="text-green-500 text-lg">✓</span> {successMsg}
                </div>
              )}

              <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">

                {/* Pilih Santri */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Santri</label>
                  <select value={selectedSantri} onChange={e => setSelectedSantri(e.target.value)} className={inputClass}>
                    <option value="">-- Pilih Santri --</option>
                    {santriList.map(s => (
                      <option key={s.id} value={s.id}>{s.nama}{s.kelas ? ` (${s.kelas})` : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Jenis Hafalan */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Jenis Hafalan</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 transition ${jenis === 'baru' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" value="baru" checked={jenis === 'baru'} onChange={() => setJenis('baru')} className="accent-blue-600" />
                      <div>
                        <div className="text-sm font-semibold text-gray-800">Hafalan Baru</div>
                        <div className="text-xs text-gray-400">Tambah hafalan baru</div>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 transition ${jenis === 'lama' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" value="lama" checked={jenis === 'lama'} onChange={() => setJenis('lama')} className="accent-purple-600" />
                      <div>
                        <div className="text-sm font-semibold text-gray-800">Murojaah</div>
                        <div className="text-xs text-gray-400">Mengulang hafalan lama</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Surah & Ayat */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Surah & Ayat</label>
                  <input type="text" value={surah} onChange={e => setSurah(e.target.value)}
                    placeholder="Nama Surah (contoh: Al-Baqarah)"
                    className={inputClass + ' mb-3'} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ayat Mulai</label>
                      <input type="number" value={ayatMulai} onChange={e => setAyatMulai(e.target.value)}
                        placeholder="1" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ayat Selesai</label>
                      <input type="number" value={ayatSelesai} onChange={e => setAyatSelesai(e.target.value)}
                        placeholder="10" className={inputClass} />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status Hafalan</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 transition ${status === 'lancar' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" value="lancar" checked={status === 'lancar'} onChange={() => setStatus('lancar')} className="accent-green-600" />
                      <div>
                        <div className="text-sm font-semibold text-gray-800">Lancar</div>
                        <div className="text-xs text-gray-400">Hafalan baik</div>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 transition ${status === 'rosib' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" value="rosib" checked={status === 'rosib'} onChange={() => setStatus('rosib')} className="accent-red-600" />
                      <div>
                        <div className="text-sm font-semibold text-gray-800">Rosib</div>
                        <div className="text-xs text-gray-400">Perlu diulang</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Total Hafalan */}
                {jenis === 'baru' && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Update Total Hafalan (Juz)</label>
                    <input type="number" step="0.1" value={totalHafalan} onChange={e => setTotalHafalan(e.target.value)}
                      placeholder="Contoh: 3.5" className={inputClass} />
                    <p className="text-xs text-blue-500 mt-1">Isi jika total hafalan santri bertambah hari ini</p>
                  </div>
                )}

                {/* Catatan */}
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan Guru (Opsional)</label>
                  <textarea value={catatan} onChange={e => setCatatan(e.target.value)}
                    placeholder="Contoh: Tajwid perlu diperbaiki di ayat 3, bacaan sudah cukup baik..."
                    rows={3} className={inputClass} />
                </div>

                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">
                    {errorMsg}
                  </div>
                )}

                <button onClick={handleInputSetoran} disabled={loading}
                  className="w-full text-white py-4 rounded-xl font-bold transition disabled:opacity-50 text-base shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                  {loading ? 'Menyimpan...' : 'Simpan Setoran'}
                </button>
              </div>
            </div>
          )}

          {/* RIWAYAT SETORAN */}
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
                    <div className="text-5xl mb-3">◌</div>
                    <p className="text-gray-400">Belum ada riwayat setoran</p>
                  </div>
                )}
                {riwayatList.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition">
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
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.status === 'lancar' ? 'Lancar' : 'Rosib'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {item.jenis === 'baru' ? 'Hafalan Baru' : 'Murojaah'}
                      </span>
                      <span className="text-sm text-gray-600">{item.surah} ayat {item.ayat_mulai}–{item.ayat_selesai}</span>
                    </div>
                    {item.catatan && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-600">
                        Catatan: {item.catatan}
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
                    <div className="text-5xl mb-3">◌</div>
                    <p className="text-gray-400">Belum ada santri di kelompok ini</p>
                  </div>
                )}
                {santriList.map(santri => (
                  <div key={santri.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                        {santri.nama?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{santri.nama}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {santri.kelas && (
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                              Kelas {santri.kelas}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {santri.total_hafalan_juz || 0} Juz
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress Hafalan</span>
                            <span>{Math.round(((santri.total_hafalan_juz || 0) / 30) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.min(((santri.total_hafalan_juz || 0) / 30) * 100, 100)}%`,
                                background: 'linear-gradient(135deg, #166534, #16a34a)'
                              }} />
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Target Murojaah: <span className="font-semibold text-green-700">
                            {santri.total_hafalan_juz ? (santri.total_hafalan_juz / 20).toFixed(2) : 0} Juz/hari
                          </span>
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