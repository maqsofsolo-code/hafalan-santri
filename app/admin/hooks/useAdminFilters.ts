'use client'
import { useState } from 'react'
import { filterSantriList, getKelompokGuru } from '../utils'
import type { Guru, Santri, SantriRanking, Wali } from '../types'

// Filter/search dipakai bersama oleh tab Data Santri (filterJenjang,
// filterKelas, filterGuruId, filterJenisKelas, searchSantri), Data Guru
// (searchGuru), Data Wali (searchWali), dan Ranking (filterJenisKelas,
// filterJenjang, filterKelas, rankingLevel, activeRanking) -- SAMA seperti
// app/admin/page.tsx asli, filterJenjang/filterKelas/filterJenisKelas adalah
// satu state bersama antara tab Data Santri dan tab Ranking (mengganti
// filter di satu tab akan tetap berlaku saat pindah ke tab lain, persis
// perilaku lama). Dipisah jadi satu hook, bukan dipecah per-tab, supaya
// perilaku "state filter dibagi" ini tidak berubah.
export function useAdminFilters(santriList: Santri[], guruList: Guru[], waliList: Wali[]) {
  const [filterJenjang, setFilterJenjang] = useState('semua')
  const [filterKelas, setFilterKelas] = useState('semua')
  const [filterGuruId, setFilterGuruId] = useState('semua')
  const [filterJenisKelas, setFilterJenisKelas] = useState('semua')
  const [searchSantri, setSearchSantri] = useState('')
  const [searchGuru, setSearchGuru] = useState('')
  const [searchWali, setSearchWali] = useState('')
  // Semua | Putra | Putri | Belum Terklasifikasi -- Tahap 7C, hanya
  // mempersempit tampilan Data Guru (client-side dari guruList existing).
  const [filterKelompokGuru, setFilterKelompokGuru] = useState<'semua' | 'putra' | 'putri' | 'belum_terklasifikasi'>('semua')

  const [activeRanking, setActiveRanking] = useState('total')
  const [rankingLevel, setRankingLevel] = useState('kelas') // kelas | jenjang | global

  const santriFiltered = filterSantriList(santriList, { filterJenjang, filterKelas, filterGuruId, filterJenisKelas, searchSantri })

  const guruFiltered = guruList.filter(g =>
    (!searchGuru || g.nama?.toLowerCase().includes(searchGuru.toLowerCase()) || g.no_wa?.includes(searchGuru))
    && (filterKelompokGuru === 'semua' || getKelompokGuru(g.jenis_kelas) === filterKelompokGuru)
  )

  const waliFiltered = waliList.filter(w =>
    !searchWali || w.nama?.toLowerCase().includes(searchWali.toLowerCase()) || w.no_wa?.includes(searchWali)
  )

  // Filter ranking
  const filterRankingList = (list: SantriRanking[]) => {
    return list.filter(s => {
      // Filter jenis kelas — pisah banin vs banat
      // Ulya TN A dan TN B digabung
      if (filterJenisKelas !== 'semua') {
        if (filterJenisKelas === 'tn') {
          if (s.jenis_kelas !== 'tn_a' && s.jenis_kelas !== 'tn_b') return false
        } else {
          if (s.jenis_kelas !== filterJenisKelas) return false
        }
      }
      // Filter berdasarkan level
      if (rankingLevel === 'kelas') {
        if (filterJenjang !== 'semua' && s.jenjang !== filterJenjang) return false
        if (filterKelas !== 'semua' && s.kelas_num?.toString() !== filterKelas) return false
      } else if (rankingLevel === 'jenjang') {
        if (filterJenjang !== 'semua' && s.jenjang !== filterJenjang) return false
      }
      // global = semua, tidak ada filter tambahan
      return true
    })
  }

  return {
    filterJenjang, setFilterJenjang, filterKelas, setFilterKelas,
    filterGuruId, setFilterGuruId, filterJenisKelas, setFilterJenisKelas,
    searchSantri, setSearchSantri, searchGuru, setSearchGuru, searchWali, setSearchWali,
    filterKelompokGuru, setFilterKelompokGuru,
    activeRanking, setActiveRanking, rankingLevel, setRankingLevel,
    santriFiltered, guruFiltered, waliFiltered, filterRankingList,
  }
}
