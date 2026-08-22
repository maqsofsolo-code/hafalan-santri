'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchWithAuth } from '../../lib/authClient'

// CRUD file tanda tangan digital guru (Tahap 9P) lewat /api/admin/guru-tanda-tangan (admin-only,
// service role di server -- browser tidak pernah menyentuh Supabase Storage langsung). Terpisah
// dari useAdminGuruWali.ts karena ini murni file/storage, tidak menyentuh profiles field lain atau
// penentuan Wali Kelas (yang tetap dari wali_kelas_assignment, tidak disentuh hook ini sama sekali).
export function useAdminTandaTanganGuru() {
  const [signedUrlByGuruId, setSignedUrlByGuruId] = useState<Record<string, string | null>>({})
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  const fetchPreview = async (guruId: string) => {
    setLoadingPreview(true); setErrorMsg('')
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sesi login sudah berakhir. Silakan login kembali.')
      const res = await fetchWithAuth(`/api/admin/guru-tanda-tangan?guru_id=${encodeURIComponent(guruId)}`, token)
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Gagal memuat preview tanda tangan.')
      setSignedUrlByGuruId(prev => ({ ...prev, [guruId]: result.signedUrl || null }))
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Gagal memuat preview tanda tangan.')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleUpload = async (guruId: string, file: File) => {
    setUploading(true); setErrorMsg('')
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sesi login sudah berakhir. Silakan login kembali.')
      const formData = new FormData()
      formData.append('guru_id', guruId)
      formData.append('file', file)
      const res = await fetchWithAuth('/api/admin/guru-tanda-tangan', token, { method: 'POST', body: formData })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Gagal mengunggah tanda tangan.')
      await fetchPreview(guruId)
      return true
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Gagal mengunggah tanda tangan.')
      return false
    } finally {
      setUploading(false)
    }
  }

  const handleHapus = async (guruId: string) => {
    if (!confirm('Yakin hapus tanda tangan digital guru ini?')) return
    setUploading(true); setErrorMsg('')
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sesi login sudah berakhir. Silakan login kembali.')
      const res = await fetchWithAuth(`/api/admin/guru-tanda-tangan?guru_id=${encodeURIComponent(guruId)}`, token, { method: 'DELETE' })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Gagal menghapus tanda tangan.')
      setSignedUrlByGuruId(prev => ({ ...prev, [guruId]: null }))
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Gagal menghapus tanda tangan.')
    } finally {
      setUploading(false)
    }
  }

  return { signedUrlByGuruId, loadingPreview, uploading, errorMsg, setErrorMsg, fetchPreview, handleUpload, handleHapus }
}
