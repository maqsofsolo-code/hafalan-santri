import ExcelJS from 'exceljs'
import {
  RAPOT_SUBJECT_CONFIG,
  angkaKeHuruf,
  type JenjangKey,
} from './rapotDigital'

export type SantriRapotExcelData = {
  santri: {
    id: string
    nama: string
    nisn: string | null
    kelas_num: number
    jenjang: string
    jenis_kelas: string
  }
  nilaiRaw: Record<string, any>
  hifzh: {
    kelancaran: number | null
    tajwid: number | null
    keterangan_hafalan: string | null
  }
  absensi: {
    hadir_sakit: number
    hadir_izin: number
    hadir_alpha: number
  }
  evaluasi: {
    lengkap: boolean
    rataAkhir: number | null
    rataDiniyyah: number | null
    rataUmum: number | null
    nilaiEfektifMap: Record<string, number | null>
    peringkat: number | null
  }
}

export type BuildRapotClassParams = {
  periode: {
    tahun_ajaran: string
    semester: number
    tanggal_rapot?: string | null
    tanggal_selesai?: string | null
  }
  kelasNum: number
  jenjang: JenjangKey
  jenisKelasLabel: string
  waliKelasNama: string
  totalSantriKelas: number
  santriDataList: SantriRapotExcelData[]
}

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF999999' } },
  left: { style: 'thin', color: { argb: 'FF999999' } },
  bottom: { style: 'thin', color: { argb: 'FF999999' } },
  right: { style: 'thin', color: { argb: 'FF999999' } },
}

/**
 * Membangun workbook Excel (.xlsx) untuk satu kelas penuh.
 * Tiap santri memiliki sheet tersendiri ('1', '2', ...), mempertahankan
 * desain visual resmi Rapot Digital Daarus Salaf.
 */
export async function buildRapotDigitalClassWorkbook(params: BuildRapotClassParams): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Pondok Pesantren Daarus Salaf'
  wb.created = new Date()

  const {
    periode,
    kelasNum,
    jenjang,
    waliKelasNama,
    totalSantriKelas,
    santriDataList,
  } = params

  const cfg = RAPOT_SUBJECT_CONFIG[jenjang] || RAPOT_SUBJECT_CONFIG.ula
  const semesterLabel = periode.semester === 1 ? '1 (Ganjil)' : '2 (Genap)'
  const tanggalDisplay = periode.tanggal_rapot
    ? new Date(periode.tanggal_rapot).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : periode.tanggal_selesai
    ? new Date(periode.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-'

  santriDataList.forEach((data, index) => {
    const sheetName = String(index + 1)
    const ws = wb.addWorksheet(sheetName, {
      pageSetup: { paperSize: 9, orientation: 'portrait' }, // A4
    })

    // Atur lebar kolom
    ws.getColumn('A').width = 6   // No
    ws.getColumn('B').width = 28  // Mapel
    ws.getColumn('C').width = 12  // Nilai Angka
    ws.getColumn('D').width = 24  // Nilai Huruf
    ws.getColumn('E').width = 14  // Rata-rata
    ws.getColumn('F').width = 16  // Rata-rata Kelas

    let r = 1

    // KOP PESANTREN
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = 'مَعْهَدُ دَارِ السَّلَفِ الْإِسْلَامِي'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center' }
    ws.getCell(`A${r}`).font = { name: 'Traditional Arabic', size: 16, bold: true }
    r++

    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = 'PONDOK PESANTREN DAARUS SALAF'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center' }
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 13, bold: true }
    r++

    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = 'Nomor Statistik Pondok Pesantren : 510033110106'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center' }
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9 }
    r++

    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = 'Sekretariat: Masjid Ibnu Taimiyyah, Jl. Pandawa, Karang RT 04 RW 07, Sanggrahan, Grogol, Sukoharjo.'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center' }
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 8, italic: true }
    r++

    // Garis Kop
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).border = { bottom: { style: 'double', color: { argb: 'FF000000' } } }
    r++

    // Basmalah & Judul
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيْمِ'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center' }
    ws.getCell(`A${r}`).font = { name: 'Traditional Arabic', size: 13, bold: true }
    r++

    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = 'Laporan Penilaian Hasil Belajar'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center' }
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 11, bold: true, underline: true }
    r += 2

    // IDENTITAS SANTRI
    const barisIdentitas = [
      ['Nama Santri', `: ${data.santri.nama}`, 'Tahun Ajaran', `: ${periode.tahun_ajaran}`],
      ['Nomor Induk Santri', `: ${data.santri.nisn || '-'}`, 'Kelas / Jenjang', `: ${kelasNum} / ${jenjang.toUpperCase()}`],
      ['NISN', `: ${data.santri.nisn || '-'}`, 'Semester', `: ${semesterLabel}`],
    ]

    barisIdentitas.forEach(row => {
      ws.getCell(`A${r}`).value = row[0]
      ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
      ws.mergeCells(`B${r}:C${r}`)
      ws.getCell(`B${r}`).value = row[1]
      ws.getCell(`B${r}`).font = { name: 'Times New Roman', size: 9 }

      ws.getCell(`D${r}`).value = row[2]
      ws.getCell(`D${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
      ws.mergeCells(`E${r}:F${r}`)
      ws.getCell(`E${r}`).value = row[3]
      ws.getCell(`E${r}`).font = { name: 'Times New Roman', size: 9 }
      r++
    })
    r++

    // HEADER TABEL NILAI
    ws.mergeCells(`A${r}:A${r + 1}`)
    ws.getCell(`A${r}`).value = 'No'
    ws.mergeCells(`B${r}:B${r + 1}`)
    ws.getCell(`B${r}`).value = 'Mata Pelajaran'
    ws.mergeCells(`C${r}:D${r}`)
    ws.getCell(`C${r}`).value = 'Nilai'
    ws.mergeCells(`E${r}:E${r + 1}`)
    ws.getCell(`E${r}`).value = 'Rata-Rata'
    ws.mergeCells(`F${r}:F${r + 1}`)
    ws.getCell(`F${r}`).value = 'Rata Kelas'

    ws.getCell(`C${r + 1}`).value = 'Angka'
    ws.getCell(`D${r + 1}`).value = 'Huruf'

    for (let rowIdx = r; rowIdx <= r + 1; rowIdx++) {
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
        const cell = ws.getCell(`${c}${rowIdx}`)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
        cell.font = { name: 'Times New Roman', size: 9, bold: true }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = BORDER_THIN
      })
    }
    r += 2

    // A. HIFZHUL QUR'AN (Otomatis dari Raport Hifzh)
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = "A. HIFZHUL QUR'AN"
    ws.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
    ws.getCell(`A${r}`).border = BORDER_THIN
    r++

    const barisHifzh = [
      ['1', 'KELANCARAN', data.hifzh.kelancaran],
      ['2', 'TAJWID', data.hifzh.tajwid],
    ] as const

    barisHifzh.forEach(([no, label, val]) => {
      ws.getCell(`A${r}`).value = no
      ws.getCell(`A${r}`).alignment = { horizontal: 'center' }
      ws.getCell(`B${r}`).value = label
      ws.getCell(`C${r}`).value = val ?? '-'
      ws.getCell(`C${r}`).alignment = { horizontal: 'center' }
      ws.getCell(`C${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
      ws.getCell(`D${r}`).value = typeof val === 'number' ? angkaKeHuruf(val) : '-'
      ws.getCell(`E${r}`).value = ''
      ws.getCell(`F${r}`).value = '-'
      ws.getCell(`F${r}`).alignment = { horizontal: 'center' }

      ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
        ws.getCell(`${c}${r}`).border = BORDER_THIN
        ws.getCell(`${c}${r}`).font = { name: 'Times New Roman', size: 9 }
      })
      ws.getCell(`C${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
      r++
    })

    // Keterangan Jumlah Hafalan
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = `  Jumlah Hafalan: ${data.hifzh.keterangan_hafalan || '-'}`
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 8, italic: true }
    ws.getCell(`A${r}`).border = BORDER_THIN
    r++

    // SUBJECT GROUPS (B. DINIYYAH, C. UMUM, dsb.)
    cfg.groups.forEach(group => {
      ws.mergeCells(`A${r}:F${r}`)
      ws.getCell(`A${r}`).value = `${group.code}. ${group.name}`
      ws.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
      ws.getCell(`A${r}`).border = BORDER_THIN
      r++

      group.subjects.forEach((sub, sIdx) => {
        const val = data.evaluasi.nilaiEfektifMap[sub.id]
        ws.getCell(`A${r}`).value = String(sIdx + 1)
        ws.getCell(`A${r}`).alignment = { horizontal: 'center' }
        ws.getCell(`B${r}`).value = sub.label
        ws.getCell(`C${r}`).value = val ?? '-'
        ws.getCell(`C${r}`).alignment = { horizontal: 'center' }
        ws.getCell(`D${r}`).value = typeof val === 'number' ? angkaKeHuruf(val) : '-'
        ws.getCell(`E${r}`).value = ''
        ws.getCell(`F${r}`).value = '-'
        ws.getCell(`F${r}`).alignment = { horizontal: 'center' }

        ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
          ws.getCell(`${c}${r}`).border = BORDER_THIN
          ws.getCell(`${c}${r}`).font = { name: 'Times New Roman', size: 9 }
        })
        ws.getCell(`C${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
        r++
      })

      // Rata-rata grup
      const groupRata = group.id === 'diniyyah' ? data.evaluasi.rataDiniyyah : group.id === 'umum' ? data.evaluasi.rataUmum : null
      ws.mergeCells(`A${r}:B${r}`)
      ws.getCell(`A${r}`).value = `Rata-Rata ${group.name}`
      ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
      ws.getCell(`C${r}`).value = groupRata ?? '-'
      ws.getCell(`C${r}`).alignment = { horizontal: 'center' }
      ws.getCell(`C${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
      ws.getCell(`D${r}`).value = typeof groupRata === 'number' ? angkaKeHuruf(groupRata) : '-'
      ws.getCell(`E${r}`).value = ''
      ws.getCell(`F${r}`).value = '-'
      ws.getCell(`F${r}`).alignment = { horizontal: 'center' }

      ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
        ws.getCell(`${c}${r}`).border = BORDER_THIN
        ws.getCell(`${c}${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } } // amber muda
      })
      r++
    })

    // RATA-RATA AKHIR (Diniyyah + Umum)
    ws.mergeCells(`A${r}:B${r}`)
    ws.getCell(`A${r}`).value = 'Rata-Rata Akhir (Materi Diniyyah dan Umum)'
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
    ws.getCell(`C${r}`).value = data.evaluasi.rataAkhir ?? '-'
    ws.getCell(`C${r}`).alignment = { horizontal: 'center' }
    ws.getCell(`C${r}`).font = { name: 'Times New Roman', size: 10, bold: true }
    ws.getCell(`D${r}`).value = typeof data.evaluasi.rataAkhir === 'number' ? angkaKeHuruf(data.evaluasi.rataAkhir) : '-'
    ws.getCell(`E${r}`).value = ''
    ws.getCell(`F${r}`).value = '-'
    ws.getCell(`F${r}`).alignment = { horizontal: 'center' }

    ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
      ws.getCell(`${c}${r}`).border = BORDER_THIN
      ws.getCell(`${c}${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
    })
    r++

    // PERINGKAT KELAS
    ws.mergeCells(`A${r}:B${r}`)
    ws.getCell(`A${r}`).value = 'Peringkat Kelas'
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
    ws.mergeCells(`C${r}:F${r}`)
    ws.getCell(`C${r}`).value = data.evaluasi.peringkat !== null
      ? `Peringkat ke : ${data.evaluasi.peringkat} dari ${totalSantriKelas} santri`
      : 'Peringkat ke : - (Nilai akademik belum lengkap 10 mapel)'
    ws.getCell(`C${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
    ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
      ws.getCell(`${c}${r}`).border = BORDER_THIN
    })
    r += 2

    // TABEL KEPRIBADIAN, KETIDAKHADIRAN, EKSTRAKURIKULER
    // Baris 1: Header (A:B Kepribadian, C:D Ketidakhadiran, E:F Ekstrakurikuler)
    ws.mergeCells(`A${r}:B${r}`)
    ws.getCell(`A${r}`).value = 'Kepribadian'
    ws.mergeCells(`C${r}:D${r}`)
    ws.getCell(`C${r}`).value = 'Ketidakhadiran'
    ws.mergeCells(`E${r}:F${r}`)
    ws.getCell(`E${r}`).value = 'Ekstrakurikuler'

    ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
      ws.getCell(`${c}${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
      ws.getCell(`${c}${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
      ws.getCell(`${c}${r}`).alignment = { horizontal: 'center' }
      ws.getCell(`${c}${r}`).border = BORDER_THIN
    })
    r++

    const rawNilai = data.nilaiRaw || {}
    const barisTiga = [
      ['Akhlak', rawNilai.akhlak_kepribadian || 'B', 'Sakit', `${data.absensi.hadir_sakit} hari`, 'Renang', rawNilai.ekskul_renang ? `${rawNilai.ekskul_renang}x` : '-'],
      ['Kebersihan', rawNilai.kebersihan || 'B', 'Ijin', `${data.absensi.hadir_izin} hari`, 'Beladiri', rawNilai.ekskul_beladiri || '-'],
      ['Ketertiban', rawNilai.ketertiban || 'B', 'Tanpa Ijin', `${data.absensi.hadir_alpha} hari`, '', ''],
    ]

    barisTiga.forEach(row => {
      ws.getCell(`A${r}`).value = row[0]
      ws.getCell(`B${r}`).value = row[1]
      ws.getCell(`B${r}`).alignment = { horizontal: 'center' }

      ws.getCell(`C${r}`).value = row[2]
      ws.getCell(`D${r}`).value = row[3]
      ws.getCell(`D${r}`).alignment = { horizontal: 'center' }

      ws.getCell(`E${r}`).value = row[4]
      ws.getCell(`F${r}`).value = row[5]
      ws.getCell(`F${r}`).alignment = { horizontal: 'center' }

      ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
        ws.getCell(`${c}${r}`).border = BORDER_THIN
        ws.getCell(`${c}${r}`).font = { name: 'Times New Roman', size: 9 }
      })
      r++
    })
    r++

    // CATATAN WALI KELAS
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = 'Catatan Wali Kelas:'
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
    r++

    ws.mergeCells(`A${r}:F${r + 1}`)
    ws.getCell(`A${r}`).value = rawNilai.catatan ? `"${rawNilai.catatan}"` : '-'
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9, italic: true }
    ws.getCell(`A${r}`).alignment = { vertical: 'top', wrapText: true }
    ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
      ws.getCell(`${c}${r}`).border = BORDER_THIN
      ws.getCell(`${c}${r + 1}`).border = BORDER_THIN
    })
    r += 3

    // TANDA TANGAN
    ws.mergeCells(`A${r}:B${r}`)
    ws.getCell(`A${r}`).value = 'Orang Tua / Wali'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center' }

    ws.mergeCells(`C${r}:D${r}`)
    ws.getCell(`C${r}`).value = 'Mengetahui,\nKepala Sekolah'
    ws.getCell(`C${r}`).alignment = { horizontal: 'center', wrapText: true }

    ws.mergeCells(`E${r}:F${r}`)
    ws.getCell(`E${r}`).value = `Sukoharjo, ${tanggalDisplay}\nWali Kelas`
    ws.getCell(`E${r}`).alignment = { horizontal: 'center', wrapText: true }

    ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
      ws.getCell(`${c}${r}`).font = { name: 'Times New Roman', size: 9 }
    })
    r += 4

    ws.mergeCells(`A${r}:B${r}`)
    ws.getCell(`A${r}`).value = '( .................................... )'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center' }

    ws.mergeCells(`C${r}:D${r}`)
    ws.getCell(`C${r}`).value = '( Abu Farras, Lc. )'
    ws.getCell(`C${r}`).alignment = { horizontal: 'center' }

    ws.mergeCells(`E${r}:F${r}`)
    ws.getCell(`E${r}`).value = `( ${waliKelasNama} )`
    ws.getCell(`E${r}`).alignment = { horizontal: 'center' }

    ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
      ws.getCell(`${c}${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
    })
  })

  return await wb.xlsx.writeBuffer()
}
