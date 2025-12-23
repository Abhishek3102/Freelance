"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import MatchesView from "@/components/jobs/matches-view"

export default function MatchesPage({ params }: { params: { jobId: string } }) {
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
      <MatchesView jobId={params.jobId} />
    </main>
  )
}
