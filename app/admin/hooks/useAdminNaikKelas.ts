'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { kelasLabel } from '../utils'
import type { Santri } from '../types'

// Proses Naik Kelas (preview + eksekusi, termasuk naik jenjang Ula->Wustha->Ulya
// dan kelulusan jadi alumni di kelas 12 Ulya). Dipindah dari
// app/admin/page.tsx (Modularisasi Tahap 6A) TANPA mengubah logic sama
// sekali. Butuh `fetchData` untuk refresh santriList setelah proses.
export function useAdminNaikKelas(fetchData: () => void) {
  const [naikKelasJenjang, setNaikKelasJenjang] = useState('ula')
  const [naikKelasNum, setNaikKelasNum] = useState('')
  const [naikKelasLoading, setNaikKelasLoading] = useState(false)
  const [naikKelasPreview, setNaikKelasPreview] = useState<Santri[]>([])
  const [naikKelasChecked, setNaikKelasChecked] = useState<Record<string, boolean>>({})
  const [naikKelasMsg, setNaikKelasMsg] = useState('')

  const handlePreviewNaikKelas = async () => {
    if (!naikKelasNum) return
    const { data } = await supabase.from('santri')
      .select('id, nama, kelas_num, jenjang, kelas, jenis_kelas')
      .eq('jenjang', naikKelasJenjang)
      .eq('kelas_num', parseInt(naikKelasNum))
      .eq('status', 'aktif')
      .order('nama')
    setNaikKelasPreview(data || [])
    const checked: Record<string, boolean> = {}
    ;(data || []).forEach((s) => { checked[s.id] = true })
    setNaikKelasChecked(checked)
    setNaikKelasMsg('')
  }

  const handleProsesNaikKelas = async () => {
    const santriNaik = naikKelasPreview.filter(s => naikKelasChecked[s.id])
    const santriTinggal = naikKelasPreview.filter(s => !naikKelasChecked[s.id])
    if (santriNaik.length === 0) { setNaikKelasMsg('Pilih minimal 1 santri untuk naik kelas.'); return }
    if (!confirm(`Proses naik kelas untuk ${santriNaik.length} santri? Tindakan ini tidak bisa dibatalkan.`)) return
    setNaikKelasLoading(true)
    setNaikKelasMsg('')

    const kelasSekarang = parseInt(naikKelasNum)

    for (const santri of santriNaik) {
      let kelasBaruNum = kelasSekarang + 1
      let jenjangBaru = naikKelasJenjang

      // Cek naik jenjang
      if (naikKelasJenjang === 'ula' && kelasSekarang === 6) {
        kelasBaruNum = 7; jenjangBaru = 'wustha'
      } else if (naikKelasJenjang === 'wustha' && kelasSekarang === 9) {
        kelasBaruNum = 10; jenjangBaru = 'ulya'
      } else if (naikKelasJenjang === 'ulya' && kelasSekarang === 12) {
        // Lulus — jadikan alumni
        await supabase.from('santri').update({
          status: 'alumni',
          tahun_lulus: new Date().getFullYear().toString(),
          guru_id: null
        }).eq('id', santri.id)
        continue
      }

      await supabase.from('santri').update({
        kelas_num: kelasBaruNum,
        jenjang: jenjangBaru,
        kelas: kelasLabel(kelasBaruNum, jenjangBaru, santri.jenis_kelas || 'banin'),
        guru_id: null
      }).eq('id', santri.id)
    }

    setNaikKelasLoading(false)
    setNaikKelasPreview([])
    setNaikKelasChecked({})
    const pesanLulus = naikKelasJenjang === 'ulya' && kelasSekarang === 12
      ? ` (${santriNaik.length} santri lulus → alumni)`
      : ''
    setNaikKelasMsg(`✓ Berhasil! ${santriNaik.length} santri naik kelas${pesanLulus}. Hubungkan ke guru baru di menu Data Santri.`)
    fetchData()
  }

  // Dipanggil dari resetForm() bersama (useAdminEntityForm) -- di kode asli,
  // resetForm() Guru/Wali/Santri/Kalender JUGA mengosongkan naikKelasPreview/
  // naikKelasChecked/naikKelasMsg sekaligus (satu fungsi reset besar).
  const resetNaikKelas = () => {
    setNaikKelasPreview([]); setNaikKelasChecked({}); setNaikKelasMsg('')
  }

  return {
    naikKelasJenjang, setNaikKelasJenjang, naikKelasNum, setNaikKelasNum,
    naikKelasLoading, naikKelasPreview, setNaikKelasPreview,
    naikKelasChecked, setNaikKelasChecked, naikKelasMsg,
    handlePreviewNaikKelas, handleProsesNaikKelas, resetNaikKelas,
  }
}
