import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEFAULT_PASSWORD = 'Hafalan123!'

async function hitungJuzDariSurah(supabase: any, surahAwalNomor: number, surahAkhirNomor: number) {
  const nomorKecil = Math.min(surahAwalNomor, surahAkhirNomor)
  const nomorBesar = Math.max(surahAwalNomor, surahAkhirNomor)

  const { data: surahKecil } = await supabase
    .from('surah').select('halaman_mulai').eq('nomor', nomorKecil).single()
  const { data: surahBesar } = await supabase
    .from('surah').select('halaman_selesai').eq('nomor', nomorBesar).single()

  if (!surahKecil || !surahBesar) return 0
  const totalHalaman = surahBesar.halaman_selesai - surahKecil.halaman_mulai + 1
  return Math.max(0, totalHalaman / 20)
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })

  const hasil = {
    guru: 0, santri: 0, wali: 0,
    skip: 0, error: [] as string[]
  }

  // ===== IMPORT GURU =====
  if (wb.SheetNames.includes('Guru')) {
    const ws = wb.Sheets['Guru']
    const rows = XLSX.utils.sheet_to_json(ws) as any[]

    for (const row of rows) {
      if (!row.nama || !row.email) continue

      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const sudahAda = existingUsers?.users?.find((u: any) => u.email === row.email)
      if (sudahAda) { hasil.skip++; continue }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: row.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true
      })
      if (error) { hasil.error.push(`Guru ${row.nama}: ${error.message}`); continue }

      await supabaseAdmin.from('profiles').insert({
        id: data.user.id,
        nama: row.nama,
        role: 'guru',
        no_wa: row.no_wa?.toString() || null
      })
      hasil.guru++
    }
  }

  // ===== IMPORT SANTRI =====
  if (wb.SheetNames.includes('Santri')) {
    const ws = wb.Sheets['Santri']
    const rows = XLSX.utils.sheet_to_json(ws) as any[]

    for (const row of rows) {
      if (!row.nama) continue

      // Cek duplikat
      const { data: existing } = await supabaseAdmin
        .from('santri').select('id').eq('nama', row.nama).single()
      if (existing) { hasil.skip++; continue }

      // Cari guru
      let guruId = null
      if (row.email_guru) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers()
        const guruUser = users?.users?.find((u: any) => u.email === row.email_guru)
        if (guruUser) {
          const { data: p } = await supabaseAdmin
            .from('profiles').select('id').eq('id', guruUser.id).single()
          if (p) guruId = p.id
        }
      }

      // Hitung total juz dari nomor surah
      let totalJuz = 0
      let surahTerakhirNomor = null
      if (row.surah_awal_nomor && row.surah_akhir_nomor) {
        totalJuz = await hitungJuzDariSurah(
          supabaseAdmin,
          parseInt(row.surah_awal_nomor),
          parseInt(row.surah_akhir_nomor)
        )
        surahTerakhirNomor = parseInt(row.surah_akhir_nomor)
      }

      // Tentukan label kelas
      const jenjang = row.jenjang?.toLowerCase() || null
      const kelasNum = row.kelas_num ? parseInt(row.kelas_num) : null
      const jenjangLabel = jenjang === 'ula' ? 'Ula' : jenjang === 'wustha' ? 'Wustha' : jenjang === 'ulya' ? 'Ulya' : ''
      const kelasLabel = kelasNum && jenjangLabel ? `Kelas ${kelasNum} ${jenjangLabel}` : null

      await supabaseAdmin.from('santri').insert({
        nama: row.nama,
        jenjang: jenjang,
        kelas_num: kelasNum,
        kelas: kelasLabel,
        guru_id: guruId,
        total_hafalan_juz: totalJuz,
        surah_terakhir_nomor: surahTerakhirNomor,
      })
      hasil.santri++
    }
  }

  // ===== IMPORT WALI =====
  if (wb.SheetNames.includes('Wali')) {
    const ws = wb.Sheets['Wali']
    const rows = XLSX.utils.sheet_to_json(ws) as any[]

    for (const row of rows) {
      if (!row.nama || !row.email) continue

      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const sudahAda = existingUsers?.users?.find((u: any) => u.email === row.email)
      if (sudahAda) { hasil.skip++; continue }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: row.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true
      })
      if (error) { hasil.error.push(`Wali ${row.nama}: ${error.message}`); continue }

      await supabaseAdmin.from('profiles').insert({
        id: data.user.id,
        nama: row.nama,
        role: 'wali',
        no_wa: row.no_wa?.toString() || null
      })

      // Hubungkan ke santri
      if (row.nama_santri) {
        await supabaseAdmin
          .from('santri')
          .update({ wali_id: data.user.id })
          .eq('nama', row.nama_santri)
      }

      hasil.wali++
    }
  }

  return NextResponse.json({
    message: `Import selesai! Guru: ${hasil.guru}, Santri: ${hasil.santri}, Wali: ${hasil.wali}, Dilewati: ${hasil.skip}${hasil.error.length > 0 ? `, Error: ${hasil.error.length}` : ''}`,
    detail: hasil
  })
}