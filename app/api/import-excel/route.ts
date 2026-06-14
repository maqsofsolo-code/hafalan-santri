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

function parseTanggal(val: any): string | null {
  if (!val) return null
  if (typeof val === 'string') {
    if (val.includes('/')) {
      const parts = val.split('/')
      if (parts.length === 3) {
        const [d, m, y] = parts
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      }
    }
    if (val.match(/^\d{4}-\d{2}-\d{2}$/)) return val
    return null
  }
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val)
    if (!date) return null
    const y = date.y
    const m = String(date.m).padStart(2, '0')
    const d = String(date.d).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return null
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })

  const hasil = {
    guru: 0, santri: 0, wali: 0, diupdate: 0,
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

      // Cari guru utama dulu sebelum cek duplikat
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

      // Cari guru kedua dulu sebelum cek duplikat
      let guruId2 = null
      if (row.email_guru_2) {
        const { data: users2 } = await supabaseAdmin.auth.admin.listUsers()
        const guruUser2 = users2?.users?.find((u: any) => u.email === row.email_guru_2)
        if (guruUser2) {
          const { data: p2 } = await supabaseAdmin
            .from('profiles').select('id').eq('id', guruUser2.id).single()
          if (p2) guruId2 = p2.id
        }
      }

      // Cek duplikat — jika sudah ada, update field yang masih kosong saja
      const { data: existing } = await supabaseAdmin
        .from('santri')
        .select('id, nik, nisn, tempat_lahir, tanggal_lahir, alamat, guru_id, guru_id_2')
        .eq('nama', row.nama)
        .maybeSingle()

      if (existing) {
        const updateData: any = {}
        if (!existing.nik && row.nik) updateData.nik = row.nik.toString()
        if (!existing.nisn && row.nisn) updateData.nisn = row.nisn.toString()
        if (!existing.tempat_lahir && row.tempat_lahir) updateData.tempat_lahir = row.tempat_lahir.toString()
        if (!existing.tanggal_lahir && row.tanggal_lahir) updateData.tanggal_lahir = parseTanggal(row.tanggal_lahir)
        if (!existing.alamat && row.alamat) updateData.alamat = row.alamat.toString()
        if (!existing.guru_id && guruId) updateData.guru_id = guruId
        if (!existing.guru_id_2 && guruId2) updateData.guru_id_2 = guruId2

        if (Object.keys(updateData).length > 0) {
          await supabaseAdmin.from('santri').update(updateData).eq('id', existing.id)
          hasil.diupdate++
        } else {
          hasil.skip++
        }
        continue
      }

      // Santri baru — hitung total juz
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
      const jenisKelas = row.jenis_kelas?.toLowerCase() || 'banin'

      const buatKelasLabel = (num: number | null, jnj: string | null, jenis: string) => {
        if (!num || !jnj) return null
        if (jnj === 'ulya') {
          if (jenis === 'tn_a') return `Kelas ${num}A TN`
          if (jenis === 'tn_b') return `Kelas ${num}B TN`
          return `Kelas ${num}`
        }
        if (jenis === 'banat') return `Kelas ${num} Banat`
        return `Kelas ${num} Banin`
      }

      const kelasLabel = buatKelasLabel(kelasNum, jenjang, jenisKelas)

      // Parse tanggal lahir
      const tanggalLahir = parseTanggal(row.tanggal_lahir)

      await supabaseAdmin.from('santri').insert({
        nama: row.nama,
        jenjang: jenjang,
        kelas_num: kelasNum,
        kelas: kelasLabel,
        jenis_kelas: jenisKelas,
        guru_id: guruId,
        guru_id_2: guruId2,
        total_hafalan_juz: totalJuz,
        surah_terakhir_nomor: surahTerakhirNomor,
        nik: row.nik?.toString() || null,
        nisn: row.nisn?.toString() || null,
        tempat_lahir: row.tempat_lahir?.toString() || null,
        tanggal_lahir: tanggalLahir,
        alamat: row.alamat?.toString() || null,
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
    message: `Import selesai! Guru: ${hasil.guru}, Santri: ${hasil.santri}, Diupdate: ${hasil.diupdate}, Wali: ${hasil.wali}, Dilewati: ${hasil.skip}${hasil.error.length > 0 ? `, Error: ${hasil.error.length}` : ''}`,
    detail: hasil
  })
}