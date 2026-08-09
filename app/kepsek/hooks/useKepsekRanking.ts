'use client'
import { useState } from 'react'
import { filterSantriRanking } from '../utils'

// Tab "Ranking Santri" -- dipindah dari app/kepsek/page.tsx (Modularisasi
// Tahap 7A) TANPA mengubah logic. Ranking sendiri (Total Hafalan/Konsistensi/
// Semangat) dihitung di useKepsekData lewat app/lib/ranking.ts; hook ini
// hanya memegang state filter/level/tab dan fungsi filter generik `filterSantri`
// yang dipakai untuk ketiga daftar ranking sekaligus (persis kode asli).
export function useKepsekRanking() {
  const [activeRanking, setActiveRanking] = useState('konsistensi')
  const [rankingLevel, setRankingLevel] = useState('kelas')
  const [filterJenisKelas, setFilterJenisKelas] = useState('semua')
  const [filterJenjang, setFilterJenjang] = useState('semua')
  const [filterKelas, setFilterKelas] = useState('semua')

  function filterSantri<T extends { jenis_kelas?: unknown, jenjang?: unknown, kelas_num?: unknown }>(list: T[]): T[] {
    return filterSantriRanking(list, { filterJenisKelas, rankingLevel, filterJenjang, filterKelas })
  }

  return {
    activeRanking, setActiveRanking, rankingLevel, setRankingLevel,
    filterJenisKelas, setFilterJenisKelas, filterJenjang, setFilterJenjang, filterKelas, setFilterKelas,
    filterSantri,
  }
}
