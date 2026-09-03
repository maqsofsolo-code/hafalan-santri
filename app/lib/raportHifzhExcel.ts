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

// Tabel juz pada sheet individu terbagi 3 blok berdampingan (Juz 1-21, 22-29, 30), masing-masing
// punya kolom nomor juz + 2 kolom nama surat (merge) + kolom nilai Kelancaran (K) + kolom nilai
// Tajwid (T) tepat di sebelahnya.
const BLOK_NILAI_JUZ = [
  { kolomJuz: 'A', kolomNamaSurat: ['B', 'C'], kolomNilai: 'D', kolomTajwid: 'E' },
  { kolomJuz: 'G', kolomNamaSurat: ['H', 'I'], kolomNilai: 'J', kolomTajwid: 'K' },
  { kolomJuz: 'M', kolomNamaSurat: ['N', 'O'], kolomNilai: 'P', kolomTajwid: 'Q' },
] as const
const BARIS_TABEL_JUZ_MULAI = 14
const BARIS_TABEL_JUZ_SELESAI = 65
const SEL_NARASI_HAFALAN = ['M55', 'M56'] as const

// "Nilai Rata-rata" (merge P51:P52 utk Kelancaran, Q51:Q52 utk Tajwid) pada template berisi FORMULA
// (=AZ14/=AZ15) dengan hasil CACHE dari data santri sungguhan yang pernah dicetak sebelumnya --
// ExcelJS tidak pernah menghitung ulang formula, jadi cache lama itu tetap tampil di pembaca yang
// tidak memaksa recalculate meski sel sumbernya sudah dikosongkan. Ditimpa dengan angka statis hasil
// hitung sendiri supaya benar di viewer mana pun, tidak bergantung pada fullCalcOnLoad.
const SEL_RATA_KELANCARAN = 'P51'
const SEL_RATA_TAJWID = 'Q51'

// Baris 53 pada template asli berisi HANYA footnote "*K : Kelancaran, T : Tajwid" di kolom M
// (sel tunggal, tidak di-merge -- N53:Q53 kosong, teks meluber visual ke kanan seperti kebiasaan
// Excel). Baris 54 kolom M:Q sepenuhnya kosong pada template (bukan bagian tabel juz blok manapun --
// blok A/G masih berisi data juz sampai baris 65, tapi blok M/N/O/P/Q berhenti di baris 53).
// "Peringkat Kelas" HARUS muncul tepat di bawah "Nilai Rata-rata" (51-52) dan SEBELUM footnote --
// karena insert row baru akan merusak tabel juz blok A/G yang masih berlanjut melewati baris 53/54,
// footnote DIPINDAH TURUN satu baris (SEL_PERINGKAT_KELAS -> SEL_CATATAN_KT_BARU) dan
// SEL_PERINGKAT_KELAS ditulis ulang dengan teks Peringkat Kelas, keduanya memakai style ASLI
// footnote (dibaca sebelum ditimpa) supaya tetap menyatu dengan desain template.
const SEL_PERINGKAT_KELAS = 'M53'
const SEL_CATATAN_KT_BARU = 'M54'
// Baris 57 kolom M:Q juga kosong pada template (blok A masih berisi data juz di baris ini, tapi
// blok M/N/O/P/Q sudah lama berhenti di baris 53) -- dipakai untuk keterangan singkat "Masih ada N
// santri..." saat ranking berstatus Sementara. Hanya ditulis kalau keterangan-nya ada (lihat
// infoPeringkatKelas) -- kalau tidak, sel ini tetap kosong seperti bawaan template.
const SEL_KETERANGAN_PERINGKAT = 'M57'

// Highlight merah pada beberapa sheet template (2-11, dipakai ulang apa adanya utk kelas <=11
// santri) ternyata peninggalan cetak santri SUNGGUHAN sebelumnya (fill FFFF0000 statis pada kolom
// nama surat, dan font merah pada kolom nilai di sheet 7) -- bukan conditional formatting maupun
// formula, dan tidak ada aturan/ambang batas yang bisa dipastikan dari sana. Karena itu highlight
// ini dihapus total dan TIDAK dibangun ulang otomatis -- lebih aman kosong daripada salah warna.
const KOLOM_RESET_WARNA_PER_BLOK = BLOK_NILAI_JUZ.map(blok => [...blok.kolomNamaSurat, blok.kolomNilai, blok.kolomTajwid])

// Baris signature block (58-62) jauh di bawah header (baris 1-6), jadi ambang ini aman membedakan
// gambar tanda tangan contoh (anchor row ~57.6) dari logo pesantren di header tanpa bergantung pada
// imageId spesifik yang bisa berbeda antar file template.
const BATAS_BARIS_GAMBAR_TANDA_TANGAN = 50

// Blok tanda tangan pada tiap sheet individu: baris 58 = tempat/tanggal, baris 59 = label peran,
// baris 62 = nama (merge M:Q pada semuanya). Template lama membawa teks statis "Sukoharjo, 5 Maret
// 2026" dan "Ust. Abu Aufa Amin S." di sini yang tidak pernah ditimpa kode -- sekarang SELALU
// ditimpa dengan data sebenarnya, apa pun isi template.
const SEL_TANGGAL_CETAK = 'M58'
const SEL_LABEL_PENANDATANGAN = 'M59'
const SEL_NAMA_WALI_KELAS = 'M62'
const LABEL_WALI_KELAS = 'Wali Kelas,'

// Tahap 9P -- posisi gambar tanda tangan digital: baris 60-61 (M:Q) adalah ruang KOSONG di antara
// label "Wali Kelas," (baris 59) dan nama (baris 62) -- persis slot yang dulu diisi tangan basah di
// dokumen cetak. Anchor ExcelJS 0-indexed (baris 60 cetak = row 59 di sini, lihat README addImage:
// "top-left of A1 will be { col: 0, row: 0 }"). Ukuran dijaga proporsional (bukan memenuhi seluruh
// merge M:Q selebar ~274px) supaya terlihat seperti tanda tangan dokumen resmi, bukan elemen besar
// yang dominan -- lebar ~130px tinggi ~42px, muat penuh dalam tinggi 2 baris (~45.6px @17.1pt/baris)
// dan diposisikan mendekati tengah lebar merge M:Q (kolom N, tempat teks "Wali Kelas," juga berada).
const TANDA_TANGAN_ANCHOR_COL = 13.4
const TANDA_TANGAN_ANCHOR_ROW = 59.3
const TANDA_TANGAN_LEBAR_PX = 130
const TANDA_TANGAN_TINGGI_PX = 42

export type TandaTanganGambar = { buffer: Buffer, extension: 'png' | 'jpeg' }

export type SantriRaport = {
  id: string
  nama: string
  nisn: string | null
  kelasNum: number | null
  jenjang: string | null
  jenisKelas: string | null
  juzNilai: Map<number, number | null> // juz(1-30) -> nilai rapor (50-95, Phase B maks 95) jika juz sudah selesai, null jika belum
  juzTajwid: Map<number, number | null> // juz(1-30) -> nilai rapor (skala sama 50-95, via nilaiRapor()) jika Tajwid sudah diisi, null jika belum -- TIDAK pernah diisi 0
  // Peringkat Kelas: rumus/tie-breaker ranking DIHITUNG DI CALLER (hitungRankingUjianHafalanKelas,
  // app/lib/ranking.ts) -- workbook hanya menulis hasilnya, tidak pernah menghitung ranking sendiri.
  // Denominator SELALU jumlah santri yang SUDAH eligible (bukan total santri kelas) -- baik saat
  // ranking sementara maupun sudah final, supaya santri yang belum py hasil TIDAK PERNAH masuk
  // penyebut (Rule B: "jangan masukkan santri belumAdaHasil ke denominator ranking sementara").
  peringkatKelas: number | null // posisi santri ini di antara santri ELIGIBLE (1-based); null jika santri ini sendiri belum eligible
  jumlahSantriEligible: number // "Y" pada "Peringkat Sementara/Kelas: X dari Y" -- HANYA santri yang sudah eligible ranking
  jumlahBelumAdaHasil: number // jumlah santri aktif kelas yang belum py satu juz pun selesai; >0 = ranking berstatus Sementara (Tajwid tidak memengaruhi ini)
  // Wali Kelas (Tahap 9P) -- DIHITUNG PER SANTRI oleh caller (bukan sekali untuk seluruh dokumen),
  // karena kelompok "TN" pada Raport Hifzh membundel dua kelas fisik berbeda (jenis_kelas tn_a/tn_b)
  // yang menurut wali_kelas_assignment (Tahap 9B, domain SANTRI) bisa punya Wali Kelas BERBEDA.
  // Untuk banin/banat, nilai ini identik untuk semua santri dalam satu dokumen (satu kelas fisik).
  waliKelasNama: string // "Belum ditentukan" jika wali_kelas_assignment aktif untuk kelas+periode ini tidak ditemukan
  tandaTangan: TandaTanganGambar | null // null jika guru belum upload tanda tangan -- sheet tetap ditulis, area tanda tangan dikosongkan (Rule H, tidak pernah gagal generate)
}

export type BuildRaportParams = {
  santriList: SantriRaport[]
  periodeLabel: string
  semesterLabel: string
  tanggalIndonesia: string
}

// Perakitan teks TAMPILAN saja (bukan perhitungan ranking) -- rumus/eligibility sepenuhnya berasal
// dari field yang sudah dihitung caller (peringkatKelas/jumlahSantriEligible/jumlahBelumAdaHasil).
// Tidak pernah menampilkan angka Nilai Peringkat/Nilai Hafalan, hanya posisi "X dari Y". Tiga kasus:
// (1) santri ini sendiri belum eligible -- tidak ada ranking palsu untuk ditampilkan;
// (2) santri eligible tapi masih ada santri lain di kelas belum eligible -- "Peringkat Sementara",
//     X dan Y HANYA dari santri yang sudah eligible (belumAdaHasil TIDAK pernah masuk Y);
// (3) seluruh santri kelas sudah eligible -- "Peringkat Kelas" final, tanpa keterangan tambahan.
function infoPeringkatKelas(santri: SantriRaport): { label: string, keterangan: string | null } {
  if (santri.peringkatKelas === null) {
    return { label: 'Peringkat Kelas: Belum Ada Hasil', keterangan: null }
  }
  if (santri.jumlahBelumAdaHasil > 0) {
    return {
      label: `Peringkat Sementara: ${santri.peringkatKelas} dari ${santri.jumlahSantriEligible}`,
      keterangan: `Masih ada ${santri.jumlahBelumAdaHasil} santri yang belum menyelesaikan ujian.`,
    }
  }
  return { label: `Peringkat Kelas: ${santri.peringkatKelas} dari ${santri.jumlahSantriEligible}`, keterangan: null }
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

type JuzCellLocation = { row: number, kolomNilai: string, kolomTajwid: string }

function cariBarisPertamaJuz(ws: Worksheet, kolomJuz: string, kolomNilai: string, kolomTajwid: string, rowMulai: number, rowSelesai: number) {
  const hasil = new Map<number, JuzCellLocation>()
  for (let row = rowMulai; row <= rowSelesai; row += 1) {
    const nilaiSel = ws.getCell(`${kolomJuz}${row}`).value
    const juz = typeof nilaiSel === 'number' ? nilaiSel : (typeof nilaiSel === 'string' ? Number(nilaiSel) : NaN)
    if (!Number.isInteger(juz)) continue
    if (!hasil.has(juz)) hasil.set(juz, { row, kolomNilai, kolomTajwid })
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

// Reset fill (ke tanpa-warna) dan warna font (ke warna tema default) satu sel -- HANYA warna yang
// disentuh, border/ukuran/font family/bold tetap dari template apa adanya.
function resetWarnaSel(ws: Worksheet, alamat: string) {
  const cell = ws.getCell(alamat)
  cell.fill = { type: 'pattern', pattern: 'none' }
  if (cell.font) cell.font = { ...cell.font, color: { theme: 1 } }
}

// Template dipakai HANYA sebagai desain: seluruh nilai Kelancaran & Tajwid contoh bawaan template
// (mis. "K"/"T" = 90/70 pada santri contoh) dibersihkan lebih dulu di setiap sheet individu, baru
// nilai Kelancaran & Tajwid sungguhan (dari nilai_ujian & nilai_tajwid_juz) ditulis ulang di lokasi
// yang sama. Juz yang Tajwid-nya belum diisi dibiarkan kosong (bukan 0) -- lihat SantriRaport.juzTajwid.
// Highlight merah/font berwarna bawaan sheet 2-11 (peninggalan cetak santri sungguhan sebelumnya)
// juga dibersihkan total di sini -- lihat catatan pada KOLOM_RESET_WARNA_PER_BLOK.
function kosongkanNilaiContohSheet(ws: Worksheet) {
  BLOK_NILAI_JUZ.forEach(({ kolomJuz, kolomNilai, kolomTajwid }, blokIndex) => {
    for (let row = BARIS_TABEL_JUZ_MULAI; row <= BARIS_TABEL_JUZ_SELESAI; row += 1) {
      const nilaiSel = ws.getCell(`${kolomJuz}${row}`).value
      const juz = typeof nilaiSel === 'number' ? nilaiSel : (typeof nilaiSel === 'string' ? Number(nilaiSel) : NaN)
      if (!Number.isInteger(juz)) continue // bukan baris data juz (mis. label "Nilai Rata-rata", narasi, tanda tangan)
      ws.getCell(`${kolomNilai}${row}`).value = null
      ws.getCell(`${kolomTajwid}${row}`).value = null
      KOLOM_RESET_WARNA_PER_BLOK[blokIndex].forEach(kolom => resetWarnaSel(ws, `${kolom}${row}`))
    }
  })
  // Narasi ringkasan hafalan contoh (mis. "Alhamdulillaah, ananda sudah menghafal dari QS. ...")
  // tidak bisa dihitung aman dari data sistem saat ini -- lebih baik dikosongkan daripada salah
  // menampilkan cakupan hafalan milik santri contoh di template.
  SEL_NARASI_HAFALAN.forEach(sel => { ws.getCell(sel).value = null })
}

type WorksheetDenganMedia = Worksheet & {
  _media: Array<{ type: string, range?: { tl?: { row?: number } } }>
}

// Gambar tanda tangan contoh tertanam langsung di area tanda tangan pada SEMUA sheet template
// (bukan formula/placeholder) -- kalau tidak dihapus, gambar milik satu orang ikut tercetak untuk
// wali kelas mana pun. Logo header (baris atas) sengaja tidak disentuh -- hanya gambar yang jangkar
// atasnya berada jauh di bawah header (area tanda tangan) yang dibuang.
function hapusGambarTandaTanganContoh(ws: Worksheet) {
  const wsMedia = ws as WorksheetDenganMedia
  wsMedia._media = wsMedia._media.filter(media => {
    if (media.type !== 'image') return true
    const row = media.range?.tl?.row
    return row === undefined || row <= BATAS_BARIS_GAMBAR_TANDA_TANGAN
  })
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
  const { santriList, periodeLabel, semesterLabel, tanggalIndonesia } = params
  // Cache imageId per Buffer tanda tangan (bukan per santri) -- guru yang menjadi Wali Kelas di
  // >1 kelas dalam dokumen yang sama (kasus TN tn_a+tn_b dengan guru yang sama) memakai instance
  // gambar yang SAMA persis, bukan di-embed ulang tiap sheet (wb.addImage tiap kali dipanggil akan
  // menambah entry media baru di file meski isinya identik -- cache ini murni optimisasi ukuran file,
  // bukan perubahan perilaku).
  const imageIdCache = new Map<Buffer, number>()
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(TEMPLATE_PATH)

  const master = wb.getWorksheet(MASTER_SHEET_NAME)
  if (!master) throw new Error('Sheet template individu tidak ditemukan')
  const rekap = wb.getWorksheet(REKAP_SHEET_NAME)
  if (!rekap) throw new Error('Sheet Rekap tidak ditemukan pada template')

  const juzMap = new Map<number, JuzCellLocation>([
    ...cariBarisPertamaJuz(master, 'A', 'D', 'E', 14, 65),
    ...cariBarisPertamaJuz(master, 'G', 'J', 'K', 14, 65),
    ...cariBarisPertamaJuz(master, 'M', 'P', 'Q', 14, 65),
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

    kosongkanNilaiContohSheet(ws)
    hapusGambarTandaTanganContoh(ws)

    ws.getCell('C7').value = santri.nama
    ws.getCell('C8').value = null // Nomor Induk Santri (pondok) belum tersedia di data -- dikosongkan, bukan data palsu
    ws.getCell('C9').value = santri.nisn || '-'
    ws.getCell('O7').value = periodeLabel
    ws.getCell('O8').value = `${santri.kelasNum ?? '-'} / ${labelJenjangTemplate(santri.jenjang)}`
    ws.getCell('O9').value = semesterLabel

    // Blok tanda tangan: tempat/tanggal + label peran + nama wali kelas SELALU ditimpa dari data
    // sebenarnya, tidak pernah membiarkan teks bawaan template ("Sukoharjo, 5 Maret 2026" /
    // "Ust. Abu Aufa Amin S.") terbawa ke file hasil.
    ws.getCell(SEL_TANGGAL_CETAK).value = `Sukoharjo, ${tanggalIndonesia}`
    ws.getCell(SEL_LABEL_PENANDATANGAN).value = LABEL_WALI_KELAS
    ws.getCell(SEL_NAMA_WALI_KELAS).value = santri.waliKelasNama

    // Gambar tanda tangan contoh template SUDAH dihapus di atas (hapusGambarTandaTanganContoh) --
    // di sini HANYA menambahkan gambar sungguhan kalau guru Wali Kelas santri ini punya file tanda
    // tangan. Tidak ada -> area dibiarkan kosong (bukan broken image), raport tetap tergenerate
    // (Rule H). imageId di-cache per Buffer supaya guru yang sama tidak di-embed berulang.
    if (santri.tandaTangan) {
      let imageId = imageIdCache.get(santri.tandaTangan.buffer)
      if (imageId === undefined) {
        // exceljs membawa ambient declaration `interface Buffer extends ArrayBuffer {}` sendiri
        // (node_modules/exceljs/index.d.ts) yang, saat digabung TypeScript dengan Buffer asli dari
        // @types/node versi lebih baru (resizable ArrayBuffer), menghasilkan interface gabungan yang
        // TIDAK BISA dipenuhi Buffer runtime manapun -- dikonfirmasi bahkan double-assertion
        // `as unknown as Buffer` tetap gagal (structural check terhadap Image dievaluasi ulang saat
        // object literal dioper sebagai argumen). `any` di sini murni jalan keluar gesekan definisi
        // tipe pihak ketiga yang rusak, bukan longgar tipe internal kode ini -- Buffer yang dikirim
        // tetap valid & dipakai apa adanya saat runtime.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        imageId = wb.addImage({ buffer: santri.tandaTangan.buffer, extension: santri.tandaTangan.extension } as any)
        imageIdCache.set(santri.tandaTangan.buffer, imageId)
      }
      ws.addImage(imageId, {
        tl: { col: TANDA_TANGAN_ANCHOR_COL, row: TANDA_TANGAN_ANCHOR_ROW },
        ext: { width: TANDA_TANGAN_LEBAR_PX, height: TANDA_TANGAN_TINGGI_PX },
        editAs: 'oneCell',
      })
    }

    juzMap.forEach((lokasi, juz) => {
      const nilai = santri.juzNilai.get(juz)
      ws.getCell(`${lokasi.kolomNilai}${lokasi.row}`).value = (typeof nilai === 'number') ? nilai : null
      const tajwid = santri.juzTajwid.get(juz)
      ws.getCell(`${lokasi.kolomTajwid}${lokasi.row}`).value = (typeof tajwid === 'number') ? tajwid : null
    })

    // "Nilai Rata-rata" dihitung langsung dari nilai juz yang benar-benar final (bukan lewat formula
    // template AZ14/AZ15 yang cache-nya bisa basi -- lihat catatan SEL_RATA_KELANCARAN). Tajwid
    // rata-rata dihitung HANYA dari juz yang Tajwid-nya sudah diisi (kosong tidak ikut dihitung
    // sebagai 0) -- kosong total jika belum ada satupun Tajwid terisi.
    const nilaiJuzFinal = [...santri.juzNilai.values()].filter((n): n is number => typeof n === 'number')
    const rataKelancaran = nilaiJuzFinal.length > 0
      ? Math.round((nilaiJuzFinal.reduce((sum, n) => sum + n, 0) / nilaiJuzFinal.length) * 10) / 10
      : null
    ws.getCell(SEL_RATA_KELANCARAN).value = rataKelancaran

    const tajwidJuzFinal = [...santri.juzTajwid.values()].filter((n): n is number => typeof n === 'number')
    const rataTajwid = tajwidJuzFinal.length > 0
      ? Math.round((tajwidJuzFinal.reduce((sum, n) => sum + n, 0) / tajwidJuzFinal.length) * 10) / 10
      : null
    ws.getCell(SEL_RATA_TAJWID).value = rataTajwid

    // Pindahkan footnote asli (dibaca SEBELUM ditimpa) satu baris ke bawah, lalu tulis "Peringkat
    // Kelas"/"Peringkat Sementara" di baris yang ditinggalkannya -- lihat catatan SEL_PERINGKAT_KELAS
    // di atas. Keterangan singkat (hanya muncul saat status Sementara) ditulis ke SEL_KETERANGAN_PERINGKAT
    // memakai style yang sama, dan dibiarkan kosong (bawaan template) saat tidak ada keterangan.
    const catatanKtCell = ws.getCell(SEL_PERINGKAT_KELAS)
    const catatanKtValue = catatanKtCell.value
    const catatanKtFont = catatanKtCell.font
    const catatanKtAlignment = catatanKtCell.alignment
    const catatanKtBaruCell = ws.getCell(SEL_CATATAN_KT_BARU)
    catatanKtBaruCell.value = catatanKtValue
    catatanKtBaruCell.font = catatanKtFont
    catatanKtBaruCell.alignment = catatanKtAlignment

    const { label, keterangan } = infoPeringkatKelas(santri)
    catatanKtCell.value = label
    catatanKtCell.font = catatanKtFont
    catatanKtCell.alignment = catatanKtAlignment

    if (keterangan) {
      const keteranganCell = ws.getCell(SEL_KETERANGAN_PERINGKAT)
      keteranganCell.value = keterangan
      keteranganCell.font = catatanKtFont
      keteranganCell.alignment = catatanKtAlignment
    }
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
