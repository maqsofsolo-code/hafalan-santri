import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../../lib/serverAuth'
import { getAcademicProgress, type JenjangKey } from '../../../lib/rapotDigital'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const auth = await authorize(request, ['admin', 'guru'])
  if ('response' in auth) return auth.response

  const { searchParams } = new URL(request.url)
  const periodeId = searchParams.get('periode_id')
  const kelasNumRaw = searchParams.get('kelas_num')
  const jenisKelas = searchParams.get('jenis_kelas')
  const jenjangRaw = searchParams.get('jenjang')

  if (!periodeId || !kelasNumRaw || !jenisKelas) {
    return NextResponse.json({ error: 'Parameter tidak lengkap (periode_id, kelas_num, jenis_kelas wajib ada)' }, { status: 400 })
  }

  const kelasNum = parseInt(kelasNumRaw, 10)
  if (!Number.isInteger(kelasNum) || kelasNum < 1 || kelasNum > 12) {
    return NextResponse.json({ error: 'Nilai kelas_num tidak valid (harus 1-12)' }, { status: 400 })
  }

  const validJenisKelas = ['banin', 'banat', 'tn_a', 'tn_b']
  if (!validJenisKelas.includes(jenisKelas)) {
    return NextResponse.json({ error: 'Nilai jenis_kelas tidak valid' }, { status: 400 })
  }

  // Derive default jenjang if not provided
  const jenjang = jenjangRaw || (kelasNum <= 6 ? 'ula' : kelasNum <= 9 ? 'wustha' : 'ulya')

  const serviceClient = createServiceRoleClient()

  // 1. Ambil data periode akademik untuk verifikasi status input & rentang tanggal
  const { data: periode, error: periodeError } = await serviceClient
    .from('periode_akademik')
    .select('id, tahun_ajaran, semester, tanggal_mulai, tanggal_selesai, rapot_input_dibuka')
    .eq('id', periodeId)
    .maybeSingle()

  if (periodeError || !periode) {
    return NextResponse.json({ error: 'Periode akademik tidak ditemukan' }, { status: 404 })
  }

  // Hard-close check untuk role Guru
  if (auth.role === 'guru' && !periode.rapot_input_dibuka) {
    return NextResponse.json({
      error: 'Input nilai rapot sedang ditutup oleh Admin.'
    }, { status: 403 })
  }

  // 2. Authorization check for Guru: penugasan wali kelas
  if (auth.role === 'guru') {
    const { data: assignment, error: assignError } = await serviceClient
      .from('wali_kelas_assignment')
      .select('id')
      .eq('guru_id', auth.userId)
      .eq('periode_id', periodeId)
      .eq('kelas_num', kelasNum)
      .eq('jenis_kelas', jenisKelas)
      .eq('is_aktif', true)
      .maybeSingle()

    if (assignError) {
      return NextResponse.json({ error: 'Gagal memverifikasi penugasan: ' + assignError.message }, { status: 500 })
    }

    if (!assignment) {
      return NextResponse.json({
        error: 'Akses ditolak: Anda bukan Wali Kelas untuk kelas ini pada periode ini.'
      }, { status: 403 })
    }
  }

  // 3. Query seluruh santri aktif pada kelas & jenis_kelas ini
  let santriQuery = serviceClient
    .from('santri')
    .select('id, nama, nisn, kelas, kelas_num, jenjang, jenis_kelas, status, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
    .eq('kelas_num', kelasNum)
    .eq('jenis_kelas', jenisKelas)
    .eq('status', 'aktif')
    .order('nama', { ascending: true })

  if (jenjang) {
    santriQuery = santriQuery.eq('jenjang', jenjang)
  }

  const { data: santriList, error: santriError } = await santriQuery

  if (santriError) {
    return NextResponse.json({ error: 'Gagal memuat data santri: ' + santriError.message }, { status: 500 })
  }

  const santriRows = santriList || []
  if (santriRows.length === 0) {
    return NextResponse.json({ santriList: [] })
  }

  // 4. Query nilai rapot, absensi otomatis, dan Hifzh otomatis
  const santriIds = santriRows.map(s => s.id)

  const [nilaiRes, absensiMap, hifzhMap] = await Promise.all([
    serviceClient
      .from('nilai_rapot')
      .select('*')
      .eq('periode_id', periodeId)
      .in('santri_id', santriIds),
    import('../../../lib/absensiRapot').then(m =>
      m.hitungKetidakhadiranSantri(serviceClient, santriIds, periode.tanggal_mulai, periode.tanggal_selesai)
    ),
    import('../../../lib/hifzhRapot').then(m =>
      m.muatNilaiHifzhFinalKelas(serviceClient, santriRows, periode)
    ),
  ])

  if (nilaiRes.error) {
    return NextResponse.json({ error: 'Gagal memuat data nilai rapot: ' + nilaiRes.error.message }, { status: 500 })
  }

  const nilaiMap = new Map<string, any>()
  for (const n of (nilaiRes.data || [])) {
    nilaiMap.set(n.santri_id, n)
  }

  const merged = santriRows.map(s => {
    const nilaiDb = nilaiMap.get(s.id) || null
    const absensi = absensiMap.get(s.id) || { hadir_sakit: 0, hadir_izin: 0, hadir_alpha: 0 }
    const hifzh = hifzhMap.get(s.id) || { kelancaran: null, tajwid: null, keterangan_hafalan: '-' }
    const academicProgress = getAcademicProgress(nilaiDb, s.jenjang as JenjangKey)

    // Merged nilai: timpa kolom absensi & hifzh dengan data otoritatif server
    const nilai = nilaiDb
      ? {
          ...nilaiDb,
          hadir_sakit: absensi.hadir_sakit,
          hadir_izin: absensi.hadir_izin,
          hadir_alpha: absensi.hadir_alpha,
          kelancaran: hifzh.kelancaran,
          tajwid: hifzh.tajwid,
          keterangan_hafalan: hifzh.keterangan_hafalan,
        }
      : null

    return {
      ...s,
      has_nilai: !!nilaiDb,
      nilai_id: nilaiDb ? nilaiDb.id : null,
      nilai,
      absensi_otomatis: absensi,
      hifzh_otomatis: hifzh,
      academic_progress: academicProgress,
    }
  })

  return NextResponse.json({ santriList: merged })
}
