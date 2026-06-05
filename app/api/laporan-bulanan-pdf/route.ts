import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bulan = searchParams.get('bulan')
  const jenjang = searchParams.get('jenjang') || 'semua'
  const kelas = searchParams.get('kelas') || 'semua'
  const santriId = searchParams.get('santri_id') || 'semua'

  if (!bulan) return NextResponse.json({ error: 'Bulan wajib diisi' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [tahun, bln] = bulan.split('-').map(Number)
  const tglMulai = `${bulan}-01`
  const hariTerakhir = new Date(tahun, bln, 0).getDate()
  const tglSelesai = `${bulan}-${String(hariTerakhir).padStart(2, '0')}`

  let santriQuery = supabase.from('santri').select('*, guru:guru_id(nama)').order('kelas_num').order('nama')
  if (jenjang !== 'semua') santriQuery = santriQuery.eq('jenjang', jenjang)
  if (kelas !== 'semua') santriQuery = santriQuery.eq('kelas_num', parseInt(kelas))
  if (santriId !== 'semua') santriQuery = santriQuery.eq('id', santriId)
  const { data: santriList } = await santriQuery

  if (!santriList || santriList.length === 0)
    return NextResponse.json({ error: 'Tidak ada data santri' }, { status: 404 })

  const { data: setoranList } = await supabase
    .from('setoran')
    .select('*')
    .gte('tanggal', tglMulai)
    .lte('tanggal', tglSelesai)
    .order('tanggal', { ascending: true })

  const namaBulan = new Date(tahun, bln - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const tglCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const hariIndonesia = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

  // Buat Python script untuk generate PDF
  const pythonScript = `
import json, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

data = json.loads(sys.argv[1])
santri_list = data['santri']
setoran_all = data['setoran']
nama_bulan = data['nama_bulan']
tgl_cetak = data['tgl_cetak']
output_path = data['output_path']

BIRU_TUA = colors.HexColor('#1a3a5c')
BIRU_MID = colors.HexColor('#2563a8')
BIRU_MUDA = colors.HexColor('#dbeafe')
HIJAU = colors.HexColor('#166534')
HIJAU_MUDA = colors.HexColor('#dcfce7')
MERAH_MUDA = colors.HexColor('#fee2e2')
KUNING_MUDA = colors.HexColor('#fef9c3')
ABU = colors.HexColor('#f3f4f6')
ABU2 = colors.HexColor('#e5e7eb')
HITAM = colors.black
PUTIH = colors.white

styles = getSampleStyleSheet()
style_normal = ParagraphStyle('normal', fontName='Helvetica', fontSize=8, leading=10)
style_bold = ParagraphStyle('bold', fontName='Helvetica-Bold', fontSize=8, leading=10)
style_center = ParagraphStyle('center', fontName='Helvetica', fontSize=8, alignment=TA_CENTER, leading=10)
style_catatan = ParagraphStyle('catatan', fontName='Helvetica', fontSize=7, leading=9)

story = []

for si, santri in enumerate(santri_list):
    if si > 0:
        story.append(PageBreak())

    setoran_santri = [s for s in setoran_all if s['santri_id'] == santri['id']]

    # ===== KOP SURAT =====
    kop = [
        [Paragraph('<b><font size="12" color="#1a3a5c">PONDOK PESANTREN DAARUS SALAF SUKOHARJO</font></b>', ParagraphStyle('kop', fontName='Helvetica-Bold', fontSize=12, alignment=TA_CENTER, textColor=BIRU_TUA))],
        [Paragraph('Jl. Pandawa, Dukuh Karang RT 04/07, Sanggrahan, Grogol, Sukoharjo, Jawa Tengah', ParagraphStyle('kop2', fontName='Helvetica', fontSize=8, alignment=TA_CENTER, textColor=colors.HexColor('#555555')))],
        [Paragraph('www.daarussalafsukoharjo.com', ParagraphStyle('kop3', fontName='Helvetica', fontSize=8, alignment=TA_CENTER, textColor=colors.HexColor('#2563a8')))],
    ]
    t_kop = Table(kop, colWidths=[18*cm])
    t_kop.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_kop)
    story.append(HRFlowable(width="100%", thickness=1.5, color=BIRU_TUA))
    story.append(Spacer(1, 4))

    # ===== JUDUL =====
    judul_data = [
        [Paragraph(f'<font color="white"><b>LAPORAN SETORAN HAFALAN BULANAN — {nama_bulan.upper()}</b></font>',
            ParagraphStyle('judul', fontName='Helvetica-Bold', fontSize=11, alignment=TA_CENTER, textColor=PUTIH))]
    ]
    t_judul = Table(judul_data, colWidths=[18*cm])
    t_judul.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BIRU_TUA),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    story.append(t_judul)
    story.append(Spacer(1, 6))

    # ===== INFO SANTRI =====
    info = [
        ['Nama Santri', ':', santri['nama']],
        ['Kelas', ':', santri.get('kelas', '-')],
        ["Guru Musami'", ':', santri.get('guru_nama', '-')],
        ['Total Hafalan', ':', f"{santri.get('total_hafalan_juz', 0):.2f} Juz"],
    ]
    t_info = Table(info, colWidths=[4*cm, 0.5*cm, 13.5*cm])
    t_info.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME', (1,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('BACKGROUND', (0,0), (0,-1), ABU),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LINEBELOW', (0,-1), (-1,-1), 0.5, ABU2),
    ]))
    story.append(t_info)
    story.append(Spacer(1, 8))

    # ===== TABEL SETORAN =====
    header = [
        Paragraph('<b>No</b>', style_center),
        Paragraph('<b>Tanggal</b>', style_center),
        Paragraph('<b>Hari</b>', style_center),
        Paragraph('<b>Jenis</b>', style_center),
        Paragraph('<b>Surah / Ayat</b>', style_center),
        Paragraph('<b>Status</b>', style_center),
        Paragraph('<b>Kehadiran</b>', style_center),
        Paragraph('<b>Catatan Guru</b>', style_center),
    ]
    rows = [header]
    hari_id = ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']

    if not setoran_santri:
        rows.append([Paragraph('Tidak ada setoran pada bulan ini', ParagraphStyle('empty', fontName='Helvetica-Oblique', fontSize=8, alignment=TA_CENTER, textColor=colors.HexColor('#9ca3af'))), '', '', '', '', '', '', ''])
    else:
        for idx, s in enumerate(setoran_santri):
            from datetime import datetime
            tgl = datetime.strptime(s['tanggal'], '%Y-%m-%d')
            hari = hari_id[tgl.weekday() + 1 if tgl.weekday() < 6 else 0]
            # weekday(): Mon=0..Sat=5,Sun=6 → map to Ahad=0..Sabtu=6
            day_map = {0:'Senin',1:'Selasa',2:'Rabu',3:'Kamis',4:'Jumat',5:'Sabtu',6:'Ahad'}
            hari = day_map[tgl.weekday()]
            is_hadir = s.get('status_kehadiran') == 'hadir'
            is_lancar = s.get('status') == 'lancar'
            if not is_hadir:
                bg = KUNING_MUDA
            elif is_lancar:
                bg = HIJAU_MUDA
            else:
                bg = MERAH_MUDA

            surah_info = '-'
            if is_hadir and s.get('surah'):
                surah_info = f"{s.get('surah', '')[:20]}\\nAyat {s.get('ayat_mulai','-')} - {s.get('ayat_selesai','-')}"

            row = [
                Paragraph(str(idx+1), style_center),
                Paragraph(s['tanggal'], style_center),
                Paragraph(hari, style_center),
                Paragraph('Baru' if s.get('jenis')=='baru' else 'Murojaah', style_center),
                Paragraph(surah_info, style_normal),
                Paragraph('Lancar' if is_hadir and is_lancar else ('Rosib' if is_hadir else '-'), style_center),
                Paragraph((s.get('status_kehadiran','') or '').capitalize(), style_center),
                Paragraph(s.get('catatan','') or '', style_catatan),
            ]
            rows.append((row, bg))

    col_w = [0.7*cm, 2.2*cm, 1.5*cm, 2*cm, 3.8*cm, 1.5*cm, 1.8*cm, 4.5*cm]
    table_data = [rows[0]] + [r[0] if isinstance(r, tuple) else r for r in rows[1:]]
    t = Table(table_data, colWidths=col_w, repeatRows=1)

    ts = [
        ('BACKGROUND', (0,0), (-1,0), BIRU_TUA),
        ('TEXTCOLOR', (0,0), (-1,0), PUTIH),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.3, colors.HexColor('#d1d5db')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [PUTIH, ABU]),
    ]
    for i, r in enumerate(rows[1:]):
        if isinstance(r, tuple):
            ts.append(('BACKGROUND', (0, i+1), (-1, i+1), r[1]))
    t.setStyle(TableStyle(ts))
    story.append(t)
    story.append(Spacer(1, 10))

    # ===== RINGKASAN =====
    hadir_list = [s for s in setoran_santri if s.get('status_kehadiran')=='hadir']
    lancar_list = [s for s in hadir_list if s.get('status')=='lancar']
    baru_list = [s for s in hadir_list if s.get('jenis')=='baru']
    murojaah_list = [s for s in hadir_list if s.get('jenis')=='lama']
    sakit_n = len([s for s in setoran_santri if s.get('status_kehadiran')=='sakit'])
    izin_n = len([s for s in setoran_santri if s.get('status_kehadiran')=='izin'])
    alpha_n = len([s for s in setoran_santri if s.get('status_kehadiran')=='alpha'])
    tambah_juz = sum(s.get('penambahan_juz',0) or 0 for s in baru_list)

    ringkasan_header = [[Paragraph('<font color="white"><b>RINGKASAN BULAN INI</b></font>',
        ParagraphStyle('rh', fontName='Helvetica-Bold', fontSize=9, alignment=TA_CENTER, textColor=PUTIH)), '']]
    t_rh = Table(ringkasan_header, colWidths=[9*cm, 9*cm])
    t_rh.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HIJAU),
        ('SPAN', (0,0), (1,0)),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_rh)

    ringkasan = [
        ['Total Hari Setor', str(len(hadir_list)), 'Setoran Lancar', str(len(lancar_list))],
        ['Setoran Rosib', str(len(hadir_list)-len(lancar_list)), 'Hafalan Baru', str(len(baru_list))],
        ['Murojaah', str(len(murojaah_list)), 'Penambahan Hafalan', f"{tambah_juz:.2f} Juz"],
        ['Tidak Hadir (Sakit)', str(sakit_n), 'Tidak Hadir (Izin)', str(izin_n)],
        ['Alpha', str(alpha_n), '', ''],
    ]
    t_r = Table([[Paragraph(f'<b>{r[0]}</b>' if r[0] else '', style_normal),
                  Paragraph(r[1], style_normal),
                  Paragraph(f'<b>{r[2]}</b>' if r[2] else '', style_normal),
                  Paragraph(r[3], style_normal)] for r in ringkasan],
                colWidths=[4.5*cm, 4.5*cm, 4.5*cm, 4.5*cm])
    t_r.setStyle(TableStyle([
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('GRID', (0,0), (-1,-1), 0.3, ABU2),
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [PUTIH, ABU]),
        ('BACKGROUND', (0,0), (0,-1), ABU),
        ('BACKGROUND', (2,0), (2,-1), ABU),
    ]))
    story.append(t_r)
    story.append(Spacer(1, 16))

    # ===== TANDA TANGAN =====
    ttd = [
        [Paragraph('Mengetahui,', style_center), '', Paragraph(f'Sukoharjo, {tgl_cetak}', style_center)],
        [Paragraph("Kepala Sekolah", style_center), '', Paragraph("Guru Musami'", style_center)],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        [Paragraph('<u><b>Al Ustadz Abu Muhammad Idral</b></u>', style_center), '',
         Paragraph(f"<u><b>{santri.get('guru_nama', '________________')}</b></u>", style_center)],
    ]
    t_ttd = Table(ttd, colWidths=[6.5*cm, 5*cm, 6.5*cm])
    t_ttd.setStyle(TableStyle([
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_ttd)

doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    rightMargin=1.5*cm, leftMargin=1.5*cm,
    topMargin=1.5*cm, bottomMargin=1.5*cm,
    title=f"Laporan Hafalan {nama_bulan}"
)
doc.build(story)
print("OK")
`

  // Siapkan data untuk Python
  const santriData = santriList.map(s => ({
    id: s.id,
    nama: s.nama,
    kelas: s.kelas || '-',
    guru_nama: s.guru?.nama || '-',
    total_hafalan_juz: s.total_hafalan_juz || 0,
  }))

  const setoranData = (setoranList || []).map(s => ({
    santri_id: s.santri_id,
    tanggal: s.tanggal,
    jenis: s.jenis,
    surah: s.surah || '',
    surah_mulai_nomor: s.surah_mulai_nomor,
    surah_selesai_nomor: s.surah_selesai_nomor,
    ayat_mulai: s.ayat_mulai,
    ayat_selesai: s.ayat_selesai,
    status: s.status,
    status_kehadiran: s.status_kehadiran,
    catatan: s.catatan || '',
    penambahan_juz: s.penambahan_juz || 0,
  }))

  const namaBulanFile = new Date(tahun, bln - 1, 1)
    .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    .replace(' ', '_')

  const tmpScript = join(tmpdir(), `laporan_${Date.now()}.py`)
  const tmpPdf = join(tmpdir(), `laporan_${Date.now()}.pdf`)

  const payload = JSON.stringify({
    santri: santriData,
    setoran: setoranData,
    nama_bulan: namaBulan,
    tgl_cetak: tglCetak,
    output_path: tmpPdf,
  }).replace(/'/g, "\\'")

  writeFileSync(tmpScript, pythonScript)

  try {
    execSync(`python3 ${tmpScript} '${payload}'`, { timeout: 30000 })
    const pdfBuffer = readFileSync(tmpPdf)

    unlinkSync(tmpScript)
    unlinkSync(tmpPdf)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Laporan_Hafalan_${namaBulanFile}.pdf"`,
      },
    })
  } catch (err: any) {
    try { unlinkSync(tmpScript) } catch {}
    try { unlinkSync(tmpPdf) } catch {}
    return NextResponse.json({ error: 'Gagal generate PDF: ' + err.message }, { status: 500 })
  }
}