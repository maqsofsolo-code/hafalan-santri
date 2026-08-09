'use client'
import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getTanggalWIB } from '../../lib/dateWib'
import { filterSantriMonitoring, getKelompokSantri } from '../utils'
import type { Santri, SetoranRow, AbsensiGuru } from '../types'

// Tab "Monitoring Harian" -- dipindah dari app/kepsek/page.tsx (Modularisasi
// Tahap 7A) TANPA mengubah logic. `setoranTanggalDipilih`/`absensiTanggalDipilih`
// dan setternya diterima dari useKepsekData (bukan dimiliki hook ini) karena
// nilai awalnya diisi bersamaan dengan fetch hari-ini di sana -- lihat
// komentar di useKepsekData.ts.
export function useKepsekMonitoring(
  santriList: Santri[],
  setoranTanggalDipilih: SetoranRow[],
  setSetoranTanggalDipilih: (v: SetoranRow[]) => void,
  absensiTanggalDipilih: AbsensiGuru[],
  setAbsensiTanggalDipilih: (v: AbsensiGuru[]) => void,
) {
  const [monitoringTanggal, setMonitoringTanggal] = useState(getTanggalWIB())
  const [searchMonitoring, setSearchMonitoring] = useState('')
  const [filterMonitoringJenjang, setFilterMonitoringJenjang] = useState('semua')
  const [filterMonitoringKelas, setFilterMonitoringKelas] = useState('semua')
  // Semua | Banin | Banat -- Koreksi Tahap 7B, hanya mempersempit tampilan
  // kategori di bawah (utils::getKelompokSantri), tidak mengubah rumus
  // kategori setoran.
  const [filterKelompokSantri, setFilterKelompokSantri] = useState<'semua' | 'banin' | 'banat'>('semua')
  const [loadingMonitoring, setLoadingMonitoring] = useState(false)

  const fetchMonitoringTanggal = useCallback(async (tgl: string) => {
    setLoadingMonitoring(true)
    const [{ data: setoran }, { data: absensi }] = await Promise.all([
      supabase.from('setoran').select('*, santri:santri_id(nama, kelas, kelas_num, jenjang, guru:guru_id(nama))').eq('tanggal', tgl),
      supabase.from('absensi_guru').select('*, guru:guru_id(nama)').eq('tanggal', tgl)
    ])
    setSetoranTanggalDipilih(setoran || [])
    setAbsensiTanggalDipilih(absensi || [])
    setLoadingMonitoring(false)
  }, [setSetoranTanggalDipilih, setAbsensiTanggalDipilih])

  const handleUbahTanggalMonitoring = (tgl: string) => {
    setMonitoringTanggal(tgl)
    fetchMonitoringTanggal(tgl)
  }

  // Data monitoring berdasarkan tanggal yang dipilih
  const guruAbsenSubuhTanggal = absensiTanggalDipilih.filter(a => a.sesi === 'subuh').map(a => a.guru_id)
  const guruAbsenPagiTanggal = absensiTanggalDipilih.filter(a => a.sesi === 'pagi').map(a => a.guru_id)

  // Dasar (jenjang/kelas/nama saja, BELUM kelompok) -- dipakai tombol Salin
  // Belum Diinput Banin/Banat supaya kedua kelompok tetap bisa disalin
  // terlepas dari toggle Semua/Banin/Banat yang sedang aktif di layar.
  const santriMonitoringFilteredDasar = filterSantriMonitoring(santriList, setoranTanggalDipilih, {
    filterMonitoringJenjang, filterMonitoringKelas, searchMonitoring,
  })
  // Ditambah filter kelompok (Semua/Banin/Banat) -- dipakai daftar kategori
  // yang tampil di layar (item F, Koreksi Tahap 7B).
  const santriMonitoringFiltered = filterKelompokSantri === 'semua'
    ? santriMonitoringFilteredDasar
    : santriMonitoringFilteredDasar.filter(s => getKelompokSantri(s.jenis_kelas) === filterKelompokSantri)

  const santriSudahSetorFiltered = santriMonitoringFiltered.filter(s => s.kategoriSetor === 'sudah_setor')
  const santriHadirTidakSetorFiltered = santriMonitoringFiltered.filter(s => s.kategoriSetor === 'hadir_tidak_setor')
  const santriTidakHadirFiltered = santriMonitoringFiltered.filter(s => ['sakit', 'izin', 'alpha'].includes(s.kategoriSetor))
  const santriBelumDiinputFiltered = santriMonitoringFiltered.filter(s => s.kategoriSetor === 'belum_diinput')
  const santriPerluPerhatianFiltered = santriMonitoringFiltered.filter(s => s.kategoriSetor !== 'sudah_setor')
  // Pecahan santriTidakHadirFiltered per kategori -- ditambahkan Tahap 7B
  // supaya Alpha bisa ditonjolkan terpisah dari Sakit/Izin (prioritas 3 vs
  // info-saja), tanpa mengubah rumus kategoriSetoranSantri/filterSantriMonitoring.
  const santriAlphaFiltered = santriMonitoringFiltered.filter(s => s.kategoriSetor === 'alpha')
  const santriSakitFiltered = santriMonitoringFiltered.filter(s => s.kategoriSetor === 'sakit')
  const santriIzinFiltered = santriMonitoringFiltered.filter(s => s.kategoriSetor === 'izin')

  return {
    monitoringTanggal, searchMonitoring, setSearchMonitoring,
    filterMonitoringJenjang, setFilterMonitoringJenjang, filterMonitoringKelas, setFilterMonitoringKelas,
    filterKelompokSantri, setFilterKelompokSantri,
    loadingMonitoring, handleUbahTanggalMonitoring,
    setoranTanggalDipilih, guruAbsenSubuhTanggal, guruAbsenPagiTanggal,
    santriMonitoringFilteredDasar,
    santriMonitoringFiltered, santriSudahSetorFiltered, santriHadirTidakSetorFiltered,
    santriTidakHadirFiltered, santriBelumDiinputFiltered, santriPerluPerhatianFiltered,
    santriAlphaFiltered, santriSakitFiltered, santriIzinFiltered,
  }
}
