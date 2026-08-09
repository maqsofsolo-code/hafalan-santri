'use client'
import { useState } from 'react'
import { hitungRekapNilaiPerKelas } from '../utils'
import type { NilaiUjianRow } from '../types'

// Tab "Rekap Nilai Ujian" -- dipindah dari app/kepsek/page.tsx (Modularisasi
// Tahap 7A) TANPA mengubah logic. nilaiUjianList berasal dari useKepsekData.
export function useKepsekUjian(nilaiUjianList: NilaiUjianRow[]) {
  const [filterUjianJenjang, setFilterUjianJenjang] = useState('semua')
  const [filterUjianKelas, setFilterUjianKelas] = useState('semua')

  const nilaiUjianFiltered = nilaiUjianList.filter(n => {
    if (filterUjianJenjang !== 'semua' && n.santri?.jenjang !== filterUjianJenjang) return false
    if (filterUjianKelas !== 'semua' && n.santri?.kelas_num?.toString() !== filterUjianKelas) return false
    return true
  })

  const rekapNilaiPerKelas = hitungRekapNilaiPerKelas(nilaiUjianList)

  return {
    filterUjianJenjang, setFilterUjianJenjang, filterUjianKelas, setFilterUjianKelas,
    nilaiUjianFiltered, rekapNilaiPerKelas,
  }
}
