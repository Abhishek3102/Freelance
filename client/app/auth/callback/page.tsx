"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"

export default function AuthCallbackPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") // "signin" or "signup"

  useEffect(() => {
    if (status === "loading") return

    // Not logged in at all — send back to homepage
    if (!session?.user) {
      router.replace("/")
      return
    }

    const hasRole = !!session.user.role

    if (from === "signin") {
      if (hasRole) {
        // Returning user signing in normally — go to homepage
        router.replace("/")
      } else {
        // Brand new user who went through the sign-in flow — block them
        toast.error("No account found. Please sign up first.")
        router.replace("/signup")
      }
    } else if (from === "signup") {
      if (hasRole) {
        // Already registered — don't let them re-onboard
        toast("You already have an account.")
        router.replace("/")
      } else {
        // Brand new user — proceed to onboarding
        router.replace("/onboarding")
      }
    } else {
      // Unknown origin — default safe path
      router.replace("/")
    }
  }, [session, status, from, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Verifying your account...</p>
      </div>
    </div>
  )
}
