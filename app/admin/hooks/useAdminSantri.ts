'use client'
import { supabase } from '../../lib/supabase'
import { fetchWithAuth } from '../../lib/authClient'
import { hitungTotalJuzAwal, kelasLabel } from '../utils'
import type { Santri, Surah } from '../types'
import type { useAdminEntityForm } from './useAdminEntityForm'

type EntityForm = ReturnType<typeof useAdminEntityForm>

type SlotAssignmentHasil = {
  slot: 1 | 2
  guruId: string
  namaGuru: string | null
  status: string
  pesan: string
}

// Ringkasan hasil assignment CREATE santri jadi satu kalimat -- dipakai
// membangun successMsg supaya Admin melihat jelas kalau assignment
// GAGAL/dilewati (bukan disembunyikan di balik "Santri berhasil
// ditambahkan!" generik). Lihat app/api/admin/santri/route.ts untuk
// urutan penulisan (assignment resmi dulu, legacy hanya cermin).
function ringkasPesanAssignment(assignment: { attempted: boolean, alasan: string | null, slots: SlotAssignmentHasil[] } | undefined): string {
  if (!assignment || !assignment.attempted) {
    return assignment?.alasan ? ` Guru Hafalan TIDAK ditugaskan: ${assignment.alasan}` : ''
  }
  const bagian = assignment.slots.map(s =>
    s.status === 'BERHASIL'
      ? `Guru ${s.slot} (${s.namaGuru || '-'}) berhasil ditugaskan`
      : `Guru ${s.slot} (${s.namaGuru || '-'}) GAGAL ditugaskan: ${s.pesan}`
  )
  return bagian.length > 0 ? ` ${bagian.join('. ')}.` : ''
}

// CRUD Data Santri (tambah/edit/update/hapus). Dipindah dari
// app/admin/page.tsx (Modularisasi Tahap 6A), TANPA mengubah business rule
// data santri lain (validasi wajib nama/jenjang/kelas, perhitungan
// total_hafalan_juz dari rentang surah) -- KOREKSI Tahap 9L: CREATE Guru
// Hafalan TIDAK LAGI insert langsung dari browser, tapi lewat
// /api/admin/santri supaya assignment resmi (penugasan_hafalan) dan
// mirror legacy (guru_id/guru_id_2) ditulis dengan urutan yang tidak bisa
// menghasilkan "legacy terisi, assignment kosong" diam-diam (desain Tahap
// 9K). UPDATE tidak lagi mengirim guru_id/guru_id_2 sama sekali -- Guru
// Hafalan hanya dikelola lewat menu Penugasan Guru (Tahap 9K Bagian D
// Opsi A). `form` adalah state form bersama Guru/Wali/Santri/Kalender
// (lihat useAdminEntityForm.ts) -- hook ini hanya membaca/mengisinya.
export function useAdminSantri(form: EntityForm, surahList: Surah[], fetchData: () => void) {
  const handleTambahSantri = async () => {
    form.setLoading(true); form.setErrorMsg('')
    if (!form.formNama || !form.formJenjang || !form.formKelasNum) { form.setErrorMsg('Nama, jenjang dan kelas wajib diisi!'); form.setLoading(false); return }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { form.setErrorMsg('Sesi login sudah berakhir. Silakan login kembali.'); form.setLoading(false); return }

    const res = await fetchWithAuth('/api/admin/santri', session.access_token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      }),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) { form.setErrorMsg(result.error || 'Gagal membuat santri'); form.setLoading(false); return }

    form.setSuccessMsg('Santri berhasil ditambahkan!' + ringkasPesanAssignment(result.assignment))
    form.setShowForm(false); form.resetForm(); fetchData(); form.setLoading(false)
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

  // KOREKSI Tahap 9L: guru_id/guru_id_2 SENGAJA TIDAK PERNAH ada di
  // updateData -- Guru Hafalan dikelola HANYA lewat menu Penugasan Guru
  // (Tahap 9K Bagian D Opsi A), supaya assignment manual di sana tidak
  // pernah tertimpa tanpa sadar dari layar Edit Santri. Field form
  // formGuruId/formGuruId2 tetap ada di state (dipakai SantriSection.tsx
  // murni untuk tampilan read-only saat edit), tapi TIDAK PERNAH dikirim
  // di payload update ini.
  const handleUpdateSantri = async () => {
    form.setLoading(true); form.setErrorMsg('')
    let updateData: Record<string, unknown> = {
      nama: form.formNama, jenjang: form.formJenjang, kelas_num: parseInt(form.formKelasNum),
      kelas: kelasLabel(parseInt(form.formKelasNum), form.formJenjang, form.formJenisKelas),
      jenis_kelas: form.formJenisKelas,
      wali_id: form.formWaliId || null,
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

  // KOREKSI Tahap 9L: error delete SEKARANG diperiksa (sebelumnya tidak
  // sama sekali -- Admin bisa melihat "berhasil" padahal DB menolak).
  // penugasan_hafalan.santri_id REFERENCES santri(id) ON DELETE RESTRICT
  // (migration Tahap 9B) -- santri yang punya riwayat assignment (aktif
  // ATAU tidak aktif/histori) TIDAK BISA dihapus permanen, sesuai prinsip
  // "histori tidak pernah dihapus". fetchData() TETAP dipanggil di kasus
  // error supaya state selalu mencerminkan DB yang sebenarnya (santri
  // masih ada), bukan optimistically dianggap terhapus.
  const handleHapusSantri = async (id: string) => {
    if (!confirm('Yakin hapus santri ini?')) return
    const { error } = await supabase.from('santri').delete().eq('id', id)
    if (error) {
      const punyaRiwayat = error.message.includes('penugasan_hafalan') || error.message.toLowerCase().includes('foreign key')
      alert(punyaRiwayat
        ? 'Santri memiliki riwayat data dan tidak dapat dihapus permanen. Gunakan status nonaktif/alumni/keluar sesuai kebutuhan.'
        : 'Gagal menghapus santri: ' + error.message)
      fetchData()
      return
    }
    fetchData()
  }

  return { handleTambahSantri, handleEditSantri, handleUpdateSantri, handleHapusSantri }
}
