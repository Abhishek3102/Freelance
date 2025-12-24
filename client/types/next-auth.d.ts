import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            id: string
            role?: string
            gender?: string
            age?: number
        } & DefaultSession["user"]
        accessToken?: string
    }

    interface User {
        role?: string
        gender?: string
        age?: number
    }
}
