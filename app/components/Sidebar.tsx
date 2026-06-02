'use client'
import Image from 'next/image'

interface SidebarProps {
  role: string
  nama: string
  activeMenu: string
  menuItems: { id: string; label: string; icon: string }[]
  onMenuClick: (id: string) => void
  onLogout: () => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  children?: React.ReactNode
}

export default function Sidebar({
  role, nama, activeMenu, menuItems,
  onMenuClick, onLogout, sidebarOpen, setSidebarOpen, children
}: SidebarProps) {

  const roleLabel: any = {
    admin: 'Administrator',
    guru: 'Guru Musami\'',
    kepsek: 'Kepala Sekolah',
    wali: 'Wali Santri'
  }

  return (
    <>
      {/* HEADER HP */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 text-white px-4 py-3 flex items-center justify-between shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Logo" width={32} height={32} className="rounded-full bg-white p-0.5" />
          <div>
            <div className="font-bold text-sm leading-tight">Daarus Salaf</div>
            <div className="text-blue-200 text-xs">{roleLabel[role]}</div>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="text-2xl p-1">☰</button>
      </div>

      {/* OVERLAY */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:w-64
      `} style={{ background: 'linear-gradient(180deg, #1a3a5c 0%, #1e4080 100%)' }}>

        {/* Logo & Nama Pesantren */}
        <div className="p-5 border-b border-blue-700">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-full p-1 shadow-md flex-shrink-0">
              <Image src="/logo.png" alt="Logo" width={48} height={48} className="rounded-full" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">Pondok Pesantren</div>
              <div className="text-white font-bold text-base leading-tight">Daarus Salaf</div>
              <div className="text-blue-300 text-xs">Sukoharjo</div>
            </div>
          </div>
          <div className="mt-3 bg-blue-800 rounded-xl px-3 py-2">
            <div className="text-blue-300 text-xs">Login sebagai:</div>
            <div className="text-white font-semibold text-sm">{nama}</div>
            <div className="text-blue-300 text-xs">{roleLabel[role]}</div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map(menu => (
            <button
              key={menu.id}
              onClick={() => { onMenuClick(menu.id); setSidebarOpen(false) }}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium flex items-center gap-3 ${
                activeMenu === menu.id
                  ? 'bg-white text-blue-900 shadow-md font-bold'
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <span className="text-lg">{menu.icon}</span>
              {menu.label}
            </button>
          ))}
          {children}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-blue-700 space-y-2">
          <button onClick={onLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
            ⬡ Keluar
          </button>
          <button onClick={() => setSidebarOpen(false)}
            className="w-full text-blue-300 py-2 rounded-xl text-xs md:hidden hover:text-white">
            ✕ Tutup Menu
          </button>
        </div>
      </div>
    </>
  )
}