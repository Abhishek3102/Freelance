import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { MongoDBAdapter } from "@next-auth/mongodb-adapter"
import clientPromise from "@/lib/db"
import jwt from "jsonwebtoken"

const SECRET = process.env.NEXTAUTH_SECRET || "secret_placeholder_123"

export const authOptions: NextAuthOptions = {
    secret: SECRET,
    adapter: MongoDBAdapter(clientPromise),
    session: {
        strategy: "jwt",
    },
    jwt: {
        // Force JWS (Signed) for Python backend compatibility
        encode: ({ secret, token }) => jwt.sign(token!, secret),
        decode: ({ secret, token }) => jwt.verify(token!, secret) as any,
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            // Auto-link accounts with the same email to prevent OAuthAccountNotLinked errors.
            // Safe here since we use Google as our only provider.
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    callbacks: {
        // Runs first on every sign-in: attach custom DB fields to the user object
        // because MongoDBAdapter does NOT include custom fields (role, gender, age)
        async signIn({ user, account }) {
            if (account?.provider === "google" && user?.email) {
                try {
                    const client = await clientPromise
                    const db = client.db()
                    const dbUser = await db.collection("users").findOne(
                        { email: user.email },
                        { projection: { role: 1, gender: 1, age: 1 } }
                    )
                    if (dbUser?.role) {
                        ;(user as any).role = dbUser.role
                        ;(user as any).gender = dbUser.gender
                        ;(user as any).age = dbUser.age
                    }
                } catch (e) {
                    console.error("Failed to fetch user role on sign-in:", e)
                }
            }
            return true
        },

        async session({ session, token }) {
            if (session?.user) {
                session.user.id = token.sub as string
                session.user.role = token.role as string | undefined
                session.user.gender = token.gender as string | undefined
                session.user.age = token.age as number | undefined
                // @ts-ignore
                session.accessToken = jwt.sign(token, SECRET)
            }
            return session
        },

        async jwt({ token, user, trigger, session }) {
            // On first sign-in: user is populated (with role attached by signIn callback above)
            if (user) {
                token.id = user.id
                token.role = (user as any).role
                token.gender = (user as any).gender
                token.age = (user as any).age
            }

            // Fallback for existing sessions where role was never stored in the JWT.
            // Looks up by email (always available in token) rather than ObjectId.
            if (!token.role && token.email) {
                try {
                    const client = await clientPromise
                    const db = client.db()
                    const dbUser = await db.collection("users").findOne(
                        { email: token.email },
                        { projection: { role: 1, gender: 1, age: 1 } }
                    )
                    if (dbUser?.role) {
                        token.role = dbUser.role
                        token.gender = dbUser.gender
                        token.age = dbUser.age
                    }
                } catch (e) {
                    console.error("Failed to re-fetch role from DB:", e)
                }
            }

            // Support session.update() calls from the client
            if (trigger === "update" && session) {
                token.role = session.role
                token.gender = session.gender
                token.age = session.age
            }
            return token
        },
    },
}
