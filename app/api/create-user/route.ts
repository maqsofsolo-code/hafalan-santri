import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type TargetRole = 'guru' | 'wali'

type CreateUserBody = {
  email?: string
  password?: string
  nama?: string
  role?: string
  no_wa?: string
  userId?: string
  isUpdate?: boolean
  isDelete?: boolean
}

type AuthUpdateData = {
  email?: string
  password?: string
}

const targetRoles: TargetRole[] = ['guru', 'wali']

function createAuthenticatedClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
}

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization')
  const bearerMatch = authorization?.match(/^Bearer\s+(\S+)$/i)

  if (!bearerMatch) {
    return NextResponse.json({ error: 'Session tidak valid atau sudah berakhir' }, { status: 401 })
  }

  const accessToken = bearerMatch[1]
  const supabaseAuthenticated = createAuthenticatedClient(accessToken)
  const { data: userData, error: userError } = await supabaseAuthenticated.auth.getUser(accessToken)

  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Session tidak valid atau sudah berakhir' }, { status: 401 })
  }

  const { data: callerProfile, error: callerProfileError } = await supabaseAuthenticated
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (callerProfileError || callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const supabaseAdmin = createAdminClient()
  const body = await request.json() as CreateUserBody
  const { email, password, nama, role, no_wa, userId, isUpdate, isDelete } = body

  // ===== HAPUS USER =====
  if (isDelete && userId) {
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (targetError) {
      return NextResponse.json({ error: 'Gagal memverifikasi akun target' }, { status: 500 })
    }
    if (!targetProfile) {
      return NextResponse.json({ error: 'Akun target tidak ditemukan' }, { status: 404 })
    }
    if (!targetRoles.includes(targetProfile.role as TargetRole)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    // Hapus dari profiles dulu
    await supabaseAdmin.from('profiles').delete().eq('id', userId)
    // Hapus dari auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  // ===== UPDATE USER =====
  if (isUpdate && userId) {
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (targetError) {
      return NextResponse.json({ error: 'Gagal memverifikasi akun target' }, { status: 500 })
    }
    if (!targetProfile) {
      return NextResponse.json({ error: 'Akun target tidak ditemukan' }, { status: 404 })
    }
    if (!targetRoles.includes(targetProfile.role as TargetRole)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const updateData: AuthUpdateData = {}
    if (email) updateData.email = email
    if (password) updateData.password = password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  // ===== BUAT USER BARU =====
  if (!role || !targetRoles.includes(role as TargetRole)) {
    return NextResponse.json({ error: 'Role akun tidak valid' }, { status: 400 })
  }
  if (!email || !password) {
    return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabaseAdmin.from('profiles').insert({
    id: data.user.id, nama, role, no_wa
  })

  return NextResponse.json({ success: true, user: data.user })
}
