'use client'
import Image from 'next/image'
import type { GuruProfile } from '../types'

const menuItems = [
  { id: 'input', label: 'Input Setoran', icon: '✎' },
  { id: 'ujian', label: 'Input Nilai Ujian', icon: '📝' },
  { id: 'rekap-ujian', label: 'Rekap Nilai Ujian', icon: '📊' },
  { id: 'rapot', label: 'Input Nilai Rapot', icon: '📋' },
  { id: 'riwayat', label: 'Riwayat Setoran', icon: '◱' },
  { id: 'santri', label: 'Santri Saya', icon: '◎' },
]

type TombolAbsenProps = {
  mode: 'mobile' | 'sidebar'
  absenSubuh: boolean
  absenPagi: boolean
  absenLoading: boolean
  sesiAktif: 'subuh' | 'pagi' | null
  onKlikAbsen: (sesi: 'subuh' | 'pagi') => void
}

function TombolAbsen({ mode, absenSubuh, absenPagi, absenLoading, sesiAktif, onKlikAbsen }: TombolAbsenProps) {
  if (mode === 'mobile') {
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={() => onKlikAbsen('subuh')} disabled={absenLoading}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border-2 transition shadow-sm ${absenSubuh ? 'bg-green-500 border-green-400 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
          <span>{absenSubuh ? '✓' : '○'}</span><span>Subuh</span>
        </button>
        <button onClick={() => onKlikAbsen('pagi')} disabled={absenLoading}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border-2 transition shadow-sm ${absenPagi ? 'bg-green-500 border-green-400 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
          <span>{absenPagi ? '✓' : '○'}</span><span>Pagi</span>
        </button>
      </div>
    )
  }
  return (
    <div className="mt-3 space-y-2">
      <p className="text-blue-300 text-xs font-medium mb-1">Absensi Kehadiran:</p>
      <button onClick={() => onKlikAbsen('subuh')} disabled={absenLoading}
        className={`w-full py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-between px-3 border ${absenSubuh ? 'bg-green-500 border-green-400 text-white' : 'bg-white bg-opacity-10 border-white border-opacity-20 text-white hover:bg-opacity-20'}`}>
        <div className="text-left">
          <div>{absenSubuh ? '✓ Sudah Absen Subuh' : 'Klik untuk Absen Subuh'}</div>
          <div className={`text-xs ${absenSubuh ? 'text-green-100' : 'text-blue-300'}`}>Sesi 04.00 — 05.30</div>
        </div>
        <span className="text-lg">{absenSubuh ? '✓' : '+'}</span>
      </button>
      <button onClick={() => onKlikAbsen('pagi')} disabled={absenLoading}
        className={`w-full py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-between px-3 border ${absenPagi ? 'bg-green-500 border-green-400 text-white' : 'bg-white bg-opacity-10 border-white border-opacity-20 text-white hover:bg-opacity-20'}`}>
        <div className="text-left">
          <div>{absenPagi ? '✓ Sudah Absen Pagi' : 'Klik untuk Absen Pagi'}</div>
          <div className={`text-xs ${absenPagi ? 'text-green-100' : 'text-blue-300'}`}>Sesi 08.00 — 09.45</div>
        </div>
        <span className="text-lg">{absenPagi ? '✓' : '+'}</span>
      </button>
      {sesiAktif && <div className="text-center text-xs text-green-300 font-medium">Sesi {sesiAktif === 'subuh' ? 'Subuh' : 'Pagi'} sedang berlangsung</div>}
      {!sesiAktif && <div className="text-center text-xs text-blue-300">Di luar jam sesi — absen tetap bisa dilakukan</div>}
    </div>
  )
}

type AbsensiProps = {
  absenSubuh: boolean
  absenPagi: boolean
  absenLoading: boolean
  sesiAktif: 'subuh' | 'pagi' | null
  onKlikAbsen: (sesi: 'subuh' | 'pagi') => void
}

// Header mobile (fixed, di luar <div className="flex">) -- dipindah dari
// app/guru/page.tsx (Modularisasi Tahap 5A), dipisah dari GuruSidebarNav
// supaya nesting DOM tetap identik dengan sebelumnya (header mobile & overlay
// BUKAN anak dari <div className="flex">, hanya sidebar-nya).
export function GuruMobileHeader(props: AbsensiProps & {
  guruProfile: GuruProfile | null
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}) {
  const { guruProfile, sidebarOpen, setSidebarOpen, ...absensi } = props
  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 text-white px-3 py-2.5 flex items-center justify-between shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-full p-0.5 w-9 h-9 flex items-center justify-center shadow flex-shrink-0">
            <Image src="/logo.png" alt="Logo" width={30} height={30} className="object-contain" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm leading-tight">Daarus Salaf</div>
            <div className="text-blue-200 text-xs truncate">{guruProfile?.nama || 'Guru'}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <TombolAbsen mode="mobile" {...absensi} />
          <button onClick={() => setSidebarOpen(true)} className="text-white text-2xl p-1">☰</button>
        </div>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
    </>
  )
}

// Sidebar navigasi (harus jadi anak langsung dari <div className="flex">
// bersama konten utama supaya layout 2-kolom desktop -- md:relative
// md:w-64 -- tetap sama seperti sebelumnya).
export function GuruSidebarNav(props: AbsensiProps & {
  guruProfile: GuruProfile | null
  activeMenu: string
  onSelectMenu: (menuId: string) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  isUjian: boolean
  onLogout: () => void
}) {
  const {
    guruProfile, activeMenu, onSelectMenu, sidebarOpen, setSidebarOpen, isUjian, onLogout,
    ...absensi
  } = props

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:w-64`}
      style={{ background: 'linear-gradient(180deg, #1a3a5c 0%, #1e4080 100%)' }}>
      <div className="p-5 border-b border-blue-700">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-full p-1 shadow-md flex-shrink-0 w-14 h-14 flex items-center justify-center">
            <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">Pondok Pesantren</div>
            <div className="text-white font-bold text-base">Daarus Salaf</div>
            <div className="text-blue-300 text-xs">Sukoharjo</div>
          </div>
        </div>
        <div className="mt-3 bg-blue-800 bg-opacity-60 rounded-xl px-3 py-2 border border-blue-600">
          <div className="text-blue-300 text-xs">Masuk sebagai</div>
          <div className="text-white font-semibold text-sm">{guruProfile?.nama || 'Guru'}</div>
          <div className="text-blue-300 text-xs">
            Guru Musami'
            {guruProfile?.is_wali_kelas && (
              <span className="ml-1 bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full text-xs font-bold">
                Wali Kelas {guruProfile.wali_kelas_num} {guruProfile.wali_kelas_jenis === 'banin' ? 'Banin' : guruProfile.wali_kelas_jenis === 'banat' ? 'Banat' : 'TN'}
              </span>
            )}
          </div>
        </div>
        <TombolAbsen mode="sidebar" {...absensi} />
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map(menu => (
          <button key={menu.id}
            onClick={() => onSelectMenu(menu.id)}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium flex items-center gap-3 ${activeMenu === menu.id ? 'bg-white text-blue-900 shadow-md font-bold' : 'text-blue-100 hover:bg-white hover:bg-opacity-10'}`}>
            <span className="text-lg">{menu.icon}</span>{menu.label}
            {menu.id === 'ujian' && isUjian && (
              <span className="ml-auto text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">Aktif</span>
            )}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-blue-700">
        <button onClick={onLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-semibold">Keluar</button>
        <button onClick={() => setSidebarOpen(false)} className="w-full text-blue-300 py-2 rounded-xl text-xs md:hidden mt-1">✕ Tutup</button>
      </div>
    </div>
  )
}
