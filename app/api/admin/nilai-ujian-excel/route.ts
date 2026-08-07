import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  getCakupanSegment,
  hitungRingkasanJuz,
  compareNilaiTerbaru,
  nilaiRapor,
  type MasterSegment,
  type SantriScope,
} from '../../../lib/adminNilaiUjian'
import { buildRaportHifzhWorkbook, type SantriRaport } from '../../../lib/raportHifzhExcel'

type Jenjang = 'ula' | 'wustha' | 'ulya'
type Kelompok = 'banin' | 'banat' | 'tn'

const JENJANG_VALID = new Set<Jenjang>(['ula', 'wustha', 'ulya'])
const KELOMPOK_VALID = new Set<Kelompok>(['banin', 'banat', 'tn'])

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
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

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

async function authorizeAdmin(request: Request) {
  const authorization = request.headers.get('authorization')
  const bearerMatch = authorization?.match(/^Bearer\s+(\S+)$/i)
  if (!bearerMatch) return { response: responseError('Sesi login tidak valid atau sudah berakhir. Silakan login kembali.', 401) }

  const accessToken = bearerMatch[1]
  const supabaseAuthenticated = createAuthenticatedClient(accessToken)
  const { data: userData, error: userError } = await supabaseAuthenticated.auth.getUser(accessToken)
  if (userError || !userData.user) return { response: responseError('Sesi login tidak valid atau sudah berakhir. Silakan login kembali.', 401) }

  const { data: profile, error: profileError } = await supabaseAuthenticated
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()
  // Bedakan "gagal memverifikasi" (masalah server/koneksi) dari "terverifikasi bukan admin", sama
  // seperti app/api/admin/nilai-ujian/route.ts.
  if (profileError) return { response: responseError('Gagal memverifikasi akses. Coba lagi.', 500) }
  if (profile?.role !== 'admin') return { response: responseError('Akun ini tidak memiliki akses Admin.', 403) }

  return { adminClient: createAdminClient() }
}

function labelFilterKelompok(kelompok: Kelompok) {
  if (kelompok === 'banin') return 'Banin'
  if (kelompok === 'banat') return 'Banat'
  return 'TN'
}

function labelTipe(tipe: string) {
  if (tipe === 'mid_semester') return 'mid-semester'
  if (tipe === 'semester') return 'semester'
  return tipe
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'raport'
}

export async function GET(request: Request) {
  const auth = await authorizeAdmin(request)
  if ('response' in auth) return auth.response
  const { adminClient } = auth

  const url = new URL(request.url)
  const periode = url.searchParams.get('periode') || ''
  const jenjang = url.searchParams.get('jenjang') || ''
  const kelasText = url.searchParams.get('kelas') || ''
  const kelompok = url.searchParams.get('kelompok') || ''
  const kelas = Number(kelasText)

  if (!periode) return responseError('Periode wajib dipilih', 400)
  // Raport Hifzh resmi selalu mewakili satu periode kalender yang jelas tipenya (mid_semester atau
  // semester) -- "Tanpa Periode Kalender" hanya untuk audit data historis di layar rekap, bukan
  // untuk dicetak sebagai raport resmi.
  if (periode === 'tanpa-periode') return responseError('Raport Hifzh resmi tidak dapat diunduh untuk data Tanpa Periode Kalender', 400)
  if (!JENJANG_VALID.has(jenjang as Jenjang)) return responseError('Jenjang wajib dipilih', 400)
  if (!Number.isInteger(kelas) || kelas < 1) return responseError('Kelas wajib dipilih', 400)
  if (!KELOMPOK_VALID.has(kelompok as Kelompok)) return responseError('Kelompok wajib dipilih', 400)

  const jenjangFinal = jenjang as Jenjang
  const kelompokFinal = kelompok as Kelompok

  // Tipe ujian tidak lagi diterima dari frontend -- diturunkan di server dari kalender_akademik
  // yang dipilih, supaya tidak mungkin lagi terjadi kombinasi kontradiktif seperti "Semester Genap"
  // dipasangkan dengan tipe "Mid Semester".
  const { data: kalender, error: kalenderError } = await adminClient
    .from('kalender_akademik')
    .select('id, nama, tipe, tanggal_mulai, semester')
    .eq('id', periode)
    .maybeSingle()
  if (kalenderError) return responseError('Gagal memuat data periode', 500)
  if (!kalender) return responseError('Periode tidak ditemukan', 404)
  if (kalender.tipe !== 'mid_semester' && kalender.tipe !== 'semester') {
    return responseError('Periode ini bukan periode ujian (mid semester/semester)', 400)
  }
  const periodeInfo = kalender
  const tipe = kalender.tipe

  let santriQuery = adminClient
    .from('santri')
    .select('id, nama, kelas, kelas_num, jenjang, jenis_kelas, nisn, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
    .eq('status', 'aktif')
    .eq('jenjang', jenjangFinal)
    .eq('kelas_num', kelas)
  santriQuery = kelompokFinal === 'tn'
    ? santriQuery.in('jenis_kelas', ['tn_a', 'tn_b'])
    : santriQuery.eq('jenis_kelas', kelompokFinal)

  const { data: santriData, error: santriError } = await santriQuery.order('nama', { ascending: true })
  if (santriError) return responseError('Gagal memuat data santri', 500)

  const santriList = (santriData || []) as (SantriScope & { nisn: string | null })[]
  if (santriList.length === 0) {
    return responseError('Tidak ada santri aktif pada kombinasi jenjang, kelas, dan kelompok ini', 404)
  }

  const { data: masterData, error: masterError } = await adminClient
    .from('master_segment_ujian')
    .select('id, juz, segmen, urutan_global, halaman_awal, halaman_akhir, jumlah_halaman, surah_awal_nomor, ayat_awal, surah_akhir_nomor, ayat_akhir, is_aktif')
    .eq('is_aktif', true)
    .order('urutan_global', { ascending: true })
  if (masterError) return responseError('Gagal memuat master segmen ujian', 500)
  const masterSegments = (masterData || []) as unknown as MasterSegment[]
  if (masterSegments.length !== 151) return responseError('Master segmen ujian belum lengkap', 500)

  const santriIds = santriList.map(item => item.id)
  const nilaiQuery = adminClient
    .from('nilai_ujian')
    .select('id, santri_id, segment_ujian_id, tanggal, created_at, nilai_akhir')
    .in('santri_id', santriIds)
    .not('segment_ujian_id', 'is', null)
    .eq('tipe', tipe)
    .eq('kalender_id', periode)

  const { data: nilaiRows, error: nilaiError } = await nilaiQuery
  if (nilaiError) return responseError('Gagal memuat nilai ujian', 500)

  type NilaiRow = { santri_id: string, segment_ujian_id: string, tanggal: string | null, created_at: string | null, id: string, nilai_akhir: number }
  const terbaruPerKey = new Map<string, NilaiRow>()
  ;[...(nilaiRows || []) as NilaiRow[]]
    .sort(compareNilaiTerbaru)
    .forEach(row => {
      const key = `${row.santri_id}|${row.segment_ujian_id}`
      if (!terbaruPerKey.has(key)) terbaruPerKey.set(key, row)
    })

  const nilaiTerbaruPerSantri = new Map<string, Map<string, number>>()
  terbaruPerKey.forEach(row => {
    if (!nilaiTerbaruPerSantri.has(row.santri_id)) nilaiTerbaruPerSantri.set(row.santri_id, new Map())
    nilaiTerbaruPerSantri.get(row.santri_id)!.set(row.segment_ujian_id, Number(row.nilai_akhir))
  })

  // Label periode dan semester berasal dari data kalender itu sendiri -- bukan tebakan dari bulan
  // tanggal_mulai (heuristik lama bisa salah, mis. kalender "Semester Genap" yang tanggal_mulai-nya
  // jatuh di bulan Juli-Desember akan salah dilabeli GANJIL).
  const tahunMulai = periodeInfo?.tanggal_mulai ? Number(periodeInfo.tanggal_mulai.slice(0, 4)) : new Date().getFullYear()
  const bulanMulai = periodeInfo?.tanggal_mulai ? Number(periodeInfo.tanggal_mulai.slice(5, 7)) : new Date().getMonth() + 1
  const tahunAjaranAwal = bulanMulai >= 7 ? tahunMulai : tahunMulai - 1
  const tahunAjaranFallback = `${tahunAjaranAwal}/${tahunAjaranAwal + 1}`
  const periodeLabel = periodeInfo?.nama?.trim() || tahunAjaranFallback
  const semesterLabel = periodeInfo?.semester === 1 ? 'GASAL' : periodeInfo?.semester === 2 ? 'GENAP' : '-'

  const santriRaportList: SantriRaport[] = santriList.map(santri => {
    const cakupan = getCakupanSegment(santri, masterSegments)
    const nilaiPerSegmen = nilaiTerbaruPerSantri.get(santri.id) || new Map<string, number>()
    const juzList = cakupan.lengkap ? hitungRingkasanJuz(cakupan, masterSegments, nilaiPerSegmen) : []

    const juzNilai = new Map<number, number | null>()
    juzList.forEach(j => {
      juzNilai.set(j.juz, j.status === 'selesai' ? nilaiRapor(j.rata) : null)
    })

    return {
      id: santri.id,
      nama: santri.nama,
      nisn: santri.nisn,
      kelasNum: santri.kelas_num,
      jenjang: santri.jenjang,
      jenisKelas: santri.jenis_kelas,
      juzNilai,
    }
  })

  let buffer: Buffer
  try {
    buffer = await buildRaportHifzhWorkbook({
      santriList: santriRaportList,
      periodeLabel,
      semesterLabel,
    })
  } catch {
    return responseError('Gagal membentuk file raport dari template', 500)
  }

  const kelasLabel = santriList[0]?.kelas || `Kelas ${kelas}`
  const filename = `raport-hifzh-${slugify(kelasLabel)}-${slugify(labelFilterKelompok(kelompokFinal))}-${labelTipe(tipe)}-${tahunAjaranAwal}.xlsx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
