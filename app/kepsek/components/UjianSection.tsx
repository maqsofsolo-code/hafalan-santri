'use client'
import { getKelasOptions } from '../utils'
import type { useKepsekUjian } from '../hooks/useKepsekUjian'
import type { KalenderAkademik } from '../types'

const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

type Ujian = ReturnType<typeof useKepsekUjian>

// Tab "Rekap Nilai Ujian" -- dipindah dari app/kepsek/page.tsx (Modularisasi
// Tahap 7A). JSX/className identik dengan sebelumnya.
export function UjianSection(props: { nilaiUjianTotal: number, isUjian: boolean | null, kalenderAktif: KalenderAkademik | null } & Ujian) {
  const {
    nilaiUjianTotal, isUjian, kalenderAktif,
    rekapNilaiPerKelas, filterUjianJenjang, setFilterUjianJenjang, filterUjianKelas, setFilterUjianKelas,
    nilaiUjianFiltered,
  } = props

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Rekap Nilai Ujian</h2>
          <p className="text-orange-200 text-sm mt-1">{nilaiUjianTotal} nilai tercatat</p>
          {isUjian && <p className="text-orange-100 text-xs mt-0.5">{kalenderAktif?.nama} sedang berlangsung</p>}
        </div>
      </div>

      {rekapNilaiPerKelas.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3">Rata-rata Nilai per Kelas</h3>
          <div className="space-y-2">
            {rekapNilaiPerKelas.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-800">{item.kelas}</div>
                  <div className="text-xs text-gray-400">{item.count} santri sudah diuji</div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div className="h-1.5 rounded-full" style={{ width: `${(item.rata / 10) * 100}%`, background: item.rata >= 8 ? 'linear-gradient(135deg, #166534, #16a34a)' : item.rata >= 6 ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #dc2626, #ef4444)' }} />
                  </div>
                </div>
                <div className={`text-xl font-bold flex-shrink-0 ${item.rata >= 8 ? 'text-green-600' : item.rata >= 6 ? 'text-yellow-600' : 'text-red-600'}`}>{item.rata}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Filter Jenjang</label>
            <select value={filterUjianJenjang} onChange={e => { setFilterUjianJenjang(e.target.value); setFilterUjianKelas('semua') }} className={inputClass}>
              <option value="semua">Semua Jenjang</option>
              <option value="ula">Ula</option>
              <option value="wustha">Wustha</option>
              <option value="ulya">Ulya</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Filter Kelas</label>
            <select value={filterUjianKelas} onChange={e => setFilterUjianKelas(e.target.value)} className={inputClass}>
              <option value="semua">Semua Kelas</option>
              {getKelasOptions(filterUjianJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">{nilaiUjianFiltered.length} nilai ditampilkan</p>
      </div>

      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>
          <h3 className="text-white font-bold">Detail Nilai Per Santri</h3>
          <p className="text-orange-200 text-xs mt-0.5">Diurutkan dari terbaru</p>
        </div>
        <div className="p-4 space-y-3">
          {nilaiUjianFiltered.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data nilai ujian</p>}
          {nilaiUjianFiltered.map((item) => (
            <div key={item.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>
                    {item.santri?.nama?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-800">{item.santri?.nama}</div>
                    <div className="text-xs text-gray-400">{item.santri?.kelas || '-'} • Guru: {item.guru?.nama || '-'}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.surah_mulai?.nama_latin} → {item.surah_selesai?.nama_latin} • {item.tanggal}</div>
                  </div>
                </div>
                <div className={`text-2xl font-bold flex-shrink-0 ${item.nilai_akhir >= 8 ? 'text-green-600' : item.nilai_akhir >= 6 ? 'text-yellow-600' : 'text-red-600'}`}>{item.nilai_akhir}</div>
              </div>
              <div className="mt-2 flex gap-3 text-xs text-gray-400">
                <span>Tegur: <span className="font-semibold text-gray-600">{item.jumlah_tegur}</span></span>
                <span>Tahu Ayat: <span className="font-semibold text-gray-600">{item.jumlah_tahu_ayat}</span></span>
                <span>Lupa: <span className="font-semibold text-gray-600">{item.jumlah_lupa}</span></span>
              </div>
              {item.catatan && <div className="mt-1 p-2 bg-orange-50 rounded-lg text-xs text-orange-700">{item.catatan}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
