'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { SetoranRiwayat } from '../types'

// Riwayat setoran milik guru yang login + edit status/catatan setoran
// sendiri. Dipindah dari app/guru/page.tsx (Modularisasi Tahap 5A) TANPA
// mengubah logic (paging 50 baris, kolom yang di-select, urutan).
//
// errorMsg/successMsg TETAP dipegang page.tsx (dipakai bersama Input
// Setoran, persis seperti sebelumnya) -- hook ini hanya menerima setter-nya.
export function useRiwayatSetoran(params: {
  setErrorMsg: (msg: string) => void
  setSuccessMsg: (msg: string) => void
}) {
  const { setErrorMsg, setSuccessMsg } = params

  const [riwayatList, setRiwayatList] = useState<SetoranRiwayat[]>([])
  const [riwayatHasMore, setRiwayatHasMore] = useState(true)
  const [riwayatLoadingMore, setRiwayatLoadingMore] = useState(false)
  const [editSetoran, setEditSetoran] = useState<SetoranRiwayat | null>(null)
  const [editStatus, setEditStatus] = useState('lancar')
  const [editCatatan, setEditCatatan] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const fetchRiwayat = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('setoran')
      .select('*, santri:santri_id(nama), surah_mulai:surah_mulai_nomor(nama_latin), surah_selesai:surah_selesai_nomor(nama_latin)')
      .eq('guru_id', user.id)
      .order('created_at', { ascending: false })
      .range(0, 49)
    setRiwayatList(data || [])
    setRiwayatHasMore((data || []).length === 50)
  }

  const fetchMoreRiwayat = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setRiwayatLoadingMore(true)
    const { data } = await supabase
      .from('setoran')
      .select('*, santri:santri_id(nama), surah_mulai:surah_mulai_nomor(nama_latin), surah_selesai:surah_selesai_nomor(nama_latin)')
      .eq('guru_id', user.id)
      .order('created_at', { ascending: false })
      .range(riwayatList.length, riwayatList.length + 49)
    setRiwayatList(prev => [...prev, ...(data || [])])
    setRiwayatHasMore((data || []).length === 50)
    setRiwayatLoadingMore(false)
  }

  const handleSimpanEditSetoran = async () => {
    if (!editSetoran) return
    setEditLoading(true)
    const { error } = await supabase
      .from('setoran')
      .update({ status: editStatus, catatan: editCatatan, perlu_ulang: editStatus === 'rosib' })
      .eq('id', editSetoran.id)
    if (error) {
      setErrorMsg('Gagal edit: ' + error.message)
    } else {
      setSuccessMsg('Setoran berhasil diupdate!')
      setEditSetoran(null)
      fetchRiwayat()
      setTimeout(() => setSuccessMsg(''), 3000)
    }
    setEditLoading(false)
  }

  return {
    riwayatList, riwayatHasMore, riwayatLoadingMore,
    editSetoran, setEditSetoran, editStatus, setEditStatus, editCatatan, setEditCatatan, editLoading,
    fetchRiwayat, fetchMoreRiwayat, handleSimpanEditSetoran,
  }
}
