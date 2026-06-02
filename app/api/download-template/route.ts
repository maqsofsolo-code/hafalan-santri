import * as XLSX from 'xlsx'
import { NextResponse } from 'next/server'

export async function GET() {

  // ===== SHEET GURU =====
  const guruData = [
    { nama: 'Ustadz Ahmad', email: 'ahmad@hafalan.com', no_wa: '08123456789' },
    { nama: 'Ustadzah Siti', email: 'siti@hafalan.com', no_wa: '08987654321' },
  ]

  // ===== SHEET SANTRI =====
  // email_guru harus sama persis dengan email guru di sheet Guru
  const santriData = [
    { nama: 'Abdullah', kelas: '1A', email_guru: 'ahmad@hafalan.com' },
    { nama: 'Fatimah', kelas: '1B', email_guru: 'siti@hafalan.com' },
    { nama: 'Umar', kelas: '1A', email_guru: 'ahmad@hafalan.com' },
  ]

  // ===== SHEET WALI =====
  // nama_santri harus sama persis dengan nama santri di sheet Santri
  // Jika wali punya lebih dari 1 santri, buat 2 baris dengan email sama
  const waliData = [
    { nama: 'Bapak Hasan', email: 'hasan@gmail.com', no_wa: '08111111111', nama_santri: 'Abdullah' },
    { nama: 'Ibu Aminah', email: 'aminah@gmail.com', no_wa: '08222222222', nama_santri: 'Fatimah' },
    { nama: 'Bapak Zaid', email: 'zaid@gmail.com', no_wa: '08333333333', nama_santri: 'Umar' },
  ]

  // ===== SHEET PETUNJUK =====
  const petunjukData = [
    { petunjuk: '1. Import harus berurutan: Guru dulu, lalu Santri, lalu Wali' },
    { petunjuk: '2. Sheet Guru: isi nama, email, no_wa' },
    { petunjuk: '3. Sheet Santri: email_guru harus sama persis dengan email di sheet Guru' },
    { petunjuk: '4. Sheet Wali: nama_santri harus sama persis dengan nama di sheet Santri' },
    { petunjuk: '5. Jangan ubah nama kolom (baris pertama)' },
    { petunjuk: '6. Password default semua akun: Hafalan123!' },
    { petunjuk: '7. Wali bisa ganti password sendiri setelah login' },
    { petunjuk: '8. Jika ada data duplikat (email/nama sama), akan dilewati otomatis' },
  ]

  const wb = XLSX.utils.book_new()

  const wsPetunjuk = XLSX.utils.json_to_sheet(petunjukData)
  const wsGuru = XLSX.utils.json_to_sheet(guruData)
  const wsSantri = XLSX.utils.json_to_sheet(santriData)
  const wsWali = XLSX.utils.json_to_sheet(waliData)

  // Petunjuk di sheet pertama agar mudah dilihat
  XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'PETUNJUK')
  XLSX.utils.book_append_sheet(wb, wsGuru, 'Guru')
  XLSX.utils.book_append_sheet(wb, wsSantri, 'Santri')
  XLSX.utils.book_append_sheet(wb, wsWali, 'Wali')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-hafalan-santri.xlsx"'
    }
  })
}