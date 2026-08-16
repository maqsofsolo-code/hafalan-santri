import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../../lib/serverAuth'
import { ambilRencanaSalinPenugasan, eksekusiSalinPenugasan, ringkasanHafalan, ringkasanWaliKelas } from '../../../lib/salinPenugasan'

// Tahap 9H -- "Salin Penugasan dari Periode Sebelumnya". Mutation server-side
// (BEDA dari useAdminPenugasanGuru.ts lain yang insert langsung dari browser
// lewat RLS) karena logic "apa yang disalin/dilewati" harus divalidasi ulang
// dari DB langsung di server, bukan dipercaya dari payload client -- lihat
// app/lib/salinPenugasan.ts untuk SATU implementasi rule yang dipakai baik
// GET (preview) maupun POST (eksekusi) di sini.
//
// TIDAK menyentuh santri.guru_id/guru_id_2 atau profiles.is_wali_kelas/
// wali_kelas_num/wali_kelas_jenis (legacy) -- hanya membaca/menulis
// penugasan_hafalan & wali_kelas_assignment. TIDAK menyentuh Guru Pengganti.

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function ambilPeriode(adminClient: ReturnType<typeof createServiceRoleClient>, id: string) {
  const { data, error } = await adminClient
    .from('periode_akademik')
    .select('id, tahun_ajaran, semester')
    .eq('id', id)
    .maybeSingle()
  if (error) return null
  return data
}

// GET: preview -- SELALU read-only, tidak pernah insert. Query params:
// source_periode_id, target_periode_id.
export async function GET(request: Request) {
  const auth = await authorize(request, ['admin'])
  if (auth.response) return auth.response
  const adminClient = createServiceRoleClient()

  const url = new URL(request.url)
  const sourceId = url.searchParams.get('source_periode_id')
  const targetId = url.searchParams.get('target_periode_id')

  if (!isUuid(sourceId) || !isUuid(targetId)) return responseError('Periode sumber/target tidak valid', 400)
  if (sourceId === targetId) return responseError('Periode sumber dan target tidak boleh sama', 400)

  const [sourcePeriode, targetPeriode] = await Promise.all([
    ambilPeriode(adminClient, sourceId),
    ambilPeriode(adminClient, targetId),
  ])
  if (!sourcePeriode) return responseError('Periode sumber tidak ditemukan', 404)
  if (!targetPeriode) return responseError('Periode target tidak ditemukan', 404)

  const rencana = await ambilRencanaSalinPenugasan(adminClient, sourceId, targetId)
  if ('error' in rencana) return responseError(rencana.error, 500)

  return NextResponse.json({
    success: true,
    sourcePeriode,
    targetPeriode,
    guruHafalan: ringkasanHafalan(rencana.guruHafalan),
    waliKelas: ringkasanWaliKelas(rencana.waliKelas),
  }, { headers: { 'Cache-Control': 'no-store' } })
}

// POST: eksekusi -- membaca ulang state DB TERKINI (bukan memakai hasil GET
// sebelumnya yang mungkin sudah basi) lewat fungsi klasifikasi yang SAMA
// PERSIS dengan GET, lalu benar-benar INSERT baris berencana AKAN_INSERT.
export async function POST(request: Request) {
  const auth = await authorize(request, ['admin'])
  if (auth.response) return auth.response
  const adminClient = createServiceRoleClient()

  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return responseError('Data tidak valid', 400)
  }

  const sourceId = body.source_periode_id
  const targetId = body.target_periode_id

  if (!isUuid(sourceId) || !isUuid(targetId)) return responseError('Periode sumber/target tidak valid', 400)
  if (sourceId === targetId) return responseError('Periode sumber dan target tidak boleh sama', 400)

  const [sourcePeriode, targetPeriode] = await Promise.all([
    ambilPeriode(adminClient, sourceId),
    ambilPeriode(adminClient, targetId),
  ])
  if (!sourcePeriode) return responseError('Periode sumber tidak ditemukan', 404)
  if (!targetPeriode) return responseError('Periode target tidak ditemukan', 404)

  const rencana = await ambilRencanaSalinPenugasan(adminClient, sourceId, targetId)
  if ('error' in rencana) return responseError(rencana.error, 500)

  const hasil = await eksekusiSalinPenugasan(adminClient, targetId, rencana.guruHafalan, rencana.waliKelas)

  return NextResponse.json({ success: true, ...hasil })
}
