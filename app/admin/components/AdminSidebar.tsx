'use client'
import { useState } from 'react'
import Image from 'next/image'
import { dashboardItem, navigationGroups, findGroupForMenu, isNavSubgroup } from '../navigation'

// Header mobile (fixed, di luar <div className="flex">) -- dipindah dari
// app/admin/page.tsx (Modularisasi Tahap 6A), dipisah dari AdminSidebarNav
// supaya nesting DOM tetap identik dengan sebelumnya (header mobile & overlay
// BUKAN anak dari <div className="flex">, hanya sidebar-nya) -- pola sama
// persis dengan GuruMobileHeader/GuruSidebarNav pada Modularisasi Tahap 5A.
export function AdminMobileHeader(props: { sidebarOpen: boolean, setSidebarOpen: (open: boolean) => void }) {
  const { sidebarOpen, setSidebarOpen } = props
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
            <div className="text-blue-200 text-xs">Administrator</div>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="text-2xl p-1">☰</button>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
    </>
  )
}

// Sidebar navigasi (harus jadi anak langsung dari <div className="flex">
// bersama konten utama supaya layout 2-kolom desktop tetap sama).
export function AdminSidebarNav(props: {
  activeMenu: string
  onSelectMenu: (menuId: string) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  onLogout: () => void
}) {
  const { activeMenu, onSelectMenu, sidebarOpen, setSidebarOpen, onLogout } = props

  // Accordion: undefined = pakai default (terbuka jika berisi activeMenu).
  // Klik header group/subgroup menimpa default lewat entry eksplisit di sini.
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({})
  const [subgroupOpen, setSubgroupOpen] = useState<Record<string, boolean>>({})

  const active = findGroupForMenu(activeMenu)

  // "active group otomatis terbuka": saat activeMenu pindah ke group/subgroup
  // lain, paksa entry itu terbuka (tanpa menutup paksa group lain yang sedang
  // dibuka user secara manual). Disesuaikan langsung di badan render (pola
  // "adjusting state when a prop changes" ala React docs) supaya tidak
  // memicu setState di dalam effect.
  const [prevActiveMenu, setPrevActiveMenu] = useState(activeMenu)
  if (activeMenu !== prevActiveMenu) {
    setPrevActiveMenu(activeMenu)
    if (active) {
      if (!groupOpen[active.groupLabel]) setGroupOpen(prev => ({ ...prev, [active.groupLabel]: true }))
      if (active.subgroupLabel && !subgroupOpen[active.subgroupLabel]) {
        setSubgroupOpen(prev => ({ ...prev, [active.subgroupLabel!]: true }))
      }
    }
  }

  const isGroupOpen = (label: string) => groupOpen[label] ?? (active?.groupLabel === label)
  const isSubgroupOpen = (label: string) => subgroupOpen[label] ?? (active?.subgroupLabel === label)
  const toggleGroup = (label: string) => setGroupOpen(prev => ({ ...prev, [label]: !isGroupOpen(label) }))
  const toggleSubgroup = (label: string) => setSubgroupOpen(prev => ({ ...prev, [label]: !isSubgroupOpen(label) }))

  const leafButtonClass = (menuId: string) =>
    `w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium flex items-center gap-3 ${activeMenu === menuId ? 'bg-white text-blue-900 shadow-md font-bold' : 'text-blue-100 hover:bg-white hover:bg-opacity-10'}`

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
          <div className="text-white font-semibold text-sm">Administrator</div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <button onClick={() => onSelectMenu(dashboardItem.id)} className={leafButtonClass(dashboardItem.id)}>
          <span>{dashboardItem.icon}</span>{dashboardItem.label}
        </button>

        {navigationGroups.map(group => {
          const open = isGroupOpen(group.label)
          return (
            <div key={group.label} className="pt-1">
              <button onClick={() => toggleGroup(group.label)}
                className="w-full text-left px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide text-blue-300 hover:bg-white hover:bg-opacity-10 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><span>{group.icon}</span>{group.label}</span>
                <span className="text-[10px]">{open ? '▾' : '▸'}</span>
              </button>

              {open && (
                <div className="mt-1 space-y-1">
                  {group.items.map(entry => {
                    if (isNavSubgroup(entry)) {
                      const subOpen = isSubgroupOpen(entry.label)
                      return (
                        <div key={entry.label} className="pl-3">
                          <button onClick={() => toggleSubgroup(entry.label)}
                            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-blue-100 hover:bg-white hover:bg-opacity-10 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-3"><span>{entry.icon}</span>{entry.label}</span>
                            <span className="text-[10px]">{subOpen ? '▾' : '▸'}</span>
                          </button>
                          {subOpen && (
                            <div className="mt-1 space-y-1 pl-3">
                              {entry.children.map(leaf => (
                                <button key={leaf.id} onClick={() => onSelectMenu(leaf.id)} className={leafButtonClass(leaf.id)}>
                                  <span>{leaf.icon}</span>{leaf.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }
                    return (
                      <div key={entry.id} className="pl-3">
                        <button onClick={() => onSelectMenu(entry.id)} className={leafButtonClass(entry.id)}>
                          <span>{entry.icon}</span>{entry.label}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
      <div className="p-4 border-t border-blue-700">
        <button onClick={onLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-semibold">Keluar</button>
        <button onClick={() => setSidebarOpen(false)} className="w-full text-blue-300 py-2 rounded-xl text-xs md:hidden mt-1">✕ Tutup</button>
      </div>
    </div>
  )
}
