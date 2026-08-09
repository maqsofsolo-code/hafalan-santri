'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchWithAuth } from '../../lib/authClient'
import type { PeriodeRapot, Santri, NilaiRapotForm, RapotNilaiApiRow, RapotRekapRow } from '../types'

// Rapot Digital (Input Nilai Rapot jenjang Ula) milik guru yang login: input
// nilai per santri + rekap kelas. Dipindah dari app/guru/page.tsx
// (Modularisasi Tahap 5A) TANPA mengubah business logic sama sekali --
// Rapot Digital belum final dan sengaja tidak disentuh selain lokasi kode.
export function useRapotDigital() {
  const [periodeAktif, setPeriodeAktif] = useState<PeriodeRapot | null>(null)
  const [rapotSantriList, setRapotSantriList] = useState<Santri[]>([])
  const [selectedSantriRapot, setSelectedSantriRapot] = useState<Santri | null>(null)
  const [searchSantriRapot, setSearchSantriRapot] = useState('')
  const [nilaiRapot, setNilaiRapot] = useState<NilaiRapotForm>({})
  const [rapotLoading, setRapotLoading] = useState(false)
  const [rapotMsg, setRapotMsg] = useState('')
  const [existingRapotId, setExistingRapotId] = useState<string | null>(null)
  const [rapotActiveTab, setRapotActiveTab] = useState('input')
  const [rapotRekapData, setRapotRekapData] = useState<RapotRekapRow[]>([])
  const [rapotRekapLoading, setRapotRekapLoading] = useState(false)
  const [rapotRekapKelas, setRapotRekapKelas] = useState('')

  const fetchPeriodeAktif = async () => {
    const { data } = await supabase.from('periode_rapot').select('*').eq('is_aktif', true).maybeSingle()
    setPeriodeAktif(data || null)
    if (data) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: rapot1 } = await supabase.from('santri')
  .select('*').eq('guru_id', user.id).eq('jenjang', 'ula').eq('status', 'aktif').order('nama')
const { data: rapot2 } = await supabase.from('santri')
  .select('*').eq('guru_id_2', user.id).eq('jenjang', 'ula').eq('status', 'aktif').order('nama')
const allRapotSantri = [...(rapot1 || [])]
;(rapot2 || []).forEach((s) => {
  if (!allRapotSantri.find(x => x.id === s.id)) allRapotSantri.push(s)
})
setRapotSantriList(allRapotSantri)
    }
  }

  const fetchNilaiRapotSantri = async (santriId: string) => {
    if (!periodeAktif) return
    const { data } = await supabase.from('nilai_rapot')
      .select('*').eq('santri_id', santriId).eq('periode_id', periodeAktif.id).maybeSingle()
    if (data) {
      setExistingRapotId(data.id)
      setNilaiRapot({
        kelancaran: data.kelancaran || '',
        tajwid: data.tajwid || '',
        keterangan_hafalan: data.keterangan_hafalan || '',
        aqidah: data.aqidah || '',
        akhlak: data.akhlak || '',
        fiqh: data.fiqh || '',
        bhs_arab: data.bhs_arab || '',
        siroh: data.siroh || '',
        khoth: data.khoth || '',
        bhs_indonesia: data.bhs_indonesia || '',
        berhitung: data.berhitung || '',
        ipa: data.ipa || '',
        ips: data.ips || '',
        akhlak_kepribadian: data.akhlak_kepribadian || 'B',
        kebersihan: data.kebersihan || 'B',
        ketertiban: data.ketertiban || 'B',
        ekskul_renang: data.ekskul_renang || '',
        ekskul_beladiri: data.ekskul_beladiri || '',
        hadir_sakit: data.hadir_sakit || 0,
        hadir_izin: data.hadir_izin || 0,
        hadir_alpha: data.hadir_alpha || 0,
        catatan: data.catatan || '',
      })
    } else {
      setExistingRapotId(null)
      setNilaiRapot({
        kelancaran: '', tajwid: '', keterangan_hafalan: '',
        aqidah: '', akhlak: '', fiqh: '', bhs_arab: '', siroh: '', khoth: '',
        bhs_indonesia: '', berhitung: '', ipa: '', ips: '',
        akhlak_kepribadian: 'B', kebersihan: 'B', ketertiban: 'B',
        ekskul_renang: '', ekskul_beladiri: '',
        hadir_sakit: 0, hadir_izin: 0, hadir_alpha: 0, catatan: '',
      })
    }
  }

  const handleSimpanRapot = async () => {
    if (!selectedSantriRapot || !periodeAktif) return
    setRapotLoading(true); setRapotMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const dataRapot = {
      santri_id: selectedSantriRapot.id,
      periode_id: periodeAktif.id,
      guru_id: user.id,
      kelancaran: parseInt(String(nilaiRapot.kelancaran)) || null,
      tajwid: parseInt(String(nilaiRapot.tajwid)) || null,
      keterangan_hafalan: nilaiRapot.keterangan_hafalan || null,
      aqidah: parseInt(String(nilaiRapot.aqidah)) || null,
      akhlak: parseInt(String(nilaiRapot.akhlak)) || null,
      fiqh: parseInt(String(nilaiRapot.fiqh)) || null,
      bhs_arab: parseInt(String(nilaiRapot.bhs_arab)) || null,
      siroh: parseInt(String(nilaiRapot.siroh)) || null,
      khoth: parseInt(String(nilaiRapot.khoth)) || null,
      bhs_indonesia: parseInt(String(nilaiRapot.bhs_indonesia)) || null,
      berhitung: parseInt(String(nilaiRapot.berhitung)) || null,
      ipa: parseInt(String(nilaiRapot.ipa)) || null,
      ips: parseInt(String(nilaiRapot.ips)) || null,
      akhlak_kepribadian: nilaiRapot.akhlak_kepribadian,
      kebersihan: nilaiRapot.kebersihan,
      ketertiban: nilaiRapot.ketertiban,
      ekskul_renang: parseInt(String(nilaiRapot.ekskul_renang)) || null,
      ekskul_beladiri: nilaiRapot.ekskul_beladiri || null,
      hadir_sakit: parseInt(String(nilaiRapot.hadir_sakit)) || 0,
      hadir_izin: parseInt(String(nilaiRapot.hadir_izin)) || 0,
      hadir_alpha: parseInt(String(nilaiRapot.hadir_alpha)) || 0,
      catatan: nilaiRapot.catatan || null,
    }
    let error
    if (existingRapotId) {
      const res = await supabase.from('nilai_rapot').update(dataRapot).eq('id', existingRapotId)
      error = res.error
    } else {
      const res = await supabase.from('nilai_rapot').insert(dataRapot)
      error = res.error
    }
    if (error) { setRapotMsg('Gagal: ' + error.message); setRapotLoading(false); return }
    setRapotMsg('✓ Nilai rapot berhasil disimpan!')
    setRapotLoading(false)
    fetchNilaiRapotSantri(selectedSantriRapot.id)
  }

  const fetchRekapKelasByGuru = async (kelas: string) => {
    if (!periodeAktif || !kelas) return
    setRapotRekapLoading(true)
    setRapotRekapData([])
    // Rekap kelas (termasuk santri alumni/keluar -- arsip digital historis
    // yang sengaja dipertahankan) dibaca lewat endpoint server (service-role,
    // setelah role guru diverifikasi) alih-alih langsung dari browser. Ini
    // dibutuhkan karena RLS santri untuk Guru (Tahap 4) dibatasi ke
    // status='aktif', dan itu juga berlaku untuk relasi santri:santri_id(...)
    // yang di-embed di sini lewat PostgREST -- bukan hanya query langsung ke
    // public.santri. Logic (kelas_snapshot dulu, fallback ke id
    // jenjang+kelas) dan perhitungan rata-rata/peringkat di bawah TIDAK
    // berubah sama sekali. Lihat app/api/guru/rapot-digital-rekap-kelas/route.ts.
    let nilaiList: RapotNilaiApiRow[] = []
    const { data: { session: sesiRekap } } = await supabase.auth.getSession()
    if (sesiRekap?.access_token) {
      const resRekap = await fetchWithAuth(
        `/api/guru/rapot-digital-rekap-kelas?periode_id=${encodeURIComponent(periodeAktif.id)}&kelas_num=${parseInt(kelas)}`,
        sesiRekap.access_token
      )
      if (resRekap.ok) {
        const hasilRekap = await resRekap.json().catch(() => null)
        nilaiList = hasilRekap?.nilaiList || []
      }
    }
    const hitungRata = (n: RapotNilaiApiRow) => {
      const d = [n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].filter((v) => v != null && v > 0)
      const u = [n.bhs_indonesia, n.berhitung, n.ipa, n.ips].filter((v) => v != null && v > 0)
      if (d.length === 0 && u.length === 0) return 0
      const rd = d.length > 0 ? d.reduce((a: number, b: number) => a + b, 0) / d.length : 0
      const ru = u.length > 0 ? u.reduce((a: number, b: number) => a + b, 0) / u.length : 0
      if (d.length === 0) return ru
      if (u.length === 0) return rd
      return (rd + ru) / 2
    }
    const withRata = nilaiList.map((n) => ({
      ...n,
      rata_diiniyyah: (() => {
        const d = [n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].filter((v) => v != null && v > 0)
        return d.length > 0 ? d.reduce((a: number, b: number) => a + b, 0) / d.length : null
      })(),
      rata_umum: (() => {
        const u = [n.bhs_indonesia, n.berhitung, n.ipa, n.ips].filter((v) => v != null && v > 0)
        return u.length > 0 ? u.reduce((a: number, b: number) => a + b, 0) / u.length : null
      })(),
      rata_akhir: hitungRata(n)
    })).sort((a, b) => b.rata_akhir - a.rata_akhir)
    const withPeringkat = withRata.map((n, i) => ({ ...n, peringkat: i + 1 }))
    setRapotRekapData(withPeringkat)
    setRapotRekapLoading(false)
  }

  return {
    periodeAktif, rapotSantriList, selectedSantriRapot, setSelectedSantriRapot,
    searchSantriRapot, setSearchSantriRapot, nilaiRapot, setNilaiRapot,
    rapotLoading, rapotMsg, existingRapotId, rapotActiveTab, setRapotActiveTab,
    rapotRekapData, rapotRekapLoading, rapotRekapKelas,
    fetchPeriodeAktif, fetchNilaiRapotSantri, handleSimpanRapot, fetchRekapKelasByGuru,
    handleGantiKelasRekap: (kelas: string) => { setRapotRekapKelas(kelas); setRapotRekapData([]) },
  }
}
