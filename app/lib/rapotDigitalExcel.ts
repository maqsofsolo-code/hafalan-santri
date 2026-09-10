import fs from 'fs'
import path from 'path'
import ExcelJS from 'exceljs'
import {
  getRapotSubjectConfig,
  angkaKeHuruf,
  formatTanggalPenerbitanRapot,
  type JenjangKey,
  type RataKelasMapelItem,
} from './rapotDigital'

export type SantriRapotExcelData = {
  santri: {
    id: string
    nama: string
    nisn: string | null
    nis?: string | null
    no_induk?: string | null
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
  rataKelasMap?: Record<string, RataKelasMapelItem | null>
}

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
}

function getScoreFont(val: number | null | undefined, baseFont: Partial<ExcelJS.Font> = {}): Partial<ExcelJS.Font> {
  const isBelow60 = typeof val === 'number' && !Number.isNaN(val) && val < 60
  return {
    name: 'Times New Roman',
    size: 9,
    bold: true,
    ...baseFont,
    color: { argb: isBelow60 ? 'FFFF0000' : 'FF000000' },
  }
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
    rataKelasMap,
  } = params

  const cfg = getRapotSubjectConfig(jenjang, kelasNum)
  const semesterLabel = periode.semester === 1 ? '1 (Ganjil)' : '2 (Genap)'
  const tanggalDisplay = formatTanggalPenerbitanRapot(periode)

  // Load logo resmi Ma'had Daarus Salaf
  let logoImageId: number | null = null
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath)
      logoImageId = wb.addImage({
        buffer: logoBuffer,
        extension: 'png',
      } as any)
    }
  } catch (err) {
    console.warn('Gagal memuat logo resmi untuk Excel rapot digital:', err)
  }

  santriDataList.forEach((data, index) => {
    const sheetName = String(index + 1)
    const ws = wb.addWorksheet(sheetName, {
      pageSetup: {
        paperSize: 14 as any, // F4 / Folio (8.5 x 13 inch / 21.59 x 33 cm)
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalCentered: true,
        margins: {
          left: 0.4,
          right: 0.4,
          top: 0.4,
          bottom: 0.4,
          header: 0.2,
          footer: 0.2,
        },
      },
    })

    // Atur lebar kolom yang proporsional dan estetis (Kolom No ramping, tabel seimbang & muat F4)
    ws.getColumn('A').width = 7  // No (ramping & proporsional untuk angka 1-13)
    ws.getColumn('B').width = jenjang === 'ulya' ? 32 : 30  // Mapel / Nilai Santri
    ws.getColumn('C').width = 11  // Nilai Angka
    ws.getColumn('D').width = 24  // Nilai Huruf / Label Kanan
    ws.getColumn('E').width = 11  // Rata Kelas Angka
    ws.getColumn('F').width = 21  // Rata Kelas Huruf

    // Posisikan logo resmi Daarus Salaf seimbang di sebelah kiri header kop
    if (logoImageId !== null) {
      ws.addImage(logoImageId, {
        tl: { col: 0.15, row: 0.2 },
        ext: { width: 82, height: 82 },
        editAs: 'oneCell',
      })
    }

    let r = 1

    // KOP PESANTREN
    ws.getRow(r).height = 24
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = 'مَعْهَدُ دَارِ السَّلَفِ الْإِسْلَامِي'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(`A${r}`).font = { name: 'Traditional Arabic', size: 16, bold: true }
    r++

    ws.getRow(r).height = 20
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = 'PONDOK PESANTREN DAARUS SALAF'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 13, bold: true }
    r++

    ws.getRow(r).height = 16
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = 'Nomor Statistik Pondok Pesantren : 510033110106'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9 }
    r++

    ws.getRow(r).height = 16
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = 'Sekretariat: Masjid Ibnu Taimiyyah, Jl. Pandawa, Karang RT 04 RW 07, Sanggrahan, Grogol, Sukoharjo.'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 8, italic: true }
    r++

    // Garis Kop
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).border = { bottom: { style: 'double', color: { argb: 'FF000000' } } }
    r++

    // Basmalah & Judul
    ws.getRow(r).height = 22
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيْمِ'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(`A${r}`).font = { name: 'Traditional Arabic', size: 13, bold: true }
    r++

    ws.getRow(r).height = 20
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = 'Laporan Penilaian Hasil Belajar'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 11, bold: true, underline: true }
    r += 2

    // IDENTITAS SANTRI
    const noIndukRaw = data.santri.nis || data.santri.no_induk
    const noIndukValue = noIndukRaw || '-'
    const nisnValue = data.santri.nisn || '-'

    const barisIdentitas = [
      {
        leftLabel: 'Nama Santri',
        leftValue: data.santri.nama || '-',
        rightLabel: 'Tahun Ajaran',
        rightValue: String(periode.tahun_ajaran || '-'),
      },
      {
        leftLabel: 'Nomor Induk Santri',
        leftValue: noIndukValue,
        rightLabel: 'Kelas / Jenjang',
        rightValue: `${kelasNum} / ${jenjang.toUpperCase()}`,
      },
      {
        leftLabel: 'NIS',
        leftValue: nisnValue,
        rightLabel: 'Semester',
        rightValue: String(semesterLabel || '-'),
      },
    ]

    barisIdentitas.forEach(item => {
      ws.getRow(r).height = 20

      // BLOK KIRI: A:C digabung, label bold + colon rapat + value normal font
      ws.mergeCells(`A${r}:C${r}`)
      ws.getCell(`A${r}`).value = {
        richText: [
          { text: `${item.leftLabel} : `, font: { name: 'Times New Roman', size: 9, bold: true } },
          { text: item.leftValue, font: { name: 'Times New Roman', size: 9, bold: false } },
        ],
      }
      ws.getCell(`A${r}`).alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: false,
        shrinkToFit: true,
      }

      // SPACER: Kolom D dibiarkan kosong untuk memberi jarak horizontal yang tegas

      // BLOK KANAN: E:F digabung (sejajar di atas bagian 'Rata Kelas')
      ws.mergeCells(`E${r}:F${r}`)
      ws.getCell(`E${r}`).value = {
        richText: [
          { text: `${item.rightLabel} : `, font: { name: 'Times New Roman', size: 9, bold: true } },
          { text: item.rightValue, font: { name: 'Times New Roman', size: 9, bold: false } },
        ],
      }
      ws.getCell(`E${r}`).alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: false,
        shrinkToFit: true,
      }

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
    ws.mergeCells(`E${r}:F${r}`)
    ws.getCell(`E${r}`).value = 'Rata Kelas'

    ws.getCell(`C${r + 1}`).value = 'Angka'
    ws.getCell(`D${r + 1}`).value = 'Huruf'
    ws.getCell(`E${r + 1}`).value = 'Angka'
    ws.getCell(`F${r + 1}`).value = 'Huruf'

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
    ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
      ws.getCell(`${c}${r}`).border = BORDER_THIN
      ws.getCell(`${c}${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
    })
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
    r++

    const barisHifzh = [
      ['1', 'KELANCARAN', data.hifzh.kelancaran],
      ['2', 'TAJWID', data.hifzh.tajwid],
    ] as const

    barisHifzh.forEach(([no, label, val]) => {
      ws.getCell(`A${r}`).value = no
      ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getCell(`B${r}`).value = label
      ws.getCell(`B${r}`).alignment = { vertical: 'middle' }
      ws.getCell(`C${r}`).value = val ?? '-'
      ws.getCell(`C${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getCell(`D${r}`).value = typeof val === 'number' ? angkaKeHuruf(val) : '-'
      ws.getCell(`D${r}`).alignment = { vertical: 'middle' }
      ws.getCell(`E${r}`).value = '-'
      ws.getCell(`E${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getCell(`F${r}`).value = '-'
      ws.getCell(`F${r}`).alignment = { horizontal: 'center', vertical: 'middle' }

      ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
        ws.getCell(`${c}${r}`).border = BORDER_THIN
        ws.getCell(`${c}${r}`).font = { name: 'Times New Roman', size: 9 }
      })
      ws.getCell(`C${r}`).font = getScoreFont(val, { size: 9, bold: true })
      ws.getCell(`D${r}`).font = getScoreFont(val, { size: 9, bold: false })
      r++
    })

    // Keterangan Jumlah Hafalan
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = `  Jumlah Hafalan: ${data.hifzh.keterangan_hafalan || '-'}`
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 8, italic: true }
    ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
      ws.getCell(`${c}${r}`).border = BORDER_THIN
    })
    r++

    const totalActiveSubjects = cfg.groups.reduce((sum, g) => sum + g.subjects.length, 0)

    cfg.groups.forEach(group => {
      ws.mergeCells(`A${r}:F${r}`)
      ws.getCell(`A${r}`).value = `${group.code}. ${group.name}`
      ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
        ws.getCell(`${c}${r}`).border = BORDER_THIN
        ws.getCell(`${c}${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      })
      ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
      r++

      group.subjects.forEach((sub, sIdx) => {
        const val = data.evaluasi.nilaiEfektifMap[sub.id]
        const isBilingual = Boolean(sub.labelArab && (jenjang === 'ulya' || data.santri.jenjang === 'ulya'))
        const rk = rataKelasMap ? rataKelasMap[sub.id] : null

        ws.getCell(`A${r}`).value = String(sIdx + 1)
        ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }

        if (isBilingual) {
          ws.getCell(`B${r}`).value = {
            richText: [
              {
                text: `${sub.label.toUpperCase()} — `,
                font: { name: 'Times New Roman', size: 9, bold: true },
              },
              {
                text: sub.labelArab || '',
                font: { name: 'Traditional Arabic', size: 10, bold: false },
              },
            ],
          }
          ws.getCell(`B${r}`).alignment = { vertical: 'middle', wrapText: false }
        } else {
          ws.getCell(`B${r}`).value = sub.label.toUpperCase()
          ws.getCell(`B${r}`).alignment = { vertical: 'middle' }
        }

        if (isBilingual) {
          ws.getRow(r).height = 20
        }

        ws.getCell(`C${r}`).value = val ?? '-'
        ws.getCell(`C${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
        ws.getCell(`D${r}`).value = typeof val === 'number' ? angkaKeHuruf(val) : '-'
        ws.getCell(`D${r}`).alignment = { vertical: 'middle' }

        if (rk) {
          ws.getCell(`E${r}`).value = rk.angka
          ws.getCell(`E${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
          ws.getCell(`E${r}`).font = getScoreFont(rk.angka, { size: 9, bold: true })

          ws.getCell(`F${r}`).value = rk.huruf
          ws.getCell(`F${r}`).alignment = { vertical: 'middle' }
          ws.getCell(`F${r}`).font = getScoreFont(rk.angka, { size: 9, bold: false })
        } else {
          ws.getCell(`E${r}`).value = '-'
          ws.getCell(`E${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
          ws.getCell(`E${r}`).font = { name: 'Times New Roman', size: 9 }

          ws.getCell(`F${r}`).value = '-'
          ws.getCell(`F${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
          ws.getCell(`F${r}`).font = { name: 'Times New Roman', size: 9 }
        }

        ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
          ws.getCell(`${c}${r}`).border = BORDER_THIN
          if (!(c === 'B' && isBilingual) && c !== 'C' && c !== 'D' && c !== 'E' && c !== 'F') {
            ws.getCell(`${c}${r}`).font = { name: 'Times New Roman', size: 9 }
          }
        })
        ws.getCell(`C${r}`).font = getScoreFont(val, { size: 9, bold: true })
        ws.getCell(`D${r}`).font = getScoreFont(val, { size: 9, bold: false })
        r++
      })

      // Rata-rata grup
      const groupRata = group.id === 'diniyyah' ? data.evaluasi.rataDiniyyah : group.id === 'umum' ? data.evaluasi.rataUmum : null
      ws.mergeCells(`A${r}:B${r}`)
      ws.getCell(`A${r}`).value = `Rata-Rata ${group.name}`
      ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
      ws.getCell(`C${r}`).value = groupRata ?? '-'
      ws.getCell(`C${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getCell(`C${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
      ws.getCell(`D${r}`).value = typeof groupRata === 'number' ? angkaKeHuruf(groupRata) : '-'
      ws.getCell(`D${r}`).alignment = { vertical: 'middle' }
      ws.getCell(`E${r}`).value = '-'
      ws.getCell(`E${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getCell(`F${r}`).value = '-'
      ws.getCell(`F${r}`).alignment = { horizontal: 'center', vertical: 'middle' }

      ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
        ws.getCell(`${c}${r}`).border = BORDER_THIN
        ws.getCell(`${c}${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } } // amber muda
      })
      ws.getCell(`C${r}`).font = getScoreFont(groupRata, { size: 9, bold: true })
      ws.getCell(`D${r}`).font = getScoreFont(groupRata, { size: 9, bold: false })
      r++
    })

    // RATA-RATA AKHIR (Diniyyah + Umum)
    ws.mergeCells(`A${r}:B${r}`)
    ws.getCell(`A${r}`).value = 'Rata-Rata Akhir (Materi Diniyyah dan Umum)'
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
    ws.getCell(`C${r}`).value = data.evaluasi.rataAkhir ?? '-'
    ws.getCell(`C${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(`C${r}`).font = { name: 'Times New Roman', size: 10, bold: true }
    ws.getCell(`D${r}`).value = typeof data.evaluasi.rataAkhir === 'number' ? angkaKeHuruf(data.evaluasi.rataAkhir) : '-'
    ws.getCell(`D${r}`).alignment = { vertical: 'middle' }
    ws.getCell(`E${r}`).value = '-'
    ws.getCell(`E${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(`F${r}`).value = '-'
    ws.getCell(`F${r}`).alignment = { horizontal: 'center', vertical: 'middle' }

    ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
      ws.getCell(`${c}${r}`).border = BORDER_THIN
      ws.getCell(`${c}${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
    })
    ws.getCell(`C${r}`).font = getScoreFont(data.evaluasi.rataAkhir, { size: 10, bold: true })
    ws.getCell(`D${r}`).font = getScoreFont(data.evaluasi.rataAkhir, { size: 9, bold: false })
    r++

    // PERINGKAT KELAS
    ws.mergeCells(`A${r}:B${r}`)
    ws.getCell(`A${r}`).value = 'Peringkat Kelas'
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
    ws.mergeCells(`C${r}:F${r}`)
    ws.getCell(`C${r}`).value = data.evaluasi.peringkat !== null
      ? `Peringkat ke : ${data.evaluasi.peringkat} dari ${totalSantriKelas} santri`
      : `Peringkat ke : - (Nilai akademik belum lengkap ${totalActiveSubjects} mapel)`
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
    const renangVal = (rawNilai.ekskul_renang != null && String(rawNilai.ekskul_renang).trim() !== '')
      ? String(rawNilai.ekskul_renang).trim()
      : '-'
    const beladiriVal = (rawNilai.ekskul_beladiri != null && String(rawNilai.ekskul_beladiri).trim() !== '')
      ? String(rawNilai.ekskul_beladiri).trim()
      : '-'

    const barisTiga = [
      ['Akhlak', rawNilai.akhlak_kepribadian || 'B', 'Sakit', `${data.absensi.hadir_sakit} hari`, 'Renang', renangVal],
      ['Kebersihan', rawNilai.kebersihan || 'B', 'Ijin', `${data.absensi.hadir_izin} hari`, 'Beladiri', beladiriVal],
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
    const catatanRaw = rawNilai.catatan ? String(rawNilai.catatan).trim() : ''
    let lineCount = 1
    if (catatanRaw) {
      const explicitLines = catatanRaw.split(/\r?\n/)
      lineCount = explicitLines.reduce((acc, line) => {
        const wrapped = Math.max(1, Math.ceil(line.length / 90))
        return acc + wrapped
      }, 0)
    }

    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = 'Catatan Wali Kelas:'
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
    ws.getRow(r).height = 18
    r++

    const noteStartRow = r
    const noteEndRow = r + 1
    ws.mergeCells(`A${noteStartRow}:F${noteEndRow}`)
    ws.getCell(`A${noteStartRow}`).value = catatanRaw ? `"${catatanRaw}"` : '-'
    ws.getCell(`A${noteStartRow}`).font = { name: 'Times New Roman', size: 9, italic: true }
    ws.getCell(`A${noteStartRow}`).alignment = { vertical: 'top', horizontal: 'left', wrapText: true }

    const targetHeight = Math.max(32, Math.round(lineCount * 17.5))
    const halfHeight = Math.ceil(targetHeight / 2)
    ws.getRow(noteStartRow).height = halfHeight
    ws.getRow(noteEndRow).height = halfHeight

    for (let nr = noteStartRow; nr <= noteEndRow; nr++) {
      ;['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
        ws.getCell(`${c}${nr}`).border = BORDER_THIN
      })
    }
    r += 3

    // TANDA TANGAN
    const isSemesterGasal = periode.semester === 1

    ws.getRow(r).height = 28

    ws.mergeCells(`A${r}:B${r}`)
    ws.getCell(`A${r}`).value = 'Orang Tua / Wali'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9 }

    if (!isSemesterGasal) {
      ws.mergeCells(`C${r}:D${r}`)
      ws.getCell(`C${r}`).value = 'Mengetahui,\nKepala Sekolah'
      ws.getCell(`C${r}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      ws.getCell(`C${r}`).font = { name: 'Times New Roman', size: 9 }
    }

    ws.mergeCells(`E${r}:F${r}`)
    ws.getCell(`E${r}`).value = `Sukoharjo, ${tanggalDisplay}\nWali Kelas`
    ws.getCell(`E${r}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    ws.getCell(`E${r}`).font = { name: 'Times New Roman', size: 9 }

    r += 4

    ws.mergeCells(`A${r}:B${r}`)
    ws.getCell(`A${r}`).value = '( .................................... )'
    ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(`A${r}`).font = { name: 'Times New Roman', size: 9, bold: true }

    if (!isSemesterGasal) {
      ws.mergeCells(`C${r}:D${r}`)
      ws.getCell(`C${r}`).value = '( Ustadz Abu Muhammad Idral )'
      ws.getCell(`C${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getCell(`C${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
    }

    ws.mergeCells(`E${r}:F${r}`)
    ws.getCell(`E${r}`).value = `( ${waliKelasNama} )`
    ws.getCell(`E${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(`E${r}`).font = { name: 'Times New Roman', size: 9, bold: true }
  })

  return await wb.xlsx.writeBuffer()
}
