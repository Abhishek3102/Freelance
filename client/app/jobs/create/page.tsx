"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import PostJobForm from "@/components/jobs/post-job-form"

export default function CreateJobPage() {
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PostJobForm />
      </div>
    </main>
  )
}
