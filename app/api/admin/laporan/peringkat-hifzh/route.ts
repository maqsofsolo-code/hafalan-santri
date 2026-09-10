import { NextResponse } from 'next/server'
import { authorize, createServiceRoleClient } from '../../../../lib/serverAuth'
import {
  getCakupanSegment,
  hitungRingkasanJuz,
  hitungNilaiUjianKeseluruhan,
  resolveSantriExamScopes,
  compareNilaiTerbaru,
  type MasterSegment,
  type SantriScope,
} from '../../../../lib/adminNilaiUjian'
import { hitungRankingUjianHafalanKelas, type SantriUjianRankingInput } from '../../../../lib/ranking'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type NilaiRow = {
  id: string
  santri_id: string
  segment_ujian_id: string
  tanggal: string | null
  created_at: string | null
  nilai_akhir: number
}

export async function GET(request: Request) {
  // 1. Authorization: ADMIN ONLY
  const auth = await authorize(request, ['admin'])
  if ('response' in auth) return auth.response

  const serviceClient = createServiceRoleClient()

  // 2. Resolve Active Periode Akademik (fail closed jika tidak ada atau ambigu)
  const { data: activePeriods, error: periodError } = await serviceClient
    .from('periode_akademik')
    .select('id, tahun_ajaran, semester, tanggal_mulai, tanggal_selesai, is_aktif')
    .eq('is_aktif', true)

  if (periodError) {
    return NextResponse.json({ error: 'Gagal memuat periode akademik: ' + periodError.message }, { status: 500 })
  }
  if (!activePeriods || activePeriods.length === 0) {
    return NextResponse.json({ error: 'Tidak ada periode akademik aktif. Hubungi Admin untuk mengaktifkan periode akademik.' }, { status: 400 })
  }
  if (activePeriods.length > 1) {
    return NextResponse.json({ error: `Terdeteksi lebih dari satu periode akademik aktif (${activePeriods.length} periode).` }, { status: 500 })
  }
  const periode = activePeriods[0]

  // 3. Resolve Matching Kalender Ujian Semester (fail closed jika tidak ada atau ambigu)
  const { data: kalenderRows, error: kalenderError } = await serviceClient
    .from('kalender_akademik')
    .select('id, nama, tipe, semester, tanggal_mulai, tanggal_selesai')
    .eq('tipe', 'semester')
    .eq('semester', periode.semester)
    .order('tanggal_mulai', { ascending: false })

  if (kalenderError) {
    return NextResponse.json({ error: 'Gagal memuat kalender akademik: ' + kalenderError.message }, { status: 500 })
  }
  if (!kalenderRows || kalenderRows.length === 0) {
    return NextResponse.json({ error: 'Kalender ujian semester tidak ditemukan.' }, { status: 404 })
  }

  const tahunMulai = periode.tahun_ajaran.split('/')[0]
  const matchingKalender = kalenderRows.filter(k => k.nama.includes(tahunMulai) || k.nama.includes(periode.tahun_ajaran))
  if (matchingKalender.length === 0) {
    return NextResponse.json({ error: 'Kalender ujian semester yang cocok dengan tahun ajaran tidak ditemukan.' }, { status: 404 })
  }
  if (matchingKalender.length > 1) {
    return NextResponse.json({ error: 'Terdeteksi lebih dari satu kalender ujian semester yang cocok (ambigu).' }, { status: 500 })
  }
  const kalender = matchingKalender[0]

  // 4. Load Master Segment Ujian (151 segmen aktif)
  const { data: masterData, error: masterError } = await serviceClient
    .from('master_segment_ujian')
    .select('id, juz, segmen, urutan_global, halaman_awal, halaman_akhir, jumlah_halaman, surah_awal_nomor, ayat_awal, surah_akhir_nomor, ayat_akhir, is_aktif')
    .eq('is_aktif', true)
    .order('urutan_global', { ascending: true })

  if (masterError) {
    return NextResponse.json({ error: 'Gagal memuat master segmen ujian: ' + masterError.message }, { status: 500 })
  }
  const masterSegments = (masterData || []) as unknown as MasterSegment[]
  if (masterSegments.length !== 151) {
    return NextResponse.json({ error: 'Master segmen ujian belum lengkap (harus 151 segmen).' }, { status: 500 })
  }

  // 5. Load All Active Banin Santri (Kelas 1–12) in a single batch query
  const { data: allSantriData, error: santriError } = await serviceClient
    .from('santri')
    .select('id, nama, kelas, kelas_num, jenjang, jenis_kelas, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
    .eq('status', 'aktif')
    .eq('jenis_kelas', 'banin')
    .gte('kelas_num', 1)
    .lte('kelas_num', 12)
    .order('nama', { ascending: true })

  if (santriError) {
    return NextResponse.json({ error: 'Gagal memuat data santri: ' + santriError.message }, { status: 500 })
  }
  const allSantri = (allSantriData || []) as SantriScope[]

  // 6. Load Nilai Ujian for all Banin santri in this kalender (paginated to bypass Supabase 1000 limit)
  const allSantriIds = allSantri.map(s => s.id)
  const nilaiRows: NilaiRow[] = []
  if (allSantriIds.length > 0) {
    const pageSize = 1000
    let page = 0
    let hasMore = true
    while (hasMore) {
      const from = page * pageSize
      const to = from + pageSize - 1
      const { data: chunk, error: nilaiError } = await serviceClient
        .from('nilai_ujian')
        .select('id, santri_id, segment_ujian_id, tanggal, created_at, nilai_akhir')
        .in('santri_id', allSantriIds)
        .not('segment_ujian_id', 'is', null)
        .eq('tipe', kalender.tipe)
        .eq('kalender_id', kalender.id)
        .range(from, to)

      if (nilaiError) {
        return NextResponse.json({ error: 'Gagal memuat nilai ujian: ' + nilaiError.message }, { status: 500 })
      }
      if (chunk && chunk.length > 0) {
        nilaiRows.push(...(chunk as NilaiRow[]))
        if (chunk.length < pageSize) {
          hasMore = false
        } else {
          page++
        }
      } else {
        hasMore = false
      }
    }
  }

  // Deduplicate latest score per santri_id + segment_ujian_id using canonical compareNilaiTerbaru
  const terbaruPerKey = new Map<string, NilaiRow>()
  ;[...nilaiRows]
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

  // 7. Resolve Exam Scopes in a single batch call (respects snapshot & reconstruction cutoff)
  const scopeResult = await resolveSantriExamScopes(
    serviceClient,
    allSantri,
    kalender.id,
    kalender.tanggal_mulai
  )
  if (scopeResult.status === 'CAKUPAN_BELUM_DIKUNCI') {
    return NextResponse.json({ error: 'Cakupan ujian untuk periode ini belum dikunci oleh Admin.' }, { status: 422 })
  }
  const resolvedSantriList = scopeResult.scopes

  // 8. Group by class and calculate canonical ranking per class
  const kelasList = []
  for (let k = 1; k <= 12; k++) {
    const expectedJenjang = k <= 6 ? 'ula' : k <= 9 ? 'wustha' : 'ulya'
    const classSantri = resolvedSantriList.filter(s => s.kelas_num === k && s.jenjang === expectedJenjang)

    if (classSantri.length === 0) {
      kelasList.push({
        kelasNum: k,
        jenjang: expectedJenjang,
        peringkat: [],
      })
      continue
    }

    const santriRankingInput: SantriUjianRankingInput[] = classSantri.map(santri => {
      const cakupan = getCakupanSegment(santri, masterSegments)
      const nilaiPerSegmen = nilaiTerbaruPerSantri.get(santri.id) || new Map<string, number>()
      const ringkasanJuz = cakupan.lengkap ? hitungRingkasanJuz(cakupan, masterSegments, nilaiPerSegmen) : []
      return {
        id: santri.id,
        nama: santri.nama,
        total_hafalan_juz: santri.total_hafalan_juz,
        nilaiUjianKeseluruhan: hitungNilaiUjianKeseluruhan(ringkasanJuz, { isFinal: true }),
      }
    })

    // Canonical helper: hitungRankingUjianHafalanKelas (app/lib/ranking.ts)
    const { peringkat } = hitungRankingUjianHafalanKelas(santriRankingInput)

    // Slice top 3 without reranking or transforming numbers
    const top3 = peringkat.slice(0, 3).map(p => ({
      santriId: p.id,
      nama: p.nama,
      peringkat: p.peringkat,
      nilaiPeringkat: p.nilaiPeringkat,
    }))

    kelasList.push({
      kelasNum: k,
      jenjang: expectedJenjang,
      peringkat: top3,
    })
  }

  return NextResponse.json({
    success: true,
    periode: {
      tahun_ajaran: periode.tahun_ajaran,
      semester: periode.semester,
      label: `Semester ${periode.semester} • Tahun Ajaran ${periode.tahun_ajaran}`,
    },
    kelasList,
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
