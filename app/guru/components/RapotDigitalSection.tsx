'use client'
import { useEffect } from 'react'
import type { useRapotDigital } from '../hooks/useRapotDigital'
import { MATA_PELAJARAN_ULA_DINIYYAH, MATA_PELAJARAN_ULA_UMUM } from '../../lib/rapotDigital'

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

type RapotState = ReturnType<typeof useRapotDigital>

export function RapotDigitalSection(props: { rapot: RapotState }) {
  const { rapot } = props

  useEffect(() => {
    if (!rapot.periodeAktif && !rapot.contextLoading && !rapot.contextError) {
      rapot.fetchPeriodeAktif()
    }
  }, [rapot])

  const formatJenisKelas = (jk: string) => {
    if (jk === 'banin') return 'Banin'
    if (jk === 'banat') return 'Banat'
    if (jk === 'tn_a') return 'TN A'
    if (jk === 'tn_b') return 'TN B'
    return jk.toUpperCase()
  }

  const formatJenjang = (j: string) => {
    if (j === 'ula') return 'Ula'
    if (j === 'wustha') return 'Wustha'
    if (j === 'ulya') return 'Ulya'
    return j
  }

  const inputDibuka = !!rapot.periodeAktif?.rapot_input_dibuka

  return (
    <div>
      {/* Header Banner */}
      <div className="rounded-2xl p-5 mb-4 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-xl">Input Nilai Rapot</h2>
              <p className="text-blue-100 text-sm mt-0.5">Modul Akses Wali Kelas</p>
            </div>
            {rapot.periodeAktif && (
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${inputDibuka ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                  {inputDibuka ? 'INPUT DIBUKA' : 'INPUT DITUTUP'}
                </span>
              </div>
            )}
          </div>
          {rapot.periodeAktif ? (
            <div className="mt-3 bg-white bg-opacity-20 rounded-xl px-3 py-1.5 inline-block">
              <p className="text-white text-xs font-semibold">
                Tahun Ajaran {rapot.periodeAktif.tahun_ajaran} • Semester {rapot.periodeAktif.semester === 1 ? '1 (Ganjil)' : '2 (Genap)'}
              </p>
            </div>
          ) : (
            <p className="text-blue-300 text-xs mt-2">
              {rapot.contextLoading ? 'Memuat periode akademik...' : 'Belum ada periode akademik aktif'}
            </p>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'input', label: 'Input Nilai' },
          { id: 'rekap', label: 'Rekap Kelas' },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => rapot.setRapotActiveTab(tab.id as 'input' | 'rekap')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition border-2 ${rapot.rapotActiveTab === tab.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Banner */}
      {rapot.contextError && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 text-center mb-4">
          <p className="text-red-800 font-semibold">{rapot.contextError}</p>
          <button onClick={rapot.fetchPeriodeAktif} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition">
            Coba Muat Ulang
          </button>
        </div>
      )}

      {/* Belum Ada Periode Aktif */}
      {!rapot.contextLoading && !rapot.contextError && !rapot.periodeAktif && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-5 text-center mb-4">
          <p className="text-yellow-800 font-semibold">Belum ada periode akademik aktif</p>
          <p className="text-yellow-600 text-sm mt-1">Minta admin untuk mengaktifkan periode akademik 2026/2027.</p>
          <button onClick={rapot.fetchPeriodeAktif} className="mt-3 px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-semibold hover:bg-yellow-600 transition">Cek Ulang</button>
        </div>
      )}

      {/* Guru Tanpa Penugasan Wali Kelas */}
      {!rapot.contextLoading && !rapot.contextError && rapot.periodeAktif && rapot.assignments.length === 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center mb-4">
          <div className="text-3xl mb-2">📋</div>
          <h3 className="font-bold text-gray-800 text-base">Tidak Memiliki Penugasan Wali Kelas</h3>
          <p className="text-gray-600 text-sm mt-1 max-w-md mx-auto">
            Akun Anda tidak tercatat sebagai Wali Kelas pada periode aktif ini ({rapot.periodeAktif.tahun_ajaran} Semester {rapot.periodeAktif.semester}). Modul Rapot Digital khusus diperuntukkan bagi Wali Kelas resmi.
          </p>
        </div>
      )}

      {/* TAB: INPUT NILAI */}
      {rapot.rapotActiveTab === 'input' && rapot.periodeAktif && rapot.assignments.length > 0 && (
        <div className="space-y-4">
          {/* Status Window Input Tertutup */}
          {!inputDibuka && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <div className="font-semibold text-amber-900 text-sm">Input Nilai Rapot Sedang Ditutup</div>
                <div className="text-amber-700 text-xs mt-0.5">Admin belum membuka jendela input nilai rapot untuk periode ini. Anda dapat melihat data namun belum dapat menyimpan nilai baru.</div>
              </div>
            </div>
          )}

          {/* Selector Kelas (Jika memiliki > 1 kelas) */}
          {rapot.assignments.length > 1 && (
            <div className="bg-white rounded-2xl shadow p-4 border border-gray-100">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kelas yang Anda Pegang:</label>
              <div className="flex flex-wrap gap-2">
                {rapot.assignments.map(a => {
                  const isSelected = rapot.selectedAssignment?.id === a.id
                  return (
                    <button
                      key={a.id}
                      onClick={() => rapot.handleSelectAssignment(a)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition border-2 ${isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                    >
                      Kelas {a.kelas_num} {formatJenisKelas(a.jenis_kelas)} ({formatJenjang(a.jenjang)})
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Info Kelas Terpilih (jika hanya 1 kelas) */}
          {rapot.assignments.length === 1 && rapot.selectedAssignment && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex justify-between items-center text-sm">
              <span className="font-semibold text-blue-900">
                Wali Kelas: Kelas {rapot.selectedAssignment.kelas_num} {formatJenisKelas(rapot.selectedAssignment.jenis_kelas)} ({formatJenjang(rapot.selectedAssignment.jenjang)})
              </span>
              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-medium">Aktif</span>
            </div>
          )}

          {/* KONDISI: WUSTHO / ULYA BELUM DIKONFIGURASI */}
          {rapot.selectedAssignment && rapot.selectedAssignment.jenjang !== 'ula' && (
            <div className="bg-white rounded-2xl shadow p-8 border border-gray-100 text-center">
              <div className="text-4xl mb-3">⚙️</div>
              <h3 className="font-bold text-gray-800 text-lg">Daftar mata pelajaran jenjang ini belum dikonfigurasi.</h3>
              <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
                Mata pelajaran untuk jenjang {formatJenjang(rapot.selectedAssignment.jenjang)} (Kelas {rapot.selectedAssignment.kelas_num}) belum difinalisasi oleh pihak kurikulum. Form input nilai belum tersedia untuk jenjang ini.
              </p>
            </div>
          )}

          {/* KONDISI: JENJANG ULA (KELAS 1-6) */}
          {rapot.selectedAssignment && rapot.selectedAssignment.jenjang === 'ula' && (
            <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
              {/* DAFTAR SANTRI */}
              {!rapot.selectedSantri ? (
                <div>
                  <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <div>
                      <h3 className="font-bold text-gray-800 text-base">
                        Daftar Santri Kelas {rapot.selectedAssignment.kelas_num} {formatJenisKelas(rapot.selectedAssignment.jenis_kelas)}
                      </h3>
                      <p className="text-gray-400 text-xs mt-0.5">Total: {rapot.santriList.length} santri aktif</p>
                    </div>
                    <div className="w-full sm:w-64">
                      <input
                        type="text"
                        value={rapot.searchSantri}
                        onChange={e => rapot.setSearchSantri(e.target.value)}
                        placeholder="Cari nama santri..."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                  </div>

                  {rapot.santriListLoading ? (
                    <div className="text-center py-10 text-gray-400 text-sm">Memuat daftar santri...</div>
                  ) : rapot.santriList.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">Tidak ada santri aktif di kelas ini.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 bg-gray-50">
                            <th className="py-3 px-3 w-12 text-center">No</th>
                            <th className="py-3 px-3">Nama Santri</th>
                            <th className="py-3 px-3 text-center w-36">Status Nilai</th>
                            <th className="py-3 px-3 text-center w-28">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {rapot.santriList
                            .filter(s => !rapot.searchSantri || s.nama.toLowerCase().includes(rapot.searchSantri.toLowerCase()))
                            .map((s, idx) => (
                              <tr key={s.id} className="hover:bg-blue-50/50 transition">
                                <td className="py-3 px-3 text-center text-gray-400 text-xs">{idx + 1}</td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-gray-800">{s.nama}</div>
                                  <div className="text-xs text-gray-400">NISN: {s.nisn || '-'}</div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {s.has_nilai ? (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                      ✓ Sudah Input
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                      Belum Input
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    onClick={() => rapot.handleSelectSantri(s)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${s.has_nilai ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                  >
                                    {s.has_nilai ? 'Edit' : 'Input'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                /* FORM INPUT NILAI SANTRI */
                <div>
                  {/* Header Santri Terpilih */}
                  <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-200 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Santri yang dinilai</div>
                      <div className="font-bold text-gray-800 text-lg">{rapot.selectedSantri.nama}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Kelas {rapot.selectedSantri.kelas_num} {formatJenisKelas(rapot.selectedSantri.jenis_kelas)} • NISN: {rapot.selectedSantri.nisn || '-'}
                      </div>
                      {rapot.existingRapotId ? (
                        <div className="text-xs text-emerald-600 font-semibold mt-1">✓ Nilai sudah ada — perubahan akan memperbarui nilai existing</div>
                      ) : (
                        <div className="text-xs text-amber-600 font-semibold mt-1">○ Belum ada nilai — formulir baru</div>
                      )}
                    </div>
                    <button
                      onClick={rapot.handleBatalSantri}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-semibold"
                    >
                      ← Kembali ke Daftar
                    </button>
                  </div>

                  {/* Section Hifzhul Qur'an (Informational only - manual input removed per Section 8) */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-gray-700">A. Hifzhul Qur'an</span>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">Otomatis</span>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-gray-200 text-xs text-gray-600 flex items-center gap-2">
                      <span className="text-blue-500 font-bold text-base">ℹ️</span>
                      <span>Nilai Hifzh akan diambil otomatis dari Raport Hifzh. Wali Kelas tidak perlu menginput nilai Hifzh manual.</span>
                    </div>
                  </div>

                  {/* Section B: Materi Diniyyah (6 Mapel) */}
                  <div className="mb-4 p-4 bg-blue-50/60 rounded-xl border border-blue-200">
                    <p className="text-sm font-bold text-blue-900 mb-3">B. Materi Diiniyyah (Nilai Raw 0–100)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {MATA_PELAJARAN_ULA_DINIYYAH.map(m => (
                        <div key={m.id}>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">{m.label}</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={rapot.nilaiRapot[m.id] ?? ''}
                            onChange={e => rapot.setNilaiRapot({ ...rapot.nilaiRapot, [m.id]: e.target.value })}
                            placeholder="0-100"
                            className={inputClass}
                            disabled={!inputDibuka}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section C: Materi Umum (4 Mapel) */}
                  <div className="mb-4 p-4 bg-purple-50/60 rounded-xl border border-purple-200">
                    <p className="text-sm font-bold text-purple-900 mb-3">C. Materi Umum (Nilai Raw 0–100)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {MATA_PELAJARAN_ULA_UMUM.map(m => (
                        <div key={m.id}>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">{m.label}</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={rapot.nilaiRapot[m.id] ?? ''}
                            onChange={e => rapot.setNilaiRapot({ ...rapot.nilaiRapot, [m.id]: e.target.value })}
                            placeholder="0-100"
                            className={inputClass}
                            disabled={!inputDibuka}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section: Kepribadian */}
                  <div className="mb-4 p-4 bg-orange-50/60 rounded-xl border border-orange-200">
                    <p className="text-sm font-bold text-orange-900 mb-3">Kepribadian</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { key: 'akhlak_kepribadian', label: 'Akhlak' },
                        { key: 'kebersihan', label: 'Kebersihan' },
                        { key: 'ketertiban', label: 'Ketertiban' },
                      ].map(m => (
                        <div key={m.key}>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">{m.label}</label>
                          <select
                            value={rapot.nilaiRapot[m.key] || 'B'}
                            onChange={e => rapot.setNilaiRapot({ ...rapot.nilaiRapot, [m.key]: e.target.value })}
                            className={inputClass}
                            disabled={!inputDibuka}
                          >
                            <option value="A">A (Sangat Baik)</option>
                            <option value="B">B (Baik)</option>
                            <option value="C">C (Cukup)</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section: Ketidakhadiran */}
                  <div className="mb-4 p-4 bg-red-50/60 rounded-xl border border-red-200">
                    <p className="text-sm font-bold text-red-900 mb-3">Ketidakhadiran (Hari)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { key: 'hadir_sakit', label: 'Sakit' },
                        { key: 'hadir_izin', label: 'Izin' },
                        { key: 'hadir_alpha', label: 'Tanpa Keterangan (Alpha)' },
                      ].map(m => (
                        <div key={m.key}>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">{m.label}</label>
                          <input
                            type="number"
                            min="0"
                            value={rapot.nilaiRapot[m.key] ?? 0}
                            onChange={e => rapot.setNilaiRapot({ ...rapot.nilaiRapot, [m.key]: e.target.value })}
                            className={inputClass}
                            disabled={!inputDibuka}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section: Ekstrakurikuler */}
                  <div className="mb-4 p-4 bg-teal-50/60 rounded-xl border border-teal-200">
                    <p className="text-sm font-bold text-teal-900 mb-3">Ekstrakurikuler</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Renang (Jumlah Pertemuan)</label>
                        <input
                          type="number"
                          min="0"
                          value={rapot.nilaiRapot.ekskul_renang ?? ''}
                          onChange={e => rapot.setNilaiRapot({ ...rapot.nilaiRapot, ekskul_renang: e.target.value })}
                          placeholder="misal: 8"
                          className={inputClass}
                          disabled={!inputDibuka}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Beladiri (Keterangan)</label>
                        <input
                          type="text"
                          value={rapot.nilaiRapot.ekskul_beladiri || ''}
                          onChange={e => rapot.setNilaiRapot({ ...rapot.nilaiRapot, ekskul_beladiri: e.target.value })}
                          placeholder="misal: Menguasai teknik dasar"
                          className={inputClass}
                          disabled={!inputDibuka}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section: Catatan Wali Kelas */}
                  <div className="mb-5">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Catatan Wali Kelas</label>
                    <textarea
                      value={rapot.nilaiRapot.catatan || ''}
                      onChange={e => rapot.setNilaiRapot({ ...rapot.nilaiRapot, catatan: e.target.value })}
                      placeholder="Catatan perkembangan atau motivasi belajar untuk santri..."
                      rows={3}
                      className={inputClass}
                      disabled={!inputDibuka}
                    />
                  </div>

                  {/* Status Pesan */}
                  {rapot.rapotMsg && (
                    <div className={`p-4 rounded-xl mb-4 text-sm font-medium ${rapot.rapotMsg.startsWith('✓') ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                      {rapot.rapotMsg}
                    </div>
                  )}

                  {/* Tombol Simpan */}
                  <div className="flex gap-3">
                    <button
                      onClick={rapot.handleBatalSantri}
                      type="button"
                      className="px-5 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition"
                    >
                      Batal
                    </button>
                    <button
                      onClick={rapot.handleSimpanRapot}
                      disabled={rapot.rapotLoading || !inputDibuka}
                      className="flex-1 text-white py-3.5 rounded-xl font-bold text-base shadow-lg disabled:opacity-50 transition"
                      style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}
                    >
                      {rapot.rapotLoading
                        ? 'Menyimpan ke Server...'
                        : !inputDibuka
                        ? 'Input Sedang Ditutup'
                        : rapot.existingRapotId
                        ? '✓ Update Nilai Rapot'
                        : '✓ Simpan Nilai Rapot'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: REKAP KELAS */}
      {rapot.rapotActiveTab === 'rekap' && rapot.periodeAktif && rapot.assignments.length > 0 && (
        <div>
          <div className="bg-white rounded-2xl shadow p-5 mb-4 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3">Rekap Nilai Kelas</h3>
            <p className="text-gray-500 text-xs mb-4">Pilih kelas yang Anda ampu untuk melihat rekapitulasi nilai rapot.</p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Kelas Anda</label>
              <select
                value={rapot.rapotRekapKelas}
                onChange={e => rapot.handleGantiKelasRekap(e.target.value)}
                className={inputClass}
              >
                <option value="">-- Pilih Kelas --</option>
                {rapot.assignments.map(a => (
                  <option key={a.id} value={a.kelas_num}>
                    Kelas {a.kelas_num} {formatJenisKelas(a.jenis_kelas)} ({formatJenjang(a.jenjang)})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => rapot.fetchRekapKelasByGuru(rapot.rapotRekapKelas)}
              disabled={!rapot.rapotRekapKelas || rapot.rapotRekapLoading}
              className="w-full text-white py-3 rounded-xl font-bold text-sm shadow disabled:opacity-50 transition"
              style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}
            >
              {rapot.rapotRekapLoading ? 'Memuat Data...' : '🔍 Tampilkan Rekap Nilai'}
            </button>
          </div>

          {rapot.rapotRekapData.length > 0 && (
            <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
              <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                <h3 className="text-white font-bold">Rekap Kelas {rapot.rapotRekapKelas}</h3>
                <p className="text-blue-200 text-xs mt-0.5">{rapot.rapotRekapData.length} santri • {rapot.periodeAktif.tahun_ajaran} Smt {rapot.periodeAktif.semester}</p>
              </div>
              <div className="overflow-x-auto">
                <table style={{ minWidth: '900px', width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#f0f4ff' }}>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', width: '35px' }}>No</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', minWidth: '130px' }}>Nama Santri</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Aqidah</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Akhlak</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Fiqh</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Bhs Arab</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Siroh</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Khoth</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Bhs Ind</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Hitung</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>IPA</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>IPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rapot.rapotRekapData.map((n, i) => (
                      <tr key={n.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{i + 1}</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontWeight: 600 }}>{n.santri?.nama || '-'}</td>
                        {[n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth, n.bhs_indonesia, n.berhitung, n.ipa, n.ips].map((v, idx) => (
                          <td key={idx} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', color: v ? (v < 50 ? '#dc2626' : '#166534') : '#ccc' }}>
                            {v ?? '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rapot.rapotRekapData.length === 0 && !rapot.rapotRekapLoading && rapot.rapotRekapKelas && (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow border border-gray-100">
              Belum ada data nilai untuk kelas ini
            </div>
          )}
        </div>
      )}
    </div>
  )
}
