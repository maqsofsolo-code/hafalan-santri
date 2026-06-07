import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const periodeId = searchParams.get('periode_id')
  const jenjang = searchParams.get('jenjang') || 'ula'
  const kelas = searchParams.get('kelas')

  if (!periodeId || !kelas) {
    return new NextResponse('Parameter tidak lengkap', { status: 400 })
  }

  // Ambil data periode
  const { data: periode } = await supabase
    .from('periode_rapot').select('*').eq('id', periodeId).single()
  if (!periode) return new NextResponse('Periode tidak ditemukan', { status: 404 })

  // Ambil nilai rapot berdasarkan kelas_snapshot, jika ada
  const { data: nilaiDenganSnapshot } = await supabase
    .from('nilai_rapot')
    .select('santri_id')
    .eq('periode_id', periodeId)
    .eq('kelas_snapshot', parseInt(kelas))

  let santriList: any[] = []

  if (nilaiDenganSnapshot && nilaiDenganSnapshot.length > 0) {
    // Ada data dengan kelas_snapshot — ambil santri berdasarkan itu
    const ids = nilaiDenganSnapshot.map((n: any) => n.santri_id)
    const { data } = await supabase
      .from('santri').select('*, guru:guru_id(nama)')
      .in('id', ids).order('nama')
    santriList = data || []
  } else {
    // Fallback: ambil berdasarkan kelas santri saat ini
    const { data } = await supabase
      .from('santri').select('*, guru:guru_id(nama)')
      .eq('jenjang', jenjang)
      .eq('kelas_num', parseInt(kelas))
      .order('nama')
    santriList = data || []
  }

  if (santriList.length === 0) {
    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h2>Tidak ada santri di kelas ini</h2>
        <p>Belum ada data rapot untuk Kelas ${kelas} ${jenjang} pada periode ini.</p>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  // Ambil semua nilai rapot untuk santri ini
  const santriIds = santriList.map((s: any) => s.id)
  const { data: nilaiList } = await supabase
    .from('nilai_rapot').select('*')
    .eq('periode_id', periodeId)
    .in('santri_id', santriIds)

  // Buat map nilai per santri
  const nilaiMap: Record<string, any> = {}
  ;(nilaiList || []).forEach((n: any) => { nilaiMap[n.santri_id] = n })

  // Hitung rata-rata per santri
  const hitungRata = (n: any) => {
    if (!n) return 0
    const diiniyyah = [n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth]
      .filter((v: any) => v != null && v > 0)
    const umum = [n.bhs_indonesia, n.berhitung, n.ipa, n.ips]
      .filter((v: any) => v != null && v > 0)
    if (diiniyyah.length === 0 && umum.length === 0) return 0
    const rataD = diiniyyah.length > 0
      ? diiniyyah.reduce((a: number, b: number) => a + b, 0) / diiniyyah.length : 0
    const rataU = umum.length > 0
      ? umum.reduce((a: number, b: number) => a + b, 0) / umum.length : 0
    if (diiniyyah.length === 0) return rataU
    if (umum.length === 0) return rataD
    return (rataD + rataU) / 2
  }

  // Hitung peringkat
  const rataList = santriList
    .map((s: any) => ({ id: s.id, rata: hitungRata(nilaiMap[s.id]) }))
    .sort((a: any, b: any) => b.rata - a.rata)
  const peringkatMap: Record<string, number> = {}
  rataList.forEach((item: any, i: number) => { peringkatMap[item.id] = i + 1 })

  const jenjangLabel = jenjang === 'ula' ? 'ULAA' : jenjang === 'wustha' ? 'WUSTHA' : 'ULYA'
  const tanggalRapot = periode.tanggal_rapot
    ? new Date(periode.tanggal_rapot).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
    : '-'

  // Hitung rata-rata kelas per mapel
  const hitungRataKelas = (field: string) => {
    const vals = (nilaiList || [])
      .map((n: any) => n[field])
      .filter((v: any) => v != null && v > 0)
    if (vals.length === 0) return '-'
    return (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1)
  }

  // Generate HTML per santri
  const generateHalaman = (santri: any) => {
    const n = nilaiMap[santri.id] || {}
    const guruNama = santri.guru?.nama || '-'
    const peringkat = peringkatMap[santri.id] || '-'
    const totalSantri = santriList.length

    const diiniyyahVals = [n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth]
      .filter((v: any) => v != null && v > 0)
    const umumVals = [n.bhs_indonesia, n.berhitung, n.ipa, n.ips]
      .filter((v: any) => v != null && v > 0)
    const rataD = diiniyyahVals.length > 0
      ? diiniyyahVals.reduce((a: number, b: number) => a + b, 0) / diiniyyahVals.length : null
    const rataU = umumVals.length > 0
      ? umumVals.reduce((a: number, b: number) => a + b, 0) / umumVals.length : null
    const rataAkhir = rataD !== null && rataU !== null
      ? (rataD + rataU) / 2 : (rataD ?? rataU)

    const baris = (no: number, nama: string, nilai: number | null, rataKelas: string) => `
      <tr>
        <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">${no}</td>
        <td style="padding:5px 8px;border:1px solid #ccc;font-size:11px;">${nama}</td>
        <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">${nilai ?? '-'}</td>
        <td style="padding:5px 8px;border:1px solid #ccc;font-size:11px;">${nilai ? angkaKeHuruf(nilai) : '-'}</td>
        <td style="padding:5px 8px;border:1px solid #ccc;"></td>
        <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">${rataKelas}</td>
      </tr>`

    const kelasDisplay = n.kelas_snapshot || santri.kelas_num || kelas

    return `
    <div style="page-break-after:always;font-family:'Times New Roman',serif;padding:15px 25px;max-width:680px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:12px;">
        <div style="font-size:14px;font-weight:bold;">Laporan Penilaian Hasil Belajar</div>
      </div>

      <table style="width:100%;margin-bottom:10px;font-size:11px;border-collapse:collapse;">
        <tr>
          <td style="width:50%;vertical-align:top;">
            <table>
              <tr><td style="padding:2px 4px;white-space:nowrap;">Nama Santri</td><td style="padding:2px 4px;">: <strong>${santri.nama}</strong></td></tr>
              <tr><td style="padding:2px 4px;white-space:nowrap;">Nomor Induk Santri</td><td style="padding:2px 4px;">: ${santri.nisn || '-'}</td></tr>
              <tr><td style="padding:2px 4px;white-space:nowrap;">NISN</td><td style="padding:2px 4px;">: ${santri.nisn || '-'}</td></tr>
            </table>
          </td>
          <td style="width:50%;vertical-align:top;">
            <table>
              <tr><td style="padding:2px 4px;white-space:nowrap;">Tahun Ajaran</td><td style="padding:2px 4px;">: ${periode.tahun_ajaran}</td></tr>
              <tr><td style="padding:2px 4px;white-space:nowrap;">Kelas/Jenjang</td><td style="padding:2px 4px;">: ${kelasDisplay} / ${jenjangLabel}</td></tr>
              <tr><td style="padding:2px 4px;white-space:nowrap;">Semester</td><td style="padding:2px 4px;">: ${periode.semester.toUpperCase()}</td></tr>
            </table>
          </td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        <thead>
          <tr style="background:#f0f0f0;">
            <th style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">No</th>
            <th style="padding:5px 8px;border:1px solid #ccc;font-size:11px;">Mata Pelajaran</th>
            <th colspan="2" style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">Nilai</th>
            <th style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">Rata-rata</th>
            <th style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">Rata-rata Kelas</th>
          </tr>
          <tr style="background:#f8f8f8;">
            <th style="border:1px solid #ccc;"></th>
            <th style="border:1px solid #ccc;"></th>
            <th style="padding:3px 8px;border:1px solid #ccc;text-align:center;font-size:10px;">Angka</th>
            <th style="padding:3px 8px;border:1px solid #ccc;text-align:center;font-size:10px;">Huruf</th>
            <th style="border:1px solid #ccc;"></th>
            <th style="border:1px solid #ccc;"></th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="6" style="padding:4px 8px;border:1px solid #ccc;font-weight:bold;background:#f9f9f9;font-size:11px;">A. HIFZHUL QURAN</td></tr>
          ${baris(1, 'KELANCARAN', n.kelancaran, '-')}
          ${baris(2, 'TAJWID', n.tajwid, hitungRataKelas('tajwid'))}
          <tr><td colspan="6" style="padding:4px 8px;border:1px solid #ccc;font-size:10px;font-style:italic;">Jumlah Hafalan: ${n.keterangan_hafalan || '-'}</td></tr>
          <tr><td colspan="6" style="padding:4px 8px;border:1px solid #ccc;font-weight:bold;background:#f9f9f9;font-size:11px;">B. MATERI DIINIYYAH</td></tr>
          ${baris(1, 'AQIDAH', n.aqidah, hitungRataKelas('aqidah'))}
          ${baris(2, 'ADAB/AKHLAK', n.akhlak, hitungRataKelas('akhlak'))}
          ${baris(3, 'FIQH', n.fiqh, hitungRataKelas('fiqh'))}
          ${baris(4, 'BAHASA ARAB', n.bhs_arab, hitungRataKelas('bhs_arab'))}
          ${baris(5, 'SIROH', n.siroh, hitungRataKelas('siroh'))}
          ${baris(6, 'KHOTH', n.khoth, hitungRataKelas('khoth'))}
          <tr>
            <td colspan="2" style="padding:5px 8px;border:1px solid #ccc;font-weight:bold;font-size:11px;">Rata-Rata Materi Diiniyyah</td>
            <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">${rataD ? rataD.toFixed(1) : '-'}</td>
            <td style="padding:5px 8px;border:1px solid #ccc;font-size:11px;">${rataD ? angkaKeHuruf(Math.round(rataD)) : '-'}</td>
            <td style="border:1px solid #ccc;"></td>
            <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">-</td>
          </tr>
          <tr><td colspan="6" style="padding:4px 8px;border:1px solid #ccc;font-weight:bold;background:#f9f9f9;font-size:11px;">C. MATERI UMUM</td></tr>
          ${baris(1, 'BAHASA INDONESIA', n.bhs_indonesia, hitungRataKelas('bhs_indonesia'))}
          ${baris(2, 'BERHITUNG', n.berhitung, hitungRataKelas('berhitung'))}
          ${baris(3, 'IPA', n.ipa, hitungRataKelas('ipa'))}
          ${baris(4, 'IPS', n.ips, hitungRataKelas('ips'))}
          <tr>
            <td colspan="2" style="padding:5px 8px;border:1px solid #ccc;font-weight:bold;font-size:11px;">Rata-Rata Materi Umum</td>
            <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">${rataU ? rataU.toFixed(1) : '-'}</td>
            <td style="padding:5px 8px;border:1px solid #ccc;font-size:11px;">${rataU ? angkaKeHuruf(Math.round(rataU)) : '-'}</td>
            <td style="border:1px solid #ccc;"></td>
            <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">-</td>
          </tr>
          <tr style="background:#f0f0f0;">
            <td colspan="2" style="padding:5px 8px;border:1px solid #ccc;font-weight:bold;font-size:11px;">Rata-Rata Akhir (Diiniyyah dan Umum)</td>
            <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-weight:bold;font-size:11px;">${rataAkhir ? rataAkhir.toFixed(1) : '-'}</td>
            <td style="padding:5px 8px;border:1px solid #ccc;font-size:11px;">${rataAkhir ? angkaKeHuruf(Math.round(rataAkhir)) : '-'}</td>
            <td style="border:1px solid #ccc;"></td>
            <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">-</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:5px 8px;border:1px solid #ccc;font-weight:bold;font-size:11px;">Peringkat</td>
            <td colspan="4" style="padding:5px 8px;border:1px solid #ccc;font-size:11px;">${peringkat} dari ${totalSantri} santri</td>
          </tr>
        </tbody>
      </table>

      <table style="width:100%;font-size:11px;margin-bottom:8px;border-collapse:collapse;">
        <tr>
          <td style="width:33%;vertical-align:top;padding-right:8px;">
            <strong>Kepribadian</strong>
            <table style="margin-top:3px;">
              <tr><td style="padding:1px 3px;">Akhlak</td><td>: ${n.akhlak_kepribadian || 'B'}</td></tr>
              <tr><td style="padding:1px 3px;">Kebersihan</td><td>: ${n.kebersihan || 'B'}</td></tr>
              <tr><td style="padding:1px 3px;">Ketertiban</td><td>: ${n.ketertiban || 'B'}</td></tr>
            </table>
          </td>
          <td style="width:33%;vertical-align:top;padding-right:8px;">
            <strong>Ketidakhadiran</strong>
            <table style="margin-top:3px;">
              <tr><td style="padding:1px 3px;">Sakit</td><td>: ${n.hadir_sakit || 0}</td></tr>
              <tr><td style="padding:1px 3px;">Ijin</td><td>: ${n.hadir_izin || 0}</td></tr>
              <tr><td style="padding:1px 3px;">Tanpa ijin</td><td>: ${n.hadir_alpha || 0}</td></tr>
            </table>
          </td>
          <td style="width:33%;vertical-align:top;">
            <strong>Ekstrakurikuler</strong>
            <table style="margin-top:3px;">
              <tr><td style="padding:1px 3px;">Renang</td><td>: ${n.ekskul_renang || 0}</td></tr>
              <tr><td style="padding:1px 3px;">Beladiri</td><td>: ${n.ekskul_beladiri || '-'}</td></tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="margin-bottom:12px;font-size:11px;">
        <strong>Catatan:</strong>
        <div style="margin-top:3px;padding:5px;border:1px solid #ccc;min-height:25px;font-style:italic;">
          ${n.catatan || '-'}
        </div>
      </div>

      <table style="width:100%;font-size:11px;">
        <tr>
          <td style="width:33%;text-align:center;">
            <div style="margin-bottom:35px;">Walisantri</div>
            <div>(                                 )</div>
          </td>
          <td style="width:33%;text-align:center;">
            <div>Sukoharjo, ${tanggalRapot}</div>
            <div style="margin-bottom:20px;">Walikelas</div>
            <div><strong>${guruNama}</strong></div>
          </td>
          <td style="width:33%;text-align:center;">
            <div>Mengetahui,</div>
            <div style="margin-bottom:20px;">Kepala Sekolah</div>
            <div><strong>Ust. Idral Harist</strong></div>
          </td>
        </tr>
      </table>
    </div>`
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Rapot ${jenjangLabel} Kelas ${kelas} - ${periode.nama}</title>
  <style>
    body { font-family: 'Times New Roman', serif; margin: 0; }
    @media print {
      body { margin: 0; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  ${santriList.map((s: any) => generateHalaman(s)).join('\n')}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    }
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache',
    }
  })
}