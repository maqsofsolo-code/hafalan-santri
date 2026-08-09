'use client'
import { supabase } from '../../lib/supabase'
import { hitungTotalJuzAwal, kelasLabel } from '../utils'
import type { Santri, Surah } from '../types'
import type { useAdminEntityForm } from './useAdminEntityForm'

type EntityForm = ReturnType<typeof useAdminEntityForm>

// CRUD Data Santri (tambah/edit/update/hapus). Dipindah dari
// app/admin/page.tsx (Modularisasi Tahap 6A) TANPA mengubah business rule
// (validasi wajib nama/jenjang/kelas, perhitungan total_hafalan_juz dari
// rentang surah, logic update parsial surah_terakhir_nomor/ayat_terakhir)
// sama sekali. `form` adalah state form bersama Guru/Wali/Santri/Kalender
// (lihat useAdminEntityForm.ts) -- hook ini hanya membaca/mengisinya.
export function useAdminSantri(form: EntityForm, surahList: Surah[], fetchData: () => void) {
  const handleTambahSantri = async () => {
    form.setLoading(true); form.setErrorMsg('')
    if (!form.formNama || !form.formJenjang || !form.formKelasNum) { form.setErrorMsg('Nama, jenjang dan kelas wajib diisi!'); form.setLoading(false); return }
    const { error } = await supabase.from('santri').insert({
      nama: form.formNama, jenjang: form.formJenjang, kelas_num: parseInt(form.formKelasNum),
      kelas: kelasLabel(parseInt(form.formKelasNum), form.formJenjang, form.formJenisKelas),
      jenis_kelas: form.formJenisKelas,
      guru_id: form.formGuruId || null, guru_id_2: form.formGuruId2 || null, wali_id: form.formWaliId || null,
      total_hafalan_juz: hitungTotalJuzAwal(surahList, form.formSurahAwal, form.formSurahAkhir),
      surah_terakhir_nomor: form.formSurahAkhir ? parseInt(form.formSurahAkhir) : null,
      ayat_terakhir: form.formAyatAkhir ? parseInt(form.formAyatAkhir) : null,
      nik: form.formNik || null, nisn: form.formNisn || null,
      tempat_lahir: form.formTempatLahir || null,
      tanggal_lahir: form.formTanggalLahir || null,
      alamat: form.formAlamat || null,
      status: form.formStatus || 'aktif',
      tahun_lulus: form.formTahunLulus || null,
      keterangan_keluar: form.formKeteranganKeluar || null,
    })
    if (error) { form.setErrorMsg(error.message); form.setLoading(false); return }
    form.setSuccessMsg('Santri berhasil ditambahkan!'); form.setShowForm(false); form.resetForm(); fetchData(); form.setLoading(false)
  }

  const handleEditSantri = (santri: Santri) => {
    form.setEditSantriId(santri.id); form.setFormNama(santri.nama)
    form.setFormJenjang(santri.jenjang || ''); form.setFormKelasNum(santri.kelas_num?.toString() || '')
    form.setFormGuruId(santri.guru_id || ''); form.setFormGuruId2(santri.guru_id_2 || ''); form.setFormWaliId(santri.wali_id || '')
    form.setFormSurahAwal(''); form.setFormAyatAwal('1')
    form.setFormSurahAkhir(santri.surah_terakhir_nomor?.toString() || '')
    form.setFormAyatAkhir(santri.ayat_terakhir?.toString() || '')
    form.setFormNik(santri.nik || ''); form.setFormNisn(santri.nisn || '')
    form.setFormTempatLahir(santri.tempat_lahir || '')
    form.setFormTanggalLahir(santri.tanggal_lahir || '')
    form.setFormAlamat(santri.alamat || '')
    form.setFormJenisKelas(santri.jenis_kelas || 'banin')
    form.setFormTahunLulus(santri.tahun_lulus || '')
    form.setFormKeteranganKeluar(santri.keterangan_keluar || '')
    form.setShowForm(true); form.setFormType('santri')
  }

  const handleUpdateSantri = async () => {
    form.setLoading(true); form.setErrorMsg('')
    let updateData: Record<string, unknown> = {
      nama: form.formNama, jenjang: form.formJenjang, kelas_num: parseInt(form.formKelasNum),
      kelas: kelasLabel(parseInt(form.formKelasNum), form.formJenjang, form.formJenisKelas),
      jenis_kelas: form.formJenisKelas,
      guru_id: form.formGuruId || null, guru_id_2: form.formGuruId2 || null, wali_id: form.formWaliId || null,
      nik: form.formNik || null, nisn: form.formNisn || null,
      tempat_lahir: form.formTempatLahir || null,
      tanggal_lahir: form.formTanggalLahir || null,
      alamat: form.formAlamat || null,
      status: form.formStatus || 'aktif',
      tahun_lulus: form.formTahunLulus || null,
      keterangan_keluar: form.formKeteranganKeluar || null,
    }
    if (form.formSurahAwal && form.formSurahAkhir) {
      updateData = { ...updateData, total_hafalan_juz: hitungTotalJuzAwal(surahList, form.formSurahAwal, form.formSurahAkhir), surah_terakhir_nomor: parseInt(form.formSurahAkhir), ayat_terakhir: form.formAyatAkhir ? parseInt(form.formAyatAkhir) : null }
    } else if (form.formSurahAkhir && !form.formSurahAwal) {
      updateData = { ...updateData, surah_terakhir_nomor: parseInt(form.formSurahAkhir), ayat_terakhir: form.formAyatAkhir ? parseInt(form.formAyatAkhir) : null }
    }
    const { error } = await supabase.from('santri').update(updateData).eq('id', form.editSantriId)
    if (error) { form.setErrorMsg(error.message); form.setLoading(false); return }
    form.setSuccessMsg('Santri berhasil diupdate!'); form.setShowForm(false); form.setEditSantriId(null); form.resetForm(); fetchData(); form.setLoading(false)
  }

  const handleHapusSantri = async (id: string) => {
    if (!confirm('Yakin hapus santri ini?')) return
    await supabase.from('santri').delete().eq('id', id); fetchData()
  }

  return { handleTambahSantri, handleEditSantri, handleUpdateSantri, handleHapusSantri }
}
