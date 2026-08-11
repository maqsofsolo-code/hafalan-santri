'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { daftarkanNotifikasi, cekStatusNotifikasi } from '../lib/push'
import RekapNilaiUjianGuru from '../components/RekapNilaiUjianGuru'
import { getHariWIB } from '../lib/dateWib'
import { filterSantriGuruPengganti } from './utils'

import { useGuruProfileData } from './hooks/useGuruProfileData'
import { useAbsensi } from './hooks/useAbsensi'
import { useSetoranForm } from './hooks/useSetoranForm'
import { useRiwayatSetoran } from './hooks/useRiwayatSetoran'
import { useRapotDigital } from './hooks/useRapotDigital'
import { useNilaiUjianRekap } from './hooks/useNilaiUjianRekap'

import { GuruPopups } from './components/GuruPopups'
import { GuruMobileHeader, GuruSidebarNav } from './components/GuruSidebar'
import { SetoranFormSection } from './components/SetoranFormSection'
import { NilaiUjianInputSection } from './components/NilaiUjianInputSection'
import { RiwayatSetoranSection } from './components/RiwayatSetoranSection'
import { RapotDigitalSection } from './components/RapotDigitalSection'
import { SantriSayaSection } from './components/SantriSayaSection'

// Halaman Guru -- dipecah jadi struktur modular pada Modularisasi Tahap 5A
// (lihat app/guru/hooks/, app/guru/components/, app/guru/utils.ts).
// page.tsx sekarang jadi orchestrator: memanggil hooks, menyimpan state
// tingkat halaman yang memang lintas-domain (activeMenu, sidebarOpen,
// errorMsg/successMsg -- errorMsg/successMsg dipakai bersama Input Setoran
// & Riwayat/Edit Setoran, persis seperti sebelumnya), dan menggabungkan
// section. Business rule, urutan validasi, dan payload API TIDAK diubah.
export default function GuruDashboard() {
  const [activeMenu, setActiveMenu] = useState('input')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [notifAktif, setNotifAktif] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifPesan, setNotifPesan] = useState('')

  const profileData = useGuruProfileData()
  const { guruProfile, santriList, allSantriList, surahList, kalenderAktif, kalenderUjianAktif, kalenderUjianGanda, fetchGuruData } = profileData

  const absensi = useAbsensi(guruProfile?.id)
  const riwayat = useRiwayatSetoran({ setErrorMsg, setSuccessMsg })
  const rapot = useRapotDigital()
  const ujianRekap = useNilaiUjianRekap()

  const setoranForm = useSetoranForm({
    santriList, allSantriList, surahList, guruProfile,
    setErrorMsg, refetch: fetchGuruData,
  })

  // URGENT FIX -- akses Nilai Ujian sekarang berbasis wing (jenis_kelas),
  // bukan lagi santri.guru_id/guru_id_2 (lihat app/api/nilai-ujian/route.ts).
  // santriWingUjian = seluruh santri aktif dalam wing guru (dipakai server
  // untuk otorisasi juga); santriLainUjian = wing dikurangi Santri Saya,
  // dipakai untuk "Cari santri lain" di Input Nilai Ujian. Reuse
  // filterSantriGuruPengganti (utils.ts) yang sudah ada untuk mode Guru
  // Pengganti Setoran -- bukan mapping wing baru.
  const santriWingUjian = useMemo(
    () => filterSantriGuruPengganti(allSantriList, '', guruProfile?.jenis_kelas),
    [allSantriList, guruProfile?.jenis_kelas]
  )
  const santriLainUjian = useMemo(
    () => santriWingUjian.filter(s => !santriList.some(own => own.id === s.id)),
    [santriWingUjian, santriList]
  )

  useEffect(() => { fetchGuruData() }, [fetchGuruData])

  useEffect(() => {
    if (guruProfile?.id) cekStatusNotifikasi(guruProfile.id).then(setNotifAktif)
  }, [guruProfile])

  const handleAktifkanNotif = async () => {
    if (!guruProfile) return
    setNotifLoading(true)
    setNotifPesan('')
    const hasil = await daftarkanNotifikasi(guruProfile.id, 'guru')
    setNotifPesan(hasil.message)
    if (hasil.ok) setNotifAktif(true)
    setNotifLoading(false)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const handleSelectMenu = (menuId: string) => {
    setActiveMenu(menuId); setSuccessMsg(''); setSidebarOpen(false)
    if (menuId === 'riwayat') riwayat.fetchRiwayat()
    if (menuId === 'rekap-ujian') ujianRekap.fetchNilaiUjian()
    if (menuId === 'rapot') rapot.fetchPeriodeAktif()
  }

  const hariMinggu = getHariWIB()
  const isLiburMingguan = hariMinggu === 0 || hariMinggu === 5
  const isLibur = isLiburMingguan || kalenderAktif?.tipe === 'libur'
  const isUjian = !!(kalenderAktif && (kalenderAktif.tipe === 'mid_semester' || kalenderAktif.tipe === 'semester'))
  const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50">

      <GuruPopups
        showPopupKunciWustha={setoranForm.showPopupKunciWustha}
        onTutupPopupKunciWustha={() => setoranForm.setShowPopupKunciWustha(false)}
        showPopupSukses={setoranForm.showPopupSukses}
        popupSuksesMsg={setoranForm.popupSuksesMsg}
        showPopupAbsen={absensi.showPopupAbsen}
        isBatalAbsen={absensi.isBatalAbsen}
        sesiAbsen={absensi.sesiAbsen}
        guruProfile={guruProfile}
        onBatalAbsen={() => absensi.setShowPopupAbsen(false)}
        onKonfirmasiAbsen={absensi.handleKonfirmasiAbsen}
      />

      <GuruMobileHeader
        guruProfile={guruProfile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        absenSubuh={absensi.absenSubuh}
        absenPagi={absensi.absenPagi}
        absenLoading={absensi.absenLoading}
        sesiAktif={absensi.sesiAktif}
        onKlikAbsen={absensi.handleKlikAbsen}
      />

      <div className="flex">
        <GuruSidebarNav
          guruProfile={guruProfile}
          activeMenu={activeMenu}
          onSelectMenu={handleSelectMenu}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isUjian={isUjian}
          absenSubuh={absensi.absenSubuh}
          absenPagi={absensi.absenPagi}
          absenLoading={absensi.absenLoading}
          sesiAktif={absensi.sesiAktif}
          onKlikAbsen={absensi.handleKlikAbsen}
          onLogout={handleLogout}
        />

        {/* MAIN CONTENT */}
        <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0 min-w-0">

          {activeMenu === 'input' && (
            <SetoranFormSection
              form={setoranForm}
              surahList={surahList}
              santriListCount={santriList.length}
              tanggal={tanggal}
              isLibur={isLibur}
              isLiburMingguan={isLiburMingguan}
              hariMinggu={hariMinggu}
              kalenderAktifNama={kalenderAktif?.nama}
              isUjian={isUjian}
              kalenderAktifTipe={kalenderAktif?.tipe}
              notifAktif={notifAktif}
              notifLoading={notifLoading}
              notifPesan={notifPesan}
              onAktifkanNotif={handleAktifkanNotif}
              absenSubuh={absensi.absenSubuh}
              absenPagi={absensi.absenPagi}
              onKlikAbsen={absensi.handleKlikAbsen}
              errorMsg={errorMsg}
              setErrorMsg={setErrorMsg}
              successMsg={successMsg}
            />
          )}

          {activeMenu === 'ujian' && (
            <NilaiUjianInputSection
              tanggal={tanggal}
              kalenderUjianGanda={kalenderUjianGanda}
              kalenderUjianAktif={kalenderUjianAktif}
              santriList={santriList}
              santriLain={santriLainUjian}
            />
          )}

          {activeMenu === 'rekap-ujian' && (
            <RekapNilaiUjianGuru
              data={ujianRekap.nilaiUjianList}
              cakupanSantri={ujianRekap.ujianCakupanSantri}
              masterSegments={ujianRekap.ujianMasterSegments}
              santriList={santriWingUjian}
              loading={ujianRekap.ujianRekapLoading}
              error={ujianRekap.ujianRekapError}
              onRefresh={ujianRekap.fetchNilaiUjian}
              kalenderAktifId={kalenderUjianGanda ? null : kalenderUjianAktif?.id || null}
            />
          )}

          {activeMenu === 'rapot' && (
            <RapotDigitalSection rapot={rapot} />
          )}

          {activeMenu === 'riwayat' && (
            <RiwayatSetoranSection riwayat={riwayat} />
          )}

          {activeMenu === 'santri' && (
            <SantriSayaSection santriList={santriList} allSantriList={allSantriList} />
          )}

        </div>
      </div>
    </div>
  )
}
