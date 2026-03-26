import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
      username?: string
      followerCount?: number
    }
  }

  interface User {
    username?: string
    followerCount?: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username?: string
    followerCount?: number
  }
}
