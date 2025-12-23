"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"

export default function Hero() {
  const router = useRouter()
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const address = localStorage.getItem("walletAddress")
    setIsConnected(!!address)
  }, [])

  const handleConnect = () => {
    const mockAddress = "0x" + Math.random().toString(16).slice(2, 42)
    localStorage.setItem("walletAddress", mockAddress)
    setIsConnected(true)
    router.push("/dashboard")
  }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-background via-card/30 to-background">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(121, 81, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(121, 81, 255, 0.1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <div className="inline-block px-4 py-1.5 bg-secondary/20 border border-secondary/40 rounded-full">
                <span className="text-sm font-semibold text-secondary">AI-Powered Matching</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
                Zero Commission.
                <span className="text-primary"> AI Matched.</span>
              </h1>
            </div>

            <p className="text-lg text-muted-foreground max-w-lg">
              Connect with perfect freelancers powered by AI. Smart escrow protects both sides. On-chain trust,
              off-chain efficiency.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {isConnected ? (
                <Button onClick={() => router.push("/dashboard")} size="lg" className="bg-primary hover:bg-primary/90">
                  Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={handleConnect} size="lg" className="bg-primary hover:bg-primary/90">
                  Connect Wallet <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-border">
              <div>
                <div className="text-2xl font-bold text-primary">0%</div>
                <p className="text-sm text-muted-foreground">Commission</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">Smart</div>
                <p className="text-sm text-muted-foreground">Escrow</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary">AI</div>
                <p className="text-sm text-muted-foreground">Matched</p>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="hidden md:flex items-center justify-center">
            <div className="relative w-full h-96">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-3xl" />
              <div className="absolute inset-8 border border-primary/30 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-sm" />
              <div className="absolute inset-12 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary/50">⚡</div>
                  <p className="text-muted-foreground mt-4">Web3 Freelance Platform</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
