import * as XLSX from 'xlsx'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {

  const petunjukData = [
    { petunjuk: 'PETUNJUK PENGGUNAAN TEMPLATE' },
    { petunjuk: '1. Import harus berurutan: Guru dulu, Santri, Wali' },
    { petunjuk: '2. Jangan ubah nama kolom (baris pertama)' },
    { petunjuk: '3. Password default semua akun: Hafalan123!' },
    { petunjuk: '4. jenjang diisi: ula / wustha / ulya (huruf kecil)' },
    { petunjuk: '5. kelas_num: Ula=1-6, Wustha=7-9, Ulya=10-12' },
    { petunjuk: '6. tanggal_lahir: format DD/MM/YYYY contoh: 15/03/2010' },
    { petunjuk: '7. nik dan nisn boleh dikosongkan' },
    { petunjuk: '8. nama_santri di sheet Wali harus sama persis dengan sheet Santri' },
  ]

  const guruData = [
    { nama: 'Ustadz Ahmad Fauzi', email: 'ahmad@daarus.com', no_wa: '08123456789' },
    { nama: 'Ustadzah Siti Aisyah', email: 'siti@daarus.com', no_wa: '08987654321' },
  ]

  const santriData = [
    {
      nama: 'Abdullah Zaid',
      jenjang: 'wustha',
      kelas_num: 7,
      email_guru: 'ahmad@daarus.com',
      surah_awal_nomor: 114,
      surah_akhir_nomor: 78,
      nik: '3371234567890001',
      nisn: '0012345678',
      tempat_lahir: 'Sukoharjo',
      tanggal_lahir: '15/03/2010',
      alamat: 'Jl. Pandawa No. 1, Grogol, Sukoharjo',
    },
    {
      nama: 'Fatimah Azzahra',
      jenjang: 'ula',
      kelas_num: 4,
      email_guru: 'siti@daarus.com',
      surah_awal_nomor: 114,
      surah_akhir_nomor: 93,
      nik: '3371234567890002',
      nisn: '0012345679',
      tempat_lahir: 'Solo',
      tanggal_lahir: '20/07/2012',
      alamat: 'Jl. Melati No. 5, Sukoharjo',
    },
  ]

  const waliData = [
    { nama: 'Bapak Hasan Abdullah', email: 'hasan@gmail.com', no_wa: '08111111111', nama_santri: 'Abdullah Zaid' },
    { nama: 'Ibu Aminah Sholihah', email: 'aminah@gmail.com', no_wa: '08222222222', nama_santri: 'Fatimah Azzahra' },
  ]

  const wb = XLSX.utils.book_new()

  const wsPetunjuk = XLSX.utils.json_to_sheet(petunjukData)
  const wsGuru = XLSX.utils.json_to_sheet(guruData)
  const wsSantri = XLSX.utils.json_to_sheet(santriData)
  const wsWali = XLSX.utils.json_to_sheet(waliData)

  wsPetunjuk['!cols'] = [{ wch: 60 }]
  wsGuru['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }]
  wsSantri['!cols'] = [
    { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 25 },
    { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 14 },
    { wch: 18 }, { wch: 15 }, { wch: 35 }
  ]
  wsWali['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 20 }]

  XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'PETUNJUK')
  XLSX.utils.book_append_sheet(wb, wsGuru, 'Guru')
  XLSX.utils.book_append_sheet(wb, wsSantri, 'Santri')
  XLSX.utils.book_append_sheet(wb, wsWali, 'Wali')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-hafalan-daarus-salaf.xlsx"',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    }
  })
}