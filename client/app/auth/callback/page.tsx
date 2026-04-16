"use client"

import { useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"

function AuthCallbackInner() {
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
        router.replace("/")
      } else {
        toast.error("No account found. Please sign up first.")
        router.replace("/signup")
      }
    } else if (from === "signup") {
      if (hasRole) {
        toast("You already have an account.")
        router.replace("/")
      } else {
        router.replace("/onboarding")
      }
    } else {
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

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}
