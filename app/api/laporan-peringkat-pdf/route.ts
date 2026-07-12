import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type TipeRanking = 'total' | 'konsistensi' | 'semangat'

type SantriRanking = {
  id: string
  nama: string
  kelas: string | null
  kelas_num: number | null
  jenjang: string | null
  jenis_kelas: string | null
  total_hafalan_juz: number | null
  surah_terakhir_nomor: number | null
}

type SetoranRanking = {
  santri_id: string
  tanggal: string
  jenis: string
  penambahan_juz: number | null
  status: string | null
}

type LiburAkademik = {
  tanggal_mulai: string
  tanggal_selesai: string
}

type StatsRanking = {
  hariSetorLama: Set<string>
  hariSetorBaru: Set<string>
  najihLama: number
  rosibLama: number
  najihBaru: number
  rosibBaru: number
  totalJuzBaru: number
  totalPoin: number
  totalPenambahanBaru: number
  kombinasiKonsistensi: Map<string, {
    jenis: 'lama' | 'baru'
    adaLancar: boolean
    penambahanBaruMaks: number
  }>
}

type BarisRanking = {
  peringkat: number
  nama: string
  nilai: string
  detail?: string
  rincianKonsistensi?: {
    mode: 'poin' | 'ulya'
    najihLama: number
    rosibLama: number
    najihBaru: number
    rosibBaru: number
    totalPoin: number
    poinMaksimal: number
    persentase: number
    totalPenambahanBaru: number
  }
}

function getWIBDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
}

function formatTanggal(date: Date) {
  const tahun = date.getFullYear()
  const bulan = String(date.getMonth() + 1).padStart(2, '0')
  const tanggal = String(date.getDate()).padStart(2, '0')
  return `${tahun}-${bulan}-${tanggal}`
}

function formatTanggalUTC(date: Date) {
  const tahun = date.getUTCFullYear()
  const bulan = String(date.getUTCMonth() + 1).padStart(2, '0')
  const tanggal = String(date.getUTCDate()).padStart(2, '0')
  return `${tahun}-${bulan}-${tanggal}`
}

function getPeriodePekanTertutup(saatIni = new Date()) {
  const bagianWIB = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(saatIni)
  const nilaiBagian = Object.fromEntries(
    bagianWIB.filter(bagian => bagian.type !== 'literal').map(bagian => [bagian.type, bagian.value])
  )
  const tahun = Number(nilaiBagian.year)
  const bulan = Number(nilaiBagian.month)
  const tanggal = Number(nilaiBagian.day)
  const jam = Number(nilaiBagian.hour)
  const tanggalWIB = new Date(Date.UTC(tahun, bulan - 1, tanggal))
  const nomorHari = tanggalWIB.getUTCDay()
  const jarakDariSenin = (nomorHari + 6) % 7
  const seninPekanBerjalan = new Date(tanggalWIB)
  seninPekanBerjalan.setUTCDate(seninPekanBerjalan.getUTCDate() - jarakDariSenin)

  const sabtuSudahDitutup = nomorHari === 6 && jam >= 17
  const gunakanPekanBerjalan = nomorHari === 0 || sabtuSudahDitutup
  const tanggalMulaiDate = new Date(seninPekanBerjalan)
  if (!gunakanPekanBerjalan) {
    tanggalMulaiDate.setUTCDate(tanggalMulaiDate.getUTCDate() - 7)
  }
  const tanggalSelesaiDate = new Date(tanggalMulaiDate)
  tanggalSelesaiDate.setUTCDate(tanggalSelesaiDate.getUTCDate() + 5)

  const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  const mulaiTanggal = tanggalMulaiDate.getUTCDate()
  const selesaiTanggal = tanggalSelesaiDate.getUTCDate()
  const mulaiBulan = tanggalMulaiDate.getUTCMonth()
  const selesaiBulan = tanggalSelesaiDate.getUTCMonth()
  const mulaiTahun = tanggalMulaiDate.getUTCFullYear()
  const selesaiTahun = tanggalSelesaiDate.getUTCFullYear()
  let labelPeriode: string

  if (mulaiBulan === selesaiBulan && mulaiTahun === selesaiTahun) {
    labelPeriode = `${mulaiTanggal}–${selesaiTanggal} ${namaBulan[selesaiBulan]} ${selesaiTahun}`
  } else if (mulaiTahun === selesaiTahun) {
    labelPeriode = `${mulaiTanggal} ${namaBulan[mulaiBulan]}–${selesaiTanggal} ${namaBulan[selesaiBulan]} ${selesaiTahun}`
  } else {
    labelPeriode = `${mulaiTanggal} ${namaBulan[mulaiBulan]} ${mulaiTahun}–${selesaiTanggal} ${namaBulan[selesaiBulan]} ${selesaiTahun}`
  }

  return {
    tanggalMulai: formatTanggalUTC(tanggalMulaiDate),
    tanggalSelesai: formatTanggalUTC(tanggalSelesaiDate),
    labelPeriode,
  }
}

function hitungHariAktif(mulai: string, selesai: string, daftarLibur: LiburAkademik[]) {
  const hariAktif: string[] = []
  const tanggalBerjalan = new Date(`${mulai}T00:00:00Z`)
  const tanggalSelesai = new Date(`${selesai}T00:00:00Z`)

  while (tanggalBerjalan <= tanggalSelesai) {
    const nomorHari = tanggalBerjalan.getUTCDay()
    const tanggal = tanggalBerjalan.toISOString().split('T')[0]
    const liburAkademik = daftarLibur.some(libur =>
      tanggal >= libur.tanggal_mulai && tanggal <= libur.tanggal_selesai
    )

    if (nomorHari !== 0 && nomorHari !== 5 && !liburAkademik) {
      hariAktif.push(tanggal)
    }

    tanggalBerjalan.setUTCDate(tanggalBerjalan.getUTCDate() + 1)
  }

  return hariAktif
}

function statsKosong(): StatsRanking {
  return {
    hariSetorLama: new Set(),
    hariSetorBaru: new Set(),
    najihLama: 0,
    rosibLama: 0,
    najihBaru: 0,
    rosibBaru: 0,
    totalJuzBaru: 0,
    totalPoin: 0,
    totalPenambahanBaru: 0,
    kombinasiKonsistensi: new Map(),
  }
}

function normalisasiPenambahan(value: unknown) {
  const angka = Number(value)
  return Number.isFinite(angka) ? angka : 0
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jenjang = searchParams.get('jenjang') || 'ula'
  const jenisKelas = searchParams.get('jenis_kelas') || 'banin'
  const topNParam = parseInt(searchParams.get('top') || '3')
  const topN = Number.isFinite(topNParam) && topNParam > 0 ? topNParam : 3
  const tipeParam = searchParams.get('tipe') || 'total'

  if (!['total', 'konsistensi', 'semangat'].includes(tipeParam)) {
    return NextResponse.json({ error: 'Tipe ranking tidak valid' }, { status: 400 })
  }

  const tipe = tipeParam as TipeRanking

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

  const { data: santriData } = await query
  const santriAll = (santriData || []) as SantriRanking[]

  if (santriAll.length === 0) {
    return NextResponse.json({ error: 'Tidak ada data santri' }, { status: 404 })
  }

  const statsPerSantri: Record<string, StatsRanking> = {}
  let totalHariAktif = 0
  let labelPeriode = ''
  const hariIniWIB = getWIBDate()

  if (tipe !== 'total') {
    let tanggalMulai: string
    let tanggalSelesai: string

    if (tipe === 'konsistensi') {
      const periode = getPeriodePekanTertutup()
      tanggalMulai = periode.tanggalMulai
      tanggalSelesai = periode.tanggalSelesai
      labelPeriode = periode.labelPeriode
    } else {
      const tujuhHariLaluWIB = new Date(hariIniWIB)
      tujuhHariLaluWIB.setDate(tujuhHariLaluWIB.getDate() - 7)
      tanggalMulai = formatTanggal(tujuhHariLaluWIB)
      tanggalSelesai = formatTanggal(hariIniWIB)
    }
    const santriIds = santriAll.map(santri => santri.id)

    const [{ data: setoranData }, { data: liburData }] = await Promise.all([
      supabase
        .from('setoran')
        .select('santri_id, tanggal, jenis, penambahan_juz, status')
        .in('santri_id', santriIds)
        .gte('tanggal', tanggalMulai)
        .lte('tanggal', tanggalSelesai)
        .eq('status_kehadiran', 'hadir'),
      supabase
        .from('kalender_akademik')
        .select('tanggal_mulai, tanggal_selesai')
        .eq('tipe', 'libur'),
    ])

    const setoranList = (setoranData || []) as SetoranRanking[]
    const liburAkademik = (liburData || []) as LiburAkademik[]
    const hariAktif = hitungHariAktif(tanggalMulai, tanggalSelesai, liburAkademik)
    const hariAktifSet = new Set(hariAktif)
    totalHariAktif = hariAktif.length

    setoranList.forEach(setoran => {
      if (!statsPerSantri[setoran.santri_id]) {
        statsPerSantri[setoran.santri_id] = statsKosong()
      }
      const stats = statsPerSantri[setoran.santri_id]

      if (tipe === 'konsistensi') {
        if (!hariAktifSet.has(setoran.tanggal)) return

        if (setoran.jenis !== 'lama' && setoran.jenis !== 'baru') return
        if (jenjang === 'ulya' && setoran.jenis === 'baru') return

        const jenis = setoran.jenis
        const kunciKombinasi = `${setoran.tanggal}:${jenis}`
        const kombinasi = stats.kombinasiKonsistensi.get(kunciKombinasi) || {
          jenis,
          adaLancar: false,
          penambahanBaruMaks: 0,
        }

        if (jenis === 'lama') stats.hariSetorLama.add(setoran.tanggal)
        if (jenis === 'baru') stats.hariSetorBaru.add(setoran.tanggal)
        if (setoran.status === 'lancar') {
          kombinasi.adaLancar = true
          if (jenis === 'lama') stats.najihLama++
          if (jenis === 'baru') stats.najihBaru++
        }
        if (setoran.status === 'rosib') {
          if (jenis === 'lama') stats.rosibLama++
          if (jenis === 'baru') stats.rosibBaru++
        }

        if (jenis === 'baru' && setoran.status === 'lancar') {
          kombinasi.penambahanBaruMaks = Math.max(
            kombinasi.penambahanBaruMaks,
            normalisasiPenambahan(setoran.penambahan_juz)
          )
        }

        stats.kombinasiKonsistensi.set(kunciKombinasi, kombinasi)
      } else if (setoran.jenis === 'baru') {
        stats.totalJuzBaru += setoran.penambahan_juz || 0
        if (hariAktifSet.has(setoran.tanggal)) stats.hariSetorBaru.add(setoran.tanggal)
        if (setoran.status === 'lancar') stats.najihBaru++
      }
    })

    if (tipe === 'konsistensi') {
      Object.values(statsPerSantri).forEach(stats => {
        stats.kombinasiKonsistensi.forEach(kombinasi => {
          if (kombinasi.adaLancar) {
            stats.totalPoin++
            if (kombinasi.jenis === 'baru') {
              stats.totalPenambahanBaru += kombinasi.penambahanBaruMaks
            }
          }
        })
      })
    }
  }

  // Kelompokkan per kelas dan ambil top N
  const kelasMap: Record<number, SantriRanking[]> = {}
  santriAll.forEach(s => {
    const k = s.kelas_num || 0
    if (!kelasMap[k]) kelasMap[k] = []
    kelasMap[k].push(s)
  })

  const getStats = (santriId: string) => statsPerSantri[santriId] || statsKosong()

  const urutkanRanking = (a: SantriRanking, b: SantriRanking) => {
    if (tipe === 'total') {
      const selisihTotal = (b.total_hafalan_juz || 0) - (a.total_hafalan_juz || 0)
      return selisihTotal || a.nama.localeCompare(b.nama, 'id')
    }

    const statsA = getStats(a.id)
    const statsB = getStats(b.id)

    if (tipe === 'konsistensi') {
      if (jenjang === 'ulya') {
        if (statsB.totalPoin !== statsA.totalPoin) return statsB.totalPoin - statsA.totalPoin
      } else {
        if (statsB.totalPoin !== statsA.totalPoin) return statsB.totalPoin - statsA.totalPoin
        if (statsB.totalPenambahanBaru !== statsA.totalPenambahanBaru) {
          return statsB.totalPenambahanBaru - statsA.totalPenambahanBaru
        }
      }
      return a.nama.localeCompare(b.nama, 'id') || a.id.localeCompare(b.id)
    }

    if (statsB.totalJuzBaru !== statsA.totalJuzBaru) {
      return statsB.totalJuzBaru - statsA.totalJuzBaru
    }
    if (statsB.hariSetorBaru.size !== statsA.hariSetorBaru.size) {
      return statsB.hariSetorBaru.size - statsA.hariSetorBaru.size
    }
    if (statsB.najihBaru !== statsA.najihBaru) return statsB.najihBaru - statsA.najihBaru
    return a.nama.localeCompare(b.nama, 'id')
  }

  const buatBarisRanking = (santri: SantriRanking, index: number): BarisRanking => {
    if (tipe === 'total') {
      return {
        peringkat: index + 1,
        nama: santri.nama,
        nilai: `${(santri.total_hafalan_juz || 0).toFixed(2)} Juz`,
      }
    }

    const stats = getStats(santri.id)

    if (tipe === 'konsistensi') {
      const isUlya = jenjang === 'ulya'
      const poinMaksimal = isUlya ? totalHariAktif : totalHariAktif * 2
      const nilaiKonsistensi = stats.totalPoin
      const persentase = poinMaksimal > 0
        ? Math.round((nilaiKonsistensi / poinMaksimal) * 100)
        : 0
      return {
        peringkat: index + 1,
        nama: santri.nama,
        nilai: isUlya ? `${persentase}%` : `${stats.totalPoin} poin`,
        detail: isUlya
          ? `${stats.totalPoin}/${totalHariAktif} hari aktif`
          : `${stats.totalPoin} dari ${poinMaksimal} poin maksimal`,
        rincianKonsistensi: {
          mode: isUlya ? 'ulya' : 'poin',
          najihLama: stats.najihLama,
          rosibLama: stats.rosibLama,
          najihBaru: stats.najihBaru,
          rosibBaru: stats.rosibBaru,
          totalPoin: stats.totalPoin,
          poinMaksimal,
          persentase,
          totalPenambahanBaru: stats.totalPenambahanBaru,
        },
      }
    }

    return {
      peringkat: index + 1,
      nama: santri.nama,
      nilai: `${stats.totalJuzBaru.toFixed(3)} Juz`,
      detail: `±${(stats.totalJuzBaru * 20).toFixed(1)} halaman`,
    }
  }

  // Urutkan per kelas sesuai tipe ranking, lalu ambil top N
  const kelasList = Object.keys(kelasMap)
    .map(Number)
    .sort((a, b) => a - b)

  const dataPerKelas = kelasList.map(k => {
    const sorted = kelasMap[k].sort(urutkanRanking)
    return {
      kelas: k,
      label: santriAll.find(s => s.kelas_num === k)?.kelas || `Kelas ${k}`,
      top: sorted.slice(0, topN).map(buatBarisRanking),
    }
  })

  // Label
  const jenjangLabel: Record<string, string> = { ula: 'Ula', wustha: 'Wustha', ulya: 'Ulya' }
  const jenisLabel: Record<string, string> = { banin: 'Banin', banat: 'Banat', tn: 'Takhassus (TN)' }
  const judulRanking: Record<TipeRanking, string> = {
    total: 'Peringkat Total Hafalan',
    konsistensi: 'Peringkat Konsistensi Setor',
    semangat: 'Peringkat Semangat Hafalan',
  }
  const tanggal = hariIniWIB.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

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
                ${tipe === 'konsistensi' && santri.rincianKonsistensi ? `
                  <div style="font-size:8pt;font-weight:700;color:#2563a8;margin-top:1px;">${santri.nilai}</div>
                  <div style="display:grid;grid-template-columns:${santri.rincianKonsistensi.mode === 'ulya' ? '1fr' : '1fr 1fr'};gap:3px;margin-top:2px;">
                    <div style="background:#f8fafc;border-radius:4px;padding:3px;line-height:1.25;">
                      <div style="font-size:6.5pt;font-weight:700;color:#475569;white-space:nowrap;">Setoran Lama</div>
                      <div style="font-size:6.5pt;color:#15803d;white-space:nowrap;">Najih: ${santri.rincianKonsistensi.najihLama} kali</div>
                      <div style="font-size:6.5pt;color:#b91c1c;white-space:nowrap;">Rosib: ${santri.rincianKonsistensi.rosibLama} kali</div>
                    </div>
                    ${santri.rincianKonsistensi.mode === 'poin' ? `<div style="background:#f8fafc;border-radius:4px;padding:3px;line-height:1.25;">
                      <div style="font-size:6.5pt;font-weight:700;color:#475569;white-space:nowrap;">Hafalan Baru</div>
                      <div style="font-size:6.5pt;color:#15803d;white-space:nowrap;">Najih: ${santri.rincianKonsistensi.najihBaru} kali</div>
                      <div style="font-size:6.5pt;color:#b91c1c;white-space:nowrap;">Rosib: ${santri.rincianKonsistensi.rosibBaru} kali</div>
                    </div>` : ''}
                  </div>
                  <div style="font-size:6.5pt;color:#94a3b8;margin-top:2px;">${santri.detail || ''}${santri.rincianKonsistensi.mode === 'poin' ? ` &nbsp;&bull;&nbsp; ${santri.rincianKonsistensi.persentase}%` : ''}</div>
                  ${santri.rincianKonsistensi.mode === 'poin' ? `<div style="font-size:6.5pt;color:#64748b;margin-top:1px;">Penambahan baru: ${santri.rincianKonsistensi.totalPenambahanBaru.toFixed(3)} Juz</div>` : ''}
                ` : `
                  <div style="font-size:8pt;color:#64748b;">${santri.nilai}</div>
                  ${santri.detail ? `<div style="font-size:7.5pt;color:#94a3b8;">${santri.detail}</div>` : ''}
                `}
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
  <title>${judulRanking[tipe]} ${jenjangLabel[jenjang] || jenjang} ${jenisLabel[jenisKelas] || jenisKelas}</title>
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
    <div style="font-size:11pt;font-weight:bold;margin-top:2px;">${judulRanking[tipe].toUpperCase()}</div>
    <div style="font-size:10pt;color:#475569;margin-top:2px;">
      Jenjang ${jenjangLabel[jenjang] || jenjang} ${jenisLabel[jenisKelas] || jenisKelas} &nbsp;•&nbsp; Peringkat 1–${topN} Per Kelas
    </div>
    <div style="font-size:9pt;color:#94a3b8;margin-top:2px;">${tipe === 'konsistensi' ? `Periode: ${labelPeriode}` : `Per tanggal: ${tanggal}`}</div>
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
      'Content-Disposition': `inline; filename="Peringkat_${jenjangLabel[jenjang] || jenjang}_${jenisLabel[jenisKelas] || jenisKelas}.html"`,
    },
  })
}
