import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../../lib/serverAuth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const auth = await authorize(request, ['admin', 'guru'])
  if ('response' in auth) return auth.response

  const serviceClient = createServiceRoleClient()

  // 1. Ambil seluruh periode akademik yang is_aktif=true
  const { data: activePeriods, error: periodError } = await serviceClient
    .from('periode_akademik')
    .select('id, tahun_ajaran, semester, tanggal_mulai, tanggal_selesai, is_aktif, rapot_input_dibuka')
    .eq('is_aktif', true)

  if (periodError) {
    return NextResponse.json({ error: 'Gagal memuat periode akademik: ' + periodError.message }, { status: 500 })
  }

  // Fail-closed jika periode aktif bukan tepat 1
  if (!activePeriods || activePeriods.length === 0) {
    return NextResponse.json({
      error: 'Tidak ada periode akademik aktif. Hubungi Admin untuk mengaktifkan periode akademik.'
    }, { status: 400 })
  }

  if (activePeriods.length > 1) {
    return NextResponse.json({
      error: 'Terdeteksi lebih dari satu periode akademik aktif (' + activePeriods.length + ' periode). Hubungi Admin untuk menonaktifkan periode yang tidak sesuai.'
    }, { status: 500 })
  }

  const periode = activePeriods[0]

  // 2. Jika Admin, return context admin
  if (auth.role === 'admin') {
    return NextResponse.json({
      periode,
      isAdmin: true,
      assignments: [],
    })
  }

  // 3. Jika Guru, ambil seluruh wali_kelas_assignment aktif untuk guru ini pada periode aktif
  const { data: assignments, error: assignError } = await serviceClient
    .from('wali_kelas_assignment')
    .select('id, jenjang, kelas_num, jenis_kelas, is_aktif')
    .eq('guru_id', auth.userId)
    .eq('periode_id', periode.id)
    .eq('is_aktif', true)
    .order('kelas_num', { ascending: true })

  if (assignError) {
    return NextResponse.json({ error: 'Gagal memuat penugasan wali kelas: ' + assignError.message }, { status: 500 })
  }

  return NextResponse.json({
    periode,
    isAdmin: false,
    assignments: assignments || [],
  })
}
