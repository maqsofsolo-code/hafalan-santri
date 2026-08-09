'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { SetoranRow } from '../types'

// Riwayat setoran (30 terakhir) satu santri -- dipindah dari
// app/wali/page.tsx (Modularisasi Tahap 8A) TANPA mengubah query/limit.
// Wali read-only -- tidak ada handler edit/hapus/mutation di sini.
export function useWaliRiwayat() {
  const [riwayatSetoran, setRiwayatSetoran] = useState<SetoranRow[]>([])

  const fetchRiwayat = async (santriId: string) => {
    const { data } = await supabase
      .from('setoran').select('*').eq('santri_id', santriId)
      .order('tanggal', { ascending: false }).limit(30)
    setRiwayatSetoran(data || [])
  }

  return { riwayatSetoran, fetchRiwayat }
}
