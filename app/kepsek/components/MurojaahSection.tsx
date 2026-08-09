'use client'
import { getKelasOptions } from '../utils'
import type { useKepsekMurojaah } from '../hooks/useKepsekMurojaah'

const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

type Murojaah = ReturnType<typeof useKepsekMurojaah>

// Tab "Monitor Murojaah" -- dipindah dari app/kepsek/page.tsx (Modularisasi
// Tahap 7A). JSX/className identik dengan sebelumnya.
export function MurojaahSection(props: { today: string } & Murojaah) {
  const {
    today,
    murojaahTanggal, handleUbahTanggalMurojaah,
    filterMurojaahJenjang, setFilterMurojaahJenjang, filterMurojaahKelas, setFilterMurojaahKelas,
    searchMurojaah, setSearchMurojaah, loadingMurojaah, hasilMonitorMurojaah,
  } = props

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #6b21a8 0%, #9333ea 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Monitor Murojaah</h2>
          <p className="text-purple-200 text-sm mt-1">Pantau kesesuaian target murojaah</p>
        </div>
      </div>

      {/* Filter & Tanggal Murojaah */}
      <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">📅 Tanggal</label>
            <input type="date" value={murojaahTanggal}
              onChange={e => handleUbahTanggalMurojaah(e.target.value)}
              max={today} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
            <select value={filterMurojaahJenjang} onChange={e => { setFilterMurojaahJenjang(e.target.value); setFilterMurojaahKelas('semua') }} className={inputClass}>
              <option value="semua">Semua</option>
              <option value="ula">Ula</option>
              <option value="wustha">Wustha</option>
              <option value="ulya">Ulya</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kelas</label>
            <select value={filterMurojaahKelas} onChange={e => setFilterMurojaahKelas(e.target.value)} className={inputClass}>
              <option value="semua">Semua</option>
              {getKelasOptions(filterMurojaahJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cari Santri</label>
            <input type="text" value={searchMurojaah} onChange={e => setSearchMurojaah(e.target.value)}
              placeholder="Nama santri..." className={inputClass} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Tanggal: <span className="font-semibold text-gray-600">{new Date(murojaahTanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </p>
          {loadingMurojaah && <span className="text-xs text-purple-500">Memuat...</span>}
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Sesuai Target', count: hasilMonitorMurojaah.filter(s => s.persentase >= 80).length, color: 'from-green-500 to-green-700' },
          { label: 'Kurang', count: hasilMonitorMurojaah.filter(s => s.sudahMurojaah && s.persentase < 80).length, color: 'from-yellow-500 to-yellow-700' },
          { label: 'Belum Murojaah', count: hasilMonitorMurojaah.filter(s => !s.sudahMurojaah).length, color: 'from-gray-400 to-gray-600' },
        ].map((item, i) => (
          <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow text-white relative overflow-hidden`}>
            <div className="absolute -bottom-2 -right-2 text-5xl opacity-10">◆</div>
            <div className="text-2xl font-bold">{item.count}</div>
            <div className="font-semibold text-xs mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Detail */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
          <h3 className="text-white font-bold">Detail Murojaah Per Santri</h3>
          <p className="text-purple-200 text-xs mt-0.5">Diurutkan dari yang paling perlu perhatian</p>
        </div>
        <div className="p-4 space-y-3">
          {hasilMonitorMurojaah.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Tidak ada data santri</p>}
          {hasilMonitorMurojaah.map((santri) => (
            <div key={santri.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
                    {santri.nama?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-800">{santri.nama}</div>
                    <div className="text-xs text-gray-400">{santri.kelas || '-'} • Guru: {santri.guru?.nama || '-'}</div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${santri.statusBg} ${santri.statusColor}`}>{santri.statusLabel}</span>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Target: <span className="font-semibold">{santri.targetHalaman.toFixed(1)} hal</span> <span className="text-gray-400">(≈ {santri.targetLembar.toFixed(1)} lembar)</span></span>
                  <span className="font-bold" style={{ color: '#9333ea' }}>{santri.persentase}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(santri.persentase, 100)}%`,
                      background: santri.persentase >= 80 ? 'linear-gradient(135deg, #166534, #16a34a)' : santri.persentase >= 50 ? 'linear-gradient(135deg, #d97706, #f59e0b)' : santri.persentase > 0 ? 'linear-gradient(135deg, #dc2626, #ef4444)' : '#e5e7eb'
                    }} />
                </div>
                {santri.sudahMurojaah && (
                  <div className="text-xs text-gray-400 mt-1">
                    Disetor: <span className="font-semibold text-gray-600">{santri.totalHalamanSetor.toFixed(1)} hal</span>
                    <span className="ml-1">(≈ {santri.totalLembarSetor.toFixed(1)} lembar)</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
