'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchWithAuth } from '../../lib/authClient'
import type { CreateUserRequest, CreateUserResponse, Guru, Wali } from '../types'
import type { useAdminEntityForm } from './useAdminEntityForm'

type EntityForm = ReturnType<typeof useAdminEntityForm>

// CRUD Data Guru + Data Wali (keduanya sama-sama baris tabel profiles,
// dibuat/diupdate/dihapus lewat /api/create-user via requestCreateUser --
// pola identik untuk guru & wali). Termasuk import Wali dari Excel. Dipindah
// dari app/admin/page.tsx (Modularisasi Tahap 6A) TANPA mengubah kontrak
// /api/create-user atau /api/import-wali sama sekali.
export function useAdminGuruWali(form: EntityForm, fetchData: () => void) {
  const [importWaliLoading, setImportWaliLoading] = useState(false)
  const [importWaliMsg, setImportWaliMsg] = useState('')

  const requestCreateUser = async (payload: CreateUserRequest): Promise<CreateUserResponse> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.access_token) {
      return { error: 'Session tidak tersedia atau sudah berakhir. Silakan login kembali.' }
    }

    const res = await fetchWithAuth('/api/create-user', session.access_token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await res.json() as CreateUserResponse

    if (res.status === 401) {
      return { ...result, error: 'Session tidak valid atau sudah berakhir. Silakan login kembali.' }
    }
    if (res.status === 403) {
      return { ...result, error: 'Akses ditolak. Hanya admin yang dapat mengelola akun.' }
    }

    return result
  }

  // ===== GURU =====
  const handleTambahGuru = async () => {
    form.setLoading(true); form.setErrorMsg('')
    const result = await requestCreateUser({ email: form.formEmail, password: form.formPassword, nama: form.formNama, role: 'guru', no_wa: form.formNoWa })
    if (result.error) { form.setErrorMsg(result.error); form.setLoading(false); return }
    form.setSuccessMsg('Guru berhasil ditambahkan!'); form.setShowForm(false); form.resetForm(); fetchData(); form.setLoading(false)
  }

  const handleEditGuru = (guru: Guru) => {
    form.setEditGuruId(guru.id); form.setFormNama(guru.nama || ''); form.setFormNoWa(guru.no_wa || '')
    form.setFormEmail(''); form.setFormPassword(''); form.setShowPassword(false)
    form.setFormGuruJenisKelas(guru.jenis_kelas || '')
    form.setFormGuruIsWaliKelas(guru.is_wali_kelas || false)
    form.setFormGuruWaliKelasNum(guru.wali_kelas_num?.toString() || '')
    form.setFormGuruWaliKelasJenis(guru.wali_kelas_jenis || '')
    form.setShowForm(true); form.setFormType('guru')
  }

  const handleUpdateGuru = async () => {
    form.setLoading(true); form.setErrorMsg('')
    const { error } = await supabase.from('profiles').update({
      nama: form.formNama,
      no_wa: form.formNoWa || null,
      jenis_kelas: form.formGuruJenisKelas || null,
      is_wali_kelas: form.formGuruIsWaliKelas,
      wali_kelas_num: form.formGuruIsWaliKelas && form.formGuruWaliKelasNum ? parseInt(form.formGuruWaliKelasNum) : null,
      wali_kelas_jenis: form.formGuruIsWaliKelas ? form.formGuruWaliKelasJenis || null : null,
    }).eq('id', form.editGuruId)
    if (error) { form.setErrorMsg(error.message); form.setLoading(false); return }
    if (form.formEmail || form.formPassword) {
      const result = await requestCreateUser({ isUpdate: true, userId: form.editGuruId || undefined, email: form.formEmail || undefined, password: form.formPassword || undefined })
      if (result.error) { form.setErrorMsg(result.error); form.setLoading(false); return }
    }
    form.setSuccessMsg('Data guru berhasil diupdate!'); form.setShowForm(false); form.setEditGuruId(null); form.resetForm(); fetchData(); form.setLoading(false)
  }

  // ===== WALI =====
  const handleTambahWali = async () => {
    form.setLoading(true); form.setErrorMsg('')
    const result = await requestCreateUser({ email: form.formEmail, password: form.formPassword, nama: form.formNama, role: 'wali', no_wa: form.formNoWa })
    if (result.error) { form.setErrorMsg(result.error); form.setLoading(false); return }
    form.setSuccessMsg('Wali berhasil ditambahkan!'); form.setShowForm(false); form.resetForm(); fetchData(); form.setLoading(false)
  }

  const handleEditWali = (wali: Wali) => {
    form.setEditWaliId(wali.id); form.setFormNama(wali.nama || ''); form.setFormNoWa(wali.no_wa || '')
    form.setFormEmail(''); form.setFormPassword(''); form.setShowPassword(false); form.setShowForm(true); form.setFormType('wali')
  }

  const handleUpdateWali = async () => {
    form.setLoading(true); form.setErrorMsg('')
    const { error } = await supabase.from('profiles').update({ nama: form.formNama, no_wa: form.formNoWa || null }).eq('id', form.editWaliId)
    if (error) { form.setErrorMsg(error.message); form.setLoading(false); return }
    if (form.formEmail || form.formPassword) {
      const result = await requestCreateUser({ isUpdate: true, userId: form.editWaliId || undefined, email: form.formEmail || undefined, password: form.formPassword || undefined })
      if (result.error) { form.setErrorMsg(result.error); form.setLoading(false); return }
    }
    form.setSuccessMsg('Data wali berhasil diupdate!'); form.setShowForm(false); form.setEditWaliId(null); form.resetForm(); fetchData(); form.setLoading(false)
  }

  const handleHapusGuru = async (id: string) => {
    if (!confirm('Yakin hapus guru ini?')) return
    const result = await requestCreateUser({ isDelete: true, userId: id })
    if (result.error) { alert('Gagal hapus: ' + result.error); return }
    form.setSuccessMsg('Guru berhasil dihapus!'); fetchData()
  }

  const handleHapusWali = async (id: string) => {
    if (!confirm('Yakin hapus wali ini?')) return
    const result = await requestCreateUser({ isDelete: true, userId: id })
    if (result.error) { alert('Gagal hapus: ' + result.error); return }
    form.setSuccessMsg('Wali berhasil dihapus!'); fetchData()
  }

  const handleImportWali = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setImportWaliLoading(true); setImportWaliMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      setImportWaliMsg('Sesi login sudah berakhir. Silakan login kembali.'); setImportWaliLoading(false); return
    }
    const formData = new FormData(); formData.append('file', file)
    const res = await fetchWithAuth('/api/import-wali', session.access_token, { method: 'POST', body: formData })
    const result = await res.json()
    let msg = result.message || result.error
    if (result.detail && result.detail.length > 0) {
      msg += '\n\nDetail:\n' + result.detail.join('\n')
    }
    setImportWaliMsg(msg); setImportWaliLoading(false); fetchData()
  }

  return {
    handleTambahGuru, handleEditGuru, handleUpdateGuru, handleHapusGuru,
    handleTambahWali, handleEditWali, handleUpdateWali, handleHapusWali,
    importWaliLoading, importWaliMsg, handleImportWali,
  }
}
