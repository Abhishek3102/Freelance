"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import EscrowPage from "@/components/jobs/escrow-page"

export default function JobEscrowPage({ params }: { params: { jobId: string } }) {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const address = localStorage.getItem("walletAddress")
    if (!address) {
      router.push("/")
    } else {
      setIsReady(true)
    }
  }, [router])

  if (!isReady) return null

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <EscrowPage jobId={params.jobId} />
    </main>
  )
}
