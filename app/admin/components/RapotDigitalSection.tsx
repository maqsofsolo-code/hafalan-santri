'use client'
import { getKelasOptions, jenjangLabel } from '../utils'
import type { useAdminRapot } from '../hooks/useAdminRapot'

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
const btnPrimary = "text-white px-6 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shadow transition"

type Rapot = ReturnType<typeof useAdminRapot>

// Tab "Rapot Digital" -- dipindah dari app/admin/page.tsx (Modularisasi
// Tahap 6A). JSX/className identik dengan sebelumnya, 4 sub-tab (Periode,
// Input Nilai, Rekap Kelas, Download). Business logic TIDAK
// diubah/diperbaiki sama sekali (Rapot Digital belum final).
export function RapotDigitalSection(props: {
  rapot: Rapot
  loading: boolean
  successMsg: string
  errorMsg: string
  bukaLaporanHTML: (url: string) => void
}) {
  const { rapot, loading, successMsg, errorMsg, bukaLaporanHTML } = props

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Rapot Digital</h2>
          <p className="text-blue-100 text-sm mt-1">Kelola periode, input nilai & download rapot</p>
        </div>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          { id: 'periode', label: 'Periode' },
          { id: 'input', label: 'Input Nilai' },
          { id: 'rekap', label: 'Rekap Kelas' },
          { id: 'download', label: 'Download' },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => rapot.handleSelectRapotTab(tab.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition border-2 ${rapot.rapotActiveTab === tab.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: PERIODE */}
      {rapot.rapotActiveTab === 'periode' && (
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">Daftar Periode Rapot</h3>
            <button onClick={() => { rapot.resetFormPeriode(); rapot.setShowFormPeriode(true) }}
              className={btnPrimary} style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
              + Tambah
            </button>
          </div>

          {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {successMsg}</div>}

          {rapot.showFormPeriode && (
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 mb-4">
              <h4 className="font-bold text-gray-800 mb-3">{rapot.editPeriodeId ? 'Edit Periode' : 'Tambah Periode Baru'}</h4>
              <div className="space-y-3">
                <input placeholder="Nama Periode (misal: Semester Genap 2025/2026)"
                  value={rapot.formPeriodeNama} onChange={e => rapot.setFormPeriodeNama(e.target.value)} className={inputClass} />
                <input placeholder="Tahun Ajaran (misal: 1446-1447 H / 2025-2026 M)"
                  value={rapot.formPeriodeTahunAjaran} onChange={e => rapot.setFormPeriodeTahunAjaran(e.target.value)} className={inputClass} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Semester</label>
                    <select value={rapot.formPeriodeSemester} onChange={e => rapot.setFormPeriodeSemester(e.target.value)} className={inputClass}>
                      <option value="ganjil">Ganjil</option>
                      <option value="genap">Genap</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tanggal Rapot</label>
                    <input type="date" value={rapot.formPeriodeTanggal} onChange={e => rapot.setFormPeriodeTanggal(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-xl border border-blue-200">
                  <div onClick={() => rapot.setFormPeriodeAktif(!rapot.formPeriodeAktif)}
                    className={`w-10 h-5 rounded-full transition-all flex-shrink-0 ${rapot.formPeriodeAktif ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-all ${rapot.formPeriodeAktif ? 'ml-5' : 'ml-0.5'}`} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-700">Jadikan Periode Aktif</div>
                    <div className="text-xs text-gray-400">Guru akan input nilai untuk periode ini</div>
                  </div>
                </label>
              </div>
              {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
              <div className="flex gap-2 mt-4">
                <button onClick={rapot.editPeriodeId ? rapot.handleUpdatePeriode : rapot.handleTambahPeriode} disabled={loading}
                  className={btnPrimary} style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                  {loading ? 'Menyimpan...' : rapot.editPeriodeId ? 'Update' : 'Simpan'}
                </button>
                <button onClick={() => { rapot.setShowFormPeriode(false); rapot.resetFormPeriode() }}
                  className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {rapot.periodeList.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm">Belum ada periode — klik Tambah</div>
            )}
            {rapot.periodeList.map(p => (
              <div key={p.id} className={`p-4 rounded-xl border-2 ${p.is_aktif ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-white'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                      {p.nama}
                      {p.is_aktif && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Aktif</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {p.tahun_ajaran} • Semester {p.semester.charAt(0).toUpperCase() + p.semester.slice(1)}
                      {p.tanggal_rapot && ` • ${new Date(p.tanggal_rapot).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => rapot.handleEditPeriode(p)} className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</button>
                    <button onClick={() => rapot.handleHapusPeriode(p.id)} className="text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: INPUT NILAI */}
      {rapot.rapotActiveTab === 'input' && (
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-1">Input Nilai Rapot</h3>
          <p className="text-xs text-gray-400 mb-4">Admin bisa input nilai semua santri termasuk alumni & data lama</p>

          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Pilih Periode</label>
            <select value={rapot.rapotInputPeriodeId}
              onChange={e => rapot.handleSelectRapotInputPeriode(e.target.value)}
              className={inputClass}>
              <option value="">-- Pilih Periode --</option>
              {rapot.periodeList.map(p => (
                <option key={p.id} value={p.id}>{p.nama}{p.is_aktif ? ' (Aktif)' : ''}</option>
              ))}
            </select>
          </div>

          {rapot.rapotInputPeriodeId && (
            <>
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">Pilih Santri</label>
                <input type="text" value={rapot.rapotInputSearch}
                  onChange={e => rapot.setRapotInputSearch(e.target.value)}
                  placeholder="Cari nama santri (aktif & alumni)..." className={inputClass + ' mb-2'} />
                {rapot.rapotInputSearch && !rapot.rapotInputSantri && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {rapot.rapotInputSantriList
                      .filter(s => s.nama.toLowerCase().includes(rapot.rapotInputSearch.toLowerCase()))
                      .map(s => (
                        <button key={s.id} onClick={() => rapot.handlePilihRapotInputSantri(s)} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b last:border-0 text-sm">
                          <span className="font-medium">{s.nama}</span>
                          <span className="text-gray-400 text-xs ml-2">{s.kelas || '-'}</span>
                          <span className={`text-xs ml-2 px-1.5 py-0.5 rounded-full ${s.status === 'aktif' ? 'bg-green-100 text-green-700' : s.status === 'alumni' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                            {s.status}
                          </span>
                        </button>
                      ))}
                    {rapot.rapotInputSantriList.filter(s => s.nama.toLowerCase().includes(rapot.rapotInputSearch.toLowerCase())).length === 0 &&
                      <div className="px-4 py-3 text-sm text-gray-400">Tidak ditemukan</div>}
                  </div>
                )}

                {rapot.rapotInputSantri && (
                  <div className="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-200 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-800">{rapot.rapotInputSantri.nama}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {rapot.rapotInputSantri.kelas || '-'} • {rapot.rapotInputSantri.total_hafalan_juz?.toFixed(2)} Juz
                        <span className={`ml-2 px-1.5 py-0.5 rounded-full ${rapot.rapotInputSantri.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {rapot.rapotInputSantri.status}
                        </span>
                      </div>
                      {rapot.rapotExistingId && <div className="text-xs text-green-600 mt-0.5">✓ Data sudah ada — akan diupdate</div>}
                    </div>
                    <button onClick={rapot.handleBatalkanRapotInputSantri} className="text-gray-400 text-xl ml-3">×</button>
                  </div>
                )}
              </div>

              {rapot.rapotInputSantri && (
                <div className="mb-4 p-4 bg-yellow-50 rounded-xl border border-yellow-300">
                  <p className="text-sm font-bold text-gray-700 mb-1">📌 Kelas Saat Periode Ini</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Pilih kelas santri <strong>pada saat periode rapot berlangsung</strong>.
                    Untuk alumni, pilih kelas lama mereka (misal: kelas 1, 2, dst).
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Jenjang saat itu</label>
                      <select value={rapot.rapotJenjangSnapshot}
                        onChange={e => rapot.handleGantiRapotJenjangSnapshot(e.target.value)}
                        className={inputClass}>
                        <option value="ula">Ula (Kelas 1-6)</option>
                        <option value="wustha">Wustha (Kelas 7-9)</option>
                        <option value="ulya">Ulya (Kelas 10-12)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Kelas saat itu</label>
                      <select value={rapot.rapotKelasSnapshot}
                        onChange={e => rapot.handleGantiRapotKelasSnapshot(e.target.value)}
                        className={inputClass}>
                        <option value="">-- Pilih Kelas --</option>
                        {getKelasOptions(rapot.rapotJenjangSnapshot).map(k => (
                          <option key={k} value={k}>Kelas {k}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {rapot.rapotKelasSnapshot && (
                    <div className="mt-2 p-2 bg-white rounded-lg border border-yellow-200 text-xs text-yellow-800">
                      Rapot ini untuk: <strong>Kelas {rapot.rapotKelasSnapshot} {jenjangLabel(rapot.rapotJenjangSnapshot)}</strong>
                      {rapot.rapotExistingId
                        ? <span className="ml-2 text-green-600">✓ Data sudah ada</span>
                        : <span className="ml-2 text-gray-400">— belum ada data</span>
                      }
                    </div>
                  )}
                </div>
              )}

              {rapot.rapotInputSantri && rapot.rapotKelasSnapshot && (
                <>
                  <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-sm font-bold text-gray-700 mb-3">A. Hifzhul Qur&apos;an</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Kelancaran (60-95)</label>
                        <input type="number" min="60" max="95" value={rapot.rapotNilai.kelancaran || ''}
                          onChange={e => rapot.setRapotNilai({...rapot.rapotNilai, kelancaran: e.target.value})}
                          placeholder="misal: 85" className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tajwid (60-95)</label>
                        <input type="number" min="60" max="95" value={rapot.rapotNilai.tajwid || ''}
                          onChange={e => rapot.setRapotNilai({...rapot.rapotNilai, tajwid: e.target.value})}
                          placeholder="misal: 80" className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Keterangan Hafalan</label>
                      <input type="text" value={rapot.rapotNilai.keterangan_hafalan || ''}
                        onChange={e => rapot.setRapotNilai({...rapot.rapotNilai, keterangan_hafalan: e.target.value})}
                        placeholder="misal: 3,5 juz dari An-Nas hingga Al-Qomar" className={inputClass} />
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-sm font-bold text-gray-700 mb-3">B. Materi Diiniyyah</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'aqidah', label: 'Aqidah' },
                        { key: 'akhlak', label: 'Akhlak/Adab' },
                        { key: 'fiqh', label: 'Fiqh' },
                        { key: 'bhs_arab', label: 'Bahasa Arab' },
                        { key: 'siroh', label: 'Siroh' },
                        { key: 'khoth', label: 'Khoth' },
                      ].map(m => (
                        <div key={m.key}>
                          <label className="block text-xs text-gray-500 mb-1">{m.label}</label>
                          <input type="number" min="60" max="95" value={rapot.rapotNilai[m.key] || ''}
                            onChange={e => rapot.setRapotNilai({...rapot.rapotNilai, [m.key]: e.target.value})}
                            placeholder="60-95" className={inputClass} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <p className="text-sm font-bold text-gray-700 mb-3">C. Materi Umum</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'bhs_indonesia', label: 'Bahasa Indonesia' },
                        { key: 'berhitung', label: 'Berhitung' },
                        { key: 'ipa', label: 'IPA' },
                        { key: 'ips', label: 'IPS' },
                      ].map(m => (
                        <div key={m.key}>
                          <label className="block text-xs text-gray-500 mb-1">{m.label}</label>
                          <input type="number" min="60" max="95" value={rapot.rapotNilai[m.key] || ''}
                            onChange={e => rapot.setRapotNilai({...rapot.rapotNilai, [m.key]: e.target.value})}
                            placeholder="60-95" className={inputClass} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <p className="text-sm font-bold text-gray-700 mb-3">Kepribadian</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: 'akhlak_kepribadian', label: 'Akhlak' },
                        { key: 'kebersihan', label: 'Kebersihan' },
                        { key: 'ketertiban', label: 'Ketertiban' },
                      ].map(m => (
                        <div key={m.key}>
                          <label className="block text-xs text-gray-500 mb-1">{m.label}</label>
                          <select value={rapot.rapotNilai[m.key] || 'B'}
                            onChange={e => rapot.setRapotNilai({...rapot.rapotNilai, [m.key]: e.target.value})}
                            className={inputClass}>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-sm font-bold text-gray-700 mb-3">Ketidakhadiran</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: 'hadir_sakit', label: 'Sakit' },
                        { key: 'hadir_izin', label: 'Izin' },
                        { key: 'hadir_alpha', label: 'Tanpa Izin' },
                      ].map(m => (
                        <div key={m.key}>
                          <label className="block text-xs text-gray-500 mb-1">{m.label}</label>
                          <input type="number" min="0" value={rapot.rapotNilai[m.key] ?? 0}
                            onChange={e => rapot.setRapotNilai({...rapot.rapotNilai, [m.key]: e.target.value})}
                            className={inputClass} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-teal-50 rounded-xl border border-teal-200">
                    <p className="text-sm font-bold text-gray-700 mb-3">Ekstrakurikuler</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Renang (pertemuan)</label>
                        <input type="number" min="0" value={rapot.rapotNilai.ekskul_renang || ''}
                          onChange={e => rapot.setRapotNilai({...rapot.rapotNilai, ekskul_renang: e.target.value})}
                          placeholder="misal: 8" className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Beladiri</label>
                        <input type="text" value={rapot.rapotNilai.ekskul_beladiri || ''}
                          onChange={e => rapot.setRapotNilai({...rapot.rapotNilai, ekskul_beladiri: e.target.value})}
                          placeholder="keterangan" className={inputClass} />
                      </div>
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan Guru</label>
                    <textarea value={rapot.rapotNilai.catatan || ''}
                      onChange={e => rapot.setRapotNilai({...rapot.rapotNilai, catatan: e.target.value})}
                      placeholder="misal: Alhamdulillah terus semangat..." rows={2} className={inputClass} />
                  </div>

                  {rapot.rapotInputMsg && (
                    <div className={`p-3 rounded-xl mb-4 text-sm ${rapot.rapotInputMsg.startsWith('✓') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                      {rapot.rapotInputMsg}
                    </div>
                  )}

                  <button onClick={rapot.handleSimpanRapotAdmin} disabled={rapot.rapotInputLoading}
                    className="w-full text-white py-4 rounded-xl font-bold text-base shadow disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                    {rapot.rapotInputLoading ? 'Menyimpan...' : rapot.rapotExistingId ? '✓ Update Nilai Rapot' : '✓ Simpan Nilai Rapot'}
                  </button>
                </>
              )}

              {rapot.rapotInputSantri && !rapot.rapotKelasSnapshot && (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl text-center text-sm text-yellow-700">
                  ⬆ Pilih kelas santri saat periode ini untuk mulai input nilai
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: REKAP KELAS */}
      {rapot.rapotActiveTab === 'rekap' && (
        <div>
          <div className="bg-white rounded-2xl shadow p-5 mb-4 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Rekap Nilai Kelas</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Periode</label>
                <select value={rapot.rapotRekapPeriodeId}
                  onChange={e => rapot.handleGantiRapotRekapPeriode(e.target.value)}
                  className={inputClass}>
                  <option value="">-- Pilih Periode --</option>
                  {rapot.periodeList.map(p => <option key={p.id} value={p.id}>{p.nama}{p.is_aktif ? ' (Aktif)' : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
                  <select value={rapot.rapotRekapJenjang}
                    onChange={e => rapot.handleGantiRapotRekapJenjang(e.target.value)}
                    className={inputClass}>
                    <option value="ula">Ula</option>
                    <option value="wustha">Wustha</option>
                    <option value="ulya">Ulya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Kelas</label>
                  <select value={rapot.rapotRekapKelas}
                    onChange={e => rapot.handleGantiRapotRekapKelas(e.target.value)}
                    className={inputClass}>
                    <option value="">-- Pilih Kelas --</option>
                    {getKelasOptions(rapot.rapotRekapJenjang).map(k => (
                      <option key={k} value={k}>Kelas {k}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <button onClick={rapot.fetchRekapKelas}
              disabled={!rapot.rapotRekapPeriodeId || !rapot.rapotRekapKelas || rapot.rapotRekapLoading}
              className="w-full text-white py-3 rounded-xl font-bold text-sm shadow disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
              {rapot.rapotRekapLoading ? 'Memuat...' : '🔍 Tampilkan Rekap Nilai'}
            </button>
          </div>

          {rapot.rapotRekapData.length > 0 && (
            <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 flex justify-between items-center"
                style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                <div>
                  <h3 className="text-white font-bold">Rekap Kelas {rapot.rapotRekapKelas} {jenjangLabel(rapot.rapotRekapJenjang)}</h3>
                  <p className="text-blue-200 text-xs mt-0.5">{rapot.rapotRekapData.length} santri • {rapot.periodeList.find(p => p.id === rapot.rapotRekapPeriodeId)?.nama}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table style={{ minWidth: '900px', width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#f0f4ff' }}>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', width: '35px' }}>No</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', minWidth: '130px' }}>Nama Santri</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Klancaran</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Tajwid</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Aqidah</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Akhlak</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Fiqh</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Bhs Arab</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Siroh</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Khoth</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe' }}>Rata D</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Bhs Ind</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Hitung</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>IPA</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>IPS</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe' }}>Rata U</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: '#fef3c7', fontWeight: 'bold' }}>Rata Akhir</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: '#fef3c7', fontWeight: 'bold' }}>Peringkat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rapot.rapotRekapData.map((n, i) => {
                      const isComplete = n.rata_akhir > 0
                      return (
                        <tr key={n.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                          <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{i + 1}</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>
                            <div style={{ fontWeight: '600' }}>{n.santri?.nama || '-'}</div>
                            {n.santri?.status !== 'aktif' && (
                              <div style={{ fontSize: '10px', color: '#d97706' }}>{n.santri?.status}</div>
                            )}
                          </td>
                          {[n.kelancaran, n.tajwid].map((v, idx) => (
                            <td key={idx} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', color: v ? '#1e3a8a' : '#ccc' }}>
                              {v ?? '-'}
                            </td>
                          ))}
                          {[n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].map((v, idx) => (
                            <td key={idx} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', color: v ? (v < 60 ? '#dc2626' : '#166534') : '#ccc' }}>
                              {v ?? '-'}
                            </td>
                          ))}
                          <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe', fontWeight: 'bold', color: '#1e3a8a' }}>
                            {n.rata_diiniyyah ? n.rata_diiniyyah.toFixed(1) : '-'}
                          </td>
                          {[n.bhs_indonesia, n.berhitung, n.ipa, n.ips].map((v, idx) => (
                            <td key={idx} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', color: v ? (v < 60 ? '#dc2626' : '#166534') : '#ccc' }}>
                              {v ?? '-'}
                            </td>
                          ))}
                          <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe', fontWeight: 'bold', color: '#1e3a8a' }}>
                            {n.rata_umum ? n.rata_umum.toFixed(1) : '-'}
                          </td>
                          <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#fef9c3', fontWeight: 'bold', fontSize: '12px', color: isComplete ? '#92400e' : '#ccc' }}>
                            {n.rata_akhir ? n.rata_akhir.toFixed(1) : '-'}
                          </td>
                          <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#fef9c3' }}>
                            {isComplete ? (
                              <span style={{
                                background: n.peringkat === 1 ? '#fbbf24' : n.peringkat === 2 ? '#9ca3af' : n.peringkat === 3 ? '#f97316' : '#e5e7eb',
                                color: n.peringkat <= 3 ? 'white' : '#374151',
                                padding: '2px 8px', borderRadius: '999px', fontWeight: 'bold', fontSize: '11px'
                              }}>
                                {n.peringkat}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f0f4ff', fontWeight: 'bold' }}>
                      <td colSpan={2} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>Rata-rata Kelas</td>
                      {(['kelancaran','tajwid','aqidah','akhlak','fiqh','bhs_arab','siroh','khoth'] as const).map((field) => {
                        const vals = rapot.rapotRekapData.map((n) => n[field]).filter((v): v is number => v != null && v > 0)
                        const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-'
                        return <td key={field} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{avg}</td>
                      })}
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe' }}>
                        {(() => {
                          const vals = rapot.rapotRekapData.map((n) => n.rata_diiniyyah).filter((v): v is number => v != null && v > 0)
                          return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-'
                        })()}
                      </td>
                      {(['bhs_indonesia','berhitung','ipa','ips'] as const).map((field) => {
                        const vals = rapot.rapotRekapData.map((n) => n[field]).filter((v): v is number => v != null && v > 0)
                        const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-'
                        return <td key={field} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{avg}</td>
                      })}
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#fef9c3' }}>
                        {(() => {
                          const vals = rapot.rapotRekapData.map((n) => n.rata_akhir).filter((v) => v != null && v > 0)
                          return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-'
                        })()}
                      </td>
                      <td style={{ border: '1px solid #ddd' }}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="p-4">
                <p className="text-xs text-gray-400">
                  Nilai merah = di bawah 60 • Peringkat dihitung dari Rata-rata Akhir (Diiniyyah + Umum) / 2
                </p>
              </div>
            </div>
          )}

          {rapot.rapotRekapData.length === 0 && !rapot.rapotRekapLoading && rapot.rapotRekapPeriodeId && rapot.rapotRekapKelas && (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow border border-gray-100">
              Belum ada data nilai untuk kelas ini
            </div>
          )}
        </div>
      )}

      {/* TAB: DOWNLOAD */}
      {rapot.rapotActiveTab === 'download' && (
        <div className="space-y-4">

          <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-1">Download Per Kelas</h3>
            <p className="text-xs text-gray-400 mb-4">Semua rapot santri dalam satu kelas digabung jadi 1 file</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Periode</label>
                <select value={rapot.rapotPeriodeId} onChange={e => rapot.setRapotPeriodeId(e.target.value)} className={inputClass}>
                  <option value="">-- Pilih Periode --</option>
                  {rapot.periodeList.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
                  <select value={rapot.rapotJenjang} onChange={e => { rapot.setRapotJenjang(e.target.value); rapot.setRapotKelas('') }} className={inputClass}>
                    <option value="ula">Ula</option>
                    <option value="wustha">Wustha</option>
                    <option value="ulya">Ulya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Kelas</label>
                  <select value={rapot.rapotKelas} onChange={e => rapot.setRapotKelas(e.target.value)} className={inputClass}>
                    <option value="">-- Pilih Kelas --</option>
                    {getKelasOptions(rapot.rapotJenjang).map(k => <option key={k} value={k}>Kelas {k}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (!rapot.rapotPeriodeId || !rapot.rapotKelas) { alert('Pilih periode dan kelas dulu!'); return }
                bukaLaporanHTML(`/api/rapot-pdf?periode_id=${rapot.rapotPeriodeId}&jenjang=${rapot.rapotJenjang}&kelas=${rapot.rapotKelas}`)
              }}
              disabled={!rapot.rapotPeriodeId || !rapot.rapotKelas}
              className="w-full text-white py-3 rounded-xl font-bold text-sm shadow disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
              📄 Download Rapot Satu Kelas
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-1">Download Per Santri</h3>
            <p className="text-xs text-gray-400 mb-4">Download rapot satu santri saja</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Periode</label>
                <select value={rapot.rapotPeriodeId} onChange={e => rapot.setRapotPeriodeId(e.target.value)} className={inputClass}>
                  <option value="">-- Pilih Periode --</option>
                  {rapot.periodeList.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cari Santri</label>
                <input type="text" value={rapot.rapotDownloadSearch}
                  onChange={e => rapot.setRapotDownloadSearch(e.target.value)}
                  placeholder="Ketik nama santri..." className={inputClass + ' mb-2'} />
                {rapot.rapotDownloadSearch && !rapot.rapotDownloadSantri && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                    {rapot.rapotInputSantriList
                      .filter(s => s.nama.toLowerCase().includes(rapot.rapotDownloadSearch.toLowerCase()))
                      .map(s => (
                        <button key={s.id} onClick={() => rapot.handlePilihRapotDownloadSantri(s)} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b last:border-0 text-sm">
                          <span className="font-medium">{s.nama}</span>
                          <span className="text-gray-400 text-xs ml-2">{s.kelas || '-'}</span>
                          <span className={`text-xs ml-2 px-1.5 py-0.5 rounded-full ${s.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {s.status}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
                {rapot.rapotDownloadSantri && (
                  <div className="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-200 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-800">{rapot.rapotDownloadSantri.nama}</div>
                      <div className="text-xs text-gray-500">{rapot.rapotDownloadSantri.kelas || '-'}</div>
                    </div>
                    <button onClick={rapot.handleBatalkanRapotDownloadSantri}
                      className="text-gray-400 text-xl">×</button>
                  </div>
                )}
              </div>

              {rapot.rapotDownloadSantri && (
                <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2">📌 Kelas saat periode ini (penting untuk alumni)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={rapot.rapotDownloadJenjang}
                      onChange={e => rapot.handleGantiRapotDownloadJenjang(e.target.value)}
                      className={inputClass}>
                      <option value="ula">Ula</option>
                      <option value="wustha">Wustha</option>
                      <option value="ulya">Ulya</option>
                    </select>
                    <select value={rapot.rapotDownloadKelas}
                      onChange={e => rapot.setRapotDownloadKelas(e.target.value)}
                      className={inputClass}>
                      <option value="">-- Kelas --</option>
                      {getKelasOptions(rapot.rapotDownloadJenjang).map(k => (
                        <option key={k} value={k}>Kelas {k}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  if (!rapot.rapotPeriodeId || !rapot.rapotDownloadSantri) { alert('Pilih periode dan santri dulu!'); return }
                  const params = new URLSearchParams({
                    periode_id: rapot.rapotPeriodeId,
                    santri_id: rapot.rapotDownloadSantri.id,
                    jenjang: rapot.rapotDownloadJenjang,
                    kelas: rapot.rapotDownloadKelas || rapot.rapotDownloadSantri.kelas_num?.toString() || '',
                  })
                  bukaLaporanHTML(`/api/rapot-pdf?${params}`)
                }}
                disabled={!rapot.rapotPeriodeId || !rapot.rapotDownloadSantri}
                className="w-full text-white py-3 rounded-xl font-bold text-sm shadow disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                📄 Download Rapot Periode Ini
              </button>

              <button
                onClick={() => {
                  if (!rapot.rapotDownloadSantri) { alert('Pilih santri dulu!'); return }
                  bukaLaporanHTML(`/api/rapot-pdf?santri_id=${rapot.rapotDownloadSantri.id}&mode=lengkap`)
                }}
                disabled={!rapot.rapotDownloadSantri}
                className="w-full text-white py-3 rounded-xl font-bold text-sm shadow disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #92400e, #d97706)' }}>
                📚 Download Semua Rapot (Lengkap)
              </button>
              <p className="text-xs text-gray-400 text-center">Semua rapot dari kelas 1 hingga terakhir dalam 1 file</p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
            <p className="text-xs text-blue-700">💡 <strong>Tips:</strong> Setelah halaman terbuka, tekan <strong>Ctrl+P</strong> lalu pilih <strong>Save as PDF</strong> untuk menyimpan file PDF.</p>
          </div>
        </div>
      )}
    </div>
  )
}
