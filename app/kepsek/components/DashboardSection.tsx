'use client'
import Image from 'next/image'
import type { Santri, Guru, SetoranRow, AbsensiGuru, KalenderAkademik } from '../types'

// Tab "Dashboard" -- dipindah dari app/kepsek/page.tsx (Modularisasi Tahap
// 7A). JSX/className identik dengan sebelumnya; santriSudahSetor/BelumSetor
// dan guruAbsenSubuh/Pagi (dulu dihitung di badan komponen page) sekarang
// dihitung di sini karena hanya dipakai tab Dashboard.
export function DashboardSection(props: {
  santriList: Santri[]
  guruList: Guru[]
  setoranHariIni: SetoranRow[]
  absensiGuru: AbsensiGuru[]
  tanggal: string
  isLibur: boolean
  isLiburMingguan: boolean
  hariMinggu: number
  kalenderAktif: KalenderAkademik | null
  isUjian: boolean | null
}) {
  const { santriList, guruList, setoranHariIni, absensiGuru, tanggal, isLibur, isLiburMingguan, hariMinggu, kalenderAktif, isUjian } = props

  const santriSudahSetorIds = [...new Set(setoranHariIni.filter(s => s.status_kehadiran === 'hadir').map(s => s.santri_id))]
  const santriSudahSetor = santriList.filter(s => santriSudahSetorIds.includes(s.id))
  const santriBelumSetor = santriList.filter(s => !santriSudahSetorIds.includes(s.id))
  const guruAbsenSubuh = absensiGuru.filter(a => a.sesi === 'subuh').map(a => a.guru_id)
  const guruAbsenPagi = absensiGuru.filter(a => a.sesi === 'pagi').map(a => a.guru_id)

  return (
    <div>
      <div className="rounded-2xl p-6 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 bg-white" />
        <div className="absolute -bottom-10 -right-4 w-48 h-48 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white bg-opacity-20 rounded-xl p-2">
              <Image src="/logo.png" alt="Logo" width={36} height={36} className="object-contain" />
            </div>
            <div>
              <p className="text-blue-200 text-sm">Selamat datang,</p>
              <h2 className="text-white font-bold text-xl">Kepala Sekolah</h2>
            </div>
          </div>
          <p className="text-blue-200 text-sm mt-2">📅 {tanggal}</p>
          <p className="text-blue-100 text-xs mt-1">Pondok Pesantren Daarus Salaf Sukoharjo</p>
        </div>
      </div>

      {isLibur && (
        <div className="mb-5 p-4 rounded-2xl border-2 border-orange-300 bg-orange-50 flex items-center gap-3">
          <span className="text-2xl">🏖</span>
          <div>
            <div className="font-bold text-orange-800 text-sm">
              {isLiburMingguan ? (hariMinggu === 0 ? 'Hari ini Ahad — Libur Mingguan' : 'Hari ini Jumat — Libur Mingguan') : kalenderAktif?.nama}
            </div>
            <div className="text-orange-600 text-xs">Tidak ada setoran hari ini</div>
          </div>
        </div>
      )}
      {isUjian && (
        <div className="mb-5 p-4 rounded-2xl border-2 border-red-300 bg-red-50 flex items-center gap-3">
          <span className="text-2xl">📝</span>
          <div>
            <div className="font-bold text-red-800 text-sm">{kalenderAktif?.nama}</div>
            <div className="text-red-600 text-xs">{kalenderAktif?.tipe === 'semester' ? 'Ujian akhir semester' : 'Ujian mid semester aktif'}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Santri', count: santriList.length, color: 'from-blue-500 to-blue-700', sub: 'Terdaftar' },
          { label: 'Total Guru', count: guruList.length, color: 'from-emerald-500 to-emerald-700', sub: 'Guru musami\'' },
          { label: 'Sudah Setor', count: santriSudahSetor.length, color: 'from-green-500 to-green-700', sub: 'Hari ini' },
          { label: 'Belum Setor', count: santriBelumSetor.length, color: 'from-red-500 to-red-700', sub: 'Hari ini' },
        ].map((item, i) => (
          <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow-lg text-white relative overflow-hidden`}>
            <div className="absolute -bottom-2 -right-2 text-5xl opacity-10">◆</div>
            <div className="text-3xl font-bold">{item.count}</div>
            <div className="font-semibold text-xs mt-1">{item.label}</div>
            <div className="text-white text-opacity-70 text-xs">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Absensi Guru */}
      <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Absensi Guru Hari Ini</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Sesi Subuh', jam: '04.00 - 05.30', list: guruAbsenSubuh, bg: 'linear-gradient(135deg, #1a3a5c, #2563a8)', textColor: 'text-blue-200' },
            { label: 'Sesi Pagi', jam: '08.00 - 09.45', list: guruAbsenPagi, bg: 'linear-gradient(135deg, #166534, #16a34a)', textColor: 'text-green-200' },
          ].map((sesi, si) => (
            <div key={si} className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: sesi.bg }}>
                <div>
                  <span className="text-white font-semibold text-sm">{sesi.label}</span>
                  <span className={`${sesi.textColor} text-xs ml-2`}>{sesi.jam}</span>
                </div>
                <span className="bg-white bg-opacity-20 text-white text-xs px-2 py-0.5 rounded-full font-bold">{sesi.list.length}/{guruList.length}</span>
              </div>
              <div className="p-3 space-y-1">
                {guruList.map(g => (
                  <div key={g.id} className="flex items-center gap-2 py-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${sesi.list.includes(g.id) ? 'bg-green-500' : 'bg-red-400'}`}>
                      {g.nama?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700 flex-1">{g.nama}</span>
                    <span className={`text-xs font-semibold ${sesi.list.includes(g.id) ? 'text-green-500' : 'text-red-400'}`}>
                      {sesi.list.includes(g.id) ? '✓ Hadir' : 'Absen'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">Progress Setoran Hari Ini</span>
          <span className="text-sm font-bold" style={{ color: '#2563a8' }}>
            {santriList.length > 0 ? Math.round((santriSudahSetor.length / santriList.length) * 100) : 0}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-1">
          <div className="h-4 rounded-full" style={{ width: `${santriList.length > 0 ? (santriSudahSetor.length / santriList.length) * 100 : 0}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
        </div>
        <p className="text-xs text-gray-400">{santriSudahSetor.length} dari {santriList.length} santri sudah setor</p>
      </div>
    </div>
  )
}
