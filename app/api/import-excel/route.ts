import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEFAULT_PASSWORD = 'Hafalan123!'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })

  const hasil = { guru: 0, santri: 0, wali: 0, skip: 0, error: [] as string[] }

  // ===== IMPORT GURU =====
  if (wb.SheetNames.includes('Guru')) {
    const ws = wb.Sheets['Guru']
    const rows = XLSX.utils.sheet_to_json(ws) as any[]

    for (const row of rows) {
      if (!row.nama || !row.email) continue
      // Cek apakah email sudah ada
      const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
      const sudahAda = existing?.users?.find((u: any) => u.email === row.email)
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
        no_wa: row.no_wa || null
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

      // Cek duplikat nama santri
      const { data: existing } = await supabaseAdmin
        .from('santri').select('id').eq('nama', row.nama).single()
      if (existing) { hasil.skip++; continue }

      // Cari guru berdasarkan email
      let guruId = null
      if (row.email_guru) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const guruUser = existingUsers?.users?.find((u: any) => u.email === row.email_guru)
        if (guruUser) {
          const { data: guruProfile } = await supabaseAdmin
            .from('profiles').select('id').eq('id', guruUser.id).single()
          if (guruProfile) guruId = guruProfile.id
        }
      }

      await supabaseAdmin.from('santri').insert({
        nama: row.nama,
        kelas: row.kelas || null,
        guru_id: guruId
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

      // Cek duplikat email
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
        no_wa: row.no_wa || null
      })

      // Hubungkan ke santri jika ada nama_santri
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
    message: `Import selesai! Guru: ${hasil.guru}, Santri: ${hasil.santri}, Wali: ${hasil.wali}, Dilewati: ${hasil.skip}`,
    detail: hasil
  })
}