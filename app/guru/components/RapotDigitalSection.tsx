'use client'
import type { useRapotDigital } from '../hooks/useRapotDigital'

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

type RapotState = ReturnType<typeof useRapotDigital>

// Tab "Input Nilai Rapot" (Rapot Digital, jenjang Ula) -- dipindah dari
// app/guru/page.tsx (Modularisasi Tahap 5A). JSX/className identik, business
// logic TIDAK diubah/diperbaiki sama sekali (Rapot Digital belum final).
export function RapotDigitalSection(props: { rapot: RapotState }) {
  const { rapot } = props
  return (
    <div>
      <div className="rounded-2xl p-5 mb-4 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Input Nilai Rapot</h2>
          <p className="text-blue-200 text-sm mt-1">Jenjang Ula</p>
          {rapot.periodeAktif
            ? <div className="mt-2 bg-white bg-opacity-20 rounded-xl px-3 py-1.5 inline-block">
                <p className="text-white text-xs font-semibold">{rapot.periodeAktif.nama}</p>
                <p className="text-blue-200 text-xs">{rapot.periodeAktif.tahun_ajaran}</p>
              </div>
            : <p className="text-blue-300 text-xs mt-1">Belum ada periode aktif</p>
          }
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'input', label: 'Input Nilai' },
          { id: 'rekap', label: 'Rekap Kelas' },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => rapot.setRapotActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition border-2 ${rapot.rapotActiveTab === tab.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {!rapot.periodeAktif && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-5 text-center mb-4">
          <p className="text-yellow-800 font-semibold">Belum ada periode rapot aktif</p>
          <p className="text-yellow-600 text-sm mt-1">Minta admin untuk mengaktifkan periode rapot</p>
          <button onClick={rapot.fetchPeriodeAktif} className="mt-3 px-4 py-2 bg-yellow-400 text-white rounded-xl text-sm font-semibold">Cek Ulang</button>
        </div>
      )}

      {/* TAB INPUT NILAI */}
      {rapot.rapotActiveTab === 'input' && rapot.periodeAktif && (
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
          {/* Pilih Santri */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Santri</label>
            <input type="text" value={rapot.searchSantriRapot} onChange={e => rapot.setSearchSantriRapot(e.target.value)}
              placeholder="Cari nama santri..." className={inputClass + ' mb-2'} />
            {rapot.searchSantriRapot && (
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                {rapot.rapotSantriList.filter((s) => s.nama.toLowerCase().includes(rapot.searchSantriRapot.toLowerCase())).map((s) => (
                  <button key={s.id} onClick={() => {
                    rapot.setSelectedSantriRapot(s); rapot.setSearchSantriRapot(s.nama)
                    rapot.fetchNilaiRapotSantri(s.id)
                  }} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b last:border-0 text-sm">
                    <span className="font-medium">{s.nama}</span>
                    {s.kelas && <span className="text-gray-400 text-xs ml-2">{s.kelas}</span>}
                  </button>
                ))}
                {rapot.rapotSantriList.filter((s) => s.nama.toLowerCase().includes(rapot.searchSantriRapot.toLowerCase())).length === 0 &&
                  <div className="px-4 py-3 text-sm text-gray-400">Tidak ditemukan</div>}
              </div>
            )}
            {rapot.selectedSantriRapot && (
              <div className="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-gray-800">{rapot.selectedSantriRapot.nama}</div>
                  <div className="text-xs text-gray-500">{rapot.selectedSantriRapot.kelas} • {rapot.selectedSantriRapot.total_hafalan_juz?.toFixed(2)} Juz</div>
                  {rapot.existingRapotId && <div className="text-xs text-green-600 mt-0.5">✓ Data rapot sudah ada — akan diupdate</div>}
                </div>
                <button onClick={() => { rapot.setSelectedSantriRapot(null); rapot.setSearchSantriRapot(''); rapot.setNilaiRapot({}) }} className="text-gray-400 text-xl">×</button>
              </div>
            )}
          </div>

          {rapot.selectedSantriRapot && (
            <>
              <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-200">
                <p className="text-sm font-bold text-gray-700 mb-3">A. Hifzhul Qur'an</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Kelancaran (60-95)</label>
                    <input type="number" min="60" max="95" value={rapot.nilaiRapot.kelancaran || ''}
                      onChange={e => rapot.setNilaiRapot({...rapot.nilaiRapot, kelancaran: e.target.value})}
                      placeholder="misal: 85" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tajwid (60-95)</label>
                    <input type="number" min="60" max="95" value={rapot.nilaiRapot.tajwid || ''}
                      onChange={e => rapot.setNilaiRapot({...rapot.nilaiRapot, tajwid: e.target.value})}
                      placeholder="misal: 80" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Keterangan Hafalan</label>
                  <input type="text" value={rapot.nilaiRapot.keterangan_hafalan || ''}
                    onChange={e => rapot.setNilaiRapot({...rapot.nilaiRapot, keterangan_hafalan: e.target.value})}
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
                      <input type="number" min="60" max="95" value={rapot.nilaiRapot[m.key] || ''}
                        onChange={e => rapot.setNilaiRapot({...rapot.nilaiRapot, [m.key]: e.target.value})}
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
                      <input type="number" min="60" max="95" value={rapot.nilaiRapot[m.key] || ''}
                        onChange={e => rapot.setNilaiRapot({...rapot.nilaiRapot, [m.key]: e.target.value})}
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
                      <select value={rapot.nilaiRapot[m.key] || 'B'}
                        onChange={e => rapot.setNilaiRapot({...rapot.nilaiRapot, [m.key]: e.target.value})}
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
                      <input type="number" min="0" value={rapot.nilaiRapot[m.key] ?? 0}
                        onChange={e => rapot.setNilaiRapot({...rapot.nilaiRapot, [m.key]: e.target.value})}
                        className={inputClass} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-4 p-4 bg-teal-50 rounded-xl border border-teal-200">
                <p className="text-sm font-bold text-gray-700 mb-3">Ekstrakurikuler</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Renang (jumlah pertemuan)</label>
                    <input type="number" min="0" value={rapot.nilaiRapot.ekskul_renang || ''}
                      onChange={e => rapot.setNilaiRapot({...rapot.nilaiRapot, ekskul_renang: e.target.value})}
                      placeholder="misal: 8" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Beladiri</label>
                    <input type="text" value={rapot.nilaiRapot.ekskul_beladiri || ''}
                      onChange={e => rapot.setNilaiRapot({...rapot.nilaiRapot, ekskul_beladiri: e.target.value})}
                      placeholder="keterangan" className={inputClass} />
                  </div>
                </div>
              </div>
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan Guru</label>
                <textarea value={rapot.nilaiRapot.catatan || ''}
                  onChange={e => rapot.setNilaiRapot({...rapot.nilaiRapot, catatan: e.target.value})}
                  placeholder="misal: Alhamdulillah terus semangat belajar..." rows={2} className={inputClass} />
              </div>
              {rapot.rapotMsg && (
                <div className={`p-3 rounded-xl mb-4 text-sm ${rapot.rapotMsg.startsWith('✓') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {rapot.rapotMsg}
                </div>
              )}
              <button onClick={rapot.handleSimpanRapot} disabled={rapot.rapotLoading}
                className="w-full text-white py-4 rounded-xl font-bold text-base shadow-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                {rapot.rapotLoading ? 'Menyimpan...' : rapot.existingRapotId ? '✓ Update Nilai Rapot' : '✓ Simpan Nilai Rapot'}
              </button>
            </>
          )}
        </div>
      )}

      {/* TAB REKAP KELAS */}
      {rapot.rapotActiveTab === 'rekap' && rapot.periodeAktif && (
        <div>
          <div className="bg-white rounded-2xl shadow p-5 mb-4 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Rekap Nilai Kelas</h3>
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">Pilih Kelas</label>
              <select value={rapot.rapotRekapKelas}
                onChange={e => rapot.handleGantiKelasRekap(e.target.value)}
                className={inputClass}>
                <option value="">-- Pilih Kelas --</option>
                {[1,2,3,4,5,6].map(k => (
                  <option key={k} value={k}>Kelas {k} Ula</option>
                ))}
              </select>
            </div>
            <button onClick={() => rapot.fetchRekapKelasByGuru(rapot.rapotRekapKelas)}
              disabled={!rapot.rapotRekapKelas || rapot.rapotRekapLoading}
              className="w-full text-white py-3 rounded-xl font-bold text-sm shadow disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
              {rapot.rapotRekapLoading ? 'Memuat...' : '🔍 Tampilkan Rekap Nilai'}
            </button>
          </div>

          {rapot.rapotRekapData.length > 0 && (
            <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
              <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                <h3 className="text-white font-bold">Rekap Kelas {rapot.rapotRekapKelas} Ula</h3>
                <p className="text-blue-200 text-xs mt-0.5">{rapot.rapotRekapData.length} santri • {rapot.periodeAktif.nama}</p>
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
                          </td>
                          {[n.kelancaran, n.tajwid].map((v, idx) => (
                            <td key={idx} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', color: v ? '#1e3a8a' : '#ccc' }}>{v ?? '-'}</td>
                          ))}
                          {[n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].map((v, idx) => (
                            <td key={idx} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', color: v ? (v < 60 ? '#dc2626' : '#166534') : '#ccc' }}>{v ?? '-'}</td>
                          ))}
                          <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe', fontWeight: 'bold', color: '#1e3a8a' }}>
                            {n.rata_diiniyyah ? n.rata_diiniyyah.toFixed(1) : '-'}
                          </td>
                          {[n.bhs_indonesia, n.berhitung, n.ipa, n.ips].map((v, idx) => (
                            <td key={idx} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', color: v ? (v < 60 ? '#dc2626' : '#166534') : '#ccc' }}>{v ?? '-'}</td>
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
                              }}>{n.peringkat}</span>
                            ) : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-400">Nilai merah = di bawah 60 • Peringkat dari Rata-rata Akhir (Diiniyyah + Umum) / 2</p>
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
