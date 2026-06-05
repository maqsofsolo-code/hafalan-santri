import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bulan = searchParams.get('bulan') // format: 2026-06
  const jenjang = searchParams.get('jenjang') || 'semua'
  const kelas = searchParams.get('kelas') || 'semua'
  const santriId = searchParams.get('santri_id') || 'semua'

  if (!bulan) return NextResponse.json({ error: 'Bulan wajib diisi' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Hitung rentang tanggal
  const [tahun, bln] = bulan.split('-').map(Number)
  const tglMulai = `${bulan}-01`
  const hariTerakhir = new Date(tahun, bln, 0).getDate()
  const tglSelesai = `${bulan}-${String(hariTerakhir).padStart(2, '0')}`

  // Ambil data santri sesuai filter
  let santriQuery = supabase.from('santri').select('*, guru:guru_id(nama)').order('kelas_num').order('nama')
  if (jenjang !== 'semua') santriQuery = santriQuery.eq('jenjang', jenjang)
  if (kelas !== 'semua') santriQuery = santriQuery.eq('kelas_num', parseInt(kelas))
  if (santriId !== 'semua') santriQuery = santriQuery.eq('id', santriId)
  const { data: santriList } = await santriQuery

  if (!santriList || santriList.length === 0)
    return NextResponse.json({ error: 'Tidak ada data santri' }, { status: 404 })

  // Ambil semua setoran bulan ini
  const { data: setoranList } = await supabase
    .from('setoran')
    .select('*, santri:santri_id(nama)')
    .gte('tanggal', tglMulai)
    .lte('tanggal', tglSelesai)
    .order('tanggal', { ascending: true })

  // Generate Excel dengan openpyxl via Python script
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Daarus Salaf'
  wb.created = new Date()

  const namaBulan = new Date(tahun, bln - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  // Warna tema
  const BIRU_TUA = '1A3A5C'
  const BIRU_MUDA = 'DBEAFE'
  const HIJAU = '166534'
  const HIJAU_MUDA = 'DCFCE7'
  const MERAH_MUDA = 'FEE2E2'
  const ABU = 'F3F4F6'

  for (const santri of santriList) {
    const setoranSantri = (setoranList || []).filter(s => s.santri_id === santri.id)
    const sheetName = santri.nama.substring(0, 31).replace(/[\\/*?[\]:]/g, '')
    const ws = wb.addWorksheet(sheetName)

    // Lebar kolom
    ws.columns = [
      { width: 5 },  // No
      { width: 14 }, // Tanggal
      { width: 14 }, // Hari
      { width: 16 }, // Jenis
      { width: 22 }, // Surah Mulai
      { width: 22 }, // Surah Selesai
      { width: 8 },  // Ayat Mulai
      { width: 8 },  // Ayat Selesai
      { width: 12 }, // Status
      { width: 14 }, // Kehadiran
      { width: 30 }, // Catatan
    ]

    // ===== HEADER PESANTREN =====
    ws.mergeCells('A1:K1')
    const h1 = ws.getCell('A1')
    h1.value = 'PONDOK PESANTREN DAARUS SALAF SUKOHARJO'
    h1.font = { bold: true, size: 13, color: { argb: 'FF' + BIRU_TUA } }
    h1.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(1).height = 22

    ws.mergeCells('A2:K2')
    const h2 = ws.getCell('A2')
    h2.value = 'Jl. Pandawa, Dukuh Karang RT 04/07, Sanggrahan, Grogol, Sukoharjo, Jawa Tengah'
    h2.font = { size: 9, color: { argb: 'FF555555' } }
    h2.alignment = { horizontal: 'center' }

    ws.mergeCells('A3:K3')
    const h3 = ws.getCell('A3')
    h3.value = 'www.daarussalafsukoharjo.com'
    h3.font = { size: 9, color: { argb: 'FF555555' } }
    h3.alignment = { horizontal: 'center' }

    // Garis pemisah
    ws.mergeCells('A4:K4')
    ws.getRow(4).height = 4

    // ===== JUDUL LAPORAN =====
    ws.mergeCells('A5:K5')
    const judul = ws.getCell('A5')
    judul.value = `LAPORAN SETORAN HAFALAN BULANAN`
    judul.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    judul.alignment = { horizontal: 'center', vertical: 'middle' }
    judul.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BIRU_TUA } }
    ws.getRow(5).height = 20

    ws.mergeCells('A6:K6')
    const subjudul = ws.getCell('A6')
    subjudul.value = `Bulan: ${namaBulan}`
    subjudul.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    subjudul.alignment = { horizontal: 'center', vertical: 'middle' }
    subjudul.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563A8' } }
    ws.getRow(6).height = 16

    // ===== INFO SANTRI =====
    ws.getRow(7).height = 6

    const infoData = [
      ['Nama Santri', santri.nama],
      ['Kelas', santri.kelas || '-'],
      ['Guru Musami\'', santri.guru?.nama || '-'],
      ['Total Hafalan', `${santri.total_hafalan_juz?.toFixed(2) || 0} Juz`],
    ]

    infoData.forEach(([label, value], idx) => {
      const row = idx + 8
      ws.mergeCells(`A${row}:B${row}`)
      const lCell = ws.getCell(`A${row}`)
      lCell.value = label
      lCell.font = { bold: true, size: 10 }
      lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ABU } }
      lCell.alignment = { horizontal: 'left', indent: 1 }

      ws.mergeCells(`C${row}:K${row}`)
      const vCell = ws.getCell(`C${row}`)
      vCell.value = value
      vCell.font = { size: 10 }
      vCell.alignment = { horizontal: 'left', indent: 1 }
    })

    // ===== HEADER TABEL =====
    const headerRow = 13
    ws.getRow(headerRow - 1).height = 6

    const headers = ['No', 'Tanggal', 'Hari', 'Jenis', 'Surah Mulai', 'Surah Selesai', 'Ayat Mulai', 'Ayat Selesai', 'Status', 'Kehadiran', 'Catatan Guru']
    headers.forEach((h, i) => {
      const cell = ws.getCell(headerRow, i + 1)
      cell.value = h
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BIRU_TUA } }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
      }
    })
    ws.getRow(headerRow).height = 22

    // ===== DATA SETORAN =====
    let dataRow = headerRow + 1
    const hariIndonesia = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

    if (setoranSantri.length === 0) {
      ws.mergeCells(`A${dataRow}:K${dataRow}`)
      const emptyCell = ws.getCell(`A${dataRow}`)
      emptyCell.value = 'Tidak ada setoran pada bulan ini'
      emptyCell.font = { italic: true, color: { argb: 'FF9CA3AF' } }
      emptyCell.alignment = { horizontal: 'center' }
      dataRow++
    } else {
      setoranSantri.forEach((s, idx) => {
        const tgl = new Date(s.tanggal)
        const hari = hariIndonesia[tgl.getDay()]
        const isLancar = s.status === 'lancar'
        const isHadir = s.status_kehadiran === 'hadir'
        const bgColor = !isHadir ? 'FFFEF3C7' : isLancar ? 'FF' + HIJAU_MUDA : 'FF' + MERAH_MUDA

        const rowData = [
          idx + 1,
          s.tanggal,
          hari,
          s.jenis === 'baru' ? 'Hafalan Baru' : 'Murojaah',
          s.surah_mulai_nomor ? `${s.surah_mulai_nomor}. ${s.surah || ''}` : '-',
          s.surah_selesai_nomor ? `${s.surah_selesai_nomor}. ${s.surah || ''}` : '-',
          s.ayat_mulai || '-',
          s.ayat_selesai || '-',
          isHadir ? (isLancar ? 'Lancar' : 'Rosib') : '-',
          s.status_kehadiran ? s.status_kehadiran.charAt(0).toUpperCase() + s.status_kehadiran.slice(1) : '-',
          s.catatan || '',
        ]

        rowData.forEach((val, colIdx) => {
          const cell = ws.getCell(dataRow, colIdx + 1)
          cell.value = val
          cell.font = { size: 9 }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
          cell.alignment = { horizontal: colIdx === 10 ? 'left' : 'center', vertical: 'middle', wrapText: true, indent: colIdx === 10 ? 1 : 0 }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          }
        })
        ws.getRow(dataRow).height = 16
        dataRow++
      })
    }

    // ===== RINGKASAN =====
    dataRow++
    ws.mergeCells(`A${dataRow}:K${dataRow}`)
    const ringkasanHeader = ws.getCell(`A${dataRow}`)
    ringkasanHeader.value = 'RINGKASAN BULAN INI'
    ringkasanHeader.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    ringkasanHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + HIJAU } }
    ringkasanHeader.alignment = { horizontal: 'center' }
    ws.getRow(dataRow).height = 18
    dataRow++

    const hadir = setoranSantri.filter(s => s.status_kehadiran === 'hadir')
    const lancar = hadir.filter(s => s.status === 'lancar')
    const baru = hadir.filter(s => s.jenis === 'baru')
    const murojaah = hadir.filter(s => s.jenis === 'lama')
    const sakit = setoranSantri.filter(s => s.status_kehadiran === 'sakit')
    const izin = setoranSantri.filter(s => s.status_kehadiran === 'izin')
    const alpha = setoranSantri.filter(s => s.status_kehadiran === 'alpha')
    const tambahJuz = baru.reduce((sum, s) => sum + (s.penambahan_juz || 0), 0)

    const ringkasanData = [
      ['Total Hari Setor', hadir.length.toString()],
      ['Setoran Lancar', lancar.length.toString()],
      ['Setoran Rosib', (hadir.length - lancar.length).toString()],
      ['Hafalan Baru', baru.length.toString()],
      ['Murojaah', murojaah.length.toString()],
      ['Penambahan Hafalan', `${tambahJuz.toFixed(2)} Juz (±${(tambahJuz * 20).toFixed(1)} halaman)`],
      ['Tidak Hadir (Sakit)', sakit.length.toString()],
      ['Tidak Hadir (Izin)', izin.length.toString()],
      ['Alpha', alpha.length.toString()],
    ]

    ringkasanData.forEach(([label, value]) => {
      ws.mergeCells(`A${dataRow}:D${dataRow}`)
      const lCell = ws.getCell(`A${dataRow}`)
      lCell.value = label
      lCell.font = { bold: true, size: 9 }
      lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ABU } }
      lCell.alignment = { horizontal: 'left', indent: 1 }
      lCell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } }

      ws.mergeCells(`E${dataRow}:K${dataRow}`)
      const vCell = ws.getCell(`E${dataRow}`)
      vCell.value = value
      vCell.font = { size: 9 }
      vCell.alignment = { horizontal: 'left', indent: 1 }
      vCell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } }
      ws.getRow(dataRow).height = 15
      dataRow++
    })

    // ===== TANDA TANGAN =====
    dataRow += 2
    ws.mergeCells(`A${dataRow}:E${dataRow}`)
    ws.getCell(`A${dataRow}`).value = 'Mengetahui,'
    ws.getCell(`A${dataRow}`).alignment = { horizontal: 'center' }

    ws.mergeCells(`G${dataRow}:K${dataRow}`)
    const tglCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    ws.getCell(`G${dataRow}`).value = `Sukoharjo, ${tglCetak}`
    ws.getCell(`G${dataRow}`).alignment = { horizontal: 'center' }
    dataRow++

    ws.mergeCells(`A${dataRow}:E${dataRow}`)
    ws.getCell(`A${dataRow}`).value = 'Kepala Sekolah'
    ws.getCell(`A${dataRow}`).alignment = { horizontal: 'center' }

    ws.mergeCells(`G${dataRow}:K${dataRow}`)
    ws.getCell(`G${dataRow}`).value = `Guru Musami'`
    ws.getCell(`G${dataRow}`).alignment = { horizontal: 'center' }
    dataRow += 4

    ws.mergeCells(`A${dataRow}:E${dataRow}`)
    const ttdKepsek = ws.getCell(`A${dataRow}`)
    ttdKepsek.value = 'Al Ustadz Abu Muhammad Idral'
    ttdKepsek.font = { bold: true, underline: true }
    ttdKepsek.alignment = { horizontal: 'center' }

    ws.mergeCells(`G${dataRow}:K${dataRow}`)
    const ttdGuru = ws.getCell(`G${dataRow}`)
    ttdGuru.value = santri.guru?.nama || '________________'
    ttdGuru.font = { bold: true, underline: true }
    ttdGuru.alignment = { horizontal: 'center' }
  }

  // Generate buffer
  const buffer = await wb.xlsx.writeBuffer()

  const namaBulanFile = new Date(tahun, bln - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).replace(' ', '_')
  const filename = `Laporan_Hafalan_${namaBulanFile}.xlsx`

  return new NextResponse(buffer as Buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}