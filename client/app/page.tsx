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

    <main className="min-h-screen bg-black text-white">
      
      {/* SECTION 1: Hero with Video & Features */}
      <div className="relative min-h-screen w-full flex flex-col justify-center overflow-hidden">
          {/* Video Background */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-80"
          >
            <source src="/videos/bg_video_latest.mp4" type="video/mp4" />
          </video>

          {/* Overlay — darkens the video so content above stays readable */}
          <div className="absolute top-0 left-0 w-full h-full bg-black/65 z-10 backdrop-blur-[1px]" />

          {/* Nav & Content */}
          <div className="relative z-20 w-full flex-1 flex flex-col">
            <Navigation />
            
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">
                <div className="container mx-auto max-w-6xl">
                    {/* Hero Text */}
                    <div className="text-center">
                      <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white drop-shadow-lg tracking-tight">
                        Zero Commission. <span className="text-primary text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">AI Matched.</span>
                      </h1>
                      <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto drop-shadow-md">
                        Web3-powered freelance platform with smart escrow and AI-driven talent matching
                      </p>
                      
                      <div className="flex justify-center gap-6">
                        {(!session?.user || session.user.role === 'freelancer') && (
                          <Button 
                            size="lg" 
                            variant={session?.user?.role === 'freelancer' ? "default" : "secondary"} 
                            className={`text-lg px-8 py-6 h-auto shadow-xl hover:scale-105 transition-all duration-300 backdrop-blur-md bg-white/10 border border-white/20 text-white hover:bg-white/20 ${!session ? 'opacity-90' : 'cursor-pointer'}`}
                            onClick={() => router.push("/jobs")}
                            disabled={false}
                          >
                            Find Work
                          </Button>
                        )}
                      </div>
                      
                      {!session && (
                           <div className="mt-8 p-3 rounded-full bg-black/30 backdrop-blur-sm inline-block border border-white/10">
                              <p className="text-sm text-white/80 px-4">Please <span className="font-bold text-primary">Login</span> via the top right button to access these features.</p>
                           </div>
                      )}
                    </div>

                    {/* GAP for Video Visibility */}
                    <div className="h-32 md:h-48"></div> 

                    {/* Features Section (AI Matching, etc.) - On Video */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <Card className="bg-black/60 backdrop-blur-md border-white/10 text-white hover:border-primary/50 transition-all hover:-translate-y-1">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-6">
                          <div className="text-4xl bg-white/5 p-3 rounded-full border border-white/10">🤖</div>
                          <div className="text-left">
                            <CardTitle className="text-lg font-bold text-primary mb-1">AI Matching</CardTitle>
                            <CardDescription className="text-white/70 text-sm leading-relaxed">
                              Smart algorithms match freelancers with perfect jobs based on skills.
                            </CardDescription>
                          </div>
                        </CardHeader>
                      </Card>
                      <Card className="bg-black/60 backdrop-blur-md border-white/10 text-white hover:border-primary/50 transition-all hover:-translate-y-1">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-6">
                           <div className="text-4xl bg-white/5 p-3 rounded-full border border-white/10">🔒</div>
                          <div className="text-left">
                            <CardTitle className="text-lg font-bold text-primary mb-1">Smart Escrow</CardTitle>
                            <CardDescription className="text-white/70 text-sm leading-relaxed">
                              Secure funds in smart contracts, released only when work is complete.
                            </CardDescription>
                          </div>
                        </CardHeader>
                      </Card>
                      <Card className="bg-black/60 backdrop-blur-md border-white/10 text-white hover:border-primary/50 transition-all hover:-translate-y-1">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-6">
                           <div className="text-4xl bg-white/5 p-3 rounded-full border border-white/10">⚖️</div>
                          <div className="text-left">
                            <CardTitle className="text-lg font-bold text-primary mb-1">Fair Disputes</CardTitle>
                            <CardDescription className="text-white/70 text-sm leading-relaxed">
                              Arbiter-based dispute resolution ensures fair outcomes for everyone.
                            </CardDescription>
                          </div>
                        </CardHeader>
                      </Card>
                    </div>
                </div>
            </div>
          </div>
      </div>

      {/* SECTION 2: Stats Section (Below Video, Black BG) */}
      <div className="bg-black py-24 border-t border-white/10">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-zinc-900/50 backdrop-blur-xl border-white/10 text-white hover:bg-zinc-900 transition-colors">
                    <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-white/70">Active Jobs</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div className="text-4xl font-bold tracking-tight">2,847</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 backdrop-blur-xl border-white/10 text-white hover:bg-zinc-900 transition-colors">
                    <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-white/70">Freelancers</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div className="text-4xl font-bold tracking-tight">1,432</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 backdrop-blur-xl border-white/10 text-white hover:bg-zinc-900 transition-colors">
                    <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-white/70">Total Escrow</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div className="text-4xl font-bold tracking-tight text-green-400">342 ETH</div>
                    </CardContent>
                </Card>
            </div>
          </div>
      </div>

    </main>
  )
}
