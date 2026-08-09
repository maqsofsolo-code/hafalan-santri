'use client'
import { hitungRankingTotalHafalan } from '../../lib/ranking'
import { hitungTargetMurojaah, getJadwalJenjang } from '../utils'
import type { Santri } from '../types'

// Tab "Santri Saya" -- dipindah dari app/guru/page.tsx (Modularisasi Tahap
// 5A). JSX/className identik. Peringatan per kelas TETAP memakai
// hitungRankingTotalHafalan dari app/lib/ranking.ts (tidak diimplementasikan
// ulang di sini).
export function SantriSayaSection(props: { santriList: Santri[], allSantriList: Santri[] }) {
  const { santriList, allSantriList } = props

  // Kelompokkan santri berdasarkan kelas + jenis_kelas
  const kelasMap: Record<string, Santri[]> = {}
  santriList.forEach(s => {
    const key = `${s.kelas_num}-${s.jenis_kelas}`
    if (!kelasMap[key]) kelasMap[key] = []
    kelasMap[key].push(s)
  })

  // Hitung peringkat per kelompok kelas
  const santriDenganPeringkat: Record<string, number> = {}
  Object.values(kelasMap).forEach(kelompok => {
    const sorted = hitungRankingTotalHafalan(kelompok)
    sorted.forEach((s, i) => { santriDenganPeringkat[s.id] = i + 1 })
  })

  // Total per kelas untuk label "dari X santri"
  // Kita ambil dari allSantriList agar total akurat
  const totalPerKelas: Record<string, number> = {}
  allSantriList.filter(s => s.status === 'aktif').forEach(s => {
    const key = `${s.kelas_num}-${s.jenis_kelas}`
    totalPerKelas[key] = (totalPerKelas[key] || 0) + 1
  })

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #166534 0%, #16a34a 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Santri Saya</h2>
          <p className="text-green-200 text-sm mt-1">{santriList.length} santri dalam kelompok</p>
        </div>
      </div>

      <div className="space-y-3">
        {santriList.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center shadow border border-gray-100">
            <p className="text-gray-400">Belum ada santri</p>
          </div>
        )}
        {santriList.map(santri => {
          const target = hitungTargetMurojaah(santri)
          const jadwal = getJadwalJenjang(santri.jenjang)
          const peringkat = santriDenganPeringkat[santri.id]
          const totalKelas = totalPerKelas[`${santri.kelas_num}-${santri.jenis_kelas}`] || kelasMap[`${santri.kelas_num}-${santri.jenis_kelas}`]?.length || 1

          return (
            <div key={santri.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                  {santri.nama?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{santri.nama}</div>
                    {/* Badge Peringkat */}
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0
                      ${peringkat === 1 ? 'bg-yellow-400 text-white' : peringkat === 2 ? 'bg-gray-300 text-white' : peringkat === 3 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      <span>{peringkat === 1 ? '🥇' : peringkat === 2 ? '🥈' : peringkat === 3 ? '🥉' : `#${peringkat}`}</span>
                      <span>dari {totalKelas}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {santri.kelas && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{santri.kelas}</span>}
                    <span className="text-xs text-gray-500">{santri.total_hafalan_juz?.toFixed(2) || 0} Juz</span>
                    {santri.guru_id_2 && (
                      <span className="text-xs text-orange-500">+ Guru Kedua</span>
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Progress 30 Juz</span>
                      <span>{Math.round(((santri.total_hafalan_juz || 0) / 30) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="h-2 rounded-full"
                        style={{ width: `${Math.min(((santri.total_hafalan_juz || 0) / 30) * 100, 100)}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
                    </div>
                  </div>
                  {target && (
                    <div className="mt-1 text-xs text-purple-600">
                      Target murojaah: <span className="font-semibold">{target.targetHalaman} hal/hari</span>
                      <span className="text-gray-400 ml-1">(≈ {target.targetLembar} lembar)</span>
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-400">
                    Baru: <span className="font-semibold text-blue-600">{jadwal.baru}</span>
                    {jadwal.adaLama && <> • Murojaah: <span className="font-semibold text-purple-600">{jadwal.lama}</span></>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
