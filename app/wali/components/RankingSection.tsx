'use client'
import { hitungRankingTotalHafalan } from '../../lib/ranking'
import type { Santri } from '../types'
import type { useWaliRanking } from '../hooks/useWaliRanking'

type Ranking = ReturnType<typeof useWaliRanking>

// Tab "Peringkat" -- dipindah dari app/wali/page.tsx (Modularisasi Tahap
// 8A). JSX/className identik dengan sebelumnya. Ranking Total Hafalan
// dihitung langsung dari app/lib/ranking.ts (hitungRankingTotalHafalan),
// persis kode asli -- tidak ada formula yang diduplikasi.
export function RankingSection(props: {
  selectedSantri: Santri
  ranking: Ranking
  peringkatHafalan: { peringkat: number, total: number } | null
  peringkatKonsistensi: number | null
  peringkatSemangat: number | null
}) {
  const { selectedSantri, ranking, peringkatHafalan, peringkatKonsistensi, peringkatSemangat } = props
  const { allSantriKelas, rankingKonsistensiKelas, rankingSemangatKelas, rankingPeriodeKonsistensi, activeRanking, setActiveRanking } = ranking

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Peringkat Santri</h2>
          <p className="text-yellow-100 text-sm mt-1">{selectedSantri.kelas || 'Kelas belum diset'}</p>
          <p className="text-yellow-200 text-xs mt-0.5">
            {allSantriKelas.length} santri • {
              selectedSantri.jenis_kelas === 'banin' ? 'Banin' :
              selectedSantri.jenis_kelas === 'banat' ? 'Banat' : 'TN'
            }
          </p>
        </div>
      </div>

      {/* Ringkasan 3 peringkat */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Hafalan', peringkat: peringkatHafalan?.peringkat, color: 'from-yellow-500 to-yellow-600' },
          { label: 'Konsistensi', peringkat: peringkatKonsistensi, color: 'from-blue-500 to-blue-700' },
          { label: 'Semangat Hafal', peringkat: peringkatSemangat, color: 'from-purple-500 to-purple-700' },
        ].map((item, i) => (
          <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-3 shadow text-white text-center relative overflow-hidden`}>
            <div className="absolute -bottom-2 -right-2 text-4xl opacity-10">◆</div>
            <div className="text-3xl font-bold">{item.peringkat ?? '-'}</div>
            <div className="text-white text-opacity-80 text-xs mt-0.5">{item.label}</div>
            <div className="text-white text-opacity-60 text-xs">dari {allSantriKelas.length}</div>
          </div>
        ))}
      </div>

      {/* Tab jenis ranking */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          { id: 'hafalan', label: 'Total Hafalan' },
          { id: 'konsistensi', label: 'Konsistensi Setor' },
          { id: 'semangat', label: 'Semangat Hafalan' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveRanking(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition border-2 ${activeRanking === tab.id ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-200 bg-white text-gray-500'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ranking Total Hafalan */}
      {activeRanking === 'hafalan' && (
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
            <h3 className="text-white font-bold">Peringkat Total Hafalan</h3>
            <p className="text-green-200 text-xs mt-0.5">Diurutkan dari juz terbanyak</p>
          </div>
          <div className="p-4 space-y-2">
            {hitungRankingTotalHafalan(allSantriKelas).map((s, i) => (
              <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl ${s.id === selectedSantri.id ? 'border-2 border-yellow-400 bg-yellow-50' : 'bg-gray-50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-800 flex items-center gap-1">
                    {s.nama}
                    {s.id === selectedSantri.id && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-normal">Anak Anda</span>}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div className="h-1.5 rounded-full"
                      style={{ width: `${Math.min(((s.total_hafalan_juz || 0) / 30) * 100, 100)}%`, background: s.id === selectedSantri.id ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #166534, #16a34a)' }} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`font-bold text-sm ${s.id === selectedSantri.id ? 'text-yellow-600' : 'text-green-700'}`}>{s.total_hafalan_juz?.toFixed(2) || 0}</div>
                  <div className="text-xs text-gray-400">Juz</div>
                </div>
              </div>
            ))}
            {allSantriKelas.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>}
          </div>
        </div>
      )}

      {/* Ranking Konsistensi */}
      {activeRanking === 'konsistensi' && (
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
            <h3 className="text-white font-bold">Peringkat Konsistensi Setor</h3>
            <p className="text-blue-200 text-xs mt-0.5">Periode: {rankingPeriodeKonsistensi || '-'}</p>
          </div>
          <div className="p-4 space-y-2">
            {rankingKonsistensiKelas.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl ${s.id === selectedSantri.id ? 'border-2 border-yellow-400 bg-yellow-50' : 'bg-gray-50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-800 flex items-center gap-1">
                    {s.nama}
                    {s.id === selectedSantri.id && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-normal">Anak Anda</span>}
                  </div>
                  {s.id === selectedSantri.id && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      Lama N/R: {s.najihLama}/{s.rosibLama}
                      {s.jenjang !== 'ulya' && ` • Baru N/R: ${s.najihBaru}/${s.rosibBaru}`}
                    </div>
                  )}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                    <div className="h-1.5 rounded-full"
                      style={{ width: `${s.persentaseKonsistensi}%`, background: s.id === selectedSantri.id ? 'linear-gradient(135deg, #d97706, #f59e0b)' : s.persentaseKonsistensi >= 80 ? 'linear-gradient(135deg, #166534, #16a34a)' : s.persentaseKonsistensi >= 50 ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #dc2626, #ef4444)' }} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`font-bold text-sm ${s.id === selectedSantri.id ? 'text-yellow-600' : s.persentaseKonsistensi >= 80 ? 'text-green-600' : s.persentaseKonsistensi >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{s.persentaseKonsistensi}%</div>
                  <div className="text-xs text-gray-400">{s.totalPoin}/{s.poinMaksimal} poin</div>
                </div>
              </div>
            ))}
            {rankingKonsistensiKelas.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>}
          </div>
        </div>
      )}

      {/* Ranking Semangat */}
      {activeRanking === 'semangat' && (
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
            <h3 className="text-white font-bold">Peringkat Semangat Hafalan Baru</h3>
            <p className="text-purple-200 text-xs mt-0.5">Total hafalan baru 7 hari terakhir</p>
          </div>
          <div className="p-4 space-y-2">
            {rankingSemangatKelas.map((s, i) => {
              const maxHalaman = rankingSemangatKelas[0]?.tambahHalaman7Hari || 1
              return (
                <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl ${s.id === selectedSantri.id ? 'border-2 border-yellow-400 bg-yellow-50' : 'bg-gray-50'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-800 flex items-center gap-1">
                      {s.nama}
                      {s.id === selectedSantri.id && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-normal">Anak Anda</span>}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                      <div className="h-1.5 rounded-full"
                        style={{ width: `${Math.min((s.tambahHalaman7Hari / maxHalaman) * 100, 100)}%`, background: s.id === selectedSantri.id ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #6b21a8, #9333ea)' }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`font-bold text-sm ${s.id === selectedSantri.id ? 'text-yellow-600' : 'text-purple-600'}`}>{s.tambahHalaman7Hari.toFixed(1)}</div>
                    <div className="text-xs text-gray-400">hal</div>
                  </div>
                </div>
              )
            })}
            {rankingSemangatKelas.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>}
          </div>
        </div>
      )}

      {!peringkatHafalan && (
        <div className="bg-white rounded-2xl p-8 text-center shadow border border-gray-100">
          <p className="text-gray-400 text-sm">Data kelas belum tersedia</p>
          <p className="text-gray-300 text-xs mt-1">Hubungi admin untuk mengatur data kelas</p>
        </div>
      )}
    </div>
  )
}
