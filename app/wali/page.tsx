'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Image from 'next/image'
import { daftarkanNotifikasi, cekStatusNotifikasi } from '../lib/push'

function getTanggalWIB() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function getHariWIB() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })).getDay()
}

function getStatusKehadiranInfo(status: string) {
  if (status === 'sakit') return { label: 'Tidak Hadir — Sakit', color: 'bg-yellow-100 text-yellow-700' }
  if (status === 'izin') return { label: 'Tidak Hadir — Izin', color: 'bg-blue-100 text-blue-700' }
  if (status === 'alpha') return { label: 'Tidak Hadir — Alpha', color: 'bg-red-100 text-red-700' }
  if (status === 'hadir_tidak_setor') return { label: 'Hadir, Tidak Setor', color: 'bg-orange-100 text-orange-700' }
  return { label: status, color: 'bg-gray-100 text-gray-700' }
}

export default function WaliDashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [waliProfile, setWaliProfile] = useState<any>(null)
  const [santriList, setSantriList] = useState<any[]>([])
  const [selectedSantri, setSelectedSantri] = useState<any>(null)
  const [riwayatSetoran, setRiwayatSetoran] = useState<any[]>([])
  const [allSantriKelas, setAllSantriKelas] = useState<any[]>([])
  const [nilaiUjianList, setNilaiUjianList] = useState<any[]>([])
  const [laporanHariIni, setLaporanHariIni] = useState<any[]>([])
  const [tanggalLaporan, setTanggalLaporan] = useState(getTanggalWIB())
  const [rankingKonsistensiKelas, setRankingKonsistensiKelas] = useState<any[]>([])
  const [rankingSemangatKelas, setRankingSemangatKelas] = useState<any[]>([])
  const [activeRanking, setActiveRanking] = useState('hafalan')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifAktif, setNotifAktif] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifPesan, setNotifPesan] = useState('')

  useEffect(() => { fetchWaliData() }, [])

  useEffect(() => {
    cekStatusNotifikasi().then(setNotifAktif)
  }, [])

  const handleAktifkanNotif = async () => {
    if (!waliProfile) return
    setNotifLoading(true)
    setNotifPesan('')
    const hasil = await daftarkanNotifikasi(waliProfile.id, 'wali')
    setNotifPesan(hasil.message)
    if (hasil.ok) setNotifAktif(true)
    setNotifLoading(false)
  }

  const fetchWaliData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profile?.role !== 'wali') { window.location.href = '/'; return }
    setWaliProfile(profile)

    const { data: santri } = await supabase
      .from('santri').select('*, guru:guru_id(nama)').eq('wali_id', user.id)
    setSantriList(santri || [])

    if (santri && santri.length > 0) {
      const s = santri[0]
      setSelectedSantri(s)
      fetchRiwayat(s.id)
      fetchNilaiUjian(s.id)
      fetchLaporanHariIni(s.id)
      if (s.kelas_num && s.jenjang) {
        await fetchDataKelas(s)
      }
    }
    setLoading(false)
  }

  const fetchDataKelas = async (santri: any) => {
    if (!santri.kelas_num || !santri.jenjang) return

    // Ambil semua santri sekelas — pisah banin/banat/TN
    let query = supabase
      .from('santri').select('id, nama, total_hafalan_juz, kelas_num, jenjang, jenis_kelas')
      .eq('kelas_num', santri.kelas_num).eq('jenjang', santri.jenjang).eq('status', 'aktif')

    // TN A dan TN B digabung dalam satu kelompok
    if (santri.jenis_kelas === 'tn_a' || santri.jenis_kelas === 'tn_b') {
      query = query.in('jenis_kelas', ['tn_a', 'tn_b'])
    } else {
      query = query.eq('jenis_kelas', santri.jenis_kelas)
    }

    const { data: seKelas } = await query.order('nama')
    setAllSantriKelas(seKelas || [])

    // Ambil setoran 7 hari terakhir untuk ranking konsistensi & semangat
    const today = getTanggalWIB()
    const tujuhHariLalu = new Date(today)
    tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7)
    const tujuhHariLaluStr = tujuhHariLalu.toISOString().split('T')[0]

    if (!seKelas || seKelas.length === 0) return

    const { data: setoran7Hari } = await supabase
  .from('setoran')
  .select('santri_id, tanggal, jenis, penambahan_juz, status_kehadiran, status')
  .in('santri_id', seKelas.map(s => s.id))
  .gte('tanggal', tujuhHariLaluStr)
  .eq('status_kehadiran', 'hadir')

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

// ===== RANKING KONSISTENSI PER KELAS =====
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

const konsistensiList = seKelas.map((s: any) => {
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
  const aHari = aUlya ? a.hariSetorBaru : a.hariSetor
  const bHari = bUlya ? b.hariSetorBaru : b.hariSetor
  if (bHari !== aHari) return bHari - aHari
  const aNajih = aUlya ? a.najihBaru : a.najihLama
  const bNajih = bUlya ? b.najihBaru : b.najihLama
  if (bNajih !== aNajih) return bNajih - aNajih
  if (b.hariSetorBaru !== a.hariSetorBaru) return b.hariSetorBaru - a.hariSetorBaru
  if (b.najihBaru !== a.najihBaru) return b.najihBaru - a.najihBaru
  return 0
})
setRankingKonsistensiKelas(konsistensiList)

// ===== RANKING SEMANGAT PER KELAS =====
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
const semangatList = seKelas.map((s: any) => {
  const st = semangatStats[s.id] || { totalJuz: 0, hariSetor: new Set(), najih: 0 }
  return {
    ...s,
    tambahJuz7Hari: st.totalJuz,
    tambahHalaman7Hari: st.totalJuz * 20,
    hariSetorBaru7Hari: st.hariSetor.size,
    najihBaru7Hari: st.najih
  }
}).sort((a: any, b: any) => {
  if (b.tambahJuz7Hari !== a.tambahJuz7Hari) return b.tambahJuz7Hari - a.tambahJuz7Hari
  if (b.hariSetorBaru7Hari !== a.hariSetorBaru7Hari) return b.hariSetorBaru7Hari - a.hariSetorBaru7Hari
  if (b.najihBaru7Hari !== a.najihBaru7Hari) return b.najihBaru7Hari - a.najihBaru7Hari
  return 0
})
setRankingSemangatKelas(semangatList)
  }

  const fetchRiwayat = async (santriId: any) => {
    const { data } = await supabase
      .from('setoran').select('*').eq('santri_id', santriId)
      .order('tanggal', { ascending: false }).limit(30)
    setRiwayatSetoran(data || [])
  }

  const fetchLaporanHariIni = async (santriId: any, tgl?: string) => {
    const tanggal = tgl || getTanggalWIB()
    const { data } = await supabase
      .from('setoran').select('*').eq('santri_id', santriId).eq('tanggal', tanggal)
      .order('created_at', { ascending: true })
    setLaporanHariIni(data || [])
  }

  const handleGantiTanggalLaporan = (arah: number) => {
    if (!selectedSantri) return
    const tgl = new Date(tanggalLaporan)
    tgl.setDate(tgl.getDate() + arah)
    const today = getTanggalWIB()
    const tglStr = `${tgl.getFullYear()}-${String(tgl.getMonth() + 1).padStart(2, '0')}-${String(tgl.getDate()).padStart(2, '0')}`
    // Jangan boleh maju melebihi hari ini
    if (tglStr > today) return
    setTanggalLaporan(tglStr)
    fetchLaporanHariIni(selectedSantri.id, tglStr)
  }

  const fetchNilaiUjian = async (santriId: any) => {
    const { data } = await supabase
      .from('nilai_ujian')
      .select('*, surah_mulai:surah_mulai_nomor(nama_latin), surah_selesai:surah_selesai_nomor(nama_latin), guru:guru_id(nama)')
      .eq('santri_id', santriId).order('tanggal', { ascending: false })
    setNilaiUjianList(data || [])
  }

  const handlePilihSantri = async (santri: any) => {
    setSelectedSantri(santri)
    const today = getTanggalWIB()
    setTanggalLaporan(today)
    fetchRiwayat(santri.id)
    fetchNilaiUjian(santri.id)
    fetchLaporanHariIni(santri.id, today)
    await fetchDataKelas(santri)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const hitungPeringkat = (santriId: string) => {
    if (allSantriKelas.length === 0) return null
    const sorted = [...allSantriKelas].sort((a, b) => (b.total_hafalan_juz || 0) - (a.total_hafalan_juz || 0))
    const peringkat = sorted.findIndex(s => s.id === santriId) + 1
    return { peringkat, total: allSantriKelas.length }
  }

  const totalSetoran = riwayatSetoran.length
  const totalLancar = riwayatSetoran.filter(s => s.status === 'lancar').length
  const totalRosib = riwayatSetoran.filter(s => s.status === 'rosib').length
  const setoranBaru = riwayatSetoran.filter(s => s.jenis === 'baru').length
  const setoranLama = riwayatSetoran.filter(s => s.jenis === 'lama').length
  const peringkatHafalan = selectedSantri ? hitungPeringkat(selectedSantri.id) : null

  const rataUjian = nilaiUjianList.length > 0
    ? Math.round((nilaiUjianList.reduce((s, n) => s + (n.nilai_akhir || 0), 0) / nilaiUjianList.length) * 10) / 10
    : null

  // Hitung peringkat konsistensi santri ini di kelas
  const peringkatKonsistensi = selectedSantri
    ? rankingKonsistensiKelas.findIndex(s => s.id === selectedSantri.id) + 1
    : null

  // Hitung peringkat semangat santri ini di kelas
  const peringkatSemangat = selectedSantri
    ? rankingSemangatKelas.findIndex(s => s.id === selectedSantri.id) + 1
    : null

  // ===== LAPORAN HARI INI (kartu utama) =====
  const tanggalHariIni = new Date(tanggalLaporan + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hariNomorWIB = new Date(tanggalLaporan + 'T00:00:00').getDay()
  const isLiburHariIni = hariNomorWIB === 0 || hariNomorWIB === 5
  const isUlyaSantri = selectedSantri?.jenjang === 'ulya'
  const isHariIni = tanggalLaporan === getTanggalWIB()

  const entriesHariIni = laporanHariIni
  const adaEntry = entriesHariIni.length > 0
  const adaHadir = entriesHariIni.some((e: any) => e.status_kehadiran === 'hadir')
  const adaHadirTidakSetor = entriesHariIni.some((e: any) => e.status_kehadiran === 'hadir_tidak_setor')
  const entryTidakHadir = entriesHariIni.find((e: any) => ['sakit', 'izin', 'alpha'].includes(e.status_kehadiran))
  const hafalanBaruHariIni = entriesHariIni.find((e: any) => e.jenis === 'baru' && e.status_kehadiran === 'hadir')
  const murojaahHariIni = entriesHariIni.find((e: any) => e.jenis === 'lama' && e.status_kehadiran === 'hadir')
  const catatanHariIni = entriesHariIni.filter((e: any) => e.catatan && e.catatan.trim() !== '').map((e: any) => e.catatan)

  // Status badge
  let statusBadge = { label: 'Belum Diinput', color: 'bg-gray-100 text-gray-600' }
  if (!adaEntry) {
    statusBadge = { label: isLiburHariIni ? 'Libur' : 'Belum Diinput', color: 'bg-gray-100 text-gray-600' }
  } else if (adaHadir) {
    statusBadge = { label: 'Hadir', color: 'bg-green-100 text-green-700' }
  } else if (adaHadirTidakSetor) {
    statusBadge = { label: 'Hadir, Tidak Setor', color: 'bg-orange-100 text-orange-700' }
  } else if (entryTidakHadir) {
    const a = entryTidakHadir.status_kehadiran
    statusBadge = {
      label: a === 'sakit' ? 'Sakit' : a === 'izin' ? 'Izin' : 'Tidak Hadir (Alpha)',
      color: a === 'sakit' ? 'bg-yellow-100 text-yellow-700' : a === 'izin' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
    }
  }

  // Pesan otomatis sesuai keadaan
  let pesanOtomatis = ''
  let pesanWarna = 'bg-blue-50 text-blue-700 border-blue-200'
  if (isLiburHariIni && !adaEntry) {
    pesanOtomatis = 'Hari ini libur, tidak ada kegiatan setoran.'
    pesanWarna = 'bg-gray-50 text-gray-600 border-gray-200'
  } else if (!adaEntry) {
    pesanOtomatis = 'Belum ada laporan untuk hari ini. Data akan muncul setelah ustadz/ustadzah menyelesaikan input setoran.'
    pesanWarna = 'bg-gray-50 text-gray-600 border-gray-200'
  } else if (entryTidakHadir && !adaHadir && !adaHadirTidakSetor) {
    const alasan = entryTidakHadir.status_kehadiran
    if (alasan === 'sakit') { pesanOtomatis = 'Ananda tercatat sakit hari ini. Semoga Allah segera memberikan kesembuhan. Mohon istirahat yang cukup.'; pesanWarna = 'bg-yellow-50 text-yellow-700 border-yellow-200' }
    else if (alasan === 'izin') { pesanOtomatis = 'Ananda tercatat izin hari ini sehingga tidak mengikuti setoran.'; pesanWarna = 'bg-blue-50 text-blue-700 border-blue-200' }
    else { pesanOtomatis = 'Ananda tercatat tidak hadir (alpha) hari ini tanpa keterangan. Mohon perhatian dan tindak lanjut dari Bapak/Ibu.'; pesanWarna = 'bg-red-50 text-red-700 border-red-200' }
  } else if (adaHadirTidakSetor && !adaHadir) {
    pesanOtomatis = 'Ananda hadir hari ini namun belum menyetorkan hafalan. Mohon dukungan Bapak/Ibu untuk memotivasi ananda agar lebih semangat menyetorkan hafalannya.'
    pesanWarna = 'bg-orange-50 text-orange-700 border-orange-200'
  } else if (adaHadir) {
    const adaRosib = entriesHariIni.some((e: any) => e.status_kehadiran === 'hadir' && e.status === 'rosib')
    const adaNajih = entriesHariIni.some((e: any) => e.status_kehadiran === 'hadir' && e.status === 'lancar')
    if (adaRosib && adaNajih) { pesanOtomatis = 'Alhamdulillah ananda telah menyetorkan hafalan hari ini. Sebagian sudah lancar, sebagian masih perlu diperbaiki. Mohon dukungan muroja\'ah di rumah.'; pesanWarna = 'bg-blue-50 text-blue-700 border-blue-200' }
    else if (adaRosib) { pesanOtomatis = 'Ananda telah berusaha menyetorkan hafalan hari ini, namun masih perlu perbaikan (rosib). Mohon bantu ananda muroja\'ah di rumah.'; pesanWarna = 'bg-yellow-50 text-yellow-700 border-yellow-200' }
    else { pesanOtomatis = 'Alhamdulillah, ananda menyetorkan hafalan dengan lancar hari ini. Semoga Allah memudahkan hafalannya. Mohon tetap dijaga dengan muroja\'ah di rumah.'; pesanWarna = 'bg-green-50 text-green-700 border-green-200' }
  }

  const menuItems = [
    { id: 'dashboard', label: 'Ringkasan', icon: '◈' },
    { id: 'ujian', label: 'Nilai Ujian', icon: '📝' },
    { id: 'peringkat', label: 'Peringkat', icon: '✦' },
    { id: 'riwayat', label: 'Riwayat Setoran', icon: '◱' },
    { id: 'grafik', label: 'Perkembangan', icon: '◆' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="text-center text-white">
          <div className="w-16 h-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center mx-auto mb-4">
            <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain" />
          </div>
          <p className="text-blue-200">Memuat data...</p>
        </div>
      </div>
    )
  }

  // Komponen baris ranking reusable
  const RankingRow = ({ s, i, metric, satuan, isAnakSaya }: any) => (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${isAnakSaya ? 'border-2 border-yellow-400 bg-yellow-50' : 'bg-gray-50'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-gray-800 flex items-center gap-1">
          {s.nama}
          {isAnakSaya && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-normal">Anak Anda</span>}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
          <div className="h-1.5 rounded-full"
            style={{
              width: `${Math.min(metric, 100)}%`,
              background: isAnakSaya ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #1a3a5c, #2563a8)'
            }} />
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`font-bold text-sm ${isAnakSaya ? 'text-yellow-600' : 'text-blue-700'}`}>{satuan}</div>
      </div>
    </div>
  )

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
            <div className="text-blue-200 text-xs">{waliProfile?.nama || 'Wali Santri'}</div>
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
              <div className="text-white font-semibold text-sm">{waliProfile?.nama || 'Wali Santri'}</div>
              <div className="text-blue-300 text-xs">Wali Santri</div>
            </div>
          </div>

          {santriList.length > 1 && (
            <div className="px-4 py-3 border-b border-blue-700">
              <p className="text-blue-300 text-xs mb-2 font-medium">Pilih Santri:</p>
              {santriList.map(s => (
                <button key={s.id} onClick={() => { handlePilihSantri(s); setSidebarOpen(false) }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm mb-1 transition flex items-center gap-2 ${selectedSantri?.id === s.id ? 'bg-white text-blue-900 font-bold shadow' : 'text-blue-100 hover:bg-white hover:bg-opacity-10'}`}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                    {s.nama?.charAt(0).toUpperCase()}
                  </div>
                  {s.nama}
                </button>
              ))}
            </div>
          )}

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map(menu => (
              <button key={menu.id} onClick={() => { setActiveMenu(menu.id); setSidebarOpen(false) }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium flex items-center gap-3 ${activeMenu === menu.id ? 'bg-white text-blue-900 shadow-md font-bold' : 'text-blue-100 hover:bg-white hover:bg-opacity-10'}`}>
                <span className="text-lg">{menu.icon}</span>{menu.label}
                {menu.id === 'ujian' && nilaiUjianList.length > 0 && (
                  <span className="ml-auto text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full">{nilaiUjianList.length}</span>
                )}
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

          {santriList.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl text-gray-400">◌</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-600">Belum ada data santri</h2>
              <p className="text-gray-400 mt-2 text-sm">Hubungi admin untuk menghubungkan akun dengan data santri</p>
            </div>
          )}

          {selectedSantri && (
            <>
              {/* Header Santri */}
              <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 bg-white" />
                <div className="absolute -bottom-10 -right-4 w-40 h-40 rounded-full opacity-10 bg-white" />
                <div className="relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                      {selectedSantri.nama?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-white font-bold text-xl">{selectedSantri.nama}</h2>
                      <p className="text-blue-200 text-sm">Guru: {selectedSantri.guru?.nama || '-'}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {selectedSantri.kelas && selectedSantri.kelas.trim() !== '' && (
  <span className="bg-white text-blue-900 text-xs px-2 py-0.5 rounded-full font-semibold">
    {selectedSantri.kelas}
  </span>
)}
{(selectedSantri.total_hafalan_juz || 0) > 0 && (
  <span className="bg-white text-blue-900 text-xs px-2 py-0.5 rounded-full font-semibold">
    {selectedSantri.total_hafalan_juz?.toFixed(2)} Juz
  </span>
)}
                        {peringkatHafalan && (
  <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-bold">
    🏆 {peringkatHafalan.peringkat} Hafalan
  </span>
)}
{peringkatKonsistensi ? (
  <span className="bg-blue-400 text-white text-xs px-2 py-0.5 rounded-full font-bold">
    📅 {peringkatKonsistensi} Konsistensi
  </span>
) : null}
{peringkatSemangat ? (
  <span className="bg-purple-400 text-white text-xs px-2 py-0.5 rounded-full font-bold">
    ✨ {peringkatSemangat} Semangat
  </span>
) : null}
{rataUjian !== null && (
  <span className="bg-orange-400 text-white text-xs px-2 py-0.5 rounded-full font-bold">
    📝 Nilai ujian: {rataUjian}
  </span>
)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-blue-200 mb-1">
                      <span>Progress menuju 30 Juz</span>
                      <span>{Math.round(((selectedSantri.total_hafalan_juz || 0) / 30) * 100)}%</span>
                    </div>
                    <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                      <div className="h-2 rounded-full bg-white transition-all"
                        style={{ width: `${Math.min(((selectedSantri.total_hafalan_juz || 0) / 30) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* RINGKASAN */}
              {activeMenu === 'dashboard' && (
                <div>
                  {/* ===== KARTU LAPORAN HARI INI ===== */}
                  <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 overflow-hidden mb-5">
                    <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                      <div className="text-center mb-3">
                        <h3 className="text-white font-bold text-sm flex items-center justify-center gap-1.5">
                          📋 {isHariIni ? 'Laporan Hari Ini' : 'Laporan'}
                        </h3>
                        <div className="text-blue-200 text-xs mt-0.5">{tanggalHariIni}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleGantiTanggalLaporan(-1)}
                          className="flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-black text-white rounded-xl px-3 py-2 transition">
                          <span className="text-base">‹</span>
                          <span className="text-xs font-medium leading-tight text-left">Lihat hari<br />sebelumnya</span>
                        </button>
                        <button onClick={() => handleGantiTanggalLaporan(1)}
                          disabled={isHariIni}
                          className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 transition ${isHariIni ? 'bg-gray-700 bg-opacity-40 text-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-black text-white'}`}>
                          <span className="text-xs font-medium leading-tight text-right">Lihat hari<br />setelahnya</span>
                          <span className="text-base">›</span>
                        </button>
                      </div>
                    </div>
                    <div className="p-5">
                      {/* Status Kehadiran */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-gray-600">Status Kehadiran</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusBadge.color}`}>{statusBadge.label}</span>
                      </div>

                      {/* Detail setoran — hanya tampil jika hadir & ada setoran */}
                      {adaHadir && (
                        <div className="space-y-3 mb-4">
                          {/* Hafalan Baru (skip untuk Ulya) */}
                          {!isUlyaSantri && (
                            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                              <div className="text-xs font-semibold text-blue-800 mb-1">📖 Hafalan Baru</div>
                              {hafalanBaruHariIni ? (
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-800 font-medium">{hafalanBaruHariIni.surah} ayat {hafalanBaruHariIni.ayat_mulai}–{hafalanBaruHariIni.ayat_selesai}</span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${hafalanBaruHariIni.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {hafalanBaruHariIni.status === 'lancar' ? '✓ Lancar' : '✗ Rosib'}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-400 italic">Tidak ada setoran hafalan baru hari ini</div>
                              )}
                            </div>
                          )}

                          {/* Murojaah */}
                          <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                            <div className="text-xs font-semibold text-purple-800 mb-1">🔄 Murojaah (Hafalan Lama)</div>
                            {murojaahHariIni ? (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-800 font-medium">{murojaahHariIni.surah} ayat {murojaahHariIni.ayat_mulai}–{murojaahHariIni.ayat_selesai}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${murojaahHariIni.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {murojaahHariIni.status === 'lancar' ? '✓ Lancar' : '✗ Rosib'}
                                </span>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 italic">Tidak ada setoran murojaah hari ini</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Catatan Guru */}
                      {catatanHariIni.length > 0 && (
                        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <div className="text-xs font-semibold text-amber-800 mb-1">📝 Catatan dari Ustadz/Ustadzah</div>
                          {catatanHariIni.map((c, i) => (
                            <div key={i} className="text-sm text-amber-900">• {c}</div>
                          ))}
                        </div>
                      )}

                      {/* Pesan Otomatis */}
                      {pesanOtomatis && (
                        <div className={`p-3 rounded-xl border text-sm leading-relaxed ${pesanWarna}`}>
                          {pesanOtomatis}
                        </div>
                      )}
                    </div>
                  </div>
{/* ===== KARTU AKTIFKAN NOTIFIKASI ===== */}
                  {!notifAktif && (
                    <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 overflow-hidden mb-5">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-3xl flex-shrink-0">🔔</div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-800 text-sm mb-1">Aktifkan Notifikasi</h3>
                            <p className="text-xs text-gray-500 leading-relaxed mb-3">
                              Dapatkan pemberitahuan langsung di HP setiap ada laporan hafalan ananda yang baru, tanpa perlu membuka aplikasi.
                            </p>
                            <button onClick={handleAktifkanNotif} disabled={notifLoading}
                              className="w-full text-white py-2.5 rounded-xl font-semibold text-sm shadow disabled:opacity-50"
                              style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                              {notifLoading ? 'Memproses...' : '🔔 Aktifkan Notifikasi Sekarang'}
                            </button>
                            {notifPesan && (
                              <p className={`text-xs mt-2 ${notifAktif ? 'text-green-600' : 'text-red-500'}`}>{notifPesan}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {notifAktif && (
                    <div className="bg-green-50 rounded-2xl border border-green-200 p-3 mb-5 flex items-center gap-2">
                      <span className="text-lg">✅</span>
                      <span className="text-sm text-green-700 font-medium">Notifikasi sudah aktif di perangkat ini</span>
                    </div>
                  )}
                  
                  {/* Nilai Ujian Terakhir */}
                  {nilaiUjianList.length > 0 && (
                    <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
                      <h3 className="font-bold text-gray-800 mb-3">Nilai Ujian Terakhir</h3>
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 ${nilaiUjianList[0]?.nilai_akhir >= 8 ? 'bg-green-500' : nilaiUjianList[0]?.nilai_akhir >= 6 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                          {nilaiUjianList[0]?.nilai_akhir}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">{nilaiUjianList[0]?.tipe === 'semester' ? 'Ujian Semester' : 'Ujian Mid Semester'}</div>
                          <div className="text-gray-500 text-sm">{nilaiUjianList[0]?.surah_mulai?.nama_latin} → {nilaiUjianList[0]?.surah_selesai?.nama_latin}</div>
                          <div className="text-xs text-gray-400">{nilaiUjianList[0]?.tanggal}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3 kartu peringkat ringkas */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: 'Peringkat Hafalan', nilai: peringkatHafalan?.peringkat, satuan: `dari ${peringkatHafalan?.total}`, color: 'from-yellow-500 to-yellow-600' },
                      { label: 'Konsistensi Setor', nilai: peringkatKonsistensi || '-', satuan: `dari ${allSantriKelas.length}`, color: 'from-blue-500 to-blue-700' },
                      { label: 'Semangat Hafal', nilai: peringkatSemangat || '-', satuan: `dari ${allSantriKelas.length}`, color: 'from-purple-500 to-purple-700' },
                    ].map((item, i) => (
                      <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-3 shadow text-white relative overflow-hidden`}>
                        <div className="absolute -bottom-2 -right-2 text-4xl opacity-10">◆</div>
                        <div className="text-2xl font-bold">{item.nilai ?? '-'}</div>
                        <div className="text-white text-opacity-80 text-xs mt-0.5">{item.label}</div>
                        <div className="text-white text-opacity-60 text-xs">{item.satuan}</div>
                      </div>
                    ))}
                  </div>

                  {/* Ringkasan 30 setoran terakhir */}
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Ringkasan 30 Setoran Terakhir</h3>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { count: totalSetoran, label: 'Total Setoran', color: 'from-blue-500 to-blue-700' },
                      { count: totalLancar, label: 'Lancar', color: 'from-green-500 to-green-700' },
                      { count: totalRosib, label: 'Rosib', color: 'from-red-500 to-red-700' },
                      { count: setoranBaru, label: 'Hafalan Baru', color: 'from-purple-500 to-purple-700' },
                    ].map((item, i) => (
                      <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow-lg text-white relative overflow-hidden`}>
                        <div className="absolute -bottom-2 -right-2 text-4xl opacity-10">◆</div>
                        <div className="text-3xl font-bold">{item.count}</div>
                        <div className="text-white text-opacity-80 text-xs mt-1">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mb-3">Setoran Terbaru</h3>
                  <div className="space-y-3">
                    {riwayatSetoran.slice(0, 5).map((item) => (
                      <div key={item.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            {item.status_kehadiran && item.status_kehadiran !== 'hadir' ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusKehadiranInfo(item.status_kehadiran).color}`}>
                                {getStatusKehadiranInfo(item.status_kehadiran).label}
                              </span>
                            ) : (
                              <div className="font-semibold text-sm text-gray-800">{item.surah} ayat {item.ayat_mulai}–{item.ayat_selesai}</div>
                            )}
                          </div>
                          {item.status_kehadiran === 'hadir' && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {item.status === 'lancar' ? 'Lancar' : 'Rosib'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {item.status_kehadiran === 'hadir' && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${item.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                              {item.jenis === 'baru' ? 'Hafalan Baru' : 'Murojaah'}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{item.tanggal}</span>
                        </div>
                        {item.catatan && <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-600">Catatan guru: {item.catatan}</div>}
                      </div>
                    ))}
                    {riwayatSetoran.length === 0 && (
                      <div className="bg-white rounded-2xl p-10 text-center shadow border border-gray-100">
                        <p className="text-gray-400 text-sm">Belum ada riwayat setoran</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* NILAI UJIAN */}
              {activeMenu === 'ujian' && (
                <div>
                  <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)' }}>
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                    <div className="relative z-10">
                      <h2 className="font-bold text-xl">Nilai Ujian</h2>
                      <p className="text-orange-200 text-sm mt-1">{selectedSantri.nama}</p>
                      {rataUjian !== null && <p className="text-orange-100 text-xs mt-0.5">Rata-rata nilai: <span className="font-bold">{rataUjian}</span></p>}
                    </div>
                  </div>

                  {nilaiUjianList.length === 0 && (
                    <div className="bg-white rounded-2xl p-10 text-center shadow border border-gray-100">
                      <p className="text-4xl mb-3">📝</p>
                      <p className="text-gray-500 font-semibold">Belum ada nilai ujian</p>
                      <p className="text-gray-400 text-sm mt-1">Nilai akan muncul setelah guru menginput hasil ujian</p>
                    </div>
                  )}

                  {nilaiUjianList.length > 0 && (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        {[
                          { label: 'Jumlah Ujian', count: nilaiUjianList.length, color: 'from-orange-500 to-orange-700' },
                          { label: 'Nilai Tertinggi', count: Math.max(...nilaiUjianList.map(n => n.nilai_akhir || 0)), color: 'from-green-500 to-green-700' },
                          { label: 'Rata-rata', count: rataUjian, color: 'from-blue-500 to-blue-700' },
                        ].map((item, i) => (
                          <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow text-white relative overflow-hidden`}>
                            <div className="absolute -bottom-2 -right-2 text-4xl opacity-10">◆</div>
                            <div className="text-2xl font-bold">{item.count}</div>
                            <div className="text-white text-opacity-80 text-xs mt-1">{item.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        {nilaiUjianList.map((item, i) => (
                          <div key={item.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.tipe === 'semester' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {item.tipe === 'semester' ? 'Ujian Semester' : 'Ujian Mid Semester'}
                                  </span>
                                  <span className="text-xs text-gray-400">{item.tanggal}</span>
                                  {i === 0 && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Terbaru</span>}
                                </div>
                                <div className="font-semibold text-sm text-gray-800 mt-1">
                                  {item.surah_mulai?.nama_latin} → {item.surah_selesai?.nama_latin}
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">Musami': {item.guru?.nama || '-'}</div>
                                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                  <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                                    <span>Tegur: <span className="font-semibold text-gray-700">{item.jumlah_tegur}</span> × (−0.1)</span>
                                    <span>Tahu ayat: <span className="font-semibold text-gray-700">{item.jumlah_tahu_ayat}</span> × (−0.1)</span>
                                    <span>Lupa: <span className="font-semibold text-gray-700">{item.jumlah_lupa}</span> × (−1)</span>
                                  </div>
                                </div>
                                {item.catatan && <div className="mt-2 p-2 bg-orange-50 rounded-lg text-xs text-orange-700">Catatan: {item.catatan}</div>}
                              </div>
                              <div className="ml-3 flex-shrink-0 text-center">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow ${item.nilai_akhir >= 8 ? 'bg-green-500' : item.nilai_akhir >= 6 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                  {item.nilai_akhir}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {item.nilai_akhir >= 8 ? '🌟 Mumtaz' : item.nilai_akhir >= 6 ? '👍 Jayyid' : '💪 Maqbul'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* PERINGKAT */}
              {activeMenu === 'peringkat' && (
                <div>
                  <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' }}>
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                    <div className="relative z-10">
                      <h2 className="font-bold text-xl">Peringkat Santri</h2>
                      <p className="text-yellow-100 text-sm mt-1">{selectedSantri.kelas || 'Kelas belum diset'}</p>
                      <p className="text-yellow-200 text-xs mt-0.5">
                        {allSantriKelas.length} santri • {
                          selectedSantri.jenis_kelas === 'banin' ? 'Banin' :
                          selectedSantri.jenis_kelas === 'banat' ? 'Banat' : 'TN'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Ringkasan 3 peringkat */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: 'Total Hafalan', peringkat: peringkatHafalan?.peringkat, color: 'from-yellow-500 to-yellow-600' },
                      { label: 'Konsistensi', peringkat: peringkatKonsistensi, color: 'from-blue-500 to-blue-700' },
                      { label: 'Semangat Hafal', peringkat: peringkatSemangat, color: 'from-purple-500 to-purple-700' },
                    ].map((item, i) => (
                      <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-3 shadow text-white text-center relative overflow-hidden`}>
                        <div className="absolute -bottom-2 -right-2 text-4xl opacity-10">◆</div>
                        <div className="text-3xl font-bold">{item.peringkat ?? '-'}</div>
                        <div className="text-white text-opacity-80 text-xs mt-0.5">{item.label}</div>
                        <div className="text-white text-opacity-60 text-xs">dari {allSantriKelas.length}</div>
                      </div>
                    ))}
                  </div>

                  {/* Tab jenis ranking */}
                  <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                    {[
                      { id: 'hafalan', label: 'Total Hafalan' },
                      { id: 'konsistensi', label: 'Konsistensi Setor' },
                      { id: 'semangat', label: 'Semangat Hafalan' },
                    ].map(tab => (
                      <button key={tab.id} onClick={() => setActiveRanking(tab.id)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition border-2 ${activeRanking === tab.id ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Ranking Total Hafalan */}
                  {activeRanking === 'hafalan' && (
                    <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                      <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                        <h3 className="text-white font-bold">Peringkat Total Hafalan</h3>
                        <p className="text-green-200 text-xs mt-0.5">Diurutkan dari juz terbanyak</p>
                      </div>
                      <div className="p-4 space-y-2">
                        {[...allSantriKelas].sort((a, b) => (b.total_hafalan_juz || 0) - (a.total_hafalan_juz || 0)).map((s, i) => (
                          <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl ${s.id === selectedSantri.id ? 'border-2 border-yellow-400 bg-yellow-50' : 'bg-gray-50'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm text-gray-800 flex items-center gap-1">
                                {s.nama}
                                {s.id === selectedSantri.id && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-normal">Anak Anda</span>}
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div className="h-1.5 rounded-full"
                                  style={{ width: `${Math.min(((s.total_hafalan_juz || 0) / 30) * 100, 100)}%`, background: s.id === selectedSantri.id ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #166534, #16a34a)' }} />
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className={`font-bold text-sm ${s.id === selectedSantri.id ? 'text-yellow-600' : 'text-green-700'}`}>{s.total_hafalan_juz?.toFixed(2) || 0}</div>
                              <div className="text-xs text-gray-400">Juz</div>
                            </div>
                          </div>
                        ))}
                        {allSantriKelas.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>}
                      </div>
                    </div>
                  )}

                  {/* Ranking Konsistensi */}
                  {activeRanking === 'konsistensi' && (
                    <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                      <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                        <h3 className="text-white font-bold">Peringkat Konsistensi Setor</h3>
                        <p className="text-blue-200 text-xs mt-0.5">% hari setor dalam 7 hari terakhir</p>
                      </div>
                      <div className="p-4 space-y-2">
                        {rankingKonsistensiKelas.map((s, i) => (
                          <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl ${s.id === selectedSantri.id ? 'border-2 border-yellow-400 bg-yellow-50' : 'bg-gray-50'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm text-gray-800 flex items-center gap-1">
                                {s.nama}
                                {s.id === selectedSantri.id && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-normal">Anak Anda</span>}
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                                <div className="h-1.5 rounded-full"
                                  style={{ width: `${s.persentaseKonsistensi}%`, background: s.id === selectedSantri.id ? 'linear-gradient(135deg, #d97706, #f59e0b)' : s.persentaseKonsistensi >= 80 ? 'linear-gradient(135deg, #166534, #16a34a)' : s.persentaseKonsistensi >= 50 ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #dc2626, #ef4444)' }} />
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className={`font-bold text-sm ${s.id === selectedSantri.id ? 'text-yellow-600' : s.persentaseKonsistensi >= 80 ? 'text-green-600' : s.persentaseKonsistensi >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{s.persentaseKonsistensi}%</div>
                              <div className="text-xs text-gray-400">{s.hariSetor}/{s.totalHariAktif} hari aktif</div>
                            </div>
                          </div>
                        ))}
                        {rankingKonsistensiKelas.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>}
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
                        {rankingSemangatKelas.map((s, i) => {
                          const maxHalaman = rankingSemangatKelas[0]?.tambahHalaman7Hari || 1
                          return (
                            <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl ${s.id === selectedSantri.id ? 'border-2 border-yellow-400 bg-yellow-50' : 'bg-gray-50'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm text-gray-800 flex items-center gap-1">
                                  {s.nama}
                                  {s.id === selectedSantri.id && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-normal">Anak Anda</span>}
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                                  <div className="h-1.5 rounded-full"
                                    style={{ width: `${Math.min((s.tambahHalaman7Hari / maxHalaman) * 100, 100)}%`, background: s.id === selectedSantri.id ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #6b21a8, #9333ea)' }} />
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className={`font-bold text-sm ${s.id === selectedSantri.id ? 'text-yellow-600' : 'text-purple-600'}`}>{s.tambahHalaman7Hari.toFixed(1)}</div>
                                <div className="text-xs text-gray-400">hal</div>
                              </div>
                            </div>
                          )
                        })}
                        {rankingSemangatKelas.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>}
                      </div>
                    </div>
                  )}

                  {!peringkatHafalan && (
                    <div className="bg-white rounded-2xl p-8 text-center shadow border border-gray-100">
                      <p className="text-gray-400 text-sm">Data kelas belum tersedia</p>
                      <p className="text-gray-300 text-xs mt-1">Hubungi admin untuk mengatur data kelas</p>
                    </div>
                  )}
                </div>
              )}

              {/* RIWAYAT LENGKAP */}
              {activeMenu === 'riwayat' && (
                <div>
                  <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                    <div className="relative z-10">
                      <h2 className="font-bold text-xl">Riwayat Setoran</h2>
                      <p className="text-blue-200 text-sm mt-1">{riwayatSetoran.length} setoran tercatat</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {riwayatSetoran.length === 0 && (
                      <div className="bg-white rounded-2xl p-10 text-center shadow border border-gray-100">
                        <p className="text-gray-400 text-sm">Belum ada riwayat setoran</p>
                      </div>
                    )}
                    {riwayatSetoran.map((item) => (
                      <div key={item.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            {item.status_kehadiran && item.status_kehadiran !== 'hadir' ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusKehadiranInfo(item.status_kehadiran).color}`}>
                                {getStatusKehadiranInfo(item.status_kehadiran).label}
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                {item.jenis === 'baru' ? 'Hafalan Baru' : 'Murojaah'}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">{item.tanggal}</span>
                          </div>
                          {item.status_kehadiran === 'hadir' && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {item.status === 'lancar' ? 'Lancar' : 'Rosib'}
                            </span>
                          )}
                        </div>
                        {item.status_kehadiran === 'hadir' && (
                          <div className="font-semibold text-sm text-gray-800">
                            {item.surah} ayat {item.ayat_mulai}–{item.ayat_selesai}
                          </div>
                        )}
                        {item.catatan && <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-600">Catatan guru: {item.catatan}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PERKEMBANGAN */}
              {activeMenu === 'grafik' && (
                <div>
                  <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #166534 0%, #16a34a 100%)' }}>
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                    <div className="relative z-10">
                      <h2 className="font-bold text-xl">Perkembangan Hafalan</h2>
                      <p className="text-green-200 text-sm mt-1">{selectedSantri.nama}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow p-5 mb-4 border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-4">Progress Menuju 30 Juz</h4>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Hafalan saat ini</span>
                      <span className="font-bold text-green-700">{selectedSantri.total_hafalan_juz?.toFixed(2) || 0} / 30 Juz</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6 mb-2">
                      <div className="h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all"
                        style={{ width: `${Math.min(((selectedSantri.total_hafalan_juz || 0) / 30) * 100, 100)}%`, background: 'linear-gradient(135deg, #166534, #16a34a)', minWidth: (selectedSantri.total_hafalan_juz || 0) > 0 ? '3rem' : '0' }}>
                        {Math.round(((selectedSantri.total_hafalan_juz || 0) / 30) * 100)}%
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">Sisa {(30 - (selectedSantri.total_hafalan_juz || 0)).toFixed(1)} Juz lagi untuk khatam</p>
                  </div>

                  <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-4">Statistik Setoran (30 terakhir)</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Tingkat Kelancaran</span>
                          <span className="font-bold text-green-700">{totalSetoran > 0 ? Math.round((totalLancar / totalSetoran) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div className="h-3 rounded-full transition-all" style={{ width: `${totalSetoran > 0 ? Math.round((totalLancar / totalSetoran) * 100) : 0}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{totalLancar} lancar dari {totalSetoran} setoran</p>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Hafalan Baru vs Murojaah</span>
                          <span className="font-bold text-blue-700">{totalSetoran > 0 ? Math.round((setoranBaru / totalSetoran) * 100) : 0}% Baru</span>
                        </div>
                        <div className="w-full bg-purple-200 rounded-full h-3">
                          <div className="h-3 rounded-full transition-all" style={{ width: `${totalSetoran > 0 ? Math.round((setoranBaru / totalSetoran) * 100) : 0}%`, background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{setoranBaru} hafalan baru, {setoranLama} murojaah</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-5">
                      {[
                        { count: totalSetoran, label: 'Total Setoran', color: 'text-blue-700' },
                        { count: totalLancar, label: 'Lancar', color: 'text-green-700' },
                        { count: totalRosib, label: 'Rosib', color: 'text-red-600' },
                      ].map((item, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                          <div className={`text-xl font-bold ${item.color}`}>{item.count}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}