import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { authorize } from '../../lib/serverAuth'
import { validasiKandidatGuru, type ProfilGuruRingkas } from '../../lib/wingAkses'
import { klasifikasikanSalinGuruHafalan, type BarisHafalanSumber, type BarisHafalanTarget } from '../../lib/salinPenugasan'

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

type GuruLookup = { id: string, role: string | null, jenis_kelas: string | null, nama: string | null }

// Cari profile guru dari email (auth.users -> profiles), sekalian ambil
// role/jenis_kelas -- dipakai untuk validasi wing sebelum assignment
// dibuat (Tahap 9L). Perilaku lookup email->id TIDAK diubah dari
// sebelumnya, hanya kolom yang diambil diperluas.
async function cariGuruDariEmail(email: unknown): Promise<GuruLookup | null> {
  if (!email || typeof email !== 'string') return null
  const { data: users } = await supabaseAdmin.auth.admin.listUsers()
  const guruUser = users?.users?.find((u: { email?: string | null }) => u.email === email)
  if (!guruUser) return null
  const { data: p } = await supabaseAdmin
    .from('profiles').select('id, role, jenis_kelas, nama').eq('id', guruUser.id).single()
  return p as GuruLookup | null
}

export async function POST(request: Request) {
  const auth = await authorize(request, ['admin'])
  if (auth.response) return auth.response

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

  // ===== Periode target (Tahap 9L Bagian G) -- eksplisit dari UI upload,
  // BUKAN kolom per-baris Excel, BUKAN ditebak dari is_aktif tanpa
  // konfirmasi. Kalau diberikan, HARUS benar-benar ada di DB -- kalau
  // tidak ada/tidak valid, SELURUH import ditolak sebelum menulis apa pun
  // (fail fast), bukan diam-diam melewati bagian assignment saja. Kalau
  // TIDAK diberikan sama sekali, import tetap boleh jalan (santri/guru/
  // wali biasa) TAPI tidak ada assignment Guru Hafalan resmi yang dibuat,
  // dan legacy guru_id/guru_id_2 TIDAK disentuh sama sekali (prinsip
  // "legacy hanya cermin assignment yang sukses" -- tidak ada assignment
  // yang sukses tanpa periode).
  const periodeIdRaw = formData.get('periode_id')
  const periodeIdInput = typeof periodeIdRaw === 'string' && periodeIdRaw.trim() ? periodeIdRaw.trim() : null
  let periodeId: string | null = null
  if (periodeIdInput) {
    const { data: periodeRow, error: periodeCheckError } = await supabaseAdmin
      .from('periode_akademik').select('id').eq('id', periodeIdInput).maybeSingle()
    if (periodeCheckError || !periodeRow) {
      return NextResponse.json({ error: 'Periode akademik target tidak ditemukan' }, { status: 400 })
    }
    periodeId = periodeRow.id
  }

  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })

  const hasil = {
    guru: 0, santri: 0, wali: 0, diupdate: 0,
    skip: 0, error: [] as string[],
    assignment: { berhasil: 0, sudahAda: 0, targetSudahDiatur: 0, konflikMaxDua: 0, lintasWing: 0, gagalLain: 0 },
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

    // Snapshot penugasan_hafalan periode target -- diperbarui di memori
    // setiap kali insert baru berhasil dalam loop ini (idempotent: rerun
    // file yang sama, atau baris lain dalam file yang sama, selalu
    // melihat state terkini, tidak pernah menghasilkan duplikat). Kosong
    // kalau periodeId tidak diberikan -- artinya tidak ada assignment
    // resmi sama sekali yang akan dicoba dari sheet ini.
    let targetSnapshot: BarisHafalanTarget[] = []
    if (periodeId) {
      const { data: existingAssignments } = await supabaseAdmin
        .from('penugasan_hafalan')
        .select('guru_id, santri_id, is_aktif')
        .eq('periode_id', periodeId)
      targetSnapshot = (existingAssignments || []) as BarisHafalanTarget[]
    }

    for (const row of rows) {
      if (!row.nama) continue

      const guru1 = await cariGuruDariEmail(row.email_guru)
      const guru2 = await cariGuruDariEmail(row.email_guru_2)
      const guruId = guru1?.id || null
      const guruId2 = guru2?.id || null

      // Cek duplikat — jika sudah ada, update field NON-ASSIGNMENT yang
      // masih kosong saja (behavior existing, TIDAK diubah). guru_id/
      // guru_id_2 TIDAK LAGI bagian dari updateData ini -- KOREKSI Tahap
      // 9L: legacy hanya boleh dicermin dari assignment resmi yang
      // sukses di bawah, tidak pernah ditulis independen dari Excel lagi.
      const { data: existing } = await supabaseAdmin
        .from('santri')
        .select('id, nik, nisn, tempat_lahir, tanggal_lahir, alamat, jenis_kelas')
        .eq('nama', row.nama)
        .maybeSingle()

      let santriId: string | null = null
      let santriJenisKelas: string | null = null

      if (existing) {
        santriId = existing.id
        santriJenisKelas = existing.jenis_kelas
        const updateData: any = {}
        if (!existing.nik && row.nik) updateData.nik = row.nik.toString()
        if (!existing.nisn && row.nisn) updateData.nisn = row.nisn.toString()
        if (!existing.tempat_lahir && row.tempat_lahir) updateData.tempat_lahir = row.tempat_lahir.toString()
        if (!existing.tanggal_lahir && row.tanggal_lahir) updateData.tanggal_lahir = parseTanggal(row.tanggal_lahir)
        if (!existing.alamat && row.alamat) updateData.alamat = row.alamat.toString()

        if (Object.keys(updateData).length > 0) {
          await supabaseAdmin.from('santri').update(updateData).eq('id', existing.id)
          hasil.diupdate++
        } else if (!guruId && !guruId2) {
          hasil.skip++
        }
      } else {
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
        const tanggalLahir = parseTanggal(row.tanggal_lahir)

        // guru_id/guru_id_2 SELALU null di INSERT ini -- KOREKSI Tahap
        // 9L, sama seperti CREATE lewat Data Santri (app/api/admin/santri/route.ts):
        // legacy hanya dicermin SETELAH assignment resmi berhasil.
        const { data: santriBaru, error: insertSantriError } = await supabaseAdmin.from('santri').insert({
          nama: row.nama,
          jenjang: jenjang,
          kelas_num: kelasNum,
          kelas: kelasLabel,
          jenis_kelas: jenisKelas,
          guru_id: null,
          guru_id_2: null,
          total_hafalan_juz: totalJuz,
          surah_terakhir_nomor: surahTerakhirNomor,
          nik: row.nik?.toString() || null,
          nisn: row.nisn?.toString() || null,
          tempat_lahir: row.tempat_lahir?.toString() || null,
          tanggal_lahir: tanggalLahir,
          alamat: row.alamat?.toString() || null,
        }).select('id, jenis_kelas').single()

        if (insertSantriError || !santriBaru) {
          hasil.error.push(`Santri ${row.nama}: ${insertSantriError?.message || 'gagal dibuat'}`)
          continue
        }
        santriId = santriBaru.id
        santriJenisKelas = santriBaru.jenis_kelas
        hasil.santri++
      }

      // ===== Assignment Guru Hafalan resmi (Tahap 9L Bagian H/I) =====
      // Berlaku SAMA untuk santri baru maupun existing -- reuse
      // klasifikasikanSalinGuruHafalan (Tahap 9H) apa adanya supaya
      // "target manual selalu menang / maks 2 / exact pair tidak
      // duplikat / inactive tidak diaktifkan kembali / rerun idempotent"
      // ditegakkan oleh SATU mesin yang sama, tidak diduplikasi. Validasi
      // wing dilakukan DULU di sini (di luar fungsi Tahap 9H, karena
      // sumbernya Excel belum tentu valid -- beda dari sumber Tahap 9H
      // yang selalu dari periode lain yang sudah tervalidasi trigger).
      if (santriId && periodeId && (guruId || guruId2)) {
        const kandidat: BarisHafalanSumber[] = []

        const profilKe = (g: GuruLookup | null): ProfilGuruRingkas | undefined =>
          g ? { id: g.id, role: g.role, jenis_kelas: g.jenis_kelas } : undefined

        if (guruId) {
          const v = validasiKandidatGuru(guruId, profilKe(guru1), santriJenisKelas)
          if (v.status === 'VALID') kandidat.push({ guru_id: guruId, santri_id: santriId })
          else hasil.assignment.lintasWing++
        }
        if (guruId2) {
          const v2 = validasiKandidatGuru(guruId2, profilKe(guru2), santriJenisKelas)
          if (v2.status === 'VALID') kandidat.push({ guru_id: guruId2, santri_id: santriId })
          else hasil.assignment.lintasWing++
        }

        if (kandidat.length > 0) {
          const rencana = klasifikasikanSalinGuruHafalan(kandidat, targetSnapshot)
          const legacyUpdate: Record<string, unknown> = {}

          for (const r of rencana) {
            if (r.rencana === 'SUDAH_ADA_SAMA') { hasil.assignment.sudahAda++; continue }
            if (r.rencana === 'SKIP_TARGET_SUDAH_DIATUR') { hasil.assignment.targetSudahDiatur++; continue }
            if (r.rencana === 'KONFLIK_MAX_DUA') { hasil.assignment.konflikMaxDua++; continue }

            const { error: insertAssignError } = await supabaseAdmin.from('penugasan_hafalan').insert({
              guru_id: r.guru_id, santri_id: r.santri_id, periode_id: periodeId, is_aktif: true,
            })
            if (insertAssignError) { hasil.assignment.gagalLain++; continue }

            targetSnapshot.push({ guru_id: r.guru_id, santri_id: r.santri_id, is_aktif: true })
            hasil.assignment.berhasil++
            if (r.guru_id === guruId) legacyUpdate.guru_id = guruId
            if (r.guru_id === guruId2) legacyUpdate.guru_id_2 = guruId2
          }

          if (Object.keys(legacyUpdate).length > 0) {
            await supabaseAdmin.from('santri').update(legacyUpdate).eq('id', santriId)
          }
        }
      }
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

  const bagianAssignment = hasil.assignment.berhasil + hasil.assignment.sudahAda + hasil.assignment.targetSudahDiatur
    + hasil.assignment.konflikMaxDua + hasil.assignment.lintasWing + hasil.assignment.gagalLain
  const pesanAssignment = bagianAssignment > 0
    ? `. Guru Hafalan -> ${hasil.assignment.berhasil} berhasil, ${hasil.assignment.sudahAda} sudah ada, ${hasil.assignment.targetSudahDiatur} dilewati (target sudah diatur), ${hasil.assignment.konflikMaxDua} dilewati (maks 2), ${hasil.assignment.lintasWing} lintas wing, ${hasil.assignment.gagalLain} gagal`
    : ''

  return NextResponse.json({
    message: `Import selesai! Guru: ${hasil.guru}, Santri: ${hasil.santri}, Diupdate: ${hasil.diupdate}, Wali: ${hasil.wali}, Dilewati: ${hasil.skip}${hasil.error.length > 0 ? `, Error: ${hasil.error.length}` : ''}${pesanAssignment}`,
    detail: hasil
  })
}
