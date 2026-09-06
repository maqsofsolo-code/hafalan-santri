import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../../lib/serverAuth'
import { hitungRankingRapotKelas, type JenjangKey } from '../../../lib/rapotDigital'
import { hitungKetidakhadiranSantri } from '../../../lib/absensiRapot'
import { muatNilaiHifzhFinalKelas } from '../../../lib/hifzhRapot'
import { buildRapotDigitalClassWorkbook, type SantriRapotExcelData } from '../../../lib/rapotDigitalExcel'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function labelJenisKelas(jk: string): string {
  if (jk === 'banin') return 'Banin'
  if (jk === 'banat') return 'Banat'
  if (jk === 'tn_a') return 'TN A'
  if (jk === 'tn_b') return 'TN B'
  return jk
}

export async function GET(request: Request) {
  const auth = await authorize(request, ['admin', 'guru'])
  if ('response' in auth) return auth.response

  const { searchParams } = new URL(request.url)
  const periodeId = searchParams.get('periode_id')
  const kelasNumRaw = searchParams.get('kelas_num') || searchParams.get('kelas')
  const jenisKelas = searchParams.get('jenis_kelas')
  const jenjangRaw = searchParams.get('jenjang')

  if (!periodeId || !kelasNumRaw || !jenisKelas) {
    return NextResponse.json({ error: 'Parameter periode_id, kelas_num, dan jenis_kelas wajib diisi' }, { status: 400 })
  }

  const kelasNum = parseInt(kelasNumRaw, 10)
  if (!Number.isInteger(kelasNum) || kelasNum < 1 || kelasNum > 12) {
    return NextResponse.json({ error: 'Nilai kelas_num tidak valid' }, { status: 400 })
  }

  const validJenisKelas = ['banin', 'banat', 'tn_a', 'tn_b']
  if (!validJenisKelas.includes(jenisKelas)) {
    return NextResponse.json({ error: 'Nilai jenis_kelas tidak valid' }, { status: 400 })
  }

  const jenjang = (jenjangRaw || (kelasNum <= 6 ? 'ula' : kelasNum <= 9 ? 'wustha' : 'ulya')) as JenjangKey
  const serviceClient = createServiceRoleClient()

  // 1. Ambil data periode akademik
  const { data: periode, error: periodeError } = await serviceClient
    .from('periode_akademik')
    .select('id, tahun_ajaran, semester, tanggal_mulai, tanggal_selesai, rapot_input_dibuka')
    .eq('id', periodeId)
    .maybeSingle()

  if (periodeError || !periode) {
    return NextResponse.json({ error: 'Periode akademik tidak ditemukan' }, { status: 404 })
  }

  // 2. Otorisasi spesifik role
  if (auth.role === 'guru') {
    // A. Check window input
    if (!periode.rapot_input_dibuka) {
      return NextResponse.json({ error: 'Input nilai rapot sedang ditutup oleh Admin.' }, { status: 403 })
    }

    // B. Check penugasan wali kelas
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

  // 3. Query santri aktif pada kelas ini
  const { data: santriList, error: santriError } = await serviceClient
    .from('santri')
    .select('id, nama, nisn, kelas, kelas_num, jenjang, jenis_kelas, status, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
    .eq('kelas_num', kelasNum)
    .eq('jenis_kelas', jenisKelas)
    .eq('jenjang', jenjang)
    .eq('status', 'aktif')
    .order('nama', { ascending: true })

  if (santriError) {
    return NextResponse.json({ error: 'Gagal memuat data santri: ' + santriError.message }, { status: 500 })
  }

  const santriRows = santriList || []
  if (santriRows.length === 0) {
    return NextResponse.json({ error: 'Tidak ada santri aktif pada kelas ini' }, { status: 404 })
  }

  const santriIds = santriRows.map(s => s.id)

  // 4. Query nilai_rapot, absensi, Hifzh, dan Wali Kelas resmi
  const [nilaiRes, absensiMap, hifzhMap, waliRow] = await Promise.all([
    serviceClient
      .from('nilai_rapot')
      .select('*')
      .eq('periode_id', periodeId)
      .in('santri_id', santriIds),
    hitungKetidakhadiranSantri(serviceClient, santriIds, periode.tanggal_mulai, periode.tanggal_selesai),
    muatNilaiHifzhFinalKelas(serviceClient, santriRows, periode),
    serviceClient
      .from('wali_kelas_assignment')
      .select('guru:guru_id(nama)')
      .eq('periode_id', periodeId)
      .eq('kelas_num', kelasNum)
      .eq('jenis_kelas', jenisKelas)
      .eq('is_aktif', true)
      .maybeSingle(),
  ])

  if (nilaiRes.error) {
    return NextResponse.json({ error: 'Gagal memuat nilai rapot: ' + nilaiRes.error.message }, { status: 500 })
  }

  const nilaiMap = new Map<string, any>()
  for (const n of (nilaiRes.data || [])) {
    nilaiMap.set(n.santri_id, n)
  }

  // 5. Hitung ranking kelas dengan competition ranking
  const rankingRes = hitungRankingRapotKelas(santriRows, nilaiMap, jenjang)
  const rankingEvaluasiMap = new Map(rankingRes.hasilList.map(item => [item.id, item]))

  // 6. Nama Wali Kelas resmi
  const waliKelasNama = (waliRow?.data?.guru as any)?.nama?.trim() || 'Belum ditentukan'

  // 7. Siapkan payload data Excel
  const santriDataList: SantriRapotExcelData[] = santriRows.map(s => {
    const rawNilai = nilaiMap.get(s.id) || {}
    const absensi = absensiMap.get(s.id) || { hadir_sakit: 0, hadir_izin: 0, hadir_alpha: 0 }
    const hifzh = hifzhMap.get(s.id) || { kelancaran: null, tajwid: null, keterangan_hafalan: s.total_hafalan_juz ? `${s.total_hafalan_juz} Juz` : '-' }
    const evaluasi = rankingEvaluasiMap.get(s.id) || {
      lengkap: false,
      rataAkhir: null,
      rataDiniyyah: null,
      rataUmum: null,
      nilaiEfektifMap: {},
      peringkat: null,
    }

    return {
      santri: {
        id: s.id,
        nama: s.nama,
        nisn: s.nisn,
        kelas_num: s.kelas_num,
        jenjang: s.jenjang,
        jenis_kelas: s.jenis_kelas,
      },
      nilaiRaw: rawNilai,
      hifzh,
      absensi,
      evaluasi: {
        lengkap: evaluasi.lengkap,
        rataAkhir: evaluasi.rataAkhir,
        rataDiniyyah: evaluasi.rataDiniyyah,
        rataUmum: evaluasi.rataUmum,
        nilaiEfektifMap: evaluasi.nilaiEfektifMap,
        peringkat: evaluasi.peringkat,
      },
    }
  })

  // 8. Generate workbook
  const buffer = await buildRapotDigitalClassWorkbook({
    periode: {
      tahun_ajaran: periode.tahun_ajaran,
      semester: periode.semester,
      tanggal_selesai: periode.tanggal_selesai,
    },
    kelasNum,
    jenjang,
    jenisKelasLabel: labelJenisKelas(jenisKelas),
    waliKelasNama,
    totalSantriKelas: santriRows.length,
    santriDataList,
  })

  const sanitizedTahun = periode.tahun_ajaran.replace(/[^a-zA-Z0-9]/g, '-')
  const filename = `Rapot-Kelas-${kelasNum}-${labelJenisKelas(jenisKelas)}-${sanitizedTahun}-Smt${periode.semester}.xlsx`

  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
