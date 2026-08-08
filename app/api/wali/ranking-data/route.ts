import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '../../../lib/serverAuth'

function getTanggalWIB() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTanggalUTC(date: Date) {
  const tahun = date.getUTCFullYear()
  const bulan = String(date.getUTCMonth() + 1).padStart(2, '0')
  const tanggal = String(date.getUTCDate()).padStart(2, '0')
  return `${tahun}-${bulan}-${tanggal}`
}

// Identik dengan getPeriodePekanTertutup di app/wali/page.tsx -- dipertahankan
// persis (termasuk aturan "Sabtu sudah ditutup setelah jam 17:00 WIB") supaya
// rentang tanggal query setoran di server sama persis dengan yang dipakai
// client untuk menghitung hari aktif/label periode.
function getPeriodePekanTertutup(saatIni = new Date()) {
  const bagianWIB = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(saatIni)
  const nilaiBagian = Object.fromEntries(
    bagianWIB.filter(bagian => bagian.type !== 'literal').map(bagian => [bagian.type, bagian.value])
  )
  const tahun = Number(nilaiBagian.year)
  const bulan = Number(nilaiBagian.month)
  const tanggal = Number(nilaiBagian.day)
  const jam = Number(nilaiBagian.hour)
  const tanggalWIB = new Date(Date.UTC(tahun, bulan - 1, tanggal))
  const nomorHari = tanggalWIB.getUTCDay()
  const jarakDariSenin = (nomorHari + 6) % 7
  const seninPekanBerjalan = new Date(tanggalWIB)
  seninPekanBerjalan.setUTCDate(seninPekanBerjalan.getUTCDate() - jarakDariSenin)

  const sabtuSudahDitutup = nomorHari === 6 && jam >= 17
  const gunakanPekanBerjalan = nomorHari === 0 || sabtuSudahDitutup
  const tanggalMulaiDate = new Date(seninPekanBerjalan)
  if (!gunakanPekanBerjalan) {
    tanggalMulaiDate.setUTCDate(tanggalMulaiDate.getUTCDate() - 7)
  }
  const tanggalSelesaiDate = new Date(tanggalMulaiDate)
  tanggalSelesaiDate.setUTCDate(tanggalSelesaiDate.getUTCDate() + 5)

  const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  const mulaiTanggal = tanggalMulaiDate.getUTCDate()
  const selesaiTanggal = tanggalSelesaiDate.getUTCDate()
  const mulaiBulan = tanggalMulaiDate.getUTCMonth()
  const selesaiBulan = tanggalSelesaiDate.getUTCMonth()
  const mulaiTahun = tanggalMulaiDate.getUTCFullYear()
  const selesaiTahun = tanggalSelesaiDate.getUTCFullYear()
  let labelPeriode: string

  if (mulaiBulan === selesaiBulan && mulaiTahun === selesaiTahun) {
    labelPeriode = `${mulaiTanggal}–${selesaiTanggal} ${namaBulan[selesaiBulan]} ${selesaiTahun}`
  } else if (mulaiTahun === selesaiTahun) {
    labelPeriode = `${mulaiTanggal} ${namaBulan[mulaiBulan]}–${selesaiTanggal} ${namaBulan[selesaiBulan]} ${selesaiTahun}`
  } else {
    labelPeriode = `${mulaiTanggal} ${namaBulan[mulaiBulan]} ${mulaiTahun}–${selesaiTanggal} ${namaBulan[selesaiBulan]} ${selesaiTahun}`
  }

  return {
    tanggalMulai: formatTanggalUTC(tanggalMulaiDate),
    tanggalSelesai: formatTanggalUTC(tanggalSelesaiDate),
    labelPeriode,
  }
}

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
