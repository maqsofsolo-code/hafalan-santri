'use client'
import { getKelasOptions, hitungTotalJuzAwal, kelasLabel } from '../utils'
import type { Guru, Santri, Surah, Wali } from '../types'
import type { useAdminEntityForm } from '../hooks/useAdminEntityForm'
import type { useAdminSantri } from '../hooks/useAdminSantri'

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
const btnPrimary = "text-white px-6 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shadow transition"

type EntityForm = ReturnType<typeof useAdminEntityForm>
type SantriHandlers = ReturnType<typeof useAdminSantri>

// Tab "Data Santri" -- dipindah dari app/admin/page.tsx (Modularisasi Tahap
// 6A). JSX/className identik dengan sebelumnya.
export function SantriSection(props: {
  form: EntityForm
  santriHandlers: SantriHandlers
  santriList: Santri[]
  santriFiltered: Santri[]
  guruList: Guru[]
  waliList: Wali[]
  surahList: Surah[]
  filterJenjang: string
  setFilterJenjang: (v: string) => void
  filterKelas: string
  setFilterKelas: (v: string) => void
  filterGuruId: string
  setFilterGuruId: (v: string) => void
  filterJenisKelas: string
  setFilterJenisKelas: (v: string) => void
  searchSantri: string
  setSearchSantri: (v: string) => void
}) {
  const {
    form, santriHandlers, santriList, santriFiltered, guruList, waliList, surahList,
    filterJenjang, setFilterJenjang, filterKelas, setFilterKelas,
    filterGuruId, setFilterGuruId, filterJenisKelas, setFilterJenisKelas,
    searchSantri, setSearchSantri,
  } = props

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Data Santri</h2>
          <p className="text-gray-400 text-xs">{santriList.length} santri terdaftar</p>
        </div>
        <button onClick={() => { form.resetForm(); form.setShowForm(true); form.setFormType('santri') }}
          className={btnPrimary} style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>+ Tambah Santri</button>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
            <select value={filterJenjang} onChange={e => { setFilterJenjang(e.target.value); setFilterKelas('semua') }} className={inputClass}>
              <option value="semua">Semua</option>
              <option value="ula">Ula</option>
              <option value="wustha">Wustha</option>
              <option value="ulya">Ulya</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kelas</label>
            <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className={inputClass}>
              <option value="semua">Semua</option>
              {getKelasOptions(filterJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Guru</label>
            <select value={filterGuruId} onChange={e => setFilterGuruId(e.target.value)} className={inputClass}>
              <option value="semua">Semua Guru</option>
              {guruList.map(g => (<option key={g.id} value={g.id}>{g.nama}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Jenis Kelas</label>
            <select value={filterJenisKelas} onChange={e => setFilterJenisKelas(e.target.value)} className={inputClass}>
              <option value="semua">Semua</option>
              <option value="banin">Banin</option>
              <option value="banat">Banat</option>
              <option value="tn_a">TN A</option>
              <option value="tn_b">TN B</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cari Nama</label>
            <input type="text" value={searchSantri} onChange={e => setSearchSantri(e.target.value)}
              placeholder="Cari santri..." className={inputClass} />
          </div>
        </div>
        <p className="text-xs text-gray-400">Menampilkan <span className="font-semibold text-gray-600">{santriFiltered.length}</span> dari {santriList.length} santri</p>
      </div>

      {form.successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {form.successMsg}</div>}

      {form.showForm && form.formType === 'santri' && (
        <div className="bg-white p-5 rounded-2xl shadow-md mb-5 border border-gray-100">
          <h3 className="font-bold text-base mb-4">{form.editSantriId ? 'Edit Data Santri' : 'Tambah Santri Baru'}</h3>
          <div className="space-y-3">
            <input placeholder="Nama Santri *" value={form.formNama} onChange={e => form.setFormNama(e.target.value)} className={inputClass} />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Jenis Kelas</label>
              <select value={form.formJenisKelas} onChange={e => form.setFormJenisKelas(e.target.value)} className={inputClass}>
                {form.formJenjang !== 'ulya' && <>
                  <option value="banin">Banin (Putra)</option>
                  <option value="banat">Banat (Putri)</option>
                </>}
                {form.formJenjang === 'ulya' && <>
                  <option value="banin">Banin (Putra)</option>
                  <option value="tn_a">TN A (Putri - Kelas A)</option>
                  <option value="tn_b">TN B (Putri - Kelas B)</option>
                </>}
                {!form.formJenjang && <>
                  <option value="banin">Banin (Putra)</option>
                  <option value="banat">Banat (Putri)</option>
                </>}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.formJenjang} onChange={e => { form.setFormJenjang(e.target.value); form.setFormKelasNum('') }} className={inputClass}>
                <option value="">-- Jenjang *</option>
                <option value="ula">Ula</option>
                <option value="wustha">Wustha</option>
                <option value="ulya">Ulya</option>
              </select>
              {form.formJenjang ? (
                <select value={form.formKelasNum} onChange={e => form.setFormKelasNum(e.target.value)} className={inputClass}>
                  <option value="">-- Kelas *</option>
                  {getKelasOptions(form.formJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
                </select>
              ) : <div className={inputClass + ' text-gray-400 flex items-center'}>Pilih jenjang dulu</div>}
            </div>

            {/* KOREKSI Tahap 9L: Guru Hafalan hanya boleh DIPILIH saat Tambah
                Santri (santri baru pasti belum punya assignment apa pun untuk
                ditimpa). Saat Edit, ditampilkan read-only -- perubahan Guru
                Hafalan HANYA lewat menu Penugasan Guru (Tahap 9K Bagian D
                Opsi A), supaya assignment manual di sana tidak pernah
                tertimpa tanpa sadar dari layar ini. */}
            {!form.editSantriId ? (
              <div className="grid grid-cols-2 gap-3">
                <select value={form.formGuruId} onChange={e => form.setFormGuruId(e.target.value)} className={inputClass}>
                  <option value="">-- Pilih Guru Hafalan 1</option>
                  {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
                <select value={form.formGuruId2} onChange={e => form.setFormGuruId2(e.target.value)} className={inputClass}>
                  <option value="">-- Guru Hafalan 2 (Opsional)</option>
                  {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500">
                  Guru Hafalan saat ini: <span className="font-semibold text-gray-700">
                    {guruList.find(g => g.id === form.formGuruId)?.nama || '-'}
                    {form.formGuruId2 && `, ${guruList.find(g => g.id === form.formGuruId2)?.nama || '-'}`}
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Guru Hafalan dikelola melalui menu Penugasan Guru.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <select value={form.formWaliId} onChange={e => form.setFormWaliId(e.target.value)} className={inputClass}>
                <option value="">-- Pilih Wali</option>
                {waliList.map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
              </select>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">📋 Data Identitas (Opsional)</p>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="NIK" value={form.formNik} onChange={e => form.setFormNik(e.target.value)} className={inputClass} />
                  <input placeholder="No. Induk / NISN" value={form.formNisn} onChange={e => form.setFormNisn(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Tempat Lahir" value={form.formTempatLahir} onChange={e => form.setFormTempatLahir(e.target.value)} className={inputClass} />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tanggal Lahir</label>
                    <input type="date" value={form.formTanggalLahir} onChange={e => form.setFormTanggalLahir(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <textarea placeholder="Alamat lengkap" value={form.formAlamat} onChange={e => form.setFormAlamat(e.target.value)} rows={2} className={inputClass} />
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">📌 Status Santri</p>
              <select value={form.formStatus} onChange={e => form.setFormStatus(e.target.value)} className={inputClass}>
                <option value="aktif">Aktif</option>
                <option value="alumni">Alumni (Lulus)</option>
                <option value="keluar">Keluar</option>
              </select>
              {(form.formStatus === 'alumni' || form.formStatus === 'keluar') && (
                <div className="mt-2 space-y-2">
                  <input placeholder="Tahun lulus / keluar (misal: 2024/2025)"
                    value={form.formTahunLulus} onChange={e => form.setFormTahunLulus(e.target.value)} className={inputClass} />
                  <input placeholder="Keterangan (opsional)"
                    value={form.formKeteranganKeluar} onChange={e => form.setFormKeteranganKeluar(e.target.value)} className={inputClass} />
                </div>
              )}
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                {form.editSantriId ? 'Update Data Hafalan' : 'Hafalan Awal Santri'}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                {form.editSantriId ? 'Kosongkan jika tidak ingin mengubah.' : 'Dari surah mana sampai surah mana yang sudah dihafal'}
              </p>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select value={form.formSurahAwal} onChange={e => form.setFormSurahAwal(e.target.value)} className={inputClass}>
                    <option value="">Surah Awal</option>
                    {surahList.map(s => <option key={s.nomor} value={s.nomor}>{s.nomor}. {s.nama_latin}</option>)}
                  </select>
                  <input type="number" placeholder="Ayat mulai" value={form.formAyatAwal} onChange={e => form.setFormAyatAwal(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={form.formSurahAkhir} onChange={e => {
                    form.setFormSurahAkhir(e.target.value)
                    const s = surahList.find(s => s.nomor === parseInt(e.target.value))
                    if (s) form.setFormAyatAkhir(String(s.jumlah_ayat))
                  }} className={inputClass}>
                    <option value="">Surah Akhir</option>
                    {surahList.map(s => <option key={s.nomor} value={s.nomor}>{s.nomor}. {s.nama_latin}</option>)}
                  </select>
                  <input type="number" placeholder="Ayat selesai" value={form.formAyatAkhir} onChange={e => form.setFormAyatAkhir(e.target.value)} className={inputClass} />
                </div>
              </div>
              {form.formSurahAwal && form.formSurahAkhir && (
                <div className="mt-2 p-2 bg-white rounded-lg text-xs text-blue-700 font-semibold">
                  Total hafalan: ≈ {hitungTotalJuzAwal(surahList, form.formSurahAwal, form.formSurahAkhir).toFixed(2)} Juz
                </div>
              )}
              {form.editSantriId && !form.formSurahAwal && !form.formSurahAkhir && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-500">Hafalan tidak akan diubah</div>
              )}
            </div>
          </div>
          {form.errorMsg && <p className="text-red-500 mt-2 text-sm">{form.errorMsg}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={form.editSantriId ? santriHandlers.handleUpdateSantri : santriHandlers.handleTambahSantri} disabled={form.loading}
              className={btnPrimary} style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
              {form.loading ? 'Menyimpan...' : form.editSantriId ? 'Update' : 'Simpan'}
            </button>
            <button onClick={() => { form.setShowForm(false); form.resetForm() }} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {santriFiltered.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Tidak ada santri ditemukan</div>}
        {santriFiltered.map((santri) => (
          <div key={santri.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                  {santri.nama?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{santri.nama}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {santri.jenjang && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                        {santri.kelas || kelasLabel(santri.kelas_num, santri.jenjang, santri.jenis_kelas)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{santri.total_hafalan_juz?.toFixed(2) || 0} Juz</span>
                    <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}{santri.guru_id_2 && ` & ${guruList.find(g => g.id === santri.guru_id_2)?.nama || ''}`}</span>
                    {santri.nisn && <span className="text-xs text-gray-400">NIS: {santri.nisn}</span>}
                  </div>
                  {(santri.tempat_lahir || santri.tanggal_lahir) && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {santri.tempat_lahir}{santri.tanggal_lahir && `, ${new Date(santri.tanggal_lahir).toLocaleDateString('id-ID')}`}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => santriHandlers.handleEditSantri(santri)} className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</button>
                <button onClick={() => santriHandlers.handleHapusSantri(santri.id)} className="text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
