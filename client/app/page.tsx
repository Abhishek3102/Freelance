"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Navigation from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [walletAddress, setWalletAddress] = useState("")

  // Removed forced redirect on user request.
  // Users will land on this Home page and choose their path.

  const handleConnectWallet = () => {
    // Mock wallet connection - in real app, integrate with actual wallet
    const mockAddress = "0x" + Math.random().toString(16).slice(2, 42)
    setWalletAddress(mockAddress)
    localStorage.setItem("walletAddress", mockAddress)
    router.push("/dashboard")
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-6 text-foreground">
              Zero Commission. <span className="text-primary">AI Matched.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Web3-powered freelance platform with smart escrow and AI-driven talent matching
            </p>
            <div className="flex justify-center gap-4">
              {/* Show based on Role */}
              {(!session?.user || session.user.role === 'client') && (
                <Button 
                  size="lg" 
                  className={`text-lg px-8 py-6 ${!session ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => router.push("/freelancers")}
                  disabled={!session}
                >
                  Find Talent
                </Button>
              )}
              
              {(!session?.user || session.user.role === 'freelancer') && (
                <Button 
                  size="lg" 
                  variant={session?.user?.role === 'freelancer' ? "default" : "outline"} 
                  className={`text-lg px-8 py-6 ${!session ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => router.push("/jobs")}
                  disabled={!session}
                >
                  Find Work
                </Button>
              )}
            </div>
            {!session && (
                 <p className="mt-4 text-sm text-muted-foreground">Please <span className="font-bold text-primary">Login</span> via the top right button to access these features.</p>
            )}
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-3 gap-6 mb-16">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">2,847</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Freelancers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">1,432</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Escrow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">342 ETH</div>
              </CardContent>
            </Card>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-accent">🤖 AI Matching</CardTitle>
                <CardDescription>
                  Smart algorithms match freelancers with perfect jobs based on skills and rates
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-secondary">🔒 Smart Escrow</CardTitle>
                <CardDescription>Secure funds in smart contracts, released only when work is complete</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-accent">⚖️ Fair Disputes</CardTitle>
                <CardDescription>
                  Arbiter-based dispute resolution ensures fair outcomes for all parties
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
