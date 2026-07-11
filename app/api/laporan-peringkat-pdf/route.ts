import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jenjang = searchParams.get('jenjang') || 'ula'
  const jenisKelas = searchParams.get('jenis_kelas') || 'banin'
  const topN = parseInt(searchParams.get('top') || '3')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Ambil semua santri aktif sesuai filter
  let query = supabase
    .from('santri')
    .select('id, nama, kelas, kelas_num, jenjang, jenis_kelas, total_hafalan_juz, surah_terakhir_nomor')
    .eq('status', 'aktif')
    .eq('jenjang', jenjang)
    .order('kelas_num', { ascending: true })
    .order('nama', { ascending: true })

  if (jenisKelas === 'banin') {
    query = query.eq('jenis_kelas', 'banin')
  } else if (jenisKelas === 'banat') {
    query = query.eq('jenis_kelas', 'banat')
  } else if (jenisKelas === 'tn') {
    query = query.in('jenis_kelas', ['tn_a', 'tn_b'])
  }

  const { data: santriAll } = await query

  if (!santriAll || santriAll.length === 0) {
    return NextResponse.json({ error: 'Tidak ada data santri' }, { status: 404 })
  }

  // Kelompokkan per kelas dan ambil top N
  const kelasMap: Record<number, any[]> = {}
  santriAll.forEach(s => {
    const k = s.kelas_num || 0
    if (!kelasMap[k]) kelasMap[k] = []
    kelasMap[k].push(s)
  })

  // Urutkan per kelas berdasarkan total hafalan, ambil top N
  const kelasList = Object.keys(kelasMap)
    .map(Number)
    .sort((a, b) => a - b)

  const dataPerKelas = kelasList.map(k => {
    const sorted = kelasMap[k].sort((a, b) => (b.total_hafalan_juz || 0) - (a.total_hafalan_juz || 0))
    return {
      kelas: k,
      label: santriAll.find(s => s.kelas_num === k)?.kelas || `Kelas ${k}`,
      top: sorted.slice(0, topN).map((s, i) => ({
        peringkat: i + 1,
        nama: s.nama,
        juz: s.total_hafalan_juz ? s.total_hafalan_juz.toFixed(2) : '0.00',
      }))
    }
  })

  // Label
  const jenjangLabel: Record<string, string> = { ula: 'Ula', wustha: 'Wustha', ulya: 'Ulya' }
  const jenisLabel: Record<string, string> = { banin: 'Banin', banat: 'Banat', tn: 'Takhassus (TN)' }
  const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  // Warna per peringkat
  const warnaMedal = ['#f59e0b', '#9ca3af', '#f97316']
  const labelMedal = ['🥇', '🥈', '🥉']

  // Buat kolom per kelas
  const kolomHTML = dataPerKelas.map(kelas => {
    const baris = Array.from({ length: topN }, (_, i) => {
      const santri = kelas.top[i]
      const warna = warnaMedal[i] || '#e5e7eb'
      const medal = labelMedal[i] || `#${i + 1}`
      if (!santri) {
        return `
          <tr>
            <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="background:${warna};color:white;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;flex-shrink:0;">${i + 1}</span>
                <span style="color:#ccc;font-size:9pt;font-style:italic;">—</span>
              </div>
            </td>
          </tr>`
      }
      return `
        <tr>
          <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:14px;flex-shrink:0;">${medal}</span>
              <div>
                <div style="font-size:9pt;font-weight:600;color:#1e293b;line-height:1.3;">${santri.nama}</div>
                <div style="font-size:8pt;color:#64748b;">${santri.juz} Juz</div>
              </div>
            </div>
          </td>
        </tr>`
    }).join('')

    return `
      <td style="vertical-align:top;padding:0 6px;width:${Math.floor(100 / kelasList.length)}%;">
        <div style="border:1.5px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a3a5c,#2563a8);padding:8px 10px;text-align:center;">
            <div style="color:white;font-weight:bold;font-size:10pt;">${kelas.label}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            ${baris}
          </table>
        </div>
      </td>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Peringkat ${jenjangLabel[jenjang] || jenjang} ${jenisLabel[jenisKelas] || jenisKelas}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; background: #fff; color: #1e293b; }
    @page { size: A4 landscape; margin: 15mm 12mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <!-- Tombol print, disembunyikan saat print -->
  <div class="no-print" style="text-align:center;padding:16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;margin-bottom:20px;">
    <button onclick="window.print()" style="background:linear-gradient(135deg,#1a3a5c,#2563a8);color:white;border:none;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:bold;cursor:pointer;">
      🖨️ Cetak / Simpan PDF
    </button>
    <span style="margin-left:16px;font-size:12px;color:#64748b;">atau tekan Ctrl+P</span>
  </div>

  <!-- Header -->
  <div style="text-align:center;margin-bottom:16px;">
    <div style="font-size:13pt;font-weight:bold;color:#1a3a5c;">PONDOK PESANTREN DAARUS SALAF SUKOHARJO</div>
    <div style="font-size:11pt;font-weight:bold;margin-top:2px;">LAPORAN PERINGKAT HAFALAN</div>
    <div style="font-size:10pt;color:#475569;margin-top:2px;">
      Jenjang ${jenjangLabel[jenjang] || jenjang} ${jenisLabel[jenisKelas] || jenisKelas} &nbsp;•&nbsp; Peringkat 1–${topN} Per Kelas
    </div>
    <div style="font-size:9pt;color:#94a3b8;margin-top:2px;">Per tanggal: ${tanggal}</div>
    <div style="height:2px;background:linear-gradient(90deg,#1a3a5c,#2563a8);border-radius:2px;margin:10px auto 0;max-width:400px;"></div>
  </div>

  <!-- Tabel kolom per kelas -->
  <table style="width:100%;border-collapse:separate;border-spacing:0;">
    <tr>
      ${kolomHTML}
    </tr>
  </table>

  <!-- Footer -->
  <div style="margin-top:20px;text-align:center;font-size:8pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;">
    Dicetak dari Sistem Informasi Santri Daarus Salaf &nbsp;•&nbsp; ${tanggal}
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="Peringkat_${jenjangLabel[jenjang]}_${jenisLabel[jenisKelas]}.html"`,
    },
  })
}