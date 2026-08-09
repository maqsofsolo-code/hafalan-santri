'use client'
import { getStatusKehadiranInfo } from '../utils'
import type { SetoranRow } from '../types'

// Tab "Riwayat Setoran" (30 terakhir) -- dipindah dari app/wali/page.tsx
// (Modularisasi Tahap 8A). JSX/className identik dengan sebelumnya. Wali
// read-only -- tidak ada aksi edit/hapus di sini.
export function RiwayatSetoranSection(props: { riwayatSetoran: SetoranRow[] }) {
  const { riwayatSetoran } = props

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Riwayat Setoran</h2>
          <p className="text-blue-200 text-sm mt-1">{riwayatSetoran.length} setoran tercatat</p>
        </div>
      </div>
      <div className="space-y-3">
        {riwayatSetoran.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center shadow border border-gray-100">
            <p className="text-gray-400 text-sm">Belum ada riwayat setoran</p>
          </div>
        )}
        {riwayatSetoran.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                {item.status_kehadiran && item.status_kehadiran !== 'hadir' ? (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusKehadiranInfo(item.status_kehadiran).color}`}>
                    {getStatusKehadiranInfo(item.status_kehadiran).label}
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {item.jenis === 'baru' ? 'Hafalan Baru' : 'Murojaah'}
                  </span>
                )}
                <span className="text-xs text-gray-400">{item.tanggal}</span>
              </div>
              {item.status_kehadiran === 'hadir' && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {item.status === 'lancar' ? 'Lancar' : 'Rosib'}
                </span>
              )}
            </div>
            {item.status_kehadiran === 'hadir' && (
              <div className="font-semibold text-sm text-gray-800">
                {item.surah} ayat {item.ayat_mulai}–{item.ayat_selesai}
              </div>
            )}
            {item.catatan && <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-600">Catatan guru: {item.catatan}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
