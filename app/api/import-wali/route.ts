import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ message: 'File tidak ditemukan' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)

    let waliDibuat = 0
    let waliDilewati = 0
    let santriTerhubung = 0
    let santriGagal = 0
    const errorList: string[] = []
    const emailToWaliId: Record<string, string> = {}

    for (const row of rows) {
      const namaWali = String(row.nama_wali || '').trim()
      const emailWali = String(row.email_wali || '').trim().toLowerCase()
      const noWaWali = String(row.no_wa_wali || '').trim()
      const password = String(row.password || '').trim()
      const namaSantri = String(row.nama_santri || '').trim()

      if (!namaWali || !emailWali || !namaSantri) {
        errorList.push(`Baris dilewati (data tidak lengkap): ${namaSantri || '(tanpa nama santri)'}`)
        continue
      }

      let waliId = emailToWaliId[emailWali]

      if (!waliId) {
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('role', 'wali')
          .ilike('nama', namaWali)
          .maybeSingle()

        if (existingProfile) {
          waliId = existingProfile.id
          emailToWaliId[emailWali] = waliId
          waliDilewati++
        } else {
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: emailWali,
            password: password || 'daarus2026',
            email_confirm: true,
          })

          if (authError || !authUser.user) {
            errorList.push(`Gagal buat akun wali ${namaWali}: ${authError?.message || 'unknown error'}`)
            continue
          }

          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
              id: authUser.user.id,
              nama: namaWali,
              role: 'wali',
              no_wa: noWaWali || null,
            })

          if (profileError) {
            errorList.push(`Gagal buat profile wali ${namaWali}: ${profileError.message}`)
            continue
          }

          waliId = authUser.user.id
          emailToWaliId[emailWali] = waliId
          waliDibuat++
        }
      }

      const { data: santriExact } = await supabaseAdmin
        .from('santri')
        .select('id, nama, wali_id')
        .eq('nama', namaSantri)
        .eq('status', 'aktif')

      let santriMatch = santriExact && santriExact.length === 1 ? santriExact[0] : null

      if (!santriMatch) {
        const { data: santriFuzzy } = await supabaseAdmin
          .from('santri')
          .select('id, nama, wali_id')
          .ilike('nama', namaSantri)
          .eq('status', 'aktif')

        if (santriFuzzy && santriFuzzy.length === 1) {
          santriMatch = santriFuzzy[0]
        } else if (santriFuzzy && santriFuzzy.length > 1) {
          errorList.push(`Santri "${namaSantri}" ditemukan lebih dari 1 (ambigu) — dilewati, hubungkan manual`)
          santriGagal++
          continue
        }
      }

      if (!santriMatch) {
        errorList.push(`Santri "${namaSantri}" tidak ditemukan di database`)
        santriGagal++
        continue
      }

      const { error: updateError } = await supabaseAdmin
        .from('santri')
        .update({ wali_id: waliId })
        .eq('id', santriMatch.id)

      if (updateError) {
        errorList.push(`Gagal hubungkan santri ${namaSantri}: ${updateError.message}`)
        santriGagal++
        continue
      }

      santriTerhubung++
    }

    return NextResponse.json({
      message: `Import selesai. Wali baru dibuat: ${waliDibuat}, wali sudah ada (dilewati): ${waliDilewati}, santri terhubung: ${santriTerhubung}, santri gagal: ${santriGagal}.`,
      detail: errorList,
    })
  } catch (err: any) {
    return NextResponse.json({ message: 'Gagal import: ' + err.message }, { status: 500 })
  }
}