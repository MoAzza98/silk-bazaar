import NextAuth from 'next-auth'
import TwitterProvider from 'next-auth/providers/twitter'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const handler = NextAuth({
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0',
      authorization: {
        params: {
          scope: 'tweet.read users.read offline.access',
        },
      },
      userinfo: {
        url: 'https://api.twitter.com/2/users/me',
        params: { 'user.fields': 'public_metrics,username' },
      },
      profile(profile) {
        return {
          id: profile.data.id,
          name: profile.data.name,
          image: null,
          followerCount: profile.data.public_metrics?.followers_count ?? 0,
          username: profile.data.username,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!supabaseAdmin) return true
      await supabaseAdmin
        .from('registrations')
        .upsert(
          {
            type: 'twitter',
            twitter_handle: (user as unknown as Record<string, unknown>).username as string,
            follower_count: ((user as unknown as Record<string, unknown>).followerCount as number) ?? 0,
          },
          { onConflict: 'twitter_handle' }
        )
      return true
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).username = token.username;
        (session.user as unknown as Record<string, unknown>).followerCount = token.followerCount
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.username = (user as unknown as Record<string, unknown>).username as string
        token.followerCount = (user as unknown as Record<string, unknown>).followerCount as number
      }
      return token
    },
  },
})

export { handler as GET, handler as POST }
