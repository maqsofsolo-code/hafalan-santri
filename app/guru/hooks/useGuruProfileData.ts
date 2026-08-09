'use client'
import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { requireProfile } from '../../lib/authClient'
import { getTanggalWIB } from '../../lib/dateWib'
import type { GuruProfile, Santri, Surah, KalenderAkademik } from '../types'

// Data inti dashboard Guru: profil sendiri, daftar santri penugasan (guru_id
// + guru_id_2), semua santri aktif (untuk mode Guru Pengganti), daftar surah,
// kalender akademik aktif hari ini, dan kalender ujian aktif hari ini.
// Dipindah dari fetchGuruData() di app/guru/page.tsx (Modularisasi Tahap 5A)
// TANPA mengubah logic -- hanya query absensi_guru yang dipindah keluar dari
// sini ke useAbsensi() (fetch terpisah, sama seperti pola cekStatusNotifikasi
// yang sudah ada sebelumnya di halaman ini).
export function useGuruProfileData() {
  const [guruProfile, setGuruProfile] = useState<GuruProfile | null>(null)
  const [santriList, setSantriList] = useState<Santri[]>([])
  const [allSantriList, setAllSantriList] = useState<Santri[]>([])
  const [surahList, setSurahList] = useState<Surah[]>([])
  const [kalenderAktif, setKalenderAktif] = useState<KalenderAkademik | null>(null)
  const [kalenderUjianAktif, setKalenderUjianAktif] = useState<{ id: string, nama: string, tipe: string, semester: number | null } | null>(null)
  const [kalenderUjianGanda, setKalenderUjianGanda] = useState(false)

  const fetchGuruData = useCallback(async () => {
    const profile = await requireProfile('guru')
    if (!profile) return
    const user = { id: profile.id }
    setGuruProfile(profile)

    const { data: santri1 } = await supabase.from('santri')
      .select('*, guru:guru_id(nama)').eq('guru_id', user.id).eq('status', 'aktif')
    const { data: santri2 } = await supabase.from('santri')
      .select('*, guru:guru_id(nama)').eq('guru_id_2', user.id).eq('status', 'aktif')
    const gabunganSantri = [...(santri1 || [])]
    ;(santri2 || []).forEach((s) => {
      if (!gabunganSantri.find(x => x.id === s.id)) gabunganSantri.push(s)
    })
    setSantriList(gabunganSantri)

    const { data: semuaSantri } = await supabase.from('santri').select('*, guru:guru_id(nama)').eq('status', 'aktif')
    setAllSantriList(semuaSantri || [])

    const { data: surah } = await supabase.from('surah').select('*').order('nomor', { ascending: false })
    setSurahList(surah || [])

    const today = getTanggalWIB()

    const { data: kalender } = await supabase.from('kalender_akademik').select('*').lte('tanggal_mulai', today).gte('tanggal_selesai', today).maybeSingle()
    setKalenderAktif(kalender || null)

    // Periode ujian aktif dihitung terpisah dari kalenderAktif di atas (yang juga mencakup tipe
    // 'libur') supaya Input Nilai Ujian hanya menyala untuk tipe mid_semester/semester, dan supaya
    // dua kalender ujian yang tumpang tindih terdeteksi eksplisit alih-alih dipilih diam-diam.
    const { data: kalenderUjianRows, error: kalenderUjianError } = await supabase
      .from('kalender_akademik')
      .select('id, nama, tipe, semester')
      .in('tipe', ['mid_semester', 'semester'])
      .lte('tanggal_mulai', today)
      .gte('tanggal_selesai', today)
    if (kalenderUjianError || !kalenderUjianRows) {
      setKalenderUjianAktif(null)
      setKalenderUjianGanda(false)
    } else if (kalenderUjianRows.length > 1) {
      setKalenderUjianAktif(null)
      setKalenderUjianGanda(true)
    } else {
      setKalenderUjianAktif(kalenderUjianRows[0] || null)
      setKalenderUjianGanda(false)
    }
  }, [])

  return {
    guruProfile, santriList, allSantriList, surahList,
    kalenderAktif, kalenderUjianAktif, kalenderUjianGanda,
    fetchGuruData,
  }
}
