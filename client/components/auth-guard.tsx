"use client"

import { useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === "loading") return

    // If authed but no role, force onboarding
    if (session?.user && !session.user.role && pathname !== "/onboarding") {
      router.push("/onboarding")
    }

    // Logic to protect other routes could go here
    // e.g. if (pathname.startsWith('/dashboard') && !session) router.push('/')

  }, [session, status, pathname, router])

  return <>{children}</>
}
