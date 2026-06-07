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

  // Ambil nilai rapot berdasarkan kelas_snapshot dulu
  const { data: nilaiDenganSnapshot } = await supabase
    .from('nilai_rapot')
    .select('santri_id')
    .eq('periode_id', periodeId)
    .eq('kelas_snapshot', parseInt(kelas))

  let santriList: any[] = []

  if (nilaiDenganSnapshot && nilaiDenganSnapshot.length > 0) {
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
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h2>Tidak ada data rapot</h2>
        <p>Belum ada nilai rapot untuk Kelas ${kelas} pada periode ini.</p>
        <p style="color:#999;font-size:13px;">Pastikan data sudah diinput melalui menu Input Nilai Rapot.</p>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  // Ambil semua nilai rapot
  const santriIds = santriList.map((s: any) => s.id)
  const { data: nilaiList } = await supabase
    .from('nilai_rapot').select('*')
    .eq('periode_id', periodeId)
    .in('santri_id', santriIds)

  // Buat map nilai per santri — prioritaskan yang kelas_snapshot cocok
  const nilaiMap: Record<string, any> = {}
  ;(nilaiList || []).forEach((n: any) => {
    if (!nilaiMap[n.santri_id]) {
      nilaiMap[n.santri_id] = n
    } else if (n.kelas_snapshot === parseInt(kelas)) {
      nilaiMap[n.santri_id] = n
    }
  })

  // Hitung rata-rata per santri
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

  // Hitung peringkat
  const rataList = santriList
    .map((s: any) => ({ id: s.id, rata: hitungRata(nilaiMap[s.id]) }))
    .sort((a: any, b: any) => b.rata - a.rata)
  const peringkatMap: Record<string, number> = {}
  rataList.forEach((item: any, i: number) => { peringkatMap[item.id] = i + 1 })

  // Hitung rata-rata kelas per mapel
  const hitungRataKelas = (field: string) => {
    const vals = (nilaiList || []).map((n: any) => n[field]).filter((v: any) => v != null && v > 0)
    if (vals.length === 0) return '-'
    return (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1)
  }

  const jenjangLabel = jenjang === 'ula' ? 'ULA' : jenjang === 'wustha' ? 'WUSTHA' : 'ULYA'
  const tanggalRapot = periode.tanggal_rapot
    ? new Date(periode.tanggal_rapot).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-'

  const generateHalaman = (santri: any) => {
    const n = nilaiMap[santri.id] || {}
    const guruNama = santri.guru?.nama || '-'
    const peringkat = peringkatMap[santri.id] || '-'
    const totalSantri = santriList.length

    const d = [n.aqidah, n.akhlak, n.fiqh, n.bhs_arab, n.siroh, n.khoth].filter((v: any) => v != null && v > 0)
    const u = [n.bhs_indonesia, n.berhitung, n.ipa, n.ips].filter((v: any) => v != null && v > 0)
    const rataD = d.length > 0 ? d.reduce((a: number, b: number) => a + b, 0) / d.length : null
    const rataU = u.length > 0 ? u.reduce((a: number, b: number) => a + b, 0) / u.length : null
    const rataAkhir = rataD !== null && rataU !== null ? (rataD + rataU) / 2 : (rataD ?? rataU)

    const kelasDisplay = n.kelas_snapshot || santri.kelas_num || kelas
    const jenjangDisplay = n.jenjang_snapshot?.toUpperCase() || jenjangLabel

    const baris = (no: number, nama: string, nilai: number | null, rataKelas: string) => `
      <tr>
        <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">${no}</td>
        <td style="padding:5px 8px;border:1px solid #ccc;font-size:11px;">${nama}</td>
        <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;font-weight:bold;">${nilai ?? '-'}</td>
        <td style="padding:5px 8px;border:1px solid #ccc;font-size:11px;">${nilai ? angkaKeHuruf(nilai) : '-'}</td>
        <td style="padding:5px 8px;border:1px solid #ccc;"></td>
        <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">${rataKelas}</td>
      </tr>`

    return `
    <div style="page-break-after:always;font-family:'Times New Roman',serif;padding:15px 25px;max-width:700px;margin:0 auto;">

      <div style="text-align:center;margin-bottom:15px;border-bottom:2px solid #333;padding-bottom:10px;">
        <div style="font-size:15px;font-weight:bold;letter-spacing:1px;">LAPORAN PENILAIAN HASIL BELAJAR</div>
        <div style="font-size:12px;margin-top:2px;">Pondok Pesantren Daarus Salaf Sukoharjo</div>
      </div>

      <table style="width:100%;margin-bottom:12px;font-size:11px;border-collapse:collapse;">
        <tr>
          <td style="width:50%;vertical-align:top;padding-right:10px;">
            <table style="width:100%;">
              <tr>
                <td style="padding:2px 0;width:130px;">Nama Santri</td>
                <td style="padding:2px 0;">: <strong>${santri.nama}</strong></td>
              </tr>
              <tr>
                <td style="padding:2px 0;">No. Induk Santri</td>
                <td style="padding:2px 0;">: ${santri.nisn || '-'}</td>
              </tr>
              <tr>
                <td style="padding:2px 0;">NISN</td>
                <td style="padding:2px 0;">: ${santri.nisn || '-'}</td>
              </tr>
            </table>
          </td>
          <td style="width:50%;vertical-align:top;">
            <table style="width:100%;">
              <tr>
                <td style="padding:2px 0;width:110px;">Tahun Ajaran</td>
                <td style="padding:2px 0;">: ${periode.tahun_ajaran}</td>
              </tr>
              <tr>
                <td style="padding:2px 0;">Kelas / Jenjang</td>
                <td style="padding:2px 0;">: ${kelasDisplay} / ${jenjangDisplay}</td>
              </tr>
              <tr>
                <td style="padding:2px 0;">Semester</td>
                <td style="padding:2px 0;">: ${periode.semester.toUpperCase()}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
        <thead>
          <tr style="background:#e8e8e8;">
            <th style="padding:6px 8px;border:1px solid #ccc;text-align:center;font-size:11px;width:30px;">No</th>
            <th style="padding:6px 8px;border:1px solid #ccc;font-size:11px;">Mata Pelajaran</th>
            <th colspan="2" style="padding:6px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">Nilai</th>
            <th style="padding:6px 8px;border:1px solid #ccc;text-align:center;font-size:11px;width:60px;">KKM</th>
            <th style="padding:6px 8px;border:1px solid #ccc;text-align:center;font-size:11px;width:70px;">Rata Kelas</th>
          </tr>
          <tr style="background:#f5f5f5;">
            <th style="border:1px solid #ccc;"></th>
            <th style="border:1px solid #ccc;"></th>
            <th style="padding:3px 8px;border:1px solid #ccc;text-align:center;font-size:10px;width:45px;">Angka</th>
            <th style="padding:3px 8px;border:1px solid #ccc;text-align:center;font-size:10px;">Huruf</th>
            <th style="border:1px solid #ccc;"></th>
            <th style="border:1px solid #ccc;"></th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="6" style="padding:5px 8px;border:1px solid #ccc;font-weight:bold;background:#f0f0f0;font-size:11px;">A. HIFZHUL QUR'AN</td></tr>
          ${baris(1, 'KELANCARAN HIFZH', n.kelancaran, '-')}
          ${baris(2, 'TAJWID', n.tajwid, hitungRataKelas('tajwid'))}
          <tr>
            <td colspan="6" style="padding:4px 8px;border:1px solid #ccc;font-size:10px;font-style:italic;background:#fafafa;">
              Jumlah Hafalan: <strong>${n.keterangan_hafalan || '-'}</strong>
            </td>
          </tr>
          <tr><td colspan="6" style="padding:5px 8px;border:1px solid #ccc;font-weight:bold;background:#f0f0f0;font-size:11px;">B. MATERI DIINIYYAH</td></tr>
          ${baris(1, 'AQIDAH', n.aqidah, hitungRataKelas('aqidah'))}
          ${baris(2, 'ADAB / AKHLAK', n.akhlak, hitungRataKelas('akhlak'))}
          ${baris(3, 'FIQH', n.fiqh, hitungRataKelas('fiqh'))}
          ${baris(4, 'BAHASA ARAB', n.bhs_arab, hitungRataKelas('bhs_arab'))}
          ${baris(5, 'SIROH', n.siroh, hitungRataKelas('siroh'))}
          ${baris(6, 'KHOTH', n.khoth, hitungRataKelas('khoth'))}
          <tr style="background:#fafafa;">
            <td colspan="2" style="padding:5px 8px;border:1px solid #ccc;font-weight:bold;font-size:11px;">Rata-Rata Diiniyyah</td>
            <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;font-weight:bold;">${rataD ? rataD.toFixed(1) : '-'}</td>
            <td style="padding:5px 8px;border:1px solid #ccc;font-size:11px;">${rataD ? angkaKeHuruf(Math.round(rataD)) : '-'}</td>
            <td style="border:1px solid #ccc;"></td>
            <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">-</td>
          </tr>
          <tr><td colspan="6" style="padding:5px 8px;border:1px solid #ccc;font-weight:bold;background:#f0f0f0;font-size:11px;">C. MATERI UMUM</td></tr>
          ${baris(1, 'BAHASA INDONESIA', n.bhs_indonesia, hitungRataKelas('bhs_indonesia'))}
          ${baris(2, 'BERHITUNG', n.berhitung, hitungRataKelas('berhitung'))}
          ${baris(3, 'IPA', n.ipa, hitungRataKelas('ipa'))}
          ${baris(4, 'IPS', n.ips, hitungRataKelas('ips'))}
          <tr style="background:#fafafa;">
            <td colspan="2" style="padding:5px 8px;border:1px solid #ccc;font-weight:bold;font-size:11px;">Rata-Rata Umum</td>
            <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;font-weight:bold;">${rataU ? rataU.toFixed(1) : '-'}</td>
            <td style="padding:5px 8px;border:1px solid #ccc;font-size:11px;">${rataU ? angkaKeHuruf(Math.round(rataU)) : '-'}</td>
            <td style="border:1px solid #ccc;"></td>
            <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">-</td>
          </tr>
          <tr style="background:#e8e8e8;">
            <td colspan="2" style="padding:6px 8px;border:1px solid #ccc;font-weight:bold;font-size:11px;">RATA-RATA AKHIR</td>
            <td style="padding:6px 8px;border:1px solid #ccc;text-align:center;font-weight:bold;font-size:12px;">${rataAkhir ? rataAkhir.toFixed(1) : '-'}</td>
            <td style="padding:6px 8px;border:1px solid #ccc;font-size:11px;">${rataAkhir ? angkaKeHuruf(Math.round(rataAkhir)) : '-'}</td>
            <td style="border:1px solid #ccc;"></td>
            <td style="padding:6px 8px;border:1px solid #ccc;text-align:center;font-size:11px;">-</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:6px 8px;border:1px solid #ccc;font-weight:bold;font-size:11px;">PERINGKAT KELAS</td>
            <td colspan="4" style="padding:6px 8px;border:1px solid #ccc;font-size:11px;">
              <strong>${peringkat}</strong> dari ${totalSantri} santri
            </td>
          </tr>
        </tbody>
      </table>

      <table style="width:100%;font-size:11px;margin-bottom:10px;border-collapse:collapse;">
        <tr>
          <td style="width:34%;vertical-align:top;padding-right:8px;">
            <div style="border:1px solid #ccc;padding:6px;border-radius:4px;">
              <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid #eee;padding-bottom:3px;">Kepribadian</div>
              <table style="width:100%;">
                <tr><td style="padding:1px 0;">Akhlak</td><td>: <strong>${n.akhlak_kepribadian || 'B'}</strong></td></tr>
                <tr><td style="padding:1px 0;">Kebersihan</td><td>: <strong>${n.kebersihan || 'B'}</strong></td></tr>
                <tr><td style="padding:1px 0;">Ketertiban</td><td>: <strong>${n.ketertiban || 'B'}</strong></td></tr>
              </table>
            </div>
          </td>
          <td style="width:33%;vertical-align:top;padding-right:8px;">
            <div style="border:1px solid #ccc;padding:6px;border-radius:4px;">
              <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid #eee;padding-bottom:3px;">Ketidakhadiran</div>
              <table style="width:100%;">
                <tr><td style="padding:1px 0;">Sakit</td><td>: ${n.hadir_sakit || 0} hari</td></tr>
                <tr><td style="padding:1px 0;">Ijin</td><td>: ${n.hadir_izin || 0} hari</td></tr>
                <tr><td style="padding:1px 0;">Tanpa ijin</td><td>: ${n.hadir_alpha || 0} hari</td></tr>
              </table>
            </div>
          </td>
          <td style="width:33%;vertical-align:top;">
            <div style="border:1px solid #ccc;padding:6px;border-radius:4px;">
              <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid #eee;padding-bottom:3px;">Ekstrakurikuler</div>
              <table style="width:100%;">
                <tr><td style="padding:1px 0;">Renang</td><td>: ${n.ekskul_renang || 0}x</td></tr>
                <tr><td style="padding:1px 0;">Beladiri</td><td>: ${n.ekskul_beladiri || '-'}</td></tr>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <div style="margin-bottom:15px;">
        <div style="font-size:11px;font-weight:bold;margin-bottom:3px;">Catatan Wali Kelas:</div>
        <div style="border:1px solid #ccc;padding:6px;min-height:30px;font-size:11px;font-style:italic;border-radius:4px;">
          ${n.catatan || '&nbsp;'}
        </div>
      </div>

      <table style="width:100%;font-size:11px;margin-top:15px;">
        <tr>
          <td style="width:33%;text-align:center;vertical-align:top;">
            <div>Orang Tua / Wali</div>
            <div style="margin:35px 0 5px;"></div>
            <div style="border-top:1px solid #333;padding-top:3px;">(________________________)</div>
          </td>
          <td style="width:33%;text-align:center;vertical-align:top;">
            <div>Sukoharjo, ${tanggalRapot}</div>
            <div>Wali Kelas</div>
            <div style="margin:25px 0 5px;"></div>
            <div style="border-top:1px solid #333;padding-top:3px;"><strong>${guruNama}</strong></div>
          </td>
          <td style="width:33%;text-align:center;vertical-align:top;">
            <div>Mengetahui,</div>
            <div>Kepala Sekolah</div>
            <div style="margin:25px 0 5px;"></div>
            <div style="border-top:1px solid #333;padding-top:3px;"><strong>Ust. Idral Harist</strong></div>
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
    body { font-family: 'Times New Roman', serif; margin: 0; background: white; }
    @media print {
      body { margin: 0; }
      @page { margin: 1.5cm; size: A4; }
    }
  </style>
</head>
<body>
  ${santriList.map((s: any) => generateHalaman(s)).join('\n')}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 800);
    }
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  })
}