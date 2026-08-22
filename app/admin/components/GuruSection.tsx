'use client'
import { useEffect, useRef, useState } from 'react'
import { FormEmailPassword } from './FormEmailPassword'
import { getKelompokGuru, labelJenisKelasGuru } from '../utils'
import type { Guru, Santri } from '../types'
import type { useAdminEntityForm } from '../hooks/useAdminEntityForm'
import type { useAdminGuruWali } from '../hooks/useAdminGuruWali'
import type { useAdminTandaTanganGuru } from '../hooks/useAdminTandaTanganGuru'

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
const btnPrimary = "text-white px-6 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shadow transition"

type EntityForm = ReturnType<typeof useAdminEntityForm>
type GuruWaliHandlers = ReturnType<typeof useAdminGuruWali>
type TandaTanganGuruHandlers = ReturnType<typeof useAdminTandaTanganGuru>

// Blok "Tanda Tangan Digital" (Tahap 9P) -- HANYA mengelola FILE tanda tangan milik guru, tidak
// pernah menyentuh penentuan Wali Kelas (yang tetap sepenuhnya di menu Penugasan Guru, lihat
// instruksi Tahap 9P Bagian E: "Jangan mencampurkan penentuan Wali Kelas di Data Guru"). Sengaja
// jadi komponen terpisah (bukan disisipkan di blok toggle Wali Kelas legacy di atasnya) supaya
// pemisahan itu terlihat jelas juga secara visual, bukan cuma di kode.
//
// Status "ada tanda tangan atau tidak" SENGAJA dibaca dari hasil fetch preview (tt.signedUrlByGuruId),
// BUKAN dari guru.tanda_tangan_path (prop dari guruList milik useAdminData) -- guruList hanya
// di-refresh lewat fetchData() penuh, yang tidak dipanggil oleh hook ini, sehingga prop itu akan
// basi persis setelah upload/hapus pertama sampai Admin membuka ulang form. Fetch selalu dijalankan
// begitu form edit dibuka (murah -- endpoint GET hanya SELECT profiles kalau belum ada path, tidak
// pernah menyentuh Storage saat tanda tangan belum ada).
function BlokTandaTanganGuru({ guruId, tt }: { guruId: string, tt: TandaTanganGuruHandlers }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const signedUrl = tt.signedUrlByGuruId[guruId] // undefined = belum di-fetch, null = fetched tanpa tanda tangan, string = URL preview

  useEffect(() => {
    tt.fetchPreview(guruId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guruId])

  const handlePilihFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await tt.handleUpload(guruId, file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
      <p className="text-xs font-semibold text-gray-700">✍️ Tanda Tangan Digital</p>
      <p className="text-xs text-gray-400">Dipakai otomatis saat guru ini menjadi Wali Kelas di Raport Hifzh. Satu tanda tangan berlaku untuk semua kelas yang diwalinya.</p>

      {signedUrl === undefined ? (
        <div className="h-16 w-40 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400">
          {tt.loadingPreview ? 'Memuat preview...' : '-'}
        </div>
      ) : signedUrl ? (
        <img src={signedUrl} alt="Tanda tangan" className="h-16 bg-white border border-gray-200 rounded-lg px-3 object-contain" />
      ) : (
        <div className="h-16 w-40 bg-white border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400">
          Belum ada tanda tangan
        </div>
      )}

      <div className="flex gap-2 items-center flex-wrap">
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handlePilihFile} disabled={tt.uploading} className="text-xs" />
        {Boolean(signedUrl) && (
          <button type="button" onClick={() => tt.handleHapus(guruId)} disabled={tt.uploading}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 disabled:opacity-50">
            Hapus
          </button>
        )}
      </div>
      <p className="text-[11px] text-gray-400">PNG atau JPEG, maksimal 1 MB.</p>
      {tt.errorMsg && <p className="text-xs text-red-600">{tt.errorMsg}</p>}
    </div>
  )
}

function badgeKelasClass(jenisKelas: string | null | undefined): string {
  const kelompok = getKelompokGuru(jenisKelas)
  if (kelompok === 'putra') return 'bg-blue-100 text-blue-700'
  if (kelompok === 'putri') return 'bg-purple-100 text-purple-700'
  return 'bg-amber-100 text-amber-800 border border-amber-300'
}

// Tab "Data Guru" -- dipindah dari app/admin/page.tsx (Modularisasi Tahap
// 6A). Tahap 7C menambahkan: ringkasan kelengkapan klasifikasi Putra/Putri,
// filter Semua/Putra/Putri/Belum Terklasifikasi, badge klasifikasi per guru,
// opsi "Putri (TN)" di form, dan bulk classification (checkbox + terapkan).
// Layout besar (form, kartu list, tombol Edit/Hapus) TIDAK diubah.
export function GuruSection(props: {
  form: EntityForm
  guruWali: GuruWaliHandlers
  guruList: Guru[]
  guruFiltered: Guru[]
  santriList: Santri[]
  searchGuru: string
  setSearchGuru: (v: string) => void
  filterKelompokGuru: 'semua' | 'putra' | 'putri' | 'belum_terklasifikasi'
  setFilterKelompokGuru: (v: 'semua' | 'putra' | 'putri' | 'belum_terklasifikasi') => void
  tandaTanganGuru: TandaTanganGuruHandlers
}) {
  const { form, guruWali, guruList, guruFiltered, santriList, searchGuru, setSearchGuru, filterKelompokGuru, setFilterKelompokGuru, tandaTanganGuru } = props

  const [selectedGuruIds, setSelectedGuruIds] = useState<Set<string>>(new Set())
  const [bulkTarget, setBulkTarget] = useState<'' | 'banin' | 'banat' | 'tn'>('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkMsg, setBulkMsg] = useState('')

  const jumlahPutra = guruList.filter(g => getKelompokGuru(g.jenis_kelas) === 'putra').length
  const jumlahPutri = guruList.filter(g => getKelompokGuru(g.jenis_kelas) === 'putri').length
  const jumlahBelumTerklasifikasi = guruList.filter(g => getKelompokGuru(g.jenis_kelas) === 'belum_terklasifikasi').length

  const semuaTampilTercentang = guruFiltered.length > 0 && guruFiltered.every(g => selectedGuruIds.has(g.id))
  const toggleCentangSemua = () => {
    setSelectedGuruIds(prev => {
      const next = new Set(prev)
      if (semuaTampilTercentang) guruFiltered.forEach(g => next.delete(g.id))
      else guruFiltered.forEach(g => next.add(g.id))
      return next
    })
  }
  const toggleSelect = (id: string) => {
    setSelectedGuruIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleTerapkan = async () => {
    if (selectedGuruIds.size === 0 || !bulkTarget) return
    const label = labelJenisKelasGuru(bulkTarget)
    if (!confirm(`Terapkan klasifikasi "${label}" ke ${selectedGuruIds.size} guru terpilih?`)) return
    setBulkLoading(true); setBulkMsg('')
    const result = await guruWali.handleBulkUpdateJenisKelas(Array.from(selectedGuruIds), bulkTarget)
    setBulkLoading(false)
    setBulkMsg(result.errorMsg
      ? `${result.berhasil.length} guru berhasil diperbarui, ${result.gagal.length} gagal. ${result.errorMsg}`
      : `✓ ${result.berhasil.length} guru berhasil diperbarui menjadi ${label}.`)
    setSelectedGuruIds(new Set())
    setBulkTarget('')
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Data Guru</h2>
          <p className="text-gray-400 text-xs">{guruList.length} guru terdaftar</p>
        </div>
        <button onClick={() => { form.resetForm(); form.setShowForm(true); form.setFormType('guru') }}
          className={btnPrimary} style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>+ Tambah Guru</button>
      </div>

      {/* Ringkasan Klasifikasi Guru */}
      <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Klasifikasi Guru</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-blue-50 border border-blue-100">
            <div className="text-xl font-bold text-blue-700">{jumlahPutra}</div>
            <div className="text-xs text-blue-600 font-semibold mt-0.5">Putra</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-purple-50 border border-purple-100">
            <div className="text-xl font-bold text-purple-700">{jumlahPutri}</div>
            <div className="text-xs text-purple-600 font-semibold mt-0.5">Putri</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-amber-50 border border-amber-200">
            <div className="text-xl font-bold text-amber-700">{jumlahBelumTerklasifikasi}</div>
            <div className="text-xs text-amber-600 font-semibold mt-0.5">Belum Terklasifikasi</div>
          </div>
        </div>
        {jumlahBelumTerklasifikasi > 0 && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            ⚠️ {jumlahBelumTerklasifikasi} guru belum memiliki klasifikasi Putra/Putri.
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
        <input type="text" value={searchGuru} onChange={e => setSearchGuru(e.target.value)}
          placeholder="🔍 Cari nama atau no. WA guru..." className={inputClass} />
        <div className="flex gap-2 flex-wrap mt-3">
          {(['semua', 'putra', 'putri', 'belum_terklasifikasi'] as const).map(k => (
            <button key={k} onClick={() => setFilterKelompokGuru(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterKelompokGuru === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {k === 'semua' ? 'Semua' : k === 'putra' ? 'Putra' : k === 'putri' ? 'Putri' : 'Belum Terklasifikasi'}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Menampilkan {guruFiltered.length} dari {guruList.length} guru</p>
      </div>

      {/* Bulk classification */}
      <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={semuaTampilTercentang} onChange={toggleCentangSemua} className="w-4 h-4" />
            Centang Semua yang Tampil ({guruFiltered.length})
          </label>
          <span className="text-xs font-semibold text-gray-600">{selectedGuruIds.size} guru dipilih</span>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={bulkTarget} onChange={e => setBulkTarget(e.target.value as '' | 'banin' | 'banat' | 'tn')}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">-- Pilih klasifikasi --</option>
            <option value="banin">Set sebagai Putra</option>
            <option value="banat">Set sebagai Putri</option>
            <option value="tn">Set sebagai Putri (TN)</option>
          </select>
          <button onClick={handleTerapkan} disabled={selectedGuruIds.size === 0 || !bulkTarget || bulkLoading}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50">
            {bulkLoading ? 'Menerapkan...' : 'Terapkan'}
          </button>
        </div>
        {bulkMsg && <p className="text-xs mt-2 text-gray-600">{bulkMsg}</p>}
      </div>

      {form.successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {form.successMsg}</div>}
      {form.showForm && form.formType === 'guru' && (
        <div className="bg-white p-5 rounded-2xl shadow-md mb-5 border border-gray-100">
          <h3 className="font-bold text-base mb-4">{form.editGuruId ? 'Edit Data Guru' : 'Tambah Guru Baru'}</h3>
          <div className="space-y-3">
            <input placeholder="Nama Guru" value={form.formNama} onChange={e => form.setFormNama(e.target.value)} className={inputClass} />
            <input placeholder="No WhatsApp" value={form.formNoWa} onChange={e => form.setFormNoWa(e.target.value)} className={inputClass} />

            {form.editGuruId && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
                <p className="text-xs font-semibold text-blue-800">⚙️ Pengaturan Guru</p>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Kelompok Guru (untuk filter mode pengganti)</label>
                  <select value={form.formGuruJenisKelas} onChange={e => form.setFormGuruJenisKelas(e.target.value)} className={inputClass}>
                    <option value="">-- Belum diset --</option>
                    <option value="banin">Putra</option>
                    <option value="banat">Putri</option>
                    <option value="tn">Putri (TN)</option>
                  </select>
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-xl border border-blue-200">
                  <div onClick={() => form.setFormGuruIsWaliKelas(!form.formGuruIsWaliKelas)}
                    className={`w-10 h-5 rounded-full transition-all flex-shrink-0 ${form.formGuruIsWaliKelas ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-all ${form.formGuruIsWaliKelas ? 'ml-5' : 'ml-0.5'}`} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-700">Wali Kelas</div>
                    <div className="text-xs text-gray-400">Aktifkan jika guru ini adalah wali kelas</div>
                  </div>
                </label>

                {form.formGuruIsWaliKelas && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Kelas yang Diwali</label>
                      <select value={form.formGuruWaliKelasNum} onChange={e => form.setFormGuruWaliKelasNum(e.target.value)} className={inputClass}>
                        <option value="">-- Pilih Kelas --</option>
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(k => (
                          <option key={k} value={k}>Kelas {k}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Jenis Kelas</label>
                      <select value={form.formGuruWaliKelasJenis} onChange={e => form.setFormGuruWaliKelasJenis(e.target.value)} className={inputClass}>
                        <option value="">-- Pilih --</option>
                        <option value="banin">Banin</option>
                        <option value="banat">Banat</option>
                        <option value="tn">TN</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {form.editGuruId && (
              <BlokTandaTanganGuru guruId={form.editGuruId} tt={tandaTanganGuru} />
            )}

            <FormEmailPassword
              isEdit={!!form.editGuruId}
              formEmail={form.formEmail}
              setFormEmail={form.setFormEmail}
              formPassword={form.formPassword}
              setFormPassword={form.setFormPassword}
              showPassword={form.showPassword}
              setShowPassword={form.setShowPassword}
            />
          </div>
          {form.errorMsg && <p className="text-red-500 mt-2 text-sm">{form.errorMsg}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={form.editGuruId ? guruWali.handleUpdateGuru : guruWali.handleTambahGuru} disabled={form.loading}
              className={btnPrimary} style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
              {form.loading ? 'Menyimpan...' : form.editGuruId ? 'Update' : 'Simpan'}
            </button>
            <button onClick={() => { form.setShowForm(false); form.resetForm() }} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {guruFiltered.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Tidak ada data guru</div>}
        {guruFiltered.map((guru) => {
          const jumlahSantri = santriList.filter(s => s.guru_id === guru.id || s.guru_id_2 === guru.id).length
          return (
            <div key={guru.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <input type="checkbox" checked={selectedGuruIds.has(guru.id)} onChange={() => toggleSelect(guru.id)}
                    className="w-4 h-4 flex-shrink-0" />
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                    {guru.nama?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-2 flex-wrap">
                      <span className="truncate">{guru.nama}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badgeKelasClass(guru.jenis_kelas)}`}>
                        {labelJenisKelasGuru(guru.jenis_kelas).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">{guru.no_wa || 'No WA belum diisi'}</div>
                    <div className="text-xs text-blue-500 mt-0.5">{jumlahSantri} santri</div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => guruWali.handleEditGuru(guru)} className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</button>
                  <button onClick={() => guruWali.handleHapusGuru(guru.id)} className="text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
