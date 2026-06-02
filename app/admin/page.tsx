'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [guruList, setGuruList] = useState<any[]>([])
  const [santriList, setSantriList] = useState<any[]>([])
  const [waliList, setWaliList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('')
  const [editSantriId, setEditSantriId] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [formNama, setFormNama] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formNoWa, setFormNoWa] = useState('')
  const [formGuruId, setFormGuruId] = useState('')
  const [formWaliId, setFormWaliId] = useState('')
  const [formKelas, setFormKelas] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importMsg, setImportMsg] = useState('')

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

  const handleEditSantri = (santri: any) => {
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

  const handleHapusGuru = async (id: any) => {
    if (!confirm('Yakin hapus ini?')) return
    await supabase.from('profiles').delete().eq('id', id)
    fetchData()
  }

  const handleHapusSantri = async (id: any) => {
    if (!confirm('Yakin hapus santri ini?')) return
    await supabase.from('santri').delete().eq('id', id)
    fetchData()
  }

  const handleDownloadTemplate = () => {
    window.open('/api/download-template', '_blank')
  }

  const handleImportExcel = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return
    setImportLoading(true)
    setImportMsg('')
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/import-excel', {
      method: 'POST',
      body: formData
    })
    const result = await res.json()
    setImportMsg(result.message)
    setImportLoading(false)
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

  const menuItems = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'guru', label: '👨‍🏫 Data Guru' },
    { id: 'santri', label: '🧒 Data Santri' },
    { id: 'wali', label: '👨‍👩‍👧 Data Wali' },
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
            <p className="text-green-300 text-sm">Panel Admin</p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map(menu => (
              <button
                key={menu.id}
                onClick={() => {
                  setActiveMenu(menu.id)
                  setShowForm(false)
                  setSuccessMsg('')
                  setSidebarOpen(false)
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition text-base ${activeMenu === menu.id ? 'bg-green-600 font-semibold' : 'hover:bg-green-700'}`}
              >
                {menu.label}
              </button>
            ))}
          </nav>
          <div className="p-4 space-y-2">
            <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg text-sm font-semibold">
              🚪 Logout
            </button>
            <button onClick={() => setSidebarOpen(false)} className="w-full bg-green-700 hover:bg-green-600 text-white py-2 rounded-lg text-sm md:hidden">
              ✕ Tutup Menu
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0 min-w-0">

          {/* DASHBOARD */}
          {activeMenu === 'dashboard' && (
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Dashboard Admin</h2>

              {/* Kartu Statistik */}
              <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6">
                {[
                  { icon: '👨‍🏫', count: guruList.length, label: 'Total Guru' },
                  { icon: '🧒', count: santriList.length, label: 'Total Santri' },
                  { icon: '👨‍👩‍👧', count: waliList.length, label: 'Total Wali' },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 md:p-6 shadow text-center">
                    <div className="text-3xl md:text-4xl mb-2">{item.icon}</div>
                    <div className="text-2xl md:text-3xl font-bold text-green-700">{item.count}</div>
                    <div className="text-gray-500 text-xs md:text-base">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Import Excel */}
              <div className="bg-white rounded-2xl shadow p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-1">📥 Import Data dari Excel</h3>
                <p className="text-xs text-gray-400 mb-3">
                  Download template, isi data, lalu upload kembali
                </p>
                <div className="flex flex-col md:flex-row gap-3">
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 text-sm"
                  >
                    📄 Download Template Excel
                  </button>
                  <label className="flex-1 bg-green-700 text-white px-4 py-3 rounded-xl font-semibold hover:bg-green-800 text-sm text-center cursor-pointer">
                    {importLoading ? '⏳ Mengimport...' : '📤 Upload File Excel'}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImportExcel}
                      className="hidden"
                      disabled={importLoading}
                    />
                  </label>
                </div>
                {importMsg && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    ✅ {importMsg}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DATA GURU */}
          {activeMenu === 'guru' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Data Guru</h2>
                <button onClick={() => { setShowForm(true); setFormType('guru') }} className="bg-green-700 text-white px-3 py-2 rounded-lg hover:bg-green-800 text-sm">+ Tambah</button>
              </div>
              {successMsg && <p className="text-green-600 mb-4 text-sm">✅ {successMsg}</p>}
              {showForm && formType === 'guru' && (
                <div className="bg-white p-4 rounded-2xl shadow mb-4">
                  <h3 className="font-semibold text-base mb-3">Form Tambah Guru</h3>
                  <div className="space-y-3">
                    <input placeholder="Nama Guru" value={formNama} onChange={e => setFormNama(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    <input placeholder="No WhatsApp" value={formNoWa} onChange={e => setFormNoWa(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    <input placeholder="Email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    <input placeholder="Password" type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleTambahGuru} disabled={loading} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">{loading ? 'Menyimpan...' : 'Simpan'}</button>
                    <button onClick={() => setShowForm(false)} className="bg-gray-300 px-4 py-2 rounded-lg text-sm">Batal</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {guruList.length === 0 && <p className="text-center py-8 text-gray-400">Belum ada data guru</p>}
                {guruList.map((guru) => (
                  <div key={guru.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{guru.nama}</div>
                      <div className="text-sm text-gray-500">{guru.no_wa || '-'}</div>
                    </div>
                    <button onClick={() => handleHapusGuru(guru.id)} className="text-red-500 text-sm">🗑 Hapus</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DATA SANTRI */}
          {activeMenu === 'santri' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Data Santri</h2>
                <button onClick={() => { resetForm(); setShowForm(true); setFormType('santri') }} className="bg-green-700 text-white px-3 py-2 rounded-lg hover:bg-green-800 text-sm">+ Tambah</button>
              </div>
              {successMsg && <p className="text-green-600 mb-4 text-sm">✅ {successMsg}</p>}
              {showForm && formType === 'santri' && (
                <div className="bg-white p-4 rounded-2xl shadow mb-4">
                  <h3 className="font-semibold text-base mb-3">{editSantriId ? '✏️ Edit Santri' : 'Form Tambah Santri'}</h3>
                  <div className="space-y-3">
                    <input placeholder="Nama Santri" value={formNama} onChange={e => setFormNama(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    <input placeholder="Kelas (contoh: 1A, 2B)" value={formKelas} onChange={e => setFormKelas(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    <select value={formGuruId} onChange={e => setFormGuruId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">-- Pilih Guru --</option>
                      {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                    </select>
                    <select value={formWaliId} onChange={e => setFormWaliId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">-- Pilih Wali --</option>
                      {waliList.map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
                    </select>
                  </div>
                  {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                  <div className="flex gap-2 mt-3">
                    <button onClick={editSantriId ? handleUpdateSantri : handleTambahSantri} disabled={loading} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                      {loading ? 'Menyimpan...' : editSantriId ? 'Update' : 'Simpan'}
                    </button>
                    <button onClick={() => { setShowForm(false); resetForm() }} className="bg-gray-300 px-4 py-2 rounded-lg text-sm">Batal</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {santriList.length === 0 && <p className="text-center py-8 text-gray-400">Belum ada data santri</p>}
                {santriList.map((santri) => (
                  <div key={santri.id} className="bg-white rounded-xl shadow p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{santri.nama}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs mr-2">{santri.kelas || '-'}</span>
                          Guru: {santri.guru?.nama || '-'}
                        </div>
                        <div className="text-sm text-gray-500">Wali: {santri.wali?.nama || '-'}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditSantri(santri)} className="text-blue-500 text-sm">✏️</button>
                        <button onClick={() => handleHapusSantri(santri.id)} className="text-red-500 text-sm">🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DATA WALI */}
          {activeMenu === 'wali' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Data Wali</h2>
                <button onClick={() => { setShowForm(true); setFormType('wali') }} className="bg-green-700 text-white px-3 py-2 rounded-lg hover:bg-green-800 text-sm">+ Tambah</button>
              </div>
              {successMsg && <p className="text-green-600 mb-4 text-sm">✅ {successMsg}</p>}
              {showForm && formType === 'wali' && (
                <div className="bg-white p-4 rounded-2xl shadow mb-4">
                  <h3 className="font-semibold text-base mb-3">Form Tambah Wali</h3>
                  <div className="space-y-3">
                    <input placeholder="Nama Wali" value={formNama} onChange={e => setFormNama(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    <input placeholder="No WhatsApp" value={formNoWa} onChange={e => setFormNoWa(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    <input placeholder="Email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    <input placeholder="Password" type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleTambahWali} disabled={loading} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">{loading ? 'Menyimpan...' : 'Simpan'}</button>
                    <button onClick={() => setShowForm(false)} className="bg-gray-300 px-4 py-2 rounded-lg text-sm">Batal</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {waliList.length === 0 && <p className="text-center py-8 text-gray-400">Belum ada data wali</p>}
                {waliList.map((wali) => (
                  <div key={wali.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{wali.nama}</div>
                      <div className="text-sm text-gray-500">{wali.no_wa || '-'}</div>
                    </div>
                    <button onClick={() => handleHapusGuru(wali.id)} className="text-red-500 text-sm">🗑 Hapus</button>
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