'use client'
import type { Santri } from '../types'

// Header Santri (kartu gradient + badge peringkat + progress 30 Juz) --
// dipindah dari app/wali/page.tsx (Modularisasi Tahap 8A). Dipakai di atas
// SEMUA tab (dashboard/peringkat/riwayat/grafik), JSX/className identik.
export function SantriHeaderCard(props: {
  selectedSantri: Santri
  peringkatHafalan: { peringkat: number, total: number } | null
  peringkatKonsistensi: number | null
  peringkatSemangat: number | null
}) {
  const { selectedSantri, peringkatHafalan, peringkatKonsistensi, peringkatSemangat } = props

  return (
    <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
      style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 bg-white" />
      <div className="absolute -bottom-10 -right-4 w-40 h-40 rounded-full opacity-10 bg-white" />
      <div className="relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
            {selectedSantri.nama?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-xl">{selectedSantri.nama}</h2>
            <p className="text-blue-200 text-sm">Guru: {selectedSantri.guru?.nama || '-'}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {selectedSantri.kelas && selectedSantri.kelas.trim() !== '' && (
                <span className="bg-white text-blue-900 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {selectedSantri.kelas}
                </span>
              )}
              {(selectedSantri.total_hafalan_juz || 0) > 0 && (
                <span className="bg-white text-blue-900 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {selectedSantri.total_hafalan_juz?.toFixed(2)} Juz
                </span>
              )}
              {peringkatHafalan && (
                <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-bold">
                  🏆 {peringkatHafalan.peringkat} Hafalan
                </span>
              )}
              {peringkatKonsistensi ? (
                <span className="bg-blue-400 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  📅 {peringkatKonsistensi} Konsistensi
                </span>
              ) : null}
              {peringkatSemangat ? (
                <span className="bg-purple-400 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  ✨ {peringkatSemangat} Semangat
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-blue-200 mb-1">
            <span>Progress menuju 30 Juz</span>
            <span>{Math.round(((selectedSantri.total_hafalan_juz || 0) / 30) * 100)}%</span>
          </div>
          <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
            <div className="h-2 rounded-full bg-white transition-all"
              style={{ width: `${Math.min(((selectedSantri.total_hafalan_juz || 0) / 30) * 100, 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
