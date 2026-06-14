import * as XLSX from 'xlsx'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {

  const petunjukData = [
    { petunjuk: 'PETUNJUK PENGGUNAAN TEMPLATE' },
    { petunjuk: '1. Import harus berurutan: Guru dulu, Santri, Wali' },
    { petunjuk: '2. Jangan ubah nama kolom (baris pertama)' },
    { petunjuk: '3. Password default semua akun (guru & wali): Hafalan123! — Sampaikan ke masing-masing untuk diganti setelah login pertama' },
    { petunjuk: '4. jenjang diisi: ula / wustha / ulya (huruf kecil)' },
    { petunjuk: '5. kelas_num: Ula=1-6, Wustha=7-9, Ulya=10-12' },
    { petunjuk: '6. jenis_kelas: banin (putra semua jenjang) / banat (putri Ula & Wustha) / tn_a (putri Ulya kelas A) / tn_b (putri Ulya kelas B)' },
    { petunjuk: '7. tanggal_lahir: format DD/MM/YYYY contoh: 15/03/2010' },
    { petunjuk: '8. nik dan nisn boleh dikosongkan' },
    { petunjuk: '9. nama_santri di sheet Wali harus sama persis dengan sheet Santri' },
    { petunjuk: '10. email_guru_2 boleh dikosongkan (hanya jika santri punya 2 guru)' },
    { petunjuk: '11. surah_awal_nomor & surah_akhir_nomor: nomor surah (1=Al-Fatihah, 114=An-Nas). Kosongkan jika belum ada hafalan.' },
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
      jenis_kelas: 'banin',
      email_guru: 'ahmad@daarus.com',
      email_guru_2: '',
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
      jenis_kelas: 'banat',
      email_guru: 'siti@daarus.com',
      email_guru_2: '',
      surah_awal_nomor: 114,
      surah_akhir_nomor: 93,
      nik: '3371234567890002',
      nisn: '0012345679',
      tempat_lahir: 'Solo',
      tanggal_lahir: '20/07/2012',
      alamat: 'Jl. Melati No. 5, Sukoharjo',
    },
    {
      nama: 'Khadijah Nur Aisyah',
      jenjang: 'ulya',
      kelas_num: 10,
      jenis_kelas: 'tn_a',
      email_guru: 'siti@daarus.com',
      email_guru_2: '',
      surah_awal_nomor: 114,
      surah_akhir_nomor: 50,
      nik: '3371234567890003',
      nisn: '0012345680',
      tempat_lahir: 'Solo',
      tanggal_lahir: '10/05/2008',
      alamat: 'Jl. Mawar No. 3, Sukoharjo',
    },
  ]

  const waliData = [
    { nama: 'Bapak Hasan Abdullah', email: 'hasan@gmail.com', no_wa: '08111111111', nama_santri: 'Abdullah Zaid' },
    { nama: 'Ibu Aminah Sholihah', email: 'aminah@gmail.com', no_wa: '08222222222', nama_santri: 'Fatimah Azzahra' },
    { nama: 'Ibu Khodijah Rohmah', email: 'khodijah@gmail.com', no_wa: '08333333333', nama_santri: 'Khadijah Nur Aisyah' },
  ]

  const wb = XLSX.utils.book_new()

  const wsPetunjuk = XLSX.utils.json_to_sheet(petunjukData)
  const wsGuru = XLSX.utils.json_to_sheet(guruData)
  const wsSantri = XLSX.utils.json_to_sheet(santriData)
  const wsWali = XLSX.utils.json_to_sheet(waliData)

  wsPetunjuk['!cols'] = [{ wch: 100 }]
  wsGuru['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }]
  wsSantri['!cols'] = [
    { wch: 22 }, // nama
    { wch: 10 }, // jenjang
    { wch: 10 }, // kelas_num
    { wch: 12 }, // jenis_kelas
    { wch: 25 }, // email_guru
    { wch: 25 }, // email_guru_2
    { wch: 16 }, // surah_awal_nomor
    { wch: 16 }, // surah_akhir_nomor
    { wch: 18 }, // nik
    { wch: 14 }, // nisn
    { wch: 18 }, // tempat_lahir
    { wch: 15 }, // tanggal_lahir
    { wch: 40 }, // alamat
  ]
  wsWali['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 25 }]

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