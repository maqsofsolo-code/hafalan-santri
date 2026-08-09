// Konfigurasi struktur navigasi sidebar Admin -- dipisah jadi config murni
// (Modularisasi Tahap 6B) supaya AdminSidebar.tsx tinggal me-render, dan
// menu baru nanti tinggal ditambah di sini tanpa redesign sidebar.
//
// `id` pada setiap NavLeaf HARUS sama persis dengan `activeMenu` yang dipakai
// app/admin/page.tsx (dibaca dari kode page.tsx asli, bukan ditebak).
//
// Menu yang fiturnya BELUM ada (Penugasan Guru, Mata Pelajaran, Notifikasi,
// Pengaturan) SENGAJA tidak dimasukkan ke config ini sama sekali -- solusi
// paling sederhana supaya tidak ada item placeholder yang bisa diklik.
// Ketika fitur itu dibuat, tinggal tambah NavLeaf baru di group terkait
// (Guru & Wali / Akademik) atau tambah group baru "Sistem".

export interface NavLeaf {
  id: string
  label: string
  icon: string
}

export interface NavSubgroup {
  label: string
  icon: string
  children: NavLeaf[]
}

export type NavEntry = NavLeaf | NavSubgroup

export interface NavGroup {
  label: string
  icon: string
  items: NavEntry[]
}

export function isNavSubgroup(entry: NavEntry): entry is NavSubgroup {
  return 'children' in entry
}

export const dashboardItem: NavLeaf = { id: 'dashboard', label: 'Dashboard', icon: '◈' }

export const navigationGroups: NavGroup[] = [
  {
    label: 'Operasional',
    icon: '⚙',
    items: [
      { id: 'monitoring', label: 'Monitoring Setoran', icon: '◉' },
      { id: 'ranking', label: 'Ranking Santri', icon: '✦' },
      { id: 'kalender', label: 'Kalender Akademik', icon: '📅' },
    ],
  },
  {
    label: 'Santri',
    icon: '◎',
    items: [
      { id: 'santri', label: 'Data Santri', icon: '◎' },
      { id: 'naik-kelas', label: 'Naik Kelas', icon: '⬆' },
      { id: 'alumni', label: 'Alumni / Keluar', icon: '🎓' },
    ],
  },
  {
    label: 'Guru & Wali',
    icon: '▤',
    items: [
      { id: 'guru', label: 'Data Guru', icon: '▤' },
      { id: 'wali', label: 'Data Wali', icon: '◍' },
    ],
  },
  {
    label: 'Akademik',
    icon: '📚',
    items: [
      {
        label: 'Ujian Hafalan',
        icon: '📝',
        children: [
          { id: 'rekap-nilai-ujian', label: 'Rekap Nilai Ujian', icon: '📝' },
        ],
      },
      { id: 'rapot', label: 'Rapot Digital', icon: '📋' },
    ],
  },
  {
    label: 'Laporan',
    icon: '📊',
    items: [
      { id: 'laporan', label: 'Laporan Bulanan', icon: '📊' },
    ],
  },
]

/** Cari group (dan subgroup bila ada) yang berisi activeMenu, untuk auto-expand. */
export function findGroupForMenu(menuId: string): { groupLabel: string; subgroupLabel?: string } | null {
  for (const group of navigationGroups) {
    for (const entry of group.items) {
      if (isNavSubgroup(entry)) {
        if (entry.children.some(c => c.id === menuId)) {
          return { groupLabel: group.label, subgroupLabel: entry.label }
        }
      } else if (entry.id === menuId) {
        return { groupLabel: group.label }
      }
    }
  }
  return null
}
