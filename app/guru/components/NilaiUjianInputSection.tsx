'use client'
import InputNilaiUjianSegment from '../../components/InputNilaiUjianSegment'
import type { Santri } from '../types'

// Tab "Input Nilai Ujian" -- dipindah dari app/guru/page.tsx (Modularisasi
// Tahap 5A). JSX identik, tetap memakai InputNilaiUjianSegment existing
// (tidak diimplementasikan ulang).
export function NilaiUjianInputSection(props: {
  tanggal: string
  kalenderUjianGanda: boolean
  kalenderUjianAktif: { id: string, nama: string, tipe: string, semester: number | null } | null
  santriList: Santri[]
  santriLain: Santri[]
}) {
  const { tanggal, kalenderUjianGanda, kalenderUjianAktif, santriList, santriLain } = props
  return (
    <div>
      <div className="rounded-2xl p-5 mb-4 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Input Nilai Ujian</h2>
          <p className="text-orange-200 text-sm mt-1">{tanggal}</p>
          {kalenderUjianGanda ? (
            <div className="mt-2 bg-white bg-opacity-20 rounded-xl px-3 py-2 inline-block">
              <p className="text-white text-xs font-semibold">Terdapat lebih dari satu periode ujian aktif. Silakan hubungi Admin.</p>
            </div>
          ) : kalenderUjianAktif ? (
            <div className="mt-2 bg-white bg-opacity-20 rounded-xl px-3 py-2 inline-block">
              <p className="text-orange-100 text-[11px] uppercase tracking-wide font-semibold">Periode Ujian Aktif</p>
              <p className="text-white text-xs font-semibold">{kalenderUjianAktif.nama}</p>
            </div>
          ) : (
            <div className="mt-2 bg-white bg-opacity-20 rounded-xl px-3 py-2 inline-block">
              <p className="text-orange-100 text-xs">Tidak ada periode ujian hafalan yang aktif hari ini.</p>
              <p className="text-orange-200 text-xs">Silakan hubungi Admin.</p>
            </div>
          )}
        </div>
      </div>

      {kalenderUjianAktif ? (
        <InputNilaiUjianSegment santriSaya={santriList} santriLain={santriLain} />
      ) : (
        <div className="bg-white rounded-2xl shadow p-6 border border-gray-100 text-center text-gray-500 text-sm">
          {kalenderUjianGanda
            ? 'Terdapat lebih dari satu periode ujian aktif. Silakan hubungi Admin.'
            : 'Tidak ada periode ujian hafalan yang aktif hari ini. Silakan hubungi Admin.'}
        </div>
      )}

    </div>
  )
}
