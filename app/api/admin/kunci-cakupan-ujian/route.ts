import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../../lib/serverAuth'
import { resolveSantriExamScopes, type SantriScope } from '../../../lib/adminNilaiUjian'

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * GET: Ambil status kunci cakupan ujian per kalender_id atau seluruh kalender ujian
 */
export async function GET(request: Request) {
  const auth = await authorize(request, ['admin', 'kepsek'])
  if ('response' in auth) return auth.response
  const adminClient = createServiceRoleClient()

  const url = new URL(request.url)
  const kalenderId = url.searchParams.get('kalender_id')

  try {
    if (kalenderId) {
      const { count, error } = await adminClient
        .from('santri_hafalan_exam_snapshot')
        .select('id', { count: 'exact', head: true })
        .eq('kalender_id', kalenderId)

      if (error) {
        // Jika tabel belum di-migrate, return count 0 secara graceful
        return NextResponse.json({ success: true, count: 0, isLocked: false })
      }
      const totalCount = count ?? 0
      return NextResponse.json({
        success: true,
        count: totalCount,
        isLocked: totalCount > 0,
      })
    }

    // Query seluruh count per kalender_id
    const { data, error } = await adminClient
      .from('santri_hafalan_exam_snapshot')
      .select('kalender_id')

    if (error || !data) {
      return NextResponse.json({ success: true, counts: {} })
    }

    const counts: Record<string, number> = {}
    data.forEach((row: { kalender_id: string }) => {
      counts[row.kalender_id] = (counts[row.kalender_id] || 0) + 1
    })

    return NextResponse.json({ success: true, counts })
  } catch {
    return NextResponse.json({ success: true, count: 0, counts: {}, isLocked: false })
  }
}

/**
 * POST: Aksi Admin "Kunci Cakupan Ujian"
 * - Semester Gasal 2026/2027: Gunakan posisi rekonstruksi per 1 Agustus 2026
 * - Future Exam: Gunakan posisi live/current santri pada saat tombol ditekan
 * - Disimpan dengan ON CONFLICT (santri_id, kalender_id) DO NOTHING (idempotent, tidak overwrite)
 */
export async function POST(request: Request) {
  const auth = await authorize(request, ['admin'])
  if ('response' in auth) return auth.response
  const adminClient = createServiceRoleClient()

  let body: { kalender_id?: string }
  try {
    body = await request.json()
  } catch {
    return responseError('Body request tidak valid (JSON diharapkan)', 400)
  }

  const kalenderId = body.kalender_id
  if (!kalenderId) {
    return responseError('kalender_id wajib disertakan', 400)
  }

  const { data: kalender, error: kalenderError } = await adminClient
    .from('kalender_akademik')
    .select('id, nama, tipe, tanggal_mulai')
    .eq('id', kalenderId)
    .maybeSingle()

  if (kalenderError) return responseError('Gagal memuat data kalender akademik', 500)
  if (!kalender) return responseError('Periode kalender akademik tidak ditemukan', 404)
  if (kalender.tipe !== 'mid_semester' && kalender.tipe !== 'semester') {
    return responseError('Periode kalender bukan periode ujian (mid_semester / semester)', 400)
  }

  // Ambil seluruh santri aktif
  const { data: santriRows, error: santriError } = await adminClient
    .from('santri')
    .select('id, nama, kelas, kelas_num, jenjang, jenis_kelas, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
    .eq('status', 'aktif')
    .order('nama', { ascending: true })

  if (santriError) return responseError('Gagal memuat data santri', 500)
  const santriList = (santriRows || []) as SantriScope[]

  if (santriList.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'Tidak ada santri aktif untuk dikunci cakupannya',
      totalSantri: 0,
      terkunci: 0,
    })
  }

  const isGasal2026 = kalenderId === '1c9739bc-7924-4d8c-9b2b-75020eb914ea' || kalender.tanggal_mulai === '2026-08-01'
  let scopesToSnapshot: SantriScope[] = []

  if (isGasal2026) {
    // Transisi Gasal: Rekonstruksi historis per 1 Agustus 2026 jika belum ada snapshot
    const res = await resolveSantriExamScopes(adminClient, santriList, kalenderId, kalender.tanggal_mulai)
    scopesToSnapshot = res.scopes
  } else {
    // Future Exam: Kunci cakupan mengambil posisi live/current pada detik admin menekan tombol
    scopesToSnapshot = santriList
  }

  // Bentuk payload snapshot
  const snapshotPayload = scopesToSnapshot.map(s => ({
    santri_id: s.id,
    kalender_id: kalenderId,
    surah_terakhir_nomor: s.surah_terakhir_nomor,
    ayat_terakhir: s.ayat_terakhir,
    total_hafalan_juz: s.total_hafalan_juz,
  }))

  const { data: inserted, error: insertError } = await adminClient
    .from('santri_hafalan_exam_snapshot')
    .upsert(snapshotPayload, { onConflict: 'santri_id,kalender_id', ignoreDuplicates: true })
    .select('id')

  if (insertError) {
    return responseError(`Gagal menyimpan snapshot cakupan ujian: ${insertError.message}`, 500)
  }

  return NextResponse.json({
    success: true,
    message: `Cakupan ujian berhasil dikunci untuk ${inserted?.length ?? snapshotPayload.length} santri aktif`,
    kalender: {
      id: kalender.id,
      nama: kalender.nama,
      tipe: kalender.tipe,
    },
    totalSantri: santriList.length,
    terkunci: inserted?.length ?? snapshotPayload.length,
  })
}
