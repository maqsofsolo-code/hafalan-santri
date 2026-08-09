'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getTanggalWIB } from '../../lib/dateWib'
import { getSesiAktif } from '../utils'

// Absensi Guru (subuh/pagi). Dipindah dari app/guru/page.tsx (Modularisasi
// Tahap 5A) TANPA mengubah logic. Query absensi_guru sebelumnya berjalan di
// dalam fetchGuruData() -- di sini dijalankan di efek terpisah begitu
// `guruId` tersedia, mengikuti pola yang sudah ada di halaman ini untuk
// cekStatusNotifikasi(). Hasil akhir (nilai state, query, urutan
// insert/delete) identik, hanya waktu pemanggilannya terpisah dari fetch
// profil/santri/surah/kalender.
export function useAbsensi(guruId: string | undefined) {
  const [absenSubuh, setAbsenSubuh] = useState(false)
  const [absenPagi, setAbsenPagi] = useState(false)
  const [absenLoading, setAbsenLoading] = useState(false)
  const [showPopupAbsen, setShowPopupAbsen] = useState(false)
  const [sesiAbsen, setSesiAbsen] = useState<'subuh' | 'pagi'>('subuh')
  const [isBatalAbsen, setIsBatalAbsen] = useState(false)

  useEffect(() => {
    if (!guruId) return
    const today = getTanggalWIB()
    supabase.from('absensi_guru').select('*').eq('guru_id', guruId).eq('tanggal', today).then(({ data: absensiList }) => {
      const absensiData = absensiList || []
      setAbsenSubuh(absensiData.some((a: { sesi: string }) => a.sesi === 'subuh'))
      setAbsenPagi(absensiData.some((a: { sesi: string }) => a.sesi === 'pagi'))
    })
  }, [guruId])

  const handleKlikAbsen = (sesi: 'subuh' | 'pagi') => {
    setSesiAbsen(sesi)
    setIsBatalAbsen(sesi === 'subuh' ? absenSubuh : absenPagi)
    setShowPopupAbsen(true)
  }

  const handleKonfirmasiAbsen = async () => {
    setAbsenLoading(true)
    setShowPopupAbsen(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = getTanggalWIB()
    if (isBatalAbsen) {
      await supabase.from('absensi_guru').delete().eq('guru_id', user.id).eq('tanggal', today).eq('sesi', sesiAbsen)
      if (sesiAbsen === 'subuh') setAbsenSubuh(false)
      else setAbsenPagi(false)
    } else {
      await supabase.from('absensi_guru').insert({ guru_id: user.id, tanggal: today, status: 'hadir', sesi: sesiAbsen })
      if (sesiAbsen === 'subuh') setAbsenSubuh(true)
      else setAbsenPagi(true)
    }
    setAbsenLoading(false)
  }

  const sesiAktif = getSesiAktif()

  return {
    absenSubuh, absenPagi, absenLoading,
    showPopupAbsen, setShowPopupAbsen, sesiAbsen, isBatalAbsen, sesiAktif,
    handleKlikAbsen, handleKonfirmasiAbsen,
  }
}
