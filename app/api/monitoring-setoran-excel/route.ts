import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

type Jenjang = 'ula' | 'wustha' | 'ulya'
type Kelompok = 'banin' | 'banat' | 'tn'
type JenisLaporan = 'rosib' | 'belum-diinput'

type SantriMonitoring = {
  id: string
  nama: string | null
  jenjang: Jenjang
  kelas_num: number | null
  kelas: string | null
  jenis_kelas: string | null
}

type SetoranRosib = {
  id: string
  santri_id: string
  jenis: string | null
  status: string | null
  status_kehadiran: string | null
  guru_pengganti: boolean | null
  surah: string | null
  ayat_mulai: number | null
  ayat_selesai: number | null
  penambahan_juz: number | null
  jumlah_halaman_murojaah: number | null
  catatan: string | null
  created_at: string | null
  guru: { nama: string | null } | null
}

const JENJANG_VALID = new Set<Jenjang>(['ula', 'wustha', 'ulya'])
const KELOMPOK_VALID = new Set<Kelompok>(['banin', 'banat', 'tn'])
const JENIS_LAPORAN_VALID = new Set<JenisLaporan>(['rosib', 'belum-diinput'])

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

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

function tanggalValid(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false
  const tahun = Number(match[1])
  const bulan = Number(match[2])
  const tanggal = Number(match[3])
  const date = new Date(Date.UTC(tahun, bulan - 1, tanggal))
  return date.getUTCFullYear() === tahun && date.getUTCMonth() === bulan - 1 && date.getUTCDate() === tanggal
}

function getTanggalWIB() {
  const bagian = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const nilai = Object.fromEntries(bagian.filter(item => item.type !== 'literal').map(item => [item.type, item.value]))
  return `${nilai.year}-${nilai.month}-${nilai.day}`
}

function formatTanggalIndonesia(value: string) {
  const [tahun, bulan, tanggal] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(tahun, bulan - 1, tanggal, 12)))
}

function formatWaktuWIB(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

function labelJenjang(jenjang: Jenjang) {
  if (jenjang === 'ula') return 'Ula'
  if (jenjang === 'wustha') return 'Wustha'
  return 'Ulya'
}

function labelKelompok(value: string | null) {
  if (value === 'banin') return 'Banin'
  if (value === 'banat') return 'Banat'
  if (value === 'tn_a') return 'TN A'
  if (value === 'tn_b') return 'TN B'
  return value || '-'
}

function labelFilterKelompok(kelompok: Kelompok) {
  if (kelompok === 'banin') return 'Banin'
  if (kelompok === 'banat') return 'Banat'
  return 'TN'
}

function detailSetoran(setoran: SetoranRosib) {
  const rentangAyat = setoran.ayat_mulai != null || setoran.ayat_selesai != null
    ? ` ayat ${setoran.ayat_mulai ?? '-'}-${setoran.ayat_selesai ?? '-'}`
    : ''
  const surah = setoran.surah ? `Surah ${setoran.surah}${rentangAyat}` : '-'

  if (setoran.jenis === 'baru') {
    const penambahan = Number.isFinite(Number(setoran.penambahan_juz)) ? Number(setoran.penambahan_juz) : 0
    return `${surah}; penambahan ${penambahan} juz`
  }
  if (setoran.jenis === 'lama') {
    const halaman = Number.isFinite(Number(setoran.jumlah_halaman_murojaah))
      ? Number(setoran.jumlah_halaman_murojaah)
      : 0
    return `${surah}; murojaah ${halaman} halaman`
  }
  return surah
}

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

  const { data: profile, error: profileError } = await supabaseAuthenticated
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (profileError || profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const jenisLaporan = searchParams.get('jenis') || ''
  const tanggal = searchParams.get('tanggal') || ''
  const jenjang = searchParams.get('jenjang') || ''
  const kelasText = searchParams.get('kelas') || ''
  const kelompok = searchParams.get('kelompok') || ''
  const kelas = Number(kelasText)

  if (!JENIS_LAPORAN_VALID.has(jenisLaporan as JenisLaporan)) {
    return NextResponse.json({ error: 'Jenis laporan tidak valid' }, { status: 400 })
  }
  if (!tanggalValid(tanggal) || tanggal > getTanggalWIB()) {
    return NextResponse.json({ error: 'Tanggal tidak valid' }, { status: 400 })
  }
  if (!JENJANG_VALID.has(jenjang as Jenjang)) {
    return NextResponse.json({ error: 'Jenjang tidak valid' }, { status: 400 })
  }
  if (!/^\d{1,2}$/.test(kelasText) || !Number.isInteger(kelas) || kelas < 1 || kelas > 12) {
    return NextResponse.json({ error: 'Kelas tidak valid' }, { status: 400 })
  }
  if (!KELOMPOK_VALID.has(kelompok as Kelompok)) {
    return NextResponse.json({ error: 'Kelompok tidak valid' }, { status: 400 })
  }

  const jenisFinal = jenisLaporan as JenisLaporan
  const jenjangFinal = jenjang as Jenjang
  const kelompokFinal = kelompok as Kelompok
  const supabaseAdmin = createAdminClient()

  let santriQuery = supabaseAdmin
    .from('santri')
    .select('id, nama, jenjang, kelas_num, kelas, jenis_kelas')
    .eq('status', 'aktif')
    .eq('jenjang', jenjangFinal)
    .eq('kelas_num', kelas)
    .order('nama', { ascending: true })

  santriQuery = kelompokFinal === 'tn'
    ? santriQuery.in('jenis_kelas', ['tn_a', 'tn_b'])
    : santriQuery.eq('jenis_kelas', kelompokFinal)

  const { data: santriData, error: santriError } = await santriQuery
  if (santriError) {
    return NextResponse.json({ error: 'Gagal mengambil data santri' }, { status: 500 })
  }

  const santriList = (santriData || []) as SantriMonitoring[]
  if (santriList.length === 0) {
    return NextResponse.json({ error: 'Kombinasi jenjang, kelas, dan kelompok tidak tersedia' }, { status: 400 })
  }

  const santriIds = santriList.map(santri => santri.id)
  const santriById = new Map(santriList.map(santri => [santri.id, santri]))
  let hasilRows: Array<Array<string | number>> = []
  let catatanHari = ''

  if (jenisFinal === 'rosib') {
    const { data: setoranData, error: setoranError } = await supabaseAdmin
      .from('setoran')
      .select('id, santri_id, jenis, status, status_kehadiran, guru_pengganti, surah, ayat_mulai, ayat_selesai, penambahan_juz, jumlah_halaman_murojaah, catatan, created_at, guru:guru_id(nama)')
      .in('santri_id', santriIds)
      .eq('tanggal', tanggal)
      .eq('status', 'rosib')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })

    if (setoranError) {
      return NextResponse.json({ error: 'Gagal mengambil data setoran' }, { status: 500 })
    }

    hasilRows = ((setoranData || []) as unknown as SetoranRosib[]).map((setoran, index) => {
      const santri = santriById.get(setoran.santri_id)
      return [
        index + 1,
        santri?.nama || '-',
        labelJenjang(jenjangFinal),
        santri?.kelas || `Kelas ${kelas}`,
        labelKelompok(santri?.jenis_kelas || null),
        setoran.jenis === 'lama' ? 'Hafalan Lama' : setoran.jenis === 'baru' ? 'Hafalan Baru' : setoran.jenis || '-',
        'Rosib',
        setoran.status_kehadiran || '-',
        setoran.guru?.nama || '-',
        setoran.guru_pengganti ? 'Ya' : 'Tidak',
        formatWaktuWIB(setoran.created_at),
        detailSetoran(setoran),
        setoran.catatan || '-',
      ]
    })
  } else {
    const [tahun, bulan, hari] = tanggal.split('-').map(Number)
    const nomorHari = new Date(Date.UTC(tahun, bulan - 1, hari)).getUTCDay()
    const { data: liburData, error: liburError } = await supabaseAdmin
      .from('kalender_akademik')
      .select('id, nama')
      .eq('tipe', 'libur')
      .lte('tanggal_mulai', tanggal)
      .gte('tanggal_selesai', tanggal)
      .limit(1)

    if (liburError) {
      return NextResponse.json({ error: 'Gagal memeriksa kalender akademik' }, { status: 500 })
    }

    const hariAktif = nomorHari !== 0 && nomorHari !== 5 && !liburData?.length
    if (hariAktif) {
      const { data: setoranData, error: setoranError } = await supabaseAdmin
        .from('setoran')
        .select('santri_id')
        .in('santri_id', santriIds)
        .eq('tanggal', tanggal)

      if (setoranError) {
        return NextResponse.json({ error: 'Gagal mengambil data setoran' }, { status: 500 })
      }

      const sudahDiinput = new Set((setoranData || []).map(setoran => setoran.santri_id))
      hasilRows = santriList
        .filter(santri => !sudahDiinput.has(santri.id))
        .map((santri, index) => [
          index + 1,
          santri.nama || '-',
          labelJenjang(santri.jenjang),
          santri.kelas || `Kelas ${kelas}`,
          labelKelompok(santri.jenis_kelas),
        ])
    } else {
      catatanHari = nomorHari === 0
        ? 'Tidak ada data yang sesuai dengan filter. Tanggal yang dipilih adalah hari Ahad (libur mingguan).'
        : nomorHari === 5
          ? 'Tidak ada data yang sesuai dengan filter. Tanggal yang dipilih adalah hari Jumat (libur mingguan).'
          : `Tidak ada data yang sesuai dengan filter. Tanggal yang dipilih termasuk libur akademik${liburData?.[0]?.nama ? `: ${liburData[0].nama}` : ''}.`
    }
  }

  const judul = jenisFinal === 'rosib'
    ? 'Daftar Santri dengan Setoran Rosib'
    : 'Daftar Santri Belum Diinput'
  const headerKolom = jenisFinal === 'rosib'
    ? ['No', 'Nama Santri', 'Jenjang', 'Kelas', 'Kelompok', 'Jenis Setoran', 'Status', 'Kehadiran', 'Guru Penginput', 'Guru Pengganti', 'Waktu Input (WIB)', 'Rincian', 'Catatan Guru']
    : ['No', 'Nama Santri', 'Jenjang', 'Kelas', 'Kelompok']
  const dibuatPada = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date())
  const sheetRows: Array<Array<string | number>> = [
    [judul],
    ['Tanggal', formatTanggalIndonesia(tanggal)],
    ['Jenjang', labelJenjang(jenjangFinal)],
    ['Kelas', `Kelas ${kelas}`],
    ['Kelompok', labelFilterKelompok(kelompokFinal)],
    ['Dibuat pada', `${dibuatPada} WIB`],
    ['Jumlah hasil', hasilRows.length],
    [],
    headerKolom,
  ]

  if (hasilRows.length > 0) {
    sheetRows.push(...hasilRows)
  } else {
    sheetRows.push([catatanHari || 'Tidak ada data yang sesuai dengan filter.'])
  }

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows)
  worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headerKolom.length - 1 } }]
  worksheet['!cols'] = jenisFinal === 'rosib'
    ? [6, 28, 12, 18, 12, 16, 10, 16, 24, 16, 22, 45, 45].map(wch => ({ wch }))
    : [6, 30, 12, 20, 14].map(wch => ({ wch }))
  XLSX.utils.book_append_sheet(workbook, worksheet, jenisFinal === 'rosib' ? 'Daftar Rosib' : 'Belum Diinput')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  const filename = `monitoring-${jenisFinal}-${jenjangFinal}-kelas-${kelas}-${kelompokFinal}-${tanggal}.xlsx`
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
