import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '../../../lib/serverAuth'
import { getTanggalWIB, getPeriodePekanTertutup } from '../../../lib/dateWib'

// getTanggalWIB/formatTanggalUTC/getPeriodePekanTertutup dipindah ke
// app/lib/dateWib.ts (Modularisasi Tahap 2, diimpor di atas) -- hasilnya
// diverifikasi identik dengan implementasi lama via scripts/verify-date-wib.mts.

function createAuthenticatedClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
}

// Field yang dikirim ke Wali TERBATAS sengaja -- lihat Security Fix Tahap 4
// bagian G. Tidak ada NIK/NISN/alamat/tempat-tanggal lahir/wali_id/guru_id/
// catatan santri lain. Hanya kolom yang memang dipakai perhitungan 3 kategori
// ranking (hafalan/konsistensi/semangat) di app/wali/page.tsx.
const KOLOM_SANTRI_KELAS = 'id, nama, total_hafalan_juz, kelas_num, jenjang, jenis_kelas'
const KOLOM_SETORAN_KELAS = 'santri_id, tanggal, jenis, penambahan_juz, status_kehadiran, status'

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization')
  const bearerMatch = authorization?.match(/^Bearer\s+(\S+)$/i)
  if (!bearerMatch) {
    return NextResponse.json({ error: 'Sesi login tidak valid atau sudah berakhir' }, { status: 401 })
  }

  const accessToken = bearerMatch[1]
  const supabaseAuthenticated = createAuthenticatedClient(accessToken)
  const { data: userData, error: userError } = await supabaseAuthenticated.auth.getUser(accessToken)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Sesi login tidak valid atau sudah berakhir' }, { status: 401 })
  }

  const { data: callerProfile, error: callerProfileError } = await supabaseAuthenticated
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (callerProfileError || callerProfile?.role !== 'wali') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const santriId = searchParams.get('santriId')
  if (!santriId) {
    return NextResponse.json({ error: 'santriId wajib diisi' }, { status: 400 })
  }

  // Verifikasi santri ini benar milik wali yang login. supabaseAuthenticated
  // tunduk pada RLS santri_select_scoped (wali hanya boleh SELECT wali_id =
  // auth.uid()) -- .eq('wali_id', ...) di bawah adalah lapisan verifikasi
  // eksplisit kedua, bukan satu-satunya proteksi.
  const { data: santri, error: santriError } = await supabaseAuthenticated
    .from('santri')
    .select('id, kelas_num, jenjang, jenis_kelas')
    .eq('id', santriId)
    .eq('wali_id', userData.user.id)
    .maybeSingle()

  if (santriError) {
    return NextResponse.json({ error: 'Gagal memverifikasi data santri' }, { status: 500 })
  }
  if (!santri) {
    return NextResponse.json({ error: 'Santri tidak ditemukan atau bukan anak Anda' }, { status: 403 })
  }
  if (!santri.kelas_num || !santri.jenjang) {
    return NextResponse.json({ santriKelas: [], setoran7Hari: [], setoranPekanKonsistensi: [], periodeKonsistensi: null })
  }

  // Dari sini pakai service-role -- authorization (wali + kepemilikan anak)
  // sudah selesai diverifikasi di atas. RLS santri/setoran tidak mengizinkan
  // wali membaca teman sekelas, jadi service-role dibutuhkan agar ranking
  // kelas tetap bisa dihitung, dengan proyeksi kolom dibatasi manual di sini
  // (bukan lewat RLS, karena RLS row-level tidak bisa membatasi kolom).
  const serviceClient = createServiceRoleClient()

  let query = serviceClient
    .from('santri')
    .select(KOLOM_SANTRI_KELAS)
    .eq('kelas_num', santri.kelas_num)
    .eq('jenjang', santri.jenjang)
    .eq('status', 'aktif')

  // TN A dan TN B digabung dalam satu kelompok -- identik dengan logic lama
  // di app/wali/page.tsx (fetchDataKelas).
  if (santri.jenis_kelas === 'tn_a' || santri.jenis_kelas === 'tn_b') {
    query = query.in('jenis_kelas', ['tn_a', 'tn_b'])
  } else {
    query = query.eq('jenis_kelas', santri.jenis_kelas)
  }

  const { data: seKelas, error: seKelasError } = await query.order('nama')
  if (seKelasError) {
    return NextResponse.json({ error: 'Gagal memuat data kelas' }, { status: 500 })
  }
  const daftarSeKelas = seKelas || []

  if (daftarSeKelas.length === 0) {
    return NextResponse.json({ santriKelas: [], setoran7Hari: [], setoranPekanKonsistensi: [], periodeKonsistensi: null })
  }

  const idSeKelas = daftarSeKelas.map(s => s.id)
  const today = getTanggalWIB()
  const tujuhHariLalu = new Date(today)
  tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7)
  const tujuhHariLaluStr = tujuhHariLalu.toISOString().split('T')[0]
  const periodeKonsistensi = getPeriodePekanTertutup()

  const { data: setoran7Hari, error: setoran7HariError } = await serviceClient
    .from('setoran')
    .select(KOLOM_SETORAN_KELAS)
    .in('santri_id', idSeKelas)
    .gte('tanggal', tujuhHariLaluStr)
    .eq('status_kehadiran', 'hadir')

  const { data: setoranPekanKonsistensi, error: setoranPekanError } = await serviceClient
    .from('setoran')
    .select(KOLOM_SETORAN_KELAS)
    .in('santri_id', idSeKelas)
    .gte('tanggal', periodeKonsistensi.tanggalMulai)
    .lte('tanggal', periodeKonsistensi.tanggalSelesai)
    .eq('status_kehadiran', 'hadir')

  if (setoran7HariError || setoranPekanError) {
    return NextResponse.json({ error: 'Gagal memuat data setoran kelas' }, { status: 500 })
  }

  return NextResponse.json({
    santriKelas: daftarSeKelas,
    setoran7Hari: setoran7Hari || [],
    setoranPekanKonsistensi: setoranPekanKonsistensi || [],
    periodeKonsistensi,
  })
}
