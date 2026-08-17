import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../../lib/serverAuth'
import { validasiDuaSlotGuru, type ProfilGuruRingkas, type StatusValidasiGuru } from '../../../lib/wingAkses'

// Tahap 9L -- CREATE santri + assignment Guru Hafalan resmi, server-side.
// BEDA dari useAdminSantri.ts lama (insert langsung dari browser lewat
// RLS): endpoint ini WAJIB dipakai untuk CREATE karena harus menegakkan
// urutan penulisan yang tidak boleh dilanggar (desain Tahap 9K):
//   1. INSERT santri -- guru_id/guru_id_2 SELALU null di langkah ini.
//   2. Kalau Guru 1/Guru 2 dipilih: kunci periode aktif (harus tepat 1,
//      dibaca langsung dari DB, TIDAK PERNAH ditebak/fallback diam-diam).
//   3. Validasi role + wing per slot dari data yang BARU dibaca server
//      (tidak percaya klaim guru_id/wing dari client).
//   4. INSERT penugasan_hafalan untuk slot yang valid.
//   5. HANYA slot yang benar-benar berhasil di-insert yang dicerminkan ke
//      santri.guru_id/guru_id_2 (legacy) -- legacy TIDAK PERNAH ditulis
//      independen, TIDAK PERNAH lebih dulu dari assignment resmi. Slot
//      yang gagal/dilewati membuat legacy slot itu tetap null, DILAPORKAN
//      eksplisit ke Admin, tidak pernah disembunyikan.
// Mapping wing memakai bisaAksesJenisKelas (app/lib/wingAkses.ts) lewat
// validasiDuaSlotGuru -- SATU-SATUNYA definisi wing produksi, tidak ada
// mapping baru dibuat di file ini.

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return null
}

type StatusSlotResponse = StatusValidasiGuru | 'BERHASIL' | 'GAGAL_INSERT'

type SlotHasil = {
  slot: 1 | 2
  guruId: string
  namaGuru: string | null
  status: StatusSlotResponse
  pesan: string
}

const PESAN_STATUS: Record<Exclude<StatusSlotResponse, 'BERHASIL' | 'VALID'>, string> = {
  GURU_TIDAK_DITEMUKAN: 'Data guru tidak ditemukan.',
  BUKAN_ROLE_GURU: 'Akun ini bukan akun guru.',
  LINTAS_WING: 'Guru ini tidak boleh mengajar kelompok santri ini (beda wing).',
  GAGAL_INSERT: 'Gagal menyimpan assignment.',
}

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

  const nama = str(body.nama)
  const jenjang = str(body.jenjang)
  const kelasNum = num(body.kelas_num)
  const jenisKelas = str(body.jenis_kelas) || 'banin'

  if (!nama || !jenjang || kelasNum === null || !Number.isInteger(kelasNum)) {
    return responseError('Nama, jenjang, dan kelas wajib diisi', 400)
  }

  const guruId = str(body.guru_id)
  const guruId2 = str(body.guru_id_2)

  if (guruId && !isUuid(guruId)) return responseError('Guru 1 tidak valid', 400)
  if (guruId2 && !isUuid(guruId2)) return responseError('Guru 2 tidak valid', 400)
  if (guruId && guruId2 && guruId === guruId2) {
    return responseError('Guru 1 dan Guru 2 tidak boleh guru yang sama', 400)
  }

  // ===== 1. CREATE santri -- legacy SELALU null di sini. =====
  const { data: santriBaru, error: santriError } = await adminClient
    .from('santri')
    .insert({
      nama, jenjang, kelas_num: kelasNum,
      kelas: str(body.kelas),
      jenis_kelas: jenisKelas,
      guru_id: null, guru_id_2: null,
      wali_id: str(body.wali_id),
      total_hafalan_juz: num(body.total_hafalan_juz) ?? 0,
      surah_terakhir_nomor: num(body.surah_terakhir_nomor),
      ayat_terakhir: num(body.ayat_terakhir),
      nik: str(body.nik),
      nisn: str(body.nisn),
      tempat_lahir: str(body.tempat_lahir),
      tanggal_lahir: str(body.tanggal_lahir),
      alamat: str(body.alamat),
      status: str(body.status) || 'aktif',
      tahun_lulus: str(body.tahun_lulus),
      keterangan_keluar: str(body.keterangan_keluar),
    })
    .select('id, nama, jenjang, kelas_num, jenis_kelas')
    .single()

  if (santriError || !santriBaru) {
    return responseError(santriError?.message || 'Gagal membuat santri', 500)
  }

  if (!guruId && !guruId2) {
    return NextResponse.json({ success: true, santri: santriBaru, assignment: { attempted: false, alasan: null, slots: [] } })
  }

  // ===== 2. Kunci periode aktif -- HARUS tepat 1, tidak pernah ditebak. =====
  const { data: periodeAktifRows, error: periodeError } = await adminClient
    .from('periode_akademik')
    .select('id')
    .eq('is_aktif', true)

  if (periodeError || !periodeAktifRows || periodeAktifRows.length !== 1) {
    const alasan = periodeError
      ? 'Gagal memeriksa periode akademik aktif.'
      : periodeAktifRows.length === 0
        ? 'Tidak ada periode akademik aktif. Tugaskan Guru Hafalan manual lewat menu Penugasan Guru setelah periode aktif ditentukan.'
        : 'Ada lebih dari satu periode akademik aktif (konfigurasi ambigu). Tugaskan Guru Hafalan manual lewat menu Penugasan Guru.'
    return NextResponse.json({
      success: true, santri: santriBaru,
      assignment: { attempted: false, alasan, slots: [] },
    })
  }

  const periodeId = periodeAktifRows[0].id

  // ===== 3. Validasi role + wing per slot dari data server terbaru. =====
  const guruIds = [guruId, guruId2].filter((id): id is string => !!id)
  const { data: profilRows, error: profilError } = await adminClient
    .from('profiles')
    .select('id, nama, role, jenis_kelas')
    .in('id', guruIds)

  if (profilError) {
    return NextResponse.json({
      success: true, santri: santriBaru,
      assignment: { attempted: false, alasan: 'Gagal memverifikasi data guru.', slots: [] },
    })
  }

  const profilList = profilRows || []
  const namaGuruMap = new Map(profilList.map(p => [p.id as string, p.nama as string | null]))
  const profilMap = new Map<string, ProfilGuruRingkas>(
    profilList.map(p => [p.id as string, { id: p.id as string, role: p.role as string | null, jenis_kelas: p.jenis_kelas as string | null }])
  )

  const validasi = validasiDuaSlotGuru(guruId, guruId2, profilMap, santriBaru.jenis_kelas)
  const slotsInput: { slot: 1 | 2, guruId: string, status: StatusValidasiGuru }[] = []
  if (validasi.slot1) slotsInput.push({ slot: 1, guruId: validasi.slot1.guruId, status: validasi.slot1.status })
  if (validasi.slot2) slotsInput.push({ slot: 2, guruId: validasi.slot2.guruId, status: validasi.slot2.status })

  const hasilSlot: SlotHasil[] = []
  const legacyUpdate: Record<string, unknown> = {}

  for (const { slot, guruId: gid, status } of slotsInput) {
    const namaGuru = namaGuruMap.get(gid) || null

    if (status !== 'VALID') {
      hasilSlot.push({ slot, guruId: gid, namaGuru, status, pesan: PESAN_STATUS[status] })
      continue
    }

    const { error: insertError } = await adminClient.from('penugasan_hafalan').insert({
      guru_id: gid, santri_id: santriBaru.id, periode_id: periodeId, is_aktif: true,
    })

    if (insertError) {
      hasilSlot.push({ slot, guruId: gid, namaGuru, status: 'GAGAL_INSERT', pesan: insertError.message })
      continue
    }

    hasilSlot.push({ slot, guruId: gid, namaGuru, status: 'BERHASIL', pesan: 'Assignment resmi berhasil dibuat.' })
    if (slot === 1) legacyUpdate.guru_id = gid
    else legacyUpdate.guru_id_2 = gid
  }

  // ===== 4. Mirror legacy HANYA dari slot yang benar-benar berhasil. =====
  if (Object.keys(legacyUpdate).length > 0) {
    const { error: mirrorError } = await adminClient.from('santri').update(legacyUpdate).eq('id', santriBaru.id)
    if (mirrorError) {
      hasilSlot.forEach(h => {
        if (h.status === 'BERHASIL') h.pesan += ' (Peringatan: assignment resmi tersimpan, tapi gagal mencerminkan ke data legacy.)'
      })
    }
  }

  return NextResponse.json({
    success: true,
    santri: santriBaru,
    assignment: { attempted: true, periodeId, slots: hasilSlot },
  })
}
