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

function getHariWIB() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })).getDay()
}

function getTodayWIB() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ===== NOTIF WALI SANTRI (jam 17.00 WIB) =====
async function notifWali() {
  const hariMinggu = getHariWIB()
  const today = getTodayWIB()

  // Skip Jumat (5) dan Ahad (0)
  if (hariMinggu === 0 || hariMinggu === 5) {
    return { message: 'Hari libur, tidak ada notifikasi' }
  }

  // Cek libur akademik
  const { data: kalender } = await supabase
    .from('kalender_akademik')
    .select('*')
    .lte('tanggal_mulai', today)
    .gte('tanggal_selesai', today)
    .eq('tipe', 'libur')
    .maybeSingle()
  if (kalender) return { message: 'Hari libur akademik' }

  // Ambil semua santri beserta wali
  const { data: santriList } = await supabase
    .from('santri')
    .select('*, wali:wali_id(nama, no_wa)')

  if (!santriList) return { message: 'Tidak ada santri' }

  // Ambil semua setoran hari ini
  const { data: setoranHariIni } = await supabase
    .from('setoran')
    .select('*')
    .eq('tanggal', today)

  // Ambil riwayat rosib 14 hari terakhir untuk cek 3x rosib surat sama
  const tigaHariLalu = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  tigaHariLalu.setDate(tigaHariLalu.getDate() - 14)
  const y = tigaHariLalu.getFullYear()
  const m = String(tigaHariLalu.getMonth() + 1).padStart(2, '0')
  const d = String(tigaHariLalu.getDate()).padStart(2, '0')
  const tglMulaiRosib = `${y}-${m}-${d}`

  const { data: riwayatRosib } = await supabase
    .from('setoran')
    .select('santri_id, surah, status, jenis')
    .eq('status', 'rosib')
    .eq('jenis', 'lama')
    .gte('tanggal', tglMulaiRosib)

  let terkirim = 0
  let gagal = 0

  for (const santri of santriList) {
    const noWali = santri.wali?.no_wa
    if (!noWali) continue

    const setoranSantri = (setoranHariIni || []).filter(s => s.santri_id === santri.id)
    const sudahSetor = setoranSantri.length > 0
    const setoranHadir = setoranSantri.filter(s => s.status_kehadiran === 'hadir')
    const adaRosib = setoranHadir.some(s => s.status === 'rosib')
    const statusKehadiran = setoranSantri[0]?.status_kehadiran
    const namaSantri = santri.nama
    const namaWali = santri.wali?.nama || 'Wali Santri'

    let pesan = ''

    // 1. Tidak hadir - Sakit
    if (statusKehadiran === 'sakit') {
      pesan = `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYth. ${namaWali} (Wali dari *${namaSantri}*)\n\nKami informasikan bahwa hari ini *${namaSantri}* tidak hadir karena *sakit*.\n\nSemoga Allah segera memberikan kesembuhan kepada ananda.\n\nاللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَاسَ وَاشْفِ أَنْتَ الشَّافِي لَا شِفَاءَ إِلَّا شِفَاؤُكَ شِفَاءً لَا يُغَادِرُ سَقَمَاً\n\n_"Ya Allah, Tuhan manusia, hilangkanlah penyakit ini dan sembuhkanlah, Engkaulah Yang Maha Menyembuhkan, tidak ada kesembuhan kecuali dari-Mu."_\n\nJazakumullahu khairan.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`
    }

    // 2. Tidak hadir - Izin
    else if (statusKehadiran === 'izin') {
      pesan = `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYth. ${namaWali} (Wali dari *${namaSantri}*)\n\nKami informasikan bahwa hari ini *${namaSantri}* tidak hadir karena *izin*.\n\nKami berpesan agar ananda tetap dimotivasi untuk *murojaah hafalannya di rumah*, karena hafalan yang kuat adalah hafalan yang senantiasa diulang.\n\n_"Jagalah hafalan Al-Qur'an ini, demi Allah, hafalan ini lebih mudah lepas dari hati daripada lepasnya unta dari ikatannya."_ (HR. Bukhari)\n\nJazakumullahu khairan.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`
    }

    // 3. Rosib
    else if (adaRosib) {
      const setoranRosib = setoranHadir.filter(s => s.status === 'rosib')
      const daftarRosib = setoranRosib.map(s =>
        `- ${s.jenis === 'baru' ? 'Hafalan Baru' : 'Murojaah'}: ${s.surah || '-'} ayat ${s.ayat_mulai}-${s.ayat_selesai}`
      ).join('\n')
      pesan = `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYth. ${namaWali} (Wali dari *${namaSantri}*)\n\nKami informasikan bahwa hari ini *${namaSantri}* perlu mengulang hafalannya (rosib) pada:\n\n${daftarRosib}\n\nMohon bantu muroja'ah di rumah agar hafalan semakin kuat dan lancar.\n\nSemoga Allah memudahkan ananda dalam menghafal Al-Qur'an.\n\nJazakumullahu khairan.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`
    }

    // 4. Tidak setor sama sekali
    else if (!sudahSetor) {
      pesan = `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYth. ${namaWali} (Wali dari *${namaSantri}*)\n\nKami informasikan bahwa hari ini *${namaSantri}* belum menyetorkan hafalan Al-Qur'an.\n\nMohon kiranya Bapak/Ibu dapat memberikan tasyji' dan semangat kepada ananda.\n\nSemoga Allah membalas kebaikan Bapak/Ibu, menjadikan jerih payah ini sebagai pahala jariyah, dan menjadikan ananda sebagai hafidzul Qur'an yang memberikan mahkota kemuliaan di hari kiamat kelak.\n\nJazakumullahu khairan katsiran.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`
    }

    // 5. Cek 3x rosib surat yang sama
    if (!pesan) {
      const rosibPerSurah: Record<string, number> = {}
      ;(riwayatRosib || [])
        .filter(r => r.santri_id === santri.id)
        .forEach(r => {
          const key = r.surah || 'unknown'
          rosibPerSurah[key] = (rosibPerSurah[key] || 0) + 1
        })
      const surahRosib3x = Object.entries(rosibPerSurah)
        .filter(([, count]) => count >= 3)
        .map(([surah]) => surah)
      if (surahRosib3x.length > 0) {
        pesan = `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYth. ${namaWali} (Wali dari *${namaSantri}*)\n\nKami informasikan bahwa *${namaSantri}* telah rosib sebanyak *3 kali atau lebih* pada surah:\n\n*${surahRosib3x.join(', ')}*\n\nMohon perhatian dan dukungan ekstra dari Bapak/Ibu.\n\nTeruslah berjuang! Kelak seorang hafidz Al-Qur'an akan memakaikan mahkota kemuliaan kepada kedua orang tuanya di hari kiamat.\n\n_"Barang siapa menghafal Al-Qur'an, ia akan datang pada hari kiamat dan Al-Qur'an berkata: Ya Rabb, pakaikanlah dia mahkota kemuliaan."_ (HR. Tirmidzi)\n\nJazakumullahu khairan.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`
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
  const hariMinggu = getHariWIB()

  if (hariMinggu === 0 || hariMinggu === 5) {
    return { message: 'Hari libur' }
  }

  const today = getTodayWIB()
  const { data: kalender } = await supabase
    .from('kalender_akademik')
    .select('*')
    .lte('tanggal_mulai', today)
    .gte('tanggal_selesai', today)
    .eq('tipe', 'libur')
    .maybeSingle()
  if (kalender) return { message: 'Hari libur akademik' }

  const { data: guruList } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'guru')

  if (!guruList) return { message: 'Tidak ada guru' }

  const pesanPerSesi: Record<string, string> = {
    subuh: `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYth. Ustadz/Ustadzah yang mulia,\n\nKami mengingatkan bahwa *sesi setoran Subuh* akan segera dimulai pukul *04.00 - 05.30*.\n\nMohon segera bersiap dan jangan lupa *input data hafalan santri* setelah sesi selesai.\n\nBaarakallahu fiikum.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`,

    pagi: `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYth. Ustadz/Ustadzah yang mulia,\n\nKami mengingatkan bahwa *sesi setoran Pagi* akan segera dimulai pukul *08.00 - 09.45*.\n\nMohon segera bersiap dan jangan lupa *input data hafalan santri* setelah sesi selesai.\n\nBaarakallahu fiikum.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`,

    sore: `Bismillahirrahmanirrahim\n\nAssalamu'alaikum warahmatullahi wabarakatuh\n\nYth. Ustadz/Ustadzah yang mulia,\n\nIni adalah *pengingat sore* pukul 15.00. Mohon pastikan semua data hafalan santri hari ini sudah *diinput ke sistem* sebelum pukul 17.00.\n\nJazakumullahu khairan.\n_Pondok Pesantren Daarus Salaf Sukoharjo_`
  }

  const pesan = pesanPerSesi[sesi]
  if (!pesan) return { message: 'Sesi tidak valid' }

  let terkirim = 0
  let gagal = 0

  for (const guru of guruList) {
    if (!guru.no_wa) continue
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
  if (jenis === 'reminder-guru-sore') return NextResponse.json(await reminderGuru('sore'))

  return NextResponse.json({ error: 'Jenis tidak valid' }, { status: 400 })
}