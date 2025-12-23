"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useSession, signIn, signOut } from "next-auth/react"
import { useEffect, useState } from "react"

export default function Navigation() {
  const router = useRouter()
  const { data: session } = useSession()
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleConnectWallet = () => {
    const connector = connectors[0]
    if (connector) {
      connect({ connector })
    }
  }

  const handleDisconnect = () => {
    disconnect()
    router.push("/")
  }

  if (!mounted) return null

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Freelance</span>
          </Link>

          <div className="hidden md:flex gap-8">
            {isConnected && (
              <>
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition">
                  Dashboard
                </Link>
                <Link href="/jobs/create" className="text-muted-foreground hover:text-foreground transition">
                  Post Job
                </Link>
              </>
            )}
          </div>

          <div className="flex gap-2 items-center">
            {/* Auth (Identity) */}
            {session?.user ? (
               <div className="flex items-center gap-2 mr-4">
                  <span className="text-sm text-foreground">{session.user.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => signOut()}>Logout</Button>
               </div>
            ) : (
                <Button variant="ghost" size="sm" onClick={() => signIn()} className="mr-4">Login</Button>
            )}

            {/* Web3 (Wallet) */}
            {isConnected && address ? (
              <>
                <span className="px-4 py-2 text-sm text-muted-foreground">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  className="border-border text-foreground hover:bg-card bg-transparent"
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button onClick={handleConnectWallet} className="bg-primary hover:bg-primary/90">
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
