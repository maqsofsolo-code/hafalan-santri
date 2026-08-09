'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Image from 'next/image'
import { getTanggalWIB } from '../lib/dateWib'

import { useKepsekData } from './hooks/useKepsekData'
import { useKepsekMonitoring } from './hooks/useKepsekMonitoring'
import { useKepsekMurojaah } from './hooks/useKepsekMurojaah'
import { useKepsekUjian } from './hooks/useKepsekUjian'
import { useKepsekRanking } from './hooks/useKepsekRanking'
import { useKepsekLaporan } from './hooks/useKepsekLaporan'

import { KepsekMobileHeader, KepsekSidebarNav } from './components/KepsekSidebar'
import { DashboardSection } from './components/DashboardSection'
import { MonitoringSection } from './components/MonitoringSection'
import { MurojaahSection } from './components/MurojaahSection'
import { UjianSection } from './components/UjianSection'
import { RankingSection } from './components/RankingSection'
import { LaporanSection } from './components/LaporanSection'

// Halaman Kepsek -- dipecah jadi struktur modular pada Modularisasi Tahap 7A
// (lihat app/kepsek/hooks/, app/kepsek/components/, app/kepsek/utils.ts,
// app/kepsek/types.ts). page.tsx sekarang jadi orchestrator: memanggil
// hooks, menyimpan state tingkat halaman (activeMenu, sidebarOpen), dan
// menyusun section. Business rule, query, dan urutan fetch TIDAK diubah
// dari app/kepsek/page.tsx sebelumnya.
export default function KepsekDashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const data = useKepsekData()
  const monitoring = useKepsekMonitoring(
    data.santriList,
    data.setoranTanggalDipilih, data.setSetoranTanggalDipilih,
    data.absensiTanggalDipilih, data.setAbsensiTanggalDipilih,
  )
  const murojaah = useKepsekMurojaah(data.santriList, data.setoranMurojaahTanggal, data.setSetoranMurojaahTanggal)
  const ujian = useKepsekUjian(data.nilaiUjianList)
  const ranking = useKepsekRanking()
  const laporan = useKepsekLaporan()

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const handleSelectMenu = (menuId: string) => {
    setActiveMenu(menuId)
    setSidebarOpen(false)
  }

  const today = getTanggalWIB()
  // new Date().getDay() (bukan getTanggalWIB()) -- fragmen lama yang sengaja
  // TIDAK diperbaiki di Tahap 7A ini (structural refactor saja, lihat laporan).
  const hariMinggu = new Date().getDay()
  const isLiburMingguan = hariMinggu === 0 || hariMinggu === 5
  const isLibur = isLiburMingguan || data.kalenderAktif?.tipe === 'libur'
  const isUjian = data.kalenderAktif && (data.kalenderAktif.tipe === 'mid_semester' || data.kalenderAktif.tipe === 'semester')

  const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (data.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="text-center text-white">
          <div className="w-16 h-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center mx-auto mb-4">
            <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain" />
          </div>
          <p className="text-blue-200">Memuat data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <KepsekMobileHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex">
        <KepsekSidebarNav
          activeMenu={activeMenu}
          onSelectMenu={handleSelectMenu}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLogout={handleLogout}
          isUjian={!!isUjian}
        />

        {/* MAIN CONTENT */}
        <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0 min-w-0">

          {activeMenu === 'dashboard' && (
            <DashboardSection
              santriList={data.santriList}
              guruList={data.guruList}
              setoranHariIni={data.setoranHariIni}
              absensiGuru={data.absensiGuru}
              tanggal={tanggal}
              isLibur={isLibur}
              isLiburMingguan={isLiburMingguan}
              hariMinggu={hariMinggu}
              kalenderAktif={data.kalenderAktif}
              isUjian={isUjian}
            />
          )}

          {activeMenu === 'monitoring' && (
            <MonitoringSection today={today} guruList={data.guruList} {...monitoring} />
          )}

          {activeMenu === 'murojaah' && (
            <MurojaahSection today={today} {...murojaah} />
          )}

          {activeMenu === 'ujian' && (
            <UjianSection
              nilaiUjianTotal={data.nilaiUjianList.length}
              isUjian={isUjian}
              kalenderAktif={data.kalenderAktif}
              {...ujian}
            />
          )}

          {activeMenu === 'ranking' && (
            <RankingSection
              rankingHafalan={data.rankingHafalan}
              rankingKonsistensi={data.rankingKonsistensi}
              rankingSemangat={data.rankingSemangat}
              rankingPeriodeKonsistensi={data.rankingPeriodeKonsistensi}
              {...ranking}
            />
          )}

          {activeMenu === 'laporan' && (
            <LaporanSection santriList={data.santriList} {...laporan} />
          )}

        </div>
      </div>
    </div>
  )
}
