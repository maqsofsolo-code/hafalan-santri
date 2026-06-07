// v3
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Image from 'next/image'

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [guruList, setGuruList] = useState<any[]>([])
  const [santriList, setSantriList] = useState<any[]>([])
  const [waliList, setWaliList] = useState<any[]>([])
  const [surahList, setSurahList] = useState<any[]>([])
  const [setoranHariIni, setSetoranHariIni] = useState<any[]>([])
  const [rankingHafalan, setRankingHafalan] = useState<any[]>([])
  const [rankingKonsistensi, setRankingKonsistensi] = useState<any[]>([])
  const [rankingSemangat, setRankingSemangat] = useState<any[]>([])
  const [kalenderList, setKalenderList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('')
  const [editSantriId, setEditSantriId] = useState<any>(null)
  const [editGuruId, setEditGuruId] = useState<any>(null)
  const [editWaliId, setEditWaliId] = useState<any>(null)
  const [editKalenderId, setEditKalenderId] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeRanking, setActiveRanking] = useState('total')
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [laporanBulan, setLaporanBulan] = useState('')

useEffect(() => {
  setLaporanBulan(new Date().toISOString().slice(0, 7))
}, [])
  const [laporanJenjang, setLaporanJenjang] = useState('semua')
  const [laporanKelas, setLaporanKelas] = useState('semua')
  const [laporanSantriId, setLaporanSantriId] = useState('semua')
  const [laporanLoading, setLaporanLoading] = useState('')

  // Form states
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
  const [formTahunLulus, setFormTahunLulus] = useState('')
  const [formKeteranganKeluar, setFormKeteranganKeluar] = useState('')

  // State naik kelas
  const [naikKelasJenjang, setNaikKelasJenjang] = useState('ula')
  const [naikKelasNum, setNaikKelasNum] = useState('')
  const [naikKelasLoading, setNaikKelasLoading] = useState(false)
  const [naikKelasPreview, setNaikKelasPreview] = useState<any[]>([])
  const [naikKelasChecked, setNaikKelasChecked] = useState<Record<string, boolean>>({})
  const [naikKelasMsg, setNaikKelasMsg] = useState('')
  // State rapot
  const [periodeList, setPeriodeList] = useState<any[]>([])
  const [showFormPeriode, setShowFormPeriode] = useState(false)
  const [editPeriodeId, setEditPeriodeId] = useState<any>(null)
  const [formPeriodeNama, setFormPeriodeNama] = useState('')
  const [formPeriodeTahunAjaran, setFormPeriodeTahunAjaran] = useState('')
  const [formPeriodeSemester, setFormPeriodeSemester] = useState('genap')
  const [formPeriodeTanggal, setFormPeriodeTanggal] = useState('')
  const [formPeriodeAktif, setFormPeriodeAktif] = useState(false)
  const [rapotJenjang, setRapotJenjang] = useState('ula')
  const [rapotKelas, setRapotKelas] = useState('')
  const [rapotPeriodeId, setRapotPeriodeId] = useState('')
  const [rapotLoading, setRapotLoading] = useState(false)
  // State input nilai rapot admin
  const [rapotInputPeriodeId, setRapotInputPeriodeId] = useState('')
  const [rapotInputSantriList, setRapotInputSantriList] = useState<any[]>([])
  const [rapotInputSantri, setRapotInputSantri] = useState<any>(null)
  const [rapotInputSearch, setRapotInputSearch] = useState('')
  const [rapotNilai, setRapotNilai] = useState<Record<string, any>>({})
  const [rapotInputLoading, setRapotInputLoading] = useState(false)
  const [rapotInputMsg, setRapotInputMsg] = useState('')
  const [rapotExistingId, setRapotExistingId] = useState<any>(null)
  const [rapotKelasSnapshot, setRapotKelasSnapshot] = useState('')
  const [rapotJenjangSnapshot, setRapotJenjangSnapshot] = useState('ula')
  const [rapotActiveTab, setRapotActiveTab] = useState('periode')
  const [rapotDownloadSearch, setRapotDownloadSearch] = useState('')
  const [rapotDownloadSantri, setRapotDownloadSantri] = useState<any>(null)
  const [rapotDownloadKelas, setRapotDownloadKelas] = useState('')
  const [rapotDownloadJenjang, setRapotDownloadJenjang] = useState('ula')
  const [rapotRekapPeriodeId, setRapotRekapPeriodeId] = useState('')
  const [rapotRekapJenjang, setRapotRekapJenjang] = useState('ula')
  const [rapotRekapKelas, setRapotRekapKelas] = useState('')
  const [rapotRekapData, setRapotRekapData] = useState<any[]>([])
  const [rapotRekapLoading, setRapotRekapLoading] = useState(false)

  // Form kalender
  const [formKalNama, setFormKalNama] = useState('')
  const [formKalTipe, setFormKalTipe] = useState('libur')
  const [formKalSemester, setFormKalSemester] = useState('1')
  const [formKalMulai, setFormKalMulai] = useState('')
  const [formKalSelesai, setFormKalSelesai] = useState('')
  const [formKalKeterangan, setFormKalKeterangan] = useState('')

  // Filter states
  const [filterJenjang, setFilterJenjang] = useState('semua')
  const [filterKelas, setFilterKelas] = useState('semua')
  const [filterGuruId, setFilterGuruId] = useState('semua')
  const [searchSantri, setSearchSantri] = useState('')
  const [searchGuru, setSearchGuru] = useState('')
  const [searchWali, setSearchWali] = useState('')

  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: guru } = await supabase.from('profiles').select('*').eq('role', 'guru').order('nama')
    const { data: santri } = await supabase.from('santri').select('*, guru:guru_id(nama), wali:wali_id(nama)').eq('status', 'aktif').order('nama')
    const { data: wali } = await supabase.from('profiles').select('*').eq('role', 'wali').order('nama')
    const { data: surah } = await supabase.from('surah').select('*').order('nomor', { ascending: false })
    const { data: kalender } = await supabase.from('kalender_akademik').select('*').order('tanggal_mulai', { ascending: true })
    const today = new Date().toISOString().split('T')[0]
    const { data: setoran } = await supabase.from('setoran').select('*, santri:santri_id(nama)').eq('tanggal', today).order('created_at', { ascending: false })

    setGuruList(guru || [])
    setSantriList(santri || [])
    setWaliList(wali || [])
    setSurahList(surah || [])
    setKalenderList(kalender || [])
    setSetoranHariIni(setoran || [])

    // Ranking hafalan
    const sortedHafalan = [...(santri || [])].sort((a, b) => (b.total_hafalan_juz || 0) - (a.total_hafalan_juz || 0))
    setRankingHafalan(sortedHafalan)

    // Ranking konsistensi & semangat (7 hari)
    const tujuhHariLalu = new Date()
    tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7)
    const tujuhHariLaluStr = tujuhHariLalu.toISOString().split('T')[0]
    const { data: setoran7Hari } = await supabase
  .from('setoran').select('santri_id, tanggal, jenis, penambahan_juz, status_kehadiran, status')
  .gte('tanggal', tujuhHariLaluStr).eq('status_kehadiran', 'hadir')

// Ambil semua libur akademik
const { data: semuaLibur } = await supabase
  .from('kalender_akademik').select('*').eq('tipe', 'libur')
const liburAkademik = semuaLibur || []

// Hitung hari aktif (skip Jumat, Ahad, libur akademik)
const hitungHariAktif = (mulai: string, selesai: string) => {
  const aktif: string[] = []
  const cur = new Date(mulai)
  const end = new Date(selesai)
  while (cur <= end) {
    const hari = cur.getDay()
    const tgl = cur.toISOString().split('T')[0]
    if (hari !== 0 && hari !== 5) {
      const isLibur = liburAkademik.some((l: any) =>
        tgl >= l.tanggal_mulai && tgl <= l.tanggal_selesai
      )
      if (!isLibur) aktif.push(tgl)
    }
    cur.setDate(cur.getDate() + 1)
  }
  return aktif
}

const hariAktif7Hari = hitungHariAktif(tujuhHariLaluStr, today)
const totalHariAktif = hariAktif7Hari.length || 1

// ===== RANKING KONSISTENSI =====
const statsKonsistensi: Record<string, {
  hariSetorLama: Set<string>, hariSetorBaru: Set<string>,
  najihLama: number, najihBaru: number
}> = {}

;(setoran7Hari || []).forEach((s: any) => {
  if (!statsKonsistensi[s.santri_id]) statsKonsistensi[s.santri_id] = {
    hariSetorLama: new Set(), hariSetorBaru: new Set(),
    najihLama: 0, najihBaru: 0
  }
  if (!hariAktif7Hari.includes(s.tanggal)) return
  if (s.jenis === 'lama') {
    statsKonsistensi[s.santri_id].hariSetorLama.add(s.tanggal)
    if (s.status === 'lancar') statsKonsistensi[s.santri_id].najihLama++
  } else if (s.jenis === 'baru') {
    statsKonsistensi[s.santri_id].hariSetorBaru.add(s.tanggal)
    if (s.status === 'lancar') statsKonsistensi[s.santri_id].najihBaru++
  }
})

const konsistensiList = (santri || []).map((s: any) => {
  const st = statsKonsistensi[s.id] || {
    hariSetorLama: new Set(), hariSetorBaru: new Set(),
    najihLama: 0, najihBaru: 0
  }
  const isUlya = s.jenjang === 'ulya'
  const hariSetor = isUlya ? st.hariSetorBaru.size : st.hariSetorLama.size
  return {
    ...s,
    hariSetor,
    hariSetorBaru: st.hariSetorBaru.size,
    najihLama: st.najihLama,
    najihBaru: st.najihBaru,
    totalHariAktif,
    persentaseKonsistensi: Math.round((hariSetor / totalHariAktif) * 100)
  }
}).sort((a: any, b: any) => {
  const aUlya = a.jenjang === 'ulya'
  const bUlya = b.jenjang === 'ulya'
  // 1. Hari setor utama (lama untuk non-Ulya, baru untuk Ulya)
  const aHari = aUlya ? a.hariSetorBaru : a.hariSetor
  const bHari = bUlya ? b.hariSetorBaru : b.hariSetor
  if (bHari !== aHari) return bHari - aHari
  // 2. Najih utama
  const aNajih = aUlya ? a.najihBaru : a.najihLama
  const bNajih = bUlya ? b.najihBaru : b.najihLama
  if (bNajih !== aNajih) return bNajih - aNajih
  // 3. Hari setor hafalan baru
  if (b.hariSetorBaru !== a.hariSetorBaru) return b.hariSetorBaru - a.hariSetorBaru
  // 4. Najih hafalan baru
  if (b.najihBaru !== a.najihBaru) return b.najihBaru - a.najihBaru
  return 0
})
setRankingKonsistensi(konsistensiList)

// ===== RANKING SEMANGAT =====
const semangatStats: Record<string, {
  totalJuz: number, hariSetor: Set<string>, najih: number
}> = {}
;(setoran7Hari || []).filter((s: any) => s.jenis === 'baru').forEach((s: any) => {
  if (!semangatStats[s.santri_id]) semangatStats[s.santri_id] = {
    totalJuz: 0, hariSetor: new Set(), najih: 0
  }
  semangatStats[s.santri_id].totalJuz += (s.penambahan_juz || 0)
  if (hariAktif7Hari.includes(s.tanggal)) semangatStats[s.santri_id].hariSetor.add(s.tanggal)
  if (s.status === 'lancar') semangatStats[s.santri_id].najih++
})
const semangatList = (santri || []).map((s: any) => {
  const st = semangatStats[s.id] || { totalJuz: 0, hariSetor: new Set(), najih: 0 }
  return {
    ...s,
    tambahJuz7Hari: st.totalJuz,
    tambahHalaman7Hari: st.totalJuz * 20,
    hariSetorBaru7Hari: st.hariSetor.size,
    najihBaru7Hari: st.najih
  }
}).sort((a: any, b: any) => {
  // 1. Total penambahan juz
  if (b.tambahJuz7Hari !== a.tambahJuz7Hari) return b.tambahJuz7Hari - a.tambahJuz7Hari
  // 2. Konsistensi hari setor baru
  if (b.hariSetorBaru7Hari !== a.hariSetorBaru7Hari) return b.hariSetorBaru7Hari - a.hariSetorBaru7Hari
  // 3. Kelancaran hafalan baru
  if (b.najihBaru7Hari !== a.najihBaru7Hari) return b.najihBaru7Hari - a.najihBaru7Hari
  return 0
})
setRankingSemangat(semangatList)
  }
const fetchPeriode = async () => {
    const { data } = await supabase.from('periode_rapot').select('*').order('created_at', { ascending: false })
    setPeriodeList(data || [])
  }

  const hitungTotalJuzAwal = () => {
    if (!formSurahAwal || !formSurahAkhir) return 0
    const nomorKecil = Math.min(parseInt(formSurahAwal), parseInt(formSurahAkhir))
    const nomorBesar = Math.max(parseInt(formSurahAwal), parseInt(formSurahAkhir))
    const surahKecil = surahList.find(s => s.nomor === nomorKecil)
    const surahBesar = surahList.find(s => s.nomor === nomorBesar)
    if (!surahKecil || !surahBesar) return 0
    return Math.max(0, (surahBesar.halaman_selesai - surahKecil.halaman_mulai + 1) / 20)
  }

  // Status hari ini
  const today = new Date().toISOString().split('T')[0]
  const hariMinggu = new Date().getDay()
  const isLiburMingguan = hariMinggu === 0 || hariMinggu === 5
  const kalenderAktif = kalenderList.find(k => today >= k.tanggal_mulai && today <= k.tanggal_selesai)
  const isLiburAkademik = isLiburMingguan || kalenderAktif?.tipe === 'libur'
  const isUjian = kalenderAktif && (kalenderAktif.tipe === 'mid_semester' || kalenderAktif.tipe === 'semester')

  // ===== KALENDER =====
  const handleTambahKalender = async () => {
    setLoading(true); setErrorMsg('')
    if (!formKalNama || !formKalMulai || !formKalSelesai) { setErrorMsg('Nama, tanggal mulai dan selesai wajib diisi!'); setLoading(false); return }
    const { error } = await supabase.from('kalender_akademik').insert({
      nama: formKalNama, tipe: formKalTipe,
      semester: formKalTipe !== 'libur' ? parseInt(formKalSemester) : null,
      tanggal_mulai: formKalMulai, tanggal_selesai: formKalSelesai, keterangan: formKalKeterangan || null
    })
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    setSuccessMsg('Kalender berhasil ditambahkan!')
    setShowForm(false); resetForm(); fetchData(); setLoading(false)
  }

  const handleEditKalender = (kal: any) => {
    setEditKalenderId(kal.id); setFormKalNama(kal.nama); setFormKalTipe(kal.tipe)
    setFormKalSemester(kal.semester?.toString() || '1'); setFormKalMulai(kal.tanggal_mulai)
    setFormKalSelesai(kal.tanggal_selesai); setFormKalKeterangan(kal.keterangan || '')
    setShowForm(true); setFormType('kalender')
  }

  const handleUpdateKalender = async () => {
    setLoading(true); setErrorMsg('')
    const { error } = await supabase.from('kalender_akademik').update({
      nama: formKalNama, tipe: formKalTipe,
      semester: formKalTipe !== 'libur' ? parseInt(formKalSemester) : null,
      tanggal_mulai: formKalMulai, tanggal_selesai: formKalSelesai, keterangan: formKalKeterangan || null
    }).eq('id', editKalenderId)
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    setSuccessMsg('Kalender berhasil diupdate!')
    setShowForm(false); setEditKalenderId(null); resetForm(); fetchData(); setLoading(false)
  }

  const handleHapusKalender = async (id: any) => {
    if (!confirm('Yakin hapus jadwal ini?')) return
    await supabase.from('kalender_akademik').delete().eq('id', id); fetchData()
  }

  // ===== GURU =====
  const handleTambahGuru = async () => {
    setLoading(true); setErrorMsg('')
    const res = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formEmail, password: formPassword, nama: formNama, role: 'guru', no_wa: formNoWa }) })
    const result = await res.json()
    if (result.error) { setErrorMsg(result.error); setLoading(false); return }
    setSuccessMsg('Guru berhasil ditambahkan!'); setShowForm(false); resetForm(); fetchData(); setLoading(false)
  }

  const handleEditGuru = (guru: any) => {
    setEditGuruId(guru.id); setFormNama(guru.nama); setFormNoWa(guru.no_wa || '')
    setFormEmail(''); setFormPassword(''); setShowPassword(false); setShowForm(true); setFormType('guru')
  }

  const handleUpdateGuru = async () => {
    setLoading(true); setErrorMsg('')
    const { error } = await supabase.from('profiles').update({ nama: formNama, no_wa: formNoWa || null }).eq('id', editGuruId)
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    if (formEmail || formPassword) {
      const res = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isUpdate: true, userId: editGuruId, email: formEmail || undefined, password: formPassword || undefined }) })
      const result = await res.json()
      if (result.error) { setErrorMsg(result.error); setLoading(false); return }
    }
    setSuccessMsg('Data guru berhasil diupdate!'); setShowForm(false); setEditGuruId(null); resetForm(); fetchData(); setLoading(false)
  }

  // ===== WALI =====
  const handleTambahWali = async () => {
    setLoading(true); setErrorMsg('')
    const res = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formEmail, password: formPassword, nama: formNama, role: 'wali', no_wa: formNoWa }) })
    const result = await res.json()
    if (result.error) { setErrorMsg(result.error); setLoading(false); return }
    setSuccessMsg('Wali berhasil ditambahkan!'); setShowForm(false); resetForm(); fetchData(); setLoading(false)
  }

  const handleEditWali = (wali: any) => {
    setEditWaliId(wali.id); setFormNama(wali.nama); setFormNoWa(wali.no_wa || '')
    setFormEmail(''); setFormPassword(''); setShowPassword(false); setShowForm(true); setFormType('wali')
  }

  const handleUpdateWali = async () => {
    setLoading(true); setErrorMsg('')
    const { error } = await supabase.from('profiles').update({ nama: formNama, no_wa: formNoWa || null }).eq('id', editWaliId)
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    if (formEmail || formPassword) {
      const res = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isUpdate: true, userId: editWaliId, email: formEmail || undefined, password: formPassword || undefined }) })
      const result = await res.json()
      if (result.error) { setErrorMsg(result.error); setLoading(false); return }
    }
    setSuccessMsg('Data wali berhasil diupdate!'); setShowForm(false); setEditWaliId(null); resetForm(); fetchData(); setLoading(false)
  }

  // ===== SANTRI =====
  const handleTambahSantri = async () => {
    setLoading(true); setErrorMsg('')
    if (!formNama || !formJenjang || !formKelasNum) { setErrorMsg('Nama, jenjang dan kelas wajib diisi!'); setLoading(false); return }
    const { error } = await supabase.from('santri').insert({
      nama: formNama, jenjang: formJenjang, kelas_num: parseInt(formKelasNum),
      kelas: `Kelas ${formKelasNum} ${jenjangLabel(formJenjang)}`,
      guru_id: formGuruId || null, guru_id_2: formGuruId2 || null, wali_id: formWaliId || null,
      total_hafalan_juz: hitungTotalJuzAwal(),
      surah_terakhir_nomor: formSurahAkhir ? parseInt(formSurahAkhir) : null,
      ayat_terakhir: formAyatAkhir ? parseInt(formAyatAkhir) : null,
      nik: formNik || null, nisn: formNisn || null,
      tempat_lahir: formTempatLahir || null,
      tanggal_lahir: formTanggalLahir || null,
      alamat: formAlamat || null,
      status: formStatus || 'aktif',
      tahun_lulus: formTahunLulus || null,
      keterangan_keluar: formKeteranganKeluar || null,
    })
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    setSuccessMsg('Santri berhasil ditambahkan!'); setShowForm(false); resetForm(); fetchData(); setLoading(false)
  }

  const handleEditSantri = (santri: any) => {
    setEditSantriId(santri.id); setFormNama(santri.nama)
    setFormJenjang(santri.jenjang || ''); setFormKelasNum(santri.kelas_num?.toString() || '')
    setFormGuruId(santri.guru_id || ''); setFormGuruId2(santri.guru_id_2 || ''); setFormWaliId(santri.wali_id || '')
    setFormSurahAwal(''); setFormAyatAwal('1')
    setFormSurahAkhir(santri.surah_terakhir_nomor?.toString() || '')
    setFormAyatAkhir(santri.ayat_terakhir?.toString() || '')
    setFormNik(santri.nik || ''); setFormNisn(santri.nisn || '')
    setFormTempatLahir(santri.tempat_lahir || '')
    setFormTanggalLahir(santri.tanggal_lahir || '')
    setFormAlamat(santri.alamat || '')
    setFormStatus(santri.status || 'aktif')
    setFormTahunLulus(santri.tahun_lulus || '')
    setFormKeteranganKeluar(santri.keterangan_keluar || '')
    setShowForm(true); setFormType('santri')
  }

  const handleUpdateSantri = async () => {
    setLoading(true); setErrorMsg('')
    let updateData: any = {
      nama: formNama, jenjang: formJenjang, kelas_num: parseInt(formKelasNum),
      kelas: `Kelas ${formKelasNum} ${jenjangLabel(formJenjang)}`,
      guru_id: formGuruId || null, guru_id_2: formGuruId2 || null, wali_id: formWaliId || null,
      nik: formNik || null, nisn: formNisn || null,
      tempat_lahir: formTempatLahir || null,
      tanggal_lahir: formTanggalLahir || null,
      alamat: formAlamat || null,
      status: formStatus || 'aktif',
      tahun_lulus: formTahunLulus || null,
      keterangan_keluar: formKeteranganKeluar || null,
    }
    if (formSurahAwal && formSurahAkhir) {
      updateData = { ...updateData, total_hafalan_juz: hitungTotalJuzAwal(), surah_terakhir_nomor: parseInt(formSurahAkhir), ayat_terakhir: formAyatAkhir ? parseInt(formAyatAkhir) : null }
    } else if (formSurahAkhir && !formSurahAwal) {
      updateData = { ...updateData, surah_terakhir_nomor: parseInt(formSurahAkhir), ayat_terakhir: formAyatAkhir ? parseInt(formAyatAkhir) : null }
    }
    const { error } = await supabase.from('santri').update(updateData).eq('id', editSantriId)
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    setSuccessMsg('Santri berhasil diupdate!'); setShowForm(false); setEditSantriId(null); resetForm(); fetchData(); setLoading(false)
  }

  const handleHapusGuru = async (id: any) => {
    if (!confirm('Yakin hapus guru ini?')) return
    const res = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isDelete: true, userId: id }) })
    const result = await res.json()
    if (result.error) { alert('Gagal hapus: ' + result.error); return }
    setSuccessMsg('Guru berhasil dihapus!'); fetchData()
  }

  const handleHapusWali = async (id: any) => {
    if (!confirm('Yakin hapus wali ini?')) return
    const res = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isDelete: true, userId: id }) })
    const result = await res.json()
    if (result.error) { alert('Gagal hapus: ' + result.error); return }
    setSuccessMsg('Wali berhasil dihapus!'); fetchData()
  }

  const handleHapusSantri = async (id: any) => {
    if (!confirm('Yakin hapus santri ini?')) return
    await supabase.from('santri').delete().eq('id', id); fetchData()
  }

  const handleDownloadTemplate = () => { window.open('/api/download-template', '_blank') }
  const handleDownloadAllData = async () => {
    setDownloadLoading(true)
    window.open('/api/download-data', '_blank')
    setTimeout(() => setDownloadLoading(false), 2000)
  }
  const handleDownloadLaporan = async (format: 'excel' | 'pdf') => {
  setLaporanLoading(format)
  const params = new URLSearchParams({
    bulan: laporanBulan,
    jenjang: laporanJenjang,
    kelas: laporanKelas,
    santri_id: laporanSantriId,
  })
  const url = format === 'excel'
    ? `/api/laporan-bulanan-excel?${params}`
    : `/api/laporan-bulanan-pdf?${params}`
  window.open(url, '_blank')
  setTimeout(() => setLaporanLoading(''), 3000)
}

// ===== PERIODE RAPOT =====
  const handleTambahPeriode = async () => {
    setLoading(true); setErrorMsg('')
    if (!formPeriodeNama || !formPeriodeTahunAjaran) { setErrorMsg('Nama dan tahun ajaran wajib diisi!'); setLoading(false); return }
    if (formPeriodeAktif) {
      await supabase.from('periode_rapot').update({ is_aktif: false }).eq('is_aktif', true)
    }
    const { error } = await supabase.from('periode_rapot').insert({
      nama: formPeriodeNama, tahun_ajaran: formPeriodeTahunAjaran,
      semester: formPeriodeSemester, tanggal_rapot: formPeriodeTanggal || null,
      is_aktif: formPeriodeAktif
    })
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    setSuccessMsg('Periode berhasil ditambahkan!')
    setShowFormPeriode(false); resetFormPeriode(); fetchPeriode(); setLoading(false)
  }

  const handleUpdatePeriode = async () => {
    setLoading(true); setErrorMsg('')
    if (formPeriodeAktif) {
      await supabase.from('periode_rapot').update({ is_aktif: false }).eq('is_aktif', true)
    }
    const { error } = await supabase.from('periode_rapot').update({
      nama: formPeriodeNama, tahun_ajaran: formPeriodeTahunAjaran,
      semester: formPeriodeSemester, tanggal_rapot: formPeriodeTanggal || null,
      is_aktif: formPeriodeAktif
    }).eq('id', editPeriodeId)
    if (error) { setErrorMsg(error.message); setLoading(false); return }
    setSuccessMsg('Periode berhasil diupdate!')
    setShowFormPeriode(false); setEditPeriodeId(null); resetFormPeriode(); fetchPeriode(); setLoading(false)
  }

  const handleHapusPeriode = async (id: any) => {
    if (!confirm('Yakin hapus periode ini?')) return
    await supabase.from('periode_rapot').delete().eq('id', id); fetchPeriode()
  }

  const handleEditPeriode = (p: any) => {
    setEditPeriodeId(p.id); setFormPeriodeNama(p.nama)
    setFormPeriodeTahunAjaran(p.tahun_ajaran); setFormPeriodeSemester(p.semester)
    setFormPeriodeTanggal(p.tanggal_rapot || ''); setFormPeriodeAktif(p.is_aktif)
    setShowFormPeriode(true)
  }

  const fetchRekapKelas = async () => {
    if (!rapotRekapPeriodeId || !rapotRekapKelas) return
    setRapotRekapLoading(true)
    setRapotRekapData([])

    // Ambil nilai berdasarkan kelas_snapshot dulu
    const { data: nilaiSnapshot } = await supabase
      .from('nilai_rapot')
      .select('*, santri:santri_id(nama, kelas_num, jenjang, status)')
      .eq('periode_id', rapotRekapPeriodeId)
      .eq('kelas_snapshot', parseInt(rapotRekapKelas))

    let nilaiList = nilaiSnapshot || []

    // Jika tidak ada kelas_snapshot, fallback ke kelas santri saat ini
    if (nilaiList.length === 0) {
      const { data: santriKelas } = await supabase
        .from('santri').select('id')
        .eq('jenjang', rapotRekapJenjang)
        .eq('kelas_num', parseInt(rapotRekapKelas))
      const ids = (santriKelas || []).map((s: any) => s.id)
      if (ids.length > 0) {
        const { data: nilaiFallback } = await supabase
          .from('nilai_rapot')
          .select('*, santri:santri_id(nama, kelas_num, jenjang, status)')
          .eq('periode_id', rapotRekapPeriodeId)
          .in('santri_id', ids)
        nilaiList = nilaiFallback || []
      }
    }

    // Hitung rata-rata per santri
    const hitungRata = (n: any) => {
      const d = [n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].filter((v: any) => v != null && v > 0)
      const u = [n.bhs_indonesia, n.berhitung, n.ipa, n.ips].filter((v: any) => v != null && v > 0)
      if (d.length === 0 && u.length === 0) return 0
      const rd = d.length > 0 ? d.reduce((a: number, b: number) => a + b, 0) / d.length : 0
      const ru = u.length > 0 ? u.reduce((a: number, b: number) => a + b, 0) / u.length : 0
      if (d.length === 0) return ru
      if (u.length === 0) return rd
      return (rd + ru) / 2
    }

    // Tambah rata-rata dan urutkan
    const withRata = nilaiList.map((n: any) => ({
      ...n,
      rata_diiniyyah: (() => {
        const d = [n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].filter((v: any) => v != null && v > 0)
        return d.length > 0 ? d.reduce((a: number, b: number) => a + b, 0) / d.length : null
      })(),
      rata_umum: (() => {
        const u = [n.bhs_indonesia, n.berhitung, n.ipa, n.ips].filter((v: any) => v != null && v > 0)
        return u.length > 0 ? u.reduce((a: number, b: number) => a + b, 0) / u.length : null
      })(),
      rata_akhir: hitungRata(n)
    })).sort((a: any, b: any) => b.rata_akhir - a.rata_akhir)

    // Tambah peringkat
    const withPeringkat = withRata.map((n: any, i: number) => ({ ...n, peringkat: i + 1 }))

    setRapotRekapData(withPeringkat)
    setRapotRekapLoading(false)
  }

  const fetchSantriUntukRapot = async (periodeId: string) => {
    // Admin bisa akses semua santri termasuk alumni
    const { data } = await supabase.from('santri')
      .select('*, guru:guru_id(nama)')
      .order('kelas_num').order('nama')
    setRapotInputSantriList(data || [])
    setRapotInputSantri(null)
    setRapotInputSearch('')
    setRapotNilai({})
    setRapotExistingId(null)
    setRapotKelasSnapshot('')
    setRapotJenjangSnapshot('ula')
    setRapotInputMsg('')
  }

  const fetchNilaiRapotAdmin = async (santriId: string, periodeId: string, kelasSnapshot?: string) => {
    let query = supabase.from('nilai_rapot')
      .select('*').eq('santri_id', santriId).eq('periode_id', periodeId)
    if (kelasSnapshot) query = query.eq('kelas_snapshot', parseInt(kelasSnapshot))
    const { data } = await query.maybeSingle()
    if (data) {
      setRapotExistingId(data.id)
      setRapotNilai({
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
        hadir_sakit: data.hadir_sakit ?? 0,
        hadir_izin: data.hadir_izin ?? 0,
        hadir_alpha: data.hadir_alpha ?? 0,
        catatan: data.catatan || '',
      })
    } else {
      setRapotExistingId(null)
      setRapotNilai({
        kelancaran: '', tajwid: '', keterangan_hafalan: '',
        aqidah: '', akhlak: '', fiqh: '', bhs_arab: '', siroh: '', khoth: '',
        bhs_indonesia: '', berhitung: '', ipa: '', ips: '',
        akhlak_kepribadian: 'B', kebersihan: 'B', ketertiban: 'B',
        ekskul_renang: '', ekskul_beladiri: '',
        hadir_sakit: 0, hadir_izin: 0, hadir_alpha: 0, catatan: '',
      })
    }
  }

  const handleSimpanRapotAdmin = async () => {
    if (!rapotInputSantri || !rapotInputPeriodeId) return
    setRapotInputLoading(true); setRapotInputMsg('')
    const dataRapot = {
      santri_id: rapotInputSantri.id,
      periode_id: rapotInputPeriodeId,
      guru_id: rapotInputSantri.guru_id || null,
      kelas_snapshot: rapotKelasSnapshot ? parseInt(rapotKelasSnapshot) : null,
      jenjang_snapshot: rapotJenjangSnapshot || null,
      kelancaran: parseInt(rapotNilai.kelancaran) || null,
      tajwid: parseInt(rapotNilai.tajwid) || null,
      keterangan_hafalan: rapotNilai.keterangan_hafalan || null,
      aqidah: parseInt(rapotNilai.aqidah) || null,
      akhlak: parseInt(rapotNilai.akhlak) || null,
      fiqh: parseInt(rapotNilai.fiqh) || null,
      bhs_arab: parseInt(rapotNilai.bhs_arab) || null,
      siroh: parseInt(rapotNilai.siroh) || null,
      khoth: parseInt(rapotNilai.khoth) || null,
      bhs_indonesia: parseInt(rapotNilai.bhs_indonesia) || null,
      berhitung: parseInt(rapotNilai.berhitung) || null,
      ipa: parseInt(rapotNilai.ipa) || null,
      ips: parseInt(rapotNilai.ips) || null,
      akhlak_kepribadian: rapotNilai.akhlak_kepribadian,
      kebersihan: rapotNilai.kebersihan,
      ketertiban: rapotNilai.ketertiban,
      ekskul_renang: parseInt(rapotNilai.ekskul_renang) || null,
      ekskul_beladiri: rapotNilai.ekskul_beladiri || null,
      hadir_sakit: parseInt(rapotNilai.hadir_sakit) || 0,
      hadir_izin: parseInt(rapotNilai.hadir_izin) || 0,
      hadir_alpha: parseInt(rapotNilai.hadir_alpha) || 0,
      catatan: rapotNilai.catatan || null,
    }
    let error
    if (rapotExistingId) {
      const res = await supabase.from('nilai_rapot').update(dataRapot).eq('id', rapotExistingId)
      error = res.error
    } else {
      const res = await supabase.from('nilai_rapot').insert(dataRapot)
      error = res.error
    }
    if (error) { setRapotInputMsg('Gagal: ' + error.message); setRapotInputLoading(false); return }
    setRapotInputMsg('✓ Nilai rapot berhasil disimpan!')
    setRapotInputLoading(false)
    fetchNilaiRapotAdmin(rapotInputSantri.id, rapotInputPeriodeId, rapotKelasSnapshot)
  }

  const resetFormPeriode = () => {
    setFormPeriodeNama(''); setFormPeriodeTahunAjaran(''); setFormPeriodeSemester('genap')
    setFormPeriodeTanggal(''); setFormPeriodeAktif(false); setEditPeriodeId(null)
  }

// ===== NAIK KELAS =====
  const handlePreviewNaikKelas = async () => {
    if (!naikKelasNum) return
    const { data } = await supabase.from('santri')
      .select('id, nama, kelas_num, jenjang, kelas')
      .eq('jenjang', naikKelasJenjang)
      .eq('kelas_num', parseInt(naikKelasNum))
      .eq('status', 'aktif')
      .order('nama')
    setNaikKelasPreview(data || [])
    const checked: Record<string, boolean> = {}
    ;(data || []).forEach((s: any) => { checked[s.id] = true })
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

      const jenjangBaruLabel = jenjangBaru === 'ula' ? 'Ula' : jenjangBaru === 'wustha' ? 'Wustha' : 'Ulya'
      await supabase.from('santri').update({
        kelas_num: kelasBaruNum,
        jenjang: jenjangBaru,
        kelas: `Kelas ${kelasBaruNum} ${jenjangBaruLabel}`,
        guru_id: null // Putuskan ikatan guru lama
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

  const handleImportExcel = async (e: any) => {
    const file = e.target.files[0]; if (!file) return
    setImportLoading(true); setImportMsg('')
    const formData = new FormData(); formData.append('file', file)
    const res = await fetch('/api/import-excel', { method: 'POST', body: formData })
    const result = await res.json()
    setImportMsg(result.message); setImportLoading(false); fetchData()
  }

  const resetForm = () => {
    setFormNama(''); setFormEmail(''); setFormPassword(''); setFormNoWa('')
    setFormGuruId(''); setFormGuruId2(''); setFormWaliId(''); setFormJenjang(''); setFormKelasNum('')
    setFormSurahAwal(''); setFormAyatAwal('1'); setFormSurahAkhir(''); setFormAyatAkhir('')
    setFormNik(''); setFormNisn(''); setFormTempatLahir(''); setFormTanggalLahir(''); setFormAlamat('')
    setFormStatus('aktif'); setFormTahunLulus(''); setFormKeteranganKeluar('')
    setNaikKelasPreview([]); setNaikKelasChecked({}); setNaikKelasMsg('')
    setShowPassword(false)
    setFormKalNama(''); setFormKalTipe('libur'); setFormKalSemester('1')
    setFormKalMulai(''); setFormKalSelesai(''); setFormKalKeterangan('')
    setEditSantriId(null); setEditGuruId(null); setEditWaliId(null); setEditKalenderId(null)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const santriSudahSetor = [...new Set(setoranHariIni.map(s => s.santri_id))]
  const santriBelumSetor = santriList.filter(s => !santriSudahSetor.includes(s.id))
  const guruSudahInput = [...new Set(setoranHariIni.map(s => s.guru_id))]
  const guruBelumInput = guruList.filter(g => !guruSudahInput.includes(g.id))

  const getKelasOptions = (jenjang: string) => {
    if (jenjang === 'ula') return [1,2,3,4,5,6]
    if (jenjang === 'wustha') return [7,8,9]
    if (jenjang === 'ulya') return [10,11,12]
    return []
  }

  const jenjangLabel = (j: string) => {
    if (j === 'ula') return 'Ula'
    if (j === 'wustha') return 'Wustha'
    if (j === 'ulya') return 'Ulya'
    return j
  }

  const tipeKalenderLabel = (t: string) => {
    if (t === 'libur') return 'Libur'
    if (t === 'mid_semester') return 'Mid Semester'
    if (t === 'semester') return 'Ujian Semester'
    return t
  }

  const tipeKalenderColor = (t: string) => {
    if (t === 'libur') return 'bg-gray-100 text-gray-700'
    if (t === 'mid_semester') return 'bg-orange-100 text-orange-700'
    if (t === 'semester') return 'bg-red-100 text-red-700'
    return 'bg-blue-100 text-blue-700'
  }

  // Filter santri
  const santriFiltered = santriList.filter(s => {
    if (filterJenjang !== 'semua' && s.jenjang !== filterJenjang) return false
    if (filterKelas !== 'semua' && s.kelas_num?.toString() !== filterKelas) return false
    if (filterGuruId !== 'semua' && s.guru_id !== filterGuruId) return false
    if (searchSantri && !s.nama?.toLowerCase().includes(searchSantri.toLowerCase())) return false
    return true
  })

  const guruFiltered = guruList.filter(g =>
    !searchGuru || g.nama?.toLowerCase().includes(searchGuru.toLowerCase()) || g.no_wa?.includes(searchGuru)
  )

  const waliFiltered = waliList.filter(w =>
    !searchWali || w.nama?.toLowerCase().includes(searchWali.toLowerCase()) || w.no_wa?.includes(searchWali)
  )

  // Filter ranking
  const filterRankingList = (list: any[]) => list.filter(s => {
    if (filterJenjang !== 'semua' && s.jenjang !== filterJenjang) return false
    if (filterKelas !== 'semua' && s.kelas_num?.toString() !== filterKelas) return false
    return true
  })

  const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'monitoring', label: 'Monitoring', icon: '◉' },
  { id: 'kalender', label: 'Kalender Akademik', icon: '📅' },
  { id: 'guru', label: 'Data Guru', icon: '▤' },
  { id: 'santri', label: 'Data Santri', icon: '◎' },
  { id: 'alumni', label: 'Data Alumni', icon: '🎓' },
  { id: 'naik-kelas', label: 'Naik Kelas', icon: '⬆' },
  { id: 'wali', label: 'Data Wali', icon: '◍' },
  { id: 'ranking', label: 'Ranking Santri', icon: '✦' },
  { id: 'laporan', label: 'Laporan Bulanan', icon: '📊' },
  { id: 'rapot', label: 'Rapot Digital', icon: '📋' },
]

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
  const btnPrimary = "text-white px-6 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shadow transition"

  const FormEmailPassword = ({ isEdit }: { isEdit: boolean }) => (
    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
      <p className="text-xs font-semibold text-yellow-800 mb-3">
        {isEdit ? '✏️ Ubah Email / Password (kosongkan jika tidak ingin diubah)' : '🔐 Akun Login'}
      </p>
      <div className="space-y-2">
        <input placeholder="Email" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className={inputClass} />
        <div className="relative">
          <input placeholder={isEdit ? "Password baru (kosongkan jika tidak diubah)" : "Password"}
            type={showPassword ? 'text' : 'password'} value={formPassword} onChange={e => setFormPassword(e.target.value)}
            className={inputClass + ' pr-12'} />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-gray-400 text-sm px-1">{showPassword ? '🙈' : '👁'}</button>
        </div>
        {showPassword && formPassword && (
          <div className="p-2 bg-white rounded-lg border border-yellow-200">
            <p className="text-xs text-gray-500">Password: <span className="font-bold text-gray-800">{formPassword}</span></p>
          </div>
        )}
      </div>
    </div>
  )
const AlumniList = () => {
    const [alumniData, setAlumniData] = useState<any[]>([])
    const [filterStatusAlumni, setFilterStatusAlumni] = useState('semua')
    const [searchAlumni, setSearchAlumni] = useState('')

    useEffect(() => {
      const fetchAlumni = async () => {
        const { data } = await supabase.from('santri')
          .select('*, guru:guru_id(nama)')
          .in('status', ['alumni', 'keluar']).order('nama')
        setAlumniData(data || [])
      }
      fetchAlumni()
    }, [])

    const filtered = alumniData.filter(s => {
      if (filterStatusAlumni !== 'semua' && s.status !== filterStatusAlumni) return false
      if (searchAlumni && !s.nama?.toLowerCase().includes(searchAlumni.toLowerCase())) return false
      return true
    })

    return (
      <div>
        <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <select value={filterStatusAlumni} onChange={e => setFilterStatusAlumni(e.target.value)} className={inputClass}>
              <option value="semua">Semua</option>
              <option value="alumni">Alumni (Lulus)</option>
              <option value="keluar">Keluar</option>
            </select>
            <input type="text" value={searchAlumni} onChange={e => setSearchAlumni(e.target.value)}
              placeholder="Cari nama..." className={inputClass} />
          </div>
          <p className="text-xs text-gray-400">{filtered.length} dari {alumniData.length} alumni</p>
        </div>
        <div className="space-y-3">
          {filtered.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Belum ada data alumni</div>}
          {filtered.map(s => (
            <div key={s.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: s.status === 'alumni' ? 'linear-gradient(135deg, #92400e, #d97706)' : 'linear-gradient(135deg, #374151, #6b7280)' }}>
                  {s.nama?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{s.nama}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.status === 'alumni' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                      {s.status === 'alumni' ? '🎓 Alumni' : '↩ Keluar'}
                    </span>
                    {s.jenjang && <span className="text-xs text-gray-400">Terakhir: {s.kelas || '-'}</span>}
                    {s.tahun_lulus && <span className="text-xs text-gray-400">TA {s.tahun_lulus}</span>}
                    {s.nisn && <span className="text-xs text-gray-400">NIS: {s.nisn}</span>}
                  </div>
                  {s.keterangan_keluar && <div className="text-xs text-gray-400 mt-0.5">{s.keterangan_keluar}</div>}
                </div>
                <button onClick={() => {
                  handleEditSantri(s)
                  setActiveMenu('santri')
                  setSidebarOpen(false)
                }}
                  className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50 flex-shrink-0">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER MOBILE */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 text-white px-4 py-3 flex items-center justify-between shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-full p-0.5 w-9 h-9 flex items-center justify-center shadow">
            <Image src="/logo.png" alt="Logo" width={30} height={30} className="object-contain" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">Daarus Salaf</div>
            <div className="text-blue-200 text-xs">Administrator</div>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="text-2xl p-1">☰</button>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex">
        {/* SIDEBAR */}
        <div className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:w-64`}
          style={{ background: 'linear-gradient(180deg, #1a3a5c 0%, #1e4080 100%)' }}>
          <div className="p-5 border-b border-blue-700">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full p-1 shadow-md flex-shrink-0 w-14 h-14 flex items-center justify-center">
                <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Pondok Pesantren</div>
                <div className="text-white font-bold text-base">Daarus Salaf</div>
                <div className="text-blue-300 text-xs">Sukoharjo</div>
              </div>
            </div>
            <div className="mt-3 bg-blue-800 bg-opacity-60 rounded-xl px-3 py-2 border border-blue-600">
              <div className="text-blue-300 text-xs">Masuk sebagai</div>
              <div className="text-white font-semibold text-sm">Administrator</div>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map(menu => (
              <button key={menu.id}
                onClick={() => { setActiveMenu(menu.id); setShowForm(false); setSuccessMsg(''); setSidebarOpen(false) }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium flex items-center gap-3 ${activeMenu === menu.id ? 'bg-white text-blue-900 shadow-md font-bold' : 'text-blue-100 hover:bg-white hover:bg-opacity-10'}`}>
                <span>{menu.icon}</span>{menu.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-blue-700">
            <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-semibold">Keluar</button>
            <button onClick={() => setSidebarOpen(false)} className="w-full text-blue-300 py-2 rounded-xl text-xs md:hidden mt-1">✕ Tutup</button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0 min-w-0">

          {/* DASHBOARD */}
          {activeMenu === 'dashboard' && (
            <div>
              <div className="rounded-2xl p-6 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 bg-white" />
                <div className="absolute -bottom-10 -right-4 w-48 h-48 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-white bg-opacity-20 rounded-xl p-2">
                      <Image src="/logo.png" alt="Logo" width={36} height={36} className="object-contain" />
                    </div>
                    <div>
                      <p className="text-blue-200 text-sm">Selamat datang,</p>
                      <h2 className="text-white font-bold text-xl">Administrator</h2>
                    </div>
                  </div>
                  <p className="text-blue-200 text-sm mt-2">📅 {tanggal}</p>
                  <p className="text-blue-100 text-xs mt-1">Pondok Pesantren Daarus Salaf Sukoharjo</p>
                </div>
              </div>

              {isLiburAkademik && (
                <div className="mb-4 p-4 rounded-2xl border-2 border-orange-300 bg-orange-50 flex items-center gap-3">
                  <span className="text-2xl">🏖</span>
                  <div>
                    <div className="font-bold text-orange-800 text-sm">
                      {isLiburMingguan ? (hariMinggu === 0 ? 'Hari ini Ahad — Libur Mingguan' : 'Hari ini Jumat — Libur Mingguan') : kalenderAktif?.nama}
                    </div>
                    <div className="text-orange-600 text-xs">Tidak ada setoran hari ini</div>
                  </div>
                </div>
              )}
              {isUjian && (
                <div className="mb-4 p-4 rounded-2xl border-2 border-red-300 bg-red-50 flex items-center gap-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <div className="font-bold text-red-800 text-sm">{kalenderAktif?.nama}</div>
                    <div className="text-red-600 text-xs">{kalenderAktif?.tipe === 'mid_semester' ? 'Mode Ujian Mid Semester' : 'Mode Ujian Semester'} aktif</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Total Guru', count: guruList.length, color: 'from-blue-500 to-blue-700', sub: 'Guru musami\'' },
                  { label: 'Total Santri', count: santriList.length, color: 'from-emerald-500 to-emerald-700', sub: 'Terdaftar' },
                  { label: 'Total Wali', count: waliList.length, color: 'from-purple-500 to-purple-700', sub: 'Terdaftar' },
                ].map((item, i) => (
                  <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow-lg text-white relative overflow-hidden`}>
                    <div className="absolute -bottom-3 -right-3 text-6xl opacity-10">◆</div>
                    <div className="text-3xl font-bold">{item.count}</div>
                    <div className="font-semibold text-sm mt-1">{item.label}</div>
                    <div className="text-white text-opacity-70 text-xs">{item.sub}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>✦</div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">Setoran Hari Ini</h3>
                      <p className="text-gray-400 text-xs">{setoranHariIni.length} setoran</p>
                    </div>
                  </div>
                  {setoranHariIni.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                          {item.santri?.nama?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{item.santri?.nama}</div>
                          <div className="text-xs text-gray-400">{item.surah} {item.ayat_mulai}-{item.ayat_selesai}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.status === 'lancar' ? 'Lancar' : 'Rosib'}
                      </span>
                    </div>
                  ))}
                  {setoranHariIni.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada setoran</p>}
                </div>

                <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>⊞</div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">Kelola Data</h3>
                      <p className="text-gray-400 text-xs">Import & Export data santri</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button onClick={handleDownloadTemplate}
                      className="w-full text-white px-4 py-3 rounded-xl font-semibold text-sm shadow"
                      style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                      ⬇ Download Template Import
                    </button>
                    <label className="w-full text-white px-4 py-3 rounded-xl font-semibold text-sm text-center cursor-pointer shadow flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                      {importLoading ? 'Mengimport...' : '⬆ Upload File Excel'}
                      <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" disabled={importLoading} />
                    </label>
                    <button onClick={handleDownloadAllData} disabled={downloadLoading}
                      className="w-full text-white px-4 py-3 rounded-xl font-semibold text-sm shadow"
                      style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>
                      {downloadLoading ? 'Menyiapkan...' : '📥 Download Semua Data'}
                    </button>
                  </div>
                  {importMsg && <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs">✓ {importMsg}</div>}
                </div>
              </div>
            </div>
          )}

          {/* MONITORING */}
          {activeMenu === 'monitoring' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Monitoring Harian</h2>
                  <p className="text-blue-200 text-sm mt-1">📅 {tanggal}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Sudah Setor', count: santriSudahSetor.length, color: 'from-green-500 to-green-700', sub: 'Santri' },
                  { label: 'Belum Setor', count: santriBelumSetor.length, color: 'from-red-500 to-red-700', sub: 'Santri' },
                  { label: 'Guru Hadir', count: guruSudahInput.length, color: 'from-blue-500 to-blue-700', sub: 'Dari ' + guruList.length },
                  { label: 'Guru Absen', count: guruBelumInput.length, color: 'from-orange-500 to-orange-700', sub: 'Tidak input' },
                ].map((item, i) => (
                  <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow-lg text-white relative overflow-hidden`}>
                    <div className="absolute -bottom-2 -right-2 text-5xl opacity-10">◆</div>
                    <div className="text-3xl font-bold">{item.count}</div>
                    <div className="font-semibold text-xs mt-1">{item.label}</div>
                    <div className="text-white text-opacity-70 text-xs">{item.sub}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Progress Setoran</span>
                  <span className="text-sm font-bold" style={{ color: '#2563a8' }}>
                    {santriList.length > 0 ? Math.round((santriSudahSetor.length / santriList.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div className="h-4 rounded-full" style={{ width: `${santriList.length > 0 ? (santriSudahSetor.length / santriList.length) * 100 : 0}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{santriSudahSetor.length} dari {santriList.length} santri</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                    <h3 className="text-white font-semibold text-sm">Guru Hadir ({guruSudahInput.length})</h3>
                  </div>
                  <div className="p-3">
                    {guruList.filter(g => guruSudahInput.includes(g.id)).map(g => (
                      <div key={g.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                        <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">{g.nama?.charAt(0).toUpperCase()}</div>
                        <span className="text-sm">{g.nama}</span>
                        <span className="ml-auto text-green-500 text-xs">Hadir</span>
                      </div>
                    ))}
                    {guruSudahInput.length === 0 && <p className="text-gray-400 text-sm text-center py-3">Belum ada</p>}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-700">
                    <h3 className="text-white font-semibold text-sm">Guru Absen ({guruBelumInput.length})</h3>
                  </div>
                  <div className="p-3">
                    {guruBelumInput.map(g => (
                      <div key={g.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                        <div className="w-7 h-7 rounded-full bg-red-400 flex items-center justify-center text-white text-xs font-bold">{g.nama?.charAt(0).toUpperCase()}</div>
                        <span className="text-sm">{g.nama}</span>
                        <span className="ml-auto text-red-400 text-xs">Absen</span>
                      </div>
                    ))}
                    {guruBelumInput.length === 0 && <p className="text-gray-400 text-sm text-center py-3">Semua hadir!</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KALENDER AKADEMIK */}
          {activeMenu === 'kalender' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Kalender Akademik</h2>
                  <p className="text-teal-100 text-sm mt-1">Kelola jadwal libur dan ujian</p>
                  <p className="text-teal-200 text-xs mt-0.5">Jumat & Ahad = libur otomatis</p>
                </div>
              </div>
              {(isLiburMingguan || kalenderAktif) && (
                <div className={`mb-5 p-4 rounded-2xl border-2 flex items-center gap-3 ${isUjian ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'}`}>
                  <span className="text-2xl">{isUjian ? '📝' : '🏖'}</span>
                  <div>
                    <div className={`font-bold text-sm ${isUjian ? 'text-red-800' : 'text-orange-800'}`}>
                      Status: {isLiburMingguan ? (hariMinggu === 0 ? 'Ahad — Libur' : 'Jumat — Libur') : kalenderAktif?.nama}
                    </div>
                    <div className={`text-xs mt-0.5 ${isUjian ? 'text-red-600' : 'text-orange-600'}`}>{isUjian ? 'Mode ujian aktif' : 'Hari libur'}</div>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">Jadwal Akademik 2026/2027</h3>
                <button onClick={() => { resetForm(); setShowForm(true); setFormType('kalender') }}
                  className={btnPrimary} style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}>+ Tambah Jadwal</button>
              </div>
              {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {successMsg}</div>}
              {showForm && formType === 'kalender' && (
                <div className="bg-white p-5 rounded-2xl shadow-md mb-5 border border-gray-100">
                  <h3 className="font-bold text-base mb-4">{editKalenderId ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</h3>
                  <div className="space-y-3">
                    <input placeholder="Nama Jadwal" value={formKalNama} onChange={e => setFormKalNama(e.target.value)} className={inputClass} />
                    <select value={formKalTipe} onChange={e => setFormKalTipe(e.target.value)} className={inputClass}>
                      <option value="libur">Libur</option>
                      <option value="mid_semester">Ujian Mid Semester</option>
                      <option value="semester">Ujian Akhir Semester</option>
                    </select>
                    {formKalTipe !== 'libur' && (
                      <select value={formKalSemester} onChange={e => setFormKalSemester(e.target.value)} className={inputClass}>
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                      </select>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tanggal Mulai</label>
                        <input type="date" value={formKalMulai} onChange={e => setFormKalMulai(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tanggal Selesai</label>
                        <input type="date" value={formKalSelesai} onChange={e => setFormKalSelesai(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                    <textarea placeholder="Keterangan (opsional)" value={formKalKeterangan}
                      onChange={e => setFormKalKeterangan(e.target.value)} rows={2} className={inputClass} />
                  </div>
                  {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={editKalenderId ? handleUpdateKalender : handleTambahKalender} disabled={loading}
                      className={btnPrimary} style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}>
                      {loading ? 'Menyimpan...' : editKalenderId ? 'Update' : 'Simpan'}
                    </button>
                    <button onClick={() => { setShowForm(false); resetForm() }} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {kalenderList.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Belum ada jadwal</div>}
                {kalenderList.map((kal) => {
                  const isAktif = today >= kal.tanggal_mulai && today <= kal.tanggal_selesai
                  const isLewat = today > kal.tanggal_selesai
                  return (
                    <div key={kal.id} className={`bg-white rounded-xl shadow p-4 border-2 ${isAktif ? 'border-teal-400 bg-teal-50' : isLewat ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl mt-0.5">{kal.tipe === 'libur' ? '🏖' : kal.tipe === 'mid_semester' ? '📋' : '📝'}</div>
                          <div>
                            <div className="font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                              {kal.nama}
                              {isAktif && <span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full">Aktif</span>}
                              {isLewat && <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full">Selesai</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipeKalenderColor(kal.tipe)}`}>{tipeKalenderLabel(kal.tipe)}</span>
                              {kal.semester && <span className="text-xs text-gray-400">Semester {kal.semester}</span>}
                              <span className="text-xs text-gray-400">
                                {new Date(kal.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {new Date(kal.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            {kal.keterangan && <p className="text-xs text-gray-400 mt-0.5">{kal.keterangan}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleEditKalender(kal)} className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</button>
                          <button onClick={() => handleHapusKalender(kal.id)} className="text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-5 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">📌 Aturan Libur Otomatis:</p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-400"></div><span className="text-xs text-gray-600">Jumat = libur mingguan</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-400"></div><span className="text-xs text-gray-600">Ahad = libur mingguan</span></div>
                </div>
              </div>
            </div>
          )}

          {/* DATA GURU */}
          {activeMenu === 'guru' && (
            <div>
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Data Guru</h2>
                  <p className="text-gray-400 text-xs">{guruList.length} guru terdaftar</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); setFormType('guru') }}
                  className={btnPrimary} style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>+ Tambah Guru</button>
              </div>

              {/* Search Guru */}
              <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
                <input type="text" value={searchGuru} onChange={e => setSearchGuru(e.target.value)}
                  placeholder="🔍 Cari nama atau no. WA guru..." className={inputClass} />
                <p className="text-xs text-gray-400 mt-2">Menampilkan {guruFiltered.length} dari {guruList.length} guru</p>
              </div>

              {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {successMsg}</div>}
              {showForm && formType === 'guru' && (
                <div className="bg-white p-5 rounded-2xl shadow-md mb-5 border border-gray-100">
                  <h3 className="font-bold text-base mb-4">{editGuruId ? 'Edit Data Guru' : 'Tambah Guru Baru'}</h3>
                  <div className="space-y-3">
                    <input placeholder="Nama Guru" value={formNama} onChange={e => setFormNama(e.target.value)} className={inputClass} />
                    <input placeholder="No WhatsApp" value={formNoWa} onChange={e => setFormNoWa(e.target.value)} className={inputClass} />
                    <FormEmailPassword isEdit={!!editGuruId} />
                  </div>
                  {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={editGuruId ? handleUpdateGuru : handleTambahGuru} disabled={loading}
                      className={btnPrimary} style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                      {loading ? 'Menyimpan...' : editGuruId ? 'Update' : 'Simpan'}
                    </button>
                    <button onClick={() => { setShowForm(false); resetForm() }} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {guruFiltered.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Tidak ada data guru</div>}
                {guruFiltered.map((guru) => {
                  const jumlahSantri = santriList.filter(s => s.guru_id === guru.id).length
                  return (
                    <div key={guru.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                            {guru.nama?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">{guru.nama}</div>
                            <div className="text-xs text-gray-400">{guru.no_wa || 'No WA belum diisi'}</div>
                            <div className="text-xs text-blue-500 mt-0.5">{jumlahSantri} santri</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditGuru(guru)} className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</button>
                          <button onClick={() => handleHapusGuru(guru.id)} className="text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* DATA SANTRI */}
          {activeMenu === 'santri' && (
            <div>
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Data Santri</h2>
                  <p className="text-gray-400 text-xs">{santriList.length} santri terdaftar</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); setFormType('santri') }}
                  className={btnPrimary} style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>+ Tambah Santri</button>
              </div>

              {/* Filter Santri */}
              <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
                    <select value={filterJenjang} onChange={e => { setFilterJenjang(e.target.value); setFilterKelas('semua') }} className={inputClass}>
                      <option value="semua">Semua</option>
                      <option value="ula">Ula</option>
                      <option value="wustha">Wustha</option>
                      <option value="ulya">Ulya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Kelas</label>
                    <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className={inputClass}>
                      <option value="semua">Semua</option>
                      {getKelasOptions(filterJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Guru</label>
                    <select value={filterGuruId} onChange={e => setFilterGuruId(e.target.value)} className={inputClass}>
                      <option value="semua">Semua Guru</option>
                      {guruList.map(g => (<option key={g.id} value={g.id}>{g.nama}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cari Nama</label>
                    <input type="text" value={searchSantri} onChange={e => setSearchSantri(e.target.value)}
                      placeholder="Cari santri..." className={inputClass} />
                  </div>
                </div>
                <p className="text-xs text-gray-400">Menampilkan <span className="font-semibold text-gray-600">{santriFiltered.length}</span> dari {santriList.length} santri</p>
              </div>

              {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {successMsg}</div>}

              {showForm && formType === 'santri' && (
                <div className="bg-white p-5 rounded-2xl shadow-md mb-5 border border-gray-100">
                  <h3 className="font-bold text-base mb-4">{editSantriId ? 'Edit Data Santri' : 'Tambah Santri Baru'}</h3>
                  <div className="space-y-3">
                    <input placeholder="Nama Santri *" value={formNama} onChange={e => setFormNama(e.target.value)} className={inputClass} />

                    <div className="grid grid-cols-2 gap-3">
                      <select value={formJenjang} onChange={e => { setFormJenjang(e.target.value); setFormKelasNum('') }} className={inputClass}>
                        <option value="">-- Jenjang *</option>
                        <option value="ula">Ula</option>
                        <option value="wustha">Wustha</option>
                        <option value="ulya">Ulya</option>
                      </select>
                      {formJenjang ? (
                        <select value={formKelasNum} onChange={e => setFormKelasNum(e.target.value)} className={inputClass}>
                          <option value="">-- Kelas *</option>
                          {getKelasOptions(formJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
                        </select>
                      ) : <div className={inputClass + ' text-gray-400 flex items-center'}>Pilih jenjang dulu</div>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <select value={formGuruId} onChange={e => setFormGuruId(e.target.value)} className={inputClass}>
  <option value="">-- Pilih Guru Utama</option>
  {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
</select>
<select value={formGuruId2} onChange={e => setFormGuruId2(e.target.value)} className={inputClass}>
  <option value="">-- Guru Kedua (Opsional)</option>
  {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
</select>
<select value={formWaliId} onChange={e => setFormWaliId(e.target.value)} className={inputClass}>
                        <option value="">-- Pilih Wali</option>
                        {waliList.map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
                      </select>
                    </div>

                    {/* Data Identitas */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-3">📋 Data Identitas (Opsional)</p>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="NIK" value={formNik} onChange={e => setFormNik(e.target.value)} className={inputClass} />
                          <input placeholder="No. Induk / NISN" value={formNisn} onChange={e => setFormNisn(e.target.value)} className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="Tempat Lahir" value={formTempatLahir} onChange={e => setFormTempatLahir(e.target.value)} className={inputClass} />
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Tanggal Lahir</label>
                            <input type="date" value={formTanggalLahir} onChange={e => setFormTanggalLahir(e.target.value)} className={inputClass} />
                          </div>
                        </div>
                        <textarea placeholder="Alamat lengkap" value={formAlamat} onChange={e => setFormAlamat(e.target.value)} rows={2} className={inputClass} />
                      </div>
                    </div>

                    {/* Status Santri */}
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                      <p className="text-sm font-semibold text-gray-700 mb-3">📌 Status Santri</p>
                      <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className={inputClass}>
                        <option value="aktif">Aktif</option>
                        <option value="alumni">Alumni (Lulus)</option>
                        <option value="keluar">Keluar</option>
                      </select>
                      {(formStatus === 'alumni' || formStatus === 'keluar') && (
                        <div className="mt-2 space-y-2">
                          <input placeholder="Tahun lulus / keluar (misal: 2024/2025)"
                            value={formTahunLulus} onChange={e => setFormTahunLulus(e.target.value)} className={inputClass} />
                          <input placeholder="Keterangan (opsional)"
                            value={formKeteranganKeluar} onChange={e => setFormKeteranganKeluar(e.target.value)} className={inputClass} />
                        </div>
                      )}
                    </div>

                    {/* Data Hafalan */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        {editSantriId ? 'Update Data Hafalan' : 'Hafalan Awal Santri'}
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        {editSantriId ? 'Kosongkan jika tidak ingin mengubah.' : 'Dari surah mana sampai surah mana yang sudah dihafal'}
                      </p>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select value={formSurahAwal} onChange={e => setFormSurahAwal(e.target.value)} className={inputClass}>
                            <option value="">Surah Awal</option>
                            {surahList.map(s => <option key={s.nomor} value={s.nomor}>{s.nomor}. {s.nama_latin}</option>)}
                          </select>
                          <input type="number" placeholder="Ayat mulai" value={formAyatAwal} onChange={e => setFormAyatAwal(e.target.value)} className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select value={formSurahAkhir} onChange={e => {
                            setFormSurahAkhir(e.target.value)
                            const s = surahList.find(s => s.nomor === parseInt(e.target.value))
                            if (s) setFormAyatAkhir(String(s.jumlah_ayat))
                          }} className={inputClass}>
                            <option value="">Surah Akhir</option>
                            {surahList.map(s => <option key={s.nomor} value={s.nomor}>{s.nomor}. {s.nama_latin}</option>)}
                          </select>
                          <input type="number" placeholder="Ayat selesai" value={formAyatAkhir} onChange={e => setFormAyatAkhir(e.target.value)} className={inputClass} />
                        </div>
                      </div>
                      {formSurahAwal && formSurahAkhir && (
                        <div className="mt-2 p-2 bg-white rounded-lg text-xs text-blue-700 font-semibold">
                          Total hafalan: ≈ {hitungTotalJuzAwal().toFixed(2)} Juz
                        </div>
                      )}
                      {editSantriId && !formSurahAwal && !formSurahAkhir && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-500">Hafalan tidak akan diubah</div>
                      )}
                    </div>
                  </div>
                  {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={editSantriId ? handleUpdateSantri : handleTambahSantri} disabled={loading}
                      className={btnPrimary} style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                      {loading ? 'Menyimpan...' : editSantriId ? 'Update' : 'Simpan'}
                    </button>
                    <button onClick={() => { setShowForm(false); resetForm() }} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {santriFiltered.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Tidak ada santri ditemukan</div>}
                {santriFiltered.map((santri) => (
                  <div key={santri.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                          {santri.nama?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold">{santri.nama}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {santri.jenjang && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                                Kelas {santri.kelas_num} {jenjangLabel(santri.jenjang)}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">{santri.total_hafalan_juz?.toFixed(2) || 0} Juz</span>
                            <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}{santri.guru_id_2 && ` & ${guruList.find(g => g.id === santri.guru_id_2)?.nama || ''}`}</span>
                            {santri.nisn && <span className="text-xs text-gray-400">NIS: {santri.nisn}</span>}
                          </div>
                          {(santri.tempat_lahir || santri.tanggal_lahir) && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {santri.tempat_lahir}{santri.tanggal_lahir && `, ${new Date(santri.tanggal_lahir).toLocaleDateString('id-ID')}`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditSantri(santri)} className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</button>
                        <button onClick={() => handleHapusSantri(santri.id)} className="text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DATA WALI */}
          {activeMenu === 'wali' && (
            <div>
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Data Wali</h2>
                  <p className="text-gray-400 text-xs">{waliList.length} wali terdaftar</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); setFormType('wali') }}
                  className={btnPrimary} style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>+ Tambah Wali</button>
              </div>

              {/* Search Wali */}
              <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
                <input type="text" value={searchWali} onChange={e => setSearchWali(e.target.value)}
                  placeholder="🔍 Cari nama atau no. WA wali..." className={inputClass} />
                <p className="text-xs text-gray-400 mt-2">Menampilkan {waliFiltered.length} dari {waliList.length} wali</p>
              </div>

              {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {successMsg}</div>}
              {showForm && formType === 'wali' && (
                <div className="bg-white p-5 rounded-2xl shadow-md mb-5 border border-gray-100">
                  <h3 className="font-bold text-base mb-4">{editWaliId ? 'Edit Data Wali' : 'Tambah Wali Baru'}</h3>
                  <div className="space-y-3">
                    <input placeholder="Nama Wali" value={formNama} onChange={e => setFormNama(e.target.value)} className={inputClass} />
                    <input placeholder="No WhatsApp" value={formNoWa} onChange={e => setFormNoWa(e.target.value)} className={inputClass} />
                    <FormEmailPassword isEdit={!!editWaliId} />
                  </div>
                  {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={editWaliId ? handleUpdateWali : handleTambahWali} disabled={loading}
                      className={btnPrimary} style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
                      {loading ? 'Menyimpan...' : editWaliId ? 'Update' : 'Simpan'}
                    </button>
                    <button onClick={() => { setShowForm(false); resetForm() }} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {waliFiltered.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Tidak ada wali ditemukan</div>}
                {waliFiltered.map((wali) => {
                  const santriWali = santriList.filter(s => s.wali_id === wali.id)
                  return (
                    <div key={wali.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
                            {wali.nama?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">{wali.nama}</div>
                            <div className="text-xs text-gray-400">{wali.no_wa || 'No WA belum diisi'}</div>
                            {santriWali.length > 0 && (
                              <div className="text-xs text-purple-500 mt-0.5">
                                Wali dari: {santriWali.map(s => s.nama).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditWali(wali)} className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</button>
                          <button onClick={() => handleHapusWali(wali.id)} className="text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* RANKING */}
          {activeMenu === 'ranking' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Peringkat Santri</h2>
                  <p className="text-blue-200 text-sm mt-1">3 jenis peringkat tersedia</p>
                </div>
              </div>

              {/* Filter */}
              <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Filter Jenjang</label>
                    <select value={filterJenjang} onChange={e => { setFilterJenjang(e.target.value); setFilterKelas('semua') }} className={inputClass}>
                      <option value="semua">Semua Jenjang</option>
                      <option value="ula">Ula</option>
                      <option value="wustha">Wustha</option>
                      <option value="ulya">Ulya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Filter Kelas</label>
                    <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className={inputClass}>
                      <option value="semua">Semua Kelas</option>
                      {getKelasOptions(filterJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {filterJenjang !== 'semua' ? `Jenjang ${jenjangLabel(filterJenjang)}` : 'Semua Jenjang'}
                  {filterKelas !== 'semua' ? ` • Kelas ${filterKelas}` : ''} • {filterRankingList(rankingHafalan).length} santri
                </p>
              </div>

              {/* Tab Ranking */}
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {[
                  { id: 'total', label: 'Total Hafalan', sub: 'Keseluruhan' },
                  { id: 'konsistensi', label: 'Konsistensi Setor', sub: '7 hari terakhir' },
                  { id: 'semangat', label: 'Semangat Hafalan', sub: '7 hari terakhir' },
                ].map((tab: { id: string; label: string; sub: string }) => (
                  <button key={tab.id} onClick={() => setActiveRanking(tab.id)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition border-2 ${activeRanking === tab.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                    <div>{tab.label}</div>
                    <div className="text-xs font-normal opacity-70">{tab.sub}</div>
                  </button>
                ))}
              </div>

              {/* Ranking Total Hafalan */}
              {activeRanking === 'total' && (
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                    <h3 className="text-white font-bold">Peringkat Total Hafalan</h3>
                    <p className="text-green-200 text-xs mt-0.5">Diurutkan dari jumlah juz terbanyak</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {filterRankingList(rankingHafalan).map((santri, i) => (
                      <div key={santri.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-gray-50' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-800">{santri.nama}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {santri.jenjang && <span className="text-xs text-gray-400">Kelas {santri.kelas_num} {jenjangLabel(santri.jenjang)}</span>}
                            <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(((santri.total_hafalan_juz || 0) / 30) * 100, 100)}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-sm text-green-700">{santri.total_hafalan_juz?.toFixed(2) || 0}</div>
                          <div className="text-xs text-gray-400">Juz</div>
                        </div>
                      </div>
                    ))}
                    {filterRankingList(rankingHafalan).length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>}
                  </div>
                </div>
              )}

              {/* Ranking Konsistensi */}
              {activeRanking === 'konsistensi' && (
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                    <h3 className="text-white font-bold">Peringkat Konsistensi Setoran</h3>
                    <p className="text-blue-200 text-xs mt-0.5">% hari setor dalam 7 hari terakhir</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {filterRankingList(rankingKonsistensi).map((santri, i) => (
                      <div key={santri.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-gray-50' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-800">{santri.nama}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {santri.jenjang && <span className="text-xs text-gray-400">Kelas {santri.kelas_num} {jenjangLabel(santri.jenjang)}</span>}
                            <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${santri.persentaseKonsistensi}%`, background: santri.persentaseKonsistensi >= 80 ? 'linear-gradient(135deg, #166534, #16a34a)' : santri.persentaseKonsistensi >= 50 ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #dc2626, #ef4444)' }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`font-bold text-sm ${santri.persentaseKonsistensi >= 80 ? 'text-green-600' : santri.persentaseKonsistensi >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{santri.persentaseKonsistensi}%</div>
                          <div className="text-xs text-gray-400">{santri.hariSetor}/{santri.totalHariAktif} hari aktif</div>
                        </div>
                      </div>
                    ))}
                    {filterRankingList(rankingKonsistensi).length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>}
                  </div>
                </div>
              )}

              {/* Ranking Semangat */}
              {activeRanking === 'semangat' && (
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)' }}>
                    <h3 className="text-white font-bold">Peringkat Semangat Hafalan Baru</h3>
                    <p className="text-purple-200 text-xs mt-0.5">Total hafalan baru 7 hari terakhir</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {filterRankingList(rankingSemangat).map((santri, i) => {
                      const maxHalaman = filterRankingList(rankingSemangat)[0]?.tambahHalaman7Hari || 1
                      return (
                        <div key={santri.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-gray-50' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-gray-800">{santri.nama}</div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {santri.jenjang && <span className="text-xs text-gray-400">Kelas {santri.kelas_num} {jenjangLabel(santri.jenjang)}</span>}
                              <span className="text-xs text-gray-400">Guru: {santri.guru?.nama || '-'}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                              <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${Math.min((santri.tambahHalaman7Hari / maxHalaman) * 100, 100)}%` }} />
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-sm text-purple-600">{santri.tambahHalaman7Hari.toFixed(1)}</div>
                            <div className="text-xs text-gray-400">hal ({(santri.tambahHalaman7Hari / 2).toFixed(1)} lembar)</div>
                          </div>
                        </div>
                      )
                    })}
                    {filterRankingList(rankingSemangat).length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* DATA ALUMNI */}
          {activeMenu === 'alumni' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #92400e 0%, #d97706 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Data Alumni</h2>
                  <p className="text-yellow-100 text-sm mt-1">Santri yang telah lulus atau keluar</p>
                </div>
              </div>
              <AlumniList />
            </div>
          )}

          {/* NAIK KELAS */}
          {activeMenu === 'naik-kelas' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Proses Naik Kelas</h2>
                  <p className="text-blue-200 text-sm mt-1">Pilih kelas yang akan dinaikkan</p>
                  <p className="text-blue-300 text-xs mt-0.5">⚠️ Guru lama akan diputus, sambungkan guru baru setelah proses</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4">Pilih Kelas</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
                    <select value={naikKelasJenjang} onChange={e => { setNaikKelasJenjang(e.target.value); setNaikKelasNum(''); setNaikKelasPreview([]) }} className={inputClass}>
                      <option value="ula">Ula</option>
                      <option value="wustha">Wustha</option>
                      <option value="ulya">Ulya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Kelas</label>
                    <select value={naikKelasNum} onChange={e => { setNaikKelasNum(e.target.value); setNaikKelasPreview([]) }} className={inputClass}>
                      <option value="">-- Pilih Kelas</option>
                      {getKelasOptions(naikKelasJenjang).map(k => (
                        <option key={k} value={k}>Kelas {k}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {naikKelasNum && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 mb-4 text-xs text-blue-700">
                    {naikKelasJenjang === 'ulya' && parseInt(naikKelasNum) === 12
                      ? '🎓 Santri Kelas 12 Ulya yang dicentang akan menjadi Alumni (Lulus)'
                      : `📚 Santri akan naik ke Kelas ${parseInt(naikKelasNum) + 1} ${
                          naikKelasJenjang === 'ula' && parseInt(naikKelasNum) === 6 ? 'Wustha' :
                          naikKelasJenjang === 'wustha' && parseInt(naikKelasNum) === 9 ? 'Ulya' :
                          jenjangLabel(naikKelasJenjang)
                        }`
                    }
                  </div>
                )}

                <button onClick={handlePreviewNaikKelas} disabled={!naikKelasNum}
                  className="w-full text-white py-3 rounded-xl font-semibold text-sm shadow disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                  Lihat Daftar Santri
                </button>
              </div>

              {naikKelasPreview.length > 0 && (
                <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800">Daftar Santri Kelas {naikKelasNum} {jenjangLabel(naikKelasJenjang)}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        const all: Record<string, boolean> = {}
                        naikKelasPreview.forEach(s => { all[s.id] = true })
                        setNaikKelasChecked(all)
                      }} className="text-xs text-blue-600 px-3 py-1 rounded-lg bg-blue-50">Pilih Semua</button>
                      <button onClick={() => setNaikKelasChecked({})}
                        className="text-xs text-gray-500 px-3 py-1 rounded-lg bg-gray-100">Hapus Pilihan</button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">Centang santri yang akan naik kelas. Yang tidak dicentang tetap di kelas yang sama.</p>
                  <div className="space-y-2 mb-4">
                    {naikKelasPreview.map(s => (
                      <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${naikKelasChecked[s.id] ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}
                        onClick={() => setNaikKelasChecked(prev => ({ ...prev, [s.id]: !prev[s.id] }))}>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${naikKelasChecked[s.id] ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                          {naikKelasChecked[s.id] && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{s.nama}</div>
                          <div className="text-xs text-gray-400">{s.kelas}</div>
                        </div>
                        {naikKelasChecked[s.id] && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {naikKelasJenjang === 'ulya' && parseInt(naikKelasNum) === 12 ? 'Lulus' : 'Naik'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200 mb-4">
                    <p className="text-xs text-yellow-700">
                      ✓ Naik: <span className="font-bold">{Object.values(naikKelasChecked).filter(Boolean).length} santri</span>
                      &nbsp;•&nbsp;
                      Tetap: <span className="font-bold">{naikKelasPreview.length - Object.values(naikKelasChecked).filter(Boolean).length} santri</span>
                    </p>
                  </div>
                  {naikKelasMsg && (
                    <div className={`p-3 rounded-xl mb-4 text-sm ${naikKelasMsg.startsWith('✓') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                      {naikKelasMsg}
                    </div>
                  )}
                  <button onClick={handleProsesNaikKelas} disabled={naikKelasLoading}
                    className="w-full text-white py-3 rounded-xl font-bold text-sm shadow disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                    {naikKelasLoading ? 'Memproses...' : `✓ Proses Naik Kelas (${Object.values(naikKelasChecked).filter(Boolean).length} santri)`}
                  </button>
                </div>
              )}

              {naikKelasMsg && naikKelasPreview.length === 0 && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl text-sm">{naikKelasMsg}</div>
              )}
            </div>
          )}
          {/* RAPOT DIGITAL */}
          {activeMenu === 'rapot' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Rapot Digital</h2>
                  <p className="text-blue-100 text-sm mt-1">Kelola periode, input nilai & download rapot</p>
                </div>
              </div>

              {/* Tab */}
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {[
                  { id: 'periode', label: 'Periode' },
                  { id: 'input', label: 'Input Nilai' },
                  { id: 'rekap', label: 'Rekap Kelas' },
                  { id: 'download', label: 'Download' },
                ].map(tab => (
                  <button key={tab.id}
                    onClick={() => {
                      setRapotActiveTab(tab.id)
                      fetchPeriode()
                      if ((tab.id === 'download' || tab.id === 'rekap') && rapotInputSantriList.length === 0) fetchSantriUntukRapot('')
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition border-2 ${rapotActiveTab === tab.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB: PERIODE */}
              {rapotActiveTab === 'periode' && (
                <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800">Daftar Periode Rapot</h3>
                    <button onClick={() => { resetFormPeriode(); setShowFormPeriode(true) }}
                      className={btnPrimary} style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                      + Tambah
                    </button>
                  </div>

                  {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {successMsg}</div>}

                  {showFormPeriode && (
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 mb-4">
                      <h4 className="font-bold text-gray-800 mb-3">{editPeriodeId ? 'Edit Periode' : 'Tambah Periode Baru'}</h4>
                      <div className="space-y-3">
                        <input placeholder="Nama Periode (misal: Semester Genap 2025/2026)"
                          value={formPeriodeNama} onChange={e => setFormPeriodeNama(e.target.value)} className={inputClass} />
                        <input placeholder="Tahun Ajaran (misal: 1446-1447 H / 2025-2026 M)"
                          value={formPeriodeTahunAjaran} onChange={e => setFormPeriodeTahunAjaran(e.target.value)} className={inputClass} />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Semester</label>
                            <select value={formPeriodeSemester} onChange={e => setFormPeriodeSemester(e.target.value)} className={inputClass}>
                              <option value="ganjil">Ganjil</option>
                              <option value="genap">Genap</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Tanggal Rapot</label>
                            <input type="date" value={formPeriodeTanggal} onChange={e => setFormPeriodeTanggal(e.target.value)} className={inputClass} />
                          </div>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-xl border border-blue-200">
                          <div onClick={() => setFormPeriodeAktif(!formPeriodeAktif)}
                            className={`w-10 h-5 rounded-full transition-all flex-shrink-0 ${formPeriodeAktif ? 'bg-blue-600' : 'bg-gray-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-all ${formPeriodeAktif ? 'ml-5' : 'ml-0.5'}`} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-700">Jadikan Periode Aktif</div>
                            <div className="text-xs text-gray-400">Guru akan input nilai untuk periode ini</div>
                          </div>
                        </label>
                      </div>
                      {errorMsg && <p className="text-red-500 mt-2 text-sm">{errorMsg}</p>}
                      <div className="flex gap-2 mt-4">
                        <button onClick={editPeriodeId ? handleUpdatePeriode : handleTambahPeriode} disabled={loading}
                          className={btnPrimary} style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                          {loading ? 'Menyimpan...' : editPeriodeId ? 'Update' : 'Simpan'}
                        </button>
                        <button onClick={() => { setShowFormPeriode(false); resetFormPeriode() }}
                          className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {periodeList.length === 0 && (
                      <div className="text-center text-gray-400 py-8 text-sm">Belum ada periode — klik Tambah</div>
                    )}
                    {periodeList.map(p => (
                      <div key={p.id} className={`p-4 rounded-xl border-2 ${p.is_aktif ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-white'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                              {p.nama}
                              {p.is_aktif && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Aktif</span>}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {p.tahun_ajaran} • Semester {p.semester.charAt(0).toUpperCase() + p.semester.slice(1)}
                              {p.tanggal_rapot && ` • ${new Date(p.tanggal_rapot).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleEditPeriode(p)} className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</button>
                            <button onClick={() => handleHapusPeriode(p.id)} className="text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: INPUT NILAI */}
              {rapotActiveTab === 'input' && (
                <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-1">Input Nilai Rapot</h3>
                  <p className="text-xs text-gray-400 mb-4">Admin bisa input nilai semua santri termasuk alumni & data lama</p>

                  {/* Pilih Periode */}
                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 mb-1">Pilih Periode</label>
                    <select value={rapotInputPeriodeId}
                      onChange={e => {
                        setRapotInputPeriodeId(e.target.value)
                        setRapotInputSantri(null)
                        setRapotInputSearch('')
                        setRapotNilai({})
                        setRapotExistingId(null)
                        setRapotKelasSnapshot('')
                        setRapotJenjangSnapshot('ula')
                        setRapotInputMsg('')
                        if (e.target.value) fetchSantriUntukRapot(e.target.value)
                      }}
                      className={inputClass}>
                      <option value="">-- Pilih Periode --</option>
                      {periodeList.map(p => (
                        <option key={p.id} value={p.id}>{p.nama}{p.is_aktif ? ' (Aktif)' : ''}</option>
                      ))}
                    </select>
                  </div>

                  {rapotInputPeriodeId && (
                    <>
                      {/* Pilih Santri */}
                      <div className="mb-4">
                        <label className="block text-xs text-gray-500 mb-1">Pilih Santri</label>
                        <input type="text" value={rapotInputSearch}
                          onChange={e => setRapotInputSearch(e.target.value)}
                          placeholder="Cari nama santri (aktif & alumni)..." className={inputClass + ' mb-2'} />
                        {rapotInputSearch && !rapotInputSantri && (
                          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                            {rapotInputSantriList
                              .filter(s => s.nama.toLowerCase().includes(rapotInputSearch.toLowerCase()))
                              .map(s => (
                                <button key={s.id} onClick={() => {
                                  setRapotInputSantri(s)
                                  setRapotInputSearch(s.nama)
                                  setRapotKelasSnapshot(s.kelas_num?.toString() || '')
                                  setRapotJenjangSnapshot(s.jenjang || 'ula')
                                  fetchNilaiRapotAdmin(s.id, rapotInputPeriodeId, s.kelas_num?.toString())
                                }} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b last:border-0 text-sm">
                                  <span className="font-medium">{s.nama}</span>
                                  <span className="text-gray-400 text-xs ml-2">{s.kelas || '-'}</span>
                                  <span className={`text-xs ml-2 px-1.5 py-0.5 rounded-full ${s.status === 'aktif' ? 'bg-green-100 text-green-700' : s.status === 'alumni' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {s.status}
                                  </span>
                                </button>
                              ))}
                            {rapotInputSantriList.filter(s => s.nama.toLowerCase().includes(rapotInputSearch.toLowerCase())).length === 0 &&
                              <div className="px-4 py-3 text-sm text-gray-400">Tidak ditemukan</div>}
                          </div>
                        )}

                        {rapotInputSantri && (
                          <div className="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-200 flex justify-between items-center">
                            <div>
                              <div className="font-bold text-gray-800">{rapotInputSantri.nama}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {rapotInputSantri.kelas || '-'} • {rapotInputSantri.total_hafalan_juz?.toFixed(2)} Juz
                                <span className={`ml-2 px-1.5 py-0.5 rounded-full ${rapotInputSantri.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {rapotInputSantri.status}
                                </span>
                              </div>
                              {rapotExistingId && <div className="text-xs text-green-600 mt-0.5">✓ Data sudah ada — akan diupdate</div>}
                            </div>
                            <button onClick={() => {
                              setRapotInputSantri(null); setRapotInputSearch('')
                              setRapotNilai({}); setRapotExistingId(null)
                              setRapotKelasSnapshot(''); setRapotJenjangSnapshot('ula')
                              setRapotInputMsg('')
                            }} className="text-gray-400 text-xl ml-3">×</button>
                          </div>
                        )}
                      </div>

                      {/* Pilih Kelas Snapshot */}
                      {rapotInputSantri && (
                        <div className="mb-4 p-4 bg-yellow-50 rounded-xl border border-yellow-300">
                          <p className="text-sm font-bold text-gray-700 mb-1">📌 Kelas Saat Periode Ini</p>
                          <p className="text-xs text-gray-500 mb-3">
                            Pilih kelas santri <strong>pada saat periode rapot berlangsung</strong>. 
                            Untuk alumni, pilih kelas lama mereka (misal: kelas 1, 2, dst).
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Jenjang saat itu</label>
                              <select value={rapotJenjangSnapshot}
                                onChange={e => { setRapotJenjangSnapshot(e.target.value); setRapotKelasSnapshot('') }}
                                className={inputClass}>
                                <option value="ula">Ula (Kelas 1-6)</option>
                                <option value="wustha">Wustha (Kelas 7-9)</option>
                                <option value="ulya">Ulya (Kelas 10-12)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Kelas saat itu</label>
                              <select value={rapotKelasSnapshot}
                                onChange={e => {
                                  setRapotKelasSnapshot(e.target.value)
                                  if (e.target.value) fetchNilaiRapotAdmin(rapotInputSantri.id, rapotInputPeriodeId, e.target.value)
                                }}
                                className={inputClass}>
                                <option value="">-- Pilih Kelas --</option>
                                {getKelasOptions(rapotJenjangSnapshot).map(k => (
                                  <option key={k} value={k}>Kelas {k}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {rapotKelasSnapshot && (
                            <div className="mt-2 p-2 bg-white rounded-lg border border-yellow-200 text-xs text-yellow-800">
                              Rapot ini untuk: <strong>Kelas {rapotKelasSnapshot} {jenjangLabel(rapotJenjangSnapshot)}</strong>
                              {rapotExistingId
                                ? <span className="ml-2 text-green-600">✓ Data sudah ada</span>
                                : <span className="ml-2 text-gray-400">— belum ada data</span>
                              }
                            </div>
                          )}
                        </div>
                      )}

                      {/* Form Nilai — hanya tampil setelah pilih kelas snapshot */}
                      {rapotInputSantri && rapotKelasSnapshot && (
                        <>
                          {/* A. Hifzhul Quran */}
                          <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-200">
                            <p className="text-sm font-bold text-gray-700 mb-3">A. Hifzhul Qur'an</p>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Kelancaran (60-95)</label>
                                <input type="number" min="60" max="95" value={rapotNilai.kelancaran || ''}
                                  onChange={e => setRapotNilai({...rapotNilai, kelancaran: e.target.value})}
                                  placeholder="misal: 85" className={inputClass} />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Tajwid (60-95)</label>
                                <input type="number" min="60" max="95" value={rapotNilai.tajwid || ''}
                                  onChange={e => setRapotNilai({...rapotNilai, tajwid: e.target.value})}
                                  placeholder="misal: 80" className={inputClass} />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Keterangan Hafalan</label>
                              <input type="text" value={rapotNilai.keterangan_hafalan || ''}
                                onChange={e => setRapotNilai({...rapotNilai, keterangan_hafalan: e.target.value})}
                                placeholder="misal: 3,5 juz dari An-Nas hingga Al-Qomar" className={inputClass} />
                            </div>
                          </div>

                          {/* B. Diiniyyah */}
                          <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <p className="text-sm font-bold text-gray-700 mb-3">B. Materi Diiniyyah</p>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { key: 'aqidah', label: 'Aqidah' },
                                { key: 'akhlak', label: 'Akhlak/Adab' },
                                { key: 'fiqh', label: 'Fiqh' },
                                { key: 'bhs_arab', label: 'Bahasa Arab' },
                                { key: 'siroh', label: 'Siroh' },
                                { key: 'khoth', label: 'Khoth' },
                              ].map(m => (
                                <div key={m.key}>
                                  <label className="block text-xs text-gray-500 mb-1">{m.label}</label>
                                  <input type="number" min="60" max="95" value={rapotNilai[m.key] || ''}
                                    onChange={e => setRapotNilai({...rapotNilai, [m.key]: e.target.value})}
                                    placeholder="60-95" className={inputClass} />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* C. Umum */}
                          <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                            <p className="text-sm font-bold text-gray-700 mb-3">C. Materi Umum</p>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { key: 'bhs_indonesia', label: 'Bahasa Indonesia' },
                                { key: 'berhitung', label: 'Berhitung' },
                                { key: 'ipa', label: 'IPA' },
                                { key: 'ips', label: 'IPS' },
                              ].map(m => (
                                <div key={m.key}>
                                  <label className="block text-xs text-gray-500 mb-1">{m.label}</label>
                                  <input type="number" min="60" max="95" value={rapotNilai[m.key] || ''}
                                    onChange={e => setRapotNilai({...rapotNilai, [m.key]: e.target.value})}
                                    placeholder="60-95" className={inputClass} />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Kepribadian */}
                          <div className="mb-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                            <p className="text-sm font-bold text-gray-700 mb-3">Kepribadian</p>
                            <div className="grid grid-cols-3 gap-3">
                              {[
                                { key: 'akhlak_kepribadian', label: 'Akhlak' },
                                { key: 'kebersihan', label: 'Kebersihan' },
                                { key: 'ketertiban', label: 'Ketertiban' },
                              ].map(m => (
                                <div key={m.key}>
                                  <label className="block text-xs text-gray-500 mb-1">{m.label}</label>
                                  <select value={rapotNilai[m.key] || 'B'}
                                    onChange={e => setRapotNilai({...rapotNilai, [m.key]: e.target.value})}
                                    className={inputClass}>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Ketidakhadiran */}
                          <div className="mb-4 p-4 bg-red-50 rounded-xl border border-red-200">
                            <p className="text-sm font-bold text-gray-700 mb-3">Ketidakhadiran</p>
                            <div className="grid grid-cols-3 gap-3">
                              {[
                                { key: 'hadir_sakit', label: 'Sakit' },
                                { key: 'hadir_izin', label: 'Izin' },
                                { key: 'hadir_alpha', label: 'Tanpa Izin' },
                              ].map(m => (
                                <div key={m.key}>
                                  <label className="block text-xs text-gray-500 mb-1">{m.label}</label>
                                  <input type="number" min="0" value={rapotNilai[m.key] ?? 0}
                                    onChange={e => setRapotNilai({...rapotNilai, [m.key]: e.target.value})}
                                    className={inputClass} />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Ekskul */}
                          <div className="mb-4 p-4 bg-teal-50 rounded-xl border border-teal-200">
                            <p className="text-sm font-bold text-gray-700 mb-3">Ekstrakurikuler</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Renang (pertemuan)</label>
                                <input type="number" min="0" value={rapotNilai.ekskul_renang || ''}
                                  onChange={e => setRapotNilai({...rapotNilai, ekskul_renang: e.target.value})}
                                  placeholder="misal: 8" className={inputClass} />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Beladiri</label>
                                <input type="text" value={rapotNilai.ekskul_beladiri || ''}
                                  onChange={e => setRapotNilai({...rapotNilai, ekskul_beladiri: e.target.value})}
                                  placeholder="keterangan" className={inputClass} />
                              </div>
                            </div>
                          </div>

                          {/* Catatan */}
                          <div className="mb-5">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan Guru</label>
                            <textarea value={rapotNilai.catatan || ''}
                              onChange={e => setRapotNilai({...rapotNilai, catatan: e.target.value})}
                              placeholder="misal: Alhamdulillah terus semangat..." rows={2} className={inputClass} />
                          </div>

                          {rapotInputMsg && (
                            <div className={`p-3 rounded-xl mb-4 text-sm ${rapotInputMsg.startsWith('✓') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                              {rapotInputMsg}
                            </div>
                          )}

                          <button onClick={handleSimpanRapotAdmin} disabled={rapotInputLoading}
                            className="w-full text-white py-4 rounded-xl font-bold text-base shadow disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                            {rapotInputLoading ? 'Menyimpan...' : rapotExistingId ? '✓ Update Nilai Rapot' : '✓ Simpan Nilai Rapot'}
                          </button>
                        </>
                      )}

                      {rapotInputSantri && !rapotKelasSnapshot && (
                        <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl text-center text-sm text-yellow-700">
                          ⬆ Pilih kelas santri saat periode ini untuk mulai input nilai
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

{/* TAB: REKAP KELAS */}
              {rapotActiveTab === 'rekap' && (
                <div>
                  <div className="bg-white rounded-2xl shadow p-5 mb-4 border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Rekap Nilai Kelas</h3>
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Periode</label>
                        <select value={rapotRekapPeriodeId}
                          onChange={e => { setRapotRekapPeriodeId(e.target.value); setRapotRekapData([]) }}
                          className={inputClass}>
                          <option value="">-- Pilih Periode --</option>
                          {periodeList.map(p => <option key={p.id} value={p.id}>{p.nama}{p.is_aktif ? ' (Aktif)' : ''}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
                          <select value={rapotRekapJenjang}
                            onChange={e => { setRapotRekapJenjang(e.target.value); setRapotRekapKelas(''); setRapotRekapData([]) }}
                            className={inputClass}>
                            <option value="ula">Ula</option>
                            <option value="wustha">Wustha</option>
                            <option value="ulya">Ulya</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Kelas</label>
                          <select value={rapotRekapKelas}
                            onChange={e => { setRapotRekapKelas(e.target.value); setRapotRekapData([]) }}
                            className={inputClass}>
                            <option value="">-- Pilih Kelas --</option>
                            {getKelasOptions(rapotRekapJenjang).map(k => (
                              <option key={k} value={k}>Kelas {k}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <button onClick={fetchRekapKelas}
                      disabled={!rapotRekapPeriodeId || !rapotRekapKelas || rapotRekapLoading}
                      className="w-full text-white py-3 rounded-xl font-bold text-sm shadow disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                      {rapotRekapLoading ? 'Memuat...' : '🔍 Tampilkan Rekap Nilai'}
                    </button>
                  </div>

                  {rapotRekapData.length > 0 && (
                    <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                      <div className="px-5 py-4 flex justify-between items-center"
                        style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                        <div>
                          <h3 className="text-white font-bold">Rekap Kelas {rapotRekapKelas} {jenjangLabel(rapotRekapJenjang)}</h3>
                          <p className="text-blue-200 text-xs mt-0.5">{rapotRekapData.length} santri • {periodeList.find(p => p.id === rapotRekapPeriodeId)?.nama}</p>
                        </div>
                      </div>

                      {/* Tabel scroll horizontal */}
                      <div className="overflow-x-auto">
                        <table style={{ minWidth: '900px', width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                          <thead>
                            <tr style={{ background: '#f0f4ff' }}>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', width: '35px' }}>No</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', minWidth: '130px' }}>Nama Santri</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Klancaran</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Tajwid</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Aqidah</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Akhlak</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Fiqh</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Bhs Arab</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Siroh</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Khoth</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe' }}>Rata D</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Bhs Ind</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Hitung</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>IPA</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>IPS</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe' }}>Rata U</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: '#fef3c7', fontWeight: 'bold' }}>Rata Akhir</th>
                              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: '#fef3c7', fontWeight: 'bold' }}>Peringkat</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rapotRekapData.map((n: any, i: number) => {
                              const isComplete = n.rata_akhir > 0
                              return (
                                <tr key={n.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{i + 1}</td>
                                  <td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>
                                    <div style={{ fontWeight: '600' }}>{n.santri?.nama || '-'}</div>
                                    {n.santri?.status !== 'aktif' && (
                                      <div style={{ fontSize: '10px', color: '#d97706' }}>{n.santri?.status}</div>
                                    )}
                                  </td>
                                  {[n.kelancaran, n.tajwid].map((v: any, idx: number) => (
                                    <td key={idx} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', color: v ? '#1e3a8a' : '#ccc' }}>
                                      {v ?? '-'}
                                    </td>
                                  ))}
                                  {[n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].map((v: any, idx: number) => (
                                    <td key={idx} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', color: v ? (v < 60 ? '#dc2626' : '#166534') : '#ccc' }}>
                                      {v ?? '-'}
                                    </td>
                                  ))}
                                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe', fontWeight: 'bold', color: '#1e3a8a' }}>
                                    {n.rata_diiniyyah ? n.rata_diiniyyah.toFixed(1) : '-'}
                                  </td>
                                  {[n.bhs_indonesia, n.berhitung, n.ipa, n.ips].map((v: any, idx: number) => (
                                    <td key={idx} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', color: v ? (v < 60 ? '#dc2626' : '#166534') : '#ccc' }}>
                                      {v ?? '-'}
                                    </td>
                                  ))}
                                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe', fontWeight: 'bold', color: '#1e3a8a' }}>
                                    {n.rata_umum ? n.rata_umum.toFixed(1) : '-'}
                                  </td>
                                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#fef9c3', fontWeight: 'bold', fontSize: '12px', color: isComplete ? '#92400e' : '#ccc' }}>
                                    {n.rata_akhir ? n.rata_akhir.toFixed(1) : '-'}
                                  </td>
                                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#fef9c3' }}>
                                    {isComplete ? (
                                      <span style={{
                                        background: n.peringkat === 1 ? '#fbbf24' : n.peringkat === 2 ? '#9ca3af' : n.peringkat === 3 ? '#f97316' : '#e5e7eb',
                                        color: n.peringkat <= 3 ? 'white' : '#374151',
                                        padding: '2px 8px', borderRadius: '999px', fontWeight: 'bold', fontSize: '11px'
                                      }}>
                                        {n.peringkat}
                                      </span>
                                    ) : '-'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: '#f0f4ff', fontWeight: 'bold' }}>
                              <td colSpan={2} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>Rata-rata Kelas</td>
                              {['kelancaran','tajwid','aqidah','akhlak','fiqh','bhs_arab','siroh','khoth'].map((field: string) => {
                                const vals = rapotRekapData.map((n: any) => n[field]).filter((v: any) => v != null && v > 0)
                                const avg = vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1) : '-'
                                return <td key={field} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{avg}</td>
                              })}
                              <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe' }}>
                                {(() => {
                                  const vals = rapotRekapData.map((n: any) => n.rata_diiniyyah).filter((v: any) => v != null && v > 0)
                                  return vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1) : '-'
                                })()}
                              </td>
                              {['bhs_indonesia','berhitung','ipa','ips'].map((field: string) => {
                                const vals = rapotRekapData.map((n: any) => n[field]).filter((v: any) => v != null && v > 0)
                                const avg = vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1) : '-'
                                return <td key={field} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{avg}</td>
                              })}
                              <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#e8f0fe' }}>
                                {(() => {
                                  const vals = rapotRekapData.map((n: any) => n.rata_umum).filter((v: any) => v != null && v > 0)
                                  return vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1) : '-'
                                })()}
                              </td>
                              <td style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center', background: '#fef9c3' }}>
                                {(() => {
                                  const vals = rapotRekapData.map((n: any) => n.rata_akhir).filter((v: any) => v != null && v > 0)
                                  return vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1) : '-'
                                })()}
                              </td>
                              <td style={{ border: '1px solid #ddd' }}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div className="p-4">
                        <p className="text-xs text-gray-400">
                          Nilai merah = di bawah 60 • Peringkat dihitung dari Rata-rata Akhir (Diiniyyah + Umum) / 2
                        </p>
                      </div>
                    </div>
                  )}

                  {rapotRekapData.length === 0 && !rapotRekapLoading && rapotRekapPeriodeId && rapotRekapKelas && (
                    <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow border border-gray-100">
                      Belum ada data nilai untuk kelas ini
                    </div>
                  )}
                </div>
              )}

              {/* TAB: DOWNLOAD */}
              {rapotActiveTab === 'download' && (
                <div className="space-y-4">

                  {/* Download Per Kelas */}
                  <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-1">Download Per Kelas</h3>
                    <p className="text-xs text-gray-400 mb-4">Semua rapot santri dalam satu kelas digabung jadi 1 file</p>
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Periode</label>
                        <select value={rapotPeriodeId} onChange={e => setRapotPeriodeId(e.target.value)} className={inputClass}>
                          <option value="">-- Pilih Periode --</option>
                          {periodeList.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
                          <select value={rapotJenjang} onChange={e => { setRapotJenjang(e.target.value); setRapotKelas('') }} className={inputClass}>
                            <option value="ula">Ula</option>
                            <option value="wustha">Wustha</option>
                            <option value="ulya">Ulya</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Kelas</label>
                          <select value={rapotKelas} onChange={e => setRapotKelas(e.target.value)} className={inputClass}>
                            <option value="">-- Pilih Kelas --</option>
                            {getKelasOptions(rapotJenjang).map(k => <option key={k} value={k}>Kelas {k}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!rapotPeriodeId || !rapotKelas) { alert('Pilih periode dan kelas dulu!'); return }
                        window.open(`/api/rapot-pdf?periode_id=${rapotPeriodeId}&jenjang=${rapotJenjang}&kelas=${rapotKelas}`, '_blank')
                      }}
                      disabled={!rapotPeriodeId || !rapotKelas}
                      className="w-full text-white py-3 rounded-xl font-bold text-sm shadow disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                      📄 Download Rapot Satu Kelas
                    </button>
                  </div>

                  {/* Download Per Santri */}
                  <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-1">Download Per Santri</h3>
                    <p className="text-xs text-gray-400 mb-4">Download rapot satu santri saja</p>
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Periode</label>
                        <select value={rapotPeriodeId} onChange={e => setRapotPeriodeId(e.target.value)} className={inputClass}>
                          <option value="">-- Pilih Periode --</option>
                          {periodeList.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Cari Santri</label>
                        <input type="text" value={rapotDownloadSearch}
                          onChange={e => setRapotDownloadSearch(e.target.value)}
                          placeholder="Ketik nama santri..." className={inputClass + ' mb-2'} />
                        {rapotDownloadSearch && !rapotDownloadSantri && (
                          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                            {rapotInputSantriList
                              .filter(s => s.nama.toLowerCase().includes(rapotDownloadSearch.toLowerCase()))
                              .map(s => (
                                <button key={s.id} onClick={() => {
                                  setRapotDownloadSantri(s)
                                  setRapotDownloadSearch(s.nama)
                                  setRapotDownloadKelas(s.kelas_num?.toString() || '')
                                  setRapotDownloadJenjang(s.jenjang || 'ula')
                                }} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b last:border-0 text-sm">
                                  <span className="font-medium">{s.nama}</span>
                                  <span className="text-gray-400 text-xs ml-2">{s.kelas || '-'}</span>
                                  <span className={`text-xs ml-2 px-1.5 py-0.5 rounded-full ${s.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {s.status}
                                  </span>
                                </button>
                              ))}
                          </div>
                        )}
                        {rapotDownloadSantri && (
                          <div className="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-200 flex justify-between items-center">
                            <div>
                              <div className="font-bold text-gray-800">{rapotDownloadSantri.nama}</div>
                              <div className="text-xs text-gray-500">{rapotDownloadSantri.kelas || '-'}</div>
                            </div>
                            <button onClick={() => { setRapotDownloadSantri(null); setRapotDownloadSearch('') }}
                              className="text-gray-400 text-xl">×</button>
                          </div>
                        )}
                      </div>

                      {/* Pilih kelas saat periode — penting untuk alumni */}
                      {rapotDownloadSantri && (
                        <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                          <p className="text-xs font-semibold text-gray-600 mb-2">📌 Kelas saat periode ini (penting untuk alumni)</p>
                          <div className="grid grid-cols-2 gap-2">
                            <select value={rapotDownloadJenjang}
                              onChange={e => { setRapotDownloadJenjang(e.target.value); setRapotDownloadKelas('') }}
                              className={inputClass}>
                              <option value="ula">Ula</option>
                              <option value="wustha">Wustha</option>
                              <option value="ulya">Ulya</option>
                            </select>
                            <select value={rapotDownloadKelas}
                              onChange={e => setRapotDownloadKelas(e.target.value)}
                              className={inputClass}>
                              <option value="">-- Kelas --</option>
                              {getKelasOptions(rapotDownloadJenjang).map(k => (
                                <option key={k} value={k}>Kelas {k}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          if (!rapotPeriodeId || !rapotDownloadSantri) { alert('Pilih periode dan santri dulu!'); return }
                          const params = new URLSearchParams({
                            periode_id: rapotPeriodeId,
                            santri_id: rapotDownloadSantri.id,
                            jenjang: rapotDownloadJenjang,
                            kelas: rapotDownloadKelas || rapotDownloadSantri.kelas_num?.toString() || '',
                          })
                          window.open(`/api/rapot-pdf?${params}`, '_blank')
                        }}
                        disabled={!rapotPeriodeId || !rapotDownloadSantri}
                        className="w-full text-white py-3 rounded-xl font-bold text-sm shadow disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                        📄 Download Rapot Periode Ini
                      </button>

                      <button
                        onClick={() => {
                          if (!rapotDownloadSantri) { alert('Pilih santri dulu!'); return }
                          window.open(`/api/rapot-pdf?santri_id=${rapotDownloadSantri.id}&mode=lengkap`, '_blank')
                        }}
                        disabled={!rapotDownloadSantri}
                        className="w-full text-white py-3 rounded-xl font-bold text-sm shadow disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #92400e, #d97706)' }}>
                        📚 Download Semua Rapot (Lengkap)
                      </button>
                      <p className="text-xs text-gray-400 text-center">Semua rapot dari kelas 1 hingga terakhir dalam 1 file</p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                    <p className="text-xs text-blue-700">💡 <strong>Tips:</strong> Setelah halaman terbuka, tekan <strong>Ctrl+P</strong> lalu pilih <strong>Save as PDF</strong> untuk menyimpan file PDF.</p>
                  </div>
                </div>
              )}
            </div>
          )}
{/* LAPORAN BULANAN */}
          {activeMenu === 'laporan' && (
            <div>
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <h2 className="font-bold text-xl">Laporan Bulanan</h2>
                  <p className="text-teal-100 text-sm mt-1">Rekap setoran hafalan per santri</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4">Filter Laporan</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">📅 Bulan</label>
                    <input type="month" value={laporanBulan}
                      onChange={e => setLaporanBulan(e.target.value)}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
                    <select value={laporanJenjang}
                      onChange={e => { setLaporanJenjang(e.target.value); setLaporanKelas('semua'); setLaporanSantriId('semua') }}
                      className={inputClass}>
                      <option value="semua">Semua Jenjang</option>
                      <option value="ula">Ula</option>
                      <option value="wustha">Wustha</option>
                      <option value="ulya">Ulya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Kelas</label>
                    <select value={laporanKelas}
                      onChange={e => { setLaporanKelas(e.target.value); setLaporanSantriId('semua') }}
                      className={inputClass}>
                      <option value="semua">Semua Kelas</option>
                      {getKelasOptions(laporanJenjang).map(k => (
                        <option key={k} value={k}>Kelas {k}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Santri Tertentu</label>
                    <select value={laporanSantriId} onChange={e => setLaporanSantriId(e.target.value)} className={inputClass}>
                      <option value="semua">Semua Santri</option>
                      {santriList
                        .filter(s => laporanJenjang === 'semua' || s.jenjang === laporanJenjang)
                        .filter(s => laporanKelas === 'semua' || s.kelas_num?.toString() === laporanKelas)
                        .map(s => (<option key={s.id} value={s.id}>{s.nama}</option>))}
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 mb-4">
                  <p className="text-xs text-teal-700">
                    📋 Laporan bulan <span className="font-semibold">
                      {new Date(laporanBulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </span>
                    {laporanJenjang !== 'semua' && ` • Jenjang ${jenjangLabel(laporanJenjang)}`}
                    {laporanKelas !== 'semua' && ` • Kelas ${laporanKelas}`}
                    {laporanSantriId !== 'semua' && ` • ${santriList.find(s => s.id === laporanSantriId)?.nama || ''}`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleDownloadLaporan('excel')} disabled={laporanLoading !== ''}
                    className="flex items-center justify-center gap-2 text-white py-3 px-4 rounded-xl font-semibold text-sm shadow disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                    {laporanLoading === 'excel' ? 'Menyiapkan...' : '📥 Download Excel'}
                  </button>
                  <button onClick={() => handleDownloadLaporan('pdf')} disabled={laporanLoading !== ''}
                    className="flex items-center justify-center gap-2 text-white py-3 px-4 rounded-xl font-semibold text-sm shadow disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>
                    {laporanLoading === 'pdf' ? 'Menyiapkan...' : '📄 Download PDF'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-600 mb-3">📌 Isi Laporan:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  {[
                    'Detail setoran per hari',
                    'Status lancar / rosib',
                    'Hafalan baru & murojaah',
                    'Catatan guru',
                    'Rekap kehadiran lengkap',
                    'Penambahan hafalan bulan ini',
                    'Tanda tangan kepala sekolah & guru',
                    'Kop surat pesantren',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}