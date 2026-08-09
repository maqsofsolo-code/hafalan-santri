'use client'
import { FormEmailPassword } from './FormEmailPassword'
import type { Guru, Santri } from '../types'
import type { useAdminEntityForm } from '../hooks/useAdminEntityForm'
import type { useAdminGuruWali } from '../hooks/useAdminGuruWali'

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
const btnPrimary = "text-white px-6 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shadow transition"

type EntityForm = ReturnType<typeof useAdminEntityForm>
type GuruWaliHandlers = ReturnType<typeof useAdminGuruWali>

// Tab "Data Guru" -- dipindah dari app/admin/page.tsx (Modularisasi Tahap
// 6A). JSX/className identik dengan sebelumnya.
export function GuruSection(props: {
  form: EntityForm
  guruWali: GuruWaliHandlers
  guruList: Guru[]
  guruFiltered: Guru[]
  santriList: Santri[]
  searchGuru: string
  setSearchGuru: (v: string) => void
}) {
  const { form, guruWali, guruList, guruFiltered, santriList, searchGuru, setSearchGuru } = props

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

      <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
        <input type="text" value={searchGuru} onChange={e => setSearchGuru(e.target.value)}
          placeholder="🔍 Cari nama atau no. WA guru..." className={inputClass} />
        <p className="text-xs text-gray-400 mt-2">Menampilkan {guruFiltered.length} dari {guruList.length} guru</p>
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
                  <label className="block text-xs text-gray-500 mb-1">Jenis Kelas (untuk filter mode pengganti)</label>
                  <select value={form.formGuruJenisKelas} onChange={e => form.setFormGuruJenisKelas(e.target.value)} className={inputClass}>
                    <option value="">-- Belum diset --</option>
                    <option value="banin">Banin (Guru Putra)</option>
                    <option value="banat">Banat (Guru Putri)</option>
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
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                    {guru.nama?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{guru.nama}</div>
                    <div className="text-xs text-gray-400">{guru.no_wa || 'No WA belum diisi'}</div>
                    <div className="text-xs text-blue-500 mt-0.5">{jumlahSantri} santri</div>
                  </div>
                </div>
                <div className="flex gap-2">
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
