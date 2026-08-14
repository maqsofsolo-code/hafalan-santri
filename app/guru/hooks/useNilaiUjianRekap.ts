'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchWithAuth } from '../../lib/authClient'
import type { CakupanSantriMap, MasterSegmentLite, NilaiUjianGuru, TajwidRow } from '../../components/RekapNilaiUjianGuru'

// Rekap Nilai Ujian milik guru yang login, dibaca lewat /api/nilai-ujian.
// Dipindah dari app/guru/page.tsx (Modularisasi Tahap 5A) TANPA mengubah
// permission/behavior sama sekali.
export function useNilaiUjianRekap() {
  const [nilaiUjianList, setNilaiUjianList] = useState<NilaiUjianGuru[]>([])
  const [ujianCakupanSantri, setUjianCakupanSantri] = useState<CakupanSantriMap>({})
  const [ujianMasterSegments, setUjianMasterSegments] = useState<MasterSegmentLite[]>([])
  const [ujianTajwidList, setUjianTajwidList] = useState<TajwidRow[]>([])
  const [ujianRekapLoading, setUjianRekapLoading] = useState(false)
  const [ujianRekapError, setUjianRekapError] = useState('')

  const fetchNilaiUjian = async () => {
    setUjianRekapLoading(true)
    setUjianRekapError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setUjianRekapError('Sesi login sudah berakhir. Silakan login kembali.')
        return
      }

      const response = await fetchWithAuth('/api/nilai-ujian', session.access_token, {
        cache: 'no-store',
      })
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 401) throw new Error('Sesi login tidak valid atau sudah berakhir.')
        if (response.status === 403) throw new Error('Akses rekap nilai ujian ditolak.')
        throw new Error(result.error || 'Gagal memuat rekap nilai ujian.')
      }

      setNilaiUjianList(Array.isArray(result.data) ? result.data : [])
      setUjianCakupanSantri(result.cakupanSantri && typeof result.cakupanSantri === 'object' ? result.cakupanSantri : {})
      setUjianMasterSegments(Array.isArray(result.masterSegments) ? result.masterSegments : [])
      setUjianTajwidList(Array.isArray(result.tajwidList) ? result.tajwidList : [])
    } catch (error) {
      setUjianRekapError(error instanceof Error ? error.message : 'Gagal memuat rekap nilai ujian.')
    } finally {
      setUjianRekapLoading(false)
    }
  }

  return {
    nilaiUjianList, ujianCakupanSantri, ujianMasterSegments, ujianTajwidList, ujianRekapLoading, ujianRekapError,
    fetchNilaiUjian,
  }
}
