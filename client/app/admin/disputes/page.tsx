"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import DisputePortal from "@/components/admin/dispute-portal"
import { useAccount } from 'wagmi' // Added real wallet context

const ARBITER_ADDRESS = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS || "0x7040bE2932FFa1021fe4FF0a65dC71D050a2705D"

export default function DisputesPage() {
  const router = useRouter()
  const { address } = useAccount() // Real connected address
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (!address || address.toLowerCase() !== ARBITER_ADDRESS.toLowerCase()) {
      setIsAuthorized(false)
    } else {
      setIsAuthorized(true)
    }
  }, [address])

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-6 rounded-lg max-w-lg text-center shadow-lg">
          <h2 className="text-xl font-bold mb-4">Unauthorized Access Warning</h2>
          <p className="mb-4">This page requires the Arbiter's wallet to be connected.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <DisputePortal />
    </main>
  )
}
