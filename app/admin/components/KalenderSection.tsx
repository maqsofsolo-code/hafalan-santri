'use client'
import { tipeKalenderColor, tipeKalenderLabel } from '../utils'
import type { KalenderAkademik } from '../types'
import type { useAdminEntityForm } from '../hooks/useAdminEntityForm'
import type { useAdminKalender } from '../hooks/useAdminKalender'

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
const btnPrimary = "text-white px-6 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shadow transition"

type EntityForm = ReturnType<typeof useAdminEntityForm>
type KalenderHandlers = ReturnType<typeof useAdminKalender>

// Tab "Kalender Akademik" -- dipindah dari app/admin/page.tsx (Modularisasi
// Tahap 6A). JSX/className identik dengan sebelumnya.
export function KalenderSection(props: {
  form: EntityForm
  kalender: KalenderHandlers
  kalenderList: KalenderAkademik[]
  today: string
  hariMinggu: number
  isLiburMingguan: boolean
  kalenderAktif: KalenderAkademik | undefined
  isUjian: boolean | undefined
}) {
  const { form, kalender, kalenderList, today, hariMinggu, isLiburMingguan, kalenderAktif, isUjian } = props

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Kalender Akademik</h2>
          <p className="text-teal-100 text-sm mt-1">Kelola jadwal libur dan ujian</p>
          <p className="text-teal-200 text-xs mt-0.5">Jumat & Ahad = libur otomatis</p>
        </div>
      </div>
      {(isLiburMingguan || kalenderAktif) && (
        <div className={`mb-5 p-4 rounded-2xl border-2 flex items-center gap-3 ${isUjian ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'}`}>
          <span className="text-2xl">{isUjian ? '📝' : '🏖'}</span>
          <div>
            <div className={`font-bold text-sm ${isUjian ? 'text-red-800' : 'text-orange-800'}`}>
              Status: {isLiburMingguan ? (hariMinggu === 0 ? 'Ahad — Libur' : 'Jumat — Libur') : kalenderAktif?.nama}
            </div>
            <div className={`text-xs mt-0.5 ${isUjian ? 'text-red-600' : 'text-orange-600'}`}>{isUjian ? 'Mode ujian aktif' : 'Hari libur'}</div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-800">Jadwal Akademik 2026/2027</h3>
        <button onClick={() => { form.resetForm(); form.setShowForm(true); form.setFormType('kalender') }}
          className={btnPrimary} style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}>+ Tambah Jadwal</button>
      </div>
      {form.successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {form.successMsg}</div>}
      {form.showForm && form.formType === 'kalender' && (
        <div className="bg-white p-5 rounded-2xl shadow-md mb-5 border border-gray-100">
          <h3 className="font-bold text-base mb-4">{form.editKalenderId ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</h3>
          <div className="space-y-3">
            <input placeholder="Nama Jadwal" value={form.formKalNama} onChange={e => form.setFormKalNama(e.target.value)} className={inputClass} />
            <select value={form.formKalTipe} onChange={e => form.setFormKalTipe(e.target.value)} className={inputClass}>
              <option value="libur">Libur</option>
              <option value="mid_semester">Ujian Mid Semester</option>
              <option value="semester">Ujian Akhir Semester</option>
            </select>
            {form.formKalTipe !== 'libur' && (
              <select value={form.formKalSemester} onChange={e => form.setFormKalSemester(e.target.value)} className={inputClass}>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tanggal Mulai</label>
                <input type="date" value={form.formKalMulai} onChange={e => form.setFormKalMulai(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tanggal Selesai</label>
                <input type="date" value={form.formKalSelesai} onChange={e => form.setFormKalSelesai(e.target.value)} className={inputClass} />
              </div>
            </div>
            <textarea placeholder="Keterangan (opsional)" value={form.formKalKeterangan}
              onChange={e => form.setFormKalKeterangan(e.target.value)} rows={2} className={inputClass} />
          </div>
          {form.errorMsg && <p className="text-red-500 mt-2 text-sm">{form.errorMsg}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={form.editKalenderId ? kalender.handleUpdateKalender : kalender.handleTambahKalender} disabled={form.loading}
              className={btnPrimary} style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}>
              {form.loading ? 'Menyimpan...' : form.editKalenderId ? 'Update' : 'Simpan'}
            </button>
            <button onClick={() => { form.setShowForm(false); form.resetForm() }} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {kalenderList.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Belum ada jadwal</div>}
        {kalenderList.map((kal) => {
          const isAktif = today >= kal.tanggal_mulai && today <= kal.tanggal_selesai
          const isLewat = today > kal.tanggal_selesai
          return (
            <div key={kal.id} className={`bg-white rounded-xl shadow p-4 border-2 ${isAktif ? 'border-teal-400 bg-teal-50' : isLewat ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5">{kal.tipe === 'libur' ? '🏖' : kal.tipe === 'mid_semester' ? '📋' : '📝'}</div>
                  <div>
                    <div className="font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                      {kal.nama}
                      {isAktif && <span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full">Aktif</span>}
                      {isLewat && <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full">Selesai</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipeKalenderColor(kal.tipe)}`}>{tipeKalenderLabel(kal.tipe)}</span>
                      {kal.semester && <span className="text-xs text-gray-400">Semester {kal.semester}</span>}
                      <span className="text-xs text-gray-400">
                        {new Date(kal.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {new Date(kal.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {kal.keterangan && <p className="text-xs text-gray-400 mt-0.5">{kal.keterangan}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => kalender.handleEditKalender(kal)} className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</button>
                  <button onClick={() => kalender.handleHapusKalender(kal.id)} className="text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-5 p-4 bg-gray-50 rounded-2xl border border-gray-200">
        <p className="text-xs font-semibold text-gray-600 mb-2">📌 Aturan Libur Otomatis:</p>
        <div className="flex gap-4">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-400"></div><span className="text-xs text-gray-600">Jumat = libur mingguan</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-400"></div><span className="text-xs text-gray-600">Ahad = libur mingguan</span></div>
        </div>
      </div>
    </div>
  )
}
