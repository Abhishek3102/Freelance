import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { MongoDBAdapter } from "@next-auth/mongodb-adapter"
import clientPromise from "@/lib/db"
import jwt from "jsonwebtoken"

console.log("NEXTAUTH_SECRET loaded:", !!process.env.NEXTAUTH_SECRET)

// FALLBACK SECRET for debugging: If env is missing, use this fixed string.
const SECRET = process.env.NEXTAUTH_SECRET || "secret_placeholder_123"

export const authOptions: NextAuthOptions = {
    secret: SECRET,
    adapter: MongoDBAdapter(clientPromise),
    session: {
        strategy: "jwt",
    },
    jwt: {
        // Force JWS (Signed) instead of JWE (Encrypted) for Python backend compatibility
        encode: ({ secret, token }) => {
            return jwt.sign(token!, secret)
        },
        decode: ({ secret, token }) => {
            return jwt.verify(token!, secret) as any
        }
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (session?.user) {
                session.user.id = token.sub as string
                session.user.role = token.role as string | undefined
                session.user.gender = token.gender as string | undefined
                session.user.age = token.age as number | undefined
                // @ts-ignore
                session.accessToken = jwt.sign(token, SECRET) // Re-sign to pass to client if needed, or just pass raw if available. 
                // Actually, 'token' here IS the decoded payload. We need to re-encode it to send to backend or use the raw one. 
                // Since we use custom encode/decode, we can just re-sign it.
            }
            return session
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.gender = user.gender
                token.age = user.age
            }
            // Enable updating the session from the client
            if (trigger === "update" && session) {
                token.role = session.role
                token.gender = session.gender
                token.age = session.age
            }
            return token
        }
    },
}
