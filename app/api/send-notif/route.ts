import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { kirimPushKeUser } from '../../lib/sendPush'

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
async function notifWali() {
  const today = getWIBDate()
  const tanggalFormatted = formatTanggal(today)
  if (await cekLibur(today)) return { message: 'Hari libur' }

  const { data: santriList } = await supabase
    .from('santri').select('*, wali:wali_id(nama, no_wa)')
  if (!santriList) return { message: 'Tidak ada santri' }

  const { data: setoranHariIni } = await supabase
    .from('setoran').select('*').eq('tanggal', today)

  let terkirim = 0, gagal = 0

  for (const santri of santriList) {
    const noWali = santri.wali?.no_wa
    if (!noWali) continue

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
      if (setoranSantri.length === 0) continue

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
      const hasil = await kirimWA(noWali, pesan)
      if (hasil.status) terkirim++
      else gagal++
    }
  }

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
  const today = getWIBDate()
  const hariMinggu = getHariWIB()

  if (hariMinggu !== 1) return { message: 'Bukan hari Senin' }

  const seninLalu = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  seninLalu.setDate(seninLalu.getDate() - 7)
  const tglSeninLalu = `${seninLalu.getFullYear()}-${String(seninLalu.getMonth() + 1).padStart(2, '0')}-${String(seninLalu.getDate()).padStart(2, '0')}`

  const duaMingguLalu = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  duaMingguLalu.setDate(duaMingguLalu.getDate() - 14)
  const tglDuaMingguLalu = `${duaMingguLalu.getFullYear()}-${String(duaMingguLalu.getMonth() + 1).padStart(2, '0')}-${String(duaMingguLalu.getDate()).padStart(2, '0')}`

  const { data: santriList } = await supabase
    .from('santri').select('*, wali:wali_id(nama, no_wa)')
  if (!santriList) return { message: 'Tidak ada santri' }

  const { data: liburAkademik } = await supabase
    .from('kalender_akademik').select('*').eq('tipe', 'libur')

  const hitungHariAktif = (mulai: string, selesai: string) => {
    const aktif: string[] = []
    const cur = new Date(mulai)
    const end = new Date(selesai)
    while (cur <= end) {
      const hari = cur.getDay()
      const tgl = cur.toISOString().split('T')[0]
      if (hari !== 0 && hari !== 5) {
        const isLibur = (liburAkademik || []).some((l: any) =>
          tgl >= l.tanggal_mulai && tgl <= l.tanggal_selesai
        )
        if (!isLibur) aktif.push(tgl)
      }
      cur.setDate(cur.getDate() + 1)
    }
    return aktif
  }

  const hariAktifMingguIni = hitungHariAktif(tglSeninLalu, today)
  const hariAktifMingguLalu = hitungHariAktif(tglDuaMingguLalu, tglSeninLalu)

  const { data: setoranMingguIni } = await supabase
    .from('setoran').select('santri_id, tanggal, jenis, penambahan_juz, status_kehadiran, status')
    .gte('tanggal', tglSeninLalu).lte('tanggal', today)
    .eq('status_kehadiran', 'hadir')

  const { data: setoranMingguLalu } = await supabase
    .from('setoran').select('santri_id, tanggal, jenis, penambahan_juz, status_kehadiran, status')
    .gte('tanggal', tglDuaMingguLalu).lte('tanggal', tglSeninLalu)
    .eq('status_kehadiran', 'hadir')

  const hitungStats = (setoranData: any[], hariAktif: string[]) => {
    const statsMap: Record<string, {
      hariSetorLama: Set<string>, hariSetorBaru: Set<string>,
      najihLama: number, najihBaru: number, totalJuz: number
    }> = {}
    ;(setoranData || []).forEach((s: any) => {
      if (!statsMap[s.santri_id]) statsMap[s.santri_id] = {
        hariSetorLama: new Set(), hariSetorBaru: new Set(),
        najihLama: 0, najihBaru: 0, totalJuz: 0
      }
      if (s.jenis === 'lama') {
        if (hariAktif.includes(s.tanggal)) statsMap[s.santri_id].hariSetorLama.add(s.tanggal)
        if (s.status === 'lancar') statsMap[s.santri_id].najihLama++
      } else if (s.jenis === 'baru') {
        if (hariAktif.includes(s.tanggal)) statsMap[s.santri_id].hariSetorBaru.add(s.tanggal)
        if (s.status === 'lancar') statsMap[s.santri_id].najihBaru++
        statsMap[s.santri_id].totalJuz += (s.penambahan_juz || 0)
      }
    })
    return statsMap
  }

  const statsIni = hitungStats(setoranMingguIni || [], hariAktifMingguIni)
  const statsLalu = hitungStats(setoranMingguLalu || [], hariAktifMingguLalu)

  const perKelas: Record<string, any[]> = {}
  santriList.forEach(s => {
    // TN A dan TN B digabung dalam satu kelompok
    const jenisKelas = (s.jenis_kelas === 'tn_a' || s.jenis_kelas === 'tn_b') ? 'tn' : (s.jenis_kelas || 'banin')
    const key = `${s.kelas_num}-${s.jenjang}-${jenisKelas}`
    if (!perKelas[key]) perKelas[key] = []
    perKelas[key].push(s)
  })

  const peringkatIni: Record<string, { konsistensi: number, semangat: number }> = {}
  const peringkatLalu: Record<string, { konsistensi: number, semangat: number }> = {}

  const sortKonsistensi = (anggota: any[], stats: any) => [...anggota].sort((a: any, b: any) => {
    const aUlya = a.jenjang === 'ulya'
    const bUlya = b.jenjang === 'ulya'
    const aSt = stats[a.id] || { hariSetorLama: new Set(), hariSetorBaru: new Set(), najihLama: 0, najihBaru: 0 }
    const bSt = stats[b.id] || { hariSetorLama: new Set(), hariSetorBaru: new Set(), najihLama: 0, najihBaru: 0 }
    const aHari = aUlya ? aSt.hariSetorBaru.size : aSt.hariSetorLama.size
    const bHari = bUlya ? bSt.hariSetorBaru.size : bSt.hariSetorLama.size
    if (bHari !== aHari) return bHari - aHari
    const aNajih = aUlya ? aSt.najihBaru : aSt.najihLama
    const bNajih = bUlya ? bSt.najihBaru : bSt.najihLama
    if (bNajih !== aNajih) return bNajih - aNajih
    if (bSt.hariSetorBaru.size !== aSt.hariSetorBaru.size) return bSt.hariSetorBaru.size - aSt.hariSetorBaru.size
    if (bSt.najihBaru !== aSt.najihBaru) return bSt.najihBaru - aSt.najihBaru
    return 0
  })

  const sortSemangat = (anggota: any[], stats: any) => [...anggota].sort((a: any, b: any) => {
    const aSt = stats[a.id] || { totalJuz: 0, hariSetorBaru: new Set(), najihBaru: 0 }
    const bSt = stats[b.id] || { totalJuz: 0, hariSetorBaru: new Set(), najihBaru: 0 }
    if (bSt.totalJuz !== aSt.totalJuz) return bSt.totalJuz - aSt.totalJuz
    if (bSt.hariSetorBaru.size !== aSt.hariSetorBaru.size) return bSt.hariSetorBaru.size - aSt.hariSetorBaru.size
    if (bSt.najihBaru !== aSt.najihBaru) return bSt.najihBaru - aSt.najihBaru
    return 0
  })

  for (const [, anggota] of Object.entries(perKelas)) {
    sortKonsistensi(anggota, statsIni).forEach((s: any, idx: number) => {
      if (!peringkatIni[s.id]) peringkatIni[s.id] = { konsistensi: 0, semangat: 0 }
      peringkatIni[s.id].konsistensi = idx + 1
    })
    sortKonsistensi(anggota, statsLalu).forEach((s: any, idx: number) => {
      if (!peringkatLalu[s.id]) peringkatLalu[s.id] = { konsistensi: 0, semangat: 0 }
      peringkatLalu[s.id].konsistensi = idx + 1
    })
    sortSemangat(anggota, statsIni).forEach((s: any, idx: number) => {
      if (!peringkatIni[s.id]) peringkatIni[s.id] = { konsistensi: 0, semangat: 0 }
      peringkatIni[s.id].semangat = idx + 1
    })
    sortSemangat(anggota, statsLalu).forEach((s: any, idx: number) => {
      if (!peringkatLalu[s.id]) peringkatLalu[s.id] = { konsistensi: 0, semangat: 0 }
      peringkatLalu[s.id].semangat = idx + 1
    })
  }

  let terkirim = 0, gagal = 0

  for (const santri of santriList) {
    const noWali = santri.wali?.no_wa
    if (!noWali) continue

    const ini = peringkatIni[santri.id]
    const lalu = peringkatLalu[santri.id]
    if (!ini || !lalu) continue

    const naikKonsistensi = ini.konsistensi < lalu.konsistensi
    const naikSemangat = ini.semangat < lalu.semangat
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
  const { jenis } = await request.json()
  if (jenis === 'notif-wali') return NextResponse.json(await notifWali())
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