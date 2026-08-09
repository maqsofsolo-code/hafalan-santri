'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { daftarkanNotifikasi, cekStatusNotifikasi } from '../../lib/push'
import { fetchWithAuth } from '../../lib/authClient'
import type { WaliProfile } from '../types'

// Push notification (aktifkan/cek status/test) -- dipindah dari
// app/wali/page.tsx (Modularisasi Tahap 8A) TANPA mengubah endpoint/flow
// push/check, push/subscribe, push/test, atau app/lib/push.ts sama sekali.
//
// `handleTestNotif` dipertahankan apa adanya meskipun tidak ada tombol yang
// memanggilnya di UI existing (sudah begitu di app/wali/page.tsx asli, bukan
// hal baru dari Tahap 8A) -- lihat laporan.
export function useWaliNotifikasi(waliProfile: WaliProfile | null) {
  const [notifAktif, setNotifAktif] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifPesan, setNotifPesan] = useState('')

  useEffect(() => {
    if (waliProfile?.id) cekStatusNotifikasi(waliProfile.id).then(setNotifAktif)
  }, [waliProfile])

  const handleAktifkanNotif = async () => {
    if (!waliProfile) return
    setNotifLoading(true)
    setNotifPesan('')
    const hasil = await daftarkanNotifikasi(waliProfile.id, 'wali')
    setNotifPesan(hasil.message)
    if (hasil.ok) setNotifAktif(true)
    setNotifLoading(false)
  }

  const handleTestNotif = async () => {
    if (!waliProfile) return
    setNotifLoading(true)
    setNotifPesan('')
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        setNotifPesan('Session tidak tersedia atau sudah berakhir. Silakan login kembali.')
        setNotifLoading(false)
        return
      }

      const res = await fetchWithAuth('/api/push/test', session.access_token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.status === 401) {
        setNotifPesan('Session tidak valid atau sudah berakhir. Silakan login kembali.')
      } else if (res.status === 403) {
        setNotifPesan('Akses notifikasi ditolak.')
      } else {
        setNotifPesan(data.message)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setNotifPesan('Gagal kirim test: ' + message)
    }
    setNotifLoading(false)
  }

  return { notifAktif, notifLoading, notifPesan, handleAktifkanNotif, handleTestNotif }
}
