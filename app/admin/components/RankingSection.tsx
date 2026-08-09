'use client'
import { getKelasOptions, jenjangLabel, kelasLabel } from '../utils'
import type { SantriRanking } from '../types'
import type { useAdminFilters } from '../hooks/useAdminFilters'

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

type Filters = ReturnType<typeof useAdminFilters>

const RankBadge = ({ i }: { i: number }) => (
  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
    ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
    {i + 1}
  </div>
)

const kelasInfo = (s: SantriRanking) => s.kelas || kelasLabel(s.kelas_num, s.jenjang, s.jenis_kelas)

// Tab "Ranking Santri" -- dipindah dari app/admin/page.tsx (Modularisasi
// Tahap 6A). JSX/className identik dengan sebelumnya. Ranking WAJIB memakai
// app/lib/ranking.ts (dihitung di useAdminData, bukan di sini) -- komponen
// ini murni presentasional, hanya menyaring/menampilkan hasil yang sudah
// dihitung.
export function RankingSection(props: {
  filters: Filters
  rankingHafalan: SantriRanking[]
  rankingKonsistensi: SantriRanking[]
  rankingSemangat: SantriRanking[]
  rankingPeriodeKonsistensi: string
  bukaLaporanHTML: (url: string) => void
}) {
  const { filters, rankingHafalan, rankingKonsistensi, rankingSemangat, rankingPeriodeKonsistensi, bukaLaporanHTML } = props
  const { filterJenisKelas, setFilterJenisKelas, filterJenjang, setFilterJenjang, filterKelas, setFilterKelas, rankingLevel, setRankingLevel, activeRanking, setActiveRanking, filterRankingList } = filters

  const listHafalan = filterRankingList(rankingHafalan)
  const listKonsistensi = filterRankingList(rankingKonsistensi)
  const listSemangat = filterRankingList(rankingSemangat)

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Peringkat Santri</h2>
          <p className="text-blue-200 text-sm mt-1">3 jenis peringkat • terpisah banin & banat</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { id: 'kelas', label: '📚 Per Kelas', sub: 'Dalam 1 kelas' },
          { id: 'jenjang', label: '🏫 Per Jenjang', sub: 'Dalam 1 jenjang' },
          { id: 'global', label: '🌐 Global', sub: 'Semua santri' },
        ].map(lv => (
          <button key={lv.id} onClick={() => {
            setRankingLevel(lv.id)
            if (lv.id === 'global') { setFilterJenjang('semua'); setFilterKelas('semua') }
            if (lv.id === 'jenjang') { setFilterKelas('semua') }
          }}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition border-2 ${rankingLevel === lv.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-500'}`}>
            <div>{lv.label}</div>
            <div className="text-xs font-normal opacity-80">{lv.sub}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Jenis Kelas</label>
            <select value={filterJenisKelas} onChange={e => setFilterJenisKelas(e.target.value)} className={inputClass}>
              <option value="semua">Semua</option>
              <option value="banin">Banin (Putra)</option>
              <option value="banat">Banat (Putri Ula/Wustha)</option>
              <option value="tn">TN (Putri Ulya)</option>
            </select>
          </div>

          {rankingLevel !== 'global' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
              <select value={filterJenjang} onChange={e => { setFilterJenjang(e.target.value); setFilterKelas('semua') }} className={inputClass}>
                <option value="semua">Semua Jenjang</option>
                <option value="ula">Ula</option>
                <option value="wustha">Wustha</option>
                <option value="ulya">Ulya</option>
              </select>
            </div>
          )}

          {rankingLevel === 'kelas' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Kelas</label>
              <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className={inputClass}>
                <option value="semua">Semua Kelas</option>
                {getKelasOptions(filterJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-3 p-2 bg-gray-50 rounded-xl text-xs text-gray-500">
          <span className="font-semibold text-gray-700">
            {rankingLevel === 'kelas' ? 'Per Kelas' : rankingLevel === 'jenjang' ? 'Per Jenjang' : 'Global'}
          </span>
          {' • '}
          {filterJenisKelas === 'semua' ? 'Semua' : filterJenisKelas === 'banin' ? 'Banin' : filterJenisKelas === 'banat' ? 'Banat' : 'TN'}
          {rankingLevel !== 'global' && filterJenjang !== 'semua' && ` • ${jenjangLabel(filterJenjang)}`}
          {rankingLevel === 'kelas' && filterKelas !== 'semua' && ` • Kelas ${filterKelas}`}
          {' • '}
          <span className="font-semibold text-blue-600">{filterRankingList(rankingHafalan).length} santri</span>
        </div>
      </div>

      {rankingLevel === 'kelas' && filterJenjang !== 'semua' && filterJenisKelas !== 'semua' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-600 mb-2">📄 Download PDF Peringkat 1–3 Per Kelas:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => bukaLaporanHTML(`/api/laporan-peringkat-pdf?jenjang=${filterJenjang}&jenis_kelas=${filterJenisKelas}&top=3&tipe=total`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white shadow"
              style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}
            >
              🏆 Total Hafalan
            </button>
            <button
              onClick={() => bukaLaporanHTML(`/api/laporan-peringkat-pdf?jenjang=${filterJenjang}&jenis_kelas=${filterJenisKelas}&top=3&tipe=konsistensi`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white shadow"
              style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}
            >
              📅 Konsistensi Setor
            </button>
            <button
              onClick={() => bukaLaporanHTML(`/api/laporan-peringkat-pdf?jenjang=${filterJenjang}&jenis_kelas=${filterJenisKelas}&top=3&tipe=semangat`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white shadow"
              style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}
            >
              🔥 Semangat Hafalan
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Pilih Jenjang + Jenis Kelas terlebih dahulu. Setelah terbuka, klik &quot;Cetak / Simpan PDF&quot;.
          </p>
        </div>
      )}

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          { id: 'total', label: 'Total Hafalan', sub: 'Keseluruhan', color: 'border-green-500 bg-green-50 text-green-700' },
          { id: 'konsistensi', label: 'Konsistensi Setor', sub: 'Pekan tertutup', color: 'border-blue-500 bg-blue-50 text-blue-700' },
          { id: 'semangat', label: 'Semangat Hafalan', sub: '7 hari terakhir', color: 'border-purple-500 bg-purple-50 text-purple-700' },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveRanking(tab.id)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition border-2 ${activeRanking === tab.id ? tab.color : 'border-gray-200 bg-white text-gray-500'}`}>
            <div>{tab.label}</div>
            <div className="text-xs font-normal opacity-70">{tab.sub}</div>
          </button>
        ))}
      </div>

      {activeRanking === 'total' && (
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
            <h3 className="text-white font-bold">Peringkat Total Hafalan</h3>
            <p className="text-green-200 text-xs mt-0.5">Diurutkan dari jumlah juz terbanyak</p>
          </div>
          <div className="p-4 space-y-2">
            {listHafalan.map((santri, i) => (
              <div key={santri.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-gray-50' : ''}`}>
                <RankBadge i={i} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-800">{santri.nama}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400">{kelasInfo(santri)}</span>
                    <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div className="h-1.5 rounded-full" style={{ width: `${Math.min(((santri.total_hafalan_juz || 0) / 30) * 100, 100)}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-sm text-green-700">{santri.total_hafalan_juz?.toFixed(2) || 0}</div>
                  <div className="text-xs text-gray-400">Juz</div>
                </div>
              </div>
            ))}
            {listHafalan.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>}
          </div>
        </div>
      )}

      {activeRanking === 'konsistensi' && (
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
            <h3 className="text-white font-bold">Peringkat Konsistensi Setoran</h3>
            <p className="text-blue-200 text-xs mt-0.5">Periode: {rankingPeriodeKonsistensi || '-'}</p>
          </div>
          <div className="p-4 space-y-2">
            {listKonsistensi.map((santri, i) => (
              <div key={santri.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-gray-50' : ''}`}>
                <RankBadge i={i} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-800">{santri.nama}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400">{kelasInfo(santri)}</span>
                    <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Lama N/R: {santri.najihLama}/{santri.rosibLama}
                    {santri.jenjang !== 'ulya' && ` • Baru N/R: ${santri.najihBaru}/${santri.rosibBaru}`}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${santri.persentaseKonsistensi}%`, background: santri.persentaseKonsistensi >= 80 ? 'linear-gradient(135deg, #166534, #16a34a)' : santri.persentaseKonsistensi >= 50 ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #dc2626, #ef4444)' }} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`font-bold text-sm ${santri.persentaseKonsistensi >= 80 ? 'text-green-600' : santri.persentaseKonsistensi >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{santri.persentaseKonsistensi}%</div>
                  <div className="text-xs text-gray-400">{santri.totalPoin}/{santri.poinMaksimal} poin</div>
                </div>
              </div>
            ))}
            {listKonsistensi.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>}
          </div>
        </div>
      )}

      {activeRanking === 'semangat' && (
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
            <h3 className="text-white font-bold">Peringkat Semangat Hafalan Baru</h3>
            <p className="text-purple-200 text-xs mt-0.5">Total hafalan baru 7 hari terakhir</p>
          </div>
          <div className="p-4 space-y-2">
            {listSemangat.map((santri, i) => {
              const maxHalaman = listSemangat[0]?.tambahHalaman7Hari || 1
              return (
                <div key={santri.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-gray-50' : ''}`}>
                  <RankBadge i={i} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-800">{santri.nama}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-400">{kelasInfo(santri)}</span>
                      <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                      <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${Math.min((santri.tambahHalaman7Hari / maxHalaman) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm text-purple-600">{santri.tambahHalaman7Hari.toFixed(1)}</div>
                    <div className="text-xs text-gray-400">hal</div>
                  </div>
                </div>
              )
            })}
            {listSemangat.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>}
          </div>
        </div>
      )}
    </div>
  )
}
