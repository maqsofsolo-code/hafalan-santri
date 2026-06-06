// v2
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function angkaKeHuruf(n: number): string {
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan',
    'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas', 'Enam Belas',
    'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas']
  const puluhan = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh',
    'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh']
  if (n < 20) return satuan[n]
  return puluhan[Math.floor(n / 10)] + (n % 10 ? ' ' + satuan[n % 10] : '')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const periodeId = searchParams.get('periode_id')
  const jenjang = searchParams.get('jenjang') || 'ula'
  const kelas = searchParams.get('kelas')

  if (!periodeId || !kelas) {
    return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 })
  }

  // Ambil data periode
  const { data: periode } = await supabase.from('periode_rapot').select('*').eq('id', periodeId).single()
  if (!periode) return NextResponse.json({ error: 'Periode tidak ditemukan' }, { status: 404 })

  // Ambil semua santri yang punya nilai rapot di kelas ini (termasuk alumni)
  const { data: nilaiKelas } = await supabase
    .from('nilai_rapot')
    .select('santri_id')
    .eq('periode_id', periodeId)
    .eq('kelas_snapshot', parseInt(kelas))

  const santriIdsKelas = (nilaiKelas || []).map((n: any) => n.santri_id)

  if (santriIdsKelas.length === 0) {
    // Fallback: ambil berdasarkan kelas santri saat ini
    const { data: santriAktif } = await supabase
      .from('santri').select('*, guru:guru_id(nama)')
      .eq('jenjang', jenjang).eq('kelas_num', parseInt(kelas))
      .order('nama')
    if (!santriAktif || santriAktif.length === 0) {
      return NextResponse.json({ error: 'Tidak ada santri di kelas ini' }, { status: 404 })
    }
    var santriList = santriAktif
  } else {
    const { data: santriDariNilai } = await supabase
      .from('santri').select('*, guru:guru_id(nama)')
      .in('id', santriIdsKelas).order('nama')
    var santriList = santriDariNilai || []
  }

  if (!santriList || santriList.length === 0) {
    return NextResponse.json({ error: 'Tidak ada santri di kelas ini' }, { status: 404 })
  }

  // Ambil semua nilai rapot untuk kelas ini
  const santriIds = santriList.map(s => s.id)
  const { data: nilaiList } = await supabase
    .from('nilai_rapot').select('*')
    .eq('periode_id', periodeId)
    .in('santri_id', santriIds)

  // Hitung peringkat berdasarkan rata-rata akhir
  const hitungRataMapel = (n: any) => {
    const diiniyyah = [n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].filter(v => v != null)
    const umum = [n.bhs_indonesia, n.berhitung, n.ipa, n.ips].filter(v => v != null)
    if (diiniyyah.length === 0 && umum.length === 0) return 0
    const rataD = diiniyyah.length > 0 ? diiniyyah.reduce((a: number, b: number) => a + b, 0) / diiniyyah.length : 0
    const rataU = umum.length > 0 ? umum.reduce((a: number, b: number) => a + b, 0) / umum.length : 0
    if (diiniyyah.length === 0) return rataU
    if (umum.length === 0) return rataD
    return (rataD + rataU) / 2
  }

  // Buat map nilai per santri
  const nilaiMap: Record<string, any> = {}
  ;(nilaiList || []).forEach(n => { nilaiMap[n.santri_id] = n })

  // Hitung rata-rata dan peringkat
  const rataList = santriList.map(s => ({
    id: s.id,
    rata: nilaiMap[s.id] ? hitungRataMapel(nilaiMap[s.id]) : 0
  })).sort((a, b) => b.rata - a.rata)

  const peringkatMap: Record<string, number> = {}
  rataList.forEach((item, i) => { peringkatMap[item.id] = i + 1 })

  const jenjangLabel = jenjang === 'ula' ? 'ULAA' : jenjang === 'wustha' ? 'WUSTHA' : 'ULYA'
  const tanggalRapot = periode.tanggal_rapot
    ? new Date(periode.tanggal_rapot).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-'

  // Generate HTML untuk setiap santri
  const generateHalamanSantri = (santri: any) => {
    const n = nilaiMap[santri.id] || {}
    const guruNama = santri.guru?.nama || '-'
    const peringkat = peringkatMap[santri.id] || '-'
    const totalSantri = santriList.length

    const diiniyyahValues = [n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].filter(v => v != null)
    const umumValues = [n.bhs_indonesia, n.berhitung, n.ipa, n.ips].filter(v => v != null)
    const rataD = diiniyyahValues.length > 0 ? diiniyyahValues.reduce((a: number, b: number) => a + b, 0) / diiniyyahValues.length : null
    const rataU = umumValues.length > 0 ? umumValues.reduce((a: number, b: number) => a + b, 0) / umumValues.length : null
    const rataAkhir = rataD !== null && rataU !== null ? (rataD + rataU) / 2 : (rataD ?? rataU)

    // Hitung rata-rata kelas
    const hitungRataKelas = (field: string) => {
      const vals = (nilaiList || []).map(n => n[field]).filter(v => v != null && v > 0)
      if (vals.length === 0) return '-'
      return (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1)
    }

    const baris = (no: number, nama: string, nilai: number | null, rataKelas: string) => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${no}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;">${nama}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${nilai ?? '-'}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${nilai ? angkaKeHuruf(nilai) : '-'}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;"></td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${rataKelas}</td>
      </tr>`

    return `
    <div style="page-break-after:always; font-family:'Times New Roman',serif; padding:20px 30px; max-width:700px; margin:0 auto;">
      <div style="text-align:center; margin-bottom:15px;">
        <div style="font-size:14px; font-weight:bold;">Laporan Penilaian Hasil Belajar</div>
      </div>
      <table style="width:100%; margin-bottom:12px; font-size:12px;">
        <tr>
          <td style="width:50%">
            <table>
              <tr><td>Nama Santri</td><td>: <strong>${santri.nama}</strong></td></tr>
              <tr><td>Nomor Induk Santri</td><td>: ${santri.nisn || '-'}</td></tr>
              <tr><td>NISN</td><td>: ${santri.nisn || '-'}</td></tr>
            </table>
          </td>
          <td style="width:50%">
            <table>
              <tr><td>Tahun Ajaran</td><td>: ${periode.tahun_ajaran}</td></tr>
              <tr><td>Kelas/Jenjang</td><td>: ${kelas} / ${jenjangLabel}</td></tr>
              <tr><td>Semester</td><td>: ${periode.semester.toUpperCase()}</td></tr>
            </table>
          </td>
        </tr>
      </table>

      <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:10px;">
        <thead>
          <tr style="background:#f0f0f0;">
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:center;">No</th>
            <th style="padding:6px 8px;border:1px solid #ddd;">Mata Pelajaran</th>
            <th colspan="2" style="padding:6px 8px;border:1px solid #ddd;text-align:center;">Nilai</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:center;">Rata-rata</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:center;">Rata-rata Kelas</th>
          </tr>
          <tr style="background:#f8f8f8;">
            <th style="border:1px solid #ddd;"></th>
            <th style="border:1px solid #ddd;"></th>
            <th style="padding:4px 8px;border:1px solid #ddd;text-align:center;font-size:10px;">Angka</th>
            <th style="padding:4px 8px;border:1px solid #ddd;text-align:center;font-size:10px;">Huruf</th>
            <th style="border:1px solid #ddd;"></th>
            <th style="border:1px solid #ddd;"></th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="6" style="padding:5px 8px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9;">A. HIFZHUL QURAN</td></tr>
          ${baris(1, 'KELANCARAN', n.kelancaran, '-')}
          ${baris(2, 'TAJWID', n.tajwid, hitungRataKelas('tajwid'))}
          <tr><td colspan="6" style="padding:5px 8px;border:1px solid #ddd;font-size:11px;font-style:italic;">Jumlah Hafalan: ${n.keterangan_hafalan || '-'}</td></tr>
          <tr><td colspan="6" style="padding:5px 8px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9;">B. MATERI DIINIYYAH</td></tr>
          ${baris(1, 'AQIDAH', n.aqidah, hitungRataKelas('aqidah'))}
          ${baris(2, 'ADAB/AKHLAK', n.akhlak, hitungRataKelas('akhlak'))}
          ${baris(3, 'FIQH', n.fiqh, hitungRataKelas('fiqh'))}
          ${baris(4, 'BAHASA ARAB', n.bhs_arab, hitungRataKelas('bhs_arab'))}
          ${baris(5, 'SIROH', n.siroh, hitungRataKelas('siroh'))}
          ${baris(6, 'KHOTH', n.khoth, hitungRataKelas('khoth'))}
          <tr>
            <td colspan="2" style="padding:6px 8px;border:1px solid #ddd;font-weight:bold;">Rata-Rata Materi Diiniyyah</td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${rataD ? rataD.toFixed(1) : '-'}</td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${rataD ? angkaKeHuruf(Math.round(rataD)) : '-'}</td>
            <td style="border:1px solid #ddd;"></td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">-</td>
          </tr>
          <tr><td colspan="6" style="padding:5px 8px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9;">C. MATERI UMUM</td></tr>
          ${baris(1, 'BAHASA INDONESIA', n.bhs_indonesia, hitungRataKelas('bhs_indonesia'))}
          ${baris(2, 'BERHITUNG', n.berhitung, hitungRataKelas('berhitung'))}
          ${baris(3, 'IPA', n.ipa, hitungRataKelas('ipa'))}
          ${baris(4, 'IPS', n.ips, hitungRataKelas('ips'))}
          <tr>
            <td colspan="2" style="padding:6px 8px;border:1px solid #ddd;font-weight:bold;">Rata-Rata Materi Umum</td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${rataU ? rataU.toFixed(1) : '-'}</td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${rataU ? angkaKeHuruf(Math.round(rataU)) : '-'}</td>
            <td style="border:1px solid #ddd;"></td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">-</td>
          </tr>
          <tr style="background:#f0f0f0;">
            <td colspan="2" style="padding:6px 8px;border:1px solid #ddd;font-weight:bold;">Rata-Rata Akhir (Diiniyyah dan Umum)</td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;font-weight:bold;">${rataAkhir ? rataAkhir.toFixed(1) : '-'}</td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${rataAkhir ? angkaKeHuruf(Math.round(rataAkhir)) : '-'}</td>
            <td style="border:1px solid #ddd;"></td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">-</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:6px 8px;border:1px solid #ddd;font-weight:bold;">Peringkat</td>
            <td colspan="4" style="padding:6px 8px;border:1px solid #ddd;">${peringkat} dari ${totalSantri} santri</td>
          </tr>
        </tbody>
      </table>

      <table style="width:100%; font-size:11px; margin-bottom:10px; border-collapse:collapse;">
        <tr>
          <td style="width:33%; vertical-align:top; padding-right:10px;">
            <strong>Kepribadian</strong>
            <table style="margin-top:4px;">
              <tr><td>Akhlak</td><td>: ${n.akhlak_kepribadian || 'B'}</td></tr>
              <tr><td>Kebersihan</td><td>: ${n.kebersihan || 'B'}</td></tr>
              <tr><td>Ketertiban</td><td>: ${n.ketertiban || 'B'}</td></tr>
            </table>
          </td>
          <td style="width:33%; vertical-align:top; padding-right:10px;">
            <strong>Ketidakhadiran</strong>
            <table style="margin-top:4px;">
              <tr><td>Sakit</td><td>: ${n.hadir_sakit || 0}</td></tr>
              <tr><td>Ijin</td><td>: ${n.hadir_izin || 0}</td></tr>
              <tr><td>Tanpa ijin</td><td>: ${n.hadir_alpha || 0}</td></tr>
            </table>
          </td>
          <td style="width:33%; vertical-align:top;">
            <strong>Ekstrakurikuler</strong>
            <table style="margin-top:4px;">
              <tr><td>Renang</td><td>: ${n.ekskul_renang || 0}</td></tr>
              <tr><td>Beladiri</td><td>: ${n.ekskul_beladiri || '-'}</td></tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="margin-bottom:15px; font-size:11px;">
        <strong>Catatan:</strong><br/>
        <div style="margin-top:4px; padding:5px; border:1px solid #ddd; min-height:30px; font-style:italic;">
          ${n.catatan || '-'}
        </div>
      </div>

      <table style="width:100%; font-size:11px;">
        <tr>
          <td style="width:33%; text-align:center;">
            <div style="margin-bottom:40px;">Walisantri</div>
            <div>(                                 )</div>
          </td>
          <td style="width:33%; text-align:center;">
            <div>Sukoharjo, ${tanggalRapot}</div>
            <div style="margin-bottom:15px;">Walikelas</div>
            <div><strong>${guruNama}</strong></div>
          </td>
          <td style="width:33%; text-align:center;">
            <div>Mengetahui,</div>
            <div style="margin-bottom:15px;">Kepala Sekolah</div>
            <div><strong>Ust. Idral Harist</strong></div>
          </td>
        </tr>
      </table>
    </div>`
  }

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Rapot ${jenjangLabel} Kelas ${kelas} - ${periode.nama}</title>
    <style>
      @media print { body { margin: 0; } }
      body { font-family: 'Times New Roman', serif; }
    </style>
  </head>
  <body>
    ${santriList.map(s => generateHalamanSantri(s)).join('\n')}
    <script>window.onload = function() { window.print(); }</script>
  </body>
  </html>`

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}