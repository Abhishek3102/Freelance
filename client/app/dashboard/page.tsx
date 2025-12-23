"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import DashboardClient from "@/components/dashboard/dashboard-client"

export default function DashboardPage() {
  const router = useRouter()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const address = localStorage.getItem("walletAddress")
    if (!address) {
      router.push("/")
    } else {
      setWalletAddress(address)
      setIsLoading(false)
    }
  }, [router])

  if (isLoading || !walletAddress) return null

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <DashboardClient userAddress={walletAddress} />
    </main>
  )
}
