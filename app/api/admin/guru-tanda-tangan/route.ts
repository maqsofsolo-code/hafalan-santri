import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../../lib/serverAuth'
import {
  BUCKET_TANDA_TANGAN_GURU,
  TIPE_TANDA_TANGAN_DIIZINKAN,
  UKURAN_TANDA_TANGAN_MAKS_BYTES,
  pathTandaTanganGuru,
} from '../../../lib/tandaTanganGuru'

// Admin-only CRUD file tanda tangan digital guru (Tahap 9P Bagian E/J). Semua akses storage lewat
// service role -- browser tidak pernah menyentuh Supabase Storage langsung (bucket private, tanpa
// policy storage.objects apa pun, lihat migration 20260822140000). Tanda tangan HANYA milik guru
// (path disimpan di profiles.tanda_tangan_path) -- endpoint ini TIDAK menyentuh wali_kelas_assignment
// atau penentuan siapa Wali Kelas sama sekali (itu tetap murni di app/api/admin/nilai-ujian-excel).

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function pastikanGuru(adminClient: ReturnType<typeof createServiceRoleClient>, guruId: string) {
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, role, tanda_tangan_path')
    .eq('id', guruId)
    .maybeSingle()
  if (error) return { error: 'Gagal memuat data guru.' as const }
  if (!data || data.role !== 'guru') return { error: 'Guru tidak ditemukan.' as const }
  return { data }
}

// GET: signed URL preview (kadaluwarsa 1 jam -- cukup untuk sesi Admin membuka form Edit Guru,
// tidak disimpan permanen di mana pun karena bucket private).
export async function GET(request: Request) {
  const auth = await authorize(request, ['admin'])
  if (auth.response) return auth.response
  const adminClient = createServiceRoleClient()

  const guruId = new URL(request.url).searchParams.get('guru_id') || ''
  if (!guruId) return responseError('guru_id wajib diisi', 400)

  const guru = await pastikanGuru(adminClient, guruId)
  if (guru.error) return responseError(guru.error, 404)
  if (!guru.data.tanda_tangan_path) return NextResponse.json({ signedUrl: null })

  const { data: signed, error: signedError } = await adminClient.storage
    .from(BUCKET_TANDA_TANGAN_GURU)
    .createSignedUrl(guru.data.tanda_tangan_path, 3600)
  if (signedError || !signed) return responseError('Gagal membuat URL preview tanda tangan.', 500)

  return NextResponse.json({ signedUrl: signed.signedUrl })
}

// POST: upload/ganti. multipart/form-data { guru_id, file }. File lama (kalau ada, termasuk yang
// ekstensinya berbeda dari file baru) dihapus dulu SEBELUM upload baru -- supaya tidak ada file
// yatim tertinggal di storage saat guru mengganti PNG dengan JPEG atau sebaliknya.
export async function POST(request: Request) {
  const auth = await authorize(request, ['admin'])
  if (auth.response) return auth.response
  const adminClient = createServiceRoleClient()

  const formData = await request.formData()
  const guruId = String(formData.get('guru_id') || '')
  const file = formData.get('file') as File | null
  if (!guruId) return responseError('guru_id wajib diisi', 400)
  if (!file) return responseError('File tanda tangan wajib diunggah.', 400)

  const ekstensi = TIPE_TANDA_TANGAN_DIIZINKAN[file.type]
  if (!ekstensi) return responseError('Format file harus PNG atau JPEG.', 400)
  if (file.size > UKURAN_TANDA_TANGAN_MAKS_BYTES) {
    return responseError('Ukuran file maksimal 1 MB.', 400)
  }

  const guru = await pastikanGuru(adminClient, guruId)
  if (guru.error) return responseError(guru.error, 404)

  if (guru.data.tanda_tangan_path) {
    await adminClient.storage.from(BUCKET_TANDA_TANGAN_GURU).remove([guru.data.tanda_tangan_path])
  }

  const path = pathTandaTanganGuru(guruId, ekstensi)
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await adminClient.storage
    .from(BUCKET_TANDA_TANGAN_GURU)
    .upload(path, buffer, { contentType: file.type, upsert: true })
  if (uploadError) return responseError('Gagal mengunggah tanda tangan: ' + uploadError.message, 500)

  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ tanda_tangan_path: path })
    .eq('id', guruId)
  if (updateError) {
    // Rollback file yang sudah terlanjur terupload supaya tidak ada file storage yang tidak
    // tercermin di profiles.tanda_tangan_path (konsisten, bukan desync diam-diam).
    await adminClient.storage.from(BUCKET_TANDA_TANGAN_GURU).remove([path])
    return responseError('Gagal menyimpan path tanda tangan: ' + updateError.message, 500)
  }

  return NextResponse.json({ path })
}

// DELETE: hapus tanda tangan guru. ?guru_id=...
export async function DELETE(request: Request) {
  const auth = await authorize(request, ['admin'])
  if (auth.response) return auth.response
  const adminClient = createServiceRoleClient()

  const guruId = new URL(request.url).searchParams.get('guru_id') || ''
  if (!guruId) return responseError('guru_id wajib diisi', 400)

  const guru = await pastikanGuru(adminClient, guruId)
  if (guru.error) return responseError(guru.error, 404)
  if (!guru.data.tanda_tangan_path) return NextResponse.json({ ok: true })

  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ tanda_tangan_path: null })
    .eq('id', guruId)
  if (updateError) return responseError('Gagal menghapus tanda tangan: ' + updateError.message, 500)

  // Hapus file storage SETELAH profiles berhasil di-update -- kalau remove() gagal di sini,
  // profiles sudah benar (tanda_tangan_path null) dan file lama jadi file yatim yang aman diabaikan
  // (tidak pernah dirujuk lagi), bukan sebaliknya (file terhapus tapi profiles masih menunjuk path
  // yang sudah tidak ada -- itu yang harus dihindari).
  await adminClient.storage.from(BUCKET_TANDA_TANGAN_GURU).remove([guru.data.tanda_tangan_path])

  return NextResponse.json({ ok: true })
}
