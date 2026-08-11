import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '../../lib/serverAuth'
import { bisaAksesJenisKelas } from '../../lib/wingAkses'

type SetoranBody = Record<string, unknown> & {
  santri_id?: unknown
  jenis?: unknown
  status?: unknown
  status_kehadiran?: unknown
  tanggal?: unknown
  guru_pengganti?: unknown
  surah_selesai_nomor?: unknown
  ayat_selesai_baru?: unknown
  penambahan_juz?: unknown
}

// bisaAksesJenisKelas (mapping wing produksi, keputusan bisnis final OPSI A)
// dipindah ke app/lib/wingAkses.ts (URGENT FIX akses Nilai Ujian) supaya
// app/api/nilai-ujian/route.ts bisa reuse persis definisi yang sama -- logic
// TIDAK diubah, hanya lokasinya. Tetap direplikasi juga di migration
// 20260808220000 (public.current_user_can_access_jenis_kelas) sebagai lapisan
// pertahanan kedua di RLS.

const FIELD_SETORAN_DIIZINKAN = [
  'santri_id',
  'jenis',
  'status',
  'catatan',
  'status_kehadiran',
  'tanggal',
  'guru_pengganti',
  'surah_mulai_nomor',
  'surah_selesai_nomor',
  'surah',
  'ayat_mulai',
  'ayat_selesai',
  'ayat_mulai_baru',
  'ayat_selesai_baru',
  'penambahan_juz',
  'jumlah_halaman_murojaah',
] as const

const PESAN_WUSTHA_TERKUNCI = 'Santri masih memiliki tanggungan hafalan lama. Setorkan hafalan lama hingga Najih terlebih dahulu.'

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

export async function POST(request: Request) {
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
    .select('role, jenis_kelas')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (callerProfileError || callerProfile?.role !== 'guru') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  let body: SetoranBody
  try {
    body = await request.json() as SetoranBody
  } catch {
    return NextResponse.json({ error: 'Data setoran tidak valid' }, { status: 400 })
  }

  const { santri_id: santriId, jenis, status, status_kehadiran: statusKehadiran, tanggal } = body
  if (
    typeof santriId !== 'string' || !santriId ||
    (jenis !== 'lama' && jenis !== 'baru') ||
    (status !== 'lancar' && status !== 'rosib') ||
    statusKehadiran !== 'hadir' ||
    typeof tanggal !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)
  ) {
    return NextResponse.json({ error: 'Data setoran tidak valid' }, { status: 400 })
  }

  // Field posisi hafalan hanya relevan untuk jenis 'baru' (dipakai untuk update
  // progress santri setelah setoran berhasil disimpan -- lihat bagian bawah).
  // Divalidasi di sini (sebelum insert) supaya tidak ada state setengah-jadi
  // (setoran tersimpan tapi progress gagal diupdate karena data tidak valid).
  let surahSelesaiNomor = 0
  let ayatSelesaiNum = 0
  let penambahanJuzNum = 0
  if (jenis === 'baru') {
    const rawSurah = body.surah_selesai_nomor
    const rawAyat = body.ayat_selesai_baru
    const rawPenambahan = body.penambahan_juz
    if (
      typeof rawSurah !== 'number' || !Number.isFinite(rawSurah) ||
      typeof rawAyat !== 'number' || !Number.isFinite(rawAyat) ||
      typeof rawPenambahan !== 'number' || !Number.isFinite(rawPenambahan)
    ) {
      return NextResponse.json({ error: 'Data hafalan baru tidak valid' }, { status: 400 })
    }
    surahSelesaiNomor = rawSurah
    ayatSelesaiNum = rawAyat
    penambahanJuzNum = rawPenambahan
  }

  const { data: santri, error: santriError } = await supabaseAuthenticated
    .from('santri')
    .select('id, jenjang, jenis_kelas, total_hafalan_juz, surah_terakhir_nomor, ayat_terakhir')
    .eq('id', santriId)
    .maybeSingle()

  if (santriError) {
    return NextResponse.json({ error: 'Gagal memverifikasi data santri' }, { status: 500 })
  }
  if (!santri) {
    return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 })
  }
  if (!bisaAksesJenisKelas(callerProfile.jenis_kelas, santri.jenis_kelas)) {
    return NextResponse.json({ error: 'Santri ini bukan bagian dari kelas yang Anda tangani' }, { status: 403 })
  }

  const { data: setoranSudahAda, error: cekDuplikasiError } = await supabaseAuthenticated
    .from('setoran')
    .select('id')
    .eq('santri_id', santriId)
    .eq('tanggal', tanggal)
    .eq('jenis', jenis)
    .eq('status_kehadiran', 'hadir')
    .limit(1)

  if (cekDuplikasiError) {
    return NextResponse.json({ error: 'Gagal memeriksa setoran hari ini' }, { status: 500 })
  }
  if (setoranSudahAda && setoranSudahAda.length > 0) {
    return NextResponse.json({
      error: jenis === 'lama'
        ? 'Setoran lama santri ini sudah diinput hari ini. Jika jenis setoran sebelumnya keliru, silakan edit data yang sudah ada.'
        : 'Hafalan baru santri ini sudah diinput hari ini. Jika jenis setoran sebelumnya keliru, silakan edit data yang sudah ada.',
    }, { status: 409 })
  }

  if (santri.jenjang === 'wustha' && jenis === 'baru') {
    const { data: setoranLama, error: setoranLamaError } = await supabaseAuthenticated
      .from('setoran')
      .select('id, status, tanggal, created_at')
      .eq('santri_id', santriId)
      .eq('jenis', 'lama')
      .eq('status_kehadiran', 'hadir')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)

    if (setoranLamaError) {
      return NextResponse.json({ error: 'Gagal memeriksa status hafalan lama' }, { status: 500 })
    }
    if (setoranLama?.[0]?.status === 'rosib') {
      return NextResponse.json(
        { error: PESAN_WUSTHA_TERKUNCI, code: 'WUSTHA_MUROJAAH_ROSIB' },
        { status: 409 }
      )
    }
  }

  const insertData: Record<string, unknown> = {}
  FIELD_SETORAN_DIIZINKAN.forEach(field => {
    if (body[field] !== undefined) insertData[field] = body[field]
  })
  insertData.guru_id = userData.user.id
  insertData.perlu_ulang = status === 'rosib'
  insertData.guru_pengganti = body.guru_pengganti === true

  const { error: insertError } = await supabaseAuthenticated
    .from('setoran')
    .insert(insertData)

  if (insertError) {
    return NextResponse.json({ error: 'Gagal menyimpan setoran' }, { status: 500 })
  }

  // Auto-update posisi hafalan santri -- dipindah dari browser Guru (dulu
  // direct .update() ke public.santri) ke sini. Algoritma IDENTIK dengan
  // logic lama (app/guru/page.tsx, sebelum perubahan ini): hanya berjalan
  // untuk jenis 'baru', memakai posisi hafalan santri yang sama seperti yang
  // dipakai untuk menghitung penambahan_juz di atas. Santri tidak lagi
  // diberi UPDATE langsung ke guru lewat RLS (lihat migration
  // 20260808220000_secure_santri_setoran_rls.sql) -- update ini memakai
  // service-role SETELAH role+jenis_kelas guru diverifikasi di atas, dan
  // hanya menulis 3 kolom posisi hafalan (tidak menerima object arbitrary
  // dari client).
  if (jenis === 'baru') {
    const surahTerakhir = santri.surah_terakhir_nomor
    const ayatTerakhir = santri.ayat_terakhir || 0
    const totalHafalanSekarang = santri.total_hafalan_juz || 0
    const serviceClient = createServiceRoleClient()

    if (status === 'lancar' && totalHafalanSekarang === 0 && !surahTerakhir) {
      // Belum ada baseline posisi hafalan -- input hafalan baru pertama jadi
      // acuan awal (dari surah ini sampai An-Nas / surah 114).
      const { data: surahRows } = await supabaseAuthenticated
        .from('surah')
        .select('nomor, halaman_mulai, halaman_selesai')
        .in('nomor', [surahSelesaiNomor, 114])
      const surahIni = surahRows?.find(s => s.nomor === surahSelesaiNomor)
      const surahAnNas = surahRows?.find(s => s.nomor === 114)
      let totalAwal = 0
      if (surahIni && surahAnNas) {
        const totalHalaman = surahAnNas.halaman_selesai - surahIni.halaman_mulai + 1
        totalAwal = Math.max(0, totalHalaman / 20)
      }
      await serviceClient.from('santri').update({
        total_hafalan_juz: totalAwal,
        surah_terakhir_nomor: surahSelesaiNomor,
        ayat_terakhir: ayatSelesaiNum,
      }).eq('id', santriId)
    } else {
      const adaKemajuan = status === 'lancar' && (
        !surahTerakhir ||
        surahSelesaiNomor < surahTerakhir ||
        (surahSelesaiNomor === surahTerakhir && ayatSelesaiNum > ayatTerakhir)
      )
      if (adaKemajuan) {
        const totalBaru = totalHafalanSekarang + penambahanJuzNum
        await serviceClient.from('santri').update({
          total_hafalan_juz: totalBaru,
          surah_terakhir_nomor: surahSelesaiNomor,
          ayat_terakhir: ayatSelesaiNum,
        }).eq('id', santriId)
      }
    }
  }

  return NextResponse.json({ success: true })
}
