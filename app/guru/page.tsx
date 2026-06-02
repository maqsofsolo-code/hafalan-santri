'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function GuruDashboard() {
  const [activeMenu, setActiveMenu] = useState('input')
  const [santriList, setSantriList] = useState<any[]>([])
  const [guruProfile, setGuruProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [riwayatList, setRiwayatList] = useState<any[]>([])

  // Form states
  const [selectedSantri, setSelectedSantri] = useState('')
  const [jenis, setJenis] = useState('baru')
  const [surah, setSurah] = useState('')
  const [ayatMulai, setAyatMulai] = useState('')
  const [ayatSelesai, setAyatSelesai] = useState('')
  const [status, setStatus] = useState('lancar')
  const [catatan, setCatatan] = useState('')
  const [totalHafalan, setTotalHafalan] = useState('')

  useEffect(() => {
    fetchGuruData()
  }, [])

  const fetchGuruData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'guru') { window.location.href = '/'; return }
    setGuruProfile(profile)

    const { data: santri } = await supabase
      .from('santri')
      .select('*')
      .eq('guru_id', user.id)

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
      jenis,
      surah,
      ayat_mulai: parseInt(ayatMulai),
      ayat_selesai: parseInt(ayatSelesai),
      status,
      catatan,
      perlu_ulang: isRosib,
      tanggal: new Date().toISOString().split('T')[0]
    })

    if (error) {
      setErrorMsg('Gagal menyimpan: ' + error.message)
      setLoading(false)
      return
    }

    // Update total hafalan jika hafalan baru
    if (jenis === 'baru' && totalHafalan) {
      await supabase
        .from('santri')
        .update({ total_hafalan_juz: parseFloat(totalHafalan) })
        .eq('id', selectedSantri)
    }

    setSuccessMsg('Setoran berhasil disimpan! ✅')
    resetForm()
    setLoading(false)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const resetForm = () => {
    setSelectedSantri('')
    setJenis('baru')
    setSurah('')
    setAyatMulai('')
    setAyatSelesai('')
    setStatus('lancar')
    setCatatan('')
    setTotalHafalan('')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const getSantriPerluUlang = () => {
    return santriList.filter(s => s.perlu_ulang)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* Sidebar */}
      <div className="w-64 bg-green-800 text-white flex flex-col">
        <div className="p-6 border-b border-green-700">
          <div className="text-2xl mb-1">🕌</div>
          <h1 className="font-bold text-lg">Hafalan Santri</h1>
          <p className="text-green-300 text-sm">
            {guruProfile?.nama || 'Guru'}
          </p>
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
                if (menu.id === 'riwayat') fetchRiwayat()
              }}
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
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">

        {/* Input Setoran */}
        {activeMenu === 'input' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Input Setoran Hafalan
            </h2>

            {successMsg && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
                {successMsg}
              </div>
            )}

            <div className="bg-white rounded-2xl shadow p-6">

              {/* Pilih Santri */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pilih Santri
                </label>
                <select
                  value={selectedSantri}
                  onChange={e => setSelectedSantri(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="">-- Pilih Santri --</option>
                  {santriList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jenis Hafalan */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jenis Hafalan
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="baru"
                      checked={jenis === 'baru'}
                      onChange={() => setJenis('baru')}
                      className="accent-green-600"
                    />
                    <span>📖 Hafalan Baru</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="lama"
                      checked={jenis === 'lama'}
                      onChange={() => setJenis('lama')}
                      className="accent-green-600"
                    />
                    <span>🔄 Hafalan Lama (Murojaah)</span>
                  </label>
                </div>
              </div>

              {/* Surah & Ayat */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Surah
                  </label>
                  <input
                    type="text"
                    value={surah}
                    onChange={e => setSurah(e.target.value)}
                    placeholder="Contoh: Al-Baqarah"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ayat Mulai
                  </label>
                  <input
                    type="number"
                    value={ayatMulai}
                    onChange={e => setAyatMulai(e.target.value)}
                    placeholder="1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ayat Selesai
                  </label>
                  <input
                    type="number"
                    value={ayatSelesai}
                    onChange={e => setAyatSelesai(e.target.value)}
                    placeholder="5"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status Hafalan
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="lancar"
                      checked={status === 'lancar'}
                      onChange={() => setStatus('lancar')}
                      className="accent-green-600"
                    />
                    <span>✅ Lancar</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="rosib"
                      checked={status === 'rosib'}
                      onChange={() => setStatus('rosib')}
                      className="accent-green-600"
                    />
                    <span>🔁 Rosib (Perlu Diulang)</span>
                  </label>
                </div>
              </div>

              {/* Total Hafalan (muncul jika hafalan baru) */}
              {jenis === 'baru' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Update Total Hafalan Santri (Juz)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={totalHafalan}
                    onChange={e => setTotalHafalan(e.target.value)}
                    placeholder="Contoh: 3.5"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Isi jika total hafalan santri bertambah hari ini
                  </p>
                </div>
              )}

              {/* Catatan */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan (Opsional)
                </label>
                <textarea
                  value={catatan}
                  onChange={e => setCatatan(e.target.value)}
                  placeholder="Contoh: Tajwid perlu diperbaiki di ayat 3"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {errorMsg && (
                <p className="text-red-500 text-sm mb-4">{errorMsg}</p>
              )}

              <button
                onClick={handleInputSetoran}
                disabled={loading}
                className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 transition disabled:opacity-50 text-lg"
              >
                {loading ? 'Menyimpan...' : '💾 Simpan Setoran'}
              </button>
            </div>
          </div>
        )}

        {/* Riwayat Setoran */}
        {activeMenu === 'riwayat' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Riwayat Setoran
            </h2>
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-green-700 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    <th className="px-4 py-3 text-left">Santri</th>
                    <th className="px-4 py-3 text-left">Jenis</th>
                    <th className="px-4 py-3 text-left">Surah</th>
                    <th className="px-4 py-3 text-left">Ayat</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayatList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">
                        Belum ada riwayat setoran
                      </td>
                    </tr>
                  )}
                  {riwayatList.map((item, i) => (
                    <tr key={item.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3 text-sm">{item.tanggal}</td>
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

        {/* Santri Saya */}
        {activeMenu === 'santri' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Daftar Santri Saya
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {santriList.length === 0 && (
                <p className="text-gray-400">Belum ada santri di kelompok ini</p>
              )}
              {santriList.map(santri => (
                <div key={santri.id} className="bg-white rounded-2xl shadow p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">🧒</div>
                    <div>
                      <h3 className="font-semibold text-lg">{santri.nama}</h3>
                      <p className="text-gray-500 text-sm">
                        Total Hafalan: {santri.total_hafalan_juz || 0} Juz
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Target Murojaah harian:{' '}
                    <span className="font-semibold text-green-700">
                      {santri.total_hafalan_juz
                        ? (santri.total_hafalan_juz / 20).toFixed(2)
                        : 0}{' '}
                      Juz
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}