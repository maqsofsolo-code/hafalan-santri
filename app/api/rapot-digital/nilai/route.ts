import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../../lib/serverAuth'
import { validateNilaiRaw, ALL_MAPEL_ULA_KEYS } from '../../../lib/rapotDigital'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const auth = await authorize(request, ['admin', 'guru'])
  if ('response' in auth) return auth.response

  const { searchParams } = new URL(request.url)
  const santriId = searchParams.get('santri_id')
  const periodeId = searchParams.get('periode_id')

  if (!santriId || !periodeId) {
    return NextResponse.json({ error: 'Parameter santri_id dan periode_id wajib ada' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()

  // 1. Verifikasi periode akademik
  const { data: periode, error: periodeError } = await serviceClient
    .from('periode_akademik')
    .select('id, tahun_ajaran, semester, tanggal_mulai, tanggal_selesai, is_aktif, rapot_input_dibuka')
    .eq('id', periodeId)
    .single()

  if (periodeError || !periode) {
    return NextResponse.json({ error: 'Periode akademik tidak ditemukan' }, { status: 404 })
  }

  // Hard-close check untuk role Guru
  if (auth.role === 'guru' && !periode.rapot_input_dibuka) {
    return NextResponse.json({
      error: 'Input nilai rapot sedang ditutup oleh Admin.'
    }, { status: 403 })
  }

  // 2. Ambil santri untuk validasi akses
  const { data: santri, error: santriError } = await serviceClient
    .from('santri')
    .select('id, nama, kelas, kelas_num, jenjang, jenis_kelas, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
    .eq('id', santriId)
    .single()

  if (santriError || !santri) {
    return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 })
  }

  // 3. Jika Guru, verifikasi penugasan wali kelas
  if (auth.role === 'guru') {
    const { data: assignment } = await serviceClient
      .from('wali_kelas_assignment')
      .select('id')
      .eq('guru_id', auth.userId)
      .eq('periode_id', periodeId)
      .eq('kelas_num', santri.kelas_num)
      .eq('jenis_kelas', santri.jenis_kelas)
      .eq('is_aktif', true)
      .maybeSingle()

    if (!assignment) {
      return NextResponse.json({ error: 'Akses ditolak: Anda bukan Wali Kelas untuk santri ini.' }, { status: 403 })
    }
  }

  const [nilaiRes, absensiMap, hifzhMap] = await Promise.all([
    serviceClient
      .from('nilai_rapot')
      .select('*')
      .eq('santri_id', santriId)
      .eq('periode_id', periodeId)
      .maybeSingle(),
    import('../../../lib/absensiRapot').then(m =>
      m.hitungKetidakhadiranSantri(serviceClient, [santriId], periode.tanggal_mulai, periode.tanggal_selesai)
    ),
    import('../../../lib/hifzhRapot').then(m =>
      m.muatNilaiHifzhFinalKelas(serviceClient, [santri], periode)
    ),
  ])

  if (nilaiRes.error) {
    return NextResponse.json({ error: 'Gagal memuat nilai rapot: ' + nilaiRes.error.message }, { status: 500 })
  }

  const absensi = absensiMap.get(santriId) || { hadir_sakit: 0, hadir_izin: 0, hadir_alpha: 0 }
  const hifzh = hifzhMap.get(santriId) || { kelancaran: null, tajwid: null, keterangan_hafalan: santri.total_hafalan_juz ? `${santri.total_hafalan_juz} Juz` : '-' }

  const nilai = nilaiRes.data
    ? {
        ...nilaiRes.data,
        hadir_sakit: absensi.hadir_sakit,
        hadir_izin: absensi.hadir_izin,
        hadir_alpha: absensi.hadir_alpha,
        kelancaran: hifzh.kelancaran,
        tajwid: hifzh.tajwid,
        keterangan_hafalan: hifzh.keterangan_hafalan,
      }
    : null

  return NextResponse.json({ santri, nilai, absensi_otomatis: absensi, hifzh_otomatis: hifzh })
}

export async function POST(request: Request) {
  const auth = await authorize(request, ['admin', 'guru'])
  if ('response' in auth) return auth.response

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload JSON tidak valid' }, { status: 400 })
  }

  const { santri_id: santriId, periode_id: periodeId, nilai } = body

  if (!santriId || !periodeId || !nilai) {
    return NextResponse.json({ error: 'Parameter santri_id, periode_id, dan nilai wajib ada' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()

  // 1. Ambil periode akademik target
  const { data: periode, error: periodeError } = await serviceClient
    .from('periode_akademik')
    .select('id, tahun_ajaran, semester, tanggal_mulai, tanggal_selesai, is_aktif, rapot_input_dibuka')
    .eq('id', periodeId)
    .single()

  if (periodeError || !periode) {
    return NextResponse.json({ error: 'Periode akademik tidak ditemukan' }, { status: 404 })
  }

  // 2. Ambil data asli santri untuk otorisasi & snapshot
  const { data: santri, error: santriError } = await serviceClient
    .from('santri')
    .select('id, nama, kelas, kelas_num, jenjang, jenis_kelas, status, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
    .eq('id', santriId)
    .single()

  if (santriError || !santri) {
    return NextResponse.json({ error: 'Santri target tidak ditemukan' }, { status: 404 })
  }

  // 3. Otorisasi spesifik role
  if (auth.role === 'guru') {
    // A. Cek window input nilai
    if (!periode.rapot_input_dibuka) {
      return NextResponse.json({
        error: 'Input nilai rapot sedang ditutup oleh Admin.'
      }, { status: 403 })
    }

    // B. Cek penugasan Wali Kelas resmi untuk santri ini
    const { data: assignment, error: assignError } = await serviceClient
      .from('wali_kelas_assignment')
      .select('id')
      .eq('guru_id', auth.userId)
      .eq('periode_id', periodeId)
      .eq('kelas_num', santri.kelas_num)
      .eq('jenis_kelas', santri.jenis_kelas)
      .eq('is_aktif', true)
      .maybeSingle()

    if (assignError) {
      return NextResponse.json({ error: 'Gagal memverifikasi penugasan wali kelas: ' + assignError.message }, { status: 500 })
    }

    if (!assignment) {
      return NextResponse.json({
        error: 'Akses ditolak: Anda bukan Wali Kelas untuk kelas santri ini.'
      }, { status: 403 })
    }

    // C. Jenjang Wustho / Ulya belum final
    if (santri.jenjang !== 'ula') {
      return NextResponse.json({
        error: 'Daftar mata pelajaran jenjang ini belum dikonfigurasi. Belum dapat menyimpan nilai akademik.'
      }, { status: 400 })
    }
  } else if (auth.role === 'admin') {
    // Admin boleh simpan meski rapot_input_dibuka=false
    if (santri.jenjang !== 'ula') {
      return NextResponse.json({
        error: 'Daftar mata pelajaran jenjang ini belum dikonfigurasi. Belum dapat menyimpan nilai akademik.'
      }, { status: 400 })
    }
  }

  // 4. Validasi nilai mentah 10 mapel Ula (harus integer 0-100 atau null)
  const mapelData: Record<string, number | null> = {}
  for (const mapelKey of ALL_MAPEL_ULA_KEYS) {
    const rawVal = nilai[mapelKey]
    const validation = validateNilaiRaw(rawVal)
    if (!validation.valid) {
      return NextResponse.json({
        error: `Nilai ${mapelKey} tidak valid: ${validation.error}`
      }, { status: 400 })
    }
    mapelData[mapelKey] = validation.value
  }

  // Validasi Kepribadian ('A' | 'B' | 'C')
  const validHuruf = ['A', 'B', 'C']
  const akhlakKepribadian = validHuruf.includes(nilai.akhlak_kepribadian) ? nilai.akhlak_kepribadian : 'B'
  const kebersihan = validHuruf.includes(nilai.kebersihan) ? nilai.kebersihan : 'B'
  const ketertiban = validHuruf.includes(nilai.ketertiban) ? nilai.ketertiban : 'B'

  // Otoritatif Server: Hitung Kehadiran dari domain Setoran & Hifzh dari Ujian Hifzh
  // Input manual dari client DIABAIKAN demi integritas data.
  const [absensiMap, hifzhMap] = await Promise.all([
    import('../../../lib/absensiRapot').then(m =>
      m.hitungKetidakhadiranSantri(serviceClient, [santriId], periode.tanggal_mulai, periode.tanggal_selesai)
    ),
    import('../../../lib/hifzhRapot').then(m =>
      m.muatNilaiHifzhFinalKelas(serviceClient, [santri], periode)
    ),
  ])

  const absensiOtoritatif = absensiMap.get(santriId) || { hadir_sakit: 0, hadir_izin: 0, hadir_alpha: 0 }
  const hifzhOtoritatif = hifzhMap.get(santriId) || {
    kelancaran: null,
    tajwid: null,
    keterangan_hafalan: santri.total_hafalan_juz ? `${santri.total_hafalan_juz} Juz` : '-',
  }

  // Validasi Ekskul
  const ekskulRenangVal = nilai.ekskul_renang != null && String(nilai.ekskul_renang).trim() !== ''
    ? parseInt(String(nilai.ekskul_renang), 10)
    : null
  const ekskulRenang = Number.isInteger(ekskulRenangVal) && ekskulRenangVal! >= 0 ? ekskulRenangVal : null
  const ekskulBeladiri = nilai.ekskul_beladiri ? String(nilai.ekskul_beladiri).trim() : null
  const catatan = nilai.catatan ? String(nilai.catatan).trim() : null

  // 5. Cek apakah row nilai_rapot sudah ada (untuk menentukan INSERT vs UPDATE)
  const { data: existingRow, error: checkError } = await serviceClient
    .from('nilai_rapot')
    .select('id, guru_id, kelancaran, tajwid, keterangan_hafalan')
    .eq('santri_id', santriId)
    .eq('periode_id', periodeId)
    .maybeSingle()

  if (checkError) {
    return NextResponse.json({ error: 'Gagal mengecek data nilai rapot: ' + checkError.message }, { status: 500 })
  }

  // Resolusi snapshot murni di server dari santri target
  const snapshotData = {
    kelas_snapshot: santri.kelas_num,
    jenjang_snapshot: santri.jenjang,
    jenis_kelas_snapshot: santri.jenis_kelas,
  }

  let savedData: any
  let isInsert = false

  if (existingRow) {
    // UPDATE:
    // Pertahankan guru_id lama (jangan percaya guru_id dari frontend payload)
    // Tulis nilai Absensi & Hifzh yang dihitung secara otoritatif oleh server
    const updatePayload = {
      ...snapshotData,
      ...mapelData,
      akhlak_kepribadian: akhlakKepribadian,
      kebersihan,
      ketertiban,
      ekskul_renang: ekskulRenang,
      ekskul_beladiri: ekskulBeladiri,
      hadir_sakit: absensiOtoritatif.hadir_sakit,
      hadir_izin: absensiOtoritatif.hadir_izin,
      hadir_alpha: absensiOtoritatif.hadir_alpha,
      kelancaran: hifzhOtoritatif.kelancaran,
      tajwid: hifzhOtoritatif.tajwid,
      keterangan_hafalan: hifzhOtoritatif.keterangan_hafalan,
      catatan,
    }

    const { data: updated, error: updateError } = await serviceClient
      .from('nilai_rapot')
      .update(updatePayload)
      .eq('id', existingRow.id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Gagal memperbarui nilai rapot: ' + updateError.message }, { status: 500 })
    }
    savedData = updated
    isInsert = false
  } else {
    // INSERT:
    // Server menetapkan guru_id dari authenticated user (auth.userId)
    const insertPayload = {
      santri_id: santriId,
      periode_id: periodeId,
      guru_id: auth.userId,
      ...snapshotData,
      ...mapelData,
      akhlak_kepribadian: akhlakKepribadian,
      kebersihan,
      ketertiban,
      ekskul_renang: ekskulRenang,
      ekskul_beladiri: ekskulBeladiri,
      hadir_sakit: absensiOtoritatif.hadir_sakit,
      hadir_izin: absensiOtoritatif.hadir_izin,
      hadir_alpha: absensiOtoritatif.hadir_alpha,
      catatan,
      kelancaran: hifzhOtoritatif.kelancaran,
      tajwid: hifzhOtoritatif.tajwid,
      keterangan_hafalan: hifzhOtoritatif.keterangan_hafalan,
    }

    const { data: inserted, error: insertError } = await serviceClient
      .from('nilai_rapot')
      .insert(insertPayload)
      .select('*')
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Gagal menyimpan nilai rapot: ' + insertError.message }, { status: 500 })
    }
    savedData = inserted
    isInsert = true
  }

  return NextResponse.json({
    success: true,
    action: isInsert ? 'INSERT' : 'UPDATE',
    nilai: savedData,
  })
}
