import path from 'path'
import type { Workbook, Worksheet } from 'exceljs'

// Helper pembentuk workbook Raport Hifzh dari template "Raport Hifzh 5 Banin Genap 2026.xlsx".
// Template dipelajari read-only: sheet "1".."11" adalah kanvas individu santri (identik strukturnya),
// sheet "Rekap" berisi rumus yang menarik data dari sheet individu lewat referensi nama sheet.

const TEMPLATE_PATH = path.join(process.cwd(), 'Raport Hifzh 5 Banin Genap 2026.xlsx')
const MASTER_SHEET_NAME = '1'
const REKAP_SHEET_NAME = 'Rekap'
const REKAP_ROW_MULAI = 8
const REKAP_ROW_TEMPLATE_TERAKHIR = 18 // baris siap-pakai bawaan template (11 santri: baris 8-18)

// Kolom bantu "Rekap Nilai" pada baris 14 tiap sheet individu, urut Juz 1..30.
const KOLOM_BANTU_JUZ = ['V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX', 'AY']
const KOLOM_DATA_REKAP = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF']

export type SantriRaport = {
  id: string
  nama: string
  nisn: string | null
  kelasNum: number | null
  jenjang: string | null
  jenisKelas: string | null
  juzNilai: Map<number, number | null> // juz(1-30) -> nilai rapor (50-100) jika juz sudah selesai, null jika belum
}

export type BuildRaportParams = {
  santriList: SantriRaport[]
  tahunAjaran: string
  semesterLabel: string
}

function labelJenjangTemplate(jenjang: string | null) {
  if (jenjang === 'ula') return 'ULAA'
  if (jenjang === 'wustha') return 'WUSTHA'
  if (jenjang === 'ulya') return 'ULYA'
  return jenjang ? jenjang.toUpperCase() : '-'
}

export function sanitizeSheetName(rawName: string, used: Set<string>) {
  // Apostrof dibuang seluruhnya (bukan hanya di awal/akhir): ExcelJS punya bug saat merekonsiliasi
  // print area untuk nama sheet yang memuat apostrof (termasuk yang sudah di-escape ganda pada
  // formula), sehingga file hasil gagal dibuka ulang. Menghindarinya sama sekali lebih aman.
  let clean = rawName.replace(/[\\/?*[\]:']/g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean) clean = 'Santri'
  clean = clean.slice(0, 31) || 'Santri'

  let candidate = clean
  let suffix = 2
  while (used.has(candidate.toLowerCase())) {
    const suffixText = ` (${suffix})`
    candidate = clean.slice(0, Math.max(1, 31 - suffixText.length)) + suffixText
    suffix += 1
  }
  used.add(candidate.toLowerCase())
  return candidate
}

function formulaSheetRef(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`
}

type JuzCellLocation = { row: number, kolomNilai: string }

function cariBarisPertamaJuz(ws: Worksheet, kolomJuz: string, kolomNilai: string, rowMulai: number, rowSelesai: number) {
  const hasil = new Map<number, JuzCellLocation>()
  for (let row = rowMulai; row <= rowSelesai; row += 1) {
    const nilaiSel = ws.getCell(`${kolomJuz}${row}`).value
    const juz = typeof nilaiSel === 'number' ? nilaiSel : (typeof nilaiSel === 'string' ? Number(nilaiSel) : NaN)
    if (!Number.isInteger(juz)) continue
    if (!hasil.has(juz)) hasil.set(juz, { row, kolomNilai })
  }
  return hasil
}

function cloneWorksheet(wb: Workbook, source: Worksheet, newName: string) {
  const target = wb.addWorksheet(newName, {
    properties: { ...source.properties },
    pageSetup: { ...source.pageSetup },
    views: source.views.map(view => ({ ...view })),
  })
  target.columns = source.columns.map(col => ({ width: col?.width }))
  source.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const targetRow = target.getRow(rowNumber)
    targetRow.height = row.height
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const targetCell = targetRow.getCell(colNumber)
      targetCell.value = cell.value
      targetCell.style = cell.style
    })
    targetRow.commit()
  })
  source.model.merges.forEach(range => target.mergeCells(range))
  return target
}

function kosongkanBaris(ws: Worksheet, row: number, kolomTerakhir: string) {
  const kolomIndex = ws.getColumn(kolomTerakhir).number
  for (let c = 1; c <= kolomIndex; c += 1) {
    ws.getRow(row).getCell(c).value = null
  }
}

function tulisBarisRekap(ws: Worksheet, row: number, sheetName: string, nomor: number, barisTerakhir: number) {
  const rekapRow = ws.getRow(row)
  rekapRow.getCell('A').value = nomor
  rekapRow.getCell('B').value = { formula: `${formulaSheetRef(sheetName)}!$C$7` }
  KOLOM_DATA_REKAP.forEach((kolom, idx) => {
    rekapRow.getCell(kolom).value = { formula: `${formulaSheetRef(sheetName)}!$${KOLOM_BANTU_JUZ[idx]}$14` }
  })
  rekapRow.getCell('AG').value = { formula: `COUNTIF(C${row}:AF${row},">0")` }
  rekapRow.getCell('AH').value = 'juz'
  rekapRow.getCell('AI').value = { formula: `RANK(AG${row},$AG$${REKAP_ROW_MULAI}:$AG$${barisTerakhir},0)` }
  rekapRow.getCell('AJ').value = { formula: `AVERAGEIF(C${row}:AF${row},">0")` }
  rekapRow.getCell('AK').value = { formula: `10*AG${row}+AJ${row}` }
  rekapRow.getCell('AL').value = { formula: `RANK(AK${row},$AK$${REKAP_ROW_MULAI}:$AK$${barisTerakhir},0)` }
  rekapRow.commit()
}

export async function buildRaportHifzhWorkbook(params: BuildRaportParams): Promise<Buffer> {
  const { santriList, tahunAjaran, semesterLabel } = params
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(TEMPLATE_PATH)

  const master = wb.getWorksheet(MASTER_SHEET_NAME)
  if (!master) throw new Error('Sheet template individu tidak ditemukan')
  const rekap = wb.getWorksheet(REKAP_SHEET_NAME)
  if (!rekap) throw new Error('Sheet Rekap tidak ditemukan pada template')

  const juzMap = new Map<number, JuzCellLocation>([
    ...cariBarisPertamaJuz(master, 'A', 'D', 14, 65),
    ...cariBarisPertamaJuz(master, 'G', 'J', 14, 65),
    ...cariBarisPertamaJuz(master, 'M', 'P', 14, 65),
  ])

  const sheetTemplateAsli = wb.worksheets
    .map(ws => ws.name)
    .filter(name => name !== REKAP_SHEET_NAME)
    .sort((a, b) => Number(a) - Number(b))

  // Nama sheet numerik template ("1".."11") yang belum sempat di-rename harus dianggap "terpakai"
  // supaya nama hasil sanitasi santri lain (mis. kebetulan menghasilkan "3") tidak pernah bentrok
  // dengan slot template yang masih menunggu giliran di-rename dalam loop di bawah.
  const usedNames = new Set<string>([REKAP_SHEET_NAME.toLowerCase(), ...sheetTemplateAsli.map(name => name.toLowerCase())])
  const sheetNamePerSantri: string[] = []

  santriList.forEach((santri, index) => {
    const sheetName = sanitizeSheetName(santri.nama, usedNames)
    sheetNamePerSantri.push(sheetName)

    const sheetLamaKe = sheetTemplateAsli[index]
    const ws = sheetLamaKe ? wb.getWorksheet(sheetLamaKe)! : cloneWorksheet(wb, master, sheetName)
    if (sheetLamaKe) ws.name = sheetName

    ws.getCell('C7').value = santri.nama
    ws.getCell('C8').value = null // Nomor Induk Santri (pondok) belum tersedia di data -- dikosongkan, bukan data palsu
    ws.getCell('C9').value = santri.nisn || '-'
    ws.getCell('O7').value = tahunAjaran
    ws.getCell('O8').value = `${santri.kelasNum ?? '-'} / ${labelJenjangTemplate(santri.jenjang)}`
    ws.getCell('O9').value = semesterLabel

    juzMap.forEach((lokasi, juz) => {
      const nilai = santri.juzNilai.get(juz)
      ws.getCell(`${lokasi.kolomNilai}${lokasi.row}`).value = (typeof nilai === 'number') ? nilai : null
    })
  })

  // Hapus sheet template individu yang tidak terpakai (santri lebih sedikit dari kapasitas template).
  sheetTemplateAsli.slice(santriList.length).forEach(name => {
    const ws = wb.getWorksheet(name)
    if (ws) wb.removeWorksheet(ws.id)
  })

  const barisTerakhir = REKAP_ROW_MULAI + santriList.length - 1

  if (santriList.length > sheetTemplateAsli.length) {
    const jumlahTambahan = santriList.length - sheetTemplateAsli.length
    rekap.duplicateRow(REKAP_ROW_TEMPLATE_TERAKHIR, jumlahTambahan, true)
  }

  sheetNamePerSantri.forEach((sheetName, index) => {
    tulisBarisRekap(rekap, REKAP_ROW_MULAI + index, sheetName, index + 1, barisTerakhir)
  })

  if (santriList.length < (REKAP_ROW_TEMPLATE_TERAKHIR - REKAP_ROW_MULAI + 1)) {
    for (let row = barisTerakhir + 1; row <= REKAP_ROW_TEMPLATE_TERAKHIR; row += 1) {
      kosongkanBaris(rekap, row, 'AL')
    }
  }

  // Sheet baru hasil kloning selalu ditambahkan di akhir workbook oleh ExcelJS, sehingga bisa
  // menyisip di antara sheet individu dan "Rekap" jika santri > 11. Pastikan "Rekap" tetap sheet
  // terakhir seperti pada template asli. `orderNo` ada di runtime ExcelJS tapi tidak dideklarasikan
  // pada tipe Worksheet miliknya.
  type WorksheetDenganOrder = Worksheet & { orderNo?: number }
  const orderNoTertinggi = Math.max(...wb.worksheets.map(ws => (ws as WorksheetDenganOrder).orderNo || 0))
  ;(rekap as WorksheetDenganOrder).orderNo = orderNoTertinggi + 1

  wb.calcProperties.fullCalcOnLoad = true

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
