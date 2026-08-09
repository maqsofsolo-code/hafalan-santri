// Fondasi client-side auth/permission yang berulang di app/guru/page.tsx,
// app/kepsek/page.tsx, app/wali/page.tsx, dan pola fetch ber-Bearer-token di
// app/admin/page.tsx (Modularisasi Tahap 4). Bukan abstraksi/framework baru --
// hanya konsolidasi pola yang SUDAH identik, supaya modularisasi halaman
// berikutnya punya satu pola konsisten untuk dipakai.
//
// app/admin/page.tsx TIDAK memakai requireProfile() -- halaman itu memang
// tidak punya guard client-side (getUser + redirect + cek role) sejak awal,
// berbeda dari guru/kepsek/wali. Ini bukan sesuatu yang diseragamkan di
// Tahap ini (lihat laporan Modularisasi Tahap 4); perilaku admin/page.tsx
// tidak diubah/ditambah.

import { supabase } from './supabase'

export type Role = 'admin' | 'guru' | 'kepsek' | 'wali'

// Baris penuh tabel profiles (select('*')) -- kolomnya berbeda-beda pemakaian
// per role (guru/kepsek/wali), jadi ditipekan longgar lewat index signature,
// sama seperti guruProfile/waliProfile yang sudah ada (state any).
export type ProfileRow = { id: string; role: string; [key: string]: unknown }

/**
 * Pastikan ada sesi login DAN role profil cocok dengan `role`, redirect ke
 * halaman login jika salah satu gagal -- persis perilaku lama yang
 * diduplikasi di guru/kepsek/wali (getUser -> redirect jika kosong -> fetch
 * profil penuh -> redirect jika role tidak cocok). Return baris profil jika
 * lolos, atau null jika sudah redirect (caller cukup `if (!profile) return`).
 */
export async function requireProfile(role: Role): Promise<ProfileRow | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    window.location.href = '/'
    return null
  }
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== role) {
    window.location.href = '/'
    return null
  }
  return profile
}

/**
 * Bungkus fetch() dengan header Authorization: Bearer <token>. Tidak
 * mengambil session sendiri (caller tetap ambil session & menangani sesi
 * kosong/kedaluwarsa seperti sekarang), tidak mengubah contract API, tidak
 * menyembunyikan response error -- hanya memasang header Bearer supaya tidak
 * diulang manual di tiap pemanggilan fetch.
 */
export async function fetchWithAuth(url: string, token: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })
}
