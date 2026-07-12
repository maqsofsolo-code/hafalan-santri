import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

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

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization')
  const bearerMatch = authorization?.match(/^Bearer\s+(\S+)$/i)
  if (!bearerMatch) {
    return NextResponse.json({ error: 'Session tidak valid atau sudah berakhir' }, { status: 401 })
  }

  const accessToken = bearerMatch[1]
  const supabaseAuthenticated = createAuthenticatedClient(accessToken)
  const { data: userData, error: userError } = await supabaseAuthenticated.auth.getUser(accessToken)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Session tidak valid atau sudah berakhir' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabaseAuthenticated
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  try {
    const supabase = createAdminClient()

    // Ambil semua data santri lengkap
    const { data: santri } = await supabase
      .from('santri')
      .select('*, guru:guru_id(nama, no_wa), wali:wali_id(nama, no_wa)')
      .order('jenjang', { ascending: true })
      .order('kelas_num', { ascending: true })
      .order('nama', { ascending: true })

    // Ambil semua data guru
    const { data: guru } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'guru')
      .order('nama', { ascending: true })

    const wb = XLSX.utils.book_new()

    // ===== SHEET 1: DATA SANTRI =====
    const jenjangLabel = (j: string) => {
      if (j === 'ula') return 'Ulaa'
      if (j === 'wustha') return 'Wustha'
      if (j === 'ulya') return 'Ulya'
      return j || '-'
    }

    const kelasLabel = (s: { kelas_num?: number | null; jenjang?: string | null; kelas?: string | null }) => {
      if (!s.kelas_num || !s.jenjang) return s.kelas || '-'
      const jenLabel = jenjangLabel(s.jenjang).toUpperCase()
      return `${s.kelas_num} ${jenLabel === 'ULAA' ? 'BANIN' : jenLabel === 'WUSTHA' ? 'BANIN' : 'BANIN'}`
    }

    const formatTanggal = (tgl: string | null) => {
      if (!tgl) return '-'
      try {
        const d = new Date(tgl)
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
      } catch { return tgl }
    }

    const santriRows = (santri || []).map((s, i) => ({
      'No': i + 1,
      'Lembaga': jenjangLabel(s.jenjang),
      'Kelas': kelasLabel(s),
      'Nama Santri': s.nama || '-',
      'No. Induk Santri': s.nisn || '-',
      'NIK': s.nik || '-',
      'Tempat Lahir': s.tempat_lahir || '-',
      'Tgl Lahir': formatTanggal(s.tanggal_lahir),
      'Alamat': s.alamat || '-',
      'Nama Wali / Orang Tua': s.wali?.nama || '-',
      'No. HP Wali': s.wali?.no_wa || '-',
      'Guru Musami\'': s.guru?.nama || '-',
      'Total Hafalan (Juz)': s.total_hafalan_juz ? parseFloat(s.total_hafalan_juz).toFixed(2) : '0',
    }))

    const wsSantri = XLSX.utils.json_to_sheet(santriRows)

    // Set lebar kolom
    wsSantri['!cols'] = [
      { wch: 4 },   // No
      { wch: 10 },  // Lembaga
      { wch: 12 },  // Kelas
      { wch: 30 },  // Nama Santri
      { wch: 16 },  // No. Induk
      { wch: 20 },  // NIK
      { wch: 16 },  // Tempat Lahir
      { wch: 12 },  // Tgl Lahir
      { wch: 50 },  // Alamat
      { wch: 25 },  // Nama Wali
      { wch: 16 },  // No HP Wali
      { wch: 20 },  // Guru
      { wch: 16 },  // Total Hafalan
    ]

    XLSX.utils.book_append_sheet(wb, wsSantri, 'Data Santri')

    // ===== SHEET 2: DATA GURU =====
    // Hitung jumlah santri per guru
    const santriPerGuru: Record<string, number> = {}
    ;(santri || []).forEach(s => {
      if (s.guru_id) {
        santriPerGuru[s.guru_id] = (santriPerGuru[s.guru_id] || 0) + 1
      }
    })

    const guruRows = (guru || []).map((g, i) => ({
      'No': i + 1,
      'Nama Guru': g.nama || '-',
      'No. WhatsApp': g.no_wa || '-',
      'Jumlah Santri': santriPerGuru[g.id] || 0,
    }))

    const wsGuru = XLSX.utils.json_to_sheet(guruRows)
    wsGuru['!cols'] = [
      { wch: 4 },
      { wch: 25 },
      { wch: 18 },
      { wch: 14 },
    ]

    XLSX.utils.book_append_sheet(wb, wsGuru, 'Data Guru')

    // Generate file
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const tanggalFile = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Data_Santri_Daarus_Salaf_${tanggalFile}.xlsx"`,
      }
    })
  } catch {
    return NextResponse.json({ error: 'Gagal membuat file export' }, { status: 500 })
  }
}
