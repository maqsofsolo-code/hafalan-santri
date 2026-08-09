'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Image from 'next/image'

import { useWaliRiwayat } from './hooks/useWaliRiwayat'
import { useWaliLaporanHarian } from './hooks/useWaliLaporanHarian'
import { useWaliRanking } from './hooks/useWaliRanking'
import { useWaliData } from './hooks/useWaliData'
import { useWaliNotifikasi } from './hooks/useWaliNotifikasi'
import { hitungPeringkatHafalan } from './utils'

import { WaliMobileHeader, WaliSidebarNav } from './components/WaliSidebar'
import { SantriHeaderCard } from './components/SantriHeaderCard'
import { DashboardSection } from './components/DashboardSection'
import { RankingSection } from './components/RankingSection'
import { RiwayatSetoranSection } from './components/RiwayatSetoranSection'
import { ProgressHafalanSection } from './components/ProgressHafalanSection'

// Halaman Wali -- dipecah jadi struktur modular pada Modularisasi Tahap 8A
// (lihat app/wali/hooks/, app/wali/components/, app/wali/utils.ts,
// app/wali/types.ts). page.tsx sekarang jadi orchestrator: memanggil hooks,
// menyimpan state tingkat halaman (activeMenu, sidebarOpen), dan menyusun
// section. Business rule, query, security (RLS + endpoint
// /api/wali/ranking-data), dan urutan fetch TIDAK diubah dari
// app/wali/page.tsx sebelumnya.
export default function WaliDashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const riwayat = useWaliRiwayat()
  const laporan = useWaliLaporanHarian()
  const ranking = useWaliRanking()
  const data = useWaliData(riwayat.fetchRiwayat, laporan.setTanggalLaporan, laporan.fetchLaporanHariIni, ranking.fetchDataKelas)
  const notifikasi = useWaliNotifikasi(data.waliProfile)

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const peringkatHafalan = data.selectedSantri ? hitungPeringkatHafalan(ranking.allSantriKelas, data.selectedSantri.id) : null
  // Verbatim dari app/wali/page.tsx asli (findIndex + 1, BUKAN dibungkus
  // helper) -- kalau santri belum ditemukan di list, hasilnya 0 (bukan
  // null), dan itu dipakai apa adanya di beberapa tempat JSX (?? vs ||
  // menghasilkan tampilan berbeda untuk 0). Jangan disederhanakan.
  const peringkatKonsistensi: number | null = data.selectedSantri
    ? ranking.rankingKonsistensiKelas.findIndex(s => s.id === data.selectedSantri!.id) + 1
    : null
  const peringkatSemangat: number | null = data.selectedSantri
    ? ranking.rankingSemangatKelas.findIndex(s => s.id === data.selectedSantri!.id) + 1
    : null

  const totalSetoran = riwayat.riwayatSetoran.length
  const totalLancar = riwayat.riwayatSetoran.filter(s => s.status === 'lancar').length
  const totalRosib = riwayat.riwayatSetoran.filter(s => s.status === 'rosib').length
  const setoranBaru = riwayat.riwayatSetoran.filter(s => s.jenis === 'baru').length
  const setoranLama = riwayat.riwayatSetoran.filter(s => s.jenis === 'lama').length

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
      <WaliMobileHeader waliProfile={data.waliProfile} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex">
        <WaliSidebarNav
          waliProfile={data.waliProfile}
          santriList={data.santriList}
          selectedSantri={data.selectedSantri}
          onPilihSantri={data.handlePilihSantri}
          activeMenu={activeMenu}
          onSelectMenu={setActiveMenu}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLogout={handleLogout}
        />

        {/* MAIN CONTENT */}
        <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0 min-w-0">

          {data.santriList.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl text-gray-400">◌</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-600">Belum ada data santri</h2>
              <p className="text-gray-400 mt-2 text-sm">Hubungi admin untuk menghubungkan akun dengan data santri</p>
            </div>
          )}

          {data.selectedSantri && (
            <>
              <SantriHeaderCard
                selectedSantri={data.selectedSantri}
                peringkatHafalan={peringkatHafalan}
                peringkatKonsistensi={peringkatKonsistensi}
                peringkatSemangat={peringkatSemangat}
              />

              {activeMenu === 'dashboard' && (
                <DashboardSection
                  selectedSantri={data.selectedSantri}
                  laporan={laporan}
                  notifikasi={notifikasi}
                  peringkatHafalan={peringkatHafalan}
                  peringkatKonsistensi={peringkatKonsistensi}
                  peringkatSemangat={peringkatSemangat}
                  allSantriKelasLength={ranking.allSantriKelas.length}
                  riwayatSetoran={riwayat.riwayatSetoran}
                  totalSetoran={totalSetoran}
                  totalLancar={totalLancar}
                  totalRosib={totalRosib}
                  setoranBaru={setoranBaru}
                />
              )}

              {activeMenu === 'peringkat' && (
                <RankingSection
                  selectedSantri={data.selectedSantri}
                  ranking={ranking}
                  peringkatHafalan={peringkatHafalan}
                  peringkatKonsistensi={peringkatKonsistensi}
                  peringkatSemangat={peringkatSemangat}
                />
              )}

              {activeMenu === 'riwayat' && (
                <RiwayatSetoranSection riwayatSetoran={riwayat.riwayatSetoran} />
              )}

              {activeMenu === 'grafik' && (
                <ProgressHafalanSection
                  selectedSantri={data.selectedSantri}
                  totalSetoran={totalSetoran}
                  totalLancar={totalLancar}
                  totalRosib={totalRosib}
                  setoranBaru={setoranBaru}
                  setoranLama={setoranLama}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
