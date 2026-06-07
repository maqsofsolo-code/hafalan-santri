import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function angkaKeHuruf(n: number): string {
  if (!n || n <= 0) return '-'
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan',
    'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas', 'Enam Belas',
    'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas']
  const puluhan = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh',
    'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh']
  const num = Math.round(n)
  if (num < 20) return satuan[num]
  return puluhan[Math.floor(num / 10)] + (num % 10 ? ' ' + satuan[num % 10] : '')
}

// Baca logo sebagai base64
function getLogoBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    const logoBuffer = fs.readFileSync(logoPath)
    return `data:image/png;base64,${logoBuffer.toString('base64')}`
  } catch {
    return ''
  }
}

function generateHeader(logoBase64: string): string {
  return `
    <div style="margin-bottom:8px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:80px;vertical-align:middle;text-align:center;">
            ${logoBase64 ? `<img src="${logoBase64}" style="width:70px;height:70px;object-fit:contain;" />` : ''}
          </td>
          <td style="vertical-align:middle;text-align:center;padding:0 10px;">
            <div style="font-family:'Traditional Arabic',Arial,sans-serif;font-size:20px;font-weight:bold;margin-bottom:2px;">
              مَعْهَدُ دَارِ السَّلَفِ الْإِسْلَامِي
            </div>
            <div style="font-size:18px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">
              PONDOK PESANTREN DAARUS SALAF
            </div>
            <div style="font-size:10px;margin-top:2px;">
              Nomor Statistik Pondok Pesantren : 510033110106
            </div>
            <div style="font-size:10px;margin-top:1px;">
              Sekretariat: Masjid Ibnu Taimiyyah, Jl. Pandawa, Karang RT 04 RW 07, Sangrahan, Grogol, Sukoharjo.
            </div>
          </td>
          <td style="width:80px;vertical-align:middle;text-align:center;">
            ${logoBase64 ? `<img src="${logoBase64}" style="width:70px;height:70px;object-fit:contain;" />` : ''}
          </td>
        </tr>
      </table>
      <div style="border-top:3px solid #333;margin-top:6px;"></div>
      <div style="border-top:1px solid #333;margin-top:2px;margin-bottom:8px;"></div>
      <div style="text-align:center;font-family:'Traditional Arabic',Arial,sans-serif;font-size:16px;margin-bottom:4px;">
        بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيْمِ
      </div>
      <div style="text-align:center;font-size:14px;font-weight:bold;font-style:italic;text-decoration:underline;margin-bottom:6px;">
        Laporan Penilaian Hasil Belajar
      </div>
    </div>`
}

function generateHalaman(
  santri: any,
  n: any,
  periode: any,
  peringkat: number,
  totalSantri: number,
  logoBase64: string,
  isLast: boolean
): string {
  const guruNama = santri.guru?.nama || '-'
  const kelasDisplay = n?.kelas_snapshot || santri.kelas_num || '-'
  const jenjangDisplay = n?.jenjang_snapshot?.toUpperCase() || (santri.jenjang === 'ula' ? 'ULA' : santri.jenjang === 'wustha' ? 'WUSTHA' : 'ULYA')

  const tanggalRapot = periode?.tanggal_rapot
    ? new Date(periode.tanggal_rapot).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-'

  // Hitung rata-rata
  const dVals = [n?.aqidah, n?.akhlak, n?.fiqh, n?.bhs_arab, n?.siroh, n?.khoth].filter((v: any) => v != null && v > 0)
  const uVals = [n?.bhs_indonesia, n?.berhitung, n?.ipa, n?.ips].filter((v: any) => v != null && v > 0)
  const rataD = dVals.length > 0 ? dVals.reduce((a: number, b: number) => a + b, 0) / dVals.length : null
  const rataU = uVals.length > 0 ? uVals.reduce((a: number, b: number) => a + b, 0) / uVals.length : null
  const rataAkhir = rataD !== null && rataU !== null ? (rataD + rataU) / 2 : (rataD ?? rataU)

  // Warna nilai — merah jika di bawah 56
  const nilaiColor = (v: number | null) => {
    if (!v) return '#999'
    return v < 56 ? '#dc2626' : '#1a1a1a'
  }

  const baris = (no: number, nama: string, nilai: number | null, rataKelas: string) => `
    <tr>
      <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">${no}</td>
      <td style="padding:5px 8px;border:1px solid #ccc;font-size:11px;">${nama}</td>
      <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;font-weight:bold;color:${nilaiColor(nilai)};">
        ${nilai ?? '-'}
      </td>
      <td style="padding:5px 8px;border:1px solid #ccc;font-size:11px;color:${nilaiColor(nilai)};">
        ${nilai ? angkaKeHuruf(nilai) : '-'}
      </td>
      <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;"></td>
      <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">${rataKelas}</td>
    </tr>`

  return `
  <div style="page-break-after:${isLast ? 'auto' : 'always'};font-family:'Times New Roman',serif;padding:15px 25px;max-width:720px;margin:0 auto;position:relative;">

    <!-- Watermark logo tengah -->
    ${logoBase64 ? `
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:0;pointer-events:none;">
      <img src="${logoBase64}" style="width:280px;height:280px;object-fit:contain;opacity:0.07;" />
    </div>` : ''}

    <!-- Konten di atas watermark -->
    <div style="position:relative;z-index:1;">

      ${generateHeader(logoBase64)}

      <!-- Info Santri -->
      <table style="width:100%;margin-bottom:12px;font-size:11px;border-collapse:collapse;">
        <tr>
          <td style="width:50%;vertical-align:top;padding-right:10px;">
            <table style="width:100%;">
              <tr>
                <td style="padding:2px 0;width:140px;">Nama Santri</td>
                <td style="padding:2px 0;">: <strong>${santri.nama}</strong></td>
              </tr>
              <tr>
                <td style="padding:2px 0;">Nomor Induk Santri</td>
                <td style="padding:2px 0;">: ${santri.nisn || '-'}</td>
              </tr>
              <tr>
                <td style="padding:2px 0;">Nomor Induk Siswa Nasional</td>
                <td style="padding:2px 0;">: ${santri.nisn || '-'}</td>
              </tr>
            </table>
          </td>
          <td style="width:50%;vertical-align:top;">
            <table style="width:100%;">
              <tr>
                <td style="padding:2px 0;width:110px;">Tahun Ajaran</td>
                <td style="padding:2px 0;">: ${periode?.tahun_ajaran || '-'}</td>
              </tr>
              <tr>
                <td style="padding:2px 0;">Kelas/Jenjang</td>
                <td style="padding:2px 0;">: ${kelasDisplay} / ${jenjangDisplay}</td>
              </tr>
              <tr>
                <td style="padding:2px 0;">Semester</td>
                <td style="padding:2px 0;">: ${periode?.semester?.toUpperCase() || '-'}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Tabel Nilai -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
        <thead>
          <tr style="background:#d4d4d4;">
            <th style="padding:6px 8px;border:1px solid #999;text-align:center;font-size:11px;width:30px;">No</th>
            <th style="padding:6px 8px;border:1px solid #999;font-size:11px;">Mata Pelajaran</th>
            <th colspan="2" style="padding:6px 8px;border:1px solid #999;text-align:center;font-size:11px;">Nilai</th>
            <th style="padding:6px 8px;border:1px solid #999;text-align:center;font-size:11px;width:55px;">Rata-Rata</th>
            <th style="padding:6px 8px;border:1px solid #999;text-align:center;font-size:11px;width:70px;">Rata-Rata Kelas</th>
          </tr>
          <tr style="background:#e8e8e8;">
            <th style="border:1px solid #999;"></th>
            <th style="border:1px solid #999;"></th>
            <th style="padding:3px 8px;border:1px solid #999;text-align:center;font-size:10px;width:45px;">Angka</th>
            <th style="padding:3px 8px;border:1px solid #999;text-align:center;font-size:10px;">Huruf</th>
            <th style="border:1px solid #999;"></th>
            <th style="border:1px solid #999;"></th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="6" style="padding:5px 8px;border:1px solid #999;font-weight:bold;background:#e8e8e8;font-size:11px;">A. HIFZHUL QUR'AN</td></tr>
          ${baris(1, 'KELANCARAN', n?.kelancaran, '-')}
          ${baris(2, 'TAJWID', n?.tajwid, '-')}
          <tr>
            <td colspan="6" style="padding:4px 8px;border:1px solid #999;font-size:10px;font-style:italic;background:#fafafa;">
              Jumlah Hafalan: <strong>${n?.keterangan_hafalan || '-'}</strong>
            </td>
          </tr>
          <tr><td colspan="6" style="padding:5px 8px;border:1px solid #999;font-weight:bold;background:#e8e8e8;font-size:11px;">B. MATERI DINIYYAH</td></tr>
          ${baris(1, 'AQIDAH', n?.aqidah, '-')}
          ${baris(2, 'ADAB/AKHLAK', n?.akhlak, '-')}
          ${baris(3, 'FIQH', n?.fiqh, '-')}
          ${baris(4, 'BAHASA ARAB', n?.bhs_arab, '-')}
          ${baris(5, 'SIROH', n?.siroh, '-')}
          ${baris(6, 'KHOTH', n?.khoth, '-')}
          <tr style="background:#f5e6d0;">
            <td colspan="2" style="padding:5px 8px;border:1px solid #999;font-weight:bold;font-size:11px;">Rata-Rata Materi Diniyyah</td>
            <td style="padding:5px 8px;border:1px solid #999;text-align:center;font-size:11px;font-weight:bold;color:${nilaiColor(rataD ? Math.round(rataD) : null)};">
              ${rataD ? rataD.toFixed(1) : '-'}
            </td>
            <td style="padding:5px 8px;border:1px solid #999;font-size:11px;color:${nilaiColor(rataD ? Math.round(rataD) : null)};">
              ${rataD ? angkaKeHuruf(Math.round(rataD)) : '-'}
            </td>
            <td style="border:1px solid #999;"></td>
            <td style="padding:5px 8px;border:1px solid #999;text-align:center;font-size:11px;">-</td>
          </tr>
          <tr><td colspan="6" style="padding:5px 8px;border:1px solid #999;font-weight:bold;background:#e8e8e8;font-size:11px;">C. MATERI UMUM</td></tr>
          ${baris(1, 'BAHASA INDONESIA', n?.bhs_indonesia, '-')}
          ${baris(2, 'BERHITUNG', n?.berhitung, '-')}
          ${baris(3, 'IPA', n?.ipa, '-')}
          ${baris(4, 'IPS', n?.ips, '-')}
          <tr style="background:#f5e6d0;">
            <td colspan="2" style="padding:5px 8px;border:1px solid #999;font-weight:bold;font-size:11px;">Rata-Rata Materi Umum</td>
            <td style="padding:5px 8px;border:1px solid #999;text-align:center;font-size:11px;font-weight:bold;color:${nilaiColor(rataU ? Math.round(rataU) : null)};">
              ${rataU ? rataU.toFixed(1) : '-'}
            </td>
            <td style="padding:5px 8px;border:1px solid #999;font-size:11px;color:${nilaiColor(rataU ? Math.round(rataU) : null)};">
              ${rataU ? angkaKeHuruf(Math.round(rataU)) : '-'}
            </td>
            <td style="border:1px solid #999;"></td>
            <td style="padding:5px 8px;border:1px solid #999;text-align:center;font-size:11px;">-</td>
          </tr>
          <tr style="background:#d4d4d4;">
            <td colspan="2" style="padding:6px 8px;border:1px solid #999;font-weight:bold;font-size:11px;">Rata-Rata Akhir (Materi Diniyyah dan Umum)</td>
            <td style="padding:6px 8px;border:1px solid #999;text-align:center;font-weight:bold;font-size:12px;color:${nilaiColor(rataAkhir ? Math.round(rataAkhir) : null)};">
              ${rataAkhir ? rataAkhir.toFixed(1) : '-'}
            </td>
            <td style="padding:6px 8px;border:1px solid #999;font-size:11px;color:${nilaiColor(rataAkhir ? Math.round(rataAkhir) : null)};">
              ${rataAkhir ? angkaKeHuruf(Math.round(rataAkhir)) : '-'}
            </td>
            <td style="border:1px solid #999;"></td>
            <td style="padding:6px 8px;border:1px solid #999;text-align:center;font-size:11px;">-</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:6px 8px;border:1px solid #999;font-weight:bold;font-size:11px;">Bulan Nilai : 1 2 3 4 5 6 7 8 9 10 11 12</td>
            <td colspan="4" style="padding:6px 8px;border:1px solid #999;font-size:11px;">
              Peringkat ke : <strong>${peringkat}</strong> dari ${totalSantri} santri
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Kepribadian, Kehadiran, Ekskul -->
      <table style="width:100%;font-size:11px;margin-bottom:10px;border-collapse:collapse;">
        <tr>
          <td style="width:34%;vertical-align:top;padding-right:6px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr style="background:#e8e8e8;">
                <th colspan="2" style="padding:4px 8px;border:1px solid #999;text-align:left;font-size:11px;">Kepribadian</th>
              </tr>
              <tr>
                <td style="padding:3px 8px;border:1px solid #999;">Akhlak</td>
                <td style="padding:3px 8px;border:1px solid #999;text-align:center;font-weight:bold;">${n?.akhlak_kepribadian || 'B'}</td>
              </tr>
              <tr>
                <td style="padding:3px 8px;border:1px solid #999;">Kebersihan</td>
                <td style="padding:3px 8px;border:1px solid #999;text-align:center;font-weight:bold;">${n?.kebersihan || 'B'}</td>
              </tr>
              <tr>
                <td style="padding:3px 8px;border:1px solid #999;">Ketertiban</td>
                <td style="padding:3px 8px;border:1px solid #999;text-align:center;font-weight:bold;">${n?.ketertiban || 'B'}</td>
              </tr>
            </table>
          </td>
          <td style="width:33%;vertical-align:top;padding-right:6px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr style="background:#e8e8e8;">
                <th colspan="2" style="padding:4px 8px;border:1px solid #999;text-align:left;font-size:11px;">Ketidakhadiran</th>
              </tr>
              <tr>
                <td style="padding:3px 8px;border:1px solid #999;">Sakit</td>
                <td style="padding:3px 8px;border:1px solid #999;text-align:center;">${n?.hadir_sakit || 0} hari</td>
              </tr>
              <tr>
                <td style="padding:3px 8px;border:1px solid #999;">Ijin</td>
                <td style="padding:3px 8px;border:1px solid #999;text-align:center;">${n?.hadir_izin || 0} hari</td>
              </tr>
              <tr>
                <td style="padding:3px 8px;border:1px solid #999;">Tanpa Ijin</td>
                <td style="padding:3px 8px;border:1px solid #999;text-align:center;">${n?.hadir_alpha || 0} hari</td>
              </tr>
            </table>
          </td>
          <td style="width:33%;vertical-align:top;">
            <table style="width:100%;border-collapse:collapse;">
              <tr style="background:#e8e8e8;">
                <th colspan="2" style="padding:4px 8px;border:1px solid #999;text-align:left;font-size:11px;">Ekstrakurikuler</th>
              </tr>
              <tr>
                <td style="padding:3px 8px;border:1px solid #999;">Renang</td>
                <td style="padding:3px 8px;border:1px solid #999;text-align:center;">${n?.ekskul_renang || 0}x</td>
              </tr>
              <tr>
                <td style="padding:3px 8px;border:1px solid #999;">Beladiri</td>
                <td style="padding:3px 8px;border:1px solid #999;text-align:center;">${n?.ekskul_beladiri || '-'}</td>
              </tr>
              <tr>
                <td style="padding:3px 8px;border:1px solid #999;"></td>
                <td style="padding:3px 8px;border:1px solid #999;"></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Catatan -->
      <div style="margin-bottom:15px;">
        <div style="font-size:11px;font-weight:bold;margin-bottom:3px;">Catatan Wali Kelas:</div>
        <div style="border:1px solid #999;padding:6px 8px;min-height:28px;font-size:11px;font-style:italic;">
          ${n?.catatan || '&nbsp;'}
        </div>
      </div>

      <!-- Tanda Tangan -->
      <table style="width:100%;font-size:11px;margin-top:10px;">
        <tr>
          <td style="width:33%;text-align:center;vertical-align:top;">
            <div>Orang Tua / Wali</div>
            <div style="margin:40px 0 3px;"></div>
            <div style="border-top:1px solid #333;display:inline-block;min-width:120px;padding-top:3px;">
              (________________________)
            </div>
          </td>
          <td style="width:33%;text-align:center;vertical-align:top;">
            <div>Sukoharjo, ${tanggalRapot}</div>
            <div>Wali Kelas,</div>
            <div style="margin:25px 0 3px;"></div>
            <div style="border-top:1px solid #333;display:inline-block;min-width:120px;padding-top:3px;">
              <strong>${guruNama}</strong>
            </div>
          </td>
          <td style="width:33%;text-align:center;vertical-align:top;">
            <div>Mengetahui,</div>
            <div>Kepala Sekolah</div>
            <div style="margin:25px 0 3px;"></div>
            <div style="border-top:1px solid #333;display:inline-block;min-width:120px;padding-top:3px;">
              <strong>Ust. Idral Harist</strong>
            </div>
          </td>
        </tr>
      </table>

    </div>
  </div>`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const periodeId = searchParams.get('periode_id')
  const jenjang = searchParams.get('jenjang') || 'ula'
  const kelas = searchParams.get('kelas')
  const santriId = searchParams.get('santri_id')
  const mode = searchParams.get('mode') // 'lengkap' = semua rapot satu santri

  const logoBase64 = getLogoBase64()

  // ===== MODE LENGKAP: semua rapot satu santri =====
  if (mode === 'lengkap' && santriId) {
    const { data: santri } = await supabase
      .from('santri').select('*, guru:guru_id(nama)').eq('id', santriId).single()
    if (!santri) return new NextResponse('Santri tidak ditemukan', { status: 404 })

    // Ambil semua nilai rapot santri ini, urutkan dari kelas terkecil
    const { data: semuaNilai } = await supabase
      .from('nilai_rapot')
      .select('*, periode:periode_id(nama, tahun_ajaran, semester, tanggal_rapot)')
      .eq('santri_id', santriId)
      .order('kelas_snapshot', { ascending: true })

    if (!semuaNilai || semuaNilai.length === 0) {
      return new NextResponse(`
        <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
        <body style="font-family:sans-serif;padding:40px;text-align:center;">
          <h2>Belum ada data rapot</h2>
          <p>Santri <strong>${santri.nama}</strong> belum memiliki data rapot.</p>
        </body></html>
      `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    }

    // Generate halaman per nilai
    const halaman = semuaNilai.map((n: any, i: number) =>
      generateHalaman(santri, n, n.periode, 1, 1, logoBase64, i === semuaNilai.length - 1)
    )

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Rapot Lengkap - ${santri.nama}</title>
  <style>
    body { font-family: 'Times New Roman', serif; margin: 0; background: white; }
    @media print { body { margin: 0; } @page { margin: 1cm; size: A4; } }
  </style>
</head>
<body>
  ${halaman.join('\n')}
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 800); }
  </script>
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    })
  }

  // ===== MODE NORMAL: per periode =====
  if (!periodeId) return new NextResponse('Parameter tidak lengkap', { status: 400 })

  const { data: periode } = await supabase
    .from('periode_rapot').select('*').eq('id', periodeId).single()
  if (!periode) return new NextResponse('Periode tidak ditemukan', { status: 404 })

  // ===== MODE PER SANTRI =====
  if (santriId) {
    const { data: santri } = await supabase
      .from('santri').select('*, guru:guru_id(nama)').eq('id', santriId).single()
    if (!santri) return new NextResponse('Santri tidak ditemukan', { status: 404 })

    const kelasUntukQuery = kelas || santri.kelas_num?.toString()
    let query = supabase.from('nilai_rapot').select('*')
      .eq('santri_id', santriId).eq('periode_id', periodeId)
    if (kelasUntukQuery) query = query.eq('kelas_snapshot', parseInt(kelasUntukQuery))
    const { data: nilaiData } = await query.maybeSingle()

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Rapot ${santri.nama} - ${periode.nama}</title>
  <style>
    body { font-family: 'Times New Roman', serif; margin: 0; background: white; }
    @media print { body { margin: 0; } @page { margin: 1cm; size: A4; } }
  </style>
</head>
<body>
  ${generateHalaman(santri, nilaiData || {}, periode, 1, 1, logoBase64, true)}
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 800); }
  </script>
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    })
  }

  // ===== MODE PER KELAS =====
  if (!kelas) return new NextResponse('Parameter kelas tidak ada', { status: 400 })

  // Ambil santri berdasarkan kelas_snapshot dulu
  const { data: nilaiSnapshot } = await supabase
    .from('nilai_rapot').select('santri_id')
    .eq('periode_id', periodeId)
    .eq('kelas_snapshot', parseInt(kelas))

  let santriList: any[] = []

  if (nilaiSnapshot && nilaiSnapshot.length > 0) {
    const ids = nilaiSnapshot.map((n: any) => n.santri_id)
    const { data } = await supabase
      .from('santri').select('*, guru:guru_id(nama)')
      .in('id', ids).order('nama')
    santriList = data || []
  } else {
    // Fallback: kelas santri saat ini
    const { data } = await supabase
      .from('santri').select('*, guru:guru_id(nama)')
      .eq('jenjang', jenjang).eq('kelas_num', parseInt(kelas)).order('nama')
    santriList = data || []
  }

  if (santriList.length === 0) {
    return new NextResponse(`
      <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h2>Tidak ada data rapot</h2>
        <p>Belum ada nilai untuk Kelas ${kelas} pada periode ini.</p>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  // Ambil semua nilai
  const santriIds = santriList.map((s: any) => s.id)
  const { data: nilaiList } = await supabase
    .from('nilai_rapot').select('*')
    .eq('periode_id', periodeId).in('santri_id', santriIds)

  // Map nilai per santri — prioritaskan kelas_snapshot cocok
  const nilaiMap: Record<string, any> = {}
  ;(nilaiList || []).forEach((n: any) => {
    if (!nilaiMap[n.santri_id] || n.kelas_snapshot === parseInt(kelas)) {
      nilaiMap[n.santri_id] = n
    }
  })

  // Hitung peringkat
  const hitungRata = (n: any) => {
    if (!n) return 0
    const d = [n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].filter((v: any) => v != null && v > 0)
    const u = [n.bhs_indonesia, n.berhitung, n.ipa, n.ips].filter((v: any) => v != null && v > 0)
    if (d.length === 0 && u.length === 0) return 0
    const rd = d.length > 0 ? d.reduce((a: number, b: number) => a + b, 0) / d.length : 0
    const ru = u.length > 0 ? u.reduce((a: number, b: number) => a + b, 0) / u.length : 0
    if (d.length === 0) return ru
    if (u.length === 0) return rd
    return (rd + ru) / 2
  }

  const rataList = santriList
    .map((s: any) => ({ id: s.id, rata: hitungRata(nilaiMap[s.id]) }))
    .sort((a: any, b: any) => b.rata - a.rata)
  const peringkatMap: Record<string, number> = {}
  rataList.forEach((item: any, i: number) => { peringkatMap[item.id] = i + 1 })

  const halaman = santriList.map((s: any, i: number) =>
    generateHalaman(s, nilaiMap[s.id] || {}, periode, peringkatMap[s.id] || 1, santriList.length, logoBase64, i === santriList.length - 1)
  )

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Rapot Kelas ${kelas} - ${periode.nama}</title>
  <style>
    body { font-family: 'Times New Roman', serif; margin: 0; background: white; }
    @media print { body { margin: 0; } @page { margin: 1cm; size: A4; } }
  </style>
</head>
<body>
  ${halaman.join('\n')}
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 800); }
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  })
}