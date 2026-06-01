'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [guruList, setGuruList] = useState([])
  const [santriList, setSantriList] = useState([])
  const [waliList, setWaliList] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('')
  const [editSantriId, setEditSantriId] = useState(null)

  const [formNama, setFormNama] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formNoWa, setFormNoWa] = useState('')
  const [formGuruId, setFormGuruId] = useState('')
  const [formWaliId, setFormWaliId] = useState('')
const [formKelas, setFormKelas] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: guru } = await supabase.from('profiles').select('*').eq('role', 'guru')
    const { data: santri } = await supabase.from('santri').select('*, guru:guru_id(nama), wali:wali_id(nama)')
    const { data: wali } = await supabase.from('profiles').select('*').eq('role', 'wali')
    setGuruList(guru || [])
    setSantriList(santri || [])
    setWaliList(wali || [])
  }

  const handleTambahGuru = async () => {
    setLoading(true); setErrorMsg('')
    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formEmail, password: formPassword, nama: formNama, role: 'guru', no_wa: formNoWa })
    })
    const result = await res.json()
    if (result.error) { setErrorMsg(result.error); setLoading(false); return }
    setSuccessMsg('Guru berhasil ditambahkan!')
    setShowForm(false); resetForm(); fetchData(); setLoading(false)
  }

  const handleTambahWali = async () => {
    setLoading(true); setErrorMsg('')
    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formEmail, password: formPassword, nama: formNama, role: 'wali', no_wa: formNoWa })
    })
    const result = await res.json()
    if (result.error) { setErrorMsg(result.error); setLoading(false); return }
    setSuccessMsg('Wali berhasil ditambahkan!')
    setShowForm(false); resetForm(); fetchData(); setLoading(false)
  }

  const handleTambahSantri = async () => {
    setLoading(true); setErrorMsg('')
    const { error } = await supabase.from('santri').insert({
      nama: formNama,
      kelas: formKelas || null,
      guru_id: formGuruId || null,
      wali_id: formWaliId || null
    })
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    setSuccessMsg('Santri berhasil ditambahkan!')
    setShowForm(false); resetForm(); fetchData(); setLoading(false)
  }

  const handleEditSantri = (santri) => {
    setEditSantriId(santri.id)
    setFormNama(santri.nama)
    setFormKelas(santri.kelas || '')
    setFormGuruId(santri.guru_id || '')
    setFormWaliId(santri.wali_id || '')
    setShowForm(true)
    setFormType('santri')
  }

  const handleUpdateSantri = async () => {
    setLoading(true); setErrorMsg('')
    const { error } = await supabase
      .from('santri')
      .update({ nama: formNama, kelas: formKelas || null, guru_id: formGuruId || null, wali_id: formWaliId || null })
      .eq('id', editSantriId)
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    setSuccessMsg('Santri berhasil diupdate!')
    setShowForm(false); setEditSantriId(null); resetForm(); fetchData(); setLoading(false)
  }

  const handleHapusGuru = async (id) => {
    if (!confirm('Yakin hapus ini?')) return
    await supabase.from('profiles').delete().eq('id', id)
    fetchData()
  }

  const handleHapusSantri = async (id) => {
    if (!confirm('Yakin hapus santri ini?')) return
    await supabase.from('santri').delete().eq('id', id)
    fetchData()
  }

  const resetForm = () => {
    setFormNama(''); setFormEmail(''); setFormPassword('')
    setFormNoWa(''); setFormGuruId(''); setFormWaliId('')
    setFormKelas(''); setEditSantriId(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="w-64 bg-green-800 text-white flex flex-col">
        <div className="p-6 border-b border-green-700">
          <div className="text-2xl mb-1">🕌</div>
          <h1 className="font-bold text-lg">Hafalan Santri</h1>
          <p className="text-green-300 text-sm">Panel Admin</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'guru', label: '👨‍🏫 Data Guru' },
            { id: 'santri', label: '🧒 Data Santri' },
            { id: 'wali', label: '👨‍👩‍👧 Data Wali' },
          ].map(menu => (
            <button key={menu.id} onClick={() => { setActiveMenu(menu.id); setShowForm(false); setSuccessMsg('') }}
              className={`w-full text-left px-4 py-2 rounded-lg transition ${activeMenu === menu.id ? 'bg-green-600 font-semibold' : 'hover:bg-green-700'}`}>
              {menu.label}
            </button>
          ))}
        </nav>
        <div className="p-4">
          <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm">
            🚪 Logout
          </button>
        </div>
      </div>

      <div className="flex-1 p-8">

        {activeMenu === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Admin</h2>
            <div className="grid grid-cols-3 gap-6">
              {[
                { icon: '👨‍🏫', count: guruList.length, label: 'Total Guru' },
                { icon: '🧒', count: santriList.length, label: 'Total Santri' },
                { icon: '👨‍👩‍👧', count: waliList.length, label: 'Total Wali' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow text-center">
                  <div className="text-4xl mb-2">{item.icon}</div>
                  <div className="text-3xl font-bold text-green-700">{item.count}</div>
                  <div className="text-gray-500">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeMenu === 'guru' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Data Guru</h2>
              <button onClick={() => { setShowForm(true); setFormType('guru') }} className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800">+ Tambah Guru</button>
            </div>
            {successMsg && <p className="text-green-600 mb-4">✅ {successMsg}</p>}
            {showForm && formType === 'guru' && (
              <div className="bg-white p-6 rounded-2xl shadow mb-6">
                <h3 className="font-semibold text-lg mb-4">Form Tambah Guru</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Nama Guru" value={formNama} onChange={e => setFormNama(e.target.value)} className="border rounded-lg px-3 py-2" />
                  <input placeholder="No WhatsApp" value={formNoWa} onChange={e => setFormNoWa(e.target.value)} className="border rounded-lg px-3 py-2" />
                  <input placeholder="Email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="border rounded-lg px-3 py-2" />
                  <input placeholder="Password" type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} className="border rounded-lg px-3 py-2" />
                </div>
                {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                <div className="flex gap-3 mt-4">
                  <button onClick={handleTambahGuru} disabled={loading} className="bg-green-700 text-white px-6 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50">{loading ? 'Menyimpan...' : 'Simpan'}</button>
                  <button onClick={() => setShowForm(false)} className="bg-gray-300 px-6 py-2 rounded-lg hover:bg-gray-400">Batal</button>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-green-700 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Nama</th>
                    <th className="px-4 py-3 text-left">No WA</th>
                    <th className="px-4 py-3 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {guruList.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-gray-400">Belum ada data guru</td></tr>}
                  {guruList.map((guru, i) => (
                    <tr key={guru.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3">{guru.nama}</td>
                      <td className="px-4 py-3">{guru.no_wa || '-'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleHapusGuru(guru.id)} className="text-red-500 hover:text-red-700 text-sm">🗑 Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeMenu === 'santri' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Data Santri</h2>
              <button onClick={() => { resetForm(); setShowForm(true); setFormType('santri') }} className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800">+ Tambah Santri</button>
            </div>
            {successMsg && <p className="text-green-600 mb-4">✅ {successMsg}</p>}
            {showForm && formType === 'santri' && (
              <div className="bg-white p-6 rounded-2xl shadow mb-6">
                <h3 className="font-semibold text-lg mb-4">
                  {editSantriId ? '✏️ Edit Santri' : 'Form Tambah Santri'}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Nama Santri" value={formNama} onChange={e => setFormNama(e.target.value)} className="border rounded-lg px-3 py-2" />
                  <input placeholder="Kelas (contoh: 1A, 2B)" value={formKelas} onChange={e => setFormKelas(e.target.value)} className="border rounded-lg px-3 py-2" />
                  <select value={formGuruId} onChange={e => setFormGuruId(e.target.value)} className="border rounded-lg px-3 py-2">
                    <option value="">-- Pilih Guru --</option>
                    {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                  </select>
                  <select value={formWaliId} onChange={e => setFormWaliId(e.target.value)} className="border rounded-lg px-3 py-2">
                    <option value="">-- Pilih Wali --</option>
                    {waliList.map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
                  </select>
                </div>
                {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                <div className="flex gap-3 mt-4">
                  <button onClick={editSantriId ? handleUpdateSantri : handleTambahSantri} disabled={loading} className="bg-green-700 text-white px-6 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50">
                    {loading ? 'Menyimpan...' : editSantriId ? 'Update' : 'Simpan'}
                  </button>
                  <button onClick={() => { setShowForm(false); resetForm() }} className="bg-gray-300 px-6 py-2 rounded-lg hover:bg-gray-400">Batal</button>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-green-700 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Nama Santri</th>
                    <th className="px-4 py-3 text-left">Kelas</th>
                    <th className="px-4 py-3 text-left">Guru</th>
                    <th className="px-4 py-3 text-left">Wali</th>
                    <th className="px-4 py-3 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {santriList.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">Belum ada data santri</td></tr>}
                  {santriList.map((santri, i) => (
                    <tr key={santri.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3">{santri.nama}</td>
                      <td className="px-4 py-3">
  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
    {santri.kelas || '-'}
  </span>
</td>
                      <td className="px-4 py-3">{santri.guru?.nama || '-'}</td>
                      <td className="px-4 py-3">{santri.wali?.nama || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => handleEditSantri(santri)} className="text-blue-500 hover:text-blue-700 text-sm">✏️ Edit</button>
                          <button onClick={() => handleHapusSantri(santri.id)} className="text-red-500 hover:text-red-700 text-sm">🗑 Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeMenu === 'wali' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Data Wali Santri</h2>
              <button onClick={() => { setShowForm(true); setFormType('wali') }} className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800">+ Tambah Wali</button>
            </div>
            {successMsg && <p className="text-green-600 mb-4">✅ {successMsg}</p>}
            {showForm && formType === 'wali' && (
              <div className="bg-white p-6 rounded-2xl shadow mb-6">
                <h3 className="font-semibold text-lg mb-4">Form Tambah Wali</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Nama Wali" value={formNama} onChange={e => setFormNama(e.target.value)} className="border rounded-lg px-3 py-2" />
                  <input placeholder="No WhatsApp" value={formNoWa} onChange={e => setFormNoWa(e.target.value)} className="border rounded-lg px-3 py-2" />
                  <input placeholder="Email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="border rounded-lg px-3 py-2" />
                  <input placeholder="Password" type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} className="border rounded-lg px-3 py-2" />
                </div>
                {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                <div className="flex gap-3 mt-4">
                  <button onClick={handleTambahWali} disabled={loading} className="bg-green-700 text-white px-6 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50">{loading ? 'Menyimpan...' : 'Simpan'}</button>
                  <button onClick={() => setShowForm(false)} className="bg-gray-300 px-6 py-2 rounded-lg hover:bg-gray-400">Batal</button>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-green-700 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Nama Wali</th>
                    <th className="px-4 py-3 text-left">No WA</th>
                    <th className="px-4 py-3 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {waliList.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-gray-400">Belum ada data wali</td></tr>}
                  {waliList.map((wali, i) => (
                    <tr key={wali.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3">{wali.nama}</td>
                      <td className="px-4 py-3">{wali.no_wa || '-'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleHapusGuru(wali.id)} className="text-red-500 hover:text-red-700 text-sm">🗑 Hapus</button>
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