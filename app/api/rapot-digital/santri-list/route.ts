import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../../lib/serverAuth'

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

  // 1. Authorization check for Guru
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

  // 2. Query seluruh santri aktif pada kelas & jenis_kelas ini
  let santriQuery = serviceClient
    .from('santri')
    .select('id, nama, nisn, kelas_num, jenjang, jenis_kelas, status, total_hafalan_juz')
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

  // 3. LEFT JOIN / merge dengan nilai_rapot untuk periode ini
  const santriIds = santriRows.map(s => s.id)
  const { data: nilaiList, error: nilaiError } = await serviceClient
    .from('nilai_rapot')
    .select('*')
    .eq('periode_id', periodeId)
    .in('santri_id', santriIds)

  if (nilaiError) {
    return NextResponse.json({ error: 'Gagal memuat data nilai rapot: ' + nilaiError.message }, { status: 500 })
  }

  const nilaiMap = new Map<string, any>()
  for (const n of (nilaiList || [])) {
    nilaiMap.set(n.santri_id, n)
  }

  const merged = santriRows.map(s => {
    const nilai = nilaiMap.get(s.id) || null
    return {
      ...s,
      has_nilai: !!nilai,
      nilai_id: nilai ? nilai.id : null,
      nilai,
    }
  })

  return NextResponse.json({ santriList: merged })
}
