import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

// ===== NOTIF WALI SANTRI (jam 17.00 WIB) =====
async function notifWali() {
  const today = getWIBDate()
  const tanggalFormatted = formatTanggal(today)
  if (await cekLibur(today)) return { message: 'Hari libur' }

  const { data: santriList } = await supabase
    .from('santri').select('*, wali:wali_id(nama, no_wa)')
  if (!santriList) return { message: 'Tidak ada santri' }

  const { data: setoranHariIni } = await supabase
    .from('setoran').select('*').eq('tanggal', today)

  // Riwayat rosib 14 hari untuk cek 3x rosib surat sama
  const nowWIB = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  nowWIB.setDate(nowWIB.getDate() - 14)
  const tglMulaiRosib = `${nowWIB.getFullYear()}-${String(nowWIB.getMonth() + 1).padStart(2, '0')}-${String(nowWIB.getDate()).padStart(2, '0')}`

  const { data: riwayatRosib } = await supabase
    .from('setoran').select('santri_id, surah, status, jenis')
    .eq('status', 'rosib').eq('jenis', 'lama').gte('tanggal', tglMulaiRosib)

  let terkirim = 0, gagal = 0

  for (const santri of santriList) {
    const noWali = santri.wali?.no_wa
    if (!noWali) continue

    const jenjang = santri.jenjang // 'ula' | 'wustha' | 'ulya'
    const setoranSantri = (setoranHariIni || []).filter((s: any) => s.santri_id === santri.id)
    const sudahSetor = setoranSantri.length > 0
    const setoranHadir = setoranSantri.filter((s: any) => s.status_kehadiran === 'hadir')
    const statusKehadiran = setoranSantri[0]?.status_kehadiran
    const namaSantri = santri.nama
    const namaWali = santri.wali?.nama || 'Wali Santri'

    // Setoran per jenis
    const setoranBaru = setoranHadir.filter((s: any) => s.jenis === 'baru')
    const setoranLama = setoranHadir.filter((s: any) => s.jenis === 'lama')
    const sudahSetorBaru = setoranBaru.length > 0
    const sudahSetorLama = setoranLama.length > 0
    const rosibBaru = setoranBaru.some((s: any) => s.status === 'rosib')
    const rosibLama = setoranLama.some((s: any) => s.status === 'rosib')
    const adaRosib = setoranHadir.some((s: any) => s.status === 'rosib')

    let pesan = ''

    // ===== 1. SAKIT =====
    if (statusKehadiran === 'sakit') {
      pesan = `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYkh. ${namaWali} (Wali dari *${namaSantri}*)\n\n📅 *${tanggalFormatted}*\n\nKami informasikan bahwa hari ini *${namaSantri}* tidak dapat hadir karena *sakit*.\n\nSemoga Allah segera memberikan kesembuhan kepada ananda.\n\nاللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَاسَ وَاشْفِ أَنْتَ الشَّافِي لَا شِفَاءَ إِلَّا شِفَاؤُكَ شِفَاءً لَا يُغَادِرُ سَقَمَاً\n\n_"Ya Allah, Tuhan manusia, hilangkanlah penyakit dan sembuhkanlah, Engkaulah Yang Maha Menyembuhkan, tidak ada kesembuhan kecuali dari-Mu."_\n\nJazakumullahu khairan.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`
    }

    // ===== 2. IZIN =====
    else if (statusKehadiran === 'izin') {
      pesan = `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYkh. ${namaWali} (Wali dari *${namaSantri}*)\n\n📅 *${tanggalFormatted}*\n\nKami informasikan bahwa hari ini *${namaSantri}* tidak hadir karena *izin*.\n\nKami berpesan agar ananda tetap dimotivasi untuk *murojaah hafalannya di rumah*, karena hafalan yang kuat adalah hafalan yang senantiasa diulang.\n\n_"Jagalah hafalan Al-Qur'an ini, demi Allah, hafalan ini lebih mudah lepas dari hati daripada lepasnya unta dari ikatannya."_ (HR. Bukhari)\n\nJazakumullahu khairan.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`
    }

    // ===== 3. ALPHA =====
    else if (statusKehadiran === 'alpha') {
      pesan = `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYkh. ${namaWali} (Wali dari *${namaSantri}*)\n\n📅 *${tanggalFormatted}*\n\nKami informasikan bahwa hari ini *${namaSantri}* *tidak hadir tanpa keterangan (alpha)*.\n\nMohon Bapak/Ibu dapat menghubungi pihak pesantren untuk memberikan keterangan.\n\nJazakumullahu khairan.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`
    }

    // ===== 4. ROSIB =====
    else if (adaRosib) {
      const daftarRosib = setoranHadir
        .filter((s: any) => s.status === 'rosib')
        .map((s: any) => `- ${s.jenis === 'baru' ? 'Hafalan Baru' : 'Murojaah'}: ${s.surah || '-'} ayat ${s.ayat_mulai}-${s.ayat_selesai}`)
        .join('\n')
      pesan = `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYkh. ${namaWali} (Wali dari *${namaSantri}*)\n\n📅 *${tanggalFormatted}*\n\nKami informasikan bahwa hari ini *${namaSantri}* perlu mengulang hafalannya (rosib) pada:\n\n${daftarRosib}\n\nMohon bantu muroja'ah di rumah agar hafalan semakin kuat dan lancar.\n\nSemoga Allah memudahkan ananda dalam menghafal Al-Qur'an.\n\nJazakumullahu khairan.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`
    }

    // ===== 5. BELUM SETOR — logika per jenjang =====
    else if (!sudahSetor || (jenjang === 'wustha' && (!sudahSetorBaru || !sudahSetorLama))) {
      let belumSetor = ''

      if (jenjang === 'ulya') {
        // Ulya: hanya cek hafalan baru
        if (!sudahSetorBaru) belumSetor = 'hafalan baru'
      } else if (jenjang === 'ula') {
        // Ula: belum setor lama = notif, sudah setor lama tapi belum baru = tidak notif
        if (!sudahSetorLama && !sudahSetorBaru) belumSetor = 'hafalan lama (murojaah) dan hafalan baru'
        else if (!sudahSetorLama) belumSetor = 'hafalan lama (murojaah)'
        // sudah setor lama tapi belum baru → tidak kirim notif
      } else if (jenjang === 'wustha') {
        // Wustha: cek keduanya terpisah
        if (!sudahSetorBaru && !sudahSetorLama) belumSetor = 'hafalan baru dan murojaah'
        else if (!sudahSetorBaru) belumSetor = 'hafalan baru'
        else if (!sudahSetorLama) belumSetor = 'murojaah (hafalan lama)'
      } else {
        // Jenjang tidak diketahui, cek keduanya
        if (!sudahSetor) belumSetor = 'hafalan Al-Qur\'an'
      }

      if (belumSetor) {
        pesan = `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYkh. ${namaWali} (Wali dari *${namaSantri}*)\n\n📅 *${tanggalFormatted}*\n\nKami informasikan bahwa hari ini *${namaSantri}* belum menyetorkan *${belumSetor}*.\n\nMohon kiranya Bapak/Ibu dapat memberikan tasyji' dan semangat kepada ananda.\n\nSemoga Allah membalas kebaikan Bapak/Ibu, menjadikan jerih payah ini sebagai pahala jariyah, dan menjadikan ananda sebagai hafidzul Qur'an yang memberikan mahkota kemuliaan di hari kiamat kelak.\n\nJazakumullahu khairan katsiran.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`
      }
    }

    // ===== 6. CEK 3x ROSIB SURAT SAMA =====
    if (!pesan) {
      const rosibPerSurah: Record<string, number> = {}
      ;(riwayatRosib || []).filter((r: any) => r.santri_id === santri.id).forEach((r: any) => {
        rosibPerSurah[r.surah || 'unknown'] = (rosibPerSurah[r.surah || 'unknown'] || 0) + 1
      })
      const surahRosib3x = Object.entries(rosibPerSurah)
        .filter(([, c]) => c >= 3).map(([s]) => s)
      if (surahRosib3x.length > 0) {
        pesan = `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYkh. ${namaWali} (Wali dari *${namaSantri}*)\n\n📅 *${tanggalFormatted}*\n\nKami informasikan bahwa *${namaSantri}* telah rosib sebanyak *3 kali atau lebih* pada surah:\n\n*${surahRosib3x.join(', ')}*\n\nMohon perhatian dan dukungan ekstra dari Bapak/Ibu.\n\nTeruslah berjuang! Kelak seorang hafidz Al-Qur'an akan memakaikan mahkota kemuliaan kepada kedua orang tuanya di hari kiamat.\n\n_"Barang siapa menghafal Al-Qur'an, ia akan datang pada hari kiamat dan Al-Qur'an berkata: Ya Rabb, pakaikanlah dia mahkota kemuliaan."_ (HR. Tirmidzi)\n\nJazakumullahu khairan.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`
      }
    }

    if (pesan) {
      const hasil = await kirimWA(noWali, pesan)
      if (hasil.status) terkirim++
      else gagal++
    }
  }

  return { message: `Notif wali selesai. Terkirim: ${terkirim}, Gagal: ${gagal}` }
}

// ===== REMINDER GURU =====
async function reminderGuru(sesi: string) {
  const today = getWIBDate()
  const tanggalFormatted = formatTanggal(today)
  if (await cekLibur(today)) return { message: 'Hari libur' }

  const { data: guruList } = await supabase
    .from('profiles').select('*').eq('role', 'guru')
  if (!guruList) return { message: 'Tidak ada guru' }

  // Deteksi jenjang yang diajar tiap guru dari data santri
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
    subuh: `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYkh. Ustadz/Ustadzah yang mulia,\n\n📅 *${tanggalFormatted}*\n\nKami mengingatkan bahwa *sesi setoran Subuh* akan segera dimulai pukul *04.30*.\n\nMohon segera bersiap dan jangan lupa *input data hafalan santri* setelah sesi selesai.\n\nBaarakallahu fiikum.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`,

    pagi: `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYkh. Ustadz/Ustadzah yang mulia,\n\n📅 *${tanggalFormatted}*\n\nKami mengingatkan bahwa *sesi setoran Pagi* akan segera dimulai.\n\nJenjang Ula: Hafalan Lama pukul *08.00 - 09.00*, Hafalan Baru pukul *09.00 - 10.00*\nJenjang Wustha: Murojaah pukul *08.00 - 09.45*\n\nMohon segera bersiap dan jangan lupa *input data hafalan santri* setelah sesi selesai.\n\nBaarakallahu fiikum.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`,

    siang: `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYkh. Ustadz/Ustadzah yang mulia,\n\n📅 *${tanggalFormatted}*\n\nIni adalah *pengingat siang* pukul 12.00. Mohon pastikan data hafalan santri sesi pagi sudah *diinput ke sistem*.\n\nJazakumullahu khairan.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`,

    sore: `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYkh. Ustadz/Ustadzah yang mulia,\n\n📅 *${tanggalFormatted}*\n\nIni adalah *pengingat sore* pukul 15.00. Mohon pastikan semua data hafalan santri hari ini sudah *diinput ke sistem* sebelum pukul 17.00.\n\nJazakumullahu khairan.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`
  }

  let terkirim = 0, gagal = 0

  for (const guru of guruList) {
    if (!guru.no_wa) continue

    const jenjangGuru = guruJenjangMap[guru.id] || new Set()
    const sudahAbsenSubuh = (absensiHariIni || []).some((a: any) => a.guru_id === guru.id && a.sesi === 'subuh')
    const sudahAbsenPagi = (absensiHariIni || []).some((a: any) => a.guru_id === guru.id && a.sesi === 'pagi')
    const sudahInput = guruSudahInput.includes(guru.id)

    if (sesi === 'subuh') {
      // Hanya guru Wustha & Ulya, skip jika sudah absen subuh
      const ajarWusthaUlya = jenjangGuru.has('wustha') || jenjangGuru.has('ulya')
      if (!ajarWusthaUlya) continue
      if (sudahAbsenSubuh) continue
    } else if (sesi === 'pagi') {
      // Semua guru, skip jika sudah absen pagi
      if (sudahAbsenPagi) continue
    } else if (sesi === 'siang') {
      // Semua guru, skip jika sudah input data
      if (sudahInput) continue
    } else if (sesi === 'sore') {
      // Semua guru, skip jika sudah input data
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

export async function POST(request: Request) {
  const { jenis } = await request.json()
  if (jenis === 'notif-wali') return NextResponse.json(await notifWali())
  if (jenis === 'reminder-guru-subuh') return NextResponse.json(await reminderGuru('subuh'))
  if (jenis === 'reminder-guru-pagi') return NextResponse.json(await reminderGuru('pagi'))
  if (jenis === 'reminder-guru-siang') return NextResponse.json(await reminderGuru('siang'))
  if (jenis === 'reminder-guru-sore') return NextResponse.json(await reminderGuru('sore'))
  return NextResponse.json({ error: 'Jenis tidak valid' }, { status: 400 })
}