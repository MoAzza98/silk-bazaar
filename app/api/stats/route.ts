import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { totalUsers: 0, totalReach: 0 },
      { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate' } }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('registrations')
    .select('follower_count')

  if (error) {
    return NextResponse.json(
      { totalUsers: 0, totalReach: 0 },
      { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate' } }
    )
  }

  const totalUsers = data?.length ?? 0
  const totalReach = data?.reduce((sum, r) => sum + (r.follower_count ?? 0), 0) ?? 0

  return NextResponse.json(
    { totalUsers, totalReach },
    { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate' } }
  )
}
