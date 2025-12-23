"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import WorkroomView from "@/components/workroom/workroom-view"

export default function WorkroomPage({ params }: { params: { jobId: string } }) {
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
      <WorkroomView jobId={params.jobId} />
    </main>
  )
}
