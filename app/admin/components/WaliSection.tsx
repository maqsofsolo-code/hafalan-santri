'use client'
import { FormEmailPassword } from './FormEmailPassword'
import type { Santri, Wali } from '../types'
import type { useAdminEntityForm } from '../hooks/useAdminEntityForm'
import type { useAdminGuruWali } from '../hooks/useAdminGuruWali'

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
const btnPrimary = "text-white px-6 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shadow transition"

type EntityForm = ReturnType<typeof useAdminEntityForm>
type GuruWaliHandlers = ReturnType<typeof useAdminGuruWali>

// Tab "Data Wali" -- dipindah dari app/admin/page.tsx (Modularisasi Tahap
// 6A). JSX/className identik dengan sebelumnya, termasuk import Excel Wali.
export function WaliSection(props: {
  form: EntityForm
  guruWali: GuruWaliHandlers
  waliList: Wali[]
  waliFiltered: Wali[]
  santriList: Santri[]
  searchWali: string
  setSearchWali: (v: string) => void
}) {
  const { form, guruWali, waliList, waliFiltered, santriList, searchWali, setSearchWali } = props

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Data Wali</h2>
          <p className="text-gray-400 text-xs">{waliList.length} wali terdaftar</p>
        </div>
        <button onClick={() => { form.resetForm(); form.setShowForm(true); form.setFormType('wali') }}
          className={btnPrimary} style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>+ Tambah Wali</button>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
        <input type="text" value={searchWali} onChange={e => setSearchWali(e.target.value)}
          placeholder="🔍 Cari nama atau no. WA wali..." className={inputClass} />
        <p className="text-xs text-gray-400 mt-2">Menampilkan {waliFiltered.length} dari {waliList.length} wali</p>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
        <p className="text-sm font-semibold text-gray-700 mb-1">Import Data Wali dari Excel</p>
        <p className="text-xs text-gray-400 mb-3">Kolom: nama_wali, email_wali, no_wa_wali, password, nama_santri</p>
        <label className="w-full text-white px-4 py-3 rounded-xl font-semibold text-sm text-center cursor-pointer shadow flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
          {guruWali.importWaliLoading ? 'Mengimport...' : '⬆ Upload File Excel Wali'}
          <input type="file" accept=".xlsx,.xls" onChange={guruWali.handleImportWali} className="hidden" disabled={guruWali.importWaliLoading} />
        </label>
        {guruWali.importWaliMsg && (
          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-700 text-xs whitespace-pre-line">
            {guruWali.importWaliMsg}
          </div>
        )}
      </div>

      {form.successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {form.successMsg}</div>}
      {form.showForm && form.formType === 'wali' && (
        <div className="bg-white p-5 rounded-2xl shadow-md mb-5 border border-gray-100">
          <h3 className="font-bold text-base mb-4">{form.editWaliId ? 'Edit Data Wali' : 'Tambah Wali Baru'}</h3>
          <div className="space-y-3">
            <input placeholder="Nama Wali" value={form.formNama} onChange={e => form.setFormNama(e.target.value)} className={inputClass} />
            <input placeholder="No WhatsApp" value={form.formNoWa} onChange={e => form.setFormNoWa(e.target.value)} className={inputClass} />
            <FormEmailPassword
              isEdit={!!form.editWaliId}
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
            <button onClick={form.editWaliId ? guruWali.handleUpdateWali : guruWali.handleTambahWali} disabled={form.loading}
              className={btnPrimary} style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
              {form.loading ? 'Menyimpan...' : form.editWaliId ? 'Update' : 'Simpan'}
            </button>
            <button onClick={() => { form.setShowForm(false); form.resetForm() }} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {waliFiltered.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Tidak ada wali ditemukan</div>}
        {waliFiltered.map((wali) => {
          const santriWali = santriList.filter(s => s.wali_id === wali.id)
          return (
            <div key={wali.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
                    {wali.nama?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{wali.nama}</div>
                    <div className="text-xs text-gray-400">{wali.no_wa || 'No WA belum diisi'}</div>
                    {santriWali.length > 0 && (
                      <div className="text-xs text-purple-500 mt-0.5">
                        Wali dari: {santriWali.map(s => s.nama).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => guruWali.handleEditWali(wali)} className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</button>
                  <button onClick={() => guruWali.handleHapusWali(wali.id)} className="text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
