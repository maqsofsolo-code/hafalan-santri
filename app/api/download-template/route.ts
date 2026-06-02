import * as XLSX from 'xlsx'
import { NextResponse } from 'next/server'

export async function GET() {
  // Sheet Guru
  const guruData = [
    { nama: 'Ustadz Ahmad', email: 'ahmad@hafalan.com', no_wa: '08123456789' },
    { nama: 'Ustadzah Siti', email: 'siti@hafalan.com', no_wa: '08987654321' },
  ]

  // Sheet Santri
  const santriData = [
    { nama: 'Abdullah', kelas: '1A', email_guru: 'ahmad@hafalan.com' },
    { nama: 'Fatimah', kelas: '1B', email_guru: 'siti@hafalan.com' },
  ]

  // Sheet Wali
  const waliData = [
    { nama: 'Bapak Hasan', email: 'hasan@gmail.com', no_wa: '08111111111', nama_santri: 'Abdullah' },
    { nama: 'Ibu Aminah', aminah: 'aminah@gmail.com', no_wa: '08222222222', nama_santri: 'Fatimah' },
  ]

  const wb = XLSX.utils.book_new()

  const wsGuru = XLSX.utils.json_to_sheet(guruData)
  const wsSantri = XLSX.utils.json_to_sheet(santriData)
  const wsWali = XLSX.utils.json_to_sheet(waliData)

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