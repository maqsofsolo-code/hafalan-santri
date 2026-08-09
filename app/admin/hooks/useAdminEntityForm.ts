'use client'
import { useState } from 'react'

// Form Tambah/Edit Guru, Wali, Santri, dan Kalender di halaman Admin
// SEMUANYA memakai satu set field form bersama (formNama, formEmail, dst)
// dibedakan lewat `formType` ('guru'|'wali'|'santri'|'kalender') dan satu
// `resetForm()` yang mengosongkan semuanya sekaligus -- ini SUDAH begitu di
// app/admin/page.tsx asli (bukan 4 form terpisah), jadi TIDAK dipisah jadi
// beberapa hook agar tidak mengubah behavior (lihat instruksi Tahap 6A:
// bagian yang tightly coupled dibiarkan bersama, dilaporkan apa adanya).
// `loading`/`successMsg`/`errorMsg` juga dipakai bersama oleh SEMUA handler
// CRUD (guru/wali/santri/kalender) dan bahkan handler import/download di
// useAdminData -- persis pola errorMsg/successMsg bersama di app/guru/page.tsx.
//
// `onReset` (opsional): resetForm() pada kode asli JUGA mengosongkan
// naikKelasPreview/naikKelasChecked/naikKelasMsg (state Naik Kelas, kini di
// useAdminNaikKelas.ts) sebagai bagian dari satu fungsi reset besar yang
// sama. Supaya perilaku itu tidak hilang setelah dipisah jadi hook
// tersendiri, page.tsx meneruskan naikKelas.resetNaikKelas lewat parameter
// ini, dipanggil di akhir resetForm().
export function useAdminEntityForm(onReset?: () => void) {
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('')
  const [editSantriId, setEditSantriId] = useState<string | null>(null)
  const [editGuruId, setEditGuruId] = useState<string | null>(null)
  const [editWaliId, setEditWaliId] = useState<string | null>(null)
  const [editKalenderId, setEditKalenderId] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Form states (guru/wali/santri)
  const [formNama, setFormNama] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formNoWa, setFormNoWa] = useState('')
  const [formGuruId, setFormGuruId] = useState('')
  const [formGuruId2, setFormGuruId2] = useState('')
  const [formWaliId, setFormWaliId] = useState('')
  const [formJenjang, setFormJenjang] = useState('')
  const [formKelasNum, setFormKelasNum] = useState('')
  const [formSurahAwal, setFormSurahAwal] = useState('')
  const [formAyatAwal, setFormAyatAwal] = useState('1')
  const [formSurahAkhir, setFormSurahAkhir] = useState('')
  const [formAyatAkhir, setFormAyatAkhir] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Form data lengkap santri
  const [formNik, setFormNik] = useState('')
  const [formNisn, setFormNisn] = useState('')
  const [formTempatLahir, setFormTempatLahir] = useState('')
  const [formTanggalLahir, setFormTanggalLahir] = useState('')
  const [formAlamat, setFormAlamat] = useState('')
  const [formStatus, setFormStatus] = useState('aktif')
  const [formJenisKelas, setFormJenisKelas] = useState('banin')
  const [formTahunLulus, setFormTahunLulus] = useState('')
  const [formKeteranganKeluar, setFormKeteranganKeluar] = useState('')

  // Form guru (jenis kelas & wali kelas)
  const [formGuruJenisKelas, setFormGuruJenisKelas] = useState('')
  const [formGuruIsWaliKelas, setFormGuruIsWaliKelas] = useState(false)
  const [formGuruWaliKelasNum, setFormGuruWaliKelasNum] = useState('')
  const [formGuruWaliKelasJenis, setFormGuruWaliKelasJenis] = useState('')

  // Form kalender
  const [formKalNama, setFormKalNama] = useState('')
  const [formKalTipe, setFormKalTipe] = useState('libur')
  const [formKalSemester, setFormKalSemester] = useState('1')
  const [formKalMulai, setFormKalMulai] = useState('')
  const [formKalSelesai, setFormKalSelesai] = useState('')
  const [formKalKeterangan, setFormKalKeterangan] = useState('')

  const resetForm = () => {
    setFormNama(''); setFormEmail(''); setFormPassword(''); setFormNoWa('')
    setFormGuruId(''); setFormGuruId2(''); setFormWaliId(''); setFormJenjang(''); setFormKelasNum('')
    setFormSurahAwal(''); setFormAyatAwal('1'); setFormSurahAkhir(''); setFormAyatAkhir('')
    setFormNik(''); setFormNisn(''); setFormTempatLahir(''); setFormTanggalLahir(''); setFormAlamat('')
    setFormStatus('aktif'); setFormTahunLulus(''); setFormKeteranganKeluar('')
    setFormJenisKelas('banin')
    onReset?.()
    setShowPassword(false)
    setFormKalNama(''); setFormKalTipe('libur'); setFormKalSemester('1')
    setFormKalMulai(''); setFormKalSelesai(''); setFormKalKeterangan('')
    setEditSantriId(null); setEditGuruId(null); setEditWaliId(null); setEditKalenderId(null)
    setFormGuruJenisKelas(''); setFormGuruIsWaliKelas(false)
    setFormGuruWaliKelasNum(''); setFormGuruWaliKelasJenis('')
  }

  return {
    showForm, setShowForm, formType, setFormType,
    editSantriId, setEditSantriId, editGuruId, setEditGuruId, editWaliId, setEditWaliId, editKalenderId, setEditKalenderId,
    loading, setLoading, successMsg, setSuccessMsg, errorMsg, setErrorMsg,
    formNama, setFormNama, formEmail, setFormEmail, formPassword, setFormPassword, formNoWa, setFormNoWa,
    formGuruId, setFormGuruId, formGuruId2, setFormGuruId2, formWaliId, setFormWaliId,
    formJenjang, setFormJenjang, formKelasNum, setFormKelasNum,
    formSurahAwal, setFormSurahAwal, formAyatAwal, setFormAyatAwal, formSurahAkhir, setFormSurahAkhir, formAyatAkhir, setFormAyatAkhir,
    showPassword, setShowPassword,
    formNik, setFormNik, formNisn, setFormNisn, formTempatLahir, setFormTempatLahir, formTanggalLahir, setFormTanggalLahir,
    formAlamat, setFormAlamat, formStatus, setFormStatus, formJenisKelas, setFormJenisKelas,
    formTahunLulus, setFormTahunLulus, formKeteranganKeluar, setFormKeteranganKeluar,
    formGuruJenisKelas, setFormGuruJenisKelas, formGuruIsWaliKelas, setFormGuruIsWaliKelas,
    formGuruWaliKelasNum, setFormGuruWaliKelasNum, formGuruWaliKelasJenis, setFormGuruWaliKelasJenis,
    formKalNama, setFormKalNama, formKalTipe, setFormKalTipe, formKalSemester, setFormKalSemester,
    formKalMulai, setFormKalMulai, formKalSelesai, setFormKalSelesai, formKalKeterangan, setFormKalKeterangan,
    resetForm,
  }
}
