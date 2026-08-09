'use client'
import type { Santri } from '../types'

// Tab "Perkembangan" (progress hafalan) -- dipindah dari app/wali/page.tsx
// (Modularisasi Tahap 8A). JSX/className identik dengan sebelumnya.
export function ProgressHafalanSection(props: {
  selectedSantri: Santri
  totalSetoran: number
  totalLancar: number
  totalRosib: number
  setoranBaru: number
  setoranLama: number
}) {
  const { selectedSantri, totalSetoran, totalLancar, totalRosib, setoranBaru, setoranLama } = props

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #166534 0%, #16a34a 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Perkembangan Hafalan</h2>
          <p className="text-green-200 text-sm mt-1">{selectedSantri.nama}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5 mb-4 border border-gray-100">
        <h4 className="font-bold text-gray-800 mb-4">Progress Menuju 30 Juz</h4>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Hafalan saat ini</span>
          <span className="font-bold text-green-700">{selectedSantri.total_hafalan_juz?.toFixed(2) || 0} / 30 Juz</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-6 mb-2">
          <div className="h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all"
            style={{ width: `${Math.min(((selectedSantri.total_hafalan_juz || 0) / 30) * 100, 100)}%`, background: 'linear-gradient(135deg, #166534, #16a34a)', minWidth: (selectedSantri.total_hafalan_juz || 0) > 0 ? '3rem' : '0' }}>
            {Math.round(((selectedSantri.total_hafalan_juz || 0) / 30) * 100)}%
          </div>
        </div>
        <p className="text-xs text-gray-400">Sisa {(30 - (selectedSantri.total_hafalan_juz || 0)).toFixed(1)} Juz lagi untuk khatam</p>
      </div>

      <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
        <h4 className="font-bold text-gray-800 mb-4">Statistik Setoran (30 terakhir)</h4>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Tingkat Kelancaran</span>
              <span className="font-bold text-green-700">{totalSetoran > 0 ? Math.round((totalLancar / totalSetoran) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="h-3 rounded-full transition-all" style={{ width: `${totalSetoran > 0 ? Math.round((totalLancar / totalSetoran) * 100) : 0}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{totalLancar} lancar dari {totalSetoran} setoran</p>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Hafalan Baru vs Murojaah</span>
              <span className="font-bold text-blue-700">{totalSetoran > 0 ? Math.round((setoranBaru / totalSetoran) * 100) : 0}% Baru</span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-3">
              <div className="h-3 rounded-full transition-all" style={{ width: `${totalSetoran > 0 ? Math.round((setoranBaru / totalSetoran) * 100) : 0}%`, background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{setoranBaru} hafalan baru, {setoranLama} murojaah</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { count: totalSetoran, label: 'Total Setoran', color: 'text-blue-700' },
            { count: totalLancar, label: 'Lancar', color: 'text-green-700' },
            { count: totalRosib, label: 'Rosib', color: 'text-red-600' },
          ].map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
              <div className={`text-xl font-bold ${item.color}`}>{item.count}</div>
              <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
