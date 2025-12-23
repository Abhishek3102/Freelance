"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import DisputePortal from "@/components/admin/dispute-portal"

const ARBITER_ADDRESS = "0x1234567890123456789012345678901234567890"

export default function DisputesPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const address = localStorage.getItem("walletAddress")
    if (!address || address.toLowerCase() !== ARBITER_ADDRESS.toLowerCase()) {
      router.push("/")
    } else {
      setIsAuthorized(true)
    }
  }, [router])

  if (!isAuthorized) return null

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <DisputePortal />
    </main>
  )
}
