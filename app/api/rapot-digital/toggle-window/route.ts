import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../../lib/serverAuth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  const auth = await authorize(request, ['admin'])
  if ('response' in auth) return auth.response

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload JSON tidak valid' }, { status: 400 })
  }

  const { periode_id, rapot_input_dibuka } = body
  if (typeof rapot_input_dibuka !== 'boolean') {
    return NextResponse.json({ error: 'Parameter rapot_input_dibuka harus bernilai boolean' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()

  let targetId = periode_id
  if (!targetId) {
    const { data: activePeriods } = await serviceClient
      .from('periode_akademik')
      .select('id')
      .eq('is_aktif', true)

    if (!activePeriods || activePeriods.length !== 1) {
      return NextResponse.json({
        error: 'Tidak dapat menentukan periode target secara otomatis (periode aktif bukan tepat 1).'
      }, { status: 400 })
    }
    targetId = activePeriods[0].id
  }

  const { data, error } = await serviceClient
    .from('periode_akademik')
    .update({ rapot_input_dibuka })
    .eq('id', targetId)
    .select('id, tahun_ajaran, semester, rapot_input_dibuka, is_aktif')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Gagal memperbarui status input rapot: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, periode: data })
}
