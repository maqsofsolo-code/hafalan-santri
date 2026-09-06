'use client'
import React, { useEffect } from 'react'
import { useRapotDigital } from '../hooks/useRapotDigital'
import { MATA_PELAJARAN_ULA_DINIYYAH, MATA_PELAJARAN_ULA_UMUM } from '../../lib/rapotDigital'

export function RapotDigitalSection(props?: { rapot?: ReturnType<typeof useRapotDigital> }) {
  const localRapot = useRapotDigital()
  const rapot = props?.rapot || localRapot

  useEffect(() => {
    rapot.fetchPeriodeAktif()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inputDibuka = rapot.periodeAktif?.rapot_input_dibuka ?? false

  const formatJenisKelas = (jk?: string | null) => {
    if (!jk) return ''
    if (jk === 'banin') return 'Banin'
    if (jk === 'banat') return 'Banat'
    if (jk === 'tn_a') return 'TN A'
    if (jk === 'tn_b') return 'TN B'
    return jk
  }

  const formatJenjang = (j?: string | null) => {
    if (!j) return ''
    return j.toUpperCase()
  }

  const inputClass = "w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none transition disabled:bg-gray-100 disabled:text-gray-400"

  // Kelas terpilih untuk rekap
  const selectedAssign = rapot.assignments.find(a => a.kelas_num.toString() === rapot.rapotRekapKelas)
    || rapot.assignments[0]

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header Info */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <span>📝</span> Rapot Digital Santri
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Pengelolaan nilai hasil belajar santri per periode akademik resmi Daarus Salaf.
          </p>
        </div>

        {/* Periode Aktif Card */}
        <div className="p-3 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl text-white shadow-md">
          <div className="text-xs text-blue-200 font-medium">Periode Akademik Aktif</div>
          {rapot.periodeAktif ? (
            <div className="mt-0.5">
              <span className="font-bold text-sm">
                {rapot.periodeAktif.tahun_ajaran} — Semester {rapot.periodeAktif.semester}
              </span>
              <p className="text-blue-300 text-xs mt-0.5">
                {inputDibuka ? '🟢 Jendela Input Nilai Terbuka' : '🔒 Jendela Input Nilai Tertutup'}
              </p>
            </div>
          ) : (
            <p className="text-blue-300 text-xs mt-2">
              {rapot.contextLoading ? 'Memuat periode akademik...' : 'Belum ada periode akademik aktif'}
            </p>
          )}
        </div>
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
          <p className="text-yellow-600 text-sm mt-1">Minta admin untuk mengaktifkan periode akademik.</p>
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

      {/* CLOSED WINDOW: HARD-CLOSE STATE (Guard B & 9) */}
      {!rapot.contextLoading && !rapot.contextError && rapot.periodeAktif && !inputDibuka && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-8 text-center shadow-sm mb-4">
          <div className="text-4xl mb-3">🔒</div>
          <h3 className="font-bold text-amber-900 text-lg">Input Nilai Rapot Sedang Ditutup</h3>
          <p className="text-amber-700 text-sm mt-1 max-w-md mx-auto">
            Admin belum membuka jendela input nilai rapot untuk periode ini.
          </p>
        </div>
      )}

      {/* JENDELA DIBUKA: Render Tab Navigation, Input Form & Rekap */}
      {!rapot.contextLoading && !rapot.contextError && rapot.periodeAktif && inputDibuka && rapot.assignments.length > 0 && (
        <div>
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

          {/* TAB: INPUT NILAI */}
          {rapot.rapotActiveTab === 'input' && (
            <div className="space-y-4">
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

              {/* Jenjang Non-Ula Message */}
              {rapot.selectedAssignment && rapot.selectedAssignment.jenjang !== 'ula' && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 text-center">
                  <div className="text-3xl mb-2">🚧</div>
                  <h3 className="font-bold text-amber-900 text-base">Jenjang {formatJenjang(rapot.selectedAssignment.jenjang)} Belum Tersedia</h3>
                  <p className="text-amber-700 text-sm mt-1 max-w-md mx-auto">
                    Daftar mata pelajaran jenjang ini belum dikonfigurasi. Modul Rapot Digital saat ini baru diaktifkan untuk Jenjang Ula.
                  </p>
                </div>
              )}

              {/* Daftar Santri & Form Input (Hanya untuk Ula) */}
              {rapot.selectedAssignment && rapot.selectedAssignment.jenjang === 'ula' && (
                <div>
                  {/* Step 1: Daftar Santri */}
                  {!rapot.selectedSantri && (
                    <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                        <div>
                          <h3 className="font-bold text-gray-800">Daftar Santri Kelas {rapot.selectedAssignment.kelas_num} {formatJenisKelas(rapot.selectedAssignment.jenis_kelas)}</h3>
                          <p className="text-xs text-gray-500">Pilih santri untuk memasukkan atau mengedit nilai rapot.</p>
                        </div>
                        <div className="text-xs font-semibold px-3 py-1 bg-gray-100 rounded-full text-gray-600">
                          {rapot.santriList.filter(s => s.has_nilai).length} / {rapot.santriList.length} Sudah Diinput
                        </div>
                      </div>

                      {rapot.santriListLoading ? (
                        <div className="text-center py-8 text-gray-400">Memuat daftar santri...</div>
                      ) : rapot.santriList.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">Tidak ada santri aktif di kelas ini.</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {rapot.santriList.map((s, idx) => (
                            <div
                              key={s.id}
                              onClick={() => rapot.handleSelectSantri(s)}
                              className="p-3.5 rounded-xl border-2 border-gray-100 hover:border-blue-300 bg-gray-50 hover:bg-blue-50/50 cursor-pointer transition flex flex-col justify-between"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-xs font-bold text-gray-400 mr-1.5">{idx + 1}.</span>
                                  <span className="font-bold text-gray-800 text-sm">{s.nama}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.has_nilai ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                                  {s.has_nilai ? '✓ Sudah Input' : 'Belum Input'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 flex justify-between items-center mt-2 pt-2 border-t border-gray-200/60">
                                <span>NISN: {s.nisn || '-'}</span>
                                <span className="text-blue-600 font-semibold text-xs">Pilih →</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Form Input Nilai Santri */}
                  {rapot.selectedSantri && (
                    <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                      {/* Santri Selected Header */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 mb-5 border-b border-gray-100">
                        <div>
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Input Nilai Rapot Santri</span>
                          <h3 className="text-xl font-black text-gray-900">{rapot.selectedSantri.nama}</h3>
                          <p className="text-xs text-gray-500">
                            NISN: {rapot.selectedSantri.nisn || '-'} • Kelas {rapot.selectedAssignment.kelas_num} {formatJenisKelas(rapot.selectedAssignment.jenis_kelas)}
                          </p>
                          {rapot.existingRapotId && (
                            <span className="inline-block mt-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              Mode Edit Nilai yang Sudah Ada
                            </span>
                          )}
                        </div>
                        <button
                          onClick={rapot.handleBatalSantri}
                          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-semibold"
                        >
                          ← Kembali ke Daftar
                        </button>
                      </div>

                      {/* Section A: Hifzhul Qur'an (Otomatis dari Ujian Hifzh) */}
                      <div className="mb-4 p-4 bg-emerald-50/70 rounded-xl border border-emerald-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-emerald-900">A. Hifzhul Qur'an</span>
                          <span className="text-xs bg-emerald-200 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">Otomatis dari Raport Hifzh</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-700">
                          <div className="bg-white p-3 rounded-lg border border-emerald-100">
                            <span className="text-gray-500 block">Kelancaran</span>
                            <span className="text-base font-bold text-emerald-800">
                              {rapot.selectedSantri.nilai?.kelancaran ?? (rapot.selectedSantri as any).hifzh_otomatis?.kelancaran ?? '-'}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-emerald-100">
                            <span className="text-gray-500 block">Tajwid</span>
                            <span className="text-base font-bold text-emerald-800">
                              {rapot.selectedSantri.nilai?.tajwid ?? (rapot.selectedSantri as any).hifzh_otomatis?.tajwid ?? '-'}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-emerald-100">
                            <span className="text-gray-500 block">Jumlah Hafalan</span>
                            <span className="text-base font-bold text-emerald-800">
                              {rapot.selectedSantri.nilai?.keterangan_hafalan ?? (rapot.selectedSantri as any).hifzh_otomatis?.keterangan_hafalan ?? '-'}
                            </span>
                          </div>
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
                              >
                                <option value="A">A (Sangat Baik)</option>
                                <option value="B">B (Baik)</option>
                                <option value="C">C (Cukup)</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section: Ketidakhadiran (Otomatis dari Setoran) */}
                      <div className="mb-4 p-4 bg-amber-50/60 rounded-xl border border-amber-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold text-amber-900">Ketidakhadiran</p>
                          <span className="text-xs bg-amber-200 text-amber-800 px-2.5 py-0.5 rounded-full font-semibold">Otomatis dari Setoran</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-white p-3 rounded-lg border border-amber-100 text-center">
                            <span className="text-xs text-gray-500 block mb-0.5">Sakit</span>
                            <span className="text-lg font-bold text-amber-900">{rapot.nilaiRapot.hadir_sakit ?? 0}</span>
                            <span className="text-xs text-gray-400 ml-1">hari</span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-amber-100 text-center">
                            <span className="text-xs text-gray-500 block mb-0.5">Izin</span>
                            <span className="text-lg font-bold text-amber-900">{rapot.nilaiRapot.hadir_izin ?? 0}</span>
                            <span className="text-xs text-gray-400 ml-1">hari</span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-amber-100 text-center">
                            <span className="text-xs text-gray-500 block mb-0.5">Tanpa Keterangan (Alpha)</span>
                            <span className="text-lg font-bold text-amber-900">{rapot.nilaiRapot.hadir_alpha ?? 0}</span>
                            <span className="text-xs text-gray-400 ml-1">hari</span>
                          </div>
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
                          disabled={rapot.rapotLoading}
                          className="flex-1 text-white py-3.5 rounded-xl font-bold text-base shadow-lg disabled:opacity-50 transition"
                          style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}
                        >
                          {rapot.rapotLoading
                            ? 'Menyimpan ke Server...'
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
          {rapot.rapotActiveTab === 'rekap' && (
            <div>
              <div className="bg-white rounded-2xl shadow p-5 mb-4 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-1">Rekap Nilai Kelas</h3>
                <p className="text-gray-500 text-xs mb-4">Pilih kelas yang Anda ampu untuk melihat rekapitulasi nilai rapot dan mengunduh Excel.</p>
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
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => rapot.fetchRekapKelasByGuru(rapot.rapotRekapKelas)}
                    disabled={!rapot.rapotRekapKelas || rapot.rapotRekapLoading}
                    className="flex-1 text-white py-3 rounded-xl font-bold text-sm shadow disabled:opacity-50 transition"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}
                  >
                    {rapot.rapotRekapLoading ? 'Memuat Data...' : '🔍 Tampilkan Rekap Nilai'}
                  </button>
                  {selectedAssign && (
                    <button
                      onClick={() => rapot.downloadExcelKelas(selectedAssign)}
                      disabled={rapot.downloadExcelLoading}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      <span>📊</span>
                      <span>{rapot.downloadExcelLoading ? 'Mengunduh...' : 'Unduh Rapot Excel (.xlsx) Satu Kelas'}</span>
                    </button>
                  )}
                </div>
              </div>

              {rapot.rapotRekapData.length > 0 && (
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 flex justify-between items-center" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                    <div>
                      <h3 className="text-white font-bold">Rekap Kelas {rapot.rapotRekapKelas}</h3>
                      <p className="text-blue-200 text-xs mt-0.5">{rapot.rapotRekapData.length} santri • {rapot.periodeAktif.tahun_ajaran} Smt {rapot.periodeAktif.semester}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table style={{ minWidth: '1050px', width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
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
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: '#e0e7ff' }}>Rata Akhir</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: '#e0e7ff' }}>Peringkat</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Status</th>
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
                            <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', background: '#f5f7ff' }}>
                              {n.rata_akhir ?? '-'}
                            </td>
                            <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: n.peringkat ? '#1d4ed8' : '#9ca3af' }}>
                              {n.peringkat ? `Ke-${n.peringkat}` : '-'}
                            </td>
                            <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${n.lengkap ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {n.lengkap ? 'Lengkap' : 'Belum Lengkap'}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {/* Rata-Rata Kelas Row */}
                        <tr style={{ background: '#fef3c7', fontWeight: 'bold' }}>
                          <td colSpan={2} style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                            RATA-RATA KELAS
                          </td>
                          {['aqidah', 'akhlak', 'fiqh', 'bhs_arab', 'siroh', 'khoth', 'bhs_indonesia', 'berhitung', 'ipa', 'ips'].map(k => {
                            const vals = rapot.rapotRekapData
                              .map(r => (r as any)[k])
                              .filter((v): v is number => typeof v === 'number')
                            const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-'
                            return (
                              <td key={k} style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                                {avg}
                              </td>
                            )
                          })}
                          <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                            {(() => {
                              const vals = rapot.rapotRekapData
                                .map(r => r.rata_akhir)
                                .filter((v): v is number => typeof v === 'number')
                              return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-'
                            })()}
                          </td>
                          <td colSpan={2} style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>-</td>
                        </tr>
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
      )}
    </div>
  )
}
