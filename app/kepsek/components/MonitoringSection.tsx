'use client'
import { getKelasOptions } from '../utils'
import type { Guru } from '../types'
import type { useKepsekMonitoring } from '../hooks/useKepsekMonitoring'

const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

type Monitoring = ReturnType<typeof useKepsekMonitoring>

// Tab "Monitoring Harian" -- dipindah dari app/kepsek/page.tsx (Modularisasi
// Tahap 7A). JSX/className identik dengan sebelumnya.
export function MonitoringSection(props: { today: string, guruList: Guru[] } & Monitoring) {
  const {
    today, guruList,
    monitoringTanggal, handleUbahTanggalMonitoring,
    filterMonitoringJenjang, setFilterMonitoringJenjang, filterMonitoringKelas, setFilterMonitoringKelas,
    searchMonitoring, setSearchMonitoring, loadingMonitoring,
    santriSudahSetorFiltered, santriHadirTidakSetorFiltered, santriTidakHadirFiltered,
    santriBelumDiinputFiltered, santriPerluPerhatianFiltered, santriMonitoringFiltered,
    guruAbsenSubuhTanggal, guruAbsenPagiTanggal, setoranTanggalDipilih,
  } = props

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Monitoring Setoran</h2>
          <p className="text-blue-200 text-sm mt-1">Lihat data per tanggal</p>
        </div>
      </div>

      {/* Filter & Tanggal */}
      <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">📅 Tanggal</label>
            <input type="date" value={monitoringTanggal}
              onChange={e => handleUbahTanggalMonitoring(e.target.value)}
              max={today} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
            <select value={filterMonitoringJenjang} onChange={e => { setFilterMonitoringJenjang(e.target.value); setFilterMonitoringKelas('semua') }} className={inputClass}>
              <option value="semua">Semua</option>
              <option value="ula">Ula</option>
              <option value="wustha">Wustha</option>
              <option value="ulya">Ulya</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kelas</label>
            <select value={filterMonitoringKelas} onChange={e => setFilterMonitoringKelas(e.target.value)} className={inputClass}>
              <option value="semua">Semua</option>
              {getKelasOptions(filterMonitoringJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cari Santri</label>
            <input type="text" value={searchMonitoring} onChange={e => setSearchMonitoring(e.target.value)}
              placeholder="Nama santri..." className={inputClass} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Tanggal: <span className="font-semibold text-gray-600">{new Date(monitoringTanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </p>
          {loadingMonitoring && <span className="text-xs text-blue-500">Memuat...</span>}
        </div>
      </div>

      {/* Statistik tanggal dipilih */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Sudah Setor', count: santriSudahSetorFiltered.length, color: 'from-green-500 to-green-700' },
          { label: 'Hadir, Tdk Setor', count: santriHadirTidakSetorFiltered.length, color: 'from-orange-500 to-orange-700' },
          { label: 'Tidak Hadir', count: santriTidakHadirFiltered.length, color: 'from-yellow-500 to-yellow-700' },
          { label: 'Belum Diinput', count: santriBelumDiinputFiltered.length, color: 'from-red-500 to-red-700' },
          { label: 'Hadir Subuh', count: guruAbsenSubuhTanggal.length, color: 'from-blue-500 to-blue-700' },
          { label: 'Hadir Pagi', count: guruAbsenPagiTanggal.length, color: 'from-purple-500 to-purple-700' },
        ].map((item, i) => (
          <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow-lg text-white relative overflow-hidden`}>
            <div className="absolute -bottom-2 -right-2 text-5xl opacity-10">◆</div>
            <div className="text-3xl font-bold">{item.count}</div>
            <div className="font-semibold text-xs mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">Progress Setoran</span>
          <span className="text-sm font-bold" style={{ color: '#2563a8' }}>
            {santriMonitoringFiltered.length > 0 ? Math.round((santriSudahSetorFiltered.length / santriMonitoringFiltered.length) * 100) : 0}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div className="h-4 rounded-full" style={{ width: `${santriMonitoringFiltered.length > 0 ? (santriSudahSetorFiltered.length / santriMonitoringFiltered.length) * 100 : 0}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{santriSudahSetorFiltered.length} dari {santriMonitoringFiltered.length} santri</p>
      </div>

      {/* Absensi Guru tanggal dipilih */}
      <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3 text-sm">Absensi Guru</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Subuh', list: guruAbsenSubuhTanggal, color: 'bg-blue-500' },
            { label: 'Pagi', list: guruAbsenPagiTanggal, color: 'bg-green-500' },
          ].map((sesi, si) => (
            <div key={si} className="p-3 bg-gray-50 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-600">Sesi {sesi.label}</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{sesi.list.length}/{guruList.length}</span>
              </div>
              {guruList.map(g => (
                <div key={g.id} className="flex items-center gap-1.5 py-1">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sesi.list.includes(g.id) ? 'bg-green-500' : 'bg-red-400'}`} />
                  <span className="text-xs text-gray-600 flex-1 truncate">{g.nama}</span>
                  <span className={`text-xs font-semibold ${sesi.list.includes(g.id) ? 'text-green-500' : 'text-red-400'}`}>
                    {sesi.list.includes(g.id) ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Daftar Santri */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
            <h3 className="text-white font-semibold text-sm">Sudah Setor ({santriSudahSetorFiltered.length})</h3>
          </div>
          <div className="p-3 max-h-80 overflow-y-auto">
            {santriSudahSetorFiltered.map(s => {
              const setoran = setoranTanggalDipilih.filter(x => x.santri_id === s.id)
              return (
                <div key={s.id} className="py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                      {s.nama?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{s.nama}</div>
                      <div className="text-xs text-gray-400">{s.kelas || '-'} • {s.guru?.nama || '-'}</div>
                    </div>
                    <span className="text-green-500 text-xs font-semibold flex-shrink-0">✓ {setoran.length}x</span>
                  </div>
                  {setoran.map(st => (
                    <div key={st.id} className="ml-10 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {st.jenis === 'baru' ? 'Baru' : 'Murojaah'} — {st.status === 'lancar' ? '✓ Lancar' : '✗ Rosib'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
            {santriSudahSetorFiltered.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada</p>}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-700">
            <h3 className="text-white font-semibold text-sm">Perlu Perhatian ({santriPerluPerhatianFiltered.length})</h3>
          </div>
          <div className="p-3 max-h-80 overflow-y-auto">
            {santriPerluPerhatianFiltered.map(s => {
              const badge =
                s.kategoriSetor === 'hadir_tidak_setor' ? { label: 'Hadir, Tdk Setor', color: 'bg-orange-100 text-orange-700' }
                : s.kategoriSetor === 'sakit' ? { label: 'Sakit', color: 'bg-yellow-100 text-yellow-700' }
                : s.kategoriSetor === 'izin' ? { label: 'Izin', color: 'bg-blue-100 text-blue-700' }
                : s.kategoriSetor === 'alpha' ? { label: 'Alpha', color: 'bg-red-100 text-red-700' }
                : { label: 'Belum Diinput', color: 'bg-gray-200 text-gray-600' }
              return (
                <div key={s.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-gray-400">
                    {s.nama?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{s.nama}</div>
                    <div className="text-xs text-gray-400">{s.kelas || '-'} • {s.guru?.nama || '-'}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.color}`}>{badge.label}</span>
                </div>
              )
            })}
            {santriPerluPerhatianFiltered.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Semua sudah setor!</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
