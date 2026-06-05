import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    .from('setoran').select('*')
    .gte('tanggal', tglMulai).lte('tanggal', tglSelesai)
    .order('tanggal', { ascending: true })

  const namaBulan = new Date(tahun, bln - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const tglCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const hariMap: Record<number, string> = { 0: 'Ahad', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' }

  // Generate HTML yang akan dikonversi ke PDF via browser print
  // Karena Vercel tidak support Python/headless browser, kita return HTML yang bisa diprint
  const htmlPages = santriList.map(santri => {
    const setoranSantri = (setoranList || []).filter(s => s.santri_id === santri.id)
    const hadir = setoranSantri.filter(s => s.status_kehadiran === 'hadir')
    const lancar = hadir.filter(s => s.status === 'lancar')
    const baru = hadir.filter(s => s.jenis === 'baru')
    const murojaah = hadir.filter(s => s.jenis === 'lama')
    const sakit = setoranSantri.filter(s => s.status_kehadiran === 'sakit').length
    const izin = setoranSantri.filter(s => s.status_kehadiran === 'izin').length
    const alpha = setoranSantri.filter(s => s.status_kehadiran === 'alpha').length
    const tambahJuz = baru.reduce((sum, s) => sum + (s.penambahan_juz || 0), 0)

    const barisSetoran = setoranSantri.length === 0
      ? `<tr><td colspan="8" style="text-align:center;color:#9ca3af;font-style:italic;padding:12px">Tidak ada setoran pada bulan ini</td></tr>`
      : setoranSantri.map((s, idx) => {
          const tgl = new Date(s.tanggal)
          const hari = hariMap[tgl.getDay()]
          const isHadir = s.status_kehadiran === 'hadir'
          const isLancar = s.status === 'lancar'
          const bgRow = !isHadir ? '#fef9c3' : isLancar ? '#dcfce7' : '#fee2e2'
          return `
            <tr style="background:${bgRow}">
              <td style="text-align:center">${idx + 1}</td>
              <td style="text-align:center">${s.tanggal}</td>
              <td style="text-align:center">${hari}</td>
              <td style="text-align:center">${s.jenis === 'baru' ? 'Baru' : 'Murojaah'}</td>
              <td style="text-align:center">${isHadir && s.surah ? `${s.surah}<br>Ayat ${s.ayat_mulai}-${s.ayat_selesai}` : '-'}</td>
              <td style="text-align:center">${isHadir ? (isLancar ? '✓ Lancar' : '✗ Rosib') : '-'}</td>
              <td style="text-align:center">${(s.status_kehadiran || '').charAt(0).toUpperCase() + (s.status_kehadiran || '').slice(1)}</td>
              <td>${s.catatan || ''}</td>
            </tr>`
        }).join('')

    return `
    <div class="page">
      <!-- KOP SURAT -->
      <div style="text-align:center;border-bottom:2px solid #1a3a5c;padding-bottom:8px;margin-bottom:10px">
        <div style="font-size:14pt;font-weight:bold;color:#1a3a5c">PONDOK PESANTREN DAARUS SALAF SUKOHARJO</div>
        <div style="font-size:8pt;color:#555;margin-top:2px">Jl. Pandawa, Dukuh Karang RT 04/07, Sanggrahan, Grogol, Sukoharjo, Jawa Tengah</div>
        <div style="font-size:8pt;color:#2563a8">www.daarussalafsukoharjo.com</div>
      </div>

      <!-- JUDUL -->
      <div style="background:#1a3a5c;color:white;text-align:center;padding:8px;font-weight:bold;font-size:11pt;border-radius:4px;margin-bottom:8px">
        LAPORAN SETORAN HAFALAN BULANAN — ${namaBulan.toUpperCase()}
      </div>

      <!-- INFO SANTRI -->
      <table style="width:100%;margin-bottom:10px;font-size:9pt;border-collapse:collapse">
        <tr>
          <td style="width:25%;background:#f3f4f6;font-weight:bold;padding:4px 8px;border:1px solid #e5e7eb">Nama Santri</td>
          <td style="width:1%;padding:4px 4px;border:1px solid #e5e7eb">:</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb"><strong>${santri.nama}</strong></td>
          <td style="width:25%;background:#f3f4f6;font-weight:bold;padding:4px 8px;border:1px solid #e5e7eb">Kelas</td>
          <td style="width:1%;padding:4px 4px;border:1px solid #e5e7eb">:</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb">${santri.kelas || '-'}</td>
        </tr>
        <tr>
          <td style="background:#f3f4f6;font-weight:bold;padding:4px 8px;border:1px solid #e5e7eb">Guru Musami'</td>
          <td style="padding:4px 4px;border:1px solid #e5e7eb">:</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb">${santri.guru?.nama || '-'}</td>
          <td style="background:#f3f4f6;font-weight:bold;padding:4px 8px;border:1px solid #e5e7eb">Total Hafalan</td>
          <td style="padding:4px 4px;border:1px solid #e5e7eb">:</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb">${(santri.total_hafalan_juz || 0).toFixed(2)} Juz</td>
        </tr>
      </table>

      <!-- TABEL SETORAN -->
      <table style="width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:10px">
        <thead>
          <tr style="background:#1a3a5c;color:white">
            <th style="padding:5px;border:1px solid #9ca3af;text-align:center;width:4%">No</th>
            <th style="padding:5px;border:1px solid #9ca3af;text-align:center;width:10%">Tanggal</th>
            <th style="padding:5px;border:1px solid #9ca3af;text-align:center;width:8%">Hari</th>
            <th style="padding:5px;border:1px solid #9ca3af;text-align:center;width:10%">Jenis</th>
            <th style="padding:5px;border:1px solid #9ca3af;text-align:center;width:20%">Surah / Ayat</th>
            <th style="padding:5px;border:1px solid #9ca3af;text-align:center;width:10%">Status</th>
            <th style="padding:5px;border:1px solid #9ca3af;text-align:center;width:10%">Kehadiran</th>
            <th style="padding:5px;border:1px solid #9ca3af;text-align:center;width:28%">Catatan Guru</th>
          </tr>
        </thead>
        <tbody>${barisSetoran}</tbody>
      </table>

      <!-- RINGKASAN -->
      <div style="background:#166534;color:white;text-align:center;padding:5px;font-weight:bold;font-size:9pt;margin-bottom:0">
        RINGKASAN BULAN INI
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:8.5pt;margin-bottom:14px">
        <tr>
          <td style="background:#f3f4f6;font-weight:bold;padding:4px 8px;border:1px solid #e5e7eb;width:25%">Total Hari Setor</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;width:25%">${hadir.length} hari</td>
          <td style="background:#f3f4f6;font-weight:bold;padding:4px 8px;border:1px solid #e5e7eb;width:25%">Setoran Lancar</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;width:25%">${lancar.length} kali</td>
        </tr>
        <tr>
          <td style="background:#f3f4f6;font-weight:bold;padding:4px 8px;border:1px solid #e5e7eb">Setoran Rosib</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb">${hadir.length - lancar.length} kali</td>
          <td style="background:#f3f4f6;font-weight:bold;padding:4px 8px;border:1px solid #e5e7eb">Hafalan Baru</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb">${baru.length} kali</td>
        </tr>
        <tr>
          <td style="background:#f3f4f6;font-weight:bold;padding:4px 8px;border:1px solid #e5e7eb">Murojaah</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb">${murojaah.length} kali</td>
          <td style="background:#f3f4f6;font-weight:bold;padding:4px 8px;border:1px solid #e5e7eb">Penambahan Hafalan</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb">${tambahJuz.toFixed(2)} Juz</td>
        </tr>
        <tr>
          <td style="background:#f3f4f6;font-weight:bold;padding:4px 8px;border:1px solid #e5e7eb">Tidak Hadir Sakit</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb">${sakit} hari</td>
          <td style="background:#f3f4f6;font-weight:bold;padding:4px 8px;border:1px solid #e5e7eb">Tidak Hadir Izin</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb">${izin} hari</td>
        </tr>
        <tr>
          <td style="background:#f3f4f6;font-weight:bold;padding:4px 8px;border:1px solid #e5e7eb">Alpha</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb">${alpha} hari</td>
          <td style="background:#f3f4f6;font-weight:bold;padding:4px 8px;border:1px solid #e5e7eb"></td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb"></td>
        </tr>
      </table>

      <!-- TANDA TANGAN -->
      <table style="width:100%;font-size:9pt;margin-top:8px">
        <tr>
          <td style="text-align:center;width:40%">Mengetahui,</td>
          <td style="width:20%"></td>
          <td style="text-align:center;width:40%">Sukoharjo, ${tglCetak}</td>
        </tr>
        <tr>
          <td style="text-align:center">Kepala Sekolah</td>
          <td></td>
          <td style="text-align:center">Guru Musami'</td>
        </tr>
        <tr style="height:50px"><td></td><td></td><td></td></tr>
        <tr>
          <td style="text-align:center;text-decoration:underline;font-weight:bold">Al Ustadz Abu Muhammad Idral</td>
          <td></td>
          <td style="text-align:center;text-decoration:underline;font-weight:bold">${santri.guru?.nama || '________________'}</td>
        </tr>
      </table>
    </div>`
  }).join('<div class="page-break"></div>')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Laporan Hafalan ${namaBulan}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 9pt; color: #111; }
    .page { padding: 20mm 15mm; min-height: 100vh; }
    .page-break { page-break-after: always; }
    table { font-size: 8.5pt; }
    td, th { vertical-align: middle; }
    @media print {
      .page { padding: 15mm 12mm; }
      .page-break { page-break-after: always; height: 0; }
      .no-print { display: none; }
    }
    @page { size: A4; margin: 0; }
  </style>
</head>
<body>
  <div class="no-print" style="background:#1a3a5c;color:white;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:99">
    <span style="font-weight:bold">📄 Laporan Hafalan ${namaBulan} — ${santriList.length} santri</span>
    <button onclick="window.print()" style="background:#16a34a;color:white;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:10pt">
      🖨️ Print / Simpan PDF
    </button>
  </div>
  ${htmlPages}
</body>
</html>`

  const namaBulanFile = new Date(tahun, bln - 1, 1)
    .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    .replace(' ', '_')

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="Laporan_Hafalan_${namaBulanFile}.html"`,
    },
  })
}