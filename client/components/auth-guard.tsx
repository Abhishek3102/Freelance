"use client"

import { useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

// Pages that should never trigger the onboarding redirect
const AUTH_PAGES = ["/onboarding", "/signin", "/signup", "/auth/callback"]

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === "loading") return

    // If authed but no role, force onboarding — but not on auth-related pages
    const isAuthPage = AUTH_PAGES.some(p => pathname === p || pathname.startsWith(p))
    if (session?.user && !session.user.role && !isAuthPage) {
      router.push("/onboarding")
    }

  }, [session, status, pathname, router])

  return <>{children}</>
}
