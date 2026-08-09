'use client'
import { supabase } from '../../lib/supabase'
import type { KalenderAkademik } from '../types'
import type { useAdminEntityForm } from './useAdminEntityForm'

type EntityForm = ReturnType<typeof useAdminEntityForm>

// CRUD Kalender Akademik. Dipindah dari app/admin/page.tsx (Modularisasi
// Tahap 6A) TANPA mengubah validasi/behavior sama sekali.
export function useAdminKalender(form: EntityForm, fetchData: () => void) {
  const handleTambahKalender = async () => {
    form.setLoading(true); form.setErrorMsg('')
    if (!form.formKalNama || !form.formKalMulai || !form.formKalSelesai) { form.setErrorMsg('Nama, tanggal mulai dan selesai wajib diisi!'); form.setLoading(false); return }
    const { error } = await supabase.from('kalender_akademik').insert({
      nama: form.formKalNama, tipe: form.formKalTipe,
      semester: form.formKalTipe !== 'libur' ? parseInt(form.formKalSemester) : null,
      tanggal_mulai: form.formKalMulai, tanggal_selesai: form.formKalSelesai, keterangan: form.formKalKeterangan || null
    })
    if (error) { form.setErrorMsg(error.message); form.setLoading(false); return }
    form.setSuccessMsg('Kalender berhasil ditambahkan!')
    form.setShowForm(false); form.resetForm(); fetchData(); form.setLoading(false)
  }

  const handleEditKalender = (kal: KalenderAkademik) => {
    form.setEditKalenderId(kal.id); form.setFormKalNama(kal.nama); form.setFormKalTipe(kal.tipe)
    form.setFormKalSemester(kal.semester?.toString() || '1'); form.setFormKalMulai(kal.tanggal_mulai)
    form.setFormKalSelesai(kal.tanggal_selesai); form.setFormKalKeterangan(kal.keterangan || '')
    form.setShowForm(true); form.setFormType('kalender')
  }

  const handleUpdateKalender = async () => {
    form.setLoading(true); form.setErrorMsg('')
    const { error } = await supabase.from('kalender_akademik').update({
      nama: form.formKalNama, tipe: form.formKalTipe,
      semester: form.formKalTipe !== 'libur' ? parseInt(form.formKalSemester) : null,
      tanggal_mulai: form.formKalMulai, tanggal_selesai: form.formKalSelesai, keterangan: form.formKalKeterangan || null
    }).eq('id', form.editKalenderId)
    if (error) { form.setErrorMsg(error.message); form.setLoading(false); return }
    form.setSuccessMsg('Kalender berhasil diupdate!')
    form.setShowForm(false); form.setEditKalenderId(null); form.resetForm(); fetchData(); form.setLoading(false)
  }

  const handleHapusKalender = async (id: string) => {
    if (!confirm('Yakin hapus jadwal ini?')) return
    await supabase.from('kalender_akademik').delete().eq('id', id); fetchData()
  }

  return { handleTambahKalender, handleEditKalender, handleUpdateKalender, handleHapusKalender }
}
