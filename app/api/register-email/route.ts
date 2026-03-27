import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const { email } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('registrations')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already registered' }, { status: 409 })
    }

    const { error } = await supabaseAdmin.from('registrations').insert({
      type: 'email',
      email,
      follower_count: 0,
    })

    if (error) {
      return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
    }

    // Send confirmation email — non-blocking, failure doesn't affect registration
    if (resend) {
      resend.emails.send({
        from: 'Silk Bazaar <hello@silkbazaar.xyz>',
        to: email,
        subject: 'You\'re on the list.',
        html: `
          <div style="font-family: 'Georgia', serif; max-width: 520px; margin: 0 auto; padding: 48px 32px; background: #f9f7f5; color: #1a1208;">
            <p style="font-family: monospace; font-size: 11px; letter-spacing: 0.14em; color: #b07d4a; margin: 0 0 32px;">SILK BAZAAR</p>

            <h1 style="font-size: 32px; font-weight: 500; line-height: 1.2; margin: 0 0 24px;">
              You're first to the bazaar.
            </h1>

            <p style="font-size: 16px; line-height: 1.7; color: #5a4a35; margin: 0 0 16px;">
              We'll reach out when auctions go live and early access opens.
            </p>

            <p style="font-size: 16px; line-height: 1.7; color: #5a4a35; margin: 0 0 32px;">
              In the meantime — connect your X account to include your audience
              in our launch reach count.
            </p>

            <a href="https://silkbazaar.xyz/#register"
               style="display: inline-block; font-family: monospace; font-size: 12px; letter-spacing: 0.06em; background: #5c4a8a; color: #fff; padding: 12px 24px; border-radius: 40px; text-decoration: none;">
              Connect X Account →
            </a>

            <p style="font-family: monospace; font-size: 11px; color: #9a8a74; margin: 48px 0 0; letter-spacing: 0.06em;">
              You registered with ${email}
            </p>
          </div>
        `,
      }).catch(() => {
        // Silently ignore email send failures — registration already succeeded
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
