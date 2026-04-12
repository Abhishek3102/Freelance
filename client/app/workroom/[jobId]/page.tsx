"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAccount } from "wagmi"
import Navigation from "@/components/navigation"
import WorkroomView from "@/components/workroom/workroom-view"

export default function WorkroomPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params?.jobId as string | undefined
  const { address, isConnected } = useAccount()
  const [mounted, setMounted] = useState(false)

  // Mark as mounted after wagmi has had time to hydrate
  useEffect(() => {
    setMounted(true)
  }, [])

  // Only redirect to homepage if wallet is genuinely disconnected (after hydration)
  useEffect(() => {
    if (mounted && isConnected === false) {
      router.push("/")
    }
  }, [mounted, isConnected, router])

  // Show nothing while hydrating or jobId not yet resolved
  if (!mounted || !isConnected || !address || !jobId) return null

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <WorkroomView jobId={jobId} />
    </main>
  )
}
