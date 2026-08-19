'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getPeriodePekanTertutup, getTanggalWIB } from '../../lib/dateWib'
import { hitungRankingTotalHafalan, hitungRankingKonsistensi, hitungRankingSemangat, type SantriKonsistensiHasil, type SantriSemangatHasil } from '../../lib/ranking'
import { requireProfile } from '../../lib/authClient'
import type { Santri, Guru, KalenderAkademik, SetoranRow, AbsensiGuru, NilaiUjianRow } from '../types'

type RankingKonsistensiRow = SantriKonsistensiHasil<Santri> & { periodeKonsistensi: string }

// Data utama halaman Kepsek: profile guard + satu fetch besar (santri, guru,
// setoran/absensi hari ini, kalender, nilai ujian, 3 jenis ranking) yang
// dijalankan sekali saat mount -- dipindah dari app/kepsek/page.tsx
// (Modularisasi Tahap 7A) TANPA mengubah logic/urutan query sama sekali.
//
// `setoranTanggalDipilih`/`absensiTanggalDipilih`/`setoranMurojaahTanggal`
// (dipakai tab Monitoring & Murojaah) SENGAJA tetap diinisialisasi di sini
// (bukan di hook Monitoring/Murojaah terpisah) karena nilai awalnya berasal
// dari hasil fetch hari-ini yang sama persis -- di kode asli ini satu fungsi
// fetchAllData() yang sama. useKepsekMonitoring/useKepsekMurojaah menerima
// state+setter ini lewat parameter supaya bisa mengubahnya sendiri saat
// tanggal diganti, tanpa duplikasi fetch atau query ulang saat mount.
export function useKepsekData() {
  const [loading, setLoading] = useState(true)
  const [santriList, setSantriList] = useState<Santri[]>([])
  const [guruList, setGuruList] = useState<Guru[]>([])
  const [setoranHariIni, setSetoranHariIni] = useState<SetoranRow[]>([])
  const [absensiGuru, setAbsensiGuru] = useState<AbsensiGuru[]>([])
  const [kalenderAktif, setKalenderAktif] = useState<KalenderAkademik | null>(null)
  const [nilaiUjianList, setNilaiUjianList] = useState<NilaiUjianRow[]>([])
  const [rankingHafalan, setRankingHafalan] = useState<Santri[]>([])
  const [rankingKonsistensi, setRankingKonsistensi] = useState<RankingKonsistensiRow[]>([])
  const [rankingSemangat, setRankingSemangat] = useState<SantriSemangatHasil<Santri>[]>([])
  const [rankingPeriodeKonsistensi, setRankingPeriodeKonsistensi] = useState('')
  const [setoranMurojaahHariIni, setSetoranMurojaahHariIni] = useState<SetoranRow[]>([])

  const [setoranTanggalDipilih, setSetoranTanggalDipilih] = useState<SetoranRow[]>([])
  const [absensiTanggalDipilih, setAbsensiTanggalDipilih] = useState<AbsensiGuru[]>([])
  const [setoranMurojaahTanggal, setSetoranMurojaahTanggal] = useState<SetoranRow[]>([])

  useEffect(() => { fetchAllData() }, [])

  const fetchAllData = async () => {
    const profile = await requireProfile('kepsek')
    if (!profile) return

    const today = getTanggalWIB()
    // KOREKSI Tahap 9O: mulai dari `today` (WIB) alih-alih `new Date()`
    // mentah -- `new Date()` lalu `.toISOString()` menghasilkan tanggal
    // UTC, yang mundur satu hari dari tanggal WIB selama pukul 00:00-06:59
    // WIB setiap hari (WIB = UTC+7). Pola sama persis dengan
    // app/api/wali/ranking-data/route.ts yang sudah benar sejak awal.
    const tujuhHariLalu = new Date(today)
    tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7)
    const tujuhHariLaluStr = tujuhHariLalu.toISOString().split('T')[0]

    const [{ data: santri }, { data: guru }, { data: setoran }, { data: absensi }] = await Promise.all([
      supabase.from('santri').select('*, guru:guru_id(nama)'),
      supabase.from('profiles').select('*').eq('role', 'guru'),
      supabase.from('setoran').select('*, santri:santri_id(nama, kelas, kelas_num, jenjang)').eq('tanggal', today),
      supabase.from('absensi_guru').select('*, guru:guru_id(nama)').eq('tanggal', today)
    ])

    setSantriList(santri || [])
    setGuruList(guru || [])
    setSetoranHariIni(setoran || [])
    setAbsensiGuru(absensi || [])
    setSetoranTanggalDipilih(setoran || [])
    setAbsensiTanggalDipilih(absensi || [])

    const { data: kalender } = await supabase.from('kalender_akademik').select('*').lte('tanggal_mulai', today).gte('tanggal_selesai', today).single()
    setKalenderAktif(kalender || null)

    // Ambil semua libur akademik untuk hitung hari aktif
    const { data: semuaLibur } = await supabase
      .from('kalender_akademik').select('*').eq('tipe', 'libur')
    const liburAkademik: KalenderAkademik[] = semuaLibur || []

    const { data: nilaiUjian } = await supabase
      .from('nilai_ujian')
      .select('*, santri:santri_id(nama, kelas, kelas_num, jenjang), guru:guru_id(nama), surah_mulai:surah_mulai_nomor(nama_latin), surah_selesai:surah_selesai_nomor(nama_latin)')
      .order('created_at', { ascending: false })
    setNilaiUjianList(nilaiUjian || [])

    const sortedHafalan = hitungRankingTotalHafalan(santri || [])
    setRankingHafalan(sortedHafalan)

    // Setoran murojaah hari ini
    const { data: murojaahHariIni } = await supabase
      .from('setoran')
      .select('*, santri:santri_id(nama, total_hafalan_juz, kelas, kelas_num, jenjang, guru:guru_id(nama))')
      .eq('tanggal', today).eq('jenis', 'lama').eq('status_kehadiran', 'hadir')
    setSetoranMurojaahHariIni(murojaahHariIni || [])
    setSetoranMurojaahTanggal(murojaahHariIni || [])

    const { data: setoran7Hari } = await supabase
      .from('setoran')
      .select('santri_id, tanggal, jenis, penambahan_juz, status_kehadiran, status')
      .gte('tanggal', tujuhHariLaluStr).eq('status_kehadiran', 'hadir')

    const periodeKonsistensi = getPeriodePekanTertutup()
    setRankingPeriodeKonsistensi(periodeKonsistensi.labelPeriode)
    const { data: setoranPekanKonsistensi } = await supabase
      .from('setoran')
      .select('santri_id, tanggal, jenis, penambahan_juz, status_kehadiran, status')
      .gte('tanggal', periodeKonsistensi.tanggalMulai)
      .lte('tanggal', periodeKonsistensi.tanggalSelesai)
      .eq('status_kehadiran', 'hadir')

    // Hitung hari aktif dalam 7 hari terakhir (skip Jumat, Ahad, libur akademik)
    const hitungHariAktif = (mulai: string, selesai: string) => {
      const aktif: string[] = []
      const cur = new Date(mulai)
      const end = new Date(selesai)
      while (cur <= end) {
        const hari = cur.getDay()
        const tgl = cur.toISOString().split('T')[0]
        if (hari !== 0 && hari !== 5) {
          const isLibur = liburAkademik.some(l =>
            tgl >= l.tanggal_mulai && tgl <= l.tanggal_selesai
          )
          if (!isLibur) aktif.push(tgl)
        }
        cur.setDate(cur.getDate() + 1)
      }
      return aktif
    }

    const hariAktif7Hari = hitungHariAktif(tujuhHariLaluStr, today)

    const hitungHariAktifPekan = (mulai: string, selesai: string) => {
      const aktif: string[] = []
      const cur = new Date(`${mulai}T00:00:00Z`)
      const end = new Date(`${selesai}T00:00:00Z`)
      while (cur <= end) {
        const hari = cur.getUTCDay()
        const tgl = cur.toISOString().split('T')[0]
        const isLibur = liburAkademik.some(l =>
          tgl >= l.tanggal_mulai && tgl <= l.tanggal_selesai
        )
        if (hari !== 0 && hari !== 5 && !isLibur) aktif.push(tgl)
        cur.setUTCDate(cur.getUTCDate() + 1)
      }
      return aktif
    }

    const hariAktifKonsistensi = hitungHariAktifPekan(
      periodeKonsistensi.tanggalMulai,
      periodeKonsistensi.tanggalSelesai
    )
    const hariAktifKonsistensiSet = new Set(hariAktifKonsistensi)
    const totalHariAktif = hariAktifKonsistensi.length

    // ===== RANKING KONSISTENSI =====
    const konsistensiList = hitungRankingKonsistensi(
      santri || [], setoranPekanKonsistensi || [], hariAktifKonsistensiSet, totalHariAktif
    ).map(s => ({ ...s, periodeKonsistensi: periodeKonsistensi.labelPeriode }))
    setRankingKonsistensi(konsistensiList)

    // ===== RANKING SEMANGAT =====
    const semangatList = hitungRankingSemangat(santri || [], setoran7Hari || [], new Set(hariAktif7Hari))
    setRankingSemangat(semangatList)

    setLoading(false)
  }

  return {
    loading, santriList, guruList, setoranHariIni, absensiGuru, kalenderAktif, nilaiUjianList,
    rankingHafalan, rankingKonsistensi, rankingSemangat, rankingPeriodeKonsistensi, setoranMurojaahHariIni,
    setoranTanggalDipilih, setSetoranTanggalDipilih, absensiTanggalDipilih, setAbsensiTanggalDipilih,
    setoranMurojaahTanggal, setSetoranMurojaahTanggal,
  }
}
