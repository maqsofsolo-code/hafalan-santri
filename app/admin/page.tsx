'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Image from 'next/image'

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
      nama: formNama, kelas: formKelas || null,
      guru_id: formGuruId || null, wali_id: formWaliId || null
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
    const { error } = await supabase.from('santri')
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

  const handleDownloadTemplate = () => { window.open('/api/download-template', '_blank') }

  const handleImportExcel = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return
    setImportLoading(true); setImportMsg('')
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/import-excel', { method: 'POST', body: formData })
    const result = await res.json()
    setImportMsg(result.message)
    setImportLoading(false); fetchData()
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
    { id: 'dashboard', label: 'Dashboard', icon: '▣' },
    { id: 'guru', label: 'Data Guru', icon: '▤' },
    { id: 'santri', label: 'Data Santri', icon: '▦' },
    { id: 'wali', label: 'Data Wali', icon: '▧' },
  ]

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
  const btnPrimary = "text-white px-6 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shadow"

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER MOBILE */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 text-white px-4 py-3 flex items-center justify-between shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-full p-0.5 w-8 h-8 flex items-center justify-center">
            <Image src="/logo.png" alt="Logo" width={28} height={28} className="rounded-full" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">Daarus Salaf</div>
            <div className="text-blue-200 text-xs">Administrator</div>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="text-2xl">☰</button>
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

          {/* Logo Pesantren */}
          <div className="p-5 border-b border-blue-700">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full p-1 shadow-md flex-shrink-0">
                <Image src="/logo.png" alt="Logo" width={48} height={48} className="rounded-full" />
              </div>
              <div>
                <div className="text-white font-bold text-sm leading-tight">Pondok Pesantren</div>
                <div className="text-white font-bold text-base leading-tight">Daarus Salaf</div>
                <div className="text-blue-300 text-xs">Sukoharjo</div>
              </div>
            </div>
            <div className="mt-3 bg-blue-800 rounded-xl px-3 py-2">
              <div className="text-blue-300 text-xs">Login sebagai:</div>
              <div className="text-white font-semibold text-sm">Administrator</div>
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map(menu => (
              <button key={menu.id}
                onClick={() => { setActiveMenu(menu.id); setShowForm(false); setSuccessMsg(''); setSidebarOpen(false) }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium flex items-center gap-3 ${
                  activeMenu === menu.id
                    ? 'bg-white text-blue-900 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}>
                <span>{menu.icon}</span>
                {menu.label}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-blue-700 space-y-2">
            <button onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
              Keluar
            </button>
            <button onClick={() => setSidebarOpen(false)}
              className="w-full text-blue-300 py-2 rounded-xl text-xs md:hidden hover:text-white">
              ✕ Tutup Menu
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0 min-w-0">

          {/* DASHBOARD */}
          {activeMenu === 'dashboard' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Dashboard Admin</h2>
                <p className="text-gray-500 text-sm">Kelola data Pondok Pesantren Daarus Salaf</p>
              </div>

              {/* Statistik */}
              <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6">
                {[
                  { label: 'Total Guru', count: guruList.length, color: 'from-blue-500 to-blue-700' },
                  { label: 'Total Santri', count: santriList.length, color: 'from-green-500 to-green-700' },
                  { label: 'Total Wali', count: waliList.length, color: 'from-purple-500 to-purple-700' },
                ].map((item, i) => (
                  <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 md:p-6 shadow-lg text-white text-center`}>
                    <div className="text-3xl font-bold">{item.count}</div>
                    <div className="text-white text-xs md:text-sm mt-1 opacity-90">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Import Excel */}
              <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-1">Import Data dari Excel</h3>
                <p className="text-xs text-gray-400 mb-4">Download template, isi data guru/santri/wali, lalu upload kembali</p>
                <div className="flex flex-col md:flex-row gap-3">
                  <button onClick={handleDownloadTemplate}
                    className="flex-1 text-white px-4 py-3 rounded-xl font-semibold text-sm shadow"
                    style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                    Download Template Excel
                  </button>
                  <label className="flex-1 text-white px-4 py-3 rounded-xl font-semibold text-sm text-center cursor-pointer shadow"
                    style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                    {importLoading ? 'Mengimport...' : 'Upload File Excel'}
                    <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" disabled={importLoading} />
                  </label>
                </div>
                {importMsg && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                    {importMsg}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DATA GURU */}
          {activeMenu === 'guru' && (
            <div>
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Data Guru</h2>
                  <p className="text-gray-400 text-xs">{guruList.length} guru terdaftar</p>
                </div>
                <button onClick={() => { setShowForm(true); setFormType('guru') }}
                  className={btnPrimary}
                  style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                  + Tambah Guru
                </button>
              </div>
              {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{successMsg}</div>}
              {showForm && formType === 'guru' && (
                <div className="bg-white p-5 rounded-2xl shadow-md mb-5 border border-gray-100">
                  <h3 className="font-bold text-base mb-4">Form Tambah Guru</h3>
                  <div className="space-y-3">
                    <input placeholder="Nama Guru" value={formNama} onChange={e => setFormNama(e.target.value)} className={inputClass} />
                    <input placeholder="No WhatsApp" value={formNoWa} onChange={e => setFormNoWa(e.target.value)} className={inputClass} />
                    <input placeholder="Email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className={inputClass} />
                    <input placeholder="Password" type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} className={inputClass} />
                  </div>
                  {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={handleTambahGuru} disabled={loading} className={btnPrimary}
                      style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                      {loading ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {guruList.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Belum ada data guru</div>}
                {guruList.map((guru) => (
                  <div key={guru.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                        {guru.nama?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{guru.nama}</div>
                        <div className="text-xs text-gray-400">{guru.no_wa || 'No WA belum diisi'}</div>
                      </div>
                    </div>
                    <button onClick={() => handleHapusGuru(guru.id)} className="text-red-400 hover:text-red-600 text-sm px-3 py-1 rounded-lg hover:bg-red-50">Hapus</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DATA SANTRI */}
          {activeMenu === 'santri' && (
            <div>
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Data Santri</h2>
                  <p className="text-gray-400 text-xs">{santriList.length} santri terdaftar</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); setFormType('santri') }}
                  className={btnPrimary}
                  style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                  + Tambah Santri
                </button>
              </div>
              {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{successMsg}</div>}
              {showForm && formType === 'santri' && (
                <div className="bg-white p-5 rounded-2xl shadow-md mb-5 border border-gray-100">
                  <h3 className="font-bold text-base mb-4">{editSantriId ? 'Edit Data Santri' : 'Form Tambah Santri'}</h3>
                  <div className="space-y-3">
                    <input placeholder="Nama Santri" value={formNama} onChange={e => setFormNama(e.target.value)} className={inputClass} />
                    <input placeholder="Kelas (contoh: 1A, 2B)" value={formKelas} onChange={e => setFormKelas(e.target.value)} className={inputClass} />
                    <select value={formGuruId} onChange={e => setFormGuruId(e.target.value)} className={inputClass}>
                      <option value="">-- Pilih Guru --</option>
                      {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                    </select>
                    <select value={formWaliId} onChange={e => setFormWaliId(e.target.value)} className={inputClass}>
                      <option value="">-- Pilih Wali --</option>
                      {waliList.map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
                    </select>
                  </div>
                  {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={editSantriId ? handleUpdateSantri : handleTambahSantri} disabled={loading}
                      className={btnPrimary}
                      style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                      {loading ? 'Menyimpan...' : editSantriId ? 'Update' : 'Simpan'}
                    </button>
                    <button onClick={() => { setShowForm(false); resetForm() }} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {santriList.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Belum ada data santri</div>}
                {santriList.map((santri) => (
                  <div key={santri.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                          {santri.nama?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{santri.nama}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {santri.kelas && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">Kelas {santri.kelas}</span>
                            )}
                            <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">Wali: {santri.wali?.nama || '-'}</div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditSantri(santri)} className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 rounded-lg hover:bg-blue-50">Edit</button>
                        <button onClick={() => handleHapusSantri(santri.id)} className="text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded-lg hover:bg-red-50">Hapus</button>
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
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Data Wali Santri</h2>
                  <p className="text-gray-400 text-xs">{waliList.length} wali terdaftar</p>
                </div>
                <button onClick={() => { setShowForm(true); setFormType('wali') }}
                  className={btnPrimary}
                  style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
                  + Tambah Wali
                </button>
              </div>
              {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{successMsg}</div>}
              {showForm && formType === 'wali' && (
                <div className="bg-white p-5 rounded-2xl shadow-md mb-5 border border-gray-100">
                  <h3 className="font-bold text-base mb-4">Form Tambah Wali</h3>
                  <div className="space-y-3">
                    <input placeholder="Nama Wali" value={formNama} onChange={e => setFormNama(e.target.value)} className={inputClass} />
                    <input placeholder="No WhatsApp" value={formNoWa} onChange={e => setFormNoWa(e.target.value)} className={inputClass} />
                    <input placeholder="Email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className={inputClass} />
                    <input placeholder="Password" type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} className={inputClass} />
                  </div>
                  {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={handleTambahWali} disabled={loading}
                      className={btnPrimary}
                      style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
                      {loading ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {waliList.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Belum ada data wali</div>}
                {waliList.map((wali) => (
                  <div key={wali.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
                        {wali.nama?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{wali.nama}</div>
                        <div className="text-xs text-gray-400">{wali.no_wa || 'No WA belum diisi'}</div>
                      </div>
                    </div>
                    <button onClick={() => handleHapusGuru(wali.id)} className="text-red-400 hover:text-red-600 text-sm px-3 py-1 rounded-lg hover:bg-red-50">Hapus</button>
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