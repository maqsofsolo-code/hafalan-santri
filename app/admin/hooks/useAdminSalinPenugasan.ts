'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { RingkasanHafalan, RingkasanWali, HasilEksekusiHafalan, HasilEksekusiWali } from '../../lib/salinPenugasan'

// Tahap 9H -- "Salin Penugasan dari Periode Sebelumnya". BEDA dari
// useAdminPenugasanGuru.ts (insert langsung dari browser lewat RLS): hook
// ini SELALU lewat API server (/api/admin/salin-penugasan) karena logic
// "apa yang disalin/dilewati" harus satu sumber kebenaran server-side yang
// sama persis dipakai preview maupun eksekusi (app/lib/salinPenugasan.ts)
// -- tidak dihitung ulang di client.

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

export function useAdminSalinPenugasan() {
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewGuruHafalan, setPreviewGuruHafalan] = useState<RingkasanHafalan | null>(null)
  const [previewWaliKelas, setPreviewWaliKelas] = useState<RingkasanWali | null>(null)

  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [hasilGuruHafalan, setHasilGuruHafalan] = useState<HasilEksekusiHafalan | null>(null)
  const [hasilWaliKelas, setHasilWaliKelas] = useState<HasilEksekusiWali | null>(null)

  const resetPreview = () => { setPreviewGuruHafalan(null); setPreviewWaliKelas(null); setPreviewError('') }
  const resetHasil = () => { setHasilGuruHafalan(null); setHasilWaliKelas(null); setApplyError('') }

  const muatPreview = async (sourcePeriodeId: string, targetPeriodeId: string) => {
    resetPreview()
    if (!sourcePeriodeId || !targetPeriodeId || sourcePeriodeId === targetPeriodeId) return
    setLoadingPreview(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Sesi login sudah berakhir. Silakan login kembali.')
      const params = new URLSearchParams({ source_periode_id: sourcePeriodeId, target_periode_id: targetPeriodeId })
      const response = await fetch(`/api/admin/salin-penugasan?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Gagal memuat preview salin penugasan.')
      setPreviewGuruHafalan(result.guruHafalan)
      setPreviewWaliKelas(result.waliKelas)
    } catch (fetchError) {
      setPreviewError(fetchError instanceof Error ? fetchError.message : 'Gagal memuat preview salin penugasan.')
    } finally {
      setLoadingPreview(false)
    }
  }

  const jalankanSalin = async (sourcePeriodeId: string, targetPeriodeId: string): Promise<boolean> => {
    resetHasil()
    setApplying(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Sesi login sudah berakhir. Silakan login kembali.')
      const response = await fetch('/api/admin/salin-penugasan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_periode_id: sourcePeriodeId, target_periode_id: targetPeriodeId }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Gagal menyalin penugasan.')
      setHasilGuruHafalan(result.guruHafalan)
      setHasilWaliKelas(result.waliKelas)
      return true
    } catch (fetchError) {
      setApplyError(fetchError instanceof Error ? fetchError.message : 'Gagal menyalin penugasan.')
      return false
    } finally {
      setApplying(false)
    }
  }

  return {
    loadingPreview, previewError, previewGuruHafalan, previewWaliKelas, muatPreview, resetPreview,
    applying, applyError, hasilGuruHafalan, hasilWaliKelas, jalankanSalin, resetHasil,
  }
}
