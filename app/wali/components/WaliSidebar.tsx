'use client'
import Image from 'next/image'
import type { Santri, WaliProfile } from '../types'

export const menuItems = [
  { id: 'dashboard', label: 'Ringkasan', icon: '◈' },
  { id: 'peringkat', label: 'Peringkat', icon: '✦' },
  { id: 'riwayat', label: 'Riwayat Setoran', icon: '◱' },
  { id: 'grafik', label: 'Perkembangan', icon: '◆' },
]

// Header mobile (fixed, di luar <div className="flex">) -- dipindah dari
// app/wali/page.tsx (Modularisasi Tahap 8A), dipisah dari WaliSidebarNav
// supaya nesting DOM tetap identik dengan sebelumnya -- pola sama persis
// dengan KepsekMobileHeader/KepsekSidebarNav (Tahap 7A).
export function WaliMobileHeader(props: { waliProfile: WaliProfile | null, sidebarOpen: boolean, setSidebarOpen: (open: boolean) => void }) {
  const { waliProfile, sidebarOpen, setSidebarOpen } = props
  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 text-white px-4 py-3 flex items-center justify-between shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-full p-0.5 w-9 h-9 flex items-center justify-center shadow">
            <Image src="/logo.png" alt="Logo" width={30} height={30} className="object-contain" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">Daarus Salaf</div>
            <div className="text-blue-200 text-xs">{waliProfile?.nama || 'Wali Santri'}</div>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="text-2xl p-1">☰</button>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
    </>
  )
}

// Sidebar navigasi (harus jadi anak langsung dari <div className="flex">
// bersama konten utama supaya layout 2-kolom desktop tetap sama). Termasuk
// pemilihan santri (jika Wali punya lebih dari 1 anak) -- JSX/urutan/kondisi
// identik dengan app/wali/page.tsx asli.
export function WaliSidebarNav(props: {
  waliProfile: WaliProfile | null
  santriList: Santri[]
  selectedSantri: Santri | null
  onPilihSantri: (santri: Santri) => void
  activeMenu: string
  onSelectMenu: (menuId: string) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  onLogout: () => void
}) {
  const { waliProfile, santriList, selectedSantri, onPilihSantri, activeMenu, onSelectMenu, sidebarOpen, setSidebarOpen, onLogout } = props
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
          <div className="text-white font-semibold text-sm">{waliProfile?.nama || 'Wali Santri'}</div>
          <div className="text-blue-300 text-xs">Wali Santri</div>
        </div>
      </div>

      {santriList.length > 1 && (
        <div className="px-4 py-3 border-b border-blue-700">
          <p className="text-blue-300 text-xs mb-2 font-medium">Pilih Santri:</p>
          {santriList.map(s => (
            <button key={s.id} onClick={() => { onPilihSantri(s); setSidebarOpen(false) }}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm mb-1 transition flex items-center gap-2 ${selectedSantri?.id === s.id ? 'bg-white text-blue-900 font-bold shadow' : 'text-blue-100 hover:bg-white hover:bg-opacity-10'}`}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                {s.nama?.charAt(0).toUpperCase()}
              </div>
              {s.nama}
            </button>
          ))}
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map(menu => (
          <button key={menu.id} onClick={() => { onSelectMenu(menu.id); setSidebarOpen(false) }}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium flex items-center gap-3 ${activeMenu === menu.id ? 'bg-white text-blue-900 shadow-md font-bold' : 'text-blue-100 hover:bg-white hover:bg-opacity-10'}`}>
            <span className="text-lg">{menu.icon}</span>{menu.label}
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
