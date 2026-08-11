'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AdminRekapNilaiUjian from '../components/AdminRekapNilaiUjian'
import { getTanggalWIB, getHariWIB } from '../lib/dateWib'

import { useAdminData } from './hooks/useAdminData'
import { useAdminEntityForm } from './hooks/useAdminEntityForm'
import { useAdminSantri } from './hooks/useAdminSantri'
import { useAdminGuruWali } from './hooks/useAdminGuruWali'
import { useAdminKalender } from './hooks/useAdminKalender'
import { useAdminNaikKelas } from './hooks/useAdminNaikKelas'
import { useAdminFilters } from './hooks/useAdminFilters'
import { useAdminMonitoring } from './hooks/useAdminMonitoring'
import { useAdminRapot } from './hooks/useAdminRapot'
import { useAdminLaporan } from './hooks/useAdminLaporan'
import { useAdminPeriodeAkademik } from './hooks/useAdminPeriodeAkademik'
import { useAdminPenugasanGuru } from './hooks/useAdminPenugasanGuru'

import { AdminMobileHeader, AdminSidebarNav } from './components/AdminSidebar'
import { DashboardSection } from './components/DashboardSection'
import { MonitoringSection } from './components/MonitoringSection'
import { KalenderSection } from './components/KalenderSection'
import { GuruSection } from './components/GuruSection'
import { PenugasanGuruSection } from './components/PenugasanGuruSection'
import { SantriSection } from './components/SantriSection'
import { WaliSection } from './components/WaliSection'
import { RankingSection } from './components/RankingSection'
import { AlumniList } from './components/AlumniList'
import { NaikKelasSection } from './components/NaikKelasSection'
import { RapotDigitalSection } from './components/RapotDigitalSection'
import { LaporanBulananSection } from './components/LaporanBulananSection'
import type { Santri } from './types'

// Halaman Admin -- dipecah jadi struktur modular pada Modularisasi Tahap 6A
// (lihat app/admin/hooks/, app/admin/components/, app/admin/utils.ts,
// app/admin/types.ts). page.tsx sekarang jadi orchestrator: memanggil
// hooks, menyimpan state tingkat halaman (activeMenu, sidebarOpen), dan
// menyusun section. Business rule, urutan validasi, dan payload API TIDAK
// diubah dari app/admin/page.tsx sebelumnya.
export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const data = useAdminData()
  const naikKelas = useAdminNaikKelas(data.fetchData)
  const form = useAdminEntityForm(naikKelas.resetNaikKelas)
  const santriHandlers = useAdminSantri(form, data.surahList, data.fetchData)
  const guruWali = useAdminGuruWali(form, data.fetchData)
  const kalender = useAdminKalender(form, data.fetchData)
  const filters = useAdminFilters(data.santriList, data.guruList, data.waliList)
  const monitoring = useAdminMonitoring(data.santriList, data.guruList, data.setoranHariIni)
  const rapot = useAdminRapot({ setLoading: form.setLoading, setErrorMsg: form.setErrorMsg, setSuccessMsg: form.setSuccessMsg })
  const laporan = useAdminLaporan(data.bukaLaporanHTML)
  const periodeAkademik = useAdminPeriodeAkademik()
  const penugasanGuru = useAdminPenugasanGuru()

  const { fetchData } = data
  useEffect(() => { fetchData() }, [fetchData])

  const { fetchPeriodeList } = periodeAkademik
  useEffect(() => { fetchPeriodeList() }, [fetchPeriodeList])

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const handleSelectMenu = (menuId: string) => {
    setActiveMenu(menuId); form.setShowForm(false); form.setSuccessMsg(''); setSidebarOpen(false)
  }

  const handleEditSantriFromAlumni = (s: Santri) => {
    santriHandlers.handleEditSantri(s)
    setActiveMenu('santri')
    setSidebarOpen(false)
  }

  // Status hari ini
  const today = getTanggalWIB()
  const hariMinggu = getHariWIB()
  const isLiburMingguan = hariMinggu === 0 || hariMinggu === 5
  const kalenderAktif = data.kalenderList.find(k => today >= k.tanggal_mulai && today <= k.tanggal_selesai)
  const isLiburAkademik = isLiburMingguan || kalenderAktif?.tipe === 'libur'
  const isUjian = kalenderAktif && (kalenderAktif.tipe === 'mid_semester' || kalenderAktif.tipe === 'semester')

  const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminMobileHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex">
        <AdminSidebarNav
          activeMenu={activeMenu}
          onSelectMenu={handleSelectMenu}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLogout={handleLogout}
        />

        {/* MAIN CONTENT */}
        <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0 min-w-0">

          {activeMenu === 'dashboard' && (
            <DashboardSection
              guruList={data.guruList}
              santriList={data.santriList}
              waliList={data.waliList}
              setoranHariIni={data.setoranHariIni}
              tanggal={tanggal}
              isLiburAkademik={isLiburAkademik}
              isLiburMingguan={isLiburMingguan}
              hariMinggu={hariMinggu}
              kalenderAktif={kalenderAktif}
              isUjian={isUjian}
              handleDownloadTemplate={data.handleDownloadTemplate}
              importLoading={data.importLoading}
              handleImportExcel={data.handleImportExcel}
              handleDownloadAllData={() => data.handleDownloadAllData(form.setErrorMsg)}
              downloadLoading={data.downloadLoading}
              importMsg={data.importMsg}
            />
          )}

          {activeMenu === 'monitoring' && (
            <MonitoringSection
              tanggal={tanggal}
              santriList={data.santriList}
              guruList={data.guruList}
              {...monitoring}
            />
          )}

          {activeMenu === 'kalender' && (
            <KalenderSection
              form={form}
              kalender={kalender}
              kalenderList={data.kalenderList}
              today={today}
              hariMinggu={hariMinggu}
              isLiburMingguan={isLiburMingguan}
              kalenderAktif={kalenderAktif}
              isUjian={isUjian}
            />
          )}

          {activeMenu === 'guru' && (
            <GuruSection
              form={form}
              guruWali={guruWali}
              guruList={data.guruList}
              guruFiltered={filters.guruFiltered}
              santriList={data.santriList}
              searchGuru={filters.searchGuru}
              setSearchGuru={filters.setSearchGuru}
              filterKelompokGuru={filters.filterKelompokGuru}
              setFilterKelompokGuru={filters.setFilterKelompokGuru}
            />
          )}

          {activeMenu === 'penugasan-guru' && (
            <PenugasanGuruSection
              periodeAkademik={periodeAkademik}
              penugasan={penugasanGuru}
              guruList={data.guruList}
              santriList={data.santriList}
            />
          )}

          {activeMenu === 'santri' && (
            <SantriSection
              form={form}
              santriHandlers={santriHandlers}
              santriList={data.santriList}
              santriFiltered={filters.santriFiltered}
              guruList={data.guruList}
              waliList={data.waliList}
              surahList={data.surahList}
              filterJenjang={filters.filterJenjang} setFilterJenjang={filters.setFilterJenjang}
              filterKelas={filters.filterKelas} setFilterKelas={filters.setFilterKelas}
              filterGuruId={filters.filterGuruId} setFilterGuruId={filters.setFilterGuruId}
              filterJenisKelas={filters.filterJenisKelas} setFilterJenisKelas={filters.setFilterJenisKelas}
              searchSantri={filters.searchSantri} setSearchSantri={filters.setSearchSantri}
            />
          )}

          {activeMenu === 'wali' && (
            <WaliSection
              form={form}
              guruWali={guruWali}
              waliList={data.waliList}
              waliFiltered={filters.waliFiltered}
              santriList={data.santriList}
              searchWali={filters.searchWali}
              setSearchWali={filters.setSearchWali}
            />
          )}

          {activeMenu === 'ranking' && (
            <RankingSection
              filters={filters}
              rankingHafalan={data.rankingHafalan}
              rankingKonsistensi={data.rankingKonsistensi}
              rankingSemangat={data.rankingSemangat}
              rankingPeriodeKonsistensi={data.rankingPeriodeKonsistensi}
              bukaLaporanHTML={data.bukaLaporanHTML}
            />
          )}

          {activeMenu === 'alumni' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #92400e 0%, #d97706 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Data Alumni</h2>
                  <p className="text-yellow-100 text-sm mt-1">Santri yang telah lulus atau keluar</p>
                </div>
              </div>
              <AlumniList onEditSantri={handleEditSantriFromAlumni} />
            </div>
          )}

          {activeMenu === 'naik-kelas' && (
            <NaikKelasSection naikKelas={naikKelas} />
          )}

          {activeMenu === 'rapot' && (
            <RapotDigitalSection
              rapot={rapot}
              loading={form.loading}
              successMsg={form.successMsg}
              errorMsg={form.errorMsg}
              bukaLaporanHTML={data.bukaLaporanHTML}
            />
          )}

          {activeMenu === 'rekap-nilai-ujian' && (
            <AdminRekapNilaiUjian />
          )}

          {activeMenu === 'laporan' && (
            <LaporanBulananSection laporan={laporan} santriList={data.santriList} />
          )}

        </div>
      </div>
    </div>
  )
}
