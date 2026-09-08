import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../../lib/serverAuth'
import {
  validateNilaiRaw,
  getRapotSubjectConfig,
  getActiveSubjects,
  getAcademicProgress,
  type JenjangKey,
} from '../../../lib/rapotDigital'

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
  const hifzh = hifzhMap.get(santriId) || { kelancaran: null, tajwid: null, keterangan_hafalan: '-' }

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

  const academicProgress = getAcademicProgress(nilaiRes.data, santri.jenjang as JenjangKey, santri.kelas_num)
  return NextResponse.json({ santri, nilai, absensi_otomatis: absensi, hifzh_otomatis: hifzh, academic_progress: academicProgress })
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

    // C. Verifikasi konfigurasi mapel aktif kelas santri
    const subjectConfig = getRapotSubjectConfig(santri.jenjang as JenjangKey, santri.kelas_num)
    if (!subjectConfig || !subjectConfig.enabled) {
      return NextResponse.json({
        error: 'Daftar mata pelajaran jenjang ini belum dikonfigurasi. Belum dapat menyimpan nilai akademik.'
      }, { status: 400 })
    }
  } else if (auth.role === 'admin') {
    // Admin boleh simpan meski rapot_input_dibuka=false
    const subjectConfig = getRapotSubjectConfig(santri.jenjang as JenjangKey, santri.kelas_num)
    if (!subjectConfig || !subjectConfig.enabled) {
      return NextResponse.json({
        error: 'Daftar mata pelajaran jenjang ini belum dikonfigurasi. Belum dapat menyimpan nilai akademik.'
      }, { status: 400 })
    }
  }

  // 4. Validasi nilai mentah mapel aktif untuk kelas santri (harus integer 0-100 atau null)
  // Server-authoritative: hanya subject aktif untuk santri.jenjang + santri.kelas_num yang boleh ditulis.
  // Inactive subjects (seperti IPA/IPS untuk Ula kelas 1–3) TIDAK dimasukkan ke mapelData:
  // - Pada UPDATE: omitted dari payload sehingga nilai legacy di database ter-preserve apa adanya (bukan di-null-kan paksa).
  // - Pada INSERT: omitted dari payload sehingga database menetapkan nilai bawaan NULL.
  // - Forged client payload untuk inactive subjects diabaikan sepenuhnya (tidak writable dari client).
  const activeSubjects = getActiveSubjects(santri.jenjang as JenjangKey, santri.kelas_num)
  const mapelData: Record<string, number | null> = {}

  for (const sub of activeSubjects) {
    const rawVal = nilai[sub.id]
    const validation = validateNilaiRaw(rawVal)
    if (!validation.valid) {
      return NextResponse.json({
        error: `Nilai ${sub.label || sub.id} tidak valid: ${validation.error}`
      }, { status: 400 })
    }
    mapelData[sub.id] = validation.value
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
    keterangan_hafalan: '-',
  }

  // Validasi Ekskul
  // Renang adalah nilai asesmen (skala 0–100 inclusive). Jika <0 atau >100, tolak dengan error validasi jelas (tidak clamp, tidak silent convert).
  let ekskulRenang: number | null = null
  if (nilai.ekskul_renang !== undefined && nilai.ekskul_renang !== null && String(nilai.ekskul_renang).trim() !== '') {
    const validationRenang = validateNilaiRaw(nilai.ekskul_renang)
    if (!validationRenang.valid) {
      return NextResponse.json({
        error: `Nilai Renang tidak valid: ${validationRenang.error}`
      }, { status: 400 })
    }
    ekskulRenang = validationRenang.value
  }
  const ekskulBeladiri = nilai.ekskul_beladiri ? String(nilai.ekskul_beladiri).trim() : null
  const catatan = nilai.catatan ? String(nilai.catatan).trim() : null

  // 5. Cek apakah row nilai_rapot sudah ada (untuk menentukan INSERT vs UPDATE)
  const { data: existingRow, error: checkError } = await serviceClient
    .from('nilai_rapot')
    .select('id, guru_id')
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
    // Tulis nilai Absensi yang dihitung secara otoritatif oleh server
    // Legacy Hifzh columns (kelancaran, tajwid, keterangan_hafalan) selalu eksplisit NULL
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
      kelancaran: null,
      tajwid: null,
      keterangan_hafalan: null,
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
    // Legacy Hifzh columns (kelancaran, tajwid, keterangan_hafalan) selalu eksplisit NULL
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
      kelancaran: null,
      tajwid: null,
      keterangan_hafalan: null,
      catatan,
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

  const academicProgress = getAcademicProgress(savedData, santri.jenjang as JenjangKey, santri.kelas_num)

  return NextResponse.json({
    success: true,
    action: isInsert ? 'INSERT' : 'UPDATE',
    nilai: savedData
      ? {
          ...savedData,
          kelancaran: hifzhOtoritatif.kelancaran,
          tajwid: hifzhOtoritatif.tajwid,
          keterangan_hafalan: hifzhOtoritatif.keterangan_hafalan,
        }
      : null,
    academic_progress: academicProgress,
  })
}
