'use client'
import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { PeriodeAkademik } from '../../lib/assignmentTypes'

// CRUD public.periode_akademik (Tahap 9D) -- tabel & RLS sudah ada sejak
// Tahap 9B (admin: SELECT/INSERT/UPDATE/DELETE langsung dari browser, sama
// seperti pola useAdminKalender.ts). Database TIDAK punya constraint
// "hanya satu is_aktif=true" (disengaja, lihat migration Tahap 9B) --
// is_aktif di sini boolean sederhana per baris, UI hanya memperingatkan
// kalau >1 aktif ditemukan (dihitung di komponen), tidak pernah diam-diam
// menonaktifkan periode lain.
export function useAdminPeriodeAkademik() {
  const [periodeList, setPeriodeList] = useState<PeriodeAkademik[]>([])
  const [periodeIdTerpilih, setPeriodeIdTerpilih] = useState('')
  const [loadingPeriode, setLoadingPeriode] = useState(false)
  const [periodeFetchError, setPeriodeFetchError] = useState('')

  const [showFormPeriode, setShowFormPeriode] = useState(false)
  const [editPeriodeId, setEditPeriodeId] = useState<string | null>(null)
  const [formTahunAjaran, setFormTahunAjaran] = useState('')
  const [formSemester, setFormSemester] = useState('1')
  const [formTanggalMulai, setFormTanggalMulai] = useState('')
  const [formTanggalSelesai, setFormTanggalSelesai] = useState('')
  const [formIsAktif, setFormIsAktif] = useState(false)
  const [periodeErrorMsg, setPeriodeErrorMsg] = useState('')
  const [periodeSuccessMsg, setPeriodeSuccessMsg] = useState('')
  const [periodeLoading, setPeriodeLoading] = useState(false)

  const fetchPeriodeList = useCallback(async () => {
    setLoadingPeriode(true)
    setPeriodeFetchError('')
    const { data, error } = await supabase.from('periode_akademik').select('*')
      .order('tahun_ajaran', { ascending: false })
      .order('semester', { ascending: false })
    setLoadingPeriode(false)
    if (error) { setPeriodeFetchError(error.message); return }
    const list = (data || []) as PeriodeAkademik[]
    setPeriodeList(list)
    // Pilih default: pertahankan pilihan sekarang kalau masih ada di list;
    // kalau tidak, pilih periode is_aktif=true pertama, atau baris pertama.
    setPeriodeIdTerpilih(prev => {
      if (prev && list.some(p => p.id === prev)) return prev
      const aktif = list.find(p => p.is_aktif)
      return aktif?.id || list[0]?.id || ''
    })
  }, [])

  const resetFormPeriode = () => {
    setEditPeriodeId(null)
    setFormTahunAjaran(''); setFormSemester('1')
    setFormTanggalMulai(''); setFormTanggalSelesai('')
    setFormIsAktif(false)
    setPeriodeErrorMsg('')
  }

  const validasiFormPeriode = (): string => {
    if (!formTahunAjaran.trim()) return 'Tahun ajaran wajib diisi.'
    if (!formTanggalMulai || !formTanggalSelesai) return 'Tanggal mulai dan tanggal selesai wajib diisi.'
    if (formTanggalSelesai < formTanggalMulai) return 'Tanggal selesai tidak boleh sebelum tanggal mulai.'
    return ''
  }

  const handleTambahPeriode = async () => {
    const pesanValidasi = validasiFormPeriode()
    if (pesanValidasi) { setPeriodeErrorMsg(pesanValidasi); return }
    setPeriodeLoading(true); setPeriodeErrorMsg('')
    const { error } = await supabase.from('periode_akademik').insert({
      tahun_ajaran: formTahunAjaran.trim(),
      semester: parseInt(formSemester, 10) as 1 | 2,
      tanggal_mulai: formTanggalMulai,
      tanggal_selesai: formTanggalSelesai,
      is_aktif: formIsAktif,
    })
    setPeriodeLoading(false)
    if (error) {
      setPeriodeErrorMsg(error.message.includes('periode_akademik_tahun_semester_key')
        ? 'Kombinasi tahun ajaran + semester ini sudah ada.'
        : error.message)
      return
    }
    setPeriodeSuccessMsg('Periode akademik berhasil ditambahkan.')
    setShowFormPeriode(false); resetFormPeriode(); fetchPeriodeList()
  }

  const handleEditPeriode = (periode: PeriodeAkademik) => {
    setEditPeriodeId(periode.id)
    setFormTahunAjaran(periode.tahun_ajaran)
    setFormSemester(String(periode.semester))
    setFormTanggalMulai(periode.tanggal_mulai)
    setFormTanggalSelesai(periode.tanggal_selesai)
    setFormIsAktif(periode.is_aktif)
    setPeriodeErrorMsg('')
    setShowFormPeriode(true)
  }

  const handleUpdatePeriode = async () => {
    if (!editPeriodeId) return
    const pesanValidasi = validasiFormPeriode()
    if (pesanValidasi) { setPeriodeErrorMsg(pesanValidasi); return }
    setPeriodeLoading(true); setPeriodeErrorMsg('')
    const { error } = await supabase.from('periode_akademik').update({
      tahun_ajaran: formTahunAjaran.trim(),
      semester: parseInt(formSemester, 10) as 1 | 2,
      tanggal_mulai: formTanggalMulai,
      tanggal_selesai: formTanggalSelesai,
      is_aktif: formIsAktif,
    }).eq('id', editPeriodeId)
    setPeriodeLoading(false)
    if (error) {
      setPeriodeErrorMsg(error.message.includes('periode_akademik_tahun_semester_key')
        ? 'Kombinasi tahun ajaran + semester ini sudah ada.'
        : error.message)
      return
    }
    setPeriodeSuccessMsg('Periode akademik berhasil diperbarui.')
    setShowFormPeriode(false); setEditPeriodeId(null); resetFormPeriode(); fetchPeriodeList()
  }

  // Toggle cepat aktif/nonaktif SATU baris -- tidak pernah menyentuh baris
  // lain (disengaja, lihat komentar atas: DB tidak memaksa hanya-satu-aktif).
  const handleToggleAktifPeriode = async (periode: PeriodeAkademik) => {
    const { error } = await supabase.from('periode_akademik')
      .update({ is_aktif: !periode.is_aktif }).eq('id', periode.id)
    if (error) { alert('Gagal mengubah status aktif: ' + error.message); return }
    fetchPeriodeList()
  }

  const handleHapusPeriode = async (id: string) => {
    if (!confirm('Yakin hapus periode ini? Penghapusan akan ditolak database kalau masih ada penugasan Guru Hafalan/Wali Kelas yang memakai periode ini.')) return
    const { error } = await supabase.from('periode_akademik').delete().eq('id', id)
    if (error) {
      alert('Gagal menghapus periode: ' + error.message + '\n\nKemungkinan penyebab: masih ada Guru Hafalan/Wali Kelas yang ditugaskan pada periode ini. Nonaktifkan/hapus penugasannya dulu.')
      return
    }
    fetchPeriodeList()
  }

  return {
    periodeList, periodeIdTerpilih, setPeriodeIdTerpilih, loadingPeriode, periodeFetchError, fetchPeriodeList,
    showFormPeriode, setShowFormPeriode, editPeriodeId,
    formTahunAjaran, setFormTahunAjaran, formSemester, setFormSemester,
    formTanggalMulai, setFormTanggalMulai, formTanggalSelesai, setFormTanggalSelesai,
    formIsAktif, setFormIsAktif,
    periodeErrorMsg, periodeSuccessMsg, setPeriodeSuccessMsg, periodeLoading,
    resetFormPeriode, handleTambahPeriode, handleEditPeriode, handleUpdatePeriode,
    handleToggleAktifPeriode, handleHapusPeriode,
  }
}
