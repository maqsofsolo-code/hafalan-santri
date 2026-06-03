import * as XLSX from 'xlsx'
import { NextResponse } from 'next/server'

export async function GET() {

  // ===== SHEET PETUNJUK =====
  const petunjukData = [
    { petunjuk: 'PETUNJUK PENGGUNAAN TEMPLATE' },
    { petunjuk: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' },
    { petunjuk: '1. Import harus berurutan: Guru dulu → Santri → Wali' },
    { petunjuk: '2. Jangan ubah nama kolom (baris pertama)' },
    { petunjuk: '3. Password default semua akun: Hafalan123!' },
    { petunjuk: '4. Guru & Wali bisa ganti password sendiri setelah login' },
    { petunjuk: '5. Jika data duplikat (email/nama sama), akan dilewati otomatis' },
    { petunjuk: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' },
    { petunjuk: 'SHEET GURU: isi nama, email, no_wa' },
    { petunjuk: 'SHEET SANTRI: email_guru harus sama persis dengan email di sheet Guru' },
    { petunjuk: '  jenjang diisi: ula / wustha / ulya (huruf kecil)' },
    { petunjuk: '  kelas_num diisi angka: Ula=1-6, Wustha=7-9, Ulya=10-12' },
    { petunjuk: '  surah_awal_nomor: nomor surah awal hafalan (An-Nas=114, Al-Fatihah=1)' },
    { petunjuk: '  surah_akhir_nomor: nomor surah akhir hafalan' },
    { petunjuk: 'SHEET WALI: nama_santri harus sama persis dengan nama di sheet Santri' },
    { petunjuk: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' },
    { petunjuk: 'CONTOH NOMOR SURAH JUZ 30:' },
    { petunjuk: '  An-Nas=114, Al-Falaq=113, Al-Ikhlas=112, Al-Masad=111' },
    { petunjuk: '  An-Nasr=110, Al-Kafirun=109, Al-Kausar=108, Al-Maun=107' },
    { petunjuk: '  Quraish=106, Al-Fil=105, Al-Humazah=104, Al-Asr=103' },
    { petunjuk: '  At-Takasur=102, Al-Qariah=101, Al-Adiyat=100, Az-Zalzalah=99' },
    { petunjuk: '  Al-Bayyinah=98, Al-Qadr=97, Al-Alaq=96, At-Tin=95' },
    { petunjuk: '  Ash-Sharh=94, Ad-Duha=93, Al-Lail=92, Ash-Shams=91' },
    { petunjuk: '  Al-Balad=90, Al-Fajr=89, Al-Ghashiyah=88, Al-Ala=87' },
    { petunjuk: '  At-Tariq=86, Al-Buruj=85, An-Naba=78 (awal Juz 30)' },
  ]

  // ===== SHEET GURU =====
  const guruData = [
    { nama: 'Ustadz Ahmad Fauzi', email: 'ahmad@daarus.com', no_wa: '08123456789' },
    { nama: 'Ustadzah Siti Aisyah', email: 'siti@daarus.com', no_wa: '08987654321' },
  ]

  // ===== SHEET SANTRI =====
  const santriData = [
    {
      nama: 'Abdullah Zaid',
      jenjang: 'wustha',
      kelas_num: 7,
      email_guru: 'ahmad@daarus.com',
      surah_awal_nomor: 114,
      surah_akhir_nomor: 78,
      keterangan_hafalan: 'Hafal Juz 30 (An-Nas sampai An-Naba)'
    },
    {
      nama: 'Fatimah Azzahra',
      jenjang: 'ula',
      kelas_num: 4,
      email_guru: 'siti@daarus.com',
      surah_awal_nomor: 114,
      surah_akhir_nomor: 93,
      keterangan_hafalan: 'Hafal An-Nas sampai Ad-Duha'
    },
    {
      nama: 'Umar Faruq',
      jenjang: 'ula',
      kelas_num: 3,
      email_guru: 'ahmad@daarus.com',
      surah_awal_nomor: 114,
      surah_akhir_nomor: 107,
      keterangan_hafalan: 'Hafal An-Nas sampai Al-Maun'
    },
  ]

  // ===== SHEET WALI =====
  const waliData = [
    {
      nama: 'Bapak Hasan Abdullah',
      email: 'hasan@gmail.com',
      no_wa: '08111111111',
      nama_santri: 'Abdullah Zaid'
    },
    {
      nama: 'Ibu Aminah Sholihah',
      email: 'aminah@gmail.com',
      no_wa: '08222222222',
      nama_santri: 'Fatimah Azzahra'
    },
    {
      nama: 'Bapak Zaid Ibrahim',
      email: 'zaid@gmail.com',
      no_wa: '08333333333',
      nama_santri: 'Umar Faruq'
    },
  ]

  // Buat workbook
  const wb = XLSX.utils.book_new()

  const wsPetunjuk = XLSX.utils.json_to_sheet(petunjukData)
  const wsGuru = XLSX.utils.json_to_sheet(guruData)
  const wsSantri = XLSX.utils.json_to_sheet(santriData)
  const wsWali = XLSX.utils.json_to_sheet(waliData)

  // Lebar kolom otomatis
  wsPetunjuk['!cols'] = [{ wch: 70 }]
  wsGuru['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }]
  wsSantri['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 35 }]
  wsWali['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 20 }]

  XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'PETUNJUK')
  XLSX.utils.book_append_sheet(wb, wsGuru, 'Guru')
  XLSX.utils.book_append_sheet(wb, wsSantri, 'Santri')
  XLSX.utils.book_append_sheet(wb, wsWali, 'Wali')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-hafalan-daarus-salaf.xlsx"'
    }
  })
}