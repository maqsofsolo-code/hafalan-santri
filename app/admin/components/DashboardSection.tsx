'use client'
import Image from 'next/image'
import type { Guru, KalenderAkademik, Santri, SetoranHariIni, Wali } from '../types'

// Tab "Dashboard" -- dipindah dari app/admin/page.tsx (Modularisasi Tahap
// 6A). JSX/className identik dengan sebelumnya.
export function DashboardSection(props: {
  guruList: Guru[]
  santriList: Santri[]
  waliList: Wali[]
  setoranHariIni: SetoranHariIni[]
  tanggal: string
  isLiburAkademik: boolean
  isLiburMingguan: boolean
  hariMinggu: number
  kalenderAktif: KalenderAkademik | undefined
  isUjian: boolean | undefined
  handleDownloadTemplate: () => void
  importLoading: boolean
  handleImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleDownloadAllData: () => void
  downloadLoading: boolean
  importMsg: string
}) {
  const {
    guruList, santriList, waliList, setoranHariIni, tanggal,
    isLiburAkademik, isLiburMingguan, hariMinggu, kalenderAktif, isUjian,
    handleDownloadTemplate, importLoading, handleImportExcel, handleDownloadAllData, downloadLoading, importMsg,
  } = props

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
              <h2 className="text-white font-bold text-xl">Administrator</h2>
            </div>
          </div>
          <p className="text-blue-200 text-sm mt-2">📅 {tanggal}</p>
          <p className="text-blue-100 text-xs mt-1">Pondok Pesantren Daarus Salaf Sukoharjo</p>
        </div>
      </div>

      {isLiburAkademik && (
        <div className="mb-4 p-4 rounded-2xl border-2 border-orange-300 bg-orange-50 flex items-center gap-3">
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
        <div className="mb-4 p-4 rounded-2xl border-2 border-red-300 bg-red-50 flex items-center gap-3">
          <span className="text-2xl">📝</span>
          <div>
            <div className="font-bold text-red-800 text-sm">{kalenderAktif?.nama}</div>
            <div className="text-red-600 text-xs">{kalenderAktif?.tipe === 'mid_semester' ? 'Mode Ujian Mid Semester' : 'Mode Ujian Semester'} aktif</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Guru', count: guruList.length, color: 'from-blue-500 to-blue-700', sub: 'Guru musami\'' },
          { label: 'Total Santri', count: santriList.length, color: 'from-emerald-500 to-emerald-700', sub: 'Terdaftar' },
          { label: 'Total Wali', count: waliList.length, color: 'from-purple-500 to-purple-700', sub: 'Terdaftar' },
        ].map((item, i) => (
          <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow-lg text-white relative overflow-hidden`}>
            <div className="absolute -bottom-3 -right-3 text-6xl opacity-10">◆</div>
            <div className="text-3xl font-bold">{item.count}</div>
            <div className="font-semibold text-sm mt-1">{item.label}</div>
            <div className="text-white text-opacity-70 text-xs">{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>✦</div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Setoran Hari Ini</h3>
              <p className="text-gray-400 text-xs">{setoranHariIni.length} setoran</p>
            </div>
          </div>
          {setoranHariIni.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                  {item.santri?.nama?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-sm">{item.santri?.nama}</div>
                  <div className="text-xs text-gray-400">{item.surah} {item.ayat_mulai}-{item.ayat_selesai}</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {item.status === 'lancar' ? 'Lancar' : 'Rosib'}
              </span>
            </div>
          ))}
          {setoranHariIni.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada setoran</p>}
        </div>

        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>⊞</div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Kelola Data</h3>
              <p className="text-gray-400 text-xs">Import & Export data santri</p>
            </div>
          </div>
          <div className="space-y-3">
            <button onClick={handleDownloadTemplate}
              className="w-full text-white px-4 py-3 rounded-xl font-semibold text-sm shadow"
              style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
              ⬇ Download Template Import
            </button>
            <label className="w-full text-white px-4 py-3 rounded-xl font-semibold text-sm text-center cursor-pointer shadow flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
              {importLoading ? 'Mengimport...' : '⬆ Upload File Excel'}
              <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" disabled={importLoading} />
            </label>
            <button onClick={handleDownloadAllData} disabled={downloadLoading}
              className="w-full text-white px-4 py-3 rounded-xl font-semibold text-sm shadow"
              style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>
              {downloadLoading ? 'Menyiapkan...' : '📥 Download Semua Data'}
            </button>
          </div>
          {importMsg && <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs">✓ {importMsg}</div>}
        </div>
      </div>
    </div>
  )
}
