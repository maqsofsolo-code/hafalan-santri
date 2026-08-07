import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export type Role = 'admin' | 'guru' | 'kepsek' | 'wali'

type AuthSuccess = {
  response?: undefined
  userId: string
  role: Role
  authClient: SupabaseClient
}

type AuthFailure = {
  response: NextResponse
}

export type AuthResult = AuthSuccess | AuthFailure

function createAuthenticatedClient(accessToken: string): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
}

export function createServiceRoleClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

// Auth minimal untuk security hotfix (endpoint import & laporan yang sebelumnya publik).
// Bukan pengganti pola authorizeAdmin/dsb yang sudah ada di route lain -- route lain sengaja
// tidak dimigrasikan sekarang agar perubahan tetap terbatas pada endpoint yang bocor.
export async function authorize(request: Request, allowedRoles: Role[]): Promise<AuthResult> {
  const authorization = request.headers.get('authorization')
  const bearerMatch = authorization?.match(/^Bearer\s+(\S+)$/i)
  if (!bearerMatch) {
    return { response: errorResponse('Sesi login tidak valid atau sudah berakhir. Silakan login kembali.', 401) }
  }

  const accessToken = bearerMatch[1]
  const authClient = createAuthenticatedClient(accessToken)
  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken)
  if (userError || !userData.user) {
    return { response: errorResponse('Sesi login tidak valid atau sudah berakhir. Silakan login kembali.', 401) }
  }

  const { data: profile, error: profileError } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError) {
    return { response: errorResponse('Gagal memverifikasi akses. Coba lagi.', 500) }
  }
  if (!profile?.role || !allowedRoles.includes(profile.role as Role)) {
    return { response: errorResponse('Akun ini tidak memiliki akses untuk endpoint ini.', 403) }
  }

  return { userId: userData.user.id, role: profile.role as Role, authClient }
}
