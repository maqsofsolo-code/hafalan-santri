import { createHash, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { kirimPushKeUser } from '../../lib/sendPush'

const JENIS_WHATSAPP = new Set([
  'reminder-guru-subuh',
  'reminder-guru-pagi',
  'reminder-guru-siang',
  'reminder-guru-sore',
  'notif-wali',
  'notif-naik-peringkat',
  'notif-wali-kelas',
])

const JENIS_PUSH = new Set([
  'notif-wali-push',
  'reminder-guru-push-subuh',
  'reminder-guru-push-pagi',
  'reminder-guru-push-siang',
  'reminder-guru-push-sore',
])

const BATAS_PREVIEW_DRY_RUN = 20

function whatsappAktif() {
  return process.env.WHATSAPP_ENABLED === 'true'
}

function whatsappDryRunAktif() {
  return process.env.WHATSAPP_DRY_RUN !== 'false'
}

function getJenisWhatsappDiizinkan() {
  const konfigurasi = process.env.WHATSAPP_ALLOWED_TYPES
  const jenisDikonfigurasi = konfigurasi === undefined
    ? ['notif-wali']
    : konfigurasi.split(',').map(jenis => jenis.trim()).filter(Boolean)

  return new Set<string>(jenisDikonfigurasi.filter(jenis => jenis === 'notif-wali'))
}

function logPenolakan(jenis: string, kanal: 'whatsapp' | 'push' | 'tidak-dikenal', alasan: string) {
  console.warn('Request notifikasi ditolak', {
    jenis,
    kanal,
    alasan,
    timestamp: new Date().toISOString(),
  })
}

function samarkanId(id: unknown) {
  const nilai = String(id || '')
  if (!nilai) return '-'
  if (nilai.length <= 8) return `${nilai.slice(0, 2)}***`
  return `${nilai.slice(0, 4)}...${nilai.slice(-4)}`
}

function samarkanNomor(nomor: unknown) {
  const nilai = String(nomor || '')
  if (nilai.length <= 5) return '*'.repeat(nilai.length)
  return `${nilai.slice(0, 2)}******${nilai.slice(-3)}`
}

function secretSama(secretDiterima: string, secretDiharapkan: string) {
  const hashDiterima = createHash('sha256').update(secretDiterima).digest()
  const hashDiharapkan = createHash('sha256').update(secretDiharapkan).digest()
  return timingSafeEqual(hashDiterima, hashDiharapkan)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function kirimWA(nomor: string, pesan: string) {
  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': process.env.FONNTE_TOKEN!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: nomor,
        message: pesan,
        countryCode: '62'
      })
    })
    return response.json()
  } catch {
    return { status: false }
  }
}

function getWIBDate() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getHariWIB() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })).getDay()
}

function formatTanggalUTC(date: Date) {
  const tahun = date.getUTCFullYear()
  const bulan = String(date.getUTCMonth() + 1).padStart(2, '0')
  const tanggal = String(date.getUTCDate()).padStart(2, '0')
  return `${tahun}-${bulan}-${tanggal}`
}

function getDuaPekanTertutup(saatIni = new Date()) {
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
  const tanggalWIB = new Date(Date.UTC(
    Number(nilaiBagian.year),
    Number(nilaiBagian.month) - 1,
    Number(nilaiBagian.day)
  ))
  const nomorHari = tanggalWIB.getUTCDay()
  const jarakDariSenin = (nomorHari + 6) % 7
  const seninPekanBerjalan = new Date(tanggalWIB)
  seninPekanBerjalan.setUTCDate(seninPekanBerjalan.getUTCDate() - jarakDariSenin)

  const sabtuSudahDitutup = nomorHari === 6 && Number(nilaiBagian.hour) >= 17
  const gunakanPekanBerjalan = nomorHari === 0 || sabtuSudahDitutup
  const mulaiTerbaru = new Date(seninPekanBerjalan)
  if (!gunakanPekanBerjalan) mulaiTerbaru.setUTCDate(mulaiTerbaru.getUTCDate() - 7)
  const selesaiTerbaru = new Date(mulaiTerbaru)
  selesaiTerbaru.setUTCDate(selesaiTerbaru.getUTCDate() + 5)

  const mulaiSebelumnya = new Date(mulaiTerbaru)
  mulaiSebelumnya.setUTCDate(mulaiSebelumnya.getUTCDate() - 7)
  const selesaiSebelumnya = new Date(mulaiSebelumnya)
  selesaiSebelumnya.setUTCDate(selesaiSebelumnya.getUTCDate() + 5)

  return {
    terbaru: {
      tanggalMulai: formatTanggalUTC(mulaiTerbaru),
      tanggalSelesai: formatTanggalUTC(selesaiTerbaru),
    },
    sebelumnya: {
      tanggalMulai: formatTanggalUTC(mulaiSebelumnya),
      tanggalSelesai: formatTanggalUTC(selesaiSebelumnya),
    },
  }
}

function formatTanggal(tgl: string) {
  return new Date(tgl + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

async function cekLibur(today: string) {
  const hariMinggu = getHariWIB()
  if (hariMinggu === 0 || hariMinggu === 5) return true
  const { data } = await supabase
    .from('kalender_akademik').select('*')
    .lte('tanggal_mulai', today).gte('tanggal_selesai', today)
    .eq('tipe', 'libur').maybeSingle()
  return !!data
}

const FOOTER = `_Pondok Pesantren Daarus Salaf Sukoharjo_\n\n_Nomor ini adalah nomor digitalisasi ma'had. Untuk informasi lebih lanjut seputar perkembangan ananda, silakan menghubungi wali kelas masing-masing._`

// ===== NOTIF WALI SANTRI (jam 17.00 WIB) - LAPORAN HARIAN =====
async function notifWali(dryRun = false) {
  const today = getWIBDate()
  const tanggalFormatted = formatTanggal(today)
  const ringkasanDryRun = {
    success: true,
    mode: 'dry-run',
    jenis: 'notif-wali',
    tanggal: today,
    jumlahSantriDiproses: 0,
    jumlahEligible: 0,
    jumlahDilewati: 0,
    alasanDilewati: {
      nomorKosong: 0,
      tanpaDataSetoran: 0,
      santriTidakAktif: 0,
      alasanLain: 0,
    },
    preview: [] as Array<{
      santriId: string
      nomor: string
      panjangPesan: number
      ringkasan: {
        adaStatusKehadiran: boolean
        adaSetoranLama: boolean
        adaHafalanBaru: boolean
        adaCatatan: boolean
      }
    }>,
    timestamp: '',
  }
  const hasilDryRun = () => ({
    ...ringkasanDryRun,
    timestamp: new Date().toISOString(),
  })

  if (await cekLibur(today)) return dryRun ? hasilDryRun() : { message: 'Hari libur' }

  const { data: santriList } = await supabase
    .from('santri').select('*, wali:wali_id(nama, no_wa)')
  if (!santriList) return dryRun ? hasilDryRun() : { message: 'Tidak ada santri' }

  if (dryRun) ringkasanDryRun.jumlahSantriDiproses = santriList.length

  const { data: setoranHariIni } = await supabase
    .from('setoran').select('*').eq('tanggal', today)

  let terkirim = 0, gagal = 0

  for (const santri of santriList) {
    const noWali = santri.wali?.no_wa
    if (!noWali) {
      if (dryRun) {
        ringkasanDryRun.jumlahDilewati++
        ringkasanDryRun.alasanDilewati.nomorKosong++
      }
      continue
    }

    const jenjang = santri.jenjang
    const setoranSantri = (setoranHariIni || []).filter((s: any) => s.santri_id === santri.id)
    const namaSantri = santri.nama
    const namaWali = santri.wali?.nama || 'Wali Santri'

    // Cek status ketidakhadiran (ambil dari entry manapun yang statusnya bukan hadir)
    const entryTidakHadir = setoranSantri.find((s: any) =>
      s.status_kehadiran && s.status_kehadiran !== 'hadir' && s.status_kehadiran !== 'hadir_tidak_setor'
    )

    let pesan = ''

    // ===== 1. SAKIT =====
    if (entryTidakHadir?.status_kehadiran === 'sakit') {
      pesan = `Bismillahirrahmanirrahim\n\nYkh. ${namaWali} (Wali dari *${namaSantri}*)\n\n📅 *${tanggalFormatted}*\n\nKami informasikan bahwa hari ini *${namaSantri}* tidak dapat hadir karena *sakit*.\n\nSemoga Allah segera memberikan kesembuhan kepada ananda.\n\nاللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَاسَ وَاشْفِ أَنْتَ الشَّافِي لَا شِفَاءَ إِلَّا شِفَاؤُكَ شِفَاءً لَا يُغَادِرُ سَقَمَاً\n\n_"Ya Allah, Tuhan manusia, hilangkanlah penyakit dan sembuhkanlah, Engkaulah Yang Maha Menyembuhkan, tidak ada kesembuhan kecuali dari-Mu."_\n\nJazakumullahu khairan.\n${FOOTER}`
    }

    // ===== 2. IZIN =====
    else if (entryTidakHadir?.status_kehadiran === 'izin') {
      pesan = `Bismillahirrahmanirrahim\n\nYkh. ${namaWali} (Wali dari *${namaSantri}*)\n\n📅 *${tanggalFormatted}*\n\nKami informasikan bahwa hari ini *${namaSantri}* tidak hadir karena *izin*.\n\nKami berpesan agar ananda tetap dimotivasi untuk *murojaah hafalannya di rumah*, karena hafalan yang kuat adalah hafalan yang senantiasa diulang.\n\n_"Jagalah hafalan Al-Qur'an ini, demi Allah, hafalan ini lebih mudah lepas dari hati daripada lepasnya unta dari ikatannya."_ (HR. Bukhari)\n\nJazakumullahu khairan.\n${FOOTER}`
    }

    // ===== 3. ALPHA =====
    else if (entryTidakHadir?.status_kehadiran === 'alpha') {
      pesan = `Bismillahirrahmanirrahim\n\nYkh. ${namaWali} (Wali dari *${namaSantri}*)\n\n📅 *${tanggalFormatted}*\n\nKami informasikan bahwa hari ini *${namaSantri}* *tidak hadir tanpa keterangan (alpha)*.\n\nMohon Bapak/Ibu dapat menghubungi wali kelas ananda untuk memberikan keterangan.\n\nJazakumullahu khairan.\n${FOOTER}`
    }

    // ===== 4. LAPORAN HARIAN LENGKAP =====
    else {
      // Jika sama sekali tidak ada entry apapun hari itu, skip (tidak kirim notif)
      if (setoranSantri.length === 0) {
        if (dryRun) {
          ringkasanDryRun.jumlahDilewati++
          ringkasanDryRun.alasanDilewati.tanpaDataSetoran++
        }
        continue
      }

      const setoranBaru = setoranSantri.find((s: any) => s.jenis === 'baru')
      const setoranLama = setoranSantri.find((s: any) => s.jenis === 'lama')
      const adaEntryHadirTidakSetor = setoranSantri.some((s: any) => s.status_kehadiran === 'hadir_tidak_setor')

      let bagianHafalan = ''
      let adaRosib = false
      let adaNajih = false
      let adaTidakSetor = false
      const semuaCatatan: string[] = []

      // ----- BAGIAN HAFALAN BARU (skip total untuk Ulya) -----
      if (jenjang !== 'ulya') {
        if (setoranBaru) {
          const statusLabel = setoranBaru.status === 'lancar' ? '✅ Najih (Lancar)' : '🔁 Rosib (Perlu Diulang)'
          if (setoranBaru.status === 'lancar') adaNajih = true
          else adaRosib = true
          bagianHafalan += `\n📖 *Hafalan Baru:*\nSurah ${setoranBaru.surah || '-'} ayat ${setoranBaru.ayat_mulai}-${setoranBaru.ayat_selesai}\nStatus: ${statusLabel}\n`
          if (setoranBaru.catatan) semuaCatatan.push(`Hafalan Baru: ${setoranBaru.catatan}`)
        } else if (jenjang === 'ula' && setoranLama?.status === 'rosib') {
          // Khusus Ula: hafalan baru ditiadakan karena murojaah rosib
          bagianHafalan += `\n📖 *Hafalan Baru:*\nDitiadakan karena murojaah ananda rosib\n`
        } else {
          // Tidak ada entry sama sekali — santri tidak setor
          adaTidakSetor = true
          bagianHafalan += `\n📖 *Hafalan Baru:*\nTidak disetorkan\n`
        }
      }

      // ----- BAGIAN MUROJAAH (HAFALAN LAMA) -----
      if (setoranLama) {
        const statusLabel = setoranLama.status === 'lancar' ? '✅ Najih (Lancar)' : '🔁 Rosib (Perlu Diulang)'
        if (setoranLama.status === 'lancar') adaNajih = true
        else adaRosib = true
        bagianHafalan += `\n📗 *Murojaah (Hafalan Lama):*\nSurah ${setoranLama.surah || '-'} ayat ${setoranLama.ayat_mulai}-${setoranLama.ayat_selesai}\nStatus: ${statusLabel}\n`
        if (setoranLama.catatan) semuaCatatan.push(`Murojaah: ${setoranLama.catatan}`)
      } else {
        adaTidakSetor = true
        bagianHafalan += `\n📗 *Murojaah (Hafalan Lama):*\nTidak disetorkan\n`
      }

      // Catatan tambahan dari entry hadir_tidak_setor (kalau ada)
      const entryHTS = setoranSantri.find((s: any) => s.status_kehadiran === 'hadir_tidak_setor')
      if (entryHTS?.catatan) semuaCatatan.push(`Catatan: ${entryHTS.catatan}`)

      const catatanGabungan = semuaCatatan.length > 0 ? semuaCatatan.join('\n') : 'Tidak ada catatan'

      // ----- KALIMAT PENUTUP -----
      let penutup = ''
      if (adaTidakSetor) {
        penutup = `Kami mohon perhatian khusus dari Bapak/Ibu. Kedisiplinan dalam menjaga hafalan Al-Qur'an sangatlah penting, terlebih ananda tinggal di asrama dan jauh dari pengawasan langsung Bapak/Ibu. Mohon kiranya dapat memberikan motivasi dan nasihat kepada ananda agar lebih disiplin dan bersungguh-sungguh dalam menjaga hafalannya esok hari.\n\n_"Sesungguhnya Allah mencintai pekerjaan yang apabila dikerjakan dilakukan secara itqan (sungguh-sungguh)."_ (HR. Thabrani)`
      } else if (adaRosib) {
        penutup = `Mohon bantu ananda untuk *muroja'ah di rumah* agar hafalan semakin kuat dan lancar. Berikan semangat dan motivasi agar ananda lebih giat dalam menghafal Al-Qur'an. Ini adalah hal yang wajar dalam proses menghafal, semoga Allah memudahkan ananda.`
      } else if (adaNajih) {
        penutup = `Alhamdulillah, seluruh setoran ananda hari ini *najih (lancar)*. Segala puji bagi Allah atas pertolongan-Nya. Sesungguhnya kemudahan dalam menghafal Al-Qur'an adalah murni karunia dan pertolongan dari Allah Ta'ala semata. Semoga Allah terus meneguhkan hati ananda di atas hafalan-Nya.`
      }

      pesan = `Bismillahirrahmanirrahim\n\nYkh. ${namaWali} (Wali dari *${namaSantri}*)\n\n📅 *${tanggalFormatted}*\n🕔 Laporan Hafalan Harian\n\n━━━━━━━━━━━━━━━${bagianHafalan}━━━━━━━━━━━━━━━\n\n📝 *Catatan Guru:*\n${catatanGabungan}\n\n${penutup}\n\nJazakumullahu khairan.\n${FOOTER}`
    }

    if (pesan) {
      if (dryRun) {
        ringkasanDryRun.jumlahEligible++
        if (ringkasanDryRun.preview.length < BATAS_PREVIEW_DRY_RUN) {
          ringkasanDryRun.preview.push({
            santriId: samarkanId(santri.id),
            nomor: samarkanNomor(noWali),
            panjangPesan: pesan.length,
            ringkasan: {
              adaStatusKehadiran: setoranSantri.some(setoran => Boolean(setoran.status_kehadiran)),
              adaSetoranLama: setoranSantri.some(setoran => setoran.jenis === 'lama'),
              adaHafalanBaru: jenjang !== 'ulya' && setoranSantri.some(setoran => setoran.jenis === 'baru'),
              adaCatatan: setoranSantri.some(setoran => Boolean(setoran.catatan)),
            },
          })
        }
        continue
      }

      const hasil = await kirimWA(noWali, pesan)
      if (hasil.status) terkirim++
      else gagal++
    } else if (dryRun) {
      ringkasanDryRun.jumlahDilewati++
      ringkasanDryRun.alasanDilewati.alasanLain++
    }
  }

  if (dryRun) return hasilDryRun()
  return { message: `Notif wali (laporan harian) selesai. Terkirim: ${terkirim}, Gagal: ${gagal}` }
}

// ===== NOTIF WALI via PUSH PWA (jam 15.00 WIB) =====
async function notifWaliPush() {
  const today = getWIBDate()
  if (await cekLibur(today)) return { message: 'Hari libur' }

  const { data: santriList } = await supabase
    .from('santri').select('id, nama, jenjang, wali_id')
  if (!santriList) return { message: 'Tidak ada santri' }

  const { data: setoranHariIni } = await supabase
    .from('setoran').select('*').eq('tanggal', today)

  let terkirim = 0, gagal = 0, dilewati = 0

  for (const santri of santriList) {
    if (!santri.wali_id) { dilewati++; continue }

    const setoranSantri = (setoranHariIni || []).filter((s: any) => s.santri_id === santri.id)
    if (setoranSantri.length === 0) { dilewati++; continue }

    const namaSantri = santri.nama
    const adaHadir = setoranSantri.some((s: any) => s.status_kehadiran === 'hadir')
    const adaHadirTidakSetor = setoranSantri.some((s: any) => s.status_kehadiran === 'hadir_tidak_setor')
    const entryTidakHadir = setoranSantri.find((s: any) => ['sakit', 'izin', 'alpha'].includes(s.status_kehadiran))

    // Tentukan judul + isi notif sesuai keadaan
    let title = '🔔 Laporan Hafalan Daarus Salaf'
    let body = ''

    if (adaHadir) {
      const adaRosib = setoranSantri.some((s: any) => s.status_kehadiran === 'hadir' && s.status === 'rosib')
      if (adaRosib) {
        body = `Laporan hafalan ${namaSantri} hari ini sudah tersedia. Ketuk untuk melihat detailnya.`
      } else {
        body = `Alhamdulillah, laporan hafalan ${namaSantri} hari ini sudah tersedia. Ketuk untuk melihat.`
      }
    } else if (adaHadirTidakSetor) {
      body = `${namaSantri} hari ini hadir namun belum menyetorkan hafalan. Ketuk untuk detail.`
    } else if (entryTidakHadir) {
      const a = entryTidakHadir.status_kehadiran
      const label = a === 'sakit' ? 'sakit' : a === 'izin' ? 'izin' : 'tidak hadir'
      body = `${namaSantri} tercatat ${label} hari ini. Ketuk untuk detail.`
    } else {
      dilewati++
      continue
    }

    const hasil = await kirimPushKeUser(santri.wali_id, {
      title,
      body,
      url: '/wali',
      tag: `laporan-${santri.id}`,
    })
    terkirim += hasil.terkirim
    gagal += hasil.gagal
  }

  return { message: `Notif wali (push) selesai. Terkirim: ${terkirim}, Gagal: ${gagal}, Dilewati: ${dilewati}` }
}

// ===== REMINDER GURU =====
async function reminderGuru(sesi: string) {
  const today = getWIBDate()
  const tanggalFormatted = formatTanggal(today)
  if (await cekLibur(today)) return { message: 'Hari libur' }

  const { data: guruList } = await supabase
    .from('profiles').select('*').eq('role', 'guru')
  if (!guruList) return { message: 'Tidak ada guru' }

  const { data: semuaSantri } = await supabase
    .from('santri').select('guru_id, jenjang')
  const guruJenjangMap: Record<string, Set<string>> = {}
  ;(semuaSantri || []).forEach((s: any) => {
    if (!s.guru_id) return
    if (!guruJenjangMap[s.guru_id]) guruJenjangMap[s.guru_id] = new Set()
    guruJenjangMap[s.guru_id].add(s.jenjang)
  })

  const { data: absensiHariIni } = await supabase
    .from('absensi_guru').select('*').eq('tanggal', today)

  const { data: setoranHariIni } = await supabase
    .from('setoran').select('guru_id').eq('tanggal', today)
  const guruSudahInput = [...new Set((setoranHariIni || []).map((s: any) => s.guru_id))]

  const pesanPerSesi: Record<string, string> = {
    subuh: `Bismillahirrahmanirrahim\n\nYkh. Ustadz/Ustadzah yang mulia,\n\n📅 *${tanggalFormatted}*\n\nKami mengingatkan bahwa *sesi setoran Subuh* akan segera dimulai pukul *04.30*.\n\nMohon segera bersiap dan jangan lupa *input data hafalan santri* setelah sesi selesai.\n\nBaarakallahu fiikum.\n${FOOTER}`,

    pagi: `Bismillahirrahmanirrahim\n\nYkh. Ustadz/Ustadzah yang mulia,\n\n📅 *${tanggalFormatted}*\n\nKami mengingatkan bahwa *sesi setoran Pagi* akan segera dimulai.\n\nJenjang Ula: Hafalan Lama pukul *08.00 - 09.00*, Hafalan Baru pukul *09.00 - 10.00*\nJenjang Wustha: Murojaah pukul *08.00 - 09.45*\n\nMohon segera bersiap dan jangan lupa *input data hafalan santri* setelah sesi selesai.\n\nBaarakallahu fiikum.\n${FOOTER}`,

    siang: `Bismillahirrahmanirrahim\n\nYkh. Ustadz/Ustadzah yang mulia,\n\n📅 *${tanggalFormatted}*\n\nIni adalah *pengingat siang* pukul 12.00. Mohon pastikan data hafalan santri sesi pagi sudah *diinput ke sistem*.\n\nJazakumullahu khairan.\n${FOOTER}`,

    sore: `Bismillahirrahmanirrahim\n\nYkh. Ustadz/Ustadzah yang mulia,\n\n📅 *${tanggalFormatted}*\n\nIni adalah *pengingat sore* pukul 15.00. Mohon pastikan semua data hafalan santri hari ini sudah *diinput ke sistem* sebelum pukul 17.00.\n\nJazakumullahu khairan.\n${FOOTER}`
  }

  let terkirim = 0, gagal = 0

  for (const guru of guruList) {
    if (!guru.no_wa) continue

    const jenjangGuru = guruJenjangMap[guru.id] || new Set()
    const sudahAbsenSubuh = (absensiHariIni || []).some((a: any) => a.guru_id === guru.id && a.sesi === 'subuh')
    const sudahAbsenPagi = (absensiHariIni || []).some((a: any) => a.guru_id === guru.id && a.sesi === 'pagi')
    const sudahInput = guruSudahInput.includes(guru.id)

    if (sesi === 'subuh') {
      const ajarWusthaUlya = jenjangGuru.has('wustha') || jenjangGuru.has('ulya')
      if (!ajarWusthaUlya) continue
      if (sudahAbsenSubuh) continue
    } else if (sesi === 'pagi') {
      if (sudahAbsenPagi) continue
    } else if (sesi === 'siang') {
      if (sudahInput) continue
    } else if (sesi === 'sore') {
      if (sudahInput) continue
    }

    const pesan = pesanPerSesi[sesi]
    if (!pesan) continue

    const hasil = await kirimWA(guru.no_wa, pesan)
    if (hasil.status) terkirim++
    else gagal++
  }

  return { message: `Reminder guru ${sesi} selesai. Terkirim: ${terkirim}, Gagal: ${gagal}` }
}

// ===== REMINDER GURU via PUSH PWA =====
async function reminderGuruPush(sesi: string) {
  const today = getWIBDate()
  if (await cekLibur(today)) return { message: 'Hari libur' }

  const { data: guruList } = await supabase
    .from('profiles').select('id, nama').eq('role', 'guru')
  if (!guruList) return { message: 'Tidak ada guru' }

  const pesanPerSesi: Record<string, { title: string; body: string }> = {
    subuh: { title: '🌅 Pengingat Setoran Subuh', body: 'Sesi setoran Subuh (04.30) akan dimulai. Jangan lupa input data hafalan santri setelah sesi.' },
    pagi: { title: '☀️ Pengingat Setoran Pagi', body: 'Sesi setoran Pagi akan dimulai. Jangan lupa input data hafalan santri setelah sesi.' },
    siang: { title: '🕛 Pengingat Input Data', body: 'Mohon pastikan data hafalan santri sesi pagi sudah diinput ke sistem.' },
    sore: { title: '🕒 Pengingat Akhir Hari', body: 'Mohon pastikan semua data hafalan santri hari ini sudah diinput sebelum laporan dikirim ke wali.' },
  }

  const pesan = pesanPerSesi[sesi]
  if (!pesan) return { message: 'Sesi tidak valid' }

  let terkirim = 0, gagal = 0
  for (const guru of guruList) {
    const hasil = await kirimPushKeUser(guru.id, {
      title: pesan.title,
      body: pesan.body,
      url: '/guru',
      tag: `reminder-${sesi}`,
    })
    terkirim += hasil.terkirim
    gagal += hasil.gagal
  }

  return { message: `Reminder guru push (${sesi}) selesai. Terkirim: ${terkirim}, Gagal: ${gagal}` }
}

// ===== NOTIF NAIK PERINGKAT (Senin jam 17.00) =====
async function notifNaikPeringkat() {
  const hariMinggu = getHariWIB()

  if (hariMinggu !== 1) return { message: 'Bukan hari Senin' }

  const periode = getDuaPekanTertutup()

  const { data: santriList } = await supabase
    .from('santri').select('*, wali:wali_id(nama, no_wa)').eq('status', 'aktif')
  if (!santriList) return { message: 'Tidak ada santri' }

  const { data: liburAkademik } = await supabase
    .from('kalender_akademik').select('*').eq('tipe', 'libur')

  const hitungHariAktif = (mulai: string, selesai: string) => {
    const aktif: string[] = []
    const cur = new Date(`${mulai}T00:00:00Z`)
    const end = new Date(`${selesai}T00:00:00Z`)
    while (cur <= end) {
      const hari = cur.getUTCDay()
      const tgl = cur.toISOString().split('T')[0]
      const isLibur = (liburAkademik || []).some((libur: { tanggal_mulai: string; tanggal_selesai: string }) =>
        tgl >= libur.tanggal_mulai && tgl <= libur.tanggal_selesai
      )
      if (hari !== 0 && hari !== 5 && !isLibur) aktif.push(tgl)
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
    return aktif
  }

  const hariAktifMingguIni = hitungHariAktif(
    periode.terbaru.tanggalMulai,
    periode.terbaru.tanggalSelesai
  )
  const hariAktifMingguLalu = hitungHariAktif(
    periode.sebelumnya.tanggalMulai,
    periode.sebelumnya.tanggalSelesai
  )

  const { data: setoranMingguIni } = await supabase
    .from('setoran').select('santri_id, tanggal, jenis, penambahan_juz, status_kehadiran, status')
    .gte('tanggal', periode.terbaru.tanggalMulai).lte('tanggal', periode.terbaru.tanggalSelesai)
    .eq('status_kehadiran', 'hadir')

  const { data: setoranMingguLalu } = await supabase
    .from('setoran').select('santri_id, tanggal, jenis, penambahan_juz, status_kehadiran, status')
    .gte('tanggal', periode.sebelumnya.tanggalMulai).lte('tanggal', periode.sebelumnya.tanggalSelesai)
    .eq('status_kehadiran', 'hadir')

  type SetoranPeringkat = {
    santri_id: string
    tanggal: string
    jenis: string
    penambahan_juz: unknown
    status_kehadiran: string
    status: string | null
  }
  type StatsPeringkat = {
    totalPoin: number
    totalPenambahanBaru: number
    totalJuz: number
    hariSetorBaru: Set<string>
    najihBaru: number
    adaDataKonsistensi: boolean
    adaDataSemangat: boolean
    kombinasi: Map<string, {
      jenis: 'lama' | 'baru'
      adaLancar: boolean
      penambahanBaruMaks: number
    }>
  }
  type SantriPeringkat = {
    id: string
    nama: string
    kelas: string | null
    kelas_num: number | null
    jenjang: string | null
    jenis_kelas: string | null
    wali?: { nama?: string | null; no_wa?: string | null } | null
  }

  const santriAktif = santriList as SantriPeringkat[]
  const jenjangSantri = new Map(santriAktif.map(santri => [santri.id, santri.jenjang]))
  const normalisasiPenambahan = (value: unknown) => {
    const angka = Number(value)
    return Number.isFinite(angka) ? angka : 0
  }
  const statsKosong = (): StatsPeringkat => ({
    totalPoin: 0,
    totalPenambahanBaru: 0,
    totalJuz: 0,
    hariSetorBaru: new Set(),
    najihBaru: 0,
    adaDataKonsistensi: false,
    adaDataSemangat: false,
    kombinasi: new Map(),
  })

  const hitungStats = (setoranData: SetoranPeringkat[], hariAktif: string[]) => {
    const statsMap: Record<string, StatsPeringkat> = {}
    const hariAktifSet = new Set(hariAktif)

    setoranData.forEach(setoran => {
      if (setoran.status_kehadiran !== 'hadir') return
      if (setoran.jenis !== 'lama' && setoran.jenis !== 'baru') return

      if (!statsMap[setoran.santri_id]) statsMap[setoran.santri_id] = statsKosong()
      const stats = statsMap[setoran.santri_id]

      if (setoran.jenis === 'baru') {
        stats.adaDataSemangat = true
        stats.totalJuz += normalisasiPenambahan(setoran.penambahan_juz)
        if (hariAktifSet.has(setoran.tanggal)) stats.hariSetorBaru.add(setoran.tanggal)
        if (setoran.status === 'lancar') stats.najihBaru++
      }

      if (!hariAktifSet.has(setoran.tanggal)) return
      if (jenjangSantri.get(setoran.santri_id) === 'ulya' && setoran.jenis === 'baru') return

      stats.adaDataKonsistensi = true
      const jenis = setoran.jenis
      const kunciKombinasi = `${setoran.tanggal}:${jenis}`
      const kombinasi = stats.kombinasi.get(kunciKombinasi) || {
        jenis,
        adaLancar: false,
        penambahanBaruMaks: 0,
      }
      if (setoran.status === 'lancar') kombinasi.adaLancar = true
      if (jenis === 'baru' && setoran.status === 'lancar') {
        kombinasi.penambahanBaruMaks = Math.max(
          kombinasi.penambahanBaruMaks,
          normalisasiPenambahan(setoran.penambahan_juz)
        )
      }
      stats.kombinasi.set(kunciKombinasi, kombinasi)
    })

    Object.values(statsMap).forEach(stats => {
      stats.kombinasi.forEach(kombinasi => {
        if (!kombinasi.adaLancar) return
        stats.totalPoin++
        if (kombinasi.jenis === 'baru') {
          stats.totalPenambahanBaru += kombinasi.penambahanBaruMaks
        }
      })
    })

    return statsMap
  }

  const statsIni = hitungStats((setoranMingguIni || []) as SetoranPeringkat[], hariAktifMingguIni)
  const statsLalu = hitungStats((setoranMingguLalu || []) as SetoranPeringkat[], hariAktifMingguLalu)

  const perKelas: Record<string, SantriPeringkat[]> = {}
  santriAktif.forEach(s => {
    // TN A dan TN B digabung dalam satu kelompok
    const jenisKelas = (s.jenis_kelas === 'tn_a' || s.jenis_kelas === 'tn_b') ? 'tn' : (s.jenis_kelas || 'banin')
    const key = `${s.kelas_num}-${s.jenjang}-${jenisKelas}`
    if (!perKelas[key]) perKelas[key] = []
    perKelas[key].push(s)
  })

  type PeringkatMingguan = {
    konsistensi: number
    semangat: number
    konsistensiValid: boolean
    semangatValid: boolean
  }
  const posisiKosong = (): PeringkatMingguan => ({
    konsistensi: 0,
    semangat: 0,
    konsistensiValid: false,
    semangatValid: false,
  })
  const peringkatIni: Record<string, PeringkatMingguan> = {}
  const peringkatLalu: Record<string, PeringkatMingguan> = {}

  const sortKonsistensi = (anggota: SantriPeringkat[], stats: Record<string, StatsPeringkat>) =>
    [...anggota].sort((a, b) => {
      const aSt = stats[a.id] || statsKosong()
      const bSt = stats[b.id] || statsKosong()
      if (bSt.totalPoin !== aSt.totalPoin) return bSt.totalPoin - aSt.totalPoin
      if (a.jenjang !== 'ulya' && b.jenjang !== 'ulya' && bSt.totalPenambahanBaru !== aSt.totalPenambahanBaru) {
        return bSt.totalPenambahanBaru - aSt.totalPenambahanBaru
      }
      return a.nama.localeCompare(b.nama, 'id') || a.id.localeCompare(b.id)
  })

  const sortSemangat = (anggota: SantriPeringkat[], stats: Record<string, StatsPeringkat>) => [...anggota].sort((a, b) => {
    const aSt = stats[a.id] || statsKosong()
    const bSt = stats[b.id] || statsKosong()
    if (bSt.totalJuz !== aSt.totalJuz) return bSt.totalJuz - aSt.totalJuz
    if (bSt.hariSetorBaru.size !== aSt.hariSetorBaru.size) return bSt.hariSetorBaru.size - aSt.hariSetorBaru.size
    if (bSt.najihBaru !== aSt.najihBaru) return bSt.najihBaru - aSt.najihBaru
    return a.nama.localeCompare(b.nama, 'id') || a.id.localeCompare(b.id)
  })

  for (const [, anggota] of Object.entries(perKelas)) {
    sortKonsistensi(anggota, statsIni).forEach((s, idx) => {
      if (!peringkatIni[s.id]) peringkatIni[s.id] = posisiKosong()
      peringkatIni[s.id].konsistensi = idx + 1
      peringkatIni[s.id].konsistensiValid = !!statsIni[s.id]?.adaDataKonsistensi
    })
    sortKonsistensi(anggota, statsLalu).forEach((s, idx) => {
      if (!peringkatLalu[s.id]) peringkatLalu[s.id] = posisiKosong()
      peringkatLalu[s.id].konsistensi = idx + 1
      peringkatLalu[s.id].konsistensiValid = !!statsLalu[s.id]?.adaDataKonsistensi
    })
    sortSemangat(anggota, statsIni).forEach((s, idx) => {
      if (!peringkatIni[s.id]) peringkatIni[s.id] = posisiKosong()
      peringkatIni[s.id].semangat = idx + 1
      peringkatIni[s.id].semangatValid = !!statsIni[s.id]?.adaDataSemangat
    })
    sortSemangat(anggota, statsLalu).forEach((s, idx) => {
      if (!peringkatLalu[s.id]) peringkatLalu[s.id] = posisiKosong()
      peringkatLalu[s.id].semangat = idx + 1
      peringkatLalu[s.id].semangatValid = !!statsLalu[s.id]?.adaDataSemangat
    })
  }

  let terkirim = 0, gagal = 0

  for (const santri of santriAktif) {
    const noWali = santri.wali?.no_wa
    if (!noWali) continue

    const ini = peringkatIni[santri.id]
    const lalu = peringkatLalu[santri.id]
    if (!ini || !lalu) continue

    const naikKonsistensi = ini.konsistensiValid && lalu.konsistensiValid && ini.konsistensi < lalu.konsistensi
    const naikSemangat = ini.semangatValid && lalu.semangatValid && ini.semangat < lalu.semangat
    if (!naikKonsistensi && !naikSemangat) continue

    const namaSantri = santri.nama
    const namaWali = santri.wali?.nama || 'Wali Santri'
    const namaKelas = santri.kelas || '-'

    let detailNaik = ''
    if (naikKonsistensi && naikSemangat) {
      detailNaik = `Ananda *${namaSantri}* minggu ini naik peringkat di *${namaKelas}*:\n\n🏆 *Konsistensi Setoran*: Peringkat *${lalu.konsistensi}* → Peringkat *${ini.konsistensi}*\n🔥 *Semangat Hafalan*: Peringkat *${lalu.semangat}* → Peringkat *${ini.semangat}*`
    } else if (naikKonsistensi) {
      detailNaik = `Ananda *${namaSantri}* minggu ini naik peringkat *Konsistensi Setoran* di *${namaKelas}*:\n\n🏆 Peringkat *${lalu.konsistensi}* → Peringkat *${ini.konsistensi}*`
    } else {
      detailNaik = `Ananda *${namaSantri}* minggu ini naik peringkat *Semangat Hafalan* di *${namaKelas}*:\n\n🔥 Peringkat *${lalu.semangat}* → Peringkat *${ini.semangat}*`
    }

    const pesan = `Bismillahirrahmanirrahim\n\nAlhamdulillah! 🎉🌟✨\n\nYkh. ${namaWali} (Wali dari *${namaSantri}*)\n\n${detailNaik}\n\nSemoga Allah meneguhkan hati ananda di atas hafalan Al-Qur'an, memudahkan setiap langkahnya, dan menjadikannya pemberi syafaat bagi keluarga di akhirat kelak.\n\n_"Sebaik-baik kalian adalah orang yang mempelajari Al-Qur'an dan mengajarkannya."_ (HR. Bukhari)\n\nTeruslah istiqomah dan jangan berhenti berjuang! Setiap ayat yang dihafal adalah cahaya di dunia dan di akhirat.\n\nJazakumullahu khairan.\n${FOOTER}`

    const hasil = await kirimWA(noWali, pesan)
    if (hasil.status) terkirim++
    else gagal++
  }

  return { message: `Notif naik peringkat selesai. Terkirim: ${terkirim}, Gagal: ${gagal}` }
}
// ===== NOTIF WALI KELAS (jam 11.00 WIB) =====
async function notifWaliKelas() {
  const today = getWIBDate()
  const tanggalFormatted = formatTanggal(today)
  if (await cekLibur(today)) return { message: 'Hari libur' }

  // Ambil semua guru yang adalah wali kelas
  const { data: waliKelasList } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'guru')
    .eq('is_wali_kelas', true)
  if (!waliKelasList || waliKelasList.length === 0) return { message: 'Tidak ada wali kelas' }

  // Ambil semua setoran hari ini
  const { data: setoranHariIni } = await supabase
    .from('setoran').select('*').eq('tanggal', today)

  let terkirim = 0, gagal = 0

  for (const wali of waliKelasList) {
    if (!wali.no_wa) continue
    if (!wali.wali_kelas_num || !wali.wali_kelas_jenis) continue

    // Ambil semua santri di kelas yang diwali
    // TN: gabung tn_a dan tn_b
    let queryJenisKelas = supabase
      .from('santri')
      .select('*')
      .eq('kelas_num', wali.wali_kelas_num)
      .eq('status', 'aktif')

    if (wali.wali_kelas_jenis === 'tn') {
      queryJenisKelas = queryJenisKelas.in('jenis_kelas', ['tn_a', 'tn_b'])
    } else {
      queryJenisKelas = queryJenisKelas.eq('jenis_kelas', wali.wali_kelas_jenis)
    }

    const { data: santriKelas } = await queryJenisKelas.order('nama')
    if (!santriKelas || santriKelas.length === 0) continue

    // Kelompokkan per santri
    const sudahSetor: string[] = []
    const belumMurojaah: string[] = []
    const belumHafalanBaru: string[] = []
    const belumKeduanya: string[] = []
    const tidakHadir: { nama: string, status: string }[] = []

    for (const santri of santriKelas) {
      const setoranSantri = (setoranHariIni || []).filter((s: any) => s.santri_id === santri.id)
      const statusKehadiran = setoranSantri[0]?.status_kehadiran

      // Tidak hadir
      if (setoranSantri.length > 0 && statusKehadiran !== 'hadir') {
        tidakHadir.push({
          nama: santri.nama,
          status: statusKehadiran === 'sakit' ? 'Sakit' : statusKehadiran === 'izin' ? 'Izin' : 'Alpha'
        })
        continue
      }

      const setoranHadir = setoranSantri.filter((s: any) => s.status_kehadiran === 'hadir')
      const sudahSetorLama = setoranHadir.some((s: any) => s.jenis === 'lama')
      const sudahSetorBaru = setoranHadir.some((s: any) => s.jenis === 'baru')

      const jenjang = santri.jenjang

      if (jenjang === 'ulya') {
        // Ulya: hanya murojaah
        if (sudahSetorLama) {
          sudahSetor.push(santri.nama)
        } else {
          belumMurojaah.push(santri.nama)
        }
      } else if (jenjang === 'ula') {
        // Ula: wajib murojaah dulu, baru hafalan baru
        if (sudahSetorLama && sudahSetorBaru) {
          sudahSetor.push(santri.nama)
        } else if (!sudahSetorLama && !sudahSetorBaru) {
          belumKeduanya.push(santri.nama)
        } else if (!sudahSetorLama) {
          belumMurojaah.push(santri.nama)
        } else {
          belumHafalanBaru.push(santri.nama)
        }
      } else if (jenjang === 'wustha') {
        // Wustha: hafalan baru dan murojaah
        if (sudahSetorBaru && sudahSetorLama) {
          sudahSetor.push(santri.nama)
        } else if (!sudahSetorBaru && !sudahSetorLama) {
          belumKeduanya.push(santri.nama)
        } else if (!sudahSetorBaru) {
          belumHafalanBaru.push(santri.nama)
        } else {
          belumMurojaah.push(santri.nama)
        }
      } else {
        // Jenjang belum diset — cek setor apapun
        if (setoranHadir.length > 0) {
          sudahSetor.push(santri.nama)
        } else {
          belumKeduanya.push(santri.nama)
        }
      }
    }

    // Hitung total belum setor
    const totalBelum = belumMurojaah.length + belumHafalanBaru.length + belumKeduanya.length
    const totalSantri = santriKelas.length

    // Buat label kelas
    const labelJenis = wali.wali_kelas_jenis === 'banin' ? 'Banin'
      : wali.wali_kelas_jenis === 'banat' ? 'Banat' : 'TN'
    const labelKelas = `Kelas ${wali.wali_kelas_num} ${labelJenis}`

    // Susun pesan
    let isiPesan = ''

    if (totalBelum === 0 && tidakHadir.length === 0) {
      isiPesan = `✅ *Alhamdulillah!* Semua santri ${labelKelas} (${sudahSetor.length} santri) sudah menyelesaikan setoran hari ini.`
    } else {
      // Belum setor
      if (belumKeduanya.length > 0) {
        isiPesan += `\n❌ *Belum setor sama sekali (${belumKeduanya.length} santri):*\n`
        belumKeduanya.forEach((n, i) => { isiPesan += `${i + 1}. ${n}\n` })
      }
      if (belumMurojaah.length > 0) {
        isiPesan += `\n⚠️ *Belum setor murojaah (${belumMurojaah.length} santri):*\n`
        belumMurojaah.forEach((n, i) => { isiPesan += `${i + 1}. ${n}\n` })
      }
      if (belumHafalanBaru.length > 0) {
        isiPesan += `\n📖 *Belum setor hafalan baru (${belumHafalanBaru.length} santri):*\n`
        belumHafalanBaru.forEach((n, i) => { isiPesan += `${i + 1}. ${n}\n` })
      }
      if (sudahSetor.length > 0) {
        isiPesan += `\n✅ *Sudah selesai (${sudahSetor.length} santri):*\n`
        sudahSetor.forEach((n, i) => { isiPesan += `${i + 1}. ${n}\n` })
      }
    }

    // Ketidakhadiran
    if (tidakHadir.length > 0) {
      isiPesan += `\n🏥 *Tidak hadir (${tidakHadir.length} santri):*\n`
      tidakHadir.forEach((s, i) => { isiPesan += `${i + 1}. ${s.nama} — ${s.status}\n` })
    }

    const pesan = `Bismillahirrahmanirrahim\n\nYkh. Ustadz/Ustadzah *${wali.nama}*\n(Wali ${labelKelas})\n\n📅 *${tanggalFormatted}*\n🕙 Laporan Setoran hingga pukul 11.00\n\n━━━━━━━━━━━━━━━\n📊 *Rekap ${labelKelas}*\nTotal santri: ${totalSantri} | Sudah: ${sudahSetor.length} | Belum: ${totalBelum}\n━━━━━━━━━━━━━━━\n${isiPesan.trim()}\n\nMohon ditindaklanjuti jika diperlukan.\n\nJazakumullahu khairan.\n${FOOTER}`

    const hasil = await kirimWA(wali.no_wa, pesan)
    if (hasil.status) terkirim++
    else gagal++
  }

  return { message: `Notif wali kelas selesai. Terkirim: ${terkirim}, Gagal: ${gagal}` }
}
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Konfigurasi server tidak tersedia' }, { status: 500 })
  }

  const authorization = request.headers.get('authorization')
  const bearerMatch = authorization?.match(/^Bearer\s+(\S+)$/i)
  if (!bearerMatch || !secretSama(bearerMatch[1], cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const jenis = typeof body?.jenis === 'string' ? body.jenis : ''

  if (JENIS_WHATSAPP.has(jenis)) {
    if (!getJenisWhatsappDiizinkan().has(jenis)) {
      logPenolakan(jenis, 'whatsapp', 'jenis tidak diizinkan')
      return NextResponse.json(
        { success: false, error: 'Jenis notifikasi WhatsApp tidak diizinkan' },
        { status: 403 }
      )
    }

    if (!whatsappAktif()) {
      logPenolakan(jenis, 'whatsapp', 'kanal dinonaktifkan')
      return NextResponse.json(
        { success: false, error: 'Kanal WhatsApp sedang dinonaktifkan' },
        { status: 503 }
      )
    }
  } else if (!JENIS_PUSH.has(jenis)) {
    logPenolakan(jenis || '(kosong)', 'tidak-dikenal', 'jenis tidak valid')
    return NextResponse.json({ error: 'Jenis tidak valid' }, { status: 400 })
  }

  if (jenis === 'notif-wali') return NextResponse.json(await notifWali(whatsappDryRunAktif()))
  if (jenis === 'notif-wali-push') return NextResponse.json(await notifWaliPush())
  if (jenis === 'reminder-guru-push-subuh') return NextResponse.json(await reminderGuruPush('subuh'))
  if (jenis === 'reminder-guru-push-pagi') return NextResponse.json(await reminderGuruPush('pagi'))
  if (jenis === 'reminder-guru-push-siang') return NextResponse.json(await reminderGuruPush('siang'))
  if (jenis === 'reminder-guru-push-sore') return NextResponse.json(await reminderGuruPush('sore'))
  if (jenis === 'reminder-guru-subuh') return NextResponse.json(await reminderGuru('subuh'))
  if (jenis === 'reminder-guru-pagi') return NextResponse.json(await reminderGuru('pagi'))
  if (jenis === 'reminder-guru-siang') return NextResponse.json(await reminderGuru('siang'))
  if (jenis === 'reminder-guru-sore') return NextResponse.json(await reminderGuru('sore'))
  if (jenis === 'notif-naik-peringkat') return NextResponse.json(await notifNaikPeringkat())
  if (jenis === 'notif-wali-kelas') return NextResponse.json(await notifWaliKelas())
  return NextResponse.json({ error: 'Jenis tidak valid' }, { status: 400 })
}
