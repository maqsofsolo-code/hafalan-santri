'use client'
import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { cocokGuruUntukJenisKelasSantri } from '../utils'
import type { PenugasanHafalanRow, WaliKelasAssignmentRow, Guru, Santri } from '../types'

// CRUD + bulk public.penugasan_hafalan (Guru Hafalan) & public.wali_kelas_assignment
// (Wali Kelas) -- Tahap 9D. Tabel & RLS sudah ada sejak Tahap 9B (admin:
// SELECT/INSERT/UPDATE/DELETE langsung dari browser). Hook ini TIDAK
// menyentuh sistem lama sama sekali: tidak pernah menulis
// santri.guru_id/guru_id_2 atau profiles.is_wali_kelas/wali_kelas_num/
// wali_kelas_jenis -- kedua sistem sengaja coexist (lihat
// PENUGASAN_GURU_FOUNDATION.md).
//
// Batas max-2 Guru Hafalan aktif/santri/periode dan batas 1 Wali Kelas
// aktif/kelas/periode DITEGAKKAN DATABASE (trigger advisory-lock &
// partial unique index dari Tahap 9B) -- pesan error constraint di bawah
// hanya diterjemahkan jadi kalimat yang bisa dibaca admin, bukan validasi
// pengganti.
export function useAdminPenugasanGuru() {
  // ===== GURU HAFALAN =====
  const [penugasanHafalanList, setPenugasanHafalanList] = useState<PenugasanHafalanRow[]>([])
  const [loadingPenugasanHafalan, setLoadingPenugasanHafalan] = useState(false)
  const [penugasanHafalanError, setPenugasanHafalanError] = useState('')

  const fetchPenugasanHafalan = useCallback(async (periodeId: string) => {
    if (!periodeId) { setPenugasanHafalanList([]); return }
    setLoadingPenugasanHafalan(true); setPenugasanHafalanError('')
    const { data, error } = await supabase.from('penugasan_hafalan')
      .select('*, guru:guru_id(nama)')
      .eq('periode_id', periodeId)
      .order('created_at', { ascending: false })
    setLoadingPenugasanHafalan(false)
    if (error) { setPenugasanHafalanError(error.message); return }
    setPenugasanHafalanList((data || []) as PenugasanHafalanRow[])
  }, [])

  const terjemahkanErrorPenugasanHafalan = (message: string): string => {
    if (message.includes('penugasan_hafalan_guru_santri_periode_key')) {
      return 'Guru ini sudah ditugaskan ke santri ini pada periode yang sama.'
    }
    if (message.includes('sudah memiliki 2 Guru Hafalan aktif')) {
      return 'Santri ini sudah memiliki 2 Guru Hafalan aktif pada periode ini.'
    }
    return message
  }

  // guruJenisKelas/santriJenisKelas opsional: kalau diisi, dicek dulu
  // memakai cocokGuruUntukJenisKelasSantri (helper yang sama dengan bulk &
  // dropdown UI) supaya integritas wing tidak hanya dijaga oleh filter
  // dropdown -- bukan mapping/aturan baru, KOREKSI Tahap 9D.
  const handleAssignGuruHafalan = async (
    guruId: string, santriId: string, periodeId: string,
    guruJenisKelas?: string | null, santriJenisKelas?: string | null
  ): Promise<{ ok: boolean, pesan: string }> => {
    if (!guruId || !santriId || !periodeId) return { ok: false, pesan: 'Pilih guru dan pastikan periode aktif sudah dipilih.' }
    if (guruJenisKelas !== undefined && santriJenisKelas !== undefined
      && !cocokGuruUntukJenisKelasSantri(guruJenisKelas, santriJenisKelas)) {
      return { ok: false, pesan: 'Guru tidak sesuai kelompok (jenis kelas) santri ini.' }
    }
    const { error } = await supabase.from('penugasan_hafalan').insert({
      guru_id: guruId, santri_id: santriId, periode_id: periodeId, is_aktif: true,
    })
    if (error) return { ok: false, pesan: terjemahkanErrorPenugasanHafalan(error.message) }
    await fetchPenugasanHafalan(periodeId)
    return { ok: true, pesan: 'Guru Hafalan berhasil ditugaskan.' }
  }

  const handleNonaktifkanPenugasanHafalan = async (id: string, periodeId: string) => {
    const { error } = await supabase.from('penugasan_hafalan').update({ is_aktif: false }).eq('id', id)
    if (error) { alert('Gagal menonaktifkan penugasan: ' + error.message); return }
    fetchPenugasanHafalan(periodeId)
  }

  const handleHapusPenugasanHafalan = async (id: string, periodeId: string) => {
    if (!confirm('Hapus baris penugasan ini secara permanen?\n\nHistori penting -- gunakan ini hanya untuk memperbaiki entry yang salah. Untuk mengakhiri penugasan yang memang benar, pakai "Nonaktifkan" supaya riwayatnya tetap tersimpan.')) return
    const { error } = await supabase.from('penugasan_hafalan').delete().eq('id', id)
    if (error) { alert('Gagal menghapus penugasan: ' + error.message); return }
    fetchPenugasanHafalan(periodeId)
  }

  // Bulk: satu guru -> banyak santri sekaligus, dalam satu periode.
  // KOREKSI Tahap 9D: pilihan santri bisa lintas wing sementara dropdown
  // Guru bulk sengaja TIDAK difilter (satu bulk bisa mencakup santri lintas
  // wing) dan database penugasan_hafalan tidak punya constraint wing --
  // jadi setiap santri terpilih dicek dulu kecocokan wing guru vs
  // jenis_kelas santri (cocokGuruUntukJenisKelasSantri, helper yang sama
  // dengan dropdown single-assignment) SEBELUM pemeriksaan lain; yang tidak
  // cocok di-skip (dilewatiWing) dan TIDAK diinsert -- kalau semua yang
  // dipilih tidak cocok wing, tidak ada query/insert sama sekali. Sisanya
  // tetap dicek assignment aktif existing (satu query, bukan trial-and-error
  // lewat error DB satu per satu) supaya santri yang sudah penuh (2 aktif)
  // atau sudah punya guru yang sama dilewati dengan pesan jelas.
  const handleBulkAssignGuruHafalan = async (
    santriIds: string[], guruId: string, periodeId: string,
    santriList: Santri[], guruList: Guru[]
  ): Promise<{ berhasil: number, dilewatiPenuh: number, dilewatiDuplikat: number, dilewatiWing: number, gagalLain: number }> => {
    const hasil = { berhasil: 0, dilewatiPenuh: 0, dilewatiDuplikat: 0, dilewatiWing: 0, gagalLain: 0 }
    if (santriIds.length === 0 || !guruId || !periodeId) return hasil

    const guru = guruList.find(g => g.id === guruId)
    const santriIdsWingCocok: string[] = []
    for (const santriId of santriIds) {
      const santri = santriList.find(s => s.id === santriId)
      if (!santri || !cocokGuruUntukJenisKelasSantri(guru?.jenis_kelas, santri.jenis_kelas)) {
        hasil.dilewatiWing++
        continue
      }
      santriIdsWingCocok.push(santriId)
    }
    if (santriIdsWingCocok.length === 0) return hasil

    const { data: existingData, error: existingError } = await supabase
      .from('penugasan_hafalan')
      .select('santri_id, guru_id, is_aktif')
      .eq('periode_id', periodeId)
      .in('santri_id', santriIdsWingCocok)

    if (existingError) {
      hasil.gagalLain = santriIdsWingCocok.length
      return hasil
    }

    const existing = existingData || []
    for (const santriId of santriIdsWingCocok) {
      const rowsSantri = existing.filter(r => r.santri_id === santriId)
      const aktifCount = rowsSantri.filter(r => r.is_aktif).length
      const sudahAdaGuruSama = rowsSantri.some(r => r.guru_id === guruId)

      if (sudahAdaGuruSama) { hasil.dilewatiDuplikat++; continue }
      if (aktifCount >= 2) { hasil.dilewatiPenuh++; continue }

      const { error } = await supabase.from('penugasan_hafalan').insert({
        guru_id: guruId, santri_id: santriId, periode_id: periodeId, is_aktif: true,
      })
      if (error) { hasil.gagalLain++; continue }
      hasil.berhasil++
    }

    await fetchPenugasanHafalan(periodeId)
    return hasil
  }

  // ===== WALI KELAS =====
  const [waliKelasList, setWaliKelasList] = useState<WaliKelasAssignmentRow[]>([])
  const [loadingWaliKelas, setLoadingWaliKelas] = useState(false)
  const [waliKelasError, setWaliKelasError] = useState('')

  const fetchWaliKelasAssignment = useCallback(async (periodeId: string) => {
    if (!periodeId) { setWaliKelasList([]); return }
    setLoadingWaliKelas(true); setWaliKelasError('')
    const { data, error } = await supabase.from('wali_kelas_assignment')
      .select('*, guru:guru_id(nama)')
      .eq('periode_id', periodeId)
      .order('jenjang', { ascending: true })
      .order('kelas_num', { ascending: true })
      .order('jenis_kelas', { ascending: true })
    setLoadingWaliKelas(false)
    if (error) { setWaliKelasError(error.message); return }
    setWaliKelasList((data || []) as WaliKelasAssignmentRow[])
  }, [])

  const handleAssignWaliKelas = async (
    guruId: string, periodeId: string, jenjang: string, kelasNum: number, jenisKelas: string
  ): Promise<{ ok: boolean, pesan: string }> => {
    if (!guruId || !periodeId || !jenjang || !kelasNum || !jenisKelas) {
      return { ok: false, pesan: 'Lengkapi jenjang, kelas, jenis kelas, dan guru terlebih dahulu.' }
    }
    const { error } = await supabase.from('wali_kelas_assignment').insert({
      guru_id: guruId, periode_id: periodeId, jenjang, kelas_num: kelasNum, jenis_kelas: jenisKelas, is_aktif: true,
    })
    if (error) {
      const pesan = error.message.includes('wali_kelas_assignment_satu_aktif_per_kelas')
        ? 'Kelas ini sudah memiliki Wali Kelas aktif pada periode ini. Nonaktifkan yang lama dulu untuk menggantinya.'
        : error.message
      return { ok: false, pesan }
    }
    await fetchWaliKelasAssignment(periodeId)
    return { ok: true, pesan: 'Wali Kelas berhasil ditugaskan.' }
  }

  const handleNonaktifkanWaliKelas = async (id: string, periodeId: string) => {
    const { error } = await supabase.from('wali_kelas_assignment').update({ is_aktif: false }).eq('id', id)
    if (error) { alert('Gagal menonaktifkan: ' + error.message); return }
    fetchWaliKelasAssignment(periodeId)
  }

  const handleHapusWaliKelas = async (id: string, periodeId: string) => {
    if (!confirm('Hapus baris wali kelas ini secara permanen?\n\nHistori penting -- gunakan ini hanya untuk memperbaiki entry yang salah. Untuk mengganti wali kelas yang memang benar, pakai "Nonaktifkan" lalu tugaskan wali kelas baru.')) return
    const { error } = await supabase.from('wali_kelas_assignment').delete().eq('id', id)
    if (error) { alert('Gagal menghapus: ' + error.message); return }
    fetchWaliKelasAssignment(periodeId)
  }

  return {
    penugasanHafalanList, loadingPenugasanHafalan, penugasanHafalanError, fetchPenugasanHafalan,
    handleAssignGuruHafalan, handleNonaktifkanPenugasanHafalan, handleHapusPenugasanHafalan,
    handleBulkAssignGuruHafalan,
    waliKelasList, loadingWaliKelas, waliKelasError, fetchWaliKelasAssignment,
    handleAssignWaliKelas, handleNonaktifkanWaliKelas, handleHapusWaliKelas,
  }
}
