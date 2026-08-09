'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getTanggalWIB } from '../../lib/dateWib'
import { hitungRankingKonsistensi, hitungRankingSemangat, type SantriKonsistensiHasil, type SantriSemangatHasil } from '../../lib/ranking'
import { fetchWithAuth } from '../../lib/authClient'
import type { Santri, SantriKelasRanking, SetoranKelasRow, KalenderAkademik } from '../types'

type RankingKonsistensiRow = SantriKonsistensiHasil<SantriKelasRanking> & { periodeKonsistensi: string }

// 3 kategori ranking (Total Hafalan/Konsistensi/Semangat) untuk teman
// sekelas anak Wali -- dipindah dari app/wali/page.tsx (Modularisasi Tahap
// 8A) TANPA mengubah logic/urutan query SAMA SEKALI.
//
// SECURITY: data teman sekelas TIDAK diambil langsung dari base table
// (RLS Tahap 4 membatasi Wali hanya ke anak sendiri) -- tetap lewat
// GET /api/wali/ranking-data yang memverifikasi kepemilikan santri.id dan
// membatasi kolom, endpoint itu TIDAK disentuh di Tahap 8A ini. Formula
// ranking tetap dari app/lib/ranking.ts, tidak diduplikasi.
export function useWaliRanking() {
  const [allSantriKelas, setAllSantriKelas] = useState<SantriKelasRanking[]>([])
  const [rankingKonsistensiKelas, setRankingKonsistensiKelas] = useState<RankingKonsistensiRow[]>([])
  const [rankingSemangatKelas, setRankingSemangatKelas] = useState<SantriSemangatHasil<SantriKelasRanking>[]>([])
  const [rankingPeriodeKonsistensi, setRankingPeriodeKonsistensi] = useState('')
  const [activeRanking, setActiveRanking] = useState('hafalan')

  const fetchDataKelas = async (santri: Santri) => {
    if (!santri.kelas_num || !santri.jenjang) return

    // Teman sekelas + setoran teman sekelas TIDAK lagi diambil langsung dari
    // base table (santri/setoran RLS Tahap 4 membatasi Wali hanya ke anak
    // sendiri). Endpoint server ini memverifikasi kepemilikan santri.id lalu
    // memakai service-role dengan proyeksi kolom terbatas (lihat Security Fix
    // Tahap 4 bagian G) -- perhitungan 3 kategori ranking di bawah tidak
    // berubah, hanya sumber datanya.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.access_token) return

    const response = await fetchWithAuth(`/api/wali/ranking-data?santriId=${encodeURIComponent(santri.id)}`, session.access_token)
    if (!response.ok) return
    const hasil = await response.json().catch(() => null)
    if (!hasil) return

    const seKelas: SantriKelasRanking[] = hasil.santriKelas || []
    setAllSantriKelas(seKelas)

    // Ranking semangat tetap memakai rentang 7 hari yang berjalan
    const today = getTanggalWIB()
    const tujuhHariLalu = new Date(today)
    tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7)
    const tujuhHariLaluStr = tujuhHariLalu.toISOString().split('T')[0]

    if (seKelas.length === 0 || !hasil.periodeKonsistensi) return

    const setoran7Hari: SetoranKelasRow[] = hasil.setoran7Hari || []
    const periodeKonsistensi = hasil.periodeKonsistensi
    setRankingPeriodeKonsistensi(periodeKonsistensi.labelPeriode)
    const setoranPekanKonsistensi: SetoranKelasRow[] = hasil.setoranPekanKonsistensi || []

    // Ambil semua libur akademik
    const { data: semuaLibur } = await supabase
      .from('kalender_akademik').select('*').eq('tipe', 'libur')
    const liburAkademik: KalenderAkademik[] = semuaLibur || []

    // Hitung hari aktif (skip Jumat, Ahad, libur akademik)
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

    // ===== RANKING KONSISTENSI PER KELAS =====
    const konsistensiList = hitungRankingKonsistensi(
      seKelas, setoranPekanKonsistensi || [], hariAktifKonsistensiSet, totalHariAktif
    ).map(s => ({ ...s, periodeKonsistensi: periodeKonsistensi.labelPeriode }))
    setRankingKonsistensiKelas(konsistensiList)

    // ===== RANKING SEMANGAT PER KELAS =====
    const semangatList = hitungRankingSemangat(seKelas, setoran7Hari || [], new Set(hariAktif7Hari))
    setRankingSemangatKelas(semangatList)
  }

  return {
    allSantriKelas, rankingKonsistensiKelas, rankingSemangatKelas, rankingPeriodeKonsistensi,
    activeRanking, setActiveRanking, fetchDataKelas,
  }
}
