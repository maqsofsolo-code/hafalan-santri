import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../../lib/serverAuth'

// Endpoint minimal untuk kebutuhan historis Rapot Digital: Rekap Kelas di
// app/guru/page.tsx (fetchRekapKelasByGuru) menampilkan nilai_rapot jenjang
// Ula per kelas, TERMASUK santri yang sudah alumni/keluar -- arsip digital
// yang sengaja dipertahankan (bukan bug), lihat lanjutan Security Fix
// Tahap 4. Query aslinya dijalankan langsung dari browser Guru dan meng-embed
// relasi santri:santri_id(nama, kelas_num, jenjang, status) lewat PostgREST.
//
// RLS santri_select_scoped (Tahap 4) membatasi Guru hanya ke santri
// status='aktif' -- ini juga berlaku untuk embedded resource seperti di atas
// (bukan hanya query langsung ke public.santri), jadi baris nilai_rapot milik
// santri alumni akan tampil dengan field santri kosong/null kalau tetap
// dijalankan dari browser Guru. Daripada memperluas RLS Guru ke seluruh
// santri nonaktif, seluruh proses baca nilai_rapot+embed santri untuk fitur
// ini dipindah ke sini (service-role, setelah role guru diverifikasi) --
// LOGIC-nya (coba kelas_snapshot dulu, fallback ke id santri jenjang+kelas
// jika kosong) TIDAK diubah, persis sama seperti kode lama di
// app/guru/page.tsx, hanya lokasi eksekusinya. Perhitungan rata-rata/
// peringkat tetap sepenuhnya di client (tidak dipindah), tidak diubah sama
// sekali.
export async function GET(request: Request) {
  const auth = await authorize(request, ['guru', 'admin'])
  if ('response' in auth) return auth.response

  const { searchParams } = new URL(request.url)
  const periodeId = searchParams.get('periode_id')
  const kelasNumRaw = searchParams.get('kelas_num')
  const kelasNum = kelasNumRaw ? parseInt(kelasNumRaw, 10) : NaN
  if (!periodeId || !Number.isInteger(kelasNum) || kelasNum < 1 || kelasNum > 6) {
    return NextResponse.json({ error: 'Parameter tidak valid' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()

  // 1. Verifikasi periode akademik valid
  const { data: periode, error: periodeErr } = await serviceClient
    .from('periode_akademik')
    .select('id')
    .eq('id', periodeId)
    .single()

  if (periodeErr || !periode) {
    return NextResponse.json({ error: 'Periode akademik tidak ditemukan' }, { status: 404 })
  }

  // 2. Jika Guru, wajib verifikasi penugasan wali_kelas_assignment
  if (auth.role === 'guru') {
    const { data: assignment, error: assignErr } = await serviceClient
      .from('wali_kelas_assignment')
      .select('id')
      .eq('guru_id', auth.userId)
      .eq('periode_id', periodeId)
      .eq('kelas_num', kelasNum)
      .eq('is_aktif', true)
      .maybeSingle()

    if (assignErr) {
      return NextResponse.json({ error: 'Gagal memverifikasi penugasan: ' + assignErr.message }, { status: 500 })
    }

    if (!assignment) {
      return NextResponse.json({
        error: 'Akses ditolak: Anda bukan Wali Kelas untuk kelas ini pada periode ini.'
      }, { status: 403 })
    }
  }

  const KOLOM_NILAI_RAPOT = '*, santri:santri_id(nama, kelas_num, jenjang, status)'

  const { data: nilaiSnapshot, error: nilaiSnapshotError } = await serviceClient
    .from('nilai_rapot')
    .select(KOLOM_NILAI_RAPOT)
    .eq('periode_id', periodeId)
    .eq('kelas_snapshot', kelasNum)

  if (nilaiSnapshotError) {
    return NextResponse.json({ error: 'Gagal memuat nilai rapot' }, { status: 500 })
  }

  let nilaiList = nilaiSnapshot || []
  if (nilaiList.length === 0) {
    const { data: santriKelas, error: santriError } = await serviceClient
      .from('santri')
      .select('id')
      .eq('jenjang', 'ula')
      .eq('kelas_num', kelasNum)

    if (santriError) {
      return NextResponse.json({ error: 'Gagal memuat data santri' }, { status: 500 })
    }

    const ids = (santriKelas || []).map(s => s.id)
    if (ids.length > 0) {
      const { data: nilaiFallback, error: nilaiFallbackError } = await serviceClient
        .from('nilai_rapot')
        .select(KOLOM_NILAI_RAPOT)
        .eq('periode_id', periodeId)
        .in('santri_id', ids)

      if (nilaiFallbackError) {
        return NextResponse.json({ error: 'Gagal memuat nilai rapot' }, { status: 500 })
      }
      nilaiList = nilaiFallback || []
    }
  }

  return NextResponse.json({ nilaiList })
}
